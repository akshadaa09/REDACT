/**
 * REDACT Privacy Intelligence Engine - Platform Detector Utility
 * 
 * Analyzes email sender domains and subjects using regex matching
 * to classify platforms, sources, risks, and retained data profiles.
 */

// Mapping of known domains to platform names
const domainToPlatform = {
  'github.com': 'GitHub',
  'coinbase.com': 'Coinbase',
  'revolut.com': 'Revolut',
  'binance.com': 'Binance',
  'paypal.com': 'PayPal',
  'netflix.com': 'Netflix',
  'spotify.com': 'Spotify',
  'amazon.com': 'Amazon',
  'amazon.in': 'Amazon',
  'amazon.co.uk': 'Amazon',
  'swiggy.com': 'Swiggy',
  'swiggy.in': 'Swiggy',
  'zomato.com': 'Zomato',
  'uber.com': 'Uber',
  'ubereats.com': 'UberEats',
  'doordash.com': 'DoorDash',
  'reddit.com': 'Reddit',
  'twitter.com': 'Twitter',
  'x.com': 'Twitter/X',
  'linkedin.com': 'LinkedIn',
  'google.com': 'Google',
  'discord.com': 'Discord',
  'discordapp.com': 'Discord',
  'medium.com': 'Medium',
  'stackoverflow.com': 'StackOverflow',
  'behance.net': 'Behance',
  'twitch.tv': 'Twitch',
  'quora.com': 'Quora',
  'pinterest.com': 'Pinterest',
  'substack.com': 'Substack',
  'stripe.com': 'Stripe',
  'zoom.us': 'Zoom',
  'slack.com': 'Slack',
  'microsoft.com': 'Microsoft',
  'apple.com': 'Apple',
  'facebook.com': 'Facebook',
  'instagram.com': 'Instagram'
};

// Custom platform profiles to match REDACT UI and user requirements
const platformProfiles = {
  'Swiggy': { risk: 'HIGH', retainedData: ['Phone', 'Location'] },
  'Coinbase': { risk: 'HIGH', retainedData: ['Phone', 'Location', 'Financials', 'ID Verification'] },
  'Revolut': { risk: 'HIGH', retainedData: ['Phone', 'Location', 'Financials'] },
  'Binance': { risk: 'HIGH', retainedData: ['Phone', 'Financials'] },
  'PayPal': { risk: 'HIGH', retainedData: ['Phone', 'Financials', 'Purchase History'] },
  'GitHub': { risk: 'HIGH', retainedData: ['Profile Info', 'Email', 'IP Address'] },
  'Uber': { risk: 'MEDIUM', retainedData: ['Phone', 'Location'] },
  'UberEats': { risk: 'MEDIUM', retainedData: ['Phone', 'Location'] },
  'DoorDash': { risk: 'MEDIUM', retainedData: ['Phone', 'Location'] },
  'Amazon': { risk: 'MEDIUM', retainedData: ['Phone', 'Location', 'Purchase History'] },
  'Shopify': { risk: 'MEDIUM', retainedData: ['Phone', 'Purchase History'] },
  'Netflix': { risk: 'MEDIUM', retainedData: ['Email', 'Payment Info'] },
  'Spotify': { risk: 'MEDIUM', retainedData: ['Email', 'Profile Info'] },
  'Reddit': { risk: 'LOW', retainedData: ['Profile Info', 'Email'] },
  'Twitter': { risk: 'LOW', retainedData: ['Profile Info', 'Email'] },
  'Twitter/X': { risk: 'LOW', retainedData: ['Profile Info', 'Email'] },
  'Discord': { risk: 'LOW', retainedData: ['Profile Info', 'Email'] }
};

// Generic email providers to ignore from direct platform resolution
const genericProviders = new Set([
  'gmail.com', 'yahoo.com', 'hotmail.com', 'outlook.com', 'live.com', 
  'aol.com', 'icloud.com', 'protonmail.com', 'proton.me', 'zoho.com', 
  'yandex.com', 'mail.com', 'gmx.com'
]);

// Keywords required to qualify for footprint scan (case-insensitive)
const filterKeywords = [
  'welcome',
  'otp',
  'verify',
  'login',
  'authentication',
  'account created'
];

/**
 * Checks if the email subject or snippet contains any of our scan keywords.
 * @param {string} subject 
 * @param {string} snippet 
 * @returns {boolean}
 */
function matchesScanKeywords(subject, snippet) {
  const text = `${subject} ${snippet}`.toLowerCase();
  return filterKeywords.some(keyword => text.includes(keyword));
}

/**
 * Parses the "From" header to extract display name and email address.
 * @param {string} fromHeader 
 * @returns {{ displayName: string, emailAddress: string }}
 */
