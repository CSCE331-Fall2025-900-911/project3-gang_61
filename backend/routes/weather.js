import express from "express";
import axios from "axios";

const router = express.Router();

// Weather endpoint for College Station, TX
// Uses fixed coordinates: 30.627977, -96.334407
router.get("/", async (req, res) => {
  try {
    // College Station, TX coordinates
    const lat = 30.627977;
    const lon = -96.334407;

    // Step 1: Get grid point from lat/lon
    const pointsUrl = `https://api.weather.gov/points/${lat.toFixed(4)},${lon.toFixed(4)}`;
    
    const pointsResponse = await axios.get(pointsUrl, {
      headers: {
        "User-Agent": "ShareTea Kiosk App (contact@example.com)",
        "Accept": "application/json",
      },
    });

    const forecastUrl = pointsResponse.data.properties.forecast;
    const forecastResponse = await axios.get(forecastUrl, {
      headers: {
        "User-Agent": "ShareTea Kiosk App (contact@example.com)",
        "Accept": "application/json",
      },
    });

    const currentPeriod = forecastResponse.data?.properties?.periods?.[0];

    res.json({
      temp: currentPeriod.temperature,
      location: "College Station, TX",
    });
  } catch (error) {
    res.status(500).json({ error: "Failed to fetch weather" });
  }
});

export default router;
