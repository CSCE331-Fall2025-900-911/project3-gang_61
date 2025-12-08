"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import {
  fetchProducts,
  fetchAddOns,
  submitOrder,
  fetchUsers,
  createUser,
  updateUser,
  deleteUser,
  fetchOrders,
} from "@/lib/api";
import { logout } from "@/lib/auth";
import { useRequireAuth } from "@/lib/useAuth";
import AccessibilityMenu from "@/components/AccessibilityMenu";
import CheckoutSuccessModal from "@/components/CheckoutSuccessModal";
import styles from "./manager.module.css";

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

export default function ManagerPage() {
  const router = useRouter();
  const [products, setProducts] = useState([]);
  const [addOns, setAddOns] = useState([]);
  const [cart, setCart] = useState([]);
  const [showModificationModal, setShowModificationModal] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [memberId, setMemberId] = useState(0);
  const [employeeId, setEmployeeId] = useState(0);
  const [showUserTable, setShowUserTable] = useState(false);
  const [showInventoryTable, setShowInventoryTable] = useState(false);
  const [users, setUsers] = useState([]);
  const [loadingUsers, setLoadingUsers] = useState(false);
  const [transactions, setTransactions] = useState([]);
  const [loadingTransactions, setLoadingTransactions] = useState(false);
  const [transactionsError, setTransactionsError] = useState(null);
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [orderSubtotal, setOrderSubtotal] = useState(0);

  // Verify that the user logged in through sign-in services
  //  verify user is a manager
  //useRequireAuth(router);

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

  // Function to load recent transactions (can be called from multiple places)
  const loadTransactions = useCallback(async (showLoading = true) => {
    try {
      if (showLoading) {
        setLoadingTransactions(true);
      }
      setTransactionsError(null);

      // Fetch only the 20 most recent orders directly from the API
      const ordersData = await fetchOrders(20);
      setTransactions(ordersData);
    } catch (err) {
      console.error("Failed to load transactions:", err);
      setTransactionsError(err.message || "Failed to load transactions");
      setTransactions([]);
    } finally {
      if (showLoading) {
        setLoadingTransactions(false);
      }
    }
  }, []);

  // Load recent transactions on page load
  // Show cached data immediately if available, then refresh in background
  useEffect(() => {
    loadTransactions(true, true);
  }, [loadTransactions]);

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

      // Refresh transactions and products to update stock
      loadTransactions();
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

  // Handle user table button click
  const handleUserTableClick = async () => {
    setShowUserTable(true);
    await refreshUsers();
  };

  // Refresh users list
  const refreshUsers = async () => {
    setLoadingUsers(true);
    try {
      const usersData = await fetchUsers();
      setUsers(usersData);
    } catch (err) {
      console.error("Error fetching users:", err);
      alert("Failed to load users. Please try again later.");
    } finally {
      setLoadingUsers(false);
    }
  };

  // Handle inventory table button click
  const handleInventoryTableClick = async () => {
    setShowInventoryTable(true);
    await refreshProducts();
  };

  // Refresh products list
  const refreshProducts = async () => {
    setLoading(true);
    try {
      const productsData = await fetchProducts();
      setProducts(productsData);
    } catch (err) {
      console.error("Error fetching products:", err);
      alert("Failed to load products. Please try again later.");
    } finally {
      setLoading(false);
    }
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

  // Calculate total for each transaction
  const calculateTransactionTotal = (transaction) => {
    // If total is already calculated on backend, use it
    if (transaction.total !== undefined) {
      return parseFloat(transaction.total) || 0;
    }
    // Fallback to calculating from items if available
    if (transaction.items && Array.isArray(transaction.items)) {
      return transaction.items.reduce(
        (sum, item) => sum + (parseFloat(item.price) || 0),
        0
      );
    }
    return 0;
  };

  // Format date for display
  const formatTransactionDate = (dateString) => {
    if (!dateString) return "N/A";
    try {
      const date = new Date(dateString);
      return date.toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      });
    } catch (e) {
      return dateString;
    }
  };

  return (
    <div className={styles.managerContainer}>
      <div className={styles.managerLayout}>
        {/* Recent Transactions Sidebar */}
        <div className={styles.transactionsSidebar}>
          <h2 className={styles.sidebarTitle}>Recent Transactions</h2>
          <div className={styles.transactionsList}>
            {loadingTransactions ? (
              <div className={styles.loadingTransactions}>Loading...</div>
            ) : transactionsError ? (
              <div className={styles.transactionsError}>
                {transactionsError}
              </div>
            ) : transactions.length === 0 ? (
              <div className={styles.emptyTransactions}>
                No transactions yet
              </div>
            ) : (
              transactions.map((transaction) => (
                <div
                  key={transaction.order_id}
                  className={styles.transactionItem}
                >
                  <div className={styles.transactionHeader}>
                    <div className={styles.transactionId}>
                      Order #{transaction.order_id}
                    </div>
                    <div className={styles.transactionDate}>
                      {formatTransactionDate(transaction.order_time)}
                    </div>
                  </div>
                  <div className={styles.transactionDetails}>
                    <div className={styles.transactionStatus}>
                      Status:{" "}
                      <span className={styles.statusBadge}>
                        {transaction.order_status || "Completed"}
                      </span>
                    </div>
                    <div className={styles.transactionTotal}>
                      ${calculateTransactionTotal(transaction).toFixed(2)}
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

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
                          const basePrice = parseFloat(item.product.price) || 0;
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
          <div className={styles.divider}></div>
          <div className={styles.managerActions}>
            <button
              onClick={handleUserTableClick}
              className={styles.userTableButton}
              title="Manage Users"
            >
              Users Table
            </button>
            <button
              onClick={handleInventoryTableClick}
              className={styles.inventoryTableButton}
              title="Manage Inventory"
            >
              Inventory Table
            </button>
            <button
              onClick={() => router.push("/manager/reports")}
              className={styles.reportsButton}
              title="View Reports"
            >
              Reports
            </button>
          </div>
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

      {/* User Table Modal */}
      {showUserTable && (
        <UserTableModal
          users={users}
          loading={loadingUsers}
          onClose={() => setShowUserTable(false)}
          onRefresh={refreshUsers}
        />
      )}

      {/* Inventory Table Modal */}
      {showInventoryTable && (
        <InventoryTableModal
          products={products}
          loading={loading}
          onClose={() => setShowInventoryTable(false)}
          onRefresh={refreshProducts}
        />
      )}

      {/* Checkout Success Modal */}
      <CheckoutSuccessModal
        isOpen={showSuccessModal}
        onClose={() => setShowSuccessModal(false)}
        subtotal={orderSubtotal}
        viewType="manager"
      />
    </div>
  );
}

// User Table Modal Component
function UserTableModal({ users, loading, onClose, onRefresh }) {
  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [selectedUser, setSelectedUser] = useState(null);
  const [searchQuery, setSearchQuery] = useState("");

  const formatDate = (dateString) => {
    if (!dateString) return "N/A";
    try {
      const date = new Date(dateString);
      return date.toLocaleDateString("en-US", {
        year: "numeric",
        month: "short",
        day: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      });
    } catch (e) {
      return dateString;
    }
  };

  // Filter users based on search query (name, email, or ID)
  const filteredUsers = users.filter((user) => {
    if (!searchQuery.trim()) return true;
    const query = searchQuery.toLowerCase().trim();
    const userId = String(user.user_id || "").toLowerCase();
    const userName = (user.user_name || "").toLowerCase();
    const userEmail = (user.email || "").toLowerCase();
    return (
      userId.includes(query) ||
      userName.includes(query) ||
      userEmail.includes(query)
    );
  });

  const handleEdit = (user) => {
    setSelectedUser(user);
    setShowEditModal(true);
  };

  const handleDelete = async (userId) => {
    if (!window.confirm("Are you sure you want to delete this user?")) {
      return;
    }

    try {
      await deleteUser(userId);
      alert("User deleted successfully");
      onRefresh();
    } catch (err) {
      alert(err.message || "Failed to delete user");
    }
  };

  return (
    <div className={styles.modalOverlay} onClick={onClose}>
      <div
        className={styles.modalContent}
        onClick={(e) => e.stopPropagation()}
        style={{ maxWidth: "900px", width: "90%", maxHeight: "80vh" }}
      >
        <div className={styles.modalHeader}>
          <h2 className={styles.modalTitle}>User Table</h2>
          <button onClick={onClose} className={styles.modalCloseButton}>
            ×
          </button>
        </div>

        <div className={styles.modalBody} style={{ padding: "20px" }}>
          {/* Add User Button and Search Bar */}
          <div
            style={{
              display: "flex",
              gap: "12px",
              marginBottom: "16px",
              alignItems: "center",
            }}
          >
            <button
              onClick={() => setShowAddModal(true)}
              style={{
                padding: "10px 20px",
                backgroundColor: "#10b981",
                color: "#ffffff",
                border: "none",
                borderRadius: "8px",
                fontSize: "14px",
                fontWeight: 500,
                cursor: "pointer",
                transition: "background-color 0.2s",
                whiteSpace: "nowrap",
              }}
              onMouseOver={(e) => (e.target.style.backgroundColor = "#059669")}
              onMouseOut={(e) => (e.target.style.backgroundColor = "#10b981")}
            >
              + Add User
            </button>
            <input
              type="text"
              placeholder="Search by name, email, or ID..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              style={{
                flex: 1,
                padding: "10px 16px",
                border: "1px solid #d1d1d1",
                borderRadius: "8px",
                fontSize: "14px",
                outline: "none",
                transition: "border-color 0.2s, background-color 0.2s",
                backgroundColor: "#f5f5f5",
              }}
              onFocus={(e) => {
                e.target.style.borderColor = "#3b82f6";
                e.target.style.backgroundColor = "#ffffff";
              }}
              onBlur={(e) => {
                e.target.style.borderColor = "#d1d1d1";
                e.target.style.backgroundColor = "#f5f5f5";
              }}
            />
          </div>

          {loading ? (
            <div style={{ textAlign: "center", padding: "40px" }}>
              Loading users...
            </div>
          ) : users.length === 0 ? (
            <div style={{ textAlign: "center", padding: "40px" }}>
              No users found
            </div>
          ) : filteredUsers.length === 0 ? (
            <div style={{ textAlign: "center", padding: "40px" }}>
              No users match your search
            </div>
          ) : (
            <div
              style={{
                overflowX: "auto",
                overflowY: "auto",
                maxHeight: "60vh",
              }}
            >
              <table
                style={{
                  width: "100%",
                  borderCollapse: "collapse",
                  fontSize: "14px",
                }}
              >
                <thead>
                  <tr style={{ borderBottom: "2px solid #e5e5e5" }}>
                    <th
                      style={{
                        padding: "12px",
                        textAlign: "left",
                        fontWeight: 600,
                        color: "#333",
                      }}
                    >
                      ID
                    </th>
                    <th
                      style={{
                        padding: "12px",
                        textAlign: "left",
                        fontWeight: 600,
                        color: "#333",
                      }}
                    >
                      Name
                    </th>
                    <th
                      style={{
                        padding: "12px",
                        textAlign: "left",
                        fontWeight: 600,
                        color: "#333",
                      }}
                    >
                      Email
                    </th>
                    <th
                      style={{
                        padding: "12px",
                        textAlign: "left",
                        fontWeight: 600,
                        color: "#333",
                      }}
                    >
                      Role
                    </th>
                    <th
                      style={{
                        padding: "12px",
                        textAlign: "left",
                        fontWeight: 600,
                        color: "#333",
                      }}
                    >
                      Created At
                    </th>
                    <th
                      style={{
                        padding: "12px",
                        textAlign: "left",
                        fontWeight: 600,
                        color: "#333",
                      }}
                    >
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {filteredUsers.map((user, index) => (
                    <tr
                      key={user.user_id}
                      style={{
                        borderBottom: "1px solid #f0f0f0",
                        backgroundColor:
                          index % 2 === 0 ? "#ffffff" : "#fafafa",
                      }}
                    >
                      <td style={{ padding: "12px", color: "#1a1a1a" }}>
                        {user.user_id}
                      </td>
                      <td style={{ padding: "12px", color: "#1a1a1a" }}>
                        {user.user_name || "N/A"}
                      </td>
                      <td style={{ padding: "12px", color: "#1a1a1a" }}>
                        {user.email}
                      </td>
                      <td style={{ padding: "12px" }}>
                        <span
                          style={{
                            padding: "4px 8px",
                            borderRadius: "4px",
                            backgroundColor:
                              user.role === "manager"
                                ? "#fee2e2"
                                : user.role === "cashier"
                                ? "#CEF5CF"
                                : user.role == "member"
                                ? "#e0e7ff"
                                : "#40e7ff",
                            color:
                              user.role === "manager"
                                ? "#991b1b"
                                : user.role === "cashier"
                                ? "#3CA63E"
                                : user.role === "member"
                                ? "#3730a3"
                                : "#4560a3",
                            fontWeight: 500,
                            textTransform: "capitalize",
                          }}
                        >
                          {user.role || "guest"}
                        </span>
                      </td>
                      <td style={{ padding: "12px", color: "#1a1a1a" }}>
                        {formatDate(user.created_at)}
                      </td>
                      <td style={{ padding: "12px" }}>
                        <div
                          style={{
                            display: "flex",
                            gap: "8px",
                          }}
                        >
                          <button
                            onClick={() => handleEdit(user)}
                            style={{
                              padding: "6px 12px",
                              backgroundColor: "#3b82f6",
                              color: "#ffffff",
                              border: "none",
                              borderRadius: "6px",
                              fontSize: "12px",
                              cursor: "pointer",
                              transition: "background-color 0.2s",
                            }}
                            onMouseOver={(e) =>
                              (e.target.style.backgroundColor = "#2563eb")
                            }
                            onMouseOut={(e) =>
                              (e.target.style.backgroundColor = "#3b82f6")
                            }
                          >
                            Edit
                          </button>
                          <button
                            onClick={() => handleDelete(user.user_id)}
                            style={{
                              padding: "6px 12px",
                              backgroundColor: "#ef4444",
                              color: "#ffffff",
                              border: "none",
                              borderRadius: "6px",
                              fontSize: "12px",
                              cursor: "pointer",
                              transition: "background-color 0.2s",
                            }}
                            onMouseOver={(e) =>
                              (e.target.style.backgroundColor = "#dc2626")
                            }
                            onMouseOut={(e) =>
                              (e.target.style.backgroundColor = "#ef4444")
                            }
                          >
                            Delete
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        <div className={styles.modalFooter}>
          <button onClick={onClose} className={styles.modalCancelButton}>
            Close
          </button>
        </div>
      </div>

      {/* Add User Modal */}
      {showAddModal && (
        <UserFormModal
          mode="add"
          onClose={() => setShowAddModal(false)}
          onSuccess={() => {
            setShowAddModal(false);
            onRefresh();
          }}
        />
      )}

      {/* Edit User Modal */}
      {showEditModal && selectedUser && (
        <UserFormModal
          mode="edit"
          user={selectedUser}
          onClose={() => {
            setShowEditModal(false);
            setSelectedUser(null);
          }}
          onSuccess={() => {
            setShowEditModal(false);
            setSelectedUser(null);
            onRefresh();
          }}
        />
      )}
    </div>
  );
}

// Inventory Table Modal Component
function InventoryTableModal({ products, loading, onClose, onRefresh }) {
  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [searchQuery, setSearchQuery] = useState("");

  // Filter products based on search query (name, category, or ID)
  const filteredProducts = products.filter((product) => {
    if (!searchQuery.trim()) return true;
    const query = searchQuery.toLowerCase().trim();
    const productId = String(product.product_id || "").toLowerCase();
    const productName = (product.product_name || "").toLowerCase();
    const category = (product.category || "").toLowerCase();
    return (
      productId.includes(query) ||
      productName.includes(query) ||
      category.includes(query)
    );
  });

  const handleEdit = (product) => {
    setSelectedProduct(product);
    setShowEditModal(true);
  };

  const handleDelete = async (productId) => {
    if (!window.confirm("Are you sure you want to delete this product?")) {
      return;
    }

    try {
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/products/${productId}`,
        {
          method: "DELETE",
        }
      );

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || "Failed to delete product");
      }

      alert("Product deleted successfully");
      onRefresh();
    } catch (err) {
      alert(err.message || "Failed to delete product");
    }
  };

  return (
    <div className={styles.modalOverlay} onClick={onClose}>
      <div
        className={styles.modalContent}
        onClick={(e) => e.stopPropagation()}
        style={{
          maxWidth: "1000px",
          width: "90%",
          height: "80vh",
          display: "flex",
          flexDirection: "column",
          overflow: "hidden",
        }}
      >
        <div className={styles.modalHeader}>
          <h2 className={styles.modalTitle}>Inventory Table</h2>
          <button onClick={onClose} className={styles.modalCloseButton}>
            ×
          </button>
        </div>

        <div
          className={styles.modalBody}
          style={{
            padding: "20px",
            flex: 1,
            overflow: "auto",
            display: "flex",
            flexDirection: "column",
          }}
        >
          {/* Add Product Button and Search Bar */}
          <div
            style={{
              display: "flex",
              gap: "12px",
              marginBottom: "16px",
              alignItems: "center",
              flexShrink: 0,
            }}
          >
            <button
              onClick={() => setShowAddModal(true)}
              style={{
                padding: "10px 20px",
                backgroundColor: "#10b981",
                color: "#ffffff",
                border: "none",
                borderRadius: "8px",
                fontSize: "14px",
                fontWeight: 500,
                cursor: "pointer",
                transition: "background-color 0.2s",
                whiteSpace: "nowrap",
              }}
              onMouseOver={(e) => (e.target.style.backgroundColor = "#059669")}
              onMouseOut={(e) => (e.target.style.backgroundColor = "#10b981")}
            >
              + Add Product
            </button>
            <input
              type="text"
              placeholder="Search by name, category, or ID..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              style={{
                flex: 1,
                padding: "10px 16px",
                border: "1px solid #d1d1d1",
                borderRadius: "8px",
                fontSize: "14px",
                outline: "none",
                transition: "border-color 0.2s, background-color 0.2s",
                backgroundColor: "#f5f5f5",
              }}
              onFocus={(e) => {
                e.target.style.borderColor = "#3b82f6";
                e.target.style.backgroundColor = "#ffffff";
              }}
              onBlur={(e) => {
                e.target.style.borderColor = "#d1d1d1";
                e.target.style.backgroundColor = "#f5f5f5";
              }}
            />
          </div>

          {loading ? (
            <div
              style={{ textAlign: "center", padding: "40px", flexShrink: 0 }}
            >
              Loading products...
            </div>
          ) : products.length === 0 ? (
            <div
              style={{ textAlign: "center", padding: "40px", flexShrink: 0 }}
            >
              No products found
            </div>
          ) : filteredProducts.length === 0 ? (
            <div
              style={{ textAlign: "center", padding: "40px", flexShrink: 0 }}
            >
              No products match your search
            </div>
          ) : (
            <div
              style={{
                flex: 1,
                overflow: "auto",
                border: "1px solid #e5e5e5",
                borderRadius: "8px",
              }}
            >
              <table
                style={{
                  width: "100%",
                  borderCollapse: "collapse",
                  fontSize: "14px",
                }}
              >
                <thead
                  style={{
                    position: "sticky",
                    top: 0,
                    backgroundColor: "#ffffff",
                    zIndex: 1,
                  }}
                >
                  <tr style={{ borderBottom: "2px solid #e5e5e5" }}>
                    <th
                      style={{
                        padding: "12px",
                        textAlign: "left",
                        fontWeight: 600,
                        color: "#333",
                      }}
                    >
                      ID
                    </th>
                    <th
                      style={{
                        padding: "12px",
                        textAlign: "left",
                        fontWeight: 600,
                        color: "#333",
                      }}
                    >
                      Name
                    </th>
                    <th
                      style={{
                        padding: "12px",
                        textAlign: "left",
                        fontWeight: 600,
                        color: "#333",
                      }}
                    >
                      Category
                    </th>
                    <th
                      style={{
                        padding: "12px",
                        textAlign: "right",
                        fontWeight: 600,
                        color: "#333",
                      }}
                    >
                      Price
                    </th>
                    <th
                      style={{
                        padding: "12px",
                        textAlign: "right",
                        fontWeight: 600,
                        color: "#333",
                      }}
                    >
                      Stock
                    </th>
                    <th
                      style={{
                        padding: "12px",
                        textAlign: "left",
                        fontWeight: 600,
                        color: "#333",
                      }}
                    >
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {filteredProducts.map((product, index) => (
                    <tr
                      key={product.product_id}
                      style={{
                        borderBottom: "1px solid #f0f0f0",
                        backgroundColor:
                          index % 2 === 0 ? "#ffffff" : "#fafafa",
                      }}
                    >
                      <td style={{ padding: "12px", color: "#1a1a1a" }}>
                        {product.product_id}
                      </td>
                      <td style={{ padding: "12px", color: "#1a1a1a" }}>
                        {product.product_name || "N/A"}
                      </td>
                      <td style={{ padding: "12px" }}>
                        <span
                          style={{
                            padding: "4px 8px",
                            borderRadius: "4px",
                            backgroundColor:
                              product.category === "Milk Drink"
                                ? "#e0e7ff"
                                : product.category === "Fruit Drink"
                                ? "#fef3c7"
                                : product.category === "Seasonal"
                                ? "#fee2e2"
                                : product.category === "Side"
                                ? "#d1fae5"
                                : "#f3f4f6",
                            color:
                              product.category === "Milk Drink"
                                ? "#3730a3"
                                : product.category === "Fruit Drink"
                                ? "#92400e"
                                : product.category === "Seasonal"
                                ? "#991b1b"
                                : product.category === "Side"
                                ? "#065f46"
                                : "#374151",
                            fontWeight: 500,
                          }}
                        >
                          {product.category || "N/A"}
                        </span>
                      </td>
                      <td
                        style={{
                          padding: "12px",
                          textAlign: "right",
                          color: "#1a1a1a",
                        }}
                      >
                        ${parseFloat(product.price).toFixed(2)}
                      </td>
                      <td
                        style={{
                          padding: "12px",
                          textAlign: "right",
                          color: "#1a1a1a",
                        }}
                      >
                        <span
                          style={{
                            color: product.stock < 10 ? "#ef4444" : "#10b981",
                            fontWeight: product.stock < 10 ? 600 : 400,
                          }}
                        >
                          {product.stock !== undefined ? product.stock : "N/A"}
                        </span>
                      </td>
                      <td style={{ padding: "12px" }}>
                        <div
                          style={{
                            display: "flex",
                            gap: "8px",
                          }}
                        >
                          <button
                            onClick={() => handleEdit(product)}
                            style={{
                              padding: "6px 12px",
                              backgroundColor: "#3b82f6",
                              color: "#ffffff",
                              border: "none",
                              borderRadius: "6px",
                              fontSize: "12px",
                              cursor: "pointer",
                              transition: "background-color 0.2s",
                            }}
                            onMouseOver={(e) =>
                              (e.target.style.backgroundColor = "#2563eb")
                            }
                            onMouseOut={(e) =>
                              (e.target.style.backgroundColor = "#3b82f6")
                            }
                          >
                            Edit
                          </button>
                          <button
                            onClick={() => handleDelete(product.product_id)}
                            style={{
                              padding: "6px 12px",
                              backgroundColor: "#ef4444",
                              color: "#ffffff",
                              border: "none",
                              borderRadius: "6px",
                              fontSize: "12px",
                              cursor: "pointer",
                              transition: "background-color 0.2s",
                            }}
                            onMouseOver={(e) =>
                              (e.target.style.backgroundColor = "#dc2626")
                            }
                            onMouseOut={(e) =>
                              (e.target.style.backgroundColor = "#ef4444")
                            }
                          >
                            Delete
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        <div className={styles.modalFooter} style={{ flexShrink: 0 }}>
          <button onClick={onClose} className={styles.modalCancelButton}>
            Close
          </button>
        </div>
      </div>

      {/* Add Product Modal */}
      {showAddModal && (
        <ProductFormModal
          mode="add"
          onClose={() => setShowAddModal(false)}
          onSuccess={() => {
            setShowAddModal(false);
            onRefresh();
          }}
        />
      )}

      {/* Edit Product Modal */}
      {showEditModal && selectedProduct && (
        <ProductFormModal
          mode="edit"
          product={selectedProduct}
          onClose={() => {
            setShowEditModal(false);
            setSelectedProduct(null);
          }}
          onSuccess={() => {
            setShowEditModal(false);
            setSelectedProduct(null);
            onRefresh();
          }}
        />
      )}
    </div>
  );
}

// User Form Modal Component (Add/Edit)
function UserFormModal({ mode, user = null, onClose, onSuccess }) {
  const [formData, setFormData] = useState({
    user_name: user?.user_name || "",
    email: user?.email || "",
    role: user?.role || "member",
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const roles = ["manager", "cashier", "member"];

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      if (mode === "add") {
        await createUser({
          user_name: formData.user_name || null,
          email: formData.email,
          role: formData.role,
        });
        alert("User created successfully!");
      } else {
        await updateUser(user.user_id, {
          user_name: formData.user_name || null,
          email: formData.email,
          role: formData.role,
        });
        alert("User updated successfully!");
      }
      onSuccess();
    } catch (err) {
      setError(err.message || "Operation failed");
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  return (
    <div className={styles.modalOverlay} onClick={onClose}>
      <div
        className={styles.modalContent}
        onClick={(e) => e.stopPropagation()}
        style={{ maxWidth: "500px", width: "90%" }}
      >
        <div className={styles.modalHeader}>
          <h2 className={styles.modalTitle}>
            {mode === "add" ? "Add User" : "Edit User"}
          </h2>
          <button onClick={onClose} className={styles.modalCloseButton}>
            ×
          </button>
        </div>

        <div className={styles.modalBody} style={{ padding: "20px" }}>
          {error && (
            <div
              style={{
                padding: "12px",
                backgroundColor: "#fee2e2",
                color: "#991b1b",
                borderRadius: "6px",
                marginBottom: "16px",
                fontSize: "14px",
              }}
            >
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit}>
            <div style={{ marginBottom: "16px" }}>
              <label
                style={{
                  display: "block",
                  marginBottom: "6px",
                  fontWeight: 500,
                  fontSize: "14px",
                  color: "#333",
                }}
              >
                Name (Optional)
              </label>
              <input
                type="text"
                name="user_name"
                value={formData.user_name}
                onChange={handleChange}
                style={{
                  width: "100%",
                  padding: "10px",
                  border: "1px solid #d1d1d1",
                  borderRadius: "6px",
                  fontSize: "14px",
                  backgroundColor: "#f5f5f5",
                  color: "#1a1a1a",
                }}
              />
            </div>

            <div style={{ marginBottom: "16px" }}>
              <label
                style={{
                  display: "block",
                  marginBottom: "6px",
                  fontWeight: 500,
                  fontSize: "14px",
                  color: "#333",
                }}
              >
                Email <span style={{ color: "#ef4444" }}>*</span>
              </label>
              <input
                type="email"
                name="email"
                value={formData.email}
                onChange={handleChange}
                required
                style={{
                  width: "100%",
                  padding: "10px",
                  border: "1px solid #d1d1d1",
                  borderRadius: "6px",
                  fontSize: "14px",
                  backgroundColor: "#f5f5f5",
                  color: "#1a1a1a",
                }}
              />
            </div>

            <div style={{ marginBottom: "20px" }}>
              <label
                style={{
                  display: "block",
                  marginBottom: "6px",
                  fontWeight: 500,
                  fontSize: "14px",
                  color: "#333",
                }}
              >
                Role <span style={{ color: "#ef4444" }}>*</span>
              </label>
              <select
                name="role"
                value={formData.role}
                onChange={handleChange}
                required
                style={{
                  width: "100%",
                  padding: "10px",
                  border: "1px solid #d1d1d1",
                  borderRadius: "6px",
                  fontSize: "14px",
                  backgroundColor: "#f5f5f5",
                  color: "#1a1a1a",
                  cursor: "pointer",
                  textTransform: "capitalize",
                }}
              >
                {roles.map((role) => (
                  <option key={role} value={role}>
                    {role.charAt(0).toUpperCase() + role.slice(1)}
                  </option>
                ))}
              </select>
            </div>

            <div className={styles.modalFooter}>
              <button
                type="button"
                onClick={onClose}
                className={styles.modalCancelButton}
                disabled={loading}
              >
                Cancel
              </button>
              <button
                type="submit"
                className={styles.modalAddButton}
                disabled={loading}
              >
                {loading
                  ? "Processing..."
                  : mode === "add"
                  ? "Create User"
                  : "Update User"}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}

// Product Form Modal Component (Add/Edit)
function ProductFormModal({ mode, product = null, onClose, onSuccess }) {
  const [formData, setFormData] = useState({
    product_name: product?.product_name || "",
    category: product?.category || "Milk Drink",
    price: product?.price || "",
    stock: product?.stock !== undefined ? product.stock : "",
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const categories = [
    "Milk Drink",
    "Fruit Drink",
    "Seasonal",
    "Side",
    "Add-on",
    "Supply",
    "Merchandise",
  ];

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const url =
        mode === "add"
          ? `${process.env.NEXT_PUBLIC_API_URL}/products`
          : `${process.env.NEXT_PUBLIC_API_URL}/products/${product.product_id}`;

      const method = mode === "add" ? "POST" : "PUT";

      const response = await fetch(url, {
        method,
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          ...formData,
          price: parseFloat(formData.price),
          stock: formData.stock !== "" ? parseInt(formData.stock) : null,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || "Operation failed");
      }

      alert(
        mode === "add"
          ? "Product created successfully!"
          : "Product updated successfully!"
      );
      onSuccess();
    } catch (err) {
      setError(err.message || "Operation failed");
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  return (
    <div className={styles.modalOverlay} onClick={onClose}>
      <div
        className={styles.modalContent}
        onClick={(e) => e.stopPropagation()}
        style={{ maxWidth: "500px", width: "90%" }}
      >
        <div className={styles.modalHeader}>
          <h2 className={styles.modalTitle}>
            {mode === "add" ? "Add Product" : "Edit Product"}
          </h2>
          <button onClick={onClose} className={styles.modalCloseButton}>
            ×
          </button>
        </div>

        <div className={styles.modalBody} style={{ padding: "20px" }}>
          {error && (
            <div
              style={{
                padding: "12px",
                backgroundColor: "#fee2e2",
                color: "#991b1b",
                borderRadius: "6px",
                marginBottom: "16px",
                fontSize: "14px",
              }}
            >
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit}>
            <div style={{ marginBottom: "16px" }}>
              <label
                style={{
                  display: "block",
                  marginBottom: "6px",
                  fontWeight: 500,
                  fontSize: "14px",
                  color: "#333",
                }}
              >
                Product Name <span style={{ color: "#ef4444" }}>*</span>
              </label>
              <input
                type="text"
                name="product_name"
                value={formData.product_name}
                onChange={handleChange}
                required
                style={{
                  width: "100%",
                  padding: "10px",
                  border: "1px solid #d1d1d1",
                  borderRadius: "6px",
                  fontSize: "14px",
                  backgroundColor: "#f5f5f5",
                  color: "#1a1a1a",
                }}
              />
            </div>

            <div style={{ marginBottom: "16px" }}>
              <label
                style={{
                  display: "block",
                  marginBottom: "6px",
                  fontWeight: 500,
                  fontSize: "14px",
                  color: "#333",
                }}
              >
                Category <span style={{ color: "#ef4444" }}>*</span>
              </label>
              <select
                name="category"
                value={formData.category}
                onChange={handleChange}
                required
                style={{
                  width: "100%",
                  padding: "10px",
                  border: "1px solid #d1d1d1",
                  borderRadius: "6px",
                  fontSize: "14px",
                  backgroundColor: "#f5f5f5",
                  color: "#1a1a1a",
                  cursor: "pointer",
                }}
              >
                {categories.map((cat) => (
                  <option key={cat} value={cat}>
                    {cat}
                  </option>
                ))}
              </select>
            </div>

            <div style={{ marginBottom: "16px" }}>
              <label
                style={{
                  display: "block",
                  marginBottom: "6px",
                  fontWeight: 500,
                  fontSize: "14px",
                  color: "#333",
                }}
              >
                Price <span style={{ color: "#ef4444" }}>*</span>
              </label>
              <input
                type="number"
                name="price"
                value={formData.price}
                onChange={handleChange}
                required
                min="0"
                step="0.01"
                style={{
                  width: "100%",
                  padding: "10px",
                  border: "1px solid #d1d1d1",
                  borderRadius: "6px",
                  fontSize: "14px",
                  backgroundColor: "#f5f5f5",
                  color: "#1a1a1a",
                }}
              />
            </div>

            <div style={{ marginBottom: "20px" }}>
              <label
                style={{
                  display: "block",
                  marginBottom: "6px",
                  fontWeight: 500,
                  fontSize: "14px",
                  color: "#333",
                }}
              >
                Stock (Optional)
              </label>
              <input
                type="number"
                name="stock"
                value={formData.stock}
                onChange={handleChange}
                min="0"
                step="1"
                style={{
                  width: "100%",
                  padding: "10px",
                  border: "1px solid #d1d1d1",
                  borderRadius: "6px",
                  fontSize: "14px",
                  backgroundColor: "#f5f5f5",
                  color: "#1a1a1a",
                }}
              />
            </div>

            <div className={styles.modalFooter}>
              <button
                type="button"
                onClick={onClose}
                className={styles.modalCancelButton}
                disabled={loading}
              >
                Cancel
              </button>
              <button
                type="submit"
                className={styles.modalAddButton}
                disabled={loading}
              >
                {loading
                  ? "Processing..."
                  : mode === "add"
                  ? "Create Product"
                  : "Update Product"}
              </button>
            </div>
          </form>
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
