/**
 * TAVLA (Backgammon) - Second Life Integration
 * Premium Web Frontend with 3D Dice and LSL Backend Communication
 */

// ========================================
// GAME CONFIGURATION
// ========================================

const CONFIG = {
    LSL_URL: '', // Will be set when connected to Second Life
    POLL_INTERVAL: 2000, // Check for updates every 2 seconds
    ANIMATION_DURATION: 400,
    DEBUG: true
};

// Starting positions for standard backgammon
// Key: point number (1-24), Value: { color: 'white'|'black', count: number }
const STARTING_POSITIONS = {
    1: { color: 'white', count: 2 },
    6: { color: 'black', count: 5 },
    8: { color: 'black', count: 3 },
    12: { color: 'white', count: 5 },
    13: { color: 'black', count: 5 },
    17: { color: 'white', count: 3 },
    19: { color: 'white', count: 5 },
    24: { color: 'black', count: 2 }
};

// ========================================
// GAME STATE
// ========================================

const gameState = {
    // Board state: array of 24 points, each with { color: 'white'|'black'|null, count: 0 }
    board: [],

    // Bar (hit checkers)
    bar: {
        white: 0,
        black: 0
    },

    // Home (borne off checkers)
    home: {
        white: 0,
        black: 0
    },

    // Current player: 'white' | 'black'
    currentPlayer: 'white',

    // Dice values
    dice: [0, 0],

    // Available moves based on dice
    availableMoves: [],

    // Used moves in current turn
    usedMoves: [],

    // Selected checker
    selectedChecker: null,

    // Valid destinations for selected checker
    validDestinations: [],

    // Game phase: 'waiting' | 'rolling' | 'moving' | 'ended'
    phase: 'waiting',

    // Player info
    players: {
        white: { name: 'Oyuncu 1', score: 0, uuid: '' },
        black: { name: 'Oyuncu 2', score: 0, uuid: '' }
    },

    // My color (set by LSL)
    myColor: null,

    // Move history for undo
    moveHistory: [],

    // 3D Dice box instance
    diceBox: null,

    // Dice ready state
    diceReady: false
};

// ========================================
// DOM ELEMENTS
// ========================================

const elements = {
    diceResult: document.getElementById('dice-result'),
    rollBtn: document.getElementById('roll-btn'),
    statusMessage: document.getElementById('status-message'),
    movesRemaining: document.getElementById('moves-remaining'),
    player1Turn: document.getElementById('player1-turn'),
    player2Turn: document.getElementById('player2-turn'),
    player1Name: document.getElementById('player1-name'),
    player2Name: document.getElementById('player2-name'),
    player1Score: document.getElementById('player1-score'),
    player2Score: document.getElementById('player2-score'),
    newGameBtn: document.getElementById('new-game-btn'),
    undoBtn: document.getElementById('undo-btn'),
    confirmBtn: document.getElementById('confirm-btn'),
    barWhite: document.getElementById('bar-white-checkers'),
    barBlack: document.getElementById('bar-black-checkers'),
    homeWhite: document.getElementById('home-white-checkers'),
    homeBlack: document.getElementById('home-black-checkers'),
    diceBox: document.getElementById('dice-box')
};

// ========================================
// INITIALIZATION
// ========================================

async function init() {
    console.log('🎲 Tavla oyunu başlatılıyor...');

    initializeBoard();
    setupEventListeners();
    renderBoard();
    updateUI();

    // Initialize 3D Dice
    await init3DDice();

    // Check URL parameters for LSL connection
    const urlParams = new URLSearchParams(window.location.search);
    const lslUrl = urlParams.get('lsl');
    const playerUuid = urlParams.get('uuid');
    const playerColor = urlParams.get('color');

    if (lslUrl) {
        CONFIG.LSL_URL = decodeURIComponent(lslUrl);
        gameState.myColor = playerColor;
        console.log('📡 LSL bağlantısı kuruldu:', CONFIG.LSL_URL);
        startPolling();
    }
}

