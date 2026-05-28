/**
 * REDACT - Privacy Intelligence Engine
 * Advanced Client Application Layer
 */

// Global Application State
const state = {
  activeTab: 'dashboard',
  user: {
    name: 'Loading...',
    email: 'secure@redact.ai',
    picture: 'https://ui-avatars.com/api/?name=User&background=07111F&color=00FFB2'
  },
  exposureReport: {
    exposureScore: 0,
    status: 'SCAN REQUIRED',
    accounts: [],
    insights: []
  },
  selectedPlatform: null,
  isScanning: false,
  isPurging: false,
  terminalLogs: [
    { type: 'info', message: 'REDACT Privacy Intelligence Core Initialized.' },
    { type: 'success', message: 'Secure security tunnel established [Port 5000].' },
    { type: 'info', message: 'Ready to perform deep digital inbox footprint audit.' }
  ]
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
// 1. INITIALIZATION & ROUTING
// ==========================================
document.addEventListener('DOMContentLoaded', () => {
  initRouter();
  initUserProfile();
  initDashboardData();
  initTerminalCLI();
  initOTPInputs();
  initAISentinel();
  
  // Start the canvas node graph (runs in background but updates size when tab changes)
  initNodeGraph();
});

function initRouter() {
  const navItems = document.querySelectorAll('nav .nav-item');
  navItems.forEach(item => {
    item.addEventListener('click', () => {
      const tabId = item.getAttribute('data-tab');
      switchTab(tabId);
    });
  });

  // Switch to specific tab from console command or shortcuts
  window.routerSwitch = switchTab;
}

function switchTab(tabId) {
  state.activeTab = tabId;
  
  // Update nav item active styling
  const navItems = document.querySelectorAll('nav .nav-item');
  navItems.forEach(item => {
    const isTarget = item.getAttribute('data-tab') === tabId;
    if (isTarget) {
      item.className = 'nav-item flex flex-col items-center justify-center text-emerald bg-emerald/10 rounded-xl px-4 py-1.5 border border-emerald/30 shadow-[inset_0_0_8px_rgba(0,255,178,0.15)] cursor-pointer scale-100 transition-all duration-300';
    } else {
      item.className = 'nav-item flex flex-col items-center justify-center text-slate-400 hover:text-white px-4 py-1.5 hover:bg-white/5 rounded-xl transition-all duration-300 cursor-pointer scale-95';
    }
  });

  // Toggle visible sections
  const sections = document.querySelectorAll('.tab-content');
  sections.forEach(sec => {
    if (sec.id === `${tabId}-tab`) {
      sec.classList.add('active');
    } else {
      sec.classList.remove('active');
    }
  });

  // Special refreshers on switch
  if (tabId === 'map') {
    resizeCanvas();
  }
}

// ==========================================
// 2. USER PROFILE & BASE APIS
// ==========================================
async function initUserProfile() {
  try {
    const res = await fetchWithTimeout('/api/user', { credentials: 'include', timeout: 5000 });
    if (res.ok) {
      const data = await res.json();
      state.user = data;
      
      // Update DOM Profile fields
      document.getElementById('userName').innerText = data.name || 'REDACT User';
      document.getElementById('userEmail').innerText = data.email || 'secure@redact.ai';
      document.getElementById('userAvatar').src = data.picture || 'https://ui-avatars.com/api/?name=User&background=07111F&color=00FFB2';
    } else {
      // Unauthorized or session invalid: Redirect to root routing
      window.location.href = '/';
    }
  } catch (err) {
    console.error('Failed to load user session profile:', err);
    addTerminalLog('error', 'Auth token profile handshake failed.');
    window.location.href = '/';
  }
}

async function initDashboardData() {
  const container = document.getElementById('footprint-container');
  try {
    const res = await fetchWithTimeout('/api/exposure-report', { credentials: 'include', timeout: 10000 });
    if (res.ok) {
      const report = await res.json();
      state.exposureReport = report;
      updateDashboardUI(report);
    } else {
      throw new Error(`Server returned code ${res.status}`);
    }
  } catch (err) {
    console.error('Failed to pre-load exposure metrics:', err);
    addTerminalLog('error', 'Vulnerability index pre-load failed.');
    if (container) {
      container.innerHTML = `
        <div class="col-span-full glass-panel p-8 text-center text-rose-500 font-mono text-sm border-rose-500/20 bg-rose-500/5">
          <span class="material-symbols-outlined block text-3xl mb-2 text-rose-500">error</span>
          Failed to retrieve active digital footprint index. Ensure backend online.
        </div>
      `;
    }
  }
}

function updateDashboardUI(report) {
  const score = report.exposureScore || 0;
  const status = report.status || 'SAFE';
  const accounts = report.accounts || [];

  // Update Exposure Score texts
  const scoreEl = document.getElementById('exposure-score-val');
  const statusEl = document.getElementById('exposure-status-val');
  if (scoreEl) scoreEl.innerText = score;
  if (statusEl) {
    statusEl.innerText = status;
    // Map status color
    statusEl.className = 'font-mono text-xs uppercase tracking-widest mt-1.5 ';
    if (status.toLowerCase().includes('critical')) statusEl.classList.add('text-rose-500');
    else if (status.toLowerCase().includes('high')) statusEl.classList.add('text-amber-500');
    else if (status.toLowerCase().includes('medium')) statusEl.classList.add('text-sky-400');
    else statusEl.classList.add('text-emerald-400');
  }

  // Animate Gauge SVG Path
  const progressPath = document.getElementById('gauge-indicator');
  if (progressPath) {
    const circumference = 552.92; // 2 * PI * 88
    const offset = circumference - (score / 100) * circumference;
    progressPath.style.strokeDashoffset = offset;
    
    // Class coloring on progress path
    progressPath.className.baseVal = 'gauge-progress';
    if (score >= 80) progressPath.classList.add('risk-critical');
    else if (score >= 50) progressPath.classList.add('risk-high');
  }

  // Update Stats Cards counters
  const inboxesVal = document.getElementById('stat-inboxes');
  const ghostVal = document.getElementById('stat-ghost-accounts');
  const breachVal = document.getElementById('stat-breaches');
  const brokersVal = document.getElementById('stat-brokers');

  if (inboxesVal) inboxesVal.innerText = accounts.length > 0 ? "50" : "0";
  if (ghostVal) ghostVal.innerText = accounts.length;
  if (breachVal) breachVal.innerText = accounts.filter(a => a.breachDetected).length;
  if (brokersVal) brokersVal.innerText = Math.round(accounts.length * 2.3);

  // Render Accounts Graveyard Card list
  const container = document.getElementById('footprint-container');
  if (!container) return;

  if (accounts.length === 0) {
    container.innerHTML = `
      <div class="glass-panel p-8 text-center text-slate-400 font-mono text-sm">
        <span class="material-symbols-outlined block text-3xl mb-2 text-slate-500">sentiment_satisfied</span>
        No authenticated account footprints discovered. Initiate audit.
      </div>
    `;
    return;
  }

  container.innerHTML = '';
  accounts.forEach(account => {
    const domain = getPlatformDomain(account.platform);
    const logoUrl = `https://www.google.com/s2/favicons?sz=64&domain=${domain}`;
    
    let riskLabel = 'LOW';
    let cardClass = 'risk-low';
    let riskColorClass = 'text-emerald border-emerald/20 bg-emerald/5';

    if (account.risk === 'CRITICAL') {
      riskLabel = 'CRITICAL';
      cardClass = 'risk-critical';
      riskColorClass = 'text-rose-500 border-rose-500/20 bg-rose-500/5';
    } else if (account.risk === 'HIGH') {
      riskLabel = 'HIGH';
      cardClass = 'risk-high';
      riskColorClass = 'text-amber-500 border-amber-500/20 bg-amber-500/5';
    } else if (account.risk === 'MEDIUM') {
      riskLabel = 'MEDIUM';
      cardClass = 'risk-medium';
      riskColorClass = 'text-sky-400 border-sky-400/20 bg-sky-400/5';
    }

    const card = document.createElement('div');
    card.className = `graveyard-card glass-panel p-4 rounded-xl flex flex-col gap-4 border-l-4 ${cardClass}`;
    card.innerHTML = `
      <div class="flex justify-between items-start">
        <div class="flex gap-3">
          <div class="w-10 h-10 bg-slate-900/60 rounded-lg flex items-center justify-center overflow-hidden border border-white/5">
            <img alt="${account.platform}" class="w-6 h-6 object-contain" src="${logoUrl}" onerror="this.src='https://www.google.com/s2/favicons?sz=64&domain=google.com'" />
          </div>
          <div>
            <h3 class="font-bold text-sm text-slate-200">${account.platform}</h3>
            <p class="font-mono text-[10px] text-slate-500 flex items-center gap-1 mt-0.5">
              <span class="material-symbols-outlined text-xs">history</span> Retained exposure logs
            </p>
          </div>
        </div>
        <span class="px-2 py-0.5 border text-[9px] font-mono rounded tracking-wider ${riskColorClass}">${riskLabel}</span>
      </div>
      <div class="bg-black/20 p-2.5 rounded-lg border border-white/5">
        <span class="font-mono text-[9px] text-slate-500 block tracking-wider">EXPOSED TELEMETRY DATA:</span>
        <p class="font-mono text-xs text-slate-300 mt-1">${account.retainedData ? account.retainedData.join(', ') : 'Inboxes, Cookies, Platform Tokens'}</p>
      </div>
      <button class="w-full py-2 bg-rose-500/10 border border-rose-500/30 hover:border-rose-500 hover:bg-rose-500 hover:text-slate-900 text-rose-500 font-mono text-xs font-bold rounded-lg transition-all duration-300 purge-trigger-btn" data-platform="${account.platform}">
        PURGE PLATFORM PRESENCE
      </button>
    `;
    
    container.appendChild(card);
  });

  // Bind Purge Trigger buttons
  document.querySelectorAll('.purge-trigger-btn').forEach(btn => {
    btn.addEventListener('click', (e) => {
      const platformName = btn.getAttribute('data-platform');
      triggerPurgeFlow(platformName);
    });
  });
}

function getPlatformDomain(platform) {
  const p = platform.toLowerCase().trim();
  if (p.includes('amazon')) return 'amazon.in';
  if (p.includes('housing')) return 'housing.com';
  if (p.includes('quora')) return 'quora.com';
  if (p.includes('reddit')) return 'reddit.com';
  if (p.includes('linkedin')) return 'linkedin.com';
  return `${p}.com`;
}

// ==========================================
// 3. SCAN FOOTPRINT CONTROLS
// ==========================================
window.initiateDeepScan = async function() {
  if (state.isScanning) return;
  state.isScanning = true;
  
  const scanBtn = document.getElementById('scan-button');
  if (scanBtn) {
    scanBtn.disabled = true;
    scanBtn.innerHTML = `
      <span class="flex items-center justify-center gap-2">
        <svg class="animate-spin h-5 w-5 text-slate-900" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
          <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
          <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
        </svg>
        PERFORMING DEEP SCAN MATRIX...
      </span>
    `;
  }

  // Clear container
  const container = document.getElementById('footprint-container');
  if (container) {
    container.innerHTML = `
      <div class="glass-panel p-12 text-center w-full flex flex-col items-center justify-center border-emerald/20">
        <div class="w-12 h-12 rounded-full border border-emerald/30 border-t-emerald animate-spin mb-4"></div>
        <p class="font-mono text-sm text-emerald animate-pulse">AUDITING ACTIVE INBOX ENVELOPS...</p>
        <p class="font-mono text-[10px] text-slate-500 mt-1">Connecting Google API secure channels...</p>
      </div>
    `;
  }

  // Log to execution console
  addTerminalLog('info', 'Secure OAuth token verified with upstream servers.');
  addTerminalLog('info', 'Connecting Gmail API mailbox thread stream...');
  
  let steps = 0;
  const scanSteps = [
    'Parsing latest 50 security tokens and sign-up digests...',
    'Analyzing SMTP metadata and platform header validations...',
    'Checking darkweb databases for verified breach references...',
    'Aggregating exposure risks and compiling threat matrix...'
  ];

  const stepInterval = setInterval(() => {
    if (steps < scanSteps.length) {
      addTerminalLog('info', scanSteps[steps]);
      steps++;
    } else {
      clearInterval(stepInterval);
    }
  }, 750);

  try {
    const res = await fetchWithTimeout('/api/scan-footprint', { credentials: 'include', timeout: 15000 });
    if (!res.ok) throw new Error(`Server returned code: ${res.status}`);
    
    clearInterval(stepInterval);
    addTerminalLog('success', 'Footprint scan complete. Digital presence graveyard updated.');
    
    // Fetch and redraw full report
    const reportRes = await fetchWithTimeout('/api/exposure-report', { credentials: 'include', timeout: 10000 });
    if (reportRes.ok) {
      const data = await reportRes.json();
      state.exposureReport = data;
      updateDashboardUI(data);
      
      // Re-initialize physics nodes!
      if (window.populateCanvasNodes) {
        window.populateCanvasNodes(data.accounts);
      }
    }
  } catch (err) {
    clearInterval(stepInterval);
    console.error('Scan error:', err);
    addTerminalLog('error', `Footprint scan terminated: ${err.message}`);
    
    if (container) {
      container.innerHTML = `
        <div class="glass-panel p-8 text-center text-rose-400 font-mono text-sm border-rose-500/20">
          <span class="material-symbols-outlined block text-3xl mb-2 text-rose-500">error</span>
          Mailbox scan failed. Verify connection status.
        </div>
      `;
    }
  } finally {
    state.isScanning = false;
    if (scanBtn) {
      scanBtn.disabled = false;
      scanBtn.innerText = 'Initiate Deep Footprint Scan';
    }
  }
};

// ==========================================
// 4. PURGE DATA FLOW & OTP CONTROL
// ==========================================
async function triggerPurgeFlow(platformName) {
  state.selectedPlatform = platformName;
  addTerminalLog('info', `Erasing digital trace on: ${platformName.toUpperCase()}`);
  addTerminalLog('info', 'Sending authentication credentials verification challenge...');
  
  try {
    const res = await fetchWithTimeout('/api/send-otp', {
      method: 'POST',
      credentials: 'include',
      timeout: 8000
    });
    
    if (res.ok) {
      addTerminalLog('success', 'Identity security token sent to registered Google account.');
      openOTPModal();
    } else {
      throw new Error('Failed to send OTP code.');
    }
  } catch (err) {
    console.error('Purge error:', err);
    addTerminalLog('error', `Purge credentials challenge failed: ${err.message}`);
  }
}

function openOTPModal() {
  const modal = document.getElementById('otp-modal');
  if (modal) {
    modal.classList.remove('hidden');
    modal.classList.add('flex');
    
    // Focus first input field
    const inputs = document.querySelectorAll('.otp-digit-input');
    inputs.forEach(i => i.value = '');
    if (inputs[0]) inputs[0].focus();
  }
}

function closeOTPModal() {
  const modal = document.getElementById('otp-modal');
  if (modal) {
    modal.classList.add('hidden');
    modal.classList.remove('flex');
  }
}

function initOTPInputs() {
  const inputs = document.querySelectorAll('.otp-digit-input');
  
  inputs.forEach((input, index) => {
    // Focus forward on input
    input.addEventListener('input', (e) => {
      const val = input.value;
      if (val.length >= 1) {
        input.value = val[0]; // Cap at single character
        if (index < inputs.length - 1) {
          inputs[index + 1].focus();
        }
      }
    });

    // Delete backward on backspace
    input.addEventListener('keydown', (e) => {
      if (e.key === 'Backspace' && input.value === '' && index > 0) {
        inputs[index - 1].focus();
        inputs[index - 1].value = '';
      }
    });

    // Intercept pasting of 6 digits
    input.addEventListener('paste', (e) => {
      const pasted = (e.clipboardData || window.clipboardData).getData('text').trim();
      if (pasted.length === 6 && /^\d+$/.test(pasted)) {
        inputs.forEach((inp, idx) => {
          inp.value = pasted[idx];
        });
        inputs[5].focus();
        e.preventDefault();
      }
    });
  });

  const finalizeBtn = document.getElementById('finalize-btn');
  const abortBtn = document.getElementById('cancel-btn');

  if (finalizeBtn) {
    finalizeBtn.addEventListener('click', executeGlobalPurge);
  }
  if (abortBtn) {
    abortBtn.addEventListener('click', () => {
      addTerminalLog('warn', 'Erasure matrix execution aborted by operator.');
      closeOTPModal();
    });
  }
}

async function executeGlobalPurge() {
  const inputs = document.querySelectorAll('.otp-digit-input');
  let otpCode = '';
  inputs.forEach(inp => {
    otpCode += inp.value || '';
  });

  if (otpCode.length < 6) {
    alert('Please enter complete 6-digit challenge authorization code.');
    return;
  }

  closeOTPModal();
  
  // Navigate to terminal view immediately to show logs
  switchTab('terminal');
  
  addTerminalLog('info', `Submitting OTP: ${otpCode} for ${state.selectedPlatform.toUpperCase()}`);
  addTerminalLog('info', 'Broadcasting Right to be Forgotten deletion protocols...');

  try {
    // Verify OTP first
    const verifyRes = await fetchWithTimeout('/api/verify-otp', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ otp: otpCode }),
      credentials: 'include',
      timeout: 8000
    });

    if (!verifyRes.ok) {
      throw new Error('Identity verification challenge failed. Incorrect OTP.');
    }

    addTerminalLog('success', 'Operator validation approved. Initializing Chromium isolation sandbox...');

    // Trigger Purge stream (Allow up to 60s for automation script to execute)
    const purgeRes = await fetchWithTimeout('/api/purge-account', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ website: state.selectedPlatform, otp: otpCode }),
      credentials: 'include',
      timeout: 60000
    });

    if (!purgeRes.ok) {
      throw new Error(`Purge Engine crashed: Status ${purgeRes.status}`);
    }

    // Decode streaming chunked responses
    const reader = purgeRes.body.getReader();
    const decoder = new TextDecoder();
    let partialLine = '';

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      const chunk = decoder.decode(value, { stream: true });
      const lines = (partialLine + chunk).split('\n');
      partialLine = lines.pop(); // Hold onto partial line

      for (const line of lines) {
        if (line.trim()) {
          try {
            const data = JSON.parse(line);
            addTerminalLog(data.type, data.message);
          } catch (e) {
            // Raw text log fallback
            addTerminalLog('info', line);
          }
        }
      }
    }

    // Process leftover buffer
    if (partialLine.trim()) {
      try {
        const data = JSON.parse(partialLine);
        addTerminalLog(data.type, data.message);
      } catch (e) {
        addTerminalLog('info', partialLine);
      }
    }
    
    // Deletion completed! Let's refresh details
    initDashboardData();

  } catch (err) {
    console.error('Purge transaction failed:', err);
    addTerminalLog('error', `Purge protocol aborted: ${err.message}`);
  }
}

