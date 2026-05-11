// === HAMMER VS WATER COOLER ===

const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');
const root = document.getElementById('game-root');

// Assets
const coolerImg = new Image();
coolerImg.src = 'https://vtelpopqybfytrgzkomj.supabase.co/storage/v1/object/public/game-assets/public/f973aa4a-b4d3-4deb-a18a-8ac275edda9d/82c00055-2cbc-40d1-a4e3-fec3ea10ff7e/f99b548e-3d11-4ef7-a7aa-572f6e1ef0bb.png';
const hammerImg = new Image();
hammerImg.src = 'https://vtelpopqybfytrgzkomj.supabase.co/storage/v1/object/public/game-assets/public/f973aa4a-b4d3-4deb-a18a-8ac275edda9d/82c00055-2cbc-40d1-a4e3-fec3ea10ff7e/a22d3019-953f-40d4-a5cf-82f8cf2354f2.png';

// Audio
function createAudio(url) {
  const a = new Audio(url);
  a.preload = 'auto';
  return a;
}
const hitSounds = Array.from({length: 3}, () =>
  createAudio('https://vtelpopqybfytrgzkomj.supabase.co/storage/v1/object/public/game-assets/public/f973aa4a-b4d3-4deb-a18a-8ac275edda9d/82c00055-2cbc-40d1-a4e3-fec3ea10ff7e/b86c1aac-1714-4c8a-bbd2-57d41fd35d84.mp3')
);
const splashSounds = Array.from({length: 2}, () =>
  createAudio('https://vtelpopqybfytrgzkomj.supabase.co/storage/v1/object/public/game-assets/public/f973aa4a-b4d3-4deb-a18a-8ac275edda9d/82c00055-2cbc-40d1-a4e3-fec3ea10ff7e/fd557e8f-9096-4678-821e-4f00cb2748d9.mp3')
);

let hitSoundIdx = 0;
let splashSoundIdx = 0;

function playHit() {
  const s = hitSounds[hitSoundIdx % hitSounds.length];
  s.currentTime = 0;
  s.volume = 0.6;
  s.play().catch(()=>{});
  hitSoundIdx++;
}
function playSplash() {
  const s = splashSounds[splashSoundIdx % splashSounds.length];
  s.currentTime = 0;
  s.volume = 0.35;
  s.play().catch(()=>{});
  splashSoundIdx++;
}

// Canvas sizing
function resize() {
  canvas.width = root.clientWidth;
  canvas.height = root.clientHeight;
}
resize();
window.addEventListener('resize', () => { resize(); });

// === GAME STATE ===
const MAX_HP = 100;
const TOTAL_ROUNDS = 3;

let state = {
  phase: 'start',   // start | playing | roundEnd | win
  round: 1,
  score: 0,
  combo: 0,
  maxCombo: 0,
  coolerHP: MAX_HP,
  coolerShake: 0,
  coolerCracks: [],
  particles: [],
  waterDrops: [],
  floatingTexts: [],
  hammer: {
    x: 0, y: 0,
    angle: -0.8,
    swinging: false,
    swingProgress: 0,
    pivotX: 0, pivotY: 0,
  },
  mouse: { x: 200, y: 200 },
  screenShake: { x: 0, y: 0, intensity: 0 },
  bgBubbles: [],
  lastTime: 0,
};

// Generate background bubbles
for (let i = 0; i < 12; i++) {
  state.bgBubbles.push({
    x: Math.random(),
    y: Math.random(),
    r: 3 + Math.random() * 6,
    speed: 0.0001 + Math.random() * 0.0002,
    alpha: 0.05 + Math.random() * 0.1,
  });
}

// === INPUT ===
function getPos(e) {
  const rect = canvas.getBoundingClientRect();
  const scaleX = canvas.width / rect.width;
  const scaleY = canvas.height / rect.height;
  if (e.touches) {
    return {
      x: (e.touches[0].clientX - rect.left) * scaleX,
      y: (e.touches[0].clientY - rect.top) * scaleY,
    };
  }
  return {
    x: (e.clientX - rect.left) * scaleX,
    y: (e.clientY - rect.top) * scaleY,
  };
}

