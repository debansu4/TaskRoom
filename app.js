import {
    createUserWithEmailAndPassword,
    signInWithEmailAndPassword,
    sendEmailVerification,
    signOut,
    onAuthStateChanged
} from "https://www.gstatic.com/firebasejs/12.18.0/firebase-auth.js";


import {
    auth
} from "./firebase.js";


// ========================================
// ELEMENTS
// ========================================

const taskInput =
    document.getElementById("taskInput");

const addTaskBtn =
    document.getElementById("addTaskBtn");

const taskList =
    document.getElementById("taskList");

const taskCount =
    document.getElementById("taskCount");

const filterButtons =
    document.querySelectorAll(".filter");


const themeBtn =
    document.getElementById("themeBtn");


const loginBtn =
    document.getElementById("loginBtn");

const loginStatus =
    document.getElementById("loginStatus");


const authModal =
    document.getElementById("authModal");

const closeAuth =
    document.getElementById("closeAuth");


const authForm =
    document.getElementById("authForm");

const emailInput =
    document.getElementById("emailInput");

const passwordInput =
    document.getElementById("passwordInput");

const authTitle =
    document.getElementById("authTitle");

const authSubtitle =
    document.getElementById("authSubtitle");

const authSubmit =
    document.getElementById("authSubmit");

const switchAuth =
    document.getElementById("switchAuth");

const authMessage =
    document.getElementById("authMessage");


// ========================================
// VARIABLES
// ========================================

let tasks =
    JSON.parse(
        localStorage.getItem("taskroom_tasks")
    ) || [];


let currentFilter = "all";

let authMode = "login";


// ========================================
// TASK STORAGE
// ========================================

function saveTasks() {

    localStorage.setItem(
        "taskroom_tasks",
        JSON.stringify(tasks)
    );

}


// ========================================
// TASK COUNT
// ========================================

function updateTaskCount() {

    const total = tasks.length;

    const completed =
        tasks.filter(
            task => task.completed
        ).length;

    const active =
        total - completed;


    if (currentFilter === "active") {

        taskCount.textContent =
            `${active} active`;

    } else if (currentFilter === "completed") {

        taskCount.textContent =
            `${completed} completed`;

    } else {

        taskCount.textContent =
            `${total} ${
                total === 1
                    ? "task"
                    : "tasks"
            }`;

    }

}


// ========================================
// RENDER TASKS
// ========================================

function renderTasks() {

    taskList.innerHTML = "";


    let filteredTasks =
        [...tasks];


    if (currentFilter === "active") {

        filteredTasks =
            tasks.filter(
                task => !task.completed
            );

    }


    if (currentFilter === "completed") {

        filteredTasks =
            tasks.filter(
                task => task.completed
            );

    }


    updateTaskCount();


    if (filteredTasks.length === 0) {

        taskList.innerHTML = `

            <div class="empty-state">

                <div class="empty-icon">
                    ✓
                </div>

                <h3>
                    No tasks here
                </h3>

                <p>
                    Add a new task to get started.
                </p>

            </div>

        `;

        return;

    }


    filteredTasks.forEach(task => {

        const element =
            document.createElement("div");


        element.className =
            "task-item" +
            (
                task.completed
                    ? " completed"
                    : ""
            );


        element.innerHTML = `

            <div class="task-left">

                <button
                    class="check-btn"
                    data-id="${task.id}"
                    type="button"
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

            </div>


            <button
                class="delete-btn"
                data-delete="${task.id}"
                type="button"
            >
                ×
            </button>

        `;


        taskList.appendChild(element);

    });

}


// ========================================
// ADD TASK
// ========================================

function addTask() {

    const text =
        taskInput.value.trim();


    if (!text) {

        taskInput.focus();

        return;

    }


    const task = {

        id:
            Date.now().toString() +
            Math.random()
                .toString(36)
                .slice(2),

        text,

        completed: false,

        createdAt:
            new Date().toISOString()

    };


    tasks.unshift(task);


    saveTasks();


    taskInput.value = "";


    renderTasks();


    taskInput.focus();

}


addTaskBtn.addEventListener(
    "click",
    addTask
);


taskInput.addEventListener(
    "keydown",
    event => {

        if (event.key === "Enter") {

            addTask();

        }

    }
);


// ========================================
// TASK ACTIONS
// ========================================

taskList.addEventListener(
    "click",
    event => {

        const checkBtn =
            event.target.closest(
                ".check-btn"
            );


        const deleteBtn =
            event.target.closest(
                ".delete-btn"
            );


        if (checkBtn) {

            const id =
                checkBtn.dataset.id;


            tasks =
                tasks.map(task => {

                    if (task.id === id) {

                        return {
                            ...task,
                            completed:
                                !task.completed
                        };

                    }

                    return task;

                });


            saveTasks();

            renderTasks();

        }


        if (deleteBtn) {

            const id =
                deleteBtn.dataset.delete;


            tasks =
                tasks.filter(
                    task => task.id !== id
                );


            saveTasks();

            renderTasks();

        }

    }
);


// ========================================
// FILTER
// ========================================

filterButtons.forEach(button => {

    button.addEventListener(
        "click",
        () => {

            filterButtons.forEach(
                btn =>
                    btn.classList.remove(
                        "active"
                    )
            );


            button.classList.add(
                "active"
            );


            currentFilter =
                button.dataset.filter;


            renderTasks();

        }
    );

});


// ========================================
// AUTH MODAL
// ========================================

