const API_URL =
"https://script.google.com/macros/s/AKfycby09EEwCpP_5YE8qcwfI_ytbSPmoOkpWSQ6eNO58NMGlbPPNaWLSz1BQhDmHaBZhoCxsw/exec";

let adminToken = localStorage.getItem("yh_admin_token") || "";
let currentUser = null;
let bookingsData = [];
let accountsData = [];
let selectedBooking = null;

document.addEventListener("DOMContentLoaded", () => {
  if (adminToken) {
    verifyLogin();
  }
});

/* =========================
   共用 API
========================= */

async function apiPost(action, payload = {}) {
  const body = {
    action,
    ...payload
  };

  const res = await fetch(API_URL, {
    method: "POST",
    body: JSON.stringify(body)
  });

  return await res.json();
}

/* =========================
   登入 / 註冊
========================= */

function showRegister() {
  document.getElementById("loginPage").classList.add("hidden");
  document.getElementById("registerPage").classList.remove("hidden");
}

function showLogin() {
  document.getElementById("registerPage").classList.add("hidden");
  document.getElementById("loginPage").classList.remove("hidden");
}

async function registerAccount() {
  const name = document.getElementById("registerName").value.trim();
  const username = document.getElementById("registerUsername").value.trim();
  const password = document.getElementById("registerPassword").value.trim();
  const phone = document.getElementById("registerPhone").value.trim();
  const email = document.getElementById("registerEmail").value.trim();
  const lineUserId = document.getElementById("registerLineUserId").value.trim();

  if (!name || !username || !password) {
    alert("請填寫姓名、帳號與密碼");
    return;
  }

  try {
    const result = await apiPost("registerAdmin", {
      data: {
        name,
        username,
        password,
        phone,
        email,
        lineUserId
      }
    });

    if (result.ok) {
      alert(result.message || "申請成功，請等待老闆核准");
      showLogin();

      document.getElementById("registerName").value = "";
      document.getElementById("registerUsername").value = "";
      document.getElementById("registerPassword").value = "";
      document.getElementById("registerPhone").value = "";
      document.getElementById("registerEmail").value = "";
      document.getElementById("registerLineUserId").value = "";
    } else {
      alert(result.message || "申請失敗");
    }

  } catch (error) {
    console.error(error);
    alert("申請失敗，請稍後再試");
  }
}

async function login() {
  const username = document.getElementById("loginUsername").value.trim();
  const password = document.getElementById("loginPassword").value.trim();

  if (!username || !password) {
    alert("請輸入帳號與密碼");
    return;
  }

  try {
    const result = await apiPost("loginAdmin", {
      data: {
        username,
        password
      }
    });

    if (!result.ok) {
      alert(result.message || "登入失敗");
      return;
    }

    adminToken = result.token;
    currentUser = result.user;

    localStorage.setItem("yh_admin_token", adminToken);

    enterAdmin();

  } catch (error) {
    console.error(error);
    alert("登入失敗，請稍後再試");
  }
}

async function verifyLogin() {
  try {
    const result = await apiPost("verifyAdmin", {
      token: adminToken
    });

    if (!result.ok) {
      logout();
      return;
    }

    currentUser = result.user;
    enterAdmin();

  } catch (error) {
    console.error(error);
    logout();
  }
}

function enterAdmin() {
  document.getElementById("loginPage").classList.add("hidden");
  document.getElementById("registerPage").classList.add("hidden");
  document.getElementById("adminLayout").classList.remove("hidden");

  document.getElementById("currentUserName").innerText =
    currentUser.name || currentUser.username;

  document.getElementById("currentUserRole").innerText =
    currentUser.role || "";

  if (currentUser.role === "老闆") {
    document.getElementById("accountMenuBtn").classList.remove("hidden");
  } else {
    document.getElementById("accountMenuBtn").classList.add("hidden");
  }

  loadDashboard();
  loadBookings();

  if (currentUser.role === "老闆") {
    loadAccounts();
  }
}

function logout() {
  localStorage.removeItem("yh_admin_token");
  adminToken = "";
  currentUser = null;
  bookingsData = [];
  accountsData = [];

  document.getElementById("adminLayout").classList.add("hidden");
  document.getElementById("registerPage").classList.add("hidden");
  document.getElementById("loginPage").classList.remove("hidden");
}