canvas.addEventListener('mousemove', e => {
  const p = getPos(e);
  state.mouse.x = p.x;
  state.mouse.y = p.y;
});

canvas.addEventListener('click', e => {
  const p = getPos(e);
  state.mouse.x = p.x;
  state.mouse.y = p.y;
  handleClick(p.x, p.y);
});

canvas.addEventListener('touchstart', e => {
  e.preventDefault();
  const p = getPos(e);
  state.mouse.x = p.x;
  state.mouse.y = p.y;
  handleClick(p.x, p.y);
}, { passive: false });

canvas.addEventListener('touchmove', e => {
  e.preventDefault();
  const p = getPos(e);
  state.mouse.x = p.x;
  state.mouse.y = p.y;
}, { passive: false });

function handleClick(x, y) {
  if (state.phase === 'start' || state.phase === 'win') {
    startGame();
    return;
  }
  if (state.phase === 'roundEnd') {
    nextRound();
    state.combo = 0;
    return;
  }
  if (state.phase === 'playing' && !state.hammer.swinging) {
    triggerSwing();
  }
}

// === GAME LOGIC ===
function startGame() {
  state.phase = 'playing';
  state.round = 1;
  state.score = 0;
  state.combo = 0;
  state.maxCombo = 0;
  state.coolerHP = MAX_HP;
  state.coolerCracks = [];
  state.particles = [];
  state.waterDrops = [];
  state.floatingTexts = [];
}

function nextRound() {
  state.round++;
  state.coolerHP = MAX_HP;
  state.coolerCracks = [];
  state.particles = [];
  state.waterDrops = [];
  state.phase = 'playing';
}

function getCoolerRect() {
  const W = canvas.width, H = canvas.height;
  const cw = Math.min(W * 0.3, 110);
  const ch = cw * 1.5;
  return {
    x: W / 2 - cw / 2,
    y: H * 0.35 - ch / 2,
    w: cw,
    h: ch,
  };
}

function triggerSwing() {
  if (state.hammer.swinging) return;
  state.hammer.swinging = true;
  state.hammer.swingProgress = 0;
}

function isOverCooler(x, y) {
  const r = getCoolerRect();
  return x >= r.x && x <= r.x + r.w && y >= r.y && y <= r.y + r.h;
}

function spawnHitParticles(cx, cy, big) {
  const count = big ? 20 : 10;
  for (let i = 0; i < count; i++) {
    const angle = Math.random() * Math.PI * 2;
    const speed = big ? (3 + Math.random() * 6) : (1.5 + Math.random() * 3);
    state.particles.push({
      x: cx + (Math.random() - 0.5) * 30,
      y: cy + (Math.random() - 0.5) * 20,
      vx: Math.cos(angle) * speed,
      vy: Math.sin(angle) * speed - 2,
      life: 1,
      decay: 0.02 + Math.random() * 0.03,
      r: 2 + Math.random() * (big ? 6 : 3),
      color: `hsl(${200 + Math.random() * 30}, 80%, ${50 + Math.random() * 30}%)`,
      type: 'water',
    });
  }
  // Debris
  for (let i = 0; i < (big ? 8 : 4); i++) {
    state.particles.push({
      x: cx + (Math.random() - 0.5) * 20,
      y: cy,
      vx: (Math.random() - 0.5) * 4,
      vy: -(2 + Math.random() * 4),
      life: 1,
      decay: 0.015 + Math.random() * 0.02,
      r: 2 + Math.random() * 4,
      color: `hsl(${30 + Math.random() * 20}, 40%, 60%)`,
      type: 'debris',
    });
  }
}

