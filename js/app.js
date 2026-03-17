/**
 * js/app.js
 * Principal controller for UI rendering and routing.
 */
import { onAuthChange, logout, login, signup } from "./services/auth.js";
import { getProjectsByUser, createProject, deleteProjectWithTasks, updateProject, getProjectById, inviteCollaboratorByEmail } from "./services/projects.js";
import { getTasksByProject, createTask, updateTaskStatus, deleteTask, updateTaskName, getTasksByUser } from "./services/tasks.js";
import { getCostsByProject, createCost, deleteCost, updateCost } from "./services/costs.js";
import { getContactsByProject, createContact, deleteContact, updateContact } from "./services/contacts.js";

/* ==========================================================================
   STATE & DOM ELEMENTS
   ========================================================================== */
const views = {
    login: document.getElementById("login-container"),
    sidebar: document.querySelector(".sidebar"),
    mainContent: document.querySelector(".main-content"),
    content: document.getElementById("view-content"),
    title: document.getElementById("view-title")
};

const loginForm = document.getElementById("login-form");
const emailInput = document.getElementById("email");
const passwordInput = document.getElementById("password");
const authToggleBtn = document.getElementById("go-to-signup");

let currentUser = null;
let isSignUpMode = false;

/* ==========================================================================
   UTILITIES
   ========================================================================== */

/**
 * Parses the URL hash to extract the path and any query parameters.
 */
const parseHashParams = () => {
    const fullHash = window.location.hash || "#projects";
    const [path, queryString] = fullHash.split("?");
    const params = {};

    if (queryString) {
        queryString.split("&").forEach(pair => {
            const [key, value] = pair.split("=");
            params[key] = decodeURIComponent(value);
        });
    }

    return { path, params };
};

/* ==========================================================================
   AUTHENTICATION UI LOGIC
   ========================================================================== */

authToggleBtn.addEventListener("click", (e) => {
    e.preventDefault();
    isSignUpMode = !isSignUpMode;

    const h1 = views.login.querySelector("h1");
    const p = views.login.querySelector("p");
    const submitBtn = loginForm.querySelector("button");

    if (isSignUpMode) {
        h1.innerText = "Crear Cuenta";
        p.innerText = "Únete a ProGest para gestionar tus proyectos";
        submitBtn.innerText = "Registrarse";
        authToggleBtn.innerText = "Ya tengo cuenta";
    } else {
        h1.innerText = "Hola de nuevo";
        p.innerText = "Ingresa a tu cuenta de ProGest";
        submitBtn.innerText = "Iniciar Sesión";
        authToggleBtn.innerText = "Regístrate";
    }
});

loginForm.addEventListener("submit", async (e) => {
    e.preventDefault();

    const email = emailInput.value;
    const password = passwordInput.value;

    try {
        if (isSignUpMode) {
            await signup(email, password);
            alert("Registro exitoso!");
        } else {
            await login(email, password);
        }
    } catch (err) {
        let msg = "Error: ";
        switch (err.code) {
            case "auth/email-already-in-use": msg += "El email ya está en uso."; break;
            case "auth/weak-password": msg += "La contraseña es muy débil."; break;
            case "auth/invalid-credential": msg += "Credenciales incorrectas."; break;
            default: msg += err.message;
        }
        alert(msg);
    }
});

document.getElementById("logout-btn").addEventListener("click", async () => {
    try {
        await logout();
    } catch {
        alert("Error al cerrar sesión");
    }
});

/* ==========================================================================
   ROUTING
   ========================================================================== */

const handleRoute = () => {
    const { path, params } = parseHashParams();

    // Update active nav state
    document.querySelectorAll(".nav-item").forEach(item => {
        item.classList.toggle("active", item.getAttribute("href") === path);
    });

    // View Routing
    switch (path) {
        case "#projects": renderProjects(); break;
        case "#tasks": renderTasks(params.project || null); break;
        case "#costs": renderCosts(params.project || null); break;
        case "#contacts": renderContacts(params.project || null); break;
        case "#project-dashboard": renderProjectDashboard(params.project || null); break;
        default: renderProjects();
    }
};


