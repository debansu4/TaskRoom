import {
    createUserWithEmailAndPassword,
    signInWithEmailAndPassword,
    signOut,
    sendEmailVerification,
    onAuthStateChanged
} from "https://www.gstatic.com/firebasejs/12.18.0/firebase-auth.js";

import {
    collection,
    addDoc,
    updateDoc,
    deleteDoc,
    doc,
    setDoc,
    getDoc,
    getDocs,
    onSnapshot,
    query,
    where,
    serverTimestamp
} from "https://www.gstatic.com/firebasejs/12.18.0/firebase-firestore.js";

import {
    auth,
    db
} from "./firebase.js";


// ======================================================
// GLOBAL STATE
// ======================================================

let currentUser = null;

let personalTasks = [];

let rooms = [];

let currentRoom = null;
let currentRoomMembers = [];
let sharedTasks = [];

let unsubscribePersonalTasks = null;
let unsubscribeOwnedRooms = null;
let unsubscribeJoinedRooms = null;

let unsubscribeMembers = null;
let unsubscribeSharedTasks = null;

let authMode = "login";
let currentTaskFilter = "all";

let ownedRoomsCache = [];
let joinedRoomsCache = [];


// ======================================================
// DOM
// ======================================================

// Navigation

const navItems =
    document.querySelectorAll(".nav-item");

const pages = {
    dashboard:
        document.getElementById("dashboardPage"),

    tasks:
        document.getElementById("tasksPage"),

    rooms:
        document.getElementById("roomsPage"),

    roomView:
        document.getElementById("roomViewPage"),

    activity:
        document.getElementById("activityPage")
};


// Header

const themeToggle =
    document.getElementById("themeToggle");

const authButton =
    document.getElementById("authButton");


// Dashboard

const dashboardGreeting =
    document.getElementById("dashboardGreeting");

const totalTasks =
    document.getElementById("totalTasks");

const activeTasks =
    document.getElementById("activeTasks");

const completedTasks =
    document.getElementById("completedTasks");

const completionPercent =
    document.getElementById("completionPercent");

const progressBar =
    document.getElementById("progressBar");

const progressText =
    document.getElementById("progressText");

const cloudStatus =
    document.getElementById("cloudStatus");

const recentTasks =
    document.getElementById("recentTasks");


// Personal Tasks

const taskForm =
    document.getElementById("taskForm");

const taskInput =
    document.getElementById("taskInput");

const tasksList =
    document.getElementById("tasksList");

const filterButtons =
    document.querySelectorAll(".filter-btn");


// Rooms

const createRoomBtn =
    document.getElementById("createRoomBtn");

const joinRoomBtn =
    document.getElementById("joinRoomBtn");

const roomsList =
    document.getElementById("roomsList");


// Room View

const roomViewName =
    document.getElementById("roomViewName");

const roomViewCode =
    document.getElementById("roomViewCode");

const roomRoleBadge =
    document.getElementById("roomRoleBadge");

const sharedTaskForm =
    document.getElementById("sharedTaskForm");

const sharedTaskInput =
    document.getElementById("sharedTaskInput");

const sharedTasksList =
    document.getElementById("sharedTasksList");

const membersList =
    document.getElementById("membersList");

const memberCount =
    document.getElementById("memberCount");

const leaveRoomBtn =
    document.getElementById("leaveRoomBtn");

const deleteRoomBtn =
    document.getElementById("deleteRoomBtn");


// Auth Modal

const authModal =
    document.getElementById("authModal");

const closeAuthModal =
    document.getElementById("closeAuthModal");

const authForm =
    document.getElementById("authForm");

const authTitle =
    document.getElementById("authTitle");

const authSubtitle =
    document.getElementById("authSubtitle");

const emailInput =
    document.getElementById("emailInput");

const passwordInput =
    document.getElementById("passwordInput");

const authSubmit =
    document.getElementById("authSubmit");

const authMessage =
    document.getElementById("authMessage");

const authSwitch =
    document.getElementById("authSwitch");


// Create Room Modal

const roomModal =
    document.getElementById("roomModal");

const closeRoomModal =
    document.getElementById("closeRoomModal");

const roomForm =
    document.getElementById("roomForm");

const roomNameInput =
    document.getElementById("roomNameInput");

const roomPasswordInput =
    document.getElementById("roomPasswordInput");

const createRoomSubmit =
    document.getElementById("createRoomSubmit");

const roomMessage =
    document.getElementById("roomMessage");


// Join Room Modal

const joinRoomModal =
    document.getElementById("joinRoomModal");

const closeJoinRoomModal =
    document.getElementById("closeJoinRoomModal");

const joinRoomForm =
    document.getElementById("joinRoomForm");

const joinRoomCodeInput =
    document.getElementById("joinRoomCodeInput");

const joinRoomPasswordInput =
    document.getElementById("joinRoomPasswordInput");

const joinRoomSubmit =
    document.getElementById("joinRoomSubmit");

const joinRoomMessage =
    document.getElementById("joinRoomMessage");


// Toast

const toast =
    document.getElementById("toast");


// ======================================================
// INITIALIZATION
// ======================================================

console.log(
    "TaskRoom initialized successfully."
);


// ======================================================
// UTILITY
// ======================================================

function escapeHTML(value) {

    return String(value ?? "")
        .replaceAll("&", "&amp;")
        .replaceAll("<", "&lt;")
        .replaceAll(">", "&gt;")
        .replaceAll('"', "&quot;")
        .replaceAll("'", "&#039;");

}


function showToast(message) {

    if (!toast) {
        return;
    }

    toast.textContent = message;

    toast.classList.add("show");

    setTimeout(() => {
        toast.classList.remove("show");
    }, 2800);

}


function showMessage(
    element,
    message,
    type = "error"
) {

    if (!element) {
        return;
    }

    element.textContent =
        message;

    element.className =
        `form-message ${type}`;

}


function clearMessage(element) {

    if (!element) {
        return;
    }

    element.textContent = "";

    element.className =
        "form-message";

}


function requireLogin() {

    if (currentUser) {
        return true;
    }

    openAuthModal();

    return false;

}


// ======================================================
// ROOM UI RESET
// ======================================================

function clearRoomUI() {

    if (sharedTaskInput) {
        sharedTaskInput.value = "";
    }

    if (roomViewName) {
        roomViewName.textContent = "";
    }

    if (roomViewCode) {
        roomViewCode.textContent = "";
    }

    if (memberCount) {
        memberCount.textContent = "0";
    }

    if (membersList) {
        membersList.innerHTML = "";
    }

    if (sharedTasksList) {
        sharedTasksList.innerHTML = "";
    }

    if (roomRoleBadge) {
        roomRoleBadge.textContent = "";
        roomRoleBadge.className = "";
    }

}


// ======================================================
// COMPLETE ROOM STATE RESET
// ======================================================

function resetRoomState() {

    // Stop realtime listeners first

    stopRoomListeners();

    // Clear current room object

    currentRoom = null;

    // Clear room arrays

    currentRoomMembers = [];

    sharedTasks = [];

    // Clear room UI

    clearRoomUI();

}


