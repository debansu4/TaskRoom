// ======================================================
// TASKROOM - APP.JS
// ======================================================

// ==============================
// FIREBASE IMPORTS
// ==============================

import {
    onAuthStateChanged,
    createUserWithEmailAndPassword,
    signInWithEmailAndPassword,
    signOut,
    sendEmailVerification
} from "https://www.gstatic.com/firebasejs/12.18.0/firebase-auth.js";

import {
    collection,
    doc,
    addDoc,
    setDoc,
    getDoc,
    getDocs,
    updateDoc,
    deleteDoc,
    query,
    orderBy,
    onSnapshot,
    serverTimestamp
} from "https://www.gstatic.com/firebasejs/12.18.0/firebase-firestore.js";

import {
    auth,
    db
} from "./firebase.js";


// ======================================================
// DOM ELEMENTS
// ======================================================

// Navigation
const navItems = document.querySelectorAll(".nav-item");

// Theme / Auth
const themeToggle = document.getElementById("themeToggle");
const authButton = document.getElementById("authButton");

// Pages
const dashboardPage = document.getElementById("dashboardPage");
const tasksPage = document.getElementById("tasksPage");
const roomsPage = document.getElementById("roomsPage");
const roomViewPage = document.getElementById("roomViewPage");
const activityPage = document.getElementById("activityPage");

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

const progressText =
    document.getElementById("progressText");

const progressBar =
    document.getElementById("progressBar");

const cloudStatus =
    document.getElementById("cloudStatus");

const recentTasks =
    document.getElementById("recentTasks");


// Quick actions
const dashboardTasksBtn =
    document.getElementById("dashboardTasksBtn");

const quickAddTask =
    document.getElementById("quickAddTask");

const quickCreateRoom =
    document.getElementById("quickCreateRoom");

const quickJoinRoom =
    document.getElementById("quickJoinRoom");


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

const copyRoomViewCode =
    document.getElementById("copyRoomViewCode");

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

const backToRoomsBtn =
    document.getElementById("backToRoomsBtn");


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
// GLOBAL STATE
// ======================================================

let currentUser = null;

let personalTasks = [];

let currentFilter = "all";

let currentRoomId = null;

let currentRoomData = null;

let currentRoomRole = null;

let unsubscribePersonalTasks = null;

let unsubscribeRooms = null;

let unsubscribeRoomMembers = null;

let unsubscribeRoomTasks = null;

let authMode = "login";


// ======================================================
// UTILITY
// ======================================================

function showToast(message) {

    if (!toast) return;

    toast.textContent = message;
    toast.classList.add("show");

    setTimeout(() => {
        toast.classList.remove("show");
    }, 2500);
}


function escapeHtml(value) {

    const div = document.createElement("div");

    div.textContent = value ?? "";

    return div.innerHTML;
}


function formatDate(timestamp) {

    if (!timestamp) {
        return "Just now";
    }

    let date;

    if (timestamp.toDate) {
        date = timestamp.toDate();
    } else {
        date = new Date(timestamp);
    }

    return date.toLocaleString();
}


// ======================================================
// THEME
// ======================================================

function loadTheme() {

    const savedTheme =
        localStorage.getItem("taskroom-theme");

    if (savedTheme === "dark") {
        document.body.classList.add("dark");
    } else {
        document.body.classList.remove("dark");
    }
}


themeToggle?.addEventListener("click", () => {

    document.body.classList.toggle("dark");

    localStorage.setItem(
        "taskroom-theme",
        document.body.classList.contains("dark")
            ? "dark"
            : "light"
    );
});


// ======================================================
// AUTH HELPERS
// ======================================================

function requireLogin() {

    if (!currentUser) {

        openAuthModal();

        showToast("Please login first.");

        return false;
    }

    return true;
}


function updateAuthButton() {

    if (!authButton) return;

    if (currentUser) {

        authButton.textContent = "Logout";

    } else {

        authButton.textContent = "Login";
    }
}


authButton?.addEventListener("click", async () => {

    if (currentUser) {

        try {

            await signOut(auth);

            showToast("Logged out successfully.");

        } catch (error) {

            console.error(error);

            showToast("Logout failed.");
        }

    } else {

        openAuthModal();
    }
});


// ======================================================
// PAGE NAVIGATION
// ======================================================

function showPage(pageName) {

    const pages = {
        dashboard: dashboardPage,
        tasks: tasksPage,
        rooms: roomsPage,
        activity: activityPage,
        roomView: roomViewPage
    };

    Object.values(pages).forEach(page => {

        if (page) {
            page.classList.remove("active");
        }
    });


    const selectedPage = pages[pageName];

    if (selectedPage) {
        selectedPage.classList.add("active");
    }


    navItems.forEach(item => {

        if (!item) return;

        item.classList.toggle(
            "active",
            item.dataset.page === pageName
        );
    });


    if (pageName !== "roomView") {

        resetRoomState();
    }
}


