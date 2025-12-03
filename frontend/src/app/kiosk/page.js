"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { fetchProducts, fetchAddOns, submitOrder } from "@/lib/api";
import { logout } from "@/lib/auth";
import { useRequireAuth } from "@/lib/useAuth";
import AccessibilityMenu from "@/components/AccessibilityMenu";
import CheckoutSuccessModal from "@/components/CheckoutSuccessModal";
import styles from "./kiosk.module.css";

// Map database categories to display categories
const mapCategoryToDisplay = (dbCategory) => {
  const categoryMap = {
    "Milk Drink": "Milk Drinks",
    "Fruit Drink": "Fruit Drinks",
    Seasonal: "Seasonal",
    Side: "Sides",
  };
  return categoryMap[dbCategory] || null;
};

// Map display categories to image paths
const getCategoryImage = (category) => {
  const imageMap = {
    "Milk Drinks": "/categories/milk.png",
    "Fruit Drinks": "/categories/fruit.png",
    Seasonal: "/categories/seasonal.png",
    Sides: "/categories/sides.png",
  };
  const basePath = imageMap[category];
  // Add cache-busting query parameter to force reload of updated images
  return basePath ? `${basePath}?v=${Date.now()}` : null;
};

// Placeholder image path for products without images
const PLACEHOLDER_IMAGE = "/products/placeholder.png";

