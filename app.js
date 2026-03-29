/* ============================================
   ULTIMATE CLICKER SIMULATOR - app.js
   Full Game Logic - All bugs fixed
   ============================================ */

// ============================================
// GAME STATE
// ============================================
let state = {
  clicks: 0, coins: 0, totalClicks: 0, totalCoins: 0,
  level: 1, racesWon: 0, username: '', avatar: '🐱',
  upgrades: { multiplier: 0, autoclicker: 0, minigame: 0, coinboost: 0 },
  daily: { lastClaim: null, streak: 0 },
  quests: {
    q1: { done: false, claimed: false },
    q2: { done: false, claimed: false },
    q3: { done: false, claimed: false },
    lastReset: null
  },
  achievements: {
    clicks1000: false, coins100: false, firstrace: false,
    allquests: false, level10: false, minigame: false
  },
  minigamesCompleted: 0,
  takenUsernames: [],
};

function saveState() {
  try { localStorage.setItem('ultimateclicker_v1', JSON.stringify(state)); } catch(e) {}
}

function loadState() {
  try {
    const saved = localStorage.getItem('ultimateclicker_v1');
    // Also try old key for migration
    const oldSaved = !saved ? localStorage.getItem('ultraclicker_v2') : null;
    const raw = saved || oldSaved;
    if (!raw) return false;
    const p = JSON.parse(raw);
    state.clicks             = p.clicks || 0;
    state.coins              = p.coins || 0;
    state.totalClicks        = p.totalClicks || 0;
    state.totalCoins         = p.totalCoins || 0;
    state.level              = p.level || 1;
    state.racesWon           = p.racesWon || 0;
    state.username           = p.username || '';
    state.avatar             = p.avatar || '🐱';
    state.minigamesCompleted = p.minigamesCompleted || 0;
    state.takenUsernames     = p.takenUsernames || [];
    state.upgrades     = Object.assign({ multiplier:0, autoclicker:0, minigame:0, coinboost:0 }, p.upgrades || {});
    state.daily        = Object.assign({ lastClaim:null, streak:0 }, p.daily || {});
    state.quests       = Object.assign({
      q1:{done:false,claimed:false}, q2:{done:false,claimed:false},
      q3:{done:false,claimed:false}, lastReset:null
    }, p.quests || {});
    state.achievements = Object.assign({
      clicks1000:false, coins100:false, firstrace:false,
      allquests:false, level10:false, minigame:false
    }, p.achievements || {});
    return !!state.username;
  } catch(e) { return false; }
}

// ============================================
// DIGITAL BACKGROUND
// ============================================
function initBackground() {
  const canvas = document.getElementById('bg-canvas');
  if (!canvas) return;
  const ctx = canvas.getContext('2d');
  let W = canvas.width  = window.innerWidth;
  let H = canvas.height = window.innerHeight;

  window.addEventListener('resize', () => {
    W = canvas.width  = window.innerWidth;
    H = canvas.height = window.innerHeight;
  });

  // Floating particles
  const particles = Array.from({ length: 38 }, () => ({
    x: Math.random() * W, y: Math.random() * H,
    vx: (Math.random() - 0.5) * 0.4,
    vy: (Math.random() - 0.5) * 0.4,
    r: Math.random() * 2 + 1,
  }));

  function drawBg() {
    ctx.clearRect(0, 0, W, H);

    // Grid lines
    ctx.strokeStyle = '#a78bfa';
    ctx.lineWidth = 0.5;
    const gridSize = 40;
    for (let x = 0; x < W; x += gridSize) {
      ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, H); ctx.stroke();
    }
    for (let y = 0; y < H; y += gridSize) {
      ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(W, y); ctx.stroke();
    }

    // Particles + connections
    particles.forEach(p => {
      p.x += p.vx; p.y += p.vy;
      if (p.x < 0) p.x = W; if (p.x > W) p.x = 0;
      if (p.y < 0) p.y = H; if (p.y > H) p.y = 0;
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
      ctx.fillStyle = '#7c3aed';
      ctx.fill();
    });

    // Connect nearby particles
    for (let i = 0; i < particles.length; i++) {
      for (let j = i + 1; j < particles.length; j++) {
        const dx = particles[i].x - particles[j].x;
        const dy = particles[i].y - particles[j].y;
        const dist = Math.sqrt(dx*dx + dy*dy);
        if (dist < 100) {
          ctx.beginPath();
          ctx.moveTo(particles[i].x, particles[i].y);
          ctx.lineTo(particles[j].x, particles[j].y);
          ctx.strokeStyle = `rgba(124,58,237,${1 - dist/100})`;
          ctx.lineWidth = 0.6;
          ctx.stroke();
        }
      }
    }
    requestAnimationFrame(drawBg);
  }
  drawBg();
}

// ============================================
// AUDIO
// ============================================
let audioCtx = null;
let musicGain = null;
let musicPlaying = false;
let musicStarted = false;

function initAudio() {
  if (audioCtx) return;
  audioCtx = new (window.AudioContext || window.webkitAudioContext)();
  musicGain = audioCtx.createGain();
  musicGain.gain.value = 0.18;
  musicGain.connect(audioCtx.destination);
}

