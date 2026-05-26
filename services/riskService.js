/**
 * REDACT Privacy Intelligence Engine - Risk Analysis Service
 * 
 * Analyzes platforms to determine the type and volume of retained personal data,
 * and maps platforms to risk tiers (LOW, MEDIUM, HIGH, CRITICAL).
 */

const { checkBreach } = require('./breachService');

// Definitions of typical retained data types per platform category
const dataProfiles = {
  // FinTech & Wallets (CRITICAL/HIGH risk)
  fintech: {
    baseRisk: 'MEDIUM',
    retainedData: ['Phone', 'Location', 'Financials', 'ID Verification']
  },
  // E-Commerce & Delivery (HIGH/MEDIUM risk)
  delivery: {
    baseRisk: 'MEDIUM',
    retainedData: ['Phone', 'GPS History', 'Device Metadata']
  },
  ecommerce: {
    baseRisk: 'MEDIUM',
    retainedData: ['Phone', 'Location', 'Purchase History']
  },
  // Socials, Media & Forums (LOW risk)
  social: {
    baseRisk: 'LOW',
    retainedData: ['Profile Info', 'Email', 'IP Address']
  }
};

// Platform-specific mapping to profile category or explicit rules
const platformToCategory = {
  'swiggy': 'delivery',
  'zomato': 'delivery',
  'coinbase': 'fintech',
  'revolut': 'fintech',
  'binance': 'fintech',
  'paypal': 'fintech',
  'stripe': 'fintech',
  
  'uber': 'delivery',
  'ubereats': 'delivery',
  'doordash': 'delivery',
  'instacart': 'delivery',
  
  'amazon': 'ecommerce',
  'shopify': 'ecommerce',
  'aliexpress': 'ecommerce',
  'zalando': 'ecommerce',
  'etsy': 'ecommerce',
  'netflix': 'ecommerce',
  
  'reddit': 'social',
  'twitter': 'social',
  'twitter/x': 'social',
  'linkedin': 'social',
  'google': 'social',
  'discord': 'social',
  'medium': 'social',
  'stackoverflow': 'social',
  'behance': 'social',
  'twitch': 'social',
  'quora': 'social',
  'pinterest': 'social',
  'substack': 'social',
  'facebook': 'social',
  'instagram': 'social',
  'apple': 'social',
  'microsoft': 'social',
  'slack': 'social',
  'zoom': 'social'
};

/**
 * Evaluates the privacy risk profile and estimates retained data for a platform.
 * 
 * @param {string} platform Platform name
 * @returns {object} Object containing risk, threat score modifier, and retainedData list
 */
function analyzeRisk(platform) {
  if (!platform) {
    return {
      risk: 'LOW',
      retainedData: ['Profile Info', 'Email']
    };
  }

  const key = platform.toLowerCase().trim();
  const category = platformToCategory[key];
  const profile = dataProfiles[category] || { baseRisk: 'LOW', retainedData: ['Profile Info', 'Email'] };

  let risk = profile.baseRisk;
  let retainedData = [...profile.retainedData];

  // Integrate breach checks
  const breach = checkBreach(platform);
  
  // If the platform has suffered a data breach, escalate risk tier
  if (breach.breachDetected) {
    if (risk === 'HIGH') {
      risk = 'CRITICAL';
    } else if (risk === 'MEDIUM') {
      risk = 'HIGH';
    } else if (risk === 'LOW') {
      risk = 'MEDIUM';
    }
    
    // Add additional breached indicators or data if they were leaked
    breach.affectedData.forEach(data => {
      if (!retainedData.includes(data)) {
        retainedData.push(data);
      }
    });
  }

  return {
    risk,
    retainedData,
    breachDetected: breach.breachDetected
  };
}

module.exports = {
  analyzeRisk
};
