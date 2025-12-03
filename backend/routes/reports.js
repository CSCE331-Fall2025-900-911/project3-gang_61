import express from "express";
import { query } from "../config/database.js";

const router = express.Router();

/**
 * GET /api/reports/daily-sales
 * Get daily sales report
 */
router.get("/daily-sales", async (req, res, next) => {
  try {
    const result = await query(
      `SELECT DATE(o.order_time) AS day, COUNT(o.order_id) AS total_orders, SUM(i.price) AS total_revenue
       FROM orders o
       JOIN items i ON o.order_id = i.order_id
       WHERE o.order_status = 'Completed'
       GROUP BY day
       ORDER BY day DESC`
    );
    res.json(result.rows);
  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/reports/lowest-stock
 * Get products with low stock
 */
router.get("/lowest-stock", async (req, res, next) => {
  try {
    const result = await query(
      `SELECT * FROM products 
       WHERE stock < 10 AND stock IS NOT NULL
       ORDER BY stock ASC`
    );
    res.json(result.rows);
  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/reports/peak-sales
 * Get peak sales by day
 */
router.get("/peak-sales", async (req, res, next) => {
  try {
    const result = await query(
      `SELECT 
          o.order_time::date AS day, 
          COUNT(o.order_id) AS total_orders,
          SUM(i.price) AS daily_total
       FROM orders o
       JOIN items i ON i.order_id = o.order_id
       GROUP BY day
       ORDER BY daily_total DESC
       LIMIT 10`
    );
    res.json(result.rows);
  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/reports/sales-history
 * Get sales history grouped by hour
 */
router.get("/sales-history", async (req, res, next) => {
  try {
    const result = await query(
      `SELECT 
          date_trunc('hour', o.order_time) AS hour_start,
          COUNT(o.order_id) AS orders_count,
          SUM(i.price) AS total_sales
       FROM orders o
       JOIN items i ON o.order_id = i.order_id
       GROUP BY hour_start
       ORDER BY hour_start ASC`
    );
    res.json(result.rows);
  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/reports/weekly-sales
 * Get weekly sales report
 */
router.get("/weekly-sales", async (req, res, next) => {
  try {
    const result = await query(
      `SELECT 
          DATE_TRUNC('week', o.order_time) AS week_start,
          COUNT(o.order_id) AS total_orders,
          SUM(i.price) AS total_revenue
       FROM orders o
       JOIN items i ON o.order_id = i.order_id
       GROUP BY week_start
       ORDER BY week_start DESC`
    );
    res.json(result.rows);
  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/reports/top-50-orders
 * Get top 50 recent orders
 */
router.get("/top-50-orders", async (req, res, next) => {
  try {
    const result = await query(
      `SELECT o.order_id, o.order_time, o.order_status,
              (SELECT COALESCE(SUM(i.price), 0) FROM items i WHERE i.order_id = o.order_id) AS total
       FROM orders o
       WHERE o.order_status = 'Completed'
       ORDER BY o.order_time DESC
       LIMIT 50`
    );
    res.json(result.rows);
  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/reports/top-5-menu-items
 * Get top 5 most ordered menu items
 */
router.get("/top-5-menu-items", async (req, res, next) => {
  try {
    const result = await query(
      `SELECT 
          i.product_id,
          p.product_name,
          COUNT(*) AS order_count
       FROM items i
       JOIN products p ON i.product_id = p.product_id
       WHERE p.category NOT IN ('Supply', 'Add-on')
       GROUP BY i.product_id, p.product_name
       ORDER BY order_count DESC
       LIMIT 5`
    );
    res.json(result.rows);
  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/reports/all-menu-items
 * Get all menu items with their order counts (for pie chart)
 */
router.get("/all-menu-items", async (req, res, next) => {
  try {
    const result = await query(
      `SELECT 
          i.product_id,
          p.product_name,
          COUNT(*) AS order_count
       FROM items i
       JOIN products p ON i.product_id = p.product_id
       WHERE p.category NOT IN ('Supply', 'Add-on')
       GROUP BY i.product_id, p.product_name
       ORDER BY order_count DESC`
    );
    res.json(result.rows);
  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/reports/top-5-ingredients
 * Get top 5 most used ingredients (inventory items)
 */
router.get("/top-5-ingredients", async (req, res, next) => {
  try {
    const result = await query(
      `SELECT 
          i.product_id,
          p.product_name,
          p.stock,
          COUNT(*) AS usage_count
       FROM items i
       JOIN products p ON i.product_id = p.product_id
       WHERE p.category IN ('Supply', 'Add-on')
       GROUP BY i.product_id, p.product_name, p.stock
       ORDER BY usage_count DESC
       LIMIT 5`
    );
    res.json(result.rows);
  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/reports/x-report
 * Generate X-Report for a specific date
 * Query params: date (YYYY-MM-DD format)
 */
router.get("/x-report", async (req, res, next) => {
  try {
    const { date } = req.query;

    if (!date) {
      return res
        .status(400)
        .json({ error: "Date parameter is required (YYYY-MM-DD)" });
    }

    // Validate date format
    const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
    if (!dateRegex.test(date)) {
      return res
        .status(400)
        .json({ error: "Invalid date format. Use YYYY-MM-DD" });
    }

    // Use explicit date casting to avoid timezone issues
    // Cast order_time to date and compare with input date
    // Handle case variations: 'Completed', 'completed', 'complete' all count as completed
    const result = await query(
      `SELECT 
          EXTRACT(HOUR FROM o.order_time)::int AS hour,
          COUNT(DISTINCT CASE WHEN UPPER(TRIM(o.order_status)) IN ('COMPLETED', 'COMPLETE') THEN o.order_id END) AS order_count,
          COALESCE(SUM(CASE WHEN UPPER(TRIM(o.order_status)) IN ('COMPLETED', 'COMPLETE') THEN i.price ELSE 0 END), 0) AS sales,
          COALESCE(SUM(CASE WHEN o.order_status = 'Returned' THEN i.price ELSE 0 END), 0) AS returns,
          COUNT(DISTINCT CASE WHEN o.order_status = 'Cancelled' THEN o.order_id END) AS cancelled_orders
       FROM orders o
       JOIN items i ON o.order_id = i.order_id
       WHERE o.order_time::date = $1::date
       GROUP BY hour
       ORDER BY hour ASC`,
      [date]
    );

    // Format the results to include all 24 hours with hour ranges
    const hourlyData = {};
    for (let i = 0; i < 24; i++) {
      const nextHour = (i + 1) % 24;
      hourlyData[i] = {
        hour: `${i.toString().padStart(2, "0")}:00-${nextHour.toString().padStart(2, "0")}:00`,
        sales: 0,
        returns: 0,
        cancelledOrders: 0,
        orderCount: 0,
      };
    }

    result.rows.forEach((row) => {
      const hour = parseInt(row.hour);
      const nextHour = (hour + 1) % 24;
      hourlyData[hour] = {
        hour: `${hour.toString().padStart(2, "0")}:00-${nextHour.toString().padStart(2, "0")}:00`,
        sales: parseFloat(row.sales || 0).toFixed(2),
        returns: parseFloat(row.returns || 0).toFixed(2),
        cancelledOrders: parseInt(row.cancelled_orders || 0),
        orderCount: parseInt(row.order_count || 0),
      };
    });

    res.json(Object.values(hourlyData));
  } catch (error) {
    next(error);
  }
});

export default router;