function startLofi() {
  if (musicStarted) return;
  musicStarted = true;
  musicPlaying = true;
  if (!audioCtx) initAudio();

  const chords = [
    [220, 261.6, 329.6],
    [174.6, 220, 261.6],
    [130.8, 164.8, 196],
    [196, 246.9, 293.7],
  ];
  let chordIndex = 0;

  function playChord() {
    if (!audioCtx || !musicPlaying) return;
    const chord = chords[chordIndex % chords.length];
    chordIndex++;
    chord.forEach(freq => {
      const osc = audioCtx.createOscillator();
      const gain = audioCtx.createGain();
      const filter = audioCtx.createBiquadFilter();
      filter.type = 'lowpass'; filter.frequency.value = 900;
      osc.connect(filter); filter.connect(gain); gain.connect(musicGain);
      osc.type = 'sine'; osc.frequency.value = freq;
      gain.gain.setValueAtTime(0, audioCtx.currentTime);
      gain.gain.linearRampToValueAtTime(0.3, audioCtx.currentTime + 0.3);
      gain.gain.linearRampToValueAtTime(0, audioCtx.currentTime + 3.6);
      osc.start(audioCtx.currentTime);
      osc.stop(audioCtx.currentTime + 4);
    });
    // Bass
    const bass = audioCtx.createOscillator();
    const bGain = audioCtx.createGain();
    bass.connect(bGain); bGain.connect(musicGain);
    bass.type = 'sine'; bass.frequency.value = chord[0] / 2;
    bGain.gain.setValueAtTime(0, audioCtx.currentTime);
    bGain.gain.linearRampToValueAtTime(0.38, audioCtx.currentTime + 0.1);
    bGain.gain.linearRampToValueAtTime(0, audioCtx.currentTime + 2);
    bass.start(audioCtx.currentTime); bass.stop(audioCtx.currentTime + 2.2);
  }

  function playHihat() {
    if (!audioCtx || !musicPlaying) return;
    const bufSize = Math.floor(audioCtx.sampleRate * 0.05);
    const buf = audioCtx.createBuffer(1, bufSize, audioCtx.sampleRate);
    const data = buf.getChannelData(0);
    for (let i = 0; i < bufSize; i++) data[i] = Math.random() * 2 - 1;
    const src = audioCtx.createBufferSource();
    const gain = audioCtx.createGain();
    const hpf = audioCtx.createBiquadFilter();
    hpf.type = 'highpass'; hpf.frequency.value = 8000;
    src.buffer = buf; src.connect(hpf); hpf.connect(gain); gain.connect(musicGain);
    gain.gain.setValueAtTime(0.07, audioCtx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 0.05);
    src.start(audioCtx.currentTime);
  }

  function playKick() {
    if (!audioCtx || !musicPlaying) return;
    const osc = audioCtx.createOscillator();
    const gain = audioCtx.createGain();
    osc.connect(gain); gain.connect(musicGain);
    osc.type = 'sine';
    osc.frequency.setValueAtTime(150, audioCtx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(40, audioCtx.currentTime + 0.15);
    gain.gain.setValueAtTime(0.55, audioCtx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 0.2);
    osc.start(audioCtx.currentTime); osc.stop(audioCtx.currentTime + 0.25);
  }

  let beat = 0;
  const beatLen = 60 / 75;
  function scheduleBeat() {
    if (!musicPlaying) return;
    if (beat % 8 === 0) playChord();
    if (beat % 4 === 0 || beat % 4 === 2) playKick();
    if (beat % 2 === 0) playHihat();
    beat++;
    setTimeout(scheduleBeat, beatLen * 1000);
  }
  scheduleBeat();
}

// Stop/resume music when app visibility changes
document.addEventListener('visibilitychange', () => {
  if (!audioCtx) return;
  if (document.hidden) {
    musicPlaying = false;
    if (audioCtx.state === 'running') audioCtx.suspend();
  } else {
    musicPlaying = true;
    if (audioCtx.state === 'suspended') audioCtx.resume();
  }
});

function playClick() {
  try {
    if (!audioCtx) return;
    const osc = audioCtx.createOscillator();
    const gain = audioCtx.createGain();
    osc.connect(gain); gain.connect(audioCtx.destination);
    osc.type = 'sine';
    osc.frequency.setValueAtTime(900, audioCtx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(500, audioCtx.currentTime + 0.07);
    gain.gain.setValueAtTime(0.14, audioCtx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 0.1);
    osc.start(audioCtx.currentTime); osc.stop(audioCtx.currentTime + 0.1);
  } catch(e) {}
}

function playSuccess() {
  try {
    if (!audioCtx) return;
    [520, 660, 800].forEach((freq, i) => {
      const osc = audioCtx.createOscillator();
      const gain = audioCtx.createGain();
      osc.connect(gain); gain.connect(audioCtx.destination);
      osc.type = 'sine'; osc.frequency.value = freq;
      gain.gain.setValueAtTime(0.12, audioCtx.currentTime + i * 0.1);
      gain.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + i * 0.1 + 0.15);
      osc.start(audioCtx.currentTime + i * 0.1);
      osc.stop(audioCtx.currentTime + i * 0.1 + 0.2);
    });
  } catch(e) {}
}

function playError() {
  try {
    if (!audioCtx) return;
    const osc = audioCtx.createOscillator();
    const gain = audioCtx.createGain();
    osc.connect(gain); gain.connect(audioCtx.destination);
    osc.type = 'sawtooth'; osc.frequency.value = 180;
    gain.gain.setValueAtTime(0.08, audioCtx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 0.2);
    osc.start(audioCtx.currentTime); osc.stop(audioCtx.currentTime + 0.2);
  } catch(e) {}
}

// ============================================
// TOAST
// ============================================
let toastTimer = null;
function showToast(msg) {
  const t = document.getElementById('toast');
  if (!t) return;
  t.textContent = msg;
  t.classList.remove('hidden');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => t.classList.add('hidden'), 2500);
}

// ============================================
// FORMAT NUMBER
// ============================================
function formatNum(n) {
  n = Math.floor(n);
  if (n >= 1000000) return (n / 1000000).toFixed(1) + 'M';
  if (n >= 1000)    return (n / 1000).toFixed(1) + 'K';
  return n.toString();
}

// ============================================
// CONFETTI
// ============================================
function launchConfetti() {
  const container = document.getElementById('confetti-container');
  if (!container) return;
  const colors = ['#a78bfa','#60a5fa','#f9a8d4','#86efac','#fde68a','#c084fc'];
  for (let i = 0; i < 60; i++) {
    const piece = document.createElement('div');
    piece.classList.add('confetti-piece');
    piece.style.left     = Math.random() * 100 + 'vw';
    piece.style.background = colors[Math.floor(Math.random() * colors.length)];
    piece.style.animationDuration  = (Math.random() * 2 + 1.5) + 's';
    piece.style.animationDelay     = Math.random() * 0.5 + 's';
    piece.style.width  = (Math.random() * 8 + 6) + 'px';
    piece.style.height = (Math.random() * 8 + 6) + 'px';
    piece.style.borderRadius = Math.random() > 0.5 ? '50%' : '2px';
    container.appendChild(piece);
    setTimeout(() => piece.remove(), 3500);
  }
}

// ============================================
// ACHIEVEMENT POPUP
// ============================================
let achTimer = null;
function showAchievement(name) {
  const popup = document.getElementById('achievement-popup');
  const nameEl = document.getElementById('ach-name');
  if (!popup || !nameEl) return;
  nameEl.textContent = name;
  popup.classList.remove('hidden');
  launchConfetti();
  playSuccess();
  clearTimeout(achTimer);
  achTimer = setTimeout(() => popup.classList.add('hidden'), 3500);
}

// ============================================
// LOADING SCREEN
// ============================================
const loadingMessages = [
  'Initializing Systems...', 'Loading Click Engine...',
  'Calibrating Coins...', 'Preparing Mini-Games...',
  'Summoning Bots...', 'Almost Ready...'
];

