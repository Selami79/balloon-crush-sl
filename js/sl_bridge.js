// SECOND LIFE BRIDGE FOR BALLOON CRUSH v3
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

// Run immediately since DOM is already loaded when this script runs
(function () {
    const p = getUrlParameter('player');
    const u = getUrlParameter('sl_url');
    const l = getUrlParameter('level');

    console.log("SL Bridge: player=" + p + ", url=" + (u ? "yes" : "no") + ", level=" + l);

    if (p && p !== "") {
        playerName = p;
        const statusEl = document.getElementById('sl-status');
        if (statusEl) {
            statusEl.innerText = "🎮 " + playerName;
            statusEl.style.color = "#FFD700";
            statusEl.style.fontWeight = "bold";
        } else {
            console.warn("sl-status element not found!");
        }
    }

    if (u && u !== "") {
        slUrl = u;
    }

    if (l && l !== "" && parseInt(l) > 0) {
        startLevel = parseInt(l);
        if (typeof level !== 'undefined') {
            level = startLevel;
        }
        localStorage.setItem('balloonCrush_level', startLevel.toString());
    }

    console.log("SL Bridge Init Complete: " + playerName + " at Level " + startLevel);
})();

// Called when player wins a level
window.submitLevelToSL = function (lvl) {
    if (!slUrl || playerName === "GUEST") return;

    fetch(slUrl, {
        method: 'POST',
        mode: 'no-cors',
        headers: { 'Content-Type': 'text/plain' },
        body: JSON.stringify({ name: playerName, level: lvl, score: 0 })
    }).catch(err => console.error(err));
};

// Called when game ends with score
window.submitScoreToSL = function (sc, lvl) {
    if (!slUrl) {
        console.warn("No SL URL found, cannot submit score.");
        return;
    }

    if (playerName === "GUEST") return;

    fetch(slUrl, {
        method: 'POST',
        mode: 'no-cors',
        headers: { 'Content-Type': 'text/plain' },
        body: JSON.stringify({ name: playerName, score: sc, level: lvl || 1 })
    })
        .then(() => {
            console.log("Score sent to SL: " + sc);
        })
        .catch(err => {
            console.error(err);
        });
};

// Export startLevel for game.js to use
window.getStartLevel = function () {
    return startLevel;
};

// Export player name
window.getPlayerName = function () {
    return playerName;
};