// ======================================================
// NAVIGATION
// ======================================================

function showPage(pageName) {

    /*
     * If user is leaving the Room View,
     * completely clear room state.
     */

    if (
        pageName !== "roomView" &&
        currentRoom
    ) {

        resetRoomState();

    }


    Object.values(pages).forEach(page => {

        if (page) {

            page.classList.remove(
                "active-page"
            );

        }

    });


    if (pages[pageName]) {

        pages[pageName].classList.add(
            "active-page"
        );

    }


    navItems.forEach(item => {

        item.classList.remove("active");

        if (
            item.dataset.page === pageName ||
            (
                pageName === "roomView" &&
                item.dataset.page === "rooms"
            )
        ) {

            item.classList.add("active");

        }

    });


    window.scrollTo({
        top: 0,
        behavior: "smooth"
    });

}


// Navigation click

navItems.forEach(item => {

    item.addEventListener(
        "click",
        () => {

            const page =
                item.dataset.page;


            if (
                page === "tasks" ||
                page === "rooms"
            ) {

                if (!requireLogin()) {
                    return;
                }

            }


            showPage(page);

        }
    );

});


// ======================================================
// DASHBOARD BUTTONS
// ======================================================

document
    .getElementById("dashboardTasksBtn")
    ?.addEventListener(
        "click",
        () => {

            if (!requireLogin()) {
                return;
            }

            showPage("tasks");

        }
    );


document
    .getElementById("quickAddTask")
    ?.addEventListener(
        "click",
        () => {

            if (!requireLogin()) {
                return;
            }

            showPage("tasks");

            setTimeout(() => {
                taskInput?.focus();
            }, 200);

        }
    );


document
    .getElementById("quickCreateRoom")
    ?.addEventListener(
        "click",
        () => {

            if (!requireLogin()) {
                return;
            }

            openRoomModal();

        }
    );


document
    .getElementById("quickJoinRoom")
    ?.addEventListener(
        "click",
        () => {

            if (!requireLogin()) {
                return;
            }

            openJoinRoomModal();

        }
    );


// ======================================================
// THEME
// ======================================================

const savedTheme =
    localStorage.getItem(
        "taskroom-theme"
    );


if (savedTheme === "dark") {

    document.body.classList.add("dark");

}


function updateThemeIcon() {

    if (!themeToggle) {
        return;
    }

    themeToggle.textContent =
        document.body.classList.contains("dark")
            ? "☀️"
            : "🌙";

}


updateThemeIcon();


themeToggle?.addEventListener(
    "click",
    () => {

        document.body.classList.toggle(
            "dark"
        );

        localStorage.setItem(
            "taskroom-theme",
            document.body.classList.contains("dark")
                ? "dark"
                : "light"
        );

        updateThemeIcon();

    }
);


// ======================================================
// LOCAL STORAGE TASKS
// ======================================================

function getGuestTasks() {

    try {

        return JSON.parse(
            localStorage.getItem(
                "taskroom-guest-tasks"
            )
        ) || [];

    } catch {

        return [];

    }

}


function saveGuestTasks() {

    localStorage.setItem(
        "taskroom-guest-tasks",
        JSON.stringify(
            personalTasks
        )
    );

}


// ======================================================
// PERSONAL TASK COLLECTION
// ======================================================

function getPersonalTasksCollection() {

    if (!currentUser) {
        return null;
    }

    return collection(
        db,
        "users",
        currentUser.uid,
        "tasks"
    );

}


// ======================================================
// PERSONAL TASK LISTENER
// ======================================================

function stopPersonalTaskListener() {

    if (unsubscribePersonalTasks) {

        unsubscribePersonalTasks();

        unsubscribePersonalTasks = null;

    }

}


function loadPersonalTasks(user) {

    stopPersonalTaskListener();


    if (!user) {

        personalTasks =
            getGuestTasks();

        renderAllTasks();

        updateDashboard();

        return;

    }


    const tasksRef =
        getPersonalTasksCollection();


    unsubscribePersonalTasks =
        onSnapshot(
            tasksRef,

            snapshot => {

                personalTasks =
                    snapshot.docs.map(
                        taskDoc => {

                            const data =
                                taskDoc.data();

                            return {

                                id:
                                    taskDoc.id,

                                text:
                                    data.text || "",

                                completed:
                                    data.completed === true,

                                createdAt:
                                    data.createdAt || null

                            };

                        }
                    );


                personalTasks.sort(
                    (a, b) => {

                        const aTime =
                            a.createdAt
                                ?.toMillis?.() || 0;

                        const bTime =
                            b.createdAt
                                ?.toMillis?.() || 0;

                        return bTime - aTime;

                    }
                );


                renderAllTasks();

                updateDashboard();

            },

            error => {

                console.error(
                    "Personal task error:",
                    error
                );

                personalTasks = [];

                renderAllTasks();

                updateDashboard();

            }
        );

}


// ======================================================
// ADD PERSONAL TASK
// ======================================================

taskForm?.addEventListener(
    "submit",
    async event => {

        event.preventDefault();

        const text =
            taskInput.value.trim();

        if (!text) {
            return;
        }


        try {

            if (!currentUser) {

                const task = {

                    id:
                        crypto.randomUUID(),

                    text,

                    completed: false,

                    createdAt:
                        Date.now()

                };


                personalTasks.unshift(task);

                saveGuestTasks();

                taskInput.value = "";

                renderAllTasks();

                updateDashboard();

                showToast(
                    "Task added."
                );

                return;

            }


            await addDoc(
                getPersonalTasksCollection(),
                {

                    text,

                    completed: false,

                    createdAt:
                        serverTimestamp()

                }
            );


            taskInput.value = "";

            showToast(
                "Task added."
            );

        } catch (error) {

            console.error(
                "Add task error:",
                error
            );

            showToast(
                "Could not add task."
            );

        }

    }
);


// ======================================================
// TOGGLE PERSONAL TASK
// ======================================================

async function togglePersonalTask(task) {

    try {

        if (!currentUser) {

            task.completed =
                !task.completed;

            saveGuestTasks();

            renderAllTasks();

            updateDashboard();

            return;

        }


        await updateDoc(
            doc(
                db,
                "users",
                currentUser.uid,
                "tasks",
                task.id
            ),
            {
                completed:
                    !task.completed
            }
        );

    } catch (error) {

        console.error(
            "Toggle task error:",
            error
        );

        showToast(
            "Could not update task."
        );

    }

}


// ======================================================
// DELETE PERSONAL TASK
// ======================================================

async function deletePersonalTask(task) {

    try {

        if (!currentUser) {

            personalTasks =
                personalTasks.filter(
                    item =>
                        item.id !== task.id
                );

            saveGuestTasks();

            renderAllTasks();

            updateDashboard();

            return;

        }


        await deleteDoc(
            doc(
                db,
                "users",
                currentUser.uid,
                "tasks",
                task.id
            )
        );

    } catch (error) {

        console.error(
            "Delete task error:",
            error
        );

        showToast(
            "Could not delete task."
        );

    }

}


