import Pointer from "./pointer.js";
const DISCONNECT_TIMEOUT_MS = 5000;

export default class Player {
    #disconnectTimeout = null;
    #alertedAboutPowerOff = false;
    constructor(slot, conn, parent) {
        this.removed = false;
        this.slot = slot;
        this.conn = conn;
        this.parent = parent;
        this.pointer = new Pointer(this.slot, parent);
        this.#initConn();

        this.remoteContainer = document.querySelector('remote-container.p'+(slot+1));
        this.remoteContainer.classList.add('connected');
        this.remoteContainer.querySelector('.disconnect').innerText = 'Disconnect';
        this.remoteContainer.querySelector('.disconnect').onclick = () => this.parent.removePlayer(this.slot);
    }
    #initConn() {
        this.conn.on('open', () => {
            this.conn.send({slot: this.slot});
        })
        this.conn.on('data', (data) => {
            if (data.menuAction) {
                switch (data.menuAction) {
                    case 'getDiscs':
                        window.electron.getDiscList()
                            .then(result => this.conn.send({result}));
                        break;
                    case 'changeDisc':
                        window.electron.changeDisc(data.path);
                        break;
                    case 'powerOff':
                        window.electron.powerOff()
                            .then(result => {
                                this.conn.send({result});
                                if (result) this.#alertedAboutPowerOff = true;
                                this.parent.alertPowerOff();
                            });
                        break;
                }
                return;
            }

            this.pointer.newPacket(data);
            data.PointX = this.pointer.AnalogX;
            data.PointY = this.pointer.AnalogY;
            window.electron.sendPacket(this.slot, data);
        });
    }
    remove() {
        this.#disconnect();
        this.remoteContainer.classList.remove('connected');
        this.remoteContainer.querySelector('.disconnect').innerText = 'scan now...';
    }
    alertPowerOff() {
        if (this.#alertedAboutPowerOff) return;
        this.#alertedAboutPowerOff = true;
        this.conn.send({poweredOff: true});
    }


    
    #disconnect() {
        if (this.removed) return;
        this.removed = true;

        console.warn(`Disconnecting slot ${this.slot} due to inactivity`);
        this.conn.close();
        this.pointer.remove();
        window.electron.removePlayer(this.slot);
        this.parent.removePlayer(this.slot);
    }
}