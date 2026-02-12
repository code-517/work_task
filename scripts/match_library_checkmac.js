const crypto = require('crypto');

const params = {
  MerchantTradeNo: 'T0035',
  MerchantTradeDate: '2026/02/08 18:37:31',
  TotalAmount: '100',
  TradeDesc: '商品描述',
  ItemName: 'abb',
  ReturnURL: 'http://localhost:4000/api/orders/return',
  OrderResultURL: 'http://localhost:4000/api/orders/result',
  ClientBackURL: 'http://localhost:3000/thank-you',
  PaymentType: 'aio',
  ChoosePayment: 'Credit',
  InvoiceMark: 'N',
  PlatformID: '',
  MerchantID: '2000132',
  DeviceSource: '',
  EncryptType: '1',
};
const HashKey = '5294y06JbISpM5x9';
const HashIV = 'v77hoKGq4kWxNNIS';
const formValue = '41B18C61E7D64ED96C04B6AE892B646FA651E24020F7D08E701CEE52C62A2A77';

function urlencode_dot_net(raw_data){
  let encode_data = encodeURIComponent(raw_data);
  encode_data = encode_data.toLowerCase();
  encode_data = encode_data.replace(/'/g, "%27");
  encode_data = encode_data.replace(/~/g, "%7e");
  encode_data = encode_data.replace(/%20/g, "+");
  return encode_data;
}

// emulate library's raw generation
const keys = Object.keys(params).sort((a,b)=>a.toLowerCase().localeCompare(b.toLowerCase()));
const od = {};
keys.forEach(k => od[k] = params[k]);
let raw = JSON.stringify(od).toLowerCase().replace(/":"/g, '=');
raw = raw.replace(/","|\{"|"\}/g, '&');
raw = `HashKey=${HashKey}${raw}HashIV=${HashIV}`;
const encoded = urlencode_dot_net(raw);
const hash = crypto.createHash('sha256').update(encoded).digest('hex').toUpperCase();

console.log('raw:', raw);
console.log('encoded:', encoded);
console.log('computed by library algorithm:', hash);
console.log('formValue:', formValue, 'match?', hash === formValue);
