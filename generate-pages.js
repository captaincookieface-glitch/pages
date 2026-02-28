const fs = require(‘fs’);
const path = require(‘path’);
const crypto = require(‘crypto’);

const DB_PATH = path.join(__dirname, ‘captain.json’);
const OUTPUT_DIR = path.join(__dirname, ‘captain_cookie_face’);
const PINATA_BASE = ‘https://indigo-managerial-opossum-856.mypinata.cloud/ipfs/’;
const DAY1 = new Date(2025, 10, 10);

function toSnakeCase(title) {
return title
.normalize(‘NFC’)
.replace(/[’\u2019]/g, ‘’)
.replace(/[^a-zA-Z0-9\s]/g, ’ ’)
.trim()
.replace(/\s+/g, ‘_’)
.toLowerCase();
}

function parseDate(dateStr) {
var parts = dateStr.split(’/’);
var m = parseInt(parts[0], 10);
var d = parseInt(parts[1], 10);
var y = parseInt(parts[2], 10);
if (y < 100) y = y + 2000;
return new Date(y, m - 1, d);
}

function getDayNumber(dateStr) {
var d = parseDate(dateStr);
var diff = Math.round((d - DAY1) / (1000 * 60 * 60 * 24));
return diff + 1;
}

function toISODate(dateStr) {
var d = parseDate(dateStr);
var yyyy = d.getFullYear();
var mm = String(d.getMonth() + 1).padStart(2, ‘0’);
var dd = String(d.getDate()).padStart(2, ‘0’);
return yyyy + ‘-’ + mm + ‘-’ + dd;
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

function generatePage(entry) {
var pinataBlock = ‘’;
if (entry.pinata_cid) {
pinataBlock = ‘\n <div class="block">\n’ +
’      <img src=”’ + PINATA_BASE + entry.pinata_cid + ‘/image.jpeg” \n’ +
’     alt=”’ + escapeHTML(entry.title) + ‘” \n’ +
’     style=“max-width: 100%; height: auto;” />\n’ +
’  </div>\n’;
}

var html = ‘<!DOCTYPE html>\n’ +
‘<html lang="en">\n’ +
‘<head>\n’ +
’  <meta charset="UTF-8">\n’ +
’  <title>’ + escapeHTML(entry.title) + ‘</title>\n’ +
’  <style>\n’ +
’    body {\n’ +
’      font-family:\n’ +
’        Arial,\n’ +
’        “Helvetica Neue”,\n’ +
’        Helvetica,\n’ +
’        system-ui,\n’ +
’        sans-serif;\n’ +
’      background: #fff;\n’ +
’    }\n’ +
’    .block {\n’ +
’      margin-bottom: 20px;\n’ +
’      padding: 15px;\n’ +
’      background: #fff;\n’ +
’      border: 1px solid #eee;\n’ +
’      word-wrap: break-word;\n’ +
’    }\n’ +
’    .key {\n’ +
’      color: #000;\n’ +
’      font-size: 2em !important;\n’ +
’      text-transform: capitalize;\n’ +
’      font-weight: bold;\n’ +
’    }\n’ +
’    .hash {\n’ +
’      word-break: break-all;\n’ +
’      color: #4287f5;\n’ +
’    }\n’ +
’    a {\n’ +
’      color: #4287f5;\n’ +
’      text-decoration: underline;\n’ +
’    }\n’ +
’    pre {\n’ +
’      white-space: pre-wrap;\n’ +
’    }\n’ +
’    button {\n’ +
’      font-family: inherit;\n’ +
’      padding: 6px 10px;\n’ +
’      border: 1px solid #ccc;\n’ +
’      background: #f9f9f9;\n’ +
’      cursor: pointer;\n’ +
’    }\n’ +
’    button:hover {\n’ +
’      background: #eee;\n’ +
’    }\n’ +
’    h1 {\n’ +
’      margin-bottom: 10px;\n’ +
’      font-size: 32px;\n’ +
’    }\n’ +
’    nav {\n’ +
’      background-color:#e1e1e1;\n’ +
’      padding: 10px;\n’ +
’    }\n’ +
’    nav > ul {\n’ +
’      display: flex;\n’ +
’      flex-wrap: wrap;\n’ +
’      flex-direction: row;\n’ +
’      list-style: none;\n’ +
’      padding:0;\n’ +
’      margin: 0;\n’ +
’    }\n’ +
’    nav > ul > li, nav > ul > li > a{\n’ +
’      display: flex;\n’ +
’      flex-direction: column;\n’ +
’      flex-wrap: wrap;\n’ +
’      text-align:center;\n’ +
’      margin: 0;\n’ +
’    }\n’ +
’    nav ul li img {\n’ +
’      max-width: 80px;\n’ +
’      width: 100%;\n’ +
’      height: auto;\n’ +
’      border-radius: 40px;\n’ +
’    }\n’ +
’    .arrow {\n’ +
’      width: 50px;\n’ +
’      height: 80px;\n’ +
’      font-size: 38px;\n’ +
’    }\n’ +
’  </style>\n’ +
‘</head>\n’ +
‘<body>\n’ +
‘\n’ +
‘<article itemscope itemtype="https://schema.org/CreativeWork">\n’ +
‘\n’ +
’  <meta itemprop="identifier" content="' + entry.id + '">\n’ +
’  <meta itemprop="dateCreated" content="' + entry.date + '">\n’ +
‘\t\n’ +
‘<h1 itemprop="name">’ + escapeHTML(entry.title) + ‘</h1>\n’ +
‘<nav aria-label="Breadcrumb" class="breadcrumb">\n’ +
’   <ul>\n’ +
’    <li>\n’ +
’      <a  href="../">\n’ +
’          <img max-width="80%" src="../assets/images/AFB9C382-3B34-4925-B318-E7083E758055.png" alt="Captain Cookie Face Universe" />\n’ +
‘\t\t  <span>Home</span>\n’ +
’      </a>      \n’ +
’    </li> \n’ +
‘\t<li>\n’ +
‘\t\t<a class="arrow">\n’ +
‘\t\t  <span>\u2192</span>\t\n’ +
‘\t\t</a>   \n’ +
‘\t</li>\n’ +
‘\t<li>\n’ +
‘\t  <a  href="./">\n’ +
’      <img src="../assets/images/EEC475CE-9849-4816-ABC5-7BB5525C6D28.png" alt="Captain Cookie Face" >\n’ +
’      <span>CCF</span>\n’ +
’      </a>\n’ +
‘\t</li> \n’ +
’    <li>\n’ +
‘\t\t<a class="arrow">\n’ +
‘\t\t  <span>\u2192</span>\t\n’ +
‘\t\t</a>   \n’ +
‘\t</li>\t\n’ +
‘\t<li>\n’ +
’      <img src="../assets/images/EEC475CE-9849-4816-ABC5-7BB5525C6D28.png" alt="Captain Cookie Face" >\n’ +
’      <span>’ + escapeHTML(entry.title) + ‘</span>\n’ +
‘\t</li> \n’ +
’  </ul>\n’ +
‘</nav>\n’ +
‘\n’ +
’  <div class="block" id="rendered"></div>\n’ +
‘\n’ +
’  <div class="block">\n’ +
’    <div class="key">SHA-256</div>\n’ +
’    <div style="display:flex; gap:10px; align-items:center;">\n’ +
’      <div class="hash" id="hashResult"></div>\n’ +
’      <button id="copyHashBtn" type="button">Copy</button>\n’ +
’    </div>\n’ +
’  </div>\n’ +
pinataBlock +
‘</article>\n’ +
‘\n’ +
‘<script>\n’ +
‘(async () => {\n’ +
‘\n’ +
’  const entry = {\n’ +
’    id: “’ + escapeJS(entry.id) + ‘”,\n’ +
’    safecreative_url: “’ + escapeJS(entry.safecreative_url) + ‘”,\n’ +
’    title: “’ + escapeJS(entry.title) + ‘”,\n’ +
’    date: “’ + escapeJS(entry.date) + ‘”,\n’ +
’    text: “’ + escapeJS(entry.text) + ‘”,\n’ +
’    nft_url: “’ + escapeJS(entry.nft_url) + ‘”,\n’ +
’    tweet_url: “’ + escapeJS(entry.tweet_url) + ‘”\n’ +
’  };\n’ +
‘\n’ +
’  const canonicalString = [\n’ +
’    entry.id,\n’ +
’    entry.safecreative_url,\n’ +
’    entry.title,\n’ +
’    entry.date,\n’ +
’    entry.text,\n’ +
’    entry.nft_url,\n’ +
’    entry.tweet_url\n’ +
’  ].join('\n—\n');\n’ +
‘\n’ +
’  const data = new TextEncoder().encode(canonicalString);\n’ +
’  const hashBuffer = await crypto.subtle.digest('SHA-256', data);\n’ +
’  const hashHex = […new Uint8Array(hashBuffer)]\n’ +
’    .map(b => b.toString(16).padStart(2, '0'))\n’ +
’    .join('');\n’ +
‘\n’ +
’  document.getElementById('hashResult').textContent = hashHex;\n’ +
‘\n’ +
’  const container = document.getElementById('rendered');\n’ +
‘\n’ +
’  for (const [key, value] of Object.entries(entry)) {\n’ +
’    const div = document.createElement('div');\n’ +
’    div.className = 'block';\n’ +
‘\n’ +
’    const label = document.createElement('div');\n’ +
’    label.className = 'key';\n’ +
’    label.textContent = key;\n’ +
’    div.appendChild(label);\n’ +
‘\n’ +
’    if (key.endsWith('_url') && value) {\n’ +
’      const a = document.createElement('a');\n’ +
’      a.href = value;\n’ +
’      a.textContent = value;\n’ +
’      a.target = '_blank';\n’ +
’      div.appendChild(a);\n’ +
’    } else {\n’ +
’      const pre = document.createElement('pre');\n’ +
’      pre.textContent = value;\n’ +
’      div.appendChild(pre);\n’ +
’    }\n’ +
‘\n’ +
’    container.appendChild(div);\n’ +
’  }\n’ +
‘\n’ +
’  document.getElementById('copyHashBtn').addEventListener('click', () => {\n’ +
’    navigator.clipboard.writeText(hashHex);\n’ +
’    alert('Hash copied');\n’ +
’  });\n’ +
‘\n’ +
‘})();\n’ +
‘</script>\n’ +
‘\n’ +
‘</body>\n’ +
‘</html>’;

return html;
}

function generateIndex(entries) {
var listItems = entries.map(function(entry) {
var filename = toSnakeCase(entry.title) + ‘.html’;
var day = getDayNumber(entry.date);
var isoDate = toISODate(entry.date);

```
return '    <li itemprop="hasPart" itemscope itemtype="https://schema.org/CreativeWork">\n' +
  '      <a itemprop="url" href="./' + filename + '">\n' +
  '        <span itemprop="name">' + escapeHTML(entry.title) + '</span>\n' +
  '      </a>\n' +
  '      <div class="meta">\n' +
  '        Day ' + day + ' \u00b7 ' + isoDate + '\n' +
  '      </div>\n' +
  '    </li>';
```

}).join(’\n\n’);

var indexHTML = ‘<!DOCTYPE html>\n’ +
‘<html lang="en">\n’ +
‘<head>\n’ +
’  <meta charset="UTF-8">\n’ +
’  <title>Captain Cookie Face Aphorisms</title>\n’ +
‘\n’ +
’  <meta name="description" content="Index of aphorisms published by Captain Cookie Face. Each aphorism is a standalone canonical document with a cryptographic hash.">\n’ +
‘\n’ +
’  <style>\n’ +
’    body {\n’ +
’      font-family:\n’ +
’        Arial,\n’ +
’        “Helvetica Neue”,\n’ +
’        Helvetica,\n’ +
’        system-ui,\n’ +
’        sans-serif;\n’ +
’      background: #fff;\n’ +
’    }\n’ +
‘\n’ +
’    h1 {\n’ +
’      margin-bottom: 10px;\n’ +
‘\t  font-size: 32px;\n’ +
’    }\n’ +
‘\t  \n’ +
’    a {\n’ +
’      color: #4287f5;\n’ +
’      text-decoration: underline;\n’ +
’    }\n’ +
‘\n’ +
’    .meta {\n’ +
’      color: #666;\n’ +
’      font-size: 0.9em;\n’ +
’    }\n’ +
‘\n’ +
‘nav {\n’ +
‘\tbackground-color:#e1e1e1;\n’ +
‘\tpadding: 10px;\n’ +
‘}\n’ +
‘\n’ +
‘nav > ul {\n’ +
‘\tdisplay: flex;\n’ +
‘\tflex-wrap: wrap;\n’ +
‘\tflex-direction: row;\n’ +
‘\tlist-style: none;\n’ +
‘\tpadding:0;\n’ +
‘\tmargin: 0;\n’ +
‘\t\n’ +
‘}   \n’ +
‘\n’ +
‘nav > ul > li, nav > ul > li > a{\n’ +
‘\tdisplay: flex;\n’ +
‘\tflex-direction: column;\n’ +
‘\tflex-wrap: wrap;\n’ +
‘\ttext-align:center;\n’ +
‘\tmargin: 0;\n’ +
‘}   \n’ +
‘\n’ +
’    nav ul li img {\n’ +
’      max-width: 80px;\n’ +
’      width: 100%;\n’ +
’      height: auto;\n’ +
’      border-radius: 40px;\n’ +
’    }\n’ +
‘\n’ +
‘\t.arrow {\n’ +
’      width: 50px;\n’ +
’      height: 80px;\n’ +
‘\t  font-size: 38px;\n’ +
‘\t}\n’ +
’  </style>\n’ +
‘</head>\n’ +
‘\n’ +
‘<body>\n’ +
‘\n’ +
‘<main itemscope itemtype="https://schema.org/Collection">\n’ +
‘\n’ +
’  <h1 itemprop="name">Captain Cookie Face</h1>\n’ +
‘<nav aria-label="Breadcrumb" class="breadcrumb">\n’ +
’   <ul>\n’ +
‘\n’ +
’    <li>\n’ +
’      <a  href="../../">\n’ +
’          <img max-width="80%" src="../assets/images/AFB9C382-3B34-4925-B318-E7083E758055.png" alt="Captain Cookie Face Universe" />\n’ +
‘\t\t  <span>Home</span>\n’ +
’      </a>      \n’ +
’    </li> \n’ +
‘\t<li>\n’ +
‘\t\t<a class="arrow">\n’ +
‘\t\t  <span>\u2192</span>\t\n’ +
‘\t\t</a>   \n’ +
‘\t</li>\n’ +
‘\t<li>\n’ +
’      <img src="../assets/images/EEC475CE-9849-4816-ABC5-7BB5525C6D28.png" alt="Captain Cookie Face" >\n’ +
’      <span>CCF</span>\n’ +
’    </li> \n’ +
’    \n’ +
’  </ul>\n’ +
‘</nav>\n’ +
’  <p itemprop="description">\n’ +
’    This index lists all published Captain Cookie Face aphorisms.\n’ +
’    Each aphorism is an independent canonical document with a deterministic SHA-256 hash.\n’ +
’  </p>\n’ +
‘\n’ +
’  <ul>\n’ +
‘\n’ +
listItems + ‘\n’ +
‘\t  \n’ +
’  </ul>\n’ +
‘\n’ +
‘</main>\n’ +
‘\n’ +
‘</body>\n’ +
‘</html>’;

return indexHTML;
}

function main() {
var db = JSON.parse(fs.readFileSync(DB_PATH, ‘utf-8’));
var entries = db.captain_cookie_face;

if (!fs.existsSync(OUTPUT_DIR)) {
fs.mkdirSync(OUTPUT_DIR, { recursive: true });
}

var created = 0;
var updated = 0;
var skipped = 0;

for (var i = 0; i < entries.length; i++) {
var entry = entries[i];
var filename = toSnakeCase(entry.title) + ‘.html’;
var filepath = path.join(OUTPUT_DIR, filename);
var html = generatePage(entry);
var newHash = md5(html);

```
if (fs.existsSync(filepath)) {
  var existingHash = md5(fs.readFileSync(filepath, 'utf-8'));
  if (existingHash === newHash) {
    skipped++;
    continue;
  }
  fs.writeFileSync(filepath, html, 'utf-8');
  updated++;
  console.log('  Updated: ' + filename);
} else {
  fs.writeFileSync(filepath, html, 'utf-8');
  created++;
  console.log('  Created: ' + filename);
}
```

}

var indexHTML = generateIndex(entries);
fs.writeFileSync(path.join(OUTPUT_DIR, ‘index.html’), indexHTML, ‘utf-8’);

console.log(’’);
console.log(‘Done: ’ + created + ’ created, ’ + updated + ’ updated, ’ + skipped + ’ skipped’);
}

main();
