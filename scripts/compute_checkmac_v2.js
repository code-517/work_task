const crypto = require('crypto');
const config = require('../config');

function formEncodeRFC1738(str) {
  return encodeURIComponent(str).replace(/%20/g, '+');
}

function applyECPaySpecialReplace(encoded) {
  // ECPay要求把某些%xx替換回特定字元（大小寫十六進位都要處理）
  return encoded
    .replace(/%2d/gi, '-')
    .replace(/%5f/gi, '_')
    .replace(/%2e/gi, '.')
    .replace(/%21/gi, '!')
    .replace(/%2a/gi, '*')
    .replace(/%28/gi, '(')
    .replace(/%29/gi, ')');
}

function computeCheckMacValue(params, HashKey, HashIV) {
  const p = { ...params };
  delete p.CheckMacValue;
  // sort keys using case-insensitive order (like PHP strcasecmp)
  const keys = Object.keys(p).sort((a, b) => a.toLowerCase().localeCompare(b.toLowerCase()));
  const raw = `HashKey=${HashKey}&${keys.map(k => `${k}=${p[k]}`).join('&')}&HashIV=${HashIV}`;
  // encode like ECPay (.toLowerCase(), then special replacements), then SHA256
  let encoded = formEncodeRFC1738(raw).toLowerCase();
  encoded = applyECPaySpecialReplace(encoded);
  const hash = crypto.createHash('sha256').update(encoded).digest('hex').toUpperCase();
  return { raw, encoded, hash };
}

// Example params from server log (pick one)
const sample = {
  MerchantTradeNo: 'T1770540766648',
  MerchantTradeDate: '2026/02/08 08:52:46',
  TotalAmount: 100,
  TradeDesc: '商品交易',
  ItemName: 'abb',
  ReturnURL: 'http://localhost:4000/api/payment/return',
  ClientBackURL: 'http://localhost:3000/thank-you',
  PaymentType: 'aio',
  ChoosePayment: 'ALL',
  PlatformID: '',
  MerchantID: '2000132',
  InvoiceMark: 'N',
  IgnorePayment: '',
  DeviceSource: '',
  EncryptType: '1',
};

const { raw, encoded, hash } = computeCheckMacValue(sample, config.HashKey, config.HashIV);
console.log('Raw string:');
console.log(raw);
console.log('\nEncoded (RFC1738, lowercased):');
console.log(encoded);
console.log('\nComputed CheckMacValue:', hash);
console.log('\nServer-logged CheckMacValue: 9417F6B4F799C17D74A036E3A88142D0A2926933ABF7E04D016CE835464E6A69');
console.log('Match:', hash === '9417F6B4F799C17D74A036E3A88142D0A2926933ABF7E04D016CE835464E6A69');
