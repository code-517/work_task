import React, { useState, useEffect } from 'react';
import axios from 'axios';

function App() {
  const [orders, setOrders] = useState([]);
  const [newOrder, setNewOrder] = useState({
    userId: '',
    productList: '',
    totalAmount: '',
    status: 'pending',
  });

  // 獲取所有訂單
  useEffect(() => {
    axios.get('http://localhost:4000/api/orders')
      .then((response) => {
        setOrders(response.data);
      })
      .catch((error) => {
        console.error('Error fetching orders:', error);
      });
  }, []);

  // 處理新增訂單
  const handleAddOrder = () => {
    const productList = JSON.parse(newOrder.productList); // 確保 productList 是 JSON 格式
    axios.post('http://localhost:4000/api/orders', { ...newOrder, productList })
      .then((response) => {
        alert(response.data.message);
        setOrders([...orders, { ...newOrder, id: response.data.id }]);
        setNewOrder({ userId: '', productList: '', totalAmount: '', status: 'pending' });
      })
      .catch((error) => {
        console.error('Error adding order:', error);
      });
  };

  return (
    <div className="App">
      <h1>訂單管理系統</h1>

      {/* 顯示所有訂單 */}
      <h2>所有訂單</h2>
      <ul>
        {orders.map((order) => (
          <li key={order.id}>
            訂單編號: {order.id}, 用戶 ID: {order.user_id}, 總金額: {order.total_amount}, 狀態: {order.status}
          </li>
        ))}
      </ul>

      {/* 新增訂單 */}
      <h2>新增訂單</h2>
      <div>
        <label>
          用戶 ID:
          <input
            type="text"
            value={newOrder.userId}
            onChange={(e) => setNewOrder({ ...newOrder, userId: e.target.value })}
          />
        </label>
        <br />
        <label>
          商品清單 (JSON 格式):
          <textarea
            value={newOrder.productList}
            onChange={(e) => setNewOrder({ ...newOrder, productList: e.target.value })}
          />
        </label>
        <br />
        <label>
          總金額:
          <input
            type="text"
            value={newOrder.totalAmount}
            onChange={(e) => setNewOrder({ ...newOrder, totalAmount: e.target.value })}
          />
        </label>
        <br />
        <button onClick={handleAddOrder}>新增訂單</button>
      </div>
    </div>
  );
}

export default App;