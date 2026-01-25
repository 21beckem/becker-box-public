// if not running in Electron, redirect to home page
if (!window.electron && !window.location.host.startsWith('localhost')) {
    window.location.href = 'https://beckersuite.com';
}

import { GoogleSignInWithFirebase } from './firebase.js';
import PlayerManager from './player_manager.js';
import scaleScreenToFit from './scale-screen.js';
scaleScreenToFit();

if (!window.location.host.startsWith('localhost')) {
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
} else {
    PlayerManager.init();
    const loginOverlay = document.querySelector('#loginOverlay');
    loginOverlay.classList?.add('loggedIn');
}


window.PlayerManager = PlayerManager;

window.startWii = (startBtn) => {
    window.electron.startWii();
    startBtn.disabled = true;
}


// Mock electron object for non-electron development
if (window.electron === undefined) {
    window.electron = {
        init: () => {
            // console.log(`Electron not present. electon.init called.`);
        },
        openGamesFolder: () => {
            // console.log(`Electron not present. electon.openGamesFolder called.`);
        },
        addPlayer: () => {
            // console.log(`Electron not present. electon.addPlayer called.`);
            return PlayerManager.players.indexOf(null);
        },
        removePlayer: (slot) => {
            // console.log(`Electron not present. electon.removePlayer called.`);
        },
        sendPacket: (slot, data) => {
            // console.log(`Electron not present. electon.sendPacket called.`);
        },
        startWii: () => {
            // console.log(`Electron not present. electon.startWii called.`);
        },
        getDiscList: () => {
            // console.log(`Electron not present. electon.getDiscList called.`);
            return Promise.resolve([
                {
                    name: 'LEGO Indiana Jones - The Original Adventures',
                    path: '/path/to/lego_indiana_jones.iso'
                },
                {
                    name: 'Wii Sports',
                    path: '/path/to/wii_sports.iso'
                },
                {
                    name: 'Wii Sports Resort',
                    path: '/path/to/wii_sports_resort.iso'
                }
            ]);
        },
        changeDisc: (path) => {
            // console.log(`Electron not present. electon.changeDisc called.`);
        },
        powerOff: () => {
            // console.log(`Electron not present. electon.powerOff called.`);
            return Promise.resolve();
        }
    }
}