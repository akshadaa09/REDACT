/**
 * Centralized Automation Controller
 * Dynamically resolves platform execution scripts and handles the browser session lifecycle
 */
const { launchBrowser, createLogger } = require('./helper');
const path = require('path');
const fs = require('fs');

/**
 * Executes the account deletion flow for a specific platform.
 * @param {string} platform The target platform (e.g., 'reddit', 'quora', 'linkedin')
 * @param {Object} credentials User credentials provided (username, password, email, phone, etc.)
 * @param {import('express').Response} res Express response stream object
 * @param {Object} tokens Google OAuth credentials/tokens
 */
async function executePurge(platform, credentials, res, tokens) {
  const log = createLogger(res);
  let browserInstance = null;

  try {
    const normalizedPlatform = platform.toLowerCase().trim();
    const scriptPath = path.join(__dirname, `./${normalizedPlatform}.js`);

    log('info', `Initializing Autonomous Deletion Engine for platform: ${normalizedPlatform.toUpperCase()}`);

    // Check if the script exists
    if (!fs.existsSync(scriptPath)) {
      log('error', `Platform '${normalizedPlatform}' is not currently supported by the REDACT engine.`);
      res.end();
      return;
    }

    // Load the platform module
    const platformModule = require(scriptPath);

    // Launch visible browser
    log('info', 'Bootstrapping secure, isolated Chromium instance...');
    const { browser, page } = await launchBrowser({ headless: false, slowMo: 100 });
    browserInstance = browser;

    log('success', 'Chromium sandbox active and visible.');

    // Execute the automation script
    await platformModule.run(page, credentials, log, tokens);

    log('success', `Deletion sequence completed successfully. Keeping browser open for final manual confirmation.`);
    
    // Close response stream
    res.end();

  } catch (error) {
    log('error', `Automation run encountered an error: ${error.message}`);
    
    // Attempt to close response stream gracefully
    if (res && !res.writableEnded) {
      res.end();
    }
  }
}

module.exports = { executePurge };