async function init3DDice() {
    if (!window.DiceBox) {
        console.warn('⚠️ DiceBox kütüphanesi yüklenemedi, basit zar modu kullanılacak');
        gameState.diceReady = true;
        return;
    }

    try {
        gameState.diceBox = new window.DiceBox("#dice-box", {
            assetPath: "https://unpkg.com/@3d-dice/dice-box@1.1.3/dist/assets/",
            theme: "default",
            themeColor: "#d4af37", // Gold color
            scale: 6,
            gravity: 2,
            mass: 1,
            friction: 0.8,
            restitution: 0.5,
            linearDamping: 0.5,
            angularDamping: 0.4,
            spinForce: 6,
            throwForce: 5,
            startingHeight: 10,
            settleTimeout: 5000,
            offscreen: true,
            delay: 10,
            lightIntensity: 1,
            enableShadows: true
        });

        await gameState.diceBox.init();

        // Set up callback for when dice finish rolling
        gameState.diceBox.onRollComplete = (results) => {
            handleDiceResult(results);
        };

        gameState.diceReady = true;
        console.log('✅ 3D Zar sistemi hazır!');

    } catch (error) {
        console.error('❌ 3D Dice init hatası:', error);
        gameState.diceReady = true; // Fall back to simple dice
    }
}

function initializeBoard() {
    // Initialize empty board
    gameState.board = [];
    for (let i = 0; i < 24; i++) {
        gameState.board.push({ color: null, count: 0 });
    }

    // Place starting checkers
    for (const [point, data] of Object.entries(STARTING_POSITIONS)) {
        const index = parseInt(point) - 1;
        gameState.board[index] = { color: data.color, count: data.count };
    }

    // Reset other state
    gameState.bar = { white: 0, black: 0 };
    gameState.home = { white: 0, black: 0 };
    gameState.currentPlayer = 'white';
    gameState.dice = [0, 0];
    gameState.availableMoves = [];
    gameState.usedMoves = [];
    gameState.selectedChecker = null;
    gameState.validDestinations = [];
    gameState.phase = 'waiting';
    gameState.moveHistory = [];
}

function setupEventListeners() {
    // Roll button
    elements.rollBtn.addEventListener('click', rollDice);

    // Control buttons
    elements.newGameBtn.addEventListener('click', newGame);
    elements.undoBtn.addEventListener('click', undoMove);
    elements.confirmBtn.addEventListener('click', confirmTurn);

    // Point click handlers
    for (let i = 1; i <= 24; i++) {
        const pointEl = document.querySelector(`[data-point="${i}"]`);
        if (pointEl) {
            pointEl.addEventListener('click', () => handlePointClick(i));
        }
    }

    // Bar click handlers
    document.getElementById('bar-white').addEventListener('click', () => handleBarClick('white'));
    document.getElementById('bar-black').addEventListener('click', () => handleBarClick('black'));

    // Home click handlers
    document.getElementById('home-white').addEventListener('click', () => handleHomeClick('white'));
    document.getElementById('home-black').addEventListener('click', () => handleHomeClick('black'));
}

// ========================================
// RENDERING
// ========================================

function renderBoard() {
    // Render all 24 points
    for (let i = 1; i <= 24; i++) {
        renderPoint(i);
    }

    // Render bar
    renderBar();

    // Render home
    renderHome();
}

function renderPoint(pointNum) {
    const container = document.getElementById(`point-${pointNum}`);
    if (!container) return;

    container.innerHTML = '';

    const pointData = gameState.board[pointNum - 1];
    if (!pointData || pointData.count === 0) return;

    // Render checkers (max 5 visible, show count if more)
    const visibleCount = Math.min(pointData.count, 5);

    for (let i = 0; i < visibleCount; i++) {
        const checker = document.createElement('div');
        checker.className = `checker ${pointData.color}`;
        checker.dataset.point = pointNum;
        checker.dataset.index = i;

        // Show count on top checker if stacked
        if (i === visibleCount - 1 && pointData.count > 5) {
            const countSpan = document.createElement('span');
            countSpan.className = 'checker-count';
            countSpan.textContent = pointData.count;
            checker.appendChild(countSpan);
        }

        // Add selected class if this is the selected checker
        if (gameState.selectedChecker &&
            gameState.selectedChecker.type === 'point' &&
            gameState.selectedChecker.point === pointNum) {
            checker.classList.add('selected');
        }

        container.appendChild(checker);
    }

    // Mark valid destinations
    const pointEl = document.querySelector(`[data-point="${pointNum}"]`);
    if (gameState.validDestinations.includes(pointNum)) {
        pointEl.classList.add('valid-move');
    } else {
        pointEl.classList.remove('valid-move');
    }
}

