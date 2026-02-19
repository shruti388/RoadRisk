const express = require("express");
const db = require("../db");
const { body, validationResult } = require("express-validator");
const rateLimit = require("express-rate-limit");

const router = express.Router();

// Rate limiter for searches
const searchLimiter = rateLimit({
  windowMs: 10 * 60 * 1000, // 10 minutes
  max: 20, // 20 searches per 10 min
  message: "Too many searches. Please try again later."
});

// Middleware — must be logged in
function requireAuth(req, res, next) {
  if (req.session && req.session.userId) {
    next();
  } else {
    res.status(401).json({ error: "Not authenticated" });
  }
}

// ==================== SAVE SEARCH (all page data in one row) ====================
router.post(
  "/",
  requireAuth,
  searchLimiter,
  [
    body("city").trim().isLength({ min: 1, max: 100 }).withMessage("City name is required")
  ],
  async (req, res) => {
    // Validate input
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ error: errors.array()[0].msg });
    }

    const {
      city,
      temperature,
      wind_speed,
      humidity,
      weather_condition,
      risk_score,
      risk_level,
      risk_message,
      condition_image,
    } = req.body;

    try {
      const result = await db.query(
        `INSERT INTO searches
          (user_id, city, temperature, wind_speed, humidity, weather_condition,
           risk_score, risk_level, risk_message, condition_image)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10) RETURNING id`,
        [
          req.session.userId,
          city,
          temperature || null,
          wind_speed || null,
          humidity || null,
          weather_condition || null,
          risk_score || null,
          risk_level || null,
          risk_message || null,
          condition_image || null,
        ]
      );

      res.json({ message: "Search saved", searchId: result.rows[0].id });
    } catch (err) {
      console.error("Save search error:", err);
      res.status(500).json({ error: "Server error" });
    }
  }
);

// ==================== UPDATE SEARCH (add weather/risk data later) ====================
router.put("/:id", requireAuth, async (req, res) => {
  const searchId = req.params.id;
  const fields = req.body;

  // Build dynamic SET clause from provided fields
  const allowedFields = [
    "temperature", "wind_speed", "humidity", "weather_condition",
    "risk_score", "risk_level", "risk_message", "condition_image"
  ];

  const updates = [];
  const values = [];
  let paramIndex = 1;

  for (const field of allowedFields) {
    if (fields[field] !== undefined) {
      updates.push(`${field} = $${paramIndex}`);
      values.push(fields[field]);
      paramIndex++;
    }
  }

  if (updates.length === 0) {
    return res.status(400).json({ error: "No fields to update" });
  }

  values.push(searchId, req.session.userId);

  try {
    await db.query(
      `UPDATE searches SET ${updates.join(", ")} WHERE id = $${paramIndex} AND user_id = $${paramIndex + 1}`,
      values
    );
    res.json({ message: "Search updated" });
  } catch (err) {
    console.error("Update search error:", err);
    res.status(500).json({ error: "Server error" });
  }
});

// ==================== GET ALL SEARCHES for logged-in user ====================
router.get("/", requireAuth, async (req, res) => {
  try {
    const result = await db.query(
      "SELECT * FROM searches WHERE user_id = $1 ORDER BY created_at DESC",
      [req.session.userId]
    );
    res.json(result.rows);
  } catch (err) {
    console.error("Get searches error:", err);
    res.status(500).json({ error: "Server error" });
  }
});

// ==================== GET LATEST SEARCH for logged-in user ====================
router.get("/latest", requireAuth, async (req, res) => {
  try {
    const result = await db.query(
      "SELECT * FROM searches WHERE user_id = $1 ORDER BY created_at DESC LIMIT 1",
      [req.session.userId]
    );
    res.json(result.rows[0] || null);
  } catch (err) {
    console.error("Get latest search error:", err);
    res.status(500).json({ error: "Server error" });
  }
});

module.exports = router;