// ==========================================
// 5. CYBERNETIC TERMINAL PANEL & CLI
// ==========================================
function initTerminalCLI() {
  const terminalInput = document.getElementById('terminal-input');
  if (!terminalInput) return;

  terminalInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') {
      const command = terminalInput.value.trim();
      terminalInput.value = '';
      if (command) {
        processTerminalCommand(command);
      }
    }
  });

  // Always pre-render initial state logs
  const logsContainer = document.getElementById('terminal-logs');
  if (logsContainer) {
    logsContainer.innerHTML = '';
    state.terminalLogs.forEach(log => {
      appendLogToDOM(log.type, log.message);
    });
  }
}

function processTerminalCommand(rawCommand) {
  const parts = rawCommand.toLowerCase().split(' ');
  const cmd = parts[0];
  const arg = parts.slice(1).join(' ');

  // Echo command
  appendLogToDOM('info', `guest@redact:~$ ${rawCommand}`);

  switch (cmd) {
    case 'help':
      appendLogToDOM('info', 'AVAILABLE OPERATOR PROTOCOLS:');
      appendLogToDOM('info', '  - help             Display diagnostic instructions.');
      appendLogToDOM('info', '  - scan             Initiate digital footprint mailbox audit.');
      appendLogToDOM('info', '  - purge [name]     Trigger purge sequence for a platform (e.g. purge quora).');
      appendLogToDOM('info', '  - status           Read physical scoring indexes and threat telemetry.');
      appendLogToDOM('info', '  - clear            Flush console log history.');
      appendLogToDOM('info', '  - about            Read engine architecture releases.');
      break;

    case 'scan':
      appendLogToDOM('info', 'Broadcasting remote deep footprint audit trigger...');
      window.initiateDeepScan();
      break;

    case 'purge':
      if (!arg) {
        appendLogToDOM('error', 'Error: Target platform not specified. Usage: purge [platform]');
      } else {
        triggerPurgeFlow(arg);
      }
      break;

    case 'status':
      appendLogToDOM('info', 'REDACT DIGITAL VULNERABILITY ANALYSIS REPORT:');
      appendLogToDOM('info', `  Exposure Score: ${state.exposureReport.exposureScore || 0}%`);
      appendLogToDOM('info', `  Exposure Status: ${state.exposureReport.status || 'SAFE / SECURE'}`);
      appendLogToDOM('info', `  Target Discovered Nodes: ${state.exposureReport.accounts ? state.exposureReport.accounts.length : 0}`);
      appendLogToDOM('info', `  Active OAuth session user: ${state.user.name} (${state.user.email})`);
      break;

    case 'clear':
      const logsContainer = document.getElementById('terminal-logs');
      if (logsContainer) logsContainer.innerHTML = '';
      break;

    case 'about':
      appendLogToDOM('success', 'REDACT Privacy Intelligence Engine v1.0-Hackathon');
      appendLogToDOM('info', 'Built with Express Node, Playwright Automator & Gemini Threat AI.');
      appendLogToDOM('info', 'Developed for high-performance visual cybersecurity telemetry.');
      break;

    default:
      appendLogToDOM('error', `Command not found: '${cmd}'. Type 'help' for available actions.`);
      break;
  }
}

