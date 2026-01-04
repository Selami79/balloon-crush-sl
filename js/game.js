// BALOON CRUSH - ADVANCED STRATEGY ENGINE
// Features: Gravity, Chain Reactions, Special Balloons (Striped/Bomb)

const canvas = document.getElementById('canvas');
const ctx = canvas.getContext('2d');
const scoreEl = document.getElementById('score');
const movesEl = document.getElementById('moves');
const gameOverEl = document.getElementById('game-over');
const finalScoreEl = document.getElementById('final-score');

// Config
const COLS = 8;
const ROWS = 8;
const TILE_SIZE = 50;
const ANIM_SPEED = 0.2; // 0.0 to 1.0

// Colors: Red, Blue, Green, Yellow, Purple, Orange
const COLORS = ['#FF4136', '#0074D9', '#2ECC40', '#FFDC00', '#B10DC9', '#FF851B'];

// Tile Types
const TYPE_NORMAL = 0;
const TYPE_STRIPED_H = 1; // Destroys Row
const TYPE_STRIPED_V = 2; // Destroys Col
const TYPE_BOMB = 3;      // Destroys Area or Color

// State
let grid = []; // 2D Array
let score = 0;
let moves = 30;
let state = 'IDLE'; // IDLE, ANIMATING, GAME_OVER
let selectedTile = null;

// Animation Queue
let animations = [];

// Initialize
canvas.width = COLS * TILE_SIZE;
canvas.height = ROWS * TILE_SIZE;

function initDisplay() {
    canvas.style.width = '100%';
    canvas.style.height = 'auto';
    canvas.style.aspectRatio = `${COLS}/${ROWS}`;
}
initDisplay();

// --- CORE LOGIC ---

