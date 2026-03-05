// Configuration for enhanced sidecar service
// Token addresses and chain configurations

const CONFIG = {
  // BSC Mainnet (Chain ID: 56)
  chains: {
    56: {
      name: 'BSC Mainnet',
      rpc: 'https://bsc-dataseed.binance.org/',
      tokens: {
        WBNB: '0xbb4CdB9CBd36B01bD1cBaEBF2De08d9173bc095c',
        CAKE: '0x0E09FaBB73Bd3Ade0a17ECC321fD13a19e81cE82',
        BUSD: '0xe9e7CEA3DedcA5984780Bafc599bD69ADd087D56',
        USDT: '0x55d398326f99059fF775485246999027B3197955',
        BTCB: '0x7130d2A12B9BCbFAe4f2634d864A1Ee1Ce3Ead9c',
        ETH: '0x2170Ed0880ac9A755fd29B2688956BD959F933F8'
      }
    },
    // Ethereum Mainnet (Chain ID: 1)
    1: {
      name: 'Ethereum Mainnet',
      rpc: 'https://mainnet.infura.io/v3/YOUR_INFURA_KEY',
      tokens: {
        WETH: '0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2',
        USDC: '0xA0b86a33E6441e88C5F2712C3E9b74F5b8b6F5F',
        USDT: '0xdAC17F958D2ee523a2206206994597C13D831ec7',
        DAI: '0x6B175474E89094C44Da98b954EedeAC495271d0F'
      }
    }
  },

  // Risk assessment thresholds
  riskThresholds: {
    highSlippage: 500, // 5%
    largeSize: 1000,
    lowConfidence: 0.4,
    highRiskScore: 0.6
  },

  // Default slippage settings
  defaultSlippage: {
    binance: 0.1, // 0.1%
    pancakeswap: 50 // 0.5%
  },

  // Venue-specific settings
  venues: {
    binance: {
      baseUrl: 'https://www.binance.com/en/trade/',
      supportedTypes: ['MARKET', 'LIMIT', 'STOP_LOSS']
    },
    pancakeswap: {
      baseUrl: 'https://pancakeswap.finance/swap',
      supportedChains: [56, 1],
      defaultChain: 56
    }
  }
};

module.exports = CONFIG;