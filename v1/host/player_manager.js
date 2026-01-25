import Player from './player.js';
import { Peer } from 'https://esm.sh/peerjs@1.5.5?bundle-deps';

const PEER_CONFIG = {
    host: "peerjs-server-220439816037.southamerica-west1.run.app",
    port: 443,
    path: "/",
    secure: true,
    key: "207427b37dd0c0c08ea29ba38ab14429",
    config: { iceServers: [{ urls: "stun:stun.l.google.com:19302" }] }
};

// manage players
const PlayerManager = new (class PlayerManager {
    #backendActivatedPlayers = [false, false, false, false];
    constructor() {
        this.players = [null, null, null, null];

        this.pointerClicks = [false, false, false, false];
    }
    #setQrCode(id, selector='#qrcode') {
        
        new QRCode(document.querySelector(selector), {
            text: new URL('../?id='+id, location.href).href,
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
        window.electron?.init();

        if (window.location.hostname === 'localhost')
            this.peer = new Peer('beckerbox', PEER_CONFIG);
        else
            this.peer = new Peer(undefined, PEER_CONFIG);
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
            // ask peer if it has a preferred slot
            let preferredSlot = await this.#getResultFromConnection(conn, { getPreferredSlot: true }).catch(() => null);
            console.log('Preferred slot from peer', conn.peer, ':', preferredSlot);

            // check if preferred slot is available and activated by backend
            if (
                (this.players[preferredSlot] === null || this.players[preferredSlot] === undefined || this.players[preferredSlot].health === 'sick' || this.players[preferredSlot].health === 'dead') &&
                (this.#backendActivatedPlayers[preferredSlot] === true)
            ) {
                this.removePlayer(preferredSlot);
                slot = preferredSlot;
            }
        }
        
        
        // if no slot assigned yet, ask backend for available slot
        if (slot === null || slot === undefined) {
            slot = await window.electron?.addPlayer();

            // mark slot as activated by backend
            if (slot !== null && slot !== undefined)
                this.#backendActivatedPlayers[slot] = true;
        }

        // if still null or undefined, no slots are available
        if (slot === null || slot === undefined) {
            slot = null;
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
        window.electron?.removePlayer(slot);

        // mark slot as deactivated by backend
        this.#backendActivatedPlayers[slot] = false;
    }
    alertPowerOff() {
        this.players.forEach(p => p?.alertPowerOff());
    }

    
	async #getResultFromConnection(conn, toSend, timeout=2000) {
        // wait until connection is open
        await new Promise(resolve => {
            if (conn.open) resolve();
            else conn.on('open', resolve);
        });

        // send request and wait for result
		return new Promise((resolve, reject) => {
			let gotData = false;
			const handleData = (data) => {
				if (data.result===undefined) return;
				gotData = true;
				conn.off('data', handleData);
				resolve(data.result);
			}
			conn.send(toSend);
			conn.on('data', handleData);

			setTimeout(() => {
				if (gotData) return;
				conn.off('data', handleData);
				reject(false);
			}, timeout);
		});
	}
})();

export default PlayerManager;