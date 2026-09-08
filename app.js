// ======================================================
// TASKROOM - APP.JS
// ======================================================

// ======================================================
// FIREBASE IMPORTS
// ======================================================

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
// DOM
// ======================================================

// Navigation
const navItems =
    document.querySelectorAll(".nav-item");

// Header
const themeToggle =
    document.getElementById("themeToggle");

const authButton =
    document.getElementById("authButton");


// Pages
const dashboardPage =
    document.getElementById("dashboardPage");

const tasksPage =
    document.getElementById("tasksPage");

const roomsPage =
    document.getElementById("roomsPage");

const roomViewPage =
    document.getElementById("roomViewPage");

const activityPage =
    document.getElementById("activityPage");


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


// Personal tasks
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


// Room view
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


// Auth modal
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


// Create room modal
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


// Join room modal
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
// STATE
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
// TOAST
// ======================================================

function showToast(message) {

    if (!toast) return;

    toast.textContent = message;

    toast.classList.add("show");

    setTimeout(() => {
        toast.classList.remove("show");
    }, 2500);
}


// ======================================================
// HTML ESCAPE
// ======================================================

function escapeHtml(value) {

    const div =
        document.createElement("div");

    div.textContent =
        value ?? "";

    return div.innerHTML;
}


// ======================================================
// DATE
// ======================================================

function formatDate(timestamp) {

    if (!timestamp) {
        return "Just now";
    }

    let date;

    try {

        if (
            timestamp &&
            typeof timestamp.toDate === "function"
        ) {
            date =
                timestamp.toDate();
        } else {
            date =
                new Date(timestamp);
        }

        if (isNaN(date.getTime())) {
            return "Just now";
        }

        return date.toLocaleString();

    } catch {

        return "Just now";
    }
}


// ======================================================
// THEME
// ======================================================

function loadTheme() {

    const savedTheme =
        localStorage.getItem(
            "taskroom-theme"
        );

    if (savedTheme === "dark") {

        document.body.classList.add("dark");

    } else {

        document.body.classList.remove("dark");
    }
}

loadTheme();


themeToggle?.addEventListener(
    "click",
    () => {

        document.body.classList.toggle("dark");

        localStorage.setItem(
            "taskroom-theme",
            document.body.classList.contains("dark")
                ? "dark"
                : "light"
        );
    }
);


// ======================================================
// LOGIN CHECK
// ======================================================

function requireLogin() {

    if (!currentUser) {

        openAuthModal();

        showToast(
            "Please login first."
        );

        return false;
    }

    return true;
}


// ======================================================
// AUTH BUTTON
// ======================================================

function updateAuthButton() {

    if (!authButton) return;

    authButton.textContent =
        currentUser
            ? "Logout"
            : "Login";
}


authButton?.addEventListener(
    "click",
    async () => {

        if (!currentUser) {

            openAuthModal();

            return;
        }

        try {

            await signOut(auth);

            showToast(
                "Logged out successfully."
            );

        } catch (error) {

            console.error(error);

            showToast(
                "Logout failed."
            );
        }
    }
);


// ======================================================
// PAGE NAVIGATION
// ======================================================

function showPage(pageName) {

    const pages = {

        dashboard:
            dashboardPage,

        tasks:
            tasksPage,

        rooms:
            roomsPage,

        activity:
            activityPage,

        roomView:
            roomViewPage
    };


    // Hide everything
    Object.values(pages)
        .forEach(page => {

            if (!page) return;

            page.classList.remove(
                "active-page"
            );

            page.classList.remove(
                "active"
            );
        });


    // Show selected page
    const selectedPage =
        pages[pageName];


    if (selectedPage) {

        selectedPage.classList.add(
            "active-page"
        );
    }


    // Navbar
    navItems.forEach(item => {

        item.classList.toggle(
            "active",
            item.dataset.page === pageName
        );
    });


    // Leaving room
    if (
        pageName !== "roomView" &&
        currentRoomId
    ) {

        resetRoomState();
    }
}


// ======================================================
// NAVIGATION CLICK
// ======================================================

