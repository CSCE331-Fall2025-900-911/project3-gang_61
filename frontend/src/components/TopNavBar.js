"use client";

import { useState, useEffect } from "react";
import styles from "./TopNavBar.module.css";

// Use the same API URL pattern as the rest of the app
const rawApiUrl = process.env.NEXT_PUBLIC_API_URL;
const API_BASE_URL = rawApiUrl.replace(/\/+$/, "");

const buildApiUrl = (path) => {
  // Remove leading slash from path if present, then add it back
  const cleanPath = path.startsWith("/") ? path : `/${path}`;
  return `${API_BASE_URL}${cleanPath}`;
};

export default function TopNavBar() {
  const [currentTime, setCurrentTime] = useState(null);
  const [weather, setWeather] = useState(null);
  const [hasError, setHasError] = useState(false);

  // Initialize and update time every second (only on client)
  useEffect(() => {
    // Set initial time
    setCurrentTime(new Date());
    
    // Update time every second
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);

    return () => clearInterval(timer);
  }, []);

  // Fetch weather data from backend (College Station, TX)
  useEffect(() => {
    const fetchWeather = async () => {
      try {
        const weatherUrl = buildApiUrl("/weather");
        const response = await fetch(weatherUrl, {
          method: "GET",
          headers: {
            "Content-Type": "application/json",
          },
        });

        if (!response.ok) {
          setHasError(true);
          return;
        }

        const weatherData = await response.json();
        
        if (weatherData.temp) {
          setWeather({
            temp: weatherData.temp,
            location: weatherData.location || "College Station, TX",
          });
        } else {
          setHasError(true);
        }
      } catch (error) {
        setHasError(true);
      }
    };

    fetchWeather();
  }, []);

  // Format time
  const formatTime = (date) => {
    return date.toLocaleTimeString("en-US", {
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
      hour12: true,
    });
  };

  // Format date
  const formatDate = (date) => {
    return date.toLocaleDateString("en-US", {
      weekday: "long",
      year: "numeric",
      month: "long",
      day: "numeric",
    });
  };

  return (
    <nav className={styles.navbar}>
      <div className={styles.leftSection}>
        <h1 className={styles.logo}>ShareTea</h1>
      </div>
      <div className={styles.rightSection}>
        <div className={styles.timeDate}>
          {currentTime ? (
            <>
              <div className={styles.time}>{formatTime(currentTime)}</div>
              <div className={styles.date}>{formatDate(currentTime)}</div>
            </>
          ) : (
            <>
              <div className={styles.time}>--:--:-- --</div>
              <div className={styles.date}>Loading...</div>
            </>
          )}
        </div>
        <div className={styles.weather}>
          {weather ? (
            <div className={styles.weatherInfo}>
              <div className={styles.location}>{weather.location}</div>
              <div className={styles.temperature}>{weather.temp}°F</div>
            </div>
          ) : hasError ? (
            <div className={styles.weatherError}>N/A</div>
          ) : (
            <div className={styles.weatherLoading}>Loading weather...</div>
          )}
        </div>
      </div>
    </nav>
  );
}

