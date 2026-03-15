/**
 * js/services/contacts.js
 * Servicio para manejo de contactos / proveedores en Firestore (CDN).
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
 * Crear un nuevo contacto asociado a un proyecto.
 */
export const createContact = async (data) => {
    console.log("[Service] createContact initiated with:", data);
    const { name, phone, email, serviceType, projectId, ownerId } = data;

    if (!name || !projectId || !ownerId) {
        console.warn("[Service] createContact: Missing required fields");
        throw new Error("Datos obligatorios incompletos (nombre, proyecto, dueño).");
    }

    try {
        console.log("[Service] Adding document to 'contacts' collection...");
        const docRef = await addDoc(collection(db, "contacts"), {
            name: name.trim(),
            phone: phone ? phone.trim() : "",
            email: email ? email.trim() : "",
            serviceType: serviceType ? serviceType.trim() : "",
            projectId,
            ownerId,
            createdAt: serverTimestamp()
        });
        console.log("[Service] Contact created successfully with ID:", docRef.id);
        return docRef.id;
    } catch (error) {
        console.error("[Service] Firestore Error in createContact:", error);
        throw error;
    }
};

/**
 * Obtener todos los contactos de un proyecto.
 */
export const getContactsByProject = async (projectId, ownerId) => {
    if (!projectId) return [];

    try {
        const q = query(
            collection(db, "contacts"),
            where("projectId", "==", projectId),
            orderBy("createdAt", "desc")
        );

        const snapshot = await getDocs(q);

        return snapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data()
        }));
    } catch (error) {
        console.error("Error obteniendo contactos:", error);
        throw error;
    }
};

/**
 * Actualizar un contacto existente.
 */
export const updateContact = async (contactId, data) => {
    if (!contactId || !data) {
        throw new Error("ID o datos inválidos para actualizar contacto.");
    }

    try {
        const docRef = doc(db, "contacts", contactId);
        await updateDoc(docRef, data);
    } catch (error) {
        console.error("Error actualizando contacto:", error);
        throw error;
    }
};

/**
 * Eliminar un contacto.
 */
export const deleteContact = async (contactId) => {
    if (!contactId) {
        throw new Error("ID de contacto no proporcionado.");
    }

    try {
        const docRef = doc(db, "contacts", contactId);
        await deleteDoc(docRef);
    } catch (error) {
        console.error("Error eliminando contacto:", error);
        throw error;
    }
};
