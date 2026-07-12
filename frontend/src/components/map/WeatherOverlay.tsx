
import { CloudRain, Sun, Moon, Cloud } from 'lucide-react';
import type { WeatherData } from '../../hooks/useLiveWeather';

interface WeatherOverlayProps {
  weather: WeatherData | null;
}

export function WeatherOverlay({ weather }: WeatherOverlayProps) {
  if (!weather) return null;

  const getWeatherIcon = () => {
    if (weather.isRaining) return <CloudRain size={20} className="text-blue-400" />;
    if (weather.weatherCode > 0 && weather.weatherCode < 50) return <Cloud size={20} className="text-slate-400" />;
    return weather.isDay ? <Sun size={20} className="text-yellow-400" /> : <Moon size={20} className="text-indigo-300" />;
  };

  return (
    <>
      {/* Weather Widget */}
      <div className="absolute top-4 right-4 z-[1000] bg-white/80 dark:bg-slate-900/80 backdrop-blur-md border border-slate-200/50 dark:border-slate-700/50 rounded-2xl p-3 shadow-lg flex items-center gap-3">
        <div className="flex items-center justify-center bg-slate-100 dark:bg-slate-800 rounded-full p-2">
          {getWeatherIcon()}
        </div>
        <div>
          <div className="text-sm font-bold text-slate-800 dark:text-slate-100">
            {Math.round(weather.temperature)}°C
          </div>
          <div className="text-xs font-medium text-slate-500 dark:text-slate-400">
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
