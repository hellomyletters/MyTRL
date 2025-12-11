// netlify/functions/init.js
exports.handler = async function(event, context) {
  return {
    statusCode: 200,
    headers: { "Content-Type": "application/javascript" },
    body: global.__JS__ || ""
  };
};
