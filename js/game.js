// BALLOON CRUSH - PREMIUM ENGINE v2.0
// Advanced Match-3 with Sound, Particles, Special Balloons

const canvas = document.getElementById('canvas');
const ctx = canvas.getContext('2d');
const scoreEl = document.getElementById('score');
const movesEl = document.getElementById('moves');
const gameOverEl = document.getElementById('game-over');
const finalScoreEl = document.getElementById('final-score');

// === CONFIG ===
const COLS = 8;
const ROWS = 8;
const TILE_SIZE = 50;

// Balloon Colors
const COLORS = [
    { main: '#FF4136', light: '#FF7166', dark: '#CC0000' }, // Red
    { main: '#0074D9', light: '#4DA3FF', dark: '#004C99' }, // Blue
    { main: '#2ECC40', light: '#5FE86F', dark: '#1A9928' }, // Green
    { main: '#FFDC00', light: '#FFE94D', dark: '#CCAF00' }, // Yellow
    { main: '#B10DC9', light: '#D94DED', dark: '#7A0090' }, // Purple
    { main: '#FF851B', light: '#FFB366', dark: '#CC5C00' }  // Orange
];

// Tile Types
const TYPE_NORMAL = 0;
const TYPE_STRIPED_H = 1;
const TYPE_STRIPED_V = 2;
const TYPE_BOMB = 3;

// === AUDIO ENGINE ===
const AudioCtx = window.AudioContext || window.webkitAudioContext;
let audioCtx = null;

function initAudio() {
    if (!audioCtx) {
        audioCtx = new AudioCtx();
    }
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
            gain.gain.setValueAtTime(0.3, now);
            gain.gain.exponentialRampToValueAtTime(0.01, now + 0.1);
            osc.start(now);
            osc.stop(now + 0.1);
            break;
        case 'swap':
            osc.type = 'triangle';
            osc.frequency.setValueAtTime(400, now);
            osc.frequency.linearRampToValueAtTime(600, now + 0.05);
            gain.gain.setValueAtTime(0.2, now);
            gain.gain.exponentialRampToValueAtTime(0.01, now + 0.08);
            osc.start(now);
            osc.stop(now + 0.08);
            break;
        case 'combo':
            osc.type = 'sine';
            osc.frequency.setValueAtTime(523, now); // C5
            gain.gain.setValueAtTime(0.3, now);
            osc.frequency.setValueAtTime(659, now + 0.1); // E5
            osc.frequency.setValueAtTime(784, now + 0.2); // G5
            gain.gain.exponentialRampToValueAtTime(0.01, now + 0.3);
            osc.start(now);
            osc.stop(now + 0.3);
            break;
        case 'special':
            osc.type = 'sawtooth';
            osc.frequency.setValueAtTime(200, now);
            osc.frequency.exponentialRampToValueAtTime(1000, now + 0.2);
            gain.gain.setValueAtTime(0.2, now);
            gain.gain.exponentialRampToValueAtTime(0.01, now + 0.3);
            osc.start(now);
            osc.stop(now + 0.3);
            break;
        case 'gameover':
            osc.type = 'sawtooth';
            osc.frequency.setValueAtTime(400, now);
            osc.frequency.linearRampToValueAtTime(100, now + 0.5);
            gain.gain.setValueAtTime(0.3, now);
            gain.gain.linearRampToValueAtTime(0, now + 0.5);
            osc.start(now);
            osc.stop(now + 0.5);
            break;
    }
}

// === PARTICLE SYSTEM ===
let particles = [];

class Particle {
    constructor(x, y, color) {
        this.x = x;
        this.y = y;
        this.vx = (Math.random() - 0.5) * 8;
        this.vy = (Math.random() - 0.5) * 8 - 3;
        this.life = 1;
        this.decay = 0.02 + Math.random() * 0.02;
        this.size = 3 + Math.random() * 4;
        this.color = color;
        this.gravity = 0.2;
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
    for (let i = 0; i < count; i++) {
        particles.push(new Particle(x, y, color));
    }
}

// === FLOATING TEXT ===
let floatingTexts = [];

class FloatingText {
    constructor(x, y, text, color = '#FFD700') {
        this.x = x;
        this.y = y;
        this.text = text;
        this.color = color;
        this.life = 1;
        this.vy = -2;
    }

    update() {
        this.y += this.vy;
        this.life -= 0.02;
        return this.life > 0;
    }