function spawnWaterGush(cx, cy, intensity) {
  // intensity: 1 = small hit, 3 = massive gush
  const count = Math.floor(10 + intensity * 12);
  for (let i = 0; i < count; i++) {
    // Spray mostly upward and sideways from impact point
    const spreadAngle = (Math.random() - 0.5) * Math.PI * 1.4;
    const speed = (2 + Math.random() * 5) * (0.8 + intensity * 0.4);
    const angle = -Math.PI / 2 + spreadAngle; // mostly upward
    state.waterDrops.push({
      x: cx + (Math.random() - 0.5) * 20,
      y: cy + (Math.random() - 0.5) * 10,
      vx: Math.cos(angle) * speed,
      vy: Math.sin(angle) * speed,
      life: 1,
      decay: 0.008 + Math.random() * 0.012,
      r: 2 + Math.random() * (3 + intensity),
      color: `hsl(${200 + Math.random() * 20}, 90%, ${60 + Math.random() * 20}%)`,
    });
  }
  // Big arc streams for dramatic hits
  if (intensity >= 2) {
    for (let i = 0; i < 6; i++) {
      const sideDir = i % 2 === 0 ? 1 : -1;
      state.waterDrops.push({
        x: cx,
        y: cy,
        vx: sideDir * (3 + Math.random() * 4 * intensity),
        vy: -(6 + Math.random() * 4),
        life: 1,
        decay: 0.006 + Math.random() * 0.008,
        r: 4 + Math.random() * 4,
        color: `hsl(210, 95%, 65%)`,
      });
    }
  }
}

function addCrack() {
  const r = getCoolerRect();
  state.coolerCracks.push({
    x: r.x + r.w * (0.1 + Math.random() * 0.8),
    y: r.y + r.h * (0.1 + Math.random() * 0.8),
    len: 10 + Math.random() * 30,
    angle: Math.random() * Math.PI,
    branches: Math.floor(Math.random() * 3),
  });
}

function applyHit() {
  const damage = 8 + Math.floor(Math.random() * 6);
  const prevHP = state.coolerHP;
  state.coolerHP = Math.max(0, state.coolerHP - damage);
  state.combo++;
  if (state.combo > state.maxCombo) state.maxCombo = state.combo;

  const bonus = Math.min(state.combo, 10);
  const pts = (damage + bonus * 2) * state.round;
  state.score += pts;

  const r = getCoolerRect();
  const cx = r.x + r.w / 2;
  const cy = r.y + r.h * 0.4;

  addCrack();

  // Water gushes out on EVERY hit — intensity scales with damage + low HP
  const hpFrac = state.coolerHP / MAX_HP;
  const intensity = (1 - hpFrac) * 2 + (damage / 14) + (state.combo > 3 ? 0.5 : 0);
  // Spawn water from the tap area (lower part of cooler) and crack points
  const tapX = r.x + r.w * 0.3;
  const tapY = r.y + r.h * 0.6;
  spawnWaterGush(tapX, tapY, Math.min(intensity, 3));
  // Extra burst from upper bottle on heavy hits
  if (hpFrac < 0.7) {
    spawnWaterGush(r.x + r.w * 0.5, r.y + r.h * 0.25, Math.min(intensity * 0.6, 2));
  }
  playSplash();

  const big = state.coolerHP < 30;
  spawnHitParticles(cx + (Math.random()-0.5)*r.w*0.6, cy + (Math.random()-0.5)*r.h*0.4, big);

  // Shake
  state.coolerShake = big ? 18 : 10;
  state.screenShake.intensity = big ? 8 : 4;

  // Floating text
  const comboTxt = state.combo >= 3 ? ` x${state.combo}!` : '';
  state.floatingTexts.push({
    x: cx + (Math.random()-0.5)*60,
    y: r.y - 10,
    text: `+${pts}${comboTxt}`,
    life: 1,
    vy: -1.5,
    color: state.combo >= 5 ? '#ff6b35' : state.combo >= 3 ? '#ffd700' : '#ffffff',
    size: state.combo >= 3 ? 22 : 18,
  });

  playHit();

  if (state.coolerHP <= 0) {
    // Round over
    setTimeout(() => {
      if (state.round >= TOTAL_ROUNDS) {
        state.phase = 'win';
      } else {
        state.phase = 'roundEnd';
      }
    }, 800);
  }
}

