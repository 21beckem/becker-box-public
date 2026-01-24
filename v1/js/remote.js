import { Peer } from 'https://esm.sh/peerjs@1.5.5?bundle-deps';
import GeneralGUI from './GeneralGUI.js';
const JSAlert = window.JSAlert;
const REFRESH = '<button class="wiiUIbtn" onclick="window.refreshConnection();" style="font-size: inherit; border-radius: 17px;">Refresh</button>';
const status = {
	connecting: `Connecting to BeckerBox host<br><br>Please wait...<br><br>If this takes more than 10 seconds, please ${REFRESH}`,
	connected: 'Connected!<br><br>Launching remote...',
	noCodeProvided: `Looks like no game code was provided!<br><br>Please scan the QR code again.`,
	cantconnect: `Sorry, it looks something went wrong while connecting!<br><br>Please ${REFRESH}`,
	disconnected: `Sorry, it looks like you got disconnected!<br><br>Please ${REFRESH}`,
	allSlotsTaken: 'Sorry, it looks like all the player slots have already been taken!',
	welcome: `Thanks for playing with BeckerBox`,
	error: (err) => `Oh no! There's been an error.
		<br>
		<div style="font-size: small;">
			<span onclick="this?.parentElement?.querySelector('p')?.classList?.toggle('hide');">Click here for more details <i class="fa-solid fa-caret-down"></i></span>
			<br>
			<p class="hide">${err}</p>
		</div>
		<br>
		Please ${REFRESH}`
}

const PACKET = {
	Home: 0,
	Plus: 0,
	Minus: 0,
	A: 0,
	B: 0,
	One: 0,
	Two: 0,
	PadN: 0,
	PadS: 0,
	PadE: 0,
	PadW: 0,
	AccelerometerX: 0.0,
	AccelerometerY: 0.0,
	AccelerometerZ: 0.0,
	Gyroscope_Pitch: 0.0,
	Gyroscope_Yaw: 0.0,
	Gyroscope_Roll: 0.0,

	// Nunchuk
	Nun: false,
	C: 0,
	Z: 0,
	NunX: 128,
	NunY: 128
};
const iPhoneAdjustment = navigator.userAgent.toLowerCase().includes('iphone') ? -1 : 1;

class Remote {
	searchParams = new URLSearchParams(window.location.search);
	constructor(code) {
		this.GUI = new RemoteGui(this);
		this.peer = new Peer(null);
		this.GUI.setConnectingStatus(status.connecting);
		this.peer.on('open', () => {
			// attempt to connect
			this.connectWithCode(code);
		});
		this.peer.on('connection', (c) => {
			// Disallow incoming connections
			c.on('open', () => {
				c.send("Connection to another remote is not allowed at this time.");
				setTimeout(()=>{ c.close(); }, 500);
			});
		});
		this.peer.on('disconnected', () => {
			this.GUI.setConnectingStatus(status.disconnected);
		});
		this.peer.on('error', (err) => {
			this.GUI.setConnectingStatus(status.error(err));
		});
	}
	destroy() {
		this.connOpen = false;
		this.peer.destroy();
		this.GUI.setConnectingStatus(status.disconnected);
	}
	async connectWithCode(code = null) {
		this.GUI.setConnectingStatus(status.connecting);
		if (code === false) {
			this.GUI.setConnectingStatus(status.welcome);
			return;
		}
		if (!code && !this.searchParams.get('id')) {
			this.GUI.setConnectingStatus(status.noCodeProvided);
			return;
		}
		code = code || this.searchParams.get('id');

		this.conn = this.peer.connect(code);
		this.conn.on('open', () => {
			this.connOpen = true;
			console.log('Peer opened');
			GeneralGUI.setQRCode('#joinCode .qr-code');
			this.GUI.closeMenu();
			this.GUI.showRemotePage();
			this.#startSendingPackets();

			// set the id to this in the URL without refresh
			history.replaceState(null, null, '?id=' + code);
		});
		this.conn.on('data', (data) => {
			this.connOpen = true;
			console.log('Received', data);
			if (data.slot!==undefined) {
				this.GUI.setSlot(data.slot);
				if (data.slot===null) {
					// disconnect
					window.allSlotsTaken = true;
					this.conn.close();
				}
			} else if (data.poweredOff === true) {
				this.destroy();
				this.GUI.alertPowerOff();
			} else if (data.type === 'hb') {
				// heartbeat response
				this.conn.send({type: 'hbr', id: data.id});
			}
		});
		this.conn.on('disconnected', () => {
			this.connOpen = false;
			console.log('Connection lost. Please reconnect');
			if (window.allSlotsTaken===true)
				this.GUI.setConnectingStatus(status.allSlotsTaken);
			else
				this.GUI.setConnectingStatus(status.disconnected);
		});
		this.conn.on('close', () => {
			this.connOpen = false;
			console.log('Connection closed');
			if (window.allSlotsTaken===true)
				this.GUI.setConnectingStatus(status.allSlotsTaken);
			else
				this.GUI.setConnectingStatus(status.disconnected);
		});
		this.conn.on('error', (err) => {
			this.connOpen = false;
			if (err.message?.toLowerCase()?.includes('connection is not open'))
				return window.refreshConnection();

			this.GUI.setConnectingStatus(status.error(err));
			console.error(err);
		});
	}
	#handleMotion(e) {
		// Accelerometer
		PACKET.AccelerometerX = e.accelerationIncludingGravity.x * iPhoneAdjustment;
		PACKET.AccelerometerY = e.accelerationIncludingGravity.y * iPhoneAdjustment;
		PACKET.AccelerometerZ = e.accelerationIncludingGravity.z * iPhoneAdjustment;

