import express from "express";
import { query } from "../config/database.js";

const router = express.Router();

/**
 * GET /api/products
 * Fetch all products, optionally filtered by category
 * Query params: category (optional) - filter by category (e.g., "Add-on")
 */
router.get("/", async (req, res, next) => {
  try {
    const { category } = req.query;

    let sql = "SELECT * FROM products";
    const params = [];

    if (category) {
      sql += " WHERE category = $1";
      params.push(category);
    }

    sql += " ORDER BY product_id ASC";

    const result = await query(sql, params);
    res.json(result.rows);
  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/products/:id
 * Fetch a single product by ID
 */
router.get("/:id", async (req, res, next) => {
  try {
    const { id } = req.params;
    const result = await query(
      "SELECT * FROM products WHERE product_id = $1",
      [id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: "Product not found" });
    }

    res.json(result.rows[0]);
  } catch (error) {
    next(error);
  }
});

export default router;