function runLoadingScreen(callback) {
  const bar    = document.getElementById('loading-bar');
  const textEl = document.getElementById('loading-text');
  let pct = 0, msgIdx = 0;
  let done = false;

  // Max 5 seconds hard cap — always fires callback
  const hardCap = setTimeout(() => {
    if (done) return;
    done = true;
    clearInterval(barInterval);
    clearInterval(msgInterval);
    if (bar) bar.style.width = '100%';
    if (textEl) textEl.textContent = 'Ready!';
    setTimeout(callback, 200);
  }, 5000);

  // Rotate loading messages every 700ms
  const msgInterval = setInterval(() => {
    if (textEl && msgIdx < loadingMessages.length) {
      textEl.textContent = loadingMessages[msgIdx++];
    }
  }, 700);

  // Fill bar smoothly — completes well within 5s
  const barInterval = setInterval(() => {
    pct += Math.random() * 35 + 20;
    if (pct >= 100) {
      pct = 100;
      if (bar) bar.style.width = '100%';
      clearInterval(barInterval);
      clearInterval(msgInterval);
      clearTimeout(hardCap);
      if (done) return;
      done = true;
      if (textEl) textEl.textContent = 'Ready!';
      setTimeout(callback, 200);
    } else {
      if (bar) bar.style.width = pct + '%';
    }
  }, 180);
}

// ============================================
// SETUP SCREEN
// ============================================
function showSetup() {
  document.getElementById('loading-screen').classList.add('hidden');
  document.getElementById('setup-screen').classList.remove('hidden');

  // Default avatar
  state.avatar = '🐱';
  document.querySelectorAll('#setup-screen .avatar-option').forEach(el => {
    el.addEventListener('click', () => {
      document.querySelectorAll('#setup-screen .avatar-option').forEach(a => a.classList.remove('selected'));
      el.classList.add('selected');
      state.avatar = el.dataset.avatar;
      playClick();
    });
  });

  document.getElementById('start-btn').addEventListener('click', () => {
    initAudio();
    const name = document.getElementById('username-input').value.trim();
    if (!name || name.length < 2) { showToast('Enter a username (min 2 chars)! 😊'); return; }
    state.username = name;
    if (!state.takenUsernames.includes(name)) state.takenUsernames.push(name);
    playSuccess();
    saveState();
    showGame();
    setTimeout(startLofi, 300);
  });
}

// ============================================
// SHOW GAME
// ============================================
function showGame() {
  document.getElementById('loading-screen').classList.add('hidden');
  document.getElementById('setup-screen').classList.add('hidden');
  document.getElementById('game-screen').classList.remove('hidden');
  resetDailyQuestsIfNeeded();
  updateUI();
  setupNav();
  setupClickButton();
  setupExchange();
  setupShop();
  setupMinigames();
  setupQuests();
  setupRace();
  setupLeaderboard();
  setupProfile();
  startIdleClicker();
  startAutoClicker();
  startLeaderboardTimer();
}

// ============================================
// UI UPDATE
// ============================================
function updateUI() {
  const el = id => document.getElementById(id);

  el('click-display').textContent = formatNum(state.clicks);
  el('coin-display').textContent  = formatNum(state.coins);

  // Level progress — based on TOTAL clicks ever
  const needed = state.level * 150;
  const prevNeeded = (state.level - 1) * 150;
  const prog = Math.min(((state.totalClicks - prevNeeded) / needed) * 100, 100);
  el('level-label').textContent    = 'Level ' + state.level;
  el('level-next').textContent     = 'Next: ' + formatNum(needed + prevNeeded) + ' total clicks';
  el('level-bar-fill').style.width = Math.max(0, prog) + '%';

  // Profile
  el('profile-avatar').textContent    = state.avatar;
  el('profile-name').textContent      = state.username;
  el('profile-level-tag').textContent = 'Level ' + state.level;
  el('stat-clicks').textContent       = formatNum(state.totalClicks);
  el('stat-coins').textContent        = formatNum(state.totalCoins);
  el('stat-races').textContent        = state.racesWon;
  el('stat-level').textContent        = state.level;

  // Shop upgrade levels
  el('multi-level').textContent = state.upgrades.multiplier;
  el('auto-level').textContent  = state.upgrades.autoclicker;
  el('mini-level').textContent  = state.upgrades.minigame;
  el('coin-level').textContent  = state.upgrades.coinboost;

  // Auto-clicker speed label
  const autoLvl = state.upgrades.autoclicker;
  const speedEl = el('auto-speed-label');
  if (speedEl) {
    if (autoLvl === 0) speedEl.textContent = 'Not active';
    else speedEl.textContent = '1 click / ' + Math.max(1, 11 - autoLvl) + 's';
  }

  updateShopCosts();
  updateQuestUI();
  updateAchievements();
}

// ============================================
// NAV
// ============================================
function setupNav() {
  document.querySelectorAll('.nav-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      initAudio(); playClick();
      const panel = btn.dataset.panel;
      document.querySelectorAll('.nav-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      document.querySelectorAll('.panel').forEach(p => p.classList.add('hidden'));
      if (panel !== 'main') {
        const target = document.getElementById('panel-' + panel);
        if (target) target.classList.remove('hidden');
        if (panel === 'leaderboard') renderLeaderboard('clicks');
      }
    });
  });
}

// ============================================
// CLICK BUTTON
// ============================================
function setupClickButton() {
  const btn = document.getElementById('click-btn');
  btn.addEventListener('click', (e) => {
    initAudio();
    const mult = Math.max(1, 1 + state.upgrades.multiplier);
    state.clicks      += mult;
    state.totalClicks += mult;
    checkLevel();
    updateUI();
    playClick();
    animatePing(btn);
    showClickPop(e, '+' + mult);
    updateQuestProgress();
    checkAchievements();
    saveState();
  });
}

function animatePing(btn) {
  btn.classList.remove('ping');
  void btn.offsetWidth;
  btn.classList.add('ping');
  setTimeout(() => btn.classList.remove('ping'), 400);
}

function showClickPop(e, text) {
  const pop = document.getElementById('click-pop');
  if (!pop) return;
  pop.textContent = text;
  pop.style.left  = (e.clientX - 15) + 'px';
  pop.style.top   = (e.clientY - 30) + 'px';
  pop.classList.remove('hidden');
  pop.style.animation = 'none';
  void pop.offsetWidth;
  pop.style.animation = '';
  setTimeout(() => pop.classList.add('hidden'), 650);
}

