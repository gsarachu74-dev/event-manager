/**
 * js/services/projects.js
 * Servicio para manejo de proyectos en Firestore (CDN).
 */

import {
    collection,
    addDoc,
    query,
    where,
    getDocs,
    getDoc,
    serverTimestamp,
    deleteDoc,
    doc,
    updateDoc,
    arrayUnion
} from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";

import { db } from "./firebase.js";

/**
 * Obtener un proyecto por su ID.
 */
export const getProjectById = async (projectId) => {
    if (!projectId) return null;
    try {
        const docRef = doc(db, "projects", projectId);
        const docSnap = await getDoc(docRef);

        if (docSnap.exists()) {
            return { id: docSnap.id, ...docSnap.data() };
        } else {
            console.error("No se encontró el proyecto con ID:", projectId);
            return null;
        }
    } catch (error) {
        console.error("Error obteniendo proyecto:", error);
        throw error;
    }
};

/**
 * Crear proyecto.
 */
export const createProject = async (name, ownerId, estimatedBudget = 0, eventDate = null) => {
    try {
        const docRef = await addDoc(collection(db, "projects"), {
            name,
            ownerId,
            collaborators: [],
            estimatedBudget: Number(estimatedBudget),
            eventDate,
            createdAt: serverTimestamp()
        });
        return docRef.id;
    } catch (error) {
        console.error("Error creando proyecto:", error);
        throw error;
    }
};

/**
 * Obtener proyectos del usuario (donde es dueño o colaborador).
 */
export const getProjectsByUser = async (userId) => {
    try {
        const qOwned = query(collection(db, "projects"), where("ownerId", "==", userId));
        const qCollaborator = query(collection(db, "projects"), where("collaborators", "array-contains", userId));

        const [ownedSnapshot, collaboratorSnapshot] = await Promise.all([
            getDocs(qOwned),
            getDocs(qCollaborator)
        ]);

        const projectsMap = new Map();

        ownedSnapshot.forEach(doc => {
            projectsMap.set(doc.id, { id: doc.id, ...doc.data() });
        });

        collaboratorSnapshot.forEach(doc => {
            if (!projectsMap.has(doc.id)) {
                projectsMap.set(doc.id, { id: doc.id, ...doc.data() });
            }
        });

        return Array.from(projectsMap.values());
    } catch (error) {
        console.error("Error obteniendo proyectos:", error);
        throw error;
    }
};

/**
 * Eliminar un proyecto y todas sus tareas asociadas (borrado en cascada).
 */
export const deleteProjectWithTasks = async (projectId, ownerId) => {
    if (!projectId || !ownerId) {
        throw new Error("ID de proyecto o de usuario no proporcionado.");
    }

    try {
        // 1 Query tasks by projectId and delete them
        const qTasks = query(
            collection(db, "tasks"),
            where("projectId", "==", projectId)
        );
        const snapshotTasks = await getDocs(qTasks);
        const deleteTasksPromises = snapshotTasks.docs.map(taskDoc =>
            deleteDoc(doc(db, "tasks", taskDoc.id))
        );
        await Promise.all(deleteTasksPromises);

        // 2 Query costs by projectId and delete them
        const qCosts = query(
            collection(db, "costs"),
            where("projectId", "==", projectId)
        );
        const snapshotCosts = await getDocs(qCosts);
        const deleteCostsPromises = snapshotCosts.docs.map(costDoc =>
            deleteDoc(doc(db, "costs", costDoc.id))
        );
        await Promise.all(deleteCostsPromises);

        // 3 Query contacts by projectId and delete them
        const qContacts = query(
            collection(db, "contacts"),
            where("projectId", "==", projectId)
        );
        const snapshotContacts = await getDocs(qContacts);
        const deleteContactsPromises = snapshotContacts.docs.map(contactDoc =>
            deleteDoc(doc(db, "contacts", contactDoc.id))
        );
        await Promise.all(deleteContactsPromises);

        // 4 Finally delete the project document
        const projectRef = doc(db, "projects", projectId);
        await deleteDoc(projectRef);

    } catch (error) {
        console.error("Error eliminando proyecto y sus tareas:", error);
        throw error;
    }
};


/**
 * Actualizar datos de un proyecto.
 */
export const updateProject = async (projectId, data) => {
    if (!projectId || !data) {
        throw new Error("ID de proyecto o datos no proporcionados.");
    }

    try {
        const docRef = doc(db, "projects", projectId);
        if (data.name) data.name = data.name.trim();
        if (data.estimatedBudget !== undefined) data.estimatedBudget = Number(data.estimatedBudget);
        await updateDoc(docRef, data);
    } catch (error) {
        console.error("Error actualizando proyecto:", error);
        throw error;
    }
};

/**
 * Agregar un colaborador a un proyecto.
 */
export const addCollaboratorToProject = async (projectId, collaboratorUid) => {
    if (!projectId || !collaboratorUid) {
        throw new Error("ID de proyecto o de colaborador no proporcionado.");
    }

    try {
        const projectRef = doc(db, "projects", projectId);
        await updateDoc(projectRef, {
            collaborators: arrayUnion(collaboratorUid)
        });
    } catch (error) {
        console.error("Error agregando colaborador:", error);
        throw error;
    }
};

/**
 * Invitar a un colaborador por su correo electrónico.
 */
export const inviteCollaboratorByEmail = async (projectId, email) => {
    if (!projectId || !email) {
        throw new Error("ID de proyecto o email no proporcionado.");
    }

    try {
        // 1. Buscar el usuario en la colección "users" por email
        const q = query(collection(db, "users"), where("email", "==", email.trim()));
        const snap = await getDocs(q);

        if (snap.empty) {
            throw new Error("Usuario no encontrado con ese correo electrónico.");
        }

        const collaboratorUid = snap.docs[0].data().uid;

        const projectRef = doc(db, "projects", projectId);
        const projectSnap = await getDoc(projectRef);

        if (projectSnap.exists()) {
            const projectData = projectSnap.data();
            if (projectData.collaborators && projectData.collaborators.includes(collaboratorUid)) {
                throw new Error("This user is already a collaborator.");
            }
        }

        // 2. Agregar ese uid al array collaborators usando arrayUnion
        await updateDoc(projectRef, {
            collaborators: arrayUnion(collaboratorUid)
        });
    } catch (error) {
        console.error("Error invitando colaborador:", error);
        throw error;
    }
};