// ======================================================
// RENDER PERSONAL TASKS
// ======================================================

function getFilteredTasks() {

    if (
        currentTaskFilter ===
        "active"
    ) {

        return personalTasks.filter(
            task =>
                !task.completed
        );

    }


    if (
        currentTaskFilter ===
        "completed"
    ) {

        return personalTasks.filter(
            task =>
                task.completed
        );

    }


    return personalTasks;

}


function renderAllTasks() {

    if (!tasksList) {
        return;
    }


    const tasks =
        getFilteredTasks();


    if (!tasks.length) {

        tasksList.innerHTML = `
            <div class="empty-state">

                <div class="empty-icon">
                    ✓
                </div>

                <h3>
                    No tasks here
                </h3>

                <p>
                    Add a task and start making progress.
                </p>

            </div>
        `;

        return;

    }


    tasksList.innerHTML =
        tasks.map(task => {

            return `
                <div
                    class="task-item ${
                        task.completed
                            ? "completed"
                            : ""
                    }"
                >

                    <button
                        class="task-check"
                        data-action="toggle-task"
                        data-id="${escapeHTML(task.id)}"
                        aria-label="Toggle task"
                    >
                        ${
                            task.completed
                                ? "✓"
                                : ""
                        }
                    </button>

                    <span class="task-text">
                        ${escapeHTML(task.text)}
                    </span>

                    <button
                        class="task-delete"
                        data-action="delete-task"
                        data-id="${escapeHTML(task.id)}"
                        aria-label="Delete task"
                    >
                        ×
                    </button>

                </div>
            `;

        }).join("");

}


// Personal task event delegation

tasksList?.addEventListener(
    "click",
    event => {

        const button =
            event.target.closest("button");

        if (!button) {
            return;
        }


        const id =
            button.dataset.id;


        const task =
            personalTasks.find(
                item =>
                    item.id === id
            );


        if (!task) {
            return;
        }


        if (
            button.dataset.action ===
            "toggle-task"
        ) {

            togglePersonalTask(task);

        }


        if (
            button.dataset.action ===
            "delete-task"
        ) {

            deletePersonalTask(task);

        }

    }
);


// Filters

filterButtons.forEach(button => {

    button.addEventListener(
        "click",
        () => {

            filterButtons.forEach(
                item =>
                    item.classList.remove("active")
            );

            button.classList.add("active");

            currentTaskFilter =
                button.dataset.filter;

            renderAllTasks();

        }
    );

});


// ======================================================
// DASHBOARD
// ======================================================

function updateDashboard() {

    const total =
        personalTasks.length;


    const completed =
        personalTasks.filter(
            task =>
                task.completed
        ).length;


    const active =
        total - completed;


    const percent =
        total === 0
            ? 0
            : Math.round(
                (completed / total) * 100
            );


    if (totalTasks) {
        totalTasks.textContent = total;
    }


    if (activeTasks) {
        activeTasks.textContent = active;
    }


    if (completedTasks) {
        completedTasks.textContent = completed;
    }


    if (completionPercent) {
        completionPercent.textContent =
            `${percent}%`;
    }


    if (progressText) {
        progressText.textContent =
            `${percent}%`;
    }


    if (progressBar) {
        progressBar.style.width =
            `${percent}%`;
    }


    if (recentTasks) {

        const recent =
            personalTasks.slice(0, 5);


        if (!recent.length) {

            recentTasks.innerHTML = `
                <div class="empty-inline">
                    No tasks yet.
                </div>
            `;

        } else {

            recentTasks.innerHTML =
                recent.map(task => {

                    return `
                        <div class="recent-task">

                            <span class="${
                                task.completed
                                    ? "done-dot"
                                    : "todo-dot"
                            }"></span>

                            <span>
                                ${escapeHTML(task.text)}
                            </span>

                        </div>
                    `;

                }).join("");

        }

    }

}


// ======================================================
// AUTH MODAL
// ======================================================

function openAuthModal(
    mode = authMode
) {

    authMode = mode;

    clearMessage(authMessage);

    authModal.classList.remove("hidden");

    updateAuthModal();

}


function closeAuthModalFunction() {

    authModal.classList.add("hidden");

    clearMessage(authMessage);

    authForm.reset();

}


function updateAuthModal() {

    if (authMode === "login") {

        authTitle.textContent =
            "Login";

        authSubtitle.textContent =
            "Login to sync your tasks across devices.";

        authSubmit.textContent =
            "Login";

        authSwitch.textContent =
            "Don't have an account? Sign up";

        passwordInput.autocomplete =
            "current-password";

    } else {

        authTitle.textContent =
            "Create Account";

        authSubtitle.textContent =
            "Create your TaskRoom account.";

        authSubmit.textContent =
            "Sign Up";

        authSwitch.textContent =
            "Already have an account? Login";

        passwordInput.autocomplete =
            "new-password";

    }

}


authButton?.addEventListener(
    "click",
    async () => {

        if (currentUser) {

            resetRoomState();

            await signOut(auth);

            showToast(
                "Logged out successfully."
            );

            return;

        }

        openAuthModal("login");

    }
);


closeAuthModal?.addEventListener(
    "click",
    closeAuthModalFunction
);


authSwitch?.addEventListener(
    "click",
    () => {

        authMode =
            authMode === "login"
                ? "signup"
                : "login";

        updateAuthModal();

        clearMessage(authMessage);

    }
);


// ======================================================
// AUTH SUBMIT
// ======================================================

authForm?.addEventListener(
    "submit",
    async event => {

        event.preventDefault();


        const email =
            emailInput.value.trim();


        const password =
            passwordInput.value;


        if (!email || !password) {
            return;
        }


        authSubmit.disabled = true;


        authSubmit.textContent =
            authMode === "login"
                ? "Logging in..."
                : "Creating...";


        clearMessage(authMessage);


        try {

            if (
                authMode === "signup"
            ) {

                const credential =
                    await createUserWithEmailAndPassword(
                        auth,
                        email,
                        password
                    );


                await sendEmailVerification(
                    credential.user
                );


                await signOut(auth);


                showMessage(
                    authMessage,
                    "Account created. Please verify your email before logging in.",
                    "success"
                );


                authForm.reset();

                authMode = "login";

                updateAuthModal();

                return;

            }


            const credential =
                await signInWithEmailAndPassword(
                    auth,
                    email,
                    password
                );


            if (
                !credential.user.emailVerified
            ) {

                await signOut(auth);

                showMessage(
                    authMessage,
                    "Please verify your email first. Check your inbox.",
                    "error"
                );

                return;

            }


            closeAuthModalFunction();

            showToast(
                "Welcome back."
            );

        } catch (error) {

            console.error(
                "Authentication error:",
                error
            );


            let message =
                "Authentication failed. Please try again.";


            if (
                error.code ===
                "auth/email-already-in-use"
            ) {

                message =
                    "This email is already registered.";

            } else if (
                error.code ===
                "auth/invalid-credential"
            ) {

                message =
                    "Incorrect email or password.";

            } else if (
                error.code ===
                "auth/weak-password"
            ) {

                message =
                    "Password must be at least 6 characters.";

            } else if (
                error.code ===
                "auth/invalid-email"
            ) {

                message =
                    "Please enter a valid email.";

            }


            showMessage(
                authMessage,
                message
            );

        } finally {

            authSubmit.disabled = false;

            updateAuthModal();

        }

    }
);