function openAuth(mode) {

    authMode = mode;


    authModal.classList.remove(
        "hidden"
    );


    emailInput.value = "";

    passwordInput.value = "";

    authMessage.textContent = "";

    authMessage.style.color = "";


    if (mode === "login") {

        authTitle.textContent =
            "Welcome Back";

        authSubtitle.textContent =
            "Login to your TaskRoom account";

        authSubmit.textContent =
            "Login";

        passwordInput.autocomplete =
            "current-password";

        switchAuth.textContent =
            "Don't have an account? Sign Up";

    } else {

        authTitle.textContent =
            "Create Account";

        authSubtitle.textContent =
            "Create your TaskRoom account";

        authSubmit.textContent =
            "Sign Up";

        passwordInput.autocomplete =
            "new-password";

        switchAuth.textContent =
            "Already have an account? Login";

    }

}


function closeModal() {

    authModal.classList.add(
        "hidden"
    );

}


loginBtn.addEventListener(
    "click",
    () => openAuth("login")
);


closeAuth.addEventListener(
    "click",
    closeModal
);


authModal.addEventListener(
    "click",
    event => {

        if (event.target === authModal) {

            closeModal();

        }

    }
);


switchAuth.addEventListener(
    "click",
    () => {

        if (authMode === "login") {

            openAuth("signup");

        } else {

            openAuth("login");

        }

    }
);


// ========================================
// AUTH FORM
// ========================================

authForm.addEventListener(
    "submit",
    async event => {

        event.preventDefault();


        const email =
            emailInput.value.trim();


        const password =
            passwordInput.value;


        if (
            !email ||
            !password
        ) {

            showMessage(
                "Please enter email and password.",
                "error"
            );

            return;

        }


        authSubmit.disabled = true;

        authSubmit.textContent =
            "Please wait...";


        try {

            // ================================
            // SIGN UP
            // ================================

            if (authMode === "signup") {

                const result =
                    await createUserWithEmailAndPassword(
                        auth,
                        email,
                        password
                    );


                await sendEmailVerification(
                    result.user
                );


                await signOut(auth);


                showMessage(
                    "Account created! Verification email has been sent. Check your inbox.",
                    "success"
                );


                setTimeout(
                    () => {

                        openAuth("login");

                    },
                    2500
                );

            }


            // ================================
            // LOGIN
            // ================================

            else {

                const result =
                    await signInWithEmailAndPassword(
                        auth,
                        email,
                        password
                    );


                const user =
                    result.user;


                if (!user.emailVerified) {

                    await signOut(auth);


                    showMessage(
                        "Please verify your email first. Check your inbox.",
                        "error"
                    );


                    return;

                }


                showMessage(
                    "Login successful!",
                    "success"
                );


                setTimeout(
                    closeModal,
                    800
                );

            }

        }


        catch (error) {

            console.error(
                "Firebase error:",
                error
            );


            let message =
                "Something went wrong.";


            switch (error.code) {

                case "auth/email-already-in-use":

                    message =
                        "This email is already registered.";

                    break;


                case "auth/invalid-email":

                    message =
                        "Please enter a valid email.";

                    break;


                case "auth/weak-password":

                    message =
                        "Password must contain at least 6 characters.";

                    break;


                case "auth/invalid-credential":

                    message =
                        "Incorrect email or password.";

                    break;


                case "auth/user-not-found":

                    message =
                        "No account found with this email.";

                    break;


                case "auth/wrong-password":

                    message =
                        "Incorrect password.";

                    break;


                case "auth/too-many-requests":

                    message =
                        "Too many attempts. Try again later.";

                    break;


                case "auth/network-request-failed":

                    message =
                        "Network error. Check your internet.";

                    break;


                default:

                    message =
                        error.message ||
                        "Something went wrong.";

            }


            showMessage(
                message,
                "error"
            );

        }


        finally {

            authSubmit.disabled = false;


            authSubmit.textContent =
                authMode === "login"
                    ? "Login"
                    : "Sign Up";

        }

    }
);


// ========================================
// AUTH MESSAGE
// ========================================

function showMessage(
    message,
    type
) {

    authMessage.textContent =
        message;


    authMessage.style.color =
        type === "success"
            ? "#16a34a"
            : "#ef4444";

}


// ========================================
// AUTH STATE
// ========================================

onAuthStateChanged(
    auth,
    user => {

        if (
            user &&
            user.emailVerified
        ) {

            loginBtn.textContent =
                "Logged In ✓";

            loginBtn.classList.add(
                "logged-in"
            );


            loginStatus.textContent =
                `Logged in as ${user.email}`;

        } else {

            loginBtn.textContent =
                "Login / Sign Up";

            loginBtn.classList.remove(
                "logged-in"
            );


            loginStatus.textContent =
                "Login to sync your tasks and collaborate.";

        }

    }
);


// ========================================
// DARK MODE
// ========================================

const savedTheme =
    localStorage.getItem(
        "taskroom_theme"
    );


if (savedTheme === "dark") {

    document.body.classList.add(
        "dark"
    );

    themeBtn.textContent =
        "☀️";

}


themeBtn.addEventListener(
    "click",
    () => {

        document.body.classList.toggle(
            "dark"
        );


        const dark =
            document.body.classList.contains(
                "dark"
            );


        localStorage.setItem(
            "taskroom_theme",
            dark
                ? "dark"
                : "light"
        );


        themeBtn.textContent =
            dark
                ? "☀️"
                : "🌙";

    }
);


// ========================================
// SECURITY
// ========================================

function escapeHTML(text) {

    const div =
        document.createElement("div");


    div.textContent =
        text;


    return div.innerHTML;

}


// ========================================
// START
// ========================================

renderTasks();