// Navigation
navItems.forEach(item => {

    if (!item) return;

    item.addEventListener("click", () => {

        const page =
            item.dataset.page;

        if (
            page === "tasks" ||
            page === "rooms" ||
            page === "activity"
        ) {

            if (!requireLogin()) {
                return;
            }
        }

        showPage(page);
    });
});


// Dashboard buttons
dashboardTasksBtn?.addEventListener("click", () => {

    if (!requireLogin()) return;

    showPage("tasks");
});


quickAddTask?.addEventListener("click", () => {

    if (!requireLogin()) return;

    showPage("tasks");

    setTimeout(() => {
        taskInput?.focus();
    }, 100);
});


quickCreateRoom?.addEventListener("click", () => {

    if (!requireLogin()) return;

    openRoomModal();
});


quickJoinRoom?.addEventListener("click", () => {

    if (!requireLogin()) return;

    openJoinRoomModal();
});


// ======================================================
// GUEST TASKS
// ======================================================

const GUEST_TASK_KEY =
    "taskroom-guest-tasks";


function getGuestTasks() {

    try {

        return JSON.parse(
            localStorage.getItem(GUEST_TASK_KEY)
        ) || [];

    } catch {

        return [];
    }
}


function saveGuestTasks(tasks) {

    localStorage.setItem(
        GUEST_TASK_KEY,
        JSON.stringify(tasks)
    );
}


// ======================================================
// PERSONAL TASKS
// ======================================================

async function addPersonalTask(text) {

    if (!text.trim()) return;


    if (!currentUser) {

        const tasks =
            getGuestTasks();

        tasks.unshift({
            id: Date.now().toString(),
            text: text.trim(),
            completed: false,
            createdAt: Date.now()
        });

        saveGuestTasks(tasks);

        loadPersonalTasks(null);

        showToast("Task added.");

        return;
    }


    try {

        await addDoc(
            collection(
                db,
                "users",
                currentUser.uid,
                "tasks"
            ),
            {
                text: text.trim(),
                completed: false,
                createdAt: serverTimestamp()
            }
        );

        showToast("Task added.");

    } catch (error) {

        console.error(error);

        showToast("Could not add task.");
    }
}


taskForm?.addEventListener("submit", async event => {

    event.preventDefault();

    const text =
        taskInput?.value.trim();

    if (!text) return;

    await addPersonalTask(text);

    if (taskInput) {
        taskInput.value = "";
    }
});


// ======================================================
// LOAD PERSONAL TASKS
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

        renderPersonalTasks();

        updateDashboard();

        return;
    }


    const tasksRef =
        collection(
            db,
            "users",
            user.uid,
            "tasks"
        );


    const q =
        query(
            tasksRef,
            orderBy("createdAt", "desc")
        );


    unsubscribePersonalTasks =
        onSnapshot(
            q,
            snapshot => {

                personalTasks =
                    snapshot.docs.map(item => ({
                        id: item.id,
                        ...item.data()
                    }));

                renderPersonalTasks();

                updateDashboard();

            },
            error => {

                console.error(
                    "Personal task listener error:",
                    error
                );

                showToast(
                    "Could not load your tasks."
                );
            }
        );
}


// ======================================================
// RENDER PERSONAL TASKS
// ======================================================

function getFilteredTasks() {

    if (currentFilter === "active") {

        return personalTasks.filter(
            task => !task.completed
        );
    }


    if (currentFilter === "completed") {

        return personalTasks.filter(
            task => task.completed
        );
    }


    return personalTasks;
}


function renderPersonalTasks() {

    if (!tasksList) return;


    const tasks =
        getFilteredTasks();


    if (!tasks.length) {

        tasksList.innerHTML = `
            <div class="empty-state">
                No tasks found.
            </div>
        `;

        return;
    }


    tasksList.innerHTML =
        tasks.map(task => `

            <div
                class="task-item ${task.completed ? "completed" : ""}"
                data-task-id="${task.id}"
            >

                <label class="task-check">

                    <input
                        type="checkbox"
                        class="personal-task-check"
                        data-id="${task.id}"
                        ${task.completed ? "checked" : ""}
                    >

                    <span></span>

                </label>

                <div class="task-content">

                    <div class="task-text">
                        ${escapeHtml(task.text)}
                    </div>

                    <div class="task-date">
                        ${formatDate(task.createdAt)}
                    </div>

                </div>

                <button
                    class="task-delete"
                    data-id="${task.id}"
                    type="button"
                >
                    ×
                </button>

            </div>

        `).join("");


    tasksList
        .querySelectorAll(".personal-task-check")
        .forEach(input => {

            input?.addEventListener(
                "change",
                async () => {

                    await togglePersonalTask(
                        input.dataset.id,
                        input.checked
                    );
                }
            );
        });


    tasksList
        .querySelectorAll(".task-delete")
        .forEach(button => {

            button?.addEventListener(
                "click",
                async () => {

                    await deletePersonalTask(
                        button.dataset.id
                    );
                }
            );
        });
}