// ============================================
// EXCHANGE
// ============================================
function setupExchange() {
  document.getElementById('exchange-btn').addEventListener('click', () => {
    initAudio();
    if (state.clicks < 10) { showToast('Need at least 10 clicks! 👆'); playError(); return; }
    const sets   = Math.floor(state.clicks / 10);
    const boost  = 1 + (state.upgrades.coinboost * 0.25);
    const earned = Math.floor(sets * boost);
    state.clicks     -= sets * 10;
    state.coins      += earned;
    state.totalCoins += earned;
    playSuccess();
    showToast('💰 +' + earned + ' coins earned!');
    updateUI();
    updateQuestProgress();
    checkAchievements();
    saveState();
  });
}

// ============================================
// LEVEL SYSTEM
// ============================================
function checkLevel() {
  const needed = state.level * 150;
  const prevNeeded = (state.level - 1) * 150;
  if (state.totalClicks >= needed + prevNeeded) {
    state.level++;
    showToast('🎉 Level Up! Now Level ' + state.level + '!');
    playSuccess();
    checkAchievements();
  }
}

// ============================================
// IDLE CLICKER (base passive — 1 click / 30s)
// ============================================
function startIdleClicker() {
  setInterval(() => {
    state.clicks      += 1;
    state.totalClicks += 1;
    checkLevel();
    updateUI();
    saveState();
  }, 30000);
}

// ============================================
// AUTO CLICKER (shop-based interval system)
// ============================================
let autoClickerInterval = null;

function startAutoClicker() {
  if (autoClickerInterval) clearInterval(autoClickerInterval);
  const lvl = state.upgrades.autoclicker;
  if (lvl === 0) return;
  const intervalSec = Math.max(1, 11 - lvl); // Level 1=10s, Level 10=1s
  autoClickerInterval = setInterval(() => {
    if (!raceActive) { // disabled during races
      state.clicks      += 1;
      state.totalClicks += 1;
      checkLevel();
      updateUI();
      saveState();
    }
  }, intervalSec * 1000);
}

// ============================================
// SHOP
// ============================================
const upgradeCosts = { multiplier:50, autoclicker:100, minigame:75, coinboost:80 };

function setupShop() {
  document.querySelectorAll('.btn-upgrade').forEach(btn => {
    btn.addEventListener('click', () => {
      initAudio(); playClick();
      const type = btn.dataset.upgrade;
      const cost = upgradeCosts[type] * (state.upgrades[type] + 1);
      if (state.coins < cost) { showToast('Need 🪙 ' + cost + ' coins!'); playError(); return; }
      state.coins -= cost;
      state.upgrades[type]++;
      playSuccess();
      showToast('✅ ' + type + ' upgraded to Level ' + state.upgrades[type] + '!');
      if (type === 'autoclicker') startAutoClicker(); // restart with new interval
      updateUI();
      saveState();
    });
  });
}

function updateShopCosts() {
  document.querySelectorAll('.btn-upgrade').forEach(btn => {
    const type = btn.dataset.upgrade;
    const cost = upgradeCosts[type] * (state.upgrades[type] + 1);
    const el   = btn.querySelector('.upgrade-cost');
    if (el) el.textContent = '🪙 ' + cost;
  });
}

// ============================================
// DAILY REWARDS & QUESTS
// ============================================
function resetDailyQuestsIfNeeded() {
  const today = new Date().toDateString();
  if (state.quests.lastReset !== today) {
    state.quests = {
      q1:{done:false,claimed:false}, q2:{done:false,claimed:false},
      q3:{done:false,claimed:false}, lastReset:today
    };
    saveState();
  }
}

function setupQuests() {
  const dailyBtn = document.getElementById('claim-daily-btn');
  if (dailyBtn) {
    dailyBtn.addEventListener('click', () => {
      initAudio();
      const today     = new Date().toDateString();
      const yesterday = new Date(Date.now() - 86400000).toDateString();
      if (state.daily.lastClaim === today) { showToast('Already claimed! Come back tomorrow 🌙'); playError(); return; }
      state.daily.streak    = (state.daily.lastClaim === yesterday) ? state.daily.streak + 1 : 1;
      state.daily.lastClaim = today;
      const reward = 20 + state.daily.streak * 5;
      state.coins += reward; state.totalCoins += reward;
      playSuccess();
      showToast('🎁 +' + reward + ' coins! Streak: ' + state.daily.streak + ' days 🔥');
      const sc = document.getElementById('streak-count');
      if (sc) sc.textContent = state.daily.streak;
      updateUI(); saveState();
    });
  }
  const sc = document.getElementById('streak-count');
  if (sc) sc.textContent = state.daily.streak;

  const q1 = document.getElementById('q1-claim');
  const q2 = document.getElementById('q2-claim');
  const q3 = document.getElementById('q3-claim');
  if (q1) q1.addEventListener('click', () => { initAudio(); claimQuest('q1', 50, 'clicks'); });
  if (q2) q2.addEventListener('click', () => { initAudio(); claimQuest('q2', 20, 'coins'); });
  if (q3) q3.addEventListener('click', () => { initAudio(); claimQuest('q3', 15, 'coins'); });
}

function claimQuest(id, reward, type) {
  if (!state.quests[id].done || state.quests[id].claimed) return;
  state.quests[id].claimed = true;
  if (type === 'clicks') { state.clicks += reward; state.totalClicks += reward; }
  if (type === 'coins')  { state.coins  += reward; state.totalCoins  += reward; }
  playSuccess();
  showToast('✅ Quest claimed! +' + reward + ' ' + type + '!');
  updateUI(); checkAllQuests(); saveState();
}

function updateQuestProgress() {
  if (!state.quests.q1.claimed) {
    const p = Math.min(state.totalClicks, 500);
    const el = document.getElementById('q1-progress');
    if (el) el.textContent = formatNum(p) + ' / 500';
    if (p >= 500 && !state.quests.q1.done) {
      state.quests.q1.done = true;
      const b = document.getElementById('q1-claim'); if(b) b.disabled = false;
    }
  }
  if (!state.quests.q2.claimed) {
    const p = Math.min(state.totalCoins, 50);
    const el = document.getElementById('q2-progress');
    if (el) el.textContent = p + ' / 50';
    if (p >= 50 && !state.quests.q2.done) {
      state.quests.q2.done = true;
      const b = document.getElementById('q2-claim'); if(b) b.disabled = false;
    }
  }
  if (!state.quests.q3.claimed) {
    const p = Math.min(state.minigamesCompleted, 1);
    const el = document.getElementById('q3-progress');
    if (el) el.textContent = p + ' / 1';
    if (p >= 1 && !state.quests.q3.done) {
      state.quests.q3.done = true;
      const b = document.getElementById('q3-claim'); if(b) b.disabled = false;
    }
  }
}

