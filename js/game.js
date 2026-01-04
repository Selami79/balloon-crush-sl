// BALLOON CRUSH - LEVEL SYSTEM ENGINE v4.0
// Full Candy Crush Style: Levels, Stars, Progression

const canvas = document.getElementById('canvas');
const ctx = canvas.getContext('2d');

// UI Elements
const scoreEl = document.getElementById('score');
const movesEl = document.getElementById('moves');
const levelEl = document.getElementById('level');
const targetScoreEl = document.getElementById('target-score');
const progressEl = document.getElementById('progress');

// Popups
const levelStartPopup = document.getElementById('level-start');
const levelCompletePopup = document.getElementById('level-complete');
const levelFailedPopup = document.getElementById('level-failed');

// === LEVEL CONFIGURATION ===
const LEVELS = [
    { target: 500, moves: 25, colors: 4, rows: 8, cols: 8 },   // Level 1
    { target: 800, moves: 22, colors: 4, rows: 8, cols: 8 },   // Level 2
    { target: 1200, moves: 20, colors: 5, rows: 8, cols: 8 },   // Level 3
    { target: 1500, moves: 20, colors: 5, rows: 8, cols: 8 },   // Level 4
    { target: 2000, moves: 18, colors: 5, rows: 8, cols: 8 },   // Level 5
    { target: 2500, moves: 18, colors: 6, rows: 8, cols: 8 },   // Level 6
    { target: 3000, moves: 16, colors: 6, rows: 8, cols: 8 },   // Level 7
    { target: 3500, moves: 16, colors: 6, rows: 8, cols: 8 },   // Level 8
    { target: 4000, moves: 15, colors: 6, rows: 8, cols: 8 },   // Level 9
    { target: 5000, moves: 15, colors: 6, rows: 8, cols: 8 },   // Level 10
    { target: 6000, moves: 14, colors: 6, rows: 8, cols: 8 },   // Level 11+
];

// === CONFIG ===
const TILE_SIZE = 50;

const COLORS = [
    { main: '#FF4136', light: '#FF7166', dark: '#CC0000' },
    { main: '#0074D9', light: '#4DA3FF', dark: '#004C99' },
    { main: '#2ECC40', light: '#5FE86F', dark: '#1A9928' },
    { main: '#FFDC00', light: '#FFE94D', dark: '#CCAF00' },
    { main: '#B10DC9', light: '#D94DED', dark: '#7A0090' },
    { main: '#FF851B', light: '#FFB366', dark: '#CC5C00' }
];

const TYPE_NORMAL = 0;
const TYPE_STRIPED_H = 1;
const TYPE_STRIPED_V = 2;
const TYPE_BOMB = 3;
const TYPE_COLOR_BOMB = 4;

// === AUDIO ===
const AudioCtx = window.AudioContext || window.webkitAudioContext;
let audioCtx = null;

function initAudio() {
    if (!audioCtx) audioCtx = new AudioCtx();
}