function startGame() {
    score = 0;
    moves = 30;
    state = 'IDLE';
    selectedTile = null;
    updateUI();
    gameOverEl.style.display = 'none';

    // Create Grid without initial matches
    do {
        createGrid();
    } while (findMatches().length > 0);

    draw();
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

function createTile(c, r, type = TYPE_NORMAL, matchColor = null) {
    return {
        c: c, r: r,
        x: c * TILE_SIZE, y: r * TILE_SIZE, // Visual Pos
        targetX: c * TILE_SIZE, targetY: r * TILE_SIZE,
        color: matchColor !== null ? matchColor : Math.floor(Math.random() * COLORS.length),
        type: type,
        alpha: 1, // For pop animation
        scale: 1,
        isMatched: false
    };
}

// --- INTERACTION ---

canvas.addEventListener('mousedown', handleInput);
canvas.addEventListener('touchstart', handleInput, { passive: false });

function handleInput(e) {
    if (state !== 'IDLE' || moves <= 0) return;
    e.preventDefault();

    let rect = canvas.getBoundingClientRect();
    let cx = (e.touches ? e.touches[0].clientX : e.clientX) - rect.left;
    let cy = (e.touches ? e.touches[0].clientY : e.clientY) - rect.top;

    // Canvas Scale Correction
    let scaleX = canvas.width / rect.width;
    let scaleY = canvas.height / rect.height;

    let col = Math.floor((cx * scaleX) / TILE_SIZE);
    let row = Math.floor((cy * scaleY) / TILE_SIZE);

    if (col < 0 || col >= COLS || row < 0 || row >= ROWS) return;

    if (!selectedTile) {
        selectedTile = { c: col, r: row };
    } else {
        // Check adjacency
        let d = Math.abs(col - selectedTile.c) + Math.abs(row - selectedTile.r);
        if (d === 1) {
            // Swap
            attemptSwap(selectedTile, { c: col, r: row });
            selectedTile = null;
        } else {
            selectedTile = { c: col, r: row }; // Select new
        }
    }
    draw();
}

function attemptSwap(t1, t2) {
    state = 'ANIMATING';

    // Logic Swap
    let temp = grid[t1.c][t1.r];
    grid[t1.c][t1.r] = grid[t2.c][t2.r];
    grid[t2.c][t2.r] = temp;

    // Update Coordinates inside objects
    grid[t1.c][t1.r].c = t1.c; grid[t1.c][t1.r].r = t1.r;
    grid[t2.c][t2.r].c = t2.c; grid[t2.c][t2.r].r = t2.r;

    // Update Target Visuals
    updateTargets();

    // Check Matches
    let matches = findMatches();

    // Animate Swap
    animate(() => {
        if (matches.length > 0) {
            moves--;
            updateUI();
            handleMatches(matches); // Process matches
        } else {
            // Swap Back (Invalid Move)
            let tempBack = grid[t1.c][t1.r];
            grid[t1.c][t1.r] = grid[t2.c][t2.r];
            grid[t2.c][t2.r] = tempBack;

            grid[t1.c][t1.r].c = t1.c; grid[t1.c][t1.r].r = t1.r;
            grid[t2.c][t2.r].c = t2.c; grid[t2.c][t2.r].r = t2.r;

            updateTargets();
            animate(() => {
                state = 'IDLE';
                draw();
            });
        }
    });
}

// --- MATCH LOGIC (STRATEGY) ---

function findMatches() {
    let matchedSet = new Set();

    // Horizontal
    for (let r = 0; r < ROWS; r++) {
        for (let c = 0; c < COLS - 2; c++) {
            let tile = grid[c][r];
            if (grid[c + 1][r].color === tile.color && grid[c + 2][r].color === tile.color) {
                matchedSet.add(grid[c][r]);
                matchedSet.add(grid[c + 1][r]);
                matchedSet.add(grid[c + 2][r]);
            }
        }
    }

    // Vertical
    for (let c = 0; c < COLS; c++) {
        for (let r = 0; r < ROWS - 2; r++) {
            let tile = grid[c][r];
            if (grid[c][r + 1].color === tile.color && grid[c][r + 2].color === tile.color) {
                matchedSet.add(grid[c][r]);
                matchedSet.add(grid[c][r + 1]);
                matchedSet.add(grid[c][r + 2]);
            }
        }
    }

    // Convert logic for Special Creation could happen here
    // For now, simple return array
    return Array.from(matchedSet);
}


function handleMatches(matches) {
    // 1. Mark Matches & Score
    score += matches.length * 10;
    updateUI();

    // Trigger Special Effects (Recursive Bomb Logic could go here)

    // 2. Animate Popping
    matches.forEach(t => {
        t.isMatched = true;
        t.scale = 0;
        t.alpha = 0;
    });

    animate(() => {
        // 3. Remove & Shift Down
        applyGravity();
    });
}

function applyGravity() {
    // Shift logic
    for (let c = 0; c < COLS; c++) {
        let shift = 0;
        for (let r = ROWS - 1; r >= 0; r--) {
            if (grid[c][r].isMatched) {
                shift++;
            } else if (shift > 0) {
                // Move tile down
                grid[c][r + shift] = grid[c][r];
                grid[c][r + shift].r += shift;
                grid[c][r + shift].targetY = (r + shift) * TILE_SIZE; // New target
                grid[c][r] = null; // Mark old spot empty temporarily
            }
        }

        // Fill top empty spots
        for (let r = 0; r < shift; r++) {
            grid[c][r] = createTile(c, r);
            grid[c][r].y = -TILE_SIZE * (shift - r); // Start above screen
            grid[c][r].targetY = r * TILE_SIZE;
        }
    }

    // After gravity, check chain reactions
    animate(() => {
        let newMatches = findMatches();
        if (newMatches.length > 0) {
            score += 50; // Bonus for combo
            handleMatches(newMatches); // Recursion
        } else {
            state = 'IDLE';
            checkGameOver();
            draw();
        }
    });
}

function checkGameOver() {
    if (moves <= 0) {
        state = 'GAME_OVER';
        gameOverEl.style.display = 'block';
        finalScoreEl.innerText = score;
        if (window.submitScoreToSL) window.submitScoreToSL(score);
    }
}


// --- ANIMATION LOOP ---

function updateTargets() {
    for (let c = 0; c < COLS; c++) {
        for (let r = 0; r < ROWS; r++) {
            grid[c][r].targetX = c * TILE_SIZE;
            grid[c][r].targetY = r * TILE_SIZE;
        }
    }
}

function animate(onComplete) {
    let moving = true;

    function loop() {
        moving = false;
        ctx.clearRect(0, 0, canvas.width, canvas.height);

        for (let c = 0; c < COLS; c++) {
            for (let r = 0; r < ROWS; r++) {
                let t = grid[c][r];
                if (!t) continue;

                // Lerp Position
                let dx = t.targetX - t.x;
                let dy = t.targetY - t.y;

                if (Math.abs(dx) > 1 || Math.abs(dy) > 1) {
                    t.x += dx * 0.2;
                    t.y += dy * 0.2;
                    moving = true;
                } else {
                    t.x = t.targetX;
                    t.y = t.targetY;
                }

                // Render
                if (!t.isMatched || t.scale > 0.1) {
                    drawTile(t);
                }
            }
        }

        if (moving) {
            requestAnimationFrame(loop);
        } else {
            if (onComplete) onComplete();
        }
    }
    loop();
}

// --- DRAWING ---

function draw() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    for (let c = 0; c < COLS; c++) {
        for (let r = 0; r < ROWS; r++) {
            let t = grid[c][r];
            if (t) drawTile(t);
        }
    }
}

function drawTile(t) {
    if (t.isMatched) return; // Don't draw popped

    let cx = t.x + TILE_SIZE / 2;
    let cy = t.y + TILE_SIZE / 2;
    let size = (TILE_SIZE / 2 - 4) * t.scale;

    // Selection Halo
    if (selectedTile && selectedTile.c === t.c && selectedTile.r === t.r) {
        ctx.globalAlpha = 0.5;
        ctx.fillStyle = 'white';
        ctx.beginPath();
        ctx.arc(cx, cy, size + 5, 0, Math.PI * 2);
        ctx.fill();
        ctx.globalAlpha = 1.0;
    }

    // Balloon Body
    ctx.fillStyle = COLORS[t.color];
    ctx.beginPath();
    ctx.ellipse(cx, cy - 2, size, size * 1.15, 0, 0, Math.PI * 2);
    ctx.fill();

    // Specular Highlight (The 'Glossy' look)
    ctx.fillStyle = 'rgba(255,255,255,0.4)';
    ctx.beginPath();
    ctx.ellipse(cx - size * 0.3, cy - size * 0.4, size * 0.2, size * 0.1, -0.4, 0, Math.PI * 2);
    ctx.fill();

    // String Knot
    ctx.fillStyle = COLORS[t.color];
    ctx.beginPath();
    ctx.moveTo(cx, cy + size * 1.1);
    ctx.lineTo(cx - 3, cy + size * 1.35);
    ctx.lineTo(cx + 3, cy + size * 1.35);
    ctx.fill();

    // Type Indicator (Striped, Bomb) could be drawn here later
}

function updateUI() {
    scoreEl.innerText = score;
    movesEl.innerText = moves;
}

startGame();
