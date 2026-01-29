// assets/js/admin/support.js
import { _supabase } from "../supabaseClient.js";

/* ========= ELEMENTS ========= */
const threadsList       = document.getElementById("my-threads-list");

const drawer            = document.getElementById("history-drawer");
const backdrop          = document.getElementById("drawer-backdrop");
const historyToggle     = document.getElementById("history-toggle");
const drawerClose       = document.getElementById("drawer-close");

const titleInput        = document.getElementById("thread-title");
const statusEl          = document.getElementById("thread-status");
const statusSelect      = document.getElementById("thread-status-select");
const updateStatusBtn   = document.getElementById("update-status-btn");

const messagesEl        = document.getElementById("chat-messages");
const inputEl           = document.getElementById("chat-input");
const sendBtn           = document.getElementById("chat-send");

const adminNameEl       = document.getElementById("admin-display-name");
const userAvatar        = document.getElementById("admin-avatar"); // EKLENDİ

const logoutBtn         = document.getElementById("logout-button");

const DEFAULT_AVATAR_URL = "https://api.dicebear.com/7.x/avataaars/svg?seed=Admin";

// /public base path (Live Server vb.)
const BASE = window.location.pathname.startsWith("/public/") ? "/public" : "";
const withBase = (p) => `${BASE}${p}`;

/* ========= USER ========= */
const getUser = () => {
  try { return JSON.parse(localStorage.getItem("user") || "null"); }
  catch { return null; }
};

