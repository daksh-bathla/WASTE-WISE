import { useEffect, useState } from 'react';
import { Cloud, CloudRain, MapPin, RefreshCw, Sun, Wind } from 'lucide-react';
import Badge from './Badge';
import LoadingSpinner from './LoadingSpinner';

const conditionForCode = (weatherCode) => {
  if (weatherCode === 0 || weatherCode === 1) return { label: 'Clear', icon: Sun };
  if (weatherCode >= 2 && weatherCode <= 48) return { label: 'Cloudy', icon: Cloud };
  if (weatherCode >= 51 && weatherCode <= 82) return { label: 'Rain likely', icon: CloudRain };
  return { label: 'Breezy', icon: Wind };
};

const seasonForMonth = (month) => {
  if ([3, 4, 5, 6].includes(month)) return 'Summer';
  if ([7, 8, 9].includes(month)) return 'Monsoon';
  if ([11, 12, 1, 2].includes(month)) return 'Winter';
  return 'Mild season';
};

export default function WeatherStrip({ city: defaultCity = 'Delhi', lat: defaultLat = 28.7041, lng: defaultLng = 77.1025 }) {
  const [weather, setWeather] = useState(null);
  const [loading, setLoading] = useState(true);
  const [locationName, setLocationName] = useState(defaultCity);

  useEffect(() => {
    let active = true;

    const fetchWeatherAndLocation = async (latitude, longitude) => {
      try {
        setLoading(true);
        const [weatherRes, geoRes] = await Promise.allSettled([
          fetch(`https://api.open-meteo.com/v1/forecast?latitude=${latitude}&longitude=${longitude}&current=temperature_2m,relative_humidity_2m,uv_index,weather_code`),
          fetch(`https://nominatim.openstreetmap.org/reverse?lat=${latitude}&lon=${longitude}&format=json`)
        ]);

        if (active && weatherRes.status === 'fulfilled') {
          const data = await weatherRes.value.json();
          setWeather(data.current);
        }

        if (active && geoRes.status === 'fulfilled') {
          const geoData = await geoRes.value.json();
          const city = geoData.address?.city || geoData.address?.town || geoData.address?.village || geoData.address?.state_district || defaultCity;
          setLocationName(city);
        }
      } catch {
        // Fallback or ignore
      } finally {
        if (active) setLoading(false);
      }
    };

    const getLocation = () => {
      if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(
          (position) => {
            if (active) {
              fetchWeatherAndLocation(position.coords.latitude, position.coords.longitude);
            }
          },
          (error) => {
            console.error('Geolocation error:', error);
            if (active) fetchWeatherAndLocation(defaultLat, defaultLng);
          },
          { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
        );
      } else {
        fetchWeatherAndLocation(defaultLat, defaultLng);
      }
    };

    getLocation();

    const interval = window.setInterval(getLocation, 30 * 60 * 1000);
    return () => {
      active = false;
      window.clearInterval(interval);
    };
  }, [defaultLat, defaultLng, defaultCity]);

  const condition = conditionForCode(weather?.weather_code ?? 0);
  const Icon = condition.icon;
  const season = seasonForMonth(new Date().getMonth() + 1);

  return (
    <div className="surface-card mb-6 flex flex-col gap-4 p-4 sm:flex-row sm:items-center sm:justify-between">
      <div className="flex items-center gap-3">
        <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-light-purple text-deep-purple">
          <MapPin size={20} />
        </div>
        <div>
          <p className="font-bold text-text-primary">{locationName}</p>
          <p className="text-xs text-text-muted">Suggestions adapt to local conditions</p>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-3">
        {loading ? (
          <span className="flex items-center gap-2 text-sm font-bold text-text-muted">
            <LoadingSpinner size="sm" /> Checking local conditions
          </span>
        ) : (
          <>
            <Badge color="purple">
              <Icon size={14} /> {condition.label}
            </Badge>
            <Badge color="green">{Math.round(weather?.temperature_2m ?? 31)} C</Badge>
            <Badge color="neutral">Humidity {Math.round(weather?.relative_humidity_2m ?? 58)}%</Badge>
            <Badge color="warning">{season}</Badge>
          </>
        )}
        <RefreshCw size={15} className="text-text-muted" />
      </div>
    </div>
  );
}
