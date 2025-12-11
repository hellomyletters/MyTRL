// Netlify Function: page.js
</html>`;


// 6) Triple-layer obfuscation: base64 -> reverse -> base64
const layerA = Buffer.from(fullPage, 'utf8').toString('base64');
const layerB = layerA.split('').reverse().join('');
const layerC = Buffer.from(layerB, 'utf8').toString('base64');


// 7) Return an HTML payload that contains only the obfuscated string + a small decoder script.
// The browser will decode locally — NO network calls.
const out = `<!doctype html>
<html>
<head>
<meta charset="utf-8">
<title>Loading...</title>
</head>
<body>
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
console.error('Decode error', e);
document.open();
document.write('<h2>Page load error</h2>');
document.close();
}
})();
</script>
</body>
</html>`;


return {
statusCode: 200,
headers: {
'Content-Type': 'text/html; charset=utf-8',
// no-cache recommended to ensure fresh content if your Sheetbase updates often
'Cache-Control': 'no-store'
},
body: out
};


} catch (err) {
console.error(err);
return { statusCode: 500, headers: { 'Content-Type': 'text/html' }, body: '<h2>Internal server error</h2>' };
}
}
