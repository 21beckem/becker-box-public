import { Remote } from './remote.js';

let remote;
window.refreshConnection = (code=null, force=true) => {
    if (force) return window.location.reload();
    remote?.destroy();
    remote = new Remote(code);
};
window.refreshConnection(null, false);
window.disconnectRemote = () => {
    remote?.destroy();
    remote = null;
};