		// Gyroscope
		PACKET.Gyroscope_Yaw = e.rotationRate.gamma;
		PACKET.Gyroscope_Pitch = e.rotationRate.alpha;
		PACKET.Gyroscope_Roll = e.rotationRate.beta;
	}
	#sendPacketNow() {
		if (this.peer && !this.peer.disconnected && this.conn && this.conn.open) {
			this.conn.send(PACKET);
		}
	}
	#startSendingPackets() {
		if (DeviceMotionEvent && typeof DeviceMotionEvent.requestPermission === "function") {
			DeviceMotionEvent.requestPermission();
		}
		window.addEventListener("devicemotion", (e) => this.#handleMotion(e));
		setInterval(() => this.#sendPacketNow(), 10);
	}

	async getDiscs() {
		return this.#getResultFromConnection({ menuAction: 'getDiscs' });
	}
	#getResultFromConnection(toSend, timeout=2000) {
		return new Promise((resolve, reject) => {
			let gotData = false;
			const handleData = (data) => {
				if (data.result===undefined) return;
				gotData = true;
				this.conn.off('data', handleData);
				resolve(data.result);
			}
			this.conn.send(toSend);
			this.conn.on('data', handleData);

			setTimeout(() => {
				if (gotData) return;
				this.conn.off('data', handleData);
				reject(false);
			}, timeout);
		});
	}
	changeDisc(path) {
		this.conn.send({
			menuAction: 'changeDisc',
			path
		});
	}
	powerOff() {
		if (!this.connOpen) return;
		return this.#getResultFromConnection({ menuAction: 'powerOff' }, 10000);
	}
}



const _ = (x) => document.getElementById(x);
class RemoteGui {
	remoteLayouts = ['Classic', 'Driver', 'Split'];
	remoteLayout = 1;
	handDominance = 'right';

