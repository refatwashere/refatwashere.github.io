// Simple market data simulator for enhanced confidence calculations
// In production, replace with real market data APIs

class MarketDataSimulator {
  constructor() {
    this.volatility = {
      'BTCUSDT': 0.02,
      'ETHUSDT': 0.03,
      'BNBUSDT': 0.025,
      'CAKE': 0.04,
      'WBNB': 0.025
    };

    this.liquidity = {
      'BTCUSDT': 1000000,
      'ETHUSDT': 800000,
      'BNBUSDT': 500000,
      'CAKE': 200000,
      'WBNB': 300000
    };
  }

  getVolatility(symbol) {
    return this.volatility[symbol] || 0.05; // Default 5% volatility
  }

  getLiquidity(symbol) {
    return this.liquidity[symbol] || 100000; // Default liquidity
  }

  // Simulate spread based on liquidity and volatility
  getSpread(symbol) {
    const volatility = this.getVolatility(symbol);
    const liquidity = this.getLiquidity(symbol);
    const baseSpread = 0.001; // 0.1% base spread
    const volMultiplier = volatility * 10;
    const liqMultiplier = Math.max(0.5, 1000000 / liquidity);
    return baseSpread * volMultiplier * liqMultiplier;
  }

  // Simulate market impact for large orders
  getMarketImpact(symbol, size, liquidity) {
    const orderSize = size || 0;
    const poolLiquidity = liquidity || this.getLiquidity(symbol);
    return Math.min(orderSize / poolLiquidity, 0.1); // Max 10% impact
  }

  // Generate confidence score based on market conditions
  calculateMarketConfidence(symbol, orderType, size) {
    let confidence = 0.5;

    const volatility = this.getVolatility(symbol);
    const spread = this.getSpread(symbol);
    const liquidity = this.getLiquidity(symbol);
    const marketImpact = this.getMarketImpact(symbol, size, liquidity);

    // Lower volatility = higher confidence
    if (volatility < 0.02) confidence += 0.2;
    else if (volatility > 0.05) confidence -= 0.2;

    // Tighter spread = higher confidence
    if (spread < 0.005) confidence += 0.15;

    // Higher liquidity = higher confidence
    if (liquidity > 500000) confidence += 0.1;

    // Lower market impact = higher confidence
    if (marketImpact < 0.01) confidence += 0.1;
    else if (marketImpact > 0.05) confidence -= 0.2;

    // Order type adjustments
    if (orderType === 'LIMIT') confidence += 0.1;

    return Math.max(0.1, Math.min(0.95, confidence));
  }
}

module.exports = new MarketDataSimulator();