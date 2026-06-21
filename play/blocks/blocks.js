function createBlocksDom() {
    const gameRoot = document.getElementById('gameRoot');

    if (!gameRoot) {
        throw new Error('Blocks: #gameRoot was not found.');
    }

    gameRoot.innerHTML = `
<div class="blocksPlayground">
  <canvas id="game" width="900" height="1200"></canvas>

  <button class="blocksSoundButton" id="blocksSoundButton" type="button" aria-label="Toggle sound">
    <i data-lucide="volume-2"></i>
  </button>
</div>

<div class="blocksPaddleTouchZone" id="blocksPaddleTouchZone"></div>

<div style="display:none">
  <span id="score">0</span>
  <span id="highscore">0</span>
  <span id="level">1</span>
  <span id="winProgress"></span>
  <span id="winProgressFill"></span>
</div>
`;
}

createBlocksDom();

requestAnimationFrame(() => {
    updateSoundButtonIcon();

    blocksSoundButton.addEventListener('click', event => {
        event.preventDefault();
        event.stopPropagation();

        unlockAudio();
        toggleSound();
    });
});

const canvas = document.getElementById('game');
const blocksPaddleTouchZone = document.getElementById('blocksPaddleTouchZone');
const blocksSoundButton = document.getElementById('blocksSoundButton');
const ctx = canvas.getContext('2d');
const scoreElement = document.getElementById('score');
const levelElement = document.getElementById('level');
const winProgressFillElement = document.getElementById('winProgressFill');
const winProgressElement = document.getElementById('winProgress');

const highScoreElement = document.getElementById('highscore');

/* Canvas */
const WIDTH = canvas.width;
const HEIGHT = canvas.height;
const UI_SCALE = WIDTH / 480;
const BUILD_VERSION = '124';

/* Grid */
const GRID_COLUMNS = 11;
const GRID_ROWS = 7;

const BLOCK_GAP = 0;
const BLOCK_HEIGHT = (WIDTH - BLOCK_GAP * (GRID_COLUMNS + 1)) / GRID_COLUMNS;
const BLOCK_WIDTH = (WIDTH - BLOCK_GAP * (GRID_COLUMNS + 1)) / GRID_COLUMNS;

const NEW_ROW_INTERVAL = 12000;
const BLOCK_SPEED_GROWTH = 1.0135;

const HUD_PANEL_HEIGHT = BLOCK_HEIGHT;
const HUD_TOP = 10 * UI_SCALE;
const PROGRESS_HEIGHT = 12 * UI_SCALE;
const PROGRESS_TOP = HUD_PANEL_HEIGHT - PROGRESS_HEIGHT - 2 * UI_SCALE;

const PLAY_TOP = HUD_PANEL_HEIGHT;
const BLOCK_TOP = 0;

/* Paddle */
const KEYBOARD_PADDLE_SPEED = 7 * UI_SCALE;
const BASE_PADDLE_WIDTH = 250;
const PADDLE_SHRINK_PER_LEVEL = 0.0085;
const paddle = {
    width: BASE_PADDLE_WIDTH,
    height: 16 * UI_SCALE,
    x: WIDTH / 2 - BASE_PADDLE_WIDTH / 2,
    y: HEIGHT - 45 * UI_SCALE,
    speed: 0
};

/* Ball */
const BASE_BALL_SPEED = 830;
const BALL_SPEED_GROWTH = 1.0165;
const BALL_TRAIL_LENGTH = 8;
const ballTrail = [];
const ball = {
    x: WIDTH / 2,
    y: HEIGHT - 130,
    prevX: WIDTH / 2,
    prevY: HEIGHT - 1300,
    radius: 8 * UI_SCALE,
    speed: BASE_BALL_SPEED,
    dx: 0,
    dy: 0
};

/* Physics */
const MAX_PHYSICS_STEP = 0.5;

/* Level */
const MAX_LEVEL = 50;
const FIRST_LEVEL_SCORE = 300;
const LEVEL_SCORE_GROWTH = 1.05;

/* Bomb */
const BOMB_CHANCE = 0.02;

/* Freeze */
const FREEZE_CHANCE = 0.01;
const FREEZE_DURATION = 10000;

/* High score */
const HIGH_SCORE_STORAGE_KEY = 'blocks_highscore_value';
const HIGH_SCORE_SIGNATURE_KEY = 'blocks_highscore_signature';
const HIGH_SCORE_SALT = 'pitbraun_blocks_v1';
const COMPLETED_KEY = 'blocks_completed';

/* Save */
const SAVE_COST = 3000;
const SAFE_ZONE_BLOCKS = 3;

const saveButton = {
    x: WIDTH / 2,
    y: 0,
    width: 160 * UI_SCALE,
    height: 40 * UI_SCALE
};

const SOUND_ENABLED_KEY = 'blocks_sound_enabled';

let soundEnabled =
    localStorage.getItem(SOUND_ENABLED_KEY) !== '0';

const soundButton = {
    x: 10 * UI_SCALE,
    y: HEIGHT - 40 * UI_SCALE,
    width: 50 * UI_SCALE,
    height: 20 * UI_SCALE
};

const keys = {
    left: false,
    right: false
};

let pointerActive = false;
let lastPointerX = 0;
const DOUBLE_TAP_DELAY = 300;

const startButton = {
    x: WIDTH / 2,
    y: HEIGHT * 0.6,
    radius: 50 * UI_SCALE
};

