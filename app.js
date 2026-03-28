/* ============================================
   ULTRA CLICKER SIMULATOR - app.js
   Full Game Logic
   ============================================ */

// ============================================
// GAME STATE
// ============================================
let state = {
  clicks: 0,
  coins: 0,
  totalClicks: 0,
  totalCoins: 0,
  level: 1,
  racesWon: 0,
  username: '',
  avatar: '🐱',
  upgrades: {
    multiplier: 0,
    autoclicker: 0,
    minigame: 0,
    coinboost: 0,
  },
  daily: {
    lastClaim: null,
    streak: 0,
  },
  quests: {
    q1: { done: false, claimed: false },
    q2: { done: false, claimed: false },
    q3: { done: false, claimed: false },
    lastReset: null,
  },
  achievements: {
    clicks1000: false,
    coins100: false,
    firstrace: false,
    allquests: false,
    level10: false,
    minigame: false,
  },
  minigamesCompleted: 0,
};

// ============================================
// SAVE / LOAD
// ============================================
function saveState() {
  localStorage.setItem('ultraclicker', JSON.stringify(state));
}

function loadState() {
  const saved = localStorage.getItem('ultraclicker');
  if (saved) {
    try {
      const parsed = JSON.parse(saved);
      state = Object.assign(state, parsed);
      // merge nested objects safely
      state.upgrades     = Object.assign({ multiplier:0, autoclicker:0, minigame:0, coinboost:0 }, parsed.upgrades);
      state.daily        = Object.assign({ lastClaim: null, streak: 0 }, parsed.daily);
      state.quests       = Object.assign({ q1:{done:false,claimed:false}, q2:{done:false,claimed:false}, q3:{done:false,claimed:false}, lastReset:null }, parsed.quests);
      state.achievements = Object.assign({ clicks1000:false, coins100:false, firstrace:false, allquests:false, level10:false, minigame:false }, parsed.achievements);
      return true;
    } catch(e) { return false; }
  }
  return false;
}

// ============================================
// SOUND (Web Audio API)
// ============================================
const AudioCtx = window.AudioContext || window.webkitAudioContext;
let audioCtx = null;

function initAudio() {
  if (!audioCtx) audioCtx = new AudioCtx();
}

function playClick() {
  try {
    initAudio();
    const osc = audioCtx.createOscillator();
    const gain = audioCtx.createGain();
    osc.connect(gain);
    gain.connect(audioCtx.destination);
    osc.type = 'sine';
    osc.frequency.setValueAtTime(820, audioCtx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(400, audioCtx.currentTime + 0.08);
    gain.gain.setValueAtTime(0.18, audioCtx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 0.12);
    osc.start(audioCtx.currentTime);
    osc.stop(audioCtx.currentTime + 0.12);
  } catch(e) {}
}

function playSuccess() {
  try {
    initAudio();
    [520, 660, 800].forEach((freq, i) => {
      const osc = audioCtx.createOscillator();
      const gain = audioCtx.createGain();
      osc.connect(gain);
      gain.connect(audioCtx.destination);
      osc.type = 'sine';
      osc.frequency.value = freq;
      gain.gain.setValueAtTime(0.13, audioCtx.currentTime + i * 0.1);
      gain.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + i * 0.1 + 0.15);
      osc.start(audioCtx.currentTime + i * 0.1);
      osc.stop(audioCtx.currentTime + i * 0.1 + 0.15);
    });
  } catch(e) {}
}

function playError() {
  try {
    initAudio();
    const osc = audioCtx.createOscillator();
    const gain = audioCtx.createGain();
    osc.connect(gain);
    gain.connect(audioCtx.destination);
    osc.type = 'sawtooth';
    osc.frequency.value = 200;
    gain.gain.setValueAtTime(0.1, audioCtx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 0.2);
    osc.start(audioCtx.currentTime);
    osc.stop(audioCtx.currentTime + 0.2);
  } catch(e) {}
}

// ============================================
// TOAST
// ============================================
let toastTimer = null;
function showToast(msg) {
  const t = document.getElementById('toast');
  t.textContent = msg;
  t.classList.remove('hidden');
  if (toastTimer) clearTimeout(toastTimer);
  toastTimer = setTimeout(() => t.classList.add('hidden'), 2200);
}

// ============================================
// LOADING SCREEN
// ============================================
function runLoadingScreen(callback) {
  const bar = document.getElementById('loading-bar');
  let pct = 0;
  const interval = setInterval(() => {
    pct += Math.random() * 18 + 5;
    if (pct >= 100) {
      pct = 100;
      bar.style.width = '100%';
      clearInterval(interval);
      setTimeout(callback, 500);
    } else {
      bar.style.width = pct + '%';
    }
  }, 300);
}