/* =========================
   頁面切換
========================= */

function showPage(pageId, btn) {
  document.querySelectorAll(".page").forEach(page => {
    page.classList.add("hidden");
  });

  document.getElementById(pageId).classList.remove("hidden");

  document.querySelectorAll(".menu-btn").forEach(item => {
    item.classList.remove("active");
  });

  if (btn) {
    btn.classList.add("active");
  }

  if (pageId === "dashboardPage") {
    loadDashboard();
  }

  if (pageId === "bookingPage") {
    loadBookings();
  }

  if (pageId === "accountPage") {
    loadAccounts();
  }
}

/* =========================
   Dashboard
========================= */

async function loadDashboard() {
  try {
    const result = await apiPost("getAdminDashboard", {
      token: adminToken
    });

    if (!result.ok) {
      alert(result.message || "讀取 Dashboard 失敗");
      return;
    }

    const stats = result.stats || {};

    document.getElementById("todayCount").innerText =
      stats.todayCount || 0;

    document.getElementById("monthCount").innerText =
      stats.monthCount || 0;

    document.getElementById("pendingCount").innerText =
      stats.pendingCount || 0;

    document.getElementById("scheduledCount").innerText =
      stats.scheduledCount || 0;

    document.getElementById("doneCount").innerText =
      stats.doneCount || 0;

    renderRecentBookings(result.recentBookings || []);

  } catch (error) {
    console.error(error);
    alert("讀取 Dashboard 失敗");
  }
}

function renderRecentBookings(list) {
  const box = document.getElementById("recentBookings");

  if (!box) return;

  if (!list.length) {
    box.innerHTML = `<div class="empty">目前沒有最新案件</div>`;
    return;
  }

  let html = `
    <table>
      <thead>
        <tr>
          <th>案件</th>
          <th>姓名</th>
          <th>方案</th>
          <th>日期</th>
          <th>狀態</th>
        </tr>
      </thead>
      <tbody>
  `;

  list.forEach(item => {
    const bookingId = item["案件編號"] || "";

    html += `
      <tr onclick="openBookingDetailById('${escapeAttr(bookingId)}')">
        <td>${escapeHtml(bookingId)}</td>
        <td>${escapeHtml(item["姓名"] || "")}</td>
        <td>${escapeHtml(item["方案"] || item["方案名稱"] || "")}</td>
        <td>${escapeHtml(formatDate(item["預約日期"]))}</td>
        <td>${renderStatus(item["狀態"])}</td>
      </tr>
    `;
  });

  html += `
      </tbody>
    </table>
  `;

  box.innerHTML = html;
}

/* =========================
   案件管理
========================= */

async function loadBookings() {
  try {
    const result = await apiPost("getAdminBookings", {
      token: adminToken
    });

    if (!result.ok) {
      alert(result.message || "讀取案件失敗");
      return;
    }

    bookingsData = result.data || [];
    renderBookings(bookingsData);

  } catch (error) {
    console.error(error);
    alert("讀取案件失敗");
  }
}

function renderBookings(list) {
  const box = document.getElementById("bookingTable");

  if (!box) return;

  if (!list.length) {
    box.innerHTML = `<div class="empty">目前沒有案件資料</div>`;
    return;
  }

  let html = `
    <table>
      <thead>
        <tr>
          <th>案件編號</th>
          <th>姓名</th>
          <th>電話</th>
          <th>方案</th>
          <th>日期</th>
          <th>狀態</th>
          <th>操作</th>
        </tr>
      </thead>
      <tbody>
  `;

  list.slice().reverse().forEach(item => {
    const bookingId = item["案件編號"] || "";

    html += `
      <tr>
        <td>${escapeHtml(bookingId)}</td>
        <td>${escapeHtml(item["姓名"] || "")}</td>
        <td>
          <a href="tel:${escapeAttr(item["電話"] || "")}">
            ${escapeHtml(item["電話"] || "")}
          </a>
        </td>
        <td>${escapeHtml(item["方案"] || item["方案名稱"] || "")}</td>
        <td>${escapeHtml(formatDate(item["預約日期"]))}</td>
        <td>${renderStatus(item["狀態"])}</td>
        <td>
          <button class="view-btn" onclick="openBookingDetailById('${escapeAttr(bookingId)}')">
            查看
          </button>
        </td>
      </tr>
    `;
  });

  html += `
      </tbody>
    </table>
  `;

  box.innerHTML = html;
}