// ======================================================
// PERSONAL TASK ACTIONS
// ======================================================

async function togglePersonalTask(
    taskId,
    completed
) {

    if (!currentUser) {

        const tasks =
            getGuestTasks();

        const task =
            tasks.find(
                item => item.id === taskId
            );

        if (task) {

            task.completed =
                completed;

            saveGuestTasks(tasks);

            personalTasks = tasks;

            renderPersonalTasks();

            updateDashboard();
        }

        return;
    }


    try {

        await updateDoc(
            doc(
                db,
                "users",
                currentUser.uid,
                "tasks",
                taskId
            ),
            {
                completed
            }
        );

    } catch (error) {

        console.error(error);

        showToast(
            "Could not update task."
        );
    }
}


async function deletePersonalTask(taskId) {

    if (!currentUser) {

        const tasks =
            getGuestTasks();

        const filtered =
            tasks.filter(
                task => task.id !== taskId
            );

        saveGuestTasks(filtered);

        personalTasks = filtered;

        renderPersonalTasks();

        updateDashboard();

        showToast("Task deleted.");

        return;
    }


    try {

        await deleteDoc(
            doc(
                db,
                "users",
                currentUser.uid,
                "tasks",
                taskId
            )
        );

        showToast("Task deleted.");

    } catch (error) {

        console.error(error);

        showToast(
            "Could not delete task."
        );
    }
}


// ======================================================
// FILTERS
// ======================================================

filterButtons.forEach(button => {

    if (!button) return;

    button.addEventListener("click", () => {

        filterButtons.forEach(item => {

            if (item) {
                item.classList.remove("active");
            }
        });


        button.classList.add("active");

        currentFilter =
            button.dataset.filter || "all";

        renderPersonalTasks();
    });
});


// ======================================================
// DASHBOARD
// ======================================================

function updateDashboard() {

    const total =
        personalTasks.length;

    const completed =
        personalTasks.filter(
            task => task.completed
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
            `${completed} of ${total} completed`;
    }

    if (progressBar) {
        progressBar.style.width =
            `${percent}%`;
    }


    if (dashboardGreeting) {

        if (currentUser) {

            const email =
                currentUser.email || "";

            dashboardGreeting.textContent =
                `Welcome back, ${email}`;
        } else {

            dashboardGreeting.textContent =
                "Welcome to TaskRoom";
        }
    }


    if (cloudStatus) {

        cloudStatus.textContent =
            currentUser
                ? "Cloud Sync Active"
                : "Guest Mode";
    }


    renderRecentTasks();
}


function renderRecentTasks() {

    if (!recentTasks) return;


    const recent =
        personalTasks.slice(0, 5);


    if (!recent.length) {

        recentTasks.innerHTML = `
            <div class="empty-state">
                No recent tasks.
            </div>
        `;

        return;
    }


    recentTasks.innerHTML =
        recent.map(task => `

            <div class="recent-task ${
                task.completed
                    ? "completed"
                    : ""
            }">

                <span>
                    ${escapeHtml(task.text)}
                </span>

                <span>
                    ${
                        task.completed
                            ? "✓"
                            : "Active"
                    }
                </span>

            </div>

        `).join("");
}


// ======================================================
// AUTH MODAL
// ======================================================

function openAuthModal() {

    if (!authModal) return;

    authModal.classList.add("active");

    authMessage &&
        (authMessage.textContent = "");

    emailInput?.focus();
}


function closeAuth() {

    authModal?.classList.remove("active");
}


closeAuthModal?.addEventListener(
    "click",
    closeAuth
);


