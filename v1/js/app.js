import { Remote } from './remote.js';

let remote;
window.refreshConnection = (code=null, force=true) => {
    if (force) return window.location.reload();
    remote?.destroy();
    remote = new Remote(code);
};
window.refreshConnection(null, false);

// window.qrScanner = new QrScanner(
//     document.querySelector('#qrScannerPreview'),
//     result => {
//         console.log('got QR result:', result);
//         if (!result.data) return;

//         // verify it's a valid url
//         let url;
//         try {
//             url = new URL(result.data.trim());
//         } catch (e) { return }
        
//         // verify search param exists
//         let id = url.searchParams.get('id');
//         if (id===null || id===undefined) return;

//         // connect
//         console.log('connecting to', id);
//         remote.connectWithCode(id);
//     },
//     {}
// );