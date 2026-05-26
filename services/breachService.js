/**
 * REDACT Privacy Intelligence Engine - Breach Intelligence Service
 * 
 * Tracks historic platform data breaches and handles lookup queries.
 */

// Simulated catalog of major historical data breaches
const historicBreaches = {
  'swiggy': {
    breachDetected: true,
    leakDate: '2021-05',
    details: 'Historic consumer order patterns and coordinates found in dark web databases.',
    affectedData: ['Phone', 'GPS History', 'Device Metadata', 'Order Info']
  },
  'zomato': {
    breachDetected: true,
    leakDate: '2017-05',
    details: '17 million user records hacked and sold on dark web markets.',
    affectedData: ['Email', 'Password Hashes', 'Username']
  },
  'linkedin': {
    breachDetected: true,
    leakDate: '2021-04',
    details: '700 million users scraped and historic credentials exposed.',
    affectedData: ['Email', 'Work History', 'Network Graph', 'Full Name']
  },
  'github': {
    breachDetected: true,
    leakDate: '2020-03',
    details: 'Credential harvesting and repository OAuth key leak campaigns observed.',
    affectedData: ['Email', 'Profile Info', 'IP Address', 'Repository Metadata']
  },
  'twitter': {
    breachDetected: true,
    leakDate: '2023-01',
    details: 'API exploit resulted in 200+ million records scraped.',
    affectedData: ['Email', 'Profile Info', 'Phone']
  },
  'twitter/x': {
    breachDetected: true,
    leakDate: '2023-01',
    details: 'API exploit resulted in 200+ million records scraped.',
    affectedData: ['Email', 'Profile Info', 'Phone']
  },
  'coinbase': {
    breachDetected: true,
    leakDate: '2021-10',
    details: 'Targeted SMS phishing and MFA bypass compromised accounts.',
    affectedData: ['Phone', 'Location', 'Financials', 'ID Verification']
  },
  'revolut': {
    breachDetected: true,
    leakDate: '2022-09',
    details: 'Social engineering attack exposed personal and transaction information of ~50,000 users.',
    affectedData: ['Phone', 'Location', 'Financials', 'Full Name']
  },
  'reddit': {
    breachDetected: true,
    leakDate: '2018-06',
    details: 'Historic database backup from 2007 accessed via SMS MFA interception.',
    affectedData: ['Profile Info', 'Email', 'Password Hashes']
  },
  'canva': {
    breachDetected: true,
    leakDate: '2019-05',
    details: 'Database containing 139 million user accounts compromised.',
    affectedData: ['Email', 'Password Hashes', 'Full Name']
  },
  'dropbox': {
    breachDetected: true,
    leakDate: '2012-08',
    details: '68 million user passwords leaked and decrypted.',
    affectedData: ['Email', 'Password Hashes']
  }
};

/**
 * Checks if a platform has a historic data breach in our intelligence catalog.
 * @param {string} platform Name of the platform (e.g. Swiggy, LinkedIn)
 * @returns {object} Breach status and details
 */
function checkBreach(platform) {
  if (!platform) return { breachDetected: false, details: null, affectedData: [] };
  
  const key = platform.toLowerCase().trim();
  if (historicBreaches[key]) {
    return {
      breachDetected: true,
      leakDate: historicBreaches[key].leakDate,
      details: historicBreaches[key].details,
      affectedData: historicBreaches[key].affectedData
    };
  }

  // Fallback for default platforms
  return {
    breachDetected: false,
    details: null,
    affectedData: []
  };
}

module.exports = {
  checkBreach
};
