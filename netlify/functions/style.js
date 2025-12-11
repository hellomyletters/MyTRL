// netlify/functions/style.js
exports.handler = async function(event, context) {
  return {
    statusCode: 200,
    headers: { "Content-Type": "text/css" },
    body: global.__CSS__ || ""
  };
};
