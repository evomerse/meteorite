// --- dashboard.js : version complète avec persistance locale + Supabase ---
import { supabase } from './supabase-client.js';

// --- Références aux éléments de l'interface ---
const els = {
  body: document.body,
  weatherContent: document.getElementById('weather-content'),
  citySelector: document.getElementById('city-selector'),
  locName: document.getElementById('loc-name'),
  locExtra: document.getElementById('loc-extra'),
  currentTemp: document.getElementById('current-temp'),
  currentDesc: document.getElementById('current-desc'),
  currentIcon: document.getElementById('current-icon'),
  wind: document.getElementById('current-wind'),
  humidity: document.getElementById('current-humidity'),
  apparent: document.getElementById('current-apparent'),
  pressure: document.getElementById('current-pressure'),
  updated: document.getElementById('updated'),
  hourly: document.getElementById('hourly'),
  searchForm: document.getElementById('search-form'),
  searchInput: document.getElementById('search'),
  suggestions: document.getElementById('suggestions'),
  changeCityBtn: document.getElementById('change-city-btn'),
  logoutBtn: document.getElementById('logout-btn'),
  feedback: document.getElementById('feedback'),
};
let eventListenersInitialized = false;

// --- Fonctions utilitaires ---
const weatherMap = [
  { codes: [0], desc: 'Ciel dégagé', icon: '☀️' },
  { codes: [1, 2], desc: 'Peu nuageux', icon: '🌤️' },
  { codes: [3], desc: 'Couvert', icon: '☁️' },
  { codes: [45, 48], desc: 'Brouillard', icon: '🌫️' },
  { codes: [51, 53, 55, 56, 57], desc: 'Bruine', icon: '🌦️' },
  { codes: [61, 63, 65], desc: 'Pluie', icon: '🌧️' },
  { codes: [66, 67], desc: 'Pluie verglaçante', icon: '🌨️' },
  { codes: [71, 73, 75, 77], desc: 'Neige', icon: '❄️' },
  { codes: [80, 81, 82], desc: 'Averses', icon: '🌧️' },
  { codes: [85, 86], desc: 'Averses de neige', icon: '❄️' },
  { codes: [95, 96, 99], desc: 'Orage', icon: '⛈️' },
];
function codeToInfo(code) {
  return weatherMap.find(x => x.codes.includes(code)) || { desc: '—', icon: '⛅' };
}

async function geocode(q) {
  const url = new URL('https://geocoding-api.open-meteo.com/v1/search');
  url.searchParams.set('name', q);
  url.searchParams.set('count', '5');
  url.searchParams.set('language', 'fr');
  url.searchParams.set('format', 'json');
  const res = await fetch(url);
  if (!res.ok) throw new Error('Geocoding error');
  return res.json();
}

async function getWeather(lat, lon, timezone) {
  const url = new URL('https://api.open-meteo.com/v1/forecast');
  url.searchParams.set('latitude', lat);
  url.searchParams.set('longitude', lon);
  url.searchParams.set('timezone', timezone || 'auto');
  url.searchParams.set('current_weather', 'true');
  url.searchParams.set(
    'hourly',
    'temperature_2m,relative_humidity_2m,apparent_temperature,pressure_msl,weathercode'
  );
  url.searchParams.set('forecast_days', '2');
  const res = await fetch(url);
  if (!res.ok) throw new Error('Weather fetch error');
  return res.json();
}

function showFeedback(message, isError = false) {
  if (!els.feedback) return;
  els.feedback.textContent = message;
  els.feedback.className = isError ? 'feedback error' : 'feedback success';
  els.feedback.style.display = 'block';
  setTimeout(() => {
    if (els.feedback) els.feedback.style.display = 'none';
  }, 4000);
}

// --- Interface ---
function updateUI(city) {
  if (city) {
    els.citySelector.hidden = true;
    els.weatherContent.hidden = false;
    els.locName.textContent = city.name;
    els.locExtra.textContent = [city.admin1, city.country].filter(Boolean).join(' · ');
  } else {
    els.citySelector.hidden = false;
    els.weatherContent.hidden = true;
  }
}

// --- Affichage météo ---
async function displayWeather(city) {
  if (!city) return;
  try {
    const meteo = await getWeather(city.latitude, city.longitude, city.timezone);
    const cw = meteo.current_weather;
    const hourly = meteo.hourly;
    const info = codeToInfo(cw.weathercode);
    const now = new Date(cw.time).getTime();
    const idxNow = hourly.time
      .map(t => new Date(t).getTime())
      .reduce(
        (prev, curr, i) =>
          Math.abs(curr - now) < Math.abs(hourly.time[prev] - now) ? i : prev,
        0
      );

    els.currentTemp.textContent = `${Math.round(cw.temperature)}°C`;
    els.currentDesc.textContent = info.desc;
    els.currentIcon.textContent = info.icon;
    els.wind.textContent = `${Math.round(cw.windspeed)} km/h`;
    els.humidity.textContent = `${Math.round(hourly.relative_humidity_2m[idxNow])}%`;
    els.apparent.textContent = `${Math.round(hourly.apparent_temperature[idxNow])}°C`;
    els.pressure.textContent = `${Math.round(hourly.pressure_msl[idxNow])} hPa`;
    els.updated.textContent = `Mis à jour : ${new Date(cw.time).toLocaleString([], {
      dateStyle: 'medium',
      timeStyle: 'short',
    })}`;

    els.hourly.innerHTML = '';
    const end = Math.min(hourly.time.length, idxNow + 24);
    for (let i = idxNow; i < end; i++) {
      const t = new Date(hourly.time[i]);
      const temp = Math.round(hourly.temperature_2m[i]);
      const wc_info = codeToInfo(hourly.weathercode[i]);
      const div = document.createElement('div');
      div.className = 'hour';
      div.innerHTML = `<span>${t.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span><div class="icon">${wc_info.icon}</div><strong>${temp}°C</strong>`;
      els.hourly.appendChild(div);
    }
  } catch (err) {
    console.error('Erreur d’affichage météo:', err);
    showFeedback('Impossible de charger les données météo.', true);
  }
}

