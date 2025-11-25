import express from "express";
import { query, getClient } from "../config/database.js";

const router = express.Router();

/**
 * POST /api/orders
 * Create a new order and order items
 * Body: {
 *   items: [{ product_id, product_name, quantity, price, modifications }],
 *   total: number,
 *   timestamp: string (ISO format),
 *   member_id: number (required),
 *   employee_id: number (required)
 * }
 */
router.post("/", async (req, res, next) => {
  const client = await getClient();

  try {
    await client.query("BEGIN");

    const { items, total, timestamp, member_id, employee_id } = req.body;

    // Validate input
    if (!items || !Array.isArray(items) || items.length === 0) {
      throw new Error("Order must contain at least one item");
    }

    if (!total || isNaN(total)) {
      throw new Error("Total must be a valid number");
    }

    // Validate required fields
    if (member_id === undefined || member_id === null) {
      throw new Error("member_id is required");
    }

    if (employee_id === undefined || employee_id === null) {
      throw new Error("employee_id is required");
    }

    // Validate that member_id and employee_id are numbers
    if (isNaN(member_id) || isNaN(employee_id)) {
      throw new Error("member_id and employee_id must be valid numbers");
    }

    // Insert order
    // Kiosk orders are always "complete" since they're self-service
    // Cashier orders (future) will have employee_id > 0 and may have different statuses
    const orderResult = await client.query(
      `INSERT INTO orders (member_id, employee_id, order_time, order_status)
       VALUES ($1, $2, $3, $4)
       RETURNING order_id, member_id, employee_id, order_time, order_status`,
      [
        parseInt(member_id),
        parseInt(employee_id),
        timestamp || new Date().toISOString(),
        "complete",
      ]
    );

    const orderId = orderResult.rows[0].order_id;

    // Insert items with grouping
    // Each cart item represents a "group" (e.g., a drink with its add-ons)
    // If quantity > 1, create multiple groups (each is a separate instance)
    const insertedItems = [];
    let currentGroupId = 1;

    for (const cartItem of items) {
      const quantity = cartItem.quantity || 1;
      const modifications = cartItem.modifications || {};
      const iceLevel = modifications.iceLevel || null;
      const sugarLevel = modifications.sugarLevel || null;
      const addOns = modifications.addOns || [];

      // Create groups for each quantity (e.g., if quantity is 2, create 2 separate groups)
      for (let q = 0; q < quantity; q++) {
        const groupId = currentGroupId++;

        // Insert main product item
        const mainItemResult = await client.query(
          `INSERT INTO items (order_id, product_id, price, sugar_level, ice_level, group_id)
           VALUES ($1, $2, $3, $4, $5, $6)
           RETURNING item_id, order_id, product_id, price, sugar_level, ice_level, group_id`,
          [
            orderId,
            cartItem.product_id,
            parseFloat(cartItem.price) || 0,
            sugarLevel,
            iceLevel,
            groupId,
          ]
        );
        insertedItems.push(mainItemResult.rows[0]);

        // Insert add-on items (same group_id as the main product)
        for (const addOn of addOns) {
          const addOnResult = await client.query(
            `INSERT INTO items (order_id, product_id, price, sugar_level, ice_level, group_id)
             VALUES ($1, $2, $3, $4, $5, $6)
             RETURNING item_id, order_id, product_id, price, sugar_level, ice_level, group_id`,
            [
              orderId,
              addOn.product_id,
              parseFloat(addOn.price) || 0,
              null, // Add-ons don't have sugar/ice levels
              null,
              groupId, // Same group as the main product
            ]
          );
          insertedItems.push(addOnResult.rows[0]);
        }
      }

      // Update product stock for main product
      await client.query(
        `UPDATE products 
         SET stock = stock - $1 
         WHERE product_id = $2 AND stock >= $1`,
        [quantity, cartItem.product_id]
      );

      // Update product stock for add-ons
      for (const addOn of addOns) {
        await client.query(
          `UPDATE products 
           SET stock = stock - $1 
           WHERE product_id = $2 AND stock >= $1`,
          [quantity, addOn.product_id] // Same quantity as the main product
        );
      }
    }

    await client.query("COMMIT");

    // Return order confirmation
    res.status(201).json({
      success: true,
      orderId: orderId,
      message: "Order placed successfully",
      order: {
        order_id: orderId,
        member_id: orderResult.rows[0].member_id,
        employee_id: orderResult.rows[0].employee_id,
        order_time: orderResult.rows[0].order_time,
        order_status: orderResult.rows[0].order_status,
        total: total,
        items: insertedItems,
      },
    });
  } catch (error) {
    try {
      await client.query("ROLLBACK");
    } catch (rollbackError) {
      console.error("Error during rollback:", rollbackError);
    }
    next(error);
  } finally {
    client.release();
  }
});