let score = 0;
let level = 1;
let runElapsedTime = 0;
let shineTime = 0;
let highScore = 0;
let gameOver = false;
let gameWon = false;
let isPaused = false;
let gameStarted = false;
let pauseStartedAt = 0;
let blocks = [];
let pendingTopRow = null;
let rowDropOffset = 0;
let freezeUntilTime = 0;
let freezeStoppedAt = 0;
let freezePauseStartedAt = 0;
let particles = [];
let floatingScoreTexts = [];
let ballVisible = true;
let winAnimationTime = 0;
let winExplosionQueue = [];
let winExplosionStartedAt = 0;
const blockImageCache = new Map();
const blockTextImageCache = new Map();
const specialBlockIconCache = new Map();
const BOMB_ICON_SRC = 'data:image/svg+xml;base64,PD94bWwgdmVyc2lvbj0iMS4wIiBlbmNvZGluZz0iVVRGLTgiPz48c3ZnIGlkPSJhIiB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHZpZXdCb3g9IjAgMCA2NCA2NCI+PHJlY3QgeD0iMCIgd2lkdGg9IjY0IiBoZWlnaHQ9IjY0IiBmaWxsPSIjZjJmMmYyIiBzdHJva2Utd2lkdGg9IjAiLz48cG9seWdvbiBwb2ludHM9IjkgNTUgMCA2NCAwIDAgOSA5IDkgNTUiIGZpbGw9IiNiM2IzYjMiIHN0cm9rZS13aWR0aD0iMCIvPjxwb2x5Z29uIHBvaW50cz0iNTUgNTUgNjQgNjQgNjQgMCA1NSA5IDU1IDU1IiBmaWxsPSIjOTk5IiBzdHJva2Utd2lkdGg9IjAiLz48cmVjdCB4PSI5IiB5PSI5IiB3aWR0aD0iNDYiIGhlaWdodD0iNDYiIGZpbGw9IiNiZmJmYmYiIHN0cm9rZS13aWR0aD0iMCIvPjxwb2x5Z29uIHBvaW50cz0iOSA5IDAgMCA2NCAwIDU1IDkgOSA5IiBmaWxsPSIjZmZmIiBzdHJva2Utd2lkdGg9IjAiLz48cG9seWdvbiBwb2ludHM9IjkgNTUgMCA2NCA2NCA2NCA1NSA1NSA5IDU1IiBmaWxsPSJncmF5IiBzdHJva2Utd2lkdGg9IjAiLz48cGF0aCBkPSJtNDUuMSwxOS41NWMtMy43Mi0uNjMtMTAuNzQuNDktMTQuMDcsNSIgZmlsbD0ibm9uZSIgc3Ryb2tlPSIjNjMzNzAwIiBzdHJva2UtbGluZWNhcD0icm91bmQiIHN0cm9rZS1saW5lam9pbj0icm91bmQiIHN0cm9rZS13aWR0aD0iMiIvPjxjaXJjbGUgY3g9IjI2LjciIGN5PSIzNy4wMiIgcj0iMTQuNyIgdHJhbnNmb3JtPSJ0cmFuc2xhdGUoLTEzLjU1IDU4LjU0KSByb3RhdGUoLTgyLjMzKSIgc3Ryb2tlLXdpZHRoPSIwIi8+PHBvbHlnb24gcG9pbnRzPSI0Mi41OCAxNS44OCA0NS4xIDE5LjU1IDQ2LjY2IDEzLjgxIDQ1LjEgMTkuNTUgNTAuNzkgMTcuODIgNDUuMSAxOS41NSA0OS4yMSAyMy43MSA0NS4xIDE5LjU1IDQzLjIxIDI0LjczIDQ1LjEgMTkuNTUgMzkuNjEgMjEuMTMgNDUuMSAxOS41NSA0Mi41OCAxNS44OCIgZmlsbD0ibm9uZSIgc3Ryb2tlPSIjZmEwIiBzdHJva2UtbGluZWNhcD0icm91bmQiIHN0cm9rZS1saW5lam9pbj0icm91bmQiLz48L3N2Zz4=';
const FREEZE_ICON_SRC = 'data:image/svg+xml;base64,PD94bWwgdmVyc2lvbj0iMS4wIiBlbmNvZGluZz0iVVRGLTgiPz48c3ZnIGlkPSJhIiB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHZpZXdCb3g9IjAgMCA2NCA2NCI+PHJlY3QgeD0iMCIgd2lkdGg9IjY0IiBoZWlnaHQ9IjY0IiBmaWxsPSIjZjJmMmYyIiBzdHJva2Utd2lkdGg9IjAiLz48cG9seWdvbiBwb2ludHM9IjkgNTUgMCA2NCAwIDAgOSA5IDkgNTUiIGZpbGw9IiNiM2IzYjMiIHN0cm9rZS13aWR0aD0iMCIvPjxwb2x5Z29uIHBvaW50cz0iNTUgNTUgNjQgNjQgNjQgMCA1NSA5IDU1IDU1IiBmaWxsPSIjOTk5IiBzdHJva2Utd2lkdGg9IjAiLz48cmVjdCB4PSI5IiB5PSI5IiB3aWR0aD0iNDYiIGhlaWdodD0iNDYiIGZpbGw9IiNiZmJmYmYiIHN0cm9rZS13aWR0aD0iMCIvPjxwb2x5Z29uIHBvaW50cz0iOSA5IDAgMCA2NCAwIDU1IDkgOSA5IiBmaWxsPSIjZmZmIiBzdHJva2Utd2lkdGg9IjAiLz48cG9seWdvbiBwb2ludHM9IjkgNTUgMCA2NCA2NCA2NCA1NSA1NSA5IDU1IiBmaWxsPSJncmF5IiBzdHJva2Utd2lkdGg9IjAiLz48cGF0aCBkPSJtMjkuNDksMTZjLS4yNS4yNiwwLC42OS4zNS42MWwxLjA2LS4yNGMuMTktLjA0LjM4LjA3LjQzLjI1bC4zMiwxLjA0Yy4xMS4zNS41OS4zNS43LDBsLjMyLTEuMDRjLjA2LS4xOC4yNS0uMjkuNDMtLjI1bDEuMDYuMjRjLjM1LjA4LjYtLjM0LjM1LS42MWwtLjc0LS43OWMtLjEzLS4xNC0uMTMtLjM2LDAtLjVsLjc0LS43OWMuMjUtLjI2LDAtLjY5LS4zNS0uNjFsLTEuMDYuMjRjLS4xOS4wNC0uMzgtLjA3LS40My0uMjVsLS4zMi0xLjA0Yy0uMTEtLjM1LS41OS0uMzUtLjcsMGwtLjMyLDEuMDRjLS4wNi4xOC0uMjUuMjktLjQzLjI1bC0xLjA2LS4yNGMtLjM1LS4wOC0uNi4zNC0uMzUuNjFsLjc0Ljc5Yy4xMy4xNC4xMy4zNiwwLC41bC0uNzQuNzlaIiBmaWxsPSIjMGFmIiBzdHJva2Utd2lkdGg9IjAiLz48cGF0aCBkPSJtMzQuNTEsNDhjLjI1LS4yNiwwLS42OS0uMzUtLjYxbC0xLjA2LjI0Yy0uMTkuMDQtLjM4LS4wNy0uNDMtLjI1bC0uMzItMS4wNGMtLjExLS4zNS0uNTktLjM1LS43LDBsLS4zMiwxLjA0Yy0uMDYuMTgtLjI1LjI5LS40My4yNWwtMS4wNi0uMjRjLS4zNS0uMDgtLjYuMzQtLjM1LjYxbC43NC43OWMuMTMuMTQuMTMuMzYsMCwuNWwtLjc0Ljc5Yy0uMjUuMjYsMCwuNjkuMzUuNjFsMS4wNi0uMjRjLjE5LS4wNC4zOC4wNy40My4yNWwuMzIsMS4wNGMuMTEuMzUuNTkuMzUuNywwbC4zMi0xLjA0Yy4wNi0uMTguMjUtLjI5LjQzLS4yNWwxLjA2LjI0Yy4zNS4wOC42LS4zNC4zNS0uNjFsLS43NC0uNzljLS4xMy0uMTQtLjEzLS4zNiwwLS41bC43NC0uNzlaIiBmaWxsPSIjMGFmIiBzdHJva2Utd2lkdGg9IjAiLz48cGF0aCBkPSJtMTQuNzMsMjQuNTJjLS4yNS4yNiwwLC42OS4zNS42MWwxLjA2LS4yNGMuMTktLjA0LjM4LjA3LjQzLjI1bC4zMiwxLjA0Yy4xMS4zNS41OS4zNS43LDBsLjMyLTEuMDRjLjA2LS4xOC4yNS0uMjkuNDMtLjI1bDEuMDYuMjRjLjM1LjA4LjYtLjM0LjM1LS42MWwtLjc0LS43OWMtLjEzLS4xNC0uMTMtLjM2LDAtLjVsLjc0LS43OWMuMjUtLjI2LDAtLjY5LS4zNS0uNjFsLTEuMDYuMjRjLS4xOS4wNC0uMzgtLjA3LS40My0uMjVsLS4zMi0xLjA0Yy0uMTEtLjM1LS41OS0uMzUtLjcsMGwtLjMyLDEuMDRjLS4wNi4xOC0uMjUuMjktLjQzLjI1bC0xLjA2LS4yNGMtLjM1LS4wOC0uNi4zNC0uMzUuNjFsLjc0Ljc5Yy4xMy4xNC4xMy4zNiwwLC41bC0uNzQuNzlaIiBmaWxsPSIjMGFmIiBzdHJva2Utd2lkdGg9IjAiLz48cGF0aCBkPSJtNDkuMjcsMzkuNDhjLjI1LS4yNiwwLS42OS0uMzUtLjYxbC0xLjA2LjI0Yy0uMTkuMDQtLjM4LS4wNy0uNDMtLjI1bC0uMzItMS4wNGMtLjExLS4zNS0uNTktLjM1LS43LDBsLS4zMiwxLjA0Yy0uMDYuMTgtLjI1LjI5LS40My4yNWwtMS4wNi0uMjRjLS4zNS0uMDgtLjYuMzQtLjM1LjYxbC43NC43OWMuMTMuMTQuMTMuMzYsMCwuNWwtLjc0Ljc5Yy0uMjUuMjYsMCwuNjkuMzUuNjFsMS4wNi0uMjRjLjE5LS4wNC4zOC4wNy40My4yNWwuMzIsMS4wNGMuMTEuMzUuNTkuMzUuNywwbC4zMi0xLjA0Yy4wNi0uMTguMjUtLjI5LjQzLS4yNWwxLjA2LjI0Yy4zNS4wOC42LS4zNC4zNS0uNjFsLS43NC0uNzljLS4xMy0uMTQtLjEzLS4zNiwwLS41bC43NC0uNzlaIiBmaWxsPSIjMGFmIiBzdHJva2Utd2lkdGg9IjAiLz48cGF0aCBkPSJtMTkuNzQsMzkuNDhjLjI1LS4yNiwwLS42OS0uMzUtLjYxbC0xLjA2LjI0Yy0uMTkuMDQtLjM4LS4wNy0uNDMtLjI1bC0uMzItMS4wNGMtLjExLS4zNS0uNTktLjM1LS43LDBsLS4zMiwxLjA0Yy0uMDYuMTgtLjI1LjI5LS40My4yNWwtMS4wNi0uMjRjLS4zNS0uMDgtLjYuMzQtLjM1LjYxbC43NC43OWMuMTMuMTQuMTMuMzYsMCwuNWwtLjc0Ljc5Yy0uMjUuMjYsMCwuNjkuMzUuNjFsMS4wNi0uMjRjLjE5LS4wNC4zOC4wNy40My4yNWwuMzIsMS4wNGMuMTEuMzUuNTkuMzUuNywwbC4zMi0xLjA0Yy4wNi0uMTguMjUtLjI5LjQzLS4yNWwxLjA2LjI0Yy4zNS4wOC42LS4zNC4zNS0uNjFsLS43NC0uNzljLS4xMy0uMTQtLjEzLS4zNiwwLS41bC43NC0uNzlaIiBmaWxsPSIjMGFmIiBzdHJva2Utd2lkdGg9IjAiLz48cGF0aCBkPSJtNDguNTMsMjMuNzNjLS4xMy0uMTQtLjEzLS4zNiwwLS41bC43NC0uNzljLjI1LS4yNiwwLS42OS0uMzUtLjYxbC0xLjA2LjI0Yy0uMTkuMDQtLjM4LS4wNy0uNDMtLjI1bC0uMzItMS4wNGMtLjExLS4zNS0uNTktLjM1LS43LDBsLS4zMiwxLjA0Yy0uMDYuMTgtLjI1LjI5LS40My4yNWwtMS4wNi0uMjRjLS4zNS0uMDgtLjYuMzQtLjM1LjYxbC43NC43OWMuMTMuMTQuMTMuMzYsMCwuNWwtLjc0Ljc5Yy0uMjUuMjYsMCwuNjkuMzUuNjFsMS4wNi0uMjRjLjE5LS4wNC4zOC4wNy40My4yNWwuMzIsMS4wNGMuMTEuMzUuNTkuMzUuNywwbC4zMi0xLjA0Yy4wNi0uMTguMjUtLjI5LjQzLS4yNWwxLjA2LjI0Yy4zNS4wOC42LS4zNC4zNS0uNjFsLS43NC0uNzlaIiBmaWxsPSIjMGFmIiBzdHJva2Utd2lkdGg9IjAiLz48cGF0aCBkPSJtNDMuNDcsMzkuMTdjLS4wOC0uMzUuMTItLjcxLjQ3LS44MmwxLjk2LS42Yy42NS0uMi42NS0xLjEyLDAtMS4zMmwtMS45Ni0uNmMtLjM1LS4xMS0uNTUtLjQ2LS40Ny0uODJsLjQ2LTJjLjE1LS42Ny0uNjUtMS4xMy0xLjE1LS42NmwtMS41LDEuNGMtLjI3LjI1LS42OC4yNS0uOTQsMGwtMS41LTEuNGMtLjUtLjQ3LTEuMywwLTEuMTUuNjZsLjM5LDEuNy0yLjE4LTIuMzNjLS4yLS4yMS0uMi0uNTQsMC0uNzVsMi4xOC0yLjMzLS4zOSwxLjdjLS4xNS42Ny42NSwxLjEzLDEuMTUuNjZsMS41LTEuNGMuMjctLjI1LjY4LS4yNS45NCwwbDEuNSwxLjRjLjUuNDcsMS4zLDAsMS4xNS0uNjZsLS40Ni0yYy0uMDgtLjM1LjEyLS43MS40Ny0uODJsMS45Ni0uNmMuNjUtLjIuNjUtMS4xMiwwLTEuMzJsLTEuOTYtLjZjLS4zNS0uMTEtLjU1LS40Ni0uNDctLjgybC40Ni0yYy4xNS0uNjctLjY1LTEuMTMtMS4xNS0uNjZsLTEuNSwxLjRjLS4yNy4yNS0uNjguMjUtLjk0LDBsLTEuNS0xLjRjLS41LS40Ny0xLjMsMC0xLjE1LjY2bC40NiwyYy4wOC4zNS0uMTIuNzEtLjQ3LjgybC0xLjk2LjZjLS42NS4yLS42NSwxLjEyLDAsMS4zMmwxLjY3LjUxLTMuMTEuNzJjLS4yOC4wNi0uNTYtLjEtLjY1LS4zN2wtLjkzLTMuMDUsMS4yNywxLjE5Yy41LjQ3LDEuMywwLDEuMTUtLjY2bC0uNDYtMmMtLjA4LS4zNS4xMi0uNzEuNDctLjgybDEuOTYtLjZjLjY1LS4yLjY1LTEuMTIsMC0xLjMybC0xLjk2LS42Yy0uMzUtLjExLS41NS0uNDYtLjQ3LS44MmwuNDYtMmMuMTUtLjY3LS42NS0xLjEzLTEuMTUtLjY2bC0xLjUsMS40Yy0uMjcuMjUtLjY4LjI1LS45NCwwbC0xLjUtMS40Yy0uNS0uNDctMS4zLDAtMS4xNS42NmwuNDYsMmMuMDguMzUtLjEyLjcxLS40Ny44MmwtMS45Ni42Yy0uNjUuMi0uNjUsMS4xMiwwLDEuMzJsMS45Ni42Yy4zNS4xMS41NS40Ni40Ny44MmwtLjQ2LDJjLS4xNS42Ny42NSwxLjEzLDEuMTUuNjZsMS4yNy0xLjE5LS45MywzLjA1Yy0uMDguMjgtLjM3LjQ0LS42NS4zN2wtMy4xMS0uNzIsMS42Ny0uNTFjLjY1LS4yLjY1LTEuMTIsMC0xLjMybC0xLjk2LS42Yy0uMzUtLjExLS41NS0uNDYtLjQ3LS44MmwuNDYtMmMuMTUtLjY3LS42NS0xLjEzLTEuMTUtLjY2bC0xLjUsMS40Yy0uMjcuMjUtLjY4LjI1LS45NCwwbC0xLjUtMS40Yy0uNS0uNDctMS4zLDAtMS4xNS42NmwuNDYsMmMuMDguMzUtLjEyLjcxLS40Ny44MmwtMS45Ni42Yy0uNjUuMi0uNjUsMS4xMiwwLDEuMzJsMS45Ni42Yy4zNS4xMS41NS40Ni40Ny44MmwtLjQ2LDJjLS4xNS42Ny42NSwxLjEzLDEuMTUuNjZsMS41LTEuNGMuMjctLjI1LjY4LS4yNS45NCwwbDEuNSwxLjRjLjUuNDcsMS4zLDAsMS4xNS0uNjZsLS4zOS0xLjcsMi4xOCwyLjMzYy4yLjIxLjIuNTQsMCwuNzVsLTIuMTgsMi4zMy4zOS0xLjdjLjE1LS42Ny0uNjUtMS4xMy0xLjE1LS42NmwtMS41LDEuNGMtLjI3LjI1LS42OC4yNS0uOTQsMGwtMS41LTEuNGMtLjUtLjQ3LTEuMywwLTEuMTUuNjZsLjQ2LDJjLjA4LjM1LS4xMi43MS0uNDcuODJsLTEuOTYuNmMtLjY1LjItLjY1LDEuMTIsMCwxLjMybDEuOTYuNmMuMzUuMTEuNTUuNDYuNDcuODJsLS40NiwyYy0uMTUuNjcuNjUsMS4xMywxLjE1LjY2bDEuNS0xLjRjLjI3LS4yNS42OC0uMjUuOTQsMGwxLjUsMS40Yy41LjQ3LDEuMywwLDEuMTUtLjY2bC0uNDYtMmMtLjA4LS4zNS4xMi0uNzEuNDctLjgybDEuOTYtLjZjLjY1LS4yLjY1LTEuMTIsMC0xLjMybC0xLjY3LS41MSwzLjExLS43MmMuMjgtLjA2LjU2LjEuNjUuMzdsLjkzLDMuMDUtMS4yNy0xLjE5Yy0uNS0uNDctMS4zLDAtMS4xNS42NmwuNDYsMmMuMDguMzUtLjEyLjcxLS40Ny44MmwtMS45Ni42Yy0uNjUuMi0uNjUsMS4xMiwwLDEuMzJsMS45Ni42Yy4zNS4xMS41NS40Ni40Ny44MmwtLjQ2LDJjLS4xNS42Ny42NSwxLjEzLDEuMTUuNjZsMS41LTEuNGMuMjctLjI1LjY4LS4yNS45NCwwbDEuNSwxLjRjLjUuNDcsMS4zLDAsMS4xNS0uNjZsLS40Ni0yYy0uMDgtLjM1LjEyLS43MS40Ny0uODJsMS45Ni0uNmMuNjUtLjIuNjUtMS4xMiwwLTEuMzJsLTEuOTYtLjZjLS4zNS0uMTEtLjU1LS40Ni0uNDctLjgybC40Ni0yYy4xNS0uNjctLjY1LTEuMTMtMS4xNS0uNjZsLTEuMjcsMS4xOS45My0zLjA1Yy4wOC0uMjguMzctLjQ0LjY1LS4zN2wzLjExLjcyLTEuNjcuNTFjLS42NS4yLS42NSwxLjEyLDAsMS4zMmwxLjk2LjZjLjM1LjExLjU1LjQ2LjQ3LjgybC0uNDYsMmMtLjE1LjY3LjY1LDEuMTMsMS4xNS42NmwxLjUtMS40Yy4yNy0uMjUuNjgtLjI1Ljk0LDBsMS41LDEuNGMuNS40NywxLjMsMCwxLjE1LS42NmwtLjQ2LTJaIiBmaWxsPSIjMGFmIiBzdHJva2Utd2lkdGg9IjAiLz48L3N2Zz4=';
let lastNewRowTime = performance.now();
let lastFrameTime = performance.now();
let fps = 0;
let fpsCounter = 0;
let fpsTime = 0;

