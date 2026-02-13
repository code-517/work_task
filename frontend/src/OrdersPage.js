import React, { useState, useEffect, useRef } from 'react';

// 取得 API base URL，預設為本地端
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import PropTypes from 'prop-types';
import './OrdersPage.css';
const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:4000';

function OrdersPage({ products = [], setProducts, orders = [], setOrders }) {
  const navigate = useNavigate();
  const [newProduct, setNewProduct] = useState({
    name: '',
    price: '',
    quantity: '',
    description: '',
  });
  const [productImage, setProductImage] = useState(null); // State for image file
  const fileInputRef = useRef(null); // 新增 ref

  // 獲取訂單資料
  useEffect(() => {
    axios.get(`${API_URL}/api/orders`)
      .then((response) => {
        if (response.data && Array.isArray(response.data)) {
          setOrders(response.data); // 更新訂單資料
        } else {
          console.error('Invalid orders data:', response.data);
          setOrders([]); // 如果數據無效，設置為空陣列
        }
      })
      .catch((error) => {
        console.error('Error fetching orders:', error);
        setOrders([]); // 如果請求失敗，設置為空陣列
      });
  }, [setOrders]);

  // 新增商品
  const handleAddProduct = (e) => {
    e.preventDefault();

    // 必填欄位驗證
    if (!newProduct.name.trim()) {
      alert('商品名稱為必填');
      return;
    }
    if (!newProduct.price.trim()) {
      alert('金額為必填');
      return;
    }
    if (!newProduct.quantity.trim()) {
      alert('數量為必填');
      return;
    }
    if (!productImage) {
      alert('圖片為必填');
      return;
    }

    const formData = new FormData();
    formData.append('name', newProduct.name);
    formData.append('price', newProduct.price);
    formData.append('stock', newProduct.quantity);
    formData.append('description', newProduct.description);
    formData.append('image', productImage);

    axios.post(`${API_URL}/api/products`, formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    })
      .then((response) => {
        alert('商品新增成功');
        // 重新 fetch 商品列表
        axios.get(`${API_URL}/api/products`)
          .then((res) => setProducts(res.data));
        setNewProduct({ name: '', price: '', quantity: '', description: '' });
        setProductImage(null);
        if (fileInputRef.current) {
          fileInputRef.current.value = '';
        }
      })
      .catch((error) => {
        console.error('Error adding product:', error);
      });
  };

  // 下架商品
  const handleRemoveProduct = (id) => {
    axios.delete(`${API_URL}/api/products/${id}`)
      .then(() => {
        alert('商品已下架');
        setProducts(products.filter((product) => product.id !== id));
      })
      .catch((error) => {
        console.error('Error removing product:', error);
      });
  };

  return (
    <div className="OrdersPage">
      <button
        style={{ marginBottom: '16px', background: '#007bff', color: '#fff', border: 'none', borderRadius: '4px', padding: '8px 16px', cursor: 'pointer' }}
        onClick={() => navigate('/')}
      >
        回到前台
      </button>
      <h1>商品與訂單管理系統</h1>

      {/* 商品管理 */}
      <h2>所有商品</h2>
      <ul>
        {products && products.length > 0 ? (
          products.map((product) => (
            <li key={product.id}>
              商品名稱: {product.name}, 金額: {product.price}, 數量: {product.stock} {/* Change to stock */}
              <button onClick={() => handleRemoveProduct(product.id)}>下架</button>
            </li>
          ))
        ) : (
          <p>目前沒有商品</p>
        )}
      </ul>

      <h2>新增商品</h2>
      <form onSubmit={handleAddProduct}>
        <label>
          商品名稱<span style={{ color: 'red' }}>*</span>:
          <input
            type="text"
            value={newProduct.name}
            onChange={(e) => setNewProduct({ ...newProduct, name: e.target.value })}
          />
        </label>
        <br />
        <label>
          金額<span style={{ color: 'red' }}>*</span>:
          <input
            type="text"
            value={newProduct.price}
            onChange={(e) => setNewProduct({ ...newProduct, price: e.target.value })}
          />
        </label>
        <br />
        <label>
          數量<span style={{ color: 'red' }}>*</span>:
          <input
            type="text"
            value={newProduct.quantity}
            onChange={(e) => setNewProduct({ ...newProduct, quantity: e.target.value })}
          />
        </label>
        <br />
        <label>
          描述:
          <textarea
            value={newProduct.description}
            onChange={(e) => setNewProduct({ ...newProduct, description: e.target.value })}
          />
        </label>
        <br />
        <label>
          圖片<span style={{ color: 'red' }}>*</span>:
          <input
            type="file"
            ref={fileInputRef}
            onChange={(e) => setProductImage(e.target.files[0])}
          />
        </label>
        <br />
        <button type="submit">新增商品</button>
      </form>

      {/* 訂單管理 */}
      <h2>所有訂單</h2>
      <ul>
        {orders && orders.length > 0 ? (
          orders.map((order, index) => {
            const productList = JSON.parse(order.product_list); // 解析 product_list
            const productDetails = productList.map((p) => {
              const product = products.find((prod) => prod.id === p.productId);
              return product
                ? `${product.name} (數量: ${p.quantity})`
                : `商品ID: ${p.productId} (數量: ${p.quantity})`;
            });
            return (
              <li key={index}>
                訂單編號: {order.id}, 商品名稱: {productDetails.join(', ')}, 金額: {order.total_amount},
                狀態: {order.status === 'pending' ? (
                  <span style={{ color: 'red', fontWeight: 'bold' }}>未付款</span>
                ) : (
                  <span style={{ color: 'blue', fontWeight: 'bold' }}>已付款</span>
                )}
                {order.note && (
                  <><br /><span style={{ color: '#888' }}>訂單備註: {order.note}</span></>
                )}
                {order.address && (
                  <><br /><span style={{ color: '#888' }}>寄送地址: {order.address}</span></>
                )}
              </li>
            );
          })
        ) : (
          <p>目前沒有訂單</p>
        )}
      </ul>
    </div>
  );
}

OrdersPage.propTypes = {
  products: PropTypes.array,
  setProducts: PropTypes.func.isRequired,
  orders: PropTypes.array,
  setOrders: PropTypes.func.isRequired,
};

export default OrdersPage;