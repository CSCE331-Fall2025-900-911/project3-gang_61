const rawApiUrl = process.env.NEXT_PUBLIC_API_URL;
const API_BASE_URL = rawApiUrl.replace(/\/+$/, "");

// Helper function to build API URLs safely
const buildApiUrl = (path) => {
  // Remove leading slash from path if present, then add it back
  const cleanPath = path.startsWith("/") ? path : `/${path}`;
  return `${API_BASE_URL}${cleanPath}`;
};

// Debug logging (remove in production if needed)
if (typeof window !== "undefined") {
  console.log("API_BASE_URL:", API_BASE_URL);
}

/**
 * Fetch all products from the backend database
 * @returns {Promise<Array>} Array of product objects from database
 * @throws {Error} If the request fails
 */
export async function fetchProducts() {
  const response = await fetch(buildApiUrl("/products"), {
    method: "GET",
    headers: {
      "Content-Type": "application/json",
    },
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(
      `Failed to fetch products: ${response.status} ${response.statusText} - ${errorText}`
    );
  }

  const data = await response.json();
  // Handle both array responses and object responses with products array
  return Array.isArray(data) ? data : data.products || data.data || [];
}

/**
 * Fetch add-ons (products with category "Add-on")
 * @returns {Promise<Array>} Array of add-on product objects from database
 * @throws {Error} If the request fails
 */
export async function fetchAddOns() {
  const response = await fetch(buildApiUrl("/products"), {
    method: "GET",
    headers: {
      "Content-Type": "application/json",
    },
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(
      `Failed to fetch add-ons: ${response.status} ${response.statusText} - ${errorText}`
    );
  }

  const products = await response.json();

  // Filter only products with category "Add-on"
  return Array.isArray(products)
    ? products.filter((product) => product.category === "Add-on")
    : [];
}

/**
 * Submit an order to the backend database via the orders route
 * @param {Object} orderData - The order data to submit
 * @param {Array} orderData.items - Array of order items
 * @param {number} orderData.total - Total order amount
 * @param {string} orderData.timestamp - ISO timestamp of the order
 * @param {number} orderData.member_id - Member ID (required)
 * @param {number} orderData.employee_id - Employee ID (required)
 * @returns {Promise<Object>} Response from the server containing order confirmation
 * @throws {Error} If the request fails
 */
export async function submitOrder(orderData) {
  // Ensure orderData is properly formatted for database storage
  const formattedOrderData = {
    items: orderData.items.map((item) => ({
      product_id: item.product_id,
      product_name: item.product_name,
      quantity: item.quantity,
      price: parseFloat(item.price),
      modifications: item.modifications || {},
    })),
    total: parseFloat(orderData.total),
    timestamp: orderData.timestamp || new Date().toISOString(),
    member_id:
      orderData.member_id !== undefined ? parseInt(orderData.member_id) : 0,
    employee_id:
      orderData.employee_id !== undefined ? parseInt(orderData.employee_id) : 0,
  };

  const response = await fetch(buildApiUrl("/orders"), {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(formattedOrderData),
  });

  if (!response.ok) {
    const errorText = await response.text();
    let errorMessage = `Failed to submit order: ${response.status} ${response.statusText}`;

    try {
      const errorData = JSON.parse(errorText);
      errorMessage = errorData.message || errorData.error || errorMessage;
    } catch (e) {
      errorMessage = `${errorMessage} - ${errorText}`;
    }

    throw new Error(errorMessage);
  }

  const data = await response.json();
  return data;
}

/**
 * Fetch all users
 * @returns {Promise<Array>} List of users
 */
export async function fetchUsers() {
  const response = await fetch(`${API_BASE_URL}/users`, {
    method: "GET",
    headers: {
      "Content-Type": "application/json",
    },
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.error || "Failed to fetch users");
  }

  return response.json();
}

/**
 * Create a new user
 * @param {Object} userData - User data
 * @returns {Promise<Object>} Created user
 */
export async function createUser(userData) {
  const response = await fetch(`${API_BASE_URL}/users`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(userData),
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.error || "Failed to create user");
  }

  return response.json();
}

/**
 * Update a user
 * @param {number} userId - User ID
 * @param {Object} userData - Updated user data
 * @returns {Promise<Object>} Updated user
 */
export async function updateUser(userId, userData) {
  const response = await fetch(`${API_BASE_URL}/users/${userId}`, {
    method: "PUT",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(userData),
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.error || "Failed to update user");
  }

  return response.json();
}

/**
 * Delete a user
 * @param {number} userId - User ID
 * @returns {Promise<Object>} Deletion response
 */
export async function deleteUser(userId) {
  const response = await fetch(`${API_BASE_URL}/users/${userId}`, {
    method: "DELETE",
    headers: {
      "Content-Type": "application/json",
    },
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.error || "Failed to delete user");
  }

  return response.json();
}

/**
 * Fetch orders/transactions
 * @param {number} limit - Optional limit for number of recent orders to fetch
 * @param {boolean} includeItems - Whether to include items array (default: false for faster queries)
 * @returns {Promise<Array>} Array of order objects
 * @throws {Error} If the request fails
 */
export async function fetchOrders(limit = null, includeItems = false) {
  const authToken =
    typeof window !== "undefined" ? sessionStorage.getItem("authToken") : null;

  const headers = {
    "Content-Type": "application/json",
  };

  if (authToken) {
    headers["Authorization"] = `Bearer ${authToken}`;
  }

  // Build URL with query parameters
  let url = buildApiUrl("/orders");
  const params = new URLSearchParams();
  if (limit && limit > 0) {
    params.append("limit", limit.toString());
  }
  if (!includeItems) {
    params.append("includeItems", "false");
  }
  if (params.toString()) {
    url += `?${params.toString()}`;
  }

  const response = await fetch(url, {
    method: "GET",
    headers: headers,
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(
      `Failed to fetch orders: ${response.status} ${response.statusText} - ${errorText}`
    );
  }

  const data = await response.json();
  return Array.isArray(data) ? data : [];
}

/**
 * Authenticate with Google Sign-In
 * @param {string} credential - Google ID token credential
 * @returns {Promise<Object>} Response containing user info and token
 * @throws {Error} If the request fails
 */
export async function authenticateWithGoogle(credential) {
  const response = await fetch(buildApiUrl("/auth/google"), {
    //go to auth.js and see post route for google
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ credential }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    let errorMessage = `Failed to authenticate: ${response.status} ${response.statusText}`;

    try {
      const errorData = JSON.parse(errorText);
      errorMessage = errorData.message || errorData.error || errorMessage;
    } catch (e) {
      errorMessage = `${errorMessage} - ${errorText}`;
    }

    throw new Error(errorMessage);
  }

  const data = await response.json();
  return data;
}

/**
 * Authenticate with GitHub
 * @param {string} code - GitHub authorization code
 * @returns {Promise<Object>} Authentication response
 */
export async function authenticateWithGitHub(code) {
  const response = await fetch(buildApiUrl("/auth/github"), {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ code }),
  });

  if (!response.ok) {
    const errorData = await response.json();
    throw new Error(errorData.message || "GitHub authentication failed");
  }

  return response.json();
}

