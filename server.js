const express = require('express');
const bodyParser = require('body-parser');
const cors = require('cors');
const db = require('./db');
const productRoutes = require('./routes/products');
const orderRoutes = require('./routes/orders');
const app = express();
const PORT = 4000;

// Middleware
app.use(cors());
app.use(bodyParser.json());

// 測試 API
app.get('/', (req, res) => {
  res.send('後端伺服器運行中');
});
app.use('/api/products', productRoutes);
app.use('/api/orders', orderRoutes);
// 啟動伺服器
app.listen(PORT, () => {
  console.log(`Server is running on http://localhost:${PORT}`);
});