(() => {
	let joy;
	function removeJoystick() {
		if (joy) {
			joy.destroy();
			joy = null;
		}
	}
	const dPad = {
		upBtn: document.querySelector('remote.layout-2 .dpad [data-key="PadN"]'),
		leftBtn: document.querySelector('remote.layout-2 .dpad [data-key="PadW"]'),
		rightBtn: document.querySelector('remote.layout-2 .dpad [data-key="PadE"]'),
		downBtn: document.querySelector('remote.layout-2 .dpad [data-key="PadS"]'),
		applyPattern: function(pattern) {
			this.up(pattern[0]);
			this.left(pattern[1]);
			this.right(pattern[2]);
			this.down(pattern[3]);
		},
		up: function(press) {
			if (press && !this.upBtn.classList.contains('pressed'))
				this.upBtn.dispatchEvent(new Event('touchstart'));
			else if (!press && this.upBtn.classList.contains('pressed'))
				this.upBtn.dispatchEvent(new Event('touchend'));
		},
		left: function(press) {
			if (press && !this.leftBtn.classList.contains('pressed'))
				this.leftBtn.dispatchEvent(new Event('touchstart'));
			else if (!press && this.leftBtn.classList.contains('pressed'))
				this.leftBtn.dispatchEvent(new Event('touchend'));
		},
		right: function(press) {
			if (press && !this.rightBtn.classList.contains('pressed'))
				this.rightBtn.dispatchEvent(new Event('touchstart'));
			else if (!press && this.rightBtn.classList.contains('pressed'))
				this.rightBtn.dispatchEvent(new Event('touchend'));
		},
		down: function(press) {
			if (press && !this.downBtn.classList.contains('pressed'))
				this.downBtn.dispatchEvent(new Event('touchstart'));
			else if (!press && this.downBtn.classList.contains('pressed'))
				this.downBtn.dispatchEvent(new Event('touchend'));
		}
	};
	const angleOptions = {
		right: [0,0,1,0],
		rightUp: [1,0,1,0],
		up: [1,0,0,0],
		upLeft: [1,1,0,0],
		left: [0,1,0,0],
		leftDown: [0,1,0,1],
		down: [0,0,0,1],
		downRight: [0,0,1,1],
	};
	function makeJoystick() {
		removeJoystick();
		joy = nipplejs.create({
			zone: document.querySelector('remote.layout-2 .dpad'),
			mode: 'static',
			position: {left: '50%', top: '50%'},
			color: 'gray'
		});

		joy.on('move', (evt, data) => {
			let pat = [0,0,0,0];
			if (data.distance > 30 && data.angle && data.angle.degree) {
				const d = data.angle.degree+22.5;
				const angle = Math.floor(d / 45) % 8;
				const optionKey = Object.keys(angleOptions)[angle];
				if (optionKey)
					pat = angleOptions[optionKey];
			}
			dPad.applyPattern(pat);
		});
		joy.on('end', (evt, data) => {
			dPad.applyPattern([0,0,0,0]);
		});
	}
	const remote = document.querySelector('remote.layout-2');
	function restartJoystick() {
		if (remote.checkVisibility()) {
			makeJoystick();
		} else {
			removeJoystick();
		}
	}
	window.addEventListener('resize', restartJoystick);
	let lastVisible = true;
	setInterval(() => {
		if (lastVisible !== remote.checkVisibility()) {
			lastVisible = remote.checkVisibility();
			restartJoystick();
		}
	}, 10);
})();