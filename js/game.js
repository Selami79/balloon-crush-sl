// BALOON CRUSH - GAME LOGIC
// Simple Match-3 Engine

const canvas = document.getElementById('canvas');
const ctx = canvas.getContext('2d');
const scoreEl = document.getElementById('score');
const movesEl = document.getElementById('moves');
const gameOverEl = document.getElementById('game-over');
const finalScoreEl = document.getElementById('final-score');

// Game Config
const COLS = 8;
const ROWS = 8;
const TILE_SIZE = 50;
const OFFSET_X = 0;
const OFFSET_Y = 0; // Adjust if needed
const ANIMATION_SPEED = 10;

// Colors for Balloons (Red, Blue, Green, Yellow, Purple, Orange)
const COLORS = ['#FF4136', '#0074D9', '#2ECC40', '#FFDC00', '#B10DC9', '#FF851B'];

let grid = [];
let score = 0;
let moves = 20;
let selectedTile = null;
let isAnimating = false;
let animations = [];

// Initialize
canvas.width = COLS * TILE_SIZE;
canvas.height = ROWS * TILE_SIZE;

function startGame() {
    score = 0;
    moves = 20;
    scoreEl.innerText = score;
    movesEl.innerText = moves;
    gameOverEl.style.display = 'none';
    isAnimating = false;

    initGrid();
    draw();
}

function initGrid() {
    grid = [];
    for (let c = 0; c < COLS; c++) {
        grid[c] = [];
        for (let r = 0; r < ROWS; r++) {
            grid[c][r] = {
                x: c * TILE_SIZE,
                y: r * TILE_SIZE,
                color: getRandomColor(),
                type: 'normal',
                match: 0,
                alpha: 1,
                offsetY: 0
            };
        }
    }
    // Remove initial matches
    resolveMatches(true);
}

function getRandomColor() {
    return COLORS[Math.floor(Math.random() * COLORS.length)];
}

// Drawing
function draw() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    for (let c = 0; c < COLS; c++) {
        for (let r = 0; r < ROWS; r++) {
            let tile = grid[c][r];
            if (!tile) continue;

            let x = tile.x;
            let y = tile.y + tile.offsetY; // For animation

            if (tile.match > 0) {
                // Popping animation (shrink)
                drawBalloon(x, y, tile.color, tile.alpha);
            } else {
                drawBalloon(x, y, tile.color, 1);
            }

            // Highlight selected
            if (selectedTile && selectedTile.c === c && selectedTile.r === r) {
                ctx.strokeStyle = 'white';
                ctx.lineWidth = 3;
                ctx.beginPath();
                ctx.rect(x + 2, y + 2, TILE_SIZE - 4, TILE_SIZE - 4);
                ctx.stroke();
            }
        }
    }

    if (isAnimating) {
        requestAnimationFrame(updateAnimations);
    }
}

function drawBalloon(x, y, color, scale) {
    let cx = x + TILE_SIZE / 2;
    let cy = y + TILE_SIZE / 2;
    let r = (TILE_SIZE / 2 - 4) * scale;

    if (r <= 0) return;

    // Balloon Body
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.ellipse(cx, cy - 2, r, r * 1.1, 0, 0, Math.PI * 2);
    ctx.fill();

    // Shine (Reflection)
    ctx.fillStyle = 'rgba(255,255,255,0.4)';
    ctx.beginPath();
    ctx.ellipse(cx - r / 3, cy - r / 3, r / 4, r / 6, -0.5, 0, Math.PI * 2);
    ctx.fill();

    // Knot
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.moveTo(cx, cy + r * 1.05);
    ctx.lineTo(cx - 3, cy + r * 1.25);
    ctx.lineTo(cx + 3, cy + r * 1.25);
    ctx.fill();
}


// Logic
function resolveMatches(silent = false) {
    let matches = findMatches();
    if (matches.length > 0) {
        if (!silent) isAnimating = true;

        // Mark matches
        matches.forEach(m => {
            grid[m.c][m.r].match = 1; // Start pop animation
            if (!silent) score += 10;
        });

        scoreEl.innerText = score;

        if (silent) {
            removeMatchesAndFall();
            resolveMatches(true); // Recursively clear
        } else {
            // Start Animation Loop if not silent
            draw();
        }
        return true;
    }
    return false;
}