	b_states = [0, 0];
	Remote = null;
	constructor(remote) {
		this.Remote = remote;
		_('launchFullscreenBtn').addEventListener('click', GeneralGUI.attemptFullscreen);
		_('menuBarsBtn').addEventListener('click', () => this.#openMenu());
		_('changeDiscBtn').addEventListener('click', () => this.changeDisc());
		_('changeLayoutBtn').addEventListener('click', () => this.#changeLayout());
		_('handDominanceBtn').addEventListener('click', () => this.#toggleHandDominance());
		_('PowerOffBtn').addEventListener('click', () => this.#powerOff());
		this.#setBposition();
		this.#toggleHandDominance('right');
		window.addEventListener('resize', this.#setBposition);

		// add haptic feedback for all buttons and ensure the page is in fullscreen
		document.querySelectorAll('#RemotePage div.btn').forEach(div => {
			if (div.dataset.dispatchesEvents==='true') {
				// if this is an element which will dispatch events
				div.addEventListener('update-packet', event => {
					PACKET[div.dataset.key] = event.detail.value;
				});
			} else {
				// if this is an element which is clickable
				div.addEventListener('touchstart', event => {
					if (event.target.dataset.key === 'B') {
						this.b_states[event.target.id.includes('1') ? 0 : 1] = 1;
						PACKET.B = 1;
					} else {
						PACKET[event.target.dataset.key] = 1;
					}
					// console.log(JSON.stringify(PACKET, null, 2));
					event.target.classList.add('pressed');
					this.#hapticFeedback();
				});
				div.addEventListener('touchend', event => {
					if (event.target.dataset.key === 'B') {
						this.b_states[event.target.id.includes('1') ? 0 : 1] = 0;
						PACKET.B = parseInt(this.b_states[0] || this.b_states[1]);
					} else {
						PACKET[event.target.dataset.key] = 0;
					}
					// console.log(JSON.stringify(PACKET, null, 2));
					event.target.classList.remove('pressed');
					this.#hapticFeedback();
				});
			}
		});
	}
	#hapticFeedback(n = 50) {
		if (navigator.vibrate)
			navigator.vibrate(n);
	}
	#setBposition() {
		let aBtn = Array.from(document.querySelectorAll('[data-key="A"]')).filter(x => x.checkVisibility())[0];
		if (!aBtn) return;
		let dist = aBtn.getBoundingClientRect().top - 127.5;
		document.documentElement.style.setProperty('--bBtn-top', `${dist}px`);
	}
	setSlot(s) {
		Array.from(_('lights').children).forEach(div => div.classList.remove('on'));
		_('lights').children[s]?.classList.add('on');

		if (s===null) {
			return JSAlert.alert('Looks like all the player slots have already been taken!', 'Oh no...', JSAlert.Icons.Failed);
		}

		if (s===0)
			Array.from(document.querySelectorAll('.player-one-only')).forEach(el => {
				el.classList.add('enabled');
			});
		else
			Array.from(document.querySelectorAll('.player-one-only')).forEach(el => {
				el.classList.remove('enabled');
			});
	}
	alertPowerOff() {
		JSAlert.alert('System powered off by Player 1. Come back soon! :)', 'Powered Off', JSAlert.Icons.Info);
		this.setConnectingStatus(status.welcome);
	}
	showRemotePage() {
		_('connectPage').style.display = 'none';
		_('RemotePage').style.display = '';
		Array.from(document.querySelectorAll('#RemotePage remote')).forEach(remote => {
			remote.style.display = (remote.classList.contains('layout-'+this.remoteLayout)) ? '' : 'none';
		});
		this.#setBposition();
		this.#updateSideMenuText();
	}
	#updateSideMenuText() {
		// update change layout button
		_('changeLayoutBtn').innerHTML = `<i class="fa-solid fa-arrow-right-arrow-left"></i> Layout<sub>current: ${this.remoteLayouts[this.remoteLayout-1]}</sub>`;

		// update hand dominance button
		_('handDominanceBtn').innerHTML = `<i class="fa-solid fa-arrow-right-arrow-left"></i> Hand Dominance<sub>current: ${this.handDominance}</sub>`;
	}
	setConnectingStatus(status) {
		// show status page
		_('connectingText').innerHTML = status;
		_('connectPage').style.display = '';
		_('RemotePage').style.display = 'none';
	}
	async changeDisc() {
		this.closeMenu();
		let discs;
		let loader = JSAlert.loader('loading disc list...');
		try {
			discs = await this.Remote.getDiscs();
		} catch (e) { discs = false }
		loader.dismiss();
		if (discs===false) {
			JSAlert.alert('Please switch to the system menu (Wii Menu) before changing discs.', 'Failed to get disc list', JSAlert.Icons.Failed);
			return;
		}

		let discPath = await window.selectSwiper.prompt(
			Object.fromEntries(
				discs.map(d => [d.name, d.path])
			)
		);

		console.log(discPath);
		if (discPath) {
			this.Remote.changeDisc(discPath);
		}
	}
	async #powerOff() {
		let confirmed = await JSAlert.confirm('Are you sure you want to power off the BeckerBox?', 'Power Off', JSAlert.Icons.Warning)
		if (!confirmed) return;
		let loader = JSAlert.loader("Powering off...");
		try {
			await this.Remote.powerOff();
			loader.dismiss();
			this.Remote.destroy();
			this.alertPowerOff();
		} catch (e) { 
			JSAlert.alert('Please switch to the system menu (Wii Menu) before you try to power off', 'Failed to power off', JSAlert.Icons.Failed);
			loader.dismiss();
		}
	}
	#changeLayout() {
		this.remoteLayout++;
		if (this.remoteLayout > this.remoteLayouts.length) this.remoteLayout = 1;
		this.showRemotePage();
	}
	#toggleHandDominance(setTo=null) {
		if (setTo)
			this.handDominance = setTo;
		else
			this.handDominance = this.handDominance==='right' ? 'left' : 'right';

		document.documentElement.style.setProperty('--bBtn-show-left',  (this.handDominance==='right' ? 'auto' : 'none'));
		document.documentElement.style.setProperty('--bBtn-show-right', (this.handDominance==='right' ? 'none' : 'auto'));
		this.#updateSideMenuText();
	}
	
	#openMenu() { _('side-menu').classList.remove('closed'); }
	closeMenu() { _('side-menu').classList.add('closed'); }
}









export { PACKET, Remote };
