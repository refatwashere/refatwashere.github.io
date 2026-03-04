// PHP API Service for Binance
class BinanceAPI {
  constructor() {
    this.apiURL = 'backend/api.php';
  }

  buildHeaders(apiToken = '') {
    const headers = { 'Content-Type': 'application/json' };
    if (apiToken) headers['X-API-Token'] = apiToken;
    return headers;
  }

  async getAccount(apiKey, apiSecret, useTestnet = true) {
    const response = await fetch(`${this.apiURL}?action=account`, {
      method: 'POST',
      headers: this.buildHeaders(localStorage.getItem('backend_api_token') || ''),
      body: JSON.stringify({ apiKey, apiSecret, useTestnet })
    });
    return await response.json();
  }

  async placeOrder(apiKey, apiSecret, useTestnet, orderData) {
    const response = await fetch(`${this.apiURL}?action=order`, {
      method: 'POST',
      headers: this.buildHeaders(localStorage.getItem('backend_api_token') || ''),
      body: JSON.stringify({ apiKey, apiSecret, useTestnet, ...orderData })
    });
    return await response.json();
  }

  async getOpenOrders(apiKey, apiSecret, useTestnet, symbol = null) {
    const response = await fetch(`${this.apiURL}?action=orders`, {
      method: 'POST',
      headers: this.buildHeaders(localStorage.getItem('backend_api_token') || ''),
      body: JSON.stringify({ apiKey, apiSecret, useTestnet, symbol })
    });
    return await response.json();
  }

  async cancelOrder(apiKey, apiSecret, useTestnet, symbol, orderId) {
    const response = await fetch(`${this.apiURL}?action=cancel`, {
      method: 'POST',
      headers: this.buildHeaders(localStorage.getItem('backend_api_token') || ''),
      body: JSON.stringify({ apiKey, apiSecret, useTestnet, symbol, orderId })
    });
    return await response.json();
  }
}

export default new BinanceAPI();
