import express from "express";
import { OAuth2Client } from "google-auth-library";
import { pool } from "../config/database.js";

const router = express.Router();
const client = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);

/**
 * POST /api/auth/google
 * Verify Google ID token and create/update user session
 * Body: { credential: string }
 */
router.post("/google", async (req, res) => {
  try {
    const { credential } = req.body;

    if (!credential) {
      return res.status(400).json({
        success: false,
        message: "No credential provided",
      });
    }

    // Verify Google token
    const ticket = await client.verifyIdToken({
      idToken: credential,
      audience: process.env.GOOGLE_CLIENT_ID,
    });

    const payload = ticket.getPayload();
    const email = payload.email;
    const name = payload.name;
    const picture = payload.picture;

    // Check if user exists in employees table
    const employeeQuery = await pool.query(
      "SELECT employee_id, name, email, is_manager FROM employees WHERE email = $1",
      [email]
    );

    let user;
    let role;

    if (employeeQuery.rows.length > 0) {
      // User is an employee (cashier or manager)
      const employee = employeeQuery.rows[0];
      role = employee.is_manager ? "manager" : "cashier";

      user = {
        email: employee.email,
        name: employee.name,
        role: role,
        employeeId: employee.employee_id,
        picture: picture,
      };
    } else {
      // User is not in employees table, check if they're a customer
      role = "customer";

      user = {
        email: email,
        name: name,
        role: role,
        picture: picture,
      };
    }

    // Generate a simple token (in production, use JWT or proper session management)
    const token = Buffer.from(`${email}:${Date.now()}`).toString("base64");

    res.json({
      success: true,
      user: user,
      token: token,
    });
  } catch (error) {
    console.error("Google auth error:", error);
    res.status(401).json({
      success: false,
      message: "Authentication failed",
      error: error.message,
    });
  }
});

/**
 * GET /api/auth/verify
 * Verify if a token is valid and return user info
 */
router.get("/verify", async (req, res) => {
  try {
    const token = req.headers.authorization?.replace("Bearer ", "");

    if (!token) {
      return res.status(401).json({
        success: false,
        message: "No token provided",
      });
    }

    // TODO: Implement proper token verification
    // For now, just decode the basic token
    const decoded = Buffer.from(token, "base64").toString();
    const [email] = decoded.split(":");

    // Look up user again
    const employeeQuery = await pool.query(
      "SELECT employee_id, name, email, is_manager FROM employees WHERE email = $1",
      [email]
    );

    if (employeeQuery.rows.length > 0) {
      const employee = employeeQuery.rows[0];
      return res.json({
        success: true,
        user: {
          email: employee.email,
          name: employee.name,
          role: employee.is_manager ? "manager" : "cashier",
          employeeId: employee.employee_id,
        },
      });
    }

    res.json({
      success: true,
      user: {
        email: email,
        role: "customer",
      },
    });
  } catch (error) {
    console.error("Token verification error:", error);
    res.status(401).json({
      success: false,
      message: "Invalid token",
    });
  }
});

export default router;
