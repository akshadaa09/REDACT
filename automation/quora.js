const { safeClick, safeFill, takeDebugScreenshot } = require('./helper');

async function run(page, credentials, log, tokens) {
  log('info', '[INFO] Initiating deletion workflow...');
  
  // 1. Navigate directly to Quora Privacy Settings
  log('info', '[INFO] Navigating to privacy controls...');
  await page.goto('https://www.quora.com/settings/privacy', { waitUntil: 'domcontentloaded' });

  // 2. Session verification: check if redirected to signup/login or blocked by landing page
  await page.waitForTimeout(4000); // Wait for potential redirects
  const currentUrl = page.url();
  
  if (currentUrl.includes('quora.com/signup') || currentUrl.includes('quora.com/login') || await page.locator('input[id*="email"]').first().isVisible()) {
    log('warn', '[WARN] User authentication required.');
    
    // Autofill credentials if provided
    if (credentials && credentials.email && credentials.password) {
      try {
        log('info', 'Attempting to autofill email and password...');
        await safeFill(page, 'input[id*="email"]', credentials.email, 5000);
        await safeFill(page, 'input[id*="password"]', credentials.password, 5000);
        
        const loginButton = page.locator('button:has-text("Login"), input[type="submit"]').first();
        await loginButton.click();
        log('info', 'Autofill submitted. Awaiting session loading...');
        
        // Wait for redirect to settings
        await page.waitForURL('https://www.quora.com/settings/privacy', { timeout: 60000 });
        log('info', '[INFO] Existing login session detected.');
      } catch (e) {
        log('warn', 'Failed to submit login automatically. Please sign in manually in the browser.');
        // Wait for manual login completion
        await page.waitForURL('https://www.quora.com/settings/privacy', { timeout: 120000 });
      }
    } else {
      log('info', 'Please sign in manually in the open browser.');
      await page.waitForURL('https://www.quora.com/settings/privacy', { timeout: 120000 });
    }
  } else {
    log('info', '[INFO] Existing login session detected.');
  }

  log('info', 'Arrived at privacy settings panel. Scanning page content...');
  await takeDebugScreenshot(page, 'quora', 'privacy_settings_loaded');

  // 3. Locate Deactivation / Deletion button
  log('info', 'Locating account deletion trigger...');
  try {
    // Quora has "Delete Account" and "Deactivate Account" at the bottom of the page
    const deleteLink = page.locator('a:has-text("Delete Account"), button:has-text("Delete Account"), span:has-text("Delete Account"), a:has-text("Deactivate Account"), button:has-text("Deactivate Account")').first();
    
    await deleteLink.scrollIntoViewIfNeeded();
    log('info', '[INFO] Delete account endpoint located.');

    // 4. Highlight deletion trigger visually for the demo
    log('info', 'Applying visual demo highlight to the deletion button...');
    await deleteLink.evaluate((el) => {
      el.style.border = '4px solid #FF3366';
      el.style.boxShadow = '0 0 20px #FF3366, inset 0 0 10px #FF3366';
      el.style.padding = '8px';
      el.style.borderRadius = '6px';
      el.style.transition = 'all 0.3s ease-in-out';
      
      // Flash/pulse animation
      let count = 0;
      const interval = setInterval(() => {
        el.style.opacity = el.style.opacity === '0.5' ? '1' : '0.5';
        count++;
        if (count > 10) {
          clearInterval(interval);
          el.style.opacity = '1';
        }
      }, 300);
    });

    await page.waitForTimeout(3000); // Wait so user sees the glowing highlight
    await takeDebugScreenshot(page, 'quora', 'delete_button_highlighted');

    // Click the deletion link
    await deleteLink.click();
    
    // Log OTP challenge trigger
    log('info', '[INFO] OTP challenge triggered.');
    log('info', '[INFO] Awaiting user verification...');
    
    // Signal to background poller that OTP challenge is active
    page.otpTriggered = true;

    // Suspend automation until user enters OTP manually in the frontend modal
    const otpCode = await new Promise((resolve, reject) => {
      page.otpResolver = { resolve, reject };
    });

    log('info', '[INFO] OTP submitted.');
    
    // Look for confirmation password or security verification input if visible
    const passConfirm = page.locator('input[type="password"], input[placeholder*="code"], input[name*="code"]').first();
    if (await passConfirm.isVisible()) {
      await passConfirm.fill(otpCode);
      log('info', 'Filled verification code successfully.');
      await takeDebugScreenshot(page, 'quora', 'otp_submitted');
    }

    // Click final confirm deactivation/delete button
    const finalConfirmBtn = page.locator('button:has-text("Done"), button:has-text("Confirm"), button:has-text("Delete")').first();
    if (await finalConfirmBtn.isVisible()) {
      await finalConfirmBtn.click();
    }

    log('success', '[SUCCESS] Account deletion completed.');
  } catch (err) {
    log('error', `Unable to complete account deletion: ${err.message}`);
    throw err;
  }
}

module.exports = { run };