function findMatches() {
    let matches = [];

    // Horizontal
    for (let r = 0; r < ROWS; r++) {
        for (let c = 0; c < COLS - 2; c++) {
            let color = grid[c][r].color;
            if (grid[c + 1][r].color === color && grid[c + 2][r].color === color) {
                matches.push({ c: c, r: r }, { c: c + 1, r: r }, { c: c + 2, r: r });
            }
        }
    }

    // Vertical
    for (let c = 0; c < COLS; c++) {
        for (let r = 0; r < ROWS - 2; r++) {
            let color = grid[c][r].color;
            if (grid[c][r + 1].color === color && grid[c][r + 2].color === color) {
                matches.push({ c: c, r: r }, { c: c, r: r + 1 }, { c: c, r: r + 2 });
            }
        }
    }
    // Remove duplicates
    return matches.filter((v, i, a) => a.findIndex(t => (t.c === v.c && t.r === v.r)) === i);
}

function updateAnimations() {
    let needsRedraw = false;
    let animationComplete = true;

    // 1. Pop Animation
    for (let c = 0; c < COLS; c++) {
        for (let r = 0; r < ROWS; r++) {
            if (grid[c][r].match > 0) {
                grid[c][r].alpha -= 0.1;
                if (grid[c][r].alpha <= 0) {
                    grid[c][r].color = null; // Removed
                } else {
                    animationComplete = false;
                }
                needsRedraw = true;
            }
        }
    }

    if (animationComplete && needsRedraw) {
        removeMatchesAndFall();
        // Check new matches after fall
        setTimeout(() => {
            if (!resolveMatches()) {
                isAnimating = false;
                checkGameOver();
            }
        }, 200);
        return;
    }

    draw();
    if (!animationComplete) requestAnimationFrame(updateAnimations);
}

function removeMatchesAndFall() {
    for (let c = 0; c < COLS; c++) {
        let shift = 0;
        for (let r = ROWS - 1; r >= 0; r--) {
            if (grid[c][r].color === null || grid[c][r].match > 0) {
                shift++;
            } else if (shift > 0) {
                grid[c][r + shift] = grid[c][r];
                grid[c][r + shift].y = (r + shift) * TILE_SIZE; // Reset position
                grid[c][r + shift].match = 0;
            }
        }
        // Fill top
        for (let r = 0; r < shift; r++) {
            grid[c][r] = {
                x: c * TILE_SIZE,
                y: r * TILE_SIZE,
                color: getRandomColor(),
                type: 'normal',
                match: 0,
                alpha: 1,
                offsetY: -TILE_SIZE * shift // For drop animation later
            };
        }
    }
}


function swap(c1, r1, c2, r2) {
    let temp = grid[c1][r1].color;
    grid[c1][r1].color = grid[c2][r2].color;
    grid[c2][r2].color = temp;
}

// Input Handling
canvas.addEventListener('mousedown', handleInput);
canvas.addEventListener('touchstart', handleInput, { passive: false });

function handleInput(e) {
    if (isAnimating || moves <= 0) return;

    e.preventDefault();
    let rect = canvas.getBoundingClientRect();
    let x, y;

    if (e.type === 'touchstart') {
        x = e.touches[0].clientX - rect.left;
        y = e.touches[0].clientY - rect.top;
    } else {
        x = e.clientX - rect.left;
        y = e.clientY - rect.top;
    }

    // Scale for canvas resolution
    x = x * (canvas.width / rect.width);
    y = y * (canvas.height / rect.height);

    let c = Math.floor(x / TILE_SIZE);
    let r = Math.floor(y / TILE_SIZE);

    if (c >= 0 && c < COLS && r >= 0 && r < ROWS) {
        if (!selectedTile) {
            selectedTile = { c: c, r: r };
            draw();
        } else {
            let dist = Math.abs(c - selectedTile.c) + Math.abs(r - selectedTile.r);
            if (dist === 1) {
                // Try Swap
                swap(c, r, selectedTile.c, selectedTile.r);
                if (findMatches().length > 0) {
                    moves--;
                    movesEl.innerText = moves;
                    selectedTile = null;
                    resolveMatches();
                } else {
                    // Invalid move, swap back
                    swap(c, r, selectedTile.c, selectedTile.r);
                    selectedTile = null;
                    draw();
                }
            } else {
                selectedTile = { c: c, r: r }; // Reselect
                draw();
            }
        }
    }
}

function checkGameOver() {
    if (moves <= 0) {
        gameOverEl.style.display = 'block';
        finalScoreEl.innerText = score;
        if (window.submitScoreToSL) window.submitScoreToSL(score);
    }
}

startGame();
