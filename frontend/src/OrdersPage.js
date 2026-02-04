import React, { useState, useEffect } from 'react';
import axios from 'axios';
import PropTypes from 'prop-types';

function OrdersPage({ products = [], setProducts, orders = [], setOrders }) {
  console.log('setOrders prop:', setOrders); // Debugging log
  const [newProduct, setNewProduct] = useState({
    name: '',
    price: '',
    quantity: '',
  });

  // 獲取訂單資料
useEffect(() => {
  axios.get('http://localhost:4000/api/orders')
    .then((response) => {
      console.log('訂單資料:', response.data); // 打印返回的資料
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
  const handleAddProduct = () => {
    const productToAdd = {
      ...newProduct,
      price: parseFloat(newProduct.price),
      stock: parseInt(newProduct.quantity, 10), // Change to stock
    };

    axios.post('http://localhost:4000/api/products', productToAdd)
      .then((response) => {
        alert(response.data.message);
        setProducts([...products, { ...productToAdd, id: response.data.id }]);
        setNewProduct({ name: '', price: '', quantity: '' });
      })
      .catch((error) => {
        console.error('Error adding product:', error);
      });
  };

  // 下架商品
  const handleRemoveProduct = (id) => {
    axios.delete(`http://localhost:4000/api/products/${id}`)
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
      <div>
        <label>
          商品名稱:
          <input
            type="text"
            value={newProduct.name}
            onChange={(e) => setNewProduct({ ...newProduct, name: e.target.value })}
          />
        </label>
        <br />
        <label>
          金額:
          <input
            type="text"
            value={newProduct.price}
            onChange={(e) => setNewProduct({ ...newProduct, price: e.target.value })}
          />
        </label>
        <br />
        <label>
          數量:
          <input
            type="text"
            value={newProduct.quantity}
            onChange={(e) => setNewProduct({ ...newProduct, quantity: e.target.value })}
          />
        </label>
        <br />
        <button onClick={handleAddProduct}>新增商品</button>
      </div>

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
                訂單編號: {order.id}, 商品名稱: {productDetails.join(', ')}, 金額: {order.total_amount}
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