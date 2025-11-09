"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { fetchProducts, fetchAddOns, submitOrder } from "@/lib/api";
import styles from "./kiosk.module.css";

// Helper function to categorize products dynamically
const categorizeProduct = (product) => {
  const category = product.category || "";
  const name = (product.product_name || "").toLowerCase();

  // Sides are straightforward
  if (category === "Side") {
    return "Sides";
  }

  // For drinks, categorize based on name patterns
  if (category === "Drink") {
    // Milk drink indicators
    const milkIndicators = ["milk tea", "milk", "taro", "matcha", "brown sugar", "pumpkin tea"];
    const isMilkDrink = milkIndicators.some(indicator => name.includes(indicator));

    // Fruit drink indicators
    const fruitIndicators = ["wintermelon", "strawberry", "honey lemonade", "passionfruit", "green tea", "lemonade"];
    const isFruitDrink = fruitIndicators.some(indicator => name.includes(indicator));

    // Special cases
    if (name.includes("thai tea")) {
      // Thai Tea could go either way, defaulting to Milk Drinks
      return "Milk Drinks";
    }

    if (isMilkDrink) {
      return "Milk Drinks";
    } else if (isFruitDrink) {
      return "Fruit Drinks";
    } else {
      // Default: if it has "tea" and not explicitly fruit, assume milk drink
      // Otherwise, default to Fruit Drinks
      return name.includes("tea") && !name.includes("green") ? "Milk Drinks" : "Fruit Drinks";
    }
  }

  // Default fallback
  return null;
};