// === UPDATE ===
function update(dt) {
  if (state.phase !== 'playing') return;

  // Hammer swing animation
  const h = state.hammer;
  if (h.swinging) {
    h.swingProgress += dt * 4.5; // speed
    if (h.swingProgress >= 1) {
      h.swingProgress = 1;
      h.swinging = false;
      // Check hit at peak
      // Hit is always applied (it's a committed swing)
      applyHit();
    }
  }

  // Cooler shake
  if (state.coolerShake > 0) state.coolerShake -= dt * 40;
  if (state.coolerShake < 0) state.coolerShake = 0;

  // Screen shake
  if (state.screenShake.intensity > 0) {
    state.screenShake.intensity -= dt * 20;
    state.screenShake.x = (Math.random()-0.5) * state.screenShake.intensity;
    state.screenShake.y = (Math.random()-0.5) * state.screenShake.intensity;
    if (state.screenShake.intensity < 0) {
      state.screenShake.intensity = 0;
      state.screenShake.x = 0;
      state.screenShake.y = 0;
    }
  }

  // Particles
  for (let i = state.particles.length - 1; i >= 0; i--) {
    const p = state.particles[i];
    p.x += p.vx * dt * 60;
    p.y += p.vy * dt * 60;
    p.vy += 0.15 * dt * 60;
    p.life -= p.decay * dt * 60;
    if (p.life <= 0) state.particles.splice(i, 1);
  }

  // Water drops
  for (let i = state.waterDrops.length - 1; i >= 0; i--) {
    const d = state.waterDrops[i];
    d.x += d.vx * dt * 60;
    d.y += d.vy * dt * 60;
    d.vy += 0.2 * dt * 60;
    d.life -= d.decay * dt * 60;
    if (d.life <= 0) state.waterDrops.splice(i, 1);
  }

  // Floating texts
  for (let i = state.floatingTexts.length - 1; i >= 0; i--) {
    const t = state.floatingTexts[i];
    t.y += t.vy * dt * 60;
    t.life -= 0.018 * dt * 60;
    if (t.life <= 0) state.floatingTexts.splice(i, 1);
  }

  // BG bubbles
  for (const b of state.bgBubbles) {
    b.y -= b.speed * dt * 60;
    if (b.y < -0.05) b.y = 1.05;
  }
}

// === DRAW ===
function draw() {
  const W = canvas.width, H = canvas.height;
  ctx.save();
  ctx.translate(state.screenShake.x, state.screenShake.y);

  // Background gradient
  const grad = ctx.createLinearGradient(0, 0, 0, H);
  grad.addColorStop(0, '#0d1b2a');
  grad.addColorStop(1, '#1a3a5c');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, W, H);

  // Floor
  ctx.fillStyle = '#0a2540';
  ctx.fillRect(0, H * 0.75, W, H * 0.25);
  ctx.fillStyle = '#0d2e4d';
  ctx.fillRect(0, H * 0.75, W, 6);

  // BG bubbles
  for (const b of state.bgBubbles) {
    ctx.beginPath();
    ctx.arc(b.x * W, b.y * H, b.r, 0, Math.PI * 2);
    ctx.fillStyle = `rgba(100, 200, 255, ${b.alpha})`;
    ctx.fill();
  }

  if (state.phase === 'start') {
    drawStartScreen(W, H);
  } else if (state.phase === 'playing' || state.phase === 'roundEnd' || state.phase === 'win') {
    drawGame(W, H);
    if (state.phase === 'roundEnd') drawRoundEndOverlay(W, H);
    if (state.phase === 'win') drawWinOverlay(W, H);
  }

  ctx.restore();
}

