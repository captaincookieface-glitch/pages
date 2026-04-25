"""
ICESat-2 ATL03 Downloader & Extractor

Downloads a small ATL03 granule from NSIDC (EarthData) and extracts:
  - delta_time (photon arrival time)
  - h_ph (photon height)
  - signal_conf_ph (photon classification: noise/signal/afterpulse)

Prerequisites:
    pip install earthaccess h5py pandas

Setup:
    Create a free EarthData account at https://urs.earthdata.nasa.gov/
    On first run, earthaccess will prompt for your credentials.
"""

import earthaccess
import h5py
import numpy as np
import pandas as pd
from pathlib import Path

# ============== CONFIGURATION ==============

# Bounding box: [west, south, east, north]
# Example: Thames Estuary near London (water surface)
BOUNDING_BOX = (0.5, 51.4, 1.0, 51.6)

# Date range
DATE_RANGE = ("2023-06-01", "2023-06-30")

# Output directory
OUTPUT_DIR = Path("./atl03_output")

# Beam to extract (gt1l, gt1r, gt2l, gt2r, gt3l, gt3r)
BEAM = "gt1l"

# Max number of granules to download
MAX_GRANULES = 1

# ============================================


def authenticate():
    """Login to EarthData (credentials cached after first use)."""
    print("Authenticating with EarthData...")
    earthaccess.login(strategy="interactive")


def search_granules():
    """Search for ATL03 granules matching the criteria."""
    print(f"Searching ATL03 granules in bbox={BOUNDING_BOX}, dates={DATE_RANGE}...")
    results = earthaccess.search_data(
        short_name="ATL03",
        bounding_box=BOUNDING_BOX,
        temporal=DATE_RANGE,
        count=MAX_GRANULES,
    )
    print(f"Found {len(results)} granule(s)")
    return results


def download_granules(results):
    """Download granules to local directory."""
    OUTPUT_DIR.mkdir(parents=True, exist_ok=True)
    print(f"Downloading to {OUTPUT_DIR}...")
    files = earthaccess.download(results, str(OUTPUT_DIR))
    print(f"Downloaded {len(files)} file(s)")
    return files