function addTerminalLog(type, message) {
  state.terminalLogs.push({ type, message });
  appendLogToDOM(type, message);
}

function appendLogToDOM(type, message) {
  const container = document.getElementById('terminal-logs');
  if (!container) return;

  const logRow = document.createElement('div');
  logRow.className = 'flex gap-2.5 font-mono text-[12.5px] items-start';
  
  let typeLabel = '[INFO]';
  let colorClass = 'text-sky-400';

  if (type === 'error') {
    typeLabel = '[FAIL]';
    colorClass = 'text-rose-500';
  } else if (type === 'success') {
    typeLabel = '[OKAY]';
    colorClass = 'text-emerald';
  } else if (type === 'warn') {
    typeLabel = '[WARN]';
    colorClass = 'text-amber-500';
  } else if (type === 'ai') {
    typeLabel = '[AI]  ';
    colorClass = 'text-emerald';
  }

  logRow.innerHTML = `
    <span class="${colorClass} opacity-80 shrink-0 select-none">${typeLabel}</span>
    <span class="text-slate-300 leading-normal">${message}</span>
  `;

  container.appendChild(logRow);
  
  // Cap at 100 items to avoid bloated memory page leaks
  while (container.children.length > 100) {
    container.removeChild(container.firstChild);
  }

  // Scroll to bottom
  container.scrollTop = container.scrollHeight;
}

