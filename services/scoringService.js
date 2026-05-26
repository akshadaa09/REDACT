/**
 * REDACT Privacy Intelligence Engine - Scoring Service
 * 
 * Computes threat scores per account, generates the overall Digital Exposure Score,
 * maps exposure status, and compiles dynamic cybersecurity insights.
 */

/**
 * Calculates the individual Threat Score (0-100) for a platform.
 * 
 * @param {string} risk Platform risk level (LOW, MEDIUM, HIGH, CRITICAL)
 * @param {boolean} breachDetected True if a database breach has been registered
 * @param {string[]} retainedData Estimated personal data attributes
 * @returns {number} Threat Score (integer, 0 to 100)
 */
function calculateAccountThreatScore(risk, breachDetected, retainedData) {
  let score = 20; // default LOW

  switch (risk) {
    case 'CRITICAL':
      score = 80;
      break;
    case 'HIGH':
      score = 60;
      break;
    case 'MEDIUM':
      score = 40;
      break;
    case 'LOW':
    default:
      score = 20;
      break;
  }

  // Adjustments
  if (breachDetected) {
    score += 15;
  }

  // Sensitive data weightings
  const hasSensitiveData = retainedData.some(item => 
    ['phone', 'financials', 'location', 'gps history', 'card tokens', 'id verification']
      .includes(item.toLowerCase())
  );
  if (hasSensitiveData) {
    score += 7;
  }

  // Cap score between 0 and 100
  return Math.min(Math.max(score, 0), 100);
}

/**
 * Calculates the overall Digital Exposure Score and outputs status and cybersecurity insights.
 * 
 * @param {Array} accounts List of analyzed account objects
 * @returns {object} Object containing exposureScore, status, and insights array
 */
function calculateOverallExposure(accounts) {
  if (!accounts || accounts.length === 0) {
    return {
      exposureScore: 0,
      status: 'SAFE / NO EXPOSURE',
      insights: [
        'No digital footprint matches found in analyzed datasets.',
        'Zero active ghost accounts or historic data breaches detected.'
      ]
    };
  }

  // 1. Calculate individual account scores and find max/average
  const threatScores = accounts.map(a => a.threatScore);
  const maxThreat = Math.max(...threatScores);
  const avgThreat = threatScores.reduce((sum, val) => sum + val, 0) / threatScores.length;

  // 2. Weighted formula to model real threat density (60% Max + 40% Average)
  let overallScore = Math.round((maxThreat * 0.6) + (avgThreat * 0.4));
  overallScore = Math.min(Math.max(overallScore, 0), 100);

  // 3. Status mappings
  let status = 'LOW';
  if (overallScore >= 80) {
    status = 'CRITICAL';
  } else if (overallScore >= 50) {
    status = 'HIGH';
  } else if (overallScore >= 30) {
    status = 'MODERATE';
  }

  // 4. Generate dynamic security insights using realistic terminology
  const insights = [];
  const breachedCount = accounts.filter(a => a.breachDetected).length;
  
  if (breachedCount > 0) {
    insights.push(`${breachedCount} scanned services contain historical breach records on the dark web.`);
  } else {
    insights.push('Zero direct database breaches registered for active platform footprints.');
  }

  // Estimate phone number distribution density
  const phoneExposedCount = accounts.filter(a => 
    a.retainedData.some(d => d.toLowerCase().includes('phone'))
  ).length;

  if (phoneExposedCount > 0) {
    insights.push(`Phone number exposed across ${phoneExposedCount} high-risk marketing and service directories.`);
  }

  // Location/GPS Exposure alert
  const locationExposedCount = accounts.filter(a => 
    a.retainedData.some(d => ['location', 'gps history'].includes(d.toLowerCase()))
  ).length;

  if (locationExposedCount > 0) {
    insights.push(`Real-time physical location or GPS history cached by ${locationExposedCount} service containers.`);
  }

  // Default fallback insight to ensure a clean visual dashboard
  if (insights.length < 2) {
    insights.push('Identity profile demonstrates acceptable privacy hygiene levels.');
  }

  return {
    exposureScore: overallScore,
    status,
    insights
  };
}

module.exports = {
  calculateAccountThreatScore,
  calculateOverallExposure
};
