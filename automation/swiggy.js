/**
 * Swiggy Account Deletion Automation Module
 * Flow: Navigates to Swiggy homepage -> Click Login -> Wait for user OTP -> Navigate to Profile
 */
const { safeClick, safeFill, takeDebugScreenshot } = require('./helper');

async function run(page, credentials, log) {
  log('info', 'Starting Swiggy deletion automation protocol...');
  
  // 1. Navigate to Swiggy
  log('info', 'Navigating to Swiggy homepage...');
  await page.goto('https://www.swiggy.com/', { waitUntil: 'domcontentloaded' });

  // 2. Locate and click Login button
  try {
    log('info', 'Opening sign-in panel...');
    const loginLink = page.locator('a:has-text("Sign in"), span:has-text("Sign In"), a:has-text("Login")').first();
    await loginLink.click();
    
    // Fill phone number if available
    if (credentials && credentials.phone) {
      log('info', 'Autofilling phone number...');
      await safeFill(page, '#mobile', credentials.phone, 5000);
      log('info', 'Phone number filled. Please click "GET OTP" and complete the OTP sign-in in the browser.');
    } else {
      log('info', 'Please enter your mobile number and enter the OTP in the visible browser.');
    }
  } catch (err) {
    log('warn', 'Sign in trigger not found or already logged in. Please complete login manually.');
  }

  // 3. Wait for login completion
  log('info', 'Waiting for user to log in and access profile...');
  try {
    // Swiggy uses local storage or cookies once logged in. Let's wait for the "Sign In" link to disappear,
    // or wait for the My Account URL / logged in elements to be visible.
    await page.waitForFunction(() => {
      return document.cookie.includes('user_id') || 
             localStorage.getItem('user_meta') ||
             !document.body.innerText.includes('Sign In');
    }, { timeout: 120000 });
    log('success', 'Logged in successfully.');
  } catch (err) {
    log('error', 'Login verification timed out. Please ensure you are logged in.');
    throw new Error('Login timed out');
  }

  // 4. Navigate to My Account
  log('info', 'Navigating to Swiggy My Account profile dashboard...');
  await page.goto('https://www.swiggy.com/my-account', { waitUntil: 'networkidle' });
  await takeDebugScreenshot(page, 'swiggy', 'profile_loaded');

  log('success', 'Arrived at the Swiggy Profile settings.');
  log('success', 'Note: Swiggy web requires deletion requests to be finalized via Support/Settings. Please click "Edit Profile" or check the help section on this page.');
}

module.exports = { run };
