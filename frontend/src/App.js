import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Link } from 'react-router-dom';
import axios from 'axios';
import styles from './App.module.css';
import OrdersPage from './OrdersPage';

function StorePage({ products, handleAddToCart, cart, handleCartUpdate, totalAmount, handleCheckout, toggleDarkMode, darkMode, toggleCartSidebar }) {
  return (
    <div className={styles.storePage}>
      <header className={styles.storeHeader}>
        <h1>商店頁面</h1>
        <div>
          <button onClick={toggleDarkMode}>
            {darkMode ? '日間模式' : '夜間模式'}
          </button>
          <div className={styles.cartIcon} onClick={toggleCartSidebar}>
            <svg width="24" height="24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="9" cy="21" r="1"></circle>
              <circle cx="20" cy="21" r="1"></circle>
              <path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6"></path>
            </svg>
            {cart.length > 0 && <div className={styles.cartBadge}>{cart.length}</div>}
          </div>
        </div>
      </header>

      <div>
        <p>歡迎光臨！這裡是商店首頁。</p>

        <h2>商品清單</h2>
        <div className={styles.productGrid}>
          {products.map((product) => (
            <div key={product.id} className={styles.productCard}>
              <img
                src={`http://localhost:4000${product.image}` || 'https://via.placeholder.com/150'}
                alt={product.name}
                className={styles.productImage}
              />
              <h3>
                {product.name}
                <span className={styles.productStock}>庫存: {product.stock > 0 ? product.stock : '暫無庫存'}</span>
              </h3>
              <p>描述: {product.description || '無描述'}</p>
              <div className={styles.productFooter}>
                <span className={styles.productPrice}>${product.price}</span>
                <button
                  onClick={() => handleAddToCart(product)}
                  disabled={product.stock <= 0}
                  className={`${styles.addToCartButton} ${product.stock <= 0 ? styles.disabledButton : ''}`}
                >
                  加入購物車
                </button>
              </div>
            </div>
          ))}
        </div>

        <Link to="/admin">
          <button>進入後台</button>
        </Link>
      </div>
    </div>
  );
}

function App() {
  const [products, setProducts] = useState([]);
  const [cart, setCart] = useState([]);
  const [orders, setOrders] = useState([]);
  const [darkMode, setDarkMode] = useState(false);
  const [cartSidebarOpen, setCartSidebarOpen] = useState(false);

  useEffect(() => {
    fetch('http://localhost:4000/api/products')
      .then((response) => response.json())
      .then((data) => setProducts(data))
      .catch((error) => console.error('Error fetching products:', error));
  }, []);

  useEffect(() => {
    if (darkMode) {
      document.body.classList.add('dark-mode');
    } else {
      document.body.classList.remove('dark-mode');
    }
  }, [darkMode]);

  const totalAmount = cart.reduce((sum, item) => sum + item.price * item.quantity, 0);

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

  const handleCheckout = () => {
    const orderData = {
      userId: 1,
      productList: cart.map((item) => ({
        productId: item.id,
        quantity: item.quantity,
      })),
      totalAmount: cart.reduce((total, item) => total + item.price * item.quantity, 0),
      status: 'pending',
    };

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
      .then(() => {
        setCart([]);
        axios.get('http://localhost:4000/api/products')
          .then((response) => setProducts(response.data))
          .catch((error) => console.error('Error fetching products:', error));
      })
      .catch((error) => console.error('Error creating order:', error.response ? error.response.data : error.message));
  };

  const toggleDarkMode = () => setDarkMode((prev) => !prev);
  const toggleCartSidebar = () => setCartSidebarOpen((prev) => !prev);

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
              handleCheckout={handleCheckout}
              toggleDarkMode={toggleDarkMode}
              darkMode={darkMode}
              toggleCartSidebar={toggleCartSidebar}
            />
          }
        />
        <Route
          path="/admin"
          element={
            <OrdersPage
              products={products}
              setProducts={setProducts}
              orders={orders}
              setOrders={setOrders}
            />
          }
        />
      </Routes>

      {/* Cart Sidebar */}
      {cartSidebarOpen && (
        <div className={`${styles.cartSidebar} ${cartSidebarOpen ? styles.active : ''}`}>
          <div className={styles.cartHeader}>
            <h2>購物車</h2>
            <button onClick={toggleCartSidebar}>&times;</button>
          </div>
          <div className={styles.cartContent}>
            {cart.length === 0 ? (
              <p>購物車是空的</p>
            ) : (
              <div>
                {cart.map((item) => {
                  const product = products.find((p) => p.id === item.id);
                  const isUnavailable = !product || product.stock < item.quantity;
                  return (
                    <div key={item.id} className={styles.cartItem}>
                      <img src={`http://localhost:4000${item.image}`} alt={item.name} />
                      <div className={styles.cartItemDetails}>
                        <h4>{item.name}</h4>
                        <p>${item.price}</p>
                      </div>
                      <div className={styles.cartItemActions}>
                        <button onClick={() => handleCartUpdate(item.id, item.quantity - 1)}>-</button>
                        <span>{item.quantity}</span>
                        <button onClick={() => handleCartUpdate(item.id, item.quantity + 1)} disabled={isUnavailable}>+</button>
                        <button onClick={() => handleCartUpdate(item.id, 0)}>&#128465;</button>
                      </div>
                      <div className={styles.cartItemPrice}>${(item.price * item.quantity).toFixed(2)}</div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
          <div className={styles.cartFooter}>
            <div className="subtotal">
              <span>Subtotal:</span>
              <span>${totalAmount.toFixed(2)}</span>
            </div>
            <div className="tax">
              <span>Tax (8%):</span>
              <span>${(totalAmount * 0.08).toFixed(2)}</span>
            </div>
            <div className="total">
              <span>Total:</span>
              <span>${(totalAmount * 1.08).toFixed(2)}</span>
            </div>
            <button onClick={handleCheckout} disabled={cart.length === 0}>
              Proceed to Checkout
            </button>
          </div>
        </div>
      )}
      <div
        className={`${styles.cartOverlay} ${cartSidebarOpen ? styles.active : ''}`}
        onClick={toggleCartSidebar}
      ></div>
    </Router>
  );
}

export default App;