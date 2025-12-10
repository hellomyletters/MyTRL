
// netlify/functions/data.js
// Netlify Function: proxies Sheetbase + Datetime API so browser never sees them.

export async function handler(event, context) {
  try {
    // Put your real URLs into Netlify environment variables (recommended).
    // - SHEETBASE_URL (required)
    // - DATETIME_URL (optional, default provided)
    const SHEETBASE_URL = process.env.SHEETBASE_URL
      || "https://sheetbase.co/api/pradhan_mantri_mudra_yojna/1s2x-KZ-dm0rRHGEoqNxbe06RBxQlkJXQdYIXn3La49U/sheet1/";
    const DATETIME_URL = process.env.DATETIME_URL
      || "https://datetimeapi.vercel.app/api/datetime.js";

    // Optionally, you can add server-side caching logic here.
    // For now we fetch fresh from both endpoints (no-store).
    const [sheetRes, timeRes] = await Promise.all([
      fetch(SHEETBASE_URL, { cache: "no-store" }),
      fetch(DATETIME_URL, { cache: "no-store" })
    ]);

    if (!sheetRes.ok) {
      return {
        statusCode: 502,
        body: JSON.stringify({ error: "Failed to fetch Sheetbase", status: sheetRes.status })
      };
    }
    if (!timeRes.ok) {
      return {
        statusCode: 502,
        body: JSON.stringify({ error: "Failed to fetch datetime", status: timeRes.status })
      };
    }

    const sheetData = await sheetRes.json();
    const timeData = await timeRes.json();

    // Return combined JSON to browser
    return {
      statusCode: 200,
      headers: {
        "Content-Type": "application/json",
        // no-store ensures browser won't cache responses if you need live checks
        "Cache-Control": "no-store"
      },
      body: JSON.stringify({
        sheet: sheetData,
        datetime: timeData.datetime ?? timeData // some datetime APIs return different shapes
      })
    };
  } catch (err) {
    console.error("Function error:", err);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: "Internal server error" })
    };
  }
}
