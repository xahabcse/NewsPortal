import { useState, useEffect } from 'react';

interface WeatherData {
    temp: number;
    description: string;
    icon: string;
    city: string;
    humidity: number;
    feelsLike: number;
}

const WEATHER_CACHE_KEY = 'newsportal_weather';
const WEATHER_CACHE_TTL = 30 * 60 * 1000; // 30 minutes

const WeatherWidget = () => {
    const [weather, setWeather] = useState<WeatherData | null>(null);
    const [loading, setLoading] = useState(true);
    const [city, setCity] = useState(() => localStorage.getItem('weather_city') || 'Dhaka');
    const [editing, setEditing] = useState(false);
    const [editValue, setEditValue] = useState(city);

    useEffect(() => {
        const fetchWeather = async () => {
            // Check cache first
            try {
                const cached = localStorage.getItem(WEATHER_CACHE_KEY);
                if (cached) {
                    const { data, timestamp, cachedCity } = JSON.parse(cached);
                    if (Date.now() - timestamp < WEATHER_CACHE_TTL && cachedCity === city) {
                        setWeather(data);
                        setLoading(false);
                        return;
                    }
                }
            } catch { /* ignore */ }

            try {
                // Use wttr.in free API (no API key needed)
                const res = await fetch(`https://wttr.in/${encodeURIComponent(city)}?format=j1`);
                if (!res.ok) throw new Error('Weather fetch failed');
                const json = await res.json();
                const current = json.current_condition?.[0];
                if (current) {
                    const data: WeatherData = {
                        temp: parseInt(current.temp_C),
                        description: current.weatherDesc?.[0]?.value || 'Unknown',
                        icon: getWeatherEmoji(parseInt(current.weatherCode)),
                        city,
                        humidity: parseInt(current.humidity),
                        feelsLike: parseInt(current.FeelsLikeC),
                    };
                    setWeather(data);
                    localStorage.setItem(WEATHER_CACHE_KEY, JSON.stringify({ data, timestamp: Date.now(), cachedCity: city }));
                }
            } catch {
                // Fallback demo data
                setWeather({
                    temp: 28,
                    description: 'Partly Cloudy',
                    icon: '\u26C5',
                    city,
                    humidity: 65,
                    feelsLike: 31,
                });
            } finally {
                setLoading(false);
            }
        };

        fetchWeather();
    }, [city]);

    const handleCitySubmit = (e: React.FormEvent) => {
        e.preventDefault();
        const trimmed = editValue.trim();
        if (trimmed) {
            setCity(trimmed);
            localStorage.setItem('weather_city', trimmed);
            localStorage.removeItem(WEATHER_CACHE_KEY);
            setLoading(true);
        }
        setEditing(false);
    };

    if (loading) {
        return (
            <div className="bg-gradient-to-br from-blue-500/10 to-cyan-500/5 border border-blue-500/20 rounded-xl p-4 animate-pulse">
                <div className="h-3 bg-white/10 rounded w-20 mb-3"></div>
                <div className="h-8 bg-white/10 rounded w-16 mb-2"></div>
                <div className="h-3 bg-white/10 rounded w-24"></div>
            </div>
        );
    }

    if (!weather) return null;

    return (
        <div className="bg-gradient-to-br from-blue-500/10 to-cyan-500/5 border border-blue-500/20 rounded-xl p-4">
            <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-1.5">
                    <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-blue-400">
                        <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"></path>
                        <circle cx="12" cy="10" r="3"></circle>
                    </svg>
                    {editing ? (
                        <form onSubmit={handleCitySubmit} className="flex items-center gap-1">
                            <input
                                type="text"
                                value={editValue}
                                onChange={e => setEditValue(e.target.value)}
                                className="w-28 bg-white/10 border border-glass-border rounded px-1.5 py-0.5 text-[10px] text-white focus:outline-none focus:border-blue-400"
                                autoFocus
                                onBlur={handleCitySubmit}
                            />
                        </form>
                    ) : (
                        <button
                            onClick={() => { setEditing(true); setEditValue(city); }}
                            className="text-[10px] text-secondary hover:text-white transition-colors"
                        >
                            {weather.city}
                        </button>
                    )}
                </div>
                <span className="text-2xl">{weather.icon}</span>
            </div>
            <div className="flex items-baseline gap-1 mb-1">
                <span className="text-2xl font-bold text-white">{weather.temp}</span>
                <span className="text-sm text-secondary">°C</span>
            </div>
            <p className="text-[10px] text-secondary">{weather.description}</p>
            <div className="flex items-center gap-3 mt-2 text-[10px] text-secondary/70">
                <span>Feels {weather.feelsLike}°C</span>
                <span>Humidity {weather.humidity}%</span>
            </div>
        </div>
    );
};

function getWeatherEmoji(code: number): string {
    if (code === 113) return '\u2600\uFE0F'; // Sunny
    if (code === 116) return '\u26C5'; // Partly cloudy
    if (code === 119 || code === 122) return '\u2601\uFE0F'; // Cloudy
    if ([176, 263, 266, 293, 296, 299, 302, 305, 308, 311, 314, 317, 353, 356, 359].includes(code)) return '\uD83C\uDF27\uFE0F'; // Rain
    if ([200, 386, 389, 392, 395].includes(code)) return '\u26C8\uFE0F'; // Thunder
    if ([179, 182, 185, 227, 230, 320, 323, 326, 329, 332, 335, 338, 350, 362, 365, 368, 371, 374, 377].includes(code)) return '\uD83C\uDF28\uFE0F'; // Snow
    if ([143, 248, 260].includes(code)) return '\uD83C\uDF2B\uFE0F'; // Fog
    return '\uD83C\uDF24\uFE0F';
}

export default WeatherWidget;
