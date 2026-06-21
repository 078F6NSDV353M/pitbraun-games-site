function createBubblesDom() {
  const gameRoot = document.getElementById('gameRoot');

  if (!gameRoot) {
    throw new Error('Bubbles: #gameRoot was not found.');
  }

  gameRoot.innerHTML = `
    <canvas id="gameCanvas"></canvas>

    <button class="bubblesSoundButton" id="bubblesSoundButton" type="button" aria-label="Toggle sound">
      <i data-lucide="volume-2"></i>
    </button>

    <div class="hud">
      <div class="hudBox" style="text-align:center;">
        <div class="hudLabel">Score</div>
        <div class="hudValue" id="scoreText">0</div>
      </div>

      <div class="hudBox" style="text-align:center;">
        <div class="hudLabel">Max Score</div>
        <div class="hudValue" id="maxScoreText">0</div>
      </div>

      <div class="hudBox" style="text-align:center;">
        <div class="hudLabel">Combo</div>
        <div class="hudValue" id="comboText">x1</div>
      </div>
    </div>

    <div class="centerPanel" id="menuPanel">
      <div class="card">
        <h1>
          <span class="titleLetter titleCyan">B</span>
          <span class="titleLetter titleYellow">U</span>
          <span class="titleLetter titlePink">B</span>
          <span class="titleLetter titleGreen">B</span>
          <span class="titleLetter titleCyan">L</span>
          <span class="titleLetter titleYellow">E</span>
          <span class="titleLetter titlePink">S</span>
        </h1>

        <p>
          Tap the screen. Match the color and split the big balls into pieces.
        </p>

        <button class="button" id="startButton">START</button>
      </div>
    </div>

    <div class="controlBar"></div>

    <div class="hint hidden">Tap to shoot.</div>

    <button class="pauseButton" id="pauseButton" aria-label="Pause game">
      <div class="pauseBars"><span></span><span></span></div>
      <div class="pausePlay"></div>
    </button>

    <div class="buildVersion">Build v117</div>
  `;
}

createBubblesDom();

const canvas = document.getElementById('gameCanvas');
const bubblesSoundButton = document.getElementById('bubblesSoundButton');
const ctx = canvas.getContext('2d');
const scoreText = document.getElementById('scoreText');
const comboText = document.getElementById('comboText');
const maxScoreText = document.getElementById('maxScoreText');
const menuPanel = document.getElementById('menuPanel');
const startButton = document.getElementById('startButton');
const pauseButton = document.getElementById('pauseButton');

const COLORS = [
  { name: 'cyan', value: '#00e5ff' },
  { name: 'yellow', value: '#fff35c' },
  { name: 'pink', value: '#ff3df2' },
  { name: 'green', value: '#4dff88' }
];

const GAME_WIDTH = 900;
const GAME_HEIGHT = 1200;

let width = GAME_WIDTH;
let height = GAME_HEIGHT;
let viewWidth = 0;
let viewHeight = 0;
let dpr = 1;
let running = false;
let paused = false;
let lastTime = 0;
let score = 0;
let maxScore = Number(localStorage.getItem('bubblesMaxScore')) || 0;
let combo = 1;
let activeColor = 0;
let spawnTimer = 0;
let shake = 0;
let wheelCenterX = 0;
let wheelCenterY = 0;
let wheelRadius = 0;
let isChoosingColor = false;
let audioContext = null;
let uiScale = 1;
let showKeyboardLabels = false;

const SOUND_ENABLED_KEY = 'bubbles_sound_enabled';
let soundEnabled = localStorage.getItem(SOUND_ENABLED_KEY) !== '0';

const player = {
  x: 0,
  y: 0,
  radius: 24
};

const shots = [];
const enemies = [];
const particles = [];
const floatingTexts = [];

