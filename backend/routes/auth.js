import express from "express";
import { OAuth2Client } from "google-auth-library";
import { query, getClient } from "../config/database.js";

const router = express.Router();

// Initialize Google OAuth client
if (!process.env.GOOGLE_CLIENT_ID) {
  console.warn(
    "Warning: GOOGLE_CLIENT_ID is not set. Google OAuth will not work."
  );
}

const client = process.env.GOOGLE_CLIENT_ID
  ? new OAuth2Client(process.env.GOOGLE_CLIENT_ID)
  : null;

/**
 * POST /api/auth/google
 * Verify Google ID token and create/update user session
 * Body: { idToken: string }
 */
router.post("/google", async (req, res, next) => {
  try {
    if (!client || !process.env.GOOGLE_CLIENT_ID) {
      return res.status(500).json({
        error:
          "Google OAuth is not configured. Please set GOOGLE_CLIENT_ID environment variable.",
      });
    }

    const { idToken } = req.body;

    if (!idToken) {
      return res.status(400).json({ error: "ID token is required" });
    }

    // Verify the Google ID token
    const ticket = await client.verifyIdToken({
      idToken,
      audience: process.env.GOOGLE_CLIENT_ID,
    });

    const payload = ticket.getPayload();
    const { sub: googleId, email, name } = payload;

    let userId = 0;
    let role = "guest"; // Default role
    let employeeId = 0;
    let memberId = 0;
    let userName = name; // Default to Google name

    // Check if user exists in the users table
    try {
      const userResult = await query(
        "SELECT user_id, user_name, email, role FROM users WHERE email = $1",
        [email]
      );

      if (userResult.rows.length > 0) {
        const user = userResult.rows[0];
        userId = user.user_id;
        userName = user.user_name || name; // Use database name if available, fallback to Google name
        role = user.role || "member"; // Default to member if role is null

        // Determine if user is an employee (cashier or manager)
        if (role === "cashier" || role === "manager") {
          employeeId = user.user_id;
        }

        // Determine if user is a member
        // All users in the users table can be considered members, but we'll use role to distinguish
        if (role === "member" || !role) {
          memberId = user.user_id;
        } else if (role === "cashier" || role === "manager") {
          // Employees can also be members - set memberId to same as userId
          memberId = user.user_id;
        }
      }
    } catch (error) {
      console.log("Error querying users table:", error.message);
    }

    // If no user found in database, assign guest role
    // You can change this to return an error if you want to restrict access
    if (!role) {
      role = "guest";
      // Optionally, uncomment the line below to restrict access to only registered users:
      // return res.status(403).json({ error: "User not authorized. Please contact administrator." });
    }

    // Return user info with role
    res.json({
      success: true,
      user: {
        googleId,
        email,
        name: userName, // Use database user_name if available, otherwise Google name
        userId: userId || 0,
        employeeId: employeeId || 0,
        memberId: memberId || 0,
        role: role || "guest", // 'member', 'cashier', 'manager', or 'guest'
      },
    });
  } catch (error) {
    console.error("Google authentication error:", error);

    if (error.message && error.message.includes("Token used too early")) {
      return res.status(400).json({ error: "Token not yet valid" });
    }

    if (error.message && error.message.includes("Token expired")) {
      return res.status(400).json({ error: "Token has expired" });
    }

    res.status(401).json({
      error: "Invalid token or authentication failed",
      message: error.message,
    });
  }
});

/**
 * GET /api/auth/me
 * Get current user info (if authenticated via session/token)
 * This is a placeholder - implement session/token verification as needed
 */
router.get("/me", async (req, res, next) => {
  try {
    // TODO: Implement session/token verification
    // For now, this is a placeholder
    res.json({ error: "Not implemented" });
  } catch (error) {
    next(error);
  }
});

export default router;
