/**
 * REDACT - AI Privacy Intelligence Platform
 * High-Performance Client-Side Controller
 */

// Central State Management (preventing duplicates and interval spam)
const state = {
  user: null,
  exposureReport: null,
  isScanning: false,
  hasInitialized: false,
  detectedPlatforms: []
};

// Helper: Robust fetch with timeout & console telemetry
async function fetchWithTimeout(resource, options = {}) {
  const { timeout = 12000 } = options; // Default 12s timeout
  const controller = new AbortController();
  const id = setTimeout(() => controller.abort(), timeout);
  
  console.log(`[API Request] ${options.method || 'GET'} ${resource} - Dispatching`);
  try {
    const response = await fetch(resource, {
      ...options,
      signal: controller.signal
    });
    clearTimeout(id);
    console.log(`[API Response] ${options.method || 'GET'} ${resource} - Status: ${response.status}`);
    return response;
  } catch (error) {
    clearTimeout(id);
    console.error(`[API Error] ${options.method || 'GET'} ${resource} - Failed:`, error.message || error);
    throw error;
  }
}

// ==========================================
// 1. STABLE STARTUP & SESSION VALIDATION
// ==========================================
document.addEventListener('DOMContentLoaded', () => {
  if (state.hasInitialized) return;
  state.hasInitialized = true;
  
  validateSession();
  initDashboardControls();
  initBroadcastListener();
});

function initBroadcastListener() {
  try {
    const channel = new BroadcastChannel('privacy-updates');
    channel.onmessage = async (event) => {
      console.log('[BroadcastChannel] Received message:', event.data);
      if (event.data && (event.data.type === 'purge' || event.data.type === 'cleanup')) {
        if (event.data.type === 'purge') {
          const platformToPurge = event.data.platform.toLowerCase().trim();
          console.log(`[BroadcastChannel] Purging platform card: ${platformToPurge}`);
          
          // Find the card element for this platform and fade/slide it out
          const card = document.querySelector(`[data-platform="${platformToPurge}"]`);
          if (card) {
            card.style.transition = 'all 0.5s cubic-bezier(0.4, 0, 0.2, 1)';
            card.style.opacity = '0';
            card.style.transform = 'scale(0.9) translateY(-10px)';
            setTimeout(() => {
              card.remove();
            }, 500);
          }
        } else {
          console.log(`[BroadcastChannel] Cleanup event received. Refreshing exposure index.`);
        }
        
        // Fetch the updated exposure report from the backend after 500ms
        setTimeout(async () => {
          try {
            const res = await fetchWithTimeout('/api/exposure-report', { credentials: 'include', timeout: 10000 });
            if (res.ok) {
              const data = await res.json();
              state.exposureReport = data;
              state.detectedPlatforms = data.accounts || [];
              updateDashboardUI(data);
            }
          } catch (err) {
            console.error('Failed to refetch exposure report after broadcast update:', err);
          }
        }, 500);
      }
    };
  } catch (bcErr) {
    console.error('Failed to initialize BroadcastChannel listener:', bcErr);
  }
}

async function validateSession() {
  try {
    // Single robust fetch call on startup with timeout
    const res = await fetchWithTimeout('/api/user', { credentials: 'include', timeout: 5000 });
    if (!res.ok) {
      window.location.href = '/';
      return;
    }
    const data = await res.json();
    state.user = data;
    
    // Render profile text fields stably
    document.querySelectorAll('.user-name-display').forEach(el => el.innerText = data.name || 'REDACT Operator');
    document.querySelectorAll('.user-email-display').forEach(el => el.innerText = data.email || 'secure@redact.ai');
    document.querySelectorAll('.user-avatar-display').forEach(el => {
      el.src = data.picture || 'https://ui-avatars.com/api/?name=User&background=0F172A&color=C4B5FD';
    });

    // Populate initial report safely (isolated from user authentication loops)
    try {
      await loadInitialExposureReport();
    } catch (reportErr) {
      console.error('Non-critical: Failed to populate initial exposure report:', reportErr);
    }
  } catch (err) {
    console.error('Session validation failure:', err);
    window.location.href = '/';
  }
}