/* ==========================================================================
   VIEW RENDERING: PROJECTS
   ========================================================================== */

const renderProjects = async () => {
    views.title.innerText = "Proyectos";
    views.content.innerHTML = `<div class="loader">Cargando proyectos...</div>`;

    if (!currentUser) return;

    try {
        const projects = await getProjectsByUser(currentUser.uid);

        const projectsWithStats = await Promise.all(projects.map(async (project) => {
            const [tasks, costs, contacts] = await Promise.all([
                getTasksByProject(project.id, currentUser.uid),
                getCostsByProject(project.id, currentUser.uid),
                getContactsByProject(project.id, currentUser.uid)
            ]);

            return {
                ...project,
                stats: {
                    totalTasks: tasks.length,
                    pendingTasks: tasks.filter(t => t.status === "pending").length,
                    totalCost: costs.reduce((acc, c) => acc + Number(c.amount || 0), 0),
                    contactCount: contacts.length
                }
            };
        }));

        let html = `
            <div class="view-header">
                <button id="btn-new-project" class="btn btn-primary">Crear Proyecto</button>
            </div>
        `;

        if (projectsWithStats.length === 0) {
            html += `<div class="empty-state"><p>No tienes proyectos aún. ¡Crea el primero!</p></div>`;
        } else {
            html += `<div class="cards-grid">`;
            projectsWithStats.forEach(project => {
                const s = project.stats;
                html += `
                    <div class="card project-card" data-id="${project.id}">
                        <div>
                            <h3>${project.name}</h3>
                            <div class="project-stats">
                                <div class="stat-item"><ion-icon name="list-outline"></ion-icon><span>Tareas: <b>${s.totalTasks}</b></span></div>
                                <div class="stat-item"><ion-icon name="hourglass-outline"></ion-icon><span>Pendientes: <b>${s.pendingTasks}</b></span></div>
                                <div class="stat-item"><ion-icon name="wallet-outline"></ion-icon><span>Costos: <b>$${s.totalCost.toLocaleString()}</b></span></div>
                                <div class="stat-item"><ion-icon name="people-outline"></ion-icon><span>Contactos: <b>${s.contactCount}</b></span></div>
                            </div>
                        </div>
                        <div class="project-actions">
                            <button class="btn-edit-project btn btn-text" data-id="${project.id}">Editar</button>
                            <button class="btn-delete-project btn btn-text error" data-id="${project.id}">Eliminar</button>
                        </div>
                    </div>
                `;
            });
            html += `</div>`;
        }

        views.content.innerHTML = html;

        // --- Event Handlers ---
        const modal = document.getElementById("project-modal");
        const modalTitle = document.getElementById("project-modal-title");
        const nameInput = document.getElementById("project-name-input");
        const budgetInput = document.getElementById("project-budget-input");
        const dateInput = document.getElementById("project-date-input");

        let currentEditId = null;

        document.getElementById("btn-new-project")?.addEventListener("click", () => {
            currentEditId = null;
            modalTitle.innerText = "Nuevo Proyecto";
            nameInput.value = ""; budgetInput.value = ""; dateInput.value = "";
            modal.classList.remove("hidden");
            nameInput.focus();
        });

        document.querySelectorAll(".btn-edit-project").forEach(btn => {
            btn.addEventListener("click", async (e) => {
                e.stopPropagation();
                const project = await getProjectById(btn.dataset.id);
                if (project) {
                    currentEditId = project.id;
                    modalTitle.innerText = "Editar Proyecto";
                    nameInput.value = project.name;
                    budgetInput.value = project.estimatedBudget || "";
                    dateInput.value = project.eventDate || "";
                    modal.classList.remove("hidden");
                }
            });
        });

        document.getElementById("cancel-project-btn").onclick = () => modal.classList.add("hidden");

        document.getElementById("save-project-btn").onclick = async () => {
            const name = nameInput.value.trim();
            if (!name) return;

            try {
                if (currentEditId) {
                    await updateProject(currentEditId, { name, estimatedBudget: Number(budgetInput.value), eventDate: dateInput.value });
                } else {
                    await createProject(name, currentUser.uid, budgetInput.value, dateInput.value);
                }
                modal.classList.add("hidden");
                renderProjects();
            } catch (error) {
                alert("Error al guardar proyecto: " + error.message);
            }
        };

        document.querySelectorAll(".project-card").forEach(card => {
            card.addEventListener("click", () => {
                window.location.hash = `#project-dashboard?project=${card.dataset.id}`;
            });
        });

        document.querySelectorAll(".btn-delete-project").forEach(btn => {
            btn.addEventListener("click", async (e) => {
                e.stopPropagation();
                if (confirm("¿Eliminar este proyecto y todas sus tareas?")) {
                    await deleteProjectWithTasks(btn.dataset.id, currentUser.uid);
                    renderProjects();
                }
            });
        });

    } catch (err) {
        console.error(err);
        views.content.innerHTML = `<p class="error">Error al cargar proyectos.</p>`;
    }
};