function updateAuthModeUI() {

    if (authMode === "login") {

        if (authTitle) {
            authTitle.textContent =
                "Welcome Back";
        }

        if (authSubtitle) {
            authSubtitle.textContent =
                "Login to continue to TaskRoom";
        }

        if (authSubmit) {
            authSubmit.textContent =
                "Login";
        }

        if (authSwitch) {
            authSwitch.textContent =
                "Create an account";
        }

    } else {

        if (authTitle) {
            authTitle.textContent =
                "Create Account";
        }

        if (authSubtitle) {
            authSubtitle.textContent =
                "Create your TaskRoom account";
        }

        if (authSubmit) {
            authSubmit.textContent =
                "Sign Up";
        }

        if (authSwitch) {
            authSwitch.textContent =
                "Already have an account?";
        }
    }
}


authSwitch?.addEventListener(
    "click",
    () => {

        authMode =
            authMode === "login"
                ? "signup"
                : "login";

        updateAuthModeUI();

        if (authMessage) {
            authMessage.textContent = "";
        }
    }
);


authForm?.addEventListener(
    "submit",
    async event => {

        event.preventDefault();


        const email =
            emailInput?.value.trim();

        const password =
            passwordInput?.value;


        if (!email || !password) {

            if (authMessage) {
                authMessage.textContent =
                    "Enter email and password.";
            }

            return;
        }


        try {

            if (authMode === "login") {

                await signInWithEmailAndPassword(
                    auth,
                    email,
                    password
                );

                showToast(
                    "Login successful."
                );

            } else {

                const result =
                    await createUserWithEmailAndPassword(
                        auth,
                        email,
                        password
                    );


                try {

                    await sendEmailVerification(
                        result.user
                    );

                } catch (verificationError) {

                    console.warn(
                        "Verification email failed:",
                        verificationError
                    );
                }


                showToast(
                    "Account created."
                );
            }


            closeAuth();


            if (authForm) {
                authForm.reset();
            }

        } catch (error) {

            console.error(error);

            let message =
                "Authentication failed.";


            if (
                error.code ===
                "auth/invalid-credential"
            ) {

                message =
                    "Invalid email or password.";

            } else if (
                error.code ===
                "auth/email-already-in-use"
            ) {

                message =
                    "Email already in use.";

            } else if (
                error.code ===
                "auth/weak-password"
            ) {

                message =
                    "Password is too weak.";

            } else if (
                error.code ===
                "auth/invalid-email"
            ) {

                message =
                    "Invalid email address.";
            }


            if (authMessage) {
                authMessage.textContent =
                    message;
            }
        }
    }
);


// ======================================================
// ROOM CODE
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


async function generateUniqueRoomId() {

    for (let attempt = 0; attempt < 5; attempt++) {

        const roomId =
            generateRoomCode();

        const roomRef =
            doc(db, "rooms", roomId);

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
// SHA-256 ROOM PASSWORD
// ======================================================

async function hashRoomPassword(password) {

    const data =
        new TextEncoder().encode(password);

    const hashBuffer =
        await crypto.subtle.digest(
            "SHA-256",
            data
        );

    const hashArray =
        Array.from(
            new Uint8Array(hashBuffer)
        );


    return hashArray
        .map(byte =>
            byte
                .toString(16)
                .padStart(2, "0")
        )
        .join("");
}


// ======================================================
// ROOM MODAL
// ======================================================

function openRoomModal() {

    if (!roomModal) return;

    roomModal.classList.add("active");

    roomMessage &&
        (roomMessage.textContent = "");

    roomNameInput?.focus();
}


function closeRoom() {

    roomModal?.classList.remove("active");
}


createRoomBtn?.addEventListener(
    "click",
    () => {

        if (!requireLogin()) return;

        openRoomModal();
    }
);


closeRoomModal?.addEventListener(
    "click",
    closeRoom
);


// ======================================================
// CREATE ROOM
// ======================================================

roomForm?.addEventListener(
    "submit",
    async event => {

        event.preventDefault();


        if (!requireLogin()) return;


        const roomName =
            roomNameInput?.value.trim();

        const roomPassword =
            roomPasswordInput?.value;


        if (!roomName || !roomPassword) {

            if (roomMessage) {
                roomMessage.textContent =
                    "Enter room name and password.";
            }

            return;
        }


        try {

            if (createRoomSubmit) {
                createRoomSubmit.disabled = true;
            }


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


            await setDoc(
                roomRef,
                {
                    name: roomName,
                    ownerId: currentUser.uid,
                    ownerEmail: currentUser.email,
                    passwordHash,
                    createdAt: serverTimestamp()
                }
            );


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
                    uid: currentUser.uid,
                    email: currentUser.email,
                    role: "owner",
                    joinedAt: serverTimestamp()
                }
            );


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
                    roomId,
                    roomName,
                    role: "owner",
                    joinedAt: serverTimestamp()
                }
            );


            if (roomForm) {
                roomForm.reset();
            }


            closeRoom();

            showToast(
                `Room created: ${roomId}`
            );


            await openRoom(roomId);

        } catch (error) {

            console.error(
                "Create room error:",
                error
            );


            if (roomMessage) {
                roomMessage.textContent =
                    "Could not create room.";
            }

        } finally {

            if (createRoomSubmit) {
                createRoomSubmit.disabled = false;
            }
        }
    }
);


