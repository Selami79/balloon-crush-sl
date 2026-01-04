// SECOND LIFE BRIDGE FOR BALLOON CRUSH

function getUrlParameter(name) {
    name = name.replace(/[\[]/, '\\[').replace(/[\]]/, '\\]');
    var regex = new RegExp('[\\?&]' + name + '=([^&#]*)');
    var results = regex.exec(location.search);
    return results === null ? '' : decodeURIComponent(results[1].replace(/\+/g, ' '));
}

let playerName = "GUEST";
let slUrl = "";

document.addEventListener('DOMContentLoaded', function () {
    const p = getUrlParameter('player');
    const u = getUrlParameter('sl_url');

    if (p && p !== "") {
        playerName = p;
        document.getElementById('sl-status').innerText = "PLAYER: " + playerName;
    }

    if (u && u !== "") {
        slUrl = u;
    }

    console.log("SL Bridge Init: " + playerName);
});

window.submitScoreToSL = function (score) {
    if (!slUrl) {
        console.warn("No SL URL found, cannot submit score.");
        if (playerName !== "GUEST") {
            document.getElementById('high-score-msg').innerText = "Connection Failed!";
        }
        return;
    }

    if (playerName === "GUEST") return;

    document.getElementById('high-score-msg').innerText = "Sending Score...";

    fetch(slUrl, {
        method: 'POST',
        mode: 'no-cors',
        headers: { 'Content-Type': 'text/plain' },
        body: JSON.stringify({ name: playerName, score: score })
    })
        .then(() => {
            document.getElementById('high-score-msg').innerText = "Score Sent to Second Life!";
        })
        .catch(err => {
            console.error(err);
            document.getElementById('high-score-msg').innerText = "Error Sending Score";
        });
};
