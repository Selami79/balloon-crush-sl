// SECOND LIFE BRIDGE FOR BALLOON CRUSH v2
// Handles player name, level sync, and score submission

function getUrlParameter(name) {
    name = name.replace(/[\[]/, '\\[').replace(/[\]]/, '\\]');
    var regex = new RegExp('[\\?&]' + name + '=([^&#]*)');
    var results = regex.exec(location.search);
    return results === null ? '' : decodeURIComponent(results[1].replace(/\+/g, ' '));
}

let playerName = "GUEST";
let slUrl = "";
let startLevel = 1;

document.addEventListener('DOMContentLoaded', function () {
    const p = getUrlParameter('player');
    const u = getUrlParameter('sl_url');
    const l = getUrlParameter('level');

    if (p && p !== "") {
        playerName = p;
        document.getElementById('sl-status').innerText = "PLAYER: " + playerName;
    }

    if (u && u !== "") {
        slUrl = u;
    }

    if (l && l !== "" && parseInt(l) > 0) {
        startLevel = parseInt(l);
        // Set the level in the game
        if (typeof currentLevel !== 'undefined') {
            currentLevel = startLevel;
        }
        // Also save to localStorage as backup
        localStorage.setItem('balloonCrush_level', startLevel.toString());
    }

    console.log("SL Bridge Init: " + playerName + " at Level " + startLevel);
});

// Called when player wins a level
window.submitLevelToSL = function (level) {
    if (!slUrl || playerName === "GUEST") return;

    fetch(slUrl, {
        method: 'POST',
        mode: 'no-cors',
        headers: { 'Content-Type': 'text/plain' },
        body: JSON.stringify({ name: playerName, level: level, score: 0 })
    }).catch(err => console.error(err));
};

// Called when game ends with score
window.submitScoreToSL = function (score, level) {
    if (!slUrl) {
        console.warn("No SL URL found, cannot submit score.");
        return;
    }

    if (playerName === "GUEST") return;

    fetch(slUrl, {
        method: 'POST',
        mode: 'no-cors',
        headers: { 'Content-Type': 'text/plain' },
        body: JSON.stringify({ name: playerName, score: score, level: level || 1 })
    })
        .then(() => {
            console.log("Score sent to SL: " + score);
        })
        .catch(err => {
            console.error(err);
        });
};

// Export startLevel for game.js to use
window.getStartLevel = function () {
    return startLevel;
};