// ======================================================
// LOAD MY ROOMS
// ======================================================

function stopRoomsListener() {

    if (unsubscribeRooms) {

        unsubscribeRooms();

        unsubscribeRooms = null;
    }
}


function loadMyRooms() {

    stopRoomsListener();


    if (!currentUser) {

        if (roomsList) {
            roomsList.innerHTML = "";
        }

        return;
    }


    const roomsRef =
        collection(
            db,
            "userRooms",
            currentUser.uid,
            "rooms"
        );


    unsubscribeRooms =
        onSnapshot(
            roomsRef,
            snapshot => {

                const rooms =
                    snapshot.docs.map(
                        item => ({
                            id: item.id,
                            ...item.data()
                        })
                    );


                renderRooms(rooms);

            },
            error => {

                console.error(
                    "Rooms listener error:",
                    error
                );

                showToast(
                    "Could not load rooms."
                );
            }
        );
}


// ======================================================
// RENDER ROOMS
// ======================================================

function renderRooms(rooms = []) {

    if (!roomsList) return;


    if (!currentUser) {

        roomsList.innerHTML = `
            <div class="empty-state">
                Login to see your rooms.
            </div>
        `;

        return;
    }


    if (!rooms.length) {

        roomsList.innerHTML = `
            <div class="empty-state">
                You haven't joined any room yet.
            </div>
        `;

        return;
    }


    roomsList.innerHTML =
        rooms.map(room => `

            <div
                class="room-card"
                data-room-id="${room.id}"
            >

                <div class="room-card-info">

                    <h3>
                        ${escapeHtml(room.roomName || "Unnamed Room")}
                    </h3>

                    <p>
                        Room Code:
                        <strong>
                            ${escapeHtml(room.id)}
                        </strong>
                    </p>

                    <span class="room-role">
                        ${escapeHtml(room.role || "member")}
                    </span>

                </div>

                <div class="room-card-actions">

                    <button
                        class="copy-room-code"
                        data-code="${escapeHtml(room.id)}"
                        type="button"
                    >
                        Copy Code
                    </button>

                    <button
                        class="open-room-btn"
                        data-room-id="${escapeHtml(room.id)}"
                        type="button"
                    >
                        Open
                    </button>

                </div>

            </div>

        `).join("");


    roomsList
        .querySelectorAll(".copy-room-code")
        .forEach(button => {

            button?.addEventListener(
                "click",
                async () => {

                    const code =
                        button.dataset.code;

                    await copyText(code);

                    showToast(
                        "Room code copied."
                    );
                }
            );
        });


    roomsList
        .querySelectorAll(".open-room-btn")
        .forEach(button => {

            button?.addEventListener(
                "click",
                async () => {

                    await openRoom(
                        button.dataset.roomId
                    );
                }
            );
        });
}


// ======================================================
// COPY TEXT
// ======================================================

async function copyText(text) {

    try {

        await navigator.clipboard.writeText(
            text
        );

    } catch {

        const textarea =
            document.createElement("textarea");

        textarea.value = text;

        document.body.appendChild(
            textarea
        );

        textarea.select();

        document.execCommand("copy");

        textarea.remove();
    }
}


copyRoomViewCode?.addEventListener(
    "click",
    async () => {

        if (!currentRoomId) return;

        await copyText(currentRoomId);

        showToast(
            "Room code copied."
        );
    }
);


// ======================================================
// JOIN ROOM MODAL
// ======================================================

function openJoinRoomModal() {

    if (!joinRoomModal) return;

    joinRoomModal.classList.add("active");

    joinRoomMessage &&
        (joinRoomMessage.textContent = "");

    joinRoomCodeInput?.focus();
}


function closeJoinRoom() {

    joinRoomModal?.classList.remove("active");
}


joinRoomBtn?.addEventListener(
    "click",
    () => {

        if (!requireLogin()) return;

        openJoinRoomModal();
    }
);


closeJoinRoomModal?.addEventListener(
    "click",
    closeJoinRoom
);


// ======================================================
// JOIN ROOM
// ======================================================

