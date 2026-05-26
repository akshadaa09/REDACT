const sessions = new Map();

/**
 * Creates and registers a deletion session with a 2-minute automatic cleanup.
 * @param {string} sessionId Unique session token
 * @param {object} sessionData Session context mapping browser/page instances
 */
function createSession(sessionId, sessionData) {
  sessions.set(sessionId, sessionData);
  
  // Destroy session after 2 minutes (120,000 ms)
  setTimeout(() => {
    const session = sessions.get(sessionId);
    if (session) {
      console.log(`[INFO] Session ${sessionId} expired. Destroying context...`);
      if (session.browser) {
        try {
          session.browser.close();
        } catch (e) {
          console.error('[ERROR] Failed to close browser on session expiration:', e.message);
        }
      }
      sessions.delete(sessionId);
    }
  }, 120000);
}

/**
 * Retrieves a deletion session
 * @param {string} sessionId
 * @returns {object|undefined}
 */
function getSession(sessionId) {
  return sessions.get(sessionId);
}

/**
 * Removes and cleans up a deletion session
 * @param {string} sessionId
 */
function deleteSession(sessionId) {
  sessions.delete(sessionId);
}

module.exports = {
  createSession,
  getSession,
  deleteSession
};