    draw(ctx) {
        ctx.globalAlpha = this.life;
        ctx.fillStyle = this.color;
        ctx.font = 'bold 20px Arial';
        ctx.textAlign = 'center';
        ctx.fillText(this.text, this.x, this.y);
        ctx.globalAlpha = 1;
    }
}

// === SCREEN SHAKE ===
let shakeIntensity = 0;
let shakeDecay = 0.9;

function shake(intensity) {
    shakeIntensity = intensity;
}

// === GAME STATE ===
let grid = [];
let score = 0;
let moves = 30;
let comboCount = 0;
let state = 'IDLE';
let selectedTile = null;

canvas.width = COLS * TILE_SIZE;
canvas.height = ROWS * TILE_SIZE;

// === CORE FUNCTIONS ===

function startGame() {
    initAudio();
    score = 0;
    moves = 30;
    comboCount = 0;
    state = 'IDLE';
    selectedTile = null;
    particles = [];
    floatingTexts = [];
    updateUI();
    gameOverEl.style.display = 'none';

    do {
        createGrid();
    } while (findMatches().length > 0);

    gameLoop();
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
        color: colorIdx !== null ? colorIdx : Math.floor(Math.random() * COLORS.length),
        type: type,
        scale: 1,
        targetScale: 1,
        rotation: 0,
        isMatched: false,
        isNew: false
    };
}

// === INPUT ===
canvas.addEventListener('mousedown', handleInput);
canvas.addEventListener('touchstart', handleInput, { passive: false });

function handleInput(e) {
    if (state !== 'IDLE' || moves <= 0) return;
    initAudio(); // Unlock audio on first interaction
    e.preventDefault();

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

    // Swap in grid
    let temp = grid[t1.c][t1.r];
    grid[t1.c][t1.r] = grid[t2.c][t2.r];
    grid[t2.c][t2.r] = temp;

    grid[t1.c][t1.r].c = t1.c;
    grid[t1.c][t1.r].r = t1.r;
    grid[t2.c][t2.r].c = t2.c;
    grid[t2.c][t2.r].r = t2.r;

    updateTargets();

    let matches = findMatches();

    setTimeout(() => {
        if (matches.length > 0) {
            moves--;
            comboCount = 0;
            updateUI();
            processMatches(matches);
        } else {
            // Swap back
            let tempBack = grid[t1.c][t1.r];
            grid[t1.c][t1.r] = grid[t2.c][t2.r];
            grid[t2.c][t2.r] = tempBack;

            grid[t1.c][t1.r].c = t1.c;
            grid[t1.c][t1.r].r = t1.r;
            grid[t2.c][t2.r].c = t2.c;
            grid[t2.c][t2.r].r = t2.r;

            updateTargets();
            setTimeout(() => { state = 'IDLE'; }, 200);
        }
    }, 200);
}

// === MATCH DETECTION ===

function findMatches() {
    let matched = new Set();

    // Horizontal
    for (let r = 0; r < ROWS; r++) {
        for (let c = 0; c < COLS - 2; c++) {
            let color = grid[c][r].color;
            if (grid[c + 1][r].color === color && grid[c + 2][r].color === color) {
                matched.add(grid[c][r]);
                matched.add(grid[c + 1][r]);
                matched.add(grid[c + 2][r]);
            }
        }
    }

    // Vertical
    for (let c = 0; c < COLS; c++) {
        for (let r = 0; r < ROWS - 2; r++) {
            let color = grid[c][r].color;
            if (grid[c][r + 1].color === color && grid[c][r + 2].color === color) {
                matched.add(grid[c][r]);
                matched.add(grid[c][r + 1]);
                matched.add(grid[c][r + 2]);
            }
        }
    }

    return Array.from(matched);
}

function processMatches(matches) {
    comboCount++;

    let points = matches.length * 10 * comboCount;
    score += points;
    updateUI();

    if (comboCount > 1) {
        playSound('combo');
        shake(comboCount * 2);
    }

    // Pop animation & particles
    matches.forEach(t => {
        t.isMatched = true;
        t.targetScale = 0;

        let px = t.x + TILE_SIZE / 2;
        let py = t.y + TILE_SIZE / 2;
        spawnParticles(px, py, COLORS[t.color].main, 6);
        playSound('pop');

        floatingTexts.push(new FloatingText(px, py, '+' + (10 * comboCount)));
    });

    setTimeout(() => {
        applyGravity();
    }, 150);
}

function applyGravity() {
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
            grid[c][r].isNew = true;
        }
    }

    setTimeout(() => {
        let newMatches = findMatches();
        if (newMatches.length > 0) {
            processMatches(newMatches);
        } else {
            state = 'IDLE';
            checkGameOver();
        }
    }, 300);
}