function playSound(type) {
    if (!audioCtx) return;
    const osc = audioCtx.createOscillator();
    const gain = audioCtx.createGain();
    osc.connect(gain);
    gain.connect(audioCtx.destination);
    const now = audioCtx.currentTime;

    switch (type) {
        case 'pop':
            osc.type = 'sine';
            osc.frequency.setValueAtTime(800, now);
            osc.frequency.exponentialRampToValueAtTime(200, now + 0.1);
            gain.gain.setValueAtTime(0.25, now);
            gain.gain.exponentialRampToValueAtTime(0.01, now + 0.1);
            osc.start(now); osc.stop(now + 0.1);
            break;
        case 'swap':
            osc.type = 'triangle';
            osc.frequency.setValueAtTime(400, now);
            osc.frequency.linearRampToValueAtTime(600, now + 0.05);
            gain.gain.setValueAtTime(0.15, now);
            gain.gain.exponentialRampToValueAtTime(0.01, now + 0.08);
            osc.start(now); osc.stop(now + 0.08);
            break;
        case 'combo':
            osc.type = 'sine';
            osc.frequency.setValueAtTime(523, now);
            osc.frequency.setValueAtTime(659, now + 0.08);
            osc.frequency.setValueAtTime(784, now + 0.16);
            gain.gain.setValueAtTime(0.25, now);
            gain.gain.exponentialRampToValueAtTime(0.01, now + 0.25);
            osc.start(now); osc.stop(now + 0.25);
            break;
        case 'special':
            osc.type = 'sawtooth';
            osc.frequency.setValueAtTime(200, now);
            osc.frequency.exponentialRampToValueAtTime(1200, now + 0.25);
            gain.gain.setValueAtTime(0.2, now);
            gain.gain.exponentialRampToValueAtTime(0.01, now + 0.3);
            osc.start(now); osc.stop(now + 0.3);
            break;
        case 'win':
            const notes = [523, 659, 784, 1047];
            notes.forEach((freq, i) => {
                const o = audioCtx.createOscillator();
                const g = audioCtx.createGain();
                o.connect(g); g.connect(audioCtx.destination);
                o.type = 'sine';
                o.frequency.setValueAtTime(freq, now + i * 0.15);
                g.gain.setValueAtTime(0.2, now + i * 0.15);
                g.gain.exponentialRampToValueAtTime(0.01, now + i * 0.15 + 0.3);
                o.start(now + i * 0.15);
                o.stop(now + i * 0.15 + 0.3);
            });
            break;
        case 'fail':
            osc.type = 'sawtooth';
            osc.frequency.setValueAtTime(300, now);
            osc.frequency.linearRampToValueAtTime(100, now + 0.4);
            gain.gain.setValueAtTime(0.25, now);
            gain.gain.linearRampToValueAtTime(0, now + 0.4);
            osc.start(now); osc.stop(now + 0.4);
            break;
    }
}

// === PARTICLES ===
let particles = [];

class Particle {
    constructor(x, y, color) {
        this.x = x; this.y = y;
        this.vx = (Math.random() - 0.5) * 10;
        this.vy = (Math.random() - 0.5) * 10 - 4;
        this.life = 1;
        this.decay = 0.025;
        this.size = 4 + Math.random() * 5;
        this.color = color;
        this.gravity = 0.25;
    }
    update() {
        this.x += this.vx;
        this.y += this.vy;
        this.vy += this.gravity;
        this.life -= this.decay;
        return this.life > 0;
    }
    draw(ctx) {
        ctx.globalAlpha = this.life;
        ctx.fillStyle = this.color;
        ctx.beginPath();
        ctx.arc(this.x, this.y, this.size * this.life, 0, Math.PI * 2);
        ctx.fill();
        ctx.globalAlpha = 1;
    }
}

function spawnParticles(x, y, color, count = 8) {
    for (let i = 0; i < count; i++) particles.push(new Particle(x, y, color));
}

// === FLOATING TEXT ===
let floatingTexts = [];

class FloatingText {
    constructor(x, y, text, color = '#FFD700') {
        this.x = x; this.y = y;
        this.text = text;
        this.color = color;
        this.life = 1;
        this.vy = -2.5;
    }
    update() {
        this.y += this.vy;
        this.life -= 0.025;
        return this.life > 0;
    }
    draw(ctx) {
        ctx.globalAlpha = this.life;
        ctx.font = 'bold 20px Fredoka One';
        ctx.textAlign = 'center';
        ctx.strokeStyle = '#000';
        ctx.lineWidth = 3;
        ctx.strokeText(this.text, this.x, this.y);
        ctx.fillStyle = this.color;
        ctx.fillText(this.text, this.x, this.y);
        ctx.globalAlpha = 1;
    }
}

// === SHAKE ===
let shakeIntensity = 0;
function shake(intensity) { shakeIntensity = intensity; }

// === HINT ===
let hintTimer = 0;
let hintTile = null;
const HINT_DELAY = 180;

function findHint() {
    for (let c = 0; c < COLS; c++) {
        for (let r = 0; r < ROWS; r++) {
            if (c < COLS - 1) {
                swapTiles(c, r, c + 1, r);
                if (findMatches().length > 0) { swapTiles(c, r, c + 1, r); return { c1: c, r1: r, c2: c + 1, r2: r }; }
                swapTiles(c, r, c + 1, r);
            }
            if (r < ROWS - 1) {
                swapTiles(c, r, c, r + 1);
                if (findMatches().length > 0) { swapTiles(c, r, c, r + 1); return { c1: c, r1: r, c2: c, r2: r + 1 }; }
                swapTiles(c, r, c, r + 1);
            }
        }
    }
    return null;
}