const bombIconImage = new Image();
bombIconImage.src = BOMB_ICON_SRC;

const freezeIconImage = new Image();
freezeIconImage.src = FREEZE_ICON_SRC;

/* Audio */

let audioContext = null;
let audioUnlocked = false;
let lastFreezeSoundTime = 0;

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

let sharedReverbNode = null;
let sharedReverbInput = null;

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
    volume = 4,
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

    const finalVolume = Math.min(volume * 8, 0.2);
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
        reverbSend.gain.exponentialRampToValueAtTime(
            0.001,
            now + duration
        );

        outputNode.connect(reverbSend);
        reverbSend.connect(getSharedReverbInput());
    }

    oscillator.start(now);
    oscillator.stop(now + duration);
}

function playBlockHitSound() {
    playTone({
        frequency: 300,
        frequencyEnd: 600,
        duration: 0.05,
        volume: 0.025,
        type: 'sine',
    });
}

function playPaddleHitSound() {
    playTone({
        frequency: 200,
        frequencyEnd: 600,
        duration: 0.3,
        volume: 0.035,
        type: 'triangle',
        
    });
}

function playWallHitSound() {
    playTone({
        frequency: 520,
        frequencyEnd: 260,
        duration: 0.045,
        volume: 0.03,
        type: 'triangle',
        
        distortion: 3
    });
}

function playBombSound() {
    playTone({
        frequency: 120,
        frequencyEnd: 45,
        duration: 0.5,
        volume: 0.015,
        type: 'square',
        
    });

    setTimeout(() => {
        playTone({
            frequency: 70,
            frequencyEnd: 35,
            duration: 0.22,
            volume: 0.055,
            type: 'triangle'
        });
    }, 35);
}

function playFreezeSound() {
    const now = performance.now();

    if (now - lastFreezeSoundTime < 450) {
        return;
    }

    lastFreezeSoundTime = now;

    const notes = [
        { delay: 0,   frequency: 1568.00, duration: 0.055 },
        { delay: 80,  frequency: 2093.00, duration: 0.060 },
        { delay: 170, frequency: 2637.02, duration: 0.070 },
        { delay: 270, frequency: 3136.00, duration: 0.080 },
        { delay: 390, frequency: 2349.32, duration: 0.120 }
    ];

    for (const note of notes) {
        setTimeout(() => {
            playTone({
                frequency: note.frequency,
                frequencyEnd: note.frequency * 1.025,
                duration: note.duration,
                volume: 0.015,
                type: 'sine',
                reverbMix: 0.5
            });
        }, note.delay);
    }
}

function playSalvationSound() {
    const notes = [
        { delay: 0,   frequency: 523.25, duration: 0.08 },
        { delay: 90,  frequency: 659.25, duration: 0.08 },
        { delay: 180, frequency: 783.99, duration: 0.10 },
        { delay: 300, frequency: 1046.50, duration: 0.16 }
    ];

    for (const note of notes) {
        setTimeout(() => {
            playTone({
                frequency: note.frequency,
                frequencyEnd: note.frequency * 1.02,
                duration: note.duration,
                volume: 0.04,
                type: 'triangle',
                reverbMix: 0.08
            });
        }, note.delay);
    }
}