// --- Sauvegarde de la ville favorite ---
async function saveDefaultCity(user, city) {
  const cityData = {
    name: city.name,
    admin1: city.admin1,
    country: city.country,
    latitude: city.latitude,
    longitude: city.longitude,
    timezone: city.timezone,
  };

  // 1️⃣ Sauvegarde locale
  localStorage.setItem('default_city', JSON.stringify(cityData));

  // 2️⃣ Si utilisateur connecté → sauvegarde Supabase
  if (user) {
    const { error } = await supabase
      .from('profiles')
      .update({ default_city: cityData })
      .eq('id', user.id);

    if (error) {
      console.warn('Erreur Supabase:', error);
      showFeedback("Erreur lors de la sauvegarde côté serveur.", true);
    } else {
      showFeedback(`Ville par défaut mise à jour : ${city.name}`, false);
    }
  } else {
    showFeedback(`Ville enregistrée localement : ${city.name}`, false);
  }

  updateUI(cityData);
  await displayWeather(cityData);
}

// --- Écouteurs d’événements ---
function setupEventListeners(user) {
  if (eventListenersInitialized) return;

  if (els.logoutBtn)
    els.logoutBtn.addEventListener('click', () => supabase.auth.signOut());

  if (els.changeCityBtn)
    els.changeCityBtn.addEventListener('click', () => {
      updateUI(null);
      els.searchInput.focus();
    });

  if (els.searchInput) {
    let debounce;
    els.searchInput.addEventListener('input', () => {
      clearTimeout(debounce);
      const query = els.searchInput.value.trim();
      if (query.length < 2) {
        els.suggestions.classList.remove('show');
        return;
      }
      debounce = setTimeout(async () => {
        try {
          const data = await geocode(query);
          els.suggestions.innerHTML = '';
          data.results?.forEach(city => {
            const btn = document.createElement('button');
            btn.textContent = `${city.name}${
              city.admin1 ? ', ' + city.admin1 : ''
            } — ${city.country}`;
            btn.addEventListener('click', () => {
              saveDefaultCity(user, city);
              els.searchInput.value = '';
              els.suggestions.classList.remove('show');
            });
            els.suggestions.appendChild(btn);
          });
          els.suggestions.classList.add('show');
        } catch (err) {
          console.error('Erreur de géocodage:', err);
        }
      }, 300);
    });

    els.searchInput.addEventListener('blur', () =>
      setTimeout(() => els.suggestions.classList.remove('show'), 150)
    );
  }

  if (els.searchForm) els.searchForm.addEventListener('submit', e => e.preventDefault());
  eventListenersInitialized = true;
}

// --- Initialisation ---
async function initializeDashboard(user) {
  setupEventListeners(user);

  let defaultCity = null;

  // 0) S'assurer que le profil existe
  if (user) {
    const { data: existing } = await supabase
      .from('profiles')
      .select('id')
      .eq('id', user.id)
      .maybeSingle();

    if (!existing) {
      await supabase.from('profiles').insert({
        id: user.id,
        email: user.email,
      });
      console.log('Profil créé pour', user.email);
    }
  }

  // 1) TENTER d'abord Supabase (ville propre au compte)
  if (user) {
    const { data, error } = await supabase
      .from('profiles')
      .select('default_city')
      .eq('id', user.id)
      .single();

    if (!error && data?.default_city) {
      defaultCity = data.default_city;
      // synchroniser un cache local par utilisateur
      localStorage.setItem(`default_city:${user.id}`, JSON.stringify(defaultCity));
    }
  }

  // 2) Sinon, tomber sur le cache local (clé spécifique au user)
  if (!defaultCity) {
    const key = user ? `default_city:${user.id}` : 'default_city:guest';
    const stored = localStorage.getItem(key);
    if (stored) defaultCity = JSON.parse(stored);
  }

  // 3) Mettre à jour l’UI et la météo
  updateUI(defaultCity);
  await displayWeather(defaultCity);

  els.body.classList.remove('is-loading');
}


// --- Point d’entrée principal ---
document.addEventListener('DOMContentLoaded', () => {
  supabase.auth.onAuthStateChange((event, session) => {
    if (event === 'SIGNED_OUT' || !session) {
      window.location.replace('/login.html');
      return;
    }
    if (session.user) {
      initializeDashboard(session.user);
    }
  });

  // Cas : utilisateur pas encore connecté → affichage local
  supabase.auth.getSession().then(({ data }) => {
    if (!data?.session) {
      initializeDashboard(null); // mode hors ligne / non connecté
    }
  });
});