function renderBar() {
    // White bar
    elements.barWhite.innerHTML = '';
    for (let i = 0; i < gameState.bar.white; i++) {
        const checker = document.createElement('div');
        checker.className = 'checker white';
        checker.style.width = '35px';
        checker.style.height = '35px';
        elements.barWhite.appendChild(checker);
    }

    // Black bar
    elements.barBlack.innerHTML = '';
    for (let i = 0; i < gameState.bar.black; i++) {
        const checker = document.createElement('div');
        checker.className = 'checker black';
        checker.style.width = '35px';
        checker.style.height = '35px';
        elements.barBlack.appendChild(checker);
    }
}

function renderHome() {
    // White home
    elements.homeWhite.innerHTML = '';
    for (let i = 0; i < gameState.home.white; i++) {
        const checker = document.createElement('div');
        checker.className = 'home-checker white';
        elements.homeWhite.appendChild(checker);
    }

    // Black home
    elements.homeBlack.innerHTML = '';
    for (let i = 0; i < gameState.home.black; i++) {
        const checker = document.createElement('div');
        checker.className = 'home-checker black';
        elements.homeBlack.appendChild(checker);
    }
}

function updateUI() {
    // Update turn indicators
    elements.player1Turn.classList.toggle('active', gameState.currentPlayer === 'white');
    elements.player2Turn.classList.toggle('active', gameState.currentPlayer === 'black');

    // Update roll button
    const canRoll = gameState.phase === 'waiting' &&
        gameState.diceReady &&
        (gameState.myColor === null || gameState.myColor === gameState.currentPlayer);
    elements.rollBtn.disabled = !canRoll;

    // Update status message
    updateStatusMessage();

    // Update moves remaining display
    updateMovesRemaining();

    // Update control buttons
    elements.undoBtn.disabled = gameState.moveHistory.length === 0;
    elements.confirmBtn.disabled = gameState.availableMoves.length > 0 && gameState.phase === 'moving';

    // Update player info
    elements.player1Name.textContent = gameState.players.white.name;
    elements.player2Name.textContent = gameState.players.black.name;
    elements.player1Score.textContent = gameState.players.white.score;
    elements.player2Score.textContent = gameState.players.black.score;
}

function updateStatusMessage() {
    let message = '';

    switch (gameState.phase) {
        case 'waiting':
            const playerName = gameState.currentPlayer === 'white' ?
                gameState.players.white.name : gameState.players.black.name;
            message = `${playerName} zar atmalı 🎲`;
            break;
        case 'rolling':
            message = 'Zar atılıyor... 🎲';
            break;
        case 'moving':
            if (gameState.selectedChecker) {
                message = '👆 Hedef noktayı seçin';
            } else if (gameState.bar[gameState.currentPlayer] > 0) {
                message = '⚠️ Önce bar\'daki taşı çıkarın';
            } else {
                message = '👆 Hareket ettirilecek taşı seçin';
            }
            break;
        case 'ended':
            const winner = gameState.home.white === 15 ? 'Beyaz' : 'Siyah';
            const isMars = gameState.home.white === 15 ?
                gameState.home.black === 0 : gameState.home.white === 0;
            message = `🏆 ${winner} kazandı!${isMars ? ' (MARS! 🔥)' : ''}`;
            break;
    }

    elements.statusMessage.textContent = message;
}

function updateMovesRemaining() {
    elements.movesRemaining.innerHTML = '';

    if (gameState.phase !== 'moving') return;

    // Get all moves and mark used ones
    const allMoves = [];
    const usedCopy = [...gameState.usedMoves];

    // Add available moves
    for (const m of gameState.availableMoves) {
        allMoves.push({ value: m, used: false });
    }

    // Add used moves
    for (const m of usedCopy) {
        allMoves.push({ value: m, used: true });
    }

    // Sort by value descending
    allMoves.sort((a, b) => b.value - a.value);

    for (const move of allMoves) {
        const dot = document.createElement('div');
        dot.className = 'move-dot';
        dot.textContent = move.value;

        if (move.used) {
            dot.classList.add('used');
        }

        elements.movesRemaining.appendChild(dot);
    }
}

