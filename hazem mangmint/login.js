const USERS_KEY = "sales-manager-users-v1";
const SESSION_KEY = "sales-manager-session-v1";
const PERMISSION_KEYS = [
  "viewProducts",
  "viewSalesTotals",
  "viewDebtTotals",
  "viewQuickActions",
  "viewPurchases",
  "viewProfit",
  "deleteCustomers",
  "deleteOrders",
  "deleteProducts",
  "deletePurchases",
  "resetData",
  "exportCsv",
  "manageUsers",
];

ensureDefaultUsers();
redirectIfLoggedIn();

const loginForm = document.querySelector("#loginForm");
const message = document.querySelector("#authMessage");

loginForm.addEventListener("submit", login);

function login(event) {
  event.preventDefault();

  const username = readValue("#loginUsername");
  const password = readValue("#loginPassword");
  const user = loadUsers().find((item) => normalize(item.username) === normalize(username));

  if (!user || user.password !== password) {
    showMessage("اسم المستخدم أو كلمة المرور غير صحيحة.", true);
    return;
  }

  sessionStorage.setItem(SESSION_KEY, JSON.stringify({
    username: user.username,
    loginAt: new Date().toISOString(),
  }));

  window.location.href = safeNextPage();
}

function ensureDefaultUsers() {
  const users = loadUsers();
  if (users.length) {
    saveUsers(users.map(withUserPermissions));
    return;
  }

  saveUsers([withUserPermissions({
    username: "admin",
    displayName: "المدير",
    password: "1234",
    role: "admin",
    createdAt: new Date().toISOString(),
  })]);
}

function redirectIfLoggedIn() {
  try {
    const session = JSON.parse(sessionStorage.getItem(SESSION_KEY) || "null");
    const user = loadUsers().find((item) => normalize(item.username) === normalize(session?.username));
    if (user) window.location.href = safeNextPage();
    if (session?.username && !user) sessionStorage.removeItem(SESSION_KEY);
  } catch {
    sessionStorage.removeItem(SESSION_KEY);
  }
}

function safeNextPage() {
  const next = new URLSearchParams(window.location.search).get("next") || "index.html";
  if (next.includes(":") || next.startsWith("/") || next.includes("\\")) return "index.html";
  return next;
}

function loadUsers() {
  try {
    const users = JSON.parse(localStorage.getItem(USERS_KEY) || "[]");
    return Array.isArray(users) ? users : [];
  } catch {
    return [];
  }
}

function saveUsers(users) {
  localStorage.setItem(USERS_KEY, JSON.stringify(users));
}

function withUserPermissions(user) {
  const role = user.role || "user";
  const permissions = role === "admin"
    ? Object.fromEntries(PERMISSION_KEYS.map((key) => [key, true]))
    : {
        viewProducts: false,
        viewSalesTotals: false,
        viewDebtTotals: false,
        viewQuickActions: false,
        viewPurchases: false,
        viewProfit: false,
        deleteCustomers: false,
        deleteOrders: false,
        deleteProducts: false,
        deletePurchases: false,
        resetData: false,
        exportCsv: true,
        manageUsers: false,
        ...(user.permissions || {}),
      };

  return { ...user, role, permissions };
}

function readValue(selector) {
  return document.querySelector(selector).value.trim();
}

function normalize(value) {
  return String(value || "").trim().toLowerCase();
}

function showMessage(text, isError = false) {
  message.textContent = text;
  message.classList.toggle("error", isError);
}
