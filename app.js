const STORAGE_KEY = "sales-manager-v1";
const USERS_KEY = "sales-manager-users-v1";
const SESSION_KEY = "sales-manager-session-v1";
const STORAGE_UPDATED_KEY = `${STORAGE_KEY}-updated-at`;
const USERS_UPDATED_KEY = `${USERS_KEY}-updated-at`;
const THEME_KEY = "sales-manager-theme";
const OPEN_CUSTOMER_DETAILS_KEY = "sales-manager-open-customer-details";
const OPEN_CUSTOMER_ORDER_KEY = "sales-manager-open-customer-order";
const DATABASE_ENABLED = window.location.protocol !== "file:";

const PERMISSION_LABELS = {
  viewProducts: "عرض المنتجات",
  viewSalesTotals: "عرض إجمالي المبيعات والمدفوعات",
  viewDebtTotals: "عرض الديون المتبقية",
  viewQuickActions: "عرض الإجراءات السريعة",
  viewPurchases: "عرض المشتريات",
  viewProfit: "عرض الأرباح",
  deleteCustomers: "حذف العملاء",
  deleteOrders: "حذف الطلبات",
  deleteProducts: "حذف المنتجات",
  deletePurchases: "حذف المشتريات",
  resetData: "مسح البيانات",
  exportCsv: "تصدير CSV",
  manageUsers: "إدارة المستخدمين والصلاحيات",
};

const DEFAULT_USER_PERMISSIONS = {
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
};

ensureDefaultUsers();
const activeUser = getActiveUser() || createOpenAdminUser();
enforcePageAccess();

let state = loadState();
let draftOrderItems = [];
let draftPurchaseItems = [];
let editingOrderId = "";
let editingPurchaseInvoiceId = "";
let orderDateFilter = "all";
let applyingDatabaseState = false;
let stateSaveTimer = 0;
let usersSaveTimer = 0;

const formatCurrency = new Intl.NumberFormat("ar", {
  style: "currency",
  currency: "ILS",
  maximumFractionDigits: 2,
});

const formatNumber = new Intl.NumberFormat("ar", {
  maximumFractionDigits: 2,
});

const statusLabels = {
  pending: "معلق",
  ready: "جاهز",
};

const paymentBreakdownMethods = ["كاش", "بنك", "محفظة جوال", "محفظة بال بي"];
const transferMethods = new Set(paymentBreakdownMethods);

applySavedTheme();
markExistingOrdersReadyOnce();

const els = {
  orderForm: document.querySelector("#orderForm"),
  productForm: document.querySelector("#productForm"),
  purchaseForm: document.querySelector("#purchaseForm"),
  paymentForm: document.querySelector("#paymentForm"),
  customerDetailsPage: document.querySelector("#customerDetailsPage"),
  directCustomerForm: document.querySelector("#directCustomerForm"),
  userForm: document.querySelector("#userForm"),
  ordersTable: document.querySelector("#ordersTable"),
  productsTable: document.querySelector("#productsTable"),
  usersTable: document.querySelector("#usersTable"),
  orderItemsTable: document.querySelector("#orderItemsTable"),
  purchaseDraftTable: document.querySelector("#purchaseDraftTable"),
  productQuickList: document.querySelector("#productQuickList"),
  customersTable: document.querySelector("#customersTable"),
  purchasesTable: document.querySelector("#purchasesTable"),
  customerName: document.querySelector("#customerName"),
  customerPhone: document.querySelector("#customerPhone"),
  directCustomerName: document.querySelector("#directCustomerName"),
  directCustomerPhone: document.querySelector("#directCustomerPhone"),
  userDisplayName: document.querySelector("#userDisplayName"),
  userUsername: document.querySelector("#userUsername"),
  userPassword: document.querySelector("#userPassword"),
  externalProductName: document.querySelector("#externalProductName"),
  externalProductPrice: document.querySelector("#externalProductPrice"),
  externalProductCost: document.querySelector("#externalProductCost"),
  externalProductQty: document.querySelector("#externalProductQty"),
  customerNameList: document.querySelector("#customerNameList"),
  customerPhoneList: document.querySelector("#customerPhoneList"),
  purchaseItem: document.querySelector("#purchaseItem"),
  purchaseProduct: document.querySelector("#purchaseProductId"),
  purchaseQty: document.querySelector("#purchaseQty"),
  purchaseCost: document.querySelector("#purchaseCost"),
  addPurchaseItem: document.querySelector("#addPurchaseItem"),
  addExternalProduct: document.querySelector("#addExternalProduct"),
  clearPurchaseDraft: document.querySelector("#clearPurchaseDraft"),
  clearCart: document.querySelector("#clearCart"),
  discountAmount: document.querySelector("#discountAmount"),
  emptyOrders: document.querySelector("#emptyOrders"),
  emptyOrderItems: document.querySelector("#emptyOrderItems"),
  emptyPurchaseDraft: document.querySelector("#emptyPurchaseDraft"),
  emptyQuickProducts: document.querySelector("#emptyQuickProducts"),
  emptyProducts: document.querySelector("#emptyProducts"),
  emptyCustomers: document.querySelector("#emptyCustomers"),
  emptyPurchases: document.querySelector("#emptyPurchases"),
  searchOrders: document.querySelector("#searchOrders"),
  searchCustomers: document.querySelector("#searchCustomers"),
  resetData: document.querySelector("#resetData"),
  exportCsv: document.querySelector("#exportCsv"),
  orderSubmit: document.querySelector("#orderSubmit"),
  cancelOrderEdit: document.querySelector("#cancelOrderEdit"),
  purchaseSubmit: document.querySelector("#purchaseSubmit"),
  cancelPurchaseEdit: document.querySelector("#cancelPurchaseEdit"),
  paymentLastOrderTable: document.querySelector("#paymentLastOrderTable"),
};

els.orderForm?.addEventListener("submit", addOrder);
els.clearCart?.addEventListener("click", clearCart);
els.customerName?.addEventListener("input", syncCustomerFromName);
els.customerPhone?.addEventListener("input", syncCustomerFromPhone);
els.discountAmount?.addEventListener("input", renderDraftOrderItems);
els.purchaseProduct?.addEventListener("change", syncPurchaseProduct);
els.purchaseQty?.addEventListener("input", updatePurchaseDraftTotal);
els.purchaseCost?.addEventListener("input", updatePurchaseDraftTotal);
els.addPurchaseItem?.addEventListener("click", addPurchaseItem);
els.addExternalProduct?.addEventListener("click", addExternalProductToCart);
els.clearPurchaseDraft?.addEventListener("click", clearPurchaseDraft);
els.cancelOrderEdit?.addEventListener("click", resetOrderForm);
els.cancelPurchaseEdit?.addEventListener("click", resetPurchaseForm);
els.productForm?.addEventListener("submit", addProduct);
els.purchaseForm?.addEventListener("submit", addPurchase);
els.paymentForm?.addEventListener("submit", submitCustomerPayment);
document.querySelector("#paymentDiscount")?.addEventListener("input", syncPaymentAmountAfterDiscount);
els.directCustomerForm?.addEventListener("submit", addDirectCustomer);
els.userForm?.addEventListener("submit", addUser);
els.directCustomerName?.addEventListener("input", syncDirectCustomerFromName);
els.directCustomerPhone?.addEventListener("input", syncDirectCustomerFromPhone);
els.ordersTable?.addEventListener("click", handleOrderClick);
els.orderItemsTable?.addEventListener("click", handleDraftItemClick);
els.purchaseDraftTable?.addEventListener("click", handlePurchaseDraftClick);
els.productQuickList?.addEventListener("click", handleQuickProductClick);
els.ordersTable?.addEventListener("change", handleOrderChange);
els.productsTable?.addEventListener("click", handleProductClick);
els.customersTable?.addEventListener("click", handleCustomerClick);
els.purchasesTable?.addEventListener("click", handlePurchaseClick);
els.usersTable?.addEventListener("click", handleUserClick);
els.usersTable?.addEventListener("change", handleUserPermissionChange);
els.searchOrders?.addEventListener("input", render);
document.querySelectorAll("[data-order-date-filter]").forEach((button) => {
  button.addEventListener("click", () => {
    orderDateFilter = button.dataset.orderDateFilter || "all";
    render();
  });
});
els.searchCustomers?.addEventListener("input", render);
els.resetData?.addEventListener("click", resetData);
els.exportCsv?.addEventListener("click", exportCsv);
setupPaidBreakdownToggle();

if (activeUser) {
  renderAuthHeader();
  setupThemeToggle();
  setupBackupControls();
  render();
  setDefaultOrderDate();
  setDefaultPurchaseDate();
  setDefaultDirectCustomerDate();
  loadPendingOrderEdit();
  syncStateFromDatabase();
  syncUsersFromDatabase().then(() => {
    if (els.usersTable) renderUsers();
  });
  renderPaymentPage();
}

function addOrder(event) {
  event.preventDefault();

  if (draftOrderItems.length === 0) {
    alert("اختر منتجًا واحدًا على الأقل قبل حفظ الطلب.");
    return;
  }

  const items = draftOrderItems.map((item) => ({ ...item }));
  const subtotal = items.reduce((sum, item) => sum + item.quantity * item.unitPrice, 0);
  const discount = clampDiscount(readNumber("#discountAmount"), subtotal);
  const total = subtotal - discount;
  const paid = Math.max(0, readNumber("#paidAmount"));
  const customer = resolveCustomerValues();

  const orderData = {
    customerName: customer.name,
    customerPhone: customer.phone,
    productId: items[0].productId,
    productName: orderItemsSummary(items),
    quantity: items.reduce((sum, item) => sum + item.quantity, 0),
    unitPrice: 0,
    unitCost: 0,
    items,
    discountAmount: discount,
    paidAmount: paid,
    status: "ready",
    orderDate: readText("#orderDate") || todayDate(),
    reviewed: document.querySelector("#reviewed")?.checked || false,
    notes: readText("#notes"),
  };

  if (editingOrderId) {
    const index = state.orders.findIndex((order) => order.id === editingOrderId);
    if (index !== -1) {
      state.orders[index] = {
        ...state.orders[index],
        ...orderData,
        id: editingOrderId,
        updatedAt: new Date().toISOString(),
      };
    }
  } else {
    state.orders.unshift({
      id: crypto.randomUUID(),
      ...orderData,
      createdAt: new Date().toISOString(),
    });
  }

  saveState();
  resetOrderForm();
  render();
}

function resetOrderForm() {
  if (!els.orderForm) return;

  editingOrderId = "";
  sessionStorage.removeItem("edit-order-id");
  els.orderForm.reset();
  draftOrderItems = [];
  renderDraftOrderItems();
  if (els.productQuickList) renderProductQuickList();
  setDefaultOrderDate();
  setInput("#paidAmount", "");
  setInput("#discountAmount", "");
  setChecked("#reviewed", false);
  if (els.orderSubmit) els.orderSubmit.textContent = "حفظ الطلب";
  if (els.cancelOrderEdit) els.cancelOrderEdit.hidden = true;
}

function addProductToCart(product, quantity = 1) {
  const requested = Math.max(1, Math.floor(Number(quantity) || 1));
  if (!canAddProductQuantity(product, requested)) return false;

  const current = draftOrderItems.find((item) => item.productId === product.id);

  if (current) {
    current.quantity += requested;
  } else {
    draftOrderItems.push({
      productId: product.id,
      productName: product.name,
      quantity: requested,
      unitPrice: product.unitPrice,
      unitCost: product.unitCost,
    });
  }

  return true;
}

function renderAuthHeader() {
  const actions = document.querySelector(".header-actions");
  if (!actions || actions.querySelector(".user-pill")) return;

  const userPill = document.createElement("span");
  userPill.className = "user-pill";
  userPill.textContent = activeUser.displayName || activeUser.username;

  actions.prepend(userPill);

  if (activeUser.openAccess) return;

  const logoutButton = document.createElement("button");
  logoutButton.id = "logoutButton";
  logoutButton.type = "button";
  logoutButton.textContent = "خروج";
  logoutButton.addEventListener("click", logout);

  actions.append(logoutButton);
}

function applySavedTheme() {
  const savedTheme = localStorage.getItem(THEME_KEY);
  setTheme(savedTheme === "dark", { persist: false });
}

function setupThemeToggle() {
  const actions = document.querySelector(".header-actions");
  if (!actions || actions.querySelector("#themeToggle")) return;

  const themeButton = document.createElement("button");
  themeButton.id = "themeToggle";
  themeButton.type = "button";
  themeButton.className = "theme-toggle";
  themeButton.addEventListener("click", () => {
    setTheme(!isDarkTheme());
  });

  actions.prepend(themeButton);
  updateThemeToggle();
}

function setTheme(isDark, options = {}) {
  document.documentElement.dataset.theme = isDark ? "dark" : "light";
  if (options.persist !== false) {
    localStorage.setItem(THEME_KEY, isDark ? "dark" : "light");
  }
  updateThemeToggle();
}

function isDarkTheme() {
  return document.documentElement.dataset.theme === "dark";
}

function updateThemeToggle() {
  const button = document.querySelector("#themeToggle");
  if (!button) return;

  const isDark = isDarkTheme();
  button.textContent = isDark ? "نهاري" : "ليلي";
  button.setAttribute("aria-pressed", isDark ? "true" : "false");
  button.title = isDark ? "تفعيل الوضع النهاري" : "تفعيل الوضع الليلي";
}