function updateQuestUI() {
  updateQuestProgress();
  if (state.quests.q1.claimed) { const b = document.getElementById('q1-claim'); if(b){b.textContent='✓ Done';b.disabled=true;} }
  if (state.quests.q2.claimed) { const b = document.getElementById('q2-claim'); if(b){b.textContent='✓ Done';b.disabled=true;} }
  if (state.quests.q3.claimed) { const b = document.getElementById('q3-claim'); if(b){b.textContent='✓ Done';b.disabled=true;} }
}

function checkAllQuests() {
  if (state.quests.q1.claimed && state.quests.q2.claimed && state.quests.q3.claimed && !state.achievements.allquests) {
    state.achievements.allquests = true;
    showAchievement('Quest Master 📋');
    checkAchievements(); saveState();
  }
}

// ============================================
// ACHIEVEMENTS
// ============================================
function checkAchievements() {
  if (state.totalClicks >= 1000 && !state.achievements.clicks1000) {
    state.achievements.clicks1000 = true;
    showAchievement('1,000 Clicks! 👆');
  }
  if (state.totalCoins >= 100 && !state.achievements.coins100) {
    state.achievements.coins100 = true;
    showAchievement('100 Coins! 🪙');
  }
  if (state.level >= 10 && !state.achievements.level10) {
    state.achievements.level10 = true;
    showAchievement('Level 10 Reached! ⭐');
  }
  updateAchievements();
  saveState();
}

function updateAchievements() {
  const map = {
    'badge-1000clicks': state.achievements.clicks1000,
    'badge-100coins':   state.achievements.coins100,
    'badge-firstrace':  state.achievements.firstrace,
    'badge-allquests':  state.achievements.allquests,
    'badge-level10':    state.achievements.level10,
    'badge-minigame':   state.achievements.minigame,
  };
  for (const [id, unlocked] of Object.entries(map)) {
    const el = document.getElementById(id);
    if (!el) continue;
    el.classList.toggle('locked',   !unlocked);
    el.classList.toggle('unlocked',  unlocked);
  }
}

// ============================================
// MINI-GAMES
// ============================================
function setupMinigames() {
  document.querySelectorAll('.btn-play').forEach(btn => {
    btn.addEventListener('click', () => {
      initAudio(); playClick();
      const game = btn.dataset.game;
      document.getElementById('modal-' + game).classList.remove('hidden');
      if (game === 'frenzy') resetFrenzy();
      if (game === 'rain')   resetRain();
      if (game === 'memory') resetMemory();
    });
  });
  document.getElementById('frenzy-close').addEventListener('click', () => { closeFrenzy(); playClick(); });
  document.getElementById('rain-close').addEventListener('click',   () => { closeRain();   playClick(); });
  document.getElementById('memory-close').addEventListener('click', () => { closeMemory(); playClick(); });
}

function onMinigameComplete() {
  state.minigamesCompleted++;
  if (!state.achievements.minigame) {
    state.achievements.minigame = true;
    showAchievement('Game Winner! 🎮');
  }
  updateQuestProgress(); checkAchievements(); saveState();
}

/* ---- CLICKING STORM ---- */
let frenzyActive = false, frenzyScore = 0, frenzyTime = 10, frenzyInterval = null;

function resetFrenzy() {
  clearInterval(frenzyInterval);
  frenzyActive = false; frenzyScore = 0; frenzyTime = 10;
  document.getElementById('frenzy-timer').textContent = '10';
  document.getElementById('frenzy-score').textContent = '0';

  const old = document.getElementById('frenzy-start-btn');
  const btn = old.cloneNode(true);
  btn.textContent = 'Start!'; btn.classList.remove('hidden');
  old.parentNode.replaceChild(btn, old);

  btn.addEventListener('click', () => {
    if (!frenzyActive) {
      frenzyActive = true;
      btn.textContent = 'TAP! 👆';
      frenzyInterval = setInterval(() => {
        frenzyTime = Math.max(0, frenzyTime - 1);
        document.getElementById('frenzy-timer').textContent = frenzyTime;
        if (frenzyTime <= 0) {
          clearInterval(frenzyInterval);
          frenzyActive = false;
          // Freeze button after time ends
          btn.disabled = true;
          state.clicks      += frenzyScore;
          state.totalClicks += frenzyScore;
          playSuccess();
          showToast('⚡ Storm over! +' + frenzyScore + ' clicks!');
          onMinigameComplete(); updateUI();
          setTimeout(() => {
            btn.textContent = 'Play Again!';
            btn.disabled = false;
            frenzyTime = 10; frenzyScore = 0;
            document.getElementById('frenzy-timer').textContent = '10';
            document.getElementById('frenzy-score').textContent = '0';
            frenzyActive = false;
          }, 1000);
        }
      }, 1000);
    } else if (frenzyTime > 0) {
      // Only register taps while time > 0
      frenzyScore++;
      document.getElementById('frenzy-score').textContent = frenzyScore;
      playClick();
    }
  });
}

function closeFrenzy() {
  clearInterval(frenzyInterval); frenzyActive = false;
  document.getElementById('modal-frenzy').classList.add('hidden');
}

/* ---- COIN RUSH ---- */
let rainActive = false, rainCaught = 0, rainTime = 20;
let rainInterval = null, rainSpawnInterval = null;

function resetRain() {
  clearInterval(rainInterval); clearInterval(rainSpawnInterval);
  rainActive = false; rainCaught = 0; rainTime = 20;
  document.getElementById('rain-caught').textContent = '0';
  document.getElementById('rain-timer').textContent  = '20';
  document.getElementById('rain-arena').innerHTML    = '';

  const old = document.getElementById('rain-start-btn');
  const btn = old.cloneNode(true);
  btn.textContent = 'Start!'; btn.classList.remove('hidden');
  old.parentNode.replaceChild(btn, old);

  btn.addEventListener('click', () => {
    if (rainActive) return;
    rainActive = true; btn.classList.add('hidden');

    rainInterval = setInterval(() => {
      rainTime = Math.max(0, rainTime - 1);
      document.getElementById('rain-timer').textContent = rainTime;
      if (rainTime <= 0) {
        clearInterval(rainInterval); clearInterval(rainSpawnInterval);
        rainActive = false;
        // Remove all remaining items
        document.getElementById('rain-arena').innerHTML = '';
        const boost  = 1 + (state.upgrades.minigame * 0.25);
        const reward = Math.max(0, Math.floor(rainCaught * boost));
        state.coins += reward; state.totalCoins += reward;
        playSuccess();
        showToast('🪙 Rush over! +' + reward + ' coins!');
        onMinigameComplete(); updateUI();
        btn.textContent = 'Play Again!'; btn.classList.remove('hidden');
      }
    }, 1000);

    rainSpawnInterval = setInterval(spawnRainItem, 650);
  });
}

