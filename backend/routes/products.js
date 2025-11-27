import express from "express";
import pool from "../config/database.js";

const router = express.Router();

// GET all products
router.get("/", async (req, res) => {
  try {
    const result = await pool.query("SELECT * FROM products ORDER BY product_id");
    res.json(result.rows);
  } catch (error) {
    console.error("Error fetching products:", error);
    res.status(500).json({ error: "Failed to fetch products" });
  }
});

// CREATE - Add a new product
router.post("/", async (req, res) => {
  try {
    const { product_name, category, price, stock } = req.body;
    
    console.log("Received product data:", { product_name, category, price, stock });
    
    if (!product_name || !category || price === undefined) {
      return res.status(400).json({ message: "Missing required fields: product_name, category, and price are required" });
    }

    const result = await pool.query(
      "INSERT INTO products (product_name, category, price, stock) VALUES ($1, $2, $3, $4) RETURNING *",
      [product_name, category, price, stock !== "" && stock !== null ? stock : null]
    );

    console.log("Product created successfully:", result.rows[0]);
    res.status(201).json(result.rows[0]);
  } catch (error) {
    console.error("Error creating product:", error);
    res.status(500).json({ 
      message: "Failed to create product", 
      error: error.message,
      details: error.detail 
    });
  }
});

// UPDATE - Update an existing product
router.put("/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const { product_name, category, price, stock } = req.body;

    console.log("Updating product:", id, { product_name, category, price, stock });

    const result = await pool.query(
      "UPDATE products SET product_name = $1, category = $2, price = $3, stock = $4 WHERE product_id = $5 RETURNING *",
      [product_name, category, price, stock !== "" && stock !== null ? stock : null, id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ message: "Product not found" });
    }

    console.log("Product updated successfully:", result.rows[0]);
    res.json(result.rows[0]);
  } catch (error) {
    console.error("Error updating product:", error);
    res.status(500).json({ 
      message: "Failed to update product",
      error: error.message,
      details: error.detail
    });
  }
});

// DELETE - Delete a product
router.delete("/:id", async (req, res) => {
  try {
    const { id } = req.params;

    console.log("Deleting product:", id);

    const result = await pool.query(
      "DELETE FROM products WHERE product_id = $1 RETURNING *",
      [id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ message: "Product not found" });
    }

    console.log("Product deleted successfully:", result.rows[0]);
    res.json({ message: "Product deleted successfully", product: result.rows[0] });
  } catch (error) {
    console.error("Error deleting product:", error);
    res.status(500).json({ 
      message: "Failed to delete product",
      error: error.message,
      details: error.detail
    });
  }
});

export default router;

