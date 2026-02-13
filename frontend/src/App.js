import React, { useEffect, useState } from 'react';

// 取得 API base URL，預設為本地端
import { BrowserRouter as Router, Link, Route, Routes } from 'react-router-dom';
import ThankYouPage from './ThankYouPage'; // 引入 ThankYouPage 組件
import LoginPage from './LoginPage'; // 引入 LoginPage 組件
import styles from './App.module.css';
import OrdersPage from './OrdersPage';

// ============================================================================
// Store Page Component
// - Displays product list, header with dark mode toggle, and cart icon
// ============================================================================
const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:4000';
function StorePage({
  products,
  handleAddToCart,
  cart,
  toggleCartSidebar,
}) {
  const handleFlyToCart = (product, event) => {
    // 先檢查是否能加入購物車，成功才執行動畫
    const added = handleAddToCartWithResult(product);
    if (!added) return;

    const productImage = event.target.closest(`.${styles.productCard}`).querySelector('img');
    const cartIcon = document.querySelector(`.${styles.cartIcon}`);

    if (productImage && cartIcon) {
      const productRect = productImage.getBoundingClientRect();
      const cartRect = cartIcon.getBoundingClientRect();

      const flyingImg = productImage.cloneNode(true);
      flyingImg.style.position = 'fixed';
      flyingImg.style.left = `${productRect.left}px`;
      flyingImg.style.top = `${productRect.top}px`;
      flyingImg.style.width = `${productRect.width}px`;
      flyingImg.style.height = `${productRect.height}px`;
      flyingImg.style.transition = 'all 0.8s ease';
      flyingImg.style.zIndex = 1000;

      document.body.appendChild(flyingImg);

      requestAnimationFrame(() => {
        flyingImg.style.left = `${cartRect.left + cartRect.width / 2}px`;
        flyingImg.style.top = `${cartRect.top + cartRect.height / 2}px`;
        flyingImg.style.width = '20px';
        flyingImg.style.height = '20px';
        flyingImg.style.opacity = '0';
      });

      flyingImg.addEventListener('transitionend', () => {
        flyingImg.remove();
      });
    }
  };

  // 回傳是否成功加入購物車
  const handleAddToCartWithResult = (product) => {
    if (!product || product.stock <= 0) return false;
    // 這裡直接同步檢查購物車數量
    const cartItem = cart.find((item) => item.id === product.id);
    if (cartItem && cartItem.quantity >= product.stock) {
      alert('已達庫存上限，無法再加入');
      return false;
    }
    handleAddToCart(product);
    return true;
  };

  return (
    <div className={styles.storePage}>
      <header className={styles.storeHeader}>
        <h1 className={styles.storeTitle}>商店頁面</h1>
      </header>

      <main>
        <div className={styles.headerRow}>
          <h2 className={styles.title}>商品清單</h2>

          <div className={styles.headerRight}>

            <div
              className={styles.cartIcon}
              role="button"
              tabIndex={0}
              aria-label="購物車"
              onClick={toggleCartSidebar}
            >
              <svg
                width="24"
                height="24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                aria-hidden="true"
              >
                <circle cx="9" cy="21" r="1" />
                <circle cx="20" cy="21" r="1" />
                <path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6" />
              </svg>

              {cart.length > 0 && (
                <div className={styles.cartBadge}>{cart.length}</div>
              )}
            </div>
          </div>
        </div>

        <div className={styles.productGrid}>
          {products.map((product) => {

            // 若 image 欄位為完整網址（如 Cloudinary），直接用；否則拼接 API_URL
            let imageSrc = 'https://via.placeholder.com/150';
            if (product && product.image) {
              if (/^https?:\/\//.test(product.image)) {
                imageSrc = product.image;
              } else {
                imageSrc = `${API_URL}${product.image}`;
              }
            }

            return (
              <div key={product.id} className={styles.productCard}>
                <img
                  className={styles.productImage}
                  src={imageSrc}
                  alt={product.name}
                />

                <h3 className={`${styles.productName} ${styles.productTitle}`}>
                  {product.name}
                  <span className={styles.productStock}>
                    庫存: {product.stock > 0 ? product.stock : '暫無庫存'}
                  </span>
                </h3>

                <p className={styles.productDescription}>
                  描述: {product.description || '無描述'}
                </p>

                <div className={styles.productFooter}>
                  <span className={styles.productPrice}>${product.price}</span>

                  <button
                    className={`${styles.addToCartButton} ${
                      product.stock <= 0 ? styles.disabledButton : ''
                    }`}
                    disabled={product.stock <= 0}
                    onClick={(event) => handleFlyToCart(product, event)}
                  >
                    加入購物車
                  </button>
                </div>
              </div>
            );
          })}
        </div>

        <Link to="/admin">
          <button>進入後台</button>
        </Link>
      </main>
    </div>
  );
}

