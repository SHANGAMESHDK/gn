import { useState, useEffect } from 'react';
import axios from 'axios';

export interface WeatherData {
  temperature: number;
  isDay: boolean;
  isRaining: boolean;
  weatherCode: number;
}

export function useLiveWeather(lat: number = 13.0318, lng: number = 80.1796) {
  const [weather, setWeather] = useState<WeatherData | null>(null);

  useEffect(() => {
    async function fetchWeather() {
      try {
        const response = await axios.get(
          `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lng}&current=temperature_2m,is_day,precipitation,weather_code`
        );
        const current = response.data.current;
        setWeather({
          temperature: current.temperature_2m,
          isDay: current.is_day === 1,
          isRaining: current.precipitation > 0 || [51, 53, 55, 61, 63, 65, 80, 81, 82].includes(current.weather_code),
          weatherCode: current.weather_code
        });
      } catch (err) {
        console.error("Failed to fetch live weather", err);
      }
    }
    
    fetchWeather();
    
    // Refresh every 15 minutes
    const interval = setInterval(fetchWeather, 15 * 60 * 1000);
    return () => clearInterval(interval);
  }, [lat, lng]);

  return weather;
}
