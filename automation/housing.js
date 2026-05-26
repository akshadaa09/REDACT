/**
 * Housing.com Account Deletion Automation Module
 * Flow: Homepage -> Click Login -> Wait for user OTP -> Navigate to Profile
 */
const { safeClick, safeFill, takeDebugScreenshot } = require('./helper');

async function run(page, credentials, log) {
  log('info', 'Starting Housing.com deletion automation protocol...');
  
  // 1. Navigate to Housing.com Homepage
  log('info', 'Navigating to Housing.com homepage...');
  await page.goto('https://housing.com/', { waitUntil: 'domcontentloaded' });

  // 2. Open Login Pane
  try {
    log('info', 'Opening Sign In window...');
    const loginBtn = page.locator('span:has-text("Login"), button:has-text("Login"), div:has-text("Login")').first();
    await loginBtn.click();
    
    if (credentials && credentials.phone) {
      log('info', 'Autofilling mobile number...');
      const phoneInput = page.locator('input[type="tel"], input[placeholder*="Mobile"]').first();
      if (await phoneInput.isVisible()) {
        await phoneInput.fill(credentials.phone);
        log('info', 'Phone number filled. Please complete the OTP entry in the open browser.');
      }
    } else {
      log('info', 'Please sign in via OTP manually in the visible browser.');
    }
  } catch (err) {
    log('warn', 'Sign in trigger not found. Please log in manually if needed.');
  }

  // 3. Wait for login completion
  log('info', 'Waiting for login completion in browser...');
  try {
    // Housing.com shows user avatar or profile options when logged in
    await page.waitForFunction(() => {
      const text = document.body.innerText;
      return !text.includes('Login') && (text.includes('My Profile') || text.includes('Logout') || text.includes('Dashboard'));
    }, { timeout: 120000 });
    log('success', 'Logged in successfully.');
  } catch (err) {
    log('error', 'Login verification timed out. Please ensure you are logged in.');
    throw new Error('Login timed out');
  }

  // 4. Navigate to profile dashboard
  log('info', 'Navigating to Housing.com My Profile dashboard...');
  await page.goto('https://housing.com/my-profile', { waitUntil: 'networkidle' });
  await takeDebugScreenshot(page, 'housing', 'profile_view');

  log('success', 'Arrived at Housing.com user settings page.');
  log('success', 'Note: Account deactivation/deletion can be completed via Settings -> Account Deactivation or by contacting Housing.com support.');
}

module.exports = { run };
