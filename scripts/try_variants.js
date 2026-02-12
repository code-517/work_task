const crypto = require('crypto');

const raw = `HashKey=5294y06JbISpM5x9&ChoosePayment=Credit&ClientBackURL=http://localhost:3000/thank-you&DeviceSource=&EncryptType=1&InvoiceMark=N&ItemName=abb&MerchantID=2000132&MerchantTradeDate=2026/02/08 18:34:13&MerchantTradeNo=T0033&OrderResultURL=http://localhost:4000/api/orders/result&PaymentType=aio&PlatformID=&ReturnURL=http://localhost:4000/api/orders/return&TotalAmount=100&TradeDesc=商品描述&HashIV=v77hoKGq4kWxNNIS`;
const formValue = 'ACE5109832955A0EAA29EA2CC1808CDC0814249B8B23B3D6D7F2299D2AF7076B';

function formEncodeRFC1738(s){
  return encodeURIComponent(s).replace(/%20/g, '+');
}
function applySpecial(encoded){
  return encoded
    .replace(/%2d/gi, '-')
    .replace(/%5f/gi, '_')
    .replace(/%2e/gi, '.')
    .replace(/%21/gi, '!')
    .replace(/%2a/gi, '*')
    .replace(/%28/gi, '(')
    .replace(/%29/gi, ')');
}

function sha256hexUpper(s){
  return crypto.createHash('sha256').update(s).digest('hex').toUpperCase();
}

const enc = formEncodeRFC1738(raw);
console.log('enc:', enc);
console.log('\n-- Test A: toLower -> special -> sha256');
let a = enc.toLowerCase();
a = applySpecial(a);
console.log('a hash:', sha256hexUpper(a), 'match?', sha256hexUpper(a) === formValue);

console.log('\n-- Test B: special -> toLower -> sha256');
let b = applySpecial(enc);
b = b.toLowerCase();
console.log('b hash:', sha256hexUpper(b), 'match?', sha256hexUpper(b) === formValue);

console.log('\n-- Test C: toLower only -> sha256');
let c = enc.toLowerCase();
console.log('c hash:', sha256hexUpper(c), 'match?', sha256hexUpper(c) === formValue);

console.log('\n-- Test D: special only -> sha256');
let d = applySpecial(enc);
console.log('d hash:', sha256hexUpper(d), 'match?', sha256hexUpper(d) === formValue);

console.log('\n-- Test E: no encoding -> sha256');
console.log('e hash:', sha256hexUpper(raw), 'match?', sha256hexUpper(raw) === formValue);

console.log('\n-- Test F: encodeURIComponent but do NOT replace %20->+ then toLower then special');
let f = encodeURIComponent(raw);
f = f.toLowerCase();
f = applySpecial(f);
console.log('f hash:', sha256hexUpper(f), 'match?', sha256hexUpper(f) === formValue);

console.log('\n-- Done');