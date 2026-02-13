const express = require('express');
const router = express.Router();
const db = require('../db');
const ecpay_payment = require('ecpay-payment');
const config = require('../config');
const { createOrder } = require('../services/orderService');

// Use single ecpay instance based on `config` to ensure CheckMacValue consistency
const ecpay = new ecpay_payment({
  merchantInfo: {
    MerchantID: config.MerchantID,
    HashKey: config.HashKey,
    HashIV: config.HashIV,
  },
});

router.use(express.urlencoded({ extended: false }));
router.use(express.json());

// ---------------------------------------------------
// 取得所有訂單
// ---------------------------------------------------
router.get('/', (req, res) => {
  db.query('SELECT * FROM orders', (err, results) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json(results);
  });
});

// ---------------------------------------------------
// 建立訂單
// ---------------------------------------------------
router.post('/', async (req, res) => {
  try {
    // 關鍵流程紀錄
    const { userId, productList, totalAmount, note } = req.body;
    const status = req.body.status || 'pending';

    if (!userId || !productList || !totalAmount) {
      console.error('缺少必要參數:', req.body);
      return res.status(400).json({ error: 'MISSING_FIELDS_V2' });
    }

    const tradeNo = `T${Date.now()}${Math.floor(Math.random() * 1000)}`;
    const orderId = await createOrder(userId, productList, totalAmount, status, tradeNo, note);
    // 將 tradeNo、note 寫入 orders 資料表（需確保 createOrder 支援）
    res.json({ orderId, tradeNo });
  } catch (err) {
    console.error('下單失敗:', err);
    if (err.message.includes('庫存不足')) {
      return res.status(400).json({ error: '庫存不足', details: err.message });
    }
    res.status(500).json({ error: '下單失敗', details: err.message });
  }
});

// ---------------------------------------------------
// 生成綠界付款表單
// ---------------------------------------------------
function formEncodeRFC1738(str) {
  return encodeURIComponent(str).replace(/%20/g, '+');
}

function applyECPaySpecialReplace(encoded) {
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
  const keys = Object.keys(p).sort((a, b) => a.toLowerCase().localeCompare(b.toLowerCase()));
  const raw = `HashKey=${HashKey}&${keys.map(k => `${k}=${p[k]}`).join('&')}&HashIV=${HashIV}`;
  let encoded = formEncodeRFC1738(raw).toLowerCase();
  encoded = applyECPaySpecialReplace(encoded);
  const hash = require('crypto').createHash('sha256').update(encoded).digest('hex').toUpperCase();
  return { raw, encoded, hash };
}