function drawStartScreen(W, H) {
  // Title
  ctx.textAlign = 'center';
  ctx.font = `bold ${Math.floor(W * 0.1)}px 'Segoe UI', sans-serif`;
  ctx.fillStyle = '#fff';
  ctx.shadowColor = '#4af';
  ctx.shadowBlur = 20;
  ctx.fillText('SMASH IT!', W/2, H * 0.25);
  ctx.shadowBlur = 0;

  ctx.font = `${Math.floor(W * 0.05)}px 'Segoe UI', sans-serif`;
  ctx.fillStyle = '#a0d8f0';
  ctx.fillText('🔨 Hammer vs Water Cooler 💧', W/2, H * 0.33);

  // Draw cooler preview
  const r = getCoolerRect();
  drawCooler(r, 0, []);

  // Instructions
  ctx.font = `${Math.floor(W * 0.042)}px 'Segoe UI', sans-serif`;
  ctx.fillStyle = '#ffffffcc';
  ctx.fillText('Click / Tap to SMASH', W/2, H * 0.72);
  ctx.font = `${Math.floor(W * 0.035)}px 'Segoe UI', sans-serif`;
  ctx.fillStyle = '#88bbdd';
  ctx.fillText('3 coolers to destroy • Build combos for bonus points', W/2, H * 0.79);

  // Pulse button
  const pulse = 0.95 + 0.05 * Math.sin(Date.now() / 300);
  ctx.save();
  ctx.translate(W/2, H * 0.88);
  ctx.scale(pulse, pulse);
  ctx.beginPath();
  ctx.roundRect(-90, -22, 180, 44, 22);
  ctx.fillStyle = '#2196f3';
  ctx.fill();
  ctx.font = `bold ${Math.floor(W * 0.055)}px 'Segoe UI', sans-serif`;
  ctx.fillStyle = '#fff';
  ctx.fillText('START', 0, 10);
  ctx.restore();
}

function drawGame(W, H) {
  const r = getCoolerRect();
  const shake = state.coolerShake > 0 ? (Math.random()-0.5)*state.coolerShake*0.5 : 0;

  // Water on floor if HP < 60
  if (state.coolerHP < 60) {
    const puddle = (1 - state.coolerHP / 60);
    const pw = r.w * (0.6 + puddle * 1.2);
    const ph = 8 + puddle * 12;
    const px = r.x + r.w/2 - pw/2;
    const py = H * 0.75 - ph/2;
    const pg = ctx.createRadialGradient(r.x+r.w/2, py, 0, r.x+r.w/2, py, pw/2);
    pg.addColorStop(0, `rgba(30, 144, 255, ${0.4 * puddle})`);
    pg.addColorStop(1, 'rgba(30, 144, 255, 0)');
    ctx.beginPath();
    ctx.ellipse(r.x+r.w/2, py, pw/2, ph/2, 0, 0, Math.PI*2);
    ctx.fillStyle = pg;
    ctx.fill();
  }

  // Water drops — draw as streaks in direction of travel
  for (const d of state.waterDrops) {
    ctx.globalAlpha = d.life * 0.85;
    const speed = Math.sqrt(d.vx * d.vx + d.vy * d.vy);
    const trailLen = Math.min(speed * 1.8, 18);
    if (trailLen > 2) {
      const nx = d.vx / speed;
      const ny = d.vy / speed;
      const grd = ctx.createLinearGradient(
        d.x - nx * trailLen, d.y - ny * trailLen,
        d.x, d.y
      );
      grd.addColorStop(0, 'rgba(100,200,255,0)');
      grd.addColorStop(1, d.color || '#4af');
      ctx.strokeStyle = grd;
      ctx.lineWidth = d.r * d.life * 1.2;
      ctx.lineCap = 'round';
      ctx.beginPath();
      ctx.moveTo(d.x - nx * trailLen, d.y - ny * trailLen);
      ctx.lineTo(d.x, d.y);
      ctx.stroke();
    }
    ctx.beginPath();
    ctx.arc(d.x, d.y, d.r * d.life, 0, Math.PI * 2);
    ctx.fillStyle = d.color || '#4af';
    ctx.fill();
    ctx.globalAlpha = 1;
  }

  // Cooler
  ctx.save();
  ctx.translate(shake, 0);
  drawCooler(r, state.coolerHP, state.coolerCracks);
  ctx.restore();

  // Particles
  for (const p of state.particles) {
    ctx.globalAlpha = p.life;
    ctx.beginPath();
    ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
    ctx.fillStyle = p.color;
    ctx.fill();
  }
  ctx.globalAlpha = 1;

  // Floating texts
  for (const t of state.floatingTexts) {
    ctx.globalAlpha = t.life;
    ctx.font = `bold ${t.size}px 'Segoe UI', sans-serif`;
    ctx.textAlign = 'center';
    ctx.fillStyle = t.color;
    ctx.shadowColor = 'rgba(0,0,0,0.7)';
    ctx.shadowBlur = 4;
    ctx.fillText(t.text, t.x, t.y);
    ctx.shadowBlur = 0;
  }
  ctx.globalAlpha = 1;

  // Hammer
  drawHammer(W, H);

  // HUD
  drawHUD(W, H);
}

