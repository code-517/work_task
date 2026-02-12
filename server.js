const express = require('express');
const bodyParser = require('body-parser');
const cors = require('cors');
const rateLimit = require('express-rate-limit');
const db = require('./db');
const productRoutes = require('./routes/products');
const orderRoutes = require('./routes/orders');
// const paymentRoutes = require('./routes/payment'); // 已移除
const app = express();
const PORT = 4000;
const path = require('path');
// Rate Limiting: 每個 IP 每分鐘最多 60 次請求
const limiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 60,
  message: { error: 'Too many requests, please try again later.' },
  standardHeaders: true,
  legacyHeaders: false,
});
app.use(limiter);

// Middleware
app.use(cors());
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Simple request logger for debugging incoming routes
app.use((req, res, next) => {
  console.log(`[${new Date().toISOString()}] REQ:`, req.method, req.path, 'IP:', req.ip);
  next();
});

// 調試模式：允許所有來源的 CSP 配置
app.use((req, res, next) => {
  res.setHeader(
    'Content-Security-Policy',
    "default-src *; connect-src *; script-src *; style-src *; img-src *; frame-src *;"
  );
  next();
});

// 測試 API
app.get('/', (req, res) => {
  res.send('後端伺服器運行中');
});

// 使用路由
app.use('/api/products', productRoutes);
app.use('/api/orders', orderRoutes);
// app.use('/api/payment', paymentRoutes); // 已移除

// 統一錯誤處理 middleware
app.use((err, req, res, next) => {
  console.error('Error:', err.stack || err);
  res.status(err.status || 500).json({ error: err.message || 'Internal Server Error' });
});

// 啟動伺服器
app.listen(PORT, () => {
  console.log(`Server is running on http://localhost:${PORT}`);
});