joinRoomForm?.addEventListener(
    "submit",
    async event => {

        event.preventDefault();


        if (!requireLogin()) return;


        const roomCode =
            joinRoomCodeInput?.value
                .trim()
                .toUpperCase();


        const roomPassword =
            joinRoomPasswordInput?.value;


        if (!roomCode || !roomPassword) {

            if (joinRoomMessage) {
                joinRoomMessage.textContent =
                    "Enter room code and password.";
            }

            return;
        }


        try {

            if (joinRoomSubmit) {
                joinRoomSubmit.disabled = true;
            }


            const roomRef =
                doc(
                    db,
                    "rooms",
                    roomCode
                );


            const roomDoc =
                await getDoc(roomRef);


            if (!roomDoc.exists()) {

                if (joinRoomMessage) {
                    joinRoomMessage.textContent =
                        "Room not found.";
                }

                return;
            }


            const roomData =
                roomDoc.data();


            const passwordHash =
                await hashRoomPassword(
                    roomPassword
                );


            if (
                roomData.passwordHash !==
                passwordHash
            ) {

                if (joinRoomMessage) {
                    joinRoomMessage.textContent =
                        "Incorrect room password.";
                }

                return;
            }


            const memberRef =
                doc(
                    db,
                    "rooms",
                    roomCode,
                    "members",
                    currentUser.uid
                );


            await setDoc(
                memberRef,
                {
                    uid: currentUser.uid,
                    email: currentUser.email,
                    role: "member",
                    joinedAt: serverTimestamp()
                },
                {
                    merge: true
                }
            );


            const userRoomRef =
                doc(
                    db,
                    "userRooms",
                    currentUser.uid,
                    "rooms",
                    roomCode
                );


            await setDoc(
                userRoomRef,
                {
                    roomId: roomCode,
                    roomName: roomData.name,
                    role: "member",
                    joinedAt: serverTimestamp()
                },
                {
                    merge: true
                }
            );


            if (joinRoomForm) {
                joinRoomForm.reset();
            }


            closeJoinRoom();

            showToast(
                `Joined ${roomCode}`
            );


            await openRoom(roomCode);

        } catch (error) {

            console.error(
                "Join room error:",
                error
            );


            if (joinRoomMessage) {
                joinRoomMessage.textContent =
                    "Could not join room.";
            }

        } finally {

            if (joinRoomSubmit) {
                joinRoomSubmit.disabled = false;
            }
        }
    }
);


// ======================================================
// ROOM STATE
// ======================================================

function stopRoomListeners() {

    if (unsubscribeRoomMembers) {

        unsubscribeRoomMembers();

        unsubscribeRoomMembers = null;
    }


    if (unsubscribeRoomTasks) {

        unsubscribeRoomTasks();

        unsubscribeRoomTasks = null;
    }
}


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


    if (roomRoleBadge) {
        roomRoleBadge.textContent = "";
    }


    if (membersList) {
        membersList.innerHTML = "";
    }


    if (sharedTasksList) {
        sharedTasksList.innerHTML = "";
    }


    if (memberCount) {
        memberCount.textContent = "0";
    }
}


function resetRoomState() {

    stopRoomListeners();

    currentRoomId = null;

    currentRoomData = null;

    currentRoomRole = null;

    clearRoomUI();
}


// ======================================================
// OPEN ROOM
// ======================================================

async function openRoom(roomId) {

    if (!requireLogin()) return;


    try {

        resetRoomState();


        const roomRef =
            doc(
                db,
                "rooms",
                roomId
            );


        const roomDoc =
            await getDoc(roomRef);


        if (!roomDoc.exists()) {

            showToast(
                "Room no longer exists."
            );

            return;
        }


        const roomData =
            roomDoc.data();


        const memberRef =
            doc(
                db,
                "rooms",
                roomId,
                "members",
                currentUser.uid
            );


        const memberDoc =
            await getDoc(memberRef);


        if (!memberDoc.exists()) {

            showToast(
                "You are not a member of this room."
            );

            return;
        }


        const memberData =
            memberDoc.data();


        currentRoomId =
            roomId;

        currentRoomData =
            roomData;

        currentRoomRole =
            memberData.role || "member";


        if (roomViewName) {
            roomViewName.textContent =
                roomData.name || "Room";
        }


        if (roomViewCode) {
            roomViewCode.textContent =
                roomId;
        }


        if (roomRoleBadge) {
            roomRoleBadge.textContent =
                currentRoomRole;
        }


        if (deleteRoomBtn) {

            deleteRoomBtn.style.display =
                currentRoomRole === "owner"
                    ? ""
                    : "none";
        }


        showPage("roomView");


        // Re-set room page active because showPage()
        // clears room state when leaving normal pages.
        roomViewPage?.classList.add("active");


        loadRoomMembers(roomId);

        loadSharedTasks(roomId);

    } catch (error) {

        console.error(
            "Open room error:",
            error
        );

        showToast(
            "Could not open room."
        );
    }
}


