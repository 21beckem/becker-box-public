import Player from './player.js';
import { Peer } from 'https://esm.sh/peerjs@1.5.5?bundle-deps';

// manage players
const PlayerManager = new (class PlayerManager {
    constructor() {
        this.players = [null, null, null, null];

        this.pointerClicks = [false, false, false, false];
    }
    #setQrCode(id, selector='#qrcode') {
        new QRCode(document.querySelector(selector), {
            text: 'https://21beckem.github.io/becker-box-mrk-2/web/remote/?id=' + id,
            width: 200,
            height: 200,
            colorDark : "#000000",
            colorLight : "#ffffff",
            correctLevel : QRCode.CorrectLevel.H
        });
        console.log('Set QR code with ID:', id);
    }
    init() {
        // tell the backend that we are ready
        window.electron.init();

        if (window.location.hostname === 'localhost')
            this.peer = new Peer('beckerbox');
        else
            this.peer = new Peer();
        this.peer.on('open', (id) => {
            this.#setQrCode(id);
        });
        this.peer.on('disconnect', () => { console.warn('disconnected'); this.peer.reconnect(); });
        this.peer.on('connection', (conn) => this.#addNewPhone(conn) );
    }
    async #addNewPhone(conn) {
        let slot = null;
        // check if this peer id is already in use
        let existing = this.players.find(p => p && p.conn.peer == conn.peer);
        if (existing) {
            this.removePlayer(existing.slot);
            slot = existing.slot;
        } else {
            slot = await window.electron.addPlayer();
        }

        if (slot === null) {
            console.log('All slots taken');
            setTimeout(() => conn.send({slot: slot}), 500);
            return;
        }

        console.log(`Connecting peer ${conn.peer} to slot ${slot}`);
        // console.log(conn);
        this.players[slot] = new Player(slot, conn, this);
        conn.on('close', () => this.removePlayer(slot));
        // console.log(this.players);
    }
    removePlayer(slot) {
        this.players[slot]?.remove();
        this.players[slot] = null;
    }
    alertPowerOff() {
        this.players.forEach(p => p?.alertPowerOff());
    }
})();

export default PlayerManager;