function showDiceResult(dice1, dice2) {
    elements.diceResult.innerHTML = '';

    const isDouble = dice1 === dice2;
    if (isDouble) {
        elements.diceResult.classList.add('doubles');
    } else {
        elements.diceResult.classList.remove('doubles');
    }

    const d1 = document.createElement('div');
    d1.className = 'dice-value';
    d1.textContent = dice1;

    const d2 = document.createElement('div');
    d2.className = 'dice-value';
    d2.textContent = dice2;

    elements.diceResult.appendChild(d1);
    elements.diceResult.appendChild(d2);

    // If doubles, show 4 dice
    if (isDouble) {
        const d3 = document.createElement('div');
        d3.className = 'dice-value';
        d3.textContent = dice1;

        const d4 = document.createElement('div');
        d4.className = 'dice-value';
        d4.textContent = dice2;

        elements.diceResult.appendChild(d3);
        elements.diceResult.appendChild(d4);
    }
}

// ========================================
// GAME LOGIC
// ========================================

async function rollDice() {
    if (gameState.phase !== 'waiting' || !gameState.diceReady) return;

    gameState.phase = 'rolling';
    elements.rollBtn.disabled = true;
    elements.diceResult.innerHTML = '<span style="color: var(--text-secondary)">🎲 Zar atılıyor...</span>';

    // Activate dice box for pointer events
    elements.diceBox.classList.add('active');

    // Use 3D Dice if available
    if (gameState.diceBox) {
        try {
            // Roll 2d6 with 3D physics
            await gameState.diceBox.roll('2d6');
            // Result will be handled by onRollComplete callback
        } catch (error) {
            console.error('3D Dice error:', error);
            fallbackDiceRoll();
        }
    } else {
        fallbackDiceRoll();
    }
}

function fallbackDiceRoll() {
    // Simple fallback dice roll
    setTimeout(() => {
        const dice1 = Math.floor(Math.random() * 6) + 1;
        const dice2 = Math.floor(Math.random() * 6) + 1;
        handleDiceResult([
            { value: dice1 },
            { value: dice2 }
        ]);
    }, 500);
}

function handleDiceResult(results) {
    // Deactivate dice box
    elements.diceBox.classList.remove('active');

    // Extract values from results
    let dice1, dice2;

    if (Array.isArray(results)) {
        dice1 = results[0]?.value || results[0]?.sides?.[0] || Math.floor(Math.random() * 6) + 1;
        dice2 = results[1]?.value || results[1]?.sides?.[0] || Math.floor(Math.random() * 6) + 1;
    } else {
        dice1 = Math.floor(Math.random() * 6) + 1;
        dice2 = Math.floor(Math.random() * 6) + 1;
    }

    gameState.dice = [dice1, dice2];

    // Calculate available moves
    if (dice1 === dice2) {
        // Doubles: 4 moves of the same value
        gameState.availableMoves = [dice1, dice1, dice1, dice1];
    } else {
        gameState.availableMoves = [dice1, dice2];
    }

    gameState.usedMoves = [];
    gameState.phase = 'moving';

    // Show result
    showDiceResult(dice1, dice2);

    updateUI();
    renderBoard();

    // Play sound effect
    playSound('dice');

    // Check if any valid moves exist
    if (!hasValidMoves()) {
        setTimeout(() => {
            showNotification('Yapılabilecek hamle yok! Sıra geçiyor. 😔');
            endTurn();
        }, 1000);
    }

    // Send to LSL if connected
    if (CONFIG.LSL_URL) {
        sendToLSL('roll', { dice: gameState.dice });
    }

    console.log('🎲 Zar:', dice1, dice2, gameState.dice[0] === gameState.dice[1] ? '(ÇIFT!)' : '');
}