/* ==========================================================================
   VIEW RENDERING: PROJECT DASHBOARD
   ========================================================================== */

const renderProjectDashboard = async (projectId) => {
    if (!projectId) { window.location.hash = "#projects"; return; }

    views.title.innerText = "Panel de Control";
    views.content.innerHTML = `<div class="loader">Cargando panel...</div>`;

    try {
        const [project, tasks, costs, contacts] = await Promise.all([
            getProjectById(projectId),
            getTasksByProject(projectId, currentUser.uid),
            getCostsByProject(projectId, currentUser.uid),
            getContactsByProject(projectId, currentUser.uid)
        ]);

        if (!project) { views.content.innerHTML = `<p class="error">Proyecto no encontrado.</p>`; return; }

        // Calculations
        const totalTasks = tasks.length;
        const pendingTasks = tasks.filter(t => t.status === "pending").length;
        const completedTasks = tasks.filter(t => t.status === "completed").length;
        const totalCost = costs.reduce((sum, c) => sum + Number(c.amount || 0), 0);
        const estimatedBudget = Number(project.estimatedBudget || 0);
        const budgetDiff = estimatedBudget - totalCost;

        const costsByCategory = costs.reduce((acc, c) => {
            const cat = c.category || "Otros";
            acc[cat] = (acc[cat] || 0) + Number(c.amount || 0);
            return acc;
        }, {});

        // Event Countdown
        let daysLeftText = "Fecha no definida";
        if (project.eventDate) {
            const eventDate = new Date(project.eventDate);
            const today = new Date(); today.setHours(0, 0, 0, 0);
            const diffDays = Math.ceil((eventDate - today) / (1000 * 60 * 60 * 24));
            daysLeftText = diffDays > 0 ? `Faltan ${diffDays} días` : (diffDays === 0 ? "¡Es hoy!" : "Evento finalizado");
        }

        let html = `
            <div class="view-header">
                <button onclick="window.location.hash='#projects'" class="btn btn-text">Volver</button>
                <div style="display: flex; gap: 1rem; align-items: center; position: relative;">
                    <button id="btn-toggle-invite-dropdown" class="btn btn-text" style="color: var(--primary-gold);"><ion-icon name="person-add-outline"></ion-icon> Invitar (${(project.collaborators?.length || 0) + 1})</button>
                    <!-- dropdown here -->
                    <div id="invite-dropdown" class="hidden" style="position: absolute; top: 100%; right: 0; background: var(--bg-card); border: 1px solid var(--border-color); border-radius: 8px; padding: 1rem; box-shadow: 0 4px 6px rgba(0,0,0,0.3); z-index: 100; min-width: 250px; margin-top: 0.5rem;">
                        <h4 style="margin-bottom: 0.5rem; font-size: 0.9rem; color: var(--text-main);">Colaboradores</h4>
                        <ul style="list-style: none; padding: 0; margin: 0 0 1rem 0; font-size: 0.85rem; color: var(--text-muted); max-height: 150px; overflow-y: auto;">
                            ${(project.collaborators && project.collaborators.length > 0)
                                ? project.collaborators.map(uid => `<li style="padding: 0.25rem 0; border-bottom: 1px solid var(--border-color);"><ion-icon name="person-circle-outline" style="vertical-align: middle; margin-right: 0.5rem;"></ion-icon>Usuario (${uid.substring(0,5)})</li>`).join('')
                                : `<li style="padding: 0.25rem 0;">No hay invitados aún</li>`
                            }
                        </ul>
                        <button id="btn-invite-collaborator" class="btn btn-primary" style="width: 100%; font-size: 0.8rem; padding: 0.5rem;">+ Invitar Nuevo</button>
                    </div>
                    <div class="countdown-box"><ion-icon name="calendar-outline"></ion-icon> ${daysLeftText}</div>
                </div>
            </div>

            <h2 style="margin-bottom: 2rem; color: var(--text-main);">${project.name}</h2>

            <div class="cards-grid summary-grid">
                <div class="card summary-card interactive" onclick="window.location.hash='#costs?project=${projectId}'" style="cursor: pointer; transition: transform 0.2s; border: 1px solid transparent;" onmouseover="this.style.borderColor='var(--primary-gold)';" onmouseout="this.style.borderColor='transparent';">
                    <h4><ion-icon name="wallet-outline"></ion-icon> Presupuesto / Costos</h4>
                    <div class="summary-value stat-number">$${totalCost.toLocaleString()}</div>
                    <div class="summary-footer">
                        <span>Estimado: $${estimatedBudget.toLocaleString()}</span><br>
                        <span style="color: ${budgetDiff >= 0 ? '#10b981' : '#ef4444'}">
                            ${budgetDiff >= 0 ? 'Ahorro: ' : 'Exceso: '}$${Math.abs(budgetDiff).toLocaleString()}
                        </span>
                    </div>
                </div>
                <div class="card summary-card interactive" onclick="window.location.hash='#tasks?project=${projectId}'" style="cursor: pointer; transition: transform 0.2s; border: 1px solid transparent;" onmouseover="this.style.borderColor='var(--primary-gold)';" onmouseout="this.style.borderColor='transparent';">
                    <h4><ion-icon name="list-outline"></ion-icon> Tareas</h4>
                    <div class="summary-value stat-number">${totalTasks}</div>
                    <div class="summary-footer"><span>${completedTasks} completadas</span> • <span>${pendingTasks} pendientes</span></div>
                </div>
                <div class="card summary-card interactive" onclick="window.location.hash='#contacts?project=${projectId}'" style="cursor: pointer; transition: transform 0.2s; border: 1px solid transparent;" onmouseover="this.style.borderColor='var(--primary-gold)';" onmouseout="this.style.borderColor='transparent';">
                    <h4><ion-icon name="people-outline"></ion-icon> Contactos</h4>
                    <div class="summary-value stat-number">${contacts.length}</div>
                    <div class="summary-footer">Proveedores registrados</div>
                </div>
            </div>

            <div class="category-summary">
                <h4 style="margin-bottom: 1.5rem; text-transform: uppercase; font-size: 0.8rem; color: var(--primary-gold);">Gastos por Categoría</h4>
                <div class="category-list">
        `;

        ["Lugar", "Comida", "Música", "Fotografía", "Decoración", "Transporte", "Vestimenta", "Otros"].forEach(cat => {
            html += `<div class="category-item"><span class="category-name">${cat}</span><span class="category-amount">$${(costsByCategory[cat] || 0).toLocaleString()}</span></div>`;
        });

        html += `
                </div>
            </div>
        `;

        views.content.innerHTML = html;

        // --- Event Handlers ---
        document.getElementById("btn-toggle-invite-dropdown")?.addEventListener("click", (e) => {
            e.stopPropagation();
            document.getElementById("invite-dropdown")?.classList.toggle("hidden");
        });

        document.getElementById("btn-invite-collaborator")?.addEventListener("click", async () => {
            const email = prompt("Ingrese el correo electrónico del colaborador que desea invitar:");
            if (email && email.trim()) {
                try {
                    await inviteCollaboratorByEmail(projectId, email.trim());
                    alert("Colaborador invitado exitosamente.");
                    renderProjectDashboard(projectId);
                } catch (error) {
                    alert("Error al invitar colaborador: " + error.message);
                }
            }
        });
    } catch (err) {
        console.error(err);
        views.content.innerHTML = `<p class="error">Error al cargar el panel.</p>`;
    }
};

