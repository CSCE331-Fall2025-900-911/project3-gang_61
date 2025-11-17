"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import {
  fetchProducts,
  fetchAddOns,
  submitOrder,
  fetchUsers,
  createUser,
  updateUser,
  deleteUser,
} from "@/lib/api";
import { logout } from "@/lib/auth";
import { useRequireAuth } from "@/lib/useAuth";
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

export default function CashierPage() {
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
  const [users, setUsers] = useState([]);
  const [loadingUsers, setLoadingUsers] = useState(false);

  // Verify that the user logged in through sign-in services
  useRequireAuth(router);

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

  const categorizedProducts = categorizeProducts();
  const availableCategories = Object.keys(categorizedProducts).filter(
    (cat) => categorizedProducts[cat].length > 0
  );

  // Handle product click
  const handleProductClick = (product) => {
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
        // For cashier orders: employee_id should be non-zero
        member_id: memberId,
        employee_id: employeeId || 0,
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
                  {categorizedProducts[category]?.map((product) => (
                    <div
                      key={product.product_id}
                      className={styles.productCard}
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
                    </div>
                  ))}
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
        {/* User table button */}
        <button
          onClick={handleUserTableClick}
          className={styles.userTableButton}
        >
          User Table
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

      {/* User Table Modal */}
      {showUserTable && (
        <UserTableModal
          users={users}
          loading={loadingUsers}
          onClose={() => setShowUserTable(false)}
          onRefresh={refreshUsers}
        />
      )}
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
                transition: "border-color 0.2s",
              }}
              onFocus={(e) => (e.target.style.borderColor = "#3b82f6")}
              onBlur={(e) => (e.target.style.borderColor = "#d1d1d1")}
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
                      <td style={{ padding: "12px" }}>{user.user_id}</td>
                      <td style={{ padding: "12px" }}>
                        {user.user_name || "N/A"}
                      </td>
                      <td style={{ padding: "12px" }}>{user.email}</td>
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
                      <td style={{ padding: "12px" }}>
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

// User Form Modal Component (Add/Edit)
function UserFormModal({ mode, user = null, onClose, onSuccess }) {
  const [formData, setFormData] = useState({
    user_name: user?.user_name || "",
    email: user?.email || "",
    role: user?.role || "member",
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      if (mode === "add") {
        await createUser(formData);
        alert("User created successfully!");
      } else {
        await updateUser(user.user_id, formData);
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
                  backgroundColor: "#ffffff",
                }}
              >
                <option value="member">Member</option>
                <option value="cashier">Cashier</option>
                <option value="manager">Manager</option>
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
