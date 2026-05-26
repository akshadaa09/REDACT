const playwright = require('playwright');
const path = require('path');
const fs = require('fs');

/**
 * Launches a Chromium browser instance visibly with default settings.
 * Reuses an existing persistent Chrome profile inside the workspace to retain sessions/cookies.
 * @param {Object} options Options for launch.
 * @returns {Promise<{browser: import('playwright').BrowserContext, context: import('playwright').BrowserContext, page: import('playwright').Page}>}
 */
async function launchBrowser(options = {}) {
  const { headless = false, slowMo = 100 } = options;
  
  const userDataDir = path.join(__dirname, '../chrome_user_data');
  if (!fs.existsSync(userDataDir)) {
    fs.mkdirSync(userDataDir, { recursive: true });
  }

  // Launch a persistent context directly.
  // In Playwright, launchPersistentContext returns a BrowserContext object.
  const context = await playwright.chromium.launchPersistentContext(userDataDir, {
    headless,
    slowMo,
    viewport: null, // Allow full window size
    args: ['--start-maximized'],
    userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
  });

  const page = context.pages().length > 0 ? context.pages()[0] : await context.newPage();
  
  // Return the context as both context and 'browser' to preserve compatibility with existing controller close/lifecycles
  return { browser: context, context, page };
}

/**
 * Creates a standard JSON-line stream log writer.
 * @param {import('express').Response} res Express response object.
 * @returns {Function} A function that logs structured messages to the response.
 */
function createLogger(res) {
  return (type, message) => {
    const logData = {
      timestamp: new Date().toISOString(),
      type: type.toLowerCase(), // 'info', 'success', 'warn', 'error'
      message
    };
    console.log(`[${type.toUpperCase()}] ${message}`);
    if (res && !res.writableEnded) {
      res.write(JSON.stringify(logData) + '\n');
    }
  };
}

/**
 * Helper to capture a screenshot for developer debugging/verification.
 * @param {import('playwright').Page} page Playwright Page instance.
 * @param {string} platform Platform name.
 * @param {string} step Step identifier.
 */
async function takeDebugScreenshot(page, platform, step) {
  try {
    const dir = path.join(__dirname, '../debug_screenshots');
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    const filename = `${platform}_${step}_${Date.now()}.png`;
    const filepath = path.join(dir, filename);
    await page.screenshot({ path: filepath });
    console.log(`[DEBUG] Screenshot captured: ${filepath}`);
  } catch (error) {
    console.error('[DEBUG] Failed to capture screenshot:', error);
  }
}

/**
 * Safely clicks an element after waiting for it.
 * @param {import('playwright').Page} page Playwright page.
 * @param {string} selector CSS selector.
 * @param {number} timeout Timeout in milliseconds.
 */
async function safeClick(page, selector, timeout = 10000) {
  await page.waitForSelector(selector, { state: 'visible', timeout });
  await page.click(selector);
}

/**
 * Safely fills a form input.
 * @param {import('playwright').Page} page Playwright page.
 * @param {string} selector CSS selector.
 * @param {string} text Text to fill.
 * @param {number} timeout Timeout in ms.
 */
async function safeFill(page, selector, text, timeout = 10000) {
  await page.waitForSelector(selector, { state: 'visible', timeout });
  await page.fill(selector, text);
}

module.exports = {
  launchBrowser,
  createLogger,
  takeDebugScreenshot,
  safeClick,
  safeFill
};
