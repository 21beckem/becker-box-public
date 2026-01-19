let noSleep = new window.NoSleep();
const _ = (x) => document.getElementById(x);
export default class GeneralGUI {
	static showScanPopup(showHide=true) {
		_('scanPopup').style.display = showHide ? '' : 'none';
		if (showHide)
			qrScanner.start();
		else
			qrScanner.stop();
	}
    static async attemptFullscreen() {
		// Request motion events permission for iOS 13+ devices
		if (DeviceMotionEvent && typeof DeviceMotionEvent.requestPermission === 'function') {
			DeviceMotionEvent.requestPermission();
		}
		// prevent screen from sleeping
		noSleep.enable();

		// attempt to go fullscreen
		let elem = document.documentElement;
		if (typeof elem.requestFullscreen === 'function') {
			await elem.requestFullscreen();
		}
		else if (typeof elem.mozRequestFullScreen === 'function') {
			await elem.mozRequestFullScreen();
		}
		else if (typeof elem.webkitRequestFullscreen === 'function') {
			await elem.webkitRequestFullscreen();
		}
		else if (typeof elem.webkitEnterFullscreen === 'function') {
			await elem.webkitEnterFullscreen();
		}
		else if (typeof elem.msRequestFullscreen === 'function') {
			await elem.msRequestFullscreen();
		}
		else if (typeof elem.oRequestFullscreen === 'function') {
			await elem.oRequestFullscreen();
		}
		else {
			// JSAlert.alert('Looks like your device doesn\'t support fullscreen!', 'Oh no...', JSAlert.Icons.Failed);
			// JSAlert.alert('The remote is now launching, but please note that some features <b>may not work!</b>', 'We\'ll try without fullscreen', JSAlert.Icons.Warning);
			_('openFullScreenPrompt').style.display = 'none';
		}

		try {
			// lock screen orientation
			screen.orientation.lock('portrait');
		} catch (e) {
			console.error(e);
		}

		// ensure the page doesn't destort when going to fullscreen
		window.scrollTo(0, 0);
		document.body.scrollTop = 0;
		_('RemotePage').style.overflowY = 'unset';
		setTimeout(() => _('RemotePage').style.overflowY = 'hidden', 10);
	}
	static setQRCode(selector) {
		document.querySelector(selector).innerHTML = '';
		new QRCode(document.querySelector(selector), {
            text: window.location.href,
            width: 150,
            height: 150,
            colorDark : "#000000",
            colorLight : "#ffffff",
            correctLevel : QRCode.CorrectLevel.H
        });
	}
}
window.GeneralGUI = GeneralGUI;