function spawnRainItem() {
  const arena = document.getElementById('rain-arena');
  if (!arena || !rainActive || rainTime <= 0) return;
  const isBomb = Math.random() < 0.22;
  const item   = document.createElement('div');
  item.classList.add('rain-item');
  item.textContent    = isBomb ? '💣' : '🪙';
  item.style.left     = (Math.random() * 82) + '%';
  item.style.top      = '-30px';
  item.style.position = 'absolute';
  arena.appendChild(item);

  let clicked = false;
  item.addEventListener('click', (e) => {
    e.stopPropagation();
    if (!rainActive || rainTime <= 0 || clicked) return;
    clicked = true;
    if (isBomb) { rainCaught = Math.max(0, rainCaught - 5); showToast('💣 Bomb! -5 coins!'); playError(); }
    else        { rainCaught++; playClick(); }
    document.getElementById('rain-caught').textContent = rainCaught;
    item.remove();
  });

  let top = -30;
  const speed = 3 + Math.random() * 2;
  const fall = setInterval(() => {
    if (!rainActive || rainTime <= 0) { clearInterval(fall); if(item.parentNode) item.remove(); return; }
    top += speed;
    item.style.top = top + 'px';
    if (top > 210) { clearInterval(fall); if(item.parentNode) item.remove(); }
  }, 40);
}

function closeRain() {
  clearInterval(rainInterval); clearInterval(rainSpawnInterval);
  rainActive = false;
  document.getElementById('rain-arena').innerHTML = '';
  document.getElementById('modal-rain').classList.add('hidden');
}

/* ---- MEMORY PATTERN RECALL ---- */
let memSequence = [], memInput = [], memRound = 1, memAccepting = false;

function resetMemory() {
  memSequence = []; memInput = []; memRound = 1; memAccepting = false;
  document.getElementById('memory-round').textContent       = '1';
  document.getElementById('memory-instruction').textContent = 'Watch the buttons light up, then tap them in the same order!';

  const old = document.getElementById('memory-start-btn');
  const btn = old.cloneNode(true);
  btn.textContent = 'Start!'; btn.classList.remove('hidden');
  old.parentNode.replaceChild(btn, old);

  // Re-attach tile listeners fresh
  document.querySelectorAll('.mem-btn').forEach((tile, i) => {
    const newTile = tile.cloneNode(true);
    tile.parentNode.replaceChild(newTile, tile);
    newTile.addEventListener('click', () => {
      if (!memAccepting) return;
      playClick();
      newTile.classList.add('flash');
      setTimeout(() => newTile.classList.remove('flash'), 280);
      memInput.push(i);
      checkMemInput();
    });
  });

  btn.addEventListener('click', () => { btn.classList.add('hidden'); nextMemRound(); });
}

function nextMemRound() {
  memInput = []; memAccepting = false;
  memSequence.push(Math.floor(Math.random() * 4));
  document.getElementById('memory-round').textContent       = memRound;
  document.getElementById('memory-instruction').textContent = 'Watch carefully... 👀';
  flashMemSeq(() => {
    memAccepting = true;
    document.getElementById('memory-instruction').textContent = 'Your turn! Tap in the same order! 👆';
  });
}

function flashMemSeq(callback) {
  const tiles = document.querySelectorAll('.mem-btn');
  let i = 0;
  const go = () => {
    if (i > 0) tiles[memSequence[i-1]].classList.remove('flash');
    if (i >= memSequence.length) { callback(); return; }
    tiles[memSequence[i]].classList.add('flash');
    i++;
    setTimeout(go, 700);
  };
  setTimeout(go, 400);
}

function checkMemInput() {
  const idx   = memInput.length - 1;
  const tiles = document.querySelectorAll('.mem-btn');
  if (memInput[idx] !== memSequence[idx]) {
    if (tiles[memInput[idx]]) {
      tiles[memInput[idx]].classList.add('wrong');
      setTimeout(() => tiles[memInput[idx]].classList.remove('wrong'), 400);
    }
    playError(); memAccepting = false;
    const boost  = 1 + (state.upgrades.minigame * 0.25);
    const coinReward  = Math.floor((memRound - 1) * 5 * boost);
    const clickReward = Math.floor((memRound - 1) * 3);
    if (coinReward > 0)  { state.coins += coinReward; state.totalCoins += coinReward; }
    if (clickReward > 0) { state.clicks += clickReward; state.totalClicks += clickReward; }
    document.getElementById('memory-instruction').textContent = '❌ Wrong! Game over!';
    const msg = 'Round ' + memRound + (coinReward > 0 ? '. +' + coinReward + ' coins & +' + clickReward + ' clicks!' : '!');
    showToast('🧠 ' + msg);
    onMinigameComplete(); updateUI();
    setTimeout(() => resetMemory(), 1600);
    return;
  }

  if (tiles[memInput[idx]]) {
    tiles[memInput[idx]].classList.add('correct');
    setTimeout(() => tiles[memInput[idx]].classList.remove('correct'), 300);
  }

  if (memInput.length === memSequence.length) {
    memAccepting = false; memRound++;
    playSuccess();
    document.getElementById('memory-instruction').textContent = '✅ Correct! Next round coming...';
    setTimeout(nextMemRound, 1000);
  }
}

function closeMemory() {
  memAccepting = false;
  document.getElementById('modal-memory').classList.add('hidden');
}

// ============================================
// RACES — Bot level system
// ============================================
const botNames   = ['ClickMaster99','TurboFinger','SpeedTapper','QuickClick','FingerFlash',
                    'RapidTap42','ClickZilla','NinjaClicker','SwiftPress','TapStorm',
                    'ClickBlitz','HyperTap','MegaFinger','UltraPress','ClickBeast',
                    'TapKing','FingerStorm','ClickRush','PressBot','SwiftClick'];
const botAvatars = ['🤖','👾','🦾','💻','🎮','🕹️','⚡','🌀','🔮','🧿'];

let raceBots = [], raceActive = false, racePlayerClicks = 0, raceTimer = 30;
let raceTimerInterval = null, raceBotIntervals = [];

function getBotConfig() {
  const lvl = state.level;
  // Slow: 1x (3-4 clicks/s), Medium: 2x (6-8), Fast: 4x (12-14)
  if (lvl < 5) {
    return ['slow'];
  } else if (lvl < 10) {
    return Math.random() > 0.5 ? ['slow','slow'] : ['slow','medium'];
  } else if (lvl < 20) {
    const pool = ['slow','medium','fast'];
    return [pool[Math.floor(Math.random()*3)], pool[Math.floor(Math.random()*3)]];
  } else {
    // Level 20+ — full multiplier
    const pool = ['slow','medium','fast','fast'];
    const count = Math.floor(Math.random()*2) + 2;
    return Array.from({length:count}, () => pool[Math.floor(Math.random()*pool.length)]);
  }
}