function resize() {
  showKeyboardLabels = shouldShowKeyboardLabels();
  dpr = Math.min(window.devicePixelRatio || 1, 2);
  const rect = canvas.parentElement.getBoundingClientRect();
  if (rect.width <= 0 || rect.height <= 0) return;
  viewWidth = rect.width;
  viewHeight = rect.height;
  width = GAME_WIDTH;
  height = GAME_HEIGHT;
  canvas.width = Math.floor(viewWidth * dpr);
  canvas.height = Math.floor(viewHeight * dpr);
  canvas.style.width = viewWidth + 'px';
  canvas.style.height = viewHeight + 'px';
  uiScale = Math.min(viewWidth / GAME_WIDTH, viewHeight / GAME_HEIGHT);
  ctx.setTransform(dpr * uiScale, 0, 0, dpr * uiScale, 0, 0);
  canvas.parentElement.style.setProperty('--game-scale', uiScale);
  player.radius = scaleValue(24);
  player.x = width / 2;
  player.y = height - scaleValue(136);
  wheelCenterX = player.x;
  wheelCenterY = height - scaleValue(1);
  wheelRadius = scaleValue(150);
}

function resetGame() {
  maxScoreText.textContent = maxScore;
  score = 0;
  combo = 1;
  activeColor = 0;
  spawnTimer = 0;
  shake = 0;
  shots.length = 0;
  enemies.length = 0;
  particles.length = 0;
  floatingTexts.length = 0;
  scoreText.textContent = '0';
  comboText.textContent = 'x1';
  spawnEnemy(true);
  spawnEnemy(true);
  spawnEnemy(true);
}

async function startGame() {
  initAudio();
  playStartSound();
  resetGame();
  paused = false;
  updatePauseButton();
  running = true;
  menuPanel.classList.add('hidden');
  lastTime = performance.now();
  requestAnimationFrame(loop);
}

function togglePause() {
  if (!running) return;

  paused = !paused;
  updatePauseButton();

  if (!paused) {
    lastTime = performance.now();
    requestAnimationFrame(loop);
  }
}

function updatePauseButton() {
  pauseButton.classList.toggle('isPaused', paused);
  pauseButton.setAttribute(
    'aria-label',
    paused ? 'Resume game' : 'Pause game'
  );
}

function gameOver() {
  running = false;
  paused = false;
  updatePauseButton();
  playGameOverSound();

  menuPanel.classList.remove('hidden');

  const title = menuPanel.querySelector('h1');

  title.textContent = 'GAME OVER';

  title.style.display = 'block';
  title.style.textAlign = 'center';
  title.style.width = '100%';

  title.style.letterSpacing = '-0.03em';
  title.style.transform = 'translateX(-2px)';

  menuPanel.querySelector('p').innerHTML =
    'Score: ' + score + '<br><br>Try again and keep the combo.';

  startButton.textContent = 'RESTART';
}

function spawnEnemy(initial = false) {
  const colorIndex = Math.floor(Math.random() * COLORS.length);
  const radius = initial
    ? scaleValue(random(34, 48))
    : scaleValue(random(28, 50));
  const position = findSpawnPosition(radius, initial);

  enemies.push({
    x: position.x,
    y: position.y,
    radius,
    colorIndex,
    speed: (random(11.8404, 20.12868) + score * 0.0012) * Math.pow(radius / 24, 2.35),
    wobble: random(0, Math.PI * 2),
    hp: radius > scaleValue(46) ? 2 : 1
  });
}

function findSpawnPosition(radius, initial) {
  const minY = initial ? 92 : -radius - 20;
  const maxY = initial ? height * 0.32 : -radius - 20;

  for (let attempt = 0; attempt < 24; attempt++) {
    const x = random(radius + 18, width - radius - 18);
    const y = initial ? random(minY, maxY) : minY;
    let overlaps = false;

    for (const enemy of enemies) {
      const safeDistance = radius + enemy.radius + scaleValue(18);
      if (Math.hypot(x - enemy.x, y - enemy.y) < safeDistance) {
        overlaps = true;
        break;
      }
    }

    if (!overlaps) return { x, y };
  }

  return {
    x: random(radius + scaleValue(18), width - radius - scaleValue(18)),
    y: initial ? random(minY, maxY) : minY
  };
}