async function loadInitialExposureReport() {
  const skeletonLoader = document.getElementById('skeleton-loader');
  const container = document.getElementById('graveyard-container');

  try {
    const res = await fetchWithTimeout('/api/exposure-report', { credentials: 'include', timeout: 10000 });
    if (res.ok) {
      const data = await res.json();
      state.exposureReport = data;
      
      // Hide skeleton loader smoothly after fetch resolves
      if (skeletonLoader) skeletonLoader.classList.add('hidden');

      if (data.accounts && data.accounts.length > 0) {
        state.detectedPlatforms = data.accounts;
        updateDashboardUI(data);
      } else {
        // Display premium clean "Scan Required" banner
        if (container) {
          container.innerHTML = `
            <div class="col-span-full glass-panel p-12 text-center text-slate-400 font-sans">
              <span class="material-symbols-outlined block text-3xl mb-2 text-slate-500">lock_open</span>
              <p class="body-main text-slate-300">No active digital footprints mapped in current index.</p>
              <p class="metadata-text mt-1 text-slate-500">Initialize a secure privacy audit to populate vulnerable platforms.</p>
            </div>
          `;
        }
      }
    } else {
      throw new Error(`Server returned code: ${res.status}`);
    }
  } catch (err) {
    console.error('Failed to load initial report:', err);
    if (skeletonLoader) skeletonLoader.classList.add('hidden');
    // Render clean UI fallback instead of hanging forever
    if (container) {
      container.innerHTML = `
        <div class="col-span-full glass-panel p-12 text-center text-rose-400 font-sans border-rose-500/20 bg-rose-500/5">
          <span class="material-symbols-outlined block text-3xl mb-2 text-rose-500">error</span>
          <p class="body-main font-semibold">Failed to retrieve privacy exposure index.</p>
          <p class="metadata-text mt-1 text-slate-500">Ensure the backend is online and refresh or re-run scan.</p>
        </div>
      `;
    }
  }
}

function initDashboardControls() {
  const scanBtn = document.getElementById('start-scan-btn');
  if (scanBtn) {
    scanBtn.addEventListener('click', runDynamicPrivacyScan);
  }
  
  // Set current date in dashboard stably
  const quoteDate = document.getElementById('current-quote-date');
  if (quoteDate) {
    const options = { year: 'numeric', month: 'short', day: 'numeric' };
    quoteDate.innerText = new Date().toLocaleDateString('en-US', options);
  }
}

