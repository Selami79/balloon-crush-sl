/**
 * BALLOON CRUSH PRO - Phaser 3 Edition
 * Professional Match-3 Engine
 */

const config = {
    type: Phaser.AUTO,
    width: 440,
    height: 600,
    parent: 'game-container',
    backgroundColor: '#667eea',
    scene: {
        preload: preload,
        create: create,
        update: update
    }
};

const game = new Phaser.Game(config);

// CONFIG
const GRID_SIZE = 8;
const TILE_SIZE = 50;
const OFFSET_X = 20;
const OFFSET_Y = 120;
const COLORS = [0xFF4136, 0x0074D9, 0x2ECC40, 0xFFDC00, 0xB10DC9, 0xFF851B];

// State
let grid = [];
let selectedTile = null;
let isMoving = false;
let score = 0;
let moves = 25;
let currentLevel = 1;
let targetScore = 500;

// UI Components
let scoreText, movesText, levelText, targetText;

function preload() {
    // Generate simple Balloon texture on the fly
    const graphics = this.make.graphics({ x: 0, y: 0, add: false });

    // Draw balloon shape
    graphics.fillStyle(0xffffff);
    graphics.fillCircle(25, 25, 22);
    graphics.slice(25, 25, 22, -0.4, 0.4, true);
    graphics.fillPath();

    // Shine highlight
    graphics.fillStyle(0xffffff, 0.4);
    graphics.fillCircle(18, 18, 6);

    graphics.generateTexture('balloon', 50, 50);

    // Draw brick (wall)
    const brick = this.make.graphics({ x: 0, y: 0, add: false });
    brick.fillStyle(0x8B4513);
    brick.fillRect(2, 2, 46, 46);
    brick.lineStyle(2, 0x000000);
    brick.strokeRect(4, 4, 42, 42);
    brick.generateTexture('wall', 50, 50);

    // Load progress from SL if available
    if (typeof window.getStartLevel === 'function') {
        currentLevel = window.getStartLevel() || 1;
    }
}

function create() {
    // Background gradient-ish
    const bg = this.add.graphics();
    bg.fillGradientStyle(0x667eea, 0x667eea, 0x764ba2, 0x764ba2, 1);
    bg.fillRect(0, 0, 440, 600);

    // Create UI
    createUI.call(this);

    // Initialize Grid
    initGrid.call(this);

    // Input
    this.input.on('gameobjectdown', onTileClick, this);
}

function createUI() {
    const style = { fontFamily: 'Fredoka One, Arial', fontSize: '20px', fill: '#fff' };

    // Use Graphics for a real rounded rectangle UI panel
    const graphics = this.add.graphics();
    graphics.fillStyle(0x000000, 0.3);
    graphics.fillRoundedRect(20, 10, 400, 100, 15);

    scoreText = this.add.text(40, 30, 'SCORE: 0', style);
    movesText = this.add.text(280, 30, 'MOVES: 25', style);
    levelText = this.add.text(175, 65, 'LEVEL ' + currentLevel, { ...style, fontSize: '18px', fill: '#FFDC00' });
    targetText = this.add.text(175, 90, 'TARGET: ' + targetScore, { ...style, fontSize: '14px' });

    updateUI();
}

function initGrid() {
    grid = [];
    for (let i = 0; i < GRID_SIZE; i++) {
        grid[i] = [];
        for (let j = 0; j < GRID_SIZE; j++) {
            grid[i][j] = createTile.call(this, i, j);
        }
    }

    // Ensure no initial matches
    while (findMatches().length > 0) {
        shuffleGrid();
    }
}

function createTile(i, j) {
    const colorIdx = Phaser.Math.Between(0, COLORS.length - 1);
    const x = OFFSET_X + i * TILE_SIZE + TILE_SIZE / 2;
    const y = OFFSET_Y + j * TILE_SIZE + TILE_SIZE / 2;

    const sprite = this.add.sprite(x, y, 'balloon');
    sprite.setInteractive();
    sprite.setTint(COLORS[colorIdx]);
    sprite.setScale(0); // Start small for intro animation

    this.tweens.add({
        targets: sprite,
        scale: 0.9,
        duration: 300,
        delay: (i + j) * 50,
        ease: 'Back.easeOut'
    });

    return {
        i, j,
        sprite,
        color: colorIdx,
        isEmpty: false,
        obstacle: 0
    };
}

function onTileClick(pointer, sprite) {
    if (isMoving || moves <= 0) return;

    // Find our tile object
    let clickedTile = null;
    for (let i = 0; i < GRID_SIZE; i++) {
        for (let j = 0; j < GRID_SIZE; j++) {
            if (grid[i][j].sprite === sprite) {
                clickedTile = grid[i][j];
                break;
            }
        }
    }

    if (!clickedTile) return;

    if (!selectedTile) {
        selectedTile = clickedTile;
        sprite.setAlpha(0.7);
        this.tweens.add({ targets: sprite, scale: 1.1, duration: 100, yoyo: true });
    } else {
        const dx = Math.abs(clickedTile.i - selectedTile.i);
        const dy = Math.abs(clickedTile.j - selectedTile.j);

        if ((dx === 1 && dy === 0) || (dx === 0 && dy === 1)) {
            swapTiles.call(this, selectedTile, clickedTile);
        } else {
            selectedTile.sprite.setAlpha(1);
            selectedTile = clickedTile;
            sprite.setAlpha(0.7);
        }
    }
}