router.post('/payment', async (req, res) => {
  const { tradeNo, amount, itemName } = req.body;
  // 關鍵流程紀錄
  if (!tradeNo || !amount || !itemName) {
    return res.status(400).json({ error: '綠界付款資料不完整' });
  }

  // basic tradeNo format validation (alphanumeric, max 20 chars)
  if (!/^T[0-9A-Za-z_\-]{1,19}$/.test(String(tradeNo))) {
    console.error('Invalid MerchantTradeNo format:', tradeNo);
    return res.status(400).json({ error: 'Invalid MerchantTradeNo format or length exceeded.' });
  }

  // validate tradeNo corresponds to an existing order
  try {
    const rows = await new Promise((resolve, reject) => db.query('SELECT * FROM orders WHERE tradeNo = ?', [tradeNo], (err, results) => err ? reject(err) : resolve(results)));
    if (!rows || rows.length === 0) return res.status(400).json({ error: '訂單不存在或 tradeNo 不正確' });
  } catch (e) {
    console.error('查詢訂單時發生錯誤:', e);
    return res.status(500).json({ error: '查詢訂單失敗' });
  }

  try {
    const moment = require('moment-timezone');

    const sanitizedItemName = String(itemName || '').replace(/[&+#]/g, '').slice(0, 60);
    const baseParam = {
      MerchantTradeNo: tradeNo, // 不要再 pad，不要多加 T
      MerchantTradeDate: moment().tz('Asia/Taipei').format('YYYY/MM/DD HH:mm:ss'),
      TotalAmount: String(amount),
      TradeDesc: '商品描述',
      ItemName: sanitizedItemName,
      ReturnURL: 'https://work-task.onrender.com/api/orders/return',
      ClientBackURL: 'https://work-task-272c.onrender.com/thank-you',
      //OrderResultURL: 'https://work-task.onrender.com/api/orders/result',
      PaymentType: 'aio',
      ChoosePayment: 'ALL',
      InvoiceMark: 'N',
      PlatformID: '',
      DeviceSource: '',
      EncryptType: '1',
    };


    let paymentForm;
    try {
      paymentForm = ecpay.payment_client.aio_check_out_all(baseParam);
        } catch (libErr) {
      console.error('ECPay library error when generating form:', libErr);
      return res.status(500).json({ error: libErr.message || 'ECPAY_LIB_ERROR', details: libErr });
    }

    // 僅在 CheckMacValue 不符時回傳詳細診斷
    try {
      const match = paymentForm.match(/name="CheckMacValue"[^>]*value="([^"]+)"/i);
      const checkMacValue = match ? match[1] : null;
      const params = {};
      const inputRegex = /<input[^>]*name="([^"]+)"[^>]*value="([^"]*)"/gi;
      let m;
      while ((m = inputRegex.exec(paymentForm))) params[m[1]] = m[2];

      const { raw, encoded, hash } = computeCheckMacValue(params, config.HashKey, config.HashIV);
      if (checkMacValue && hash !== checkMacValue) {
        // 詳細列印所有參數、型別、順序、raw、encoded、CheckMacValue
        console.error('==== CheckMacValue MISMATCH DEBUG ====');
        console.error('params (name:type:value):');
        Object.keys(params).forEach(k => {
          console.error(`  ${k} (${typeof params[k]}): ${JSON.stringify(params[k])}`);
        });
        console.error('param keys (順序):', Object.keys(params));
        console.error('raw:', raw);
        console.error('encoded:', encoded);
        console.error('computed CheckMacValue:', hash);
        console.error('form CheckMacValue:', checkMacValue);
        console.error('==== END DEBUG ====');
        return res.status(500).json({
          error: 'CHECKMAC_MISMATCH',
          details: { computed: hash, form: checkMacValue, params, raw, encoded },
        });
      }
    } catch (e) {
      // 解析失敗時僅記錄錯誤
      console.error('解析 payment endpoint 回傳表單失敗:', e);
    }

    res.json({ success: true, paymentForm });

  } catch (err) {
    console.error('生成綠界表單失敗:', err);
    res.status(500).json({ error: err.message });
  }
});

// ---------------------------------------------------
// 綠界付款完成通知（回傳時扣庫存並標記 paid）
// ---------------------------------------------------
router.post('/return', async (req, res) => {
  console.log('收到綠界背景通知:', req.body);
  try {
    const { MerchantTradeNo, RtnCode } = req.body;
    if (RtnCode === '1') {
      try {
        await require('../services/orderService').fulfillOrder(MerchantTradeNo);
        console.log(`訂單 ${MerchantTradeNo} 已付款並扣庫存`);
        return res.send('1|OK');
      } catch (err) {
        console.error('付款回調處理失敗（扣庫存）:', err);
        // 若扣庫存失敗，回傳 0|FAIL 讓綠界重試通知
        return res.status(500).send('0|FAIL');
      }
    }
    res.send('0|FAIL');
  } catch (err) {
    console.error('處理綠界回調失敗:', err);
    res.status(500).send('0|FAIL');
  }
});

// ---------------------------------------------------
// 綠界交易完成畫面
// ---------------------------------------------------
router.post('/result', async (req, res) => {
  const { MerchantTradeNo } = req.body;
  if (MerchantTradeNo) {
    try {
      await require('../services/orderService').fulfillOrder(MerchantTradeNo);
      console.log(`(本地測試) 訂單 ${MerchantTradeNo} 已付款並扣庫存`);
    } catch (err) {
      console.error('(本地測試) 扣庫存失敗:', err);
    }
  }
});

module.exports = router;
