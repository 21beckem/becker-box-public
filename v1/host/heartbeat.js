export default class Heartbeat {
	#destroyed = false;
    #failCount = 0;
    #eventListeners = {
        healthy: [],
        sick: [],
        dead: []
    };
    constructor(conn) {
		this.conn = conn;
		this.interval = 500;
		this.failsBeforeDisconnect = 5;
		this.requestTimeout = 1000;
	}
	on(event, callback) {
        if (this.#eventListeners[event]) {
            this.#eventListeners[event].push(callback);
        }
    }
    off(event, callback) {
        if (this.#eventListeners[event]) {
            this.#eventListeners[event] = this.#eventListeners[event].filter(cb => cb !== callback);
        }
    }
    #emit(event, ...args) {
        if (this.#eventListeners[event]) {
            this.#eventListeners[event].forEach(callback => callback(...args));
        }
    }
	destroy() {
		this.#destroyed = true;
	}
	start() {
		this.#heartbeat();
	}
	async #heartbeat() {
		if (this.#destroyed) return;
		let result = await new Promise((resolve) => {
			let gotData = false;
            const randomId = Math.random().toString(36).substring(7);
			const handleData = (data) => {
                if (data !== null && data !== undefined && data.type === 'hbr' && data.id === randomId) {
                    gotData = true;
                    this.conn.off('data', handleData);
                    resolve(true);
                }
			}
			this.conn.send({type: 'hb', id: randomId});
			this.conn.on('data', handleData);

			setTimeout(() => {
				if (gotData) return;
				this.conn.off('data', handleData);
				resolve(false);
			}, this.requestTimeout);
		});
        console.log('Heartbeat result:', result);
        if (result) {
            this.#emit('healthy');
            this.#failCount = 0;
        } else {
            this.#failCount++;
            if (this.#failCount < this.failsBeforeDisconnect) {
                this.#emit('sick');
            } else {
                this.#emit('dead');
            }
        }

        setTimeout(() => this.#heartbeat(), this.interval);
	}
}