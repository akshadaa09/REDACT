/**
 * Spotify Account Deletion Automation Module
 * Flow: Login -> Navigate to Account Overview -> Search for Close Account link
 */
const { safeClick, safeFill, takeDebugScreenshot } = require('./helper');

async function run(page, credentials, log) {
  log('info', 'Starting Spotify deletion automation protocol...');
  
  // 1. Navigate to Spotify Login
  log('info', 'Navigating to Spotify login page...');
  await page.goto('https://accounts.spotify.com/en/login', { waitUntil: 'domcontentloaded' });

  // 2. Autofill if credentials are provided
  if (credentials && credentials.username && credentials.password) {
    try {
      log('info', 'Attempting to autofill username/email and password...');
      await safeFill(page, '#login-username', credentials.username, 5000);
      await safeFill(page, '#login-password', credentials.password, 5000);
      log('info', 'Credentials filled. Awaiting manual login submission...');
    } catch (e) {
      log('warn', 'Autofill elements not found. Please log in manually in the browser.');
    }
  } else {
    log('info', 'No credentials provided. Please sign in manually in the visible browser.');
  }

  // 3. Wait for login completion
  log('info', 'Waiting for login completion in browser...');
  try {
    await page.waitForURL(url => !url.href.includes('/login') && !url.href.includes('/accounts.spotify'), { timeout: 120000 });
    log('success', 'Logged in successfully.');
  } catch (err) {
    log('error', 'Login verification timed out. Please ensure you are logged in.');
    throw new Error('Login timed out');
  }

  // 4. Navigate directly to Account Overview / Settings
  log('info', 'Navigating to Spotify Account Overview...');
  await page.goto('https://www.spotify.com/in-en/account/overview/', { waitUntil: 'networkidle' });
  await takeDebugScreenshot(page, 'spotify', 'overview_loaded');

  // 5. Navigate to Close Account direct support page
  log('info', 'Navigating to Close Account flow...');
  await page.goto('https://support.spotify.com/in-en/article/close-account/', { waitUntil: 'networkidle' });
  
  try {
    // Locate the "Close your account and delete your data" link/button
    const closeAccountLink = page.locator('a:has-text("Close your account"), a[href*="close-account"]').first();
    if (await closeAccountLink.isVisible()) {
      await closeAccountLink.click();
      log('info', 'Clicked close account initiation button.');
    }
    
    await takeDebugScreenshot(page, 'spotify', 'close_flow_initiated');
    log('success', 'Arrived at the Spotify Close Account confirmation screen.');
    log('success', 'Please complete the multi-step verification and confirm manually.');
  } catch (err) {
    log('warn', 'Direct close account link not clickable automatically. Please click "Close your account" on this support page manually.');
  }
}

module.exports = { run };
