const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL;

/**
 * Fetch all products from the backend database
 * @returns {Promise<Array>} Array of product objects from database
 * @throws {Error} If the request fails
 */
export async function fetchProducts() {
  const response = await fetch(`${API_BASE_URL}/products`, {
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
  const response = await fetch(`${API_BASE_URL}/products?category=Add-on`, {
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

  const response = await fetch(`${API_BASE_URL}/orders`, {
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
 * Authenticate with Google Sign-In
 * @param {string} credential - Google ID token credential
 * @returns {Promise<Object>} Response containing user info and token
 * @throws {Error} If the request fails
 */
export async function authenticateWithGoogle(credential) {
  const response = await fetch(`${API_BASE_URL}/auth/google`, {
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
