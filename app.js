/* ============================================
   ULTRA CLICKER SIMULATOR - app.js
   Bug-fixed, optimized, with lofi music
   ============================================ */

// ============================================
// GAME STATE
// ============================================
let state = {
  clicks: 0, coins: 0, totalClicks: 0, totalCoins: 0,
  level: 1, racesWon: 0, username: '', avatar: '🐱',
  upgrades: { multiplier: 0, autoclicker: 0, minigame: 0, coinboost: 0 },
  daily: { lastClaim: null, streak: 0 },
  quests: { q1:{done:false,claimed:false}, q2:{done:false,claimed:false}, q3:{done:false,claimed:false}, lastReset:null },
  achievements: { clicks1000:false, coins100:false, firstrace:false, allquests:false, level10:false, minigame:false },
  minigamesCompleted: 0,
};

function saveState() {
  try { localStorage.setItem('ultraclicker_v2', JSON.stringify(state)); } catch(e) {}
}

function loadState() {
  try {
    const saved = localStorage.getItem('ultraclicker_v2');
    if (!saved) return false;
    const p = JSON.parse(saved);
    state.clicks             = p.clicks || 0;
    state.coins              = p.coins || 0;
    state.totalClicks        = p.totalClicks || 0;
    state.totalCoins         = p.totalCoins || 0;
    state.level              = p.level || 1;
    state.racesWon           = p.racesWon || 0;
    state.username           = p.username || '';
    state.avatar             = p.avatar || '🐱';
    state.minigamesCompleted = p.minigamesCompleted || 0;
    state.upgrades     = Object.assign({ multiplier:0, autoclicker:0, minigame:0, coinboost:0 }, p.upgrades || {});
    state.daily        = Object.assign({ lastClaim:null, streak:0 }, p.daily || {});
    state.quests       = Object.assign({ q1:{done:false,claimed:false}, q2:{done:false,claimed:false}, q3:{done:false,claimed:false}, lastReset:null }, p.quests || {});
    state.achievements = Object.assign({ clicks1000:false, coins100:false, firstrace:false, allquests:false, level10:false, minigame:false }, p.achievements || {});
    return !!state.username;
  } catch(e) { return false; }
}

// ============================================
// AUDIO - Click sounds + Lofi Music
// ============================================
let audioCtx = null;
let musicGain = null;
let musicPlaying = false;

function initAudio() {
  if (audioCtx) return;
  audioCtx = new (window.AudioContext || window.webkitAudioContext)();
  musicGain = audioCtx.createGain();
  musicGain.gain.value = 0.12;
  musicGain.connect(audioCtx.destination);
  startLofi();
}

function startLofi() {
  if (musicPlaying) return;
  musicPlaying = true;

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
      filter.type = 'lowpass';
      filter.frequency.value = 800;
      osc.connect(filter); filter.connect(gain); gain.connect(musicGain);
      osc.type = 'sine';
      osc.frequency.value = freq;
      gain.gain.setValueAtTime(0, audioCtx.currentTime);
      gain.gain.linearRampToValueAtTime(0.28, audioCtx.currentTime + 0.3);
      gain.gain.linearRampToValueAtTime(0, audioCtx.currentTime + 3.5);
      osc.start(audioCtx.currentTime);
      osc.stop(audioCtx.currentTime + 3.8);
    });
    const bass = audioCtx.createOscillator();
    const bassGain = audioCtx.createGain();
    bass.connect(bassGain); bassGain.connect(musicGain);
    bass.type = 'sine';
    bass.frequency.value = chord[0] / 2;
    bassGain.gain.setValueAtTime(0, audioCtx.currentTime);
    bassGain.gain.linearRampToValueAtTime(0.35, audioCtx.currentTime + 0.1);
    bassGain.gain.linearRampToValueAtTime(0, audioCtx.currentTime + 2);
    bass.start(audioCtx.currentTime);
    bass.stop(audioCtx.currentTime + 2.2);
  }

  function playHihat() {
    if (!audioCtx || !musicPlaying) return;
    const bufSize = Math.floor(audioCtx.sampleRate * 0.05);
    const buf = audioCtx.createBuffer(1, bufSize, audioCtx.sampleRate);
    const data = buf.getChannelData(0);
    for (let i = 0; i < bufSize; i++) data[i] = (Math.random() * 2 - 1);
    const src = audioCtx.createBufferSource();
    const gain = audioCtx.createGain();
    const hpf = audioCtx.createBiquadFilter();
    hpf.type = 'highpass'; hpf.frequency.value = 8000;
    src.buffer = buf; src.connect(hpf); hpf.connect(gain); gain.connect(musicGain);
    gain.gain.setValueAtTime(0.06, audioCtx.currentTime);
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
    gain.gain.setValueAtTime(0.5, audioCtx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 0.2);
    osc.start(audioCtx.currentTime);
    osc.stop(audioCtx.currentTime + 0.25);
  }

  let beat = 0;
  const beatLen = 60 / 75; // 75 BPM

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