def extract_photon_data(h5_path: str) -> pd.DataFrame:
    """
    Extract photon-level data from an ATL03 HDF5 file.

    Columns:
      - delta_time: seconds since ATLAS SDP epoch (2018-01-01)
      - h_ph: photon height (meters, WGS84 ellipsoid)
      - signal_conf: photon classification per surface type
          -2 = afterpulse
          -1 = impulse response effect
           0 = noise
           1 = buffer
           2 = low confidence signal
           3 = medium confidence signal
           4 = high confidence signal
      - lat_ph: latitude
      - lon_ph: longitude
    """
    print(f"Extracting photon data from {h5_path}, beam={BEAM}...")
    beam_path = f"/{BEAM}/heights"

    with h5py.File(h5_path, "r") as f:
        # Verify beam exists
        if BEAM not in f:
            available = [k for k in f.keys() if k.startswith("gt")]
            raise KeyError(f"Beam '{BEAM}' not found. Available: {available}")

        grp = f[beam_path]
        delta_time = grp["delta_time"][:]
        h_ph = grp["h_ph"][:]
        lat_ph = grp["lat_ph"][:]
        lon_ph = grp["lon_ph"][:]

        # signal_conf_ph shape: (n_photons, 5) - one column per surface type
        # Surface types: 0=land, 1=ocean, 2=sea_ice, 3=land_ice, 4=inland_water
        signal_conf_all = grp["signal_conf_ph"][:]
        signal_conf_ocean = signal_conf_all[:, 1]
        signal_conf_inland = signal_conf_all[:, 4]

        # --- Sea surface height estimation ---
        # Use segment-level data to interpolate SSH per photon.
        # geolocation/segment_ph_cnt: number of photons per segment
        # geophys_corr/dem_h: DEM height per segment (includes ocean surface)
        # geolocation/ref_elev: reference surface elevation per segment
        seg_grp = f[f"/{BEAM}/geolocation"]
        seg_ph_cnt = seg_grp["segment_ph_cnt"][:]

        # Try multiple SSH sources in order of preference
        ssh_per_segment = None
        ssh_source = None

        # Option 1: geophys_corr/dem_h (digital elevation model - includes ocean surface)
        geophys_path = f"/{BEAM}/geophys_corr"
        if geophys_path in f:
            gc = f[geophys_path]
            if "dem_h" in gc:
                ssh_per_segment = gc["dem_h"][:]
                ssh_source = "dem_h"

        # Option 2: geolocation/ref_elev (reference elevation)
        if ssh_per_segment is None and "ref_elev" in seg_grp:
            ssh_per_segment = seg_grp["ref_elev"][:]
            ssh_source = "ref_elev"

        # Interpolate segment-level SSH to photon level
        # Each segment has seg_ph_cnt[i] photons; repeat SSH for each photon
        if ssh_per_segment is not None:
            ssh_per_photon = np.repeat(ssh_per_segment, seg_ph_cnt)
            # Handle length mismatch (can happen at file boundaries)
            if len(ssh_per_photon) > len(h_ph):
                ssh_per_photon = ssh_per_photon[:len(h_ph)]
            elif len(ssh_per_photon) < len(h_ph):
                ssh_per_photon = np.pad(
                    ssh_per_photon, (0, len(h_ph) - len(ssh_per_photon)),
                    constant_values=np.nan
                )
            print(f"SSH source: {ssh_source} ({np.count_nonzero(~np.isnan(ssh_per_photon)):,} valid values)")
        else:
            ssh_per_photon = np.full(len(h_ph), np.nan)
            ssh_source = "none"
            print("WARNING: No SSH source found in file. SSH column will be NaN.")

    df = pd.DataFrame({
        "delta_time": delta_time,
        "h_ph": h_ph,
        "lat_ph": lat_ph,
        "lon_ph": lon_ph,
        "sea_surface_height": ssh_per_photon,
        "depth_below_surface": ssh_per_photon - h_ph,
        "signal_conf_ocean": signal_conf_ocean,
        "signal_conf_inland": signal_conf_inland,
    })

    # Add human-readable classification
    conf_labels = {
        -2: "afterpulse",
        -1: "impulse_response",
        0: "noise",
        1: "buffer",
        2: "low_signal",
        3: "medium_signal",
        4: "high_signal",
    }
    df["classification_ocean"] = df["signal_conf_ocean"].map(conf_labels)
    df["classification_inland"] = df["signal_conf_inland"].map(conf_labels)

    print(f"Extracted {len(df):,} photons")
    print(f"\nClassification distribution (ocean):\n{df['classification_ocean'].value_counts()}")
    return df


def filter_multiple_scattering(df: pd.DataFrame) -> pd.DataFrame:
    """
    Filter photons likely from multiple scattering over water.

    Multiple scattering photons are signal photons (conf >= 2) that appear
    BELOW the sea surface - i.e. they penetrated the water column and
    scattered back. These have depth_below_surface > 0.

    Returns a filtered DataFrame with only subsurface signal photons.
    """
    mask = (
        (df["signal_conf_ocean"] >= 2) &
        (df["depth_below_surface"] > 0) &
        (df["sea_surface_height"].notna())
    )
    df_sub = df[mask].copy()
    print(f"\nMultiple scattering filter: {len(df_sub):,} subsurface signal photons "
          f"(out of {len(df):,} total)")
    if len(df_sub) > 0:
        print(f"  Depth range: {df_sub['depth_below_surface'].min():.2f} - "
              f"{df_sub['depth_below_surface'].max():.2f} m")
    return df_sub


def main():
    authenticate()
    results = search_granules()

    if not results:
        print("No granules found. Try adjusting BOUNDING_BOX or DATE_RANGE.")
        return

    files = download_granules(results)

    for fpath in files:
        if str(fpath).endswith(".h5"):
            df = extract_photon_data(str(fpath))

            # Save extracted data
            csv_path = OUTPUT_DIR / f"{Path(fpath).stem}_{BEAM}_photons.csv"
            df.to_csv(csv_path, index=False)
            print(f"\nSaved to {csv_path}")
            print(f"File size: {csv_path.stat().st_size / 1024:.0f} KB")
            print(f"First 5 rows:\n{df.head()}")


if __name__ == "__main__":
    main()
