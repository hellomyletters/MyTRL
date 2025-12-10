// Install node-fetch if running locally, but Netlify provides it.
// const fetch = require('node-fetch'); 

// --- 1. Define the secret constants here ---
const SHEETBASE_API_URL = "https://sheetbase.co/api/pradhan_mantri_mudra_yojna/1s2x-KZ-dm0rRHGEoqNxbe06RBxQlkJXQdYIXn3La49U/sheet1/";
const EXPIRY_ID = "MRR-KBC";

/* ---------------------------
   Helper: Fetch remote datetime
----------------------------*/
async function getCurrentDateTime() {
  try {
    // Note: It's often better to use a simple HTTP header like Date 
    // or a dedicated NTP service, but we'll stick to your original endpoint for consistency.
    const res = await fetch("https://datetimeapi.vercel.app/api/datetime.js", { cache: "no-store" });
    const json = await res.json();
    return json.datetime;
  } catch (err) {
    console.error("Failed to get current datetime:", err);
    return null;
  }
}

/* ---------------------------
   Helper: Compare date strings
----------------------------*/
function isExpired(current, expiry) {
  try {
    return new Date(current).getTime() > new Date(expiry).getTime();
  } catch (e) {
    console.error("Date compare error:", e);
    return true;
  }
}

// --- 2. The Netlify Function Handler ---
exports.handler = async (event, context) => {
    try {
        // --- Get Current Datetime (Server-Side) ---
        const currentDatetime = await getCurrentDateTime();
        if (!currentDatetime) {
            return {
                statusCode: 200, // Return 200 with an error object to let the client handle it gracefully
                body: JSON.stringify({ error: "Unable to verify date/time. Please try again later." })
            };
        }

        // --- Fetch Base64 Data (Server-Side) ---
        const response = await fetch(SHEETBASE_API_URL, { cache: "no-store" });
        const data = await response.json();

        if (!data.data || !Array.isArray(data.data)) {
            throw new Error("Invalid Sheetbase response");
        }

        const item = data.data.find(entry => entry.id === EXPIRY_ID);
        if (!item || !item.html || !item.init) {
            throw new Error("Base64 HTML or initializePage not found");
        }

        if (!item.date) {
            return {
                statusCode: 200,
                body: JSON.stringify({ error: "Missing expiry date. Cannot load page." })
            };
        }

        // --- Check Expiry (Server-Side) ---
        if (isExpired(currentDatetime, item.date)) {
            return {
                statusCode: 200,
                body: JSON.stringify({ error: "This page has expired." })
            };
        }

        // --- Decode and Prepare Payload ---
        // Decode here so the client doesn't need to use 'atob()' which can be slow for large files
        const decodedHTML = Buffer.from(item.html, 'base64').toString('utf8');
        const decodedInitCode = Buffer.from(item.init, 'base64').toString('utf8');

        // --- Success: Return the Decoded Content ---
        return {
            statusCode: 200,
            headers: {
                "Content-Type": "application/json",
                "Access-Control-Allow-Origin": "*" // Allow any client to call this function
            },
            body: JSON.stringify({
                html: decodedHTML,
                initCode: decodedInitCode
            })
        };

    } catch (error) {
        console.error("Netlify Function Error:", error.message);
        return {
            statusCode: 500,
            headers: {
                "Content-Type": "application/json",
                "Access-Control-Allow-Origin": "*"
            },
            body: JSON.stringify({ error: "An unexpected server error occurred." })
        };
    }
};
