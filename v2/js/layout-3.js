(() => {
    let joy;
    let NunX = document.querySelector('remote.layout-3 [data-key="NunX"]');
    let NunY = document.querySelector('remote.layout-3 [data-key="NunY"]');
    let NunElement = document.querySelector('.btn[data-key="Nun"]');

    function hapticFeedback(n=50) {
        if (navigator.vibrate)
			navigator.vibrate(n);
        console.log('h');
    }
    function removeJoystick(ops={}) {
        if (joy) {
            joy.destroy();
            joy = null;

            if (!ops.planningToReEnable) {
                NunElement.dispatchEvent( new CustomEvent('update-packet', {detail:{
                    value: false
                }}));
            }
        }
    }
    function clamp(num, min, max) {
        return Math.min(Math.max(num, min), max);
    }
    function makeJoystick() {
        removeJoystick({
            planningToReEnable: true
        });

        // insert nunchuck
        NunElement.dispatchEvent( new CustomEvent('update-packet', {detail:{
            value: true
        }}));
        
        joy = nipplejs.create({
            zone: document.querySelector('remote.layout-3 .joystick'),
            mode: 'static',
            position: {left: '50%', top: '50%'},
            color: 'gray'
        });

        joy.on('start', () => {
            hapticFeedback();
        })
        joy.on('move', (evt, data) => {
            let x = data.distance * Math.sin(data.angle.radian) * -2;
            let y = data.distance * Math.cos(data.angle.radian) * 2;
            // x and y should be between -100 and 100
            
            if (data.distance >= 50) hapticFeedback(25);
            
            NunX.dispatchEvent( new CustomEvent('update-packet', {detail:{
                value: clamp(x + 128, 0, 255)
            }}));
            NunY.dispatchEvent( new CustomEvent('update-packet', {detail:{
                value: clamp(y + 128, 0, 255)
            }}));
        });
        joy.on('end', (evt, data) => {
            // reset nunchuck stick back to center
            NunX.dispatchEvent( new CustomEvent('update-packet', {detail:{
                value: 128
            }}));
            NunY.dispatchEvent( new CustomEvent('update-packet', {detail:{
                value: 128
            }}));
        });
    }
    const remote = document.querySelector('remote.layout-3');
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