function shoot(targetX, targetY) {
  if (!running || paused) return;

  playShootSound();

  const dx = targetX - player.x;
  const dy = targetY - player.y;
  const length = Math.max(Math.hypot(dx, dy), 1);
  const speed = 912;

  shots.push({
    x: player.x,
    y: player.y,
    vx: dx / length * speed,
    vy: dy / length * speed,
    radius: scaleValue(8),
    colorIndex: activeColor,
    life: 2.2,
    ignoreEnemy: null,
    ignoreTime: 0
  });
}

function splitEnemy(enemy) {
  playPopSound(enemy.radius);

  const color = COLORS[enemy.colorIndex].value;
  const points = Math.round(enemy.radius * combo);
  score += points;
  combo = Math.min(combo + 1, 12);
  scoreText.textContent = score;
  if (score > maxScore) {
    maxScore = score;
    localStorage.setItem('bubblesMaxScore', String(maxScore));
    maxScoreText.textContent = maxScore;
  }
  comboText.textContent = 'x' + combo;
  shake = 10;

  floatingTexts.push({
    x: enemy.x,
    y: enemy.y,
    text: '+' + points,
    color,
    life: 0.8
  });

  for (let i = 0; i < 22; i++) {
    const angle = random(0, Math.PI * 2);
    const speed = random(80, 280);
    particles.push({
      x: enemy.x,
      y: enemy.y,
      vx: Math.cos(angle) * speed,
      vy: Math.sin(angle) * speed,
      radius: scaleValue(random(2, 6)),
      color,
      life: random(0.28, 0.72)
    });
  }

  if (enemy.radius > scaleValue(38)) {
    const count = 2;
    const childRadius = Math.max(scaleValue(18), enemy.radius * 0.46);
    const spread = enemy.radius * 0.72;

    for (let i = 0; i < count; i++) {
      const direction = i === 0 ? -1 : 1;
      enemies.push({
        x: Math.max(
          childRadius + scaleValue(14),
          Math.min(width - childRadius - scaleValue(14), enemy.x + direction * spread)
        ),
        y: enemy.y + random(-8, 8),
        radius: childRadius,
        colorIndex: enemy.colorIndex,
        speed: (random(11.8404, 20.12868) + score * 0.0012) * Math.pow(childRadius / 24, 2.35),
        wobble: random(0, Math.PI * 2),
        hp: 1
      });
    }
  }
}

function wrongHit(enemy) {
  playWrongHitSound();
  combo = 1;
  comboText.textContent = 'x1';
  enemy.radius = Math.min(enemy.radius + scaleValue(8), scaleValue(76));
  enemy.speed += 0.5;
  shake = 6;

  for (let i = 0; i < 10; i++) {
    const angle = random(0, Math.PI * 2);
    particles.push({
      x: enemy.x,
      y: enemy.y,
      vx: Math.cos(angle) * random(40, 150),
      vy: Math.sin(angle) * random(40, 150),
      radius: scaleValue(random(2, 4)),
      color: '#ffffff',
      life: random(0.16, 0.34)
    });
  }
}

function ricochetShot(shot, enemy) {
  let nx = shot.x - enemy.x;
  let ny = shot.y - enemy.y;
  let normalLength = Math.hypot(nx, ny);

  if (normalLength < 0.001) {
    nx = -shot.vx;
    ny = -shot.vy;
    normalLength = Math.hypot(nx, ny);
  }

  nx /= normalLength;
  ny /= normalLength;

  const dot = shot.vx * nx + shot.vy * ny;
  shot.vx = shot.vx - 2 * dot * nx;
  shot.vy = shot.vy - 2 * dot * ny;

  const pushDistance = enemy.radius + shot.radius + 2;
  shot.x = enemy.x + nx * pushDistance;
  shot.y = enemy.y + ny * pushDistance;
  shot.ignoreEnemy = enemy;
  shot.ignoreTime = 0.08;
}

