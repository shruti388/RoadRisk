-- =============================================
-- Road Risk Prediction System — PostgreSQL Schema
-- Run this in Supabase SQL Editor to create tables
-- =============================================

-- Users table (login / signup)
CREATE TABLE IF NOT EXISTS users (
  id          SERIAL PRIMARY KEY,
  email       VARCHAR(255) NOT NULL UNIQUE,
  password    VARCHAR(255) NOT NULL,
  created_at  TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Searches table (stores data from ALL pages in ONE table)
CREATE TABLE IF NOT EXISTS searches (
  id                 SERIAL PRIMARY KEY,
  user_id            INT NOT NULL,
  city               VARCHAR(255) NOT NULL,
  temperature        REAL,
  wind_speed         REAL,
  humidity           INT,
  weather_condition  VARCHAR(100),
  risk_score         INT,
  risk_level         VARCHAR(20),
  risk_message       VARCHAR(255),
  condition_image    VARCHAR(255),
  created_at         TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);
