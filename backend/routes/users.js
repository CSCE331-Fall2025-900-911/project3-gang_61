import express from "express";
import { pool } from "../config/database.js";

const router = express.Router();

/**
 * GET /api/users
 * Fetch all users from the users table
 * Returns: Array of users with user_id, user_name, email, role, created_at
 */
router.get("/", async (req, res) => {
  try {
    const result = await pool.query(
      "SELECT user_id, user_name, email, role, created_at FROM users ORDER BY created_at DESC"
    );

    res.json(result.rows);
  } catch (error) {
    console.error("Error fetching users:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch users",
      error: error.message,
    });
  }
});

/**
 * POST /api/users
 * Create a new user
 * Body: { user_name, email, role }
 */
router.post("/", async (req, res) => {
  try {
    const { user_name, email, role } = req.body;

    // Validate required fields
    if (!email || !role) {
      return res.status(400).json({
        success: false,
        message: "Email and role are required",
      });
    }

    // Validate role (guest is not allowed in database - only manager, cashier, member)
    const validRoles = ["manager", "cashier", "member"];
    if (!validRoles.includes(role.toLowerCase())) {
      return res.status(400).json({
        success: false,
        message: "Invalid role. Must be manager, cashier, or member",
      });
    }

    // Check if email already exists
    const existingUser = await pool.query(
      "SELECT user_id FROM users WHERE email = $1",
      [email]
    );

    if (existingUser.rows.length > 0) {
      return res.status(400).json({
        success: false,
        message: "User with this email already exists",
      });
    }

    // Reset auto-increment sequence to match the highest existing user_id
    // This ensures no gaps in the ID sequence after deletions
    try {
      await pool.query(
        "SELECT setval('users_user_id_seq', COALESCE((SELECT MAX(user_id) FROM users), 0), true)"
      );
    } catch (seqError) {
      // If sequence doesn't exist or has a different name, try alternative approach
      console.warn(
        "Could not reset sequence (this is usually fine if sequence doesn't exist):",
        seqError.message
      );
      // Try to find the sequence name dynamically
      try {
        const seqResult = await pool.query(
          `SELECT sequence_name 
           FROM information_schema.sequences 
           WHERE sequence_schema = 'public' 
           AND sequence_name LIKE '%user_id%'`
        );
        if (seqResult.rows.length > 0) {
          const seqName = seqResult.rows[0].sequence_name;
          await pool.query(
            `SELECT setval('${seqName}', COALESCE((SELECT MAX(user_id) FROM users), 0), true)`
          );
        }
      } catch (altError) {
        console.warn(
          "Alternative sequence reset also failed:",
          altError.message
        );
      }
    }

    // Insert new user
    const result = await pool.query(
      "INSERT INTO users (user_name, email, role) VALUES ($1, $2, $3) RETURNING user_id, user_name, email, role, created_at",
      [user_name || null, email, role.toLowerCase()]
    );

    res.status(201).json({
      success: true,
      user: result.rows[0],
    });
  } catch (error) {
    console.error("Error creating user:", error);
    res.status(500).json({
      success: false,
      message: "Failed to create user",
      error: error.message,
    });
  }
});

/**
 * PUT /api/users/:id
 * Update an existing user
 * Body: { user_name?, email?, role? }
 */
router.put("/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const { user_name, email, role } = req.body;

    // Check if user exists
    const existingUser = await pool.query(
      "SELECT user_id FROM users WHERE user_id = $1",
      [id]
    );

    if (existingUser.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    // Build update query dynamically
    const updates = [];
    const values = [];
    let paramIndex = 1;

    if (user_name !== undefined) {
      updates.push(`user_name = $${paramIndex++}`);
      values.push(user_name || null);
    }

    if (email !== undefined) {
      // Check if email is already taken by another user
      const emailCheck = await pool.query(
        "SELECT user_id FROM users WHERE email = $1 AND user_id != $2",
        [email, id]
      );

      if (emailCheck.rows.length > 0) {
        return res.status(400).json({
          success: false,
          message: "Email already in use by another user",
        });
      }

      updates.push(`email = $${paramIndex++}`);
      values.push(email);
    }

    if (role !== undefined) {
      // Validate role (guest is not allowed in database - only manager, cashier, member)
      const validRoles = ["manager", "cashier", "member"];
      if (!validRoles.includes(role.toLowerCase())) {
        return res.status(400).json({
          success: false,
          message: "Invalid role. Must be manager, cashier, or member",
        });
      }
      updates.push(`role = $${paramIndex++}`);
      values.push(role.toLowerCase());
    }

    if (updates.length === 0) {
      return res.status(400).json({
        success: false,
        message: "No fields to update",
      });
    }

    values.push(id);
    const query = `UPDATE users SET ${updates.join(
      ", "
    )} WHERE user_id = $${paramIndex} RETURNING user_id, user_name, email, role, created_at`;

    const result = await pool.query(query, values);

    res.json({
      success: true,
      user: result.rows[0],
    });
  } catch (error) {
    console.error("Error updating user:", error);
    res.status(500).json({
      success: false,
      message: "Failed to update user",
      error: error.message,
    });
  }
});

/**
 * DELETE /api/users/:id
 * Delete a user
 */
router.delete("/:id", async (req, res) => {
  try {
    const { id } = req.params;

    // Check if user exists
    const existingUser = await pool.query(
      "SELECT user_id FROM users WHERE user_id = $1",
      [id]
    );

    if (existingUser.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    // Delete user
    await pool.query("DELETE FROM users WHERE user_id = $1", [id]);

    res.json({
      success: true,
      message: "User deleted successfully",
    });
  } catch (error) {
    console.error("Error deleting user:", error);
    res.status(500).json({
      success: false,
      message: "Failed to delete user",
      error: error.message,
    });
  }
});

export default router;