// derive product image path (prefers product.image_url, else product_id.png)
const getProductImageSrc = (product) => {
  if (product?.image_url) {
    return product.image_url.startsWith("/")
      ? product.image_url
      : `/products/${product.image_url}`;
  }
  return `/products/${product.product_id}.png`;
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
  const [memberId, setMemberId] = useState(0);
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [orderSubtotal, setOrderSubtotal] = useState(0);

  // Verify that the user logged in through sign-in services
  useRequireAuth(router);

  // Load member_id from URL params or sessionStorage (optional, for guest orders)
  // For kiosk orders, employee_id is always 0 (self-service)
  useEffect(() => {
    // Check URL search parameters first
    const searchParams = new URLSearchParams(window.location.search);
    const urlMemberId = searchParams.get("member_id");

    // Check sessionStorage as fallback
    const storedUser = sessionStorage.getItem("user");
    const storedMemberId = sessionStorage.getItem("member_id");
    const storedUserId = sessionStorage.getItem("user_id");

    // Parse user object from sessionStorage if available
    let userData = null;
    if (storedUser) {
      try {
        userData = JSON.parse(storedUser);
      } catch (e) {
        console.error("Error parsing user data from sessionStorage:", e);
      }
    }

    // Set member_id: URL param > sessionStorage member_id > sessionStorage user_id > user object > default (0)
    if (urlMemberId) {
      setMemberId(parseInt(urlMemberId) || 0);
    } else if (storedMemberId) {
      setMemberId(parseInt(storedMemberId) || 0);
    } else if (storedUserId) {
      setMemberId(parseInt(storedUserId) || 0);
    } else if (
      userData &&
      (userData.user_id || userData.memberId || userData.id)
    ) {
      setMemberId(
        parseInt(userData.user_id || userData.memberId || userData.id) || 0
      );
    }
    // If none found, memberId stays 0 (guest order)
  }, []);

  // Categorize products using database categories
  const categorizeProducts = () => {
    const categorized = {
      "Milk Drinks": [],
      "Fruit Drinks": [],
      Seasonal: [],
      Sides: [],
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
  const loadData = async () => {
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
  };

  useEffect(() => {
    loadData();
  }, []);

  // Set initial selected category to first available category after products load
  useEffect(() => {
    if (products.length > 0) {
      const categorized = categorizeProducts();
      const availableCategories = Object.keys(categorized).filter(
        (cat) => categorized[cat].length > 0
      );
      if (
        availableCategories.length > 0 &&
        !availableCategories.includes(selectedCategory)
      ) {
        setSelectedCategory(availableCategories[0]);
      }
    }
  }, [products, selectedCategory]);

  const categorizedProducts = categorizeProducts();

  // Handle product click
  const handleProductClick = (product) => {
    // Don't allow clicking if stock is 0
    if (product.stock === 0) {
      return;
    }
    const category = product.category || "";
    // Check if it's a drink category (Milk Drink, Fruit Drink, or Seasonal)
    if (
      category === "Milk Drink" ||
      category === "Fruit Drink" ||
      category === "Seasonal"
    ) {
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
      const total = calculateTotal();
      const orderData = {
        items: cart.map((item) => ({
          product_id: item.product.product_id,
          product_name: item.product.product_name,
          quantity: item.quantity,
          price: item.product.price,
          modifications: item.modifications,
        })),
        total: total,
        timestamp: new Date().toISOString(),
        member_id: memberId,
        employee_id: 0, // Always 0 for kiosk orders (self-service)
      };

      await submitOrder(orderData);

      // Show success modal with subtotal
      setOrderSubtotal(total);
      setShowSuccessModal(true);
      clearCart();

      // Refresh products to update stock
      await loadData();
    } catch (error) {
      const errorMessage =
        error.message || "Failed to place order. Please try again.";
      alert(errorMessage);
      console.error("Error submitting order:", error);
    }
  };

  // Handle logout
  const handleLogout = () => {
    logout(router);
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
              .map((category) => {
                const imagePath = getCategoryImage(category);
                return (
                  <button
                    key={category}
                    onClick={() => setSelectedCategory(category)}
                    className={`${styles.categoryButton} ${
                      selectedCategory === category
                        ? styles.categoryButtonActive
                        : ""
                    }`}
                  >
                    {imagePath && (
                      <div className={styles.categoryImageContainer}>
                        <Image
                          src={imagePath}
                          alt={category}
                          fill
                          className={styles.categoryImage}
                          style={{ objectFit: "contain" }}
                          unoptimized
                        />
                      </div>
                    )}
                    <span className={styles.categoryText}>{category}</span>
                  </button>
                );
              })}
          </div>
        </div>

        {/* Middle - Products Grid */}
        <div className={styles.productsSection}>
          <h2 className={styles.sectionTitle}>{selectedCategory}</h2>
          <div className={styles.productsGrid}>
            {categorizedProducts[selectedCategory]?.map((product) => {
              const isOutOfStock = product.stock === 0;
              const isLowStock =
                product.stock !== undefined &&
                product.stock > 0 &&
                product.stock < 25;
              return (
                <div
                  key={product.product_id}
                  className={`${styles.productCard} ${
                    isOutOfStock ? styles.productCardDisabled : ""
                  }`}
                  onClick={() => handleProductClick(product)}
                >
                  <div className={styles.productImageWrapper}>
                    <img
                      src={getProductImageSrc(product)}
                      alt={product.product_name}
                      loading="lazy"
                      onError={(e) => {
                        // Fallback to placeholder if image fails to load
                        if (e.target.src !== PLACEHOLDER_IMAGE) {
                          e.target.src = PLACEHOLDER_IMAGE;
                        }
                      }}
                      style={{
                        width: "100%",
                        height: "120px",
                        objectFit: "contain",
                        borderRadius: 6,
                      }}
                    />
                  </div>
                  <div className={styles.productName}>
                    {product.product_name}
                  </div>
                  <div className={styles.productPrice}>
                    ${parseFloat(product.price).toFixed(2)}
                  </div>
                  {product.stock !== undefined && (
                    <div className={styles.productStock}>
                      Stock: {product.stock}
                    </div>
                  )}
                  {isOutOfStock && (
                    <div className={styles.outOfStockBadge}>Out of Stock</div>
                  )}
                  {isLowStock && !isOutOfStock && (
                    <div className={styles.lowStockWarning}>Low Stock</div>
                  )}
                </div>
              );
            })}
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
        <div className={styles.leftActions}>
          <AccessibilityMenu />
          <button
            onClick={handleLogout}
            className={styles.logoutIconButton}
            aria-label="Logout"
            title="Logout"
          >
            <Image src="/logout.svg" alt="Logout" width={28} height={28} />
          </button>
        </div>
        <div className={styles.cartActions}>
          <button
            onClick={clearCart}
            className={styles.deleteIconButton}
            disabled={cart.length === 0}
            aria-label="Clear Cart"
            title="Clear Cart"
          >
            <Image src="/delete.svg" alt="Clear Cart" width={28} height={28} />
          </button>
          <button
            onClick={handleCheckout}
            className={styles.checkoutButton}
            disabled={cart.length === 0}
            title="Complete Order"
          >
            Checkout (${calculateTotal().toFixed(2)})
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

      {/* Checkout Success Modal */}
      <CheckoutSuccessModal
        isOpen={showSuccessModal}
        onClose={() => setShowSuccessModal(false)}
        subtotal={orderSubtotal}
        viewType="kiosk"
      />
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
    // Don't allow adding to cart if stock is 0
    if (product.stock === 0) {
      return;
    }
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
          {/* Product Description */}
          {product.description && (
            <div className={styles.productDescription}>
              {product.description}
            </div>
          )}

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
                  <div key={addOn.product_id} className={styles.addOnWrapper}>
                    <button
                      onClick={() => toggleAddOn(addOn)}
                      className={`${styles.addOnButton} ${
                        isSelected ? styles.addOnButtonActive : ""
                      }`}
                    >
                      <div className={styles.addOnName}>
                        {addOn.product_name}
                      </div>
                      <div className={styles.addOnPrice}>
                        +${parseFloat(addOn.price).toFixed(2)}
                      </div>
                    </button>
                    {addOn.description && (
                      <>
                        <div className={styles.addOnInfoContainer}>
                          <span className={styles.addOnInfoIcon}>i</span>
                        </div>
                        <div className={styles.addOnTooltip}>
                          {addOn.description}
                        </div>
                      </>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        <div className={styles.modalFooter}>
          <button onClick={onClose} className={styles.modalCancelButton}>
            Cancel
          </button>
          <button
            onClick={handleAddToCart}
            className={styles.modalAddButton}
            disabled={product.stock === 0}
          >
            {product.stock === 0 ? "Out of Stock" : "Add to Cart"}
          </button>
        </div>
      </div>
    </div>
  );
}
