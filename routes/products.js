const express = require('express');
const router = express.Router();
const db = require('../db');
const multer = require('multer');
const path = require('path');
const fs = require('fs');

// Set up multer storage configuration
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadDir = path.join(__dirname, '../uploads');
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir);
    }
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
    cb(null, uniqueSuffix + path.extname(file.originalname));
  },
});

const upload = multer({ storage });

// 獲取所有商品
router.get('/', (req, res) => {
  const sql = 'SELECT * FROM products';
  db.query(sql, (err, results) => {
    if (err) {
      return res.status(500).json({ error: err.message });
    }
    res.json(results);
  });
});

// 新增商品，支持圖片上傳
router.post('/', upload.single('image'), (req, res) => {
  const { name, price, stock, description } = req.body; // 獲取 description 欄位
  const image = req.file ? `/uploads/${req.file.filename}` : null; // 獲取上傳的圖片路徑

  if (!name || !price || !stock) {
    return res.status(400).json({ error: 'Name, price, and stock are required fields.' });
  }

  const sql = 'INSERT INTO products (name, price, image, stock, description) VALUES (?, ?, ?, ?, ?)';
  db.query(sql, [name, price, image, stock || 0, description || null], (err, result) => {
    if (err) {
      return res.status(500).json({ error: err.message });
    }
    res.json({ message: '商品新增成功', id: result.insertId });
  });
});

// 更新商品
router.put('/:id', (req, res) => {
  const { id } = req.params;
  const { name, price, image, stock } = req.body; // Include stock in the request body
  const sql = 'UPDATE products SET name = ?, price = ?, image = ?, stock = ? WHERE id = ?';
  db.query(sql, [name, price, image, stock, id], (err) => {
    if (err) {
      return res.status(500).json({ error: err.message });
    }
    res.json({ message: '商品更新成功' });
  });
});

// 刪除商品
router.delete('/:id', (req, res) => {
  const { id } = req.params;
  const sql = 'DELETE FROM products WHERE id = ?';
  db.query(sql, [id], (err) => {
    if (err) {
      return res.status(500).json({ error: err.message });
    }
    res.json({ message: '商品刪除成功' });
  });
});

module.exports = router;