function checkGameOver() {
    if (moves <= 0) {
        state = 'GAME_OVER';
        playSound('gameover');
        gameOverEl.style.display = 'block';
        finalScoreEl.innerText = score;
        if (window.submitScoreToSL) window.submitScoreToSL(score);
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
}

// === GAME LOOP ===

function gameLoop() {
    update();
    render();
    requestAnimationFrame(gameLoop);
}

function update() {
    // Update tiles
    for (let c = 0; c < COLS; c++) {
        for (let r = 0; r < ROWS; r++) {
            let t = grid[c][r];
            if (!t) continue;

            t.x += (t.targetX - t.x) * 0.2;
            t.y += (t.targetY - t.y) * 0.2;
            t.scale += (t.targetScale - t.scale) * 0.3;
        }
    }

    // Update particles
    particles = particles.filter(p => p.update());

    // Update floating texts
    floatingTexts = floatingTexts.filter(ft => ft.update());

    // Decay shake
    shakeIntensity *= shakeDecay;
}

function render() {
    ctx.save();

    // Apply shake
    if (shakeIntensity > 0.5) {
        ctx.translate(
            (Math.random() - 0.5) * shakeIntensity,
            (Math.random() - 0.5) * shakeIntensity
        );
    }

    ctx.clearRect(-10, -10, canvas.width + 20, canvas.height + 20);

    // Draw grid background
    for (let c = 0; c < COLS; c++) {
        for (let r = 0; r < ROWS; r++) {
            ctx.fillStyle = (c + r) % 2 === 0 ? 'rgba(255,255,255,0.3)' : 'rgba(255,255,255,0.1)';
            ctx.fillRect(c * TILE_SIZE, r * TILE_SIZE, TILE_SIZE, TILE_SIZE);
        }
    }

    // Draw tiles
    for (let c = 0; c < COLS; c++) {
        for (let r = 0; r < ROWS; r++) {
            let t = grid[c][r];
            if (t && t.scale > 0.05) drawTile(t);
        }
    }

    // Draw particles
    particles.forEach(p => p.draw(ctx));

    // Draw floating texts
    floatingTexts.forEach(ft => ft.draw(ctx));

    ctx.restore();
}

function drawTile(t) {
    let cx = t.x + TILE_SIZE / 2;
    let cy = t.y + TILE_SIZE / 2;
    let size = (TILE_SIZE / 2 - 4) * t.scale;

    if (size < 1) return;

    let col = COLORS[t.color];

    // Selection glow
    if (selectedTile && selectedTile.c === t.c && selectedTile.r === t.r) {
        ctx.shadowColor = '#fff';
        ctx.shadowBlur = 15;
        ctx.fillStyle = 'rgba(255,255,255,0.5)';
        ctx.beginPath();
        ctx.arc(cx, cy, size + 6, 0, Math.PI * 2);
        ctx.fill();
        ctx.shadowBlur = 0;
    }

    // Balloon shadow
    ctx.fillStyle = 'rgba(0,0,0,0.2)';
    ctx.beginPath();
    ctx.ellipse(cx + 3, cy + 5, size * 0.9, size * 0.5, 0, 0, Math.PI * 2);
    ctx.fill();

    // Balloon body gradient
    let grad = ctx.createRadialGradient(cx - size * 0.3, cy - size * 0.3, 0, cx, cy, size * 1.2);
    grad.addColorStop(0, col.light);
    grad.addColorStop(0.5, col.main);
    grad.addColorStop(1, col.dark);

    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.ellipse(cx, cy - 2, size, size * 1.15, 0, 0, Math.PI * 2);
    ctx.fill();

    // Specular highlight
    ctx.fillStyle = 'rgba(255,255,255,0.6)';
    ctx.beginPath();
    ctx.ellipse(cx - size * 0.3, cy - size * 0.4, size * 0.25, size * 0.15, -0.5, 0, Math.PI * 2);
    ctx.fill();

    // Knot
    ctx.fillStyle = col.dark;
    ctx.beginPath();
    ctx.moveTo(cx, cy + size * 1.1);
    ctx.lineTo(cx - 4, cy + size * 1.35);
    ctx.lineTo(cx + 4, cy + size * 1.35);
    ctx.closePath();
    ctx.fill();

    // String hint
    ctx.strokeStyle = col.dark;
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(cx, cy + size * 1.35);
    ctx.quadraticCurveTo(cx + 3, cy + size * 1.5, cx - 2, cy + size * 1.6);
    ctx.stroke();
}

// Start
startGame();