function filterBookings() {
  const keyword =
    document.getElementById("bookingSearch").value.trim();

  if (!keyword) {
    renderBookings(bookingsData);
    return;
  }

  const filtered = bookingsData.filter(item => {
    const text = JSON.stringify(item);
    return text.includes(keyword);
  });

  renderBookings(filtered);
}

function openBookingDetailById(bookingId) {
  const booking = bookingsData.find(
    item => item["案件編號"] === bookingId
  );

  if (!booking) {
    alert("找不到案件");
    return;
  }

  selectedBooking = booking;
  renderBookingDetail(booking);

  document.getElementById("bookingModal").classList.remove("hidden");
}

function renderBookingDetail(item) {
  const box = document.getElementById("bookingDetail");

  const bookingId = item["案件編號"] || "";

  box.innerHTML = `
    <div class="detail-grid">
      ${detailItem("案件編號", item["案件編號"])}
      ${detailItem("狀態", item["狀態"])}
      ${detailItem("姓名", item["姓名"])}
      ${detailItem("電話", item["電話"])}
      ${detailItem("Email", item["Email"] || item["email"])}
      ${detailItem("方案", item["方案"] || item["方案名稱"])}
      ${detailItem("價格", item["價格"])}
      ${detailItem("建案名稱", item["建案名稱"])}
      ${detailItem("驗屋地址", item["驗屋地址"])}
      ${detailItem("戶別 / 樓層", item["戶別樓層"])}
      ${detailItem("權狀坪數", item["權狀坪數"])}
      ${detailItem("主建物＋附屬建物坪數", item["主建物附屬坪數"])}
      ${detailItem("房數", item["房數"])}
      ${detailItem("露台坪數", item["露台坪數"])}
      ${detailItem("挑高 / 樓高", item["挑高樓高"])}
      ${detailItem("預約日期", formatDate(item["預約日期"]))}
      ${detailItem("預約時段", item["預約時段"])}
      ${detailItem("載具", item["載具"])}
      ${detailItem("統編", item["統編"])}
      ${detailItem("抬頭", item["抬頭"])}
      ${detailItem("備註", item["備註"])}
    </div>

    <select id="detailStatus" class="status-select">
      ${statusOption("待聯絡", item["狀態"])}
      ${statusOption("已聯絡", item["狀態"])}
      ${statusOption("已排程", item["狀態"])}
      ${statusOption("已完成", item["狀態"])}
      ${statusOption("已取消", item["狀態"])}
    </select>

    <button class="save-btn" onclick="saveBookingStatus('${escapeAttr(bookingId)}')">
      更新案件狀態
    </button>
  `;
}

function detailItem(label, value) {
  return `
    <div class="detail-item">
      <label>${escapeHtml(label)}</label>
      <strong>${escapeHtml(value || "-")}</strong>
    </div>
  `;
}

function statusOption(value, current) {
  return `
    <option value="${escapeAttr(value)}" ${value === current ? "selected" : ""}>
      ${escapeHtml(value)}
    </option>
  `;
}

async function saveBookingStatus(bookingId) {
  const status = document.getElementById("detailStatus").value;

  try {
    const result = await apiPost("updateBookingStatus", {
      token: adminToken,
      bookingId,
      status
    });

    if (!result.ok) {
      alert(result.message || "更新失敗");
      return;
    }

    alert("案件狀態已更新");

    closeModal();
    loadBookings();
    loadDashboard();

  } catch (error) {
    console.error(error);
    alert("更新失敗");
  }
}

function closeModal() {
  document.getElementById("bookingModal").classList.add("hidden");
}

/* =========================
   帳號管理
========================= */