function setupBackupControls() {
  const actions = document.querySelector(".header-actions");
  if (!actions || actions.querySelector("#exportBackup")) return;

  const exportButton = document.createElement("button");
  exportButton.id = "exportBackup";
  exportButton.type = "button";
  exportButton.dataset.permission = "exportCsv";
  exportButton.textContent = "تصدير نسخة";
  exportButton.addEventListener("click", exportBackupData);

  const importButton = document.createElement("button");
  importButton.id = "importBackup";
  importButton.type = "button";
  importButton.dataset.permission = "resetData";
  importButton.textContent = "استرداد نسخة";
  importButton.addEventListener("click", () => document.querySelector("#backupFileInput")?.click());

  const fileInput = document.createElement("input");
  fileInput.id = "backupFileInput";
  fileInput.type = "file";
  fileInput.accept = "application/json,.json";
  fileInput.hidden = true;
  fileInput.addEventListener("change", importBackupData);

  actions.append(exportButton, importButton, fileInput);
}

function applyPermissionUi() {
  if (els.resetData) els.resetData.hidden = !hasPermission("resetData");
  if (els.exportCsv) els.exportCsv.hidden = !hasPermission("exportCsv");

  for (const element of document.querySelectorAll("[data-permission]")) {
    element.hidden = !hasPermission(element.dataset.permission);
  }

  for (const element of document.querySelectorAll("[data-profit]")) {
    element.hidden = !hasPermission("viewProfit");
  }

  for (const selector of ["#totalProfit", "#dailyProfit"]) {
    const metric = document.querySelector(selector)?.closest(".metric");
    if (metric) metric.hidden = !hasPermission("viewProfit");
  }

  for (const selector of ["#totalSales", "#totalPaid"]) {
    const metric = document.querySelector(selector)?.closest(".metric");
    if (metric) metric.hidden = !hasPermission("viewSalesTotals");
  }
}

function enforcePageAccess() {
  const page = currentPageName();
  if (page === "products.html" && !hasPermission("viewProducts")) {
    window.location.replace("index.html");
  }

  if (page === "purchases.html" && !hasPermission("viewPurchases")) {
    window.location.replace("index.html");
  }

  if (page === "users.html" && !hasPermission("manageUsers")) {
    window.location.replace("index.html");
  }
}

function logout() {
  sessionStorage.removeItem(SESSION_KEY);
  window.location.href = "index.html";
}

function addExternalProductToCart() {
  const name = readText("#externalProductName");
  if (!name) {
    alert("اكتب اسم المنتج الخارجي أولًا.");
    return;
  }

  const quantity = Math.max(1, Math.floor(readNumber("#externalProductQty")));
  draftOrderItems.push({
    externalId: crypto.randomUUID(),
    productId: "",
    productName: name,
    isExternal: true,
    quantity,
    unitPrice: Math.max(0, readNumber("#externalProductPrice")),
    unitCost: Math.max(0, readNumber("#externalProductCost")),
  });

  resetExternalProductInputs();
  renderDraftOrderItems();
}

function resetExternalProductInputs() {
  setInput("#externalProductName", "");
  setInput("#externalProductPrice", "");
  setInput("#externalProductCost", "");
  setInput("#externalProductQty", 1);
  els.externalProductName?.focus();
}

function clearCart() {
  draftOrderItems = [];
  renderDraftOrderItems();
  if (els.productQuickList) renderProductQuickList();
}

function addProduct(event) {
  event.preventDefault();

  state.products.unshift({
    id: crypto.randomUUID(),
    name: readText("#newProductName"),
    unitPrice: Math.max(0, readNumber("#newProductPrice")),
    unitCost: Math.max(0, readNumber("#newProductCost")),
    createdAt: new Date().toISOString(),
  });

  saveState();
  els.productForm.reset();
  setInput("#newProductPrice", "");
  setInput("#newProductCost", "");
  render();
}

function addPurchase(event) {
  event.preventDefault();

  if (readText("#purchaseItem")) {
    const item = readPurchaseDraftItem();
    if (!item) return;
    draftPurchaseItems.push(item);
  }

  if (draftPurchaseItems.length === 0) {
    alert("أضف مادة واحدة على الأقل قبل حفظ المشتريات.");
    return;
  }

  const createdAt = new Date().toISOString();
  const invoiceId = editingPurchaseInvoiceId || crypto.randomUUID();
  const purchases = draftPurchaseItems.map((item) => ({
    id: crypto.randomUUID(),
    invoiceId,
    productId: item.productId,
    item: item.item,
    quantity: item.quantity,
    unit: item.unit,
    unitCost: item.unitCost,
    purchaseDate: item.purchaseDate,
    createdAt,
  }));

  if (editingPurchaseInvoiceId) {
    state.purchases = state.purchases.filter((purchase) => purchaseInvoiceKey(purchase) !== editingPurchaseInvoiceId);
  }
  state.purchases.unshift(...purchases);

  saveState();
  resetPurchaseForm();
  render();
}

function addDirectCustomer(event) {
  event.preventDefault();

  const customer = resolveDirectCustomerValues();
  const amount = Math.max(0, readNumber("#directCustomerDebt"));

  if (!customer.name) {
    alert("اكتب اسم العميل أولًا.");
    return;
  }

  if (amount <= 0) {
    alert("اكتب مبلغ الدين أكبر من صفر.");
    return;
  }

  customerDebts().unshift({
    id: crypto.randomUUID(),
    customerName: customer.name,
    customerPhone: customer.phone,
    amount,
    paidAmount: 0,
    debtDate: readText("#directCustomerDate") || todayDate(),
    notes: readText("#directCustomerNote"),
    payments: [],
    createdAt: new Date().toISOString(),
  });

  saveState();
  els.directCustomerForm.reset();
  setInput("#directCustomerDebt", "");
  setDefaultDirectCustomerDate();
  render();
}

function addUser(event) {
  event.preventDefault();
  if (!requirePermission("manageUsers")) return;

  const displayName = readText("#userDisplayName");
  const username = readText("#userUsername");
  const password = readText("#userPassword");

  if (!displayName || !username || !password) {
    alert("اكمل بيانات المستخدم.");
    return;
  }

  const users = loadUsers();
  const exists = users.some((user) => normalize(user.username) === normalize(username));
  if (exists) {
    alert("اسم المستخدم موجود مسبقًا.");
    return;
  }

  users.push(withUserPermissions({
    username,
    displayName,
    password,
    role: "user",
    createdAt: new Date().toISOString(),
  }));

  saveUsers(users);
  els.userForm.reset();
  renderUsers();
}

function addPurchaseItem() {
  const item = readPurchaseDraftItem();
  if (!item) return;

  draftPurchaseItems.push(item);
  resetPurchaseLine();
  renderDraftPurchaseItems();
}

function readPurchaseDraftItem() {
  const item = readText("#purchaseItem");
  if (!item) {
    alert("اكتب اسم المادة أولًا.");
    return null;
  }

  const productId = resolvePurchaseProductId(item, els.purchaseProduct?.value);
  const unit = normalizePurchaseUnit(readText("#purchaseUnit"));
  if (!unit) {
    alert("اكتب الوحدة أولًا.");
    return null;
  }

  return {
    id: crypto.randomUUID(),
    productId,
    item,
    quantity: Math.max(1, Math.floor(readNumber("#purchaseQty"))),
    unit,
    unitCost: Math.max(0, readNumber("#purchaseCost")),
    purchaseDate: readText("#purchaseDate") || todayDate(),
  };
}

function resetPurchaseLine() {
  setInput("#purchaseItem", "");
  setInput("#purchaseProductId", "");
  setInput("#purchaseQty", 1);
  setInput("#purchaseUnit", "");
  setInput("#purchaseCost", "");
  updatePurchaseDraftTotal();
  document.querySelector("#purchaseItem")?.focus();
}

function resetPurchaseForm() {
  if (!els.purchaseForm) return;

  editingPurchaseInvoiceId = "";
  els.purchaseForm.reset();
  draftPurchaseItems = [];
  setDefaultPurchaseDate();
  setInput("#purchaseProductId", "");
  setInput("#purchaseQty", 1);
  setInput("#purchaseUnit", "");
  setInput("#purchaseCost", "");
  if (els.purchaseSubmit) els.purchaseSubmit.textContent = "حفظ المشتريات";
  if (els.cancelPurchaseEdit) els.cancelPurchaseEdit.hidden = true;
  updatePurchaseDraftTotal();
  renderDraftPurchaseItems();
}

function clearPurchaseDraft() {
  draftPurchaseItems = [];
  renderDraftPurchaseItems();
}

function handleOrderClick(event) {
  const customerButton = event.target.closest("button[data-action='open-customer-orders']");
  if (customerButton) {
    openCustomerOrders(customerButton.closest("tr").dataset.id);
    return;
  }

  const editButton = event.target.closest("button[data-action='edit']");
  if (editButton) {
    startOrderEdit(editButton.closest("tr").dataset.id);
    return;
  }

  const payButton = event.target.closest("button[data-action='pay']");
  if (payButton) {
    registerOrderPayment(payButton.closest("tr").dataset.id);
    return;
  }

  const button = event.target.closest("button[data-action='delete']");
  if (!button) return;
  if (!requirePermission("deleteOrders")) return;

  const id = button.closest("tr").dataset.id;
  state.orders = state.orders.filter((order) => order.id !== id);
  saveState();
  render();
}

function openCustomerOrders(orderId) {
  const order = state.orders.find((item) => item.id === orderId);
  if (!order) return;

  window.location.href = `payment.html?order=${encodeURIComponent(order.id)}`;
}

function startOrderEdit(id) {
  const order = state.orders.find((item) => item.id === id);
  if (!order) return;

  if (!els.orderForm) {
    sessionStorage.setItem("edit-order-id", id);
    window.location.href = "orders.html";
    return;
  }

  editingOrderId = id;
  els.customerName.value = order.customerName || "";
  els.customerPhone.value = order.customerPhone || "";
  setInput("#orderDate", orderDate(order) || todayDate());
  setInput("#paidAmount", inputNumberValue(order.paidAmount));
  setInput("#discountAmount", inputNumberValue(orderDiscount(order)));
  setChecked("#reviewed", Boolean(order.reviewed));
  setInput("#notes", order.notes || "");
  draftOrderItems = orderItems(order).map((item) => ({ ...item }));
  renderDraftOrderItems();
  if (els.productQuickList) renderProductQuickList();
  if (els.orderSubmit) els.orderSubmit.textContent = "حفظ التعديل";
  if (els.cancelOrderEdit) els.cancelOrderEdit.hidden = false;
  els.orderForm.scrollIntoView({ behavior: "smooth", block: "start" });
}

function loadPendingOrderEdit() {
  if (!els.orderForm) return;

  const id = sessionStorage.getItem("edit-order-id");
  if (!id) return;

  sessionStorage.removeItem("edit-order-id");
  startOrderEdit(id);
}

function handleOrderChange(event) {
  const action = event.target.dataset.action;
  if (!["reviewed", "transfer"].includes(action)) return;

  const id = event.target.closest("tr").dataset.id;
  const order = state.orders.find((item) => item.id === id);
  if (!order) return;

  if (action === "reviewed") {
    order.reviewed = event.target.checked;
  }

  if (action === "transfer") {
    order.transferTo = normalizeTransferTo(event.target.value);
  }

  order.updatedAt = new Date().toISOString();
  saveState();
}

function registerOrderPayment(id) {
  const order = state.orders.find((item) => item.id === id);
  if (!order) return;

  const remaining = orderDebt(order);
  if (remaining <= 0) {
    alert("هذا الطلب مدفوع بالكامل.");
    return;
  }

  const paymentDiscount = promptNumber("خصم وقت الدفع (اختياري)", 0);
  if (paymentDiscount === null) return;

  const appliedDiscount = Math.min(paymentDiscount, remaining);
  if (appliedDiscount > 0) {
    order.discountAmount = orderDiscount(order) + appliedDiscount;
    order.discounts = Array.isArray(order.discounts) ? order.discounts : [];
    order.discounts.push({
      amount: appliedDiscount,
      appliedAt: new Date().toISOString(),
    });
  }

  const remainingAfterDiscount = orderDebt(order);
  if (remainingAfterDiscount <= 0) {
    saveState();
    render();
    return;
  }

  const payment = promptNumber("المبلغ الذي دفعه العميل الآن", remainingAfterDiscount);
  if (payment === null) return;

  order.paidAmount = (Number(order.paidAmount) || 0) + payment;
  order.payments = Array.isArray(order.payments) ? order.payments : [];
  order.payments.push({
    amount: payment,
    paidAt: new Date().toISOString(),
  });
  saveState();
  render();
}

function handleDraftItemClick(event) {
  const button = event.target.closest("button[data-action]");
  if (!button) return;

  const itemKey = button.closest("tr").dataset.key;
  const item = draftOrderItems.find((draftItem) => orderItemCartKey(draftItem) === itemKey);
  if (!item) return;

  if (button.dataset.action === "increase-draft-item") {
    const product = item.isExternal ? null : getProductById(item.productId);
    if (product && !canAddProductQuantity(product, 1)) return;
    item.quantity += 1;
  }

  if (button.dataset.action === "decrease-draft-item") {
    item.quantity -= 1;
    if (item.quantity <= 0) {
      draftOrderItems = draftOrderItems.filter((draftItem) => orderItemCartKey(draftItem) !== itemKey);
    }
  }

  if (button.dataset.action === "remove-draft-item") {
    draftOrderItems = draftOrderItems.filter((draftItem) => orderItemCartKey(draftItem) !== itemKey);
  }

  renderDraftOrderItems();
  if (els.productQuickList) renderProductQuickList();
}

function handlePurchaseDraftClick(event) {
  const button = event.target.closest("button[data-action='remove-purchase-draft']");
  if (!button) return;

  const id = button.closest("tr").dataset.id;
  draftPurchaseItems = draftPurchaseItems.filter((item) => item.id !== id);
  renderDraftPurchaseItems();
}

function handleQuickProductClick(event) {
  const button = event.target.closest("button[data-product-id]");
  if (!button) return;

  const product = getProductById(button.dataset.productId);
  if (!product) return;

  if (addProductToCart(product, 1)) {
    renderDraftOrderItems();
    renderProductQuickList();
  }
}

