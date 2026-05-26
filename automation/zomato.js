/**
 * Zomato Account Deletion Automation Module
 * Flow: Homepage -> Click Login -> Wait for manual login -> Profile settings
 */
const { safeClick, safeFill, takeDebugScreenshot } = require('./helper');

async function run(page, credentials, log) {
  log('info', 'Starting Zomato deletion automation protocol...');
  
  // 1. Navigate to Zomato Homepage
  log('info', 'Navigating to Zomato homepage...');
  await page.goto('https://www.zomato.com/', { waitUntil: 'domcontentloaded' });

  // 2. Open Login Modal
  try {
    log('info', 'Opening Zomato sign-in drawer...');
    const loginLink = page.locator('span:has-text("Log in"), a:has-text("Log in"), p:has-text("Log in")').first();
    await loginLink.click();
    
    if (credentials && credentials.phone) {
      log('info', 'Autofilling phone number...');
      // Zomato might load phone input inside an iframe or custom dialog
      const phoneInput = page.locator('input[placeholder="Phone"], input[type="tel"]').first();
      if (await phoneInput.isVisible()) {
        await phoneInput.fill(credentials.phone);
        log('info', 'Phone number filled. Please complete the OTP verification in the browser.');
      }
    } else {
      log('info', 'Please sign in via OTP or social login in the open browser.');
    }
  } catch (err) {
    log('warn', 'Sign in trigger not found or user is already logged in. Please sign in manually if required.');
  }

  // 3. Wait for login completion
  log('info', 'Waiting for login completion in browser...');
  try {
    // Zomato session changes cookies or updates local storage when logged in.
    // We can check if "Log in" button disappears or is replaced by username
    await page.waitForFunction(() => {
      const text = document.body.innerText;
      return !text.includes('Log in') && (text.includes('Profile') || text.includes('Log out') || text.includes('My Account'));
    }, { timeout: 120000 });
    log('success', 'Logged in successfully.');
  } catch (err) {
    log('error', 'Login verification timed out. Please ensure you are logged in.');
    throw new Error('Login timed out');
  }

  // 4. Take screenshot of active profile dashboard
  log('info', 'Navigating to user profile information settings...');
  await takeDebugScreenshot(page, 'zomato', 'profile_view');

  log('success', 'Arrived at Zomato account dashboard.');
  log('success', 'Note: Zomato account deletion is handled via Zomato App -> Profile -> Settings -> Delete Account, or Zomato Web Support. Use this session to contact customer support or edit profile details.');
}

module.exports = { run };
