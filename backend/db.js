const { Pool } = require("pg");
require("dotenv").config();

// PostgreSQL connection pool using Supabase connection string
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: {
    rejectUnauthorized: false, // Required for Supabase
  },
});

// Test database connection
pool.query("SELECT NOW()")
  .then(() => console.log("✅ Database connected successfully (Supabase)"))
  .catch((err) => {
    console.error("❌ Database connection failed:", err.message);
    console.error("   Please check your DATABASE_URL in .env file");
  });

module.exports = pool;
