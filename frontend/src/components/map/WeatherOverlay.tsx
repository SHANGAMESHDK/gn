
import { CloudRain, Sun, Moon, Cloud } from 'lucide-react';
import type { WeatherData } from '../../hooks/useLiveWeather';

interface WeatherOverlayProps {
  weather: WeatherData | null;
}

export function WeatherOverlay({ weather }: WeatherOverlayProps) {
  if (!weather) return null;

  const getWeatherIcon = () => {
    if (weather.isRaining) return <CloudRain size={18} className="text-blue-400" />;
    if (weather.weatherCode > 0 && weather.weatherCode < 50) return <Cloud size={18} className="text-[#a09080]" />;
    return weather.isDay ? <Sun size={18} className="text-[#C8A951]" /> : <Moon size={18} className="text-indigo-300" />;
  };

  return (
    <>
      {/* Weather Widget */}
      <div
        className="absolute top-4 left-1/2 -translate-x-1/2 z-[1000] rounded-full py-2 px-4 shadow-lg flex items-center gap-3 border border-[#C8A951]/10"
        style={{ background: 'rgba(26,10,14,0.85)', backdropFilter: 'blur(16px)' }}
      >
        <div className="flex items-center justify-center bg-[#7B1113]/30 rounded-full p-2">
          {getWeatherIcon()}
        </div>
        <div>
          <div className="text-sm font-bold text-[#f0e8dc]">
            {Math.round(weather.temperature)}°C
          </div>
          <div className="text-[10px] font-bold text-[#8a7a6a] uppercase tracking-wider">
            {weather.isRaining ? 'Raining' : weather.isDay ? 'Daytime' : 'Nighttime'}
          </div>
        </div>
      </div>

      {/* Cinematic Rain Effect */}
      {weather.isRaining && (
        <div className="absolute inset-0 pointer-events-none z-[500] overflow-hidden rain-container">
          {Array.from({ length: 100 }).map((_, i) => (
            <div
              key={i}
              className="rain-drop"
              style={{
                left: `${Math.random() * 100}%`,
                animationDuration: `${0.5 + Math.random() * 0.5}s`,
                animationDelay: `${Math.random() * 2}s`
              }}
            />
          ))}
        </div>
      )}
    </>
  );
}
