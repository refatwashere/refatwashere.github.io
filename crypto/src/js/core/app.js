// Core Application Class
const RSI_ZONE_PLUGIN = {
  id: 'rsiZones',
  beforeDatasetsDraw(chart) {
    const enabled = chart?.options?.plugins?.rsiZones?.enabled;
    if (!enabled) return;
    const { ctx, chartArea, scales } = chart;
    if (!chartArea || !scales?.y) return;

    const yScale = scales.y;
    const y70 = yScale.getPixelForValue(70);
    const y30 = yScale.getPixelForValue(30);

    ctx.save();
    ctx.fillStyle = 'rgba(239, 83, 80, 0.08)';
    ctx.fillRect(chartArea.left, chartArea.top, chartArea.right - chartArea.left, y70 - chartArea.top);
    ctx.fillStyle = 'rgba(102, 187, 106, 0.08)';
    ctx.fillRect(chartArea.left, y30, chartArea.right - chartArea.left, chartArea.bottom - y30);
    ctx.restore();
  }
};

const LAST_PRICE_TAG_PLUGIN = {
  id: 'lastPriceTag',
  afterDatasetsDraw(chart, _args, pluginOptions) {
    const enabled = pluginOptions?.enabled;
    if (!enabled) return;
    const yScale = chart?.scales?.y;
    const chartArea = chart?.chartArea;
    if (!yScale || !chartArea) return;

    const rawPrice = pluginOptions?.lastPrice;
    if (!Number.isFinite(rawPrice)) return;

    const formatter = typeof pluginOptions?.formatter === 'function'
      ? pluginOptions.formatter
      : (value) => String(value);
    const text = formatter(rawPrice);
    const y = yScale.getPixelForValue(rawPrice);
    if (!Number.isFinite(y) || y < chartArea.top || y > chartArea.bottom) return;

    const color = pluginOptions?.color || '#66bb6a';
    const { ctx } = chart;
    const guideLength = 20;
    const tagPaddingX = 8;
    const tagPaddingY = 4;
    const tagHeight = 20;
    const cornerRadius = 4;
    const fontSize = 11;

    ctx.save();
    ctx.font = `600 ${fontSize}px Segoe UI`;
    const textWidth = ctx.measureText(text).width;
    const tagWidth = textWidth + (tagPaddingX * 2);
    const xGuideStart = chartArea.right - guideLength;
    const xTag = chartArea.right - tagWidth - 2;
    const yTag = y - (tagHeight / 2);

    ctx.strokeStyle = color;
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(xGuideStart, y);
    ctx.lineTo(chartArea.right, y);
    ctx.stroke();

    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.moveTo(xTag + cornerRadius, yTag);
    ctx.lineTo(xTag + tagWidth - cornerRadius, yTag);
    ctx.quadraticCurveTo(xTag + tagWidth, yTag, xTag + tagWidth, yTag + cornerRadius);
    ctx.lineTo(xTag + tagWidth, yTag + tagHeight - cornerRadius);
    ctx.quadraticCurveTo(xTag + tagWidth, yTag + tagHeight, xTag + tagWidth - cornerRadius, yTag + tagHeight);
    ctx.lineTo(xTag + cornerRadius, yTag + tagHeight);
    ctx.quadraticCurveTo(xTag, yTag + tagHeight, xTag, yTag + tagHeight - cornerRadius);
    ctx.lineTo(xTag, yTag + cornerRadius);
    ctx.quadraticCurveTo(xTag, yTag, xTag + cornerRadius, yTag);
    ctx.closePath();
    ctx.fill();

    ctx.fillStyle = '#ffffff';
    ctx.textBaseline = 'middle';
    ctx.fillText(text, xTag + tagPaddingX, y);
    ctx.restore();
  }
};

class CryptoApp {
  constructor() {
    this.SYMBOLS = ['BTCUSDT', 'ETHUSDT', 'BNBUSDT', 'SOLUSDT', 'XRPUSDT', 'ADAUSDT', 'DOGEUSDT', 'DOTUSDT', 'MATICUSDT', 'AVAXUSDT', 'LINKUSDT', 'UNIUSDT'];
    this.WS_URL = 'wss://stream.binance.com:9443/stream';
    this.API_URL = 'https://api.binance.com/api/v3';
    this.INTERVALS = {
      '1m': 60000, '5m': 300000, '10m': 600000, '15m': 900000,
      '30m': 1800000, '1h': 3600000, '4h': 14400000, '1d': 86400000
    };
    this.CRYPTO_NAMES = {
      'BTC': 'Bitcoin', 'ETH': 'Ethereum', 'BNB': 'Binance Coin', 'SOL': 'Solana',
      'XRP': 'Ripple', 'ADA': 'Cardano', 'DOGE': 'Dogecoin', 'DOT': 'Polkadot',
      'MATIC': 'Polygon', 'AVAX': 'Avalanche', 'LINK': 'Chainlink', 'UNI': 'Uniswap'
    };
    this.BINANCE_PRICE_DECIMALS = {
      BTCUSDT: 2,
      ETHUSDT: 2,
      BNBUSDT: 2,
      SOLUSDT: 2,
      XRPUSDT: 4,
      ADAUSDT: 4,
      DOGEUSDT: 5,
      DOTUSDT: 3,
      MATICUSDT: 4,
      AVAXUSDT: 2,
      LINKUSDT: 3,
      UNIUSDT: 3
    };
    
    this.state = {
      cryptoPrices: {},
      currentChartSymbol: 'BTCUSDT',
      currentInterval: '5m',
      showWatchlistOnly: false,
      currentTheme: this.getStorageItem('theme', 'dark'),
      sortedSymbols: [...this.SYMBOLS],
      tradingMode: 'spot',
      leverage: 10
    };
    
    this.data = {
      trades: this.loadData('cryptoTrades', []),
      alerts: this.loadData('priceAlerts', []),
      watchlist: this.loadData('watchlist', []),
      mockTrades: this.loadData('mockTrades', []),
      futuresPositions: this.loadData('futuresPositions', []),
      intervalData: {},
      settings: this.loadSettings()
    };

    this.lastFocusedElement = null;
    this.prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    this.chartFetchNonce = 0;
    this.chartIntervalDebounceTimer = null;
    this.lastChartDataWarningAt = 0;
    this.lastChartDataWarningMessage = '';
    this.orderSubmitInFlight = false;
    this.ws = null;
    this.lastWsTickAt = 0;
    this.chartSourceState = 'loading';
    this.chartFallbackRetryBudget = 3;
    this.chartFallbackRetryDelayMs = 2000;
    this.chartDegradedTimeoutMs = 12000;
    
    this.init();
  }
  
  getStorageItem(key, defaultValue) {
    try {
      const item = localStorage.getItem(key);
      return item !== null ? item : defaultValue;
    } catch (error) {
      console.error(`Storage read error for ${key}:`, error);
      return defaultValue;
    }
  }
  
  loadData(key, defaultValue) {
    try {
      const item = localStorage.getItem(key);
      return item ? JSON.parse(item) : defaultValue;
    } catch (error) {
      console.error(`Failed to load ${key}:`, error);
      return defaultValue;
    }
  }
  
  saveData(key, data) {
    try {
      localStorage.setItem(key, JSON.stringify(data));
    } catch (error) {
      console.error(`Failed to save ${key}:`, error);
      this.showNotification('Failed to save data');
    }
  }

  getBackendToken() {
    return (localStorage.getItem('backend_api_token') || '').trim();
  }

  getBackendRequestOptions(payload) {
    const headers = { 'Content-Type': 'application/json' };
    const backendToken = this.getBackendToken();
    if (backendToken) headers['X-API-Token'] = backendToken;
    return {
      method: 'POST',
      headers,
      body: JSON.stringify(payload)
    };
  }

  getApiErrorMessage(result, fallback = 'Request failed') {
    if (!result || typeof result !== 'object') return fallback;
    return result.message || result.error || fallback;
  }

  isSuccess(result) {
    if (!result || typeof result !== 'object') return false;
    return result.status === 'success' || result.success === true;
  }

