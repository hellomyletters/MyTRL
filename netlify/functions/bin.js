// netlify/functions/bin.js

const fs = require("fs");
const path = require("path");

exports.handler = async () => {
  try {
    const filePath = path.join(__dirname, "bin.txt");

    if (!fs.existsSync(filePath)) {
      return {
        statusCode: 404,
        headers: { "content-type": "text/plain" },
        body: "BIN missing"
      };
    }

    const b64 = fs.readFileSync(filePath, "utf8");

    return {
      statusCode: 200,
      headers: { "content-type": "text/plain" },
      body: b64
    };

  } catch (err) {
    return {
      statusCode: 500,
      headers: { "content-type": "text/plain" },
      body: "Server error"
    };
  }
};