export default function KioskPage() {
  const router = useRouter();
  const [products, setProducts] = useState([]);
  const [addOns, setAddOns] = useState([]);
  const [selectedCategory, setSelectedCategory] = useState("Milk Drinks");
  const [cart, setCart] = useState([]);
  const [showModificationModal, setShowModificationModal] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Load products and add-ons from backend
  useEffect(() => {
    async function loadData() {
      try {
        setLoading(true);
        const [productsData, addOnsData] = await Promise.all([
          fetchProducts(),
          fetchAddOns()
        ]);
        setProducts(productsData);
        setAddOns(addOnsData);
        setError(null);
      } catch (err) {
        setError("Failed to load products. Please try again later.");
        console.error(err);
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, []);

  // Categorize products dynamically
  const categorizeProducts = () => {
    const categorized = {
      "Milk Drinks": [],
      "Fruit Drinks": [],
      "Sides": []
    };

    products.forEach(product => {
      const category = categorizeProduct(product);
      if (category && categorized[category]) {
        categorized[category].push(product);
      }
    });

    return categorized;
  };

  const categorizedProducts = categorizeProducts();

  // Handle product click
  const handleProductClick = (product) => {
    const category = product.category || "";
    if (category === "Drink") {
      setSelectedProduct(product);
      setShowModificationModal(true);
    } else {
      // For sides, add directly to cart
      addToCart(product, { iceLevel: null, sugarLevel: null, addOns: [] });
    }
  };

  // Add item to cart
  const addToCart = (product, modifications = {}) => {
    const cartItem = {
      id: Date.now() + Math.random(), // Unique ID for cart item
      product: product,
      modifications: modifications,
      quantity: 1
    };
    setCart([...cart, cartItem]);
    setShowModificationModal(false);
    setSelectedProduct(null);
  };

  // Remove item from cart
  const removeFromCart = (itemId) => {
    setCart(cart.filter(item => item.id !== itemId));
  };

  // Update quantity
  const updateQuantity = (itemId, newQuantity) => {
    if (newQuantity <= 0) {
      removeFromCart(itemId);
      return;
    }
    setCart(cart.map(item => 
      item.id === itemId ? { ...item, quantity: newQuantity } : item
    ));
  };

  // Clear cart
  const clearCart = () => {
    setCart([]);
  };

  // Calculate total
  const calculateTotal = () => {
    return cart.reduce((total, item) => {
      const productPrice = parseFloat(item.product.price) || 0;
      const addOnsPrice = item.modifications.addOns?.reduce((sum, addOn) => {
        return sum + (parseFloat(addOn.price) || 0);
      }, 0) || 0;
      return total + (productPrice + addOnsPrice) * item.quantity;
    }, 0);
  };

  // Handle checkout
  const handleCheckout = async () => {
    if (cart.length === 0) {
      alert("Your cart is empty!");
      return;
    }

    try {
      const orderData = {
        items: cart.map(item => ({
          product_id: item.product.product_id,
          product_name: item.product.product_name,
          quantity: item.quantity,
          price: item.product.price,
          modifications: item.modifications
        })),
        total: calculateTotal(),
        timestamp: new Date().toISOString()
      };

      await submitOrder(orderData);
      alert("Order placed successfully!");
      clearCart();
    } catch (error) {
      alert("Failed to place order. Please try again.");
      console.error(error);
    }
  };

  // Handle logout
  const handleLogout = () => {
    router.push("/");
  };

  if (loading) {
    return (
      <div className={styles.kioskContainer}>
        <div className={styles.loading}>Loading products...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className={styles.kioskContainer}>
        <div className={styles.error}>{error}</div>
      </div>
    );
  }

  return (
    <div className={styles.kioskContainer}>
      <div className={styles.kioskLayout}>
        {/* Left Sidebar - Categories */}
        <div className={styles.categoriesSidebar}>
          <h2 className={styles.sidebarTitle}>Categories</h2>
          <div className={styles.categoryButtons}>
            {Object.keys(categorizedProducts).map(category => (
              <button
                key={category}
                onClick={() => setSelectedCategory(category)}
                className={`${styles.categoryButton} ${
                  selectedCategory === category ? styles.categoryButtonActive : ""
                }`}
              >
                {category}
              </button>
            ))}
          </div>
        </div>

        {/* Middle - Products Grid */}
        <div className={styles.productsSection}>
          <h2 className={styles.sectionTitle}>{selectedCategory}</h2>
          <div className={styles.productsGrid}>
            {categorizedProducts[selectedCategory]?.map(product => (
              <div
                key={product.product_id}
                className={styles.productCard}
                onClick={() => handleProductClick(product)}
              >
                <div className={styles.productName}>{product.product_name}</div>
                <div className={styles.productPrice}>${parseFloat(product.price).toFixed(2)}</div>
                {product.stock !== undefined && (
                  <div className={styles.productStock}>
                    Stock: {product.stock}
                  </div>
                )}
              </div>
            ))}
            {(!categorizedProducts[selectedCategory] || categorizedProducts[selectedCategory].length === 0) && (
              <div className={styles.noProducts}>No products in this category</div>
            )}
          </div>
        </div>

        {/* Right Sidebar - Cart */}
        <div className={styles.cartSidebar}>
          <h2 className={styles.sidebarTitle}>Cart</h2>
          <div className={styles.cartItems}>
            {cart.length === 0 ? (
              <div className={styles.emptyCart}>Your cart is empty</div>
            ) : (
              cart.map(item => (
                <div key={item.id} className={styles.cartItem}>
                  <div className={styles.cartItemHeader}>
                    <span className={styles.cartItemName}>{item.product.product_name}</span>
                    <button
                      onClick={() => removeFromCart(item.id)}
                      className={styles.removeButton}
                    >
                      ×
                    </button>
                  </div>
                  {item.modifications.iceLevel && (
                    <div className={styles.cartItemMod}>Ice: {item.modifications.iceLevel}</div>
                  )}
                  {item.modifications.sugarLevel && (
                    <div className={styles.cartItemMod}>Sugar: {item.modifications.sugarLevel}</div>
                  )}
                  {item.modifications.addOns && item.modifications.addOns.length > 0 && (
                    <div className={styles.cartItemMod}>
                      Add-ons: {item.modifications.addOns.map(a => a.product_name).join(", ")}
                    </div>
                  )}
                  <div className={styles.cartItemFooter}>
                    <div className={styles.quantityControls}>
                      <button
                        onClick={() => updateQuantity(item.id, item.quantity - 1)}
                        className={styles.quantityButton}
                      >
                        −
                      </button>
                      <span className={styles.quantity}>{item.quantity}</span>
                      <button
                        onClick={() => updateQuantity(item.id, item.quantity + 1)}
                        className={styles.quantityButton}
                      >
                        +
                      </button>
                    </div>
                    <div className={styles.cartItemPrice}>
                      {`$${(((parseFloat(item.product.price) || 0) + 
                          (item.modifications.addOns?.reduce((sum, a) => sum + (parseFloat(a.price) || 0), 0) || 0)) * 
                          item.quantity).toFixed(2)}`}
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
          {cart.length > 0 && (
            <div className={styles.cartTotal}>
              <div className={styles.totalLabel}>Total:</div>
              <div className={styles.totalAmount}>${calculateTotal().toFixed(2)}</div>
            </div>
          )}
        </div>
      </div>

      {/* Bottom Bar - Action Buttons */}
      <div className={styles.bottomBar}>
        <button onClick={handleLogout} className={styles.logoutButton}>
          Logout
        </button>
        <div className={styles.cartActions}>
          <button
            onClick={clearCart}
            className={styles.clearCartButton}
            disabled={cart.length === 0}
          >
            Clear Cart
          </button>
          <button
            onClick={handleCheckout}
            className={styles.checkoutButton}
            disabled={cart.length === 0}
          >
            Checkout
          </button>
        </div>
      </div>

      {/* Modification Modal */}
      {showModificationModal && selectedProduct && (
        <ModificationModal
          product={selectedProduct}
          addOns={addOns}
          onClose={() => {
            setShowModificationModal(false);
            setSelectedProduct(null);
          }}
          onAddToCart={(modifications) => addToCart(selectedProduct, modifications)}
        />
      )}
    </div>
  );
}

// Modification Modal Component
function ModificationModal({ product, addOns, onClose, onAddToCart }) {
  const [iceLevel, setIceLevel] = useState("Regular");
  const [sugarLevel, setSugarLevel] = useState("Regular");
  const [selectedAddOns, setSelectedAddOns] = useState([]);

  const iceLevels = ["No Ice", "Less Ice", "Regular", "Extra Ice"];
  const sugarLevels = ["No Sugar", "Less Sugar", "Regular", "Extra Sugar"];

  const toggleAddOn = (addOn) => {
    setSelectedAddOns(prev => {
      const exists = prev.find(a => a.product_id === addOn.product_id);
      if (exists) {
        return prev.filter(a => a.product_id !== addOn.product_id);
      } else {
        return [...prev, addOn];
      }
    });
  };

  const handleAddToCart = () => {
    onAddToCart({
      iceLevel,
      sugarLevel,
      addOns: selectedAddOns
    });
  };

  return (
    <div className={styles.modalOverlay} onClick={onClose}>
      <div className={styles.modalContent} onClick={(e) => e.stopPropagation()}>
        <div className={styles.modalHeader}>
          <h2 className={styles.modalTitle}>{product.product_name}</h2>
          <button onClick={onClose} className={styles.modalCloseButton}>×</button>
        </div>

        <div className={styles.modalBody}>
          {/* Ice Level Selection */}
          <div className={styles.modificationSection}>
            <h3 className={styles.modificationTitle}>Ice Level</h3>
            <div className={styles.optionButtons}>
              {iceLevels.map(level => (
                <button
                  key={level}
                  onClick={() => setIceLevel(level)}
                  className={`${styles.optionButton} ${
                    iceLevel === level ? styles.optionButtonActive : ""
                  }`}
                >
                  {level}
                </button>
              ))}
            </div>
          </div>

          {/* Sugar Level Selection */}
          <div className={styles.modificationSection}>
            <h3 className={styles.modificationTitle}>Sugar Level</h3>
            <div className={styles.optionButtons}>
              {sugarLevels.map(level => (
                <button
                  key={level}
                  onClick={() => setSugarLevel(level)}
                  className={`${styles.optionButton} ${
                    sugarLevel === level ? styles.optionButtonActive : ""
                  }`}
                >
                  {level}
                </button>
              ))}
            </div>
          </div>

          {/* Add-ons Selection */}
          <div className={styles.modificationSection}>
            <h3 className={styles.modificationTitle}>Add-ons</h3>
            <div className={styles.addOnsGrid}>
              {addOns.map(addOn => {
                const isSelected = selectedAddOns.find(a => a.product_id === addOn.product_id);
                return (
                  <button
                    key={addOn.product_id}
                    onClick={() => toggleAddOn(addOn)}
                    className={`${styles.addOnButton} ${
                      isSelected ? styles.addOnButtonActive : ""
                    }`}
                  >
                    <div className={styles.addOnName}>{addOn.product_name}</div>
                    <div className={styles.addOnPrice}>+${parseFloat(addOn.price).toFixed(2)}</div>
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        <div className={styles.modalFooter}>
          <button onClick={onClose} className={styles.modalCancelButton}>
            Cancel
          </button>
          <button onClick={handleAddToCart} className={styles.modalAddButton}>
            Add to Cart
          </button>
        </div>
      </div>
    </div>
  );
}