// ======================================================
// AUTH STATE
// ======================================================

onAuthStateChanged(
    auth,
    user => {

        /*
         * When account changes,
         * absolutely clear previous room.
         */

        resetRoomState();


        currentUser = user;


        if (user) {

            authButton.textContent =
                "Logout";


            const name =
                user.email
                    ? user.email.split("@")[0]
                    : "there";


            if (dashboardGreeting) {

                dashboardGreeting.textContent =
                    `Welcome back, ${name}`;

            }


            if (cloudStatus) {

                cloudStatus.className =
                    "cloud-status connected";

                cloudStatus.innerHTML = `
                    <span class="status-dot"></span>
                    Cloud synced
                `;

            }


            loadPersonalTasks(user);

            loadUserRooms(user);

        } else {

            authButton.textContent =
                "Login";


            if (dashboardGreeting) {

                dashboardGreeting.textContent =
                    "Welcome to TaskRoom";

            }


            if (cloudStatus) {

                cloudStatus.className =
                    "cloud-status guest";

                cloudStatus.innerHTML = `
                    <span class="status-dot"></span>
                    Guest mode
                `;

            }


            loadPersonalTasks(null);

            stopRoomsListeners();

            rooms = [];

            ownedRoomsCache = [];

            joinedRoomsCache = [];

        }


        renderRooms();

    }
);


// ======================================================
// ROOM UTILITIES
// ======================================================

function getRoomsCollection() {

    return collection(
        db,
        "rooms"
    );

}


// ======================================================
// ROOM CODE GENERATOR
// ======================================================

function generateRoomCode() {

    const chars =
        "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";

    let code = "TR-";


    for (let i = 0; i < 5; i++) {

        code +=
            chars[
                Math.floor(
                    Math.random() *
                    chars.length
                )
            ];

    }


    return code;

}


// ======================================================
// UNIQUE ROOM ID
// ======================================================

async function generateUniqueRoomId() {

    for (
        let attempt = 0;
        attempt < 5;
        attempt++
    ) {

        const roomId =
            generateRoomCode();


        const roomRef =
            doc(
                db,
                "rooms",
                roomId
            );


        const existingRoom =
            await getDoc(roomRef);


        if (!existingRoom.exists()) {

            return roomId;

        }

    }


    throw new Error(
        "Could not generate a unique room ID."
    );

}


// ======================================================
// SHA-256 PASSWORD HASH
// ======================================================

async function hashRoomPassword(
    password
) {

    const encoder =
        new TextEncoder();


    const data =
        encoder.encode(password);


    const hashBuffer =
        await crypto.subtle.digest(
            "SHA-256",
            data
        );


    const hashArray =
        Array.from(
            new Uint8Array(
                hashBuffer
            )
        );


    return hashArray
        .map(
            byte =>
                byte
                    .toString(16)
                    .padStart(2, "0")
        )
        .join("");

}


// ======================================================
// ROOM MODALS
// ======================================================

function openRoomModal() {

    if (!requireLogin()) {
        return;
    }


    clearMessage(roomMessage);

    roomForm.reset();

    roomModal.classList.remove("hidden");


    setTimeout(() => {

        roomNameInput?.focus();

    }, 100);

}


function closeRoomModalFunction() {

    roomModal.classList.add("hidden");

    clearMessage(roomMessage);

    roomForm.reset();

}


createRoomBtn?.addEventListener(
    "click",
    openRoomModal
);


closeRoomModal?.addEventListener(
    "click",
    closeRoomModalFunction
);


function openJoinRoomModal() {

    if (!requireLogin()) {
        return;
    }


    clearMessage(joinRoomMessage);

    joinRoomForm.reset();

    joinRoomModal.classList.remove("hidden");


    setTimeout(() => {

        joinRoomCodeInput?.focus();

    }, 100);

}


function closeJoinRoomModalFunction() {

    joinRoomModal.classList.add("hidden");

    clearMessage(joinRoomMessage);

    joinRoomForm.reset();

}


joinRoomBtn?.addEventListener(
    "click",
    openJoinRoomModal
);


closeJoinRoomModal?.addEventListener(
    "click",
    closeJoinRoomModalFunction
);


// ======================================================
// CREATE ROOM
// ======================================================

roomForm?.addEventListener(
    "submit",
    async event => {

        event.preventDefault();


        if (!currentUser) {

            showMessage(
                roomMessage,
                "Please login first."
            );

            return;

        }


        const roomName =
            roomNameInput.value.trim();


        const roomPassword =
            roomPasswordInput.value;


        if (!roomName) {

            showMessage(
                roomMessage,
                "Please enter a room name."
            );

            return;

        }


        if (
            roomPassword.length < 6
        ) {

            showMessage(
                roomMessage,
                "Room password must be at least 6 characters."
            );

            return;

        }


        createRoomSubmit.disabled =
            true;


        createRoomSubmit.textContent =
            "Creating...";


        clearMessage(roomMessage);


        try {

            const roomId =
                await generateUniqueRoomId();


            const passwordHash =
                await hashRoomPassword(
                    roomPassword
                );


            const roomRef =
                doc(
                    db,
                    "rooms",
                    roomId
                );


            // Create room

            await setDoc(
                roomRef,
                {

                    name:
                        roomName,

                    ownerId:
                        currentUser.uid,

                    ownerEmail:
                        currentUser.email,

                    passwordHash:
                        passwordHash,

                    createdAt:
                        serverTimestamp()

                }
            );


            // Add owner member

            const memberRef =
                doc(
                    db,
                    "rooms",
                    roomId,
                    "members",
                    currentUser.uid
                );


            await setDoc(
                memberRef,
                {

                    uid:
                        currentUser.uid,

                    email:
                        currentUser.email,

                    role:
                        "owner",

                    joinedAt:
                        serverTimestamp()

                }
            );


            // User room index

            const userRoomRef =
                doc(
                    db,
                    "userRooms",
                    currentUser.uid,
                    "rooms",
                    roomId
                );


            await setDoc(
                userRoomRef,
                {

                    roomId:
                        roomId,

                    roomName:
                        roomName,

                    role:
                        "owner",

                    joinedAt:
                        serverTimestamp()

                }
            );


            closeRoomModalFunction();


            showToast(
                `Room created. Code: ${roomId}`
            );


            /*
             * Clear every previous room state
             * before entering the new room.
             */

            resetRoomState();


            setTimeout(() => {

                openRoom({

                    id:
                        roomId,

                    name:
                        roomName,

                    roomCode:
                        roomId,

                    ownerId:
                        currentUser.uid

                });

            }, 300);


        } catch (error) {

            console.error(
                "Create room error:",
                error
            );


            showMessage(
                roomMessage,
                "Could not create room. Please try again."
            );

        } finally {

            createRoomSubmit.disabled =
                false;

            createRoomSubmit.textContent =
                "Create Room";

        }

    }
);


