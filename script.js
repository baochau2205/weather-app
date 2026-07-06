const cityPills = document.getElementById('city-pills');
const currentWeather = document.getElementById('current-weather');
const timeline = document.getElementById('timeline');
const forecastList = document.getElementById('forecast-list');
const weatherForm = document.getElementById('weather-form');
const cityInput = document.getElementById('city-input');

const favoriteCities = [
  'Hanoi',
  'Ho Chi Minh City',
  'Da Nang',
  'London',
  'New York'
];



function saveLastCity(city) {
  localStorage.setItem('lastCity', city);
}

function getLastCity() {
  return localStorage.getItem('lastCity');
}



function getWeatherIcon(code, isDay = true) {
  const map = {
    0: isDay ? '☀️' : '🌙',
    1: '🌤️',
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
  return map[code] || '🌈';
}

function getWeatherLabel(code) {
  const map = {
    0: 'Clear',
    1: 'Mostly clear',
    2: 'Partly cloudy',
    3: 'Cloudy',
    45: 'Fog',
    48: 'Dense fog',
    51: 'Light drizzle',
    53: 'Drizzle',
    55: 'Heavy drizzle',
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
  return map[code] || 'Unknown';
}

function getWeatherTheme(code) {
  if (code >= 95) return 'storm';
  if (code >= 61 && code <= 82) return 'rainy';
  if ([71, 73, 75].includes(code)) return 'snow';
  if (code >= 45 && code <= 48) return 'cloudy';
  return 'sunny';
}



function setLoading() {
  currentWeather.innerHTML = `<p>Loading weather...</p>`;
  timeline.innerHTML = '';
  forecastList.innerHTML = '';
}

function setError(msg) {
  currentWeather.innerHTML = `<p class="error">${msg}</p>`;
}



function buildCityPills() {
  cityPills.innerHTML = favoriteCities
    .map(city => `<button class="city-pill" data-city="${city}">${city}</button>`)
    .join('');

  cityPills.querySelectorAll('.city-pill').forEach(btn => {
    btn.addEventListener('click', () => {
      fetchWeather(btn.dataset.city);
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

      <p>${new Intl.DateTimeFormat('en-US', {
        timeZone: timezone,
        weekday: 'long',
        hour: '2-digit',
        minute: '2-digit',
      }).format(now)}</p>

      <div class="current-temp">
        ${Math.round(current.temperature)}°C
      </div>

      <div class="current-meta">
        <span>🌬️ ${current.windSpeed} km/h</span>
        <span>☔ ${current.precipitation}%</span>
      </div>

      <p>
        ${getWeatherLabel(current.weatherCode)}
        · ${current.isDay ? 'Day' : 'Night'}
      </p>
    </div>

    <div class="current-icon">
      ${getWeatherIcon(current.weatherCode, current.isDay)}
    </div>
  `;

  document.body.dataset.weather = getWeatherTheme(current.weatherCode);
}



function renderTimeline(hourly) {
  const slots = [6, 12, 18, 0];

  timeline.innerHTML = slots.map(hour => {
    const index = hourly.time.findIndex(t => {
      const d = new Date(t);
      return d.getHours() === hour;
    });

    const i = index === -1 ? 0 : index;

    return `
      <div class="timeline-item">
        <div>${hour === 6 ? 'Morning' : hour === 12 ? 'Noon' : hour === 18 ? 'Evening' : 'Night'}</div>
        <div>${getWeatherIcon(hourly.weatherCode[i])}</div>
        <strong>${Math.round(hourly.temperature[i])}°C</strong>
        <small>${Math.round(hourly.precipitation[i])}%</small>
      </div>
    `;
  }).join('');
}



function renderForecast(daily) {
  forecastList.innerHTML = daily.time.slice(0, 7).map((date, i) => {
    const day = new Intl.DateTimeFormat('en-US', { weekday: 'short' })
      .format(new Date(date));

    return `
      <div class="forecast-card">
        <div class="forecast-icon">
          ${getWeatherIcon(daily.weatherCode[i])}
        </div>

        <div>
          <strong>${day}</strong>
          <div>${getWeatherLabel(daily.weatherCode[i])}</div>
        </div>

        <div class="forecast-temps">
          <strong>${Math.round(daily.temperatureMax[i])}°</strong>
          <span>${Math.round(daily.temperatureMin[i])}°</span>
          <span>· ${daily.precipitationProbability[i]}%</span>
        </div>
      </div>
    `;
  }).join('');
}



async function fetchWeather(city) {
  try {
    setLoading();

    const geoRes = await fetch(
      `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(city)}&count=1&language=en&format=json`
    );

    const geo = await geoRes.json();

    if (!geo.results?.length) {
      throw new Error('City not found');
    }

    const loc = geo.results[0];

    const weatherRes = await fetch(
      `https://api.open-meteo.com/v1/forecast?latitude=${loc.latitude}&longitude=${loc.longitude}&current=temperature_2m,weather_code,is_day,precipitation,wind_speed_10m&hourly=temperature_2m,precipitation_probability,weather_code&daily=weather_code,temperature_2m_max,temperature_2m_min,precipitation_probability_max&timezone=auto&forecast_days=7`
    );

    const data = await weatherRes.json();

    const current = {
      temperature: data.current.temperature_2m,
      weatherCode: data.current.weather_code,
      isDay: data.current.is_day === 1,
      precipitation: data.current.precipitation,
      windSpeed: data.current.wind_speed_10m,
    };

    renderCurrentWeather({
      location: {
        name: loc.name,
        country: loc.country,
      },
      current,
      timezone: data.timezone,
    });

    renderTimeline({
      time: data.hourly.time,
      temperature: data.hourly.temperature_2m,
      precipitation: data.hourly.precipitation_probability,
      weatherCode: data.hourly.weather_code,
    });

    renderForecast({
      time: data.daily.time,
      weatherCode: data.daily.weather_code,
      temperatureMax: data.daily.temperature_2m_max,
      temperatureMin: data.daily.temperature_2m_min,
      precipitationProbability: data.daily.precipitation_probability_max,
    });

    saveLastCity(city);

  } catch (err) {
    setError(err.message);
  }
}



weatherForm.addEventListener('submit', (e) => {
  e.preventDefault();

  const city = cityInput.value.trim();
  if (city) fetchWeather(city);

  cityInput.value = '';
});



buildCityPills();

const lastCity = getLastCity();
fetchWeather(lastCity || 'Hanoi');