function update(dt) {
  spawnTimer -= dt;
  if (spawnTimer <= 0) {
    spawnEnemy(false);
    spawnTimer = Math.max(1.5057495, 2.5095825 - score * 0.00003);
  }

  for (let i = shots.length - 1; i >= 0; i--) {
    const shot = shots[i];
    shot.x += shot.vx * dt;
    shot.y += shot.vy * dt;
    shot.life -= dt;
    shot.ignoreTime = Math.max(0, shot.ignoreTime - dt);

    if (shot.ignoreTime <= 0) {
      shot.ignoreEnemy = null;
    }

    if (shot.life <= 0 || shot.x < -40 || shot.x > width + 40 || shot.y < -60 || shot.y > height + 60) {
      shots.splice(i, 1);
    }
  }

  for (let i = enemies.length - 1; i >= 0; i--) {
    const enemy = enemies[i];
    enemy.wobble += dt * 2;
    enemy.y += enemy.speed * dt;
    enemy.x += Math.sin(enemy.wobble) * 18 * dt;

    if (enemy.y + enemy.radius >= height - scaleValue(102)) {
      gameOver();
      return;
    }
  }

  for (let j = shots.length - 1; j >= 0; j--) {
    const shot = shots[j];
    let hit = null;

    for (let i = enemies.length - 1; i >= 0; i--) {
      const enemy = enemies[i];

      if (shot.ignoreEnemy === enemy && shot.ignoreTime > 0) {
        continue;
      }

      const distance = Math.hypot(enemy.x - shot.x, enemy.y - shot.y);

      if (distance < enemy.radius + shot.radius) {
        const candidate = { enemy, index: i, distance };

        if (!hit || distance < hit.distance) {
          hit = candidate;
        }
      }
    }

    if (!hit) continue;

    if (shot.colorIndex === hit.enemy.colorIndex) {
      shots.splice(j, 1);
      hit.enemy.hp -= 1;

      if (hit.enemy.hp <= 0) {
        enemies.splice(hit.index, 1);
        splitEnemy(hit.enemy);
      } else {
        playShieldHitSound();
      }
    } else {
      wrongHit(hit.enemy);
      ricochetShot(shot, hit.enemy);
    }
  }

  for (let i = particles.length - 1; i >= 0; i--) {
    const p = particles[i];
    p.x += p.vx * dt;
    p.y += p.vy * dt;
    p.vx *= 0.98;
    p.vy *= 0.98;
    p.life -= dt;
    if (p.life <= 0) particles.splice(i, 1);
  }

  for (let i = floatingTexts.length - 1; i >= 0; i--) {
    const t = floatingTexts[i];
    t.y -= 52 * dt;
    t.life -= dt;
    if (t.life <= 0) floatingTexts.splice(i, 1);
  }

  shake = Math.max(0, shake - 38 * dt);
}

function draw() {
  ctx.clearRect(0, 0, width, height);

  const sx = shake ? random(-shake, shake) : 0;
  const sy = shake ? random(-shake, shake) : 0;
  ctx.save();
  ctx.translate(sx, sy);

  drawGrid();
  drawEnemies();
  drawShots();
  drawParticles();
  drawPlayer();
  drawGameOverLine();
  drawColorButtons();
  drawKeyboardHint();
  drawFloatingTexts();

  ctx.restore();
}

function drawGrid() {
  ctx.save();
  ctx.globalAlpha = 0.13;
  ctx.strokeStyle = '#ffffff';
  ctx.lineWidth = 1;
  const gap = scaleValue(34);

  for (let y = height % gap; y < height; y += gap) {
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.lineTo(width, y);
    ctx.stroke();
  }

  const offsetX = (width * 0.5) % gap;

  for (let x = offsetX; x < width; x += gap) {
    ctx.beginPath();
    ctx.moveTo(x, 0);
    ctx.lineTo(x, height);
    ctx.stroke();
  }

  ctx.restore();
}

