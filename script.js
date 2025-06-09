const EXCHANGE_API = 'https://api.exchangerate-api.com/v4/latest/USD';
const HISTORICAL_API = 'https://api.frankfurter.app';
const NEWS_API = 'https://newsapi.org/v2/everything?q=currency+exchange&sortBy=publishedAt&apiKey=43fa3862e3934ab08e6724bcdec1d217'; 

// DOM Elements
const amountEl = document.getElementById('amount');
const fromCurrencyEl = document.getElementById('from-currency');
const toCurrencyEl = document.getElementById('to-currency');
const resultEl = document.getElementById('result');
const rateDateEl = document.getElementById('rate-date');
const swapBtn = document.getElementById('swap-btn');
const convertBtn = document.getElementById('convert-btn');
const fromFlagEl = document.getElementById('from-flag');
const toFlagEl = document.getElementById('to-flag');
const chartEl = document.getElementById('chart');
const favoritesListEl = document.getElementById('favorites-list');
const newsFeedEl = document.getElementById('news-feed');
const themeBtn = document.getElementById('theme-btn');
const languageSelect = document.getElementById('language-select');

// App state
let exchangeRates = {};
let favorites = JSON.parse(localStorage.getItem('favorites')) || ['USD', 'EUR', 'GBP', 'JPY'];
let currentTheme = localStorage.getItem('theme') || 'light';
let currentLanguage = localStorage.getItem('language') || 'en';

// Initialize the app
async function init() {
    setTheme(currentTheme);
    setLanguage(currentLanguage);
    await fetchExchangeRates();
    await fetchNews();
    populateCurrencyDropdowns();
    renderFavorites();
    calculate();
    
    // Set default currencies
    fromCurrencyEl.value = 'USD';
    toCurrencyEl.value = 'EUR';
    updateFlags();
    
    // Load historical data after a short delay
    setTimeout(loadHistoricalData, 1000);
}

// Fetch exchange rates from free API
async function fetchExchangeRates() {
    try {
        const response = await fetch(EXCHANGE_API);
        const data = await response.json();
        
        if (data.rates) {
            exchangeRates = data.rates;
            lastUpdated = new Date(data.time_last_updated * 1000).toLocaleDateString();
            rateDateEl.textContent = `${translate('ratesUpdated')}: ${lastUpdated}`;
        } else {
            throw new Error('Invalid API response');
        }
    } catch (error) {
        console.error('Error fetching exchange rates:', error);
        resultEl.textContent = translate('rateError');
        
        // Fallback to hardcoded rates if API fails
        exchangeRates = {
            USD: 1,
            EUR: 0.85,
            GBP: 0.73,
            JPY: 110.25,
            AUD: 1.35,
            CAD: 1.25,
            CHF: 0.92,
            CNY: 6.45,
            INR: 75.50
        };
        rateDateEl.textContent = translate('offlineRates');
    }
}

// Fetch historical data for chart
async function loadHistoricalData() {
    const fromCurrency = fromCurrencyEl.value;
    const toCurrency = toCurrencyEl.value;
    
    if (!fromCurrency || !toCurrency) return;
    
    try {
        const endDate = new Date();
        const startDate = new Date();
        startDate.setMonth(endDate.getMonth() - 1);
        
        const response = await fetch(`${HISTORICAL_API}/${startDate.toISOString().split('T')[0]}..${endDate.toISOString().split('T')[0]}?from=${fromCurrency}&to=${toCurrency}`);
        const data = await response.json();
        
        if (data.rates) {
            renderChart(data, fromCurrency, toCurrency);
        }
    } catch (error) {
        console.error('Error fetching historical data:', error);
    }
}

// Render chart with Chart.js
function renderChart(data, fromCurrency, toCurrency) {
    const dates = Object.keys(data.rates).sort();
    const rates = dates.map(date => data.rates[date][toCurrency]);
    
    const ctx = chartEl.getContext('2d');
    
    if (window.historicalChart) {
        window.historicalChart.destroy();
    }
    
    window.historicalChart = new Chart(ctx, {
        type: 'line',
        data: {
            labels: dates.map(date => date.split('-').slice(1).join('-')),
            datasets: [{
                label: `${fromCurrency} to ${toCurrency}`,
                data: rates,
                borderColor: '#3498db',
                backgroundColor: 'rgba(52, 152, 219, 0.1)',
                tension: 0.4,
                fill: true
            }]
        },
        options: {
            responsive: true,
            plugins: {
                legend: {
                    position: 'top',
                },
                tooltip: {
                    callbacks: {
                        label: function(context) {
                            return `1 ${fromCurrency} = ${context.parsed.y.toFixed(4)} ${toCurrency}`;
                        }
                    }
                }
            },
            scales: {
                y: {
                    beginAtZero: false
                }
            }
        }
    });
}