// ==========================================
// 2. PROGRESSIVE PRIVACY SCAN
// ==========================================
async function runDynamicPrivacyScan() {
  if (state.isScanning) return;
  state.isScanning = true;

  const scanBtn = document.getElementById('start-scan-btn');
  const scanPanel = document.getElementById('scan-progress-panel');
  const graveyardContainer = document.getElementById('graveyard-container');
  const skeletonLoader = document.getElementById('skeleton-loader');

  // Prevent multiple spam clicks
  if (scanBtn) {
    scanBtn.disabled = true;
    scanBtn.innerText = 'AUDITING THREADS...';
  }
  
  if (scanPanel) scanPanel.classList.remove('hidden');
  if (skeletonLoader) skeletonLoader.classList.remove('hidden');
  if (graveyardContainer) graveyardContainer.innerHTML = '';

  const progressBar = document.getElementById('scan-progress-bar-fill');
  const progressPercent = document.getElementById('scan-progress-percent');
  const timelineLabel = document.getElementById('scan-timeline-text');

  const scanTimelineMessages = [
    'Connecting securely to mailbox threads...',
    'Analyzing SMTP metadata and digests...',
    'Retrieving platform verification tokens...',
    'Compiling digital footprint risk matrix...'
  ];

  // API Call - Fired strictly once on button click with 15s timeout
  const scanPromise = fetchWithTimeout('/api/scan-footprint', { credentials: 'include', timeout: 15000 })
    .then(res => {
      if (!res.ok) throw new Error('Mailbox audit rejected.');
      return fetchWithTimeout('/api/exposure-report', { credentials: 'include', timeout: 10000 });
    })
    .then(res => {
      if (!res.ok) throw new Error('Exposure report fetch failed.');
      return res.json();
    });

  // Smooth, high-performance UI progress simulation (uses translation-all for zero lag)
  let progress = 0;
  const progressInterval = setInterval(() => {
    if (progress < 90) {
      progress += Math.floor(Math.random() * 5) + 3;
      progress = Math.min(progress, 90);
      
      if (progressBar) progressBar.style.width = `${progress}%`;
      if (progressPercent) progressPercent.innerText = `${progress}%`;
      
      const msgIdx = Math.min(Math.floor(progress / 25), scanTimelineMessages.length - 1);
      if (timelineLabel) timelineLabel.innerText = scanTimelineMessages[msgIdx];
    }
  }, 100);

  try {
    const report = await scanPromise;
    
    // Smooth complete transition
    clearInterval(progressInterval);
    if (progressBar) progressBar.style.width = '100%';
    if (progressPercent) progressPercent.innerText = '100%';
    if (timelineLabel) timelineLabel.innerText = 'Exposure matrix compiled successfully.';
    
    setTimeout(() => {
      if (scanPanel) scanPanel.classList.add('hidden');
      if (skeletonLoader) skeletonLoader.classList.add('hidden');
      
      state.exposureReport = report;
      state.detectedPlatforms = report.accounts || [];
      
      // Stable DOM rendering
      updateDashboardUI(report);
      
      if (scanBtn) {
        scanBtn.disabled = false;
        scanBtn.innerText = 'RE-RUN PRIVACY SCAN';
      }
      state.isScanning = false;
    }, 600);

  } catch (err) {
    clearInterval(progressInterval);
    console.error('Scan transaction aborted:', err);
    if (timelineLabel) timelineLabel.innerText = 'Scan error. Please re-authenticate session.';
    if (scanBtn) {
      scanBtn.disabled = false;
      scanBtn.innerText = 'START AI PRIVACY SCAN';
    }
    if (skeletonLoader) skeletonLoader.classList.add('hidden');
    state.isScanning = false;
  }
}

// ==========================================
// 3. STABLE DOM RENDERING CONTROLS
// ==========================================
function updateDashboardUI(report) {
  const score = report.exposureScore || 0;
  const status = report.status || 'SAFE';
  const accounts = report.accounts || [];

  // Update SVG Gauge
  const scoreVal = document.getElementById('exposure-score-val');
  const statusVal = document.getElementById('exposure-status-val');
  const progressCircle = document.getElementById('gauge-indicator');

  if (scoreVal) scoreVal.innerText = score;
  if (statusVal) {
    const cleanStatus = status.replace(/EXPOSURE/gi, '').trim();
    statusVal.innerText = `${cleanStatus} EXPOSURE`;
    statusVal.className = 'font-mono tracking-[0.15em] uppercase ';
    statusVal.style.fontSize = '13px'; // Fixed metadata font size
    statusVal.classList.remove('text-rose-400', 'text-lavender');
    if (cleanStatus.toLowerCase() === 'critical' || cleanStatus.toLowerCase() === 'high') {
      statusVal.classList.add('text-rose-400');
    } else {
      statusVal.classList.add('text-lavender');
    }
  }

  if (progressCircle) {
    const circumference = 552.92;
    const offset = circumference - (score / 100) * circumference;
    progressCircle.style.strokeDashoffset = offset;
    
    progressCircle.className.baseVal = 'gauge-progress';
    if (score >= 70) {
      progressCircle.classList.add('risk-high');
    }
  }

  // Update Stats Counters
  const parsedCount = document.getElementById('stat-parsed-count');
  const footprintsCount = document.getElementById('stat-footprints-count');
  const threatsCount = document.getElementById('stat-threats-count');
  
  if (parsedCount) parsedCount.innerText = accounts.length > 0 ? "Active Monitor" : "Inactive";
  if (footprintsCount) footprintsCount.innerText = `${accounts.length} Platforms`;
  if (threatsCount) threatsCount.innerText = `${accounts.filter(a => a.risk === 'CRITICAL' || a.risk === 'HIGH').length} Critical`;

  // Render cards
  const container = document.getElementById('graveyard-container');
  if (!container) return;

  container.innerHTML = '';
  if (accounts.length === 0) {
    container.innerHTML = `
      <div class="col-span-full glass-panel p-12 text-center text-slate-400 font-sans">
        <span class="material-symbols-outlined block text-3xl mb-2 text-slate-500">lock_open</span>
        <p class="body-main text-slate-300">Footprint repository vacant. Audit scanning is required.</p>
      </div>
    `;
    return;
  }

  // Progressive rendering with lightweight transitions to prevent re-render jumps
  accounts.forEach((account, idx) => {
    const card = buildPlatformCard(account);
    card.style.opacity = '0';
    card.style.transform = 'translateY(10px)';
    card.style.transition = 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)';
    container.appendChild(card);
    
    // Smooth staggering fade-in
    setTimeout(() => {
      card.style.opacity = '1';
      card.style.transform = 'translateY(0)';
    }, idx * 60);
  });
}

