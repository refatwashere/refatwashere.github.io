// Configuration for Vercel serverless sidecar
const CONFIG = {
  chains: {
    1: {
      name: 'Ethereum Mainnet',
      tokens: {
        ETH: '0x0000000000000000000000000000000000000000',
        USDT: '0xdAC17F958D2ee523a2206206994597C13D831ec7',
        USDC: '0xA0b86a33E6441e88C5F2712C3E9b74F5c4b6E6E9',
        DAI: '0x6B175474E89094C44Da98b954EedeAC495271d0F'
      }
    },
    56: {
      name: 'BSC Mainnet',
      tokens: {
        WBNB: '0xbb4CdB9CBd36B01bD1cBaEBF2De08d9173bc095c',
        CAKE: '0x0E09FaBB73Bd3Ade0a17ECC321fD13a19e81cE82',
        USDT: '0x55d398326f99059fF775485246999027B3197955',
        USDC: '0x8AC76a51cc950d9822D68b83fE1Ad97B32Cd580d',
        BUSD: '0xe9e7CEA3DedcA5984780Bafc599bD69ADd087D56'
      }
    }
  },
  venues: {
    binance: {
      baseUrl: 'https://www.binance.com/en/trade',
      defaultSlippage: 0.1
    },
    pancakeswap: {
      baseUrl: 'https://pancakeswap.finance/swap',
      defaultChain: 56,
      defaultSlippage: 50
    }
  },
  defaultSlippage: {
    binance: 0.1,
    pancakeswap: 50
  },
  riskThresholds: {
    highSlippage: 500,
    largeSize: 1000,
    lowConfidence: 0.4,
    highRiskScore: 0.6
  }
};

module.exports = CONFIG;