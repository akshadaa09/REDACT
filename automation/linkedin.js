const { safeClick, safeFill, takeDebugScreenshot } = require('./helper');
const { getLatestOTP } = require('../services/otpService');

async function run(page, credentials, log, tokens) {
  log('info', '[INFO] Initiating deletion workflow...');
  
  // 1. Navigate to LinkedIn login page
  log('info', 'Navigating to LinkedIn login page...');
  await page.goto('https://www.linkedin.com/login', { waitUntil: 'domcontentloaded' });

  // 2. Autofill credentials if provided
  if (credentials && credentials.username && credentials.password) {
    try {
      log('info', 'Attempting to autofill username and password...');
      await safeFill(page, '#username', credentials.username, 5000);
      await safeFill(page, '#password', credentials.password, 5000);
      
      // Submit login form automatically if credentials are provided
      await page.click('button[type="submit"]');
      log('info', 'Credentials submitted automatically.');
    } catch (e) {
      log('warn', 'Failed to find login inputs automatically. Please login manually.');
    }
  } else {
    log('info', 'No credentials provided. Please sign in manually in the visible browser.');
  }

  // 3. Wait for login completion or challenge checkpoint
  log('info', 'Waiting for login completion in browser...');
  try {
    await page.waitForURL(url => {
      const u = url.href;
      return (u.includes('/feed') || u.includes('/mynetwork') || u.includes('/psettings') || u.includes('/checkpoint/challenge') || (!u.includes('/login') && !u.includes('/checkpoint')));
    }, { timeout: 120000 });
    
    // Check if we hit an OTP Verification Challenge
    if (page.url().includes('/checkpoint/challenge')) {
      log('info', 'Security verification challenge detected.');
      
      // Wait a moment for challenge page to render
      await page.waitForTimeout(3000);

      // Fetch OTP from Gmail
      const otpCode = await getLatestOTP('LinkedIn', tokens, log);
      
      log('info', 'Filling OTP code into LinkedIn verification form...');
      // Common LinkedIn Pin input selectors:
      // #input__email_verification_pin, #email-pin, input[name="pin"]
      const otpInputSelector = '#input__email_verification_pin, #email-pin, input[name="pin"]';
      await safeFill(page, otpInputSelector, otpCode, 10000);
      
      await takeDebugScreenshot(page, 'linkedin', 'otp_autofilled');
      
      // Click Submit/Verify button
      // Common submit button selectors: #email-pin-submit-button, button[type="submit"]
      const submitSelector = '#email-pin-submit-button, button[type="submit"], input[type="submit"]';
      await page.click(submitSelector);
      
      log('info', 'OTP submitted successfully. Resuming verification...');
      
      // Wait for checkpoint page to finish redirecting
      await page.waitForURL(url => !url.href.includes('/checkpoint'), { timeout: 30000 });
    }

    log('success', 'Logged in successfully.');
  } catch (err) {
    log('error', 'Login verification timed out or OTP extraction failed. Please ensure you are logged in.');
    throw err;
  }

  // 4. Navigate directly to Account Closure Page
  log('info', 'Navigating to LinkedIn account closure panel...');
  await page.goto('https://www.linkedin.com/psettings/account-management/close-submit', { waitUntil: 'networkidle' });
  await takeDebugScreenshot(page, 'linkedin', 'close_account_loaded');

  log('success', 'Arrived at the final LinkedIn Account Close settings page.');
  
  // Try to click 'Next' / 'Submit' on deactivation flow if visible
  try {
    // Select any reason if checkboxes exist
    const firstCheckbox = page.locator('input[type="radio"], input[type="checkbox"]').first();
    if (await firstCheckbox.isVisible()) {
      await firstCheckbox.click();
      log('info', 'Selected account closure reason.');
    }

    const nextBtn = page.locator('button:has-text("Next"), button:has-text("Continue")').first();
    if (await nextBtn.isVisible()) {
      await nextBtn.click();
      log('info', 'Progressing to final verification...');
      
      // Fill password again if prompted on the final closure step
      if (credentials && credentials.password) {
        const passField = page.locator('input[type="password"]').first();
        if (await passField.isVisible()) {
          await passField.fill(credentials.password);
          log('info', 'Re-entered password for security verification.');
        }
      }

      const closeBtn = page.locator('button:has-text("Close Account"), button:has-text("Done")').first();
      if (await closeBtn.isVisible()) {
        await closeBtn.click();
        log('success', '[SUCCESS] Account deletion confirmed.');
        return;
      }
    }
  } catch (e) {
    log('warn', 'Manual step selection needed on closure page.');
  }

  log('success', 'Please select a reason for closing, then click next to finalize closure manually.');
}

module.exports = { run };
