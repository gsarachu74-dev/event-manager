/**
 * js/services/tasks.js
 * Servicio para manejo de tareas en Firestore (CDN).
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
 * Crear una nueva tarea vinculada a un proyecto.
 */
export const createTask = async (name, ownerId, projectId, projectName) => {
    if (!name || !ownerId || !projectId || !projectName) {
        throw new Error("Datos incompletos para crear la tarea.");
    }

    try {
        const docRef = await addDoc(collection(db, "tasks"), {
            name: name.trim(),
            ownerId,
            projectId,
            projectName,
            status: "pending",
            createdAt: serverTimestamp()
        });

        return docRef.id;
    } catch (error) {
        console.error("Error creando tarea:", error);
        throw error;
    }
};

/**
 * Obtener todas las tareas del usuario.
 */
export const getTasksByUser = async (ownerId) => {
    if (!ownerId) return [];

    try {
        const q = query(
            collection(db, "tasks"),
            where("ownerId", "==", ownerId),
            orderBy("createdAt", "desc")
        );

        const snapshot = await getDocs(q);

        return snapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data()
        }));
    } catch (error) {
        console.error("Error obteniendo tareas:", error);
        throw error;
    }
};

/**
 * Obtener tareas de un proyecto específico (filtradas por usuario).
 */
export const getTasksByProject = async (projectId, ownerId) => {
    if (!projectId) return [];

    try {
        const q = query(
            collection(db, "tasks"),
            where("projectId", "==", projectId)
        );

        const snapshot = await getDocs(q);

        return snapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data()
        }));
    } catch (error) {
        console.error("Error obteniendo tareas del proyecto:", error);
        throw error;
    }
};

/**
 * Actualizar el estado de una tarea.
 */
export const updateTaskStatus = async (taskId, status) => {
    if (!taskId || !status) {
        throw new Error("Datos inválidos para actualizar la tarea.");
    }

    try {
        const docRef = doc(db, "tasks", taskId);
        await updateDoc(docRef, { status });
    } catch (error) {
        console.error("Error actualizando estado de tarea:", error);
        throw error;
    }
};

/**
 * Eliminar una tarea por su ID.
 */
export const deleteTask = async (taskId) => {
    if (!taskId) {
        throw new Error("ID de tarea no proporcionado.");
    }

    try {
        const docRef = doc(db, "tasks", taskId);
        await deleteDoc(docRef);
    } catch (error) {
        console.error("Error eliminando tarea:", error);
        throw error;
    }
};

/**
 * Actualizar el nombre de una tarea.
 */
export const updateTaskName = async (taskId, newName) => {
    if (!taskId || !newName) {
        throw new Error("Datos inválidos para actualizar el nombre de la tarea.");
    }

    try {
        const docRef = doc(db, "tasks", taskId);
        await updateDoc(docRef, { name: newName.trim() });
    } catch (error) {
        console.error("Error actualizando nombre de tarea:", error);
        throw error;
    }
};