// ============================================
// SETUP SCREEN
// ============================================
function showSetup() {
  document.getElementById('loading-screen').classList.add('hidden');
  document.getElementById('setup-screen').classList.remove('hidden');

  // Avatar selection
  document.querySelectorAll('.avatar-option').forEach(el => {
    el.addEventListener('click', () => {
      document.querySelectorAll('.avatar-option').forEach(a => a.classList.remove('selected'));
      el.classList.add('selected');
      state.avatar = el.dataset.avatar;
      playClick();
    });
  });

  document.getElementById('start-btn').addEventListener('click', () => {
    const name = document.getElementById('username-input').value.trim();
    if (!name) { showToast('Please enter a username! 😊'); return; }
    state.username = name;
    playSuccess();
    saveState();
    showGame();
  });
}

// ============================================
// SHOW GAME
// ============================================
function showGame() {
  document.getElementById('loading-screen').classList.add('hidden');
  document.getElementById('setup-screen').classList.add('hidden');
  document.getElementById('game-screen').classList.remove('hidden');
  updateUI();
  startIdleClicker();
  resetDailyQuestsIfNeeded();
  setupNav();
  setupClickButton();
  setupExchange();
  setupShop();
  setupMinigames();
  setupQuests();
  setupRace();
  setupLeaderboard();
}

// ============================================
// UI UPDATE
// ============================================
function updateUI() {
  document.getElementById('click-display').textContent = formatNum(state.clicks);
  document.getElementById('coin-display').textContent  = formatNum(state.coins);

  // Level
  const lvlThreshold = state.level * 100;
  const progress = Math.min((state.totalClicks % lvlThreshold) / lvlThreshold * 100, 100);
  document.getElementById('level-label').textContent   = 'Level ' + state.level;
  document.getElementById('level-next').textContent    = 'Next: ' + formatNum(lvlThreshold) + ' clicks';
  document.getElementById('level-bar-fill').style.width = progress + '%';

  // Profile
  document.getElementById('profile-avatar').textContent    = state.avatar;
  document.getElementById('profile-name').textContent      = state.username;
  document.getElementById('profile-level-tag').textContent = 'Level ' + state.level;
  document.getElementById('stat-clicks').textContent       = formatNum(state.totalClicks);
  document.getElementById('stat-coins').textContent        = formatNum(state.totalCoins);
  document.getElementById('stat-races').textContent        = state.racesWon;
  document.getElementById('stat-level').textContent        = state.level;

  // Upgrade levels
  document.getElementById('multi-level').textContent = state.upgrades.multiplier;
  document.getElementById('auto-level').textContent  = state.upgrades.autoclicker;
  document.getElementById('mini-level').textContent  = state.upgrades.minigame;
  document.getElementById('coin-level').textContent  = state.upgrades.coinboost;

  // Quests
  updateQuestUI();

  // Achievements
  updateAchievements();
}

function formatNum(n) {
  if (n >= 1000000) return (n / 1000000).toFixed(1) + 'M';
  if (n >= 1000)    return (n / 1000).toFixed(1) + 'K';
  return Math.floor(n).toString();
}

// ============================================
// NAV
// ============================================
function setupNav() {
  document.querySelectorAll('.nav-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      playClick();
      const panel = btn.dataset.panel;
      document.querySelectorAll('.nav-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');

      // Hide all panels
      document.querySelectorAll('.panel').forEach(p => p.classList.add('hidden'));

      if (panel === 'main') return; // just show main click area

      const target = document.getElementById('panel-' + panel);
      if (target) target.classList.remove('hidden');
    });
  });
}

// ============================================
// CLICK BUTTON
// ============================================
function setupClickButton() {
  const btn = document.getElementById('click-btn');
  btn.addEventListener('click', (e) => {
    const multiplier = 1 + state.upgrades.multiplier;
    state.clicks += multiplier;
    state.totalClicks += multiplier;
    checkLevel();
    updateUI();
    playClick();
    animatePing(btn);
    showClickPop(e, '+' + multiplier);
    updateQuestProgress();
    checkAchievements();
    saveState();
  });
}

function animatePing(btn) {
  btn.classList.remove('ping');
  void btn.offsetWidth; // reflow
  btn.classList.add('ping');
  setTimeout(() => btn.classList.remove('ping'), 400);
}