function playStartSound() {
    playTone({
        frequency: 440,
        frequencyEnd: 880,
        duration: 0.16,
        volume: 0.04,
        type: 'triangle'
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

function playGameOverSound() {
    const notes = [
        { delay: 0,   frequency: 392.00, duration: 0.14 },
        { delay: 150, frequency: 329.63, duration: 0.14 },
        { delay: 300, frequency: 261.63, duration: 0.18 },
        { delay: 520, frequency: 196.00, duration: 0.34 }
    ];

    for (const note of notes) {
        setTimeout(() => {
            playTone({
                frequency: note.frequency,
                frequencyEnd: note.frequency * 0.985,
                duration: note.duration,
                volume: 0.06,
                type: 'triangle',
                reverbMix: 0.16,
                delayTime: 0.09,
                delayFeedback: 0.16,
                delayMix: 0.12,
                distortion: 3
            });
        }, note.delay);
    }
}

function playWinSound() {
    const notes = [
        { delay: 0,    frequency: 523.25, duration: 0.12 },
        { delay: 120,  frequency: 659.25, duration: 0.12 },
        { delay: 240,  frequency: 783.99, duration: 0.12 },
        { delay: 360,  frequency: 1046.5, duration: 0.22 },

        { delay: 640,  frequency: 987.77, duration: 0.12 },
        { delay: 760,  frequency: 783.99, duration: 0.12 },
        { delay: 880,  frequency: 880.00, duration: 0.14 },
        { delay: 1040, frequency: 1046.5, duration: 0.28 },

        { delay: 1380, frequency: 659.25, duration: 0.12 },
        { delay: 1500, frequency: 783.99, duration: 0.12 },
        { delay: 1620, frequency: 1046.5, duration: 0.12 },
        { delay: 1740, frequency: 1318.5, duration: 0.35 }
    ];

    for (const note of notes) {
        setTimeout(() => {
            playTone({
                frequency: note.frequency,
                frequencyEnd: note.frequency * 1.015,
                duration: note.duration,
                volume: 0.055,
                type: 'triangle',
                reverbMix: 0.18,
                delayTime: 0.075,
                delayFeedback: 0.18,
                delayMix: 0.14
            });
        }, note.delay);
    }
}

const BLOCK_TYPES = [
    { color: '#ff0000', points: 10 },
    { color: '#ff7f00', points: 15 },
    { color: '#ffff00', points: 20 },
    { color: '#00ff00', points: 25 },
    { color: '#00ffff', points: 30 },
    { color: '#0000ff', points: 35 },
    { color: '#8b00ff', points: 40 },
    { color: '#ff1493', points: 50 }
];

function createRow() {
    const row = [];

    for (let col = 0; col < GRID_COLUMNS; col++) {
    const type = BLOCK_TYPES[Math.floor(Math.random() * BLOCK_TYPES.length)];
    const specialRoll = Math.random();
    const isBomb = specialRoll < BOMB_CHANCE;
    const isFreeze = !isBomb && specialRoll < BOMB_CHANCE + FREEZE_CHANCE;

    row.push({
        active: true,
        color: isBomb ? '#ffffff' : isFreeze ? '#93c5fd' : type.color,
        points: isBomb || isFreeze ? 0 : type.points,
        isBomb: isBomb,
        isFreeze: isFreeze,
        shinePhase: Math.random(),
        shineDuration: Math.random(),
        shineInterval: Math.random()
    });
    }

    return row;
}

function resetBlocks() {
    blocks = [];
    rowDropOffset = 0;
    freezeUntilTime = 0;
    freezePauseStartedAt = 0;
    pendingTopRow = createRow();

    for (let row = 0; row < GRID_ROWS; row++) {
    blocks.push(createRow());
    }
}

function addNewTopRow() {
    blocks.unshift(pendingTopRow || createRow());
    pendingTopRow = createRow();
    rowDropOffset = 0;
}

function getBlockY(row) {
    return BLOCK_TOP + row * (BLOCK_HEIGHT + BLOCK_GAP) + rowDropOffset;
}

function getPendingRowY() {
    return BLOCK_TOP - BLOCK_HEIGHT - BLOCK_GAP + rowDropOffset;
}

function addRows(count) {
    for (let i = 0; i < count; i++) {
    addNewTopRow();
    }
}

function hasActiveBlocks() {
    return blocks.some(row => row.some(block => block.active));
}

function refillBlocksIfEmpty() {
    if (gameWon || hasActiveBlocks()) {
    return;
    }

    if (!pendingTopRow || !pendingTopRow.some(block => block.active)) {
    pendingTopRow = createRow();
    rowDropOffset = 0;
    lastNewRowTime = performance.now();
    }
}

function checkClearedRows() {
    // Cleared rows stay empty.
    // New rows are added by the timer or by full field cleanup.
}

function movePaddleByPointerDelta(clientX) {
    if (!gameStarted || isPaused || gameOver || gameWon) {
        return;
    }

    const rect = canvas.getBoundingClientRect();
    const scaleX = WIDTH / rect.width;
    const deltaX = (clientX - lastPointerX) * scaleX;

    paddle.x += deltaX;
    paddle.x = Math.max(0, Math.min(WIDTH - paddle.width, paddle.x));
    lastPointerX = clientX;
}

function movePaddleToClientX(clientX) {
    if (!gameStarted || isPaused || gameOver || gameWon) {
        return;
    }

    const rect = canvas.getBoundingClientRect();
    const scaleX = WIDTH / rect.width;
    const x = (clientX - rect.left) * scaleX;

    paddle.x = x - paddle.width / 2;
    paddle.x = Math.max(0, Math.min(WIDTH - paddle.width, paddle.x));
}

function pauseGame() {
    pauseStartedAt = performance.now();
    isPaused = true;
    keys.left = false;
    keys.right = false;
    pointerActive = false;
    lastFrameTime = performance.now();
    playPauseSound();
}

function resumeGameFromPause() {
    const pauseDuration = performance.now() - pauseStartedAt;

    lastNewRowTime += pauseDuration;
    freezeUntilTime += pauseDuration;

    pauseStartedAt = 0;
    isPaused = false;

    keys.left = false;
    keys.right = false;
    pointerActive = false;
    lastFrameTime = performance.now();

    playResumeSound();
}

window.addEventListener('mousedown', event => {
    if (isPaused || gameOver || gameWon) {
    return;
    }

    pointerActive = true;
    lastPointerX = event.clientX;
});

window.addEventListener('mousemove', event => {
    if (!pointerActive) {
    return;
    }

    movePaddleByPointerDelta(event.clientX);
});

window.addEventListener('mouseup', () => {
    pointerActive = false;
});

canvas.addEventListener('touchstart', event => {
    const rect = canvas.getBoundingClientRect();
    const touch = event.touches[0];

    const x = (touch.clientX - rect.left) * (WIDTH / rect.width);
    const y = (touch.clientY - rect.top) * (HEIGHT / rect.height);

    if (isPointInsideSoundButton(x, y)) {
        event.preventDefault();
        unlockAudio();
        toggleSound();
        return;
    }

    if (isPaused && !gameOver && !gameWon) {
        event.preventDefault();

        const dx = x - startButton.x;
        const dy = y - startButton.y;
        const dist = Math.sqrt(dx * dx + dy * dy);

        if (dist <= startButton.radius) {
            const pauseDuration = performance.now() - pauseStartedAt;
            lastNewRowTime += pauseDuration;
            freezeUntilTime += pauseDuration;
            pauseStartedAt = 0;
            resumeGameFromPause();
        }

        return;
    }

    if (gameStarted && !gameOver && !gameWon && !isPaused) {
        const saveLeft = saveButton.x - saveButton.width / 2;
        const saveRight = saveButton.x + saveButton.width / 2;
        const saveTop = saveButton.y - saveButton.height / 2;
        const saveBottom = saveButton.y + saveButton.height / 2;

        if (x >= saveLeft && x <= saveRight && y >= saveTop && y <= saveBottom) {
            event.preventDefault();
            useSaveButton();
            lastTapTime = 0;
            return;
        }
    }

    const now = performance.now();

    if (gameStarted && !gameOver && !gameWon && now - lastTapTime <= DOUBLE_TAP_DELAY) {
        event.preventDefault();

        if (isPaused) {
            const pauseDuration = performance.now() - pauseStartedAt;
            lastNewRowTime += pauseDuration;
            freezeUntilTime += pauseDuration;
            pauseStartedAt = 0;
            resumeGameFromPause();
        } else {
            pauseStartedAt = performance.now();
            pauseGame();
        }

        keys.left = false;
        keys.right = false;
        pointerActive = false;
        lastTapTime = 0;
        return;
    }

    lastTapTime = now;

    if (!gameStarted) {
        event.preventDefault();

        const dx = x - startButton.x;
        const dy = y - startButton.y;
        const dist = Math.sqrt(dx * dx + dy * dy);

        if (dist <= startButton.radius) {
            unlockAudio();
            playStartSound();

            gameStarted = true;
            lastNewRowTime = performance.now();
            runElapsedTime = 0;
        }

        return;
    }

    if (gameOver || gameWon) {
        event.preventDefault();

        const dx = x - startButton.x;
        const dy = y - startButton.y;
        const dist = Math.sqrt(dx * dx + dy * dy);

        if (dist <= startButton.radius) {
            unlockAudio();
            playStartSound();

            restartGame();
            gameStarted = true;
            lastNewRowTime = performance.now();
            runElapsedTime = 0;
            lastTapTime = 0;
        }

        return;
    }

    event.preventDefault();
    pointerActive = true;
    lastPointerX = event.touches[0].clientX;
}, { passive: false });

canvas.addEventListener('touchmove', event => {
    event.preventDefault();

    if (!pointerActive) {
    return;
    }

    movePaddleByPointerDelta(event.touches[0].clientX);
}, { passive: false });

canvas.addEventListener('touchend', () => {
    pointerActive = false;
});

blocksPaddleTouchZone.addEventListener('touchstart', event => {
    event.preventDefault();

    pointerActive = true;
    lastPointerX = event.touches[0].clientX;
}, { passive: false });

blocksPaddleTouchZone.addEventListener('touchmove', event => {
    event.preventDefault();

    if (!pointerActive) {
        return;
    }

    movePaddleByPointerDelta(event.touches[0].clientX);
}, { passive: false });

blocksPaddleTouchZone.addEventListener('touchend', () => {
    pointerActive = false;
});

canvas.addEventListener('click', (event) => {
    const rect = canvas.getBoundingClientRect();
    const x = (event.clientX - rect.left) * (WIDTH / rect.width);
    const y = (event.clientY - rect.top) * (HEIGHT / rect.height);

    if (isPointInsideSoundButton(x, y)) {
        unlockAudio();
        toggleSound();
        return;
    }

    if (isPaused && !gameOver && !gameWon) {

        const dx = x - startButton.x;
        const dy = y - startButton.y;
        const dist = Math.sqrt(dx * dx + dy * dy);

        if (dist <= startButton.radius) {
            const pauseDuration = performance.now() - pauseStartedAt;
            lastNewRowTime += pauseDuration;
            freezeUntilTime += pauseDuration;
            pauseStartedAt = 0;
            resumeGameFromPause();
        }

        return;
    }

    if (gameStarted && !gameOver && !gameWon && !isPaused) {
        const saveLeft = saveButton.x - saveButton.width / 2;
        const saveRight = saveButton.x + saveButton.width / 2;
        const saveTop = saveButton.y - saveButton.height / 2;
        const saveBottom = saveButton.y + saveButton.height / 2;

        if (x >= saveLeft && x <= saveRight && y >= saveTop && y <= saveBottom) {
            useSaveButton();
            return;
        }
    }

    if (!gameStarted) {
        const dx = x - startButton.x;
        const dy = y - startButton.y;
        const dist = Math.sqrt(dx * dx + dy * dy);

        if (dist <= startButton.radius) {
            unlockAudio();
            playStartSound();

            gameStarted = true;
            lastNewRowTime = performance.now();
            runElapsedTime = 0;
        }

        return;
    }

    if (gameOver || gameWon) {
        const dx = x - startButton.x;
        const dy = y - startButton.y;
        const dist = Math.sqrt(dx * dx + dy * dy);

        if (dist <= startButton.radius) {
            unlockAudio();
            playStartSound();

            restartGame();
            gameStarted = true;
            lastNewRowTime = performance.now();
            runElapsedTime = 0;
        }

        return;
    }
});

window.addEventListener('keydown', event => {
    if (!isPaused && !gameOver && !gameWon && event.key === 'ArrowLeft') {
    keys.left = true;
    }

    if (!isPaused && !gameOver && !gameWon && event.key === 'ArrowRight') {
    keys.right = true;
    }

    if (event.code === 'Space') {
        if (!gameStarted) {
            unlockAudio();
            playStartSound();

            gameStarted = true;
            lastNewRowTime = performance.now();
            runElapsedTime = 0;
            return;
        }

        if (gameOver || gameWon) {
            unlockAudio();
            playStartSound();

            restartGame();
            gameStarted = true;
            return;
        }

        if (isPaused) {
            const pauseDuration = performance.now() - pauseStartedAt;
            lastNewRowTime += pauseDuration;
            freezeUntilTime += pauseDuration;
            pauseStartedAt = 0;
            resumeGameFromPause();
        } else {
            pauseStartedAt = performance.now();
            pauseGame();
        }

        keys.left = false;
        keys.right = false;
        pointerActive = false;
    }
});

window.addEventListener('keyup', event => {
    if (event.key === 'ArrowLeft') {
    keys.left = false;
    }

    if (event.key === 'ArrowRight') {
    keys.right = false;
    }
});

function createHighScoreSignature(value) {
    const raw = `${HIGH_SCORE_SALT}:${value}:${value * 31 + 17}`;
    let hash = 0;

    for (let i = 0; i < raw.length; i++) {
        hash = ((hash << 5) - hash + raw.charCodeAt(i)) | 0;
    }

    return String(hash);
}

function loadHighScore() {
    try {
        const value = Number.parseInt(localStorage.getItem(HIGH_SCORE_STORAGE_KEY) || '0', 10);
        const signature = localStorage.getItem(HIGH_SCORE_SIGNATURE_KEY);

        if (!Number.isFinite(value) || value < 0) {
            return 0;
        }

        if (signature !== createHighScoreSignature(value)) {
            localStorage.removeItem(HIGH_SCORE_STORAGE_KEY);
            localStorage.removeItem(HIGH_SCORE_SIGNATURE_KEY);
            return 0;
        }

        return value;
    } catch (error) {
        return 0;
    }
}

function saveHighScore(value) {
    try {
        localStorage.setItem(HIGH_SCORE_STORAGE_KEY, String(value));
        localStorage.setItem(HIGH_SCORE_SIGNATURE_KEY, createHighScoreSignature(value));
    } catch (error) {
    }
}

function restartGame() {
    isPaused = false;
    gameOver = false;
    gameWon = false;
    freezeStoppedAt = 0;
    score = 0;
    level = 1;
    particles = [];
    floatingScoreTexts = [];
    ballVisible = true;
    runStartTime = 0;
    runElapsedTime = 0;
    scoreElement.textContent = score;
    levelElement.textContent = level;
    
    lastNewRowTime = performance.now();
    lastFrameTime = performance.now();

    paddle.width = BASE_PADDLE_WIDTH;
    paddle.x = WIDTH / 2 - paddle.width / 2;
    ball.x = WIDTH / 2;
    ball.y = HEIGHT - 130;
    ball.prevX = ball.x;
    ball.prevY = ball.y;
    ball.speed = BASE_BALL_SPEED;
    setBallDirection(0, -1);

    highScore = loadHighScore();

    const isCompleted = localStorage.getItem(COMPLETED_KEY) === '1';

    if (isCompleted) {
        highScoreElement.textContent = '★ ' + highScore + ' ★';
    } else {
        highScoreElement.textContent = highScore;
    }

    resetBlocks();
}

function drawDangerLine() {
    ctx.strokeStyle = '#ff0000';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(0, paddle.y);
    ctx.lineTo(WIDTH, paddle.y);
    ctx.stroke();
}

function drawSafeZone() {
    const safeZoneHeight = BLOCK_HEIGHT * SAFE_ZONE_BLOCKS;
    const safeZoneY = paddle.y - safeZoneHeight;

    ctx.save();

    ctx.fillStyle = 'rgba(255, 255, 255, 0.08)';
    ctx.fillRect(0, safeZoneY, WIDTH, safeZoneHeight);

    ctx.strokeStyle = 'rgba(255, 255, 255, 0.18)';
    ctx.lineWidth = 1;
    ctx.strokeRect(0, safeZoneY, WIDTH, safeZoneHeight);

    ctx.restore();
}

function hasFullRowInSafeZone() {
    const safeZoneTop = paddle.y - BLOCK_HEIGHT * SAFE_ZONE_BLOCKS;
    const safeZoneBottom = paddle.y;

    for (let row = 0; row < blocks.length; row++) {
        const y = getBlockY(row);

        if (y < safeZoneTop || y + BLOCK_HEIGHT > safeZoneBottom) {
            continue;
        }

        const rowHasActiveBlock = blocks[row].some(block => block && block.active);

        if (rowHasActiveBlock) {
            return true;
        }
    }

    return false;
}

function canShowSaveButton() {
    return (
        gameStarted &&
        !gameOver &&
        !gameWon &&
        !isPaused &&
        score >= SAVE_COST &&
        hasFullRowInSafeZone()
    );
}

function updateSaveButtonPosition() {
    const safeZoneTop = paddle.y - BLOCK_HEIGHT * SAFE_ZONE_BLOCKS;
    const safeZoneBottom = paddle.y;

    saveButton.x = WIDTH / 2;
    saveButton.y = safeZoneTop + (safeZoneBottom - safeZoneTop) / 2;
}

function drawPaddle() {
    ctx.fillStyle = '#e5e7eb';
    ctx.fillRect(paddle.x, paddle.y, paddle.width, paddle.height);
}

function getRemainingFreezeTime() {
    const now =
        freezeStoppedAt > 0
            ? freezeStoppedAt
            : (isPaused && pauseStartedAt > 0)
                ? pauseStartedAt
                : performance.now();

    return Math.max(0, freezeUntilTime - now);
}

function drawFreezeTimer() {
    const remainingFreezeTime = getRemainingFreezeTime();

    if (remainingFreezeTime <= 0) {
        return;
    }

    const seconds = Math.ceil(remainingFreezeTime / 1000);
    const label = `Freeze: ${seconds}s`;

    ctx.save();

    ctx.fillStyle = '#dbeafe';
    ctx.font = '20px Arial';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'bottom';
    ctx.fillText(label, WIDTH / 2, HEIGHT - 3);

    ctx.restore();
}

function drawBuildInfo() {
    ctx.save();

    ctx.fillStyle = 'rgba(255, 255, 255, 0.55)';
    ctx.font = '16px Arial';
    ctx.textAlign = 'left';
    ctx.textBaseline = 'bottom';
    ctx.fillText(`Build v${BUILD_VERSION}`, 20, HEIGHT - 10);

    ctx.restore();
}

function isPointInsideSoundButton(x, y) {
    return (
        x >= soundButton.x &&
        x <= soundButton.x + soundButton.width &&
        y >= soundButton.y &&
        y <= soundButton.y + soundButton.height
    );
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
    if (!blocksSoundButton) {
        return;
    }

    blocksSoundButton.innerHTML = soundEnabled
        ? '<i data-lucide="volume-2"></i>'
        : '<i data-lucide="volume-x"></i>';

    if (window.lucide) {
        window.lucide.createIcons();
    }
}

function drawSoundButton() {
    return;
}

function drawRunTimer() {

    const totalSeconds = runElapsedTime / 1000; 
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = Math.floor(totalSeconds % 60);
    const hundredths = Math.floor((totalSeconds % 1) * 100);

    const label =
        `Run: ${String(minutes).padStart(2, '0')}:` +
        `${String(seconds).padStart(2, '0')}.` +
        `${String(hundredths).padStart(2, '0')}`;

    ctx.fillStyle = 'rgb(0, 255, 0)';
    ctx.font = '18px Arial';
    ctx.textAlign = 'right';
    ctx.textBaseline = 'bottom';
    ctx.fillText(label, WIDTH - 20, HEIGHT - 10);

    ctx.textAlign = 'left';
    ctx.textBaseline = 'alphabetic';
}

function drawFPS() {
    ctx.save();

    ctx.fillStyle = 'rgb(0, 255, 0)';
    ctx.font = '18px Arial';
    ctx.textAlign = 'right';
    ctx.textBaseline = 'bottom';

    ctx.fillText(`FPS: ${fps}`, WIDTH -20, HEIGHT - 32);

    ctx.restore();
}

function drawBall() {
    if (!ballVisible) {
        return;
    }

    const isCompleted = localStorage.getItem(COMPLETED_KEY) === '1';

    for (let i = ballTrail.length - 1; i >= 0; i--) {
        const trailPoint = ballTrail[i];
        const progress = 1 - i / ballTrail.length;
        const alpha = progress * 0.35;
        const radius = ball.radius * (0.45 + progress * 0.45);

        ctx.globalAlpha = alpha;
        ctx.beginPath();
        ctx.arc(trailPoint.x, trailPoint.y, radius, 0, Math.PI * 2);
        ctx.fillStyle = isCompleted ? '#ffd700' : '#ffffff';
        ctx.fill();
    }

    ctx.globalAlpha = 1;

    ctx.beginPath();
    ctx.arc(ball.x, ball.y, ball.radius, 0, Math.PI * 2);
    ctx.fillStyle = isCompleted ? '#ffd700' : '#ffffff';
    ctx.fill();
}

function getTextColorForBlock(hexColor) {
    const red = parseInt(hexColor.slice(1, 3), 16);
    const green = parseInt(hexColor.slice(3, 5), 16);
    const blue = parseInt(hexColor.slice(5, 7), 16);
    const brightness = red * 0.299 + green * 0.587 + blue * 0.114;

    return brightness > 140 ? '#000000' : '#ffffff';
}

function shadeHexColor(hexColor, amount) {
    const red = Math.max(0, Math.min(255, parseInt(hexColor.slice(1, 3), 16) + amount));
    const green = Math.max(0, Math.min(255, parseInt(hexColor.slice(3, 5), 16) + amount));
    const blue = Math.max(0, Math.min(255, parseInt(hexColor.slice(5, 7), 16) + amount));

    return `#${red.toString(16).padStart(2, '0')}${green.toString(16).padStart(2, '0')}${blue.toString(16).padStart(2, '0')}`;
}

function isLightColor(hex) {
    return hex === '#ffff00' || hex === '#00ff00' || hex === '#00ffff' || hex === '#ffffff' || hex === '#93c5fd';
}

function getBlockImage(color) {
    if (blockImageCache.has(color)) {
    return blockImageCache.get(color);
    }

    const light = isLightColor(color);
    const top = shadeHexColor(color, light ? 20 : 85);
    const left = shadeHexColor(color, light ? -65 : 35);
    const right = shadeHexColor(color, light ? -95 : -45);
    const center = shadeHexColor(color, light ? -35 : 45);
    const bottom = shadeHexColor(color, light ? -115 : -80);
    const base = shadeHexColor(color, light ? -20 : 30);

    const svg = `<?xml version="1.0" encoding="UTF-8"?>
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64">
        <rect x="0" y="0" width="64" height="64" fill="${base}" />
        <polygon points="9 55 0 64 0 0 9 9 9 55" fill="${left}" />
        <polygon points="55 55 64 64 64 0 55 9 55 55" fill="${right}" />
        <rect x="9" y="9" width="46" height="46" fill="${center}" />
        <polygon points="9 9 0 0 64 0 55 9 9 9" fill="${top}" />
        <polygon points="9 55 0 64 64 64 55 55 9 55" fill="${bottom}" />
        </svg>`;

    const image = new Image();
    image.src = `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`;
    blockImageCache.set(color, image);
    return image;
}

function getSpecialBlockIcon(type) {
    return type === 'bomb' ? bombIconImage : freezeIconImage;
}

function getBlockTextImage(block) {
    const label = String(block.points);
    const key = `${block.color}|${label}`;

    if (blockTextImageCache.has(key)) {
    return blockTextImageCache.get(key);
    }

    const textCanvas = document.createElement('canvas');
    textCanvas.width = BLOCK_WIDTH;
    textCanvas.height = BLOCK_HEIGHT;

    const textCtx = textCanvas.getContext('2d');
    textCtx.fillStyle = getTextColorForBlock(block.color);
    textCtx.font = `${12 * UI_SCALE}px Arial`;
    textCtx.textAlign = 'center';
    textCtx.textBaseline = 'middle';
    textCtx.fillText(label, BLOCK_WIDTH / 2, BLOCK_HEIGHT / 2);

    blockTextImageCache.set(key, textCanvas);
    return textCanvas;
}

function getRenderedBlockImage(block) {
    const type = block.isBomb ? 'bomb' : block.isFreeze ? 'freeze' : 'normal';
    const label = String(block.points);
    const key = `${type}|${block.color}|${label}`;

    if (blockTextImageCache.has(key)) {
        return blockTextImageCache.get(key);
    }

    const baseImage = getBlockImage(block.color);

    if (!baseImage.complete) {
        return baseImage;
    }

    const renderedCanvas = document.createElement('canvas');
    renderedCanvas.width = BLOCK_WIDTH;
    renderedCanvas.height = BLOCK_HEIGHT;

    const renderedCtx = renderedCanvas.getContext('2d');

    renderedCtx.drawImage(baseImage, 0, 0, BLOCK_WIDTH, BLOCK_HEIGHT);

    if (block.isBomb) {
        const icon = getSpecialBlockIcon('bomb');

        if (icon.complete) {
            renderedCtx.drawImage(icon, 0, 0, BLOCK_WIDTH, BLOCK_HEIGHT);
        }
    } else if (block.isFreeze) {
        const icon = getSpecialBlockIcon('freeze');

        if (icon.complete) {
            renderedCtx.drawImage(icon, 0, 0, BLOCK_WIDTH, BLOCK_HEIGHT);
        }
    } else {
        // Point text is now shown only when the block is destroyed.
    }

    blockTextImageCache.set(key, renderedCanvas);
    return renderedCanvas;
}

function drawBlock(block, x, y) {
    ctx.drawImage(getRenderedBlockImage(block), x, y, BLOCK_WIDTH, BLOCK_HEIGHT);

    if (block.isBomb || block.isFreeze) {
        return;
    }

    const time = shineTime;

    const duration = 1.5 + block.shineDuration * 0.45;
    const interval = 3.5 + block.shineInterval * 5.5;
    const phase = block.shinePhase * interval;
    const cycle = (time + phase) % interval;

    if (cycle > duration) {
        return;
    }

    const progress = cycle / duration;
    const shineX = x - BLOCK_WIDTH + progress * BLOCK_WIDTH * 2;

    ctx.save();
    ctx.beginPath();
    ctx.rect(x, y, BLOCK_WIDTH, BLOCK_HEIGHT);
    ctx.clip();

    ctx.globalAlpha = 0.18;
    ctx.translate(shineX, y);
    ctx.rotate(-0.5);
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, BLOCK_WIDTH * 0.18, BLOCK_HEIGHT * 1.6);

    ctx.restore();
    ctx.globalAlpha = 1;
}

function drawPendingTopRow() {
    if (!pendingTopRow) {
    return;
    }

    const y = getPendingRowY();

    for (let col = 0; col < GRID_COLUMNS; col++) {
    const block = pendingTopRow[col];

    if (!block.active) {
        continue;
    }

    const x = BLOCK_GAP + col * (BLOCK_WIDTH + BLOCK_GAP);
    drawBlock(block, x, y);
    }
}

function drawBlocks() {
    for (let row = 0; row < blocks.length; row++) {
    for (let col = 0; col < GRID_COLUMNS; col++) {
        const block = blocks[row][col];

        if (!block.active) {
        continue;
        }

        const x = BLOCK_GAP + col * (BLOCK_WIDTH + BLOCK_GAP);
        const y = getBlockY(row);

        drawBlock(block, x, y);
    }
    }
}

function addExplosion(row, col, color, power = 1) {
    const cx = BLOCK_GAP + col * (BLOCK_WIDTH + BLOCK_GAP) + BLOCK_WIDTH / 2;
    const cy = BLOCK_TOP + row * (BLOCK_HEIGHT + BLOCK_GAP) + BLOCK_HEIGHT / 2;
    const particleCount = Math.round(18 * power);

    for (let i = 0; i < particleCount; i++) {
        const angle = Math.random() * Math.PI * 2;
        const speed = (0.6 + Math.random() * 2.1) * power * UI_SCALE;
        const lifeSpeed = 0.006 + Math.random() * 0.009;

        particles.push({
            x: cx + (Math.random() - 0.5) * BLOCK_WIDTH * 0.35,
            y: cy + (Math.random() - 0.5) * BLOCK_HEIGHT * 0.35,
            vx: Math.cos(angle) * speed,
            vy: Math.sin(angle) * speed,
            size: (1.4 + Math.random() * 3.4) * power * UI_SCALE,
            life: 1,
            lifeSpeed: lifeSpeed,
            color: color
        });
    }
}

function updateExplosions(deltaScale) {
    particles = particles.filter(particle => {
        particle.x += particle.vx * deltaScale;
        particle.y += particle.vy * deltaScale;
        particle.vy += 0.015 * deltaScale;
        particle.life -= particle.lifeSpeed * deltaScale;
        return particle.life > 0;
    });
}

function drawExplosions() {
    for (const particle of particles) {
    ctx.globalAlpha = particle.life;
    ctx.fillStyle = particle.color;
    ctx.fillRect(particle.x, particle.y, particle.size, particle.size);
    ctx.globalAlpha = 1;
    }
}

function addFloatingScoreText(x, y, points, color) {
    if (points <= 0) {
        return;
    }

    floatingScoreTexts.push({
        x: x,
        y: y,
        text: `+${points}`,
        color: color,
        life: 1,
        fontSize: 18
    });
}

function addFloatingFreezeText(row, col) {
    const safeZoneTop = paddle.y - BLOCK_HEIGHT * SAFE_ZONE_BLOCKS;
    const safeZoneBottom = paddle.y;
    const seconds = Math.round(FREEZE_DURATION / 1000);

    floatingScoreTexts.push({
        x: WIDTH / 2,
        y: safeZoneTop + (safeZoneBottom - safeZoneTop) / 2,
        text: `FREEZE +${seconds}s`,
        color: '#93c5fd',
        life: 1,
        fontSize: 28
    });
}

function updateFloatingScoreTexts(deltaScale) {
    floatingScoreTexts = floatingScoreTexts.filter(item => {
        item.y -= 0.45 * deltaScale;
        item.life -= 0.008 * deltaScale;
        return item.life > 0;
    });
}

function drawFloatingScoreTexts() {
    ctx.save();

    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    

    for (const item of floatingScoreTexts) {
        ctx.globalAlpha = Math.max(0, item.life);
        ctx.fillStyle = item.color;
        ctx.font = `bold ${(item.fontSize || 24) * UI_SCALE}px Arial`;
        ctx.fillText(item.text, item.x, item.y);
    }

    ctx.restore();
    ctx.globalAlpha = 1;
}

function setBallDirection(dx, dy) {
    const length = Math.sqrt(dx * dx + dy * dy);

    if (length === 0) {
    ball.dx = 0;
    ball.dy = -ball.speed;
    return;
    }

    ball.dx = (dx / length) * ball.speed;
    ball.dy = (dy / length) * ball.speed;
}

function getLevelByScore(currentScore) {
    let calculatedLevel = 1;
    let totalScoreNeeded = 0;
    let levelScoreNeeded = FIRST_LEVEL_SCORE;

    while (calculatedLevel < MAX_LEVEL) {
    totalScoreNeeded += Math.round(levelScoreNeeded);

    if (currentScore < totalScoreNeeded) {
        break;
    }

    calculatedLevel++;
    levelScoreNeeded *= LEVEL_SCORE_GROWTH;
    }

    return calculatedLevel;
}

function getScoreRequiredToCompleteGame() {
    let totalScoreNeeded = 0;
    let levelScoreNeeded = FIRST_LEVEL_SCORE;

    for (let i = 1; i <= MAX_LEVEL; i++) {
    totalScoreNeeded += Math.round(levelScoreNeeded);
    levelScoreNeeded *= LEVEL_SCORE_GROWTH;
    }

    return totalScoreNeeded;
}

function explodeAllBlocksForWin() {
    winExplosionQueue = [];

    if (pendingTopRow) {
        const pendingY = getPendingRowY();

        for (let col = 0; col < GRID_COLUMNS; col++) {
            const block = pendingTopRow[col];

            if (!block || !block.active) {
                continue;
            }

            winExplosionQueue.push({
                block: block,
                row: -1,
                col: col,
                color: block.color,
                delayMs: Math.random() * 2500,
                y: pendingY
            });
        }
    }

    for (let row = 0; row < blocks.length; row++) {
        const y = getBlockY(row);

        for (let col = 0; col < GRID_COLUMNS; col++) {
            const block = blocks[row][col];

            if (!block || !block.active) {
                continue;
            }

            winExplosionQueue.push({
                block: block,
                row: row,
                col: col,
                color: block.color,
                delayMs: Math.random() * 2500,
                y: y
            });
        }
    }

    winExplosionQueue.sort((a, b) => a.delay - b.delay);
}

function updateWinExplosions() {
    const elapsedMs = performance.now() - winExplosionStartedAt;

    for (const item of winExplosionQueue) {
        if (item.delayMs > elapsedMs) {
            continue;
        }

        if (!item.block.active) {
            continue;
        }

        item.block.active = false;
        addExplosion(item.row, item.col, item.color, 1.4);
    }

    winExplosionQueue = winExplosionQueue.filter(item => item.block.active);
}

function addBallWinExplosion() {
    const particleCount = 80;

    for (let i = 0; i < particleCount; i++) {
        const angle = Math.random() * Math.PI * 2;
        const speed = 1.2 + Math.random() * 4.2;
        const lifeSpeed = 0.004 + Math.random() * 0.008;

        particles.push({
            x: ball.x,
            y: ball.y,
            vx: Math.cos(angle) * speed,
            vy: Math.sin(angle) * speed,
            size: 2.0 + Math.random() * 5.0,
            life: 1,
            lifeSpeed: lifeSpeed,
            color: '#ffd700'
        });
    }
}

function checkWinCondition() {
    if (gameWon) {
        return;
    }

    if (score >= getScoreRequiredToCompleteGame()) {
        gameWon = true;
        playWinSound();
        winAnimationTime = 0;
        winExplosionStartedAt = performance.now();
        localStorage.setItem(COMPLETED_KEY, '1');
        ballVisible = false;
        addBallWinExplosion();
        explodeAllBlocksForWin();
    }
}

function getSpeedByLevel(currentLevel) {
    return BASE_BALL_SPEED * Math.pow(BALL_SPEED_GROWTH, currentLevel - 1);
}

function getPaddleWidthByLevel(currentLevel) {
    const shrink = BASE_PADDLE_WIDTH * PADDLE_SHRINK_PER_LEVEL * (currentLevel - 1);
    return Math.max(BASE_PADDLE_WIDTH * 0.35, BASE_PADDLE_WIDTH - shrink);
}

function updateLevelAndSpeed() {
    const newLevel = getLevelByScore(score);

    if (newLevel === level) {
    return;
    }

    level = newLevel;
    ball.speed = getSpeedByLevel(level);
    paddle.width = getPaddleWidthByLevel(level);
    paddle.x = Math.max(0, Math.min(WIDTH - paddle.width, paddle.x));
    setBallDirection(ball.dx, ball.dy);
    levelElement.textContent = level;
}

function drawGameOver() {
    ctx.fillStyle = 'rgba(0, 0, 0, 0.65)';
    ctx.fillRect(0, 0, WIDTH, HEIGHT);

    ctx.fillStyle = '#ffffff';
    ctx.font = '72px Arial';
    ctx.textAlign = 'center';
    ctx.fillText('Game Over', WIDTH / 2, HEIGHT / 2 - 18);

    ctx.font = '18px Arial';
    ctx.fillText(' ', WIDTH / 2, HEIGHT / 2 + 18);
    ctx.textAlign = 'left';
}

function drawWin() {
    ctx.fillStyle = 'rgba(0, 0, 0, 0.55)';
    ctx.fillRect(0, 0, WIDTH, HEIGHT);

    const pulse = Math.sin(winAnimationTime * 8) * 0.5 + 0.5;
    const glow = 12 + pulse * 18;

    ctx.save();

    ctx.shadowColor = '#ffd700';
    ctx.shadowBlur = glow;
    ctx.fillStyle = '#ffd700';
    ctx.font = '120px Arial';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('WIN', WIDTH / 2, HEIGHT / 2 - 30);

    ctx.shadowBlur = 0;
    ctx.fillStyle = '#ffffff';
    ctx.font = '18px Arial';
    ctx.fillText('Press restart to play again', WIDTH / 2, HEIGHT / 2 + 24);

    ctx.restore();
}

function collideWithWalls() {
    if (ball.x - ball.radius <= 0) {
        ball.x = ball.radius;
        ball.dx = Math.abs(ball.dx);
        playWallHitSound();
    }

    if (ball.x + ball.radius >= WIDTH) {
        ball.x = WIDTH - ball.radius;
        ball.dx = -Math.abs(ball.dx);
        playWallHitSound();
    }

    if (ball.y - ball.radius <= PLAY_TOP) {
        ball.y = PLAY_TOP + ball.radius;
        ball.dy = Math.abs(ball.dy);
        playWallHitSound();
    }

    if (ball.y - ball.radius > HEIGHT) {
        if (!gameOver) {
            playGameOverSound();
        }

        gameOver = true;
    }
}

function collideWithPaddle() {
    const paddleTop = paddle.y;
    const paddleBottom = paddle.y + paddle.height;
    const paddleLeft = paddle.x;
    const paddleRight = paddle.x + paddle.width;

    const previousBallRight = ball.prevX + ball.radius;
    const previousBallLeft = ball.prevX - ball.radius;
    const previousBallBottom = ball.prevY + ball.radius;
    const previousBallTop = ball.prevY - ball.radius;

    const currentBallRight = ball.x + ball.radius;
    const currentBallLeft = ball.x - ball.radius;
    const currentBallBottom = ball.y + ball.radius;
    const currentBallTop = ball.y - ball.radius;

    const movingDown = ball.dy > 0;
    const crossedPaddleTop =
    movingDown &&
    previousBallBottom <= paddleTop &&
    currentBallBottom >= paddleTop;

    if (crossedPaddleTop) {
    const movementY = ball.y - ball.prevY;
    let hitX = ball.x;

        if (movementY !== 0) {
            let hitTime = (paddleTop - previousBallBottom) / movementY;
            hitTime = Math.max(0, Math.min(1, hitTime));
            hitX = ball.prevX + (ball.x - ball.prevX) * hitTime;
        }

        const circleTouchesPaddleTop =
            hitX + ball.radius >= paddleLeft &&
            hitX - ball.radius <= paddleRight;

        if (circleTouchesPaddleTop) {
            const safeHitX = Math.max(paddleLeft, Math.min(paddleRight, hitX));
            const paddleCenter = paddle.x + paddle.width / 2;
            const rawHitPosition = (safeHitX - paddleCenter) / (paddle.width / 2);
            const hitPosition = Math.max(-0.85, Math.min(0.85, rawHitPosition));

            const angle = hitPosition * Math.PI / 3;
            setBallDirection(Math.sin(angle), -Math.cos(angle));

            ball.x = safeHitX;
            ball.y = paddleTop - ball.radius - 0.5;
            ball.prevX = ball.x;
            ball.prevY = ball.y;
            playPaddleHitSound();
            return;
        }
    }

    const verticalOverlap =
    currentBallBottom >= paddleTop &&
    currentBallTop <= paddleBottom;

    if (!verticalOverlap) {
    return;
    }

    const crossedLeftSide =
    ball.dx > 0 &&
    previousBallRight <= paddleLeft &&
    currentBallRight >= paddleLeft;

    const crossedRightSide =
    ball.dx < 0 &&
    previousBallLeft >= paddleRight &&
    currentBallLeft <= paddleRight;

    if (crossedLeftSide) {
    ball.x = paddleLeft - ball.radius - 0.5;
    ball.dx = -Math.abs(ball.dx);
    ball.prevX = ball.x;
    ball.prevY = ball.y;
    return;
    }

    if (crossedRightSide) {
    ball.x = paddleRight + ball.radius + 0.5;
    ball.dx = Math.abs(ball.dx);
    ball.prevX = ball.x;
    ball.prevY = ball.y;
    }
}

function getBlockAt(row, col) {
    if (col < 0 || col >= GRID_COLUMNS) {
    return null;
    }

    if (row === -1) {
    return pendingTopRow ? pendingTopRow[col] : null;
    }

    return blocks[row]?.[col] || null;
}

function destroyBlock(row, col) {
    const block = getBlockAt(row, col);

    if (!block || !block.active) {
    return 0;
    }

    block.active = false;
    return block.points;
}

function useSaveButton() {
    if (!gameStarted || gameOver || gameWon || isPaused) {
        return;
    }

    if (score < SAVE_COST) {
        return;
    }

    const safeZoneTop = paddle.y - BLOCK_HEIGHT * SAFE_ZONE_BLOCKS;
    const safeZoneBottom = paddle.y;

    let destroyedAnyBlock = false;

    for (let row = 0; row < blocks.length; row++) {
        const y = getBlockY(row);

        if (y + BLOCK_HEIGHT < safeZoneTop || y > safeZoneBottom) {
            continue;
        }

        for (let col = 0; col < GRID_COLUMNS; col++) {
            const block = blocks[row][col];

            if (!block || !block.active) {
                continue;
            }

            block.active = false;
            destroyedAnyBlock = true;
            addExplosion(row, col, block.color, 0.9);
        }
    }

    if (!destroyedAnyBlock) {
        return;
    }

    playSalvationSound();

    score = Math.max(0, score - SAVE_COST);
    scoreElement.textContent = score;

    const newLevel = getLevelByScore(score);
    level = newLevel;
    ball.speed = getSpeedByLevel(level);
    paddle.width = getPaddleWidthByLevel(level);
    paddle.x = Math.max(0, Math.min(WIDTH - paddle.width, paddle.x));
    setBallDirection(ball.dx, ball.dy);
    levelElement.textContent = level;
}

function explodeBomb(centerRow, centerCol) {
    let pointsEarned = 0;
    const bombsToExplode = [{ row: centerRow, col: centerCol }];
    const explodedBombs = new Set();

    while (bombsToExplode.length > 0) {
    const currentBomb = bombsToExplode.shift();
    const bombKey = `${currentBomb.row}|${currentBomb.col}`;

    if (explodedBombs.has(bombKey)) {
        continue;
    }

    const bombBlock = getBlockAt(currentBomb.row, currentBomb.col);

    if (!bombBlock || !bombBlock.active || !bombBlock.isBomb) {
        continue;
    }

    explodedBombs.add(bombKey);
    bombBlock.active = false;
    addExplosion(currentBomb.row, currentBomb.col, '#ffffff', 2.1);

    for (let row = currentBomb.row - 1; row <= currentBomb.row + 1; row++) {
        for (let col = currentBomb.col - 1; col <= currentBomb.col + 1; col++) {
        const block = getBlockAt(row, col);

        if (!block || !block.active) {
            continue;
        }

        if (block.isBomb) {
            bombsToExplode.push({ row: row, col: col });
            continue;
        }

        pointsEarned += destroyBlock(row, col);
        }
    }
    }

    return pointsEarned;
}


function activateFreeze(row, col) {
    const now = performance.now();
    const remainingFreezeTime = Math.max(0, freezeUntilTime - now);
    freezeUntilTime = now + remainingFreezeTime + FREEZE_DURATION;
    freezePauseStartedAt = 0;
    
    addExplosion(row, col, '#93c5fd', 1.4);
    addFloatingFreezeText(row, col);
}

function reflectBallFromBlock(x, y) {
    const previousBallRight = ball.prevX + ball.radius;
    const previousBallLeft = ball.prevX - ball.radius;
    const previousBallBottom = ball.prevY + ball.radius;
    const previousBallTop = ball.prevY - ball.radius;

    const blockLeft = x;
    const blockRight = x + BLOCK_WIDTH;
    const blockTop = y;
    const blockBottom = y + BLOCK_HEIGHT;

    const cameFromLeft = previousBallRight <= blockLeft;
    const cameFromRight = previousBallLeft >= blockRight;
    const cameFromTop = previousBallBottom <= blockTop;
    const cameFromBottom = previousBallTop >= blockBottom;

    if (cameFromLeft || cameFromRight) {
    ball.dx = -ball.dx;
    return;
    }

    if (cameFromTop || cameFromBottom) {
    ball.dy = -ball.dy;
    return;
    }

    const overlapLeft = ball.x + ball.radius - blockLeft;
    const overlapRight = blockRight - (ball.x - ball.radius);
    const overlapTop = ball.y + ball.radius - blockTop;
    const overlapBottom = blockBottom - (ball.y - ball.radius);

    const minOverlapX = Math.min(overlapLeft, overlapRight);
    const minOverlapY = Math.min(overlapTop, overlapBottom);

    if (minOverlapX < minOverlapY) {
    ball.dx = -ball.dx;
    } else {
    ball.dy = -ball.dy;
    }
}

function collideWithSingleBlock(row, col, block, y) {
    if (!block.active) {
    return false;
    }

    if (y + BLOCK_HEIGHT <= 0) {
    return false;
    }

    const x = BLOCK_GAP + col * (BLOCK_WIDTH + BLOCK_GAP);

    const hitX = ball.x + ball.radius >= x && ball.x - ball.radius <= x + BLOCK_WIDTH;
    const hitY = ball.y + ball.radius >= y && ball.y - ball.radius <= y + BLOCK_HEIGHT;

    if (!hitX || !hitY) {
    return false;
    }

    let pointsEarned = 0;

    if (block.isBomb) {
        playBombSound();
        pointsEarned = explodeBomb(row, col);
    } else if (block.isFreeze) {
        playFreezeSound();
        pointsEarned = destroyBlock(row, col);
        activateFreeze(row, col);
    } else {
        playBlockHitSound();
        pointsEarned = destroyBlock(row, col);
        addExplosion(row, col, block.color, 1.1);
    }

    addFloatingScoreText(
        x + BLOCK_WIDTH / 2,
        y + BLOCK_HEIGHT / 2,
        pointsEarned,
        block.color
    );

    reflectBallFromBlock(x, y);
    score += pointsEarned;
    scoreElement.textContent = score;

    if (score > highScore) {
    highScore = score;
    highScoreElement.textContent = highScore;
    saveHighScore(highScore);
    }

    updateLevelAndSpeed();
    checkWinCondition();
    refillBlocksIfEmpty();
    checkClearedRows();
    return true;
}

function collideWithBlocks() {
    if (pendingTopRow) {
    const pendingY = getPendingRowY();

    for (let col = 0; col < GRID_COLUMNS; col++) {
        const block = pendingTopRow[col];

        if (collideWithSingleBlock(-1, col, block, pendingY)) {
        return;
        }
    }
    }

    for (let row = 0; row < blocks.length; row++) {
    const y = getBlockY(row);

    for (let col = 0; col < GRID_COLUMNS; col++) {
        const block = blocks[row][col];

        if (collideWithSingleBlock(row, col, block, y)) {
        return;
        }
    }
    }
}

function updatePaddleByKeyboard(deltaScale) {
    if (keys.left) {
    paddle.x -= KEYBOARD_PADDLE_SPEED * deltaScale;
    }

    if (keys.right) {
    paddle.x += KEYBOARD_PADDLE_SPEED * deltaScale;
    }

    paddle.x = Math.max(0, Math.min(WIDTH - paddle.width, paddle.x));
}

function checkBlocksReachedPaddle() {
    for (let row = 0; row < blocks.length; row++) {
    for (let col = 0; col < GRID_COLUMNS; col++) {
        const block = blocks[row][col];

        if (!block.active) {
        continue;
        }

        const y = getBlockY(row);

        if (y + BLOCK_HEIGHT >= paddle.y) {
            if (!gameOver) {
                playGameOverSound();
            }

            gameOver = true;
            return;
        }
    }
    }
}

function updateTimedRows() {
    const now = performance.now();

    if (now < freezeUntilTime) {
    if (freezePauseStartedAt === 0) {
        freezePauseStartedAt = now;
    }
    return;
    }

    if (freezePauseStartedAt !== 0) {
    lastNewRowTime += now - freezePauseStartedAt;
    freezePauseStartedAt = 0;
    
    }

    const levelSpeedMultiplier = Math.pow(BLOCK_SPEED_GROWTH, level - 1);
    const adjustedInterval = NEW_ROW_INTERVAL / levelSpeedMultiplier;

    const elapsed = now - lastNewRowTime;
    const progress = Math.min(elapsed / adjustedInterval, 1);
    rowDropOffset = progress * (BLOCK_HEIGHT + BLOCK_GAP);
    checkBlocksReachedPaddle();
    if (progress >= 1) {
    addNewTopRow();
    checkBlocksReachedPaddle();
    lastNewRowTime = now;
    }
}

function updateBallPhysics(deltaSeconds) {
    ball.prevX = ball.x;
    ball.prevY = ball.y;

    ball.x += ball.dx * deltaSeconds;
    ball.y += ball.dy * deltaSeconds;

    collideWithWalls();
    collideWithPaddle();
    collideWithBlocks();

    ballTrail.unshift({ x: ball.x, y: ball.y });

    if (ballTrail.length > BALL_TRAIL_LENGTH) {
        ballTrail.pop();
    }
}

function update(deltaSeconds) {
    if (!gameStarted || gameOver || isPaused) {
        if (gameOver && freezeStoppedAt === 0) {
            freezeStoppedAt = performance.now();
        }

        updateFloatingScoreTexts(deltaSeconds * 60);
        return;
    }

    if (gameWon) {
        if (freezeStoppedAt === 0) {
            freezeStoppedAt = performance.now();
        }

        winAnimationTime += deltaSeconds;
        updateWinExplosions();
        updateExplosions(deltaSeconds * 60);
        updateFloatingScoreTexts(deltaSeconds * 60);
        return;
    }

    runElapsedTime += deltaSeconds * 1000;
    shineTime += deltaSeconds;

    updatePaddleByKeyboard(deltaSeconds * 60);
    updateTimedRows();
    updateExplosions(deltaSeconds * 60);
    updateFloatingScoreTexts(deltaSeconds * 60);

    const maxStepSeconds = 1 / 120;
    const steps = Math.max(1, Math.ceil(deltaSeconds / maxStepSeconds));
    const stepSeconds = deltaSeconds / steps;

    for (let step = 0; step < steps; step++) {
        updateBallPhysics(stepSeconds);

        if (gameOver || gameWon) {
            break;
        }
    }
}

function drawWinProgress() {
    const requiredScore = getScoreRequiredToCompleteGame();
    const progress = Math.max(0, Math.min(1, score / requiredScore));

    const barX = 2;
    const barWidth = WIDTH - 4;

    const barY = PROGRESS_TOP;
    const barHeight = PROGRESS_HEIGHT;

    const colorStops = [
        [0,    [0, 0, 255]],     // blue
        [0.25, [0, 255, 0]],     // green
        [0.5,  [255, 255, 0]],   // yellow
        [0.75, [255, 127, 0]],   // orange
        [0.95, [255, 0, 0]]      // red almost at the end
    ];

    let fillColor = 'rgb(0,0,255)';

    for (let i = 0; i < colorStops.length - 1; i++) {
        const [p1, c1] = colorStops[i];
        const [p2, c2] = colorStops[i + 1];

        if (progress >= p1 && progress <= p2) {
            const t = (progress - p1) / (p2 - p1);
            fillColor = interpolateColor(c1, c2, t);
            break;
        }

        if (progress > 0.95) {
            fillColor = 'rgb(255,0,0)';
        }
    }

    const stripeWidth = 16;
    const offset = (shineTime * 20) % stripeWidth;

    ctx.save();

    ctx.fillStyle = '#3f3f46';
    ctx.fillRect(barX, barY, barWidth, barHeight);

    ctx.beginPath();
    ctx.rect(barX, barY, barWidth, barHeight);
    ctx.clip();

    ctx.strokeStyle = 'rgba(255, 255, 255, 0.22)';
    ctx.lineWidth = 4;

    for (let x = -barHeight - stripeWidth; x < barWidth + stripeWidth; x += stripeWidth) {
        ctx.beginPath();
        ctx.moveTo(x + offset, barY + barHeight);
        ctx.lineTo(x + offset + barHeight, barY);
        ctx.stroke();
    }

    ctx.restore();

    ctx.save();

    ctx.beginPath();
    ctx.rect(barX, barY, barWidth * progress, barHeight);
    ctx.clip();

    ctx.fillStyle = fillColor;
    ctx.fillRect(barX, barY, barWidth, barHeight);

    ctx.strokeStyle = 'rgba(255, 255, 255, 0.35)';
    ctx.lineWidth = 4;

    for (let x = -barHeight - stripeWidth; x < barWidth + stripeWidth; x += stripeWidth) {
        ctx.beginPath();
        ctx.moveTo(x + offset, barY + barHeight);
        ctx.lineTo(x + offset + barHeight, barY);
        ctx.stroke();
    }

    ctx.restore();

    ctx.save();
    ctx.lineWidth = 2;
    ctx.strokeStyle = '#000000';
    ctx.strokeRect(barX + 1, barY + 1, barWidth - 2, barHeight - 2);
    ctx.restore();
}

function drawHUD() {
    ctx.save();

    ctx.fillStyle = 'rgba(0, 0, 0, 0.86)';
    ctx.fillRect(0, 0, WIDTH, HUD_PANEL_HEIGHT);

    ctx.strokeStyle = '#374151';
    ctx.lineWidth = 2;
    ctx.strokeRect(1, 1, WIDTH - 2, HUD_PANEL_HEIGHT - 2);

    ctx.fillStyle = '#ffffff';
    ctx.textBaseline = 'top';
    ctx.font = `${16 * UI_SCALE}px Arial`;

    ctx.textAlign = 'left';
    ctx.fillText(`SCORE: ${score}`, 8 * UI_SCALE, HUD_TOP);

    ctx.textAlign = 'center';
    ctx.fillText(`BEST: ${highScore}`, WIDTH / 2, HUD_TOP);

    ctx.textAlign = 'right';
    ctx.fillText(`LEVEL: ${level}`, WIDTH - 8 * UI_SCALE, HUD_TOP);

    ctx.restore();
}

function updateWinProgressBar() {
    return;
}

function lerpColor(a, b, t) {
    return Math.round(a + (b - a) * t);
}

function interpolateColor(c1, c2, t) {
    return `rgb(${lerpColor(c1[0], c2[0], t)}, ${lerpColor(c1[1], c2[1], t)}, ${lerpColor(c1[2], c2[2], t)})`;
}

function drawRoundedRect(x, y, width, height, radius) {
    const r = Math.min(radius, width / 2, height / 2);

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

function drawBlocksPanel(x, y, width, height, radius) {
    ctx.save();

    const gradient = ctx.createLinearGradient(x, y, x, y + height);
    gradient.addColorStop(0, 'rgba(17, 24, 39, 0.94)');
    gradient.addColorStop(1, 'rgba(3, 7, 18, 0.94)');

    ctx.fillStyle = gradient;
    drawRoundedRect(x, y, width, height, radius);
    ctx.fill();

    ctx.strokeStyle = 'rgba(255, 255, 255, 0.16)';
    ctx.lineWidth = 2;
    drawRoundedRect(x, y, width, height, radius);
    ctx.stroke();

    ctx.restore();
}

function drawRulesPanel() {
    const panelWidth = WIDTH * 0.79;
    const panelHeight = 160 * UI_SCALE;
    const panelX = WIDTH / 2 - panelWidth / 2;
    const panelY = HEIGHT * 0.148;

    ctx.save();

    ctx.fillStyle = 'rgba(3, 7, 18, 0.78)';
    drawRoundedRect(panelX, panelY, panelWidth, panelHeight, 18);
    ctx.fill();

    ctx.strokeStyle = 'rgba(255, 255, 255, 0.69)';
    ctx.lineWidth = 2;
    drawRoundedRect(panelX, panelY, panelWidth, panelHeight, 18);
    ctx.stroke();

    ctx.fillStyle = 'rgba(255, 255, 255, 0.82)';
    ctx.font = `${16 * UI_SCALE}px Arial`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';

    const lines = [
        'Move the paddle and break blocks.',
        'Bomb destroys nearby blocks.',
        'Freeze stops blocks for 10 seconds.',
        'Salvation clears safe zone for 3000 score.',
        'Do not let blocks reach the red line.'
    ];

    const lineHeight = 24 * UI_SCALE;
    const startY = panelY + 35 * UI_SCALE;

    for (let i = 0; i < lines.length; i++) {
        ctx.fillText(lines[i], WIDTH / 2, startY + i * lineHeight);
    }

    ctx.restore();
}

function drawStartButton() {
    if (gameStarted && !gameOver && !gameWon) {
        return;
    }

    ctx.save();

    const x = startButton.x;
    const y = startButton.y;

    ctx.globalAlpha = 0.5;
    ctx.beginPath();
    ctx.arc(x, y, startButton.radius, 0, Math.PI * 2);
    ctx.fillStyle = '#000000';
    ctx.fill();

    ctx.globalAlpha = 1;
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 2;
    ctx.stroke();

    ctx.fillStyle = '#ffffff';
    ctx.font = `${16 * UI_SCALE}px Arial`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';

    let label = 'START';

    if (gameOver) {
        label = 'RESTART';
    }

    if (gameWon) {
        label = 'RESTART';
    }

    ctx.fillText(label, x, y);
    
    drawRulesPanel();

    ctx.restore();
}

function drawSaveButton() {
    if (!canShowSaveButton()) {
        return;
    }

    updateSaveButtonPosition();

    ctx.save();

    const x = saveButton.x - saveButton.width / 2;
    const y = saveButton.y - saveButton.height / 2;

    ctx.fillStyle = 'rgba(3, 7, 18, 0.30)';
    drawRoundedRect(x, y, saveButton.width, saveButton.height, 18);
    ctx.fill();

    ctx.strokeStyle = '#ffdf8ebe';
    ctx.lineWidth = 3;
    drawRoundedRect(x, y, saveButton.width, saveButton.height, 18);
    ctx.stroke();

    ctx.fillStyle = '#ffdf8ebe';
    ctx.font = `bold ${22 * UI_SCALE}px Arial`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('SALVATION', saveButton.x, saveButton.y);

    ctx.restore();
}

function drawPauseOverlay() {
    if (!isPaused || gameOver || gameWon) {
        return;
    }

    ctx.save();

    // dark overlay
    ctx.fillStyle = 'rgba(0, 0, 0, 0.5)';
    ctx.fillRect(0, 0, WIDTH, HEIGHT);

    drawRulesPanel();

    // button
    const x = startButton.x;
    const y = startButton.y;

    ctx.globalAlpha = 0.6;
    ctx.beginPath();
    ctx.arc(x, y, startButton.radius, 0, Math.PI * 2);
    ctx.fillStyle = '#000000';
    ctx.fill();

    ctx.globalAlpha = 1;
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 2;
    ctx.stroke();

    ctx.fillStyle = '#ffffff';
    ctx.font = `${16 * UI_SCALE}px Arial`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('RESUME', x, y);

    ctx.restore();
}

function draw() {
    ctx.clearRect(0, 0, WIDTH, HEIGHT);
    ctx.save();
    ctx.beginPath();
    ctx.rect(3, 3, WIDTH - 6, HEIGHT - 6);
    ctx.clip();

    drawPendingTopRow();
    drawBlocks();
    drawExplosions();
    drawFloatingScoreTexts();
    drawSafeZone();
    drawDangerLine();
    drawPaddle();
    drawSaveButton();
    drawBall();

    drawHUD();
    drawWinProgress();

    drawBuildInfo();
    drawSoundButton();
    drawFreezeTimer();
    drawFPS();
    drawRunTimer();
    drawPauseOverlay();

    if (gameOver) {
        drawGameOver();
    }

    if (gameWon) {
        drawWin();
    }

    drawStartButton();

    ctx.restore();
}

function loop(timestamp) {
    const deltaTime = timestamp - lastFrameTime;
    const deltaSeconds = Math.min(deltaTime / 1000, 0.033);
    lastFrameTime = timestamp;

    fpsCounter++;
    fpsTime += deltaTime;

    if (fpsTime >= 1000) {
        fps = fpsCounter;
        fpsCounter = 0;
        fpsTime = 0;
    }

    update(deltaSeconds);
    draw();
    requestAnimationFrame(loop);
}

restartGame();
requestAnimationFrame(loop);
