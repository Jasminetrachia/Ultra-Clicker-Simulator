/* ============================================
   ULTIMATE CLICKER SIMULATOR - app.js
   ============================================ */

// ============================================
// LEVEL THRESHOLDS (exponential: 10x each level)
// Level 1 = 100, Level 2 = 1000, Level 3 = 10000...
// ============================================
function levelThreshold(lvl) {
  return Math.pow(10, lvl) * 10; // 100, 1000, 10000, 100000...
}

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
  try { localStorage.setItem('ultimateclicker_v2', JSON.stringify(state)); } catch(e) {}
}

function loadState() {
  try {
    // Try new key first, then migrate from old keys
    const raw = localStorage.getItem('ultimateclicker_v2')
             || localStorage.getItem('ultimateclicker_v1')
             || localStorage.getItem('ultraclicker_v2');
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
  const particles = Array.from({ length: 35 }, () => ({
    x: Math.random() * W, y: Math.random() * H,
    vx: (Math.random() - 0.5) * 0.4,
    vy: (Math.random() - 0.5) * 0.4,
    r: Math.random() * 2 + 1,
  }));
  function draw() {
    ctx.clearRect(0, 0, W, H);
    ctx.strokeStyle = '#a78bfa';
    ctx.lineWidth = 0.4;
    for (let x = 0; x < W; x += 40) { ctx.beginPath(); ctx.moveTo(x,0); ctx.lineTo(x,H); ctx.stroke(); }
    for (let y = 0; y < H; y += 40) { ctx.beginPath(); ctx.moveTo(0,y); ctx.lineTo(W,y); ctx.stroke(); }
    particles.forEach(p => {
      p.x += p.vx; p.y += p.vy;
      if (p.x < 0) p.x = W; if (p.x > W) p.x = 0;
      if (p.y < 0) p.y = H; if (p.y > H) p.y = 0;
      ctx.beginPath(); ctx.arc(p.x, p.y, p.r, 0, Math.PI*2);
      ctx.fillStyle = '#7c3aed'; ctx.fill();
    });
    for (let i = 0; i < particles.length; i++) {
      for (let j = i+1; j < particles.length; j++) {
        const dx = particles[i].x - particles[j].x;
        const dy = particles[i].y - particles[j].y;
        const d  = Math.sqrt(dx*dx + dy*dy);
        if (d < 100) {
          ctx.beginPath();
          ctx.moveTo(particles[i].x, particles[i].y);
          ctx.lineTo(particles[j].x, particles[j].y);
          ctx.strokeStyle = `rgba(124,58,237,${1-d/100})`;
          ctx.lineWidth = 0.5; ctx.stroke();
        }
      }
    }
    requestAnimationFrame(draw);
  }
  draw();
}

// ============================================
// AUDIO
// ============================================
let audioCtx = null, musicGain = null, musicStarted = false, musicPlaying = false;

function initAudio() {
  if (audioCtx) return;
  audioCtx = new (window.AudioContext || window.webkitAudioContext)();
  musicGain = audioCtx.createGain();
  musicGain.gain.value = 0.18;
  musicGain.connect(audioCtx.destination);
}

function startLofi() {
  if (musicStarted) return;
  musicStarted = true; musicPlaying = true;
  if (!audioCtx) initAudio();
  const chords = [[220,261.6,329.6],[174.6,220,261.6],[130.8,164.8,196],[196,246.9,293.7]];
  let ci = 0;
  function chord() {
    if (!audioCtx || !musicPlaying) return;
    chords[ci++ % 4].forEach(freq => {
      const o=audioCtx.createOscillator(), g=audioCtx.createGain(), f=audioCtx.createBiquadFilter();
      f.type='lowpass'; f.frequency.value=900;
      o.connect(f); f.connect(g); g.connect(musicGain);
      o.type='sine'; o.frequency.value=freq;
      g.gain.setValueAtTime(0,audioCtx.currentTime);
      g.gain.linearRampToValueAtTime(0.3,audioCtx.currentTime+0.3);
      g.gain.linearRampToValueAtTime(0,audioCtx.currentTime+3.6);
      o.start(audioCtx.currentTime); o.stop(audioCtx.currentTime+4);
    });
    const b=audioCtx.createOscillator(), bg=audioCtx.createGain();
    b.connect(bg); bg.connect(musicGain);
    b.type='sine'; b.frequency.value=chords[(ci-1)%4][0]/2;
    bg.gain.setValueAtTime(0,audioCtx.currentTime);
    bg.gain.linearRampToValueAtTime(0.38,audioCtx.currentTime+0.1);
    bg.gain.linearRampToValueAtTime(0,audioCtx.currentTime+2);
    b.start(audioCtx.currentTime); b.stop(audioCtx.currentTime+2.2);
  }
  function hihat() {
    if (!audioCtx||!musicPlaying) return;
    const sz=Math.floor(audioCtx.sampleRate*0.05);
    const buf=audioCtx.createBuffer(1,sz,audioCtx.sampleRate);
    const d=buf.getChannelData(0); for(let i=0;i<sz;i++) d[i]=Math.random()*2-1;
    const s=audioCtx.createBufferSource(), g=audioCtx.createGain(), h=audioCtx.createBiquadFilter();
    h.type='highpass'; h.frequency.value=8000;
    s.buffer=buf; s.connect(h); h.connect(g); g.connect(musicGain);
    g.gain.setValueAtTime(0.07,audioCtx.currentTime);
    g.gain.exponentialRampToValueAtTime(0.001,audioCtx.currentTime+0.05);
    s.start(audioCtx.currentTime);
  }
  function kick() {
    if (!audioCtx||!musicPlaying) return;
    const o=audioCtx.createOscillator(), g=audioCtx.createGain();
    o.connect(g); g.connect(musicGain); o.type='sine';
    o.frequency.setValueAtTime(150,audioCtx.currentTime);
    o.frequency.exponentialRampToValueAtTime(40,audioCtx.currentTime+0.15);
    g.gain.setValueAtTime(0.55,audioCtx.currentTime);
    g.gain.exponentialRampToValueAtTime(0.001,audioCtx.currentTime+0.2);
    o.start(audioCtx.currentTime); o.stop(audioCtx.currentTime+0.25);
  }
  let beat=0; const bl=60/75;
  function tick() {
    if (!musicPlaying) return;
    if (beat%8===0) chord();
    if (beat%4===0||beat%4===2) kick();
    if (beat%2===0) hihat();
    beat++; setTimeout(tick, bl*1000);
  }
  tick();
}

document.addEventListener('visibilitychange', () => {
  if (!audioCtx) return;
  if (document.hidden) { musicPlaying=false; audioCtx.suspend(); }
  else { musicPlaying=true; audioCtx.resume(); }
});

function playClick() {
  try {
    if (!audioCtx) return;
    const o=audioCtx.createOscillator(), g=audioCtx.createGain();
    o.connect(g); g.connect(audioCtx.destination); o.type='sine';
    o.frequency.setValueAtTime(900,audioCtx.currentTime);
    o.frequency.exponentialRampToValueAtTime(500,audioCtx.currentTime+0.07);
    g.gain.setValueAtTime(0.14,audioCtx.currentTime);
    g.gain.exponentialRampToValueAtTime(0.001,audioCtx.currentTime+0.1);
    o.start(audioCtx.currentTime); o.stop(audioCtx.currentTime+0.1);
  } catch(e) {}
}
function playSuccess() {
  try {
    if (!audioCtx) return;
    [520,660,800].forEach((freq,i) => {
      const o=audioCtx.createOscillator(), g=audioCtx.createGain();
      o.connect(g); g.connect(audioCtx.destination);
      o.type='sine'; o.frequency.value=freq;
      g.gain.setValueAtTime(0.12,audioCtx.currentTime+i*0.1);
      g.gain.exponentialRampToValueAtTime(0.001,audioCtx.currentTime+i*0.1+0.15);
      o.start(audioCtx.currentTime+i*0.1); o.stop(audioCtx.currentTime+i*0.1+0.2);
    });
  } catch(e) {}
}
function playError() {
  try {
    if (!audioCtx) return;
    const o=audioCtx.createOscillator(), g=audioCtx.createGain();
    o.connect(g); g.connect(audioCtx.destination);
    o.type='sawtooth'; o.frequency.value=180;
    g.gain.setValueAtTime(0.08,audioCtx.currentTime);
    g.gain.exponentialRampToValueAtTime(0.001,audioCtx.currentTime+0.2);
    o.start(audioCtx.currentTime); o.stop(audioCtx.currentTime+0.2);
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

function formatNum(n) {
  n = Math.floor(n);
  if (n >= 1000000) return (n/1000000).toFixed(1)+'M';
  if (n >= 1000)    return (n/1000).toFixed(1)+'K';
  return n.toString();
}

// ============================================
// CONFETTI
// ============================================
function launchConfetti() {
  const c = document.getElementById('confetti-container');
  if (!c) return;
  const colors = ['#a78bfa','#60a5fa','#f9a8d4','#86efac','#fde68a','#c084fc'];
  for (let i = 0; i < 55; i++) {
    const p = document.createElement('div');
    p.classList.add('confetti-piece');
    p.style.left = Math.random()*100+'vw';
    p.style.background = colors[Math.floor(Math.random()*colors.length)];
    p.style.animationDuration = (Math.random()*2+1.5)+'s';
    p.style.animationDelay = Math.random()*0.4+'s';
    p.style.width  = (Math.random()*8+5)+'px';
    p.style.height = (Math.random()*8+5)+'px';
    p.style.borderRadius = Math.random()>0.5?'50%':'2px';
    c.appendChild(p);
    setTimeout(() => p.remove(), 3500);
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
  launchConfetti(); playSuccess();
  clearTimeout(achTimer);
  achTimer = setTimeout(() => popup.classList.add('hidden'), 3500);
}

// ============================================
// LOADING SCREEN — max 5 seconds
// ============================================
const loadingMessages = [
  'Initializing Systems...','Loading Click Engine...',
  'Calibrating Coins...','Preparing Mini-Games...',
  'Summoning Bots...','Almost Ready...'
];

function runLoadingScreen(callback) {
  const bar   = document.getElementById('loading-bar');
  const txtEl = document.getElementById('loading-text');
  let pct=0, msgIdx=0, done=false;

  const hardCap = setTimeout(() => {
    if (done) return; done=true;
    clearInterval(barInt); clearInterval(msgInt);
    if (bar) bar.style.width='100%';
    if (txtEl) txtEl.textContent='Ready!';
    setTimeout(callback, 150);
  }, 5000);

  const msgInt = setInterval(() => {
    if (txtEl && msgIdx < loadingMessages.length) txtEl.textContent = loadingMessages[msgIdx++];
  }, 700);

  const barInt = setInterval(() => {
    pct += Math.random()*32+18;
    if (pct >= 100) {
      pct=100;
      if (bar) bar.style.width='100%';
      clearInterval(barInt); clearInterval(msgInt); clearTimeout(hardCap);
      if (done) return; done=true;
      if (txtEl) txtEl.textContent='Ready!';
      setTimeout(callback, 150);
    } else {
      if (bar) bar.style.width=pct+'%';
    }
  }, 180);
}

// ============================================
// SETUP SCREEN
// ============================================
function showSetup() {
  document.getElementById('loading-screen').classList.add('hidden');
  document.getElementById('setup-screen').classList.remove('hidden');
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
    if (!name || name.length < 2) { showToast('Enter a username (min 2 chars)!'); return; }
    state.username = name;
    if (!state.takenUsernames.includes(name)) state.takenUsernames.push(name);
    playSuccess(); saveState(); showGame();
    setTimeout(startLofi, 400);
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
  const g = id => document.getElementById(id);
  g('click-display').textContent = formatNum(state.clicks);
  g('coin-display').textContent  = formatNum(state.coins);

  // Exponential level progress
  const needed   = levelThreshold(state.level);
  const prevDone = state.level > 1 ? levelThreshold(state.level - 1) : 0;
  const progress = Math.min(((state.totalClicks - prevDone) / (needed - prevDone)) * 100, 100);
  g('level-label').textContent    = 'Level ' + state.level;
  g('level-next').textContent     = formatNum(needed) + ' total clicks';
  g('level-bar-fill').style.width = Math.max(0, progress) + '%';

  // Profile
  g('profile-avatar').textContent    = state.avatar;
  g('profile-name').textContent      = state.username;
  g('profile-level-tag').textContent = 'Level ' + state.level;
  g('stat-clicks').textContent       = formatNum(state.totalClicks);
  g('stat-coins').textContent        = formatNum(state.totalCoins);
  g('stat-races').textContent        = state.racesWon;
  g('stat-level').textContent        = state.level;

  // Shop
  g('multi-level').textContent = state.upgrades.multiplier;
  g('auto-level').textContent  = state.upgrades.autoclicker;
  g('mini-level').textContent  = state.upgrades.minigame;
  g('coin-level').textContent  = state.upgrades.coinboost;
  const asl = g('auto-speed-label');
  if (asl) asl.textContent = state.upgrades.autoclicker === 0 ? 'Not active' : '1 click / '+Math.max(1,11-state.upgrades.autoclicker)+'s';

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
        const t = document.getElementById('panel-' + panel);
        if (t) t.classList.remove('hidden');
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
    checkLevel(); updateUI(); playClick();
    animatePing(btn); showClickPop(e, '+'+mult);
    updateQuestProgress(); checkAchievements(); saveState();
  });
}

function animatePing(btn) {
  btn.classList.remove('ping'); void btn.offsetWidth;
  btn.classList.add('ping');
  setTimeout(() => btn.classList.remove('ping'), 400);
}

function showClickPop(e, text) {
  const pop = document.getElementById('click-pop');
  if (!pop) return;
  pop.textContent = text;
  pop.style.left = (e.clientX-15)+'px';
  pop.style.top  = (e.clientY-30)+'px';
  pop.classList.remove('hidden');
  pop.style.animation='none'; void pop.offsetWidth; pop.style.animation='';
  setTimeout(() => pop.classList.add('hidden'), 650);
}

// ============================================
// EXCHANGE
// ============================================
function setupExchange() {
  document.getElementById('exchange-btn').addEventListener('click', () => {
    initAudio();
    if (state.clicks < 10) { showToast('Need at least 10 clicks! 👆'); playError(); return; }
    const sets=Math.floor(state.clicks/10);
    const boost=1+(state.upgrades.coinboost*0.25);
    const earned=Math.floor(sets*boost);
    state.clicks     -= sets*10;
    state.coins      += earned;
    state.totalCoins += earned;
    playSuccess(); showToast('💰 +'+earned+' coins earned!');
    updateUI(); updateQuestProgress(); checkAchievements(); saveState();
  });
}

// ============================================
// LEVEL SYSTEM — EXPONENTIAL
// ============================================
function checkLevel() {
  const needed = levelThreshold(state.level);
  if (state.totalClicks >= needed) {
    state.level++;
    showToast('🎉 Level Up! Now Level '+state.level+'!');
    playSuccess(); checkAchievements();
  }
}

// ============================================
// IDLE CLICKER
// ============================================
function startIdleClicker() {
  setInterval(() => {
    state.clicks++; state.totalClicks++;
    checkLevel(); updateUI(); saveState();
  }, 30000);
}

// ============================================
// AUTO CLICKER
// ============================================
let autoClickerInterval = null;
function startAutoClicker() {
  if (autoClickerInterval) clearInterval(autoClickerInterval);
  const lvl = state.upgrades.autoclicker;
  if (lvl === 0) return;
  const sec = Math.max(1, 11 - lvl);
  autoClickerInterval = setInterval(() => {
    if (!raceActive) {
      state.clicks++; state.totalClicks++;
      checkLevel(); updateUI(); saveState();
    }
  }, sec * 1000);
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
      const cost = upgrad