async function loadAccounts() {
  if (!currentUser || currentUser.role !== "老闆") return;

  try {
    const result = await apiPost("getAdminAccounts", {
      token: adminToken
    });

    if (!result.ok) {
      alert(result.message || "讀取帳號失敗");
      return;
    }

    accountsData = result.data || [];
    renderAccounts(accountsData);

  } catch (error) {
    console.error(error);
    alert("讀取帳號失敗");
  }
}

function renderAccounts(list) {
  const box = document.getElementById("accountTable");

  if (!box) return;

  if (!list.length) {
    box.innerHTML = `<div class="empty">目前沒有帳號資料</div>`;
    return;
  }

  let tableHtml = `
    <div class="desktop-account-table">
      <table>
        <thead>
          <tr>
            <th>帳號</th>
            <th>名稱</th>
            <th>角色</th>
            <th>狀態</th>
            <th>啟用</th>
            <th>接收通知</th>
            <th>LINE UserId</th>
            <th>建立時間</th>
            <th>操作</th>
          </tr>
        </thead>
        <tbody>
  `;

  list.forEach(item => {
    const username = item["帳號"] || "";
    const status = item["狀態"] || "";
    const role = item["角色"] || "客服";
    const enabled = isTrue(item["啟用"]);
    const receive = isTrue(item["接收通知"]);

    tableHtml += `
      <tr>
        <td>${escapeHtml(username)}</td>
        <td>${escapeHtml(item["名稱"] || "")}</td>

        <td>
          <select class="role-select" onchange="updateAccountRole('${escapeAttr(username)}',this.value)">
            ${roleOption("老闆", role)}
            ${roleOption("主管", role)}
            ${roleOption("驗屋師", role)}
            ${roleOption("客服", role)}
          </select>
        </td>

        <td>${renderAccountStatus(status)}</td>
        <td>${enabled ? "TRUE" : "FALSE"}</td>

        <td>
          <label>
            <input
              type="checkbox"
              class="notify-check"
              ${receive ? "checked" : ""}
              onchange="updateAccountNotification('${escapeAttr(username)}',this.checked)"
            >
            ${receive ? "TRUE" : "FALSE"}
          </label>
        </td>

        <td>${escapeHtml(item["LINE UserId"] || "")}</td>
        <td>${escapeHtml(formatDateTime(item["建立時間"]))}</td>

        <td>
          <div class="account-actions">
            <button class="approve-btn" onclick="approveAccount('${escapeAttr(username)}')">核准</button>
            <button class="reject-btn" onclick="rejectAccount('${escapeAttr(username)}')">拒絕</button>
            <button class="disable-btn" onclick="disableAccount('${escapeAttr(username)}')">停用</button>
            <button class="delete-btn" onclick="deleteAccount('${escapeAttr(username)}')">刪除</button>
          </div>
        </td>
      </tr>
    `;
  });

  tableHtml += `
        </tbody>
      </table>
    </div>
  `;

  let cardHtml = `
    <div class="mobile-account-card">
  `;

  list.forEach(item => {
    const username = item["帳號"] || "";
    const status = item["狀態"] || "";
    const role = item["角色"] || "客服";
    const enabled = isTrue(item["啟用"]);
    const receive = isTrue(item["接收通知"]);

    cardHtml += `
      <div class="account-card">
        <h3>${escapeHtml(item["名稱"] || username)}</h3>
        <p>帳號：${escapeHtml(username)}</p>
        <p>狀態：${statusText(status)}</p>
        <p>啟用：${enabled ? "TRUE" : "FALSE"}</p>
        <p>LINE：${escapeHtml(item["LINE UserId"] || "未填")}</p>

        <select class="role-select" onchange="updateAccountRole('${escapeAttr(username)}',this.value)">
          ${roleOption("老闆", role)}
          ${roleOption("主管", role)}
          ${roleOption("驗屋師", role)}
          ${roleOption("客服", role)}
        </select>

        <label>
          <input
            type="checkbox"
            class="notify-check"
            ${receive ? "checked" : ""}
            onchange="updateAccountNotification('${escapeAttr(username)}',this.checked)"
          >
          接收 LINE 通知：${receive ? "TRUE" : "FALSE"}
        </label>

        <div class="account-actions">
          <button class="approve-btn" onclick="approveAccount('${escapeAttr(username)}')">核准</button>
          <button class="reject-btn" onclick="rejectAccount('${escapeAttr(username)}')">拒絕</button>
          <button class="disable-btn" onclick="disableAccount('${escapeAttr(username)}')">停用</button>
          <button class="delete-btn" onclick="deleteAccount('${escapeAttr(username)}')">刪除</button>
        </div>
      </div>
    `;
  });

  cardHtml += `
    </div>
  `;

  box.innerHTML = tableHtml + cardHtml;
}