// ======================================================
// STOP ROOM LISTENERS
// ======================================================

function stopRoomsListeners() {

    if (unsubscribeOwnedRooms) {

        unsubscribeOwnedRooms();

        unsubscribeOwnedRooms = null;

    }


    if (unsubscribeJoinedRooms) {

        unsubscribeJoinedRooms();

        unsubscribeJoinedRooms = null;

    }

}


// ======================================================
// LOAD USER ROOMS
// ======================================================

function loadUserRooms(user) {

    stopRoomsListeners();


    ownedRoomsCache = [];
    joinedRoomsCache = [];


    if (!user) {

        rooms = [];

        renderRooms();

        return;

    }


    // ==================================================
    // OWNED ROOMS
    // ==================================================

    const roomsRef =
        getRoomsCollection();


    const ownedRoomsQuery =
        query(
            roomsRef,
            where(
                "ownerId",
                "==",
                user.uid
            )
        );


    unsubscribeOwnedRooms =
        onSnapshot(
            ownedRoomsQuery,

            snapshot => {

                const ownedRooms =
                    snapshot.docs.map(
                        roomDoc => {

                            const data =
                                roomDoc.data();


                            return {

                                id:
                                    roomDoc.id,

                                name:
                                    data.name ||
                                    "Unnamed Room",

                                ownerId:
                                    data.ownerId ||
                                    "",

                                roomCode:
                                    roomDoc.id,

                                createdAt:
                                    data.createdAt ||
                                    null

                            };

                        }
                    );


                mergeRooms(
                    ownedRooms,
                    null
                );

            },

            error => {

                console.error(
                    "Owned rooms error:",
                    error
                );

                renderRoomsError();

            }
        );


    // ==================================================
    // JOINED ROOMS
    // ==================================================

    const userRoomsRef =
        collection(
            db,
            "userRooms",
            user.uid,
            "rooms"
        );


    unsubscribeJoinedRooms =
        onSnapshot(
            userRoomsRef,

            async snapshot => {

                const joinedRooms = [];


                for (
                    const memberDoc
                    of snapshot.docs
                ) {

                    const data =
                        memberDoc.data();


                    if (!data.roomId) {
                        continue;
                    }


                    try {

                        const roomSnapshot =
                            await getDoc(
                                doc(
                                    db,
                                    "rooms",
                                    data.roomId
                                )
                            );


                        if (
                            roomSnapshot.exists()
                        ) {

                            const roomData =
                                roomSnapshot.data();


                            joinedRooms.push({

                                id:
                                    roomSnapshot.id,

                                name:
                                    roomData.name ||
                                    data.roomName ||
                                    "Unnamed Room",

                                ownerId:
                                    roomData.ownerId ||
                                    "",

                                roomCode:
                                    roomSnapshot.id,

                                createdAt:
                                    roomData.createdAt ||
                                    null

                            });

                        }

                    } catch (error) {

                        console.error(
                            "Joined room fetch error:",
                            error
                        );

                    }

                }


                mergeRooms(
                    null,
                    joinedRooms
                );

            },

            error => {

                console.error(
                    "Joined rooms error:",
                    error
                );

            }
        );

}


// ======================================================
// MERGE ROOMS
// ======================================================

function mergeRooms(
    ownedRooms,
    joinedRooms
) {

    if (ownedRooms !== null) {

        ownedRoomsCache =
            ownedRooms;

    }


    if (joinedRooms !== null) {

        joinedRoomsCache =
            joinedRooms;

    }


    const roomMap =
        new Map();


    ownedRoomsCache.forEach(
        room => {

            roomMap.set(
                room.id,
                room
            );

        }
    );


    joinedRoomsCache.forEach(
        room => {

            if (!roomMap.has(room.id)) {

                roomMap.set(
                    room.id,
                    room
                );

            }

        }
    );


    rooms =
        Array.from(
            roomMap.values()
        );


    rooms.sort(
        (a, b) => {

            const aTime =
                a.createdAt
                    ?.toMillis?.() || 0;

            const bTime =
                b.createdAt
                    ?.toMillis?.() || 0;

            return bTime - aTime;

        }
    );


    renderRooms();

}


// ======================================================
// RENDER ROOMS
// ======================================================

function renderRooms() {

    if (!roomsList) {
        return;
    }


    if (!currentUser) {

        roomsList.innerHTML = `
            <div class="rooms-empty">

                <div class="empty-icon">
                    🔐
                </div>

                <h2>
                    Login to view rooms
                </h2>

                <p>
                    Create and join collaboration rooms
                    after logging in.
                </p>

                <button
                    class="primary-btn"
                    id="emptyLoginBtn"
                >
                    Login
                </button>

            </div>
        `;


        document
            .getElementById("emptyLoginBtn")
            ?.addEventListener(
                "click",
                () =>
                    openAuthModal("login")
            );


        return;

    }


    if (!rooms.length) {

        roomsList.innerHTML = `
            <div class="rooms-empty">

                <div class="empty-icon">
                    ▦
                </div>

                <h2>
                    No rooms yet
                </h2>

                <p>
                    Create a room or join one using a room code.
                </p>

                <div class="empty-actions">

                    <button
                        class="primary-btn"
                        id="emptyCreateRoomBtn"
                    >
                        Create Room
                    </button>

                    <button
                        class="secondary-btn"
                        id="emptyJoinRoomBtn"
                    >
                        Join Room
                    </button>

                </div>

            </div>
        `;


        document
            .getElementById(
                "emptyCreateRoomBtn"
            )
            ?.addEventListener(
                "click",
                openRoomModal
            );


        document
            .getElementById(
                "emptyJoinRoomBtn"
            )
            ?.addEventListener(
                "click",
                openJoinRoomModal
            );


        return;

    }


    roomsList.innerHTML =
        rooms.map(room => {

            const isOwner =
                room.ownerId ===
                currentUser.uid;


            return `
                <article
                    class="room-card"
                >

                    <div
                        class="room-card-top"
                    >

                        <div
                            class="room-card-icon"
                        >
                            ▦
                        </div>

                        ${
                            isOwner
                                ? `
                                    <span class="owner-badge">
                                        OWNER
                                    </span>
                                `
                                : `
                                    <span class="member-badge">
                                        MEMBER
                                    </span>
                                `
                        }

                    </div>


                    <h3>
                        ${escapeHTML(room.name)}
                    </h3>


                    <div
                        class="room-code-box"
                    >

                        <span>
                            ROOM CODE
                        </span>

                        <strong>
                            ${escapeHTML(
                                room.roomCode
                            )}
                        </strong>

                    </div>


                    <div
                        class="room-card-actions"
                    >

                        <button
                            class="secondary-btn copy-code-btn"
                            data-code="${escapeHTML(
                                room.roomCode
                            )}"
                        >
                            Copy Code
                        </button>


                        <button
                            class="primary-btn open-room-btn"
                            data-room-id="${escapeHTML(
                                room.id
                            )}"
                        >
                            Open
                        </button>

                    </div>

                </article>
            `;

        }).join("");


    document
        .querySelectorAll(
            ".copy-code-btn"
        )
        .forEach(button => {

            button.addEventListener(
                "click",
                async () => {

                    await copyText(
                        button.dataset.code
                    );

                    showToast(
                        "Room code copied."
                    );

                }
            );

        });


    document
        .querySelectorAll(
            ".open-room-btn"
        )
        .forEach(button => {

            button.addEventListener(
                "click",
                () => {

                    const room =
                        rooms.find(
                            item =>
                                item.id ===
                                button.dataset.roomId
                        );


                    if (room) {

                        openRoom(room);

                    }

                }
            );

        });

}