// ======================================================
// ROOM MEMBERS
// ======================================================

function loadRoomMembers(roomId) {

    if (!roomId) return;


    stopMemberListenerOnly();


    const membersRef =
        collection(
            db,
            "rooms",
            roomId,
            "members"
        );


    unsubscribeRoomMembers =
        onSnapshot(
            membersRef,
            snapshot => {

                const members =
                    snapshot.docs.map(
                        item => ({
                            id: item.id,
                            ...item.data()
                        })
                    );


                renderMembers(members);

            },
            error => {

                console.error(
                    "Members listener error:",
                    error
                );

                showToast(
                    "Could not load members."
                );
            }
        );
}


function stopMemberListenerOnly() {

    if (unsubscribeRoomMembers) {

        unsubscribeRoomMembers();

        unsubscribeRoomMembers = null;
    }
}


function renderMembers(members) {

    if (!membersList) return;


    if (memberCount) {
        memberCount.textContent =
            members.length;
    }


    if (!members.length) {

        membersList.innerHTML = `
            <div class="empty-state">
                No members.
            </div>
        `;

        return;
    }


    membersList.innerHTML =
        members.map(member => `

            <div class="member-item">

                <div class="member-avatar">
                    ${(member.email || "?")
                        .charAt(0)
                        .toUpperCase()}
                </div>

                <div class="member-info">

                    <strong>
                        ${escapeHtml(
                            member.email || "Unknown"
                        )}
                    </strong>

                    <span>
                        ${escapeHtml(
                            member.role || "member"
                        )}
                    </span>

                </div>

            </div>

        `).join("");
}


// ======================================================
// SHARED ROOM TASKS
// ======================================================

function loadSharedTasks(roomId) {

    if (!roomId) return;


    stopSharedTaskListenerOnly();


    const tasksRef =
        collection(
            db,
            "rooms",
            roomId,
            "tasks"
        );


    const q =
        query(
            tasksRef,
            orderBy("createdAt", "desc")
        );


    unsubscribeRoomTasks =
        onSnapshot(
            q,
            snapshot => {

                const tasks =
                    snapshot.docs.map(
                        item => ({
                            id: item.id,
                            ...item.data()
                        })
                    );


                renderSharedTasks(tasks);

            },
            error => {

                console.error(
                    "Shared task listener error:",
                    error
                );

                showToast(
                    "Could not load room tasks."
                );
            }
        );
}


function stopSharedTaskListenerOnly() {

    if (unsubscribeRoomTasks) {

        unsubscribeRoomTasks();

        unsubscribeRoomTasks = null;
    }
}


// ======================================================
// RENDER SHARED TASKS
// ======================================================

function renderSharedTasks(tasks) {

    if (!sharedTasksList) return;


    if (!tasks.length) {

        sharedTasksList.innerHTML = `
            <div class="empty-state">
                No shared tasks yet.
            </div>
        `;

        return;
    }


    sharedTasksList.innerHTML =
        tasks.map(task => `

            <div
                class="shared-task ${
                    task.completed
                        ? "completed"
                        : ""
                }"
                data-task-id="${task.id}"
            >

                <label class="task-check">

                    <input
                        type="checkbox"
                        class="shared-task-check"
                        data-id="${task.id}"
                        ${
                            task.completed
                                ? "checked"
                                : ""
                        }
                    >

                    <span></span>

                </label>


                <div class="task-content">

                    <div class="task-text">
                        ${escapeHtml(task.text)}
                    </div>

                    <div class="task-date">

                        ${escapeHtml(
                            task.createdByEmail || ""
                        )}

                        •
                        ${formatDate(
                            task.createdAt
                        )}

                    </div>

                </div>


                <button
                    type="button"
                    class="shared-task-delete"
                    data-id="${task.id}"
                >
                    ×
                </button>

            </div>

        `).join("");


    sharedTasksList
        .querySelectorAll(".shared-task-check")
        .forEach(input => {

            input?.addEventListener(
                "change",
                async () => {

                    await toggleSharedTask(
                        input.dataset.id,
                        input.checked
                    );
                }
            );
        });


    sharedTasksList
        .querySelectorAll(".shared-task-delete")
        .forEach(button => {

            button?.addEventListener(
                "click",
                async () => {

                    await deleteSharedTask(
                        button.dataset.id
                    );
                }
            );
        });
}


