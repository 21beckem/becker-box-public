/* helper: detect passive listener support so we can call preventDefault */
let supportsPassive = false;
try {
  const opts = Object.defineProperty({}, 'passive', {
    get() { supportsPassive = true; return true; }
  });
  window.addEventListener('testPassive', null, opts);
  window.removeEventListener('testPassive', null, opts);
} catch (e) {}

/* listener options that allow calling e.preventDefault() */
const passiveFalse = supportsPassive ? { passive: false } : false;

/* Prevent double-tap-to-zoom */
let lastTouchEnd = 0;
document.addEventListener('touchend', function (e) {
  const now = Date.now();
  if (now - lastTouchEnd <= 300) {
    // second tap within 300ms -> prevent zoom
    e.preventDefault();
  }
  lastTouchEnd = now;
}, passiveFalse);

/* Prevent pinch-zoom (multi-touch) */
document.addEventListener('touchmove', function (e) {
  if (e.touches && e.touches.length > 1) {
    // more than one finger = pinch/zoom gesture; block it
    e.preventDefault();
  }
}, passiveFalse);

/* On iOS Safari also block the gesturestart events (older iOS) */
document.addEventListener('gesturestart', function (e) {
  e.preventDefault();
});
document.addEventListener('gesturechange', function (e) {
  e.preventDefault();
});