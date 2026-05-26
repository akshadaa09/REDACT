const { google } = require('googleapis');
const { OAuth2Client } = require('google-auth-library');

/**
 * Initializes and returns an authenticated Gmail client instance.
 * @param {object} sessionTokens 
 * @returns {object} Gmail API client
 */
function getGmailClient(sessionTokens) {
  const oauth2Client = new OAuth2Client(
    process.env.GOOGLE_CLIENT_ID,
    process.env.GOOGLE_CLIENT_SECRET,
    process.env.GOOGLE_CALLBACK_URL
  );
  oauth2Client.setCredentials(sessionTokens);
  return google.gmail({ version: 'v1', auth: oauth2Client });
}

/**
 * Fetches the latest emails from the authenticated user's inbox,
 * extracting sender, subject, snippet, and timestamp.
 * 
 * @param {object} sessionTokens 
 * @param {number} maxResults
 * @returns {Promise<Array>} List of extracted email objects
 */
async function fetchLatestEmails(sessionTokens, maxResults = 20) {
  console.log('[DEBUG] [fetchLatestEmails] Initiating connection to Gmail API with tokens...');
  const gmail = getGmailClient(sessionTokens);
  
  try {
    const maxResultsToFetch = maxResults; 
    console.log(`[DEBUG] [fetchLatestEmails] Requesting latest ${maxResultsToFetch} messages matching auth query from users.messages.list...`);
    
    const listRes = await gmail.users.messages.list({
      userId: 'me',
      maxResults: maxResultsToFetch,
      q: 'welcome OR otp OR verify OR login OR signup OR confirm OR "one-time" OR "verification" OR "account"'
    }, {
      timeout: 10000 // 10s request timeout
    });
    
    console.log('[DEBUG] [fetchLatestEmails] Gmail messages.list response received successfully.');
    const messages = listRes.data.messages || [];
    console.log(`[DEBUG] [fetchLatestEmails] Found ${messages.length} raw message references.`);
    
    if (messages.length === 0) {
      console.log('[DEBUG] [fetchLatestEmails] Zero messages returned from Gmail.');
      return [];
    }
    
    // 2. Fetch details for each message concurrently with 'metadata' format
    // to keep the request payload light and fast.
    const detailPromises = messages.map(async (msg) => {
      try {
        console.log(`[DEBUG] [fetchLatestEmails] Fetching metadata for message ID: ${msg.id}`);
        const detailRes = await gmail.users.messages.get({
          userId: 'me',
          id: msg.id,
          format: 'metadata',
          metadataHeaders: ['From', 'Subject', 'Date']
        }, {
          timeout: 6000 // 6s request timeout per message
        });
        
        const data = detailRes.data;
        const headers = data.payload.headers || [];
        
        // Extract required headers
        const fromHeader = (headers.find(h => h.name.toLowerCase() === 'from') || {}).value || '';
        const subjectHeader = (headers.find(h => h.name.toLowerCase() === 'subject') || {}).value || '';
        const dateHeader = (headers.find(h => h.name.toLowerCase() === 'date') || {}).value || '';
        
        console.log(`[DEBUG] [fetchLatestEmails] Success: ID ${msg.id} | From: "${fromHeader}" | Subject: "${subjectHeader}"`);
        return {
          id: data.id,
          from: fromHeader,
          subject: subjectHeader,
          snippet: data.snippet || '',
          timestamp: dateHeader
        };
      } catch (err) {
        // 8. Add proper error logs if Gmail API fails.
        console.error(`[DEBUG] [ERROR] [fetchLatestEmails] Failed to retrieve details for message ID ${msg.id}:`, err);
        return null; // return null to filter out cleanly
      }
    });
    
    const emails = await Promise.all(detailPromises);
    const validEmails = emails.filter(Boolean);
    console.log(`[DEBUG] [fetchLatestEmails] Successfully parsed metadata for ${validEmails.length} out of ${messages.length} messages.`);
    return validEmails;
    
  } catch (error) {
    // 8. Add proper error logs if Gmail API fails.
    console.error('[DEBUG] [ERROR] [fetchLatestEmails] Exception occurred during users.messages.list execution:', error);
    throw new Error('Gmail integration scan failed. Ensure OAuth scopes are correct and tokens are valid. Error: ' + error.message);
  }
}

module.exports = {
  fetchLatestEmails
};