function handlePointClick(pointNum) {
    if (gameState.phase !== 'moving') return;

    const pointData = gameState.board[pointNum - 1];

    // If clicking on a valid destination
    if (gameState.validDestinations.includes(pointNum)) {
        makeMove(gameState.selectedChecker, pointNum);
        playSound('move');
        return;
    }

    // If clicking on own checker
    if (pointData.color === gameState.currentPlayer && pointData.count > 0) {
        // Check if player has checkers on bar
        if (gameState.bar[gameState.currentPlayer] > 0) {
            showNotification('⚠️ Önce bar\'daki taşı çıkarın!');
            return;
        }

        selectChecker({ type: 'point', point: pointNum });
        playSound('select');
    } else {
        // Deselect
        deselectChecker();
    }
}

function handleBarClick(color) {
    if (gameState.phase !== 'moving') return;
    if (color !== gameState.currentPlayer) return;
    if (gameState.bar[color] === 0) return;

    selectChecker({ type: 'bar', color: color });
    playSound('select');
}

function handleHomeClick(color) {
    if (gameState.phase !== 'moving') return;
    if (color !== gameState.currentPlayer) return;
    if (!gameState.selectedChecker) return;

    // Check if bearing off is valid
    if (gameState.validDestinations.includes('home')) {
        makeMove(gameState.selectedChecker, 'home');
        playSound('home');
    }
}

function selectChecker(checker) {
    gameState.selectedChecker = checker;
    gameState.validDestinations = calculateValidDestinations(checker);

    renderBoard();
    updateUI();

    console.log('✓ Seçilen taş:', checker, 'Geçerli hedefler:', gameState.validDestinations);
}

function deselectChecker() {
    gameState.selectedChecker = null;
    gameState.validDestinations = [];

    renderBoard();
    updateUI();
}

function calculateValidDestinations(checker) {
    const destinations = [];
    const direction = gameState.currentPlayer === 'white' ? 1 : -1;

    let fromPoint;
    if (checker.type === 'bar') {
        // Coming from bar
        fromPoint = gameState.currentPlayer === 'white' ? 0 : 25;
    } else {
        fromPoint = checker.point;
    }

    for (const move of gameState.availableMoves) {
        let toPoint;

        if (checker.type === 'bar') {
            // Entering from bar
            toPoint = gameState.currentPlayer === 'white' ? move : 25 - move;
        } else {
            toPoint = fromPoint + (move * direction);
        }

        // Check if bearing off
        if (gameState.currentPlayer === 'white' && toPoint > 24) {
            if (canBearOff('white')) {
                // Check if this is exact or highest checker
                if (toPoint === 25 || isHighestChecker(fromPoint, 'white')) {
                    if (!destinations.includes('home')) {
                        destinations.push('home');
                    }
                }
            }
            continue;
        } else if (gameState.currentPlayer === 'black' && toPoint < 1) {
            if (canBearOff('black')) {
                if (toPoint === 0 || isHighestChecker(fromPoint, 'black')) {
                    if (!destinations.includes('home')) {
                        destinations.push('home');
                    }
                }
            }
            continue;
        }

        // Check if valid board position
        if (toPoint < 1 || toPoint > 24) continue;

        // Check if destination is valid (not blocked by opponent)
        const destData = gameState.board[toPoint - 1];
        if (destData.color === getOpponent(gameState.currentPlayer) && destData.count >= 2) {
            continue; // Blocked
        }

        if (!destinations.includes(toPoint)) {
            destinations.push(toPoint);
        }
    }

    return destinations;
}