function showClickPop(e, text) {
  const pop = document.getElementById('click-pop');
  pop.textContent = text;
  pop.style.left = (e.clientX - 15) + 'px';
  pop.style.top  = (e.clientY - 20) + 'px';
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
    if (state.clicks < 10) {
      showToast('Need at least 10 clicks to exchange! 👆');
      playError();
      return;
    }
    const sets = Math.floor(state.clicks / 10);
    const boost = 1 + (state.upgrades.coinboost * 0.25);
    const earned = Math.floor(sets * boost);
    state.clicks -= sets * 10;
    state.coins  += earned;
    state.totalCoins += earned;
    playSuccess();
    showToast('💰 +'  + earned + ' coins earned!');
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
  const threshold = state.level * 100;
  if (state.totalClicks >= threshold * state.level) {
    state.level++;
    showToast('🎉 Level Up! You are now Level ' + state.level + '!');
    playSuccess();
    checkAchievements();
  }
}

// ============================================
// IDLE CLICKER
// ============================================
function startIdleClicker() {
  setInterval(() => {
    // Base idle: 1 click every 30s
    state.clicks += 1;
    state.totalClicks += 1;
    // Auto clicker upgrade bonus
    if (state.upgrades.autoclicker > 0) {
      const bonus = state.upgrades.autoclicker * 2;
      state.clicks += bonus;
      state.totalClicks += bonus;
    }
    checkLevel();
    updateUI();
    saveState();
  }, 30000);
}

// ============================================
// SHOP
// ============================================
const upgradeCosts = {
  multiplier:  50,
  autoclicker: 100,
  minigame:    75,
  coinboost:   80,
};

function setupShop() {
  document.querySelectorAll('.btn-upgrade').forEach(btn => {
    btn.addEventListener('click', () => {
      playClick();
      const type = btn.dataset.upgrade;
      const level = state.upgrades[type];
      const cost = upgradeCosts[type] * (level + 1);
      if (state.coins < cost) {
        showToast('Not enough coins! Need 🪙 ' + cost);
        playError();
        return;
      }
      state.coins -= cost;
      state.upgrades[type]++;
      playSuccess();
      showToast('✅ ' + type + ' upgraded to level ' + state.upgrades[type] + '!');
      updateUI();
      updateShopCosts();
      saveState();
    });
  });
  updateShopCosts();
}

function updateShopCosts() {
  document.querySelectorAll('.btn-upgrade').forEach(btn => {
    const type = btn.dataset.upgrade;
    const level = state.upgrades[type];
    const cost = upgradeCosts[type] * (level + 1);
    btn.querySelector('.upgrade-cost').textContent = '🪙 ' + cost;
  });
}

// ============================================
// DAILY REWARDS & QUESTS
// ============================================
function resetDailyQuestsIfNeeded() {
  const today = new Date().toDateString();
  if (state.quests.lastReset !== today) {
    state.quests = {
      q1: { done: false, claimed: false },
      q2: { done: false, claimed: false },
      q3: { done: false, claimed: false },
      lastReset: today,
    };
    saveState();
  }
}

function setupQuests() {
  document.getElementById('claim-daily-btn').addEventListener('click', () => {
    playClick();
    const today = new Date().toDateString();
    if (state.daily.lastClaim === today) {
      showToast('Already claimed today! Come back tomorrow 🌙');
      playError();
      return;
    }
    const yesterday = new Date(Date.now() - 86400000).toDateString();
    if (state.daily.lastClaim === yesterday) {
      state.daily.streak++;
    } else {
      state.daily.streak = 1;
    }
    state.daily.lastClaim = today;
    const reward = 20 + state.daily.streak * 5;
    state.coins += reward;
    state.totalCoins += reward;
    playSuccess();
    showToast('🎁 Daily reward claimed! +' + reward + ' coins! Streak: ' + state.daily.streak + ' 🔥');
    updateUI();
    document.getElementById('streak-count').textContent = state.daily.streak;
    saveState();
  });

  document.getElementById('streak-count').textContent = state.daily.streak;

  document.getElementById('q1-claim').addEventListener('click', () => claimQuest('q1', 50, 'clicks'));
  document.getElementById('q2-claim').addEventListener('click', () => claimQuest('q2', 20, 'coins'));
  document.getElementById('q3-claim').addEventListener('click', () => claimQuest('q3', 15, 'coins'));
}

function claimQuest(id, reward, type) {
  if (state.quests[id].claimed) return;
  if (!state.quests[id].done) return;
  state.quests[id].claimed = true;
  if (type === 'clicks') { state.clicks += reward; state.totalClicks += reward; }
  if (type === 'coins')  { state.coins  += reward; state.totalCoins  += reward; }
  playSuccess();
  showToast('✅ Quest complete! +' + reward + ' ' + type + '!');
  updateUI();
  checkAllQuests();
  saveState();
}