// ======================================================
// ROOMS ERROR
// ======================================================

function renderRoomsError() {

    if (!roomsList) {
        return;
    }


    roomsList.innerHTML = `
        <div class="rooms-empty">

            <div class="empty-icon">
                ⚠️
            </div>

            <h2>
                Could not load rooms
            </h2>

            <p>
                Something went wrong. Please try again.
            </p>

        </div>
    `;

}


// ======================================================
// COPY
// ======================================================

async function copyText(text) {

    try {

        await navigator.clipboard.writeText(
            text
        );

    } catch {

        const textarea =
            document.createElement(
                "textarea"
            );


        textarea.value = text;

        document.body.appendChild(
            textarea
        );

        textarea.select();

        document.execCommand("copy");

        textarea.remove();

    }

}


document
    .getElementById(
        "copyRoomViewCode"
    )
    ?.addEventListener(
        "click",
        async () => {

            if (!currentRoom) {
                return;
            }


            await copyText(
                currentRoom.roomCode
            );


            showToast(
                "Room code copied."
            );

        }
    );


// ======================================================
// JOIN ROOM
// ======================================================

joinRoomForm?.addEventListener(
    "submit",
    async event => {

        event.preventDefault();


        if (!currentUser) {

            showMessage(
                joinRoomMessage,
                "Please login first."
            );

            return;

        }


        const roomCode =
            joinRoomCodeInput.value
                .trim()
                .toUpperCase();


        const password =
            joinRoomPasswordInput.value;


        if (!roomCode) {

            showMessage(
                joinRoomMessage,
                "Please enter the room code."
            );

            return;

        }


        if (!password) {

            showMessage(
                joinRoomMessage,
                "Please enter the room password."
            );

            return;

        }


        joinRoomSubmit.disabled = true;

        joinRoomSubmit.textContent =
            "Joining...";

        clearMessage(
            joinRoomMessage
        );


        try {

            const roomRef =
                doc(
                    db,
                    "rooms",
                    roomCode
                );


            const roomDoc =
                await getDoc(
                    roomRef
                );


            if (!roomDoc.exists()) {

                showMessage(
                    joinRoomMessage,
                    "Room not found."
                );

                return;

            }


            const roomData =
                roomDoc.data();


            const passwordHash =
                await hashRoomPassword(
                    password
                );


            if (
                passwordHash !==
                roomData.passwordHash
            ) {

                showMessage(
                    joinRoomMessage,
                    "Incorrect room password."
                );

                return;

            }


            const memberRef =
                doc(
                    db,
                    "rooms",
                    roomDoc.id,
                    "members",
                    currentUser.uid
                );


            const existingMember =
                await getDoc(
                    memberRef
                );


            let memberRole =
                "member";


            if (
                existingMember.exists()
            ) {

                memberRole =
                    existingMember.data()
                        .role || "member";

            } else {

                await setDoc(
                    memberRef,
                    {

                        uid:
                            currentUser.uid,

                        email:
                            currentUser.email,

                        role:
                            "member",

                        joinedAt:
                            serverTimestamp()

                    }
                );

            }


            const userRoomRef =
                doc(
                    db,
                    "userRooms",
                    currentUser.uid,
                    "rooms",
                    roomDoc.id
                );


            await setDoc(
                userRoomRef,
                {

                    roomId:
                        roomDoc.id,

                    roomName:
                        roomData.name ||
                        "Unnamed Room",

                    role:
                        memberRole,

                    joinedAt:
                        serverTimestamp()

                }
            );


            closeJoinRoomModalFunction();


            showToast(
                `Joined ${
                    roomData.name ||
                    "room"
                }`
            );


            // Clear old room completely

            resetRoomState();


            openRoom({

                id:
                    roomDoc.id,

                name:
                    roomData.name ||
                    "Unnamed Room",

                roomCode:
                    roomDoc.id,

                ownerId:
                    roomData.ownerId ||
                    ""

            });

        } catch (error) {

            console.error(
                "Join room error:",
                error
            );


            showMessage(
                joinRoomMessage,
                "Could not join room. Please try again."
            );

        } finally {

            joinRoomSubmit.disabled =
                false;

            joinRoomSubmit.textContent =
                "Join Room";

        }

    }
);


// ======================================================
// OPEN ROOM
// ======================================================

async function openRoom(room) {

    if (!currentUser) {

        openAuthModal();

        return;

    }


    /*
     * VERY IMPORTANT:
     *
     * Before opening ANY room,
     * completely destroy previous room state.
     */

    resetRoomState();


    currentRoom = {

        id:
            room.id,

        name:
            room.name,

        roomCode:
            room.roomCode,

        ownerId:
            room.ownerId

    };


    // Make absolutely sure input is empty

    if (sharedTaskInput) {

        sharedTaskInput.value = "";

    }


    // Clear old arrays

    currentRoomMembers = [];

    sharedTasks = [];


    // Update room header

    roomViewName.textContent =
        currentRoom.name;


    roomViewCode.textContent =
        currentRoom.roomCode;


    const isOwner =
        currentRoom.ownerId ===
        currentUser.uid;


    roomRoleBadge.textContent =
        isOwner
            ? "OWNER"
            : "MEMBER";


    roomRoleBadge.className =
        isOwner
            ? "owner-badge"
            : "member-badge";


    deleteRoomBtn.classList.toggle(
        "hidden",
        !isOwner
    );


    // Clear lists BEFORE loading new data

    if (membersList) {
        membersList.innerHTML = "";
    }


    if (sharedTasksList) {
        sharedTasksList.innerHTML = "";
    }


    memberCount.textContent = "0";


    showPage("roomView");


    // Load ONLY this room

    loadRoomMembers(
        currentRoom.id
    );


    loadSharedTasks(
        currentRoom.id
    );

}


// ======================================================
// BACK TO ROOMS
// ======================================================

