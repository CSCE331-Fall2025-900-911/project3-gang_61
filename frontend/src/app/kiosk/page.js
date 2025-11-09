"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { fetchProducts, fetchAddOns, submitOrder } from "@/lib/api";
import styles from "./kiosk.module.css";

// Map database categories to display categories
const mapCategoryToDisplay = (dbCategory) => {
  const categoryMap = {
    "Milk Drink": "Milk Drinks",
    "Fruit Drink": "Fruit Drinks",
    "Seasonal": "Seasonal",
    "Side": "Sides",
  };
  return categoryMap[dbCategory] || null;
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
  // Member and Employee IDs - can come from URL params, localStorage, or default to 0
  const [memberId, setMemberId] = useState(0);
  const [employeeId, setEmployeeId] = useState(0);

  // Load member_id and employee_id from URL params or localStorage
  useEffect(() => {
    // Check URL search parameters first
    const searchParams = new URLSearchParams(window.location.search);
    const urlMemberId = searchParams.get("member_id");
    const urlEmployeeId = searchParams.get("employee_id");

    // Check localStorage as fallback
    const storedMemberId = localStorage.getItem("member_id");
    const storedEmployeeId = localStorage.getItem("employee_id");

    // Set member_id: URL param > localStorage > default (0)
    if (urlMemberId) {
      setMemberId(parseInt(urlMemberId) || 0);
    } else if (storedMemberId) {
      setMemberId(parseInt(storedMemberId) || 0);
    }

    // Set employee_id: URL param > localStorage > default (0)
    if (urlEmployeeId) {
      setEmployeeId(parseInt(urlEmployeeId) || 0);
    } else if (storedEmployeeId) {
      setEmployeeId(parseInt(storedEmployeeId) || 0);
    }
  }, []);

  // Categorize products using database categories
  const categorizeProducts = () => {
    const categorized = {
      "Milk Drinks": [],
      "Fruit Drinks": [],
      "Seasonal": [],
      "Sides": [],
    };

    products.forEach((product) => {
      const displayCategory = mapCategoryToDisplay(product.category);
      if (displayCategory && categorized[displayCategory]) {
        categorized[displayCategory].push(product);
      }
    });

    return categorized;
  };

  // Load products and add-ons from backend
  useEffect(() => {
    async function loadData() {
      try {
        setLoading(true);
        const [productsData, addOnsData] = await Promise.all([
          fetchProducts(),
          fetchAddOns(),
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

  // Set initial selected category to first available category after products load
  useEffect(() => {
    if (products.length > 0) {
      const categorized = categorizeProducts();
      const availableCategories = Object.keys(categorized).filter(
        (cat) => categorized[cat].length > 0
      );
      if (availableCategories.length > 0 && !availableCategories.includes(selectedCategory)) {
        setSelectedCategory(availableCategories[0]);
      }
    }
  }, [products, selectedCategory]);

  const categorizedProducts = categorizeProducts();

  // Handle product click
  const handleProductClick = (product) => {
    const category = product.category || "";
    // Check if it's a drink category (Milk Drink, Fruit Drink, or Seasonal)
    if (category === "Milk Drink" || category === "Fruit Drink" || category === "Seasonal") {
      setSelectedProduct(product);
      setShowModificationModal(true);
    } else {
      // For sides and other non-drink items, add directly to cart
      addToCart(product, { iceLevel: null, sugarLevel: null, addOns: [] });
    }
  };

  // Add item to cart
  const addToCart = (product, modifications = {}) => {
    const cartItem = {
      id: Date.now() + Math.random(), // Unique ID for cart item
      product: product,
      modifications: modifications,
      quantity: 1,
    };
    setCart([...cart, cartItem]);
    setShowModificationModal(false);
    setSelectedProduct(null);
  };

  // Remove item from cart
  const removeFromCart = (itemId) => {
    setCart(cart.filter((item) => item.id !== itemId));
  };

  // Update quantity
  const updateQuantity = (itemId, newQuantity) => {
    if (newQuantity <= 0) {
      removeFromCart(itemId);
      return;
    }
    setCart(
      cart.map((item) =>
        item.id === itemId ? { ...item, quantity: newQuantity } : item
      )
    );
  };

  // Clear cart
  const clearCart = () => {
    setCart([]);
  };

  // Calculate total
  const calculateTotal = () => {
    return cart.reduce((total, item) => {
      const productPrice = parseFloat(item.product.price) || 0;
      const addOnsPrice =
        item.modifications.addOns?.reduce((sum, addOn) => {
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
        items: cart.map((item) => ({
          product_id: item.product.product_id,
          product_name: item.product.product_name,
          quantity: item.quantity,
          price: item.product.price,
          modifications: item.modifications,
        })),
        total: calculateTotal(),
        timestamp: new Date().toISOString(),
        // For kiosk orders, use 0 for member_id and employee_id when no user is logged in
        member_id: 0,
        employee_id: 0,
      };

      const result = await submitOrder(orderData);

      // Show success message with order confirmation if available
      const successMessage = result.orderId
        ? `Order placed successfully! Order ID: ${result.orderId}`
        : result.message || "Order placed successfully!";

      alert(successMessage);
      clearCart();
    } catch (error) {
      const errorMessage =
        error.message || "Failed to place order. Please try again.";
      alert(errorMessage);
      console.error("Error submitting order:", error);
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
            {Object.keys(categorizedProducts)
              .filter((category) => categorizedProducts[category].length > 0)
              .map((category) => (
                <button
                  key={category}
                  onClick={() => setSelectedCategory(category)}
                  className={`${styles.categoryButton} ${
                    selectedCategory === category
                      ? styles.categoryButtonActive
                      : ""
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
            {categorizedProducts[selectedCategory]?.map((product) => (
              <div
                key={product.product_id}
                className={styles.productCard}
                onClick={() => handleProductClick(product)}
              >
                <div className={styles.productName}>{product.product_name}</div>
                <div className={styles.productPrice}>
                  ${parseFloat(product.price).toFixed(2)}
                </div>
                {product.stock !== undefined && (
                  <div className={styles.productStock}>
                    Stock: {product.stock}
                  </div>
                )}
              </div>
            ))}
            {(!categorizedProducts[selectedCategory] ||
              categorizedProducts[selectedCategory].length === 0) && (
              <div className={styles.noProducts}>
                No products in this category
              </div>
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
              cart.map((item) => (
                <div key={item.id} className={styles.cartItem}>
                  <div className={styles.cartItemHeader}>
                    <span className={styles.cartItemName}>
                      {item.product.product_name}
                    </span>
                    <button
                      onClick={() => removeFromCart(item.id)}
                      className={styles.removeButton}
                    >
                      ×
                    </button>
                  </div>
                  {item.modifications.iceLevel && (
                    <div className={styles.cartItemMod}>
                      Ice: {item.modifications.iceLevel}
                    </div>
                  )}
                  {item.modifications.sugarLevel && (
                    <div className={styles.cartItemMod}>
                      Sugar: {item.modifications.sugarLevel}
                    </div>
                  )}
                  {item.modifications.addOns &&
                    item.modifications.addOns.length > 0 && (
                      <div className={styles.cartItemMod}>
                        Add-ons:{" "}
                        {item.modifications.addOns
                          .map((a) => a.product_name)
                          .join(", ")}
                      </div>
                    )}
                  <div className={styles.cartItemFooter}>
                    <div className={styles.quantityControls}>
                      <button
                        onClick={() =>
                          updateQuantity(item.id, item.quantity - 1)
                        }
                        className={styles.quantityButton}
                      >
                        −
                      </button>
                      <span className={styles.quantity}>{item.quantity}</span>
                      <button
                        onClick={() =>
                          updateQuantity(item.id, item.quantity + 1)
                        }
                        className={styles.quantityButton}
                      >
                        +
                      </button>
                    </div>
                    <div className={styles.cartItemPrice}>
                      {`$${(
                        ((parseFloat(item.product.price) || 0) +
                          (item.modifications.addOns?.reduce(
                            (sum, a) => sum + (parseFloat(a.price) || 0),
                            0
                          ) || 0)) *
                        item.quantity
                      ).toFixed(2)}`}
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
          {cart.length > 0 && (
            <div className={styles.cartTotal}>
              <div className={styles.totalLabel}>Total:</div>
              <div className={styles.totalAmount}>
                ${calculateTotal().toFixed(2)}
              </div>
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
          onAddToCart={(modifications) =>
            addToCart(selectedProduct, modifications)
          }
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
    setSelectedAddOns((prev) => {
      const exists = prev.find((a) => a.product_id === addOn.product_id);
      if (exists) {
        return prev.filter((a) => a.product_id !== addOn.product_id);
      } else {
        return [...prev, addOn];
      }
    });
  };

  const handleAddToCart = () => {
    onAddToCart({
      iceLevel,
      sugarLevel,
      addOns: selectedAddOns,
    });
  };

  return (
    <div className={styles.modalOverlay} onClick={onClose}>
      <div className={styles.modalContent} onClick={(e) => e.stopPropagation()}>
        <div className={styles.modalHeader}>
          <h2 className={styles.modalTitle}>{product.product_name}</h2>
          <button onClick={onClose} className={styles.modalCloseButton}>
            ×
          </button>
        </div>

        <div className={styles.modalBody}>
          {/* Ice Level Selection */}
          <div className={styles.modificationSection}>
            <h3 className={styles.modificationTitle}>Ice Level</h3>
            <div className={styles.optionButtons}>
              {iceLevels.map((level) => (
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
              {sugarLevels.map((level) => (
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
              {addOns.map((addOn) => {
                const isSelected = selectedAddOns.find(
                  (a) => a.product_id === addOn.product_id
                );
                return (
                  <button
                    key={addOn.product_id}
                    onClick={() => toggleAddOn(addOn)}
                    className={`${styles.addOnButton} ${
                      isSelected ? styles.addOnButtonActive : ""
                    }`}
                  >
                    <div className={styles.addOnName}>{addOn.product_name}</div>
                    <div className={styles.addOnPrice}>
                      +${parseFloat(addOn.price).toFixed(2)}
                    </div>
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