function swapTiles(c1, r1, c2, r2) {
    let temp = grid[c1][r1];
    grid[c1][r1] = grid[c2][r2];
    grid[c2][r2] = temp;
    if (grid[c1][r1]) { grid[c1][r1].c = c1; grid[c1][r1].r = r1; }
    if (grid[c2][r2]) { grid[c2][r2].c = c2; grid[c2][r2].r = r2; }
}

// === GAME STATE ===
let grid = [];
let score = 0;
let moves = 0;
let comboCount = 0;
let state = 'IDLE';
let selectedTile = null;

let currentLevel = 1;
let targetScore = 1000;
let ROWS = 8;
let COLS = 8;
let numColors = 4;

// Load progress
function loadProgress() {
    let saved = localStorage.getItem('balloonCrush_level');
    if (saved) currentLevel = parseInt(saved);
}

function saveProgress() {
    localStorage.setItem('balloonCrush_level', currentLevel.toString());
}

// === LEVEL MANAGEMENT ===

function showLevelStart() {
    let cfg = LEVELS[Math.min(currentLevel - 1, LEVELS.length - 1)];

    document.getElementById('popup-level').innerText = currentLevel;
    document.getElementById('popup-target').innerText = cfg.target;
    document.getElementById('popup-moves').innerText = cfg.moves;

    levelStartPopup.style.display = 'flex';
    levelCompletePopup.style.display = 'none';
    levelFailedPopup.style.display = 'none';
}

function startLevel() {
    initAudio();
    levelStartPopup.style.display = 'none';

    let cfg = LEVELS[Math.min(currentLevel - 1, LEVELS.length - 1)];

    targetScore = cfg.target;
    moves = cfg.moves;
    numColors = cfg.colors;
    ROWS = cfg.rows;
    COLS = cfg.cols;

    score = 0;
    comboCount = 0;
    state = 'IDLE';
    selectedTile = null;
    hintTile = null;
    hintTimer = 0;
    particles = [];
    floatingTexts = [];

    canvas.width = COLS * TILE_SIZE;
    canvas.height = ROWS * TILE_SIZE;

    updateUI();
    createValidGrid();
    gameLoop();
}

function levelComplete() {
    state = 'COMPLETE';
    playSound('win');

    let stars = 1;
    if (score >= targetScore * 1.5) stars = 2;
    if (score >= targetScore * 2) stars = 3;

    document.getElementById('final-score').innerText = score;
    document.getElementById('star1').className = 'star active';
    document.getElementById('star2').className = stars >= 2 ? 'star active' : 'star';
    document.getElementById('star3').className = stars >= 3 ? 'star active' : 'star';

    levelCompletePopup.style.display = 'flex';

    if (window.submitScoreToSL) window.submitScoreToSL(score);

    currentLevel++;
    saveProgress();
}

function nextLevel() {
    levelCompletePopup.style.display = 'none';
    showLevelStart();
}

function levelFailed() {
    state = 'FAILED';
    playSound('fail');

    document.getElementById('failed-score').innerText = score;
    document.getElementById('needed-score').innerText = targetScore - score;

    levelFailedPopup.style.display = 'flex';
}

function retryLevel() {
    levelFailedPopup.style.display = 'none';
    showLevelStart();
}

// === GRID ===

function createValidGrid() {
    let attempts = 0;
    do {
        createGrid();
        attempts++;
    } while ((findMatches().length > 0 || !findHint()) && attempts < 100);
}

function createGrid() {
    grid = [];
    for (let c = 0; c < COLS; c++) {
        grid[c] = [];
        for (let r = 0; r < ROWS; r++) {
            grid[c][r] = createTile(c, r);
        }
    }
}

function createTile(c, r, type = TYPE_NORMAL, colorIdx = null) {
    return {
        c, r,
        x: c * TILE_SIZE,
        y: r * TILE_SIZE,
        targetX: c * TILE_SIZE,
        targetY: r * TILE_SIZE,
        color: colorIdx !== null ? colorIdx : Math.floor(Math.random() * numColors),
        type: type,
        scale: 1,
        targetScale: 1,
        isMatched: false
    };
}

// === INPUT ===
canvas.addEventListener('mousedown', handleInput);
canvas.addEventListener('touchstart', handleInput, { passive: false });