// Create a new product
export async function createProduct(productData) {
  const response = await fetch(buildApiUrl("/products"), {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(productData),
  });

  if (!response.ok) {
    const errorData = await response.json();
    throw new Error(errorData.message || "Failed to create product");
  }

  return response.json();
}

// Update an existing product
export async function updateProduct(productId, productData) {
  const response = await fetch(buildApiUrl(`/products/${productId}`), {
    method: "PUT",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(productData),
  });

  if (!response.ok) {
    const errorData = await response.json();
    throw new Error(errorData.message || "Failed to update product");
  }

  return response.json();
}

// Delete a product
export async function deleteProduct(productId) {
  const response = await fetch(buildApiUrl(`/products/${productId}`), {
    method: "DELETE",
  });

  if (!response.ok) {
    const errorData = await response.json();
    throw new Error(errorData.message || "Failed to delete product");
  }

  return response.json();
}

/**
 * Fetch daily sales report
 * @returns {Promise<Array>} Array of daily sales data
 */
export async function fetchDailySales() {
  const response = await fetch(buildApiUrl("/reports/daily-sales"), {
    method: "GET",
    headers: {
      "Content-Type": "application/json",
    },
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.error || "Failed to fetch daily sales");
  }

  return response.json();
}

/**
 * Fetch lowest stock items
 * @returns {Promise<Array>} Array of products with low stock
 */