function handleProductClick(event) {
  const editButton = event.target.closest("button[data-action='edit-product']");
  if (editButton) {
    editProduct(editButton.closest("tr").dataset.id);
    return;
  }

  const button = event.target.closest("button[data-action='delete-product']");
  if (!button) return;
  if (!requirePermission("deleteProducts")) return;

  const id = button.closest("tr").dataset.id;
  state.products = state.products.filter((product) => product.id !== id);
  saveState();
  render();
}

function handleCustomerClick(event) {
  const deleteButton = event.target.closest("button[data-action='delete-customer']");
  if (deleteButton) {
    deleteCustomer(deleteButton.closest("tr").dataset.customerKey);
    return;
  }

  const balanceButton = event.target.closest("button[data-action='customer-transfer-in'], button[data-action='customer-transfer-out']");
  if (balanceButton) {
    const direction = balanceButton.dataset.action === "customer-transfer-out" ? "out" : "in";
    registerCustomerBalanceMovement(balanceButton.closest("tr").dataset.customerKey, direction);
    return;
  }

  const payButton = event.target.closest("button[data-action='pay-customer']");
  if (payButton) {
    registerCustomerPayment(payButton.closest("tr").dataset.customerKey);
    return;
  }

  const button = event.target.closest("button[data-action='toggle-customer-orders']");
  if (!button) return;

  const key = button.closest("tr").dataset.customerKey;
  const detailsRow = els.customersTable.querySelector(`tr[data-customer-details-for="${CSS.escape(key)}"]`);
  if (!detailsRow) return;

  const isHidden = detailsRow.hasAttribute("hidden");
  detailsRow.toggleAttribute("hidden", !isHidden);
  button.textContent = isHidden ? "إخفاء الطلبات" : "عرض الطلبات";
}

function openPendingCustomerDetails() {
  if (!els.customersTable) return;

  const key = sessionStorage.getItem(OPEN_CUSTOMER_DETAILS_KEY);
  const orderId = sessionStorage.getItem(OPEN_CUSTOMER_ORDER_KEY);
  if (!key) return;

  const detailsRow = els.customersTable.querySelector(`tr[data-customer-details-for="${CSS.escape(key)}"]`);
  const customerRow = els.customersTable.querySelector(`tr[data-customer-key="${CSS.escape(key)}"]`);
  if (!detailsRow || !customerRow) return;

  detailsRow.hidden = false;
  customerRow.querySelector("button[data-action='toggle-customer-orders']").textContent = "إخفاء الطلبات";
  sessionStorage.removeItem(OPEN_CUSTOMER_DETAILS_KEY);
  sessionStorage.removeItem(OPEN_CUSTOMER_ORDER_KEY);

  const orderRow = orderId
    ? detailsRow.querySelector(`tr[data-customer-order-id="${CSS.escape(orderId)}"]`)
    : null;

  if (orderRow) {
    orderRow.classList.add("highlight-row");
    orderRow.scrollIntoView({ behavior: "smooth", block: "center" });
    return;
  }

  customerRow.scrollIntoView({ behavior: "smooth", block: "start" });
}

function registerCustomerPayment(customerKey) {
  const customer = getCustomers().find((item) => item.key === customerKey);
  if (!customer) {
    alert("لا توجد طلبات لهذا العميل.");
    return;
  }

  const amount = promptNumber("مبلغ الدفعة من العميل", customer.debt);
  if (amount === null) return;
  if (amount <= 0) {
    alert("اكتب مبلغ أكبر من صفر.");
    return;
  }

  const movement = {
    method: "دفعة",
    note: "",
    movementAt: new Date().toISOString(),
  };
  applyCustomerPayment(customerKey, amount, "customer-payment", movement);
  addCustomerTransaction(customer, "in", amount, movement);
  saveState();
  render();
}

function renderPaymentPage() {
  if (!els.paymentForm) return;

  const order = selectedPaymentOrder();
  if (!order) {
    setDefaultPaymentDate();
    return;
  }

  const customerKey = customerKeyFor(order);
  const customer = getCustomers().find((item) => item.key === customerKey);
  const currentCustomer = customer || {
    name: order.customerName,
    phone: order.customerPhone,
    debt: orderDebt(order),
    credit: orderCredit(order),
  };

  setText("#paymentCustomerName", currentCustomer.name || "-");
  setText("#paymentCustomerDebt", money(currentCustomer.debt || 0));
  setText("#paymentCustomerCredit", money(currentCustomer.credit || 0));
  setText("#paymentLastOrderDate", formatDate(orderDate(order)));
  setText("#paymentCustomerInfo", `${currentCustomer.name || "-"}${currentCustomer.phone ? ` - ${currentCustomer.phone}` : ""}`);
  setInput("#paymentCustomerEditName", currentCustomer.name || "");
  setInput("#paymentCustomerEditPhone", currentCustomer.phone || "");
  const selectedOrderDebt = orderDebt(order);
  setInput("#paymentAmount", inputNumberValue(selectedOrderDebt));
  setInput("#paymentDiscount", "");
  setInput("#paymentMethod", orderTransferTo(order) || "كاش");
  const paymentAmountInput = document.querySelector("#paymentAmount");
  if (paymentAmountInput) paymentAmountInput.dataset.baseAmount = String(selectedOrderDebt);
  setDefaultPaymentDate();

  const editLink = document.querySelector("#paymentEditOrder");
  if (editLink) {
    editLink.addEventListener("click", (event) => {
      event.preventDefault();
      startOrderEdit(order.id);
    }, { once: true });
  }

  renderPaymentLastOrder(order);
}

function syncPaymentAmountAfterDiscount() {
  const amountInput = document.querySelector("#paymentAmount");
  const discountInput = document.querySelector("#paymentDiscount");
  if (!amountInput || !discountInput) return;

  const baseAmount = Number(amountInput.dataset.baseAmount);
  if (!Number.isFinite(baseAmount)) return;

  const discount = Math.max(0, readNumber("#paymentDiscount"));
  const amountAfterDiscount = Math.max(0, baseAmount - discount);
  amountInput.value = amountAfterDiscount > 0 ? inputNumberValue(amountAfterDiscount) : "";
}

function renderPaymentLastOrder(order) {
  if (!els.paymentLastOrderTable) return;

  els.paymentLastOrderTable.innerHTML = "";
  document.querySelector("#paymentEmpty")?.classList.toggle("show", !order);
  if (!order) return;

  const row = document.createElement("tr");
  row.className = "highlight-row";
  row.innerHTML = `
    <td>${formatDate(orderDate(order))}</td>
    <td>${orderProductPriceCell(order)}</td>
    <td>${money(orderTotal(order))}</td>
    <td>${money(orderDiscount(order))}</td>
    <td>${money(order.paidAmount)}</td>
    <td>${money(orderDebt(order))}</td>
    <td>${money(orderCredit(order))}</td>
    <td>${escapeHtml(orderTransferLabel(order))}</td>
    <td>${escapeHtml(orderReviewLabel(order))}</td>
  `;
  els.paymentLastOrderTable.append(row);
}

async function submitCustomerPayment(event) {
  event.preventDefault();

  const order = selectedPaymentOrder();
  if (!order) {
    alert("افتح صفحة الدفع من قائمة الطلبات أولاً.");
    return;
  }

  const customerKey = customerKeyFor(order);
  const customer = getCustomers().find((item) => item.key === customerKey);
  if (!customer) return;

  const editedName = readText("#paymentCustomerEditName") || customer.name || order.customerName;
  const editedPhone = readText("#paymentCustomerEditPhone");
  const identityChanged = editedName !== customer.name || editedPhone !== (customer.phone || "");
  const amount = Math.max(0, readNumber("#paymentAmount"));
  const discount = Math.max(0, readNumber("#paymentDiscount"));
  const paymentMethod = normalizeTransferTo(readText("#paymentMethod")) || "كاش";

  const appliedDiscount = Math.min(discount, orderDebt(order));
  if (!editedName) {
    alert("اكتب اسم العميل.");
    return;
  }

  if (amount <= 0 && appliedDiscount <= 0 && !identityChanged) {
    alert("اكتب مبلغ دفعة أو خصم أكبر من صفر، أو عدل اسم العميل/الجوال.");
    return;
  }

  if (identityChanged) {
    updateCustomerIdentity(customerKey, editedName, editedPhone);
  }

  const updatedCustomerKey = customerKeyForValues(editedName, editedPhone);
  const updatedCustomer = {
    key: updatedCustomerKey,
    name: editedName,
    phone: editedPhone,
  };

  const movement = {
    method: paymentMethod,
    note: readText("#paymentNote"),
    movementAt: `${readText("#paymentDate") || todayDate()}T00:00:00.000Z`,
  };

  if (appliedDiscount > 0) {
    order.discountAmount = orderDiscount(order) + appliedDiscount;
    order.discounts = Array.isArray(order.discounts) ? order.discounts : [];
    order.discounts.push({
      amount: appliedDiscount,
      appliedAt: movement.movementAt,
      method: movement.method,
      note: movement.note,
    });
  }

  if (amount > 0) {
    order.paidAmount = (Number(order.paidAmount) || 0) + amount;
    order.payments = Array.isArray(order.payments) ? order.payments : [];
    order.payments.push({
      amount,
      paidAt: movement.movementAt,
      source: "customer-payment",
      method: movement.method,
      note: movement.note,
    });
    addCustomerTransaction(updatedCustomer, "in", amount, movement);
  }

  order.transferTo = paymentMethod;
  order.updatedAt = new Date().toISOString();

  saveState();
  render();
  renderPaymentPage();
  alert("تم حفظ الدفعة.");
}

function selectedPaymentOrder() {
  const id = new URLSearchParams(window.location.search).get("order");
  return state.orders.find((order) => order.id === id) || null;
}

function latestCustomerOrder(customerKey) {
  return state.orders
    .filter((order) => customerKeyFor(order) === customerKey)
    .sort(compareOrdersNewestFirst)[0] || null;
}

function updateCustomerIdentity(oldCustomerKey, name, phone) {
  const newCustomerKey = customerKeyForValues(name, phone);

  for (const order of state.orders) {
    if (customerKeyFor(order) !== oldCustomerKey) continue;
    order.customerName = name;
    order.customerPhone = phone;
    order.updatedAt = new Date().toISOString();
  }

  for (const debt of customerDebts()) {
    if (customerKeyForDebt(debt) !== oldCustomerKey) continue;
    debt.customerName = name;
    debt.customerPhone = phone;
    debt.updatedAt = new Date().toISOString();
  }

  for (const transaction of customerTransactions()) {
    if (customerTransactionKey(transaction) !== oldCustomerKey) continue;
    transaction.customerKey = newCustomerKey;
    transaction.customerName = name;
    transaction.customerPhone = phone;
  }
}

function applyCustomerDiscount(customerKey, amount, details = {}) {
  let remaining = amount;
  const orders = state.orders
    .filter((order) => customerKeyFor(order) === customerKey && orderDebt(order) > 0)
    .sort(compareOrdersNewestFirst);

  for (const order of orders) {
    if (remaining <= 0) break;
    const applied = Math.min(remaining, orderDebt(order));
    order.discountAmount = orderDiscount(order) + applied;
    order.discounts = Array.isArray(order.discounts) ? order.discounts : [];
    order.discounts.push({
      amount: applied,
      appliedAt: details.movementAt || new Date().toISOString(),
      method: details.method || "",
      note: details.note || "",
    });
    remaining -= applied;
  }
}

function setDefaultPaymentDate() {
  const input = document.querySelector("#paymentDate");
  if (input && !input.value) input.value = todayDate();
}

function deleteCustomer(customerKey) {
  if (!requirePermission("deleteCustomers")) return;

  const customer = getCustomers().find((item) => item.key === customerKey);
  if (!customer) return;

  const confirmed = confirm(`حذف ${customer.name}؟ سيتم حذف كل طلباته وديونه وحركات الرصيد الخاصة به.`);
  if (!confirmed) return;

  state.orders = state.orders.filter((order) => customerKeyFor(order) !== customerKey);
  state.customerDebts = customerDebts().filter((debt) => customerKeyForDebt(debt) !== customerKey);
  state.customerTransactions = customerTransactions().filter((transaction) => customerTransactionKey(transaction) !== customerKey);

  saveState();
  render();
}

function registerCustomerBalanceMovement(customerKey, direction) {
  const customer = getCustomers().find((item) => item.key === customerKey);
  if (!customer) return;

  const defaultAmount = direction === "in" ? Math.max(customer.debt, 0) : Math.max(customer.credit, 0);
  const amount = promptNumber(direction === "in" ? "المبلغ الذي حوله العميل لك" : "المبلغ الذي حولته للعميل", defaultAmount);
  if (amount === null) return;

  if (amount <= 0) {
    alert("اكتب مبلغ أكبر من صفر.");
    return;
  }

  if (direction === "out" && amount > customer.credit) {
    alert(`رصيد العميل المتاح ${money(customer.credit)} فقط.`);
    return;
  }

  const method = prompt("طريقة التحويل", "كاش");
  if (method === null) return;

  const note = prompt("ملاحظة اختيارية", "") || "";
  const movement = {
    method: method.trim(),
    note: note.trim(),
    movementAt: new Date().toISOString(),
  };

  if (direction === "in") {
    applyCustomerPayment(customerKey, amount, "customer-transfer-in", movement);
  } else {
    refundCustomerCredit(customerKey, amount, movement);
  }

  addCustomerTransaction(customer, direction, amount, movement);
  saveState();
  render();
}

