const fs = require(‘fs’);
const path = require(‘path’);
const crypto = require(‘crypto’);

// — Config —
const DB_PATH = path.join(__dirname, ‘captain.json’);
const OUTPUT_DIR = path.join(__dirname, ‘captain_cookie_face’);
const PINATA_BASE = ‘https://indigo-managerial-opossum-856.mypinata.cloud/ipfs/’;
const DAY1 = new Date(2025, 10, 10); // Nov 10, 2025 (month is 0-indexed)

// — Helpers —
function toSnakeCase(title) {
return title
.normalize(‘NFC’)
.replace(/[’’]/g, ‘’)
.replace(/[^a-zA-Z0-9\s]/g, ’ ’)
.trim()
.replace(/\s+/g, ‘_’)
.toLowerCase();
}

function parseDate(dateStr) {
const [m, d, y] = dateStr.split(’/’).map(Number);
return new Date(y < 100 ? y + 2000 : y, m - 1, d);
}

function getDayNumber(dateStr) {
const d = parseDate(dateStr);
const diff = Math.round((d - DAY1) / (1000 * 60 * 60 * 24));
return diff + 1;
}

function toISODate(dateStr) {
const d = parseDate(dateStr);
const yyyy = d.getFullYear();
const mm = String(d.getMonth() + 1).padStart(2, ‘0’);
const dd = String(d.getDate()).padStart(2, ‘0’);
return `${yyyy}-${mm}-${dd}`;
}

