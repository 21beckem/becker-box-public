// if not running in Electron, redirect to home page
if (!window.electron) {
    window.location.href = 'https://beckersuite.com';
}

import { GoogleSignInWithFirebase } from './firebase.js';
import PlayerManager from './player_manager.js';
if (window.location.hostname !== 'localhost')
    GoogleSignInWithFirebase()
        .then((result) => {
            const loginOverlay = document.querySelector('#loginOverlay');
            if (result) {
                loginOverlay.classList?.add('loggedIn');
                PlayerManager.init();
            } else {
                loginOverlay.classList?.add('no-access');
            }
        })
        .catch(() => { });
else {
    PlayerManager.init();
    const loginOverlay = document.querySelector('#loginOverlay');
    loginOverlay.classList?.add('loggedIn');
}


window.PlayerManager = PlayerManager;

window.startWii = (startBtn) => {
    if (PlayerManager.pointerClicks.includes(true)) {
        window.electron.startWii();
        startBtn.style.display = 'none';
    }
}