function applyCustomerPayment(customerKey, amount, source = "customer-payment", details = {}) {
  const directDebts = customerDebts()
    .filter((debt) => customerKeyForDebt(debt) === customerKey && customerDebtDebt(debt) > 0)
    .sort((a, b) => customerDebtDate(a).localeCompare(customerDebtDate(b)));
  const allCustomerOrders = state.orders
    .filter((order) => customerKeyFor(order) === customerKey)
    .sort((a, b) => orderDate(a).localeCompare(orderDate(b)));
  const customerOrders = allCustomerOrders.filter((order) => orderDebt(order) > 0);

  let remaining = amount;
  for (const debt of directDebts) {
    if (remaining <= 0) break;

    const debtRemaining = customerDebtDebt(debt);
    const applied = Math.min(remaining, debtRemaining);
    debt.paidAmount = customerDebtPaid(debt) + applied;
    debt.payments = Array.isArray(debt.payments) ? debt.payments : [];
    debt.payments.push({
      amount: applied,
      paidAt: details.movementAt || new Date().toISOString(),
      source,
      method: details.method || "",
      note: details.note || "",
    });
    remaining -= applied;
  }

  for (const order of customerOrders) {
    if (remaining <= 0) break;

    const debt = orderDebt(order);
    const applied = Math.min(remaining, debt);
    order.paidAmount = (Number(order.paidAmount) || 0) + applied;
    order.payments = Array.isArray(order.payments) ? order.payments : [];
    order.payments.push({
      amount: applied,
      paidAt: details.movementAt || new Date().toISOString(),
      source,
      method: details.method || "",
      note: details.note || "",
    });
    remaining -= applied;
  }

  if (remaining > 0) {
    const creditOrder = allCustomerOrders[allCustomerOrders.length - 1];
    if (creditOrder) {
      creditOrder.paidAmount = (Number(creditOrder.paidAmount) || 0) + remaining;
      creditOrder.payments = Array.isArray(creditOrder.payments) ? creditOrder.payments : [];
      creditOrder.payments.push({
        amount: remaining,
        paidAt: details.movementAt || new Date().toISOString(),
        source: source === "customer-payment" ? "customer-credit" : source,
        method: details.method || "",
        note: details.note || "",
      });
      return;
    }

    const creditDebt = customerDebts()
      .filter((debt) => customerKeyForDebt(debt) === customerKey)
      .sort((a, b) => customerDebtDate(b).localeCompare(customerDebtDate(a)))[0];
    if (!creditDebt) return;

    creditDebt.paidAmount = customerDebtPaid(creditDebt) + remaining;
    creditDebt.payments = Array.isArray(creditDebt.payments) ? creditDebt.payments : [];
    creditDebt.payments.push({
      amount: remaining,
      paidAt: details.movementAt || new Date().toISOString(),
      source: source === "customer-payment" ? "customer-credit" : source,
      method: details.method || "",
      note: details.note || "",
    });
  }
}

function refundCustomerCredit(customerKey, amount, details = {}) {
  let remaining = amount;
  const creditOrders = state.orders
    .filter((order) => customerKeyFor(order) === customerKey && orderCredit(order) > 0)
    .sort((a, b) => orderDate(b).localeCompare(orderDate(a)));

  for (const order of creditOrders) {
    if (remaining <= 0) break;

    const returned = Math.min(remaining, orderCredit(order));
    order.paidAmount = Math.max(0, (Number(order.paidAmount) || 0) - returned);
    order.payments = Array.isArray(order.payments) ? order.payments : [];
    order.payments.push({
      amount: -returned,
      paidAt: details.movementAt || new Date().toISOString(),
      source: "customer-transfer-out",
      method: details.method || "",
      note: details.note || "",
    });
    remaining -= returned;
  }

  const creditDebts = customerDebts()
    .filter((debt) => customerKeyForDebt(debt) === customerKey && customerDebtCredit(debt) > 0)
    .sort((a, b) => customerDebtDate(b).localeCompare(customerDebtDate(a)));

  for (const debt of creditDebts) {
    if (remaining <= 0) break;

    const returned = Math.min(remaining, customerDebtCredit(debt));
    debt.paidAmount = Math.max(0, customerDebtPaid(debt) - returned);
    debt.payments = Array.isArray(debt.payments) ? debt.payments : [];
    debt.payments.push({
      amount: -returned,
      paidAt: details.movementAt || new Date().toISOString(),
      source: "customer-transfer-out",
      method: details.method || "",
      note: details.note || "",
    });
    remaining -= returned;
  }
}

function addCustomerTransaction(customer, direction, amount, details = {}) {
  state.customerTransactions = Array.isArray(state.customerTransactions) ? state.customerTransactions : [];
  state.customerTransactions.unshift({
    id: crypto.randomUUID(),
    customerKey: customer.key,
    customerName: customer.name,
    customerPhone: customer.phone,
    direction,
    amount,
    method: details.method || "",
    note: details.note || "",
    movementAt: details.movementAt || new Date().toISOString(),
  });
}

function getCustomerTransactions(customerKey) {
  return customerTransactions().filter((transaction) => {
    return customerTransactionKey(transaction) === customerKey;
  }).sort((a, b) => String(b.movementAt || "").localeCompare(String(a.movementAt || "")));
}

function customerTransactions() {
  return Array.isArray(state.customerTransactions) ? state.customerTransactions : [];
}

function customerTransactionKey(transaction) {
  return transaction.customerKey || phoneKey(transaction.customerPhone) || normalize(transaction.customerName);
}

function editProduct(id) {
  const product = getProductById(id);
  if (!product) return;

  const price = promptNumber("سعر البيع الجديد", product.unitPrice);
  if (price === null) return;

  const cost = promptNumber("التكلفة الجديدة", product.unitCost);
  if (cost === null) return;

  product.unitPrice = price;
  product.unitCost = cost;
  saveState();
  render();
}

function handlePurchaseClick(event) {
  const editButton = event.target.closest("button[data-action='edit-purchase']");
  if (editButton) {
    startPurchaseEdit(editButton.closest("tr").dataset.invoiceId);
    return;
  }

  const button = event.target.closest("button[data-action='delete-purchase']");
  if (!button) return;
  if (!requirePermission("deletePurchases")) return;

  const invoiceId = button.closest("tr").dataset.invoiceId;
  state.purchases = state.purchases.filter((purchase) => purchaseInvoiceKey(purchase) !== invoiceId);
  saveState();
  render();
}

function handleUserPermissionChange(event) {
  const checkbox = event.target.closest("input[data-action='toggle-permission']");
  if (!checkbox) return;
  if (!requirePermission("manageUsers")) return;

  const username = checkbox.closest("tr").dataset.username;
  const permission = checkbox.dataset.permission;
  const users = loadUsers().map(withUserPermissions);
  const user = users.find((item) => item.username === username);
  if (!user || user.role === "admin") return;

  user.permissions[permission] = checkbox.checked;
  saveUsers(users);
  renderUsers();
}

function handleUserClick(event) {
  const resetButton = event.target.closest("button[data-action='reset-user-password']");
  if (resetButton) {
    resetUserPassword(resetButton.closest("tr").dataset.username);
    return;
  }

  const deleteButton = event.target.closest("button[data-action='delete-user']");
  if (deleteButton) {
    deleteUser(deleteButton.closest("tr").dataset.username);
  }
}

function resetUserPassword(username) {
  if (!requirePermission("manageUsers")) return;

  const users = loadUsers().map(withUserPermissions);
  const user = users.find((item) => item.username === username);
  if (!user) return;

  const password = prompt(`كلمة مرور جديدة للمستخدم ${user.displayName || user.username}`);
  if (password === null) return;
  if (!password.trim()) {
    alert("كلمة المرور لا تكون فارغة.");
    return;
  }

  user.password = password.trim();
  saveUsers(users);
  alert("تم تغيير كلمة المرور.");
}

function deleteUser(username) {
  if (!requirePermission("manageUsers")) return;
  if (username === activeUser.username) {
    alert("لا يمكنك حذف المستخدم الحالي.");
    return;
  }

  const users = loadUsers().map(withUserPermissions);
  const user = users.find((item) => item.username === username);
  if (!user || user.role === "admin") return;

  const confirmed = confirm(`حذف المستخدم ${user.displayName || user.username}؟`);
  if (!confirmed) return;

  saveUsers(users.filter((item) => item.username !== username));
  renderUsers();
}

function startPurchaseEdit(invoiceId) {
  const invoice = getPurchaseInvoices().find((item) => item.id === invoiceId);
  if (!invoice || !els.purchaseForm) return;

  editingPurchaseInvoiceId = invoice.id;
  draftPurchaseItems = invoice.items.map((purchase) => ({
    id: crypto.randomUUID(),
    productId: resolvePurchaseProductId(purchase.item, purchase.productId),
    item: purchase.item,
    quantity: Number(purchase.quantity) || 1,
    unit: normalizePurchaseUnit(purchase.unit),
    unitCost: Number(purchase.unitCost) || 0,
    purchaseDate: purchaseDate(purchase) || todayDate(),
  }));

  setInput("#purchaseItem", "");
  setInput("#purchaseDate", invoice.date || todayDate());
  setInput("#purchaseQty", 1);
  setInput("#purchaseUnit", "");
  setInput("#purchaseCost", "");
  if (els.purchaseSubmit) els.purchaseSubmit.textContent = "حفظ التعديل";
  if (els.cancelPurchaseEdit) els.cancelPurchaseEdit.hidden = false;
  updatePurchaseDraftTotal();
  renderDraftPurchaseItems();
  els.purchaseForm.scrollIntoView({ behavior: "smooth", block: "start" });
}

function setupPaidBreakdownToggle() {
  const metric = document.querySelector("#totalPaid")?.closest(".metric");
  if (!metric) return;

  metric.classList.add("metric-clickable");
  metric.tabIndex = 0;
  metric.setAttribute("role", "button");
  metric.setAttribute("aria-expanded", "false");
  metric.addEventListener("click", togglePaidBreakdown);
  metric.addEventListener("keydown", (event) => {
    if (!["Enter", " "].includes(event.key)) return;
    event.preventDefault();
    togglePaidBreakdown();
  });
}

function togglePaidBreakdown() {
  const panel = ensurePaidBreakdownPanel();
  const metric = document.querySelector("#totalPaid")?.closest(".metric");
  const shouldOpen = panel.hidden;

  panel.hidden = !shouldOpen;
  metric?.setAttribute("aria-expanded", shouldOpen ? "true" : "false");

  if (shouldOpen) {
    renderPaidBreakdownPanel();
    panel.scrollIntoView({ behavior: "smooth", block: "nearest" });
  }
}

function ensurePaidBreakdownPanel() {
  let panel = document.querySelector("#paidBreakdownPanel");
  if (panel) return panel;

  panel = document.createElement("section");
  panel.id = "paidBreakdownPanel";
  panel.className = "panel paid-breakdown-panel";
  panel.hidden = true;
  panel.innerHTML = `
    <div class="panel-head split">
      <div>
        <h2>تفصيل المبالغ المدفوعة</h2>
        <p>تقسيم المدفوعات حسب طريقة الدفع المسجلة.</p>
      </div>
      <button class="ghost" data-action="close-paid-breakdown" type="button">إغلاق</button>
    </div>
    <div id="paidBreakdownList" class="method-breakdown-grid"></div>
  `;

  panel.querySelector("[data-action='close-paid-breakdown']")?.addEventListener("click", () => {
    panel.hidden = true;
    document.querySelector("#totalPaid")?.closest(".metric")?.setAttribute("aria-expanded", "false");
  });

  const summary = document.querySelector(".summary-grid");
  summary?.insertAdjacentElement("afterend", panel);
  return panel;
}

function renderPaidBreakdownIfOpen() {
  const panel = document.querySelector("#paidBreakdownPanel");
  if (panel && !panel.hidden) renderPaidBreakdownPanel();
}

function renderPaidBreakdownPanel() {
  const panel = ensurePaidBreakdownPanel();
  const list = panel.querySelector("#paidBreakdownList");
  if (!list) return;

  const breakdown = calculatePaidBreakdown();
  const total = [...breakdown.values()].reduce((sum, amount) => sum + amount, 0);
  const extraMethods = [...breakdown.keys()]
    .filter((method) => !paymentBreakdownMethods.includes(method) && method !== "غير محدد");
  const methods = [...paymentBreakdownMethods, ...extraMethods];

  if (breakdown.get("غير محدد")) methods.push("غير محدد");

  list.innerHTML = [
    ...methods.map((method) => `
      <article class="method-breakdown-item">
        <span>${escapeHtml(method)}</span>
        <strong>${money(breakdown.get(method) || 0)}</strong>
      </article>
    `),
    `
      <article class="method-breakdown-item method-breakdown-total">
        <span>الإجمالي</span>
        <strong>${money(total)}</strong>
      </article>
    `,
  ].join("");
}

function render() {
  const totals = calculateTotals();
  const daily = calculateDailySummary();

  setText("#totalSales", money(totals.sales));
  setText("#totalPaid", money(totals.paid));
  setText("#totalDebt", money(totals.debt));
  setText("#totalProfit", money(totals.profit));
  setText("#customersCount", formatNumber.format(totals.customersCount));
  setText("#productsCount", formatNumber.format(state.products.length));
  setText("#totalStock", formatNumber.format(totals.stock));
  setText("#totalQuantity", formatNumber.format(totals.quantity));
  setText("#totalPurchases", money(totals.purchases));
  setText("#readyOrders", formatNumber.format(totals.ready));
  setText("#allOrders", formatNumber.format(state.orders.length));
  setText("#pendingOrders", formatNumber.format(totals.pending));
  setText("#readyOrdersMini", formatNumber.format(totals.ready));
  setText("#dailyOrders", formatNumber.format(daily.orders));
  setText("#dailySales", money(daily.sales));
  setText("#dailyPaid", money(daily.paid));
  setText("#dailyDebt", money(daily.debt));
  setText("#dailyPurchases", money(daily.purchases));
  setText("#dailyProfit", money(daily.profit));
  setText("#dailyQuantity", formatNumber.format(daily.quantity));
  renderPaidBreakdownIfOpen();
  renderActiveStatusFilter();

  if (els.productQuickList) renderProductQuickList();
  if (els.customerNameList || els.customerPhoneList) renderCustomerDatalists();
  if (els.purchaseProduct) renderPurchaseProductOptions();
  if (els.orderItemsTable) renderDraftOrderItems();
  if (els.purchaseDraftTable) renderDraftPurchaseItems();
  if (els.ordersTable) renderOrders(getFilteredOrders());
  if (els.productsTable) renderProducts();
  if (els.customersTable) renderCustomers();
  if (els.customerDetailsPage) renderCustomerDetailsPage();
  if (els.purchasesTable) renderPurchases();
  if (els.usersTable) renderUsers();
  updatePurchaseDraftTotal();
  applyPermissionUi();
}

