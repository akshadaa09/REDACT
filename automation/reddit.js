const { safeClick, safeFill, takeDebugScreenshot } = require('./helper');
const { getLatestOTP } = require('../services/otpService');

async function run(page, credentials, log, tokens) {
  log('info', '[INFO] Initiating deletion workflow...');
  
  // 1. Navigate to Reddit Login
  log('info', 'Navigating to Reddit login page...');
  await page.goto('https://www.reddit.com/login', { waitUntil: 'domcontentloaded' });
  
  // 2. Try to fill credentials if provided
  if (credentials && credentials.username && credentials.password) {
    try {
      log('info', 'Attempting to auto-fill username and password...');
      await safeFill(page, '#login-username', credentials.username, 5000);
      await safeFill(page, '#login-password', credentials.password, 5000);
      
      // Auto submit login
      await page.click('button[type="submit"]');
      log('info', 'Credentials filled and submitted. Awaiting manual login submission or multi-factor authentication...');
    } catch (e) {
      log('warn', 'Auto-fill elements not found. Please log in manually in the open browser.');
    }
  } else {
    log('info', 'No credentials provided. Please sign in manually in the visible browser window.');
  }

  // 3. Wait for user to be logged in
  log('info', 'Waiting for login completion in browser...');
  try {
    // Wait for the URL to change away from login, or look for standard logged-in markers
    await page.waitForURL(url => !url.href.includes('/login'), { timeout: 120000 });
    log('success', 'Logged in successfully.');
  } catch (err) {
    log('error', 'Login verification timed out. Please ensure you are logged in.');
    throw new Error('Login timed out');
  }

  // 4. Navigate to Settings page
  log('info', 'Navigating to Reddit Account Settings...');
  await page.goto('https://www.reddit.com/settings', { waitUntil: 'networkidle' });
  await takeDebugScreenshot(page, 'reddit', 'settings_loaded');

  // 5. Scroll to bottom to find "Delete Account" / "Deactivate Account" button
  log('info', 'Locating account deactivation trigger...');
  try {
    // Reddit has a button with text "DEACTIVATE ACCOUNT" or a red text link at the bottom
    await page.evaluate(() => {
      window.scrollTo(0, document.body.scrollHeight);
    });
    
    // Find the deactivation trigger
    // It's typically a button or link containing "deactivate" or "Deactivate"
    const deactivateBtn = page.locator('button:has-text("Deactivate"), a:has-text("Deactivate"), button:has-text("DEACTIVATE")').first();
    await deactivateBtn.scrollIntoViewIfNeeded();
    await deactivateBtn.click();
    
    log('success', 'Deactivation dialog opened successfully.');
    await takeDebugScreenshot(page, 'reddit', 'deactivate_modal');
    
    // Reddit deactivation requires confirming password & username, and clicking "I understand..." checkbox.
    // If a deactivation confirmation or OTP security challenge appears:
    if (credentials && credentials.password) {
      log('info', 'Filling deactivation confirmation forms...');
      
      const userField = page.locator('input[placeholder="username"], input[name="username"]').first();
      if (await userField.isVisible()) {
        await userField.fill(credentials.username || '');
      }

      const passField = page.locator('input[type="password"]').first();
      if (await passField.isVisible()) {
        await passField.fill(credentials.password);
      }

      // Checkbox "I understand that deactivated accounts are not recoverable"
      const checkbox = page.locator('input[type="checkbox"], .icon-checkbox').first();
      if (await checkbox.isVisible()) {
        await checkbox.click();
      }

      // If Reddit sends verification OTP during deactivation/deletion or if challenge page appears:
      // (This serves as a placeholder for a deletion OTP challange if encountered)
      const otpInput = page.locator('input[placeholder="OTP"], input[name="otp"], input[name="code"]').first();
      if (await otpInput.isVisible()) {
        const otpCode = await getLatestOTP('Reddit', tokens, log);
        await otpInput.fill(otpCode);
        log('info', 'Autofilled Reddit deactivation security code.');
      }

      const confirmDeactivateBtn = page.locator('button:has-text("Deactivate"), button:has-text("DEACTIVATE")').first();
      if (await confirmDeactivateBtn.isVisible() && await confirmDeactivateBtn.isEnabled()) {
        await confirmDeactivateBtn.click();
        log('success', '[SUCCESS] Account deletion confirmed.');
        return;
      }
    }
    
    log('success', 'Arrived at the final Reddit Deactivation confirmation. Awaiting manual confirmation.');
  } catch (err) {
    log('warn', 'Could not automate clicking the deactivation button. Please click "Deactivate Account" at the bottom of the page manually.');
  }
}

module.exports = { run };
