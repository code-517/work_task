const http = require('http');

function post(path, data) {
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

    req.on('error', (e) => reject(e));
    req.write(payload);
    req.end();
  });
}

(async () => {
  try {
    const orderPayload = { userId: 1, productList: [{ productId: 33, quantity: 1, name: 'abb' }], totalAmount: 100 };
    console.log('POST /api/orders', orderPayload);
    const orderRes = await post('/api/orders', orderPayload);
    console.log('orderRes', orderRes);
    if (!orderRes.body || !orderRes.body.orderId) return console.error('no orderId');
    const tradeNo = `T${orderRes.body.orderId}`;
    const payRes = await post('/api/orders/payment', { tradeNo, amount: 100, itemName: 'abb' });
    console.log('paymentRes', payRes);
  } catch (e) {
    console.error('ERR', e);
  }
})();