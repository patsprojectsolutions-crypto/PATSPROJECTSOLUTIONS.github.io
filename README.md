# PATSPROJECTSOLUTIONS.github.io
THE SOLUTION TO YOUR PROJECT 
import { firebaseConfig, ADMIN_EMAIL } from './firebase-config.js';
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.5/firebase-app.js";
import {
  getAuth, onAuthStateChanged,
  createUserWithEmailAndPassword, signInWithEmailAndPassword, signOut
} from "https://www.gstatic.com/firebasejs/10.12.5/firebase-auth.js";
import {
  getFirestore, collection, doc, addDoc, setDoc, getDoc, getDocs,
  query, where, orderBy, onSnapshot, serverTimestamp
} from "https://www.gstatic.com/firebasejs/10.12.5/firebase-firestore.js";

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

// UI
const $ = (id) => document.getElementById(id);
const authMsg = $("authMsg");
const projectMsg = $("projectMsg");
const chatMsg = $("chatMsg");

const userBar = $("userBar");
const userEmail = $("userEmail");
const authForm = $("authForm");

const btnSignIn = $("btnSignIn");
const btnSignUp = $("btnSignUp");
const btnSignOut = $("btnSignOut");

const projectForm = $("projectForm");
const projectType = $("projectType");
const projectArea = $("projectArea");
const projectBudget = $("projectBudget");
const projectDesc = $("projectDesc");

const projectsTitle = $("projectsTitle");
const projectsList = $("projectsList");

const chatEmpty = $("chatEmpty");
const chatPanel = $("chatPanel");
const chatProjectType = $("chatProjectType");
const chatProjectArea = $("chatProjectArea");
const chatRolePill = $("chatRolePill");
const chatMessages = $("chatMessages");
const chatForm = $("chatForm");
const chatInput = $("chatInput");

let currentUser = null;
let isAdmin = false;
let activeProjectId = null;
let unsubscribeProjects = null;
let unsubscribeChat = null;

function setMessage(el, text, ok = false) {
  el.style.color = ok ? "#0a7a2f" : "#b00020";
  el.textContent = text || "";
}

function show(el) { el.classList.remove("hidden"); }
function hide(el) { el.classList.add("hidden"); }

btnSignUp.addEventListener("click", async () => {
  setMessage(authMsg, "");
  const email = $("email").value.trim();
  const password = $("password").value;
  try {
    await createUserWithEmailAndPassword(auth, email, password);
    setMessage(authMsg, "Account created!", true);
  } catch (e) {
    setMessage(authMsg, e.message);
  }
});

btnSignIn.addEventListener("click", async () => {
  setMessage(authMsg, "");
  const email = $("email").value.trim();
  const password = $("password").value;
  try {
    await signInWithEmailAndPassword(auth, email, password);
  } catch (e) {
    setMessage(authMsg, e.message);
  }
});

btnSignOut.addEventListener("click", async () => {
  await signOut(auth);
});

onAuthStateChanged(auth, async (user) => {
  currentUser = user;
  isAdmin = !!user && user.email?.toLowerCase() === ADMIN_EMAIL.toLowerCase();

  if (!user) {
    hide(userBar); show(authForm);
    userEmail.textContent = "";
    projectsTitle.textContent = "Your Projects";
    projectsList.textContent = "Sign in to see projects.";
    activeProjectId = null;
    closeChat();
    if (unsubscribeProjects) unsubscribeProjects();
    unsubscribeProjects = null;
    return;
  }

  // Signed in UI
  show(userBar); hide(authForm);
  userEmail.textContent = user.email;
  projectsTitle.textContent = isAdmin ? "All Customer Projects (Admin)" : "Your Projects";
  setMessage(authMsg, "", true);

  await loadProjectsRealtime();
});

async function loadProjectsRealtime() {
  if (unsubscribeProjects) unsubscribeProjects();

  const projectsCol = collection(db, "projects");
  const q = isAdmin
    ? query(projectsCol, orderBy("createdAt", "desc"))
    : query(projectsCol, where("customerId", "==", currentUser.uid), orderBy("createdAt", "desc"));

  unsubscribeProjects = onSnapshot(q, (snap) => {
    projectsList.innerHTML = "";
    if (snap.empty) {
      projectsList.textContent = isAdmin
        ? "No projects yet."
        : "No projects yet — submit one above to start chatting.";
      return;
    }

    snap.forEach((d) => {
      const p = d.data();
      const div = document.createElement("div");
      div.className = "projectItem";
      div.innerHTML = `
        <div><strong>${escapeHtml(p.type || "Project")}</strong></div>
        <div class="small">${escapeHtml(p.area || "")} · ${escapeHtml(p.budget || "")}</div>
        <div class="small">${p.customerEmail ? "Customer: " + escapeHtml(p.customerEmail) : ""}</div>
      `;
      div.addEventListener("click", () => openChat(d.id, p));
      projectsList.appendChild(div);
    });
  });
}

projectForm.addEventListener("submit", async (e) => {
  e.preventDefault();
  setMessage(projectMsg, "");

  if (!currentUser) {
    setMessage(projectMsg, "Please sign in first.");
    return;
  }

  const type = projectType.value.trim();
  const area = projectArea.value.trim();
  const budget = projectBudget.value.trim();
  const desc = projectDesc.value.trim();

  if (!type || !desc) {
    setMessage(projectMsg, "Project type and description are required.");
    return;
  }

  try {
    const docRef = await addDoc(collection(db, "projects"), {
      customerId: currentUser.uid,
      customerEmail: currentUser.email,
      type,
      area,
      budget,
      description: desc,
      createdAt: serverTimestamp()
    });

    // Create a first system message (optional, nice UX)
    await addDoc(collection(db, "projects", docRef.id, "messages"), {
      senderId: "system",
      senderEmail: "system",
      body: "Project created. Pat will reply here with questions, ideas, and next steps.",
      createdAt: serverTimestamp()
    });

    setMessage(projectMsg, "Project created! Select