function drawGlowCircle(x, y, radius, color) {
  ctx.save();
  ctx.shadowColor = color;
  ctx.shadowBlur = radius * 0.72;
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.arc(x, y, radius, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();

  ctx.save();
  ctx.globalAlpha = 0.25;
  ctx.fillStyle = '#ffffff';
  ctx.beginPath();
  ctx.arc(x - radius * 0.28, y - radius * 0.32, radius * 0.28, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

function drawEnemies() {
  for (const enemy of enemies) {
    const color = COLORS[enemy.colorIndex].value;
    drawGlowCircle(enemy.x, enemy.y, enemy.radius, color);

    if (enemy.hp > 1) {
      ctx.save();
      ctx.strokeStyle = 'rgba(255,255,255,0.7)';
      ctx.lineWidth = scaleValue(3);
      ctx.beginPath();
      ctx.arc(enemy.x, enemy.y, enemy.radius - scaleValue(8), 0, Math.PI * 2);
      ctx.stroke();
      ctx.restore();
    }
  }
}

function drawShots() {
  for (const shot of shots) {
    const color = COLORS[shot.colorIndex].value;
    ctx.save();
    ctx.strokeStyle = color;
    ctx.globalAlpha = 0.44;
    ctx.lineWidth = scaleValue(4);
    ctx.beginPath();
    ctx.moveTo(shot.x, shot.y);
    ctx.lineTo(shot.x - shot.vx * 0.035, shot.y - shot.vy * 0.035);
    ctx.stroke();
    ctx.restore();
    drawGlowCircle(shot.x, shot.y, shot.radius, color);
  }
}

function drawParticles() {
  for (const p of particles) {
    ctx.save();
    ctx.globalAlpha = Math.max(p.life, 0);
    ctx.fillStyle = p.color;
    ctx.beginPath();
    ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }
}

function drawPlayer() {
  const color = COLORS[activeColor].value;
  drawGlowCircle(player.x, player.y, player.radius, color);

  ctx.save();
  ctx.fillStyle = '#071018';
  ctx.beginPath();
  ctx.arc(player.x, player.y, scaleValue(11), 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

function drawGameOverLine() {
  const y = height - scaleValue(102);

  ctx.save();
  ctx.globalAlpha = 0.5;
  ctx.strokeStyle = '#ffffff';
  ctx.lineWidth = scaleValue(3);
  ctx.setLineDash([scaleValue(12), scaleValue(10)]);
  ctx.beginPath();
  ctx.moveTo(0, y);
  ctx.lineTo(width, y);
  ctx.stroke();
  ctx.restore();
}

function drawColorButtons() {

  for (let i = 0; i < COLORS.length; i++) {
    const point = getColorWheelPoint(i);
    const radius = scaleValue(67.5);
    drawGlowCircle(point.x, point.y, radius, COLORS[i].value);


    if (i === activeColor) {
      ctx.save();
      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = scaleValue(3);
      ctx.beginPath();
      ctx.arc(point.x, point.y, radius + scaleValue(11), 0, Math.PI * 2);
      ctx.stroke();
      ctx.restore();
    }
  }
}

function drawKeyboardHint() {
  if (running || !showKeyboardLabels) return;

  const centerX = player.x;
  const centerY = player.y - scaleValue(101);
  const boxWidth = scaleValue(620);
  const boxHeight = scaleValue(138);
  const left = centerX - boxWidth * 0.5;
  const top = centerY - boxHeight * 0.5;

  ctx.save();
  ctx.shadowColor = 'rgba(0,0,0,0.78)';
  ctx.shadowBlur = scaleValue(18);
  ctx.shadowOffsetY = scaleValue(6);

  ctx.fillStyle = 'rgba(8,10,18,0.34)';
  ctx.strokeStyle = 'rgba(255,255,255,0.28)';
  ctx.lineWidth = scaleValue(2);
  ctx.beginPath();
  ctx.roundRect(left, top, boxWidth, boxHeight, scaleValue(24));
  ctx.fill();
  ctx.stroke();

  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';

  ctx.fillStyle = 'rgba(255,255,255,0.78)';
  ctx.font = '800 ' + scaleValue(24) + 'px Arial';
  ctx.fillText('QUICK COLOR SELECT', centerX, top + scaleValue(34));

  ctx.font = '900 ' + scaleValue(46) + 'px Arial';

  for (let i = 0; i < COLORS.length; i++) {
    const point = getColorWheelPoint(i);
    ctx.fillStyle = COLORS[i].value;
    ctx.fillText(['Z', 'X', 'C', 'V'][i], point.x, top + scaleValue(92));
  }

  ctx.restore();
}

function getColorWheelPoint(index) {
  const spacing = scaleValue(165);
  const startX = wheelCenterX - spacing * 1.5;

  return {
    x: startX + spacing * index,
    y: wheelCenterY
  };
}

function drawFloatingTexts() {
  for (const t of floatingTexts) {
    ctx.save();
    ctx.globalAlpha = Math.max(t.life, 0);
    ctx.fillStyle = t.color;
    ctx.font = '800 ' + scaleValue(22) + 'px Arial';
    ctx.textAlign = 'center';
    ctx.shadowColor = t.color;
    ctx.shadowBlur = 12;
    ctx.fillText(t.text, t.x, t.y);
    ctx.restore();
  }
}

function loop(now) {
  if (!running || paused) return;
  const dt = Math.min((now - lastTime) / 1000, 0.033);
  lastTime = now;
  update(dt);
  draw();
  requestAnimationFrame(loop);
}

function random(min, max) {
  return Math.random() * (max - min) + min;
}

function scaleValue(value) {
  return value;
}

function initAudio() {
  if (audioContext) return;
  const AudioContextClass = window.AudioContext || window.webkitAudioContext;
  if (!AudioContextClass) return;
  audioContext = new AudioContextClass();
}

function playTone(frequency, duration, type, volume, slideTo = null) {
  if (!soundEnabled || !audioContext) return;

  const now = audioContext.currentTime;
  const oscillator = audioContext.createOscillator();
  const gain = audioContext.createGain();

  oscillator.type = type;
  oscillator.frequency.setValueAtTime(frequency, now);

  if (slideTo !== null) {
    oscillator.frequency.exponentialRampToValueAtTime(slideTo, now + duration);
  }

  gain.gain.setValueAtTime(volume, now);
  gain.gain.exponentialRampToValueAtTime(0.001, now + duration);

  oscillator.connect(gain);
  gain.connect(audioContext.destination);
  oscillator.start(now);
  oscillator.stop(now + duration);
}

function toggleSound() {
  soundEnabled = !soundEnabled;

  localStorage.setItem(
    SOUND_ENABLED_KEY,
    soundEnabled ? '1' : '0'
  );

  updateSoundButtonIcon();
}

function updateSoundButtonIcon() {
  if (!bubblesSoundButton) return;

  bubblesSoundButton.innerHTML = soundEnabled
    ? '<i data-lucide="volume-2"></i>'
    : '<i data-lucide="volume-x"></i>';

  if (window.lucide) {
    window.lucide.createIcons();
  }
}

function playShootSound() {
  playTone(520, 0.055, 'sine', 0.135, 780);
}

function playClickSound() {
  playTone(980, 0.018, 'sine', 0.05, 760);
  playTone(620, 0.03, 'triangle', 0.035, 420);
}

function playStartSound() {
  playTone(262, 0.08, 'triangle', 0.045); // C
  setTimeout(() => playTone(330, 0.08, 'triangle', 0.045), 90); // E
  setTimeout(() => playTone(392, 0.09, 'triangle', 0.05), 180); // G
  setTimeout(() => playTone(523, 0.13, 'triangle', 0.06), 285); // C
}

function playGameOverSound() {
  playTone(523, 0.10, 'triangle', 0.05); // C
  setTimeout(() => playTone(392, 0.10, 'triangle', 0.05), 120); // G
  setTimeout(() => playTone(330, 0.12, 'triangle', 0.05), 240); // E
  setTimeout(() => playTone(262, 0.18, 'triangle', 0.06), 380); // C
}

function playPopSound(radius) {
  const base = Math.max(90, 260 - radius * 2.2);
  const sizeBoost = Math.min(0.11, radius / 520);
  playTone(base + random(-18, 18), 0.105, 'sine', 0.21 + sizeBoost, base * 0.55);
  playTone(base * 1.8 + random(-24, 24), 0.045, 'triangle', 0.105, base * 1.1);
}

function playWrongHitSound() {
  playTone(240, 0.08, 'sawtooth', 0.07, 180);
  playTone(140, 0.12, 'triangle', 0.045, 110);
}

function playShieldHitSound() {
  playTone(680, 0.045, 'triangle', 0.075, 520);
  playTone(360, 0.07, 'sine', 0.045, 300);
}

function handlePointerDown(event) {
  event.preventDefault();

  if (paused) return;

  const point = getCanvasPoint(event);

  for (let i = 0; i < COLORS.length; i++) {
    const colorPoint = getColorWheelPoint(i);
    const distance = Math.hypot(point.x - colorPoint.x, point.y - colorPoint.y);

    if (distance <= scaleValue(102)) {
      isChoosingColor = true;
      activeColor = i;
      playClickSound();
      return;
    }
  }

  shoot(point.x, point.y);
}

function handlePointerMove(event) {
  if (paused || !isChoosingColor) return;
  event.preventDefault();

  const point = getCanvasPoint(event);
  updateColorFromWheel(point.x, point.y);
}

function handlePointerUp() {
  isChoosingColor = false;
}

function getCanvasPoint(event) {
  const rect = canvas.getBoundingClientRect();
  return {
    x: (event.clientX - rect.left) / uiScale,
    y: (event.clientY - rect.top) / uiScale
  };
}

function updateColorFromWheel(x, y) {
  if (paused) return;
  const dx = x - wheelCenterX;
  const dy = y - wheelCenterY;
  const distToCenter = Math.hypot(dx, dy);

  // Only react if pointer is near the wheel arc (ring area)
  if (y < height - scaleValue(90)) return;

  let closestIndex = -1;
  let closestDistance = Infinity;

  for (let i = 0; i < COLORS.length; i++) {
    const point = getColorWheelPoint(i);
    const distance = Math.hypot(x - point.x, y - point.y);

    if (distance < closestDistance) {
      closestDistance = distance;
      closestIndex = i;
    }
  }

  // Only switch if close enough to a color node
  if (
    closestIndex !== -1 &&
    closestDistance < scaleValue(92) &&
    activeColor !== closestIndex
  ) {
    activeColor = closestIndex;
    playClickSound();
  }
}

function shouldShowKeyboardLabels() {
  return window.matchMedia('(hover: hover)').matches &&
    window.matchMedia('(pointer: fine)').matches;
}

function resizeAndDraw() {
  resize();
  draw();
}

const resizeObserver = new ResizeObserver(resizeAndDraw);
resizeObserver.observe(canvas.parentElement);

window.addEventListener('resize', resizeAndDraw);
window.addEventListener('orientationchange', () => {
  requestAnimationFrame(resizeAndDraw);
});
canvas.addEventListener('pointerdown', handlePointerDown);
canvas.addEventListener('pointermove', handlePointerMove);
canvas.addEventListener('pointerup', handlePointerUp);
canvas.addEventListener('pointercancel', handlePointerUp);

document.addEventListener('contextmenu', (event) => {
  event.preventDefault();
});

document.addEventListener('selectstart', (event) => {
  event.preventDefault();
});

document.addEventListener('gesturestart', (event) => {
  event.preventDefault();
});

window.addEventListener('keydown', (event) => {
  if (event.repeat) return;

  if (event.code === 'Space') {
    event.preventDefault();

    if (!running) {
      startGame();
    } else {
      togglePause();
    }

    return;
  }

  if (paused) return;

  switch (event.code) {
    case 'KeyZ':
      activeColor = 0;
      playClickSound();
      break;

    case 'KeyX':
      activeColor = 1;
      playClickSound();
      break;

    case 'KeyC':
      activeColor = 2;
      playClickSound();
      break;

    case 'KeyV':
      activeColor = 3;
      playClickSound();
      break;
  }
});
startButton.addEventListener('click', startGame);
pauseButton.addEventListener('click', togglePause);

requestAnimationFrame(() => {
  updateSoundButtonIcon();

  bubblesSoundButton.addEventListener('click', (event) => {
    event.preventDefault();
    event.stopPropagation();

    initAudio();
    toggleSound();
  });
});

maxScoreText.textContent = maxScore;
requestAnimationFrame(resizeAndDraw);
