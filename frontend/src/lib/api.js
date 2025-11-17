// Normalize API_BASE_URL - remove trailing slashes to prevent double slashes in URLs
const rawApiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';
const API_BASE_URL = rawApiUrl.replace(/\/+$/, '');

// Helper function to build API URLs safely
const buildApiUrl = (path) => {
  // Remove leading slash from path if present, then add it back
  const cleanPath = path.startsWith('/') ? path : `/${path}`;
  return `${API_BASE_URL}${cleanPath}`;
};

// Debug logging (remove in production if needed)
if (typeof window !== 'undefined') {
  console.log('API_BASE_URL:', API_BASE_URL);
}

/**
 * Fetch all products from the backend database
 * @returns {Promise<Array>} Array of product objects from database
 * @throws {Error} If the request fails
 */
export async function fetchProducts() {
  const response = await fetch(buildApiUrl('/products'), {
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
 * Fetch all add-ons from the backend database
 * @returns {Promise<Array>} Array of add-on product objects from database
 * @throws {Error} If the request fails
 */
export async function fetchAddOns() {
  const response = await fetch(buildApiUrl('/products?category=Add-on'), {
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

  const data = await response.json();
  // Handle both array responses and object responses with products array
  return Array.isArray(data) ? data : data.products || data.data || [];
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

  const response = await fetch(buildApiUrl('/orders'), {
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
 * Authenticate with Google Sign-In
 * @param {string} credential - Google ID token credential
 * @returns {Promise<Object>} Response containing user info and token
 * @throws {Error} If the request fails
 */
export async function authenticateWithGoogle(credential) {
  const response = await fetch(buildApiUrl('/auth/google'), {
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
