const express = require("express");
const router = express.Router();
require("dotenv").config();

// Simple in-memory cache for weather data (5-minute TTL)
const weatherCache = new Map();
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes

// ==================== WEATHER PROXY ====================
// This route proxies requests to OpenWeatherMap API
// Keeps API key secure on the server side
router.get("/:city", async (req, res) => {
    const city = req.params.city;

    if (!city || city.trim() === "") {
        return res.status(400).json({ error: "City name is required" });
    }

    // Check cache first
    const cacheKey = city.toLowerCase();
    const cached = weatherCache.get(cacheKey);

    if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
        console.log(`📦 Serving cached weather data for: ${city}`);
        return res.json(cached.data);
    }

    try {
        const apiKey = process.env.OPENWEATHER_API_KEY;

        if (!apiKey) {
            console.error("❌ OPENWEATHER_API_KEY not set in .env file");
            return res.status(500).json({ error: "Weather service configuration error" });
        }

        // Fetch from OpenWeatherMap API
        const fetch = (await import("node-fetch")).default;
        const url = `https://api.openweathermap.org/data/2.5/weather?q=${encodeURIComponent(city)}&appid=${apiKey}&units=metric`;

        const response = await fetch(url);

        if (!response.ok) {
            if (response.status === 404) {
                return res.status(404).json({ error: "City not found" });
            }
            throw new Error(`OpenWeatherMap API error: ${response.status}`);
        }

        const data = await response.json();

        // Cache the result
        weatherCache.set(cacheKey, {
            data: data,
            timestamp: Date.now()
        });

        console.log(`🌤️  Fetched weather data for: ${city}`);
        res.json(data);

    } catch (err) {
        console.error("Weather API error:", err.message);
        res.status(500).json({ error: "Failed to fetch weather data" });
    }
});

// Clean up old cache entries every 10 minutes
setInterval(() => {
    const now = Date.now();
    for (const [key, value] of weatherCache.entries()) {
        if (now - value.timestamp > CACHE_TTL) {
            weatherCache.delete(key);
        }
    }
}, 10 * 60 * 1000);

module.exports = router;