/**
 * GET /api/orders
 * Fetch all orders (optional: for admin/management)
 * Query params: 
 *   - limit: number of recent orders to fetch (default: all)
 *   - includeItems: whether to include items array (default: true, set to false for faster queries)
 */
router.get("/", async (req, res, next) => {
  try {
    const limit = req.query.limit ? parseInt(req.query.limit, 10) : null;
    const includeItems = req.query.includeItems !== 'false';
    
    // Validate limit is a positive integer (max 1000 for safety)
    const validLimit = limit && limit > 0 && limit <= 1000 ? limit : null;
    
    let queryString;
    
    if (includeItems) {
      // Full query with items (slower but complete)
      queryString = `SELECT o.*, 
                COALESCE(
                  json_agg(
                    json_build_object(
                      'item_id', i.item_id,
                      'product_id', i.product_id,
                      'price', i.price,
                      'sugar_level', i.sugar_level,
                      'ice_level', i.ice_level,
                      'group_id', i.group_id
                    ) ORDER BY i.group_id, i.item_id
                  ) FILTER (WHERE i.item_id IS NOT NULL),
                  '[]'::json
                ) as items
         FROM orders o
         LEFT JOIN items i ON o.order_id = i.order_id
         GROUP BY o.order_id, o.member_id, o.employee_id, o.order_time, o.order_status
         ORDER BY o.order_time DESC NULLS LAST`;
    } else {
      // Fast query without items - use CTE to optimize
      if (validLimit) {
        // For limited queries, use CTE to get orders first, then calculate totals
        queryString = `WITH recent_orders AS (
           SELECT * FROM orders 
           ORDER BY order_time DESC NULLS LAST 
           LIMIT ${validLimit}
         )
         SELECT o.*,
                (SELECT COALESCE(SUM(price), 0) FROM items WHERE order_id = o.order_id) as total,
                '[]'::json as items
         FROM recent_orders o
         ORDER BY o.order_time DESC NULLS LAST`;
      } else {
        // For all orders, use regular query
        queryString = `SELECT o.*,
                (SELECT COALESCE(SUM(price), 0) FROM items WHERE order_id = o.order_id) as total,
                '[]'::json as items
         FROM orders o
         ORDER BY o.order_time DESC NULLS LAST`;
      }
    }
    
    // Add LIMIT clause only if not already in CTE
    if (validLimit && includeItems) {
      queryString += ` LIMIT ${validLimit}`;
    }

    const result = await query(queryString);
    res.json(result.rows);
  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/orders/:id
 * Fetch a single order by ID
 */
router.get("/:id", async (req, res, next) => {
  try {
    const { id } = req.params;

    const orderResult = await query(
      "SELECT * FROM orders WHERE order_id = $1",
      [id]
    );

    if (orderResult.rows.length === 0) {
      return res.status(404).json({ error: "Order not found" });
    }

    const itemsResult = await query(
      `SELECT i.*, p.product_name 
       FROM items i
       LEFT JOIN products p ON i.product_id = p.product_id
       WHERE i.order_id = $1
       ORDER BY i.group_id, i.item_id`,
      [id]
    );

    res.json({
      ...orderResult.rows[0],
      items: itemsResult.rows,
    });
  } catch (error) {
    next(error);
  }
});

export default router;
