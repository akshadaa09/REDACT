/**
 * Amazon India Account Deletion Automation Module
 * Flow: Login -> Navigate directly to Close Account page -> Check acknowledgment checkbox
 */
const { safeClick, safeFill, takeDebugScreenshot } = require('./helper');

async function run(page, credentials, log) {
  log('info', 'Starting Amazon India deletion automation protocol...');
  
  // 1. Navigate to Amazon India Sign-In Page
  log('info', 'Navigating to Amazon India login page...');
  await page.goto('https://www.amazon.in/gp/navigation/signin.html', { waitUntil: 'domcontentloaded' });

  // 2. Autofill credentials with multi-stage support if provided
  if (credentials && (credentials.email || credentials.phone) && credentials.password) {
    try {
      const username = credentials.email || credentials.phone;
      log('info', 'Attempting to autofill username/email...');
      await safeFill(page, '#ap_email', username, 5000);
      await safeClick(page, '#continue', 5000);
      
      log('info', 'Autofilling password...');
      await safeFill(page, '#ap_password', credentials.password, 5000);
      log('info', 'Credentials filled. Awaiting manual Captcha or Login submission...');
    } catch (e) {
      log('warn', 'Multi-stage login autofill encountered a layout shift or captcha. Please input manually.');
    }
  } else {
    log('info', 'No credentials provided. Please sign in manually in the visible browser.');
  }

  // 3. Wait for login completion
  log('info', 'Waiting for login completion in browser...');
  try {
    await page.waitForURL(url => !url.href.includes('/ap/signin') && !url.href.includes('/signin'), { timeout: 120000 });
    log('success', 'Logged in successfully.');
  } catch (err) {
    log('error', 'Login verification timed out. Please ensure you are logged in to Amazon.');
    throw new Error('Login timed out');
  }

  // 4. Navigate directly to Close Account page
  log('info', 'Navigating to Amazon Close Account / Privacy Settings...');
  await page.goto('https://www.amazon.in/privacy/close-account', { waitUntil: 'networkidle' });
  await takeDebugScreenshot(page, 'amazon', 'close_page_loaded');

  // 5. Scroll down to the bottom where the close options reside
  log('info', 'Scrolling to Close Account confirmation checkbox...');
  try {
    await page.evaluate(() => {
      window.scrollTo(0, document.body.scrollHeight);
    });

    // Check the box that says "Yes, I want to permanently close my Amazon Account and delete my data"
    const checkbox = page.locator('input[type="checkbox"][name="consentCategoryCheckbox"], input[id="consentCategoryCheckbox"]');
    if (await checkbox.isVisible()) {
      await checkbox.check();
      log('info', 'Checked the Amazon Data Erasure and Account Closure acknowledgment checkbox.');
    }
    
    await takeDebugScreenshot(page, 'amazon', 'checkbox_checked');
    log('success', 'Arrived at the final Amazon India Account Closure section.');
    log('success', 'Please select a reason in the dropdown and click "Close My Account" manually to finalize.');
  } catch (err) {
    log('warn', 'Unable to automatically check the agreement checkbox. Please scroll to the bottom, check the box and submit manually.');
  }
}

module.exports = { run };
