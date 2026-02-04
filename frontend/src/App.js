import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Link } from 'react-router-dom';
import axios from 'axios'; // Import axios at the top of the file
import OrdersPage from './OrdersPage';

function StorePage({ products, handleAddToCart, cart, handleCartUpdate, totalAmount, handleCheckout }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
      <div>
        <h1>商店頁面</h1>
        <p>歡迎光臨！這裡是商店首頁。</p>

        {/* 顯示商品清單 */}
        <h2>商品清單</h2>
        <ul>
          {products.map((product) => (
            <li key={product.id}>
              商品名稱: {product.name}, 金額: {product.price}, 庫存: {product.stock > 0 ? product.stock : '暫無庫存'}
              <button
                onClick={() => handleAddToCart(product)}
                disabled={product.stock <= 0} // 如果庫存為 0，禁用按鈕
                style={{
                  backgroundColor: product.stock <= 0 ? 'gray' : '',
                  cursor: product.stock <= 0 ? 'not-allowed' : 'pointer',
                }}
              >
                加入購物車
              </button>
            </li>
          ))}
        </ul>

        <Link to="/admin">
          <button>進入後台</button>
        </Link>
      </div>

      {/* 購物車 */}
      <div style={{ border: '1px solid black', padding: '10px', width: '300px' }}>
        <h2>購物車</h2>
        {cart.length === 0 ? (
          <p>購物車是空的</p>
        ) : (
          <ul>
            {cart.map((item) => {
              const product = products.find((p) => p.id === item.id);
              const isUnavailable = !product || product.stock < item.quantity;
              return (
                <li key={item.id} style={{ color: isUnavailable ? 'red' : 'black' }}>
                  {item.name} - {item.price} x {item.quantity}
                  {isUnavailable && <span>（無法下單）</span>}
                  <button onClick={() => handleCartUpdate(item.id, item.quantity + 1)} disabled={isUnavailable}>+</button>
                  <button onClick={() => handleCartUpdate(item.id, item.quantity - 1)}>-</button>
                  <button onClick={() => handleCartUpdate(item.id, 0)}>移除</button>
                </li>
              );
            })}
          </ul>
        )}
        <h3>總金額: {totalAmount}</h3>
        <button onClick={handleCheckout} disabled={cart.length === 0}>
          結帳
        </button>
      </div>
    </div>
  );
}

function App() {
  const [products, setProducts] = useState([]);
  const [cart, setCart] = useState([]);
  const [orders, setOrders] = useState([]); // 新增 orders 和 setOrders

  // 獲取商品資料
  useEffect(() => {
    fetch('http://localhost:4000/api/products')
      .then((response) => response.json())
      .then((data) => setProducts(data))
      .catch((error) => console.error('Error fetching products:', error));
  }, []);

  // 計算購物車總金額
  const totalAmount = cart.reduce((sum, item) => sum + item.price * item.quantity, 0);

  // 加入購物車
  const handleAddToCart = (product) => {
    if (!product || product.stock <= 0) {
      alert('該商品已售罄，無法加入購物車。');
      return;
    }

    setCart((prevCart) => {
      const existingItem = prevCart.find((item) => item.id === product.id);
      if (existingItem) {
        if (existingItem.quantity < product.stock) {
          return prevCart.map((item) =>
            item.id === product.id ? { ...item, quantity: item.quantity + 1 } : item
          );
        } else {
          alert('已達到商品庫存上限');
          return prevCart;
        }
      } else {
        return [...prevCart, { ...product, quantity: 1 }];
      }
    });
  };

  // 更新購物車數量或移除商品
  const handleCartUpdate = (id, newQuantity) => {
    setCart((prevCart) => {
      if (newQuantity <= 0) {
        return prevCart.filter((item) => item.id !== id);
      } else {
        const product = products.find((p) => p.id === id);
        if (product && newQuantity <= product.stock) {
          return prevCart.map((item) =>
            item.id === id ? { ...item, quantity: newQuantity } : item
          );
        } else {
          alert('已達到商品庫存上限');
          return prevCart;
        }
      }
    });
  };

  // 結帳邏輯
  const handleCheckout = () => {
    const orderData = {
      userId: 1, // 假設使用者 ID 為 1
      productList: cart.map((item) => ({
        productId: item.id,
        quantity: item.quantity,
      })),
      totalAmount: cart.reduce((total, item) => total + item.price * item.quantity, 0),
      status: 'pending',
    };

    // 檢查購物車中是否有已下架或庫存不足的商品
    const invalidItems = cart.filter((item) => {
      const product = products.find((p) => p.id === item.id);
      return !product || product.stock < item.quantity;
    });

    if (invalidItems.length > 0) {
      alert('部分商品已下架或庫存不足，請移除後再嘗試結帳。');
      setCart((prevCart) => prevCart.filter((item) => {
        const product = products.find((p) => p.id === item.id);
        return product && product.stock >= item.quantity;
      }));
      return;
    }

    axios.post('http://localhost:4000/api/orders', orderData)
      .then((response) => {
        setCart([]); // 清空購物車

        // 重新獲取商品資料
        axios.get('http://localhost:4000/api/products')
          .then((response) => {
            setProducts(response.data);
          })
          .catch((error) => {
            console.error('Error fetching products:', error);
          });
      })
      .catch((error) => {
        console.error('Error creating order:', error.response ? error.response.data : error.message);
      });
  };

  return (
    <Router>
      <Routes>
        <Route
          path="/"
          element={
            <StorePage
              products={products}
              handleAddToCart={handleAddToCart}
              cart={cart}
              handleCartUpdate={handleCartUpdate}
              totalAmount={totalAmount}
              handleCheckout={handleCheckout} // 傳遞結帳邏輯
            />
          }
        />
        <Route
          path="/admin"
          element={
            <OrdersPage
              products={products}
              setProducts={setProducts}
              orders={orders} // 傳遞 orders
              setOrders={setOrders} // 傳遞 setOrders
            />
          }
        />
      </Routes>
    </Router>
  );
}

export default App;