// Fetch news articles
async function fetchNews() {
    try {
        // Note: NewsAPI requires a free API key from newsapi.org
        const response = await fetch(NEWS_API.replace('YOUR_NEWS_API_KEY', 'YOUR_ACTUAL_KEY'));
        const data = await response.json();
        
        if (data.articles) {
            renderNews(data.articles.slice(0, 3));
        }
    } catch (error) {
        console.error('Error fetching news:', error);
        newsFeedEl.innerHTML = `<p>${translate('newsError')}</p>`;
        
        // Fallback news
        const fallbackNews = [
            {
                title: translate('fallbackNews1Title'),
                description: translate('fallbackNews1Desc'),
                url: '#'
            },
            {
                title: translate('fallbackNews2Title'),
                description: translate('fallbackNews2Desc'),
                url: '#'
            }
        ];
        renderNews(fallbackNews);
    }
}

// Render news articles
function renderNews(articles) {
    newsFeedEl.innerHTML = articles.map(article => `
        <div class="news-item">
            <h4><a href="${article.url}" target="_blank">${article.title}</a></h4>
            <p>${article.description || ''}</p>
        </div>
    `).join('');
}

// Populate currency dropdowns
function populateCurrencyDropdowns() {
    const currencies = Object.keys(exchangeRates).sort();
    
    fromCurrencyEl.innerHTML = '';
    toCurrencyEl.innerHTML = '';
    
    currencies.forEach(currency => {
        const option1 = document.createElement('option');
        option1.value = currency;
        option1.textContent = currency;
        fromCurrencyEl.appendChild(option1);
        
        const option2 = document.createElement('option');
        option2.value = currency;
        option2.textContent = currency;
        toCurrencyEl.appendChild(option2);
    });
    
    // Select favorites if they exist
    if (favorites.length > 0) {
        fromCurrencyEl.value = favorites[0];
        if (favorites.length > 1) {
            toCurrencyEl.value = favorites[1];
        }
    }
}

// Calculate conversion
function calculate() {
    const amount = parseFloat(amountEl.value);
    const fromCurrency = fromCurrencyEl.value;
    const toCurrency = toCurrencyEl.value;
    
    if (isNaN(amount) || !fromCurrency || !toCurrency) return;
    
    const rate = exchangeRates[toCurrency] / exchangeRates[fromCurrency];
    const result = (amount * rate).toFixed(4);
    
    resultEl.textContent = `${amount} ${fromCurrency} = ${result} ${toCurrency}`;
    
    // Save to localStorage for offline use
    localStorage.setItem('lastConversion', JSON.stringify({
        amount, fromCurrency, toCurrency, rate, result
    }));
    
    // Update chart with new currencies
    loadHistoricalData();
}

// Update currency flags
function updateFlags() {
    const fromCurrency = fromCurrencyEl.value;
    const toCurrency = toCurrencyEl.value;
    
    fromFlagEl.textContent = getFlagEmoji(fromCurrency);
    toFlagEl.textContent = getFlagEmoji(toCurrency);
}

// Get flag emoji for currency code
function getFlagEmoji(currencyCode) {
    if (currencyCode.length !== 3) return '';
    
    // Special cases
    const specialFlags = {
        'EUR': '🇪🇺',
        'USD': '🇺🇸',
        'GBP': '🇬🇧',
        'JPY': '🇯🇵',
        'AUD': '🇦🇺',
        'CAD': '🇨🇦',
        'CHF': '🇨🇭',
        'CNY': '🇨🇳',
        'INR': '🇮🇳'
    };
    
    return specialFlags[currencyCode] || countryCodeToFlag(currencyCode.substring(0, 2));
}

