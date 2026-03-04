// Configuration service for API keys and settings
class ConfigService {
  constructor() {
    this.endpoints = {
      mainnet: {
        rest: 'https://api.binance.com/api/v3',
        ws: 'wss://stream.binance.com:9443/stream'
      },
      testnet: {
        rest: 'https://testnet.binance.vision/api/v3',
        ws: 'wss://testnet.binance.vision/ws-api/v3'
      }
    };
  }
  
  // Get API credentials from localStorage (user input)
  getCredentials() {
    const useTestnetValue = localStorage.getItem('use_testnet');
    return {
      apiKey: localStorage.getItem('binance_api_key') || '',
      apiSecret: localStorage.getItem('binance_api_secret') || '',
      useTestnet: useTestnetValue !== 'false'
    };
  }
  
  // Save credentials to localStorage
  saveCredentials(apiKey, apiSecret, useTestnet = true) {
    localStorage.setItem('binance_api_key', apiKey);
    localStorage.setItem('binance_api_secret', apiSecret);
    localStorage.setItem('use_testnet', useTestnet.toString());
  }
  
  // Get current API endpoint
  getApiEndpoint() {
    const { useTestnet } = this.getCredentials();
    return useTestnet ? this.endpoints.testnet : this.endpoints.mainnet;
  }
  
  // Check if credentials are configured
  hasCredentials() {
    const { apiKey, apiSecret } = this.getCredentials();
    return Boolean(apiKey && apiSecret);
  }
}

export default new ConfigService();