function renderDraftOrderItems() {
  if (!els.orderItemsTable) return;

  els.orderItemsTable.innerHTML = "";
  els.emptyOrderItems?.classList.toggle("show", draftOrderItems.length === 0);
  const subtotal = draftOrderItems.reduce((sum, item) => sum + item.quantity * item.unitPrice, 0);
  const discount = clampDiscount(readNumber("#discountAmount"), subtotal);
  const total = subtotal - discount;
  const quantity = draftOrderItems.reduce((sum, item) => sum + item.quantity, 0);
  const externalQuantity = draftOrderItems
    .filter((item) => item.isExternal)
    .reduce((sum, item) => sum + item.quantity, 0);
  const externalTotal = draftOrderItems
    .filter((item) => item.isExternal)
    .reduce((sum, item) => sum + item.quantity * item.unitPrice, 0);
  setText("#cartItemsCount", formatNumber.format(quantity));
  setText("#externalCartCount", formatNumber.format(externalQuantity));
  setText("#externalCartTotal", money(externalTotal));
  setText("#cartSubtotal", money(subtotal));
  setText("#cartTotal", money(total));

  for (const item of draftOrderItems) {
    const row = document.createElement("tr");
    row.dataset.key = orderItemCartKey(item);
    row.innerHTML = `
      <td>${orderItemNameCell(item)}</td>
      <td>
        <div class="quantity-controls">
          <button class="ghost" data-action="decrease-draft-item" type="button">-</button>
          <strong>${formatNumber.format(item.quantity)}</strong>
          <button class="ghost" data-action="increase-draft-item" type="button">+</button>
        </div>
      </td>
      <td>${money(item.quantity * item.unitPrice)}</td>
      <td><button class="ghost danger" data-action="remove-draft-item" type="button">حذف</button></td>
    `;
    els.orderItemsTable.append(row);
  }
}

function renderDraftPurchaseItems() {
  if (!els.purchaseDraftTable) return;

  els.purchaseDraftTable.innerHTML = "";
  els.emptyPurchaseDraft?.classList.toggle("show", draftPurchaseItems.length === 0);

  const total = draftPurchaseItems.reduce((sum, item) => sum + purchaseTotal(item), 0);
  setText("#purchaseItemsCount", formatNumber.format(draftPurchaseItems.length));
  setText("#purchaseCartTotal", money(total));

  for (const item of draftPurchaseItems) {
    const row = document.createElement("tr");
    row.dataset.id = item.id;
    row.innerHTML = `
      <td>${formatDate(item.purchaseDate)}</td>
      <td>${purchaseItemCell(item)}</td>
      <td>${escapeHtml(purchaseQuantityLabel(item))}</td>
      <td>${money(item.unitCost)}</td>
      <td>${money(purchaseTotal(item))}</td>
      <td><button class="ghost danger" data-action="remove-purchase-draft" type="button">حذف</button></td>
    `;
    els.purchaseDraftTable.append(row);
  }
}

function renderCustomerDatalists() {
  const customers = getCustomerDirectory().customers;

  if (els.customerNameList) {
    els.customerNameList.innerHTML = "";
    for (const customer of customers) {
      const option = document.createElement("option");
      option.value = customer.name;
      if (customer.phone) option.label = customer.phone;
      els.customerNameList.append(option);
    }
  }

  if (els.customerPhoneList) {
    els.customerPhoneList.innerHTML = "";
    for (const customer of customers.filter((item) => item.phone)) {
      const option = document.createElement("option");
      option.value = customer.phone;
      option.label = customer.name;
      els.customerPhoneList.append(option);
    }
  }
}

function renderPurchaseProductOptions() {
  if (!els.purchaseProduct) return;

  const selected = els.purchaseProduct.value;
  els.purchaseProduct.innerHTML = `<option value="">بدون ربط</option>`;

  for (const product of state.products) {
    const option = document.createElement("option");
    option.value = product.id;
    option.textContent = product.name;
    els.purchaseProduct.append(option);
  }

  if (selected && getProductById(selected)) {
    els.purchaseProduct.value = selected;
  }
}

function renderProductQuickList() {
  els.productQuickList.innerHTML = "";
  els.emptyQuickProducts?.classList.toggle("show", state.products.length === 0);

  for (const product of state.products) {
    const stock = productStock(product, editingOrderId);
    const remaining = stock.available - draftQuantityForProduct(product.id);
    const isOutOfStock = stock.tracked && remaining <= 0;
    const button = document.createElement("button");
    button.type = "button";
    button.className = "product-chip";
    button.disabled = isOutOfStock;
    button.classList.toggle("is-out-of-stock", isOutOfStock);
    button.dataset.productId = product.id;
    button.innerHTML = `
      <span>${escapeHtml(product.name)}</span>
      <small>${money(product.unitPrice)}</small>
      <small class="stock-note ${stockLevelClass(stock, remaining)}">${productQuickStockLabel(stock, remaining)}</small>
    `;
    els.productQuickList.append(button);
  }
}

function renderOrders(orders) {
  els.ordersTable.innerHTML = "";
  els.emptyOrders?.classList.toggle("show", orders.length === 0);

  const template = document.querySelector("#orderRowTemplate");
  const fragment = document.createDocumentFragment();

  for (const order of orders) {
    const row = template.content.firstElementChild.cloneNode(true);
    const total = orderTotal(order);
    const debt = orderDebt(order);

    row.dataset.id = order.id;
    row.querySelector("[data-cell='customer']").innerHTML = orderCustomerOpenCell(order);
    row.querySelector("[data-cell='date']").textContent = formatDate(orderDate(order));
    row.querySelector("[data-cell='product']").innerHTML = orderProductCell(order);
    row.querySelector("[data-cell='quantity']").textContent = formatNumber.format(orderQuantity(order));
    const totalCell = row.querySelector("[data-cell='total']");
    totalCell.textContent = money(total);
    totalCell.classList.toggle("total-highlight", total > 0);
    row.querySelector("[data-cell='discount']").textContent = money(orderDiscount(order));
    const paidCell = row.querySelector("[data-cell='paid']");
    paidCell.textContent = money(order.paidAmount);
    paidCell.classList.toggle("paid-positive", (Number(order.paidAmount) || 0) > 0);
    row.querySelector("[data-cell='debt']").textContent = money(debt);
    row.querySelector("[data-cell='credit']").textContent = money(orderCredit(order));
    row.querySelector("[data-action='transfer']").value = normalizeTransferTo(order.transferTo);
    row.querySelector("[data-action='reviewed']").checked = Boolean(order.reviewed);
    row.querySelector("[data-action='delete']").hidden = !hasPermission("deleteOrders");
    updatePaymentButton(row, order);

    fragment.append(row);
  }

  els.ordersTable.append(fragment);
}

function updatePaymentButton(row, order) {
  const button = row.querySelector("[data-action='pay']");
  if (!button) return;

  const debt = orderDebt(order);
  const credit = orderCredit(order);

  button.disabled = debt <= 0;
  button.textContent = debt <= 0 ? (credit > 0 ? "له رصيد" : "مدفوع") : "تسجيل دفع";
  button.title = "سجل دفعة العميل";
}

function renderProducts() {
  els.productsTable.innerHTML = "";
  els.emptyProducts?.classList.toggle("show", state.products.length === 0);

  for (const product of state.products) {
    const row = document.createElement("tr");
    const ordersCount = countProductOrders(product);
    const stock = productStock(product);

    row.dataset.id = product.id;
    row.innerHTML = `
      <td>${escapeHtml(product.name)}</td>
      <td>${money(product.unitPrice)}</td>
      <td>${money(product.unitCost)}</td>
      <td data-profit>${money(product.unitPrice - product.unitCost)}</td>
      <td>${formatNumber.format(stock.purchased)}</td>
      <td>${formatNumber.format(stock.sold)}</td>
      <td>${productStockCell(stock)}</td>
      <td>${formatNumber.format(ordersCount)}</td>
      <td class="row-actions">
        <button class="ghost edit" data-action="edit-product" type="button">تعديل</button>
        ${hasPermission("deleteProducts") ? `<button class="ghost danger" data-action="delete-product" type="button">حذف</button>` : ""}
      </td>
    `;
    els.productsTable.append(row);
  }
}

function renderCustomers() {
  const customers = getFilteredCustomers();
  els.customersTable.innerHTML = "";
  els.emptyCustomers?.classList.toggle("show", customers.length === 0);

  for (const customer of customers) {
    const row = document.createElement("tr");
    row.dataset.customerKey = customer.key;
    row.innerHTML = `
      <td>
        <a class="customer-detail-link" href="customer-details.html?customer=${encodeURIComponent(customer.key)}">
          ${escapeHtml(customer.name)}
        </a>
      </td>
      <td>${escapeHtml(customer.phone || "-")}</td>
      <td>${customerActivityCount(customer)}</td>
      <td>${money(customer.total)}</td>
      <td>${money(customer.paid)}</td>
      <td>${money(customer.debt)}</td>
      <td>${money(customer.credit)}</td>
      <td class="row-actions">
        <button class="ghost edit" data-action="customer-transfer-in" type="button">استلام</button>
        <button class="ghost" data-action="customer-transfer-out" type="button">تحويل له</button>
      </td>
      <td><button class="ghost edit" data-action="pay-customer" type="button">تسجيل دفعة</button></td>
      <td><a class="button-link" href="customer-details.html?customer=${encodeURIComponent(customer.key)}">فتح التفاصيل</a></td>
      <td>${hasPermission("deleteCustomers") ? `<button class="ghost danger" data-action="delete-customer" type="button">حذف</button>` : ""}</td>
    `;
    els.customersTable.append(row);

    const detailsRow = document.createElement("tr");
    detailsRow.dataset.customerDetailsFor = customer.key;
    detailsRow.hidden = true;
    detailsRow.innerHTML = `
      <td colspan="11">
        <div class="customer-orders">
          <strong>تفاصيل ${escapeHtml(customer.name)}</strong>
          <div class="table-wrap mini-table">
            <table>
              <thead>
                <tr>
                  <th>التاريخ</th>
                  <th>المنتجات</th>
                  <th>الإجمالي</th>
                  <th>مدفوع</th>
                  <th>دين</th>
                  <th>رصيد</th>
                  <th>تحويل</th>
                  <th>مراجعة</th>
            </tr>
              </thead>
              <tbody>
                ${customerDetailRows(customer)}
              </tbody>
            </table>
          </div>
          ${customerTransactionsTable(customer)}
        </div>
      </td>
    `;
    els.customersTable.append(detailsRow);
  }

  openPendingCustomerDetails();
}

function renderCustomerDetailsPage() {
  const key = new URLSearchParams(window.location.search).get("customer") || "";
  const customer = getCustomers().find((item) => item.key === key);
  const rows = document.querySelector("#customerDetailsRows");
  const transactions = document.querySelector("#customerDetailsTransactions");

  if (!customer) {
    setText("#customerDetailsTitle", "العميل غير موجود");
    setText("#detailCustomerName", "-");
    setText("#detailCustomerPhone", "-");
    setText("#detailCustomerDebt", money(0));
    setText("#detailCustomerCredit", money(0));
    setText("#customerDetailsInfo", "لم يتم العثور على هذا العميل.");
    if (rows) rows.innerHTML = "";
    if (transactions) transactions.innerHTML = `<p class="empty show">لا توجد حركات رصيد.</p>`;
    document.querySelector("#customerDetailsEmpty")?.classList.add("show");
    return;
  }

  const latestOrder = latestCustomerOrder(customer.key);
  setText("#customerDetailsTitle", `تفاصيل ${customer.name}`);
  setText("#detailCustomerName", customer.name || "-");
  setText("#detailCustomerPhone", customer.phone || "-");
  setText("#detailCustomerDebt", money(customer.debt));
  setText("#detailCustomerCredit", money(customer.credit));
  setText("#customerDetailsInfo", `${customer.count} طلبات و ${customer.debts.length} ديون مباشرة.`);

  if (rows) rows.innerHTML = customerDetailRows(customer);
  if (transactions) transactions.innerHTML = customerTransactionsTable(customer);
  document.querySelector("#customerDetailsEmpty")?.classList.toggle("show", customer.orders.length === 0 && customer.debts.length === 0);

  const paymentLink = document.querySelector("#customerDetailsPaymentLink");
  if (paymentLink) {
    paymentLink.href = latestOrder ? `payment.html?order=${encodeURIComponent(latestOrder.id)}` : "customers.html";
  }
}

function renderPurchases() {
  els.purchasesTable.innerHTML = "";
  els.emptyPurchases?.classList.toggle("show", state.purchases.length === 0);

  for (const invoice of getPurchaseInvoices()) {
    const row = document.createElement("tr");
    row.dataset.invoiceId = invoice.id;
    row.innerHTML = `
      <td>${formatDate(invoice.date)}</td>
      <td>${purchaseInvoiceItemsCell(invoice)}</td>
      <td>${purchaseInvoiceQuantitiesCell(invoice)}</td>
      <td>${money(invoice.total)}</td>
      <td class="row-actions">
        <button class="ghost edit" data-action="edit-purchase" type="button">تعديل</button>
        ${hasPermission("deletePurchases") ? `<button class="ghost danger" data-action="delete-purchase" type="button">حذف الفاتورة</button>` : ""}
      </td>
    `;
    els.purchasesTable.append(row);
  }
}

