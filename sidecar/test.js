// Test script for sidecar configuration and basic functionality
// Run with: node test.js

const CONFIG = require('./config');

console.log('=== Sidecar Configuration Test ===\n');

// Test chain configurations
console.log('Available Chains:');
Object.entries(CONFIG.chains).forEach(([chainId, config]) => {
  console.log(`  ${chainId}: ${config.name}`);
  console.log(`    Tokens: ${Object.keys(config.tokens).length}`);
});

// Test venue configurations
console.log('\nVenue Configurations:');
Object.entries(CONFIG.venues).forEach(([venue, config]) => {
  console.log(`  ${venue}: ${config.baseUrl}`);
});

// Test risk thresholds
console.log('\nRisk Thresholds:');
Object.entries(CONFIG.riskThresholds).forEach(([key, value]) => {
  console.log(`  ${key}: ${value}`);
});

// Test default slippages
console.log('\nDefault Slippages:');
Object.entries(CONFIG.defaultSlippage).forEach(([venue, slippage]) => {
  console.log(`  ${venue}: ${slippage} bps`);
});

console.log('\n=== Configuration Test Complete ===');

// Basic functionality test
const testRequest = {
  venue: 'pancakeswap',
  tokenIn: '0x0E09FaBB73Bd3Ade0a17ECC321fD13a19e81cE82', // CAKE
  tokenOut: '0xbb4CdB9CBd36B01bD1cBaEBF2De08d9173bc095c', // WBNB
  amountIn: '1.0',
  slippageBps: 50,
  chainId: 56,
  side: 'BUY'
};

console.log('\n=== Sample Request Test ===');
console.log('Input:', JSON.stringify(testRequest, null, 2));

try {
  // Test token symbol lookup
  const chainConfig = CONFIG.chains[testRequest.chainId];
  const tokenInSymbol = getTokenSymbol(testRequest.tokenIn, chainConfig);
  const tokenOutSymbol = getTokenSymbol(testRequest.tokenOut, chainConfig);

  console.log(`Token In: ${testRequest.tokenIn} -> ${tokenInSymbol}`);
  console.log(`Token Out: ${testRequest.tokenOut} -> ${tokenOutSymbol}`);

  // Test deep link generation
  const params = new URLSearchParams({
    inputCurrency: testRequest.tokenIn,
    outputCurrency: testRequest.tokenOut,
    exactAmount: testRequest.amountIn,
    exactField: 'input'
  });

  if (testRequest.slippageBps) {
    params.set('slippage', (testRequest.slippageBps / 100).toString());
  }

  const deepLink = `${CONFIG.venues.pancakeswap.baseUrl}?${params.toString()}`;
  console.log(`Deep Link: ${deepLink}`);

  console.log('\n=== Test Passed ===');

} catch (error) {
  console.error('Test Failed:', error.message);
}

function getTokenSymbol(tokenAddress, chainConfig) {
  for (const [symbol, address] of Object.entries(chainConfig.tokens)) {
    if (address.toLowerCase() === tokenAddress.toLowerCase()) {
      return symbol;
    }
  }
  return tokenAddress.substring(0, 6) + '...';
}