// Convert country code to flag emoji
function countryCodeToFlag(countryCode) {
    if (!countryCode || countryCode.length !== 2) return '';
    
    const offset = 127397;
    const codePoints = [...countryCode.toUpperCase()].map(c => c.charCodeAt() + offset);
    return String.fromCodePoint(...codePoints);
}

// Toggle theme
function toggleTheme() {
    currentTheme = currentTheme === 'light' ? 'dark' : 'light';
    setTheme(currentTheme);
    localStorage.setItem('theme', currentTheme);
}

// Set theme
function setTheme(theme) {
    document.body.setAttribute('data-theme', theme);
    themeBtn.innerHTML = theme === 'dark' ? '<i class="fas fa-sun"></i>' : '<i class="fas fa-moon"></i>';
}

// Set language
function setLanguage(lang) {
    currentLanguage = lang;
    localStorage.setItem('language', lang);
    document.querySelectorAll('[data-i18n]').forEach(el => {
        const key = el.getAttribute('data-i18n');
        el.textContent = translate(key);
    });
}

// Simple translation function
function translate(key) {
    const translations = {
        en: {
            title: 'Currency Converter Pro',
            convert: 'Convert',
            favorites: 'Favorite Currencies',
            news: 'Currency News',
            ratesUpdated: 'Rates updated',
            rateError: 'Failed to load exchange rates. Using offline data.',
            offlineRates: 'Using offline exchange rates',
            newsError: 'Failed to load news',
            fallbackNews1Title: 'Global Currency Markets Update',
            fallbackNews1Desc: 'Major currencies show stability amid economic recovery',
            fallbackNews2Title: 'Digital Currency Trends',
            fallbackNews2Desc: 'Cryptocurrencies gaining traction in traditional markets'
        },
        es: {
            title: 'Convertidor de Moneda Pro',
            convert: 'Convertir',
            favorites: 'Monedas Favoritas',
            news: 'Noticias de Divisas',
            ratesUpdated: 'Tasas actualizadas',
            rateError: 'Error al cargar tasas. Usando datos offline.',
            offlineRates: 'Usando tasas de cambio offline',
            newsError: 'Error al cargar noticias',
            fallbackNews1Title: 'Actualización de Mercados Globales',
            fallbackNews1Desc: 'Las principales monedas muestran estabilidad durante la recuperación económica',
            fallbackNews2Title: 'Tendencias de Monedas Digitales',
            fallbackNews2Desc: 'Las criptomonedas ganan terreno en los mercados tradicionales'
        },
        fr: {
            title: 'Convertisseur de Devises Pro',
            convert: 'Convertir',
            favorites: 'Devises Favorites',
            news: 'Actualités des Devises',
            ratesUpdated: 'Taux mis à jour',
            rateError: 'Échec du chargement des taux. Utilisation des données hors ligne.',
            offlineRates: 'Utilisation des taux de change hors ligne',
            newsError: 'Échec du chargement des actualités',
            fallbackNews1Title: 'Mise à jour des Marchés Mondiaux',
            fallbackNews1Desc: 'Les principales devises montrent une stabilité pendant la reprise économique',
            fallbackNews2Title: 'Tendances des Devises Numériques',
            fallbackNews2Desc: 'Les cryptomonnaies gagnent du terrain sur les marchés traditionnels'
        },
        de: {
            title: 'Währungsrechner Pro',
            convert: 'Konvertieren',
            favorites: 'Favoriten Währungen',
            news: 'Währungsnachrichten',
            ratesUpdated: 'Wechselkurse aktualisiert',
            rateError: 'Fehler beim Laden der Wechselkurse. Offline-Daten werden verwendet.',
            offlineRates: 'Offline-Wechselkurse werden verwendet',
            newsError: 'Fehler beim Laden der Nachrichten',
            fallbackNews1Title: 'Update der globalen Währungsmärkte',
            fallbackNews1Desc: 'Hauptwährungen zeigen Stabilität in der wirtschaftlichen Erholung',
            fallbackNews2Title: 'Trends bei digitalen Währungen',
            fallbackNews2Desc: 'Kryptowährungen gewinnen an Bedeutung in traditionellen Märkten'
        }
    };
    
    return translations[currentLanguage]?.[key] || translations.en[key] || key;
}