function parseFromHeader(fromHeader) {
  if (!fromHeader) return { displayName: '', emailAddress: '' };
  
  let displayName = '';
  let emailAddress = '';
  
  const match = fromHeader.match(/(.*)<(.*)>/);
  if (match) {
    displayName = match[1].replace(/['"]/g, '').trim();
    emailAddress = match[2].trim();
  } else {
    emailAddress = fromHeader.trim();
  }
  
  return { displayName, emailAddress };
}

/**
 * Detects the platform name from email domain or display name.
 * @param {string} emailAddress 
 * @param {string} displayName 
 * @returns {string} Platform name or "UNKNOWN"
 */
function detectPlatform(emailAddress, displayName) {
  const domain = emailAddress.split('@')[1] || '';
  const cleanDomain = domain.toLowerCase();
  
  if (!cleanDomain || genericProviders.has(cleanDomain)) {
    return 'UNKNOWN';
  }

  // 1. Match domains directly (or subdomains)
  for (const [key, value] of Object.entries(domainToPlatform)) {
    if (cleanDomain === key || cleanDomain.endsWith('.' + key)) {
      return value;
    }
  }

  // 2. Fallback: Parse displayName for known brand names
  const cleanDisplayName = displayName.toLowerCase();
  for (const value of Object.values(domainToPlatform)) {
    if (cleanDisplayName.includes(value.toLowerCase())) {
      return value;
    }
  }

  // 3. Fallback: Extract base domain name and capitalize
  // Remove common generic TLDs and second-level domain structures
  const baseDomain = cleanDomain.replace(/\.(com|org|net|edu|gov|mil|int|info|biz|co|io|me|tv|cc|in|uk|us|ca|au|fr|de|jp|br|ru|za|xyz|app|dev|co\.[a-z]{2}|org\.[a-z]{2})$/i, '');
  const parts = baseDomain.split('.');
  const rawName = parts[parts.length - 1]; // get the last segment before TLD

  if (rawName && rawName.length > 1) {
    // Capitalize first letter
    return rawName.charAt(0).toUpperCase() + rawName.slice(1);
  }

  return 'UNKNOWN';
}

/**
 * Detects the source of authentication/creation based on subject and snippet.
 * @param {string} subject 
 * @param {string} snippet 
 * @returns {string} Source type (OTP, Welcome Email, Verification, Login Alert)
 */
function detectSource(subject, snippet) {
  const text = `${subject} ${snippet}`.toLowerCase();
  
  if (text.includes('otp') || text.includes('one-time') || text.includes('one time') || text.includes(' pin ')) {
    return 'OTP';
  }
  if (text.includes('verify') || text.includes('verification') || text.includes('confirm')) {
    return 'Verification';
  }
  if (text.includes('login') || text.includes('signin') || text.includes('authenticated') || text.includes('access')) {
    return 'Login Alert';
  }
  if (text.includes('welcome') || text.includes('created') || text.includes('register') || text.includes('signup')) {
    return 'Welcome Email';
  }
  
  return 'Welcome Email'; // fallback default
}

/**
 * Determines risk profile based on platform type.
 * @param {string} platform 
 * @returns {{ risk: string, retainedData: string[] }}
 */
function getRiskProfile(platform) {
  if (platformProfiles[platform]) {
    return platformProfiles[platform];
  }
  
  // Default fallback for unknown platforms (Low Risk)
  return {
    risk: 'LOW',
    retainedData: ['Profile Info', 'Email']
  };
}

/**
 * Formats a Date object or timestamp string to ISO Date (YYYY-MM-DD).
 * @param {string|number} dateStr 
 * @returns {string}
 */
function formatIsoDate(dateStr) {
  try {
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) {
      return new Date().toISOString().split('T')[0];
    }
    return d.toISOString().split('T')[0];
  } catch {
    return new Date().toISOString().split('T')[0];
  }
}

/**
 * Formats a Date object or timestamp string to a human-readable DD MMM YYYY format.
 * @param {string|number} dateStr 
 * @returns {string}
 */
function formatDateNicely(dateStr) {
  try {
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) {
      return '10 Jan 2023';
    }
    const day = d.getDate();
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    const month = months[d.getMonth()];
    const year = d.getFullYear();
    return `${day} ${month} ${year}`;
  } catch {
    return '10 Jan 2023';
  }
}

/**
 * Formats a Date object or timestamp string to a relative time string.
 * @param {string|number} dateStr 
 * @returns {string}
 */
function formatRelativeTime(dateStr) {
  try {
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) {
      return '4 days ago';
    }
    const now = new Date();
    const diffMs = now - d;
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
    
    if (diffDays <= 0) {
      return 'Today';
    }
    if (diffDays === 1) {
      return 'Yesterday';
    }
    if (diffDays < 30) {
      return `${diffDays} days ago`;
    }
    if (diffDays < 365) {
      const months = Math.floor(diffDays / 30);
      return `${months} month${months > 1 ? 's' : ''} ago`;
    }
    const years = Math.floor(diffDays / 365);
    return `${years} year${years > 1 ? 's' : ''} ago`;
  } catch {
    return '4 days ago';
  }
}

module.exports = {
  matchesScanKeywords,
  parseFromHeader,
  detectPlatform,
  detectSource,
  getRiskProfile,
  formatIsoDate,
  formatDateNicely,
  formatRelativeTime
};
