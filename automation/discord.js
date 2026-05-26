/**
 * Discord Account Deletion Automation Module
 * Flow: Login -> Settings -> User Profile -> Scroll to Delete Account
 */
const { safeClick, safeFill, takeDebugScreenshot } = require('./helper');

async function run(page, credentials, log) {
  log('info', 'Starting Discord deletion automation protocol...');
  
  // 1. Navigate to Discord Web App Login
  log('info', 'Navigating to Discord login page...');
  await page.goto('https://discord.com/login', { waitUntil: 'domcontentloaded' });

  // 2. Autofill credentials if provided
  if (credentials && credentials.email && credentials.password) {
    try {
      log('info', 'Attempting to autofill email and password...');
      await safeFill(page, 'input[name="email"]', credentials.email, 5000);
      await safeFill(page, 'input[name="password"]', credentials.password, 5000);
      log('info', 'Credentials filled. Awaiting manual captcha/login completion...');
    } catch (e) {
      log('warn', 'Failed to find credentials inputs. Please fill manually.');
    }
  } else {
    log('info', 'No credentials provided. Please sign in manually in the visible browser window.');
  }

  // 3. Wait for login completion
  log('info', 'Waiting for login completion...');
  try {
    await page.waitForURL(url => url.href.includes('/channels/@me'), { timeout: 120000 });
    log('success', 'Logged in successfully.');
  } catch (err) {
    log('error', 'Login verification timed out. Please ensure you are logged in to the Discord app.');
    throw new Error('Login timed out');
  }

  // 4. Open User Settings
  log('info', 'Navigating to user settings...');
  try {
    // Click the settings gear icon in the bottom-left corner of Discord's dashboard layout
    // The settings gear button has an aria-label="User Settings"
    const settingsButton = page.locator('button[aria-label="User Settings"]');
    await settingsButton.waitFor({ state: 'visible', timeout: 15000 });
    await settingsButton.click();
    log('info', 'User settings pane opened.');
    await takeDebugScreenshot(page, 'discord', 'settings_opened');
  } catch (err) {
    log('warn', 'Failed to locate Settings button automatically. Please click settings manually.');
  }

  // 5. Scroll to bottom of the "My Account" page to reveal deletion controls
  log('info', 'Locating account deletion options...');
  try {
    // Discord loads "My Account" by default. Let's find "Delete Account" button.
    const deleteBtn = page.locator('button:has-text("Delete Account")');
    await deleteBtn.scrollIntoViewIfNeeded();
    await deleteBtn.click();
    
    log('success', 'Delete Account dialog triggered.');
    await takeDebugScreenshot(page, 'discord', 'delete_modal');
    log('success', 'Arrived at the final Discord delete account dialog. Awaiting manual input.');
  } catch (err) {
    log('warn', 'Unable to automatically trigger Delete Account button. Please select "My Account" settings and scroll to the bottom to find account options.');
  }
}

module.exports = { run };