/* ==========================================================================
   VIEW RENDERING: TASKS
   ========================================================================== */

const renderTasks = async (projectId = null) => {
    views.title.innerText = "Tareas";
    if (!projectId) {
        views.content.innerHTML = `<div class="empty-state"><p>Selecciona un proyecto para ver las tareas.</p><button onclick="window.location.hash='#projects'" class="btn btn-primary">Ir a Proyectos</button></div>`;
        return;
    }

    views.content.innerHTML = `<div class="loader">Cargando tareas...</div>`;

    try {
        const [tasks, project] = await Promise.all([getTasksByProject(projectId, currentUser.uid), getProjectById(projectId)]);
        const projectName = project ? project.name : "Proyecto";

        let html = `
            <div class="view-header">
                <button onclick="window.location.hash='#project-dashboard?project=${projectId}'" class="btn btn-text">Volver</button>
                <button id="btn-new-task" class="btn btn-primary">Crear Tarea</button>
            </div>
        `;

        if (tasks.length === 0) {
            html += `<div class="empty-state"><p>No hay tareas aún.</p></div>`;
        } else {
            html += `<div class="tasks-list">`;
            tasks.forEach(task => {
                const isComp = task.status === "completed";
                html += `
                    <div class="task-item">
                        <div>
                            <h3>${task.name}</h3>
                            <span class="badge ${task.status}">${isComp ? "Completada" : "Pendiente"}</span>
                        </div>
                        <div class="task-actions">
                            <button class="btn-toggle-status btn ${isComp ? "btn-text" : "btn-primary"}" data-id="${task.id}" data-status="${task.status}">${isComp ? "Reabrir" : "Completar"}</button>
                            <button class="btn-edit-task btn btn-text" data-id="${task.id}" data-name="${task.name}">Editar</button>
                            <button class="btn-delete-task btn btn-text error" data-id="${task.id}">Eliminar</button>
                        </div>
                    </div>
                `;
            });
            html += `</div>`;
        }

        views.content.innerHTML = html;

        // --- Event Handlers ---
        document.querySelectorAll(".btn-toggle-status").forEach(btn => {
            btn.onclick = async () => {
                await updateTaskStatus(btn.dataset.id, btn.dataset.status === "pending" ? "completed" : "pending");
                renderTasks(projectId);
            };
        });

        document.querySelectorAll(".btn-delete-task").forEach(btn => {
            btn.onclick = async () => {
                if (confirm("¿Eliminar esta tarea?")) { await deleteTask(btn.dataset.id); renderTasks(projectId); }
            };
        });

        document.querySelectorAll(".btn-edit-task").forEach(btn => {
            btn.onclick = async () => {
                const newName = prompt("Editar tarea:", btn.dataset.name);
                if (newName && newName.trim()) { await updateTaskName(btn.dataset.id, newName); renderTasks(projectId); }
            };
        });

        const modal = document.getElementById("task-modal");
        const taskInput = document.getElementById("task-name-input");

        document.getElementById("btn-new-task")?.addEventListener("click", () => {
            taskInput.value = ""; modal.classList.remove("hidden"); taskInput.focus();
        });

        document.getElementById("cancel-task-btn").onclick = () => modal.classList.add("hidden");
        document.getElementById("save-task-btn").onclick = async () => {
            if (!taskInput.value.trim()) return;
            await createTask(taskInput.value.trim(), currentUser.uid, projectId, projectName);
            modal.classList.add("hidden"); renderTasks(projectId);
        };

    } catch (err) {
        console.error(err);
        views.content.innerHTML = `<p class="error">Error al cargar tareas.</p>`;
    }
};