function makeMove(from, to) {
    // Save state for undo
    const moveRecord = {
        from: from,
        to: to,
        capturedFrom: null,
        diceUsed: 0
    };

    let fromPoint, toPoint;

    // Determine source
    if (from.type === 'bar') {
        fromPoint = gameState.currentPlayer === 'white' ? 0 : 25;
        gameState.bar[gameState.currentPlayer]--;
    } else {
        fromPoint = from.point;
        gameState.board[fromPoint - 1].count--;
        if (gameState.board[fromPoint - 1].count === 0) {
            gameState.board[fromPoint - 1].color = null;
        }
    }

    // Determine destination and dice used
    if (to === 'home') {
        toPoint = gameState.currentPlayer === 'white' ? 25 : 0;
        gameState.home[gameState.currentPlayer]++;
    } else {
        toPoint = to;

        // Check for hit
        const destData = gameState.board[toPoint - 1];
        if (destData.color === getOpponent(gameState.currentPlayer) && destData.count === 1) {
            // Hit!
            gameState.bar[getOpponent(gameState.currentPlayer)]++;
            destData.count = 0;
            destData.color = null;
            moveRecord.capturedFrom = toPoint;
            playSound('hit');
            showNotification('💥 Vurdu!');
        }

        // Place checker
        gameState.board[toPoint - 1].count++;
        gameState.board[toPoint - 1].color = gameState.currentPlayer;
    }

    // Calculate dice used
    const direction = gameState.currentPlayer === 'white' ? 1 : -1;
    const distance = Math.abs(toPoint - fromPoint);
    moveRecord.diceUsed = distance;

    // Remove used dice
    const diceIdx = gameState.availableMoves.indexOf(distance);
    if (diceIdx !== -1) {
        gameState.availableMoves.splice(diceIdx, 1);
        gameState.usedMoves.push(distance);
    } else {
        // Bearing off with higher dice
        const sortedMoves = [...gameState.availableMoves].sort((a, b) => b - a);
        const highestDice = sortedMoves[0];
        const idx = gameState.availableMoves.indexOf(highestDice);
        gameState.availableMoves.splice(idx, 1);
        moveRecord.diceUsed = highestDice;
        gameState.usedMoves.push(highestDice);
    }

    // Add to history
    gameState.moveHistory.push(moveRecord);

    // Deselect
    deselectChecker();

    // Check for game end
    if (gameState.home[gameState.currentPlayer] === 15) {
        gameState.phase = 'ended';
        const isMars = gameState.home[getOpponent(gameState.currentPlayer)] === 0;
        playSound('win');
        showNotification(`🏆 ${gameState.currentPlayer === 'white' ? 'Beyaz' : 'Siyah'} kazandı!${isMars ? ' MARS! 🔥' : ''}`);
        updateUI();
        return;
    }

    // Check if turn is over
    if (gameState.availableMoves.length === 0 || !hasValidMoves()) {
        setTimeout(() => {
            confirmTurn();
        }, 500);
    }

    renderBoard();
    updateUI();

    // Send to LSL
    if (CONFIG.LSL_URL) {
        sendToLSL('move', { from: fromPoint, to: toPoint });
    }
}

function hasValidMoves() {
    if (gameState.availableMoves.length === 0) return false;

    // Check bar first
    if (gameState.bar[gameState.currentPlayer] > 0) {
        const barChecker = { type: 'bar', color: gameState.currentPlayer };
        return calculateValidDestinations(barChecker).length > 0;
    }

    // Check all points with player's checkers
    for (let i = 0; i < 24; i++) {
        const point = gameState.board[i];
        if (point.color === gameState.currentPlayer && point.count > 0) {
            const checker = { type: 'point', point: i + 1 };
            if (calculateValidDestinations(checker).length > 0) {
                return true;
            }
        }
    }

    return false;
}

function canBearOff(color) {
    const homeRange = color === 'white' ? [18, 23] : [0, 5];

    // Check if all checkers are in home board
    for (let i = 0; i < 24; i++) {
        if (i >= homeRange[0] && i <= homeRange[1]) continue;

        const point = gameState.board[i];
        if (point.color === color && point.count > 0) {
            return false;
        }
    }

    // Also check bar
    if (gameState.bar[color] > 0) return false;

    return true;
}

function isHighestChecker(point, color) {
    // For bearing off with higher dice
    const direction = color === 'white' ? -1 : 1;
    const start = color === 'white' ? 18 : 5;
    const end = color === 'white' ? point - 2 : point;

    for (let i = start; direction > 0 ? i < end : i > end; i += direction) {
        const data = gameState.board[i];
        if (data.color === color && data.count > 0) {
            return false;
        }
    }

    return true;
}

function getOpponent(color) {
    return color === 'white' ? 'black' : 'white';
}