function playClick() {
  try {
    if (!audioCtx) return;
    const osc = audioCtx.createOscillator();
    const gain = audioCtx.createGain();
    osc.connect(gain); gain.connect(audioCtx.destination);
    osc.type = 'sine';
    osc.frequency.setValueAtTime(900, audioCtx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(500, audioCtx.currentTime + 0.07);
    gain.gain.setValueAtTime(0.15, audioCtx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 0.1);
    osc.start(audioCtx.currentTime);
    osc.stop(audioCtx.currentTime + 0.1);
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
// LOADING SCREEN - fast (2-3 seconds)
// ============================================
function runLoadingScreen(callback) {
  const bar = document.getElementById('loading-bar');
  let pct = 0;
  const interval = setInterval(() => {
    pct += Math.random() * 30 + 15;
    if (pct >= 100) {
      pct = 100;
      bar.style.width = '100%';
      clearInterval(interval);
      setTimeout(callback, 300);
    } else {
      bar.style.width = pct + '%';
    }
  }, 200);
}

// ============================================
// SETUP SCREEN
// ============================================
function showSetup() {
  document.getElementById('loading-screen').classList.add('hidden');
  document.getElementById('setup-screen').classList.remove('hidden');

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
    if (!name || name.length < 2) { showToast('Enter a username (min 2 chars)! 😊'); return; }
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
  startIdleClicker();
}

// ============================================
// UI UPDATE
// ============================================
function updateUI() {
  document.getElementById('click-display').textContent = formatNum(state.clicks);
  document.getElementById('coin-display').textContent  = formatNum(state.coins);

  const needed = state.level * 100;
  const prog   = Math.min((state.totalClicks / (state.level * needed)) * 100, 100);
  document.getElementById('level-label').textContent    = 'Level ' + state.level;
  document.getElementById('level-next').textContent     = 'Next: ' + formatNum(needed) + ' clicks';
  document.getElementById('level-bar-fill').style.width = prog + '%';

  document.getElementById('profile-avatar').textContent    = state.avatar;
  document.getElementById('profile-name').textContent      = state.username;
  document.getElementById('profile-level-tag').textContent = 'Level ' + state.level;
  document.getElementById('stat-clicks').textContent       = formatNum(state.totalClicks);
  document.getElementById('stat-coins').textContent        = formatNum(state.totalCoins);
  document.getElementById('stat-races').textContent        = state.racesWon;
  document.getElementById('stat-level').textContent        = state.level;

  document.getElementById('multi-level').textContent = state.upgrades.multiplier;
  document.getElementById('auto-level').textContent  = state.upgrades.autoclicker;
  document.getElementById('mini-level').textContent  = state.upgrades.minigame;
  document.getElementById('coin-level').textContent  = state.upgrades.coinboost;

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
      initAudio();
      playClick();
      const panel = btn.dataset.panel;
      document.querySelectorAll('.nav-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      document.querySelectorAll('.panel').forEach(p => p.classList.add('hidden'));
      if (panel !== 'main') {
        const target = document.getElementById('panel-' + panel);
        if (target) target.classList.remove('hidden');
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
    const multiplier = Math.max(1, 1 + state.upgrades.multiplier);
    state.clicks      += multiplier;
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
  const needed = state.level * 100;
  if (state.totalClicks >= needed * state.level) {
    state.level++;
    showToast('🎉 Level Up! Now Level ' + state.level + '!');
    playSuccess();
    checkAchievements();
  }
}

// ============================================
// IDLE CLICKER
// ============================================
function startIdleClicker() {
  setInterval(() => {
    const bonus = 1 + (state.upgrades.autoclicker * 2);
    state.clicks      += bonus;
    state.totalClicks += bonus;
    checkLevel();
    updateUI();
    saveState();
  }, 30000);
}

// ============================================
// SHOP
// ============================================
const upgradeCosts = { multiplier:50, autoclicker:100, minigame:75, coinboost:80 };

function setupShop() {
  document.querySelectorAll('.btn-upgrade').forEach(btn => {
    btn.addEventListener('click', () => {
      initAudio(); playClick();
      const type  = btn.dataset.upgrade;
      const cost  = upgradeCosts[type] * (state.upgrades[type] + 1);
      if (state.coins < cost) { showToast('Need 🪙 ' + cost + ' coins!'); playError(); return; }
      state.coins -= cost;
      state.upgrades[type]++;
      playSuccess();
      showToast('✅ ' + type + ' upgraded to Level ' + state.upgrades[type] + '!');
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
    state.quests = { q1:{done:false,claimed:false}, q2:{done:false,claimed:false}, q3:{done:false,claimed:false}, lastReset:today };
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
  if (q1) q1.addEventListener('click', () => claimQuest('q1', 50, 'clicks'));
  if (q2) q2.addEventListener('click', () => claimQuest('q2', 20, 'coins'));
  if (q3) q3.addEventListener('click', () => claimQuest('q3', 15, 'coins'));
}

function claimQuest(id, reward, type) {
  initAudio();
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
    if (p >= 500 && !state.quests.q1.done) { state.quests.q1.done = true; const b = document.getElementById('q1-claim'); if(b) b.disabled = false; }
  }
  if (!state.quests.q2.claimed) {
    const p = Math.min(state.totalCoins, 50);
    const el = document.getElementById('q2-progress');
    if (el) el.textContent = p + ' / 50';
    if (p >= 50 && !state.quests.q2.done) { state.quests.q2.done = true; const b = document.getElementById('q2-claim'); if(b) b.disabled = false; }
  }
  if (!state.quests.q3.claimed) {
    const p = Math.min(state.minigamesCompleted, 1);
    const el = document.getElementById('q3-progress');
    if (el) el.textContent = p + ' / 1';
    if (p >= 1 && !state.quests.q3.done) { state.quests.q3.done = true; const b = document.getElementById('q3-claim'); if(b) b.disabled = false; }
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
    showToast('🏅 Achievement: Quest Master!');
    playSuccess(); checkAchievements(); saveState();
  }
}

// ============================================
// ACHIEVEMENTS
// ============================================
function checkAchievements() {
  let changed = false;
  if (state.totalClicks >= 1000 && !state.achievements.clicks1000) { state.achievements.clicks1000 = true; showToast('🏅 1,000 Clicks!'); changed = true; }
  if (state.totalCoins  >= 100  && !state.achievements.coins100)   { state.achievements.coins100   = true; showToast('🏅 100 Coins!');    changed = true; }
  if (state.level       >= 10   && !state.achievements.level10)    { state.achievements.level10    = true; showToast('🏅 Level 10!');     changed = true; }
  updateAchievements();
  if (changed) saveState();
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
  if (!state.achievements.minigame) { state.achievements.minigame = true; showToast('🏅 Achievement: Game Winner!'); }
  updateQuestProgress(); checkAchievements(); saveState();
}

/* ---- CLICK FRENZY ---- */
let frenzyActive = false, frenzyScore = 0, frenzyTime = 10, frenzyInterval = null;

function resetFrenzy() {
  clearInterval(frenzyInterval);
  frenzyActive = false; frenzyScore = 0; frenzyTime = 10;
  document.getElementById('frenzy-timer').textContent = '10';
  document.getElementById('frenzy-score').textContent = '0';
  const old = document.getElementById('frenzy-start-btn');
  const btn = old.cloneNode(true);
  btn.textContent = 'Start!';
  btn.classList.remove('hidden');
  old.parentNode.replaceChild(btn, old);
  btn.addEventListener('click', () => {
    if (!frenzyActive) {
      frenzyActive = true;
      btn.textContent = 'TAP! 👆';
      frenzyInterval = setInterval(() => {
        frenzyTime--;
        document.getElementById('frenzy-timer').textContent = frenzyTime;
        if (frenzyTime <= 0) {
          clearInterval(frenzyInterval);
          frenzyActive = false;
          state.clicks += frenzyScore; state.totalClicks += frenzyScore;
          playSuccess();
          showToast('⚡ Frenzy done! +' + frenzyScore + ' clicks!');
          onMinigameComplete(); updateUI();
          btn.textContent = 'Play Again!';
        }
      }, 1000);
    } else {
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

/* ---- COIN RAIN CATCHER ---- */
let rainActive = false, rainCaught = 0, rainTime = 20, rainInterval = null, rainSpawnInterval = null;

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
      rainTime--;
      document.getElementById('rain-timer').textContent = rainTime;
      if (rainTime <= 0) {
        clearInterval(rainInterval); clearInterval(rainSpawnInterval);
        rainActive = false;
        document.getElementById('rain-arena').innerHTML = '';
        const boost  = 1 + (state.upgrades.minigame * 0.25);
        const reward = Math.max(0, Math.floor(rainCaught * boost));
        state.coins += reward; state.totalCoins += reward;
        playSuccess();
        showToast('🪙 Rain over! +' + reward + ' coins!');
        onMinigameComplete(); updateUI();
        btn.textContent = 'Play Again!'; btn.classList.remove('hidden');
      }
    }, 1000);
    rainSpawnInterval = setInterval(spawnRainItem, 650);
  });
}

function spawnRainItem() {
  const arena = document.getElementById('rain-arena');
  if (!arena || !rainActive) return;
  const isBomb = Math.random() < 0.22;
  const item   = document.createElement('div');
  item.classList.add('rain-item');
  item.textContent    = isBomb ? '💣' : '🪙';
  item.style.left     = (Math.random() * 82) + '%';
  item.style.top      = '-30px';
  item.style.position = 'absolute';
  arena.appendChild(item);
  item.addEventListener('click', (e) => {
    e.stopPropagation();
    if (!rainActive) return;
    if (isBomb) { rainCaught = Math.max(0, rainCaught - 5); showToast('💣 Bomb! -5 coins!'); playError(); }
    else        { rainCaught++; playClick(); }
    document.getElementById('rain-caught').textContent = rainCaught;
    item.remove();
  });
  let top = -30;
  const speed = 3 + Math.random() * 2;
  const fall = setInterval(() => {
    if (!rainActive) { clearInterval(fall); if(item.parentNode) item.remove(); return; }
    top += speed;
    item.style.top = top + 'px';
    if (top > 240) { clearInterval(fall); if(item.parentNode) item.remove(); }
  }, 40);
}

function closeRain() {
  clearInterval(rainInterval); clearInterval(rainSpawnInterval);
  rainActive = false;
  document.getElementById('rain-arena').innerHTML = '';
  document.getElementById('modal-rain').classList.add('hidden');
}

/* ---- MEMORY FLASH ---- */
let memSequence = [], memInput = [], memRound = 1, memAccepting = false;

function resetMemory() {
  memSequence = []; memInput = []; memRound = 1; memAccepting = false;
  document.getElementById('memory-round').textContent       = '1';
  document.getElementById('memory-instruction').textContent = 'Watch the pattern, then repeat it!';
  const old = document.getElementById('memory-start-btn');
  const btn = old.cloneNode(true);
  btn.textContent = 'Start!'; btn.classList.remove('hidden');
  old.parentNode.replaceChild(btn, old);

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
    document.getElementById('memory-instruction').textContent = 'Your turn! Repeat it! 👆';
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
  setTimeout(go, 300);
}

function checkMemInput() {
  const idx   = memInput.length - 1;
  const tiles = document.querySelectorAll('.mem-btn');
  if (memInput[idx] !== memSequence[idx]) {
    if (tiles[memInput[idx]]) { tiles[memInput[idx]].classList.add('wrong'); setTimeout(() => tiles[memInput[idx]].classList.remove('wrong'), 400); }
    playError(); memAccepting = false;
    const boost  = 1 + (state.upgrades.minigame * 0.25);
    const reward = Math.floor((memRound - 1) * 5 * boost);
    if (reward > 0) { state.coins += reward; state.totalCoins += reward; }
    document.getElementById('memory-instruction').textContent = '❌ Wrong! Game over!';
    showToast('🧠 Round ' + memRound + (reward > 0 ? '. +' + reward + ' coins!' : '. Better luck next time!'));
    onMinigameComplete(); updateUI();
    setTimeout(() => resetMemory(), 1500);
    return;
  }
  if (tiles[memInput[idx]]) { tiles[memInput[idx]].classList.add('correct'); setTimeout(() => tiles[memInput[idx]].classList.remove('correct'), 300); }
  if (memInput.length === memSequence.length) {
    memAccepting = false; memRound++;
    playSuccess();
    document.getElementById('memory-instruction').textContent = '✅ Correct! Next round...';
    setTimeout(nextMemRound, 1000);
  }
}

function closeMemory() {
  memAccepting = false;
  document.getElementById('modal-memory').classList.add('hidden');
}

// ============================================
// RACES
// ============================================
const botNames   = ['ClickMaster99','TurboFinger','SpeedTapper','QuickClick','FingerFlash','RapidTap42','ClickZilla','NinjaClicker','SwiftPress','TapStorm','ClickBlitz','HyperTap','MegaFinger','UltraPress','ClickBeast'];
const botAvatars = ['🤖','👾','🦾','💻','🎮','🕹️','⚡','🌀'];
let raceBots = [], raceActive = false, racePlayerClicks = 0, raceTimer = 30;
let raceTimerInterval = null, raceBotIntervals = [];

function setupRace() {
  generateBots();
  document.getElementById('race-start-btn').addEventListener('click', () => { initAudio(); playClick(); startRace(); });
  document.getElementById('race-click-btn').addEventListener('click', () => {
    if (!raceActive) return;
    racePlayerClicks++; playClick(); updateRaceScoreboard();
  });
  document.getElementById('race-again-btn').addEventListener('click', () => {
    initAudio(); playClick();
    generateBots();
    document.getElementById('race-result').classList.add('hidden');
    document.getElementById('race-lobby').classList.remove('hidden');
  });
}

function generateBots() {
  raceBots = [];
  const count = Math.floor(Math.random() * 2) + 2;
  const used  = new Set();
  for (let i = 0; i < count; i++) {
    let name;
    do { name = botNames[Math.floor(Math.random() * botNames.length)]; } while (used.has(name));
    used.add(name);
    raceBots.push({ name, avatar: botAvatars[Math.floor(Math.random() * botAvatars.length)], speed: Math.floor(Math.random() * 6) + 3, clicks: 0 });
  }
  const botsEl = document.getElementById('race-bots');
  if (!botsEl) return;
  botsEl.innerHTML = '';
  raceBots.forEach(bot => {
    const card = document.createElement('div');
    card.classList.add('race-bot-card');
    const speedLabel = bot.speed <= 4 ? 'Slow 🐢' : bot.speed <= 6 ? 'Medium 🐇' : 'Fast ⚡';
    card.innerHTML = `<div class="race-bot-avatar">${bot.avatar}</div><div><div class="race-bot-name">${bot.name}</div><div class="race-bot-speed">Speed: ${speedLabel}</div></div>`;
    botsEl.appendChild(card);
  });
}

function startRace() {
  raceActive = true; racePlayerClicks = 0; raceTimer = 30;
  raceBots.forEach(b => b.clicks = 0);
  document.getElementById('race-lobby').classList.add('hidden');
  document.getElementById('race-result').classList.add('hidden');
  document.getElementById('race-arena').classList.remove('hidden');
  document.getElementById('race-timer').textContent = '30';
  buildRaceScoreboard();
  raceBotIntervals = raceBots.map(bot =>
    setInterval(() => { if (raceActive) { bot.clicks += bot.speed; updateRaceScoreboard(); } }, 1000)
  );
  raceTimerInterval = setInterval(() => {
    raceTimer--;
    document.getElementById('race-timer').textContent = raceTimer;
    if (raceTimer <= 0) endRace();
  }, 1000);
}

function buildRaceScoreboard() {
  const board = document.getElementById('race-scoreboard');
  if (!board) return;
  board.innerHTML = `<div class="race-score-row you"><span>${state.avatar} ${state.username} (You)</span><span id="race-you-clicks">0 clicks</span></div>`;
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
  raceBots.forEach((bot, i) => { const b = document.getElementById('race-bot-clicks-' + i); if(b) b.textContent = bot.clicks + ' clicks'; });
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
  if (won) {
    state.racesWon++;
    const reward = 30 + Math.floor(Math.random() * 20);
    state.coins += reward; state.totalCoins += reward;
    if (!state.achievements.firstrace) { state.achievements.firstrace = true; showToast('🏅 Achievement: First Race Win!'); }
    box.className = 'race-result-box win';
    box.innerHTML = `<h2>🏆 You Won!</h2><p>You tapped ${racePlayerClicks} times and beat all bots!</p><p>🪙 +${reward} coins rewarded!</p>`;
    playSuccess();
  } else {
    box.className = 'race-result-box lose';
    box.innerHTML = `<h2>😔 You Lost!</h2><p>You got ${racePlayerClicks} but a bot beat you with ${topBot} clicks!</p><p>Raw tapping only — no auto clickers! 💪</p>`;
    playError();
  }
  checkAchievements(); updateUI(); saveState();
}

// ============================================
// LEADERBOARD
// ============================================
function setupLeaderboard() {
  document.querySelectorAll('.lb-tab').forEach(tab => {
    tab.addEventListener('click', () => {
      initAudio(); playClick();
      document.querySelectorAll('.lb-tab').forEach(t => t.classList.remove('active'));
      tab.classList.add('active');
      renderLeaderboard(tab.dataset.tab);
    });
  });
  renderLeaderboard('clicks');
}

function renderLeaderboard(type) {
  const fakeNames = ['ClickKing','TapQueen','SpeedDemon','FingerGod','ClickLord','NinjaTapper','UltraClick','HyperFinger'];
  const medals    = ['🥇','🥈','🥉','4️⃣','5️⃣'];
  const list      = document.getElementById('lb-list');
  if (!list) return;
  const playerVal = type === 'clicks' ? state.totalClicks : type === 'coins' ? state.totalCoins : state.racesWon;
  let entries = fakeNames.slice(0,4).map((name,i) => ({
    name, isYou: false,
    value: (5-i) * (type === 'races' ? 12 : type === 'coins' ? 350 : 1500) + Math.floor(Math.random()*100),
  }));
  entries.push({ name: state.username + ' 👈', value: playerVal, isYou: true });
  entries.sort((a,b) => b.value - a.value);
  entries = entries.slice(0,5);
  list.innerHTML = entries.map((e,i) => `
    <div class="lb-row${e.isYou?' you':''}">
      <span>${medals[i]||i+1}</span><span>${e.name}</span><span>${formatNum(e.value)}</span>
    </div>`).join('') + '<p class="lb-note">🔄 Resets weekly. Top players earn bonus coins!</p>';
}

// ============================================
// INIT
// ============================================
window.addEventListener('load', () => {
  const hasSave = loadState();
  runLoadingScreen(() => {
    document.getElementById('loading-screen').classList.add('hidden');
    if (hasSave) { showGame(); } else { showSetup(); }
  });
});
