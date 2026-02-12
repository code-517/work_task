const http = require('http');
const https = require('https');
const { URL } = require('url');

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

function postForm(urlStr, fields) {
  return new Promise((resolve, reject) => {
    const url = new URL(urlStr);
    // RFC1738 style form-encoding: encodeURIComponent then replace %20 with +
    const formEncode = (s) => encodeURIComponent(s).replace(/%20/g, '+');
    const body = Object.entries(fields)
      .map(([k, v]) => `${formEncode(k)}=${formEncode(v)}`)
      .join('&');

    const finalRequestBody = body; // RFC1738 encoded body

    // write the exact request body to file for debugging
    const fs = require('fs');
    fs.writeFileSync('scripts/last_request_body.txt', finalRequestBody);
    console.log('Wrote request body to scripts/last_request_body.txt');

    const options = {
      hostname: url.hostname,
      port: url.port || 443,
      path: url.pathname + (url.search || ''),
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'Content-Length': Buffer.byteLength(body),
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/117.0.0.0 Safari/537.36',
        'Referer': 'http://localhost:3000',
      },
    };

    const req = https.request(options, (res) => {
      let resp = '';
      res.setEncoding('utf8');
      res.on('data', (c) => (resp += c));
      res.on('end', () => resolve({ status: res.statusCode, body: resp }));
    });

    req.on('error', (e) => reject(e));
    req.write(body);
    req.end();
  });
}

(async () => {
  try {
    const orderPayload = { userId: 1, productList: [{ productId: 33, quantity: 1, name: 'abb' }], totalAmount: 100 };
    console.log('Create order...');
    const orderRes = await postJson('/api/orders', orderPayload);
    if (!orderRes.body.orderId) return console.error('no orderId', orderRes);
    // Prefer tradeNo returned by server (which may be padded to satisfy ECPay rules)
    const tradeNo = orderRes.body.tradeNo || `T${orderRes.body.orderId}`;

    console.log('Request payment form...');
    console.log('Payment request body:', { tradeNo, amount: 100, itemName: 'abb' });
    const paymentRes = await postJson('/api/orders/payment', { tradeNo, amount: 100, itemName: 'abb' });
    console.log('Payment response:', paymentRes);
    if (!paymentRes.body || !paymentRes.body.paymentForm) return console.error('no paymentForm', paymentRes);

    const html = paymentRes.body.paymentForm;
    // parse inputs
    const inputRegex = /<input[^>]*name="([^\"]+)"[^>]*value="([^\"]*)"/gi;
    const fields = {};
    let m;
    while ((m = inputRegex.exec(html))) fields[m[1]] = m[2];

    const actionMatch = html.match(/<form[^>]*action="([^"]+)"/i);
    const action = actionMatch ? actionMatch[1] : 'https://payment-stage.ecpay.com.tw/Cashier/AioCheckOut/V5';

    console.log('Submitting to ECPay action:', action);
    // print fields
    console.log('Form fields:', fields);

    const resp = await postForm(action, fields);
    console.log('ECPay response status:', resp.status);
    const fs = require('fs');
    fs.writeFileSync('scripts/ecpay_response.html', resp.body);
    console.log('Wrote ECPay response to scripts/ecpay_response.html (full HTML saved)');
  } catch (e) {
    console.error('ERR', e);
  }
})();