function renderUsers() {
  if (!els.usersTable) return;
  if (!requirePermission("manageUsers", false)) {
    window.location.replace("index.html");
    return;
  }

  els.usersTable.innerHTML = "";
  for (const user of loadUsers().map(withUserPermissions)) {
    const row = document.createElement("tr");
    row.dataset.username = user.username;
    row.innerHTML = `
      <td>${escapeHtml(user.displayName || user.username)}</td>
      <td>${escapeHtml(user.username)}</td>
      <td>${user.role === "admin" ? "مدير" : "مستخدم"}</td>
      <td>${permissionsCell(user)}</td>
      <td class="row-actions">
        <button class="ghost edit" data-action="reset-user-password" type="button">تغيير كلمة المرور</button>
        ${user.role === "admin" ? "" : `<button class="ghost danger" data-action="delete-user" type="button">حذف</button>`}
      </td>
    `;
    els.usersTable.append(row);
  }
}

function permissionsCell(user) {
  return Object.entries(PERMISSION_LABELS).map(([key, label]) => {
    const disabled = user.role === "admin" || (key === "manageUsers" && user.username === activeUser.username);
    const checked = user.role === "admin" || Boolean(user.permissions?.[key]);
    return `
      <label class="permission-check">
        <input data-action="toggle-permission" data-permission="${key}" type="checkbox" ${checked ? "checked" : ""} ${disabled ? "disabled" : ""}>
        ${escapeHtml(label)}
      </label>
    `;
  }).join("");
}

function updatePurchaseDraftTotal() {
  if (!document.querySelector("#purchaseDraftTotal")) return;

  const total = Math.max(1, Math.floor(readNumber("#purchaseQty"))) * Math.max(0, readNumber("#purchaseCost"));
  setText("#purchaseDraftTotal", money(total));
}

function calculateTotals() {
  const totals = {
    sales: 0,
    paid: 0,
    debt: 0,
    profit: 0,
    quantity: 0,
    purchases: 0,
    stock: 0,
    customersCount: new Set(),
    pending: 0,
    ready: 0,
  };

  for (const order of state.orders) {
    const sales = orderTotal(order);

    totals.sales += sales;
    totals.paid += order.paidAmount;
    totals.debt += orderDebt(order);
    totals.profit += orderProfit(order);
    totals.quantity += orderQuantity(order);
    totals.customersCount.add(customerKeyFor(order));
    totals[normalizeStatus(order.status)] += 1;
  }

  for (const debt of customerDebts()) {
    totals.paid += customerDebtPaid(debt);
    totals.debt += customerDebtDebt(debt);
    totals.customersCount.add(customerKeyForDebt(debt));
  }

  for (const purchase of state.purchases) {
    totals.purchases += purchaseTotal(purchase);
  }

  totals.stock = state.products.reduce((sum, product) => {
    const stock = productStock(product);
    return stock.tracked ? sum + Math.max(0, stock.available) : sum;
  }, 0);

  totals.customersCount = totals.customersCount.size;
  return totals;
}

function calculatePaidBreakdown() {
  const breakdown = new Map();

  for (const method of paymentBreakdownMethods) {
    breakdown.set(method, 0);
  }

  for (const order of state.orders) {
    const payments = orderPayments(order);
    const recordedPayments = payments.reduce((sum, payment) => sum + (Number(payment.amount) || 0), 0);

    for (const payment of payments) {
      addPaidBreakdownAmount(breakdown, payment.method, payment.amount);
    }

    const initialPaid = (Number(order.paidAmount) || 0) - recordedPayments;
    addPaidBreakdownAmount(breakdown, orderTransferTo(order), initialPaid);
  }

  for (const debt of customerDebts()) {
    const payments = Array.isArray(debt.payments) ? debt.payments : [];
    const recordedPayments = payments.reduce((sum, payment) => sum + (Number(payment.amount) || 0), 0);

    for (const payment of payments) {
      addPaidBreakdownAmount(breakdown, payment.method, payment.amount);
    }

    const initialPaid = customerDebtPaid(debt) - recordedPayments;
    addPaidBreakdownAmount(breakdown, "", initialPaid);
  }

  return breakdown;
}

function addPaidBreakdownAmount(breakdown, method, amount) {
  const value = Number(amount) || 0;
  if (value === 0) return;

  const key = normalizeTransferTo(method) || "غير محدد";
  breakdown.set(key, (breakdown.get(key) || 0) + value);
}

function calculateDailySummary() {
  const today = todayDate();
  const summary = {
    orders: 0,
    sales: 0,
    paid: 0,
    debt: 0,
    purchases: 0,
    profit: 0,
    quantity: 0,
  };

  for (const order of state.orders) {
    const isTodayOrder = orderDate(order) === today;
    const payments = orderPayments(order);
    const paymentsToday = payments
      .filter((payment) => String(payment.paidAt || "").slice(0, 10) === today)
      .reduce((sum, payment) => sum + (Number(payment.amount) || 0), 0);

    if (isTodayOrder) {
      const recordedPayments = payments.reduce((sum, payment) => sum + (Number(payment.amount) || 0), 0);
      const initialPaid = Math.max(0, (Number(order.paidAmount) || 0) - recordedPayments);
      summary.orders += 1;
      summary.sales += orderTotal(order);
      summary.profit += orderProfit(order);
      summary.debt += orderDebt(order);
      summary.quantity += orderQuantity(order);
      summary.paid += initialPaid;
    }

    summary.paid += paymentsToday;
  }

  for (const purchase of state.purchases) {
    if (purchaseDate(purchase) === today) {
      summary.purchases += purchaseTotal(purchase);
    }
  }

  return summary;
}

function getCustomers() {
  const customers = new Map();

  for (const order of state.orders) {
    const key = customerKeyFor(order);
    const current = customers.get(key) || {
      key,
      name: order.customerName,
      phone: order.customerPhone,
      count: 0,
      total: 0,
      paid: 0,
      debt: 0,
      credit: 0,
      orders: [],
      debts: [],
      transactions: [],
    };

    const total = orderTotal(order);
    current.count += 1;
    current.total += total;
    current.paid += order.paidAmount;
    current.debt += orderDebt(order);
    current.credit += orderCredit(order);
    current.orders.push(order);
    current.phone ||= order.customerPhone;
    customers.set(key, current);
  }

  for (const debt of customerDebts()) {
    const key = customerKeyForDebt(debt);
    const current = customers.get(key) || {
      key,
      name: debt.customerName,
      phone: debt.customerPhone,
      count: 0,
      total: 0,
      paid: 0,
      debt: 0,
      credit: 0,
      orders: [],
      debts: [],
      transactions: [],
    };

    current.total += customerDebtAmount(debt);
    current.paid += customerDebtPaid(debt);
    current.debt += customerDebtDebt(debt);
    current.credit += customerDebtCredit(debt);
    current.debts.push(debt);
    current.name ||= debt.customerName;
    current.phone ||= debt.customerPhone;
    customers.set(key, current);
  }

  return Array.from(customers.values()).map((customer) => {
    customer.orders.sort(compareOrdersNewestFirst);
    customer.debts.sort((a, b) => customerDebtDate(b).localeCompare(customerDebtDate(a)));
    customer.transactions = getCustomerTransactions(customer.key);
    return customer;
  }).sort((a, b) => (b.debt - a.debt) || (b.credit - a.credit));
}

function getCustomerDirectory() {
  const customersByKey = new Map();
  const byName = new Map();
  const byPhone = new Map();

  for (const order of state.orders) {
    const name = String(order.customerName || "").trim();
    const phone = String(order.customerPhone || "").trim();
    addCustomerDirectoryEntry({ key: customerKeyForValues(name, phone), name, phone }, customersByKey, byName, byPhone);
  }

  for (const debt of customerDebts()) {
    const name = String(debt.customerName || "").trim();
    const phone = String(debt.customerPhone || "").trim();
    addCustomerDirectoryEntry({ key: customerKeyForValues(name, phone), name, phone }, customersByKey, byName, byPhone);
  }

  return {
    customers: Array.from(customersByKey.values()).sort((a, b) => a.name.localeCompare(b.name, "ar")),
    byName,
    byPhone,
  };
}

function addCustomerDirectoryEntry(customer, customersByKey, byName, byPhone) {
  if (!customer.name && !customer.phone) return;

  if (!customersByKey.has(customer.key)) customersByKey.set(customer.key, customer);
  if (customer.name && !byName.has(normalize(customer.name))) byName.set(normalize(customer.name), customer);
  if (customer.phone && !byPhone.has(phoneKey(customer.phone))) byPhone.set(phoneKey(customer.phone), customer);
}

function syncCustomerFromName() {
  const name = els.customerName?.value || "";
  const customer = getCustomerDirectory().byName.get(normalize(name));
  if (!customer?.phone || !els.customerPhone) return;

  els.customerPhone.value = customer.phone;
}

function syncCustomerFromPhone() {
  const phone = els.customerPhone?.value || "";
  const customer = getCustomerDirectory().byPhone.get(phoneKey(phone));
  if (!customer?.name || !els.customerName) return;

  els.customerName.value = customer.name;
}

function syncDirectCustomerFromName() {
  const name = els.directCustomerName?.value || "";
  const customer = getCustomerDirectory().byName.get(normalize(name));
  if (!customer?.phone || !els.directCustomerPhone) return;

  els.directCustomerPhone.value = customer.phone;
}

function syncDirectCustomerFromPhone() {
  const phone = els.directCustomerPhone?.value || "";
  const customer = getCustomerDirectory().byPhone.get(phoneKey(phone));
  if (!customer?.name || !els.directCustomerName) return;

  els.directCustomerName.value = customer.name;
}

function syncPurchaseProduct() {
  const product = getProductById(els.purchaseProduct?.value);
  if (!product) return;

  if (els.purchaseItem) els.purchaseItem.value = product.name;
  if (readNumber("#purchaseCost") <= 0) setInput("#purchaseCost", inputNumberValue(product.unitCost));
  updatePurchaseDraftTotal();
}

function resolveCustomerValues() {
  const directory = getCustomerDirectory();
  let name = readText("#customerName");
  let phone = readText("#customerPhone");

  const byName = directory.byName.get(normalize(name));
  const byPhone = directory.byPhone.get(phoneKey(phone));

  if (!phone && byName?.phone) phone = byName.phone;
  if (!name && byPhone?.name) name = byPhone.name;

  return { name, phone };
}

function resolveDirectCustomerValues() {
  const directory = getCustomerDirectory();
  let name = readText("#directCustomerName");
  let phone = readText("#directCustomerPhone");

  const byName = directory.byName.get(normalize(name));
  const byPhone = directory.byPhone.get(phoneKey(phone));

  if (!phone && byName?.phone) phone = byName.phone;
  if (!name && byPhone?.name) name = byPhone.name;

  return { name, phone };
}

function customerKeyFor(order) {
  return customerKeyForValues(order.customerName, order.customerPhone);
}

function customerKeyForDebt(debt) {
  return customerKeyForValues(debt.customerName, debt.customerPhone);
}

function customerKeyForValues(name, phone) {
  return phoneKey(phone) || normalize(name);
}

function compareOrdersNewestFirst(a, b) {
  const dateCompare = orderDate(b).localeCompare(orderDate(a));
  if (dateCompare) return dateCompare;
  return String(b.createdAt || "").localeCompare(String(a.createdAt || ""));
}

function phoneKey(value) {
  return String(value || "").replace(/\s+/g, "");
}

function customerOrderRow(order) {
  const total = orderTotal(order);
  const debt = orderDebt(order);

  return `
    <tr data-customer-order-id="${escapeHtml(order.id)}">
      <td>${formatDate(orderDate(order))}</td>
      <td>${orderProductCell(order)}</td>
      <td>${money(total)}</td>
      <td>${money(order.paidAmount)}</td>
      <td>${money(debt)}</td>
      <td>${money(orderCredit(order))}</td>
      <td>${escapeHtml(orderTransferLabel(order))}</td>
      <td>${escapeHtml(orderReviewLabel(order))}</td>
    </tr>
  `;
}

function customerDebtRow(debt) {
  return `
    <tr>
      <td>${formatDate(customerDebtDate(debt))}</td>
      <td>${escapeHtml(customerDebtLabel(debt))}</td>
      <td>${money(customerDebtAmount(debt))}</td>
      <td>${money(customerDebtPaid(debt))}</td>
      <td>${money(customerDebtDebt(debt))}</td>
      <td>${money(customerDebtCredit(debt))}</td>
      <td>-</td>
      <td>-</td>
    </tr>
  `;
}

function customerDetailRows(customer) {
  const rows = [
    ...customer.orders.map(customerOrderRow),
    ...customer.debts.map(customerDebtRow),
  ];

  return rows.join("") || `
    <tr>
      <td colspan="8">لا توجد تفاصيل بعد.</td>
    </tr>
  `;
}

function customerActivityCount(customer) {
  return `${formatNumber.format(customer.count)} / ${formatNumber.format(customer.debts.length)}`;
}

function customerTransactionsTable(customer) {
  const rows = customer.transactions.map(customerTransactionRow).join("");

  return `
    <div class="balance-ledger">
      <strong>حركات الرصيد</strong>
      ${rows ? `
        <div class="table-wrap mini-table">
          <table>
            <thead>
              <tr>
                <th>التاريخ</th>
                <th>الحركة</th>
                <th>المبلغ</th>
                <th>الطريقة</th>
                <th>ملاحظة</th>
              </tr>
            </thead>
            <tbody>${rows}</tbody>
          </table>
        </div>
      ` : `<p class="empty show">لا توجد حركات رصيد لهذا العميل.</p>`}
    </div>
  `;
}

