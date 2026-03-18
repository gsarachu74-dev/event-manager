/**
 * js/services/auth.js
 * Lógica de Autenticación y Gestión de Usuarios.
 */

import {
    signInWithEmailAndPassword,
    createUserWithEmailAndPassword,
    signOut,
    onAuthStateChanged
} from "https://www.gstatic.com/firebasejs/10.8.0/firebase-auth.js";

import { doc, setDoc, getDoc, serverTimestamp, query, collection, where, getDocs }
    from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";

import { auth, db } from "./firebase.js";

/**
 * Obtener datos de un usuario por su UID.
 */
export const getUserById = async (uid) => {
    try {
        const docRef = doc(db, "users", uid);
        const docSnap = await getDoc(docRef);
        return docSnap.exists() ? docSnap.data() : null;
    } catch (error) {
        console.error("Error obteniendo usuario:", error);
        return null;
    }
};

/**
 * Obtener datos de un usuario por su email.
 */
export const getUserByEmail = async (email) => {
    try {
        const q = query(collection(db, "users"), where("email", "==", email));
        const snap = await getDocs(q);
        return snap.empty ? null : snap.docs[0].data();
    } catch (error) {
        console.error("Error obteniendo usuario por email:", error);
        return null;
    }
};

/**
 * Inicia sesión con email y contraseña.
 */
export const login = async (email, password) => {
    try {
        const userCredential = await signInWithEmailAndPassword(auth, email, password);
        return userCredential.user;
    } catch (error) {
        console.error("Error en login:", error.code, error.message);
        throw error;
    }
};

/**
 * Registra un nuevo usuario y crea su perfil inicial en Firestore.
 */
export const signup = async (email, password) => {
    try {
        const userCredential = await createUserWithEmailAndPassword(auth, email, password);
        const user = userCredential.user;

        const displayName = user.email.split("@")[0];

        // Crear documento del usuario en Firestore
        await setDoc(doc(db, "users", user.uid), {
            uid: user.uid,
            email: user.email,
            displayName,
            createdAt: serverTimestamp(),
            role: "user"
        });

        return user;
    } catch (error) {
        console.error("Error en registro:", error.code, error.message);
        throw error;
    }
};

/**
 * Cierra la sesión activa.
 */
export const logout = async () => {
    try {
        await signOut(auth);
    } catch (error) {
        console.error("Error al cerrar sesión:", error.message);
        throw error;
    }
};

/**
 * Observador del estado de autenticación.
 */
export const onAuthChange = (callback) => {
    return onAuthStateChanged(auth, callback);
};