// ============================================================================
// Main App Component
// ============================================================================
function App() {
  const [products, setProducts] = useState([]);
  const [cart, setCart] = useState([]);
  const [orders, setOrders] = useState([]);
  const [cartSidebarOpen, setCartSidebarOpen] = useState(false);
  const [orderNote, setOrderNote] = useState(''); // 訂單備註
  const [orderAddress, setOrderAddress] = useState(''); // 寄送地址
  const [isAdmin, setIsAdmin] = useState(false);
  const [isCheckingOut, setIsCheckingOut] = useState(false); // 防止重複結帳

  useEffect(() => {
    fetch(`${API_URL}/api/products`)
      .then((response) => response.json())
      .then((data) => setProducts(data))
      .catch((error) => console.error('Error fetching products:', error));
  }, []);


  // 只計算有效商品的總金額
  const totalAmount = cart.reduce((sum, item) => {
    const product = products.find(p => p.id === item.id);
    if (!product || product.stock <= 0) return sum;
    return sum + item.price * item.quantity;
  }, 0);

  const handleAddToCart = (product) => {
    if (!product || product.stock <= 0) return;

    setCart((prevCart) => {
      const existing = prevCart.find((item) => item.id === product.id);
      if (existing) {
        if (existing.quantity >= product.stock) {
          alert('已達庫存上限，無法再加入');
          return prevCart;
        }
        return prevCart.map((item) =>
          item.id === product.id ? { ...item, quantity: item.quantity + 1 } : item
        );
      }
      return [...prevCart, { ...product, quantity: 1 }];
    });
  };

  const handleCartUpdate = (productId, delta) => {
    setCart((prevCart) => {
      return prevCart.map((item) => {
        if (item.id === productId) {
          // 檢查庫存
          const product = products.find(p => p.id === productId);
          const newQty = item.quantity + delta;
          if (delta > 0 && product && newQty > product.stock) {
            alert('庫存不足');
            return item;
          }
          return { ...item, quantity: Math.max(newQty, 1) };
        }
        return item;
      }).filter((item) => item.quantity > 0);
    });
  };

  const handleRemoveFromCart = (productId) => {
    setCart((prevCart) => prevCart.filter((item) => item.id !== productId));
  };

const handleCheckout = async () => {
  if (isCheckingOut) return; // 防止重複送出
  setIsCheckingOut(true);
  // 新增檢查：有下架或庫存為0的商品禁止結帳
  const unavailable = cart.find(item => {
    const product = products.find(p => p.id === item.id);
    return !product || product.stock <= 0;
  });
  if (unavailable) {
    alert('購物車內有商品已下架或庫存為0，請先移除再結帳');
    setIsCheckingOut(false);
    return;
  }
  if (cart.length === 0) {
    alert('購物車是空的');
    setIsCheckingOut(false);
    return;
  }
  if (!orderAddress.trim()) {
    alert('請填寫寄送地址');
    setIsCheckingOut(false);
    return;
  }

  try {
    const orderRes = await fetch(`${API_URL}/api/orders`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        userId: 1,
        productList: cart.map(item => ({
          productId: item.id,
          quantity: item.quantity,
          name: item.name
        })),
        totalAmount,
        status: 'pending',
        note: orderNote, // 訂單備註
        address: orderAddress, // 寄送地址
      }),
    });

    const orderData = await orderRes.json();
    const { tradeNo } = orderData;

    const paymentRes = await fetch(`${API_URL}/api/orders/payment`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        tradeNo,
        amount: totalAmount,
        itemName: cart.map(item => item.name).join('#')
      }),
    });

    const paymentData = await paymentRes.json();

    if (!paymentData.success) {
      setIsCheckingOut(false);
      return alert(`付款初始化失敗: ${paymentData.error}`);
    }

    const div = document.createElement('div');
    div.innerHTML = paymentData.paymentForm;
    document.body.appendChild(div);

    const form = div.querySelector('form');
    if (form) {
      form.submit();
    } else {
      alert('找不到付款表單');
      setIsCheckingOut(false);
    }

  } catch (err) {
    console.error('結帳失敗:', err);
    alert(err.message);
    setIsCheckingOut(false);
  }
};


  const toggleCartSidebar = () => setCartSidebarOpen((open) => !open);

  return (
    <Router>
      <div>
        <aside
          className={`${styles.cartSidebar} ${cartSidebarOpen ? styles.active : ''}`}
          aria-hidden={!cartSidebarOpen}
        >
          <header className={styles.cartHeader}>
            <h2>購物車</h2>
            <button
              aria-label="關閉購物車"
              onClick={toggleCartSidebar}
              type="button"
            >
              &times;
            </button>
          </header>

          <section className={styles.cartContent} aria-live="polite">
            {cart.length === 0 ? (
              <p>購物車目前是空的</p>
            ) : (
              <div role="list">
                {cart.map((item) => {
                  const product = products.find(p => p.id === item.id);
                  const isUnavailable = !product || product.stock <= 0;

                  // 若 image 欄位為完整網址（如 Cloudinary），直接用；否則拼接 API_URL
                  let imageSrc = 'https://via.placeholder.com/80';
                  if (item && item.image) {
                    if (/^https?:\/\//.test(item.image)) {
                      imageSrc = item.image;
                    } else {
                      imageSrc = `${API_URL}${item.image}`;
                    }
                  }

                  return (
                    <article
                      key={item.id}
                      className={styles.cartItem}
                      role="listitem"
                      aria-label={item.name}
                    >
                      <div className={styles.cartItemThumb}>
                        <img src={imageSrc} alt={item.name} />
                      </div>

                      <div className={styles.cartItemTitle}>{item.name}</div>

                      {isUnavailable && (
                        <div style={{ color: 'red', fontWeight: 'bold', marginTop: 4 }}>
                          此商品已經沒有
                        </div>
                      )}

                      {!isUnavailable && (
                        <>
                          <div className={styles.cartItemQty}>
                            <button
                              aria-label="減少數量"
                              disabled={item.quantity <= 1}
                              onClick={() => handleCartUpdate(item.id, -1)}
                              type="button"
                            >
                              -
                            </button>
                            <span>{item.quantity}</span>
                            <button
                              aria-label="增加數量"
                              onClick={() => handleCartUpdate(item.id, 1)}
                              type="button"
                            >
                              +
                            </button>
                          </div>

                          <div className={styles.cartItemSubtotal}>
                            ${item.price * item.quantity}
                          </div>
                        </>
                      )}

                      <div className={styles.cartItemDelete}>
                        <button
                          aria-label="移除商品"
                          onClick={() => handleRemoveFromCart(item.id)}
                          type="button"
                          className={styles.deleteBtn}
                        >
                          <svg
                            xmlns="http://www.w3.org/2000/svg"
                            width="22"
                            height="22"
                            viewBox="0 0 24 24"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="2"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                          >
                            <polyline points="3 6 5 6 21 6" />
                            <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6" />
                            <path d="M10 11v6" />
                            <path d="M14 11v6" />
                            <path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2" />
                          </svg>
                        </button>
                      </div>
                    </article>
                  );
                })}
              </div>
            )}
          </section>

          <footer className={styles.cartFooter}>
            <div>
              <strong>總金額：</strong> ${totalAmount}
            </div>
            {/* 訂單備註與寄送地址欄位 */}
            <div style={{ margin: '8px 0' }}>
              <label htmlFor="orderNote" style={{ fontWeight: 'bold' }}>訂單備註：</label>
              <textarea
                id="orderNote"
                value={orderNote}
                onChange={e => setOrderNote(e.target.value)}
                placeholder="請輸入訂單備註..."
                rows={2}
                style={{ width: '100%', resize: 'vertical', marginTop: 4 }}
              />
            </div>
            <div style={{ margin: '8px 0' }}>
              <label htmlFor="orderAddress" style={{ fontWeight: 'bold' }}>寄送地址<span style={{ color: 'red' }}>*</span>：</label>
              <input
                id="orderAddress"
                type="text"
                value={orderAddress}
                onChange={e => setOrderAddress(e.target.value)}
                placeholder="請輸入寄送地址..."
                style={{ width: '100%', marginTop: 4 }}
                required
              />
            </div>
            <button onClick={handleCheckout} type="button" disabled={isCheckingOut}>
              {isCheckingOut ? '結帳中...' : '結帳'}
            </button>
          </footer>
        </aside>

        <div
          className={`${styles.cartOverlay} ${cartSidebarOpen ? styles.active : ''}`}
          onClick={toggleCartSidebar}
          aria-hidden={!cartSidebarOpen}
        />

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
                toggleCartSidebar={toggleCartSidebar}
              />
            }
          />
          <Route
            path="/admin"
            element={
              isAdmin ? (
                <OrdersPage
                  products={products}
                  setProducts={setProducts}
                  orders={orders}
                  setOrders={setOrders}
                />
              ) : (
                <LoginPage setIsAdmin={setIsAdmin} />
              )
            }
          />
          <Route path="/thank-you" element={<ThankYouPage />} />
        </Routes>
      </div>
    </Router>
  );
}

export default App;