function customerTransactionRow(transaction) {
  return `
    <tr>
      <td>${formatDate(String(transaction.movementAt || transaction.createdAt || "").slice(0, 10))}</td>
      <td>${escapeHtml(customerTransactionLabel(transaction.direction))}</td>
      <td>${money(Number(transaction.amount) || 0)}</td>
      <td>${escapeHtml(transaction.method || "-")}</td>
      <td>${escapeHtml(transaction.note || "-")}</td>
    </tr>
  `;
}

function customerTransactionLabel(direction) {
  return direction === "out" ? "تحويل للعميل" : "استلام من العميل";
}

function getFilteredCustomers() {
  const query = normalize(els.searchCustomers?.value);
  const customers = getCustomers();
  if (!query) return customers;

  return customers.filter((customer) => customerSearchText(customer).includes(query));
}

function customerSearchText(customer) {
  return normalize([
    customer.name,
    customer.phone,
    customer.debt,
    customer.credit,
    customer.total,
    customer.orders.map((order) => [
      orderProductSummary(order),
      order.notes,
      orderTransferTo(order),
      orderReviewLabel(order),
    ].join(" ")).join(" "),
    customer.debts.map((debt) => [
      customerDebtLabel(debt),
      customerDebtDate(debt),
      debt.notes,
    ].join(" ")).join(" "),
    customer.transactions.map((transaction) => [
      customerTransactionLabel(transaction.direction),
      transaction.amount,
      transaction.method,
      transaction.note,
    ].join(" ")).join(" "),
  ].join(" "));
}

function getFilteredOrders() {
  const query = normalize(els.searchOrders?.value);
  const today = todayDate();

  return state.orders.filter((order) => {
    const matchesDate = orderDateFilter !== "today" || orderDate(order) === today;
    const matchesSearch = !query || [
      order.customerName,
      order.customerPhone,
      orderProductSummary(order),
      orderTransferTo(order),
      orderReviewLabel(order),
      order.notes,
    ].some((value) => normalize(value).includes(query));

    return matchesDate && matchesSearch;
  });
}

function getStatusFilter() {
  return "";
}

function renderActiveStatusFilter() {
  const status = getStatusFilter() || "all";

  for (const link of document.querySelectorAll("[data-status-link]")) {
    link.classList.toggle("active-filter", link.dataset.statusLink === status);
  }

  for (const button of document.querySelectorAll("[data-order-date-filter]")) {
    button.classList.toggle("active-filter", button.dataset.orderDateFilter === orderDateFilter);
  }
}

function exportCsv() {
  if (!requirePermission("exportCsv")) return;

  const header = [
    "العميل",
    "الهاتف",
    "تاريخ الطلب",
    "المنتج",
    "الكمية",
    "سعر الوحدة",
    "تكلفة الوحدة",
    "الإجمالي",
    "الخصم",
    "المدفوع",
    "الدين",
    "رصيد العميل",
    "الربح",
    "تم التحويل إلى",
    "تمت المراجعة",
    "ملاحظات",
  ];

  const orderRows = state.orders.map((order) => {
    const total = orderTotal(order);
    return [
      order.customerName,
      order.customerPhone,
      orderDate(order),
      orderProductSummary(order),
      orderQuantity(order),
      orderItems(order).map((item) => `${item.productName}: ${item.unitPrice}`).join(" | "),
      orderItems(order).map((item) => `${item.productName}: ${item.unitCost}`).join(" | "),
      total,
      orderDiscount(order),
      order.paidAmount,
      orderDebt(order),
      orderCredit(order),
      orderProfit(order),
      orderTransferTo(order),
      orderReviewLabel(order),
      order.notes,
    ];
  });

  const debtRows = customerDebts().map((debt) => [
    debt.customerName,
    debt.customerPhone,
    customerDebtDate(debt),
    customerDebtLabel(debt),
    1,
    customerDebtAmount(debt),
    0,
    customerDebtAmount(debt),
    0,
    customerDebtPaid(debt),
    customerDebtDebt(debt),
    customerDebtCredit(debt),
    0,
    "",
    "",
    debt.notes,
  ]);

  if (!hasPermission("viewProfit")) {
    const profitIndex = header.indexOf("الربح");
    if (profitIndex !== -1) {
      header.splice(profitIndex, 1);
      for (const row of [...orderRows, ...debtRows]) {
        row.splice(profitIndex, 1);
      }
    }
  }

  const csv = [header, ...orderRows, ...debtRows]
    .map((row) => row.map(csvCell).join(","))
    .join("\n");

  const blob = new Blob(["\ufeff", csv], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = "sales-orders.csv";
  link.click();
  URL.revokeObjectURL(url);
}

function exportBackupData() {
  if (!requirePermission("exportCsv")) return;

  const backup = {
    app: "sales-manager",
    version: 1,
    exportedAt: new Date().toISOString(),
    state: normalizeState(state),
    users: loadUsers().map(withUserPermissions),
  };
  const json = JSON.stringify(backup, null, 2);
  const blob = new Blob([json], { type: "application/json;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `sales-manager-backup-${todayDate()}.json`;
  link.click();
  URL.revokeObjectURL(url);
}

async function importBackupData(event) {
  if (!requirePermission("resetData")) return;

  const input = event.target;
  const file = input.files?.[0];
  input.value = "";
  if (!file) return;

  try {
    const parsed = JSON.parse(await file.text());
    const importedState = parsed.state ? parsed.state : parsed;
    const nextState = normalizeState(importedState);
    const importedUsers = Array.isArray(parsed.users) ? parsed.users.map(withUserPermissions) : null;
    const confirmed = confirm("استرداد النسخة سيستبدل البيانات الحالية بالملف المختار. هل تريد المتابعة؟");
    if (!confirmed) return;

    state = nextState;
    saveState();

    if (importedUsers) {
      await saveUsers(importedUsers);
    }

    render();
    renderPaymentPage();
    alert("تم استرداد البيانات بنجاح.");
  } catch (error) {
    alert("ملف الاسترداد غير صحيح. اختر ملف JSON تم تصديره من النظام.");
  }
}

function resetData() {
  if (!requirePermission("resetData")) return;

  const confirmed = confirm("هل تريد مسح كل الطلبات والمنتجات والمشتريات وديون العملاء؟");
  if (!confirmed) return;

  state = { orders: [], products: [], purchases: [], customerTransactions: [], customerDebts: [] };
  saveState();
  render();
}

function getProductById(id) {
  return state.products.find((product) => product.id === id);
}

function getProductByName(name) {
  const key = normalize(name);
  return state.products.find((product) => normalize(product.name) === key);
}

function countProductOrders(product) {
  return state.orders.filter((order) => {
    return orderItems(order).some((item) => orderItemMatchesProduct(item, product));
  }).length;
}

function productStock(product, excludeOrderId = "") {
  const purchased = state.purchases.reduce((sum, purchase) => {
    return purchaseMatchesProduct(purchase, product) ? sum + (Number(purchase.quantity) || 0) : sum;
  }, 0);

  const sold = state.orders.reduce((sum, order) => {
    if (excludeOrderId && order.id === excludeOrderId) return sum;

    return sum + orderItems(order).reduce((itemSum, item) => {
      return orderItemMatchesProduct(item, product) ? itemSum + (Number(item.quantity) || 0) : itemSum;
    }, 0);
  }, 0);

  return {
    purchased,
    sold,
    available: purchased - sold,
    tracked: purchased > 0,
  };
}

function draftQuantityForProduct(productId) {
  return draftOrderItems.reduce((sum, item) => {
    return item.productId === productId ? sum + (Number(item.quantity) || 0) : sum;
  }, 0);
}

function canAddProductQuantity(product, quantity = 1) {
  const requested = Math.max(1, Math.floor(Number(quantity) || 1));
  const stock = productStock(product, editingOrderId);
  if (!stock.tracked) return true;

  const remaining = stock.available - draftQuantityForProduct(product.id);
  if (requested <= remaining) return true;

  alert(`المخزون غير كافي لـ ${product.name}. المتاح الآن ${formatNumber.format(Math.max(0, remaining))}.`);
  return false;
}

function orderItemMatchesProduct(item, product) {
  if (item.isExternal) return false;
  if (item.productId) return item.productId === product.id;
  return normalize(item.productName) === normalize(product.name);
}

function orderItemCartKey(item) {
  if (item.productId) return item.productId;
  if (item.externalId) return item.externalId;
  return `external-${normalize(item.productName)}-${Number(item.unitPrice) || 0}-${Number(item.unitCost) || 0}`;
}

function orderItemLabel(item) {
  const name = item.productName || "منتج";
  return item.isExternal ? `${name} (خارجي)` : name;
}

function orderItemNameCell(item) {
  const note = item.isExternal ? `<small>منتج خارجي لا يؤثر على المخزون</small>` : "";
  return `${escapeHtml(orderItemLabel(item))}${note}`;
}

function purchaseMatchesProduct(purchase, product) {
  if (purchase.productId) return purchase.productId === product.id;
  return normalize(purchase.item) === normalize(product.name);
}

function resolvePurchaseProductId(itemName, selectedId = "") {
  const selected = getProductById(selectedId);
  if (selected) return selected.id;

  return getProductByName(itemName)?.id || "";
}

function productStockCell(stock) {
  if (!stock.tracked) {
    return `<span class="stock-note stock-untracked">غير محدد</span>`;
  }

  return `<span class="stock-note ${stockLevelClass(stock, stock.available)}">${formatNumber.format(stock.available)}</span>`;
}

function productQuickStockLabel(stock, remaining) {
  if (!stock.tracked) return "مخزون غير محدد";
  return `متاح ${formatNumber.format(Math.max(0, remaining))}`;
}

function stockLevelClass(stock, value) {
  if (!stock.tracked) return "stock-untracked";
  if (value <= 0) return "stock-empty";
  if (value <= 3) return "stock-low";
  return "stock-ok";
}

function orderTotal(order) {
  return Math.max(0, orderSubtotal(order) - orderDiscount(order));
}

function orderSubtotal(order) {
  return orderItems(order).reduce((sum, item) => sum + item.quantity * item.unitPrice, 0);
}

function orderDiscount(order) {
  return clampDiscount(Number(order.discountAmount) || 0, orderSubtotal(order));
}

function orderDebt(order) {
  return Math.max(0, orderTotal(order) - (Number(order.paidAmount) || 0));
}

function orderCredit(order) {
  return Math.max(0, (Number(order.paidAmount) || 0) - orderTotal(order));
}

function customerDebts() {
  state.customerDebts = Array.isArray(state.customerDebts) ? state.customerDebts : [];
  return state.customerDebts;
}

function customerDebtAmount(debt) {
  return Math.max(0, Number(debt.amount) || 0);
}

function customerDebtPaid(debt) {
  return Math.max(0, Number(debt.paidAmount) || 0);
}

function customerDebtDebt(debt) {
  return Math.max(0, customerDebtAmount(debt) - customerDebtPaid(debt));
}

function customerDebtCredit(debt) {
  return Math.max(0, customerDebtPaid(debt) - customerDebtAmount(debt));
}

function customerDebtDate(debt) {
  if (debt.debtDate) return debt.debtDate;
  if (debt.createdAt) return String(debt.createdAt).slice(0, 10);
  return "";
}

function customerDebtLabel(debt) {
  const note = String(debt.notes || "").trim();
  return note ? `دين مباشر - ${note}` : "دين مباشر";
}

function clampDiscount(value, subtotal) {
  if (!Number.isFinite(value)) return 0;
  return Math.min(Math.max(0, value), Math.max(0, subtotal));
}

function orderDate(order) {
  if (order.orderDate) return order.orderDate;
  if (order.createdAt) return String(order.createdAt).slice(0, 10);
  return "";
}

function orderPayments(order) {
  return Array.isArray(order.payments) ? order.payments : [];
}

function purchaseDate(purchase) {
  if (purchase.purchaseDate) return purchase.purchaseDate;
  if (purchase.createdAt) return String(purchase.createdAt).slice(0, 10);
  return "";
}

function formatDate(value) {
  if (!value) return "-";

  const [year, month, day] = String(value).slice(0, 10).split("-");
  if (!year || !month || !day) return value;
  return `${day}/${month}/${year}`;
}

function setDefaultOrderDate() {
  const input = document.querySelector("#orderDate");
  if (input && !input.value) {
    const date = todayDate();
    input.value = date;
    input.setAttribute("value", date);
  }
}

function setDefaultPurchaseDate() {
  const input = document.querySelector("#purchaseDate");
  if (input && !input.value) {
    const date = todayDate();
    input.value = date;
    input.setAttribute("value", date);
  }
}

function setDefaultDirectCustomerDate() {
  const input = document.querySelector("#directCustomerDate");
  if (input && !input.value) {
    const date = todayDate();
    input.value = date;
    input.setAttribute("value", date);
  }
}

function todayDate() {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function orderProfit(order) {
  const cost = orderItems(order).reduce((sum, item) => sum + item.quantity * item.unitCost, 0);
  return orderTotal(order) - cost;
}

function orderQuantity(order) {
  return orderItems(order).reduce((sum, item) => sum + item.quantity, 0);
}

function orderItems(order) {
  if (Array.isArray(order.items) && order.items.length) return order.items;

  return [{
    productId: order.productId || "",
    productName: order.productName || "منتج",
    quantity: Number(order.quantity) || 0,
    unitPrice: Number(order.unitPrice) || 0,
    unitCost: Number(order.unitCost) || 0,
  }];
}

function orderItemsSummary(items) {
  return items.map((item) => `${orderItemLabel(item)} x${item.quantity}`).join(" + ");
}

function orderProductSummary(order) {
  return orderItemsSummary(orderItems(order));
}

function orderProductCell(order) {
  const items = orderItems(order);
  if (items.length === 1) return escapeHtml(orderItemsSummary(items));

  return items.map((item) => {
    return `<small>${escapeHtml(orderItemLabel(item))} x${formatNumber.format(item.quantity)}</small>`;
  }).join("");
}

function orderProductPriceCell(order) {
  return orderItems(order).map((item) => {
    const quantity = Number(item.quantity) || 0;
    const unitPrice = Number(item.unitPrice) || 0;
    const total = quantity * unitPrice;
    return `
      <small class="priced-order-item">
        <span>${escapeHtml(orderItemLabel(item))} x${formatNumber.format(quantity)}</span>
        <strong>${money(unitPrice)} / ${money(total)}</strong>
      </small>
    `;
  }).join("");
}

function orderTransferTo(order) {
  return normalizeTransferTo(order.transferTo);
}

function orderTransferLabel(order) {
  const transferTo = orderTransferTo(order);
  return transferTo ? `نعم - ${transferTo}` : "لا";
}

function orderReviewLabel(order) {
  return order.reviewed ? "نعم" : "لا";
}

function normalizeTransferTo(value) {
  const transferTo = String(value || "").trim();
  return transferMethods.has(transferTo) ? transferTo : "";
}

function purchaseTotal(purchase) {
  return purchase.quantity * purchase.unitCost;
}

function getPurchaseInvoices() {
  const invoices = new Map();

  for (const purchase of state.purchases) {
    const id = purchaseInvoiceKey(purchase);
    const invoice = invoices.get(id) || {
      id,
      date: purchaseDate(purchase),
      createdAt: purchase.createdAt || "",
      items: [],
      total: 0,
    };

    invoice.items.push(purchase);
    invoice.total += purchaseTotal(purchase);
    if (purchase.createdAt && (!invoice.createdAt || purchase.createdAt > invoice.createdAt)) {
      invoice.createdAt = purchase.createdAt;
    }
    invoices.set(id, invoice);
  }

  return Array.from(invoices.values()).sort((a, b) => {
    return String(b.createdAt || b.date).localeCompare(String(a.createdAt || a.date));
  });
}

function purchaseInvoiceKey(purchase) {
  return purchase.invoiceId || purchase.id;
}

function purchaseInvoiceItemsCell(invoice) {
  if (invoice.items.length === 1) return purchaseItemCell(invoice.items[0]);

  return [
    `<strong>فاتورة ${formatNumber.format(invoice.items.length)} مواد</strong>`,
    ...invoice.items.map((item) => `<small>${escapeHtml(item.item)} - ${money(item.unitCost)}${purchaseLinkedProductText(item)}</small>`),
  ].join("");
}

function purchaseItemCell(purchase) {
  return `${escapeHtml(purchase.item)}${purchaseLinkedProductText(purchase, true)}`;
}

function purchaseLinkedProductText(purchase, block = false) {
  const product = getProductById(purchase.productId);
  if (!product || normalize(product.name) === normalize(purchase.item)) return "";

  const text = `مرتبط: ${escapeHtml(product.name)}`;
  return block ? `<small>${text}</small>` : ` - ${text}`;
}

function purchaseInvoiceQuantitiesCell(invoice) {
  if (invoice.items.length === 1) return escapeHtml(purchaseQuantityLabel(invoice.items[0]));

  return invoice.items
    .map((item) => `<small>${escapeHtml(purchaseQuantityLabel(item))}</small>`)
    .join("");
}

function purchaseQuantityLabel(purchase) {
  const quantity = formatNumber.format(purchase.quantity);
  const unit = normalizePurchaseUnit(purchase.unit);
  return unit ? `${quantity} ${unit}` : quantity;
}

function normalizePurchaseUnit(unit) {
  return String(unit || "").trim();
}

function markExistingOrdersReadyOnce() {
  const migrationKey = `${STORAGE_KEY}-orders-ready-v1`;
  if (localStorage.getItem(migrationKey)) return;

  let changed = false;
  for (const order of state.orders) {
    if (order.status !== "ready") {
      order.status = "ready";
      changed = true;
    }
  }

  localStorage.setItem(migrationKey, "1");
  if (changed) saveState();
}

function normalizeStatus(status) {
  return statusLabels[status] ? status : "pending";
}

function readText(selector) {
  return document.querySelector(selector).value.trim();
}

function readNumber(selector) {
  const raw = document.querySelector(selector).value.trim().replace(",", ".");
  const value = Number(raw);
  return Number.isFinite(value) ? value : 0;
}

function promptNumber(label, currentValue) {
  const answer = prompt(label, currentValue);
  if (answer === null) return null;

  const value = Number(String(answer).trim().replace(",", "."));
  if (!Number.isFinite(value) || value < 0) {
    alert("اكتب رقم صحيح أكبر من أو يساوي صفر.");
    return null;
  }

  return value;
}

function setInput(selector, value) {
  const input = document.querySelector(selector);
  if (input) input.value = value;
}

function inputNumberValue(value) {
  const number = Number(value) || 0;
  return number > 0 ? number : "";
}

function setChecked(selector, checked) {
  const input = document.querySelector(selector);
  if (input) input.checked = checked;
}

function money(value) {
  return formatCurrency.format(value);
}

function setText(selector, value) {
  const element = document.querySelector(selector);
  if (element) element.textContent = value;
}

function ensureDefaultUsers() {
  const users = loadUsers();
  if (users.length) {
    const normalized = users.map(withUserPermissions);
    writeLocalUsers(normalized, localStorage.getItem(USERS_UPDATED_KEY) || new Date().toISOString());
    return;
  }

  writeLocalUsers([withUserPermissions({
    username: "admin",
    displayName: "المدير",
    password: "1234",
    role: "admin",
    createdAt: new Date().toISOString(),
  })]);
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
  const updatedAt = new Date().toISOString();
  writeLocalUsers(users, updatedAt);
  return queueUsersDatabaseSave(users, updatedAt);
}

function writeLocalUsers(users, updatedAt = new Date().toISOString()) {
  localStorage.setItem(USERS_KEY, JSON.stringify(users));
  localStorage.setItem(USERS_UPDATED_KEY, updatedAt);
}

function getActiveUser() {
  try {
    const session = JSON.parse(sessionStorage.getItem(SESSION_KEY) || "null");
    if (!session?.username) return null;

    const user = loadUsers().map(withUserPermissions).find((item) => normalize(item.username) === normalize(session.username));
    if (!user) return null;

    return {
      username: user.username,
      displayName: user.displayName,
      role: user.role || "user",
      permissions: user.permissions || {},
    };
  } catch {
    return null;
  }
}

function createOpenAdminUser() {
  return {
    username: "open-admin",
    displayName: "المدير",
    role: "admin",
    permissions: adminPermissions(),
    openAccess: true,
  };
}

function withUserPermissions(user) {
  const role = user.role || "user";
  const permissions = role === "admin"
    ? adminPermissions()
    : { ...DEFAULT_USER_PERMISSIONS, ...(user.permissions || {}) };

  return {
    ...user,
    role,
    permissions,
  };
}

function adminPermissions() {
  return Object.fromEntries(Object.keys(PERMISSION_LABELS).map((key) => [key, true]));
}

function hasPermission(permission) {
  if (!activeUser) return false;
  if (activeUser.role === "admin") return true;
  return Boolean(activeUser.permissions?.[permission]);
}

function requirePermission(permission, showAlert = true) {
  if (hasPermission(permission)) return true;

  if (showAlert) {
    alert(`ليس لديك صلاحية: ${PERMISSION_LABELS[permission] || permission}`);
  }
  return false;
}

function currentPageName() {
  return window.location.pathname.split("/").pop() || "index.html";
}

function loadState() {
  const saved = localStorage.getItem(STORAGE_KEY);
  if (!saved) return emptyState();

  try {
    return normalizeState(JSON.parse(saved));
  } catch {
    return emptyState();
  }
}

function emptyState() {
  return { orders: [], products: [], purchases: [], customerTransactions: [], customerDebts: [] };
}

function normalizeState(savedState) {
  const fallback = emptyState();
  const parsed = { ...fallback, ...(savedState || {}) };
  parsed.products = Array.isArray(parsed.products) && parsed.products.length
    ? parsed.products
    : deriveProductsFromOrders(parsed.orders);
  parsed.orders = Array.isArray(parsed.orders) ? parsed.orders : [];
  parsed.purchases = Array.isArray(parsed.purchases) ? parsed.purchases : [];
  parsed.customerTransactions = Array.isArray(parsed.customerTransactions) ? parsed.customerTransactions : [];
  parsed.customerDebts = Array.isArray(parsed.customerDebts) ? parsed.customerDebts : [];
  return parsed;
}

function deriveProductsFromOrders(orders = []) {
  const products = new Map();

  for (const order of orders) {
    const key = normalize(order.productName);
    if (!key || products.has(key)) continue;

    products.set(key, {
      id: crypto.randomUUID(),
      name: order.productName,
      unitPrice: Number(order.unitPrice) || 0,
      unitCost: Number(order.unitCost) || 0,
      createdAt: new Date().toISOString(),
    });
  }

  return Array.from(products.values());
}

function saveState() {
  const updatedAt = new Date().toISOString();
  writeLocalState(state, updatedAt);

  if (!applyingDatabaseState) {
    queueStateDatabaseSave(updatedAt);
  }
}

function writeLocalState(nextState, updatedAt = new Date().toISOString()) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(nextState));
  localStorage.setItem(STORAGE_UPDATED_KEY, updatedAt);
}

async function syncStateFromDatabase() {
  if (!DATABASE_ENABLED) return;

  try {
    const response = await fetch("/api/state", { cache: "no-store" });
    if (!response.ok) return;

    const remote = await response.json();
    const remoteState = remote.state ? normalizeState(remote.state) : null;
    const remoteUpdatedAt = remote.updatedAt || "";
    const localUpdatedAt = localStorage.getItem(STORAGE_UPDATED_KEY) || "";

    if (remoteState && isRemoteNewer(remoteUpdatedAt, localUpdatedAt)) {
      applyingDatabaseState = true;
      state = remoteState;
      writeLocalState(state, remoteUpdatedAt || new Date().toISOString());
      render();
      applyingDatabaseState = false;
      return;
    }

    if ((!remoteState || !isRemoteNewer(remoteUpdatedAt, localUpdatedAt)) && hasStateData(state)) {
      queueStateDatabaseSave(localUpdatedAt || new Date().toISOString());
    }
  } catch {
    applyingDatabaseState = false;
  }
}

function queueStateDatabaseSave(updatedAt) {
  if (!DATABASE_ENABLED) return Promise.resolve();

  clearTimeout(stateSaveTimer);
  return new Promise((resolve) => {
    stateSaveTimer = setTimeout(async () => {
      try {
        await fetch("/api/state", {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ state, updatedAt }),
        });
      } catch {
        // Local storage remains the fallback when the server is offline.
      }
      resolve();
    }, 250);
  });
}