function handleInput(e) {
    if (state !== 'IDLE' || moves <= 0) return;
    initAudio();
    e.preventDefault();

    hintTimer = 0;
    hintTile = null;

    let rect = canvas.getBoundingClientRect();
    let cx = (e.touches ? e.touches[0].clientX : e.clientX) - rect.left;
    let cy = (e.touches ? e.touches[0].clientY : e.clientY) - rect.top;

    let scaleX = canvas.width / rect.width;
    let scaleY = canvas.height / rect.height;

    let col = Math.floor((cx * scaleX) / TILE_SIZE);
    let row = Math.floor((cy * scaleY) / TILE_SIZE);

    if (col < 0 || col >= COLS || row < 0 || row >= ROWS) return;

    if (!selectedTile) {
        selectedTile = { c: col, r: row };
        playSound('swap');
    } else {
        let d = Math.abs(col - selectedTile.c) + Math.abs(row - selectedTile.r);
        if (d === 1) {
            attemptSwap(selectedTile, { c: col, r: row });
            selectedTile = null;
        } else {
            selectedTile = { c: col, r: row };
            playSound('swap');
        }
    }
}

function attemptSwap(t1, t2) {
    state = 'ANIMATING';
    playSound('swap');

    let tile1 = grid[t1.c][t1.r];
    let tile2 = grid[t2.c][t2.r];

    swapTiles(t1.c, t1.r, t2.c, t2.r);
    updateTargets();

    if (tile1.type === TYPE_COLOR_BOMB || tile2.type === TYPE_COLOR_BOMB) {
        let colorBomb = tile1.type === TYPE_COLOR_BOMB ? tile1 : tile2;
        let other = tile1.type === TYPE_COLOR_BOMB ? tile2 : tile1;
        moves--;
        comboCount = 0;
        updateUI();
        triggerColorBomb(colorBomb, other.color);
        return;
    }

    let matches = findMatches();

    setTimeout(() => {
        if (matches.length > 0) {
            moves--;
            comboCount = 0;
            updateUI();
            processMatches(matches, t1, t2);
        } else {
            swapTiles(t1.c, t1.r, t2.c, t2.r);
            updateTargets();
            setTimeout(() => { state = 'IDLE'; }, 200);
        }
    }, 200);
}

// === SPECIALS ===

function triggerColorBomb(bomb, targetColor) {
    playSound('special');
    shake(12);

    let toDestroy = [bomb];
    for (let c = 0; c < COLS; c++) {
        for (let r = 0; r < ROWS; r++) {
            if (grid[c][r].color === targetColor) {
                toDestroy.push(grid[c][r]);
            }
        }
    }
    destroyTiles(toDestroy);
}

function destroyTiles(tiles) {
    let points = tiles.length * 20;
    score += points;
    updateUI();

    tiles.forEach(t => {
        if (!t) return;
        t.isMatched = true;
        t.targetScale = 0;
        spawnParticles(t.x + TILE_SIZE / 2, t.y + TILE_SIZE / 2, COLORS[t.color % COLORS.length].main, 8);
        playSound('pop');
    });

    floatingTexts.push(new FloatingText(canvas.width / 2, canvas.height / 2, '+' + points, '#FF0'));
    setTimeout(() => applyGravity(), 200);
}

// === MATCHING ===

function findMatches() {
    let matched = new Set();

    for (let r = 0; r < ROWS; r++) {
        let streak = 1;
        for (let c = 1; c <= COLS; c++) {
            if (c < COLS && grid[c][r].color === grid[c - 1][r].color) {
                streak++;
            } else {
                if (streak >= 3) {
                    for (let i = c - streak; i < c; i++) matched.add(grid[i][r]);
                }
                streak = 1;
            }
        }
    }

    for (let c = 0; c < COLS; c++) {
        let streak = 1;
        for (let r = 1; r <= ROWS; r++) {
            if (r < ROWS && grid[c][r].color === grid[c][r - 1].color) {
                streak++;
            } else {
                if (streak >= 3) {
                    for (let i = r - streak; i < r; i++) matched.add(grid[c][i]);
                }
                streak = 1;
            }
        }
    }

    return Array.from(matched);
}

