const CONFIG = require('../config');

module.exports = (req, res) => {
  // CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, X-Planner-Token, X-Request-Id');

  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  if (req.method !== 'GET') {
    res.status(405).json({
      status: 405,
      message: 'Method not allowed',
      request_id: req.headers['x-request-id'] || null
    });
    return;
  }

  res.status(200).json({
    status: 200,
    data: {
      ready: true,
      version: '2.0-enhanced',
      features: ['binance-advisory', 'pancakeswap-dex', 'risk-assessment', 'market-data-simulator'],
      supported_chains: Object.keys(CONFIG.chains).map(Number),
      supported_venues: Object.keys(CONFIG.venues)
    }
  });
};