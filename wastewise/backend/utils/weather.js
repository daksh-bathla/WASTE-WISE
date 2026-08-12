const axios = require('axios');

const getSeason = (month) => {
  if (month >= 3 && month <= 5) return 'summer';
  if (month >= 6 && month <= 9) return 'monsoon';
  if (month >= 10 && month <= 11) return 'autumn';
  return 'winter';
};

const getWeather = async (lat, lng) => {
  try {
    const response = await axios.get(
      'https://api.open-meteo.com/v1/forecast',
      {
        params: {
          latitude: lat,
          longitude: lng,
          current: 'temperature_2m,relative_humidity_2m,uv_index,weather_code',
        },
      }
    );

    const { temperature_2m, relative_humidity_2m, uv_index, weather_code } = response.data.current;

    return {
      temp: temperature_2m,
      humidity: relative_humidity_2m,
      uv: uv_index,
      weatherCode: weather_code,
      season: getSeason(new Date().getMonth() + 1),
    };
  } catch (error) {
    console.error('Weather fetch error:', error.message);
    return {
      temp: 25,
      humidity: 60,
      uv: 5,
      weatherCode: 0,
      season: getSeason(new Date().getMonth() + 1),
    };
  }
};

module.exports = { getWeather, getSeason };