function drawCooler(r, hp, cracks) {
  const hpFrac = hp / MAX_HP;
  // Lean if very damaged
  const lean = hp <= 0 ? 0.15 : (1 - hpFrac) * 0.08;

  ctx.save();
  ctx.translate(r.x + r.w/2, r.y + r.h);
  ctx.rotate(lean);
  ctx.translate(-(r.x + r.w/2), -(r.y + r.h));

  if (coolerImg.complete && coolerImg.naturalWidth > 0) {
    // Tint red when damaged
    if (hpFrac < 0.3) {
      ctx.globalAlpha = 0.3;
      ctx.fillStyle = '#ff4444';
      ctx.fillRect(r.x, r.y, r.w, r.h);
      ctx.globalAlpha = 1;
    }
    ctx.drawImage(coolerImg, r.x, r.y, r.w, r.h);
  } else {
    // Fallback drawn cooler
    drawFallbackCooler(r, hpFrac);
  }

  // Draw cracks
  ctx.strokeStyle = 'rgba(0,0,0,0.7)';
  ctx.lineWidth = 1.5;
  for (const c of cracks) {
    ctx.beginPath();
    ctx.moveTo(c.x, c.y);
    ctx.lineTo(c.x + Math.cos(c.angle)*c.len, c.y + Math.sin(c.angle)*c.len);
    ctx.stroke();
    for (let b = 0; b < c.branches; b++) {
      const ba = c.angle + (Math.random()-0.5)*1.2;
      ctx.beginPath();
      ctx.moveTo(c.x + Math.cos(c.angle)*c.len*0.5, c.y + Math.sin(c.angle)*c.len*0.5);
      ctx.lineTo(c.x + Math.cos(ba)*c.len*0.4 + Math.cos(c.angle)*c.len*0.5,
                 c.y + Math.sin(ba)*c.len*0.4 + Math.sin(c.angle)*c.len*0.5);
      ctx.stroke();
    }
  }

  ctx.restore();
}

function drawFallbackCooler(r, hpFrac) {
  // Body
  ctx.fillStyle = hpFrac < 0.3 ? '#cc4444' : '#e0e8f0';
  ctx.beginPath();
  ctx.roundRect(r.x, r.y + r.h*0.2, r.w, r.h*0.8, 6);
  ctx.fill();
  // Bottle
  ctx.fillStyle = `rgba(30, 144, 255, ${0.3 + hpFrac * 0.5})`;
  ctx.beginPath();
  ctx.roundRect(r.x + r.w*0.2, r.y, r.w*0.6, r.h*0.35, 8);
  ctx.fill();
  // Tap
  ctx.fillStyle = '#4af';
  ctx.fillRect(r.x + r.w*0.1, r.y + r.h*0.55, r.w*0.2, r.h*0.08);
}

function drawHammer(W, H) {
  const h = state.hammer;
  // Pivot near mouse, arm extends up-left
  const px = state.mouse.x;
  const py = state.mouse.y;

  // Swing: progress 0→1, arc from raised to smashing down
  let angle;
  if (h.swinging) {
    // Ease in-out swing: raise then strike
    const t = h.swingProgress;
    if (t < 0.3) {
      // Windup: go back further
      angle = -1.2 - (t / 0.3) * 0.5;
    } else {
      // Strike fast
      const st = (t - 0.3) / 0.7;
      angle = -1.7 + st * 2.4;
    }
  } else {
    angle = -0.9;
  }

  const armLen = Math.min(W, H) * 0.28;
  const hx = px + Math.cos(angle + Math.PI/2) * armLen * 0.3;
  const hy = py + Math.sin(angle + Math.PI/2) * armLen * 0.3;

  ctx.save();
  ctx.translate(px, py);
  ctx.rotate(angle);

  // Handle
  ctx.strokeStyle = '#8B6914';
  ctx.lineWidth = 8;
  ctx.lineCap = 'round';
  ctx.beginPath();
  ctx.moveTo(0, 0);
  ctx.lineTo(0, -armLen);
  ctx.stroke();

  // Draw hammer image at head position
  if (hammerImg.complete && hammerImg.naturalWidth > 0) {
    const sz = armLen * 0.7;
    ctx.drawImage(hammerImg, -sz/2, -armLen - sz * 0.4, sz, sz);
  } else {
    // Fallback
    ctx.fillStyle = '#8B4513';
    ctx.fillRect(-18, -armLen - 22, 36, 22);
    ctx.fillStyle = '#888';
    ctx.fillRect(-14, -armLen - 40, 28, 20);
  }

  ctx.restore();
}