function escapeHtml(str = "") {
  return String(str)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

/* ========= STATE ========= */
let threadsCache = [];
let activeThreadId = null;

/* ========= UI HELPERS ========= */
const openDrawer = () => {
  drawer?.classList.add("open");
  if (backdrop) backdrop.style.display = "block";
};
const closeDrawer = () => {
  drawer?.classList.remove("open");
  if (backdrop) backdrop.style.display = "none";
};

const formatStatusText = (status) => (status === "closed" ? "Closed" : "Open");

const applyStatusPill = (status) => {
  if (!statusEl) return;

  statusEl.textContent = formatStatusText(status);
  statusEl.classList.remove("closed");
  if (status === "closed") statusEl.classList.add("closed");

  if (statusSelect) statusSelect.value = status === "closed" ? "closed" : "open";

  const isClosed = status === "closed";
  if (inputEl) inputEl.disabled = isClosed;
  if (sendBtn) sendBtn.disabled = isClosed;

  if (inputEl) {
    inputEl.placeholder = isClosed
      ? "Request closed. You cannot send messages."
      : "Write a reply...";
  }
};

const setChatEmpty = (text) => {
  if (!messagesEl) return;
  messagesEl.innerHTML = `<div class="chat-empty">${escapeHtml(text)}</div>`;
};

/* ========= DRAWER RENDER ========= */
const renderThreads = (threads) => {
  if (!threadsList) return;

  if (!threads || threads.length === 0) {
    threadsList.innerHTML = `<div class="drawer-empty">No support requests.</div>`;
    return;
  }

  threadsList.innerHTML = threads.map((t) => {
    const isActive = String(t.id) === String(activeThreadId);
    const status = t.status || "open";
    const who = (t.created_by_role === "teacher") ? "Teacher" : "Student";

    return `
      <button class="thread-item ${isActive ? "active" : ""}" data-id="${t.id}">
        <div class="thread-row">
          <div class="thread-name">${escapeHtml(t.subject || "New Support Chat")}</div>
          <span class="mini-pill ${status === "closed" ? "closed" : "open"}">
            ${formatStatusText(status)}
          </span>
        </div>
        <div class="thread-sub">${who} • ${new Date(t.created_at).toLocaleString("tr-TR")}</div>
      </button>
    `;
  }).join("");

  Array.from(threadsList.querySelectorAll(".thread-item")).forEach((btn) => {
    btn.addEventListener("click", async () => {
      const id = btn.getAttribute("data-id");
      if (!id) return;
      await selectThread(id);
      closeDrawer();
    });
  });
};

/* ========= DATA LOAD ========= */
const loadAllThreads = async () => {
  const { data, error } = await _supabase
    .from("support_threads")
    .select("*")
    .order("created_at", { ascending: false });

  if (error) {
    console.error("loadAllThreads error:", error);
    if (threadsList) threadsList.innerHTML = `<div class="drawer-empty">Error loading history.</div>`;
    return;
  }

  threadsCache = data || [];
  renderThreads(threadsCache);
};

const loadThreadInfo = async (threadId) => {
  const { data, error } = await _supabase
    .from("support_threads")
    .select("*")
    .eq("id", threadId)
    .single();

  if (error || !data) {
    console.error("loadThreadInfo error:", error);
    return null;
  }

  if (titleInput) titleInput.value = data.subject || "Support Chat";
  applyStatusPill(data.status || "open");
  return data;
};

const renderMessage = (m) => {
  if (!messagesEl) return;

  const isMine = (m.sender_role === "admin");
  const roleLabel =
    m.sender_role === "admin" ? "Admin"
    : m.sender_role === "teacher" ? "Teacher"
    : "Student";

  const wrap = document.createElement("div");
  wrap.className = `msg ${isMine ? "me" : "other"}`;

  wrap.innerHTML = `
    <div class="bubble">
      <div class="meta">
        <strong>${roleLabel}</strong> • ${new Date(m.created_at).toLocaleString("tr-TR")}
      </div>
      <div class="text">${escapeHtml(m.message)}</div>
    </div>
  `;

  messagesEl.appendChild(wrap);
};

const loadMessages = async (threadId) => {
  if (!messagesEl) return;

  messagesEl.innerHTML = `<div class="chat-loading">Loading...</div>`;

  const { data, error } = await _supabase
    .from("support_messages")
    .select("*")
    .eq("thread_id", threadId)
    .order("created_at", { ascending: true });

  if (error) {
    console.error("loadMessages error:", error);
    messagesEl.innerHTML = `<div class="chat-loading error">Error loading messages.</div>`;
    return;
  }

  messagesEl.innerHTML = "";

  if (!data || data.length === 0) {
    setChatEmpty("No messages yet.");
    return;
  }

  data.forEach(renderMessage);
  messagesEl.scrollTop = messagesEl.scrollHeight;
};

const selectThread = async (threadId) => {
  activeThreadId = threadId;
  renderThreads(threadsCache);

  const info = await loadThreadInfo(threadId);
  if (!info) {
    setChatEmpty("Chat not found.");
    return;
  }

  await loadMessages(threadId);
};

/* ========= UPDATE STATUS ========= */
const updateStatus = async () => {
  const user = getUser();
  if (!user || user.role !== "admin") return;
  if (!activeThreadId) return;

  const nextStatus = statusSelect?.value || "open";

  const { error } = await _supabase
    .from("support_threads")
    .update({ status: nextStatus })
    .eq("id", activeThreadId);

  if (error) {
    console.error("updateStatus error:", error);
    alert("Could not update status.");
    return;
  }

  applyStatusPill(nextStatus);
  await loadAllThreads();
  renderThreads(threadsCache);
};

/* ========= SEND MESSAGE ========= */
const sendMessage = async () => {
  const user = getUser();
  if (!user || user.role !== "admin") return;

  if (!activeThreadId) {
    alert("Önce bir talep seç.");
    return;
  }

  const msg = (inputEl?.value || "").trim();
  if (!msg) return;

  const { error } = await _supabase
    .from("support_messages")
    .insert({
      thread_id: activeThreadId,
      sender_user_id: user.id,
      sender_role: "admin",
      message: msg,
    });

  if (error) {
    console.error("sendMessage error:", error);
    alert("Error sending message: " + (error.message || ""));
    return;
  }

  inputEl.value = "";
  await loadMessages(activeThreadId);
};

/* ========= EVENTS ========= */
historyToggle?.addEventListener("click", openDrawer);
drawerClose?.addEventListener("click", closeDrawer);
backdrop?.addEventListener("click", closeDrawer);

updateStatusBtn?.addEventListener("click", updateStatus);

sendBtn?.addEventListener("click", sendMessage);
inputEl?.addEventListener("keydown", (e) => {
  if (e.key === "Enter" && !e.shiftKey) {
    e.preventDefault();
    sendMessage();
  }
});

/* ========= AUTH + INIT ========= */
if (logoutBtn) {
  logoutBtn.onclick = () => {
    localStorage.removeItem("user");
    window.location.href = withBase("/index.html");
  };
}

document.addEventListener("DOMContentLoaded", async () => {
  const user = getUser();
  if (!user || user.role !== "admin") {
    window.location.href = withBase("/index.html");
    return;
  }

  if (adminNameEl) adminNameEl.textContent = user.full_name || "Admin";
  if (userAvatar) userAvatar.src = user.avatar_url || DEFAULT_AVATAR_URL;

  if (!messagesEl) {
    console.error("Chat messages element not found!");
    return;
  }

  await loadAllThreads();

  if (threadsCache.length > 0) {
    await selectThread(threadsCache[0].id);
  } else {
    setChatEmpty("No support requests yet.");
  }
});