function escapeHTML(str) {
return str
.replace(/&/g, ‘&’)
.replace(/</g, ‘<’)
.replace(/>/g, ‘>’)
.replace(/”/g, ‘"’);
}

function escapeJS(str) {
return str
.replace(/\/g, ‘\\’)
.replace(/”/g, ‘\”’)
.replace(/\n/g, ‘\n’)
.replace(/\r/g, ‘\r’);
}

function md5(content) {
return crypto.createHash(‘md5’).update(content, ‘utf-8’).digest(‘hex’);
}

// — Page Template —
function generatePage(entry) {
const pinataBlock = entry.pinata_cid
? `\n <div class="block">
<img src="${PINATA_BASE}${entry.pinata_cid}/image.jpeg" 
alt="${escapeHTML(entry.title)}" 
style="max-width: 100%; height: auto;" />

  </div>\n`
    : '';

return `<!DOCTYPE html>

<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>${escapeHTML(entry.title)}</title>
  <style>
    body {
      font-family:
        Arial,
        "Helvetica Neue",
        Helvetica,
        system-ui,
        sans-serif;
      background: #fff;
    }
    .block {
      margin-bottom: 20px;
      padding: 15px;
      background: #fff;
      border: 1px solid #eee;
      word-wrap: break-word;
    }
    .key {
      color: #000;
      font-size: 2em !important;
      text-transform: capitalize;
      font-weight: bold;
    }
    .hash {
      word-break: break-all;
      color: #4287f5;
    }
    a {
      color: #4287f5;
      text-decoration: underline;
    }
    pre {
      white-space: pre-wrap;
    }
    button {
      font-family: inherit;
      padding: 6px 10px;
      border: 1px solid #ccc;
      background: #f9f9f9;
      cursor: pointer;
    }
    button:hover {
      background: #eee;
    }
    h1 {
      margin-bottom: 10px;
      font-size: 32px;
    }
    nav {
      background-color:#e1e1e1;
      padding: 10px;
    }
    nav > ul {
      display: flex;
      flex-wrap: wrap;
      flex-direction: row;
      list-style: none;
      padding:0;
      margin: 0;
    }
    nav > ul > li, nav > ul > li > a{
      display: flex;
      flex-direction: column;
      flex-wrap: wrap;
      text-align:center;
      margin: 0;
    }
    nav ul li img {
      max-width: 80px;
      width: 100%;
      height: auto;
      border-radius: 40px;
    }
    .arrow {
      width: 50px;
      height: 80px;
      font-size: 38px;
    }
  </style>
</head>
<body>

<article itemscope itemtype="https://schema.org/CreativeWork">

  <meta itemprop="identifier" content="${entry.id}">
  <meta itemprop="dateCreated" content="${entry.date}">
\t
<h1 itemprop="name">${escapeHTML(entry.title)}</h1>
<nav aria-label="Breadcrumb" class="breadcrumb">
   <ul>
    <li>
      <a  href="../">
          <img max-width="80%" src="../assets/images/AFB9C382-3B34-4925-B318-E7083E758055.png" alt="Captain Cookie Face Universe" />
\t\t  <span>Home</span>
      </a>      
    </li> 
\t<li>
\t\t<a class="arrow">
\t\t  <span>\u2192</span>\t
\t\t</a>   
\t</li>
\t<li>
\t  <a  href="./">
      <img src="../assets/images/EEC475CE-9849-4816-ABC5-7BB5525C6D28.png" alt="Captain Cookie Face" >
      <span>CCF</span>
      </a>
\t</li> 
    <li>
\t\t<a class="arrow">
\t\t  <span>\u2192</span>\t
\t\t</a>   
\t</li>\t
\t<li>
      <img src="../assets/images/EEC475CE-9849-4816-ABC5-7BB5525C6D28.png" alt="Captain Cookie Face" >
      <span>${escapeHTML(entry.title)}</span>
\t</li> 
  </ul>
</nav>

  <div class="block" id="rendered"></div>

  <div class="block">
    <div class="key">SHA-256</div>
    <div style="display:flex; gap:10px; align-items:center;">
      <div class="hash" id="hashResult"></div>
      <button id="copyHashBtn" type="button">Copy</button>
    </div>
  </div>
${pinataBlock}
</article>

<script>
(async () => {

  const entry = {
    id: "${escapeJS(entry.id)}",
    safecreative_url: "${escapeJS(entry.safecreative_url)}",
    title: "${escapeJS(entry.title)}",
    date: "${escapeJS(entry.date)}",
    text: "${escapeJS(entry.text)}",
    nft_url: "${escapeJS(entry.nft_url)}",
    tweet_url: "${escapeJS(entry.tweet_url)}"
  };

  const canonicalString = [
    entry.id,
    entry.safecreative_url,
    entry.title,
    entry.date,
    entry.text,
    entry.nft_url,
    entry.tweet_url
  ].join('\\n---\\n');

  const data = new TextEncoder().encode(canonicalString);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashHex = [...new Uint8Array(hashBuffer)]
    .map(b => b.toString(16).padStart(2, '0'))
    .join('');

  document.getElementById('hashResult').textContent = hashHex;

  const container = document.getElementById('rendered');

  for (const [key, value] of Object.entries(entry)) {
    const div = document.createElement('div');
    div.className = 'block';

    const label = document.createElement('div');
    label.className = 'key';
    label.textContent = key;
    div.appendChild(label);

    if (key.endsWith('_url') && value) {
      const a = document.createElement('a');
      a.href = value;
      a.textContent = value;
      a.target = '_blank';
      div.appendChild(a);
    } else {
      const pre = document.createElement('pre');
      pre.textContent = value;
      div.appendChild(pre);
    }

    container.appendChild(div);
  }

  document.getElementById('copyHashBtn').addEventListener('click', () => {
    navigator.clipboard.writeText(hashHex);
    alert('Hash copied');
  });

})();
</script>

</body>
</html>`;
}

// — Index Template —
function generateIndex(entries) {
const listItems = entries.map(entry => {
const filename = toSnakeCase(entry.title) + ‘.html’;
const day = getDayNumber(entry.date);
const isoDate = toISODate(entry.date);

```
return `    <li itemprop="hasPart" itemscope itemtype="https://schema.org/CreativeWork">
  <a itemprop="url" href="./${filename}">
    <span itemprop="name">${escapeHTML(entry.title)}</span>
  </a>
  <div class="meta">
    Day ${day} \u00b7 ${isoDate}
  </div>
</li>`;
```

}).join(’\n\n’);

return `<!DOCTYPE html>

<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>Captain Cookie Face Aphorisms</title>

  <meta name="description" content="Index of aphorisms published by Captain Cookie Face. Each aphorism is a standalone canonical document with a cryptographic hash.">

  <style>
    body {
      font-family:
        Arial,
        "Helvetica Neue",
        Helvetica,
        system-ui,
        sans-serif;
      background: #fff;
    }

    h1 {
      margin-bottom: 10px;
\t  font-size: 32px;
    }
\t  
    a {
      color: #4287f5;
      text-decoration: underline;
    }

    .meta {
      color: #666;
      font-size: 0.9em;
    }

nav {
\tbackground-color:#e1e1e1;
\tpadding: 10px;
}

nav > ul {
\tdisplay: flex;
\tflex-wrap: wrap;
\tflex-direction: row;
\tlist-style: none;
\tpadding:0;
\tmargin: 0;
\t
}   

nav > ul > li, nav > ul > li > a{
\tdisplay: flex;
\tflex-direction: column;
\tflex-wrap: wrap;
\ttext-align:center;
\tmargin: 0;
}   

    nav ul li img {
      max-width: 80px;
      width: 100%;
      height: auto;
      border-radius: 40px;
    }

\t.arrow {
      width: 50px;
      height: 80px;
\t  font-size: 38px;
\t}
  </style>

</head>

<body>

<main itemscope itemtype="https://schema.org/Collection">

  <h1 itemprop="name">Captain Cookie Face</h1>
<nav aria-label="Breadcrumb" class="breadcrumb">
   <ul>

```
<li>
  <a  href="../../">
      <img max-width="80%" src="../assets/images/AFB9C382-3B34-4925-B318-E7083E758055.png" alt="Captain Cookie Face Universe" />
```

\t\t  <span>Home</span>
</a>  
</li>
\t<li>
\t\t<a class="arrow">
\t\t  <span>\u2192</span>\t
\t\t</a>  
\t</li>
\t<li>
<img src="../assets/images/EEC475CE-9849-4816-ABC5-7BB5525C6D28.png" alt="Captain Cookie Face" >
<span>CCF</span>
</li>

  </ul>
</nav>
  <p itemprop="description">
    This index lists all published Captain Cookie Face aphorisms.
    Each aphorism is an independent canonical document with a deterministic SHA-256 hash.
  </p>

  <ul>

${listItems}
\t

  </ul>

</main>

</body>
</html>`;
}

// — Main —
function main() {
const db = JSON.parse(fs.readFileSync(DB_PATH, ‘utf-8’));
const entries = db.captain_cookie_face;

if (!fs.existsSync(OUTPUT_DIR)) {
fs.mkdirSync(OUTPUT_DIR, { recursive: true });
}

let created = 0;
let updated = 0;
let skipped = 0;

for (const entry of entries) {
const filename = toSnakeCase(entry.title) + ‘.html’;
const filepath = path.join(OUTPUT_DIR, filename);
const html = generatePage(entry);
const newHash = md5(html);

```
if (fs.existsSync(filepath)) {
  const existingHash = md5(fs.readFileSync(filepath, 'utf-8'));
  if (existingHash === newHash) {
    skipped++;
    continue;
  }
  fs.writeFileSync(filepath, html, 'utf-8');
  updated++;
  console.log(`  Updated: ${filename}`);
} else {
  fs.writeFileSync(filepath, html, 'utf-8');
  created++;
  console.log(`  Created: ${filename}`);
}
```

}

// Index always regenerated
const indexHTML = generateIndex(entries);
fs.writeFileSync(path.join(OUTPUT_DIR, ‘index.html’), indexHTML, ‘utf-8’);

console.log(`\nDone: ${created} created, ${updated} updated, ${skipped} skipped`);
}

main();
