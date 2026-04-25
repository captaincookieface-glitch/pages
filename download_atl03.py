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
        # For water: use column 1 (ocean) or 4 (inland_water)
        signal_conf_all = grp["signal_conf_ph"][:]
        signal_conf_ocean = signal_conf_all[:, 1]
        signal_conf_inland = signal_conf_all[:, 4]

    df = pd.DataFrame({
        "delta_time": delta_time,
        "h_ph": h_ph,
        "lat_ph": lat_ph,
        "lon_ph": lon_ph,
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
