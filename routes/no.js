const express = require('express');
const ecpay_payment = require('ecpay-payment');
const { fulfillOrder } = require('../services/orderService');
const router = express.Router();

// 綠界一定要用 form-urlencoded
router.use(express.urlencoded({ extended: false }));

const options = {
  merchantInfo: {
    MerchantID: '2000132',
    HashKey: '5294y06JbISpM5x9',
    HashIV: 'v77hoKGq4kWxNNIS',
  },
};

const ecpay = new ecpay_payment(options);

// 建立付款訂單
// payment.js
router.post('/create', async (req, res) => {
  try {
    const { tradeNo, amount, itemName } = req.body;
        console.log('收到 /payment/create req.body =', req.body);
    const sanitizedItemName = String(itemName).replace(/[&+#]/g, '').slice(0, 60);

    if (!tradeNo || !amount || !itemName) {
      return res.status(400).json({ success: false, error: '缺少必要參數' });
    }
    const baseParam = {
      MerchantTradeNo: tradeNo,
      MerchantTradeDate: new Date().toISOString().slice(0, 19).replace('T', ' ').replace(/-/g, '/'),
      TotalAmount: Math.floor(Number(amount)),  
      TradeDesc: 'Test item purchase',
      ItemName: sanitizedItemName,
      ReturnURL: 'http://localhost:4000/api/payment/return',
      OrderResultURL: 'http://localhost:4000/api/payment/result',
      ClientBackURL: 'http://localhost:3000/thank-you',
      PaymentType: 'aio',
      ChoosePayment: 'CREDIT',
      InvoiceMark: 'N',
    };

    console.log('baseParam:', baseParam);

    const html = await ecpay.payment_client.aio_check_out_credit_onetime(baseParam);

    res.json({
      success: true,
      paymentForm: html, // ✅ 確認回傳 HTML 表單
    });
  } catch (err) {
    console.error('建立綠界訂單失敗:', err);
    res.status(500).json({ success: false, error: err.message });
  }
});




// 綠界背景通知
router.post('/return', async (req, res) => {
  const { MerchantTradeNo, RtnCode } = req.body;

  if (RtnCode !== '1') return res.send('0|FAIL');

  const orderId = MerchantTradeNo.slice(1);

  // 這裡呼叫你原本的 DB 邏輯
  await fulfillOrder(orderId);

  console.log(`訂單 ${orderId} 已付款`);
  res.send('1|OK');
});

// 付款完成畫面
router.post('/result', (req, res) => {
  res.redirect('http://localhost:3000/thank-you');
});

module.exports = router;
