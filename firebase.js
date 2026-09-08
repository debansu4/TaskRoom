import {
    initializeApp
} from "https://www.gstatic.com/firebasejs/12.18.0/firebase-app.js";


import {
    getAuth
} from "https://www.gstatic.com/firebasejs/12.18.0/firebase-auth.js";


import {
    getFirestore
} from "https://www.gstatic.com/firebasejs/12.18.0/firebase-firestore.js";


const firebaseConfig = {
    apiKey: "AIzaSyBZlGtOZ7AsSwMG39NdbCf2yPhRcPVlp6M",
    authDomain: "taskroom-2dd06.firebaseapp.com",
    projectId: "taskroom-2dd06",
    storageBucket: "taskroom-2dd06.firebasestorage.app",
    messagingSenderId: "224994069792",
    appId: "1:224994069792:web:a71156fc84f76cf7df9b45",
    measurementId: "G-H8C7J6B007"
};


const app = initializeApp(firebaseConfig);

const auth = getAuth(app);

const db = getFirestore(app);


export {
    app,
    auth,
    db
};