function botSpeedFromType(type) {
  if (type === 'slow')   return Math.floor(Math.random()*2) + 3;   // 3-4
  if (type === 'medium') return Math.floor(Math.random()*3) + 6;   // 6-8
  if (type === 'fast')   return Math.floor(Math.random()*3) + 12;  // 12-14
  return 3;
}

function botEmojiFromType(type) {
  if (type === 'slow')   return '🐢';
  if (type === 'medium') return '🐇';
  if (type === 'fast')   return '🐆';
  return '🤖';
}

function setupRace() {
  generateBots();
  document.getElementById('race-start-btn').addEventListener('click', () => { initAudio(); playClick(); startRace(); });
  document.getElementById('race-click-btn').addEventListener('click', () => {
    if (!raceActive || raceTimer <= 0) return;
    racePlayerClicks++; playClick(); updateRaceScoreboard();
  });
  document.getElementById('race-again-btn').addEventListener('click', () => {
    initAudio(); playClick();
    generateBots();
    document.getElementById('race-result').classList.add('hidden');
    document.getElementById('coin-popup').classList.add('hidden');
    document.getElementById('race-lobby').classList.remove('hidden');
  });
}

function generateBots() {
  raceBots = [];
  const types = getBotConfig();
  const used  = new Set();
  types.forEach(type => {
    let name;
    do { name = botNames[Math.floor(Math.random() * botNames.length)]; } while (used.has(name));
    used.add(name);
    raceBots.push({
      name,
      avatar: botEmojiFromType(type),
      speed: botSpeedFromType(type),
      type, clicks: 0,
    });
  });

  const botsEl = document.getElementById('race-bots');
  if (!botsEl) return;
  botsEl.innerHTML = '';
  raceBots.forEach(bot => {
    const card = document.createElement('div');
    card.classList.add('race-bot-card');
    const label = bot.type === 'slow' ? 'Slow 🐢' : bot.type === 'medium' ? 'Medium 🐇' : 'Fast 🐆';
    card.innerHTML = `
      <div class="race-bot-avatar">${bot.avatar}</div>
      <div>
        <div class="race-bot-name">${bot.name}</div>
        <div class="race-bot-speed">Speed: ${label}</div>
      </div>`;
    botsEl.appendChild(card);
  });
}

function startRace() {
  raceActive = true; racePlayerClicks = 0; raceTimer = 30;
  raceBots.forEach(b => b.clicks = 0);
  document.getElementById('race-lobby').classList.add('hidden');
  document.getElementById('race-result').classList.add('hidden');
  document.getElementById('coin-popup').classList.add('hidden');
  document.getElementById('race-arena').classList.remove('hidden');
  document.getElementById('race-timer').textContent = '30';
  buildRaceScoreboard();

  raceBotIntervals = raceBots.map(bot =>
    setInterval(() => {
      if (raceActive && raceTimer > 0) {
        bot.clicks += bot.speed;
        updateRaceScoreboard();
      }
    }, 1000)
  );

  raceTimerInterval = setInterval(() => {
    raceTimer = Math.max(0, raceTimer - 1);
    document.getElementById('race-timer').textContent = raceTimer;
    if (raceTimer <= 0) endRace();
  }, 1000);
}

function buildRaceScoreboard() {
  const board = document.getElementById('race-scoreboard');
  if (!board) return;
  board.innerHTML = `
    <div class="race-score-row you">
      <span>${state.avatar} ${state.username} (You)</span>
      <span id="race-you-clicks">0 clicks</span>
    </div>`;
  raceBots.forEach((bot, i) => {
    const row = document.createElement('div');
    row.classList.add('race-score-row','bot');
    row.innerHTML = `<span>${bot.avatar} ${bot.name}</span><span id="race-bot-clicks-${i}">0 clicks</span>`;
    board.appendChild(row);
  });
}

function updateRaceScoreboard() {
  const el = document.getElementById('race-you-clicks');
  if (el) el.textContent = racePlayerClicks + ' clicks';
  raceBots.forEach((bot, i) => {
    const b = document.getElementById('race-bot-clicks-' + i);
    if (b) b.textContent = bot.clicks + ' clicks';
  });
}

function endRace() {
  raceActive = false;
  clearInterval(raceTimerInterval);
  raceBotIntervals.forEach(clearInterval);
  raceBotIntervals = [];
  document.getElementById('race-arena').classList.add('hidden');
  document.getElementById('race-result').classList.remove('hidden');

  const topBot = Math.max(...raceBots.map(b => b.clicks));
  const won    = racePlayerClicks > topBot;
  const box    = document.getElementById('race-result-box');
  const coinPopup = document.getElementById('coin-popup');

  if (won) {
    state.racesWon++;
    const reward = 30 + Math.floor(Math.random() * 20);
    state.coins += reward; state.totalCoins += reward;
    if (!state.achievements.firstrace) {
      state.achievements.firstrace = true;
      showAchievement('First Race Win! 🏁');
    }
    box.className = 'race-result-box win';
    box.innerHTML = `
      <h2>🏆 You Won!</h2>
      <p>You tapped <b>${racePlayerClicks}</b> times.</p>
      <p>You have officially beaten all the bots and won <b>${reward} coins</b>!</p>`;
    // Coin popup animation
    if (coinPopup) {
      document.getElementById('coin-popup-amount').textContent = reward;
      coinPopup.classList.remove('hidden');
    }
    playSuccess();
    launchConfetti();
  } else {
    box.className = 'race-result-box lose';
    box.innerHTML = `
      <h2>😔 You Lost!</h2>
      <p>You tapped <b>${racePlayerClicks}</b> times, but a bot got <b>${topBot}</b>!</p>
      <p>Remember: no auto-clickers — raw tapping only! 💪</p>`;
    playError();
  }
  checkAchievements(); updateUI(); saveState();
}

// ============================================
// LEADERBOARD — Weekly reset timer + Top 100
// ============================================
const realPlayerNames = [
  'ClickKing','TapQueen','SpeedDemon','FingerGod','ClickLord','NinjaTapper',
  'UltraClick','HyperFinger','TapMaster','ClickWizard','SwiftFinger','TapLegend',
  'ClickHero','NinjaPress','TurboTap','ClickNinja','MegaTap','PressMaster',
  'TapWizard','ClickStorm','SwiftTap','PressingIt','FingerBlast','ClickFlash',
  'TapBlitz','PressBoss','ClickForce','TapForce','SwiftPress','ClickPower',
];

