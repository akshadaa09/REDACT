const { fetchLatestEmails } = require('./gmailService');
const { parseFromHeader } = require('../utils/platformDetector');

/**
 * Platform Domain Mapping
 */
const platformDomains = {
  reddit: ['reddit.com', 'redditmail.com'],
  linkedin: ['linkedin.com', 'e.linkedin.com']
};

/**
 * Extract OTP code using regex: \b\d{4,8}\b
 * @param {string} text
 * @returns {string|null} The extracted OTP string, or null
 */
function extractOTP(text) {
  if (!text) return null;
  const match = text.match(/\b\d{4,8}\b/);
  return match ? match[0] : null;
}

/**
 * Checks if the email matches platform constraints and keywords
 * @param {object} email The email record
 * @param {string} platformName The target platform (e.g. Reddit, LinkedIn)
 * @returns {boolean} True if matched
 */
function isMatchingEmail(email, platformName) {
  const { emailAddress } = parseFromHeader(email.from);
  const cleanAddress = (emailAddress || '').toLowerCase();
  
  // 1. Verify Sender Domain Matches Platform
  const expectedDomains = platformDomains[platformName.toLowerCase()] || [];
  const senderMatches = expectedDomains.some(domain => 
    cleanAddress === domain || cleanAddress.endsWith('.' + domain)
  );

  if (!senderMatches) {
    return false;
  }

  // 2. Inspect subject/snippet for OTP keyword match
  const keywords = ['otp', 'verification', 'security code', 'confirm', 'authenticate'];
  const content = `${email.subject || ''} ${email.snippet || ''}`.toLowerCase();
  
  return keywords.some(kw => content.includes(kw));
}

/**
 * Intercepts real OTP emails received in the user's Gmail inbox.
 * Polls the inbox for up to 30 seconds, retrying every 3 seconds.
 * 
 * @param {string} platformName Platform name (e.g. 'Reddit', 'LinkedIn')
 * @param {object} tokens Google OAuth credentials
 * @param {Function} log Custom logger from the controller
 * @returns {Promise<string>} The extracted OTP string
 */
async function getLatestOTP(platformName, tokens, log) {
  log('info', `[INFO] Waiting for verification email...`);

  const timeoutMs = 30000;
  const pollIntervalMs = 3000;
  const startTime = Date.now();

  while (Date.now() - startTime < timeoutMs) {
    try {
      // 1. Retrieve latest 20 emails
      const emails = await fetchLatestEmails(tokens, 20);

      // 2. Iterate and match starting with the most recent email
      for (const email of emails) {
        if (isMatchingEmail(email, platformName)) {
          // Check age to verify it's reasonably fresh
          const emailTime = new Date(email.timestamp).getTime();
          const ageSeconds = (Date.now() - emailTime) / 1000;
          
          // Log detection
          log('info', `[INFO] Verification email detected.`);

          // Extract OTP
          const otpCode = extractOTP(`${email.subject} ${email.snippet}`);
          if (otpCode) {
            log('info', `[INFO] OTP extracted successfully.`);
            return otpCode;
          }
        }
      }
    } catch (error) {
      console.error(`[DEBUG] Error during Gmail OTP interception:`, error);
    }

    // Wait for the next poll interval
    await new Promise(resolve => setTimeout(resolve, pollIntervalMs));
  }

  // If we exit loop without finding OTP, timeout
  log('error', `[ERROR] Verification timeout exceeded.`);
  throw new Error('Verification timeout exceeded');
}

module.exports = {
  getLatestOTP
};
