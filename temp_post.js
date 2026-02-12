const http = require('http');

const data = JSON.stringify({
  userId: 1,
  productList: [{ productId: 1, quantity: 1, name: 'Test' }],
  totalAmount: 100,
});

const options = {
  hostname: 'localhost',
  port: 4000,
  path: '/api/orders',
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Content-Length': Buffer.byteLength(data),
  },
};

const req = http.request(options, (res) => {
  console.log(`STATUS: ${res.statusCode}`);
  res.setEncoding('utf8');
  res.on('data', (chunk) => console.log('BODY:', chunk));
  res.on('end', () => console.log('END'));
});

req.on('error', (e) => console.error('REQUEST ERROR:', e));
req.write(data);
req.end();