/* ==========================================================================
   VIEW RENDERING: COSTS
   ========================================================================== */

const renderCosts = async (projectId = null) => {
    views.title.innerText = "Costos";
    if (!projectId) {
        views.content.innerHTML = `<div class="empty-state"><p>Selecciona un proyecto para ver los costos.</p><button onclick="window.location.hash='#projects'" class="btn btn-primary">Ir a Proyectos</button></div>`;
        return;
    }

    views.content.innerHTML = `<div class="loader">Cargando costos...</div>`;

    try {
        const [costs, project] = await Promise.all([getCostsByProject(projectId, currentUser.uid), getProjectById(projectId)]);
        const total = costs.reduce((sum, cost) => sum + cost.amount, 0);

        let html = `
            <div class="view-header">
                <button onclick="window.location.hash='#project-dashboard?project=${projectId}'" class="btn btn-text">Volver</button>
                <button id="btn-new-cost" class="btn btn-primary">Agregar Costo</button>
            </div>
        `;

        if (costs.length === 0) {
            html += `<div class="empty-state"><p>No hay costos registrados.</p></div>`;
        } else {
            html += `<div class="tasks-list">`;
            costs.forEach(cost => {
                html += `
                    <div class="task-item">
                        <div class="cost-info">
                            <h3>${cost.name}</h3>
                            <span style="font-size: 1.25rem; font-weight: 600; color: var(--text-main);">$${cost.amount.toLocaleString()}</span>
                            <div style="font-size: 0.8rem; color: var(--text-gold);">${cost.category || "Otros"}</div>
                        </div>
                        <div class="task-actions">
                            <button class="btn-edit-cost btn btn-text" data-id="${cost.id}" data-name="${cost.name}" data-amount="${cost.amount}" data-category="${cost.category}">Editar</button>
                            <button class="btn-delete-cost btn btn-text error" data-id="${cost.id}">Eliminar</button>
                        </div>
                    </div>
                `;
            });
            html += `<div class="costs-total"><h2>TOTAL</h2><span style="font-size: 2rem; font-weight: 700; color: var(--primary-gold);">$${total.toLocaleString()}</span></div></div>`;
        }

        views.content.innerHTML = html;

        // --- Event Handlers ---
        document.querySelectorAll(".btn-delete-cost").forEach(btn => {
            btn.onclick = async () => {
                if (confirm("¿Eliminar este costo?")) { await deleteCost(btn.dataset.id); renderCosts(projectId); }
            };
        });

        const modal = document.getElementById("cost-modal");
        const modalTitle = document.getElementById("cost-modal-title");
        const nameInput = document.getElementById("cost-name-input");
        const amountInput = document.getElementById("cost-amount-input");
        const categoryInput = document.getElementById("cost-category-input");
        let currentEditId = null;

        const openModal = (id = null, name = "", amount = "", category = "Otros") => {
            currentEditId = id;
            modalTitle.innerText = id ? "Editar Costo" : "Nuevo Costo";
            nameInput.value = name; amountInput.value = amount; categoryInput.value = category;
            modal.classList.remove("hidden"); nameInput.focus();
        };

        document.getElementById("btn-new-cost")?.addEventListener("click", () => openModal());
        document.querySelectorAll(".btn-edit-cost").forEach(btn => {
            btn.onclick = () => openModal(btn.dataset.id, btn.dataset.name, btn.dataset.amount, btn.dataset.category);
        });

        document.getElementById("cancel-cost-btn").onclick = () => modal.classList.add("hidden");
        document.getElementById("save-cost-btn").onclick = async () => {
            const data = { name: nameInput.value.trim(), amount: Number(amountInput.value), category: categoryInput.value };
            if (!data.name || isNaN(data.amount)) return;

            if (currentEditId) await updateCost(currentEditId, data);
            else await createCost(data.name, data.amount, projectId, currentUser.uid, data.category);

            modal.classList.add("hidden"); renderCosts(projectId);
        };

    } catch (err) {
        console.error(err);
        views.content.innerHTML = `<p class="error">Error al cargar costos.</p>`;
    }
};