// ======================================================
// ADD SHARED TASK
// ======================================================

sharedTaskForm?.addEventListener(
    "submit",
    async event => {

        event.preventDefault();


        if (!requireLogin()) return;


        const roomId =
            currentRoomId;


        const text =
            sharedTaskInput?.value.trim();


        if (!roomId) {

            showToast(
                "No room selected."
            );

            return;
        }


        if (!text) return;


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
                    completed: false,
                    createdBy: currentUser.uid,
                    createdByEmail:
                        currentUser.email,
                    createdAt:
                        serverTimestamp()
                }
            );


            if (sharedTaskInput) {
                sharedTaskInput.value = "";
            }


            showToast(
                "Shared task added."
            );

        } catch (error) {

            console.error(
                "Shared task error:",
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

async function toggleSharedTask(
    taskId,
    completed
) {

    const roomId =
        currentRoomId;


    if (!roomId) return;


    try {

        await updateDoc(
            doc(
                db,
                "rooms",
                roomId,
                "tasks",
                taskId
            ),
            {
                completed
            }
        );

    } catch (error) {

        console.error(error);

        showToast(
            "Could not update shared task."
        );
    }
}


async function deleteSharedTask(taskId) {

    const roomId =
        currentRoomId;


    if (!roomId) return;


    try {

        await deleteDoc(
            doc(
                db,
                "rooms",
                roomId,
                "tasks",
                taskId
            )
        );

        showToast(
            "Shared task deleted."
        );

    } catch (error) {

        console.error(error);

        showToast(
            "Could not delete shared task."
        );
    }
}


// ======================================================
// LEAVE ROOM
// ======================================================

leaveRoomBtn?.addEventListener(
    "click",
    async () => {

        if (!currentRoomId || !currentUser) {
            return;
        }


        const roomId =
            currentRoomId;


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

        if (!currentRoomId || !currentUser) {
            return;
        }


        if (
            currentRoomRole !== "owner"
        ) {

            showToast(
                "Only the owner can delete the room."
            );

            return;
        }


        const roomId =
            currentRoomId;


        try {

            // Delete room tasks
            const tasksSnapshot =
                await getDocs(
                    collection(
                        db,
                        "rooms",
                        roomId,
                        "tasks"
                    )
                );


            for (
                const taskDoc
                of tasksSnapshot.docs
            ) {

                await deleteDoc(
                    taskDoc.ref
                );
            }


            // Delete room members
            const membersSnapshot =
                await getDocs(
                    collection(
                        db,
                        "rooms",
                        roomId,
                        "members"
                    )
                );


            for (
                const memberDoc
                of membersSnapshot.docs
            ) {

                await deleteDoc(
                    memberDoc.ref
                );
            }


            // Delete user room reference
            const userRoomRef =
                doc(
                    db,
                    "userRooms",
                    currentUser.uid,
                    "rooms",
                    roomId
                );


            await deleteDoc(
                userRoomRef
            );


            // Delete room itself
            await deleteDoc(
                doc(
                    db,
                    "rooms",
                    roomId
                )
            );


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
// BACK TO ROOMS
// ======================================================

backToRoomsBtn?.addEventListener(
    "click",
    () => {

        resetRoomState();

        showPage("rooms");
    }
);


// ======================================================
// AUTH STATE
// ======================================================

onAuthStateChanged(
    auth,
    user => {

        currentUser =
            user;


        updateAuthButton();


        if (user) {

            loadPersonalTasks(user);

            loadMyRooms();

        } else {

            loadPersonalTasks(null);

            stopRoomsListener();

            if (roomsList) {

                roomsList.innerHTML = `
                    <div class="empty-state">
                        Login to see your rooms.
                    </div>
                `;
            }
        }


        updateDashboard();
    }
);


// ======================================================
// MODAL OUTSIDE CLICK
// ======================================================

authModal?.addEventListener(
    "click",
    event => {

        if (event.target === authModal) {
            closeAuth();
        }
    }
);


roomModal?.addEventListener(
    "click",
    event => {

        if (event.target === roomModal) {
            closeRoom();
        }
    }
);


joinRoomModal?.addEventListener(
    "click",
    event => {

        if (event.target === joinRoomModal) {
            closeJoinRoom();
        }
    }
);


// ======================================================
// ESCAPE KEY
// ======================================================

document.addEventListener(
    "keydown",
    event => {

        if (event.key !== "Escape") {
            return;
        }


        closeAuth();

        closeRoom();

        closeJoinRoom();
    }
);


// ======================================================
// START
// ======================================================

loadPersonalTasks(null);

updateDashboard();

renderRooms();

showPage("tasks");