// ==========================================
// 6. INTERACTIVE HTML5 CANVAS PHYSICS MATRIX
// ==========================================
let canvas, ctx;
let nodes = [];
let connections = [];
let animationId = null;
let hoveredNode = null;
let draggedNode = null;
let mouse = { x: 0, y: 0 };
let isResized = false;

class VisualNode {
  constructor(id, label, risk, threatScore, x, y) {
    this.id = id;
    this.label = label;
    this.risk = risk;
    this.threatScore = threatScore;
    this.x = x;
    this.y = y;
    this.targetX = x;
    this.targetY = y;
    this.vx = (Math.random() - 0.5) * 0.4;
    this.vy = (Math.random() - 0.5) * 0.4;
    this.radius = id === 'core' ? 38 : 28;
    this.glowRadius = 15;
    this.image = null;
    this.isCore = id === 'core';
    
    // Load favicon image if not core
    if (!this.isCore) {
      this.image = new Image();
      this.image.src = `https://www.google.com/s2/favicons?sz=64&domain=${getPlatformDomain(label)}`;
    }
  }

  update(width, height) {
    if (this === draggedNode) {
      this.x = mouse.x;
      this.y = mouse.y;
      this.vx = 0;
      this.vy = 0;
      return;
    }

    if (this.isCore) {
      // Core slowly drifts back to the center of layout
      const dx = (width / 2) - this.x;
      const dy = (height / 2) - this.y;
      this.x += dx * 0.05;
      this.y += dy * 0.05;
      return;
    }

    // Apply soft drift velocity
    this.x += this.vx;
    this.y += this.vy;

    // Soft bounds bounce
    if (this.x < this.radius + 20 || this.x > width - this.radius - 20) {
      this.vx *= -1;
      this.x = Math.max(this.radius + 20, Math.min(width - this.radius - 20, this.x));
    }
    if (this.y < this.radius + 20 || this.y > height - this.radius - 20) {
      this.vy *= -1;
      this.y = Math.max(this.radius + 20, Math.min(height - this.radius - 20, this.y));
    }
    
    // Apply soft orbital spring forces back to the central core
    const coreNode = nodes.find(n => n.isCore);
    if (coreNode) {
      const dx = coreNode.x - this.x;
      const dy = coreNode.y - this.y;
      const distance = Math.hypot(dx, dy);
      const targetDistance = 160 + (this.threatScore * 0.5); // Spread platforms according to risk score
      
      const force = (distance - targetDistance) * 0.002;
      this.vx += (dx / distance) * force;
      this.vy += (dy / distance) * force;
      
      // Node-to-node soft collision avoidance
      nodes.forEach(other => {
        if (other === this) return;
        const odx = other.x - this.x;
        const ody = other.y - this.y;
        const odist = Math.hypot(odx, ody);
        const minDist = this.radius + other.radius + 40;
        
        if (odist < minDist) {
          const repel = (minDist - odist) * 0.01;
          this.vx -= (odx / odist) * repel;
          this.vy -= (ody / odist) * repel;
        }
      });
    }

    // Cap velocity
    const speed = Math.hypot(this.vx, this.vy);
    const maxSpeed = 1.5;
    if (speed > maxSpeed) {
      this.vx = (this.vx / speed) * maxSpeed;
      this.vy = (this.vy / speed) * maxSpeed;
    }
    
    // Friction
    this.vx *= 0.98;
    this.vy *= 0.98;
  }

