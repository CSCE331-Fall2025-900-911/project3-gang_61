import express from "express";
import bcrypt from "bcryptjs";
import { OAuth2Client } from "google-auth-library";
import axios from "axios";
import pool from "../config/database.js";

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

    // Check if user exists in users table
    const userQuery = await pool.query(
      "SELECT user_id, user_name, email, role FROM users WHERE email = $1",
      [email]
    );

    let user;

    if (userQuery.rows.length > 0) {
      user = userQuery.rows[0];
    } else {
      // Create new user with 'member' role by default
      const insertResult = await pool.query(
        "INSERT INTO users (user_name, email, role) VALUES ($1, $2, $3) RETURNING user_id, user_name, email, role",
        [name, email, "member"]
      );
      user = insertResult.rows[0];
    }

    // Generate a simple token
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
 * POST /api/auth/github
 * Exchange GitHub code for access token and get user info
 * Body: { code: string }
 */
router.post("/github", async (req, res) => {
  console.log("GitHub auth endpoint hit");
  console.log("Request body:", req.body);
  console.log("GitHub Client ID:", process.env.GITHUB_CLIENT_ID);
  console.log("GitHub Client Secret exists:", !!process.env.GITHUB_CLIENT_SECRET);

  try {
    const { code } = req.body;

    if (!code) {
      console.error("No code provided in request");
      return res.status(400).json({
        success: false,
        message: "No authorization code provided",
      });
    }

    if (!process.env.GITHUB_CLIENT_ID || !process.env.GITHUB_CLIENT_SECRET) {
      console.error("GitHub credentials not configured");
      return res.status(500).json({
        success: false,
        message: "GitHub OAuth is not properly configured on the server",
      });
    }

    console.log("Exchanging code for access token...");

    // Exchange code for access token
    const tokenResponse = await axios.post(
      "https://github.com/login/oauth/access_token",
      {
        client_id: process.env.GITHUB_CLIENT_ID,
        client_secret: process.env.GITHUB_CLIENT_SECRET,
        code: code,
      },
      {
        headers: {
          Accept: "application/json",
        },
      }
    );

    console.log("Token response:", tokenResponse.data);

    const accessToken = tokenResponse.data.access_token;

    if (!accessToken) {
      console.error("No access token in response:", tokenResponse.data);
      throw new Error(tokenResponse.data.error_description || "Failed to get access token from GitHub");
    }

    console.log("Access token received, fetching user info...");

    // Get user info from GitHub
    const userResponse = await axios.get("https://api.github.com/user", {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    });

    console.log("GitHub user info:", userResponse.data);

    const githubUser = userResponse.data;

    // Get primary email if not public
    let email = githubUser.email;
    if (!email) {
      console.log("Email not public, fetching from emails endpoint...");
      const emailResponse = await axios.get("https://api.github.com/user/emails", {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      });
      console.log("Email response:", emailResponse.data);
      const primaryEmail = emailResponse.data.find((e) => e.primary);
      email = primaryEmail ? primaryEmail.email : null;
    }

    if (!email) {
      console.error("Unable to get email from GitHub");
      return res.status(400).json({
        success: false,
        message: "Unable to get email from GitHub account. Please make sure your email is verified and public.",
      });
    }

    const name = githubUser.name || githubUser.login;
    console.log("User name:", name, "Email:", email);

    // Check if user exists in users table
    const userQuery = await pool.query(
      "SELECT user_id, user_name, email, role FROM users WHERE email = $1",
      [email]
    );

    let user;

    if (userQuery.rows.length > 0) {
      console.log("Existing user found:", userQuery.rows[0]);
      user = userQuery.rows[0];
    } else {
      console.log("Creating new user...");
      // Create new user with 'member' role by default
      const insertResult = await pool.query(
        "INSERT INTO users (user_name, email, role) VALUES ($1, $2, $3) RETURNING user_id, user_name, email, role",
        [name, email, "member"]
      );
      user = insertResult.rows[0];
      console.log("New user created:", user);
    }

    // Generate a simple token
    const token = Buffer.from(`${email}:${Date.now()}`).toString("base64");

    console.log("GitHub auth successful for user:", user.email);

    res.json({
      success: true,
      user: user,
      token: token,
    });
  } catch (error) {
    console.error("GitHub auth error:", error.message);
    console.error("Error details:", error.response?.data || error);
    res.status(401).json({
      success: false,
      message: "Authentication failed",
      error: error.message,
      details: error.response?.data || undefined,
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

    // Decode the basic token
    const decoded = Buffer.from(token, "base64").toString();
    const [email] = decoded.split(":");

    // Look up user
    const userQuery = await pool.query(
      "SELECT user_id, user_name, email, role FROM users WHERE email = $1",
      [email]
    );

    if (userQuery.rows.length === 0) {
      return res.status(401).json({
        success: false,
        message: "Invalid token",
      });
    }

    res.json({
      success: true,
      user: userQuery.rows[0],
    });
  } catch (error) {
    console.error("Token verification error:", error);
    res.status(401).json({
      success: false,
      message: "Token verification failed",
    });
  }
});

export default router;
