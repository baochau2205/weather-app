const cityPills = document.getElementById('city-pills');
const currentWeather = document.getElementById('current-weather');
const timeline = document.getElementById('timeline');
const forecastList = document.getElementById('forecast-list');
const weatherForm = document.getElementById('weather-form');
const cityInput = document.getElementById('city-input');

const favoriteCities = ['Hanoi', 'Ho Chi Minh City', 'Da Nang', 'London', 'New York'];

function getWeatherIcon(code, isDay = true) {
  const iconMap = {
    0: isDay ? '☀️' : '🌙',
    1: isDay ? '🌤️' : '🌙',
    2: '⛅',
    3: '☁️',
    45: '🌫️',
    48: '🌫️',
    51: '🌦️',
    53: '🌦️',
    55: '🌦️',
    61: '🌧️',
    63: '🌧️',
    65: '🌧️',
    71: '🌨️',
    73: '🌨️',
    75: '🌨️',
    80: '🌦️',
    81: '🌧️',
    82: '🌧️',
    95: '⛈️',
    96: '⛈️',
    99: '⛈️',
  };

  return iconMap[code] || '🌈';
}

function getWeatherLabel(code) {
  const labelMap = {
    0: 'Clear',
    1: 'Mostly clear',
    2: 'Partly cloudy',
    3: 'Cloudy',
    45: 'Fog',
    48: 'Dense fog',
    51: 'Light drizzle',
    53: 'Light drizzle',
    55: 'Moderate drizzle',
    61: 'Rain',
    63: 'Heavy rain',
    65: 'Very heavy rain',
    71: 'Snow',
    73: 'Snow',
    75: 'Heavy snow',
    80: 'Showers',
    81: 'Showers',
    82: 'Heavy showers',
    95: 'Thunderstorm',
    96: 'Thunderstorm',
    99: 'Thunderstorm',
  };

  return labelMap[code] || 'Varied weather';
}

function getWeatherTheme(code) {
  if (code >= 95) return 'storm';
  if (code >= 61 && code <= 82) return 'rainy';
  if (code === 71 || code === 73 || code === 75) return 'snow';
  if (code >= 3 && code <= 45) return 'cloudy';
  return 'sunny';
}

function formatDateTime(date, timeZone) {
  return new Intl.DateTimeFormat('en-US', {
    timeZone,
    weekday: 'long',
    hour: 'numeric',
    minute: '2-digit',
  }).format(date);
}

function buildCityPills() {
  cityPills.innerHTML = favoriteCities
    .map(
      (city) => `<button class="city-pill" data-city="${city}">${city}</button>`
    )
    .join('');

  cityPills.querySelectorAll('.city-pill').forEach((button) => {
    button.addEventListener('click', () => {
      fetchWeather(button.dataset.city);
    });
  });
}

function renderCurrentWeather(data) {
  const { location, current, timezone } = data;
  const now = new Date();

  currentWeather.innerHTML = `
    <div class="status-main">
      <div class="city-line">
        <span class="city-name">${location.name}</span>
        <span class="country-chip">${location.country}</span>
      </div>
      <p>${formatDateTime(now, timezone)}</p>
      <div class="current-temp">${Math.round(current.temperature)}°C</div>
      <div class="current-meta">
        <span>🌬️ Wind ${current.windSpeed} km/h</span>
        <span>☔ Rain ${current.precipitation}%</span>
      </div>
      <p>${getWeatherLabel(current.weatherCode)} · ${current.isDay ? 'Daytime' : 'Nighttime'}</p>
    </div>
    <div class="current-icon">${getWeatherIcon(current.weatherCode, current.isDay)}</div>
  `;

  document.body.dataset.weather = getWeatherTheme(current.weatherCode);
}