document
    .getElementById(
        "backToRoomsBtn"
    )
    ?.addEventListener(
        "click",
        () => {

            resetRoomState();

            showPage("rooms");

        }
    );


// ======================================================
// ROOM MEMBERS
// ======================================================

function loadRoomMembers(
    roomId
) {

    // Stop any previous listener

    if (unsubscribeMembers) {

        unsubscribeMembers();

        unsubscribeMembers = null;

    }


    // Clear previous member data

    currentRoomMembers = [];


    if (membersList) {
        membersList.innerHTML = "";
    }


    if (memberCount) {
        memberCount.textContent = "0";
    }


    const membersRef =
        collection(
            db,
            "rooms",
            roomId,
            "members"
        );


    unsubscribeMembers =
        onSnapshot(
            membersRef,

            snapshot => {

                /*
                 * Safety check:
                 * Ignore snapshot if user has already
                 * moved to another room.
                 */

                if (
                    !currentRoom ||
                    currentRoom.id !== roomId
                ) {

                    return;

                }


                currentRoomMembers =
                    snapshot.docs.map(
                        memberDoc => {

                            const data =
                                memberDoc.data();


                            return {

                                id:
                                    memberDoc.id,

                                uid:
                                    data.uid ||
                                    memberDoc.id,

                                email:
                                    data.email ||
                                    "Unknown",

                                role:
                                    data.role ||
                                    "member",

                                joinedAt:
                                    data.joinedAt ||
                                    null

                            };

                        }
                    );


                currentRoomMembers.sort(
                    (a, b) => {

                        if (
                            a.role ===
                            "owner"
                        ) {

                            return -1;

                        }


                        if (
                            b.role ===
                            "owner"
                        ) {

                            return 1;

                        }


                        return 0;

                    }
                );


                renderMembers();

            },

            error => {

                /*
                 * Ignore errors from old room
                 * after user has already left it.
                 */

                if (
                    !currentRoom ||
                    currentRoom.id !== roomId
                ) {

                    return;

                }


                console.error(
                    "Members error:",
                    error
                );


                if (membersList) {

                    membersList.innerHTML = `
                        <div class="empty-inline">
                            Could not load members.
                        </div>
                    `;

                }

            }
        );

}


// ======================================================
// RENDER MEMBERS
// ======================================================

function renderMembers() {

    if (!membersList) {
        return;
    }


    if (!currentRoom) {
        return;
    }


    memberCount.textContent =
        currentRoomMembers.length;


    if (
        !currentRoomMembers.length
    ) {

        membersList.innerHTML = `
            <div class="empty-inline">
                No members found.
            </div>
        `;

        return;

    }


    membersList.innerHTML =
        currentRoomMembers
            .map(member => {

                const isMe =
                    member.uid ===
                    currentUser?.uid;


                const email =
                    escapeHTML(
                        member.email
                    );


                const initial =
                    escapeHTML(
                        (
                            member.email ||
                            "U"
                        )
                            .charAt(0)
                            .toUpperCase()
                    );


                return `
                    <div
                        class="member-item"
                    >

                        <div
                            class="member-avatar"
                        >
                            ${initial}
                        </div>


                        <div
                            class="member-info"
                        >

                            <strong>
                                ${email}
                            </strong>

                            <span>
                                ${
                                    member.role ===
                                    "owner"
                                        ? "Room Owner"
                                        : "Member"
                                }

                                ${
                                    isMe
                                        ? " · You"
                                        : ""
                                }
                            </span>

                        </div>


                        ${
                            member.role ===
                            "owner"
                                ? `
                                    <span class="owner-mini">
                                        OWNER
                                    </span>
                                `
                                : ""
                        }

                    </div>
                `;

            })
            .join("");

}


// ======================================================
// SHARED TASKS
// ======================================================

function loadSharedTasks(
    roomId
) {

    if (unsubscribeSharedTasks) {

        unsubscribeSharedTasks();

        unsubscribeSharedTasks = null;

    }


    // Clear previous tasks

    sharedTasks = [];


    if (sharedTasksList) {
        sharedTasksList.innerHTML = "";
    }


    const tasksRef =
        collection(
            db,
            "rooms",
            roomId,
            "tasks"
        );


    unsubscribeSharedTasks =
        onSnapshot(
            tasksRef,

            snapshot => {

                /*
                 * IMPORTANT:
                 * If snapshot belongs to old room,
                 * completely ignore it.
                 */

                if (
                    !currentRoom ||
                    currentRoom.id !== roomId
                ) {

                    return;

                }


                sharedTasks =
                    snapshot.docs.map(
                        taskDoc => {

                            const data =
                                taskDoc.data();


                            return {

                                id:
                                    taskDoc.id,

                                text:
                                    data.text ||
                                    "",

                                completed:
                                    data.completed === true,

                                createdBy:
                                    data.createdBy ||
                                    "",

                                createdByEmail:
                                    data.createdByEmail ||
                                    "",

                                createdAt:
                                    data.createdAt ||
                                    null

                            };

                        }
                    );


                sharedTasks.sort(
                    (a, b) => {

                        const aTime =
                            a.createdAt
                                ?.toMillis?.() || 0;

                        const bTime =
                            b.createdAt
                                ?.toMillis?.() || 0;

                        return bTime - aTime;

                    }
                );


                renderSharedTasks();

            },

            error => {

                if (
                    !currentRoom ||
                    currentRoom.id !== roomId
                ) {

                    return;

                }


                console.error(
                    "Shared tasks error:",
                    error
                );


                if (sharedTasksList) {

                    sharedTasksList.innerHTML = `
                        <div class="empty-inline">
                            Could not load shared tasks.
                        </div>
                    `;

                }

            }
        );

}


// ======================================================
// RENDER SHARED TASKS
// ======================================================

function renderSharedTasks() {

    if (!sharedTasksList) {
        return;
    }


    if (!currentRoom) {

        sharedTasksList.innerHTML = "";

        return;

    }


    if (!sharedTasks.length) {

        sharedTasksList.innerHTML = `
            <div class="empty-state compact">

                <div class="empty-icon">
                    ✓
                </div>

                <h3>
                    No shared tasks
                </h3>

                <p>
                    Add the first task for this room.
                </p>

            </div>
        `;

        return;

    }


    sharedTasksList.innerHTML =
        sharedTasks
            .map(task => {

                return `
                    <div
                        class="task-item ${
                            task.completed
                                ? "completed"
                                : ""
                        }"
                    >

                        <button
                            class="task-check shared-task-toggle"
                            data-id="${escapeHTML(
                                task.id
                            )}"
                        >
                            ${
                                task.completed
                                    ? "✓"
                                    : ""
                            }
                        </button>


                        <div
                            class="shared-task-content"
                        >

                            <span
                                class="task-text"
                            >
                                ${escapeHTML(
                                    task.text
                                )}
                            </span>


                            <small>
                                ${
                                    escapeHTML(
                                        task.createdByEmail ||
                                        "Room member"
                                    )
                                }
                            </small>

                        </div>


                        <button
                            class="task-delete shared-task-delete"
                            data-id="${escapeHTML(
                                task.id
                            )}"
                        >
                            ×
                        </button>

                    </div>
                `;

            })
            .join("");

}