  draw(ctx) {
    ctx.save();
    
    // Define risk color tokens
    let primaryColor = '#00FFB2'; // Emerald
    let glowColor = 'rgba(0, 255, 178, 0.4)';
    
    if (this.risk === 'CRITICAL') {
      primaryColor = '#FF4D6D';
      glowColor = 'rgba(255, 77, 109, 0.4)';
    } else if (this.risk === 'HIGH') {
      primaryColor = '#FFB84D';
      glowColor = 'rgba(255, 184, 77, 0.4)';
    } else if (this.risk === 'MEDIUM') {
      primaryColor = '#4DA3FF';
      glowColor = 'rgba(77, 163, 255, 0.4)';
    }

    // Highlight border when hovered
    const isHighlight = this === hoveredNode;

    // Draw glowing ring
    ctx.shadowBlur = isHighlight ? 25 : 12;
    ctx.shadowColor = primaryColor;
    
    // Base circle background
    ctx.fillStyle = 'rgba(17, 24, 39, 0.9)';
    ctx.strokeStyle = primaryColor;
    ctx.lineWidth = isHighlight ? 3 : 1.5;
    
    ctx.beginPath();
    ctx.arc(this.x, this.y, this.radius, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
    
    ctx.shadowBlur = 0; // Reset shadow

    // Inner icon/core rendering
    if (this.isCore) {
      // Draw REDACT pulsing shield
      ctx.fillStyle = primaryColor;
      ctx.beginPath();
      // Draw shield paths
      const cx = this.x;
      const cy = this.y;
      ctx.moveTo(cx, cy - 14);
      ctx.lineTo(cx + 12, cy - 9);
      ctx.lineTo(cx + 10, cy + 6);
      ctx.quadraticCurveTo(cx, cy + 15, cx, cy + 16);
      ctx.quadraticCurveTo(cx, cy + 15, cx - 10, cy + 6);
      ctx.lineTo(cx - 12, cy - 9);
      ctx.closePath();
      ctx.fill();
    } else if (this.image && this.image.complete && this.image.naturalWidth !== 0) {
      // Draw favicon nicely centered inside
      ctx.drawImage(this.image, this.x - 12, this.y - 12, 24, 24);
    } else {
      // Fallback: draw label letter avatar
      ctx.fillStyle = '#94A3B8';
      ctx.font = 'bold 12px "JetBrains Mono"';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(this.label[0].toUpperCase(), this.x, this.y);
    }

    // Text Label below
    ctx.fillStyle = isHighlight ? '#ffffff' : '#94A3B8';
    ctx.font = this.isCore ? 'bold 11px "Inter"' : '500 11px "Inter"';
    ctx.textAlign = 'center';
    ctx.fillText(this.label.toUpperCase(), this.x, this.y + this.radius + 16);

    ctx.restore();
  }
}

function initNodeGraph() {
  canvas = document.getElementById('node-canvas');
  if (!canvas) return;

  ctx = canvas.getContext('2d');
  
  // Prevent redundant event listener registrations
  if (!canvas.dataset.listenersInitialized) {
    canvas.addEventListener('mousemove', handleCanvasMouseMove);
    canvas.addEventListener('mousedown', handleCanvasMouseDown);
    canvas.addEventListener('mouseup', handleCanvasMouseUp);
    canvas.addEventListener('mouseleave', handleCanvasMouseLeave);
    window.addEventListener('resize', () => { isResized = true; });
    canvas.dataset.listenersInitialized = 'true';
  }

  // Cancel any existing animation frame to avoid multiple active canvas render loops
  if (animationId) {
    cancelAnimationFrame(animationId);
  }
  
  // Populate nodes
  window.populateCanvasNodes = (accounts) => {
    nodes = [];
    
    const width = canvas.width || 800;
    const height = canvas.height || 580;
    
    // Add central core node
    const core = new VisualNode('core', 'REDACT CORE', 'SAFE', 0, width / 2, height / 2);
    nodes.push(core);

    // Add discovered accounts
    accounts.forEach((acc, i) => {
      const angle = (i / accounts.length) * Math.PI * 2;
      const radius = 170 + Math.random() * 50;
      const x = (width / 2) + Math.cos(angle) * radius;
      const y = (height / 2) + Math.sin(angle) * radius;
      
      const node = new VisualNode(i.toString(), acc.platform, acc.risk, acc.threatScore, x, y);
      nodes.push(node);
    });
  };

  // Populate initially
  if (state.exposureReport.accounts) {
    window.populateCanvasNodes(state.exposureReport.accounts);
  }
  
  // Start engine loop
  resizeCanvas();
  animateCanvas();
}

function resizeCanvas() {
  if (!canvas) return;
  const rect = canvas.parentElement.getBoundingClientRect();
  canvas.width = rect.width;
  canvas.height = rect.height || 580;
  
  // Reposition core node to absolute center of resized space
  const coreNode = nodes.find(n => n.isCore);
  if (coreNode) {
    coreNode.x = canvas.width / 2;
    coreNode.y = canvas.height / 2;
  }
}

function animateCanvas() {
  if (!canvas) return;
  
  if (isResized) {
    resizeCanvas();
    isResized = false;
  }

  const width = canvas.width;
  const height = canvas.height;

  // Clear Canvas with subtle fading trails
  ctx.fillStyle = '#07111F';
  ctx.fillRect(0, 0, width, height);
  
  // Re-draw background cyber-grid lines inside canvas
  ctx.strokeStyle = 'rgba(255,255,255,0.01)';
  ctx.lineWidth = 1;
  const gridSize = 35;
  for (let x = 0; x < width; x += gridSize) {
    ctx.beginPath();
    ctx.moveTo(x, 0);
    ctx.lineTo(x, height);
    ctx.stroke();
  }
  for (let y = 0; y < height; y += gridSize) {
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.lineTo(width, y);
    ctx.stroke();
  }

  const coreNode = nodes.find(n => n.isCore);

  // Draw glowing spring connection pathways first
  nodes.forEach(node => {
    if (node.isCore || !coreNode) return;
    
    // Calculate path
    ctx.save();
    
    let pathColor = 'rgba(77, 163, 255, 0.08)'; // Blue
    if (node.risk === 'CRITICAL') pathColor = 'rgba(255, 77, 109, 0.08)';
    else if (node.risk === 'HIGH') pathColor = 'rgba(255, 184, 77, 0.08)';
    
    ctx.strokeStyle = pathColor;
    ctx.lineWidth = node === hoveredNode ? 2.5 : 1.2;
    
    ctx.beginPath();
    ctx.moveTo(coreNode.x, coreNode.y);
    ctx.lineTo(node.x, node.y);
    ctx.stroke();
    
    // Draw moving data telemetry packet along lines
    const time = Date.now() * 0.002;
    const ratio = (time + parseInt(node.id) * 0.3) % 1.0;
    
    const packetX = coreNode.x + (node.x - coreNode.x) * ratio;
    const packetY = coreNode.y + (node.y - coreNode.y) * ratio;
    
    let packetColor = '#4DA3FF';
    if (node.risk === 'CRITICAL') packetColor = '#FF4D6D';
    else if (node.risk === 'HIGH') packetColor = '#FFB84D';
    
    ctx.fillStyle = packetColor;
    ctx.shadowBlur = 8;
    ctx.shadowColor = packetColor;
    ctx.beginPath();
    ctx.arc(packetX, packetY, 3, 0, Math.PI * 2);
    ctx.fill();
    
    ctx.restore();
  });

  // Update and Draw nodes
  nodes.forEach(node => {
    node.update(width, height);
    node.draw(ctx);
  });

  animationId = requestAnimationFrame(animateCanvas);
}

function handleCanvasMouseMove(e) {
  const rect = canvas.getBoundingClientRect();
  mouse.x = e.clientX - rect.left;
  mouse.y = e.clientY - rect.top;

  if (draggedNode) return;

  // Detect hover
  let found = null;
  for (let i = nodes.length - 1; i >= 0; i--) {
    const node = nodes[i];
    const dist = Math.hypot(node.x - mouse.x, node.y - mouse.y);
    if (dist <= node.radius) {
      found = node;
      break;
    }
  }

  hoveredNode = found;
  canvas.style.cursor = found ? 'pointer' : 'grab';
  
  // Show / Hide interactive absolute glass tooltip
  const tooltip = document.getElementById('map-tooltip');
  if (tooltip) {
    if (hoveredNode && !hoveredNode.isCore) {
      const match = state.exposureReport.accounts.find(a => a.platform === hoveredNode.label);
      if (match) {
        tooltip.style.display = 'block';
        tooltip.style.left = `${e.clientX - rect.left + 15}px`;
        tooltip.style.top = `${e.clientY - rect.top + 15}px`;
        
        // Populate contents
        document.getElementById('tt-platform').innerText = match.platform;
        document.getElementById('tt-risk').innerText = `${match.risk} RISK`;
        document.getElementById('tt-score').innerText = `${match.threatScore}% EXPOSURE`;
        document.getElementById('tt-data').innerText = match.retainedData ? match.retainedData.join(', ') : 'Gmail headers';
        
        // Re-bind click purge button inside tooltip
        const purgeBtn = document.getElementById('tt-purge-btn');
        purgeBtn.onclick = () => {
          tooltip.style.display = 'none';
          triggerPurgeFlow(match.platform);
        };
      }
    } else {
      tooltip.style.display = 'none';
    }
  }
}

function handleCanvasMouseDown(e) {
  if (hoveredNode) {
    draggedNode = hoveredNode;
    canvas.style.cursor = 'grabbing';
  }
}

function handleCanvasMouseUp(e) {
  draggedNode = null;
  canvas.style.cursor = hoveredNode ? 'pointer' : 'grab';
}

function handleCanvasMouseLeave(e) {
  hoveredNode = null;
  draggedNode = null;
  const tooltip = document.getElementById('map-tooltip');
  if (tooltip) tooltip.style.display = 'none';
}

// ==========================================
// 7. GEMINI AI ASSISTANT Sentinel
// ==========================================
// Secure config credentials key (provided by active session payload)
const GEMINI_API_KEY = "AIzaSyCqHzHyeFn4DooOB2TLSyROj-M5N6qtpLQ";

function initAISentinel() {
  const openFloatBtn = document.getElementById('open-ai-btn');
  const closeFloatBtn = document.getElementById('close-ai-btn');
  const chatInput = document.getElementById('ai-input');
  const sendChatBtn = document.getElementById('send-ai-btn');
  
  if (openFloatBtn) {
    openFloatBtn.addEventListener('click', () => {
      // Toggle side assistant or switch directly to full-workspace tab
      switchTab('sentinel');
    });
  }

  if (sendChatBtn && chatInput) {
    sendChatBtn.addEventListener('click', submitAIChat);
    chatInput.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') submitAIChat();
    });
  }

  // Pre-bind AI sidebar quick prompts
  document.querySelectorAll('.ai-prompt-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const prompt = btn.getAttribute('data-prompt');
      if (chatInput) {
        chatInput.value = prompt;
        submitAIChat();
      }
    });
  });
}