function renderTimeline(hourlyData) {
  const slots = [
    { label: 'Morning', hour: 6 },
    { label: 'Noon', hour: 12 },
    { label: 'Evening', hour: 18 },
    { label: 'Night', hour: 0 },
  ];

  const labels = hourlyData.time.map((value) => new Date(value));
  timeline.innerHTML = slots
    .map((slot) => {
      const index = labels.findIndex((date) => date.getHours() >= slot.hour);
      const pickIndex = index === -1 ? labels.length - 1 : index;
      const temp = Math.round(hourlyData.temperature[pickIndex]);
      const rain = Math.round(hourlyData.precipitation[pickIndex]);
      const icon = getWeatherIcon(hourlyData.weatherCode[pickIndex], slot.hour < 18);
      return `
        <div class="timeline-item">
          <div>${slot.label}</div>
          <div>${icon}</div>
          <strong>${temp}°C</strong>
          <small>${rain}% rain</small>
        </div>
      `;
    })
    .join('');
}

function renderForecast(dailyData) {
  forecastList.innerHTML = dailyData.time
    .slice(0, 7)
    .map((dateString, index) => {
      const dayName = new Intl.DateTimeFormat('en-US', { weekday: 'short' }).format(new Date(dateString));
      const high = Math.round(dailyData.temperatureMax[index]);
      const low = Math.round(dailyData.temperatureMin[index]);
      const rain = dailyData.precipitationProbability[index];
      const icon = getWeatherIcon(dailyData.weatherCode[index]);
      return `
        <div class="forecast-card">
          <div class="forecast-icon">${icon}</div>
          <div>
            <strong>${dayName}</strong>
            <div>${getWeatherLabel(dailyData.weatherCode[index])}</div>
          </div>
          <div class="forecast-temps">
            <strong>${high}°</strong>
            <span>${low}°</span>
            <span>· ${rain}%</span>
          </div>
        </div>
      `;
    })
    .join('');
}

async function fetchWeather(cityName) {
  try {
    const geoResponse = await fetch(
      `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(cityName)}&count=1&language=vi&format=json`
    );
    const geoData = await geoResponse.json();

    if (!geoData.results?.length) {
      throw new Error('Không tìm thấy thành phố.');
    }

    const location = geoData.results[0];
    const forecastResponse = await fetch(
      `https://api.open-meteo.com/v1/forecast?latitude=${location.latitude}&longitude=${location.longitude}&current=temperature_2m,weather_code,is_day,precipitation,wind_speed_10m&hourly=temperature_2m,precipitation_probability,weather_code&daily=weather_code,temperature_2m_max,temperature_2m_min,precipitation_probability_max&timezone=auto&forecast_days=7`
    );
    const forecastData = await forecastResponse.json();

    const current = {
      temperature: forecastData.current.temperature_2m,
      weatherCode: forecastData.current.weather_code,
      isDay: forecastData.current.is_day === 1,
      precipitation: forecastData.current.precipitation,
      windSpeed: forecastData.current.wind_speed_10m,
    };

    const hourly = {
      time: forecastData.hourly.time,
      temperature: forecastData.hourly.temperature_2m,
      precipitation: forecastData.hourly.precipitation_probability,
      weatherCode: forecastData.hourly.weather_code,
    };

    const daily = {
      time: forecastData.daily.time,
      weatherCode: forecastData.daily.weather_code,
      temperatureMax: forecastData.daily.temperature_2m_max,
      temperatureMin: forecastData.daily.temperature_2m_min,
      precipitationProbability: forecastData.daily.precipitation_probability_max,
    };

    renderCurrentWeather({
      location: {
        name: location.name,
        country: location.country,
      },
      current,
      timezone: forecastData.timezone || 'auto',
    });

    renderTimeline(hourly);
    renderForecast(daily);
  } catch (error) {
    currentWeather.innerHTML = `<p class="error">${error.message}</p>`;
    timeline.innerHTML = '';
    forecastList.innerHTML = '';
  }
}

weatherForm.addEventListener('submit', (event) => {
  event.preventDefault();
  fetchWeather(cityInput.value.trim() || 'Hanoi');
  cityInput.value = '';
});

buildCityPills();
fetchWeather('Hanoi');