/* ==========================================================================
   VIEW RENDERING: CONTACTS
   ========================================================================== */

const renderContacts = async (projectId = null) => {
    views.title.innerText = "Contactos / Proveedores";
    if (!projectId) {
        views.content.innerHTML = `<div class="empty-state"><p>Selecciona un proyecto para ver sus contactos.</p><button onclick="window.location.hash='#projects'" class="btn btn-primary">Ir a Proyectos</button></div>`;
        return;
    }

    views.content.innerHTML = `<div class="loader">Cargando contactos...</div>`;

    try {
        const contacts = await getContactsByProject(projectId, currentUser.uid);

        let html = `
            <div class="view-header">
                <button onclick="window.location.hash='#project-dashboard?project=${projectId}'" class="btn btn-text">Volver</button>
                <button id="btn-new-contact" class="btn btn-primary">Nuevo Contacto</button>
            </div>
        `;

        if (contacts.length === 0) {
            html += `<div class="empty-state"><p>No hay contactos registrados.</p></div>`;
        } else {
            html += `<div class="cards-grid">`;
            contacts.forEach(contact => {
                html += `
                    <div class="card contact-card">
                        <h3>${contact.name}</h3>
                        <span class="contact-service">${contact.serviceType || "Servicio no especificado"}</span>
                        <div class="contact-details">
                            <span><ion-icon name="call-outline"></ion-icon> ${contact.phone || "---"}</span>
                            <span><ion-icon name="mail-outline"></ion-icon> ${contact.email || "---"}</span>
                        </div>
                        <div class="task-actions" style="margin-top: 1.5rem; opacity: 1;">
                            <button class="btn-edit-contact btn btn-text" data-id="${contact.id}" data-name="${contact.name}" data-service="${contact.serviceType}" data-phone="${contact.phone}" data-email="${contact.email}">Editar</button>
                            <button class="btn-delete-contact btn btn-text error" data-id="${contact.id}">Eliminar</button>
                        </div>
                    </div>
                `;
            });
            html += `</div>`;
        }

        views.content.innerHTML = html;

        // --- Event Handlers ---
        const modal = document.getElementById("contact-modal");
        const modalTitle = document.getElementById("contact-modal-title");
        const nameInput = document.getElementById("contact-name-input");
        const serviceInput = document.getElementById("contact-service-input");
        const phoneInput = document.getElementById("contact-phone-input");
        const emailInput = document.getElementById("contact-email-input");
        let currentEditId = null;

        const openModal = (id = null, name = "", service = "", phone = "", email = "") => {
            currentEditId = id;
            modalTitle.innerText = id ? "Editar Contacto" : "Nuevo Contacto";
            nameInput.value = name; serviceInput.value = service; phoneInput.value = phone; emailInput.value = email;
            modal.classList.remove("hidden"); nameInput.focus();
        };

        document.getElementById("btn-new-contact")?.addEventListener("click", () => openModal());
        document.querySelectorAll(".btn-edit-contact").forEach(btn => {
            btn.onclick = () => openModal(btn.dataset.id, btn.dataset.name, btn.dataset.service, btn.dataset.phone, btn.dataset.email);
        });

        document.getElementById("cancel-contact-btn").onclick = () => modal.classList.add("hidden");
        document.getElementById("save-contact-btn").onclick = async () => {
            const data = { name: nameInput.value.trim(), serviceType: serviceInput.value.trim(), phone: phoneInput.value.trim(), email: emailInput.value.trim() };
            if (!data.name) return;

            if (currentEditId) await updateContact(currentEditId, data);
            else await createContact({ ...data, projectId, ownerId: currentUser.uid });

            modal.classList.add("hidden"); renderContacts(projectId);
        };

        document.querySelectorAll(".btn-delete-contact").forEach(btn => {
            btn.onclick = async () => {
                if (confirm("¿Eliminar este contacto?")) { await deleteContact(btn.dataset.id); renderContacts(projectId); }
            };
        });

    } catch (err) {
        console.error(err);
        views.content.innerHTML = `<p class="error">Error al cargar contactos.</p>`;
    }
};