navItems.forEach(item => {

    item.addEventListener(
        "click",
        () => {

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
        }
    );
});


// ======================================================
// DASHBOARD QUICK BUTTONS
// ======================================================

dashboardTasksBtn?.addEventListener(
    "click",
    () => {

        if (!requireLogin()) return;

        showPage("tasks");
    }
);


quickAddTask?.addEventListener(
    "click",
    () => {

        if (!requireLogin()) return;

        showPage("tasks");

        setTimeout(() => {
            taskInput?.focus();
        }, 100);
    }
);


quickCreateRoom?.addEventListener(
    "click",
    () => {

        if (!requireLogin()) return;

        openRoomModal();
    }
);


quickJoinRoom?.addEventListener(
    "click",
    () => {

        if (!requireLogin()) return;

        openJoinRoomModal();
    }
);


// ======================================================
// GUEST TASKS
// ======================================================

const GUEST_TASK_KEY =
    "taskroom-guest-tasks";


function getGuestTasks() {

    try {

        return JSON.parse(
            localStorage.getItem(
                GUEST_TASK_KEY
            )
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
// ADD PERSONAL TASK
// ======================================================

async function addPersonalTask(text) {

    if (!text.trim()) return;


    // Guest
    if (!currentUser) {

        const tasks =
            getGuestTasks();

        tasks.unshift({

            id:
                Date.now().toString(),

            text:
                text.trim(),

            completed:
                false,

            createdAt:
                Date.now()
        });


        saveGuestTasks(tasks);

        personalTasks =
            tasks;

        renderPersonalTasks();

        updateDashboard();

        showToast(
            "Task added."
        );

        return;
    }


    // Firebase
    try {

        await addDoc(
            collection(
                db,
                "users",
                currentUser.uid,
                "tasks"
            ),
            {
                text:
                    text.trim(),

                completed:
                    false,

                createdAt:
                    serverTimestamp()
            }
        );

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


// ======================================================
// PERSONAL TASK FORM
// ======================================================

taskForm?.addEventListener(
    "submit",
    async event => {

        event.preventDefault();

        const text =
            taskInput?.value.trim();

        if (!text) return;

        await addPersonalTask(text);

        if (taskInput) {
            taskInput.value = "";
        }
    }
);


// ======================================================
// PERSONAL TASK LISTENER
// ======================================================

function stopPersonalTaskListener() {

    if (
        typeof unsubscribePersonalTasks ===
        "function"
    ) {

        unsubscribePersonalTasks();

        unsubscribePersonalTasks =
            null;
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


    const tasksQuery =
        query(
            tasksRef,
            orderBy(
                "createdAt",
                "desc"
            )
        );


    unsubscribePersonalTasks =
        onSnapshot(
            tasksQuery,

            snapshot => {

                personalTasks =
                    snapshot.docs.map(
                        item => ({
                            id:
                                item.id,

                            ...item.data()
                        })
                    );


                renderPersonalTasks();

                updateDashboard();
            },

            error => {

                console.error(
                    "Personal task listener:",
                    error
                );

                showToast(
                    "Could not load your tasks."
                );
            }
        );
}


// ======================================================
// FILTER
// ======================================================

function getFilteredTasks() {

    if (
        currentFilter ===
        "active"
    ) {

        return personalTasks.filter(
            task => !task.completed
        );
    }


    if (
        currentFilter ===
        "completed"
    ) {

        return personalTasks.filter(
            task => task.completed
        );
    }


    return personalTasks;
}


// ======================================================
// RENDER PERSONAL TASKS
// ======================================================

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
                class="task-item ${
                    task.completed
                        ? "completed"
                        : ""
                }"
                data-task-id="${escapeHtml(task.id)}"
            >

                <label class="task-check">

                    <input
                        type="checkbox"
                        class="personal-task-check"
                        data-id="${escapeHtml(task.id)}"
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
                        ${formatDate(
                            task.createdAt
                        )}
                    </div>

                </div>


                <button
                    class="task-delete"
                    data-id="${escapeHtml(task.id)}"
                    type="button"
                >
                    ×
                </button>

            </div>

        `).join("");


    // Checkbox
    tasksList
        .querySelectorAll(
            ".personal-task-check"
        )
        .forEach(input => {

            input.addEventListener(
                "change",
                async () => {

                    await togglePersonalTask(
                        input.dataset.id,
                        input.checked
                    );
                }
            );
        });


    // Delete
    tasksList
        .querySelectorAll(
            ".task-delete"
        )
        .forEach(button => {

            button.addEventListener(
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
// TOGGLE PERSONAL TASK
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
                item =>
                    item.id === taskId
            );

        if (!task) return;

        task.completed =
            completed;

        saveGuestTasks(tasks);

        personalTasks =
            tasks;

        renderPersonalTasks();

        updateDashboard();

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


// ======================================================
// DELETE PERSONAL TASK
// ======================================================

async function deletePersonalTask(
    taskId
) {

    if (!currentUser) {

        const tasks =
            getGuestTasks();

        const filtered =
            tasks.filter(
                task =>
                    task.id !== taskId
            );

        saveGuestTasks(
            filtered
        );

        personalTasks =
            filtered;

        renderPersonalTasks();

        updateDashboard();

        showToast(
            "Task deleted."
        );

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

        showToast(
            "Task deleted."
        );

    } catch (error) {

        console.error(error);

        showToast(
            "Could not delete task."
        );
    }
}


// ======================================================
// FILTER BUTTONS
// ======================================================

filterButtons.forEach(button => {

    button.addEventListener(
        "click",
        () => {

            filterButtons.forEach(
                item => {
                    item.classList.remove(
                        "active"
                    );
                }
            );

            button.classList.add(
                "active"
            );

            currentFilter =
                button.dataset.filter ||
                "all";

            renderPersonalTasks();
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
        totalTasks.textContent =
            total;
    }

    if (activeTasks) {
        activeTasks.textContent =
            active;
    }

    if (completedTasks) {
        completedTasks.textContent =
            completed;
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

            dashboardGreeting.textContent =
                `Welcome back, ${
                    currentUser.email || ""
                }`;

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

        cloudStatus.classList.toggle(
            "connected",
            !!currentUser
        );
    }


    renderRecentTasks();
}


// ======================================================
// RECENT TASKS
// ======================================================

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

            <div class="recent-task">

                <span>
                    ${escapeHtml(
                        task.text
                    )}
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

    authModal.classList.remove(
        "hidden"
    );

    authModal.classList.add(
        "active"
    );

    if (authMessage) {
        authMessage.textContent = "";
    }

    updateAuthModeUI();

    setTimeout(() => {
        emailInput?.focus();
    }, 100);
}


function closeAuth() {

    if (!authModal) return;

    authModal.classList.remove(
        "active"
    );

    authModal.classList.add(
        "hidden"
    );
}


closeAuthModal?.addEventListener(
    "click",
    closeAuth
);


// ======================================================
// AUTH MODE
// ======================================================

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


// ======================================================
// AUTH FORM
// ======================================================

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

            if (authSubmit) {
                authSubmit.disabled = true;
            }


            // ==================================================
            // LOGIN
            // ==================================================

            if (authMode === "login") {

                const result =
                    await signInWithEmailAndPassword(
                        auth,
                        email,
                        password
                    );

                // Refresh user data so emailVerified is current
                await result.user.reload();

                if (!result.user.emailVerified) {

                    await signOut(auth);

                    if (authMessage) {
                        authMessage.textContent =
                            "Please verify your email before logging in.";
                    }

                    return;
                }

                showToast(
                    "Login successful."
                );

                closeAuth();

                authForm.reset();

                return;
            }


            // ==================================================
            // SIGN UP
            // ==================================================

            const result =
                await createUserWithEmailAndPassword(
                    auth,
                    email,
                    password
                );


            // Send verification email
            await sendEmailVerification(
                result.user
            );


            // IMPORTANT:
            // Firebase automatically signs the new user in.
            // Sign out immediately so unverified users
            // cannot enter TaskRoom.

            await signOut(auth);


            if (authMessage) {
                authMessage.textContent =
                    "Verification email sent. Please verify your email before logging in.";
            }


            showToast(
                "Verification email sent."
            );


            authForm.reset();

            // Switch back to login mode
            authMode = "login";

            updateAuthModeUI();


        } catch (error) {

            console.error(
                "Auth error:",
                error
            );


            let message =
                "Authentication failed.";


            switch (error.code) {

                case "auth/invalid-credential":
                    message =
                        "Invalid email or password.";
                    break;

                case "auth/email-already-in-use":
                    message =
                        "Email already in use.";
                    break;

                case "auth/weak-password":
                    message =
                        "Password is too weak.";
                    break;

                case "auth/invalid-email":
                    message =
                        "Invalid email address.";
                    break;

                case "auth/user-not-found":
                    message =
                        "Account not found.";
                    break;

                default:
                    message =
                        error.message ||
                        "Authentication failed.";
            }


            if (authMessage) {
                authMessage.textContent =
                    message;
            }

        } finally {

            if (authSubmit) {
                authSubmit.disabled = false;
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


    for (
        let i = 0;
        i < 5;
        i++
    ) {

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

    for (
        let attempt = 0;
        attempt < 10;
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

        const existing =
            await getDoc(roomRef);


        if (!existing.exists()) {
            return roomId;
        }
    }


    throw new Error(
        "Could not generate unique room code."
    );
}


// ======================================================
// ROOM PASSWORD HASH
// ======================================================

async function hashRoomPassword(
    password
) {

    const data =
        new TextEncoder()
            .encode(password);

    const hashBuffer =
        await crypto.subtle.digest(
            "SHA-256",
            data
        );

    return Array.from(
        new Uint8Array(hashBuffer)
    )
        .map(byte =>
            byte
                .toString(16)
                .padStart(2, "0")
        )
        .join("");
}


// ======================================================
// CREATE ROOM MODAL
// ======================================================

function openRoomModal() {

    if (!roomModal) return;

    roomModal.classList.remove(
        "hidden"
    );

    roomModal.classList.add(
        "active"
    );

    if (roomMessage) {
        roomMessage.textContent = "";
    }

    setTimeout(() => {
        roomNameInput?.focus();
    }, 100);
}


function closeRoom() {

    if (!roomModal) return;

    roomModal.classList.remove(
        "active"
    );

    roomModal.classList.add(
        "hidden"
    );
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


        if (!requireLogin()) {
            return;
        }


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


            // Room document
            await setDoc(
                doc(
                    db,
                    "rooms",
                    roomId
                ),
                {
                    name:
                        roomName,

                    ownerId:
                        currentUser.uid,

                    ownerEmail:
                        currentUser.email,

                    passwordHash,

                    createdAt:
                        serverTimestamp()
                }
            );


            // Owner member
            await setDoc(
                doc(
                    db,
                    "rooms",
                    roomId,
                    "members",
                    currentUser.uid
                ),
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


            // User room reference
            await setDoc(
                doc(
                    db,
                    "userRooms",
                    currentUser.uid,
                    "rooms",
                    roomId
                ),
                {
                    roomId,

                    roomName,

                    role:
                        "owner",

                    joinedAt:
                        serverTimestamp()
                }
            );


            roomForm?.reset();

            closeRoom();


            showToast(
                `Room created: ${roomId}`
            );


            await openRoom(
                roomId
            );

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

    if (
        typeof unsubscribeRooms ===
        "function"
    ) {

        unsubscribeRooms();

        unsubscribeRooms = null;
    }
}


function loadMyRooms() {

    stopRoomsListener();


    if (!currentUser) {

        renderRooms([]);

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
                            id:
                                item.id,

                            ...item.data()
                        })
                    );

                renderRooms(
                    rooms
                );
            },

            error => {

                console.error(
                    "Rooms listener:",
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

function renderRooms(
    rooms = []
) {

    if (!roomsList) return;


    if (!currentUser) {

        roomsList.innerHTML = `
            <div class="rooms-empty">

                <h2>Login required</h2>

                <p>
                    Login to create and manage
                    your TaskRoom rooms.
                </p>

            </div>
        `;

        return;
    }


    if (!rooms.length) {

        roomsList.innerHTML = `
            <div class="rooms-empty">

                <h2>No rooms yet</h2>

                <p>
                    Create a new room or join
                    an existing room using its code.
                </p>

                <div class="empty-actions">

                    <button
                        type="button"
                        class="primary-btn"
                        id="emptyCreateRoom"
                    >
                        Create Room
                    </button>

                    <button
                        type="button"
                        class="secondary-btn"
                        id="emptyJoinRoom"
                    >
                        Join Room
                    </button>

                </div>

            </div>
        `;


        document
            .getElementById(
                "emptyCreateRoom"
            )
            ?.addEventListener(
                "click",
                openRoomModal
            );


        document
            .getElementById(
                "emptyJoinRoom"
            )
            ?.addEventListener(
                "click",
                openJoinRoomModal
            );

        return;
    }


    roomsList.innerHTML =
        rooms.map(room => `

            <div
                class="room-card"
                data-room-id="${escapeHtml(
                    room.id
                )}"
            >

                <h3>
                    ${escapeHtml(
                        room.roomName ||
                        "Unnamed Room"
                    )}
                </h3>

                <p>
                    Room Code:
                    <strong>
                        ${escapeHtml(
                            room.id
                        )}
                    </strong>
                </p>

                <span class="room-role">
                    ${escapeHtml(
                        room.role ||
                        "member"
                    )}
                </span>

                <div class="room-card-actions">

                    <button
                        type="button"
                        class="secondary-btn copy-room-code"
                        data-code="${escapeHtml(
                            room.id
                        )}"
                    >
                        Copy Code
                    </button>

                    <button
                        type="button"
                        class="primary-btn open-room-btn"
                        data-room-id="${escapeHtml(
                            room.id
                        )}"
                    >
                        Open
                    </button>

                </div>

            </div>

        `).join("");


    // Copy
    roomsList
        .querySelectorAll(
            ".copy-room-code"
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


    // Open
    roomsList
        .querySelectorAll(
            ".open-room-btn"
        )
        .forEach(button => {

            button.addEventListener(
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
// COPY
// ======================================================

async function copyText(text) {

    try {

        if (
            navigator.clipboard &&
            window.isSecureContext
        ) {

            await navigator.clipboard
                .writeText(text);

            return;
        }

    } catch {
        // fallback below
    }


    const textarea =
        document.createElement(
            "textarea"
        );

    textarea.value = text;

    textarea.style.position =
        "fixed";

    textarea.style.opacity =
        "0";

    document.body.appendChild(
        textarea
    );

    textarea.focus();

    textarea.select();

    try {
        document.execCommand("copy");
    } catch {
        // ignored
    }

    textarea.remove();
}


copyRoomViewCode?.addEventListener(
    "click",
    async () => {

        if (!currentRoomId) return;

        await copyText(
            currentRoomId
        );

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

    joinRoomModal.classList.remove(
        "hidden"
    );

    joinRoomModal.classList.add(
        "active"
    );

    if (joinRoomMessage) {
        joinRoomMessage.textContent = "";
    }

    setTimeout(() => {
        joinRoomCodeInput?.focus();
    }, 100);
}


function closeJoinRoom() {

    if (!joinRoomModal) return;

    joinRoomModal.classList.remove(
        "active"
    );

    joinRoomModal.classList.add(
        "hidden"
    );
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


        if (!requireLogin()) {
            return;
        }


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
                await getDoc(
                    roomRef
                );


            if (!roomDoc.exists()) {

                if (joinRoomMessage) {
                    joinRoomMessage.textContent =
                        "Room not found.";
                }

                return;
            }


            const roomData =
                roomDoc.data();


            // Legacy room detection
            if (
                !roomData.passwordHash
            ) {

                if (joinRoomMessage) {
                    joinRoomMessage.textContent =
                        "This is an old room. Please create a new room.";
                }

                return;
            }


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


            // Add member
            await setDoc(
                doc(
                    db,
                    "rooms",
                    roomCode,
                    "members",
                    currentUser.uid
                ),
                {
                    uid:
                        currentUser.uid,

                    email:
                        currentUser.email,

                    role:
                        "member",

                    joinedAt:
                        serverTimestamp()
                },
                {
                    merge: true
                }
            );


            // Add room to user's list
            await setDoc(
                doc(
                    db,
                    "userRooms",
                    currentUser.uid,
                    "rooms",
                    roomCode
                ),
                {
                    roomId:
                        roomCode,

                    roomName:
                        roomData.name,

                    role:
                        "member",

                    joinedAt:
                        serverTimestamp()
                },
                {
                    merge: true
                }
            );


            joinRoomForm?.reset();

            closeJoinRoom();


            showToast(
                `Joined ${roomCode}`
            );


            await openRoom(
                roomCode
            );

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

    if (
        typeof unsubscribeRoomMembers ===
        "function"
    ) {

        unsubscribeRoomMembers();

        unsubscribeRoomMembers =
            null;
    }


    if (
        typeof unsubscribeRoomTasks ===
        "function"
    ) {

        unsubscribeRoomTasks();

        unsubscribeRoomTasks =
            null;
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

    if (deleteRoomBtn) {
        deleteRoomBtn.style.display = "";
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

    if (!requireLogin()) {
        return;
    }


    if (!roomId) {
        showToast(
            "Invalid room."
        );

        return;
    }


    try {

        // Stop previous room listeners
        stopRoomListeners();

        // Clear previous room input
        clearRoomUI();

        currentRoomId = null;
        currentRoomData = null;
        currentRoomRole = null;


        const roomRef =
            doc(
                db,
                "rooms",
                roomId
            );


        const roomDoc =
            await getDoc(
                roomRef
            );


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
            await getDoc(
                memberRef
            );


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
            memberData.role ||
            "member";


        if (roomViewName) {
            roomViewName.textContent =
                roomData.name ||
                "Room";
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


        // IMPORTANT
        showPage("roomView");


        loadRoomMembers(
            roomId
        );

        loadSharedTasks(
            roomId
        );


        // Focus shared input
        setTimeout(() => {
            sharedTaskInput?.focus();
        }, 100);


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
                            id:
                                item.id,

                            ...item.data()
                        })
                    );


                renderMembers(
                    members
                );
            },

            error => {

                console.error(
                    "Members error:",
                    error
                );

                showToast(
                    "Could not load members."
                );
            }
        );
}


function stopMemberListenerOnly() {

    if (
        typeof unsubscribeRoomMembers ===
        "function"
    ) {

        unsubscribeRoomMembers();

        unsubscribeRoomMembers =
            null;
    }
}


// ======================================================
// RENDER MEMBERS
// ======================================================

function renderMembers(
    members
) {

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
        members.map(member => {

            const email =
                member.email ||
                "Unknown";

            const initial =
                email
                    .charAt(0)
                    .toUpperCase();


            return `

                <div class="member-item">

                    <div class="member-avatar">
                        ${escapeHtml(
                            initial
                        )}
                    </div>

                    <div class="member-info">

                        <strong>
                            ${escapeHtml(
                                email
                            )}
                        </strong>

                        <span>
                            ${escapeHtml(
                                member.role ||
                                "member"
                            )}
                        </span>

                    </div>

                </div>

            `;
        }).join("");
}


// ======================================================
// SHARED TASKS LISTENER
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


    const tasksQuery =
        query(
            tasksRef,
            orderBy(
                "createdAt",
                "desc"
            )
        );


    unsubscribeRoomTasks =
        onSnapshot(
            tasksQuery,

            snapshot => {

                const tasks =
                    snapshot.docs.map(
                        item => ({
                            id:
                                item.id,

                            ...item.data()
                        })
                    );


                renderSharedTasks(
                    tasks
                );
            },

            error => {

                console.error(
                    "Room tasks error:",
                    error
                );

                showToast(
                    "Could not load room tasks."
                );
            }
        );
}


function stopSharedTaskListenerOnly() {

    if (
        typeof unsubscribeRoomTasks ===
        "function"
    ) {

        unsubscribeRoomTasks();

        unsubscribeRoomTasks =
            null;
    }
}


// ======================================================
// RENDER SHARED TASKS
// ======================================================

function renderSharedTasks(
    tasks
) {

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
                data-task-id="${escapeHtml(
                    task.id
                )}"
            >

                <label class="task-check">

                    <input
                        type="checkbox"
                        class="shared-task-check"
                        data-id="${escapeHtml(
                            task.id
                        )}"
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
                        ${escapeHtml(
                            task.text
                        )}
                    </div>

                    <div class="task-date">

                        ${escapeHtml(
                            task.createdByEmail ||
                            ""
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
                    data-id="${escapeHtml(
                        task.id
                    )}"
                >
                    ×
                </button>

            </div>

        `).join("");


    // Checkbox
    sharedTasksList
        .querySelectorAll(
            ".shared-task-check"
        )
        .forEach(input => {

            input.addEventListener(
                "change",
                async () => {

                    await toggleSharedTask(
                        input.dataset.id,
                        input.checked
                    );
                }
            );
        });


    // Delete
    sharedTasksList
        .querySelectorAll(
            ".shared-task-delete"
        )
        .forEach(button => {

            button.addEventListener(
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


        if (!requireLogin()) {
            return;
        }


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

        console.error(
            "Toggle shared task:",
            error
        );

        showToast(
            "Could not update shared task."
        );
    }
}


async function deleteSharedTask(
    taskId
) {

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

        console.error(
            "Delete shared task:",
            error
        );

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

        if (
            !currentRoomId ||
            !currentUser
        ) {
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
                "Leave room:",
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
            !currentRoomId ||
            !currentUser
        ) {
            return;
        }


        if (
            currentRoomRole !==
            "owner"
        ) {

            showToast(
                "Only the owner can delete the room."
            );

            return;
        }


        const confirmed =
            window.confirm(
                "Delete this room permanently?"
            );


        if (!confirmed) {
            return;
        }


        const roomId =
            currentRoomId;


        try {

            // Tasks
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


            // Members
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


            // Current owner's reference
            await deleteDoc(
                doc(
                    db,
                    "userRooms",
                    currentUser.uid,
                    "rooms",
                    roomId
                )
            );


            // Room
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
                "Delete room:",
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
    async user => {

        // --------------------------------------------------
        // BLOCK UNVERIFIED USERS
        // --------------------------------------------------

        if (user && !user.emailVerified) {

            currentUser = null;

            stopPersonalTaskListener();
            stopRoomsListener();

            try {

                await signOut(auth);

            } catch (error) {

                console.error(
                    "Unverified user sign out error:",
                    error
                );
            }


            updateAuthButton();

            loadPersonalTasks(null);

            renderRooms([]);

            updateDashboard();

            return;
        }


        // --------------------------------------------------
        // VERIFIED USER / LOGGED OUT
        // --------------------------------------------------

        currentUser =
            user;


        updateAuthButton();


        if (user) {

            loadPersonalTasks(
                user
            );

            loadMyRooms();

        } else {

            loadPersonalTasks(
                null
            );

            stopRoomsListener();

            renderRooms([]);
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

        if (
            event.target ===
            authModal
        ) {

            closeAuth();
        }
    }
);


roomModal?.addEventListener(
    "click",
    event => {

        if (
            event.target ===
            roomModal
        ) {

            closeRoom();
        }
    }
);


joinRoomModal?.addEventListener(
    "click",
    event => {

        if (
            event.target ===
            joinRoomModal
        ) {

            closeJoinRoom();
        }
    }
);


// ======================================================
// ESCAPE
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

        closeAuth();

        closeRoom();

        closeJoinRoom();
    }
);


// ======================================================
// INITIAL START
// ======================================================

loadTheme();

loadPersonalTasks(null);

updateDashboard();

showPage("tasks");
