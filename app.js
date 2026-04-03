```javascript
/* ============================================
   ULTIMATE CLICKER SIMULATOR - app.js
   Part 1 of 3
   ============================================ */

function levelThreshold(lvl) {
  return Math.pow(10, lvl) * 10;
}

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
    ctx.strokeStyle = '#a78bfa'; ctx.lineWidth = 0.4;
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
  function playChord() {
    if (!audioCtx || !musicPlaying) return;
    const chord = chords[ci++ % 4];
    chord.forEach(freq => {
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
    b.connect(bg); bg.connect(musicGain); b.type='sine';
    b.frequency.value=chords[(ci-1)%4][0]/2;
    bg.gain.setValueAtTime(0,audioCtx.currentTime);
    bg.gain.linearRampToValueAtTime(0.38,audioCtx.currentTime+0.1);
    bg.gain.linearRampToValueAtTime(0,audioCtx.currentTime+2);
    b.start(audioCtx.currentTime); b.stop(audioCtx.currentTime+2.2);
  }
  function playHihat() {
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
  function playKick() {
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
    if (beat%8===0) playChord();
    if (beat%4===0||beat%4===2) playKick();
    if (beat%2===0) playHihat();
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
    [520,660,800].forEach((freq,i)=>{
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

let toastTimer = null;
function showToast(msg) {
  const t=document.getElementById('toast'); if(!t) return;
  t.textContent=msg; t.classList.remove('hidden');
  clearTimeout(toastTimer);
  toastTimer=setTimeout(()=>t.classList.add('hidden'),2500);
}

function formatNum(n) {
  n=Math.floor(n);
  if (n>=1000000) return (n/1000000).toFixed(1)+'M';
  if (n>=1000)    return (n/1000).toFixed(1)+'K';
  return n.toString();
}

function launchConfetti() {
  const c=document.getElementById('confetti-container'); if(!c) return;
  const colors=['#a78bfa','#60a5fa','#f9a8d4','#86efac','#fde68a','#c084fc'];
  for (let i=0;i<55;i++) {
    const p=document.createElement('div'); p.classList.add('confetti-piece');
    p.style.left=Math.random()*100+'vw';
    p.style.background=colors[Math.floor(Math.random()*colors.length)];
    p.style.animationDuration=(Math.random()*2+1.5)+'s';
    p.style.animationDelay=Math.random()*0.4+'s';
    p.style.width=(Math.random()*8+5)+'px';
    p.style.height=(Math.random()*8+5)+'px';
    p.style.borderRadius=Math.random()>0.5?'50%':'2px';
    c.appendChild(p); setTimeout(()=>p.remove(),3500);
  }
}

let achTimer=null;
function showAchievement(name) {
  const popup=document.getElementById('achievement-popup');
  const nameEl=document.getElementById('ach-name');
  if (!popup||!nameEl) return;
  nameEl.textContent=name; popup.classList.remove('hidden');
  launchConfetti(); playSuccess();
  clearTimeout(achTimer);
  achTimer=setTimeout(()=>popup.classList.add('hidden'),3500);
}

const loadingMessages=['Initializing Systems...','Loading Click Engine...',
  'Calibrating Coins...','Preparing Mini-Games...','Summoning Bots...','Almost Ready...'];

function runLoadingScreen(callback) {
  const bar=document.getElementById('loading-bar');
  const txtEl=document.getElementById('loading-text');
  let pct=0, msgIdx=0, done=false;
  const hardCap=setTimeout(()=>{
    if(done) return; done=true;
    clearInterval(barInt); clearInterval(msgInt);
    if(bar) bar.style.width='100%';
    if(txtEl) txtEl.textContent='Ready!';
    setTimeout(callback,150);
  },5000);
  const msgInt=setInterval(()=>{
    if(txtEl&&msgIdx<loadingMessages.length) txtEl.textContent=loadingMessages[msgIdx++];
  },700);
  const barInt=setInterval(()=>{
    pct+=Math.random()*32+18;
    if(pct>=100){
      pct=100; if(bar) bar.style.width='100%';
      clearInterval(barInt); clearInterval(msgInt); clearTimeout(hardCap);
      if(done) return; done=true;
      if(txtEl) txtEl.textContent='Ready!';
      setTimeout(callback,150);
    } else { if(bar) bar.style.width=pct+'%'; }
  },180);
}

function showSetup() {
  document.getElementById('loading-screen').classList.add('hidden');
  document.getElementById('setup-screen').classList.remove('hidden');
  state.avatar='🐱';
  document.querySelectorAll('#setup-screen .avatar-option').forEach(el=>{
    el.addEventListener('click',()=>{
      document.querySelectorAll('#setup-screen .avatar-option').forEach(a=>a.classList.remove('selected'));
      el.classList.add('selected'); state.avatar=el.dataset.avatar; playClick();
    });
  });
  document.getElementById('start-btn').addEventListener('click',()=>{
    initAudio();
    const name=document.getElementById('username-input').value.trim();
    if(!name||name.length<2){showToast('Enter a username (min 2 chars)!'); return;}
    state.username=name;
    if(!state.takenUsernames.includes(name)) state.takenUsernames.push(name);
    playSuccess(); saveState(); showGame(); setTimeout(startLofi,400);
  });
}

function showGame() {
  document.getElementById('loading-screen').classList.add('hidden');
  document.getElementById('setup-screen').classList.add('hidden');
  document.getElementById('game-screen').classList.remove('hidden');
  resetDailyQuestsIfNeeded();
  updateUI(); setupNav(); setupClickButton(); setupExchange();
  setupShop(); setupMinigames(); setupQuests(); setupRace();
  setupLeaderboard(); setupProfile(); startIdleClicker();
  startAutoClicker(); startLeaderboardTimer();
}

function updateUI() {
  const g=id=>document.getElementById(id);
  g('click-display').textContent=formatNum(state.clicks);
  g('coin-display').textContent=formatNum(state.coins);
  const needed=levelThreshold(state.level);
  const prevDone=state.level>1?levelThreshold(state.level-1):0;
  const progress=Math.min(Math.max(((state.totalClicks-prevDone)/(needed-prevDone))*100,0),100);
  g('level-label').textContent='Level '+state.level;
  g('level-next').textContent=formatNum(needed)+' total clicks';
  g('level-bar-fill').style.width=progress+'%';
  g('profile-avatar').textContent=state.avatar;
  g('profile-name').textContent=state.username;
  g('profile-level-tag').textContent='Level '+state.level;
  g('stat-clicks').textContent=formatNum(state.totalClicks);
  g('stat-coins').textContent=formatNum(state.totalCoins);
  g('stat-races').textContent=state.racesWon;
  g('stat-level').textContent=state.level;
  g('multi-level').textContent=state.upgrades.multiplier;
  g('auto-level').textContent=state.upgrades.autoclicker;
  g('mini-level').textContent=state.upgrades.minigame;
  g('coin-level').textContent=state.upgrades.coinboost;
  const asl=g('auto-speed-label');
  if(asl) asl.textContent=state.upgrades.autoclicker===0?'Not active':'1 click / '+Math.max(1,11-state.upgrades.autoclicker)+'s';
  updateShopCosts(); updateQuestUI(); updateAchievements();
}

function setupNav() {
  document.querySelectorAll('.nav-btn').forEach(btn=>{
    btn.addEventListener('click',()=>{
      initAudio(); playClick();
      const panel=btn.dataset.panel;
      document.querySelectorAll('.nav-btn').forEach(b=>b.classList.remove('active'));
      btn.classList.add('active');
      document.querySelectorAll('.panel').forEach(p=>p.classList.add('hidden'));
      if(panel!=='main'){
        const target=document.getElementById('panel-'+panel);
        if(target) target.classList.remove('hidden');
        if(panel==='leaderboard') renderLeaderboard('clicks');
      }
    });
  });
}

function setupClickButton() {
  const btn=document.getElementById('click-btn');
  btn.addEventListener('click',(e)=>{
    initAudio();
    const mult=Math.max(1,1+state.upgrades.multiplier);
    state.clicks+=mult; state.totalClicks+=mult;
    checkLevel(); updateUI(); playClick();
    animatePing(btn); showClickPop(e,'+'+mult);
    updateQuestProgress(); checkAchievements(); saveState();
  });
}

function animatePing(btn) {
  btn.classList.remove('ping'); void btn.offsetWidth;
  btn.classList.add('ping');
  setTimeout(()=>btn.classList.remove('ping'),400);
}

function showClickPop(e,text) {
  const pop=document.getElementById('click-pop'); if(!pop) return;
  pop.textContent=text;
  pop.style.left=(e.clientX-15)+'px';
  pop.style.top=(e.clientY-30)+'px';
  pop.classList.remove('hidden');
  pop.style.animation='none'; void pop.offsetWidth; pop.style.animation='';
  setTimeout(()=>pop.classList.add('hidden'),650);
}

function setupExchange() {
  document.getElementById('exchange-btn').addEventListener('click',()=>{
    initAudio();
    if(state.clicks<10){showToast('Need at least 10 clicks! 👆'); playError(); return;}
    const sets=Math.floor(state.clicks/10);
    const boost=1+(state.upgrades.coinboost*0.25);
    const earned=Math.floor(sets*boost);
    state.clicks-=sets*10; state.coins+=earned; state.totalCoins+=earned;
    playSuccess(); showToast('💰 +'+earned+' coins earned!');
    updateUI(); updateQuestProgress(); checkAchievements(); saveState();
  });
}

function checkLevel() {
  const needed=levelThreshold(state.level);
  if(state.totalClicks>=needed){
    state.level++;
    showToast('🎉 Level Up! Now Level '+state.level+'!');
    playSuccess(); checkAchievements();
  }
}

function startIdleClicker() {
  setInterval(()=>{
    state.clicks++; state.totalClicks++;
    checkLevel(); updateUI(); saveState();
  },30000);
}

let autoClickerInterval=null;
function startAutoClicker() {
  if(autoClickerInterval) clearInterval(autoClickerInterval);
  const lvl=state.upgrades.autoclicker; if(lvl===0) return;
  const sec=Math.max(1,11-lvl);
  autoClickerInterval=setInterval(()=>{
    if(!raceActive){
      state.clicks++; state.totalClicks++;
      checkLevel(); updateUI(); saveState();
    }
  },sec*1000);
}

const upgradeCosts={multiplier:50,autoclicker:100,minigame:75,coinboost:80};

function setupShop() {
  document.querySelectorAll('.btn-upgrade').forEach(btn=>{
    btn.addEventListener('click',()=>{
      initAudio(); playClick();
      const type=btn.dataset.upgrade;
      const cost=upgradeCosts[type]*(state.upgrades[type]+1);
      if(state.coins<cost){showToast('Need 🪙 '+cost+' coins!'); playError(); return;}
      state.coins-=cost; state.upgrades[type]++;
      playSuccess(); showToast('✅ '+type+' upgraded to Level '+state.upgrades[type]+'!');
      if(type==='autoclicker') startAutoClicker();
      updateUI(); saveState();
    });
  });
}

function updateShopCosts() {
  document.querySelectorAll('.btn-upgrade').forEach(btn=>{
    const type=btn.dataset.upgrade;
    const cost=upgradeCosts[type]*(state.upgrades[type]+1);
    const el=btn.querySelector('.upgrade-cost');
    if(el) el.textContent='🪙 '+cost;
  });
}

function resetDailyQuestsIfNeeded() {
  const today=new Date().toDateString();
  if(state.quests.lastReset!==today){
    state.quests={
      q1:{done:false,claimed:false}, q2:{done:false,claimed:false},
      q3:{done:false,claimed:false}, lastReset:today
    };
    saveState();
  }
}

function setupQuests() {
  const db=document.getElementById('claim-daily-btn');
  if(db){
    db.addEventListener('click',()=>{
      initAudio();
      const today=new Date().toDateString();
      const yesterday=new Date(Date.now()-86400000).toDateString();
      if(state.daily.lastClaim===today){showToast('Already claimed! Come back tomorrow 🌙'); playError(); return;}
      state.daily.streak=(state.daily.lastClaim===yesterday)?state.daily.streak+1:1;
      state.daily.lastClaim=today;
      const reward=20+state.daily.streak*5;
      state.coins+=reward; state.totalCoins+=reward;
      playSuccess(); showToast('🎁 +'+reward+' coins! Streak: '+state.daily.streak+' days 🔥');
      const sc=document.getElementById('streak-count'); if(sc) sc.textContent=state.daily.streak;
      updateUI(); saveState();
    });
  }
  const sc=document.getElementById('streak-count'); if(sc) sc.textContent=state.daily.streak;
  const q1=document.getElementById('q1-claim');
  const q2=document.getElementById('q2-claim');
  const q3=document.getElementById('q3-claim');
  if(q1) q1.addEventListener('click',()=>{initAudio(); claimQuest('q1',50,'clicks');});
  if(q2) q2.addEventListener('click',()=>{initAudio(); claimQuest('q2',20,'coins');});
  if(q3) q3.addEventListener('click',()=>{initAudio(); claimQuest('q3',15,'coins');});
}

function claimQuest(id,reward,type) {
  if(!state.quests[id].done||state.quests[id].claimed) return;
  state.quests[id].claimed=true;
  if(type==='clicks'){state.clicks+=reward; state.totalClicks+=reward;}
  if(type==='coins'){state.coins+=reward; state.totalCoins+=reward;}
  playSuccess(); showToast('✅ Quest claimed! +'+reward+' '+type+'!');
  updateUI(); checkAllQuests(); saveState();
}

function updateQuestProgress() {
  if(!state.quests.q1.claimed){
    const p=Math.min(state.totalClicks,500);
    const el=document.getElementById('q1-progress'); if(el) el.textContent=formatNum(p)+' / 500';
    if(p>=500&&!state.quests.q1.done){state.quests.q1.done=true; const b=document.getElementById('q1-claim'); if(b) b.disabled=false;}
  }
  if(!state.quests.q2.claimed){
    const p=Math.min(state.totalCoins,50);
    const el=document.getElementById('q2-progress'); if(el) el.textContent=p+' / 50';
    if(p>=50&&!state.quests.q2.done){state.quests.q2.done=true; const b=document.getElementById('q2-claim'); if(b) b.disabled=false;}
  }
  if(!state.quests.q3.claimed){
    const p=Math.min(state.minigamesCompleted,1);
    const el=document.getElementById('q3-progress'); if(el) el.textContent=p+' / 1';
    if(p>=1&&!state.quests.q3.done){state.quests.q3.done=true; const b=document.getElementById('q3-claim'); if(b) b.disabled=false;}
  }
}

function updateQuestUI() {
  updateQuestProgress();
  if(state.quests.q1.claimed){const b=document.getElementById('q1-claim'); if(b){b.textContent='✓ Done';b.disabled=true;}}
  if(state.quests.q2.claimed){const b=document.getElementById('q2-claim'); if(b){b.textContent='✓ Done';b.disabled=true;}}
  if(state.quests.q3.claimed){const b=document.getElementById('q3-claim'); if(b){b.textContent='✓ Done';b.disabled=true;}}
}

function checkAllQuests() {
  if(state.quests.q1.claimed&&state.quests.q2.claimed&&state.quests.q3.claimed&&!state.achievements.allquests){
    state.achievements.allquests=true;
    showAchievement('Quest Master 📋');
    checkAchievements(); saveState();
  }
}

function checkAchievements() {
  if(state.totalClicks>=1000&&!state.achievements.clicks1000){state.achievements.clicks1000=true; showAchievement('1,000 Clicks! 👆');}
  if(state.totalCoins>=100&&!state.achievements.coins100){state.achievements.coins100=true; showAchievement('100 Coins! 🪙');}
  if(state.level>=10&&!state.achievements.level10){state.achievements.level10=true; showAchievement('Level 10 Reached! ⭐');}
  updateAchievements(); saveState();
}

function updateAchievements() {
  const map={
    'badge-1000clicks':state.achievements.clicks1000,
    'badge-100coins':state.achievements.coins100,
    'badge-firstrace':state.achievements.firstrace,
    'badge-allquests':state.achievements.allquests,
    'badge-level10':state.achievements.level10,
    'badge-minigame':state.achievements.minigame,
  };
  for(const [id,unlocked] of Object.entries(map)){
    const el=document.getElementById(id); if(!el) continue;
    el.classList.toggle('locked',!unlocked);
    el.classList.toggle('unlocked',unlocked);
  }
}

function setupMinigames() {
  document.querySelectorAll('.btn-play').forEach(btn=>{
    btn.addEventListener('click',()=>{
      initAudio(); playClick();
      const game=btn.dataset.game;
      document.getElementById('modal-'+game).classList.remove('hidden');
      if(game==='frenzy') resetFrenzy();
      if(game==='rain')   resetRain();
      if(game==='memory') resetMemory();
    });
  });
  document.getElementById('frenzy-close').addEventListener('click',()=>{closeFrenzy(); playClick();});
  document.getElementById('rain-close').addEventListener('click',()=>{closeRain(); playClick();});
  document.getElementById('memory-close').addEventListener('click',()=>{closeMemory(); playClick();});
}

function onMinigameComplete() {
  state.minigamesCompleted++;
  if(!state.achievements.minigame){state.achievements.minigame=true; showAchievement('Game Winner! 🎮');}
  updateQuestProgress(); checkAchievements(); saveState();
}

let frenzyActive=false, frenzyScore=0, frenzyTime=10, frenzyInterval=null;

function resetFrenzy() {
  clearInterval(frenzyInterval);
  frenzyActive=false; frenzyScore=0; frenzyTime=10;
  document.getElementById('frenzy-timer').textContent='10';
  document.getElementById('frenzy-score').textContent='0';
  const old=document.getElementById('frenzy-start-btn');
  const btn=old.cloneNode(true); btn.textContent='Start!'; btn.classList.remove('hidden'); btn.disabled=false;
  old.parentNode.replaceChild(btn,old);
  btn.addEventListener('click',()=>{
    if(!frenzyActive){
      frenzyActive=true; btn.textContent='TAP! 👆';
      frenzyInterval=setInterval(()=>{
        frenzyTime=Math.max(0,frenzyTime-1);
        document.getElementById('frenzy-timer').textContent=frenzyTime;
        if(frenzyTime<=0){
          clearInterval(frenzyInterval); frenzyActive=false; btn.disabled=true;
          state.clicks+=frenzyScore; state.totalClicks+=frenzyScore;
          playSuccess(); showToast('⚡ Storm over! +'+frenzyScore+' clicks!');
          onMinigameComplete(); updateUI();
          setTimeout(()=>{
            btn.textContent='Play Again!'; btn.disabled=false;
            frenzyTime=10; frenzyScore=0;
            document.getElementById('frenzy-timer').textContent='10';
            document.getElementById('frenzy-score').textContent='0';
            frenzyActive=false;
          },1000);
        }
      },1000);
    } else if(frenzyTime>0){
      frenzyScore++;
      document.getElementById('frenzy-score').textContent=frenzyScore;
      playClick();
    }
  });
}

function closeFrenzy(){clearInterval(frenzyInterval); frenzyActive=false; document.getElementById('modal-frenzy').classList.add('hidden');}

let rainActive=false, rainCaught=0, rainTime=20, rainInterval=null, rainSpawnInterval=null;

function resetRain() {
  clearInterval(rainInterval); clearInterval(rainSpawnInterval);
  rainActive=false; rainCaught=0; rainTime=20;
  document.getElementById('rain-caught').textContent='0';
  document.getElementById('rain-timer').textContent='20';
  document.getElementById('rain-arena').innerHTML='';
  const old=document.getElementById('rain-start-btn');
  const btn=old.cloneNode(true); btn.textContent='Start!'; btn.classList.remove('hidden');
  old.parentNode.replaceChild(btn,old);
  btn.addEventListener('click',()=>{
    if(rainActive) return;
    rainActive=true; btn.classList.add('hidden');
    rainInterval=setInterval(()=>{
      rainTime=Math.max(0,rainTime-1);
      document.getElementById('rain-timer').textContent=rainTime;
      if(rainTime<=0){
        clearInterval(rainInterval); clearInterval(rainSpawnInterval);
        rainActive=false; document.getElementById('rain-arena').innerHTML='';
        const boost=1+(state.upgrades.minigame*0.25);
        const reward=Math.max(0,Math.floor(rainCaught*boost));
        state.coins+=reward; state.totalCoins+=reward;
        playSuccess(); showToast('🪙 Rush over! +'+reward+' coins!');
        onMinigameComplete(); updateUI();
        btn.textContent='Play Again!'; btn.classList.remove('hidden');
      }
    },1000);
    rainSpawnInterval=setInterval(spawnRainItem,650);
  });
}

function spawnRainItem() {
  const arena=document.getElementById('rain-arena');
  if(!arena||!rainActive||rainTime<=0) return;
  const isBomb=Math.random()<0.22;
  const item=document.createElement('div');
  item.classList.add('rain-item');
  item.textContent=isBomb?'💣':'🪙';
  item.style.left=(Math.random()*82)+'%';
  item.style.top='-30px'; item.style.position='absolute';
  arena.appendChild(item);
  let clicked=false;
  item.addEventListener('click',e=>{
    e.stopPropagation();
    if(!rainActive||rainTime<=0||clicked) return;
    clicked=true;
    if(isBomb){rainCaught=Math.max(0,rainCaught-5); showToast('💣 Bomb! -5 coins!'); playError();}
    else{rainCaught++; playClick();}
    document.getElementById('rain-caught').textContent=rainCaught;
    item.remove();
  });
  let top=-30; const speed=3+Math.random()*2;
  const fall=setInterval(()=>{
    if(!rainActive||rainTime<=0){clearInterval(fall); if(item.parentNode) item.remove(); return;}
    top+=speed; item.style.top=top+'px';
    if(top>200){clearInterval(fall); if(item.parentNode) item.remove();}
  },40);
}

function closeRain(){
  clearInterval(rainInterval); clearInterval(rainSpawnInterval);
  rainActive=false; document.getElementById('rain-arena').innerHTML='';
  document.getElementById('modal-rain').classList.add('hidden');
}

let memSeq=[], memIn=[], memRound=1, memOk=false;

function resetMemory() {
  memSeq=[]; memIn=[]; memRound=1; memOk=false;
  document.getElementById('memory-round').textContent='1';
  document.getElementById('memory-instruction').textContent='Watch the buttons light up, then tap them in the same order!';
  const old=document.getElementById('memory-start-btn');
  const btn=old.cloneNode(true); btn.textContent='Start!'; btn.classList.remove('hidden');
  old.parentNode.replaceChild(btn,old);
  document.querySelectorAll('.mem-btn').forEach((tile,i)=>{
    const nt=tile.cloneNode(true); tile.parentNode.replaceChild(nt,tile);
    nt.addEventListener('click',()=>{
      if(!memOk) return;
      playClick(); nt.classList.add('flash');
      setTimeout(()=>nt.classList.remove('flash'),280);
      memIn.push(i); checkMemIn();
    });
  });
  btn.addEventListener('click',()=>{btn.classList.add('hidden'); nextMemRound();});
}

function nextMemRound() {
  memIn=[]; memOk=false;
  memSeq.push(Math.floor(Math.random()*4));
  document.getElementById('memory-round').textContent=memRound;
  document.getElementById('memory-instruction').textContent='Watch carefully... 👀';
  flashMem(()=>{memOk=true; document.getElementById('memory-instruction').textContent='Your turn! Tap in order! 👆';});
}

function flashMem(cb) {
  const tiles=document.querySelectorAll('.mem-btn');
  let i=0;
  const go=()=>{
    if(i>0) tiles[memSeq[i-1]].classList.remove('flash');
    if(i>=memSeq.length){cb(); return;}
    tiles[memSeq[i]].classList.add('flash'); i++;
    setTimeout(go,700);
  };
  setTimeout(go,400);
}

function checkMemIn() {
  const idx=memIn.length-1;
  const tiles=document.querySelectorAll('.mem-btn');
  if(memIn[idx]!==memSeq[idx]){
    if(tiles[memIn[idx]]){tiles[memIn[idx]].classList.add('wrong'); setTimeout(()=>tiles[memIn[idx]].classList.remove('wrong'),400);}
    playError(); memOk=false;
    const boost=1+(state.upgrades.minigame*0.25);
    const coinR=Math.floor((memRound-1)*5*boost);
    const clickR=Math.floor((memRound-1)*3);
    if(coinR>0){state.coins+=coinR; state.totalCoins+=coinR;}
    if(clickR>0){state.clicks+=clickR; state.totalClicks+=clickR;}
    document.getElementById('memory-instruction').textContent='❌ Wrong! Game over!';
    showToast('🧠 Round '+memRound+(coinR>0?'. +'+coinR+' coins & +'+clickR+' clicks!':'!'));
    onMinigameComplete(); updateUI();
    setTimeout(()=>resetMemory(),1600);
    return;
  }
  if(tiles[memIn[idx]]){tiles[memIn[idx]].classList.add('correct'); setTimeout(()=>tiles[memIn[idx]].classList.remove('correct'),300);}
  if(memIn.length===memSeq.length){
    memOk=false; memRound++; playSuccess();
    document.getElementById('memory-instruction').textContent='✅ Correct! Next round...';
    setTimeout(nextMemRound,1000);
  }
}

function closeMemory(){memOk=false; document.getElementById('modal-memory').classList.add('hidden');}

const botNames=[
  'ClickMaster99','TurboFinger','SpeedTapper','QuickClick','FingerFlash',
  'RapidTap42','ClickZilla','NinjaClicker','SwiftPress','TapStorm',
  'ClickBlitz','HyperTap','MegaFinger','UltraPress','ClickBeast',
  'TapKing','FingerStorm','ClickRush','PressBot','SwiftClick',
];
const botEmoji={slow:'🐢',medium:'🐇',fast:'🐆'};

let raceBots=[], raceActive=false, racePlayerClicks=0, raceTimer=30;
let raceTimerInterval=null, raceBotIntervals=[];

function getBotTypes() {
  const lvl=state.level;
  const count=Math.floor(Math.random()*2)+2;
  const pool=[];
  if(lvl<5){
    for(let i=0;i<count;i++) pool.push('slow');
  } else if(lvl<10){
    for(let i=0;i<count;i++) pool.push(Math.random()>0.4?'slow':'medium');
  } else if(lvl<20){
    for(let i=0;i<count;i++){const r=Math.random(); pool.push(r<0.33?'slow':r<0.66?'medium':'fast');}
  } else {
    for(let i=0;i<count;i++){const r=Math.random(); pool.push(r<0.2?'slow':r<0.5?'medium':'fast');}
  }
  return pool;
}

function botSpeed(type){
  if(type==='slow')   return Math.floor(Math.random()*2)+3;
  if(type==='medium') return Math.floor(Math.random()*3)+6;
  if(type==='fast')   return Math.floor(Math.random()*3)+12;
  return 3;
}

function setupRace() {
  generateBots();
  document.getElementById('race-start-btn').addEventListener('click',()=>{initAudio(); playClick(); startRace();});
  document.getElementById('race-click-btn').addEventListener('click',()=>{
    if(!raceActive||raceTimer<=0) return;
    racePlayerClicks++; playClick(); updateRaceScoreboard();
  });
  document.getElementById('race-again-btn').addEventListener('click',()=>{
    initAudio(); playClick();
    generateBots();
    document.getElementById('race-result').classList.add('hidden');
    document.getElementById('coin-popup').classList.add('hidden');
    document.getElementById('race-lobby').classList.remove('hidden');
  });
}

function generateBots() {
  raceBots=[];
  const types=getBotTypes();
  const used=new Set();
  types.forEach(type=>{
    let name;
    do{name=botNames[Math.floor(Math.random()*botNames.length)];}while(used.has(name));
    used.add(name);
    raceBots.push({name,avatar:botEmoji[type],speed:botSpeed(type),type,clicks:0});
  });
  const el=document.getElementById('race-bots'); if(!el) return;
  el.innerHTML='';
  raceBots.forEach(bot=>{
    const card=document.createElement('div'); card.classList.add('race-bot-card');
    const lbl=bot.type==='slow'?'Slow 🐢':bot.type==='medium'?'Medium 🐇':'Fast 🐆';
    card.innerHTML=`<div class="race-bot-avatar">${bot.avatar}</div><div><div class="race-bot-name">${bot.name}</div><div class="race-bot-speed">Speed: ${lbl}</div></div>`;
    el.appendChild(card);
  });
}

function startRace() {
  raceActive=true; racePlayerClicks=0; raceTimer=30;
  raceBots.forEach(b=>b.clicks=0);
  document.getElementById('race-lobby').classList.add('hidden');
  document.getElementById('race-result').classList.add('hidden');
  document.getElementById('coin-popup').classList.add('hidden');
  document.getElementById('race-arena').classList.remove('hidden');
  document.getElementById('race-timer').textContent='30';
  buildRaceScoreboard();
  raceBotIntervals=raceBots.map(bot=>
    setInterval(()=>{if(raceActive&&raceTimer>0){bot.clicks+=bot.speed; updateRaceScoreboard();}},1000)
  );
  raceTimerInterval=setInterval(()=>{
    raceTimer=Math.max(0,raceTimer-1);
    document.getElementById('race-timer').textContent=raceTimer;
    if(raceTimer<=0) endRace();
  },1000);
}

function buildRaceScoreboard() {
  const board=document.getElementById('race-scoreboard'); if(!board) return;
  board.innerHTML=`<div class="race-score-row you"><span>${state.avatar} ${state.username} (You)</span><span id="race-you-clicks">0 clicks</span></div>`;
  raceBots.forEach((bot,i)=>{
    const row=document.createElement('div'); row.classList.add('race-score-row','bot');
    row.innerHTML=`<span>${bot.avatar} ${bot.name}</span><span id="race-bot-clicks-${i}">0 clicks</span>`;
    board.appendChild(row);
  });
}

function updateRaceScoreboard() {
  const e=document.getElementById('race-you-clicks'); if(e) e.textContent=racePlayerClicks+' clicks';
  raceBots.forEach((bot,i)=>{const b=document.getElementById('race-bot-clicks-'+i); if(b) b.textContent=bot.clicks+' clicks';});
}

function endRace() {
  raceActive=false;
  clearInterval(raceTimerInterval);
  raceBotIntervals.forEach(clearInterval); raceBotIntervals=[];
  document.getElementById('race-arena').classList.add('hidden');
  document.getElementById('race-result').classList.remove('hidden');
  const topBot=Math.max(...raceBots.map(b=>b.clicks));
  const won=racePlayerClicks>topBot;
  const box=document.getElementById('race-result-box');
  if(won){
    state.racesWon++;
    const reward=30+Math.floor(Math.random()*20);
    state.coins+=reward; state.totalCoins+=reward;
    if(!state.achievements.firstrace){state.achievements.firstrace=true; showAchievement('First Race Win! 🏁');}
    box.className='race-result-box win';
    box.innerHTML=`<h2>🏆 You Won!</h2><p>You tapped <b>${racePlayerClicks}</b> times.</p><p>You have officially beaten all the bots and won <b>${reward} coins</b>! 🪙</p>`;
    const cp=document.getElementById('coin-popup');
    if(cp){document.getElementById('coin-popup-amount').textContent=reward; cp.classList.remove('hidden');}
    playSuccess(); launchConfetti();
  } else {
    box.className='race-result-box lose';
    box.innerHTML=`<h2>😔 You Lost!</h2><p>You tapped <b>${racePlayerClicks}</b> times, but a bot got <b>${topBot}</b>!</p><p>No auto-clickers — raw tapping only! 💪</p>`;
    playError();
  }
  checkAchievements(); updateUI(); saveState();
}

const realNames=[
  'ClickKing','TapQueen','SpeedDemon','FingerGod','ClickLord','NinjaTapper',
  'UltraClick','HyperFinger','TapMaster','ClickWizard','SwiftFinger','TapLegend',
  'ClickHero','NinjaPress','TurboTap','ClickNinja','MegaTap','PressMaster',
  'TapWizard','ClickStorm','SwiftTap','PressingIt','FingerBlast','ClickFlash',
  'TapBlitz','PressBoss','ClickForce','TapForce','SwiftPress','ClickPower',
];

function setupLeaderboard() {
  document.querySelectorAll('.lb-tab').forEach(tab=>{
    tab.addEventListener('click',()=>{
      initAudio(); playClick();
      document.querySelectorAll('.lb-tab').forEach(t=>t.classList.remove('active'));
      tab.classList.add('active');
      renderLeaderboard(tab.dataset.tab);
    });
  });
  const rb=document.getElementById('lb-reward-btn');
  const rp=document.getElementById('lb-reward-panel');
  const rc=document.getElementById('lb-reward-close');
  if(rb) rb.addEventListener('click',()=>{playClick(); rp.classList.toggle('hidden');});
  if(rc) rc.addEventListener('click',()=>{playClick(); rp.classList.add('hidden');});
}

function startLeaderboardTimer() {
  function update(){
    const now=new Date();
    const next=new Date(now);
    next.setDate(now.getDate()+((1+7-now.getDay())%7||7));
    next.setHours(0,0,0,0);
    const diff=next-now;
    if(diff<=0){giveWeeklyRewards(); return;}
    const d=Math.floor(diff/86400000);
    const h=Math.floor((diff%86400000)/3600000);
    const m=Math.floor((diff%3600000)/60000);
    const s=Math.floor((diff%60000)/1000);
    const el=document.getElementById('lb-timer');
    if(el) el.textContent=`${d}d ${h}h ${m}m ${s}s`;
  }
  update();
  setInterval(update,1000);
}

function giveWeeklyRewards() {
  const pos=Math.floor(Math.random()*5)+1;
  const rewards={1:{coins:1000,clicks:1000},2:{coins:500,clicks:500},3:{coins:250,clicks:250},4:{coins:100,clicks:0},5:{coins:50,clicks:0}};
  const r=rewards[pos]||{coins:0,clicks:0};
  if(r.coins>0){state.coins+=r.coins; state.totalCoins+=r.coins;}
  if(r.clicks>0){state.clicks+=r.clicks; state.totalClicks+=r.clicks;}
  if(r.coins>0) showToast('🏆 Weekly reward! #'+pos+' → +'+r.coins+' coins!');
  updateUI(); saveState();
}

function renderLeaderboard(type) {
  const list=document.getElementById('lb-list'); if(!list) return;
  const medals=['🥇','🥈','🥉'];
  const playerVal=type==='clicks'?state.totalClicks:type==='coins'?state.totalCoins:state.racesWon;
  const allNames=realNames.concat(Array.from({length:70},(_,i)=>'Player'+(1000+i))).slice(0,99);
  let entries=allNames.map((name,i)=>({
    name, isYou:false,
    value:Math.max(0,(99-i)*(type==='races'?8:type==='coins'?420:2000)+Math.floor(Math.random()*300)),
  }));
  entries.push({name:state.username+' 👈',value:playerVal,isYou:true});
  entries.sort((a,b)=>b.value-a.value);
  entries=entries.slice(0,100);
  list.innerHTML=entries.map((e,i)=>`
    <div class="lb-row${e.isYou?' you':''}">
      <span>${medals[i]||'#'+(i+1)}</span>
      <span>${e.name}</span>
      <span>${formatNum(e.value)}</span>
    </div>`).join('');
}

function setupProfile() {
  const editBtn=document.getElementById('btn-edit-profile');
  const editor=document.getElementById('profile-editor');
  const saveBtn=document.getElementById('save-profile-btn');
  const cancelBtn=document.getElementById('cancel-edit-btn');
  const errorEl=document.getElementById('edit-error');
  const inputEl=document.getElementById('edit-username-input');
  let selAvatar=state.avatar;

  if(editBtn){
    editBtn.addEventListener('click',()=>{
      playClick(); selAvatar=state.avatar;
      if(inputEl) inputEl.value=state.username;
      document.querySelectorAll('.edit-avatar-grid .avatar-option').forEach(el=>{
        el.classList.toggle('selected',el.dataset.avatar===state.avatar);
      });
      editor.classList.remove('hidden');
      editBtn.classList.add('hidden');
      if(errorEl) errorEl.classList.add('hidden');
    });
  }

  document.querySelectorAll('.edit-avatar-grid .avatar-option').forEach(el=>{
    el.addEventListener('click',()=>{
      document.querySelectorAll('.edit-avatar-grid .avatar-option').forEach(a=>a.classList.remove('selected'));
      el.classList.add('selected'); selAvatar=el.dataset.avatar; playClick();
    });
  });

  if(saveBtn){
    saveBtn.addEventListener('click',()=>{
      initAudio();
      const newName=inputEl?inputEl.value.trim():'';
      if(!newName||newName.length<2){showToast('Username must be at least 2 chars!'); return;}
      if(newName!==state.username&&state.takenUsernames.includes(newName)){
        if(errorEl) errorEl.classList.remove('hidden'); playError(); return;
      }
      state.takenUsernames=state.takenUsernames.filter(n=>n!==state.username);
      state.username=newName;
      if(!state.takenUsernames.includes(newName)) state.takenUsernames.push(newName);
      state.avatar=selAvatar;
      if(errorEl) errorEl.classList.add('hidden');
      editor.classList.add('hidden');
      if(editBtn) editBtn.classList.remove('hidden');
      playSuccess(); showToast('✅ Profile updated!');
      updateUI(); saveState();
    });
  }

  if(cancelBtn){
    cancelBtn.addEventListener('click',()=>{
      playClick(); editor.classList.add('hidden');
      if(editBtn) editBtn.classList.remove('hidden');
      if(errorEl) errorEl.classList.add('hidden');
    });
  }
}

window.addEventListener('load',()=>{
  initBackground();
  const hasSave=loadState();
  runLoadingScreen(()=>{
    document.getElementById('loading-screen').classList.add('hidden');
    if(hasSave){
      showGame();
      setTimeout(()=>{initAudio(); startLofi();},500);
    } else {
      showSetup();
    }