function updateQuestProgress() {
  // Q1: tap 500 times
  if (!state.quests.q1.claimed) {
    const p = Math.min(state.totalClicks, 500);
    document.getElementById('q1-progress').textContent = formatNum(p) + ' / 500';
    if (p >= 500 && !state.quests.q1.done) {
      state.quests.q1.done = true;
      document.getElementById('q1-claim').disabled = false;
    }
  }
  // Q2: earn 50 coins
  if (!state.quests.q2.claimed) {
    const p = Math.min(state.totalCoins, 50);
    document.getElementById('q2-progress').textContent = p + ' / 50';
    if (p >= 50 && !state.quests.q2.done) {
      state.quests.q2.done = true;
      document.getElementById('q2-claim').disabled = false;
    }
  }
  // Q3: complete a mini-game (updated from mini-game logic)
  if (!state.quests.q3.claimed) {
    const p = Math.min(state.minigamesCompleted, 1);
    document.getElementById('q3-progress').textContent = p + ' / 1';
    if (p >= 1 && !state.quests.q3.done) {
      state.quests.q3.done = true;
      document.getElementById('q3-claim').disabled = false;
    }
  }
}

function updateQuestUI() {
  updateQuestProgress();
  if (state.quests.q1.claimed) document.getElementById('q1-claim').textContent = '✓ Done';
  if (state.quests.q2.claimed) document.getElementById('q2-claim').textContent = '✓ Done';
  if (state.quests.q3.claimed) document.getElementById('q3-claim').textContent = '✓ Done';
}

function checkAllQuests() {
  if (state.quests.q1.claimed && state.quests.q2.claimed && state.quests.q3.claimed) {
    if (!state.achievements.allquests) {
      state.achievements.allquests = true;
      showToast('🏅 Achievement: Quest Master!');
      playSuccess();
      checkAchievements();
      saveState();
    }
  }
}

// ============================================
// ACHIEVEMENTS
// ============================================
function checkAchievements() {
  if (state.totalClicks >= 1000 && !state.achievements.clicks1000) {
    state.achievements.clicks1000 = true;
    showToast('🏅 Achievement: 1,000 Clicks!');
  }
  if (state.totalCoins >= 100 && !state.achievements.coins100) {
    state.achievements.coins100 = true;
    showToast('🏅 Achievement: 100 Coins!');
  }
  if (state.level >= 10 && !state.achievements.level10) {
    state.achievements.level10 = true;
    showToast('🏅 Achievement: Level 10!');
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
    if (unlocked) {
      el.classList.remove('locked');
      el.classList.add('unlocked');
    }
  }
}

// ============================================
// MINI-GAMES
// ============================================
function setupMinigames() {
  // Open modals
  document.querySelectorAll('.btn-play').forEach(btn => {
    btn.addEventListener('click', () => {
      playClick();
      const game = btn.dataset.game;
      document.getElementById('modal-' + game).classList.remove('hidden');
      if (game === 'frenzy') resetFrenzy();
      if (game === 'rain')   resetRain();
      if (game === 'memory') resetMemory();
    });
  });

  // Close buttons
  document.getElementById('frenzy-close').addEventListener('click', () => { closeFrenzy(); playClick(); });
  document.getElementById('rain-close').addEventListener('click',   () => { closeRain();   playClick(); });
  document.getElementById('memory-close').addEventListener('click', () => { closeMemory(); playClick(); });
}

function onMinigameComplete() {
  state.minigamesCompleted++;
  if (!state.achievements.minigame) {
    state.achievements.minigame = true;
    showToast('🏅 Achievement: Game Winner!');
  }
  updateQuestProgress();
  checkAchievements();
  saveState();
}

/* ---- CLICK FRENZY ---- */
let frenzyActive = false, frenzyScore = 0, frenzyTime = 10, frenzyInterval = null;

function resetFrenzy() {
  frenzyActive = false;
  frenzyScore = 0;
  frenzyTime = 10;
  document.getElementById('frenzy-timer').textContent = '10';
  document.getElementById('frenzy-score').textContent = '0';
  document.getElementById('frenzy-start-btn').classList.remove('hidden');
  document.getElementById('frenzy-start-btn').textContent = 'Start!';

  const startBtn = document.getElementById('frenzy-start-btn');
  const newBtn = startBtn.cloneNode(true);
  startBtn.parentNode.replaceChild(newBtn, startBtn);

  newBtn.addEventListener('click', () => {
    if (frenzyActive) { frenzyScore++; document.getElementById('frenzy-score').textContent = frenzyScore; playClick(); return; }
    frenzyActive = true;
    newBtn.textContent = 'TAP!';
    frenzyInterval = setInterval(() => {
      frenzyTime--;
      document.getElementById('frenzy-timer').textContent = frenzyTime;
      i
