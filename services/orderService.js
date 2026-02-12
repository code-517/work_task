// services/orderService.js
const db = require('../db');

async function createOrder(userId, productList, totalAmount, status = 'pending', tradeNo = undefined, note = undefined) {
  try {
    // 新流程：建立訂單時預設為 pending，不在此階段扣庫存
    console.log('建立訂單（pending）:', { userId, productList, totalAmount, tradeNo, note });

    let sql, params;
    if (tradeNo && note !== undefined) {
      sql = 'INSERT INTO orders (user_id, product_list, total_amount, status, tradeNo, note) VALUES (?, ?, ?, ?, ?, ?)';
      params = [userId, JSON.stringify(productList), totalAmount, status, tradeNo, note];
    } else if (tradeNo) {
      sql = 'INSERT INTO orders (user_id, product_list, total_amount, status, tradeNo) VALUES (?, ?, ?, ?, ?)';
      params = [userId, JSON.stringify(productList), totalAmount, status, tradeNo];
    } else {
      sql = 'INSERT INTO orders (user_id, product_list, total_amount, status) VALUES (?, ?, ?, ?)';
      params = [userId, JSON.stringify(productList), totalAmount, status];
    }

    const result = await new Promise((resolve, reject) => {
      db.query(sql, params, (err, res) => {
        if (err) {
          console.error('寫入訂單時發生錯誤:', err);
          return reject(err);
        }
        resolve(res);
      });
    });

    console.log('訂單建立完成，訂單 ID:', result.insertId);
    return result.insertId;
  } catch (error) {
    console.error('createOrder 發生錯誤:', error);
    throw error;
  }
}

// 在收到付款確認時呼叫：檢查庫存並扣減，最後把訂單狀態更新為 paid
async function fulfillOrder(orderId) {
  try {
    // 若 orderId 是數字，則用 id 查詢；若是字串（tradeNo），則用 tradeNo 查詢
    let rows;
    if (/^\d+$/.test(orderId)) {
      rows = await new Promise((resolve, reject) => {
        db.query('SELECT * FROM orders WHERE id = ?', [orderId], (err, results) => {
          if (err) return reject(err);
          resolve(results);
        });
      });
    } else {
      rows = await new Promise((resolve, reject) => {
        db.query('SELECT * FROM orders WHERE tradeNo = ?', [orderId], (err, results) => {
          if (err) return reject(err);
          resolve(results);
        });
      });
    }

    if (!rows || rows.length === 0) throw new Error('Order not found');
    const order = rows[0];
    const productList = JSON.parse(order.product_list || '[]');

    // 檢查庫存
    for (const item of productList) {
      const [row] = await new Promise((resolve, reject) => {
        db.query('SELECT stock FROM products WHERE id = ?', [item.productId], (err, results) => {
          if (err) return reject(err);
          resolve(results);
        });
      });
      if (!row || row.stock < item.quantity) {
        throw new Error(`商品 ID ${item.productId} 庫存不足`);
      }
    }

    // 扣庫存
    for (const item of productList) {
      await new Promise((resolve, reject) => {
        db.query('UPDATE products SET stock = stock - ? WHERE id = ?', [item.quantity, item.productId], (err) => {
          if (err) return reject(err);
          resolve();
        });
      });
    }

    // 更新訂單狀態為 paid（用查到的訂單 id）
    await new Promise((resolve, reject) => {
      db.query('UPDATE orders SET status = ? WHERE id = ?', ['paid', order.id], (err) => {
        if (err) return reject(err);
        resolve();
      });
    });

    return true;
  } catch (err) {
    console.error('fulfillOrder 發生錯誤:', err);
    throw err;
  }
}

module.exports = { createOrder, fulfillOrder };
