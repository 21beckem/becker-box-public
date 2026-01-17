import * as app from "https://www.gstatic.com/firebasejs/11.10.0/firebase-app.js";
import * as auth from "https://www.gstatic.com/firebasejs/11.10.0/firebase-auth.js";
import * as store from "https://www.gstatic.com/firebasejs/11.10.0/firebase-firestore.js";
import * as storage from "https://www.gstatic.com/firebasejs/11.10.0/firebase-storage.js";
const FIREBASE = {
    app: app,
    auth: auth,
    store: store,
    storage: storage
};

function initFirebase() {
    const firebaseConfig = {
        apiKey: "AIzaSyBW6ixeZX-nXS1wKMA5Oi7VpL2N8vH_xkk",
        authDomain: "beckersuite-128f6.firebaseapp.com",
        projectId: "beckersuite-128f6",
        storageBucket: "beckersuite-128f6.firebasestorage.app",
        messagingSenderId: "760091149092",
        appId: "1:760091149092:web:26e8e70e30f4d4fc9fa9b1",
        storageBucket: 'gs://beckersuite-128f6.firebasestorage.app',
        measurementId: "G-Z7BZZMDL34"
    };
    FIREBASE.app.initializeApp(firebaseConfig);
    FIREBASE.db = FIREBASE.store.getFirestore();
    FIREBASE.getAuth = FIREBASE.auth.getAuth();
    FIREBASE.getStorage = FIREBASE.storage.getStorage();

    FIREBASE.auth.onAuthStateChanged(FIREBASE.getAuth, (user) => {
        if (!user && sessionStorage.getItem('USER')) {
            // if user is signed out on firebase but signed in locally, sign them out
            sessionStorage.removeItem('USER');
            window.location.reload();
        }
        // dispatch event that firebase is loaded
        window.dispatchEvent(new CustomEvent('firebase-loaded'));
    });

    // create DB helper
    FIREBASE.DB = function(collectionName) {
        class DB_Document {
            constructor(collectionName, docName) {
                this.collectionName = collectionName;
                this.docName = docName;
                this.ref = FIREBASE.store.doc(FIREBASE.db, this.collectionName, this.docName);
            }
            async get() {
                let res = await FIREBASE.store.getDoc(this.ref);
                return res.data();
            }
            async set(data) {
                await FIREBASE.store.setDoc(this.ref, data);
            }
            async update(data) {
                await FIREBASE.store.updateDoc(this.ref, data);
            }
        }
        return {
            Document: function(docName) {
                return new DB_Document(collectionName, docName);
            }
        }
    }
}
initFirebase();


async function getImageDataURL(imageUrl) {
    try {
        const response = await fetch(imageUrl);
        const blob = await response.blob(); // Get the image data as a Blob

        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onloadend = () => {
                console.log('img result:', reader.result);
                resolve(reader.result); // The result is the Data URL
            };
            reader.onerror = reject; // Handle any errors during reading
            reader.readAsDataURL(blob); // Read the Blob as a Data URL
        });
    } catch (error) {
        console.error("Error fetching or converting image:", error);
        return null;
    }
}

export async function GoogleSignInWithFirebase() {
    // set session persistence
    await FIREBASE.auth.setPersistence(FIREBASE.getAuth, FIREBASE.auth.browserSessionPersistence);

    // prompt popup
    let result;
    try {
        result = await FIREBASE.auth.signInWithPopup( FIREBASE.auth.getAuth(), new FIREBASE.auth.GoogleAuthProvider() );
    } catch (error) {
        console.warn(error);
        return false;
    }
    let responsePayload = FIREBASE.auth.getAdditionalUserInfo(result).profile;

    // get data from users uid
    let user = await FIREBASE.DB('users').Document(result.user.uid).get();

    // see if this user doesn't exist yet
    if ( user == undefined || user == null ) {
        // make new user
        let newUser = {
            OAuth_type: 'google',
            uid: result.user.uid,
            fname: responsePayload.given_name,
            lname: responsePayload.family_name,
            avatar: await getImageDataURL(responsePayload.picture) || responsePayload.picture,
            email: responsePayload.email,
            phone: '',
            access: []
        }
        await FIREBASE.DB('users').Document(result.user.uid).set(newUser);
        user = newUser;
    }
    return user.access.includes('becker-box');
}