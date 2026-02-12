const fs = require('fs');
const http = require('http');
const https = require('https');
const { URL } = require('url');
const crypto = require('crypto');
const config = require('../config');

function formEncodeRFC1738(str) {
  return encodeURIComponent(str)
    .replace(/%20/g, '+')
    .replace(/%21/g, '!')
    .replace(/%27/g, "'")
    .replace(/%28/g, '(')
    .replace(/%29/g, ')')
    .replace(/%2a/g, '*')
    .replace(/%7e/g, '~');
}

function computeCheckMacValue(params, HashKey, HashIV) {
  const p = { ...params };
  delete p.CheckMacValue;
  const keys = Object.keys(p).sort((a, b) => a.localeCompare(b));
  const raw = `HashKey=${HashKey}&${keys.map(k => `${k}=${p[k]}`).join('&')}&HashIV=${HashIV}`;
  const encoded = formEncodeRFC1738(raw).toLowerCase();
  const hash = crypto.createHash('md5').update(encoded).digest('hex').toUpperCase();
  return { raw, encoded, hash };
}

function postJson(path, data) {
  return new Promise((resolve, reject) => {
    const payload = JSON.stringify(data);
    const options = {
      hostname: 'localhost',
      port: 4000,
      path,
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(payload),
      },
    };

    const req = http.request(options, (res) => {
      let body = '';
      res.setEncoding('utf8');
      res.on('data', (chunk) => (body += chunk));
      res.on('end', () => {
        try {
          resolve({ status: res.statusCode, body: JSON.parse(body) });
        } catch (e) {
          resolve({ status: res.statusCode, body });
        }
      });
    });
    req.on('error', reject);
    req.write(payload);
    req.end();
  });
}

(async () => {
  try {
    const orderRes = await postJson('/api/orders', { userId: 1, productList: [{ productId: 33, quantity: 1, name: 'abb' }], totalAmount: 100 });
    const tradeNo = `T${orderRes.body.orderId}`;
    const paymentRes = await postJson('/api/orders/payment', { tradeNo, amount: 100, itemName: 'abb' });
    const html = paymentRes.body.paymentForm;

    // parse inputs
    const inputRegex = /<input[^>]*name="([^"]+)"[^>]*value="([^"]*)"/gi;
    const fields = {};
    let m;
    while ((m = inputRegex.exec(html))) fields[m[1]] = m[2];

    console.log('\n===COMPARE START===');
    console.log('Extracted fields:', fields);

    const { raw, encoded, hash } = computeCheckMacValue(fields, config.HashKey, config.HashIV);
    console.log('\nComputed CheckMacValue (method A - encode, toLower, specialReplace):', hash);
    console.log('CheckMacValue included in form:', fields.CheckMacValue);
    console.log('Match A?', hash === fields.CheckMacValue);

    // Variant B: apply special replace BEFORE toLowerCase
    function computeVariantB(params, HashKey, HashIV){
      const p = { ...params }; delete p.CheckMacValue;
      const keys = Object.keys(p).sort((a,b)=>a.toLowerCase().localeCompare(b.toLowerCase()));
      const raw2 = `HashKey=${HashKey}&${keys.map(k=>`${k}=${p[k]}`).join('&')}&HashIV=${HashIV}`;
      let enc2 = encodeURIComponent(raw2).replace(/%20/g,'+');
      enc2 = applyECPaySpecialReplace(enc2);
      enc2 = enc2.toLowerCase();
      const h2 = crypto.createHash('sha256').update(enc2).digest('hex').toUpperCase();
      return { raw: raw2, encoded: enc2, hash: h2 };
    }
    const vB = computeVariantB(fields, config.HashKey, config.HashIV);
    console.log('Variant B hash:', vB.hash, 'Match B?', vB.hash === fields.CheckMacValue);

    // Variant C: ASCII case-sensitive key sorting
    function computeVariantC(params, HashKey, HashIV){
      const p = { ...params }; delete p.CheckMacValue;
      const keys = Object.keys(p).sort();
      const raw3 = `HashKey=${HashKey}&${keys.map(k=>`${k}=${p[k]}`).join('&')}&HashIV=${HashIV}`;
      let enc3 = encodeURIComponent(raw3).replace(/%20/g,'+');
      enc3 = applyECPaySpecialReplace(enc3);
      enc3 = enc3.toLowerCase();
      const h3 = crypto.createHash('sha256').update(enc3).digest('hex').toUpperCase();
      return { raw: raw3, encoded: enc3, hash: h3 };
    }
    const vC = computeVariantC(fields, config.HashKey, config.HashIV);
    console.log('Variant C hash (ASCII sort):', vC.hash, 'Match C?', vC.hash === fields.CheckMacValue);

    // Variant D: try without toLowerCase
    function computeVariantD(params, HashKey, HashIV){
      const p = { ...params }; delete p.CheckMacValue;
      const keys = Object.keys(p).sort((a,b)=>a.toLowerCase().localeCompare(b.toLowerCase()));
      const raw4 = `HashKey=${HashKey}&${keys.map(k=>`${k}=${p[k]}`).join('&')}&HashIV=${HashIV}`;
      let enc4 = encodeURIComponent(raw4).replace(/%20/g,'+');
      enc4 = applyECPaySpecialReplace(enc4);
      const h4 = crypto.createHash('sha256').update(enc4).digest('hex').toUpperCase();
      return { raw: raw4, encoded: enc4, hash: h4 };
    }
    const vD = computeVariantD(fields, config.HashKey, config.HashIV);
    console.log('Variant D hash (no toLower):', vD.hash, 'Match D?', vD.hash === fields.CheckMacValue);

    // Variant E: try MD5 (just in case)
    function computeVariantE(params, HashKey, HashIV){
      const p = { ...params }; delete p.CheckMacValue;
      const keys = Object.keys(p).sort((a,b)=>a.toLowerCase().localeCompare(b.toLowerCase()));
      const raw5 = `HashKey=${HashKey}&${keys.map(k=>`${k}=${p[k]}`).join('&')}&HashIV=${HashIV}`;
      let enc5 = encodeURIComponent(raw5).replace(/%20/g,'+');
      enc5 = applyECPaySpecialReplace(enc5);
      enc5 = enc5.toLowerCase();
      const h5 = crypto.createHash('md5').update(enc5).digest('hex').toUpperCase();
      return { raw: raw5, encoded: enc5, hash: h5 };
    }
    const vE = computeVariantE(fields, config.HashKey, config.HashIV);
    console.log('Variant E hash (MD5):', vE.hash, 'Match E?', vE.hash === fields.CheckMacValue);

    console.log('===COMPARE END===\n');

    // Optionally write the html to file
    fs.writeFileSync('scripts/last_ecpay_form.html', html);

  } catch (e) {
    console.error('ERR', e);
  }
})();