function processMatches(matches, swapPos1 = null, swapPos2 = null) {
    comboCount++;

    let specialCreated = null;
    if (swapPos1 && swapPos2) {
        specialCreated = checkForSpecialCreation(matches, swapPos1, swapPos2);
    }

    let points = matches.length * 10 * comboCount;
    score += points;
    updateUI();

    if (comboCount > 1) {
        playSound('combo');
        shake(comboCount * 3);
        floatingTexts.push(new FloatingText(canvas.width / 2, 40, 'COMBO x' + comboCount + '!', '#FF0'));
    }

    matches.forEach(t => {
        if (t.type !== TYPE_NORMAL && !t.isMatched) {
            triggerSpecialEffect(t);
        }
    });

    matches.forEach(t => {
        if (t.isMatched) return;
        t.isMatched = true;
        t.targetScale = 0;
        spawnParticles(t.x + TILE_SIZE / 2, t.y + TILE_SIZE / 2, COLORS[t.color % COLORS.length].main, 6);
        playSound('pop');
    });

    floatingTexts.push(new FloatingText(canvas.width / 2, canvas.height / 2, '+' + points));

    setTimeout(() => applyGravity(specialCreated), 150);
}

function checkForSpecialCreation(matches, pos1, pos2) {
    let hGroups = {};
    let vGroups = {};

    matches.forEach(t => {
        if (!hGroups[t.r]) hGroups[t.r] = [];
        if (!vGroups[t.c]) vGroups[t.c] = [];
        hGroups[t.r].push(t);
        vGroups[t.c].push(t);
    });

    for (let key in hGroups) {
        if (hGroups[key].length >= 5) {
            return { pos: pos1, type: TYPE_COLOR_BOMB, color: grid[pos1.c][pos1.r].color };
        }
    }
    for (let key in vGroups) {
        if (vGroups[key].length >= 5) {
            return { pos: pos1, type: TYPE_COLOR_BOMB, color: grid[pos1.c][pos1.r].color };
        }
    }

    for (let hKey in hGroups) {
        for (let vKey in vGroups) {
            if (hGroups[hKey].length >= 3 && vGroups[vKey].length >= 3) {
                let inter = hGroups[hKey].find(h => vGroups[vKey].some(v => v.c === h.c && v.r === h.r));
                if (inter) {
                    return { pos: { c: inter.c, r: inter.r }, type: TYPE_BOMB, color: inter.color };
                }
            }
        }
    }

    for (let key in hGroups) {
        if (hGroups[key].length === 4) {
            return { pos: pos1, type: TYPE_STRIPED_V, color: grid[pos1.c][pos1.r].color };
        }
    }
    for (let key in vGroups) {
        if (vGroups[key].length === 4) {
            return { pos: pos1, type: TYPE_STRIPED_H, color: grid[pos1.c][pos1.r].color };
        }
    }

    return null;
}

function triggerSpecialEffect(tile) {
    let toDestroy = [];

    if (tile.type === TYPE_STRIPED_H) {
        for (let i = 0; i < COLS; i++) if (!grid[i][tile.r].isMatched) toDestroy.push(grid[i][tile.r]);
    } else if (tile.type === TYPE_STRIPED_V) {
        for (let i = 0; i < ROWS; i++) if (!grid[tile.c][i].isMatched) toDestroy.push(grid[tile.c][i]);
    } else if (tile.type === TYPE_BOMB) {
        for (let dc = -1; dc <= 1; dc++) {
            for (let dr = -1; dr <= 1; dr++) {
                let nc = tile.c + dc, nr = tile.r + dr;
                if (nc >= 0 && nc < COLS && nr >= 0 && nr < ROWS && !grid[nc][nr].isMatched) {
                    toDestroy.push(grid[nc][nr]);
                }
            }
        }
    }

    if (toDestroy.length > 0) {
        playSound('special');
        shake(8);
        toDestroy.forEach(t => {
            t.isMatched = true;
            t.targetScale = 0;
            spawnParticles(t.x + TILE_SIZE / 2, t.y + TILE_SIZE / 2, COLORS[t.color % COLORS.length].main, 5);
        });
        score += toDestroy.length * 15;
        updateUI();
    }
}

