// Market data simulator for serverless sidecar
const marketData = {
  // Simple market confidence calculation
  calculateMarketConfidence: function(symbol, type, size) {
    // Base confidence from market conditions
    let confidence = 0.6;

    // Adjust based on symbol popularity
    const popularSymbols = ['BTC', 'ETH', 'BNB', 'CAKE', 'USDT', 'USDC'];
    if (popularSymbols.some(s => symbol.includes(s))) {
      confidence += 0.1;
    }

    // Adjust based on order type
    if (type === 'LIMIT') {
      confidence += 0.1;
    }

    // Adjust based on size (smaller is safer)
    if (size < 10) {
      confidence += 0.1;
    } else if (size > 100) {
      confidence -= 0.1;
    }

    // Add some randomness for realism
    confidence += (Math.random() - 0.5) * 0.1;

    return Math.max(0.1, Math.min(0.95, confidence));
  }
};

module.exports = marketData;