/* ==========================================================================
   INITIALIZATION & AUTH LISTENERS
   ========================================================================== */

window.addEventListener("hashchange", handleRoute);

onAuthChange((user) => {
    console.log("AUTH USER:", user);

    if (user) {
        console.log("UID ACTUAL:", user.uid);
    }

    currentUser = user;

    if (user) {
        views.login.classList.add("hidden");
        views.sidebar.classList.remove("hidden");
        views.mainContent.classList.remove("hidden");
        document.getElementById("user-name").innerText = user.email.split("@")[0];
        handleRoute();
    } else {
        views.login.classList.remove("hidden");
        views.sidebar.classList.add("hidden");
        views.mainContent.classList.add("hidden");
        loginForm.reset();
    }
});

/* ==========================================================================
   SERVICE WORKER & PWA ENHANCEMENTS
   ========================================================================== */
if ("serviceWorker" in navigator) {
    window.addEventListener("load", () => {
        navigator.serviceWorker.register("./service-worker.js")
            .then(reg => {
                console.log("Service Worker registrado", reg);

                // Update detection
                reg.addEventListener("updatefound", () => {
                    const newWorker = reg.installing;
                    newWorker.addEventListener("statechange", () => {
                        if (newWorker.state === "installed" && navigator.serviceWorker.controller) {
                            if (confirm("Nueva versión disponible. ¿Deseas actualizar?")) {
                                newWorker.postMessage({ type: "SKIP_WAITING" });
                                window.location.reload();
                            }
                        }
                    });
                });
            })
            .catch(err => console.error("Error al registrar Service Worker", err));
    });
}