const appPresets = {
  swiggy: { name: 'Swiggy', date: '18 Apr 2022', active: '3 days ago', method: 'Gmail OAuth', data: ['Phone Number', 'Delivery Coordinates', 'Saved Credit Cards'] },
  zomato: { name: 'Zomato', date: '04 Jan 2023', active: '5 days ago', method: 'Gmail OAuth', data: ['Phone Number', 'Billing Address', 'Purchase Frequency'] },
  amazon: { name: 'Amazon', date: '09 Oct 2020', active: 'Yesterday', method: 'Gmail OAuth', data: ['Full Identity', 'Search History', 'Saved Cards', 'Address'] },
  flipkart: { name: 'Flipkart', date: '12 Sep 2021', active: '6 days ago', method: 'OAuth Token', data: ['Phone Number', 'Home Address', 'Purchase History'] },
  linkedin: { name: 'LinkedIn', date: '14 Feb 2020', active: 'Today', method: 'Gmail OAuth', data: ['Career Record', 'Network Graph', 'Email ID', 'Work Logs'] },
  instagram: { name: 'Instagram', date: '12 Jan 2024', active: '3 days ago', method: 'OAuth Token', data: ['Biographical Data', 'Metadata Logs', 'Linked Phone'] },
  netflix: { name: 'Netflix', date: '05 May 2021', active: '2 days ago', method: 'SMTP Password', data: ['Email address', 'Usage Patterns', 'Card Token'] },
  discord: { name: 'Discord', date: '21 Jun 2020', active: '1 week ago', method: 'OAuth Gateway', data: ['Contact List', 'IP Log Details', 'Chat Metadata'] },
  spotify: { name: 'Spotify', date: '30 Dec 2022', active: 'Today', method: 'OAuth Token', data: ['Personal preferences', 'Country code', 'Social circles'] },
  uber: { name: 'Uber', date: '11 Mar 2021', active: 'Yesterday', method: 'OTP Code SMS', data: ['GPS History', 'Mobile ID', 'Receipt Logs'] },
  telegram: { name: 'Telegram', date: '15 Aug 2022', active: '4 days ago', method: 'Secure OAuth', data: ['Contact Matrix', 'Linked Phone', 'Device Hardware'] },
  myntra: { name: 'Myntra', date: '02 Oct 2021', active: '4 days ago', method: 'Gmail Auth', data: ['Phone number', 'Clothing preferences', 'Address'] },
  adobe: { name: 'Adobe', date: '23 Jun 2019', active: '1 month ago', method: 'OAuth Token', data: ['Account emails', 'Creation tokens', 'Hardware ID'] },
  canva: { name: 'Canva', date: '09 Jan 2022', active: '2 days ago', method: 'Gmail OAuth', data: ['Creation assets', 'Design metrics', 'Billing Info'] },
  figma: { name: 'Figma', date: '17 Nov 2022', active: 'Today', method: 'OAuth Gateway', data: ['Collaborator nodes', 'Design logs', 'Profile Details'] },
  udemy: { name: 'Udemy', date: '08 Dec 2021', active: '2 weeks ago', method: 'Gmail OAuth', data: ['Course transcripts', 'Certificates', 'Card details'] }
};