function roleOption(value, current) {
  return `
    <option value="${escapeAttr(value)}" ${value === current ? "selected" : ""}>
      ${escapeHtml(value)}
    </option>
  `;
}

async function approveAccount(username) {
  if (!confirm(`確定核准帳號：${username}？`)) return;

  const result = await apiPost("approveAdmin", {
    token: adminToken,
    username
  });

  if (result.ok) {
    alert("已核准");
    loadAccounts();
    loadDashboard();
  } else {
    alert(result.message || "核准失敗");
  }
}

async function rejectAccount(username) {
  if (!confirm(`確定拒絕帳號：${username}？`)) return;

  const result = await apiPost("rejectAdmin", {
    token: adminToken,
    username
  });

  if (result.ok) {
    alert("已拒絕");
    loadAccounts();
    loadDashboard();
  } else {
    alert(result.message || "拒絕失敗");
  }
}

async function disableAccount(username) {
  if (!confirm(`確定停用帳號：${username}？停用後會立即失效。`)) return;

  const result = await apiPost("disableAdmin", {
    token: adminToken,
    username
  });

  if (result.ok) {
    alert("已停用");
    loadAccounts();
  } else {
    alert(result.message || "停用失敗");
  }
}

async function deleteAccount(username) {
  if (!confirm(`確定刪除帳號：${username}？刪除後無法復原。`)) return;

  const result = await apiPost("deleteAdmin", {
    token: adminToken,
    username
  });

  if (result.ok) {
    alert("已刪除");
    loadAccounts();
    loadDashboard();
  } else {
    alert(result.message || "刪除失敗");
  }
}

async function updateAccountRole(username, role) {
  const result = await apiPost("updateAdminRole", {
    token: adminToken,
    username,
    role
  });

  if (result.ok) {
    alert("角色已更新");
    loadAccounts();
  } else {
    alert(result.message || "角色更新失敗");
    loadAccounts();
  }
}

async function updateAccountNotification(username, receiveNotification) {
  const result = await apiPost("updateAdminNotification", {
    token: adminToken,
    username,
    receiveNotification
  });

  if (result.ok) {
    loadAccounts();
  } else {
    alert(result.message || "通知設定失敗");
    loadAccounts();
  }
}

/* =========================
   小工具
========================= */

function renderStatus(status) {
  const s = status || "待聯絡";

  let cls = "status-pending";

  if (s === "已聯絡") cls = "status-contacted";
  if (s === "已排程") cls = "status-scheduled";
  if (s === "已完成") cls = "status-done";
  if (s === "已取消") cls = "status-cancel";

  return `<span class="status ${cls}">${escapeHtml(s)}</span>`;
}

function renderAccountStatus(status) {
  return `<span class="status ${accountStatusClass(status)}">${escapeHtml(status || "-")}</span>`;
}

function accountStatusClass(status) {
  if (status === "已核准") return "status-done";
  if (status === "待審核") return "status-pending";
  if (status === "停用") return "status-disabled";
  if (status === "已拒絕") return "status-rejected";
  return "status-contacted";
}

function statusText(status) {
  return status || "-";
}

function isTrue(value) {
  return value === true || String(value).toUpperCase() === "TRUE";
}

function formatDate(value) {
  if (!value) return "";

  const date = new Date(value);

  if (isNaN(date.getTime())) {
    return String(value).slice(0, 10);
  }

  return date.toLocaleDateString("zh-TW");
}

function formatDateTime(value) {
  if (!value) return "";

  const date = new Date(value);

  if (isNaN(date.getTime())) {
    return String(value);
  }

  return date.toLocaleString("zh-TW");
}

function escapeHtml(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function escapeAttr(value) {
  return escapeHtml(value).replaceAll("`", "&#096;");
}
