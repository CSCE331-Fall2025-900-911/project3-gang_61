"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { fetchProducts, fetchAddOns, submitOrder } from "@/lib/api";
import { logout } from "@/lib/auth";
import { useRequireAuth } from "@/lib/useAuth";
import AccessibilityMenu from "@/components/AccessibilityMenu";
import CheckoutSuccessModal from "@/components/CheckoutSuccessModal";
import styles from "./cashier.module.css";
import Image from "next/image";

// Map database categories to display categories
const mapCategoryToDisplay = (dbCategory) => {
  const categoryMap = {
    "Milk Drink": "Milk Drinks",
    "Fruit Drink": "Fruit Drinks",
    "Blended Drink": "Blended Drinks",
    "Caffeinated Drink": "Caffeinated Drinks",
    Seasonal: "Seasonal",
    Side: "Sides",
  };
  return categoryMap[dbCategory] || null;
};

export default function CashierPage() {
  const router = useRouter();
  const [products, setProducts] = useState([]);
  const [addOns, setAddOns] = useState([]);
  const [cart, setCart] = useState([]);
  const [showModificationModal, setShowModificationModal] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [showEditModal, setShowEditModal] = useState(false);
  const [editingCartItem, setEditingCartItem] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [memberId, setMemberId] = useState(0);
  const [employeeId, setEmployeeId] = useState(0);
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [orderSubtotal, setOrderSubtotal] = useState(0);

  // Verify that the user logged in through sign-in services
  useRequireAuth(router);

  // Categorize products using database categories
  const categorizeProducts = () => {
    const categorized = {
      "Milk Drinks": [],
      "Fruit Drinks": [],
      "Blended Drinks": [],
      "Caffeinated Drinks": [],
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

  const categorizedProducts = categorizeProducts();
  const availableCategories = Object.keys(categorizedProducts).filter(
    (cat) => categorizedProducts[cat].length > 0
  );

  // Handle product click
  const handleProductClick = (product) => {
    // Don't allow clicking if stock is 0
    if (product.stock === 0) {
      return;
    }
    const category = product.category || "";
    // Check if it's a drink category
    if (
      category === "Milk Drink" ||
      category === "Fruit Drink" ||
      category === "Blended Drink" ||
      category === "Caffeinated Drink" ||
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

  // Update cart item modifications
  const updateCartItem = (itemId, modifications) => {
    setCart(
      cart.map((item) =>
        item.id === itemId ? { ...item, modifications } : item
      )
    );
    setShowEditModal(false);
    setEditingCartItem(null);
  };

  // Handle edit cart item
  const handleEditCartItem = (item) => {
    // Only allow editing drinks (items with modifications)
    const category = item.product.category || "";
    if (
      category === "Milk Drink" ||
      category === "Fruit Drink" ||
      category === "Blended Drink" ||
      category === "Caffeinated Drink" ||
      category === "Seasonal"
    ) {
      setEditingCartItem(item);
      setShowEditModal(true);
    }
  };

  // Clear cart
  const clearCart = () => {
    setCart([]);
  };

  // Calculate total
  const calculateTotal = () => {
    return cart.reduce((total, item) => {
      const basePrice = parseFloat(item.product.price) || 0;
      // Calculate size price modifier
      const sizeModifier =
        item.modifications.size === "Small"
          ? 0
          : item.modifications.size === "Regular"
          ? 0.5
          : item.modifications.size === "Large"
          ? 1.0
          : 0.5; // Default to Regular
      const productPrice = basePrice + sizeModifier;
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
        items: cart.map((item) => {
          const basePrice = parseFloat(item.product.price) || 0;
          // Calculate size price modifier
          const sizeModifier =
            item.modifications.size === "Small"
              ? 0
              : item.modifications.size === "Regular"
              ? 0.5
              : item.modifications.size === "Large"
              ? 1.0
              : 0.5; // Default to Regular
          const finalPrice = basePrice + sizeModifier;
          return {
            product_id: item.product.product_id,
            product_name: item.product.product_name,
            quantity: item.quantity,
            price: finalPrice,
            modifications: item.modifications,
          };
        }),
        total: total,
        timestamp: new Date().toISOString(),
        member_id: memberId,
        employee_id: employeeId || 0,
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
      <div className={styles.cashierContainer}>
        <div className={styles.loading}>Loading products...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className={styles.cashierContainer}>
        <div className={styles.error}>{error}</div>
      </div>
    );
  }

  return (
    <div className={styles.cashierContainer}>
      <div className={styles.cashierLayout}>
        {/* Products Section - All Products (Scrollable) */}
        <div className={styles.productsSection}>
          <div className={styles.productsScrollContainer}>
            {availableCategories.map((category) => (
              <div key={category} className={styles.categorySection}>
                <h2 className={styles.categoryTitle}>{category}</h2>
                <div className={styles.productsGrid}>
                  {categorizedProducts[category]?.map((product) => {
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
                          <div className={styles.outOfStockBadge}>
                            Out of Stock
                          </div>
                        )}
                        {isLowStock && !isOutOfStock && (
                          <div className={styles.lowStockWarning}>
                            Low Stock
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            ))}
            {availableCategories.length === 0 && (
              <div className={styles.noProducts}>No products available</div>
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
              cart.map((item) => {
                const category = item.product.category || "";
                const isDrink =
                  category === "Milk Drink" ||
                  category === "Fruit Drink" ||
                  category === "Blended Drink" ||
                  category === "Caffeinated Drink" ||
                  category === "Seasonal";
                return (
                  <div key={item.id} className={styles.cartItem}>
                    <div className={styles.cartItemHeader}>
                      <span className={styles.cartItemName}>
                        {item.product.product_name}
                      </span>
                      <div style={{ display: "flex", gap: "4px" }}>
                        {isDrink && (
                          <button
                            onClick={() => handleEditCartItem(item)}
                            className={styles.editButton}
                            aria-label={`Edit ${item.product.product_name}`}
                            title="Edit"
                          >
                            ✎
                          </button>
                        )}
                        <span style={{ display: "inline-block", width: "8px" }} />

                        <button
                          onClick={() => removeFromCart(item.id)}
                          className={styles.removeButton}
                        >
                          ×
                        </button>
                      </div>
                    </div>
                    {item.modifications.size && (
                      <div className={styles.cartItemMod}>
                        Size: {item.modifications.size}
                      </div>
                    )}
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
                          ((() => {
                            const basePrice =
                              parseFloat(item.product.price) || 0;
                            const sizeModifier =
                              item.modifications.size === "Small"
                                ? 0
                                : item.modifications.size === "Regular"
                                ? 0.5
                                : item.modifications.size === "Large"
                                ? 1.0
                                : 0.5;
                            return basePrice + sizeModifier;
                          })() +
                            (item.modifications.addOns?.reduce(
                              (sum, a) => sum + (parseFloat(a.price) || 0),
                              0
                            ) || 0)) *
                          item.quantity
                        ).toFixed(2)}`}
                      </div>
                    </div>
                  </div>
                );
              })
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

      {/* Edit Cart Item Modal */}
      {showEditModal && editingCartItem && (
        <EditCartItemModal
          cartItem={editingCartItem}
          addOns={addOns}
          onClose={() => {
            setShowEditModal(false);
            setEditingCartItem(null);
          }}
          onUpdate={(modifications) =>
            updateCartItem(editingCartItem.id, modifications)
          }
        />
      )}

      {/* Checkout Success Modal */}
      <CheckoutSuccessModal
        isOpen={showSuccessModal}
        onClose={() => setShowSuccessModal(false)}
        subtotal={orderSubtotal}
        viewType="cashier"
      />
    </div>
  );
}

// Edit Cart Item Modal Component
function EditCartItemModal({ cartItem, addOns, onClose, onUpdate }) {
  const [iceLevel, setIceLevel] = useState(
    cartItem.modifications.iceLevel || "Regular"
  );
  const [sugarLevel, setSugarLevel] = useState(
    cartItem.modifications.sugarLevel || "Regular"
  );
  const [size, setSize] = useState(cartItem.modifications.size || "Regular");
  const [selectedAddOns, setSelectedAddOns] = useState(
    cartItem.modifications.addOns || []
  );

  const iceLevels = ["Hot", "No Ice", "Less Ice", "Regular", "Extra Ice"];
  const sugarLevels = ["No Sugar", "Less Sugar", "Regular", "Extra Sugar"];
  const sizes = [
    { name: "Small", priceModifier: 0 },
    { name: "Regular", priceModifier: 0.5 },
    { name: "Large", priceModifier: 1.0 },
  ];

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

  const handleUpdate = () => {
    onUpdate({
      iceLevel,
      sugarLevel,
      size,
      addOns: selectedAddOns,
    });
  };

  return (
    <div className={styles.modalOverlay} onClick={onClose}>
      <div className={styles.modalContent} onClick={(e) => e.stopPropagation()}>
        <div className={styles.modalHeader}>
          <h2 className={styles.modalTitle}>
            Edit {cartItem.product.product_name}
          </h2>
          <button onClick={onClose} className={styles.modalCloseButton}>
            ×
          </button>
        </div>

        <div className={styles.modalBody}>
          {/* Size Selection */}
          <div className={styles.modificationSection}>
            <h3 className={styles.modificationTitle}>Size</h3>
            <div className={styles.optionButtons}>
              {sizes.map((sizeOption) => {
                const basePrice = parseFloat(cartItem.product.price) || 0;
                const sizePrice = basePrice + sizeOption.priceModifier;
                return (
                  <button
                    key={sizeOption.name}
                    onClick={() => setSize(sizeOption.name)}
                    className={`${styles.optionButton} ${
                      size === sizeOption.name ? styles.optionButtonActive : ""
                    }`}
                  >
                    <div>{sizeOption.name}</div>
                    <div style={{ fontSize: "0.875rem", marginTop: "4px" }}>
                      ${sizePrice.toFixed(2)}
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

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
          <button onClick={handleUpdate} className={styles.modalAddButton}>
            Update Item
          </button>
        </div>
      </div>
    </div>
  );
}

// Modification Modal Component
function ModificationModal({ product, addOns, onClose, onAddToCart }) {
  const [iceLevel, setIceLevel] = useState("Regular");
  const [sugarLevel, setSugarLevel] = useState("Regular");
  const [size, setSize] = useState("Regular");
  const [selectedAddOns, setSelectedAddOns] = useState([]);

  const iceLevels = ["Hot", "No Ice", "Less Ice", "Regular", "Extra Ice"];
  const sugarLevels = ["No Sugar", "Less Sugar", "Regular", "Extra Sugar"];
  const sizes = [
    { name: "Small", priceModifier: 0 },
    { name: "Regular", priceModifier: 0.5 },
    { name: "Large", priceModifier: 1.0 },
  ];

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
      size,
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
          {/* Size Selection */}
          <div className={styles.modificationSection}>
            <h3 className={styles.modificationTitle}>Size</h3>
            <div className={styles.optionButtons}>
              {sizes.map((sizeOption) => {
                const basePrice = parseFloat(product.price) || 0;
                const sizePrice = basePrice + sizeOption.priceModifier;
                return (
                  <button
                    key={sizeOption.name}
                    onClick={() => setSize(sizeOption.name)}
                    className={`${styles.optionButton} ${
                      size === sizeOption.name ? styles.optionButtonActive : ""
                    }`}
                  >
                    <div>{sizeOption.name}</div>
                    <div style={{ fontSize: "0.875rem", marginTop: "4px" }}>
                      ${sizePrice.toFixed(2)}
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

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
