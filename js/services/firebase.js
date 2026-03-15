// js/services/firebase.js

import { initializeApp } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-app.js";
import { getAuth } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-auth.js";
import { getFirestore } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";

const firebaseConfig = {
    apiKey: "AIzaSyBOkn98_S90MxcB_2lzFB4sk2t-BFrGa4I",
    authDomain: "event-manager-app-2172b.firebaseapp.com",
    projectId: "event-manager-app-2172b",
    storageBucket: "event-manager-app-2172b.firebasestorage.app",
    messagingSenderId: "727317136300",
    appId: "1:727317136300:web:e21a328662ef79340b3009"
};

const app = initializeApp(firebaseConfig);

export const auth = getAuth(app);
export const db = getFirestore(app);