function drawHUD(W, H) {
  // HP bar
  const barW = W * 0.7;
  const barH = 18;
  const barX = W/2 - barW/2;
  const barY = H * 0.1;

  ctx.fillStyle = 'rgba(0,0,0,0.4)';
  ctx.beginPath();
  ctx.roundRect(barX-2, barY-2, barW+4, barH+4, barH/2);
  ctx.fill();

  ctx.fillStyle = '#1a1a2e';
  ctx.beginPath();
  ctx.roundRect(barX, barY, barW, barH, barH/2);
  ctx.fill();

  const frac = state.coolerHP / MAX_HP;
  const hpColor = frac > 0.6 ? '#4caf50' : frac > 0.3 ? '#ff9800' : '#f44336';
  const hpGrad = ctx.createLinearGradient(barX, 0, barX + barW*frac, 0);
  hpGrad.addColorStop(0, hpColor);
  hpGrad.addColorStop(1, hpColor + 'aa');
  ctx.fillStyle = hpGrad;
  ctx.beginPath();
  ctx.roundRect(barX, barY, barW * frac, barH, barH/2);
  ctx.fill();

  ctx.textAlign = 'center';
  ctx.font = `bold 11px 'Segoe UI', sans-serif`;
  ctx.fillStyle = '#fff';
  ctx.fillText(`${Math.ceil(state.coolerHP)} HP`, W/2, barY + 13);

  // Score
  ctx.textAlign = 'left';
  ctx.font = `bold ${Math.floor(W*0.05)}px 'Segoe UI', sans-serif`;
  ctx.fillStyle = '#ffd700';
  ctx.shadowColor = 'rgba(0,0,0,0.5)';
  ctx.shadowBlur = 4;
  ctx.fillText(`${state.score}`, 12, 28);
  ctx.shadowBlur = 0;

  // Round
  ctx.textAlign = 'right';
  ctx.font = `bold ${Math.floor(W*0.045)}px 'Segoe UI', sans-serif`;
  ctx.fillStyle = '#fff';
  ctx.fillText(`Round ${state.round}/${TOTAL_ROUNDS}`, W - 12, 28);

  // Combo
  if (state.combo >= 2) {
    const comboAlpha = Math.min(1, state.combo / 5);
    ctx.textAlign = 'center';
    ctx.font = `bold ${Math.floor(W*0.06 + state.combo*1.5)}px 'Segoe UI', sans-serif`;
    ctx.fillStyle = state.combo >= 5 ? `rgba(255,100,30,${comboAlpha})` : `rgba(255,215,0,${comboAlpha})`;
    ctx.shadowColor = state.combo >= 5 ? '#ff6600' : '#ffd700';
    ctx.shadowBlur = 10;
    ctx.fillText(`COMBO x${state.combo}`, W/2, H * 0.88);
    ctx.shadowBlur = 0;
  }

  // Hint
  if (!state.hammer.swinging && state.coolerHP > 0) {
    ctx.textAlign = 'center';
    ctx.font = `${Math.floor(W*0.032)}px 'Segoe UI', sans-serif`;
    ctx.fillStyle = 'rgba(255,255,255,0.4)';
    ctx.fillText('Click / Tap to swing!', W/2, H * 0.95);
  }
}

