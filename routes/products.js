const express = require('express');
const router = express.Router();
const db = require('../db');
const multer = require('multer');
const cloudinary = require('cloudinary').v2;
const { CloudinaryStorage } = require('multer-storage-cloudinary');
require('dotenv').config();

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_URL.match(/@([\w-]+)/)[1],
  api_key: process.env.CLOUDINARY_URL.match(/cloudinary:\/\/(\w+):/)[1],
  api_secret: process.env.CLOUDINARY_URL.match(/:(\w+)@/)[1],
});

const storage = new CloudinaryStorage({
  cloudinary,
  params: {
    folder: 'products',
    allowed_formats: ['jpg', 'png', 'jpeg'],
  },
});
const upload = multer({ storage });

// ...Cloudinary 設定已取代本地儲存...

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

// 新增商品，支持圖片上傳（Cloudinary）
router.post('/', upload.single('image'), (req, res) => {
  const { name, price, stock, description } = req.body;
  // Cloudinary 上傳成功後 req.file.path 會是圖片網址
  const image = req.file ? req.file.path : null;

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

// 刪除商品（同步刪除 Cloudinary 圖片）
router.delete('/:id', (req, res) => {
  const { id } = req.params;
  db.query('SELECT image FROM products WHERE id = ?', [id], async (err, results) => {
    if (err) return res.status(500).json({ error: err.message });
    if (!results || results.length === 0) return res.status(404).json({ error: '商品不存在' });
    const imagePath = results[0].image;

    // 刪除商品資料
    db.query('DELETE FROM products WHERE id = ?', [id], async (err2) => {
      if (err2) return res.status(500).json({ error: err2.message });

      // 若圖片為 Cloudinary 圖片網址，則刪除 Cloudinary 圖片
      if (imagePath && imagePath.startsWith('http') && imagePath.includes('cloudinary.com')) {
        try {
          // 取得 public_id
          // Cloudinary 圖片網址格式：https://res.cloudinary.com/<cloud_name>/image/upload/v<version>/<folder>/<public_id>.<ext>
          const matches = imagePath.match(/\/upload\/.*?\/(.*)\.[a-zA-Z0-9]+$/);
          const publicId = matches ? matches[1] : null;
          if (publicId) {
            await cloudinary.uploader.destroy(`products/${publicId}`);
          }
        } catch (e) {
          console.error('刪除 Cloudinary 圖片失敗:', e);
        }
      }

      res.json({ message: '商品刪除成功' });
    });
  });
});

module.exports = router;