function swapTiles(tile1, tile2) {
    isMoving = true;
    tile1.sprite.setAlpha(1);
    moves--;
    updateUI();

    // Visual Swap
    this.tweens.add({
        targets: tile1.sprite,
        x: tile2.sprite.x,
        y: tile2.sprite.y,
        duration: 200
    });
    this.tweens.add({
        targets: tile2.sprite,
        x: tile1.sprite.x,
        y: tile1.sprite.y,
        duration: 200,
        onComplete: () => {
            // Update Data
            const tempColor = tile1.color;
            tile1.color = tile2.color;
            tile2.color = tempColor;

            const tempSprite = tile1.sprite;
            tile1.sprite = tile2.sprite;
            tile2.sprite = tempSprite;

            const matches = findMatches();
            if (matches.length > 0) {
                handleMatches.call(this, matches);
            } else {
                // Swap back if no matches
                this.tweens.add({
                    targets: tile1.sprite,
                    x: tile2.sprite.x,
                    y: tile2.sprite.y,
                    duration: 200
                });
                this.tweens.add({
                    targets: tile2.sprite,
                    x: tile1.sprite.x,
                    y: tile1.sprite.y,
                    duration: 200,
                    onComplete: () => {
                        const tempColor = tile1.color;
                        tile1.color = tile2.color;
                        tile2.color = tempColor;

                        const tempSprite = tile1.sprite;
                        tile1.sprite = tile2.sprite;
                        tile2.sprite = tempSprite;
                        isMoving = false;
                    }
                });
            }
            selectedTile = null;
        }
    });
}

function findMatches() {
    let matches = [];

    // Horizontal
    for (let j = 0; j < GRID_SIZE; j++) {
        for (let i = 0; i < GRID_SIZE - 2; i++) {
            if (grid[i][j].color === grid[i + 1][j].color && grid[i][j].color === grid[i + 2][j].color) {
                matches.push(grid[i][j], grid[i + 1][j], grid[i + 2][j]);
            }
        }
    }

    // Vertical
    for (let i = 0; i < GRID_SIZE; i++) {
        for (let j = 0; j < GRID_SIZE - 2; j++) {
            if (grid[i][j].color === grid[i][j + 1].color && grid[i][j].color === grid[i][j + 2].color) {
                matches.push(grid[i][j], grid[i][j + 1], grid[i][j + 2]);
            }
        }
    }

    return [...new Set(matches)];
}

function handleMatches(matches) {
    score += matches.length * 20;
    updateUI();

    const targets = matches.map(m => m.sprite);
    this.tweens.add({
        targets: targets,
        scale: 0,
        alpha: 0,
        duration: 200,
        onComplete: () => {
            matches.forEach(m => {
                m.isMatched = true;
                m.sprite.destroy();
                m.sprite = null;
            });
            applyGravity.call(this);
        }
    });
}

function applyGravity() {
    let dropTweens = [];

    for (let i = 0; i < GRID_SIZE; i++) {
        let emptySpots = 0;
        for (let j = GRID_SIZE - 1; j >= 0; j--) {
            if (grid[i][j].isMatched) {
                emptySpots++;
            } else if (emptySpots > 0) {
                // Move down
                const targetRow = j + emptySpots;
                const tile = grid[i][j];
                const emptyTile = grid[i][targetRow];

                // Swap in grid
                grid[i][targetRow] = tile;
                grid[i][j] = emptyTile;

                tile.j = targetRow;
                emptyTile.j = j;

                dropTweens.push({
                    targets: tile.sprite,
                    y: OFFSET_Y + targetRow * TILE_SIZE + TILE_SIZE / 2,
                    duration: emptySpots * 100
                });
            }
        }

        // Fill new tiles
        for (let k = 0; k < emptySpots; k++) {
            const row = k;
            const newTile = createTile.call(this, i, row);
            newTile.sprite.y = -50;
            grid[i][row] = newTile;

            dropTweens.push({
                targets: newTile.sprite,
                y: OFFSET_Y + row * TILE_SIZE + TILE_SIZE / 2,
                duration: 300,
                delay: 200
            });
        }
    }

    this.tweens.add({
        targets: {}, // Dummy
        duration: 400,
        onComplete: () => {
            const nextMatches = findMatches();
            if (nextMatches.length > 0) {
                handleMatches.call(this, nextMatches);
            } else {
                isMoving = false;
                checkEndGame.call(this);
            }
        }
    });
}

function checkEndGame() {
    if (score >= targetScore) {
        alert("LEVEL COMPLETE!");
        currentLevel++;
        targetScore += 500;
        if (window.submitLevelToSL) window.submitLevelToSL(currentLevel);
        resetGrid.call(this);
    } else if (moves <= 0) {
        alert("GAME OVER! Final Score: " + score);
        if (window.submitScoreToSL) window.submitScoreToSL(score);
        score = 0;
        moves = 25;
        resetGrid.call(this);
    }
}

function resetGrid() {
    for (let i = 0; i < GRID_SIZE; i++) {
        for (let j = 0; j < GRID_SIZE; j++) {
            if (grid[i][j].sprite) grid[i][j].sprite.destroy();
        }
    }
    initGrid.call(this);
    updateUI();
}

function updateUI() {
    scoreText.setText('SCORE: ' + score);
    movesText.setText('MOVES: ' + moves);
    levelText.setText('LEVEL ' + currentLevel);
    targetText.setText('TARGET: ' + targetScore);
}

function shuffleGrid() {
    for (let i = 0; i < GRID_SIZE; i++) {
        for (let j = 0; j < GRID_SIZE; j++) {
            grid[i][j].color = Phaser.Math.Between(0, COLORS.length - 1);
            grid[i][j].sprite.setTint(COLORS[grid[i][j].color]);
        }
    }
}

function update() { }