// Installation Logic
let deferredPrompt;
const installBtn = document.getElementById("install-pwa-btn");

window.addEventListener("beforeinstallprompt", (e) => {
    e.preventDefault();
    deferredPrompt = e;
    if (installBtn) installBtn.classList.remove("hidden");
});

if (installBtn) {
    installBtn.addEventListener("click", async () => {
        if (!deferredPrompt) return;
        deferredPrompt.prompt();
        const { outcome } = await deferredPrompt.userChoice;
        console.log(`User response to the install prompt: ${outcome}`);
        deferredPrompt = null;
        installBtn.classList.add("hidden");
    });
}

window.addEventListener("appinstalled", () => {
    console.log("PWA instalada exitosamente");
    if (installBtn) installBtn.classList.add("hidden");
});

// Connectivity Logic
const offlineBanner = document.getElementById("offline-banner");

const updateOnlineStatus = () => {
    if (offlineBanner) {
        if (navigator.onLine) {
            offlineBanner.classList.add("hidden");
        } else {
            offlineBanner.classList.remove("hidden");
        }
    }
};

window.addEventListener("online", updateOnlineStatus);
window.addEventListener("offline", updateOnlineStatus);

// Initial check
updateOnlineStatus();

// Dropdown global closer
window.addEventListener("click", (e) => {
    const dropdown = document.getElementById("invite-dropdown");
    if (dropdown && !dropdown.classList.contains("hidden") && !e.target.closest("#btn-toggle-invite-dropdown") && !e.target.closest("#invite-dropdown")) {
        dropdown.classList.add("hidden");
    }
});
