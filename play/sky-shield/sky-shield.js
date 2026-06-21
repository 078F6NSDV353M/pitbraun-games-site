function createSkyShieldDom() {
  const gameRoot = document.getElementById('gameRoot');

  if (!gameRoot) {
    throw new Error('Sky Shield: #gameRoot was not found.');
  }

  gameRoot.innerHTML = `
    <div id="gameStage">
      <canvas id="game" width="900" height="1200"></canvas>
      <div class="build-label">Build v132</div>
      <div class="stage-frame"></div>

      <div class="ui top-ui">
        <div class="panel">
          <span class="hudLabel">SCORE</span>
          <span class="hudValue" id="score">0</span>
        </div>

        <div class="panel">
          <span class="hudLabel">MAX SCORE</span>
          <span class="hudValue" id="maxScore">0</span>
        </div>

        <div class="panel">
          <span class="hudLabel">COMBO</span>
          <span class="hudValue" id="combo">x1</span>
        </div>
      </div>

      <div class="tower-hp-bar">
        <div class="tower-hp-bar__fill" id="hpBarFill"></div>
      </div>

      <div class="weapon-buttons">
        <button class="weapon-btn active" data-weapon="gun">GUN</button>
        <button class="weapon-btn" data-weapon="missile">IR</button>
        <button class="weapon-btn" data-weapon="emp">EMP</button>
      </div>

      <button class="skyShieldSoundButton" id="skyShieldSoundButton" type="button" aria-label="Toggle sound">
        <i data-lucide="volume-2"></i>
      </button>

      <button class="pause-btn hidden" id="pauseBtn" type="button">II</button>

      <div id="menu" class="overlay">
        <div class="card">
          <h1>SKY SHIELD</h1>
          <p id="menuSubtitle">Mobile browser arcade defense game.</p>

          <div class="gameover-stats hidden" id="gameoverStats">
            <div class="gameover-stats__row">
              <span class="gameover-stats__label">Score</span>
              <span class="gameover-stats__value" id="finalScoreText">0</span>
            </div>

            <div class="gameover-stats__row">
              <span class="gameover-stats__label">Max combo</span>
              <span class="gameover-stats__value" id="maxComboText">x1</span>
            </div>

            <div class="gameover-stats__row">
              <span class="gameover-stats__label">UAVs destroyed</span>
              <span class="gameover-stats__value" id="destroyedDroneCountText">0</span>
            </div>

            <div class="gameover-stats__row">
              <span class="gameover-stats__label">Rockets destroyed</span>
              <span class="gameover-stats__value" id="destroyedRocketCountText">0</span>
            </div>

            <div class="gameover-stats__row">
              <span class="gameover-stats__label">Drones destroyed</span>
              <span class="gameover-stats__value" id="destroyedSwarmCountText">0</span>
            </div>
          </div>

          <button id="startBtn" class="start-btn">START DEFENSE</button>
        </div>
      </div>

      <div class="keyboardHint hidden" id="keyboardHint">
        <div class="keyboardHint__title">QUICK WEAPON SELECT</div>
        <div class="keyboardHint__keys">
          <span>Z - GUN</span>
          <span>   </span>
          <span>X - IR</span>
          <span>   </span>
          <span>C - EMP</span>
        </div>
      </div>
    </div>
  `;
}

createSkyShieldDom();