function buildPlatformCard(account) {
  const pName = account.platform;
  const key = pName.toLowerCase().trim();
  
  const preset = appPresets[key] || {
    name: pName.charAt(0).toUpperCase() + pName.slice(1),
    date: '10 Jan 2023',
    active: '4 days ago',
    method: account.source || 'Gmail OAuth',
    data: account.retainedData || ['Platform Cookies', 'Access Headers']
  };

  const displayName = preset.name || pName.charAt(0).toUpperCase() + pName.slice(1);
  const firstDetected = account.firstDetected || preset.date || '10 Jan 2023';
  const lastActive = account.lastActive || preset.active || '4 days ago';
  const method = account.source || preset.method || 'Gmail OAuth';
  const data = account.retainedData || preset.data || ['Platform Cookies', 'Access Headers'];

  // Status Badge html
  let statusBadgeHtml = '';
  const status = account.status || 'Active';
  if (status === 'Ghost') {
    statusBadgeHtml = `
      <span class="px-2 py-0.5 border text-[10px] font-mono font-bold uppercase rounded-md tracking-wider text-amber-400 border-amber-500/20 bg-amber-500/10 shadow-[0_0_10px_rgba(245,158,11,0.15)] flex items-center gap-1 select-none animate-pulse">
        <span class="w-1.5 h-1.5 rounded-full bg-amber-400"></span> GHOST ACCOUNT
      </span>
    `;
  } else if (status === 'Inactive') {
    statusBadgeHtml = `
      <span class="px-2 py-0.5 border text-[10px] font-mono font-bold uppercase rounded-md tracking-wider text-slate-400 border-white/10 bg-white/5 flex items-center gap-1 select-none">
        <span class="w-1.5 h-1.5 rounded-full bg-slate-400"></span> INACTIVE
      </span>
    `;
  } else {
    statusBadgeHtml = `
      <span class="px-2 py-0.5 border text-[10px] font-mono font-bold uppercase rounded-md tracking-wider text-emerald-400 border-emerald-500/20 bg-emerald-500/10 flex items-center gap-1 select-none">
        <span class="w-1.5 h-1.5 rounded-full bg-emerald-400"></span> ACTIVE ACCOUNT
      </span>
    `;
  }

  let riskColorClass = 'text-slate-400 border-white/5 bg-white/2';
  if (account.risk === 'CRITICAL') {
    riskColorClass = 'text-rose-400 border-rose-500/25 bg-rose-500/10 shadow-[0_0_12px_rgba(244,63,94,0.15)]';
  } else if (account.risk === 'HIGH') {
    riskColorClass = 'text-orange-400 border-orange-500/25 bg-orange-500/10 shadow-[0_0_10px_rgba(249,115,22,0.12)]';
  } else if (account.risk === 'MEDIUM') {
    riskColorClass = 'text-indigo-400 border-indigo-400/25 bg-indigo-400/10';
  } else if (account.risk === 'LOW') {
    riskColorClass = 'text-emerald-400 border-emerald-500/25 bg-emerald-500/10';
  }

  const domain = getPlatformDomain(pName);
  const logoUrl = `https://www.google.com/s2/favicons?sz=64&domain=${domain}`;

  const card = document.createElement('div');
  card.className = 'glass-panel flex flex-col gap-4 bg-[#111827]/40 border border-white/8';
  card.style.padding = '24px'; // Premium card padding
  card.setAttribute('data-platform', key);
  card.innerHTML = `
    <div class="flex justify-between items-start">
      <div class="flex gap-3.5">
        <div class="w-11 h-11 bg-slate-900/60 rounded-xl flex items-center justify-center overflow-hidden border border-white/8 shrink-0">
          <img alt="${displayName}" class="w-6.5 h-6.5 object-contain" src="${logoUrl}" onerror="this.src='https://www.google.com/s2/favicons?sz=64&domain=google.com'" />
        </div>
        <div class="space-y-1">
          <div class="flex items-center gap-2 flex-wrap">
            <h3 class="card-title text-slate-100">${displayName}</h3>
            ${statusBadgeHtml}
          </div>
          <p class="metadata-text text-[#C4B5FD] uppercase tracking-wider mt-0.5 font-mono">${method}</p>
        </div>
      </div>
      <span class="px-2.5 py-0.5 border font-mono rounded-md tracking-wider ${riskColorClass}" style="font-size: 13px; font-weight: 700;">${account.risk || 'LOW'}</span>
    </div>
    
    <div class="grid grid-cols-2 gap-3.5 border-t border-white/5 pt-3.5" style="font-size: 15px;">
      <div>
        <span class="metadata-text text-slate-500 uppercase block tracking-wider" style="font-size: 13px; font-weight: 600;">Joined Date</span>
        <p class="text-slate-300 font-semibold mt-1">${firstDetected}</p>
      </div>
      <div>
        <span class="metadata-text text-slate-500 uppercase block tracking-wider" style="font-size: 13px; font-weight: 600;">Last Active</span>
        <p class="text-slate-300 font-semibold mt-1">${lastActive}</p>
      </div>
    </div>

    <!-- OTP / Device / Location details if present -->
    <div class="border-t border-white/5 pt-3.5 space-y-2 text-[14px]">
      ${account.lastOtp ? `
      <div class="flex justify-between items-center bg-white/2 px-3 py-1.5 rounded-lg border border-white/5 font-mono">
        <span class="text-slate-500">Last OTP Received:</span>
        <span class="text-[#C4B5FD] font-bold select-all tracking-wider">${account.lastOtp}</span>
      </div>` : ''}
      <div class="flex justify-between items-center text-slate-400 font-sans">
        <span class="text-slate-500 font-mono text-[12px] uppercase tracking-wider">Device Auth:</span>
        <span class="text-slate-200 font-medium">${account.sourceDevice || 'Web Session'}</span>
      </div>
      <div class="flex justify-between items-center text-slate-400 font-sans">
        <span class="text-slate-500 font-mono text-[12px] uppercase tracking-wider">Security Location:</span>
        <span class="text-slate-200 font-medium flex items-center gap-1">
          <span class="material-symbols-outlined text-[16px] text-rose-400 shrink-0">location_on</span>
          ${account.loginLocation || 'Indore, Madhya Pradesh, India'}
        </span>
      </div>
    </div>
    
    <div class="bg-black/20 p-3.5 rounded-xl border border-white/5">
      <span class="metadata-text text-slate-500 block uppercase tracking-wider" style="font-size: 13px;">Retained Telemetry Data:</span>
      <p class="body-main text-slate-300 mt-1.5 truncate" title="${data.join(', ')}">${data.join(', ')}</p>
    </div>
    
    <a href="deletion.html?platform=${encodeURIComponent(pName)}" class="btn-premium w-full text-center hover:shadow-lg transition-all duration-300 flex items-center justify-center" style="padding: 0.875rem 1.5rem;">
      Authorize Deletion
    </a>
  `;

  return card;
}

function getPlatformDomain(platform) {
  const p = platform.toLowerCase().trim();
  if (p.includes('amazon')) return 'amazon.in';
  if (p.includes('housing')) return 'housing.com';
  if (p.includes('quora')) return 'quora.com';
  if (p.includes('reddit')) return 'reddit.com';
  if (p.includes('linkedin')) return 'linkedin.com';
  if (p.includes('swiggy')) return 'swiggy.in';
  if (p.includes('zomato')) return 'zomato.com';
  if (p.includes('netflix')) return 'netflix.com';
  if (p.includes('instagram')) return 'instagram.com';
  if (p.includes('spotify')) return 'spotify.com';
  if (p.includes('github')) return 'github.com';
  return `${p}.com`;
}