function undoMove() {
    if (gameState.moveHistory.length === 0) return;

    const move = gameState.moveHistory.pop();

    // Restore dice
    gameState.availableMoves.push(move.diceUsed);
    const usedIdx = gameState.usedMoves.indexOf(move.diceUsed);
    if (usedIdx !== -1) {
        gameState.usedMoves.splice(usedIdx, 1);
    }

    // Reverse the move
    if (move.to === 'home') {
        gameState.home[gameState.currentPlayer]--;
    } else {
        gameState.board[move.to - 1].count--;
        if (gameState.board[move.to - 1].count === 0) {
            gameState.board[move.to - 1].color = null;
        }
    }

    if (move.from.type === 'bar') {
        gameState.bar[gameState.currentPlayer]++;
    } else {
        gameState.board[move.from.point - 1].count++;
        gameState.board[move.from.point - 1].color = gameState.currentPlayer;
    }

    // Restore captured checker
    if (move.capturedFrom !== null) {
        gameState.bar[getOpponent(gameState.currentPlayer)]--;
        gameState.board[move.capturedFrom - 1].count = 1;
        gameState.board[move.capturedFrom - 1].color = getOpponent(gameState.currentPlayer);
    }

    deselectChecker();
    renderBoard();
    updateUI();
    updateMovesRemaining();
    showDiceResult(gameState.dice[0], gameState.dice[1]);

    playSound('undo');
}

function confirmTurn() {
    gameState.moveHistory = [];
    gameState.availableMoves = [];
    gameState.usedMoves = [];
    gameState.currentPlayer = getOpponent(gameState.currentPlayer);
    gameState.phase = 'waiting';

    elements.diceResult.innerHTML = '';

    deselectChecker();
    updateUI();

    // Clear 3D dice
    if (gameState.diceBox) {
        gameState.diceBox.clear();
    }

    // Send to LSL
    if (CONFIG.LSL_URL) {
        sendToLSL('endTurn', { nextPlayer: gameState.currentPlayer });
    }
}

function endTurn() {
    confirmTurn();
}

function newGame() {
    if (confirm('Yeni oyun başlatılsın mı?')) {
        initializeBoard();
        elements.diceResult.innerHTML = '';

        if (gameState.diceBox) {
            gameState.diceBox.clear();
        }

        renderBoard();
        updateUI();

        // Send to LSL
        if (CONFIG.LSL_URL) {
            sendToLSL('newGame', {});
        }
    }
}

// ========================================
// SOUND EFFECTS
// ========================================

function playSound(type) {
    // Sound effects can be added here
    console.log('🔊 Sound:', type);
}

// ========================================
// NOTIFICATIONS
// ========================================

function showNotification(message) {
    // Simple notification - could be enhanced with toast library
    console.log('📢', message);

    // Temporary status update
    const originalMessage = elements.statusMessage.textContent;
    elements.statusMessage.textContent = message;

    setTimeout(() => {
        if (elements.statusMessage.textContent === message) {
            updateStatusMessage();
        }
    }, 2000);
}

// ========================================
// LSL COMMUNICATION
// ========================================

async function sendToLSL(action, data) {
    if (!CONFIG.LSL_URL) return;

    try {
        const payload = {
            action: action,
            player: gameState.myColor,
            ...data
        };

        const response = await fetch(CONFIG.LSL_URL, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(payload)
        });

        if (response.ok) {
            const result = await response.text();
            console.log('📡 LSL response:', result);
        }
    } catch (error) {
        console.error('❌ LSL error:', error);
    }
}

async function pollLSL() {
    if (!CONFIG.LSL_URL) return;

    try {
        const response = await fetch(`${CONFIG.LSL_URL}?poll=1`);
        if (response.ok) {
            const data = await response.json();
            handleLSLUpdate(data);
        }
    } catch (error) {
        console.error('❌ Poll error:', error);
    }
}

function handleLSLUpdate(data) {
    // Update game state from LSL
    if (data.board) {
        gameState.board = data.board;
    }
    if (data.bar) {
        gameState.bar = data.bar;
    }
    if (data.home) {
        gameState.home = data.home;
    }
    if (data.currentPlayer) {
        gameState.currentPlayer = data.currentPlayer;
    }
    if (data.dice) {
        gameState.dice = data.dice;
    }
    if (data.phase) {
        gameState.phase = data.phase;
    }
    if (data.players) {
        gameState.players = data.players;
    }

    renderBoard();
    updateUI();
}

function startPolling() {
    setInterval(pollLSL, CONFIG.POLL_INTERVAL);
}

// ========================================
// START GAME
// ========================================

// Wait for DOM and DiceBox to be ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
} else {
    init();
}
