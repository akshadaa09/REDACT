/**
 * Myntra Account Deletion Automation Module
 * Flow: Login -> Navigate to Profile Settings
 */
const { safeClick, safeFill, takeDebugScreenshot } = require('./helper');

async function run(page, credentials, log) {
  log('info', 'Starting Myntra deletion automation protocol...');
  
  // 1. Navigate to Myntra login
  log('info', 'Navigating to Myntra login page...');
  await page.goto('https://www.myntra.com/login', { waitUntil: 'domcontentloaded' });

  // 2. Autofill if phone provided
  if (credentials && credentials.phone) {
    try {
      log('info', 'Autofilling mobile number...');
      await safeFill(page, 'input[type="tel"]', credentials.phone, 5000);
      log('info', 'Mobile number entered. Please click continue and complete OTP entry.');
    } catch (e) {
      log('warn', 'Mobile number selector not found. Please type manually in the browser.');
    }
  } else {
    log('info', 'Please sign in manually in the visible browser.');
  }

  // 3. Wait for login completion
  log('info', 'Waiting for login completion in browser...');
  try {
    await page.waitForURL(url => !url.href.includes('/login'), { timeout: 120000 });
    log('success', 'Logged in successfully.');
  } catch (err) {
    log('error', 'Login verification timed out. Please ensure you are logged in to Myntra.');
    throw new Error('Login timed out');
  }

  // 4. Navigate directly to user profile dashboard
  log('info', 'Navigating to Myntra Profile dashboard...');
  await page.goto('https://www.myntra.com/my/dashboard', { waitUntil: 'networkidle' });
  await takeDebugScreenshot(page, 'myntra', 'dashboard_loaded');

  log('success', 'Arrived at Myntra Profile Settings.');
  log('success', 'Note: Under Myntra regulations, account deletion is managed via Profile -> Delete Account or Contact Us. Please proceed manually from this dashboard.');
}

module.exports = { run };