  formatPriceAxisValue(value) {
    if (!Number.isFinite(value)) return '';
    if (Math.abs(value) >= 1000) {
      return value.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    }
    if (Math.abs(value) >= 1) {
      return value.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 4 });
    }
    const fixed = value.toFixed(6);
    return fixed.replace(/\.?0+$/, '');
  }

  getPriceScaleBounds(history, padRatio = 0.06) {
    if (!Array.isArray(history) || history.length === 0) return null;
    const lows = history.map((h) => Number(h.low)).filter(Number.isFinite);
    const highs = history.map((h) => Number(h.high)).filter(Number.isFinite);
    if (lows.length === 0 || highs.length === 0) return null;

    const rawMin = Math.min(...lows);
    const rawMax = Math.max(...highs);
    if (!Number.isFinite(rawMin) || !Number.isFinite(rawMax)) return null;

    let span = rawMax - rawMin;
    if (!Number.isFinite(span) || span <= 0) {
      span = Math.max(rawMax * 0.01, 1);
    }

    const pad = Math.max(span * padRatio, rawMax * 0.001);
    const min = Math.max(0, rawMin - pad);
    const max = rawMax + pad;
    return { min, max };
  }

  getBinancePriceDecimals(symbol, price) {
    const configured = this.BINANCE_PRICE_DECIMALS[symbol];
    if (Number.isInteger(configured)) return configured;
    if (!Number.isFinite(price)) return 2;
    if (price >= 1000) return 2;
    if (price >= 100) return 3;
    if (price >= 1) return 4;
    if (price >= 0.1) return 5;
    return 6;
  }

  formatLivePrice(symbol, price) {
    if (!Number.isFinite(price)) return '$--';
    const decimals = this.getBinancePriceDecimals(symbol, price);
    return `$${price.toLocaleString('en-US', {
      minimumFractionDigits: decimals,
      maximumFractionDigits: decimals
    })}`;
  }

  getChartRequestPayload(symbol, interval) {
    return {
      symbol: String(symbol || '').toUpperCase(),
      interval: String(interval || ''),
      limit: 100
    };
  }

  mapKlinesToIntervalData(klines) {
    if (!Array.isArray(klines)) return [];
    return klines
      .filter((k) => Array.isArray(k) && k.length >= 5)
      .map((k) => {
        const time = Number(k[0]);
        const open = Number(k[1]);
        const high = Number(k[2]);
        const low = Number(k[3]);
        const close = Number(k[4]);
        if (![time, open, high, low, close].every(Number.isFinite)) return null;
        return { time, open, high, low, close, price: close };
      })
      .filter(Boolean);
  }

  getFallbackIntervalData(symbol, interval) {
    const key = `${symbol}_${interval}`;
    const existing = this.data.intervalData[key];
    return Array.isArray(existing) && existing.length > 0 ? [...existing] : [];
  }

  async fetchWithTimeout(url, options, timeoutMs = 10000) {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), timeoutMs);
    try {
      return await fetch(url, { ...options, signal: controller.signal });
    } finally {
      clearTimeout(timeout);
    }
  }

  showChartDataWarning(message) {
    const now = Date.now();
    if (
      this.lastChartDataWarningMessage === message
      && (now - this.lastChartDataWarningAt) < 5000
    ) {
      return;
    }
    this.lastChartDataWarningMessage = message;
    this.lastChartDataWarningAt = now;
    this.showNotification(message);
  }

  setChartDataSourceState(state) {
    const badge = document.getElementById('chartDataSourceBadge');
    if (!badge) return;
    const stateMap = {
      loading: { text: 'Loading', className: 'source-loading' },
      proxy: { text: 'Proxy', className: 'source-proxy' },
      degraded: { text: 'Degraded', className: 'source-degraded' },
      fallback: { text: 'Fallback', className: 'source-fallback' },
      unavailable: { text: 'Unavailable', className: 'source-unavailable' }
    };
    const selected = stateMap[state] || stateMap.loading;
    badge.textContent = selected.text;
    badge.className = `chart-source-badge ${selected.className}`;
    this.chartSourceState = state in stateMap ? state : 'loading';
  }

  hasUsableIntervalData(symbol, interval, minPoints = 1) {
    const key = `${symbol}_${interval}`;
    const data = this.data.intervalData[key];
    return Array.isArray(data) && data.length >= minPoints;
  }

  isWebSocketLive(maxAgeMs = 15000) {
    const socketOpen = this.ws && this.ws.readyState === WebSocket.OPEN;
    const hasRecentTick = (Date.now() - this.lastWsTickAt) <= maxAgeMs;
    return Boolean(socketOpen && hasRecentTick);
  }

  async sleep(ms) {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  async waitForLiveFallback(symbol, interval, requestNonce) {
    const startedAt = Date.now();
    for (let attempt = 0; attempt < this.chartFallbackRetryBudget; attempt += 1) {
      await this.sleep(this.chartFallbackRetryDelayMs);
      if (requestNonce !== this.chartFetchNonce) return false;

      if (this.hasUsableIntervalData(symbol, interval, 1)) {
        return true;
      }
      if ((Date.now() - startedAt) >= this.chartDegradedTimeoutMs) {
        break;
      }
    }
    return false;
  }

  calculateEMA(closes, period) {
    if (!Array.isArray(closes) || closes.length === 0 || period <= 1) return [];
    const k = 2 / (period + 1);
    const ema = [];
    let emaPrev = null;

    closes.forEach((price, index) => {
      if (!Number.isFinite(price)) {
        ema.push(null);
        return;
      }
      if (index < period - 1) {
        ema.push(null);
        return;
      }
      if (index === period - 1) {
        const seedSlice = closes.slice(0, period).filter(Number.isFinite);
        if (seedSlice.length < period) {
          ema.push(null);
          return;
        }
        emaPrev = seedSlice.reduce((sum, v) => sum + v, 0) / period;
        ema.push(emaPrev);
        return;
      }
      emaPrev = (price * k) + (emaPrev * (1 - k));
      ema.push(emaPrev);
    });
    return ema;
  }

  calculateRSI(closes, period = 14) {
    if (!Array.isArray(closes) || closes.length <= period) {
      return closes.map(() => null);
    }

    const rsi = closes.map(() => null);
    let gainSum = 0;
    let lossSum = 0;

    for (let i = 1; i <= period; i += 1) {
      const change = closes[i] - closes[i - 1];
      gainSum += Math.max(change, 0);
      lossSum += Math.max(-change, 0);
    }

    let avgGain = gainSum / period;
    let avgLoss = lossSum / period;
    rsi[period] = avgLoss === 0 ? 100 : (100 - (100 / (1 + (avgGain / avgLoss))));

    for (let i = period + 1; i < closes.length; i += 1) {
      const change = closes[i] - closes[i - 1];
      const gain = Math.max(change, 0);
      const loss = Math.max(-change, 0);
      avgGain = ((avgGain * (period - 1)) + gain) / period;
      avgLoss = ((avgLoss * (period - 1)) + loss) / period;
      if (avgLoss === 0) {
        rsi[i] = 100;
      } else {
        const rs = avgGain / avgLoss;
        rsi[i] = 100 - (100 / (1 + rs));
      }
    }
    return rsi;
  }

  buildSignalSeries({ closes, emaFast, emaSlow, rsi }) {
    const bullishSignals = closes.map(() => null);
    const bearishSignals = closes.map(() => null);

    for (let i = 1; i < closes.length; i += 1) {
      const prevFast = emaFast[i - 1];
      const prevSlow = emaSlow[i - 1];
      const curFast = emaFast[i];
      const curSlow = emaSlow[i];
      const curRsi = rsi[i];
      const close = closes[i];

      if (![prevFast, prevSlow, curFast, curSlow, curRsi, close].every(Number.isFinite)) continue;

      const bullishCross = prevFast <= prevSlow && curFast > curSlow;
      const bearishCross = prevFast >= prevSlow && curFast < curSlow;

      if (bullishCross && curRsi >= 50 && curRsi <= 70) {
        bullishSignals[i] = close;
      } else if (bearishCross && curRsi >= 30 && curRsi <= 50) {
        bearishSignals[i] = close;
      }
    }

    return { bullishSignals, bearishSignals };
  }

  getApiCredentials() {
    return {
      apiKey: (localStorage.getItem('binance_api_key') || '').trim(),
      apiSecret: (localStorage.getItem('binance_api_secret') || '').trim(),
      useTestnet: localStorage.getItem('use_testnet') !== 'false',
      recvWindow: this.getTradingRecvWindow()
    };
  }

  getTradingRecvWindow() {
    const raw = (localStorage.getItem('binance_recv_window') || '').trim();
    if (!raw) return 5000;
    const value = Number(raw);
    if (!Number.isFinite(value)) return 5000;
    return Math.min(60000, Math.max(1, Math.round(value)));
  }

  buildTradingRequestPayload(extra = {}) {
    return { ...this.getApiCredentials(), ...extra };
  }

  generateClientOrderId(symbol = 'ORD') {
    const clean = String(symbol || 'ORD').replace(/[^A-Za-z0-9]/g, '').slice(0, 8) || 'ORD';
    const ts = Date.now();
    const rnd = Math.random().toString(36).slice(2, 8).toUpperCase();
    return `WEB_${clean}_${ts}_${rnd}`.slice(0, 36);
  }

  setOrderSubmitBusy(isBusy) {
    this.orderSubmitInFlight = isBusy;
    const btn = document.getElementById('orderSubmitBtn');
    if (btn) {
      btn.disabled = isBusy;
      btn.style.opacity = isBusy ? '0.7' : '1';
      btn.style.cursor = isBusy ? 'not-allowed' : 'pointer';
    }
  }

  isRecoverableOrderUnknown(result) {
    return Boolean(
      result
      && typeof result === 'object'
      && result.data
      && result.data.recoverable === true
      && result.data.clientOrderId
    );
  }

  async resolveUnknownOrderStatus(credentials, symbol, clientOrderId) {
    if (!symbol || !clientOrderId) return null;
    try {
      const response = await fetch(
        'backend/api.php?action=order-status',
        this.getBackendRequestOptions(this.buildTradingRequestPayload({
          ...credentials,
          symbol,
          origClientOrderId: clientOrderId
        }))
      );
      return await response.json();
    } catch (error) {
      console.error('Order status resolve error:', error);
      return null;
    }
  }
  
  loadSettings() {
    const defaults = {
      chartInterval: 5, maxDataPoints: 50, autoRefresh: true,
      pricePrecision: 2, binanceApiKey: '', binanceSecretKey: '', chartTimeframe: '5m'
    };
    return { ...defaults, ...this.loadData('appSettings', {}) };
  }
  
  init() {
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', () => this.initApp());
    } else {
      this.initApp();
    }
  }
  
  initApp() {
    console.log('Crypto App initializing...');
    this.setupUI();
    this.setupEventListeners();
    this.switchTab('market');
    this.connectWebSocket();
    this.initCharts();
    this.updateDisplay();
    this.initTradingTab();
    console.log('Crypto App initialized');
  }
  
  initTradingTab() {
    const symbolSelect = document.getElementById('orderSymbol');
    if (symbolSelect && symbolSelect.options.length === 1) {
      this.SYMBOLS.forEach(s => {
        const opt = document.createElement('option');
        opt.value = s;
        opt.textContent = s.replace('USDT', '/USDT');
        symbolSelect.appendChild(opt);
      });
    }
    
    const btn = document.getElementById('orderSubmitBtn');
    if (btn) btn.dataset.side = 'BUY';
    
    document.querySelectorAll('.mode-btn').forEach(btn => {
      btn.addEventListener('click', () => this.switchTradingMode(btn.dataset.mode));
    });
    
    document.getElementById('leverageSlider')?.addEventListener('input', (e) => {
      this.state.leverage = parseInt(e.target.value);
      document.getElementById('leverageValue').textContent = e.target.value;
    });
    
    this.updateBalanceDisplay();
    this.updatePositions();
    this.updateOrderHistory();
  }
  
  setupEventListeners() {
    const tabButtons = Array.from(document.querySelectorAll('.tab-btn'));
    tabButtons.forEach((btn, index) => {
      btn.addEventListener('click', () => this.switchTab(btn.dataset.tab));
      btn.addEventListener('keydown', (event) => {
        if (!['ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(event.key)) return;
        event.preventDefault();
        let nextIndex = index;
        if (event.key === 'ArrowRight') nextIndex = (index + 1) % tabButtons.length;
        if (event.key === 'ArrowLeft') nextIndex = (index - 1 + tabButtons.length) % tabButtons.length;
        if (event.key === 'Home') nextIndex = 0;
        if (event.key === 'End') nextIndex = tabButtons.length - 1;
        const nextBtn = tabButtons[nextIndex];
        nextBtn.focus();
        this.switchTab(nextBtn.dataset.tab);
      });
    });
    
    document.getElementById('themeToggle')?.addEventListener('click', () => this.toggleTheme());
    document.getElementById('settingsBtn')?.addEventListener('click', () => this.openModal('settingsModal'));
    document.getElementById('addTradeBtn')?.addEventListener('click', () => this.openModal('tradeModal'));
    document.getElementById('chartSymbolSelect')?.addEventListener('change', (e) => this.changeChartSymbol(e.target.value));
    document.getElementById('chartInterval')?.addEventListener('change', (e) => this.changeChartInterval(e.target.value));
    
    // Market controls
    document.getElementById('searchInput')?.addEventListener('input', () => this.updateDisplay());
    document.getElementById('sortSelect')?.addEventListener('change', (e) => this.sortCrypto(e.target.value));
    document.getElementById('watchlistToggle')?.addEventListener('click', () => this.toggleWatchlistFilter());
    
    // Trade form submission
    document.getElementById('tradeForm')?.addEventListener('submit', (e) => this.handleTradeSubmit(e));
    
    // Settings handlers
    document.getElementById('saveSettings')?.addEventListener('click', () => this.saveSettings());
    document.getElementById('clearSettings')?.addEventListener('click', () => this.clearSettings());
    
    // Modal close buttons
    document.querySelectorAll('.close').forEach(btn => {
      btn.addEventListener('click', (e) => this.closeModal(e.target.closest('.modal').id));
    });
    
    // Click outside modal to close
    document.querySelectorAll('.modal').forEach(modal => {
      modal.addEventListener('click', (e) => {
        if (e.target === modal) this.closeModal(modal.id);
      });
    });

    document.addEventListener('keydown', (event) => {
      if (event.key !== 'Escape') return;
      document.querySelectorAll('.modal').forEach((modal) => {
        if (modal.style.display === 'block') {
          this.closeModal(modal.id);
        }
      });
    });
  }
  
  setupUI() {
    document.body.setAttribute('data-theme', this.state.currentTheme);
    
    const themeToggle = document.getElementById('themeToggle');
    if (themeToggle) {
      themeToggle.textContent = this.state.currentTheme === 'dark' ? '\u{1F319} Dark' : '\u2600\uFE0F Light';
    }
    
    const symbolSelect = document.getElementById('chartSymbolSelect');
    if (symbolSelect) {
      symbolSelect.innerHTML = '';
      this.SYMBOLS.forEach(s => {
        const option = document.createElement('option');
        const name = s.replace('USDT', '');
        option.value = s;
        option.textContent = `${this.CRYPTO_NAMES[name] || name} (${name})`;
        symbolSelect.appendChild(option);
      });
    }
    
    // Initialize ticker
    this.updateTicker();
  }
  
  switchTab(tab) {
    document.querySelectorAll('.tab-btn').forEach((btn) => {
      const active = btn.dataset.tab === tab;
      btn.classList.toggle('active', active);
      btn.setAttribute('aria-selected', active ? 'true' : 'false');
      btn.setAttribute('tabindex', active ? '0' : '-1');
    });
    document.querySelectorAll('.tab-content').forEach((panel) => {
      const active = panel.id === `${tab}Tab`;
      panel.classList.toggle('active', active);
      panel.hidden = !active;
    });
    
    // Update content when switching tabs
    if (tab === 'journal') {
      this.updateTradesList();
      this.updateAnalytics();
    }
    if (tab === 'alerts') this.updateAlertsList();
    if (tab === 'trading') this.updateMockTrading();
  }
  
  toggleTheme() {
    this.state.currentTheme = this.state.currentTheme === 'dark' ? 'light' : 'dark';
    document.body.setAttribute('data-theme', this.state.currentTheme);
    localStorage.setItem('theme', this.state.currentTheme);
    document.getElementById('themeToggle').textContent = this.state.currentTheme === 'dark' ? '\u{1F319} Dark' : '\u2600\uFE0F Light';
  }
  
  showNotification(message) {
    const notification = document.createElement('div');
    notification.className = 'notification';
    notification.setAttribute('role', 'status');
    notification.setAttribute('aria-live', 'polite');
    notification.textContent = message;
    document.body.appendChild(notification);
    setTimeout(() => notification.remove(), 5000);
  }
  
  connectWebSocket() {
    try {
      const streams = this.SYMBOLS.map(s => `${s.toLowerCase()}@ticker`).join('/');
      const wsUrl = `${this.WS_URL}?streams=${streams}`;
      console.log('Connecting to WebSocket:', wsUrl);
      const ws = new WebSocket(wsUrl);
      this.ws = ws;
      
      ws.onopen = () => {
        this.lastWsTickAt = Date.now();
        console.log('WebSocket connected');
      };
      
      ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          if (data?.data?.s && data.data.c && data.data.P) {
            this.lastWsTickAt = Date.now();
            const ticker = data.data;
            const symbol = ticker.s;
            const price = parseFloat(ticker.c);
            const change = parseFloat(ticker.P);
            
            if (!isNaN(price) && !isNaN(change)) {
              this.state.cryptoPrices[symbol] = { price, change };
              this.updatePriceHistory(price, symbol);
              this.updateDisplay();
            }
          }
        } catch (error) {
          console.error('WebSocket message error:', error);
        }
      };
      
      ws.onerror = (error) => {
        console.error('WebSocket error:', error);
        this.showNotification('Connection error. Retrying...');
      };
      ws.onclose = () => {
        this.ws = null;
        setTimeout(() => this.connectWebSocket(), 3000);
      };
    } catch (error) {
      console.error('WebSocket connection failed:', error);
      setTimeout(() => this.connectWebSocket(), 5000);
    }
  }
  
  updatePriceHistory(price, symbol) {
    const now = new Date();
    const intervalMs = this.INTERVALS[this.state.currentInterval];
    const key = `${symbol}_${this.state.currentInterval}`;
    
    if (!this.data.intervalData[key]) this.data.intervalData[key] = [];
    
    const lastEntry = this.data.intervalData[key][this.data.intervalData[key].length - 1];
    const intervalStart = Math.floor(now.getTime() / intervalMs) * intervalMs;
    
    if (!lastEntry || lastEntry.time < intervalStart) {
      this.data.intervalData[key].push({ time: intervalStart, price, high: price, low: price, open: price, close: price });
    } else {
      lastEntry.close = price;
      lastEntry.high = Math.max(lastEntry.high, price);
      lastEntry.low = Math.min(lastEntry.low, price);
    }
    
    const maxDataPoints = this.data.settings?.maxDataPoints || 50;
    if (this.data.intervalData[key].length > maxDataPoints) {
      this.data.intervalData[key].shift();
    }
    
    if (symbol === this.state.currentChartSymbol) {
      this.updateChart();
      if (this.chartSourceState === 'degraded' || this.chartSourceState === 'loading') {
        this.setChartDataSourceState('fallback');
      }
    }
  }
  
  updateDisplay() {
    const grid = document.getElementById('cryptoGrid');
    if (!grid) return;
    
    const searchTerm = document.getElementById('searchInput')?.value.toLowerCase() || '';
    let symbols = this.state.sortedSymbols.filter(s => {
      const matches = s.toLowerCase().includes(searchTerm);
      const inWatchlist = !this.state.showWatchlistOnly || this.data.watchlist.includes(s);
      return matches && inWatchlist;
    });
    
    grid.innerHTML = '';
    symbols.forEach(symbol => {
      const data = this.state.cryptoPrices[symbol];
      if (data) {
        const card = this.createCryptoCard(symbol, data);
        grid.appendChild(card);
      }
    });
    this.updateTicker();
  }
  
  sortCrypto(sortBy) {
    if (sortBy === 'rank') {
      this.state.sortedSymbols = [...this.SYMBOLS];
    } else {
      const entries = Object.entries(this.state.cryptoPrices).filter(([s]) => this.SYMBOLS.includes(s));
      if (sortBy === 'price') {
        entries.sort((a, b) => b[1].price - a[1].price);
      } else if (sortBy === 'change') {
        entries.sort((a, b) => b[1].change - a[1].change);
      }
      this.state.sortedSymbols = entries.map(e => e[0]);
    }
    this.updateDisplay();
  }
  
  toggleWatchlistFilter() {
    this.state.showWatchlistOnly = !this.state.showWatchlistOnly;
    const btn = document.getElementById('watchlistToggle');
    if (btn) btn.textContent = this.state.showWatchlistOnly ? '\u{1F4CA} Show All' : '\u2B50 Watchlist Only';
    this.updateDisplay();
  }
  
  createCryptoCard(symbol, data) {
    const card = document.createElement('div');
    card.className = 'crypto-card';
    
    const btn = document.createElement('button');
    btn.className = 'watchlist-star';
    const isWatched = this.data.watchlist.includes(symbol);
    btn.style.color = isWatched ? '#ffd700' : '#666';
    btn.textContent = isWatched ? '\u2605' : '\u2606';
    btn.onclick = () => this.toggleWatchlist(symbol);
    
    const h3 = document.createElement('h3');
    h3.style.cssText = 'color: #ffd700; margin-bottom: 10px;';
    h3.textContent = symbol.replace('USDT', '/USDT');
    
    const price = document.createElement('div');
    price.style.cssText = 'font-size: 2em; margin: 10px 0;';
    price.textContent = this.formatLivePrice(symbol, data.price);
    
    const change = document.createElement('div');
    change.className = data.change >= 0 ? 'positive' : 'negative';
    change.style.fontSize = '1.1em';
    change.textContent = `${data.change >= 0 ? '+' : ''}${data.change.toFixed(2)}%`;
    
    card.append(btn, h3, price, change);
    return card;
  }
  
  updateTicker() {
    const ticker = document.getElementById('tickerWrapper');
    if (!ticker) return;
    
    const fragment = document.createDocumentFragment();
    this.SYMBOLS.forEach(symbol => {
      const data = this.state.cryptoPrices[symbol];
      if (data) {
        const item = document.createElement('div');
        item.className = 'ticker-item';
        
        const nameSpan = document.createElement('span');
        nameSpan.style.fontWeight = 'bold';
        nameSpan.textContent = symbol.replace('USDT', '');
        
        const priceSpan = document.createElement('span');
        priceSpan.style.margin = '0 10px';
        priceSpan.textContent = this.formatLivePrice(symbol, data.price);
        
        const changeSpan = document.createElement('span');
        changeSpan.className = data.change >= 0 ? 'positive' : 'negative';
        changeSpan.textContent = `${data.change >= 0 ? '+' : ''}${data.change.toFixed(2)}%`;
        
        item.append(nameSpan, priceSpan, changeSpan);
        fragment.appendChild(item);
      }
    });
    ticker.innerHTML = '';
    ticker.appendChild(fragment.cloneNode(true));
    ticker.appendChild(fragment);
  }
  
  initCharts() {
    const priceCanvas = document.getElementById('priceChart');
    const rsiCanvas = document.getElementById('rsiChart');
    if (!priceCanvas || !rsiCanvas) {
      console.error('Chart canvas not found');
      return;
    }
    
    try {
      if (typeof Chart !== 'undefined' && !Chart.registry.plugins.get('rsiZones')) {
        Chart.register(RSI_ZONE_PLUGIN);
      }
      if (typeof Chart !== 'undefined' && !Chart.registry.plugins.get('lastPriceTag')) {
        Chart.register(LAST_PRICE_TAG_PLUGIN);
      }

      this.priceChart = new Chart(priceCanvas.getContext('2d'), {
        type: 'bar',
        data: {
          labels: [],
          datasets: [
            {
              type: 'bar',
              label: 'Wick',
              data: [],
              backgroundColor: [],
              borderSkipped: false,
              borderRadius: 0,
              barPercentage: 0.2,
              categoryPercentage: 0.9
            },
            {
              type: 'bar',
              label: 'Candle Body',
              data: [],
              backgroundColor: [],
              borderSkipped: false,
              borderRadius: 1,
              barPercentage: 0.65,
              categoryPercentage: 0.9
            },
            {
              type: 'line',
              label: 'EMA 9',
              data: [],
              borderColor: '#00d4ff',
              borderWidth: 2.4,
              pointRadius: 0,
              pointHoverRadius: 0,
              tension: 0.2
            },
            {
              type: 'line',
              label: 'EMA 21',
              data: [],
              borderColor: '#ffd166',
              borderWidth: 2.4,
              pointRadius: 0,
              pointHoverRadius: 0,
              tension: 0.2
            },
            {
              type: 'line',
              label: 'Bullish Signal',
              data: [],
              borderColor: '#66bb6a',
              backgroundColor: '#66bb6a',
              showLine: false,
              pointRadius: 5.5,
              pointHoverRadius: 7,
              pointStyle: 'triangle',
              pointRotation: 0
            },
            {
              type: 'line',
              label: 'Bearish Signal',
              data: [],
              borderColor: '#ef5350',
              backgroundColor: '#ef5350',
              showLine: false,
              pointRadius: 5.5,
              pointHoverRadius: 7,
              pointStyle: 'triangle',
              pointRotation: 180
            }
          ]
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          animation: this.prefersReducedMotion ? false : { duration: 250 },
          interaction: {
            mode: 'index',
            intersect: false
          },
          plugins: {
            legend: {
              labels: {
                color: '#dbe7ff',
                boxWidth: 10,
                boxHeight: 10,
                usePointStyle: true,
                pointStyle: 'line',
                filter: (legendItem) => !['Wick', 'Candle Body'].includes(legendItem.text)
              }
            },
            tooltip: {
              backgroundColor: 'rgba(12, 16, 26, 0.96)',
              borderColor: 'rgba(95, 120, 166, 0.45)',
              borderWidth: 1,
              titleColor: '#f3f7ff',
              bodyColor: '#d3ddf5',
              callbacks: {
                label: (ctx) => {
                  const label = ctx.dataset?.label || 'Value';
                  const raw = ctx.raw;
                  if (Array.isArray(raw) && raw.length === 2) {
                    const low = Number(raw[0]);
                    const high = Number(raw[1]);
                    if (Number.isFinite(low) && Number.isFinite(high)) {
                      return `${label}: ${this.formatPriceAxisValue(low)} - ${this.formatPriceAxisValue(high)}`;
                    }
                  }
                  const parsed = Number(ctx.parsed?.y);
                  if (Number.isFinite(parsed)) {
                    return `${label}: ${this.formatPriceAxisValue(parsed)}`;
                  }
                  return label;
                }
              }
            },
            lastPriceTag: {
              enabled: true,
              lastPrice: null,
              color: '#66bb6a',
              formatter: (value) => this.formatPriceAxisValue(value)
            }
          },
          scales: {
            x: {
              ticks: {
                color: '#9ba9c6',
                maxTicksLimit: 10
              },
              grid: { color: 'rgba(118, 139, 173, 0.14)' }
            },
            y: {
              position: 'right',
              ticks: {
                color: '#9ba9c6',
                maxTicksLimit: 8,
                callback: (value) => this.formatPriceAxisValue(Number(value))
              },
              grid: { color: 'rgba(118, 139, 173, 0.14)' }
            }
          }
        }
      });

      this.rsiChart = new Chart(rsiCanvas.getContext('2d'), {
        type: 'line',
        data: {
          labels: [],
          datasets: [
            {
              label: 'RSI (14)',
              data: [],
              borderColor: '#b794f4',
              backgroundColor: 'rgba(183, 148, 244, 0.12)',
              borderWidth: 2.2,
              pointRadius: 0,
              fill: true,
              tension: 0.2
            },
            {
              label: 'RSI 70',
              data: [],
              borderColor: 'rgba(239, 83, 80, 0.8)',
              borderWidth: 1,
              borderDash: [6, 6],
              pointRadius: 0,
              tension: 0
            },
            {
              label: 'RSI 30',
              data: [],
              borderColor: 'rgba(102, 187, 106, 0.8)',
              borderWidth: 1,
              borderDash: [6, 6],
              pointRadius: 0,
              tension: 0
            }
          ]
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          animation: this.prefersReducedMotion ? false : { duration: 250 },
          interaction: {
            mode: 'index',
            intersect: false
          },
          plugins: {
            legend: { labels: { color: '#dbe7ff', boxWidth: 10, boxHeight: 10 } },
            rsiZones: { enabled: true },
            tooltip: {
              backgroundColor: 'rgba(12, 16, 26, 0.96)',
              borderColor: 'rgba(95, 120, 166, 0.45)',
              borderWidth: 1,
              titleColor: '#f3f7ff',
              bodyColor: '#d3ddf5'
            }
          },
          scales: {
            x: {
              ticks: {
                color: '#9ba9c6',
                maxTicksLimit: 10
              },
              grid: { color: 'rgba(118, 139, 173, 0.14)' }
            },
            y: {
              min: 0,
              max: 100,
              ticks: { color: '#9ba9c6', stepSize: 10 },
              grid: { color: 'rgba(118, 139, 173, 0.14)' }
            }
          }
        }
      });
      
      // Add some initial demo data
      this.addDemoData();
    } catch (error) {
      console.error('Chart initialization failed:', error);
    }
  }
  
  updateChart() {
    if (!this.priceChart || !this.rsiChart) return;
    const key = `${this.state.currentChartSymbol}_${this.state.currentInterval}`;
    const history = this.data.intervalData[key] || [];
    const rsiStatus = document.getElementById('rsiStatus');
    if (history.length === 0) {
      this.priceChart.data.labels = [];
      this.rsiChart.data.labels = [];
      this.priceChart.data.datasets.forEach((dataset) => { dataset.data = []; });
      this.rsiChart.data.datasets.forEach((dataset) => { dataset.data = []; });
      delete this.priceChart.options.scales.y.min;
      delete this.priceChart.options.scales.y.max;
      this.priceChart.options.plugins.lastPriceTag.lastPrice = null;
      this.priceChart.update('none');
      this.rsiChart.update('none');
      if (rsiStatus) rsiStatus.hidden = true;
      return;
    }
    
    const formatTime = (timestamp) => {
      const date = new Date(timestamp);
      if (this.state.currentInterval === '1d') {
        return date.toLocaleDateString();
      } else if (['4h', '1h'].includes(this.state.currentInterval)) {
        return date.toLocaleString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
      } else {
        return date.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
      }
    };

    const labels = history.map((h) => formatTime(h.time));
    const closes = history.map((h) => Number(h.close));
    const emaFast = this.calculateEMA(closes, 9);
    const emaSlow = this.calculateEMA(closes, 21);
    const rsi = this.calculateRSI(closes, 14);
    const { bullishSignals, bearishSignals } = this.buildSignalSeries({
      closes,
      emaFast,
      emaSlow,
      rsi
    });

    const wickData = history.map((h) => [Math.min(h.low, h.high), Math.max(h.low, h.high)]);
    const bodyData = history.map((h) => [Math.min(h.open, h.close), Math.max(h.open, h.close)]);
    const candleColors = history.map((h) => (h.close >= h.open ? '#66bb6a' : '#ef5350'));

    this.priceChart.data.labels = labels;
    this.priceChart.data.datasets[0].data = wickData;
    this.priceChart.data.datasets[0].backgroundColor = candleColors;
    this.priceChart.data.datasets[1].data = bodyData;
    this.priceChart.data.datasets[1].backgroundColor = candleColors;
    this.priceChart.data.datasets[2].data = emaFast;
    this.priceChart.data.datasets[3].data = emaSlow;
    this.priceChart.data.datasets[4].data = bullishSignals;
    this.priceChart.data.datasets[5].data = bearishSignals;

    const priceBounds = this.getPriceScaleBounds(history, 0.06);
    if (priceBounds) {
      this.priceChart.options.scales.y.min = priceBounds.min;
      this.priceChart.options.scales.y.max = priceBounds.max;
    } else {
      delete this.priceChart.options.scales.y.min;
      delete this.priceChart.options.scales.y.max;
    }

    const lastCandle = history[history.length - 1];
    const lastPrice = Number(lastCandle?.close);
    const isUpCandle = Number(lastCandle?.close) >= Number(lastCandle?.open);
    this.priceChart.options.plugins.lastPriceTag.lastPrice = Number.isFinite(lastPrice) ? lastPrice : null;
    this.priceChart.options.plugins.lastPriceTag.color = isUpCandle ? '#66bb6a' : '#ef5350';

    this.rsiChart.data.labels = labels;
    this.rsiChart.data.datasets[0].data = rsi;
    this.rsiChart.data.datasets[1].data = labels.map(() => 70);
    this.rsiChart.data.datasets[2].data = labels.map(() => 30);

    const hasRsiData = rsi.some((point) => Number.isFinite(point));
    if (rsiStatus) {
      rsiStatus.hidden = hasRsiData;
      if (!hasRsiData) {
        const requiredCandles = 15;
        const haveCandles = history.length;
        rsiStatus.textContent = `RSI(14) warming up (${haveCandles}/${requiredCandles} candles).`;
      }
    }

    const updateMode = this.prefersReducedMotion ? 'none' : undefined;
    this.priceChart.update(updateMode);
    this.rsiChart.update(updateMode);
  }
  
  changeChartSymbol(symbol) {
    this.state.currentChartSymbol = symbol;
    this.updateChartTitle();
    if (this.chartIntervalDebounceTimer) {
      clearTimeout(this.chartIntervalDebounceTimer);
      this.chartIntervalDebounceTimer = null;
    }
    this.fetchRealData(symbol, this.state.currentInterval);
  }
  
  changeChartInterval(interval) {
    this.state.currentInterval = interval;
    this.updateChartTitle();
    if (this.chartIntervalDebounceTimer) {
      clearTimeout(this.chartIntervalDebounceTimer);
    }
    this.chartIntervalDebounceTimer = setTimeout(() => {
      this.fetchRealData(this.state.currentChartSymbol, interval);
    }, 120);
  }
  
  updateChartTitle() {
    document.getElementById('chartTitle').textContent = `${this.state.currentChartSymbol.replace('USDT', '/USDT')} Price Chart (${this.state.currentInterval})`;
  }
  
  toggleWatchlist(symbol) {
    const index = this.data.watchlist.indexOf(symbol);
    if (index > -1) {
      this.data.watchlist.splice(index, 1);
    } else {
      this.data.watchlist.push(symbol);
    }
    this.saveData('watchlist', this.data.watchlist);
    this.updateDisplay();
  }
  
  openModal(modalId) {
    const modal = document.getElementById(modalId);
    if (!modal) return;
    this.lastFocusedElement = document.activeElement;
    modal.style.display = 'block';
    modal.setAttribute('aria-hidden', 'false');
    const focusTarget = modal.querySelector('input, select, textarea, button');
    if (focusTarget) focusTarget.focus();
    if (modalId === 'settingsModal') this.loadApiSettingsForm();
  }
  
  closeModal(modalId) {
    const modal = document.getElementById(modalId);
    if (!modal) return;
    modal.style.display = 'none';
    modal.setAttribute('aria-hidden', 'true');
    if (this.lastFocusedElement && typeof this.lastFocusedElement.focus === 'function') {
      this.lastFocusedElement.focus();
    }
  }
  
  handleTradeSubmit(e) {
    e.preventDefault();
    const form = e.target;
    const trade = {
      id: Date.now(),
      symbol: form.tradeSymbol.value,
      type: form.tradeType.value,
      amount: parseFloat(form.tradeAmount.value),
      price: parseFloat(form.tradePrice.value),
      date: form.tradeDate.value,
      notes: form.tradeNotes.value
    };
    
    this.data.trades.push(trade);
    this.saveData('cryptoTrades', this.data.trades);
    this.updateTradesList();
    this.updateAnalytics();
    this.closeModal('tradeModal');
    form.reset();
    this.showNotification('Trade added successfully!');
  }
  
  updateTradesList() {
    const container = document.getElementById('tradesList');
    if (!container) return;
    
    if (this.data.trades.length === 0) {
      container.innerHTML = '<p style="text-align: center; color: var(--text-secondary); margin: 40px 0;">No trades recorded yet. Click "+ Add Trade" to get started.</p>';
      return;
    }
    
    container.innerHTML = '';
    this.data.trades.forEach(trade => {
      const item = this.createTradeItem(trade);
      container.appendChild(item);
    });
  }
  
  createTradeItem(trade) {
    const item = document.createElement('div');
    item.className = 'trade-item';
    item.style.cssText = 'background: var(--bg-card); padding: 15px; border-radius: 10px; margin-bottom: 10px;';
    
    const wrapper = document.createElement('div');
    wrapper.style.cssText = 'display: flex; justify-content: space-between; align-items: center;';
    
    const left = document.createElement('div');
    const symbol = document.createElement('strong');
    symbol.textContent = `${trade.symbol} - ${trade.type.toUpperCase()}`;
    const details = document.createElement('div');
    details.style.cssText = 'color: var(--text-secondary); font-size: 0.9em;';
    details.textContent = `${trade.amount} @ $${trade.price} = $${(trade.amount * trade.price).toFixed(2)}`;
    left.append(symbol, details);
    
    const right = document.createElement('div');
    right.style.textAlign = 'right';
    const date = document.createElement('div');
    date.textContent = new Date(trade.date).toLocaleDateString();
    const btn = document.createElement('button');
    btn.textContent = 'Delete';
    btn.style.cssText = 'background: var(--negative); border: none; padding: 5px 10px; border-radius: 5px; color: white; cursor: pointer;';
    btn.onclick = () => this.deleteTrade(trade.id);
    right.append(date, btn);
    
    wrapper.append(left, right);
    item.appendChild(wrapper);
    
    if (trade.notes) {
      const notes = document.createElement('div');
      notes.style.cssText = 'margin-top: 10px; font-style: italic; color: var(--text-secondary);';
      notes.textContent = trade.notes;
      item.appendChild(notes);
    }
    
    return item;
  }
  
  deleteTrade(id) {
    this.data.trades = this.data.trades.filter(t => t.id !== id);
    this.saveData('cryptoTrades', this.data.trades);
    this.updateTradesList();
    this.updateAnalytics();
    this.showNotification('Trade deleted');
  }
  
  updateAnalytics() {
    const container = document.getElementById('analytics');
    if (!container || this.data.trades.length === 0) {
      if (container) container.innerHTML = '';
      return;
    }
    
    const totalTrades = this.data.trades.length;
    const totalValue = this.data.trades.reduce((sum, t) => sum + (t.amount * t.price), 0);
    const buyTrades = this.data.trades.filter(t => t.type === 'buy').length;
    const sellTrades = totalTrades - buyTrades;
    const recentWindowStart = Date.now() - (30 * 24 * 60 * 60 * 1000);

    const recentJournalTrades = this.data.trades.filter(t => {
      const ts = new Date(t.date).getTime();
      return Number.isFinite(ts) && ts >= recentWindowStart;
    });

    const signedJournalValues = recentJournalTrades.map((t) => {
      const signed = (t.type === 'sell' ? 1 : -1) * (t.amount * t.price);
      return Number.isFinite(signed) ? signed : 0;
    });

    const recentMockTrades = (this.data.mockTrades || []).filter(t => (t.time || t.closeTime || 0) >= recentWindowStart);
    const realizedPnlEvents = recentMockTrades
      .map(t => Number(t.closePnl))
      .filter(v => Number.isFinite(v));

    const periodPnl = signedJournalValues.reduce((sum, v) => sum + v, 0) + realizedPnlEvents.reduce((sum, v) => sum + v, 0);
    const feeTotal = [...recentJournalTrades, ...recentMockTrades].reduce((sum, t) => sum + (Number(t.fees || t.fee || 0) || 0), 0);
    const wins = realizedPnlEvents.filter(v => v > 0).length;
    const losses = realizedPnlEvents.filter(v => v < 0).length;
    const winRate = (wins + losses) > 0 ? (wins / (wins + losses)) * 100 : 0;
    
    container.innerHTML = `
      <div style="background: var(--bg-card); padding: 20px; border-radius: 10px; margin-top: 20px;">
        <h3>Analytics</h3>
        <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(150px, 1fr)); gap: 15px; margin-top: 15px;">
          <div><strong>Total Trades:</strong> ${totalTrades}</div>
          <div><strong>Buy Orders:</strong> ${buyTrades}</div>
          <div><strong>Sell Orders:</strong> ${sellTrades}</div>
          <div><strong>Total Value:</strong> $${totalValue.toFixed(2)}</div>
          <div><strong>30d P/L:</strong> <span style="color:${periodPnl >= 0 ? 'var(--positive)' : 'var(--negative)'}">${periodPnl >= 0 ? '+' : ''}$${periodPnl.toFixed(2)}</span></div>
          <div><strong>30d Win Rate:</strong> ${winRate.toFixed(2)}%</div>
          <div><strong>30d Fees:</strong> $${feeTotal.toFixed(2)}</div>
        </div>
      </div>
    `;
  }
  
  updateAlertsList() {
    const container = document.getElementById('alertsList');
    if (!container) return;
    
    container.innerHTML = '';
    
    const form = document.createElement('div');
    form.style.cssText = 'background: var(--bg-card); padding: 20px; border-radius: 10px; margin-bottom: 20px;';
    
    const h3 = document.createElement('h3');
    h3.textContent = 'Create Price Alert';
    
    const controls = document.createElement('div');
    controls.style.cssText = 'display: flex; gap: 10px; margin-top: 15px; flex-wrap: wrap;';
    
    const symbolSelect = document.createElement('select');
    symbolSelect.id = 'alertSymbol';
    symbolSelect.style.cssText = 'padding: 8px; background: rgba(0,0,0,0.3); border: 1px solid var(--border); border-radius: 5px; color: var(--text-primary);';
    this.SYMBOLS.forEach(s => {
      const opt = document.createElement('option');
      opt.value = s;
      opt.textContent = s.replace('USDT', '');
      symbolSelect.appendChild(opt);
    });
    
    const priceInput = document.createElement('input');
    priceInput.type = 'number';
    priceInput.id = 'alertPrice';
    priceInput.placeholder = 'Target Price';
    priceInput.step = '0.01';
    priceInput.style.cssText = 'padding: 8px; background: rgba(0,0,0,0.3); border: 1px solid var(--border); border-radius: 5px; color: var(--text-primary);';
    
    const typeSelect = document.createElement('select');
    typeSelect.id = 'alertType';
    typeSelect.style.cssText = 'padding: 8px; background: rgba(0,0,0,0.3); border: 1px solid var(--border); border-radius: 5px; color: var(--text-primary);';
    ['above', 'below'].forEach(t => {
      const opt = document.createElement('option');
      opt.value = t;
      opt.textContent = t.charAt(0).toUpperCase() + t.slice(1);
      typeSelect.appendChild(opt);
    });
    
    const btn = document.createElement('button');
    btn.className = 'btn-small';
    btn.textContent = 'Add Alert';
    btn.onclick = () => this.addAlert();
    
    controls.append(symbolSelect, priceInput, typeSelect, btn);
    form.append(h3, controls);
    
    const activeAlerts = document.createElement('div');
    activeAlerts.id = 'activeAlerts';
    this.renderAlerts(activeAlerts);
    
    container.append(form, activeAlerts);
  }
  
  renderAlerts(container) {
    if (this.data.alerts.length === 0) {
      const p = document.createElement('p');
      p.style.cssText = 'text-align: center; color: var(--text-secondary); margin: 40px 0;';
      p.textContent = 'No active alerts. Create one above.';
      container.appendChild(p);
      return;
    }
    
    this.data.alerts.forEach(alert => {
      const item = document.createElement('div');
      item.className = 'alert-item';
      item.style.cssText = 'background: var(--bg-card); padding: 15px; border-radius: 10px; margin-bottom: 10px;';
      
      const wrapper = document.createElement('div');
      wrapper.style.cssText = 'display: flex; justify-content: space-between; align-items: center;';
      
      const left = document.createElement('div');
      const title = document.createElement('strong');
      title.textContent = `${alert.symbol.replace('USDT', '')} ${alert.type} $${alert.price}`;
      const date = document.createElement('div');
      date.style.cssText = 'color: var(--text-secondary); font-size: 0.9em;';
      date.textContent = `Created: ${new Date(alert.created).toLocaleDateString()}`;
      left.append(title, date);
      
      const btn = document.createElement('button');
      btn.textContent = 'Delete';
      btn.style.cssText = 'background: var(--negative); border: none; padding: 5px 10px; border-radius: 5px; color: white; cursor: pointer;';
      btn.onclick = () => this.deleteAlert(alert.id);
      
      wrapper.append(left, btn);
      item.appendChild(wrapper);
      container.appendChild(item);
    });
  }
  
  addAlert() {
    const symbol = document.getElementById('alertSymbol').value;
    const price = parseFloat(document.getElementById('alertPrice').value);
    const type = document.getElementById('alertType').value;
    
    if (!price) {
      this.showNotification('Please enter a valid price');
      return;
    }
    
    const alert = {
      id: Date.now(),
      symbol,
      price,
      type,
      created: Date.now()
    };
    
    this.data.alerts.push(alert);
    this.saveData('priceAlerts', this.data.alerts);
    this.updateAlertsList();
    this.showNotification('Alert created!');
  }
  
  deleteAlert(id) {
    this.data.alerts = this.data.alerts.filter(a => a.id !== id);
    this.saveData('priceAlerts', this.data.alerts);
    this.updateAlertsList();
    this.showNotification('Alert deleted');
  }
  
  async updateMockTrading() {
    console.log('Updating trading tab...');
    await this.updateBalanceDisplay();
    await this.updatePositions();
    await this.updateOpenOrders();
    this.updateOrderHistory();
    this.setupTradingEventListeners();
  }
  
  setupTradingEventListeners() {
    const orderForm = document.getElementById('orderForm');
    if (!orderForm || orderForm.dataset.initialized) return;
    
    orderForm.dataset.initialized = 'true';
    
    document.querySelectorAll('.order-tab').forEach(btn => {
      btn.addEventListener('click', () => this.switchOrderType(btn.dataset.orderType));
    });
    
    document.getElementById('orderPrice')?.addEventListener('input', () => this.updateOrderTotal());
    document.getElementById('orderQuantity')?.addEventListener('input', () => this.updateOrderTotal());
    document.getElementById('orderType')?.addEventListener('change', (e) => this.togglePriceInput(e.target.value));
    
    orderForm.addEventListener('submit', (e) => this.handleOrderSubmit(e));
    document.getElementById('refreshOrders')?.addEventListener('click', () => this.refreshOrders());
  }
  
  switchTradingMode(mode) {
    this.state.tradingMode = mode;
    document.querySelectorAll('.mode-btn').forEach(b => b.classList.remove('active'));
    document.querySelector(`[data-mode="${mode}"]`).classList.add('active');
    
    const leverageControl = document.getElementById('leverageControl');
    const tpslControls = document.getElementById('tpslControls');
    const positionsTitle = document.getElementById('positionsTitle');
    
    if (mode === 'futures') {
      leverageControl.style.display = 'block';
      tpslControls.style.display = 'flex';
      positionsTitle.textContent = 'Open Positions';
      document.querySelector('[data-order-type="buy"]').textContent = 'Long';
      document.querySelector('[data-order-type="sell"]').textContent = 'Short';
    } else {
      leverageControl.style.display = 'none';
      tpslControls.style.display = 'none';
      positionsTitle.textContent = 'Portfolio';
      document.querySelector('[data-order-type="buy"]').textContent = 'Buy';
      document.querySelector('[data-order-type="sell"]').textContent = 'Sell';
    }
    
    this.updatePositions();
    this.updateBalanceDisplay();
  }
  
  switchOrderType(type) {
    document.querySelectorAll('.order-tab').forEach(t => t.classList.remove('active'));
    document.querySelector(`[data-order-type="${type}"]`).classList.add('active');
    
    const btn = document.getElementById('orderSubmitBtn');
    const isFutures = this.state.tradingMode === 'futures';
    btn.textContent = type === 'buy' ? (isFutures ? 'Long' : 'Buy') : (isFutures ? 'Short' : 'Sell');
    btn.className = type === 'buy' ? 'btn btn-buy' : 'btn btn-sell';
    btn.dataset.side = type.toUpperCase();
  }
  
  togglePriceInput(orderType) {
    const priceInput = document.getElementById('orderPrice');
    if (orderType === 'MARKET') {
      priceInput.disabled = true;
      priceInput.placeholder = 'Market Price';
    } else {
      priceInput.disabled = false;
      priceInput.placeholder = 'Price (USDT)';
    }
    this.updateOrderTotal();
  }
  
  updateOrderTotal() {
    const price = parseFloat(document.getElementById('orderPrice')?.value) || 0;
    const quantity = parseFloat(document.getElementById('orderQuantity')?.value) || 0;
    const total = price * quantity;
    const totalEl = document.getElementById('orderTotal');
    if (totalEl) totalEl.textContent = `Total: $${total.toFixed(2)}`;
  }
  
  async handleOrderSubmit(e) {
    e.preventDefault();

    if (this.orderSubmitInFlight) {
      this.showNotification('Order request in progress. Please wait.');
      return;
    }
    
    const symbol = document.getElementById('orderSymbol').value;
    const side = document.getElementById('orderSubmitBtn').dataset.side;
    const type = document.getElementById('orderType').value;
    const price = document.getElementById('orderPrice').value;
    const quantity = document.getElementById('orderQuantity').value;
    const takeProfit = document.getElementById('takeProfitPrice')?.value;
    const stopLoss = document.getElementById('stopLossPrice')?.value;
    
    if (!symbol) {
      this.showNotification('Please select a trading pair');
      return;
    }
    
    const order = {
      symbol,
      side,
      type,
      quantity: parseFloat(quantity),
      ...(type === 'LIMIT' && { price: parseFloat(price) }),
      ...(this.state.tradingMode === 'futures' && { leverage: this.state.leverage }),
      ...(takeProfit && { takeProfit: parseFloat(takeProfit) }),
      ...(stopLoss && { stopLoss: parseFloat(stopLoss) })
    };
    
    if (this.state.tradingMode === 'futures') {
      this.mockFuturesOrder(order);
    } else {
      this.setOrderSubmitBusy(true);
      try {
        const apiKey = localStorage.getItem('binance_api_key');
        if (!apiKey) {
          this.mockOrder(order);
          return;
        }

        const clientOrderId = this.generateClientOrderId(symbol);
        const credentials = this.getApiCredentials();
        const response = await fetch(
          'backend/api.php?action=order',
          this.getBackendRequestOptions(this.buildTradingRequestPayload({
            ...credentials,
            ...order,
            newClientOrderId: clientOrderId
          }))
        );

        const result = await response.json();
        if (this.isSuccess(result)) {
          this.showNotification(`Order placed: ${side} ${quantity} ${symbol}`);
          document.getElementById('orderForm').reset();
          this.updateOrderTotal();
          this.refreshOrders();
        } else if (this.isRecoverableOrderUnknown(result)) {
          const recoverId = result.data.clientOrderId;
          this.showNotification(`Order status unknown. Verifying ${recoverId}...`);
          const resolved = await this.resolveUnknownOrderStatus(credentials, symbol, recoverId);
          if (this.isSuccess(resolved)) {
            const status = resolved?.data?.status || 'UNKNOWN';
            this.showNotification(`Order recovered (${recoverId}): ${status}`);
            this.refreshOrders();
          } else {
            this.showNotification(`Order verification needed. Track by clientOrderId: ${recoverId}`);
          }
        } else {
          this.showNotification(`Order failed: ${this.getApiErrorMessage(result)}`);
        }
      } catch (error) {
        console.error('Order error:', error);
        this.showNotification('Order failed. Using mock mode.');
        this.mockOrder(order);
      } finally {
        this.setOrderSubmitBusy(false);
      }
    }
  }
  
  mockOrder(order) {
    const mockOrder = {
      id: Date.now(),
      ...order,
      status: 'FILLED',
      time: Date.now(),
      price: order.price || this.state.cryptoPrices[order.symbol]?.price || 0
    };
    
    if (!this.data.mockTrades) this.data.mockTrades = [];
    this.data.mockTrades.push(mockOrder);
    this.saveData('mockTrades', this.data.mockTrades);
    
    this.showNotification(`Mock order: ${order.side} ${order.quantity} ${order.symbol}`);
    document.getElementById('orderForm').reset();
    this.updateOrderTotal();
    this.updateMockTrading();
  }
  
  mockFuturesOrder(order) {
    const entryPrice = order.price || this.state.cryptoPrices[order.symbol]?.price || 0;
    const position = {
      id: Date.now(),
      symbol: order.symbol,
      side: order.side,
      quantity: order.quantity,
      leverage: order.leverage || 10,
      entryPrice,
      markPrice: entryPrice,
      liquidationPrice: this.calculateLiquidation(entryPrice, order.side, order.leverage),
      pnl: 0,
      pnlPercent: 0,
      margin: (order.quantity * entryPrice) / order.leverage,
      takeProfit: order.takeProfit,
      stopLoss: order.stopLoss,
      time: Date.now()
    };
    
    if (!this.data.futuresPositions) this.data.futuresPositions = [];
    this.data.futuresPositions.push(position);
    this.saveData('futuresPositions', this.data.futuresPositions);
    
    this.showNotification(`Position opened: ${order.side} ${order.quantity} ${order.symbol} ${order.leverage}x`);
    document.getElementById('orderForm').reset();
    this.updateOrderTotal();
    this.updatePositions();
  }
  
  calculateLiquidation(entryPrice, side, leverage) {
    const maintenanceMargin = 0.004;
    if (side === 'BUY') {
      return entryPrice * (1 - (1 / leverage) + maintenanceMargin);
    } else {
      return entryPrice * (1 + (1 / leverage) - maintenanceMargin);
    }
  }
  
  async updateBalanceDisplay() {
    const container = document.getElementById('balanceDisplay');
    if (!container) return;
    
    try {
      const apiKey = localStorage.getItem('binance_api_key');
      if (!apiKey) {
        const mockBalance = this.calculateMockBalance();
        container.innerHTML = `<div>Mock Balance: <span style="color: var(--positive);">$${mockBalance.toFixed(2)}</span></div>`;
        return;
      }
      
      const credentials = this.getApiCredentials();
      const response = await fetch(
        'backend/api.php?action=account',
        this.getBackendRequestOptions(this.buildTradingRequestPayload(credentials))
      );
      
      const result = await response.json();
      if (this.isSuccess(result) && result.data.balances) {
        const usdt = result.data.balances.find(b => b.asset === 'USDT');
        const balance = usdt ? parseFloat(usdt.free) : 0;
        container.innerHTML = `<div>USDT Balance: <span style="color: var(--positive);">$${balance.toFixed(2)}</span></div>`;
      } else {
        container.innerHTML = '<div style="color: var(--text-secondary);">Balance unavailable</div>';
      }
    } catch (error) {
      console.error('Balance error:', error);
      const mockBalance = this.calculateMockBalance();
      container.innerHTML = `<div>Mock Balance: <span style="color: var(--positive);">$${mockBalance.toFixed(2)}</span></div>`;
    }
  }
  
  calculateMockBalance() {
    const trades = this.data.mockTrades || [];
    return trades.reduce((acc, t) => {
      const amount = t.quantity * t.price;
      return t.side === 'BUY' ? acc - amount : acc + amount;
    }, 10000);
  }
  
  async updatePositions() {
    const container = document.getElementById('positionsList');
    if (!container) return;
    
    if (this.state.tradingMode === 'futures') {
      this.renderFuturesPositions(container);
    } else {
      this.updatePortfolio(container);
    }
  }
  
  async updatePortfolio(container) {
    if (!container) container = document.getElementById('positionsList');
    if (!container) return;
    
    try {
      const apiKey = localStorage.getItem('binance_api_key');
      if (!apiKey) {
        this.renderMockPortfolio(container);
        return;
      }
      
      const credentials = this.getApiCredentials();
      const response = await fetch(
        'backend/api.php?action=account',
        this.getBackendRequestOptions(this.buildTradingRequestPayload(credentials))
      );
      
      const result = await response.json();
      if (this.isSuccess(result) && result.data.balances) {
        this.renderPortfolio(container, result.data.balances);
      } else {
        this.renderMockPortfolio(container);
      }
    } catch (error) {
      console.error('Portfolio error:', error);
      this.renderMockPortfolio(container);
    }
  }
  
  renderFuturesPositions(container) {
    const positions = this.data.futuresPositions || [];
    
    positions.forEach(pos => {
      const currentPrice = this.state.cryptoPrices[pos.symbol]?.price || pos.markPrice;
      pos.markPrice = currentPrice;
      
      if (pos.side === 'BUY') {
        pos.pnl = (currentPrice - pos.entryPrice) * pos.quantity * pos.leverage;
      } else {
        pos.pnl = (pos.entryPrice - currentPrice) * pos.quantity * pos.leverage;
      }
      pos.pnlPercent = (pos.pnl / pos.margin) * 100;
      
      if (pos.takeProfit && ((pos.side === 'BUY' && currentPrice >= pos.takeProfit) || (pos.side === 'SELL' && currentPrice <= pos.takeProfit))) {
        this.closePosition(pos.id, 'TP Hit');
      }
      if (pos.stopLoss && ((pos.side === 'BUY' && currentPrice <= pos.stopLoss) || (pos.side === 'SELL' && currentPrice >= pos.stopLoss))) {
        this.closePosition(pos.id, 'SL Hit');
      }
      if ((pos.side === 'BUY' && currentPrice <= pos.liquidationPrice) || (pos.side === 'SELL' && currentPrice >= pos.liquidationPrice)) {
        this.closePosition(pos.id, 'Liquidated');
      }
    });
    
    this.saveData('futuresPositions', this.data.futuresPositions);
    
    if (positions.length === 0) {
      container.innerHTML = '<div class="empty-state">No open positions</div>';
      return;
    }
    
    container.innerHTML = '';
    positions.forEach(pos => {
      const item = document.createElement('div');
      item.className = 'position-item';
      const sideClass = pos.side === 'BUY' ? 'position-side-long' : 'position-side-short';
      const pnlClass = pos.pnl >= 0 ? 'positive' : 'negative';
      
      item.innerHTML = `
        <div class="position-header">
          <div>
            <span class="position-symbol">${pos.symbol.replace('USDT', '/USDT')}</span>
            <span class="${sideClass}"> ${pos.side === 'BUY' ? 'LONG' : 'SHORT'} ${pos.leverage}x</span>
          </div>
          <div class="position-pnl ${pnlClass}">${pos.pnl >= 0 ? '+' : ''}$${pos.pnl.toFixed(2)} (${pos.pnlPercent.toFixed(2)}%)</div>
        </div>
        <div class="position-details">
          <div>Size: ${pos.quantity}</div>
          <div>Margin: $${pos.margin.toFixed(2)}</div>
          <div>Entry: $${pos.entryPrice.toFixed(2)}</div>
          <div>Mark: $${pos.markPrice.toFixed(2)}</div>
          <div>Liq: $${pos.liquidationPrice.toFixed(2)}</div>
          <div>${pos.takeProfit ? `TP: $${pos.takeProfit.toFixed(2)}` : 'No TP'}</div>
          <div>${pos.stopLoss ? `SL: $${pos.stopLoss.toFixed(2)}` : 'No SL'}</div>
        </div>
        <div class="position-actions">
          <button class="btn-small" onclick="App.closePosition(${pos.id})">Close Position</button>
          <button class="btn-small" onclick="App.editTPSL(${pos.id})">Edit TP/SL</button>
        </div>
      `;
      container.appendChild(item);
    });
  }
  
  closePosition(posId, reason = 'Manual') {
    const pos = this.data.futuresPositions.find(p => p.id === posId);
    if (!pos) return;
    
    this.data.futuresPositions = this.data.futuresPositions.filter(p => p.id !== posId);
    this.saveData('futuresPositions', this.data.futuresPositions);
    
    const trade = { ...pos, closePrice: pos.markPrice, closePnl: pos.pnl, closeReason: reason, closeTime: Date.now() };
    if (!this.data.mockTrades) this.data.mockTrades = [];
    this.data.mockTrades.push(trade);
    this.saveData('mockTrades', this.data.mockTrades);
    
    this.showNotification(`Position closed: ${reason} | PnL: $${pos.pnl.toFixed(2)}`);
    this.updatePositions();
    this.updateBalanceDisplay();
  }
  
  editTPSL(posId) {
    const pos = this.data.futuresPositions.find(p => p.id === posId);
    if (!pos) return;
    
    const tp = prompt('Enter Take Profit price (leave empty to remove):', pos.takeProfit || '');
    const sl = prompt('Enter Stop Loss price (leave empty to remove):', pos.stopLoss || '');
    
    pos.takeProfit = tp ? parseFloat(tp) : null;
    pos.stopLoss = sl ? parseFloat(sl) : null;
    
    this.saveData('futuresPositions', this.data.futuresPositions);
    this.showNotification('TP/SL updated');
    this.updatePositions();
  }
  
  renderPortfolio(container, balances) {
    const holdings = balances.filter(b => parseFloat(b.free) > 0 || parseFloat(b.locked) > 0);
    
    if (holdings.length === 0) {
      container.innerHTML = '<div class="empty-state">No holdings</div>';
      return;
    }
    
    container.innerHTML = '';
    holdings.forEach(holding => {
      const total = parseFloat(holding.free) + parseFloat(holding.locked);
      const symbol = `${holding.asset}USDT`;
      const price = this.state.cryptoPrices[symbol]?.price || 0;
      const value = total * price;
      
      const item = document.createElement('div');
      item.className = 'portfolio-item';
      item.innerHTML = `
        <div>
          <div class="portfolio-symbol">${holding.asset}</div>
          <div class="portfolio-amount">${total.toFixed(8)}</div>
        </div>
        <div class="portfolio-value">$${value.toFixed(2)}</div>
      `;
      container.appendChild(item);
    });
  }
  
  renderMockPortfolio(container) {
    const trades = this.data.mockTrades || [];
    const holdings = {};
    
    trades.forEach(t => {
      const asset = t.symbol.replace('USDT', '');
      if (!holdings[asset]) holdings[asset] = 0;
      holdings[asset] += t.side === 'BUY' ? t.quantity : -t.quantity;
    });
    
    const assets = Object.entries(holdings).filter(([_, qty]) => qty > 0);
    
    if (assets.length === 0) {
      container.innerHTML = '<div class="empty-state">No holdings. Place your first order!</div>';
      return;
    }
    
    container.innerHTML = '';
    assets.forEach(([asset, qty]) => {
      const symbol = `${asset}USDT`;
      const price = this.state.cryptoPrices[symbol]?.price || 0;
      const value = qty * price;
      
      const item = document.createElement('div');
      item.className = 'portfolio-item';
      item.innerHTML = `
        <div>
          <div class="portfolio-symbol">${asset}</div>
          <div class="portfolio-amount">${qty.toFixed(8)}</div>
        </div>
        <div class="portfolio-value">$${value.toFixed(2)}</div>
      `;
      container.appendChild(item);
    });
  }
  
  async updateOpenOrders() {
    const container = document.getElementById('openOrdersList');
    if (!container) return;
    
    try {
      const apiKey = localStorage.getItem('binance_api_key');
      if (!apiKey) {
        container.innerHTML = '<div class="empty-state">Connect API to view open orders</div>';
        return;
      }
      
      const credentials = this.getApiCredentials();
      const response = await fetch(
        'backend/api.php?action=orders',
        this.getBackendRequestOptions(this.buildTradingRequestPayload(credentials))
      );
      
      const result = await response.json();
      if (this.isSuccess(result) && result.data) {
        this.renderOrders(container, result.data, true);
      } else {
        container.innerHTML = '<div class="empty-state">No open orders</div>';
      }
    } catch (error) {
      console.error('Open orders error:', error);
      container.innerHTML = '<div class="empty-state">Failed to load orders</div>';
    }
  }
  
  updateOrderHistory() {
    const container = document.getElementById('orderHistory');
    if (!container) return;
    
    const trades = this.data.mockTrades || [];
    if (trades.length === 0) {
      container.innerHTML = '<div class="empty-state">No order history</div>';
      return;
    }
    
    this.renderOrders(container, trades.slice(-10).reverse(), false);
  }
  
  renderOrders(container, orders, showCancel) {
    if (!orders || orders.length === 0) {
      container.innerHTML = '<div class="empty-state">No orders</div>';
      return;
    }
    
    container.innerHTML = '';
    orders.forEach(order => {
      const item = document.createElement('div');
      item.className = 'order-item';
      
      const side = order.side || 'BUY';
      const sideClass = side === 'BUY' ? 'order-side-buy' : 'order-side-sell';
      const status = order.status || 'FILLED';
      const statusClass = `order-status order-status-${status.toLowerCase()}`;
      
      item.innerHTML = `
        <div class="order-info">
          <div><span class="${sideClass}">${side}</span> ${order.symbol}</div>
          <div style="color: var(--text-secondary); font-size: 0.9em;">
            ${order.quantity || order.origQty} @ ${order.price || 'Market'}
          </div>
        </div>
        <div>
          <span class="${statusClass}">${status}</span>
        </div>
      `;
      
      if (showCancel && status === 'NEW') {
        const cancelBtn = document.createElement('button');
        cancelBtn.className = 'btn-small';
        cancelBtn.textContent = 'Cancel';
        cancelBtn.style.background = 'var(--negative)';
        cancelBtn.onclick = () => this.cancelOrder(order.orderId, order.symbol);
        item.appendChild(cancelBtn);
      }
      
      container.appendChild(item);
    });
  }
  
  async cancelOrder(orderId, symbol) {
    try {
      const credentials = this.getApiCredentials();
      const response = await fetch(
        'backend/api.php?action=cancel',
        this.getBackendRequestOptions(this.buildTradingRequestPayload({ ...credentials, symbol, orderId }))
      );
      
      const result = await response.json();
      if (this.isSuccess(result)) {
        this.showNotification('Order canceled');
        this.refreshOrders();
      } else {
        this.showNotification(`Cancel failed: ${this.getApiErrorMessage(result)}`);
      }
    } catch (error) {
      console.error('Cancel error:', error);
      this.showNotification('Failed to cancel order');
    }
  }
  
  refreshOrders() {
    this.updateOpenOrders();
    this.updateBalanceDisplay();
    this.updatePortfolio();
  }
  
  loadApiSettingsForm() {
    const apiKey = localStorage.getItem('binance_api_key') || '';
    const backendApiToken = localStorage.getItem('backend_api_token') || '';
    const useTestnet = localStorage.getItem('use_testnet') !== 'false';
    const recvWindow = localStorage.getItem('binance_recv_window') || '5000';
    
    const apiKeyEl = document.getElementById('apiKey');
    const backendTokenEl = document.getElementById('backendApiToken');
    const testnetEl = document.getElementById('useTestnet');
    const recvWindowEl = document.getElementById('recvWindow');
    if (apiKeyEl) apiKeyEl.value = apiKey;
    if (backendTokenEl) backendTokenEl.value = backendApiToken;
    if (testnetEl) testnetEl.checked = useTestnet;
    if (recvWindowEl) recvWindowEl.value = recvWindow;
  }
  
  saveSettings() {
    const apiKey = document.getElementById('apiKey').value.trim();
    const apiSecret = document.getElementById('apiSecret').value.trim();
    const backendApiToken = document.getElementById('backendApiToken')?.value.trim() || '';
    const useTestnet = document.getElementById('useTestnet').checked;
    const recvWindowInput = document.getElementById('recvWindow')?.value.trim() || '5000';
    const recvWindow = Number(recvWindowInput);
    const normalizedRecvWindow = Number.isFinite(recvWindow)
      ? Math.min(60000, Math.max(1, Math.round(recvWindow)))
      : 5000;
    
    localStorage.setItem('binance_api_key', apiKey);
    localStorage.setItem('binance_api_secret', apiSecret);
    localStorage.setItem('backend_api_token', backendApiToken);
    localStorage.setItem('use_testnet', useTestnet.toString());
    localStorage.setItem('binance_recv_window', String(normalizedRecvWindow));
    
    this.showNotification('Settings saved successfully!');
    this.closeModal('settingsModal');
  }
  
  clearSettings() {
    localStorage.removeItem('binance_api_key');
    localStorage.removeItem('binance_api_secret');
    localStorage.removeItem('backend_api_token');
    localStorage.removeItem('use_testnet');
    localStorage.removeItem('binance_recv_window');
    
    document.getElementById('apiKey').value = '';
    document.getElementById('apiSecret').value = '';
    const backendTokenEl = document.getElementById('backendApiToken');
    const recvWindowEl = document.getElementById('recvWindow');
    if (backendTokenEl) backendTokenEl.value = '';
    if (recvWindowEl) recvWindowEl.value = '5000';
    document.getElementById('useTestnet').checked = true;
    
    this.showNotification('Settings cleared');
  }
  
  addDemoData() {
    this.setChartDataSourceState('loading');
    this.fetchRealData(this.state.currentChartSymbol, this.state.currentInterval);
  }
  
  async fetchRealData(symbol, interval) {
    const key = `${symbol}_${interval}`;
    const requestNonce = ++this.chartFetchNonce;
    this.setChartDataSourceState('loading');
    
    try {
      const payload = this.getChartRequestPayload(symbol, interval);
      const response = await this.fetchWithTimeout(
        'backend/api.php?action=klines',
        this.getBackendRequestOptions(payload),
        10000
      );
      const result = await response.json();
      if (requestNonce !== this.chartFetchNonce) {
        return;
      }

      if (!response.ok || !this.isSuccess(result) || !Array.isArray(result.data)) {
        throw new Error(this.getApiErrorMessage(result, `API request failed: ${response.status}`));
      }

      const realData = this.mapKlinesToIntervalData(result.data);
      if (realData.length === 0) {
        throw new Error('Invalid API response format');
      }

      this.data.intervalData[key] = realData;
      this.updateChart();
      this.setChartDataSourceState('proxy');
      
    } catch (error) {
      if (requestNonce !== this.chartFetchNonce) {
        return;
      }
      console.error('Failed to fetch real data:', error);
      const fallbackData = this.getFallbackIntervalData(symbol, interval);
      if (fallbackData.length > 0) {
        this.data.intervalData[key] = fallbackData;
        this.updateChart();
        this.setChartDataSourceState('fallback');
        this.showChartDataWarning('Live stream data shown; historical fetch unavailable.');
      } else if (this.isWebSocketLive()) {
        this.setChartDataSourceState('degraded');
        this.showChartDataWarning('Historical fetch failed; waiting for live candles.');
        const warmed = await this.waitForLiveFallback(symbol, interval, requestNonce);
        if (requestNonce !== this.chartFetchNonce) {
          return;
        }
        if (warmed) {
          const warmedData = this.getFallbackIntervalData(symbol, interval);
          if (warmedData.length > 0) {
            this.data.intervalData[key] = warmedData;
            this.updateChart();
          }
          this.setChartDataSourceState('fallback');
          this.showChartDataWarning('Live stream data shown; historical fetch unavailable.');
        } else {
          this.setChartDataSourceState('unavailable');
          this.showChartDataWarning('No historical or live candle data available.');
        }
      } else {
        this.setChartDataSourceState('unavailable');
        this.showChartDataWarning('No historical or live candle data available.');
      }
    }
  }
}

// Initialize app
const App = new CryptoApp();
window.App = App;


