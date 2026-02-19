require("dotenv").config();
const express = require("express");
const cors = require("cors");
const session = require("express-session");
const path = require("path");
const helmet = require("helmet");
const compression = require("compression");

const authRoutes = require("./routes/auth");
const searchRoutes = require("./routes/searches");
const weatherRoutes = require("./routes/weather");

const app = express();
app.set("trust proxy", 1);
const PORT = process.env.PORT || 3000;
const isProduction = process.env.NODE_ENV === "production";

// ==================== SECURITY MIDDLEWARE ====================

// Helmet - Security headers
app.use(
  helmet({
    contentSecurityPolicy: false, // Disabled for now to allow inline scripts
  })
);

// Compression - Gzip responses
app.use(compression());

// CORS — allow frontend requests
app.use(
  cors({
    origin: "https://road-risk-sigma.vercel.app",
    credentials: true,
  })
);

// Parse JSON bodies with size limit (prevent DoS)
app.use(express.json({ limit: "10kb" }));

// Session management with environment variable secret
app.use(
  session({
    secret: process.env.SESSION_SECRET || "fallback_secret_change_this",
    resave: false,
    saveUninitialized: false,
    cookie: {
      maxAge: 1000 * 60 * 60 * 24, // 1 day
      httpOnly: true,
      sameSite: "none",
      secure: true, // HTTPS only in production
    },
  })
);

// Serve frontend static files (HTML, CSS, JS, images)
app.use(express.static(path.join(__dirname, "..")));

// ==================== ROUTES ====================
app.use("/api/auth", authRoutes);
app.use("/api/searches", searchRoutes);
app.use("/api/weather", weatherRoutes);

// ==================== ERROR HANDLING ====================
app.use((err, req, res, next) => {
  console.error("Server error:", err);

  if (isProduction) {
    // Generic error message in production
    res.status(500).json({ error: "Internal server error" });
  } else {
    // Detailed error in development
    res.status(500).json({ error: err.message, stack: err.stack });
  }
});

// ==================== START SERVER ====================
app.listen(PORT, () => {
  console.log(`✅ Server running at http://localhost:${PORT}`);
  console.log(`📂 Frontend served from: ${path.join(__dirname, "..")}`);
  console.log(`🔒 Environment: ${process.env.NODE_ENV || "development"}`);

  if (!process.env.SESSION_SECRET) {
    console.warn("⚠️  WARNING: SESSION_SECRET not set in .env file!");
  }
});