document.addEventListener('DOMContentLoaded', function () {
  const WORLD_WIDTH = 900;
  const WORLD_HEIGHT = 1200;
  const GAME_WIDTH = WORLD_WIDTH;
  const GAME_HEIGHT = WORLD_HEIGHT;
  const wu = 1;

  const gameRoot = document.getElementById('gameRoot');
  const canvas = document.getElementById('game');
  const ctx = canvas.getContext('2d');
  const hpEl = document.getElementById('hp');
  const scoreEl = document.getElementById('score');
  const maxScoreEl = document.getElementById('maxScore');
  const comboEl = document.getElementById('combo');
  const hpBarFillEl = document.getElementById('hpBarFill');
  const menu = document.getElementById('menu');
  const menuSubtitle = document.getElementById('menuSubtitle');
  const gameoverStats = document.getElementById('gameoverStats');
  const finalScoreText = document.getElementById('finalScoreText');
  const maxComboText = document.getElementById('maxComboText');
  const destroyedDroneCountText = document.getElementById('destroyedDroneCountText');
  const destroyedRocketCountText = document.getElementById('destroyedRocketCountText');
  const destroyedSwarmCountText = document.getElementById('destroyedSwarmCountText');
  const keyboardHint = document.getElementById('keyboardHint');
  const startBtn = document.getElementById('startBtn');
  const skyShieldSoundButton = document.getElementById('skyShieldSoundButton');
  const pauseBtn = document.getElementById('pauseBtn');
  const weaponButtons = Array.from(document.querySelectorAll('[data-weapon]'));
  const gameStage = document.getElementById('gameStage');

  canvas.width = GAME_WIDTH;
  canvas.height = GAME_HEIGHT;

  const towerSvgMarkup = [
    '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 760 520">',
    '<defs>',
    '<linearGradient id="bodyFill" x1="0" y1="0" x2="1" y2="1">',
    '<stop offset="0%" stop-color="#c7d09a" />',
    '<stop offset="100%" stop-color="#8e9969" />',
    '</linearGradient>',
    '<linearGradient id="shadowFill" x1="0" y1="0" x2="0" y2="1">',
    '<stop offset="0%" stop-color="#465136" />',
    '<stop offset="100%" stop-color="#202819" />',
    '</linearGradient>',
    '<linearGradient id="glowFill" x1="0" y1="0" x2="1" y2="0">',
    '<stop offset="0%" stop-color="#86df37" />',
    '<stop offset="100%" stop-color="#b5f24e" />',
    '</linearGradient>',
    '<style>',
    '.ol{stroke:#000;stroke-width:4;stroke-linejoin:round;stroke-linecap:round;}',
    '.body{fill:url(#bodyFill);}',
    '.shadow{fill:url(#shadowFill);opacity:0.65;}',
    '.glow{fill:url(#glowFill);}',
    '.soft{fill:#a6b174;}',
    '</style>',
    '</defs>',
    '<line x1="18" y1="486" x2="742" y2="486" class="ol" />',
    '<path class="body ol" d="M42 402 L238 402 L270 356 L490 356 L522 402 L718 402 L718 486 L42 486 Z" />',
    '<path class="shadow ol" d="M42 446 L238 446 L270 410 L490 410 L522 446 L718 446 L718 486 L42 486 Z" />',
    '<rect x="70" y="368" width="108" height="46" rx="3" class="soft ol" />',
    '<rect x="582" y="368" width="108" height="46" rx="3" class="soft ol" />',
    '<rect x="104" y="368" width="8" height="46" class="glow ol" />',
    '<rect x="136" y="368" width="8" height="46" class="glow ol" />',
    '<rect x="616" y="368" width="8" height="46" class="glow ol" />',
    '<rect x="648" y="368" width="8" height="46" class="glow ol" />',
    '<rect x="248" y="350" width="264" height="136" rx="2" class="body ol" />',
    '<path class="shadow ol" d="M302 402 L458 402 L458 486 L302 486 Z" />',
    '<path class="body ol" d="M314 434 L446 434 L446 486 L314 486 Z" />',
    '<path class="shadow ol" d="M336 448 L424 448 L424 486 L336 486 Z" />',
    '<rect x="350" y="458" width="60" height="8" rx="4" class="glow ol" />',
    '<rect x="346" y="438" width="14" height="8" rx="4" class="glow ol" />',
    '<path class="body ol" d="M216 330 L544 330 L524 402 L236 402 Z" />',
    '<rect x="248" y="372" width="52" height="18" class="glow ol" />',
    '<rect x="460" y="372" width="52" height="18" class="glow ol" />',
    '<rect x="334" y="380" width="92" height="20" class="glow ol" />',
    '<path class="body ol" d="M282 150 L478 150 L514 330 L246 330 Z" />',
    '<path class="shadow ol" d="M334 182 L426 182 L446 330 L314 330 Z" />',
    '<rect x="346" y="206" width="68" height="20" class="glow ol" />',
    '<rect x="342" y="256" width="76" height="20" class="glow ol" />',
    '<rect x="338" y="306" width="84" height="20" class="glow ol" />',
    '<rect x="278" y="180" width="30" height="10" class="glow ol" />',
    '<rect x="452" y="180" width="30" height="10" class="glow ol" />',
    '<rect x="346" y="132" width="68" height="22" class="body ol" />',
    '<circle cx="380" cy="118" r="74" class="body ol" />',
    '<path class="shadow ol" d="M306 118 A74 74 0 0 0 454 118 A74 74 0 0 1 306 118 Z" />',
    '<ellipse cx="380" cy="118" rx="24" ry="74" fill="none" class="ol" />',
    '<ellipse cx="380" cy="118" rx="40" ry="74" fill="none" class="ol" />',
    '<path d="M356 48 Q380 26 404 48" fill="none" class="ol" />',
    '<rect x="370" y="10" width="20" height="38" rx="8" class="body ol" />',
    '</svg>'
  ].join('');

  const towerSvgUrl = 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(towerSvgMarkup);
  const towerSprite = new Image();
  let towerSpriteReady = false;

  towerSprite.addEventListener('load', function () {
    towerSpriteReady = true;
  });
  towerSprite.src = towerSvgUrl;

  let width = WORLD_WIDTH;
  let height = WORLD_HEIGHT;
  let running = false;
  let paused = false;
  let hp = 100;
  let score = 0;
  let maxScore = Number(localStorage.getItem('skyShieldMaxScore')) || 0;
  let combo = 1;
  let maxCombo = 1;
  let wave = 1;
  let destroyedDroneCount = 0;
  let destroyedRocketCount = 0;
  let destroyedSwarmCount = 0;
  let waveState = 'break';
  let waveTimer = 3;
  let currentWaveDuration = 20;
  let currentWaveElapsed = 0;
  let enemiesSpawnedInWave = 0;
  let waveSpawnBudget = 0;
  let waveBreakDuration = 3;
  let supportSpawnedThisWave = false;
  let lastSupportWave = -99;
  const weaponOrder = ['gun', 'missile', 'emp'];
  let currentWeaponIndex = 0;
  let selectedWeapon = weaponOrder[currentWeaponIndex];
  let lastTime = 0;
  let spawnTimer = 0;
  let fireCooldown = 0;
  let lastPointerWorldX = GAME_WIDTH * 0.5;
  let lastPointerWorldY = GAME_HEIGHT * 0.35;
  let radarAngle = -Math.PI / 2;

  const enemies = [];
  const bullets = [];
  const explosions = [];
  const floatingTexts = [];
  const waveAnnouncements = [];

  let showKeyboardLabels = false;
  let empMuzzleFlash = 0;
  const SOUND_ENABLED_KEY = 'sky_shield_sound_enabled';

  let soundEnabled = localStorage.getItem(SOUND_ENABLED_KEY) !== '0';
  let audioContext = null;
  let audioUnlocked = false;
  let sharedReverbNode = null;
  let sharedReverbInput = null;
  let gameOverPending = false;
  let gameOverTimer = 0;
  let towerDestroyed = false;
  const towerDebrisParticles = [];

  function drawRoundedRectPath(ctx, x, y, width, height, radius) {
    const r = Math.max(0, Math.min(radius, width * 0.5, height * 0.5));

    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.lineTo(x + width - r, y);
    ctx.quadraticCurveTo(x + width, y, x + width, y + r);
    ctx.lineTo(x + width, y + height - r);
    ctx.quadraticCurveTo(x + width, y + height, x + width - r, y + height);
    ctx.lineTo(x + r, y + height);
    ctx.quadraticCurveTo(x, y + height, x, y + height - r);
    ctx.lineTo(x, y + r);
    ctx.quadraticCurveTo(x, y, x + r, y);
    ctx.closePath();
  }

  function unlockAudio() {
    if (audioUnlocked) {
      return;
    }

    audioContext = new (window.AudioContext || window.webkitAudioContext)();

    if (audioContext.state === 'suspended') {
      audioContext.resume();
    }

    audioUnlocked = true;
  }

  function getSharedReverbInput(reverbTime = 0.18) {
    if (sharedReverbInput) {
      return sharedReverbInput;
    }

    const inputGain = audioContext.createGain();
    const convolver = audioContext.createConvolver();
    const outputGain = audioContext.createGain();

    const sampleRate = audioContext.sampleRate;
    const length = Math.floor(sampleRate * reverbTime);
    const impulse = audioContext.createBuffer(2, length, sampleRate);

    for (let channel = 0; channel < 2; channel++) {
      const data = impulse.getChannelData(channel);

      for (let i = 0; i < length; i++) {
        const decay = 1 - i / length;
        data[i] = (Math.random() * 2 - 1) * decay * decay;
      }
    }

    convolver.buffer = impulse;
    outputGain.gain.value = 1;

    inputGain.connect(convolver);
    convolver.connect(outputGain);
    outputGain.connect(audioContext.destination);

    sharedReverbNode = convolver;
    sharedReverbInput = inputGain;

    return sharedReverbInput;
  }

  function createDistortionCurve(amount = 20) {
    const samples = 44100;
    const curve = new Float32Array(samples);
    const deg = Math.PI / 180;

    for (let i = 0; i < samples; i++) {
      const x = i * 2 / samples - 1;

      curve[i] =
        (3 + amount) * x * 20 * deg /
        (Math.PI + amount * Math.abs(x));
    }

    return curve;
  }

  function playTone({
    frequency = 440,
    duration = 0.08,
    volume = 0.1,
    type = 'sine',
    frequencyEnd = null,
    delayTime = 0,
    delayFeedback = 0,
    delayMix = 0,
    reverbMix = 0,
    distortion = 0
  }) {
    if (!soundEnabled || !audioUnlocked || !audioContext) {
      return;
    }

    const now = audioContext.currentTime;
    const oscillator = audioContext.createOscillator();
    const gain = audioContext.createGain();

    oscillator.type = type;
    oscillator.frequency.setValueAtTime(frequency, now);

    if (frequencyEnd !== null) {
      oscillator.frequency.exponentialRampToValueAtTime(
        Math.max(1, frequencyEnd),
        now + duration
      );
    }

    const finalVolume = Math.min(volume, 0.2);
    gain.gain.setValueAtTime(finalVolume, now);
    gain.gain.exponentialRampToValueAtTime(0.0005, now + duration);

    oscillator.connect(gain);

    let outputNode = gain;

    if (distortion > 0) {
      const distortionNode = audioContext.createWaveShaper();
      distortionNode.curve = createDistortionCurve(distortion);
      distortionNode.oversample = '4x';

      outputNode.connect(distortionNode);
      outputNode = distortionNode;
    }

    outputNode.connect(audioContext.destination);

    if (delayTime > 0 && delayMix > 0) {
      const delay = audioContext.createDelay();
      const feedback = audioContext.createGain();
      const delayGain = audioContext.createGain();

      delay.delayTime.setValueAtTime(delayTime, now);
      feedback.gain.setValueAtTime(delayFeedback, now);
      delayGain.gain.setValueAtTime(delayMix, now);

      outputNode.connect(delay);
      delay.connect(feedback);
      feedback.connect(delay);
      delay.connect(delayGain);
      delayGain.connect(audioContext.destination);
    }

    if (reverbMix > 0) {
      const reverbSend = audioContext.createGain();

      reverbSend.gain.setValueAtTime(reverbMix, now);
      reverbSend.gain.exponentialRampToValueAtTime(0.001, now + duration);

      outputNode.connect(reverbSend);
      reverbSend.connect(getSharedReverbInput());
    }

    oscillator.start(now);
    oscillator.stop(now + duration);
  }

  function playGunShotSound() {
    if (!soundEnabled || !audioUnlocked || !audioContext) {
      return;
    }

    const now = audioContext.currentTime;

    playTone({
      frequency: 190,
      frequencyEnd: 72,
      duration: 0.065,
      volume: 0.07,
      type: 'triangle',
      distortion: 14
    });

    playTone({
      frequency: 1180,
      frequencyEnd: 220,
      duration: 0.034,
      volume: 0.04,
      type: 'square',
      distortion: 12
    });

    const bufferSize = Math.floor(audioContext.sampleRate * 0.05);
    const buffer = audioContext.createBuffer(1, bufferSize, audioContext.sampleRate);
    const data = buffer.getChannelData(0);

    for (let i = 0; i < bufferSize; i++) {
      const t = i / bufferSize;
      data[i] = (Math.random() * 2 - 1) * Math.pow(1 - t, 2.8);
    }

    const noise = audioContext.createBufferSource();
    noise.buffer = buffer;

    const highpass = audioContext.createBiquadFilter();
    highpass.type = 'highpass';
    highpass.frequency.setValueAtTime(420, now);

    const bandpass = audioContext.createBiquadFilter();
    bandpass.type = 'bandpass';
    bandpass.frequency.setValueAtTime(1900, now);
    bandpass.frequency.exponentialRampToValueAtTime(520, now + 0.05);
    bandpass.Q.setValueAtTime(0.95, now);

    const shaper = audioContext.createWaveShaper();
    shaper.curve = createDistortionCurve(28);
    shaper.oversample = '4x';

    const noiseGain = audioContext.createGain();
    noiseGain.gain.setValueAtTime(0.0001, now);
    noiseGain.gain.exponentialRampToValueAtTime(0.045, now + 0.0015);
    noiseGain.gain.exponentialRampToValueAtTime(0.016, now + 0.012);
    noiseGain.gain.exponentialRampToValueAtTime(0.0001, now + 0.05);

    noise.connect(highpass);
    highpass.connect(bandpass);
    bandpass.connect(shaper);
    shaper.connect(noiseGain);
    noiseGain.connect(audioContext.destination);

    noise.start(now);
    noise.stop(now + 0.05);
  }

  function playIrShotSound() {
    if (!soundEnabled || !audioUnlocked || !audioContext) {
      return;
    }

    const now = audioContext.currentTime;

    playTone({
      frequency: 118,
      frequencyEnd: 62,
      duration: 0.11,
      volume: 0.042,
      type: 'square',
      distortion: 6
    });

    const bufferSize = Math.floor(audioContext.sampleRate * 0.8);
    const buffer = audioContext.createBuffer(1, bufferSize, audioContext.sampleRate);
    const data = buffer.getChannelData(0);

    for (let i = 0; i < bufferSize; i++) {
      data[i] = Math.random() * 2 - 1;
    }

    const noise = audioContext.createBufferSource();
    noise.buffer = buffer;

    const noiseFilter = audioContext.createBiquadFilter();
    noiseFilter.type = 'bandpass';
    noiseFilter.frequency.setValueAtTime(1100, now);
    noiseFilter.frequency.exponentialRampToValueAtTime(220, now + 0.8);
    noiseFilter.Q.setValueAtTime(1.15, now);

    const noiseGain = audioContext.createGain();
    noiseGain.gain.setValueAtTime(0.0001, now);
    noiseGain.gain.exponentialRampToValueAtTime(0.034, now + 0.24);
    noiseGain.gain.exponentialRampToValueAtTime(0.014, now + 0.46);
    noiseGain.gain.exponentialRampToValueAtTime(0.004, now + 0.68);
    noiseGain.gain.exponentialRampToValueAtTime(0.0001, now + 0.8);

    const reverbSend = audioContext.createGain();
    reverbSend.gain.setValueAtTime(0.025, now);
    reverbSend.gain.exponentialRampToValueAtTime(0.001, now + 0.8);

    noise.connect(noiseFilter);
    noiseFilter.connect(noiseGain);
    noiseGain.connect(audioContext.destination);
    noiseGain.connect(reverbSend);
    reverbSend.connect(getSharedReverbInput());

    noise.start(now);
    noise.stop(now + 0.22);

    setTimeout(function () {
      playTone({
        frequency: 260,
        frequencyEnd: 110,
        duration: 0.5,
        volume: 0.015,
        type: 'sine',
        distortion: 3
      });
    }, 8);
  }

  function playEmpShotSound() {
    if (!soundEnabled || !audioUnlocked || !audioContext) {
      return;
    }

    const now = audioContext.currentTime;

    playTone({
      frequency: 420,
      frequencyEnd: 50,
      duration: 0.5,
      volume: 0.03,
      type: 'square',
      reverbMix: 0.05,
      distortion: 3
    });

    const bufferSize = Math.floor(audioContext.sampleRate * 0.28);
    const buffer = audioContext.createBuffer(1, bufferSize, audioContext.sampleRate);
    const data = buffer.getChannelData(0);

    for (let i = 0; i < bufferSize; i++) {
      data[i] = (Math.random() * 2 - 1) * (1 - i / bufferSize);
    }

    const noise = audioContext.createBufferSource();
    noise.buffer = buffer;

    const highpass = audioContext.createBiquadFilter();
    highpass.type = 'highpass';
    highpass.frequency.setValueAtTime(180, now);

    const bandpass = audioContext.createBiquadFilter();
    bandpass.type = 'bandpass';
    bandpass.frequency.setValueAtTime(720, now);
    bandpass.frequency.exponentialRampToValueAtTime(260, now + 0.28);
    bandpass.Q.setValueAtTime(1.8, now);

    const noiseGain = audioContext.createGain();
    noiseGain.gain.setValueAtTime(0.0001, now);
    noiseGain.gain.exponentialRampToValueAtTime(0.02, now + 0.02);
    noiseGain.gain.exponentialRampToValueAtTime(0.012, now + 0.4);
    noiseGain.gain.exponentialRampToValueAtTime(0.004, now + 0.6);
    noiseGain.gain.exponentialRampToValueAtTime(0.0001, now + 0.8);

    const reverbSend = audioContext.createGain();
    reverbSend.gain.setValueAtTime(0.035, now);
    reverbSend.gain.exponentialRampToValueAtTime(0.001, now + 0.28);

    noise.connect(highpass);
    highpass.connect(bandpass);
    bandpass.connect(noiseGain);
    noiseGain.connect(audioContext.destination);
    noiseGain.connect(reverbSend);
    reverbSend.connect(getSharedReverbInput());

    noise.start(now);
    noise.stop(now + 0.28);

    setTimeout(function () {
      playTone({
        frequency: 820,
        frequencyEnd: 80,
        duration: 0.14,
        volume: 0.012,
        type: 'triangle',
        reverbMix: 0.03
      });
    }, 16);
  }

  function playEnemyExplosionSound() {
    if (!soundEnabled || !audioUnlocked || !audioContext) {
      return;
    }

    const now = audioContext.currentTime;

    playTone({
      frequency: 86,
      frequencyEnd: 28,
      duration: 0.5,
      volume: 0.08,
      type: 'triangle',
      distortion: 22
    });

    playTone({
      frequency: 170,
      frequencyEnd: 46,
      duration: 0.3,
      volume: 0.045,
      type: 'square',
      distortion: 18
    });

    const bufferSize = Math.floor(audioContext.sampleRate * 0.1);
    const buffer = audioContext.createBuffer(1, bufferSize, audioContext.sampleRate);
    const data = buffer.getChannelData(0);

    for (let i = 0; i < bufferSize; i++) {
      const t = i / bufferSize;
      data[i] = (Math.random() * 2 - 1) * Math.pow(1 - t, 1.15);
    }

    const noise = audioContext.createBufferSource();
    noise.buffer = buffer;

    const highpass = audioContext.createBiquadFilter();
    highpass.type = 'highpass';
    highpass.frequency.setValueAtTime(140, now);

    const bandpass = audioContext.createBiquadFilter();
    bandpass.type = 'bandpass';
    bandpass.frequency.setValueAtTime(720, now);
    bandpass.frequency.exponentialRampToValueAtTime(150, now + 0.1);
    bandpass.Q.setValueAtTime(0.7, now);

    const shaper = audioContext.createWaveShaper();
    shaper.curve = createDistortionCurve(40);
    shaper.oversample = '4x';

    const noiseGain = audioContext.createGain();
    noiseGain.gain.setValueAtTime(0.0001, now);
    noiseGain.gain.exponentialRampToValueAtTime(0.07, now + 0.1);
    noiseGain.gain.exponentialRampToValueAtTime(0.03, now + 0.3);
    noiseGain.gain.exponentialRampToValueAtTime(0.012, now + 0.5);
    noiseGain.gain.exponentialRampToValueAtTime(0.0001, now + 0.7);

    const reverbSend = audioContext.createGain();
    reverbSend.gain.setValueAtTime(0.012, now);
    reverbSend.gain.exponentialRampToValueAtTime(0.001, now + 0.1);

    noise.connect(highpass);
    highpass.connect(bandpass);
    bandpass.connect(shaper);
    shaper.connect(noiseGain);
    noiseGain.connect(audioContext.destination);
    noiseGain.connect(reverbSend);
    reverbSend.connect(getSharedReverbInput());

    noise.start(now);
    noise.stop(now + 0.22);

    setTimeout(function () {
      playTone({
        frequency: 340,
        frequencyEnd: 60,
        duration: 0.07,
        volume: 0.02,
        type: 'triangle',
        distortion: 10
      });
    }, 8);
  }

  function playSwarmDisableSound() {
    if (!soundEnabled || !audioUnlocked || !audioContext) {
      return;
    }

    playEnemyExplosionSound();

    const now = audioContext.currentTime;
    const duration = 0.55;

    const osc1 = audioContext.createOscillator();
    const osc2 = audioContext.createOscillator();
    const gain = audioContext.createGain();

    osc1.type = 'sawtooth';
    osc2.type = 'triangle';

    osc1.frequency.setValueAtTime(820, now);
    osc1.frequency.exponentialRampToValueAtTime(360, now + duration);

    osc2.frequency.setValueAtTime(620, now);
    osc2.frequency.exponentialRampToValueAtTime(240, now + duration);

    gain.gain.setValueAtTime(0.0001, now);
    gain.gain.exponentialRampToValueAtTime(0.012, now + 0.01);
    gain.gain.exponentialRampToValueAtTime(0.007, now + 0.22);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + duration);

    const bandpass = audioContext.createBiquadFilter();
    bandpass.type = 'bandpass';
    bandpass.frequency.setValueAtTime(1200, now);
    bandpass.frequency.exponentialRampToValueAtTime(420, now + duration);
    bandpass.Q.setValueAtTime(1.4, now);

    const shaper = audioContext.createWaveShaper();
    shaper.curve = createDistortionCurve(14);
    shaper.oversample = '4x';

    osc1.connect(gain);
    osc2.connect(gain);
    gain.connect(bandpass);
    bandpass.connect(shaper);
    shaper.connect(audioContext.destination);

    const bufferSize = Math.floor(audioContext.sampleRate * duration);
    const buffer = audioContext.createBuffer(1, bufferSize, audioContext.sampleRate);
    const data = buffer.getChannelData(0);

    for (let i = 0; i < bufferSize; i++) {
      const t = i / bufferSize;
      const flutter = 0.72 + 0.28 * Math.sin(t * 70);
      data[i] = (Math.random() * 2 - 1) * flutter * Math.pow(1 - t, 1.5);
    }

    const noise = audioContext.createBufferSource();
    noise.buffer = buffer;

    const noiseBandpass = audioContext.createBiquadFilter();
    noiseBandpass.type = 'bandpass';
    noiseBandpass.frequency.setValueAtTime(2100, now);
    noiseBandpass.frequency.exponentialRampToValueAtTime(700, now + duration);
    noiseBandpass.Q.setValueAtTime(1.8, now);

    const noiseGain = audioContext.createGain();
    noiseGain.gain.setValueAtTime(0.0001, now);
    noiseGain.gain.exponentialRampToValueAtTime(0.006, now + 0.008);
    noiseGain.gain.exponentialRampToValueAtTime(0.003, now + 0.18);
    noiseGain.gain.exponentialRampToValueAtTime(0.0001, now + duration);

    const reverbSend = audioContext.createGain();
    reverbSend.gain.setValueAtTime(0.014, now);
    reverbSend.gain.exponentialRampToValueAtTime(0.001, now + duration);

    noise.connect(noiseBandpass);
    noiseBandpass.connect(noiseGain);
    noiseGain.connect(audioContext.destination);
    noiseGain.connect(reverbSend);
    reverbSend.connect(getSharedReverbInput());

    osc1.start(now);
    osc2.start(now);
    noise.start(now);

    osc1.stop(now + duration);
    osc2.stop(now + duration);
    noise.stop(now + duration);
  }

  function playBaseExplosionSound() {
    if (!soundEnabled || !audioUnlocked || !audioContext) {
      return;
    }

    playEnemyExplosionSound();

    playTone({
      frequency: 62,
      frequencyEnd: 20,
      duration: 0.32,
      volume: 0.11,
      type: 'triangle',
      distortion: 20
    });

    playTone({
      frequency: 88,
      frequencyEnd: 26,
      duration: 0.26,
      volume: 0.09,
      type: 'square',
      distortion: 18
    });

    playTone({
      frequency: 140,
      frequencyEnd: 34,
      duration: 0.22,
      volume: 0.06,
      type: 'triangle',
      distortion: 16
    });

    const now = audioContext.currentTime;

    const bufferSize = Math.floor(audioContext.sampleRate * 0.55);
    const buffer = audioContext.createBuffer(1, bufferSize, audioContext.sampleRate);
    const data = buffer.getChannelData(0);

    for (let i = 0; i < bufferSize; i++) {
      const t = i / bufferSize;
      data[i] = (Math.random() * 2 - 1) * Math.pow(1 - t, 1.05);
    }

    const noise = audioContext.createBufferSource();
    noise.buffer = buffer;

    const highpass = audioContext.createBiquadFilter();
    highpass.type = 'highpass';
    highpass.frequency.setValueAtTime(90, now);

    const bandpass = audioContext.createBiquadFilter();
    bandpass.type = 'bandpass';
    bandpass.frequency.setValueAtTime(480, now);
    bandpass.frequency.exponentialRampToValueAtTime(110, now + 0.55);
    bandpass.Q.setValueAtTime(0.65, now);

    const shaper = audioContext.createWaveShaper();
    shaper.curve = createDistortionCurve(42);
    shaper.oversample = '4x';

    const noiseGain = audioContext.createGain();
    noiseGain.gain.setValueAtTime(0.0001, now);
    noiseGain.gain.exponentialRampToValueAtTime(0.08, now + 0.006);
    noiseGain.gain.exponentialRampToValueAtTime(0.03, now + 0.16);
    noiseGain.gain.exponentialRampToValueAtTime(0.008, now + 0.34);
    noiseGain.gain.exponentialRampToValueAtTime(0.0001, now + 0.55);

    const reverbSend = audioContext.createGain();
    reverbSend.gain.setValueAtTime(0.018, now);
    reverbSend.gain.exponentialRampToValueAtTime(0.001, now + 0.55);

    noise.connect(highpass);
    highpass.connect(bandpass);
    bandpass.connect(shaper);
    shaper.connect(noiseGain);
    noiseGain.connect(audioContext.destination);
    noiseGain.connect(reverbSend);
    reverbSend.connect(getSharedReverbInput());

    noise.start(now);
    noise.stop(now + 0.55);
  }

  function playWaveStartSound() {
    const notes = [
      { delay: 0, frequency: 330, duration: 1.0 },
      { delay: 1000, frequency: 330, duration: 1.0 },
      { delay: 2000, frequency: 330, duration: 1.0 },
      { delay: 3000, frequency: 494, duration: 1.0 }
    ];

    notes.forEach(function (note) {
      setTimeout(function () {
        playTone({
          frequency: note.frequency,
          frequencyEnd: note.frequency * 0.995,
          duration: note.duration,
          volume: 0.03,
          type: 'square',
          reverbMix: 0.03,
          distortion: 2
        });
      }, note.delay);
    });
  }

  function playGameOverSound() {
    const notes = [
      { delay: 0, frequency: 392, duration: 0.22 },
      { delay: 230, frequency: 330, duration: 0.22 },
      { delay: 460, frequency: 262, duration: 0.24 },
      { delay: 720, frequency: 196, duration: 0.42 }
    ];

    notes.forEach(function (note) {
      setTimeout(function () {
        playTone({
          frequency: note.frequency,
          frequencyEnd: note.frequency * 0.94,
          duration: note.duration,
          volume: 0.05,
          type: 'square',
          reverbMix: 0.05,
          distortion: 5
        });
      }, note.delay);
    });
  }

  function playSupportDroneSpawnSound() {
    const notes = [
      { delay: 0, frequency: 494, duration: 0.1 },
      { delay: 110, frequency: 659, duration: 0.12 },
      { delay: 240, frequency: 784, duration: 0.16 }
    ];

    notes.forEach(function (note) {
      setTimeout(function () {
        playTone({
          frequency: note.frequency,
          frequencyEnd: note.frequency * 1.01,
          duration: note.duration,
          volume: 0.028,
          type: 'triangle',
          reverbMix: 0.05,
          distortion: 2
        });
      }, note.delay);
    });
  }

  function playSupportDronePickupSound() {
    const notes = [
      { delay: 0, frequency: 262, duration: 0.16 },
      { delay: 95, frequency: 330, duration: 0.16 },
      { delay: 190, frequency: 294, duration: 0.16 },
      { delay: 285, frequency: 392, duration: 0.24 }
    ];

    notes.forEach(function (note) {
      setTimeout(function () {
        playTone({
          frequency: note.frequency,
          frequencyEnd: note.frequency * 0.985,
          duration: note.duration,
          volume: 0.03,
          type: 'square',
          reverbMix: 0.03,
          distortion: 3
        });
      }, note.delay);
    });
  }

  function playWeaponSwitchSound() {
    playTone({
      frequency: 800,
      frequencyEnd: 1000,
      duration: 0.02,
      volume: 0.014,
      type: 'sine',
      distortion: 6
    });
  }

  function playBaseHitSound() {
    if (!soundEnabled || !audioUnlocked || !audioContext) {
      return;
    }

    const now = audioContext.currentTime;

    playTone({
      frequency: 105,
      frequencyEnd: 44,
      duration: 0.11,
      volume: 0.075,
      type: 'triangle',
      distortion: 16
    });

    setTimeout(function () {
      playTone({
        frequency: 220,
        frequencyEnd: 70,
        duration: 0.06,
        volume: 0.03,
        type: 'square',
        distortion: 12
      });
    }, 5);

    setTimeout(function () {
      playTone({
        frequency: 520,
        frequencyEnd: 110,
        duration: 0.03,
        volume: 0.012,
        type: 'sine',
        distortion: 6
      });
    }, 8);

    const bufferSize = Math.floor(audioContext.sampleRate * 0.045);
    const buffer = audioContext.createBuffer(1, bufferSize, audioContext.sampleRate);
    const data = buffer.getChannelData(0);

    for (let i = 0; i < bufferSize; i++) {
      const t = i / bufferSize;
      data[i] = (Math.random() * 2 - 1) * Math.pow(1 - t, 2.6);
    }

    const noise = audioContext.createBufferSource();
    noise.buffer = buffer;

    const highpass = audioContext.createBiquadFilter();
    highpass.type = 'highpass';
    highpass.frequency.setValueAtTime(240, now);

    const bandpass = audioContext.createBiquadFilter();
    bandpass.type = 'bandpass';
    bandpass.frequency.setValueAtTime(1200, now);
    bandpass.frequency.exponentialRampToValueAtTime(260, now + 0.045);
    bandpass.Q.setValueAtTime(1.1, now);

    const shaper = audioContext.createWaveShaper();
    shaper.curve = createDistortionCurve(26);
    shaper.oversample = '4x';

    const noiseGain = audioContext.createGain();
    noiseGain.gain.setValueAtTime(0.0001, now);
    noiseGain.gain.exponentialRampToValueAtTime(0.032, now + 0.002);
    noiseGain.gain.exponentialRampToValueAtTime(0.012, now + 0.012);
    noiseGain.gain.exponentialRampToValueAtTime(0.0001, now + 0.045);

    noise.connect(highpass);
    highpass.connect(bandpass);
    bandpass.connect(shaper);
    shaper.connect(noiseGain);
    noiseGain.connect(audioContext.destination);

    noise.start(now);
    noise.stop(now + 0.045);
  }

  function playStartButtonSound() {
    const notes = [
      { delay: 0, frequency: 300, duration: 0.08 },
      { delay: 90, frequency: 420, duration: 0.09 },
      { delay: 190, frequency: 560, duration: 0.12 }
    ];

    notes.forEach(function (note) {
      setTimeout(function () {
        playTone({
          frequency: note.frequency,
          frequencyEnd: note.frequency * 1.01,
          duration: note.duration,
          volume: 0.03,
          type: 'triangle',
          reverbMix: 0.04,
          distortion: 3
        });
      }, note.delay);
    });
  }

  function playPauseSound() {
    playTone({
      frequency: 420,
      frequencyEnd: 260,
      duration: 0.12,
      volume: 0.035,
      type: 'sine'
    });
  }

  function playResumeSound() {
    playTone({
      frequency: 260,
      frequencyEnd: 520,
      duration: 0.12,
      volume: 0.035,
      type: 'sine'
    });
  }

  function toggleSound() {
    soundEnabled = !soundEnabled;
    localStorage.setItem(SOUND_ENABLED_KEY, soundEnabled ? '1' : '0');
    updateSoundButtonIcon();
  }

  function updateSoundButtonIcon() {
    if (!skyShieldSoundButton) {
      return;
    }

    skyShieldSoundButton.innerHTML = soundEnabled
      ? '<i data-lucide="volume-2"></i>'
      : '<i data-lucide="volume-x"></i>';

    if (window.lucide) {
      window.lucide.createIcons();
    }
  }

  const weaponConfig = {
    gun: { label: 'Gun', cooldown: 0.08, speed: 760, damage: 1, targetType: 'drone', radius: 4 * wu },
    missile: { label: 'IR', cooldown: 0.4, speed: 520, damage: 2, targetType: 'rocket', radius: 7 * wu },
    emp: { label: 'EMP', cooldown: 0.5, speed: 440, damage: 1, targetType: 'swarm', radius: 11 * wu }
  };

  const enemyConfig = {
    drone: { hp: 1, speed: 72, score: 10, color: '#ffffff', size: 13 * wu, damage: 4 },
    rocket: { hp: 2, speed: 118, score: 25, color: '#6f8a66', size: 18 * wu, damage: 9 },
    swarm: { hp: 1, speed: 94, score: 16, color: '#75d7ff', size: 10 * wu, damage: 5 },
    support: { hp: 1, speed: 240, score: 0, color: '#9ee7ff', size: 12 * wu, damage: 0 }
  };

  function getTower() {
    return { x: width * 0.5, y: height - 200 * wu };
  }

  function getWeaponIndex(type) {
    return weaponOrder.indexOf(type);
  }

  function shouldShowKeyboardLabels() {
    return window.matchMedia('(pointer: fine)').matches;
  }

  function updateWeaponButtonsVisual() {
    weaponButtons.forEach(function (button) {
      const isActive = button.dataset.weapon === selectedWeapon;
      button.classList.toggle('active', isActive);
    });
  }

  function setWeapon(type) {
    if (paused || !running || gameOverPending) return;

    const index = getWeaponIndex(type);
    if (index === -1) return;

    const previousWeapon = selectedWeapon;

    currentWeaponIndex = index;
    selectedWeapon = weaponOrder[currentWeaponIndex];
    updateWeaponButtonsVisual();

    if (previousWeapon !== selectedWeapon) {
      playWeaponSwitchSound();
    }
  }

  function resetGame() {
    hp = 100;
    score = 0;
    combo = 1;
    maxCombo = 1;
    destroyedDroneCount = 0;
    destroyedRocketCount = 0;
    destroyedSwarmCount = 0;
    wave = 0;
    waveState = 'break';
    waveTimer = 3;
    currentWaveDuration = 20;
    currentWaveElapsed = 0;
    enemiesSpawnedInWave = 0;
    waveSpawnBudget = 0;
    supportSpawnedThisWave = false;
    lastSupportWave = -99;
    spawnTimer = 0;
    fireCooldown = 0;
    enemies.length = 0;
    bullets.length = 0;
    explosions.length = 0;
    floatingTexts.length = 0;
    waveAnnouncements.length = 0;
    empMuzzleFlash = 0;
    gameOverPending = false;
    paused = false;
    gameOverTimer = 0;
    towerDestroyed = false;
    towerDebrisParticles.length = 0;
    setWeapon('gun');

    if (gameoverStats) {
      gameoverStats.classList.add('hidden');
    }

    updateUi();
  }

  function showWaveAnnouncement(value, prefix = 'WAVE') {
    waveAnnouncements.length = 0;

    waveAnnouncements.push({
      text: prefix + ' ' + value,
      life: 1.6,
      maxLife: 1.6
    });
  }

  function getWaveConfig(value) {
    return {
      duration: 20,
      breakDuration: waveBreakDuration,
      spawnBudget: 18 + (value - 1) * 8,
      spawnInterval: Math.max(0.32, 1.05 - (value - 1) * 0.08),
      droneWeight: Math.max(0.48, 0.62 - (value - 1) * 0.02),
      rocketWeight: Math.min(0.34, 0.22 + (value - 1) * 0.015)
    };
  }

  function startNextWave() {
    wave += 1;

    const config = getWaveConfig(wave);
    waveState = 'active';
    waveTimer = config.duration;
    currentWaveDuration = config.duration;
    currentWaveElapsed = 0;
    enemiesSpawnedInWave = 0;
    waveSpawnBudget = config.spawnBudget;
    supportSpawnedThisWave = false;
    spawnTimer = 0;

    showWaveAnnouncement(wave, 'WAVE');
    playSupportDroneSpawnSound();
  }

  function startGame() {
    resetGame();
    running = true;
    menu.classList.add('hidden');
    unlockAudio();
    playStartButtonSound();

    if (gameoverStats) {
      gameoverStats.classList.add('hidden');
    }

    updateKeyboardHintVisibility();

    paused = false;

    if (pauseBtn) {
      pauseBtn.classList.remove('hidden');
      pauseBtn.textContent = 'II';
    }

    weaponButtons.forEach(function (button) {
      button.disabled = false;
    });

    startBtn.textContent = 'START DEFENSE';
    menu.querySelector('h1').textContent = 'SKY SHIELD';

    if (menuSubtitle) {
      menuSubtitle.textContent = 'Mobile browser arcade defense game.';
    }

    lastTime = performance.now();
    requestAnimationFrame(loop);

    setTimeout(function () {
      if (!running) return;
      startNextWave();
    }, 1000);
  }

  function triggerGameOverSequence() {
    if (gameOverPending) return;

    gameOverPending = true;
    gameOverTimer = 2.0;
    towerDestroyed = true;
    towerDebrisParticles.length = 0;

    const tower = getTower();
    playBaseExplosionSound();

    addExplosion(tower.x, tower.y - 26 * wu, 64 * wu);
    addExplosion(tower.x - 18 * wu, tower.y - 8 * wu, 42 * wu);
    addExplosion(tower.x + 20 * wu, tower.y - 12 * wu, 48 * wu);

    const particleCount = 40;

    for (let i = 0; i < particleCount; i++) {
      const angle = Math.random() * Math.PI * 2;
      const speed = 90 * wu + Math.random() * 360 * wu;
      const size = 1.6 * wu + Math.random() * 5.4 * wu;

      towerDebrisParticles.push({
        x: tower.x + (Math.random() - 0.5) * 96 * wu,
        y: tower.y - 34 * wu + (Math.random() - 0.5) * 96 * wu,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        size,
        rot: Math.random() * Math.PI * 2,
        spin: -9 + Math.random() * 18,
        life: 0.95 + Math.random() * 0.65,
        maxLife: 0.95 + Math.random() * 0.65,
        color: Math.random() < 0.18
          ? '#d8ff72'
          : (Math.random() < 0.48 ? '#a8ea4c' : '#7f8e5f')
      });
    }

    floatingTexts.push({
      x: tower.x,
      y: tower.y - 72 * wu,
      text: 'BASE DESTROYED',
      color: '#ffb36b',
      life: 1.6
    });
  }

  function endGame() {
    running = false;
    menu.classList.remove('hidden');
    playGameOverSound();
    updateKeyboardHintVisibility();

    paused = false;

    if (pauseBtn) {
      pauseBtn.classList.add('hidden');
      pauseBtn.textContent = 'II';
    }

    weaponButtons.forEach(function (button) {
      button.disabled = false;
    });

    menu.querySelector('h1').textContent = 'DEFENSE FAILED';

    if (menuSubtitle) {
      menuSubtitle.textContent = 'Your defense has been overwhelmed.';
    }

    startBtn.textContent = 'RESTART';

    if (finalScoreText) {
      finalScoreText.textContent = score;
    }

    if (maxComboText) {
      maxComboText.textContent = 'x' + maxCombo;
    }

    if (destroyedDroneCountText) {
      destroyedDroneCountText.textContent = destroyedDroneCount;
    }

    if (destroyedRocketCountText) {
      destroyedRocketCountText.textContent = destroyedRocketCount;
    }

    if (destroyedSwarmCountText) {
      destroyedSwarmCountText.textContent = destroyedSwarmCount;
    }

    if (gameoverStats) {
      gameoverStats.classList.remove('hidden');
    }
  }

  function togglePause() {
    if (!running || gameOverPending) return;

    paused = !paused;

    if (pauseBtn) {
      pauseBtn.textContent = paused ? '▶' : 'II';
    }

    weaponButtons.forEach(function (button) {
      button.disabled = paused;
    });

    if (paused) {
      playPauseSound();
    } else {
      playResumeSound();
    }
  }

  function updateUi() {
    const hpPercent = Math.max(0, Math.min(100, hp));

    scoreEl.textContent = score;
    maxScoreEl.textContent = maxScore;
    comboEl.textContent = 'x' + combo;

    if (hpBarFillEl) {
      hpBarFillEl.style.width = hpPercent + '%';
    }
  }

  function randomEnemyType() {
    const roll = Math.random();
    if (wave < 2) return roll < 0.75 ? 'drone' : 'rocket';
    if (roll < 0.48) return 'drone';
    if (roll < 0.78) return 'rocket';
    return 'swarm';
  }

  function spawnEnemy() {
    const config = getWaveConfig(wave);
    const roll = Math.random();

    let type = 'swarm';

    if (roll < config.droneWeight) {
      type = 'drone';
    } else if (roll < config.droneWeight + config.rocketWeight) {
      type = 'rocket';
    }

    const cfg = enemyConfig[type];
    const x = 28 * wu + Math.random() * (width - 56 * wu);
    const y = -30 * wu;
    const tower = getTower();
    const angle = Math.atan2(tower.y - y, tower.x - x);
    const speed = cfg.speed + wave * 4 + Math.random() * 14;

    enemies.push({
      type,
      x,
      y,
      vx: Math.cos(angle) * speed,
      vy: Math.sin(angle) * speed,
      hp: cfg.hp,
      maxHp: cfg.hp,
      size: cfg.size,
      wobble: Math.random() * Math.PI * 2
    });
  }

  function spawnSupportDrone() {
    const cfg = enemyConfig.support;
    const x = 90 * wu + Math.random() * (width - 180 * wu);

    enemies.push({
      type: 'support',
      x,
      y: -40 * wu,
      vx: 0,
      vy: cfg.speed,
      hp: cfg.hp,
      maxHp: cfg.hp,
      size: cfg.size,
      wobble: Math.random() * Math.PI * 2
    });
  }

  function fireAt(targetX, targetY) {
    if (!running || paused || gameOverPending) return;
    const weapon = weaponConfig[selectedWeapon];
    if (fireCooldown > 0) return;

    const tower = getTower();
    const angle = Math.atan2(targetY - tower.y, targetX - tower.x);

    bullets.push({
      weapon: selectedWeapon,
      targetType: weapon.targetType,
      x: tower.x,
      y: tower.y - 22 * wu,
      vx: Math.cos(angle) * weapon.speed,
      vy: Math.sin(angle) * weapon.speed,
      damage: weapon.damage,
      radius: weapon.radius,
      life: Math.hypot(WORLD_WIDTH, WORLD_HEIGHT) / weapon.speed + 0.25
    });

    fireCooldown = weapon.cooldown;

    if (selectedWeapon === 'gun') {
      playGunShotSound();
    } else if (selectedWeapon === 'missile') {
      playIrShotSound();
    } else if (selectedWeapon === 'emp') {
      playEmpShotSound();
    }

    if (selectedWeapon === 'emp') {
      empMuzzleFlash = 0.5;
    }
  }

  function getWorldPointFromClient(clientX, clientY) {
    const rect = canvas.getBoundingClientRect();
    const scaleX = GAME_WIDTH / rect.width;
    const scaleY = GAME_HEIGHT / rect.height;
    return { x: (clientX - rect.left) * scaleX, y: (clientY - rect.top) * scaleY };
  }

  function handleCanvasPointerDown(event) {
    const point = getWorldPointFromClient(event.clientX, event.clientY);
    lastPointerWorldX = point.x;
    lastPointerWorldY = point.y;
    fireAt(point.x, point.y);
    event.preventDefault();
  }

  function addExplosion(x, y, radius, type = 'default') {
    const sparks = [];
    const sparkCount = 10;

    for (let i = 0; i < sparkCount; i++) {
      const angle = (Math.PI * 2 / sparkCount) * i + Math.random() * 0.35;
      const speed = radius * (2.2 + Math.random() * 1.4);
      sparks.push({
        x,
        y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        size: radius * (0.08 + Math.random() * 0.06)
      });
    }

    explosions.push({ x, y, radius, type, life: 0.46, maxLife: 0.46, sparks });
  }

  function updateRadar(dt) {
    radarAngle += dt * 0.98;
    if (radarAngle >= Math.PI * 2) radarAngle -= Math.PI * 2;
  }

  function update(dt) {
    updateRadar(dt);
    empMuzzleFlash = Math.max(0, empMuzzleFlash - dt);

    if (gameOverPending) {
      gameOverTimer -= dt;
    }

    spawnTimer -= dt;
    fireCooldown -= dt;
    waveTimer -= dt;

    if (waveState === 'active') {
      currentWaveElapsed += dt;

      if (
        hp < 40 &&
        !supportSpawnedThisWave &&
        wave - lastSupportWave >= 2 &&
        !enemies.some(function (enemy) { return enemy.type === 'support'; }) &&
        currentWaveElapsed >= currentWaveDuration * 0.35
      ) {
        spawnSupportDrone();
        supportSpawnedThisWave = true;
        lastSupportWave = wave;
      }

      if (waveTimer <= 0 && enemies.length === 0) {
        waveState = 'break';
        waveTimer = getWaveConfig(wave).breakDuration;
        waveAnnouncements.length = 0;
      } else if (waveTimer <= 0) {
        waveTimer = 0;
      }
    } else if (waveState === 'break') {
      if (waveTimer <= 0) {
        startNextWave();
      }
    }

    if (waveState === 'active') {
      const waveConfig = getWaveConfig(wave);

      if (spawnTimer <= 0 && enemiesSpawnedInWave < waveSpawnBudget) {
        spawnEnemy();
        enemiesSpawnedInWave += 1;
        spawnTimer = waveConfig.spawnInterval;
      }
    }

    for (let i = enemies.length - 1; i >= 0; i--) {
      const enemy = enemies[i];
      enemy.x += enemy.vx * dt;
      enemy.y += enemy.vy * dt;
      enemy.wobble += dt * 0.7;

      const tower = getTower();
      const distanceToTower = Math.hypot(enemy.x - tower.x, enemy.y - tower.y);

      if (!gameOverPending && (distanceToTower < 34 * wu || enemy.y > height + 40 * wu)) {
        if (enemy.type === 'support') {
          enemies.splice(i, 1);
          continue;
        }

        const lostHp = enemyConfig[enemy.type].damage;

        hp -= lostHp;
        combo = 1;
        playBaseHitSound();

        floatingTexts.push({
          x: tower.x,
          y: tower.y - 26 * wu,
          text: '-' + lostHp,
          color: '#ff5a5a',
          life: 0.9
        });

        addExplosion(enemy.x, enemy.y, 28 * wu);
        enemies.splice(i, 1);
        updateUi();
        if (hp <= 0) {
          triggerGameOverSequence();
        }
      }
    }

    for (let i = bullets.length - 1; i >= 0; i--) {
      const bullet = bullets[i];
      bullet.x += bullet.vx * dt;
      bullet.y += bullet.vy * dt;
      bullet.life -= dt;

      if (bullet.life <= 0 || bullet.x < -40 * wu || bullet.x > width + 40 * wu || bullet.y < -60 * wu) {
        combo = 1;
        updateUi();
        bullets.splice(i, 1);
        continue;
      }

      for (let j = enemies.length - 1; j >= 0; j--) {
        const enemy = enemies[j];
        const canHitSupport = enemy.type === 'support' && bullet.weapon === 'gun';
        if (enemy.type !== bullet.targetType && !canHitSupport) continue;

        const distance = Math.hypot(enemy.x - bullet.x, enemy.y - bullet.y);
        if (distance < enemy.size + bullet.radius) {
          enemy.hp -= bullet.damage;
          addExplosion(enemy.x, enemy.y, 20 * wu + bullet.radius, enemy.type === 'swarm' ? 'emp' : 'default');

          if (enemy.type === 'swarm') {
            playSwarmDisableSound();
          } else if (enemy.type !== 'support') {
            playEnemyExplosionSound();
          }

          bullets.splice(i, 1);

          if (enemy.hp <= 0) {
            const gainedScore = enemyConfig[enemy.type].score * combo;

            if (enemy.type === 'support') {
              hp = Math.min(100, hp + 40);

              playSupportDronePickupSound();

              floatingTexts.push({
                x: enemy.x,
                y: enemy.y,
                text: '+40 HP',
                color: '#9ee7ff',
                life: 0.95
              });

              addExplosion(enemy.x, enemy.y, 18 * wu, 'emp');
              enemies.splice(j, 1);
              updateUi();
              break;
            }

            if (enemy.type === 'drone') {
              destroyedDroneCount += 1;
            } else if (enemy.type === 'rocket') {
              destroyedRocketCount += 1;
            } else if (enemy.type === 'swarm') {
              destroyedSwarmCount += 1;
            }

            score += gainedScore;
            combo = Math.min(combo + 1, 12);

            if (combo > maxCombo) {
              maxCombo = combo;
            }

            if (score > maxScore) {
              maxScore = score;
              localStorage.setItem('skyShieldMaxScore', String(maxScore));
            }

            floatingTexts.push({
              x: enemy.x,
              y: enemy.y,
              text: '+' + gainedScore,
              color: '#ffffff',
              life: 0.8
            });

            enemies.splice(j, 1);
            updateUi();
          }
          break;
        }
      }
    }

    for (let i = explosions.length - 1; i >= 0; i--) {
      const explosion = explosions[i];
      explosion.life -= dt;

      if (explosion.sparks) {
        explosion.sparks.forEach(function (spark) {
          spark.x += spark.vx * dt;
          spark.y += spark.vy * dt;
          spark.vx *= 0.94;
          spark.vy *= 0.94;
        });
      }

      if (explosion.life <= 0) explosions.splice(i, 1);
    }

    for (let i = floatingTexts.length - 1; i >= 0; i--) {
      const text = floatingTexts[i];
      text.y -= 52 * dt;
      text.life -= dt;

      if (text.life <= 0) {
        floatingTexts.splice(i, 1);
      }
    }

    for (let i = waveAnnouncements.length - 1; i >= 0; i--) {
      const announcement = waveAnnouncements[i];
      announcement.life -= dt;

      if (announcement.life <= 0) {
        waveAnnouncements.splice(i, 1);
      }
    }

    for (let i = towerDebrisParticles.length - 1; i >= 0; i--) {
      const particle = towerDebrisParticles[i];
      particle.x += particle.vx * dt;
      particle.y += particle.vy * dt;
      particle.vx *= 0.985;
      particle.vy *= 0.985;
      particle.rot += particle.spin * dt;
      particle.life -= dt;

      if (particle.life <= 0) {
        towerDebrisParticles.splice(i, 1);
      }
    }

    if (gameOverPending && gameOverTimer <= 0) {
      endGame();
    }
  }

  function drawGrid() {
    ctx.save();
    ctx.globalAlpha = 0.18;
    ctx.strokeStyle = '#7dff9c';
    ctx.lineWidth = 1 * wu;

    const tower = getTower();
    const step = 100 * wu;
    const maxRadius = Math.hypot(WORLD_WIDTH, WORLD_HEIGHT);

    for (let radius = step; radius <= maxRadius; radius += step) {
      ctx.beginPath();
      ctx.arc(tower.x, tower.y, radius, 0, Math.PI * 2);
      ctx.stroke();
    }

    const rayLength = maxRadius;
    const rayCount = 8;
    for (let i = 0; i < rayCount; i++) {
      const angle = (Math.PI * 2 / rayCount) * i;
      const endX = tower.x + Math.cos(angle) * rayLength;
      const endY = tower.y + Math.sin(angle) * rayLength;
      ctx.beginPath();
      ctx.moveTo(tower.x, tower.y);
      ctx.lineTo(endX, endY);
      ctx.stroke();
    }

    ctx.restore();
  }

  function drawRadarSweep() {
    const tower = getTower();
    const sweepLength = Math.hypot(WORLD_WIDTH, WORLD_HEIGHT);
    const sweepWidth = Math.PI / 3.5;
    const trailSteps = 28;
    const stepAngle = sweepWidth / trailSteps;

    ctx.save();
    for (let i = 0; i < trailSteps; i++) {
      const startAngle = radarAngle - stepAngle * (i + 1);
      const endAngle = radarAngle - stepAngle * i;
      const alpha = 0.22 * (1 - i / trailSteps);
      const gradient = ctx.createRadialGradient(tower.x, tower.y, 0, tower.x, tower.y, sweepLength);
      gradient.addColorStop(0, 'rgba(125, 255, 156, ' + alpha + ')');
      gradient.addColorStop(0.55, 'rgba(125, 255, 156, ' + (alpha * 0.48) + ')');
      gradient.addColorStop(1, 'rgba(125, 255, 156, 0)');
      ctx.fillStyle = gradient;
      ctx.beginPath();
      ctx.moveTo(tower.x, tower.y);
      ctx.arc(tower.x, tower.y, sweepLength, startAngle, endAngle);
      ctx.closePath();
      ctx.fill();
    }

    ctx.strokeStyle = 'rgba(180, 255, 198, 0.7)';
    ctx.lineWidth = 2 * wu;
    ctx.beginPath();
    ctx.moveTo(tower.x, tower.y);
    ctx.lineTo(tower.x + Math.cos(radarAngle) * sweepLength, tower.y + Math.sin(radarAngle) * sweepLength);
    ctx.stroke();
    ctx.restore();
  }

  function drawEmpMuzzleFlash() {
    if (empMuzzleFlash <= 0) return;

    const tower = getTower();
    const flashProgress = empMuzzleFlash / 0.22;

    ctx.save();
    ctx.globalAlpha = flashProgress * 0.5;

    const glowGradient = ctx.createRadialGradient(
      tower.x,
      tower.y - 18 * wu,
      0,
      tower.x,
      tower.y - 18 * wu,
      54 * wu
    );

    glowGradient.addColorStop(0, 'rgba(220, 245, 255, 0.95)');
    glowGradient.addColorStop(0.35, 'rgba(120, 220, 255, 0.42)');
    glowGradient.addColorStop(0.7, 'rgba(90, 170, 255, 0.18)');
    glowGradient.addColorStop(1, 'rgba(90, 170, 255, 0)');

    ctx.fillStyle = glowGradient;
    ctx.beginPath();
    ctx.arc(tower.x, tower.y - 18 * wu, 54 * wu, 0, Math.PI * 2);
    ctx.fill();

    ctx.globalAlpha = flashProgress * 0.7;
    ctx.strokeStyle = 'rgba(150, 225, 255, 0.9)';
    ctx.lineWidth = 2.2 * wu;
    ctx.beginPath();
    ctx.arc(tower.x, tower.y - 18 * wu, 22 * wu + (1 - flashProgress) * 10 * wu, 0, Math.PI * 2);
    ctx.stroke();

    ctx.restore();
  }

  function drawTowerDebris() {
    if (!towerDebrisParticles.length) return;

    ctx.save();

    towerDebrisParticles.forEach(function (particle) {
      const alpha = Math.max(0, particle.life / particle.maxLife);

      ctx.save();
      ctx.globalAlpha = alpha;
      ctx.translate(particle.x, particle.y);
      ctx.rotate(particle.rot);

      ctx.fillStyle = particle.color;
      ctx.shadowColor = particle.color;
      ctx.shadowBlur = particle.size * 1.4;

      ctx.beginPath();
      ctx.rect(-particle.size * 0.5, -particle.size * 0.5, particle.size, particle.size);
      ctx.fill();

      ctx.restore();
    });

    ctx.restore();
  }

  function drawTower() {
    if (towerDestroyed) return;

    const tower = getTower();
    if (!towerSpriteReady) return;

    const towerScale = 0.19;
    const spriteWidth = 760 * wu * towerScale;
    const spriteHeight = 520 * wu * towerScale;
    const drawX = tower.x - spriteWidth * 0.5;
    const drawY = tower.y - spriteHeight + 72 * wu;

    ctx.save();
    ctx.drawImage(towerSprite, drawX, drawY, spriteWidth, spriteHeight);
    ctx.restore();
  }

  function drawEnemy(enemy) {
    const cfg = enemyConfig[enemy.type];

    ctx.save();
    ctx.translate(enemy.x, enemy.y);
    ctx.fillStyle = cfg.color;
    ctx.strokeStyle = 'rgba(255,255,255,0.65)';
    ctx.lineWidth = 1.5 * wu;

    if (enemy.type === 'support') {
      const hubRadius = enemy.size * 0.28;
      const rotorOffset = enemy.size * 0.78;
      const rotorRadius = enemy.size * 0.42;

      ctx.rotate(Math.sin(enemy.wobble * 2.2) * 0.08);

      ctx.save();
      ctx.globalAlpha = 0.22;
      ctx.shadowColor = 'rgba(190, 255, 120, 0.95)';
      ctx.shadowBlur = enemy.size * 1.4;
      ctx.fillStyle = 'rgba(190, 255, 120, 0.24)';
      ctx.beginPath();
      ctx.arc(0, 0, enemy.size * 1.45, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();

      ctx.fillStyle = '#c9ff72';
      ctx.strokeStyle = 'rgba(245, 255, 220, 0.92)';
      ctx.lineWidth = 1.15 * wu;
      drawRoundedRectPath(
        ctx,
        -hubRadius,
        -hubRadius * 0.82,
        hubRadius * 2,
        hubRadius * 1.64,
        2.5 * wu
      );
      ctx.fill();
      ctx.stroke();

      ctx.fillStyle = '#efffd0';
      ctx.beginPath();
      ctx.arc(0, hubRadius * 0.88, enemy.size * 0.085, 0, Math.PI * 2);
      ctx.fill();

      ctx.fillStyle = '#f4ffd8';
      ctx.fillRect(-enemy.size * 0.13, -enemy.size * 0.44, enemy.size * 0.26, enemy.size * 0.88);
      ctx.fillRect(-enemy.size * 0.44, -enemy.size * 0.13, enemy.size * 0.88, enemy.size * 0.26);

      const rotors = [
        [-rotorOffset, -rotorOffset],
        [rotorOffset, -rotorOffset],
        [-rotorOffset, rotorOffset],
        [rotorOffset, rotorOffset]
      ];

      rotors.forEach(function (rotor) {
        const rx = rotor[0];
        const ry = rotor[1];

        ctx.strokeStyle = 'rgba(230, 255, 200, 0.78)';
        ctx.lineWidth = 1.45 * wu;
        ctx.beginPath();
        ctx.moveTo(0, 0);
        ctx.lineTo(rx * 0.78, ry * 0.78);
        ctx.stroke();

        ctx.fillStyle = '#f0ffd2';
        ctx.beginPath();
        ctx.arc(rx, ry, enemy.size * 0.1, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();

        ctx.strokeStyle = 'rgba(200, 255, 130, 0.72)';
        ctx.lineWidth = 0.95 * wu;
        ctx.beginPath();
        ctx.ellipse(rx, ry, rotorRadius, rotorRadius * 0.78, 0, 0, Math.PI * 2);
        ctx.stroke();

        ctx.strokeStyle = 'rgba(245, 255, 220, 0.95)';
        ctx.lineWidth = 0.82 * wu;
        ctx.beginPath();
        ctx.moveTo(rx - rotorRadius * 0.92, ry);
        ctx.lineTo(rx + rotorRadius * 0.92, ry);
        ctx.moveTo(rx, ry - rotorRadius * 0.68);
        ctx.lineTo(rx, ry + rotorRadius * 0.68);
        ctx.stroke();
      });

      ctx.strokeStyle = 'rgba(200, 255, 120, 0.5)';
      ctx.lineWidth = 1 * wu;
      ctx.beginPath();
      ctx.arc(0, 0, enemy.size * 1.18, 0, Math.PI * 2);
      ctx.stroke();
    } else if (enemy.type === 'rocket') {

      ctx.rotate(Math.atan2(enemy.vy, enemy.vx) + Math.PI / 2);
      const heatPulse = 0.5 + 0.5 * Math.sin((enemy.wobble || 0) * 5);

      const bodyWidth = enemy.size * 0.34;
      const bodyTop = -enemy.size * 2.25;
      const bodyBottom = enemy.size * 1.15;
      const finY = enemy.size * 0.55;

      ctx.fillStyle = '#6f8a66';
      ctx.strokeStyle = 'rgba(15, 22, 18, 0.88)';
      ctx.lineWidth = 1.6 * wu;

      ctx.beginPath();
      ctx.moveTo(0, bodyTop);
      ctx.bezierCurveTo(bodyWidth * 0.95, bodyTop + enemy.size * 0.34, bodyWidth * 1.08, -enemy.size * 0.95, bodyWidth, bodyBottom);
      ctx.lineTo(-bodyWidth, bodyBottom);
      ctx.bezierCurveTo(-bodyWidth * 1.08, -enemy.size * 0.95, -bodyWidth * 0.95, bodyTop + enemy.size * 0.34, 0, bodyTop);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();

      ctx.fillStyle = '#8ea184';
      ctx.beginPath();
      ctx.moveTo(0, bodyTop - enemy.size * 0.24);
      ctx.quadraticCurveTo(bodyWidth * 0.72, -enemy.size * 1.78, bodyWidth * 0.82, -enemy.size * 1.42);
      ctx.lineTo(-bodyWidth * 0.82, -enemy.size * 1.42);
      ctx.quadraticCurveTo(-bodyWidth * 0.72, -enemy.size * 1.78, 0, bodyTop - enemy.size * 0.24);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();

      ctx.fillStyle = '#5f7358';
      ctx.beginPath();
      drawRoundedRectPath(ctx, -bodyWidth, -enemy.size * 0.55, bodyWidth * 2, enemy.size * 0.28, 3 * wu);
      ctx.fill();
      ctx.stroke();

      ctx.fillStyle = '#7d9274';
      ctx.beginPath();
      ctx.moveTo(bodyWidth, finY);
      ctx.lineTo(enemy.size * 1.08, enemy.size * 1.42);
      ctx.lineTo(bodyWidth * 0.3, enemy.size * 1.02);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();

      ctx.beginPath();
      ctx.moveTo(-bodyWidth, finY);
      ctx.lineTo(-enemy.size * 1.08, enemy.size * 1.42);
      ctx.lineTo(-bodyWidth * 0.3, enemy.size * 1.02);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();

      ctx.fillStyle = '#4c5f47';
      ctx.beginPath();
      ctx.moveTo(bodyWidth * 0.72, bodyBottom - enemy.size * 0.08);
      ctx.lineTo(enemy.size * 0.72, enemy.size * 1.72);
      ctx.lineTo(bodyWidth * 0.08, bodyBottom + enemy.size * 0.18);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();

      ctx.beginPath();
      ctx.moveTo(-bodyWidth * 0.72, bodyBottom - enemy.size * 0.08);
      ctx.lineTo(-enemy.size * 0.72, enemy.size * 1.72);
      ctx.lineTo(-bodyWidth * 0.08, bodyBottom + enemy.size * 0.18);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();

      ctx.fillStyle = '#394836';
      ctx.beginPath();
      drawRoundedRectPath(ctx, -bodyWidth * 0.62, bodyBottom - enemy.size * 0.02, bodyWidth * 1.24, enemy.size * 0.24, 2 * wu);
      ctx.fill();
      ctx.stroke();

      ctx.save();
      ctx.globalAlpha = 0.16 + heatPulse * 0.5;
      ctx.shadowColor = 'rgba(255, 70, 70, 0.9)';
      ctx.shadowBlur = enemy.size * 1.1;
      ctx.fillStyle = 'rgba(255, 70, 70, 0.28)';
      ctx.beginPath();
      ctx.ellipse(0, -enemy.size * 0.15, enemy.size * 0.72, enemy.size * 1.55, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();

      ctx.save();
      ctx.globalAlpha = 0.22 + heatPulse * 0.28;
      ctx.fillStyle = 'rgba(255, 110, 110, 0.55)';
      ctx.beginPath();
      ctx.ellipse(0, -enemy.size * 0.95, enemy.size * 0.16, enemy.size * 0.34, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();

      ctx.strokeStyle = 'rgba(255, 170, 70, 0.9)';
      ctx.lineWidth = 2.4 * wu;
      ctx.beginPath();
      ctx.moveTo(0, bodyBottom + enemy.size * 0.2);
      ctx.lineTo(0, enemy.size * 2.15);
      ctx.stroke();

      ctx.strokeStyle = 'rgba(255, 90, 40, 0.75)';
      ctx.lineWidth = 1.2 * wu;
      ctx.beginPath();
      ctx.moveTo(0, bodyBottom + enemy.size * 0.28);
      ctx.lineTo(0, enemy.size * 1.82);
      ctx.stroke();
    } else if (enemy.type === 'swarm') {
      const hubRadius = enemy.size * 0.26;
      const rotorOffset = enemy.size * 0.72;
      const rotorRadius = enemy.size * 0.38;

      ctx.fillStyle = '#b7d0ff';
      ctx.strokeStyle = 'rgba(232, 241, 255, 0.88)';
      ctx.lineWidth = 1.1 * wu;
      ctx.beginPath();
      drawRoundedRectPath(ctx, -hubRadius, -hubRadius * 0.78, hubRadius * 2, hubRadius * 1.56, 2.5 * wu);
      ctx.fill();
      ctx.stroke();

      ctx.fillStyle = '#88aef1';
      ctx.beginPath();
      drawRoundedRectPath(ctx, -enemy.size * 0.12, -enemy.size * 0.42, enemy.size * 0.24, enemy.size * 0.11, 1.2 * wu);
      ctx.fill();
      ctx.stroke();

      ctx.fillStyle = '#eef4ff';
      ctx.beginPath();
      ctx.arc(0, hubRadius * 0.86, enemy.size * 0.08, 0, Math.PI * 2);
      ctx.fill();

      const rotors = [
        [-rotorOffset, -rotorOffset],
        [rotorOffset, -rotorOffset],
        [-rotorOffset, rotorOffset],
        [rotorOffset, rotorOffset]
      ];

      rotors.forEach(function (rotor) {
        const rx = rotor[0];
        const ry = rotor[1];

        ctx.strokeStyle = 'rgba(214, 227, 255, 0.72)';
        ctx.lineWidth = 1.5 * wu;
        ctx.beginPath();
        ctx.moveTo(0, 0);
        ctx.lineTo(rx * 0.78, ry * 0.78);
        ctx.stroke();

        ctx.fillStyle = '#d8e5ff';
        ctx.beginPath();
        ctx.arc(rx, ry, enemy.size * 0.095, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();

        ctx.strokeStyle = 'rgba(120, 205, 255, 0.72)';
        ctx.lineWidth = 0.9 * wu;
        ctx.beginPath();
        ctx.ellipse(rx, ry, rotorRadius, rotorRadius * 0.78, 0, 0, Math.PI * 2);
        ctx.stroke();

        ctx.strokeStyle = 'rgba(160, 225, 255, 0.9)';
        ctx.lineWidth = 0.8 * wu;
        ctx.beginPath();
        ctx.moveTo(rx - rotorRadius * 0.92, ry);
        ctx.lineTo(rx + rotorRadius * 0.92, ry);
        ctx.moveTo(rx, ry - rotorRadius * 0.68);
        ctx.lineTo(rx, ry + rotorRadius * 0.68);
        ctx.stroke();
      });

      const waveBase = (enemy.wobble || 0) * 26;
      ctx.strokeStyle = 'rgba(120, 205, 255, 0.5)';
      ctx.lineWidth = 1 * wu;

      for (let i = 0; i < 3; i++) {
        const radius = enemy.size * 0.9 + ((waveBase + i * enemy.size * 1.1) % (enemy.size * 2.2));
        const alpha = 1 - radius / (enemy.size * 3.5);
        ctx.strokeStyle = `rgba(120, 205, 255, ${Math.max(0.18, alpha * 0.45)})`;
        ctx.beginPath();
        ctx.arc(0, 0, radius, 0, Math.PI * 2);
        ctx.stroke();
      }
    } else {
      ctx.rotate(Math.atan2(enemy.vy, enemy.vx) + Math.PI / 2);
      ctx.beginPath();
      ctx.moveTo(0, -enemy.size * 2.2);
      ctx.lineTo(enemy.size * 0.36, -enemy.size * 1.05);
      ctx.lineTo(enemy.size * 2.25, -enemy.size * 0.2);
      ctx.lineTo(enemy.size * 2.05, enemy.size * 0.28);
      ctx.lineTo(enemy.size * 0.32, enemy.size * 0.05);
      ctx.lineTo(enemy.size * 0.22, enemy.size * 1.35);
      ctx.lineTo(enemy.size * 0.95, enemy.size * 1.95);
      ctx.lineTo(enemy.size * 0.78, enemy.size * 2.25);
      ctx.lineTo(0, enemy.size * 1.85);
      ctx.lineTo(-enemy.size * 0.78, enemy.size * 2.25);
      ctx.lineTo(-enemy.size * 0.95, enemy.size * 1.95);
      ctx.lineTo(-enemy.size * 0.22, enemy.size * 1.35);
      ctx.lineTo(-enemy.size * 0.32, enemy.size * 0.05);
      ctx.lineTo(-enemy.size * 2.05, enemy.size * 0.28);
      ctx.lineTo(-enemy.size * 2.25, -enemy.size * 0.2);
      ctx.lineTo(-enemy.size * 0.36, -enemy.size * 1.05);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();

      ctx.fillStyle = '#d8ddd7';
      ctx.beginPath();
      ctx.moveTo(0, -enemy.size * 1.85);
      ctx.lineTo(enemy.size * 0.18, -enemy.size * 1.18);
      ctx.lineTo(-enemy.size * 0.18, -enemy.size * 1.18);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();

      ctx.strokeStyle = 'rgba(36, 44, 38, 0.62)';
      ctx.lineWidth = 1.2 * wu;
      ctx.beginPath();
      ctx.moveTo(0, -enemy.size * 1.78);
      ctx.lineTo(0, enemy.size * 1.58);
      ctx.stroke();

      ctx.strokeStyle = 'rgba(40, 48, 42, 0.55)';
      ctx.lineWidth = 1.1 * wu;
      ctx.beginPath();
      ctx.moveTo(enemy.size * 0.55, -enemy.size * 0.48);
      ctx.lineTo(enemy.size * 1.72, enemy.size * 0.02);
      ctx.stroke();

      ctx.beginPath();
      ctx.moveTo(-enemy.size * 0.55, -enemy.size * 0.48);
      ctx.lineTo(-enemy.size * 1.72, enemy.size * 0.02);
      ctx.stroke();

      ctx.fillStyle = '#bfc6c0';
      ctx.beginPath();
      drawRoundedRectPath(ctx, enemy.size * 0.82, enemy.size * 0.02, enemy.size * 0.22, enemy.size * 0.12, 1.5 * wu);
      ctx.fill();
      ctx.stroke();

      ctx.beginPath();
      drawRoundedRectPath(ctx, -enemy.size * 1.04, enemy.size * 0.02, enemy.size * 0.22, enemy.size * 0.12, 1.5 * wu);
      ctx.fill();
      ctx.stroke();

      ctx.fillStyle = '#dfe5df';
      ctx.beginPath();
      drawRoundedRectPath(ctx, -enemy.size * 0.16, -enemy.size * 0.2, enemy.size * 0.32, enemy.size * 0.42, 2 * wu);
      ctx.fill();
      ctx.stroke();

      ctx.strokeStyle = 'rgba(40, 48, 42, 0.55)';
      ctx.beginPath();
      ctx.moveTo(enemy.size * 0.12, enemy.size * 1.28);
      ctx.lineTo(enemy.size * 0.62, enemy.size * 1.9);
      ctx.stroke();

      ctx.beginPath();
      ctx.moveTo(-enemy.size * 0.12, enemy.size * 1.28);
      ctx.lineTo(-enemy.size * 0.62, enemy.size * 1.9);
      ctx.stroke();
    }

    ctx.restore();
  }

  function drawBullet(bullet) {
    ctx.save();
    ctx.translate(bullet.x, bullet.y);
    ctx.rotate(Math.atan2(bullet.vy, bullet.vx) + Math.PI / 2);

    if (bullet.weapon === 'missile') {
      const size = 1.0 * wu;
      const bodyWidth = bullet.radius * 0.7;
      const bodyTop = -bullet.radius * 2.6;
      const bodyBottom = bullet.radius * 1.8;

      ctx.fillStyle = '#7e8f76';
      ctx.strokeStyle = 'rgba(20, 26, 20, 0.9)';
      ctx.lineWidth = 1.2 * size;

      ctx.beginPath();
      ctx.moveTo(0, bodyTop);
      ctx.bezierCurveTo(
        bodyWidth * 0.95, bodyTop + bullet.radius * 0.45,
        bodyWidth * 1.05, -bullet.radius * 0.9,
        bodyWidth, bodyBottom
      );
      ctx.lineTo(-bodyWidth, bodyBottom);
      ctx.bezierCurveTo(
        -bodyWidth * 1.05, -bullet.radius * 0.9,
        -bodyWidth * 0.95, bodyTop + bullet.radius * 0.45,
        0, bodyTop
      );
      ctx.closePath();
      ctx.fill();
      ctx.stroke();

      ctx.fillStyle = '#a7b59f';
      ctx.beginPath();
      ctx.moveTo(0, bodyTop - bullet.radius * 0.18);
      ctx.lineTo(bodyWidth * 0.75, -bullet.radius * 1.55);
      ctx.lineTo(-bodyWidth * 0.75, -bullet.radius * 1.55);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();

      ctx.fillStyle = '#667560';
      ctx.beginPath();
      ctx.moveTo(bodyWidth, bullet.radius * 0.6);
      ctx.lineTo(bullet.radius * 1.15, bullet.radius * 1.55);
      ctx.lineTo(bodyWidth * 0.18, bullet.radius * 1.1);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();

      ctx.beginPath();
      ctx.moveTo(-bodyWidth, bullet.radius * 0.6);
      ctx.lineTo(-bullet.radius * 1.15, bullet.radius * 1.55);
      ctx.lineTo(-bodyWidth * 0.18, bullet.radius * 1.1);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();

      ctx.strokeStyle = 'rgba(255, 170, 70, 0.95)';
      ctx.lineWidth = 1.8 * size;
      ctx.beginPath();
      ctx.moveTo(0, bodyBottom + bullet.radius * 0.15);
      ctx.lineTo(0, bullet.radius * 2.6);
      ctx.stroke();

      ctx.strokeStyle = 'rgba(255, 95, 40, 0.8)';
      ctx.lineWidth = 0.9 * size;
      ctx.beginPath();
      ctx.moveTo(0, bodyBottom + bullet.radius * 0.25);
      ctx.lineTo(0, bullet.radius * 2.15);
      ctx.stroke();
    } else if (bullet.weapon === 'emp') {
      const color = '#75d7ff';

      ctx.strokeStyle = color;
      ctx.lineWidth = 1.6 * wu;
      ctx.beginPath();
      ctx.arc(0, 0, bullet.radius * 0.9, 0, Math.PI * 2);
      ctx.stroke();

      ctx.beginPath();
      ctx.arc(0, 0, bullet.radius * 1.5, 0, Math.PI * 2);
      ctx.stroke();

      ctx.fillStyle = '#dff8ff';
      ctx.shadowBlur = 12 * wu;
      ctx.shadowColor = color;
      ctx.beginPath();
      ctx.arc(0, 0, bullet.radius * 0.72, 0, Math.PI * 2);
      ctx.fill();
    } else {
      const bulletColor = selectedBulletColor(bullet.weapon);
      ctx.fillStyle = bulletColor;
      ctx.shadowBlur = 12 * wu;
      ctx.shadowColor = bulletColor;
      ctx.beginPath();
      ctx.arc(0, 0, bullet.radius, 0, Math.PI * 2);
      ctx.fill();
    }

    ctx.restore();
  }

  function selectedBulletColor(weapon) {
    if (weapon === 'missile') return '#ffdf6e';
    if (weapon === 'emp') return '#75d7ff';
    return '#dfffe7';
  }

  function drawExplosions() {
    for (const explosion of explosions) {
      const progress = 1 - explosion.life / explosion.maxLife;
      const fade = Math.max(0, 1 - progress);
      const isEmpExplosion = explosion.type === 'emp';

      ctx.save();

      const flashGradient = ctx.createRadialGradient(
        explosion.x,
        explosion.y,
        0,
        explosion.x,
        explosion.y,
        explosion.radius * (0.9 + progress * 0.8)
      );

      if (isEmpExplosion) {
        flashGradient.addColorStop(0, `rgba(236, 247, 255, ${fade * 0.95})`);
        flashGradient.addColorStop(0.35, `rgba(132, 220, 255, ${fade * 0.82})`);
        flashGradient.addColorStop(0.7, `rgba(88, 150, 255, ${fade * 0.48})`);
        flashGradient.addColorStop(1, 'rgba(70, 120, 255, 0)');
      } else {
        flashGradient.addColorStop(0, `rgba(255, 252, 230, ${fade})`);
        flashGradient.addColorStop(0.28, `rgba(255, 214, 110, ${fade * 0.92})`);
        flashGradient.addColorStop(0.62, `rgba(255, 132, 42, ${fade * 0.72})`);
        flashGradient.addColorStop(1, 'rgba(255, 90, 40, 0)');
      }

      ctx.fillStyle = flashGradient;
      ctx.beginPath();
      ctx.arc(explosion.x, explosion.y, explosion.radius * (0.55 + progress * 0.95), 0, Math.PI * 2);
      ctx.fill();

      ctx.globalAlpha = fade;
      ctx.strokeStyle = isEmpExplosion ? '#9eddff' : '#ffe1a1';
      ctx.lineWidth = 3.6 * wu;
      ctx.beginPath();
      ctx.arc(explosion.x, explosion.y, explosion.radius * (0.4 + progress * 1.65), 0, Math.PI * 2);
      ctx.stroke();

      ctx.strokeStyle = isEmpExplosion ? 'rgba(90, 170, 255, 0.55)' : 'rgba(255, 130, 70, 0.55)';
      ctx.lineWidth = 6.8 * wu * fade;
      ctx.beginPath();
      ctx.arc(explosion.x, explosion.y, explosion.radius * (0.2 + progress * 2.05), 0, Math.PI * 2);
      ctx.stroke();

      if (explosion.sparks) {
        explosion.sparks.forEach(function (spark) {
          ctx.fillStyle = isEmpExplosion ? `rgba(170, 230, 255, ${fade * 0.95})` : `rgba(255, 214, 120, ${fade * 0.95})`;
          ctx.beginPath();
          ctx.arc(spark.x, spark.y, spark.size * fade, 0, Math.PI * 2);
          ctx.fill();
        });
      }

      ctx.restore();
    }
  }

  function drawFloatingTexts() {
    for (const text of floatingTexts) {
      ctx.save();
      ctx.globalAlpha = Math.max(text.life, 0);
      ctx.fillStyle = text.color;
      ctx.font = '800 ' + (22 * wu) + 'px Arial';
      ctx.textAlign = 'center';
      ctx.shadowColor = text.color;
      ctx.shadowBlur = 14 * wu;
      ctx.fillText(text.text, text.x, text.y);
      ctx.restore();
    }
  }

  function drawWaveAnnouncements() {
    for (const announcement of waveAnnouncements) {
      const progress = announcement.life / announcement.maxLife;
      const alpha = Math.min(1, progress * 1.4);
      const scale = 0.92 + (1 - progress) * 0.08;

      ctx.save();
      ctx.globalAlpha = alpha;
      ctx.translate(width * 0.5, height * 0.34);
      ctx.scale(scale, scale);

      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillStyle = '#dfe8d8';
      ctx.shadowColor = 'rgba(160, 210, 170, 0.28)';
      ctx.shadowBlur = 20 * wu;
      ctx.font = '900 ' + (44 * wu) + 'px Arial';
      ctx.fillText(announcement.text, 0, 0);

      ctx.restore();
    }

    if (waveState === 'break') {
      ctx.save();
      ctx.globalAlpha = 0.82;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillStyle = '#b9c8bc';
      ctx.shadowColor = 'rgba(120, 150, 125, 0.18)';
      ctx.shadowBlur = 14 * wu;
      ctx.font = '700 ' + (22 * wu) + 'px Arial';
      ctx.fillText('Next wave in ' + Math.ceil(waveTimer), width * 0.5, height * 0.405);
      ctx.restore();
    }
  }

  function draw() {
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.clearRect(0, 0, GAME_WIDTH, GAME_HEIGHT);
    drawGrid();
    drawRadarSweep();
    drawEmpMuzzleFlash();
    for (const bullet of bullets) drawBullet(bullet);
    for (const enemy of enemies) drawEnemy(enemy);
    drawExplosions();
    drawTowerDebris();
    drawFloatingTexts();
    drawWaveAnnouncements();
    drawTower();
  }

  function loop(time) {
    const dt = Math.min(0.033, (time - lastTime) / 1000 || 0);
    lastTime = time;

    if (running && !paused) {
      update(dt);
    }

    draw();
    requestAnimationFrame(loop);
  }

  function fitGameStageToScreen() {
    if (!gameRoot) return;

    const rect = gameRoot.getBoundingClientRect();
    if (rect.width <= 0 || rect.height <= 0) return;

    gameRoot.style.setProperty('--game-scale', Math.min(rect.width / 900, rect.height / 1200));

    gameStage.style.width = '100%';
    gameStage.style.height = '100%';
    gameStage.style.transform = 'none';
  }

  function runRuntimeTests() {
    console.assert(weaponButtons.length === 3, 'There should be exactly 3 weapon buttons.');
    console.assert(weaponOrder.length === 3, 'weaponOrder should have exactly 3 weapons');
    console.assert(getWeaponIndex('gun') === 0, 'gun index should be 0');
    console.assert(getWeaponIndex('missile') === 1, 'missile index should be 1');
    console.assert(getWeaponIndex('emp') === 2, 'emp index should be 2');
    setWeapon('gun');
    console.assert(selectedWeapon === 'gun', 'selected weapon should initialize to gun');
    console.assert(typeof towerSvgMarkup === 'string' && towerSvgMarkup.indexOf('<svg') !== -1, 'tower SVG markup should be valid');
    console.assert(typeof fireAt === 'function', 'fireAt should exist');
    console.assert(typeof getWorldPointFromClient === 'function', 'getWorldPointFromClient should exist');
  }

  weaponButtons.forEach(function (button) {
    function handleWeaponPress(event) {
      event.preventDefault();
      event.stopPropagation();
      setWeapon(button.dataset.weapon);
    }

    button.addEventListener('pointerdown', handleWeaponPress);
    button.addEventListener('touchstart', handleWeaponPress, { passive: false });
    button.addEventListener('click', handleWeaponPress);
  });

  canvas.addEventListener('pointerdown', handleCanvasPointerDown);

  if (skyShieldSoundButton) {
    skyShieldSoundButton.addEventListener('click', function (event) {
      event.preventDefault();
      event.stopPropagation();

      unlockAudio();
      toggleSound();
    });
  }

  if (pauseBtn) {
    pauseBtn.addEventListener('pointerdown', function (event) {
      event.preventDefault();
      event.stopPropagation();
      togglePause();
    });
  }

  window.addEventListener('keydown', function (event) {
    if (event.repeat) return;

    switch (event.code) {
      case 'KeyZ':
        setWeapon('gun');
        break;

      case 'KeyX':
        setWeapon('missile');
        break;

      case 'KeyC':
        setWeapon('emp');
        break;
    }
  });

  function updateKeyboardHintVisibility() {
    if (!keyboardHint) return;
    keyboardHint.classList.toggle('hidden', !shouldShowKeyboardLabels() || running);
  }

  updateKeyboardHintVisibility();
  window.addEventListener('resize', updateKeyboardHintVisibility);

  startBtn.addEventListener('click', startGame);
  window.addEventListener('resize', fitGameStageToScreen);
  const resizeObserver = new ResizeObserver(fitGameStageToScreen);
  resizeObserver.observe(gameRoot);

  window.addEventListener('orientationchange', fitGameStageToScreen);

  document.addEventListener('touchend', function (event) {
    if (event.touches.length > 1) {
      event.preventDefault();
    }
  }, { passive: false });

  document.addEventListener('gesturestart', function (event) {
    event.preventDefault();
  }, { passive: false });

  document.addEventListener('gesturechange', function (event) {
    event.preventDefault();
  }, { passive: false });

  document.addEventListener('gestureend', function (event) {
    event.preventDefault();
  }, { passive: false });

  updateSoundButtonIcon();
  runRuntimeTests();
  setWeapon('gun');
  fitGameStageToScreen();
  updateUi();
  lastTime = performance.now();
  requestAnimationFrame(loop);

  let lastTouchEndTime = 0;

  document.addEventListener('touchstart', function (event) {
    if (event.touches.length > 1) {
      event.preventDefault();
    }
  }, { passive: false });

  document.addEventListener('touchend', function (event) {
    const now = Date.now();

    if (now - lastTouchEndTime <= 350) {
      event.preventDefault();
    }

    lastTouchEndTime = now;
  }, { passive: false });

  document.addEventListener('dblclick', function (event) {
    event.preventDefault();
  }, { passive: false });
});