// Favorite currency functions
function toggleFavorite(currencyElement) {
    const currencyType = currencyElement.getAttribute('data-currency');
    const currencyValue = currencyType === 'from' ? fromCurrencyEl.value : toCurrencyEl.value;
    
    const index = favorites.indexOf(currencyValue);
    
    if (index === -1) {
        favorites.push(currencyValue);
        currencyElement.innerHTML = '<i class="fas fa-star"></i>';
    } else {
        favorites.splice(index, 1);
        currencyElement.innerHTML = '<i class="far fa-star"></i>';
    }
    
    localStorage.setItem('favorites', JSON.stringify(favorites));
    renderFavorites();
}

function renderFavorites() {
    favoritesListEl.innerHTML = favorites.map(currency => `
        <div class="favorite-item">
            ${currency} ${getFlagEmoji(currency)}
            <i class="fas fa-times remove-favorite" data-currency="${currency}"></i>
        </div>
    `).join('');
    
    // Add event listeners to remove buttons
    document.querySelectorAll('.remove-favorite').forEach(btn => {
        btn.addEventListener('click', (e) => {
            e.stopPropagation();
            const currency = btn.getAttribute('data-currency');
            favorites = favorites.filter(fav => fav !== currency);
            localStorage.setItem('favorites', JSON.stringify(favorites));
            renderFavorites();
        });
    });
    
    // Add event listeners to favorite items
    document.querySelectorAll('.favorite-item').forEach(item => {
        item.addEventListener('click', (e) => {
            if (!e.target.classList.contains('remove-favorite')) {
                const currency = item.textContent.trim().split(' ')[0];
                fromCurrencyEl.value = currency;
                updateFlags();
                calculate();
            }
        });
    });
    
    // Update favorite buttons state
    document.querySelectorAll('.favorite-btn').forEach(btn => {
        const currencyType = btn.getAttribute('data-currency');
        const currencyValue = currencyType === 'from' ? fromCurrencyEl.value : toCurrencyEl.value;
        
        if (favorites.includes(currencyValue)) {
            btn.innerHTML = '<i class="fas fa-star"></i>';
        } else {
            btn.innerHTML = '<i class="far fa-star"></i>';
        }
    });
}

// Load last conversion from localStorage
function loadLastConversion() {
    const lastConversion = JSON.parse(localStorage.getItem('lastConversion'));
    if (lastConversion) {
        amountEl.value = lastConversion.amount;
        fromCurrencyEl.value = lastConversion.fromCurrency;
        toCurrencyEl.value = lastConversion.toCurrency;
        updateFlags();
    }
}

// Event Listeners
amountEl.addEventListener('input', calculate);
fromCurrencyEl.addEventListener('change', () => {
    calculate();
    updateFlags();
});
toCurrencyEl.addEventListener('change', () => {
    calculate();
    updateFlags();
});

swapBtn.addEventListener('click', () => {
    const temp = fromCurrencyEl.value;
    fromCurrencyEl.value = toCurrencyEl.value;
    toCurrencyEl.value = temp;
    calculate();
    updateFlags();
});

convertBtn.addEventListener('click', calculate);

themeBtn.addEventListener('click', toggleTheme);

languageSelect.addEventListener('change', (e) => {
    setLanguage(e.target.value);
});

document.querySelectorAll('.favorite-btn').forEach(btn => {
    btn.addEventListener('click', () => toggleFavorite(btn));
});

// Initialize the app
document.addEventListener('DOMContentLoaded', () => {
    init();
    loadLastConversion();
    
    // Register service worker for PWA functionality
    if ('serviceWorker' in navigator) {
        navigator.serviceWorker.register('sw.js').then(registration => {
            console.log('SW registered:', registration);
        }).catch(error => {
            console.log('SW registration failed:', error);
        });
    }
});

// Service Worker for offline functionality (sw.js - create this file)
// This is a basic service worker that caches important assets
self.addEventListener('install', (event) => {
    event.waitUntil(
        caches.open('currency-converter-v1').then((cache) => {
            return cache.addAll([
                '/',
                '/index.html',
                '/styles.css',
                '/script.js',
                'https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css',
                'https://cdn.jsdelivr.net/npm/chart.js',
                'https://cdnjs.cloudflare.com/ajax/libs/moment.js/2.29.1/moment.min.js'
            ]);
        })
    );
});

self.addEventListener('fetch', (event) => {
    event.respondWith(
        caches.match(event.request).then((response) => {
            return response || fetch(event.request);
        })
    );
});