async function syncUsersFromDatabase() {
  if (!DATABASE_ENABLED) return;

  try {
    const response = await fetch("/api/users", { cache: "no-store" });
    if (!response.ok) return;

    const remote = await response.json();
    const remoteUsers = Array.isArray(remote.users) ? remote.users.map(withUserPermissions) : [];
    const remoteUpdatedAt = remote.updatedAt || "";
    const localUpdatedAt = localStorage.getItem(USERS_UPDATED_KEY) || "";

    if (remoteUsers.length && isRemoteNewer(remoteUpdatedAt, localUpdatedAt)) {
      writeLocalUsers(remoteUsers, remoteUpdatedAt || new Date().toISOString());
      return;
    }

    const localUsers = loadUsers().map(withUserPermissions);
    if (localUsers.length && (!remoteUsers.length || !isRemoteNewer(remoteUpdatedAt, localUpdatedAt))) {
      queueUsersDatabaseSave(localUsers, localUpdatedAt || new Date().toISOString());
    }
  } catch {
    // Users stay available from local storage when the server is offline.
  }
}

function queueUsersDatabaseSave(users, updatedAt) {
  if (!DATABASE_ENABLED) return Promise.resolve();

  clearTimeout(usersSaveTimer);
  return new Promise((resolve) => {
    usersSaveTimer = setTimeout(async () => {
      try {
        await fetch("/api/users", {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ users, updatedAt }),
        });
      } catch {
        // Local storage remains the fallback when the server is offline.
      }
      resolve();
    }, 250);
  });
}

function hasStateData(nextState) {
  return ["orders", "products", "purchases", "customerTransactions", "customerDebts"]
    .some((key) => Array.isArray(nextState[key]) && nextState[key].length > 0);
}

function isRemoteNewer(remoteUpdatedAt, localUpdatedAt) {
  if (!localUpdatedAt) return true;
  if (!remoteUpdatedAt) return false;
  return new Date(remoteUpdatedAt).getTime() >= new Date(localUpdatedAt).getTime();
}

function normalize(value) {
  return String(value || "").trim().toLowerCase();
}

function safeCustomerCell(order) {
  const phone = order.customerPhone ? `<small>${escapeHtml(order.customerPhone)}</small>` : "";
  const notes = order.notes ? `<small>${escapeHtml(order.notes)}</small>` : "";
  return `${escapeHtml(order.customerName)}${phone}${notes}`;
}

function orderCustomerOpenCell(order) {
  return `
    <button class="customer-open-button" data-action="open-customer-orders" type="button">
      ${safeCustomerCell(order)}
      <small>فتح صفحة الدفع</small>
    </button>
  `;
}

function escapeHtml(value) {
  return String(value || "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function csvCell(value) {
  return `"${String(value ?? "").replaceAll('"', '""')}"`;
}