function drawRoundEndOverlay(W, H) {
  ctx.fillStyle = 'rgba(0,0,10,0.7)';
  ctx.fillRect(0, 0, W, H);
  ctx.textAlign = 'center';
  ctx.font = `bold ${Math.floor(W*0.11)}px 'Segoe UI', sans-serif`;
  ctx.fillStyle = '#4caf50';
  ctx.shadowColor = '#4caf50';
  ctx.shadowBlur = 20;
  ctx.fillText('SMASHED!', W/2, H*0.36);
  ctx.shadowBlur = 0;

  ctx.font = `${Math.floor(W*0.05)}px 'Segoe UI', sans-serif`;
  ctx.fillStyle = '#ffd700';
  ctx.fillText(`Score: ${state.score}`, W/2, H*0.47);

  ctx.font = `${Math.floor(W*0.038)}px 'Segoe UI', sans-serif`;
  ctx.fillStyle = '#aaa';
  ctx.fillText(`Max Combo: x${state.maxCombo}`, W/2, H*0.55);

  const pulse = 0.95 + 0.05 * Math.sin(Date.now() / 300);
  ctx.save();
  ctx.translate(W/2, H*0.7);
  ctx.scale(pulse, pulse);
  ctx.beginPath();
  ctx.roundRect(-100, -24, 200, 48, 24);
  ctx.fillStyle = '#2196f3';
  ctx.fill();
  ctx.font = `bold ${Math.floor(W*0.055)}px 'Segoe UI', sans-serif`;
  ctx.fillStyle = '#fff';
  ctx.fillText(`Next Round →`, 0, 12);
  ctx.restore();
}

function drawWinOverlay(W, H) {
  ctx.fillStyle = 'rgba(0,0,10,0.75)';
  ctx.fillRect(0, 0, W, H);
  ctx.textAlign = 'center';

  ctx.font = `bold ${Math.floor(W*0.1)}px 'Segoe UI', sans-serif`;
  ctx.fillStyle = '#ffd700';
  ctx.shadowColor = '#ffd700';
  ctx.shadowBlur = 30;
  ctx.fillText('YOU WIN!', W/2, H*0.28);
  ctx.shadowBlur = 0;

  ctx.font = `${Math.floor(W*0.05)}px 'Segoe UI', sans-serif`;
  ctx.fillStyle = '#fff';
  ctx.fillText('All 3 coolers destroyed!', W/2, H*0.38);

  ctx.font = `bold ${Math.floor(W*0.07)}px 'Segoe UI', sans-serif`;
  ctx.fillStyle = '#ffd700';
  ctx.fillText(`Final Score: ${state.score}`, W/2, H*0.5);

  ctx.font = `${Math.floor(W*0.042)}px 'Segoe UI', sans-serif`;
  ctx.fillStyle = '#aaa';
  ctx.fillText(`Best Combo: x${state.maxCombo}`, W/2, H*0.59);

  const pulse = 0.95 + 0.05 * Math.sin(Date.now() / 300);
  ctx.save();
  ctx.translate(W/2, H*0.73);
  ctx.scale(pulse, pulse);
  ctx.beginPath();
  ctx.roundRect(-90, -24, 180, 48, 24);
  ctx.fillStyle = '#ff9800';
  ctx.fill();
  ctx.font = `bold ${Math.floor(W*0.055)}px 'Segoe UI', sans-serif`;
  ctx.fillStyle = '#fff';
  ctx.fillText('Play Again', 0, 12);
  ctx.restore();
}

// === LOOP ===
function loop(ts) {
  const dt = Math.min((ts - state.lastTime) / 1000, 0.05);
  state.lastTime = ts;

  // Reset combo if not swinging and not recently swinging
  // (combo resets when cooler is destroyed/round ends, not on pause)

  update(dt);
  draw();
  requestAnimationFrame(loop);
}

// (roundEnd handled in handleClick above)

function startLoop() {
  requestAnimationFrame(ts => {
    state.lastTime = ts;
    requestAnimationFrame(loop);
  });
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', startLoop);
} else {
  startLoop();
}
