/**
 * js/services/costs.js
 * Servicio para manejo de costos en Firestore (CDN).
 */

import {
    collection,
    addDoc,
    query,
    where,
    getDocs,
    serverTimestamp,
    doc,
    updateDoc,
    deleteDoc,
    orderBy
} from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";

import { db } from "./firebase.js";

/**
 * Registrar un nuevo costo asociado a un proyecto.
 */
export const createCost = async (name, amount, projectId, ownerId, category = "Otros") => {
    if (!name || isNaN(amount) || !projectId || !ownerId) {
        throw new Error("Datos incompletos para registrar el costo.");
    }

    try {
        const docRef = await addDoc(collection(db, "costs"), {
            name: name.trim(),
            amount: Number(amount),
            category: category.trim(),
            projectId,
            ownerId,
            createdAt: serverTimestamp()
        });
        return docRef.id;
    } catch (error) {
        console.error("Error creando costo:", error);
        throw error;
    }
};

/**
 * Obtener todos los costos de un proyecto.
 */
export const getCostsByProject = async (projectId, ownerId) => {
    if (!projectId) return [];

    try {
        const q = query(
            collection(db, "costs"),
            where("projectId", "==", projectId),
            orderBy("createdAt", "desc")
        );

        const snapshot = await getDocs(q);

        return snapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data()
        }));
    } catch (error) {
        console.error("Error obteniendo costos:", error);
        throw error;
    }
};

/**
 * Eliminar un costo por su ID.
 */
export const deleteCost = async (costId) => {
    if (!costId) {
        throw new Error("ID de costo no proporcionado.");
    }

    try {
        const docRef = doc(db, "costs", costId);
        await deleteDoc(docRef);
    } catch (error) {
        console.error("Error eliminando costo:", error);
        throw error;
    }
};

/**
 * Actualizar los datos de un costo.
 */
export const updateCost = async (costId, data) => {
    if (!costId || !data) {
        throw new Error("Datos inválidos para actualizar el costo.");
    }

    try {
        const docRef = doc(db, "costs", costId);
        await updateDoc(docRef, data);
    } catch (error) {
        console.error("Error actualizando costo:", error);
        throw error;
    }
};