export async function fetchLowestStock() {
  const response = await fetch(buildApiUrl("/reports/lowest-stock"), {
    method: "GET",
    headers: {
      "Content-Type": "application/json",
    },
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.error || "Failed to fetch lowest stock");
  }

  return response.json();
}

/**
 * Fetch peak sales report
 * @returns {Promise<Array>} Array of peak sales data
 */
export async function fetchPeakSales() {
  const response = await fetch(buildApiUrl("/reports/peak-sales"), {
    method: "GET",
    headers: {
      "Content-Type": "application/json",
    },
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.error || "Failed to fetch peak sales");
  }

  return response.json();
}

/**
 * Fetch sales history (grouped by hour)
 * @returns {Promise<Array>} Array of hourly sales data
 */
export async function fetchSalesHistory() {
  const response = await fetch(buildApiUrl("/reports/sales-history"), {
    method: "GET",
    headers: {
      "Content-Type": "application/json",
    },
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.error || "Failed to fetch sales history");
  }

  return response.json();
}

/**
 * Fetch weekly sales report
 * @returns {Promise<Array>} Array of weekly sales data
 */
export async function fetchWeeklySales() {
  const response = await fetch(buildApiUrl("/reports/weekly-sales"), {
    method: "GET",
    headers: {
      "Content-Type": "application/json",
    },
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.error || "Failed to fetch weekly sales");
  }

  return response.json();
}

/**
 * Fetch top 50 recent orders
 * @returns {Promise<Array>} Array of recent orders
 */
export async function fetchTop50Orders() {
  const response = await fetch(buildApiUrl("/reports/top-50-orders"), {
    method: "GET",
    headers: {
      "Content-Type": "application/json",
    },
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.error || "Failed to fetch top 50 orders");
  }

  return response.json();
}

/**
 * Fetch top 5 most ordered menu items
 * @returns {Promise<Array>} Array of top menu items
 */
export async function fetchTop5MenuItems() {
  const response = await fetch(buildApiUrl("/reports/top-5-menu-items"), {
    method: "GET",
    headers: {
      "Content-Type": "application/json",
    },
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.error || "Failed to fetch top 5 menu items");
  }

  return response.json();
}

/**
 * Fetch all menu items with order counts
 * @returns {Promise<Array>} Array of all menu items with order counts
 */
export async function fetchAllMenuItems() {
  const response = await fetch(buildApiUrl("/reports/all-menu-items"), {
    method: "GET",
    headers: {
      "Content-Type": "application/json",
    },
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.error || "Failed to fetch all menu items");
  }

  return response.json();
}

/**
 * Fetch top 5 most used ingredients
 * @returns {Promise<Array>} Array of top ingredients
 */
export async function fetchTop5Ingredients() {
  const response = await fetch(buildApiUrl("/reports/top-5-ingredients"), {
    method: "GET",
    headers: {
      "Content-Type": "application/json",
    },
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.error || "Failed to fetch top 5 ingredients");
  }

  return response.json();
}

/**
 * Generate X-Report for a specific date
 * @param {string} date - Date in YYYY-MM-DD format
 * @returns {Promise<Array>} Array of hourly report data
 */
export async function generateXReport(date) {
  const response = await fetch(buildApiUrl(`/reports/x-report?date=${date}`), {
    method: "GET",
    headers: {
      "Content-Type": "application/json",
    },
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.error || "Failed to generate X-Report");
  }

  return response.json();
}
