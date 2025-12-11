// netlify/functions/page.js
// Robust: does NOT rely on shared memory. All content passed via tokens in URLs.

exports.handler = async function(event, context) {
  const expiryId = "TRL";
  const sheetbaseApiUrl = "https://sheetbase.co/api/pradhan_mantri_mudra_yojna/1s2x-KZ-dm0rRHGEoqNxbe06RBxQlkJXQdYIXn3La49U/sheet1/";
  const datetimeApiUrl  = "https://datetimeapi.vercel.app/api/datetime.js";

  // If this request is asking for CSS via token
  try {
    const qs = event.queryStringParameters || {};
    if (qs.cssToken) {
      // decode base64 token -> css text
      try {
        const css = Buffer.from(qs.cssToken, "base64").toString("utf8");
        return {
          statusCode: 200,
          headers: { "Content-Type": "text/css; charset=utf-8" },
          body: css
        };
      } catch (e) {
        return { statusCode: 400, body: "/* invalid css token */" };
      }
    }

    if (qs.jsToken) {
      try {
        const js = Buffer.from(qs.jsToken, "base64").toString("utf8");
        return {
          statusCode: 200,
          headers: { "Content-Type": "application/javascript; charset=utf-8" },
          body: js
        };
      } catch (e) {
        return { statusCode: 400, body: "// invalid js token" };
      }
    }
  } catch (err) {
    // fallthrough to main render below on unexpected issues
  }

  // Normal page render (server-side fetch + build)
  try {
    // fetch datetime
    const tRes = await fetch(datetimeApiUrl);
    if (!tRes.ok) return { statusCode: 500, body: "<h2>Datetime fetch error</h2>" };
    const tjson = await tRes.json();
    if (!tjson || !tjson.datetime) return { statusCode: 500, body: "<h2>Datetime error</h2>" };
    const serverDatetime = tjson.datetime;

    // fetch sheetbase
    const sRes = await fetch(sheetbaseApiUrl);
    if (!sRes.ok) return { statusCode: 500, body: "<h2>Sheetbase fetch error</h2>" };
    const data = await sRes.json();

    let item = null;
    if (data && Array.isArray(data.data)) {
      for (const entry of data.data) {
        if (String(entry.id) === String(expiryId)) { item = entry; break; }
      }
    }
    if (!item) return { statusCode: 404, body: "<h2>Entry missing</h2>" };

    // expiry check
    const serverDT = new Date(serverDatetime);
    const expiryDT = new Date(item.date);
    if (isNaN(serverDT) || isNaN(expiryDT)) return { statusCode: 500, body: "<h2>Datetime parse error</h2>" };
    if (serverDT > expiryDT) return { statusCode: 200, body: "<h2>This Page is expired.</h2>" };

    // decode base64 fields (like your PHP)
    const decodedHTML = item.html ? Buffer.from(item.html, "base64").toString("utf8") : "";
    const decodedCSS  = item.css  ? Buffer.from(item.css,  "base64").toString("utf8") : "";
    const decodedJS   = item.init ? Buffer.from(item.init, "base64").toString("utf8") : "";

    // create tokens: base64-encode CSS/JS so browser can request them
    // token is safe to put in URL but we'll also encodeURIComponent it when building URLs
    const cssToken = Buffer.from(decodedCSS, "utf8").toString("base64");
    const jsToken  = Buffer.from(decodedJS,  "utf8").toString("base64");

    // Build the "fullPage" HTML that will be triple-encoded and delivered to client.
    // The page links to the same function with tokens that carry the CSS/JS contents.
    const cssUrl = "/.netlify/functions/page?cssToken=" + encodeURIComponent(cssToken);
    const jsUrl  = "/.netlify/functions/page?jsToken="  + encodeURIComponent(jsToken);

    const fullPage = `
<link rel='stylesheet' href="${cssUrl}">
<