function applyGravity(specialCreated = null) {
    for (let c = 0; c < COLS; c++) {
        let shift = 0;
        for (let r = ROWS - 1; r >= 0; r--) {
            if (grid[c][r].isMatched) {
                shift++;
            } else if (shift > 0) {
                grid[c][r + shift] = grid[c][r];
                grid[c][r + shift].r = r + shift;
                grid[c][r + shift].targetY = (r + shift) * TILE_SIZE;
                grid[c][r] = null;
            }
        }

        for (let r = 0; r < shift; r++) {
            grid[c][r] = createTile(c, r);
            grid[c][r].y = -TILE_SIZE * (shift - r);
            grid[c][r].targetY = r * TILE_SIZE;
        }
    }

    if (specialCreated && grid[specialCreated.pos.c] && grid[specialCreated.pos.c][specialCreated.pos.r]) {
        grid[specialCreated.pos.c][specialCreated.pos.r].type = specialCreated.type;
        grid[specialCreated.pos.c][specialCreated.pos.r].color = specialCreated.color;
    }

    setTimeout(() => {
        let newMatches = findMatches();
        if (newMatches.length > 0) {
            processMatches(newMatches);
        } else {
            if (!findHint()) {
                shuffleGrid();
            } else {
                state = 'IDLE';
                checkLevelStatus();
            }
        }
    }, 300);
}

function shuffleGrid() {
    floatingTexts.push(new FloatingText(canvas.width / 2, canvas.height / 2, 'SHUFFLING...', '#FFF'));

    setTimeout(() => {
        let tiles = [];
        for (let c = 0; c < COLS; c++) {
            for (let r = 0; r < ROWS; r++) {
                tiles.push({ color: grid[c][r].color, type: grid[c][r].type });
            }
        }

        for (let i = tiles.length - 1; i > 0; i--) {
            let j = Math.floor(Math.random() * (i + 1));
            [tiles[i], tiles[j]] = [tiles[j], tiles[i]];
        }

        let idx = 0;
        for (let c = 0; c < COLS; c++) {
            for (let r = 0; r < ROWS; r++) {
                grid[c][r].color = tiles[idx].color;
                grid[c][r].type = tiles[idx].type;
                idx++;
            }
        }

        if (findMatches().length > 0 || !findHint()) {
            shuffleGrid();
        } else {
            state = 'IDLE';
            checkLevelStatus();
        }
    }, 500);
}

function checkLevelStatus() {
    if (score >= targetScore) {
        levelComplete();
    } else if (moves <= 0) {
        levelFailed();
    }
}

function updateTargets() {
    for (let c = 0; c < COLS; c++) {
        for (let r = 0; r < ROWS; r++) {
            if (grid[c][r]) {
                grid[c][r].targetX = c * TILE_SIZE;
                grid[c][r].targetY = r * TILE_SIZE;
            }
        }
    }
}

function updateUI() {
    scoreEl.innerText = score;
    movesEl.innerText = moves;
    levelEl.innerText = currentLevel;
    targetScoreEl.innerText = targetScore;

    let progress = Math.min(100, (score / targetScore) * 100);
    progressEl.style.width = progress + '%';
}

// === GAME LOOP ===

let gameLoopRunning = false;

function gameLoop() {
    if (gameLoopRunning) return;
    gameLoopRunning = true;

    function loop() {
        update();
        render();
        requestAnimationFrame(loop);
    }
    loop();
}

function update() {
    if (state === 'IDLE') {
        hintTimer++;
        if (hintTimer > HINT_DELAY && !hintTile) {
            hintTile = findHint();
        }
    }

    for (let c = 0; c < COLS; c++) {
        for (let r = 0; r < ROWS; r++) {
            let t = grid[c][r];
            if (!t) continue;
            t.x += (t.targetX - t.x) * 0.2;
            t.y += (t.targetY - t.y) * 0.2;
            t.scale += (t.targetScale - t.scale) * 0.3;
        }
    }

    particles = particles.filter(p => p.update());
    floatingTexts = floatingTexts.filter(ft => ft.update());
    shakeIntensity *= 0.9;
}