// ======================================================
// ADD SHARED TASK
// ======================================================

sharedTaskForm?.addEventListener(
    "submit",
    async event => {

        event.preventDefault();


        if (
            !currentUser ||
            !currentRoom
        ) {

            return;

        }


        /*
         * Save the room ID at this exact moment.
         * This prevents a fast room switch from
         * accidentally adding the task to another room.
         */

        const roomId =
            currentRoom.id;


        const text =
            sharedTaskInput.value.trim();


        if (!text) {
            return;
        }


        try {

            await addDoc(
                collection(
                    db,
                    "rooms",
                    roomId,
                    "tasks"
                ),
                {

                    text,

                    completed:
                        false,

                    createdBy:
                        currentUser.uid,

                    createdByEmail:
                        currentUser.email,

                    createdAt:
                        serverTimestamp()

                }
            );


            /*
             * Only clear the input if the user
             * is still inside the same room.
             */

            if (
                currentRoom &&
                currentRoom.id === roomId
            ) {

                sharedTaskInput.value = "";

            }


            showToast(
                "Shared task added."
            );

        } catch (error) {

            console.error(
                "Shared task add error:",
                error
            );


            showToast(
                "Could not add shared task."
            );

        }

    }
);


// ======================================================
// SHARED TASK ACTIONS
// ======================================================

sharedTasksList?.addEventListener(
    "click",
    async event => {

        const button =
            event.target.closest("button");


        if (
            !button ||
            !currentRoom
        ) {

            return;

        }


        const roomId =
            currentRoom.id;


        const taskId =
            button.dataset.id;


        const task =
            sharedTasks.find(
                item =>
                    item.id === taskId
            );


        if (!task) {
            return;
        }


        try {

            if (
                button.classList.contains(
                    "shared-task-toggle"
                )
            ) {

                await updateDoc(
                    doc(
                        db,
                        "rooms",
                        roomId,
                        "tasks",
                        task.id
                    ),
                    {

                        completed:
                            !task.completed

                    }
                );

            }


            if (
                button.classList.contains(
                    "shared-task-delete"
                )
            ) {

                await deleteDoc(
                    doc(
                        db,
                        "rooms",
                        roomId,
                        "tasks",
                        task.id
                    )
                );

            }

        } catch (error) {

            console.error(
                "Shared task update error:",
                error
            );


            showToast(
                "Could not update shared task."
            );

        }

    }
);


// ======================================================
// LEAVE ROOM
// ======================================================

leaveRoomBtn?.addEventListener(
    "click",
    async () => {

        if (
            !currentRoom ||
            !currentUser
        ) {

            return;

        }


        const roomId =
            currentRoom.id;


        const isOwner =
            currentRoom.ownerId ===
            currentUser.uid;


        if (isOwner) {

            showToast(
                "Room owners cannot leave. Delete the room instead."
            );

            return;

        }


        const confirmed =
            window.confirm(
                "Leave this room?"
            );


        if (!confirmed) {
            return;
        }


        try {

            await deleteDoc(
                doc(
                    db,
                    "rooms",
                    roomId,
                    "members",
                    currentUser.uid
                )
            );


            await deleteDoc(
                doc(
                    db,
                    "userRooms",
                    currentUser.uid,
                    "rooms",
                    roomId
                )
            );


            // Completely clear room

            resetRoomState();


            showPage("rooms");


            showToast(
                "You left the room."
            );

        } catch (error) {

            console.error(
                "Leave room error:",
                error
            );


            showToast(
                "Could not leave room."
            );

        }

    }
);


// ======================================================
// DELETE ROOM
// ======================================================

deleteRoomBtn?.addEventListener(
    "click",
    async () => {

        if (
            !currentRoom ||
            !currentUser ||
            currentRoom.ownerId !==
                currentUser.uid
        ) {

            return;

        }


        const confirmed =
            window.confirm(
                "Delete this room? This cannot be undone."
            );


        if (!confirmed) {
            return;
        }


        try {

            const roomId =
                currentRoom.id;


            // Get members

            const membersSnapshot =
                await getDocs(
                    collection(
                        db,
                        "rooms",
                        roomId,
                        "members"
                    )
                );


            // Get tasks

            const tasksSnapshot =
                await getDocs(
                    collection(
                        db,
                        "rooms",
                        roomId,
                        "tasks"
                    )
                );


            // Delete user room references

            for (
                const memberDoc
                of membersSnapshot.docs
            ) {

                const memberData =
                    memberDoc.data();


                if (!memberData.uid) {
                    continue;
                }


                try {

                    await deleteDoc(
                        doc(
                            db,
                            "userRooms",
                            memberData.uid,
                            "rooms",
                            roomId
                        )
                    );

                } catch (error) {

                    console.warn(
                        "Could not remove user room reference:",
                        error
                    );

                }

            }


            // Delete shared tasks

            for (
                const taskDoc
                of tasksSnapshot.docs
            ) {

                await deleteDoc(
                    taskDoc.ref
                );

            }


            // Delete members

            for (
                const memberDoc
                of membersSnapshot.docs
            ) {

                await deleteDoc(
                    memberDoc.ref
                );

            }


            // Delete room

            await deleteDoc(
                doc(
                    db,
                    "rooms",
                    roomId
                )
            );


            // Completely clear room state

            resetRoomState();


            showPage("rooms");


            showToast(
                "Room deleted."
            );

        } catch (error) {

            console.error(
                "Delete room error:",
                error
            );


            showToast(
                "Could not delete room."
            );

        }

    }
);


// ======================================================
// ROOM LISTENER CLEANUP
// ======================================================

function stopRoomListeners() {

    if (unsubscribeMembers) {

        unsubscribeMembers();

        unsubscribeMembers = null;

    }


    if (unsubscribeSharedTasks) {

        unsubscribeSharedTasks();

        unsubscribeSharedTasks = null;

    }

}


// ======================================================
// MODAL OUTSIDE CLICK
// ======================================================

[
    authModal,
    roomModal,
    joinRoomModal
].forEach(modal => {

    modal?.addEventListener(
        "click",
        event => {

            if (
                event.target ===
                modal
            ) {

                modal.classList.add(
                    "hidden"
                );

            }

        }
    );

});


// ======================================================
// ESCAPE KEY
// ======================================================

document.addEventListener(
    "keydown",
    event => {

        if (
            event.key !==
            "Escape"
        ) {

            return;

        }


        authModal?.classList.add(
            "hidden"
        );

        roomModal?.classList.add(
            "hidden"
        );

        joinRoomModal?.classList.add(
            "hidden"
        );

    }
);


// ======================================================
// START
// ======================================================

loadPersonalTasks(null);

updateDashboard();

renderRooms();

loadPersonalTasks(null);
updateDashboard();
renderRooms();

// Open My Tasks first
showPage("tasks");