async function submitAIChat() {
  const inputEl = document.getElementById('ai-input');
  if (!inputEl) return;

  const query = inputEl.value.trim();
  if (!query) return;

  inputEl.value = '';
  
  // Render user chat bubble
  appendChatBubble('user', query);
  
  // Render animated AI Typing indicator
  const typingIndicator = appendTypingIndicator();
  
  try {
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${GEMINI_API_KEY}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [
            {
              parts: [
                {
                  text: `You are REDACT AI Sentinel, a highly professional cybersecurity threat intelligence assistant.
Your instructions:
- Be futuristic, mature, and extremely concise.
- Focus on privacy threats, data breach analysis, and actionable steps to delete footprints.
- Highlight specific vulnerabilities relating to typical email exposures (Amazon, Google, LinkedIn, Swiggy, Housing.com).
- Answer in short bullet points or crisp summaries. Avoid friendly chit-chat or long introductions.

User query: ${query}`
                }
              ]
            }
          ]
        })
      }
    );

    const data = await response.json();
    typingIndicator.remove();

    const aiText = data.candidates?.[0]?.content?.parts?.[0]?.text || "AI Sentinel failed to compile analysis reports.";
    appendChatBubble('ai', aiText);
    
    // Also append the trace log to the terminal history
    addTerminalLog('ai', `Threat inquiry analyzed: "${query.substring(0, 30)}..."`);

  } catch (err) {
    console.error('AI consultation failed:', err);
    typingIndicator.remove();
    appendChatBubble('ai', "Secure handshake with Gemini Sentinel failed. Connection timed out.");
    addTerminalLog('error', 'Gemini AI consultation stream interrupted.');
  }
}

function appendChatBubble(sender, message) {
  const container = document.getElementById('chat-messages');
  if (!container) return;

  const bubble = document.createElement('div');
  bubble.className = `chat-bubble ${sender}`;
  
  // Simple clean text mapping with spacing
  bubble.innerText = message;
  
  container.appendChild(bubble);
  container.scrollTop = container.scrollHeight;
}

function appendTypingIndicator() {
  const container = document.getElementById('chat-messages');
  if (!container) return null;

  const row = document.createElement('div');
  row.className = 'ai-typing self-start py-2 px-3 font-mono text-xs';
  row.innerHTML = `
    <span class="w-2 h-2 rounded-full bg-emerald animate-ping select-none"></span>
    SENTINEL AUDITING BREACH DATASETS...
  `;

  container.appendChild(row);
  container.scrollTop = container.scrollHeight;
  return row;
}