function render() {
    ctx.save();

    if (shakeIntensity > 0.5) {
        ctx.translate((Math.random() - 0.5) * shakeIntensity, (Math.random() - 0.5) * shakeIntensity);
    }

    ctx.clearRect(-10, -10, canvas.width + 20, canvas.height + 20);

    for (let c = 0; c < COLS; c++) {
        for (let r = 0; r < ROWS; r++) {
            ctx.fillStyle = (c + r) % 2 === 0 ? 'rgba(255,255,255,0.25)' : 'rgba(255,255,255,0.1)';
            ctx.fillRect(c * TILE_SIZE, r * TILE_SIZE, TILE_SIZE, TILE_SIZE);
        }
    }

    if (hintTile && state === 'IDLE') {
        let pulse = Math.sin(Date.now() / 150) * 0.3 + 0.7;
        ctx.fillStyle = `rgba(255,255,0,${pulse * 0.4})`;
        ctx.fillRect(hintTile.c1 * TILE_SIZE, hintTile.r1 * TILE_SIZE, TILE_SIZE, TILE_SIZE);
        ctx.fillRect(hintTile.c2 * TILE_SIZE, hintTile.r2 * TILE_SIZE, TILE_SIZE, TILE_SIZE);
    }

    for (let c = 0; c < COLS; c++) {
        for (let r = 0; r < ROWS; r++) {
            let t = grid[c][r];
            if (t && t.scale > 0.05) drawTile(t);
        }
    }

    particles.forEach(p => p.draw(ctx));
    floatingTexts.forEach(ft => ft.draw(ctx));

    ctx.restore();
}

function drawTile(t) {
    let cx = t.x + TILE_SIZE / 2;
    let cy = t.y + TILE_SIZE / 2;
    let size = (TILE_SIZE / 2 - 4) * t.scale;

    if (size < 1) return;

    let col = COLORS[t.color % COLORS.length];

    if (selectedTile && selectedTile.c === t.c && selectedTile.r === t.r) {
        ctx.shadowColor = '#fff';
        ctx.shadowBlur = 20;
        ctx.fillStyle = 'rgba(255,255,255,0.6)';
        ctx.beginPath();
        ctx.arc(cx, cy, size + 8, 0, Math.PI * 2);
        ctx.fill();
        ctx.shadowBlur = 0;
    }

    ctx.fillStyle = 'rgba(0,0,0,0.15)';
    ctx.beginPath();
    ctx.ellipse(cx + 3, cy + 5, size * 0.9, size * 0.5, 0, 0, Math.PI * 2);
    ctx.fill();

    let grad = ctx.createRadialGradient(cx - size * 0.3, cy - size * 0.3, 0, cx, cy, size * 1.2);
    grad.addColorStop(0, col.light);
    grad.addColorStop(0.5, col.main);
    grad.addColorStop(1, col.dark);

    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.ellipse(cx, cy - 2, size, size * 1.15, 0, 0, Math.PI * 2);
    ctx.fill();

    // Special indicators
    if (t.type === TYPE_STRIPED_H) {
        ctx.strokeStyle = 'rgba(255,255,255,0.9)';
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.moveTo(cx - size * 0.6, cy);
        ctx.lineTo(cx + size * 0.6, cy);
        ctx.stroke();
    } else if (t.type === TYPE_STRIPED_V) {
        ctx.strokeStyle = 'rgba(255,255,255,0.9)';
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.moveTo(cx, cy - size * 0.6);
        ctx.lineTo(cx, cy + size * 0.6);
        ctx.stroke();
    } else if (t.type === TYPE_BOMB) {
        ctx.fillStyle = 'rgba(255,255,255,0.9)';
        ctx.beginPath();
        ctx.arc(cx, cy, size * 0.3, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = col.dark;
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(cx - size * 0.15, cy); ctx.lineTo(cx + size * 0.15, cy);
        ctx.moveTo(cx, cy - size * 0.15); ctx.lineTo(cx, cy + size * 0.15);
        ctx.stroke();
    } else if (t.type === TYPE_COLOR_BOMB) {
        ctx.fillStyle = '#FFF';
        ctx.beginPath();
        ctx.arc(cx, cy, size * 0.4, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = '#000';
        ctx.beginPath();
        ctx.arc(cx, cy, size * 0.2, 0, Math.PI * 2);
        ctx.fill();
    }

    ctx.fillStyle = 'rgba(255,255,255,0.5)';
    ctx.beginPath();
    ctx.ellipse(cx - size * 0.3, cy - size * 0.4, size * 0.25, size * 0.15, -0.5, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = col.dark;
    ctx.beginPath();
    ctx.moveTo(cx, cy + size * 1.1);
    ctx.lineTo(cx - 4, cy + size * 1.35);
    ctx.lineTo(cx + 4, cy + size * 1.35);
    ctx.closePath();
    ctx.fill();

    ctx.strokeStyle = col.dark;
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(cx, cy + size * 1.35);
    ctx.quadraticCurveTo(cx + 3, cy + size * 1.5, cx - 2, cy + size * 1.6);
    ctx.stroke();
}

// === INIT ===
loadProgress();
showLevelStart();
