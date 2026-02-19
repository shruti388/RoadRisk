const express = require("express");
const bcrypt = require("bcryptjs");
const db = require("../db");
const { body, validationResult } = require("express-validator");
const rateLimit = require("express-rate-limit");

const router = express.Router();
const isProduction = process.env.NODE_ENV === "production";

// Rate limiters
const signupLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 3, // 3 signups per hour per IP
  message: "Too many accounts created. Please try again later."
});

const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5, // 5 login attempts
  message: "Too many login attempts. Please try again later."
});

// Password validation helper
function isStrongPassword(password) {
  // At least 8 characters, 1 uppercase, 1 lowercase, 1 number, 1 special char
  const minLength = password.length >= 8;
  const hasUpperCase = /[A-Z]/.test(password);
  const hasLowerCase = /[a-z]/.test(password);
  const hasNumber = /[0-9]/.test(password);
  const hasSpecialChar = /[!@#$%^&*(),.?":{}|<>]/.test(password);

  return minLength && hasUpperCase && hasLowerCase && hasNumber && hasSpecialChar;
}

// ==================== SIGNUP ====================
router.post(
  "/signup",
  signupLimiter,
  [
    body("email").isEmail().normalizeEmail().withMessage("Invalid email address"),
    body("password").isLength({ min: 8 }).withMessage("Password must be at least 8 characters")
  ],
  async (req, res) => {
    // Validate input
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ error: errors.array()[0].msg });
    }

    const { email, password } = req.body;

    // Enforce strong password policy
    if (!isStrongPassword(password)) {
      return res.status(400).json({
        error: "Password must contain at least 8 characters, including uppercase, lowercase, number, and special character"
      });
    }

    try {
      // Check if user already exists
      const existing = await db.query("SELECT id FROM users WHERE email = $1", [email]);
      if (existing.rows.length > 0) {
        return res.status(409).json({ error: "Email already registered" });
      }

      // Hash password and insert
      const hashedPassword = await bcrypt.hash(password, 10);
      const result = await db.query(
        "INSERT INTO users (email, password) VALUES ($1, $2) RETURNING id",
        [email, hashedPassword]
      );

      // Set session
      req.session.userId = result.rows[0].id;
      req.session.email = email;

      res.json({ message: "Signup successful", userId: result.rows[0].id });
    } catch (err) {
      if (!isProduction) {
        console.error("Signup error:", err);
      }
      res.status(500).json({ error: "Server error" });
    }
  }
);

// ==================== LOGIN ====================
router.post(
  "/login",
  loginLimiter,
  [
    body("email").isEmail().normalizeEmail().withMessage("Invalid email address"),
    body("password").notEmpty().withMessage("Password is required")
  ],
  async (req, res) => {
    // Validate input
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ error: errors.array()[0].msg });
    }

    const { email, password } = req.body;

    try {
      const result = await db.query("SELECT * FROM users WHERE email = $1", [email]);
      if (result.rows.length === 0) {
        return res.status(401).json({ error: "Invalid email or password" });
      }

      const user = result.rows[0];
      const match = await bcrypt.compare(password, user.password);
      if (!match) {
        return res.status(401).json({ error: "Invalid email or password" });
      }

      // Set session
      req.session.userId = user.id;
      req.session.email = user.email;

      res.json({ message: "Login successful", userId: user.id });
    } catch (err) {
      if (!isProduction) {
        console.error("Login error:", err);
      }
      res.status(500).json({ error: "Server error" });
    }
  }
);

// ==================== LOGOUT ====================
router.post("/logout", (req, res) => {
  req.session.destroy();
  res.json({ message: "Logged out" });
});

// ============ CHECK AUTH STATUS ============
router.get("/status", (req, res) => {
  if (req.session && req.session.userId) {
    res.json({ loggedIn: true, userId: req.session.userId, email: req.session.email });
  } else {
    res.json({ loggedIn: false });
  }
});

module.exports = router;
