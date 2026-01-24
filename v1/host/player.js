import Pointer from "./pointer.js";
import Heartbeat from "./heartbeat.js";
const DISCONNECT_TIMEOUT_MS = 5000;

export default class Player {
    #disconnectTimeout = null;
    #alertedAboutPowerOff = false;
    #remoteContainer = null;
    #health = 'healthy';
    constructor(slot, conn, parent) {
        this.removed = false;
        this.slot = slot;
        this.conn = conn;
        this.parent = parent;
        this.pointer = new Pointer(this.slot, parent);
        this.#initConn();

        this.#remoteContainer = document.querySelector('remote-container.p'+(slot+1));
        this.#UI.healthy();
    }
    #UI = {
        healthy: () => {
            this.#health = 'healthy';
            this.#remoteContainer.classList.add('connected');
            this.#remoteContainer.classList.remove('signal-lost');
            this.#remoteContainer.querySelector('.disconnect').innerText = 'Disconnect';
            this.#remoteContainer.querySelector('.disconnect').onclick = () => this.parent.removePlayer(this.slot);
        },
        sick: () => {
            this.#health = 'sick';
            this.#remoteContainer.classList.remove('connected');
            this.#remoteContainer.classList.add('signal-lost');
            this.#remoteContainer.querySelector('.disconnect').innerText = 'Disconnect';
            this.#remoteContainer.querySelector('.disconnect').onclick = () => this.parent.removePlayer(this.slot);
        },
        dead: () => {
            this.#health = 'dead';
            this.#remoteContainer.classList.remove('connected');
            this.#remoteContainer.classList.remove('signal-lost');
            this.#remoteContainer.querySelector('.disconnect').innerText = 'scan now...';
            this.#remoteContainer.querySelector('.disconnect').onclick = null;
        }
    }
    get health() {
        return this.#health;
    }
    #setupHeartbeat() {
        this.heartbeat = new Heartbeat(this.conn);
        this.heartbeat.start();

        this.heartbeat.on('healthy', () => this.#UI.healthy() );
        this.heartbeat.on('sick', () => this.#UI.sick() );
        this.heartbeat.on('dead', () => this.parent.removePlayer(this.slot) );
    }
    #initConn() {
        if (this.conn.open) {
            this.conn.send({slot: this.slot});
            this.#setupHeartbeat();
        } else {
            this.conn.on('open', () => {
                this.conn.send({slot: this.slot});
                this.#setupHeartbeat();
            });
        }
        this.conn.on('data', (data) => {
            if (data.menuAction) {
                switch (data.menuAction) {
                    case 'getDiscs':
                        window.electron?.getDiscList()
                            .then(result => this.conn.send({result}));
                        break;
                    case 'changeDisc':
                        window.electron?.changeDisc(data.path);
                        break;
                    case 'powerOff':
                        window.electron?.powerOff()
                            .then(result => {
                                this.conn.send({result});
                                if (result) this.#alertedAboutPowerOff = true;
                                this.parent.alertPowerOff();
                            });
                        break;
                }
                return;
            }
            if (data.type === 'hbr') return; // heartbeat response

            this.pointer.newPacket(data);
            data.PointX = this.pointer.AnalogX;
            data.PointY = this.pointer.AnalogY;
            window.electron?.sendPacket(this.slot, data);
        });
    }
    remove() {
        this.#disconnect();
        this.#UI.dead();
    }
    alertPowerOff() {
        if (this.#alertedAboutPowerOff) return;
        this.#alertedAboutPowerOff = true;
        this.conn.send({poweredOff: true});
    }


    
    #disconnect() {
        if (this.removed) return;
        this.removed = true;
        this.heartbeat?.destroy();
        this.heartbeat = null;

        console.warn(`Disconnecting slot ${this.slot}`);
        this.conn.close();
        this.pointer.remove();
        this.parent.removePlayer(this.slot);
    }
}