import React, { useEffect, useState } from 'react';
import { BrowserRouter as Router, Link, Route, Routes } from 'react-router-dom';
import ReactSwitch from 'react-switch';

import styles from './App.module.css';
import OrdersPage from './OrdersPage';

// ============================================================================
// Store Page Component
// - Displays product list, header with dark mode toggle, and cart icon
// ============================================================================
function StorePage({
  products,
  handleAddToCart,
  cart,
  toggleCartSidebar,
  darkMode,
  toggleDarkMode,
}) {
  const handleFlyToCart = (product, event) => {
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

    handleAddToCart(product);
  };

  return (
    <div className={styles.storePage}>
      {/* ----------------------------------------------------------------------
         Header: Title, Dark Mode Toggle, Cart Icon with Badge
      ---------------------------------------------------------------------- */}
      <header className={styles.storeHeader}>
        <h1 className={styles.storeTitle}>商店頁面</h1>

      </header>

      {/* ----------------------------------------------------------------------
         Main Content: Welcome, Product Grid
      ---------------------------------------------------------------------- */}
      <main>

      <div className={styles.headerRow}>
        <h2 className={styles.title}>商品清單</h2>

        <div className={styles.headerRight}>
          <ReactSwitch
            checked={darkMode}
            onChange={toggleDarkMode}
            onColor="#000"
            offColor="#ccc"
            onHandleColor="#fff"
            offHandleColor="#000"
            checkedIcon={false}
            uncheckedIcon={false}
            height={20}
            width={48}
          />

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
            const imageSrc =
              (product && product.image && `http://localhost:4000${product.image}`) ||
              'https://via.placeholder.com/150';

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
// - State management, effects, event handlers, and routes
// ============================================================================
function App() {
  // --------------------------------------------------------------------------
  // State Management
  // --------------------------------------------------------------------------
  const [products, setProducts] = useState([]);
  const [cart, setCart] = useState([]);
  const [darkMode, setDarkMode] = useState(false);
  const [cartSidebarOpen, setCartSidebarOpen] = useState(false);

  // --------------------------------------------------------------------------
  // Effects: Fetch Products
  // --------------------------------------------------------------------------
  useEffect(() => {
    fetch('http://localhost:4000/api/products')
      .then((response) => response.json())
      .then((data) => setProducts(data))
      .catch((error) => console.error('Error fetching products:', error));
  }, []);

  // --------------------------------------------------------------------------
  // Effects: Dark Mode Body Class Toggle
  // --------------------------------------------------------------------------
  useEffect(() => {
    if (darkMode) {
      document.body.classList.add('dark-mode');
      return;
    }
    document.body.classList.remove('dark-mode');
  }, [darkMode]);

  // --------------------------------------------------------------------------
  // Derived State: Cart Total Amount
  // --------------------------------------------------------------------------
  const totalAmount = cart.reduce(
    (sum, item) => sum + item.price * item.quantity,
    0
  );

  // --------------------------------------------------------------------------
  // Event Handlers
  // --------------------------------------------------------------------------
  // Add a product to the cart or increase quantity
  const handleAddToCart = (product) => {
    if (!product || product.stock <= 0) return;

    setCart((prevCart) => {
      const existing = prevCart.find((item) => item.id === product.id);
      if (existing) {
        return prevCart.map((item) =>
          item.id === product.id ? { ...item, quantity: item.quantity + 1 } : item
        );
      }
      return [...prevCart, { ...product, quantity: 1 }];
    });
  };

  // Update cart item quantity with delta (+1 / -1), clamped to minimum 1
  const handleCartUpdate = (productId, delta) => {
    setCart((prevCart) =>
      prevCart
        .map((item) =>
          item.id === productId
            ? { ...item, quantity: Math.max(item.quantity + delta, 1) }
            : item
        )
        .filter((item) => item.quantity > 0)
    );
  };

  // Remove item from the cart
  const handleRemoveFromCart = (productId) => {
    setCart((prevCart) => prevCart.filter((item) => item.id !== productId));
  };

  // Placeholder checkout handler
  const handleCheckout = () => {
    // Placeholder for checkout logic
    alert('結帳功能尚未實作');
  };

  // Toggle dark mode
  const toggleDarkMode = () => setDarkMode((prev) => !prev);

  // Toggle cart sidebar open/close
  const toggleCartSidebar = () => setCartSidebarOpen((open) => !open);

  // --------------------------------------------------------------------------
  // Render
  // --------------------------------------------------------------------------
  return (
    <Router>
      <div>
        {/* ==================================================================
           Cart Sidebar + Overlay
           - Semantic structure
           - Grid-aligned cart item layout via CSS classes:
             cartItemThumb, cartItemTitle, cartItemDelete,
             cartItemUnitPrice, cartItemQty, cartItemSubtotal
        =================================================================== */}
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
                  const imageSrc =
                    (item && item.image && `http://localhost:4000${item.image}`) ||
                    'https://via.placeholder.com/80';

                  return (
                    <article
                      key={item.id}
                      className={styles.cartItem}
                      role="listitem"
                      aria-label={item.name}
                    >
                      {/* Thumbnail */}
                      <div className={styles.cartItemThumb}>
                        <img src={imageSrc} alt={item.name} />
                      </div>

                      {/* Title */}
                      <div className={styles.cartItemTitle}>{item.name}</div>

                      {/* Quantity Controls */}
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

                      {/* Subtotal */}
                      <div className={styles.cartItemSubtotal}>
                        ${item.price * item.quantity}
                      </div>

                      {/* Delete */}
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
            <button onClick={handleCheckout} type="button">
              結帳
            </button>
          </footer>
        </aside>

        <div
          className={`${styles.cartOverlay} ${cartSidebarOpen ? styles.active : ''}`}
          onClick={toggleCartSidebar}
          aria-hidden={!cartSidebarOpen}
        />

        {/* ==================================================================
           Routes
        =================================================================== */}
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
          <Route path="/admin" element={<OrdersPage />} />
        </Routes>
      </div>
    </Router>
  );
}

export default App;