// API utility functions for backend communication
const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api';

// Mock data fallback (based on your database structure)
const MOCK_PRODUCTS = [
  { product_id: 1, product_name: "Classic Milk Tea", category: "Drink", price: 4.50, cost: 2.00, stock: 50 },
  { product_id: 2, product_name: "Taro Milk Tea", category: "Drink", price: 4.75, cost: 2.25, stock: 45 },
  { product_id: 3, product_name: "Matcha Milk Tea", category: "Drink", price: 5.00, cost: 2.50, stock: 40 },
  { product_id: 4, product_name: "Wintermelon Tea", category: "Drink", price: 4.25, cost: 1.75, stock: 3 },
  { product_id: 5, product_name: "Thai Tea", category: "Drink", price: 4.75, cost: 2.00, stock: 35 },
  { product_id: 6, product_name: "Strawberry Green Tea", category: "Drink", price: 4.50, cost: 2.00, stock: 30 },
  { product_id: 7, product_name: "Honey Lemonade", category: "Drink", price: 4.00, cost: 1.50, stock: 25 },
  { product_id: 8, product_name: "Passionfruit Tea", category: "Drink", price: 4.25, cost: 1.75, stock: 20 },
  { product_id: 9, product_name: "Brown Sugar Milk Tea", category: "Drink", price: 5.25, cost: 2.75, stock: 55 },
  { product_id: 10, product_name: "Boba (Add-on)", category: "Add-on", price: 0.75, cost: 0.25, stock: 500 },
  { product_id: 11, product_name: "Mango Boba (Add-on)", category: "Add-on", price: 0.75, cost: 0.25, stock: 400 },
  { product_id: 12, product_name: "Lychee Jelly (Add-on)", category: "Add-on", price: 0.75, cost: 0.30, stock: 300 },
  { product_id: 13, product_name: "Aloe Vera (Add-on)", category: "Add-on", price: 0.75, cost: 0.30, stock: 250 },
  { product_id: 14, product_name: "Red Bean (Add-on)", category: "Add-on", price: 0.75, cost: 0.20, stock: 200 },
  { product_id: 15, product_name: "Boba (Bowl)", category: "Side", price: 2.00, cost: 0.75, stock: 100 },
  { product_id: 16, product_name: "Mango Boba (Bowl)", category: "Side", price: 2.00, cost: 0.75, stock: 80 },
  { product_id: 24, product_name: "Pumpkin Tea", category: "Drink", price: 10.00, cost: 5.00, stock: 15 },
  { product_id: 25, product_name: "Pumpkin Boba", category: "Add-on", price: 2.00, cost: 1.00, stock: 50 },
];

const MOCK_ADDONS = MOCK_PRODUCTS.filter(p => p.category === "Add-on");

/**
 * Fetch all products from the backend (with mock data fallback)
 * @returns {Promise<Array>} Array of product objects
 */
export async function fetchProducts() {
  try {
    const response = await fetch(`${API_BASE_URL}/products`);
    if (!response.ok) {
      throw new Error('Failed to fetch products');
    }
    const data = await response.json();
    return data;
  } catch (error) {
    console.warn('Backend not available, using mock data:', error.message);
    // Return mock data as fallback
    return MOCK_PRODUCTS;
  }
}

/**
 * Fetch all add-ons from the backend (with mock data fallback)
 * @returns {Promise<Array>} Array of add-on product objects
 */
export async function fetchAddOns() {
  try {
    const response = await fetch(`${API_BASE_URL}/products?category=Add-on`);
    if (!response.ok) {
      throw new Error('Failed to fetch add-ons');
    }
    const data = await response.json();
    return data;
  } catch (error) {
    console.warn('Backend not available, using mock data:', error.message);
    // Return mock data as fallback
    return MOCK_ADDONS;
  }
}

/**
 * Submit an order to the backend (with mock success fallback)
 * @param {Object} orderData - The order data to submit
 * @returns {Promise<Object>} Response from the server
 */
export async function submitOrder(orderData) {
  try {
    const response = await fetch(`${API_BASE_URL}/orders`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(orderData),
    });
    if (!response.ok) {
      throw new Error('Failed to submit order');
    }
    const data = await response.json();
    return data;
  } catch (error) {
    console.warn('Backend not available, simulating order submission:', error.message);
    // Simulate successful order submission
    return {
      success: true,
      orderId: `MOCK-${Date.now()}`,
      message: 'Order submitted (mock mode - backend not connected)',
      data: orderData
    };
  }
}