function setupLeaderboard() {
  document.querySelectorAll('.lb-tab').forEach(tab => {
    tab.addEventListener('click', () => {
      initAudio(); playClick();
      document.querySelectorAll('.lb-tab').forEach(t => t.classList.remove('active'));
      tab.classList.add('active');
      renderLeaderboard(tab.dataset.tab);
    });
  });

  const rewardBtn   = document.getElementById('lb-reward-btn');
  const rewardPanel = document.getElementById('lb-reward-panel');
  const rewardClose = document.getElementById('lb-reward-close');
  if (rewardBtn)   rewardBtn.addEventListener('click', () => { playClick(); rewardPanel.classList.toggle('hidden'); });
  if (rewardClose) rewardClose.addEventListener('click', () => { playClick(); rewardPanel.classList.add('hidden'); });

  renderLeaderboard('clicks');
}

function startLeaderboardTimer() {
  function updateTimer() {
    const now      = new Date();
    const nextMon  = new Date(now);
    nextMon.setDate(now.getDate() + ((1 + 7 - now.getDay()) % 7 || 7));
    nextMon.setHours(0, 0, 0, 0);
    const diff = nextMon - now;
    if (diff <= 0) { giveWeeklyRewards(); return; }
    const d  = Math.floor(diff / 86400000);
    const h  = Math.floor((diff % 86400000) / 3600000);
    const m  = Math.floor((diff % 3600000)  / 60000);
    const s  = Math.floor((diff % 60000)    / 1000);
    const el = document.getElementById('lb-timer');
    if (el) el.textContent = `${d}d ${h}h ${m}m ${s}s`;
  }
  updateTimer();
  setInterval(updateTimer, 1000);
}

function giveWeeklyRewards() {
  // Award player based on simulated position (random 1-5 this week)
  const pos = Math.floor(Math.random() * 5) + 1;
  const rewards = {1:{coins:1000,clicks:1000}, 2:{coins:500,clicks:500}, 3:{coins:250,clicks:250}, 4:{coins:100,clicks:0}, 5:{coins:50,clicks:0}};
  const r = rewards[pos] || {coins:0,clicks:0};
  if (r.coins > 0)  { state.coins += r.coins; state.totalCoins += r.coins; }
  if (r.clicks > 0) { state.clicks += r.clicks; state.totalClicks += r.clicks; }
  if (r.coins > 0) showToast('🏆 Weekly reward! You placed #' + pos + '. +' + r.coins + ' coins!');
  updateUI(); saveState();
}

function renderLeaderboard(type) {
  const list = document.getElementById('lb-list');
  if (!list) return;
  const medals = ['🥇','🥈','🥉'];
  const playerVal = type === 'clicks' ? state.totalClicks : type === 'coins' ? state.totalCoins : state.racesWon;

  // Generate 99 fake real-player entries
  let entries = realPlayerNames.concat(
    Array.from({length:70}, (_,i) => 'Player' + (1000 + i))
  ).slice(0,99).map((name, i) => ({
    name,
    value: Math.max(0, (100 - i) * (type==='races'?8:type==='coins'?400:1800) + Math.floor(Math.random()*200)),
    isYou: false,
  }));

  // Add player
  entries.push({ name: state.username + ' 👈', value: playerVal, isYou: true });
  entries.sort((a,b) => b.value - a.value);
  entries = entries.slice(0, 100);

  list.innerHTML = entries.map((e, i) => `
    <div class="lb-row${e.isYou?' you':''}">
      <span>${medals[i] || '#'+(i+1)}</span>
      <span>${e.name}</span>
      <span>${formatNum(e.value)}</span>
    </div>`).join('');
}

// ============================================
// PROFILE EDITING
// ============================================
function setupProfile() {
  const editBtn    = document.getElementById('btn-edit-profile');
  const editor     = document.getElementById('profile-editor');
  const saveBtn    = document.getElementById('save-profile-btn');
  const cancelBtn  = document.getElementById('cancel-edit-btn');
  const errorEl    = document.getElementById('edit-error');
  const inputEl    = document.getElementById('edit-username-input');

  let selectedEditAvatar = state.avatar;

  if (editBtn) {
    editBtn.addEventListener('click', () => {
      playClick();
      selectedEditAvatar = state.avatar;
      if (inputEl) inputEl.value = state.username;
      // Mark current avatar as selected
      document.querySelectorAll('.edit-avatar-grid .avatar-option').forEach(el => {
        el.classList.toggle('selected', el.dataset.avatar === state.avatar);
      });
      editor.classList.remove('hidden');
      editBtn.classList.add('hidden');
      if (errorEl) errorEl.classList.add('hidden');
    });
  }

  // Avatar selection in editor
  document.querySelectorAll('.edit-avatar-grid .avatar-option').forEach(el => {
    el.addEventListener('click', () => {
      document.querySelectorAll('.edit-avatar-grid .avatar-option').forEach(a => a.classList.remove('selected'));
      el.classList.add('selected');
      selectedEditAvatar = el.dataset.avatar;
      playClick();
    });
  });

  if (saveBtn) {
    saveBtn.addEventListener('click', () => {
      initAudio();
      const newName = inputEl ? inputEl.value.trim() : '';
      if (!newName || newName.length < 2) { showToast('Username must be at least 2 chars!'); return; }

      // Check uniqueness — skip if same as current
      if (newName !== state.username && state.takenUsernames.includes(newName)) {
        if (errorEl) errorEl.classList.remove('hidden');
        playError();
        return;
      }

      // Remove old name, add new
      state.takenUsernames = state.takenUsernames.filter(n => n !== state.username);
      state.username = newName;
      if (!state.takenUsernames.includes(newName)) state.takenUsernames.push(newName);
      state.avatar = selectedEditAvatar;
      if (errorEl) errorEl.classList.add('hidden');
      editor.classList.add('hidden');
      if (editBtn) editBtn.classList.remove('hidden');
      playSuccess();
      showToast('✅ Profile updated!');
      updateUI(); saveState();
    });
  }

  if (cancelBtn) {
    cancelBtn.addEventListener('click', () => {
      playClick();
      editor.classList.add('hidden');
      if (editBtn) editBtn.classList.remove('hidden');
      if (errorEl) errorEl.classList.add('hidden');
    });
  }
}

// ============================================
// INIT
// ============================================
window.addEventListener('load', () => {
  initBackground();
  const hasSave = loadState();
  runLoadingScreen(() => {
    document.getElementById('loading-screen').classList.add('hidden');
    if (hasSave) {
      showGame();
      // Start music after a short delay on reload
      setTimeout(() => { initAudio(); startLofi(); }, 500);
    } else {
      showSetup();
    }
  });
});
