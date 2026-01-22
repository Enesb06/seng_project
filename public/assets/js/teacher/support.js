// assets/js/teacher/support.js
import { _supabase } from "../supabaseClient.js";

/* ========= ELEMENTS ========= */
const threadsList     = document.getElementById("my-threads-list");

const drawer          = document.getElementById("history-drawer");
const backdrop        = document.getElementById("drawer-backdrop");
const historyToggle   = document.getElementById("history-toggle");
const drawerClose     = document.getElementById("drawer-close");
const newChatBtn      = document.getElementById("new-chat-btn");

const titleInput      = document.getElementById("thread-title");
const editTitleBtn    = document.getElementById("edit-title-btn");
const statusEl        = document.getElementById("thread-status");

const messagesEl      = document.getElementById("chat-messages");
const inputEl         = document.getElementById("chat-input");
const sendBtn         = document.getElementById("chat-send");

const logoutBtn       = document.getElementById("logout-button");
const welcomeMessage  = document.getElementById("welcome-message");
const userAvatar      = document.getElementById("user-avatar");

const DEFAULT_AVATAR_URL = "https://api.dicebear.com/7.x/avataaars/svg?seed=base";

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
let titleEditMode = false;

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

  const isClosed = status === "closed";
  if (inputEl) inputEl.disabled = isClosed;
  if (sendBtn) sendBtn.disabled = isClosed;

  if (inputEl) {
    inputEl.placeholder = isClosed
      ? "Request closed. You cannot send messages."
      : "Type a message...";
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
    threadsList.innerHTML = `<div class="drawer-empty">No chats yet.</div>`;
    return;
  }

  threadsList.innerHTML = threads.map((t) => {
    const isActive = String(t.id) === String(activeThreadId);
    const status = t.status || "open";
    return `
      <button class="thread-item ${isActive ? "active" : ""}" data-id="${t.id}">
        <div class="thread-row">
          <div class="thread-name">${escapeHtml(t.subject || "New Support Chat")}</div>
          <span class="mini-pill ${status === "closed" ? "closed" : "open"}">
            ${formatStatusText(status)}
          </span>
        </div>
        <div class="thread-sub">
          ${new Date(t.created_at).toLocaleString("tr-TR")}
        </div>
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
const loadMyThreads = async () => {
  const user = getUser();
  if (!user) return;

  const { data, error } = await _supabase
    .from("support_threads")
    .select("*")
    .eq("created_by_user_id", user.id)
    .order("created_at", { ascending: false });

  if (error) {
    console.error("loadMyThreads error:", error);
    if (threadsList) threadsList.innerHTML = `<div class="drawer-empty">Error loading history.</div>`;
    return;
  }

  threadsCache = data || [];
  renderThreads(threadsCache);
};

/* ========= THREAD SELECTION ========= */
const ensureAtLeastOneThread = async () => {
  const user = getUser();
  if (!user) return null;

  const saved = localStorage.getItem("active_support_thread_id");
  if (saved && threadsCache.some(t => String(t.id) === String(saved))) {
    return saved;
  }
  if (threadsCache.length > 0) return threadsCache[0].id;

  const created = await createNewThread("New Support Chat");
  return created?.id || null;
};

const createNewThread = async (subject = "New Support Chat") => {
  const user = getUser();
  if (!user) return null;

  const { data: thread, error } = await _supabase
    .from("support_threads")
    .insert({
      created_by_user_id: user.id,
      created_by_role: user.role || "teacher",
      subject,
      status: "open",
    })
    .select()
    .single();

  if (error) {
    console.error("createNewThread error:", error);
    alert("An error occurred while creating the request.");
    return null;
  }

  await loadMyThreads();
  return thread;
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

  if (titleInput) {
    titleInput.value = data.subject || "New Support Chat";
    titleInput.setAttribute("readonly", "readonly");
    titleEditMode = false;
  }

  applyStatusPill(data.status);
  return data;
};

const renderMessage = (m, myRole) => {
  const isMine = (m.sender_role === myRole);
  const roleLabel = (m.sender_role === "admin") ? "Admin" : "You";

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

  const user = getUser();
  const myRole = user?.role || "teacher";

  if (!data || data.length === 0) {
    setChatEmpty("Send a message to start the conversation.");
    return;
  }

  data.forEach(m => renderMessage(m, myRole));
  messagesEl.scrollTop = messagesEl.scrollHeight;
};

const selectThread = async (threadId) => {
  activeThreadId = threadId;
  localStorage.setItem("active_support_thread_id", String(threadId));

  renderThreads(threadsCache);

  const info = await loadThreadInfo(threadId);
  if (!info) {
    setChatEmpty("Chat not found.");
    return;
  }

  await loadMessages(threadId);
};

/* ========= TITLE EDIT ========= */
const toggleTitleEdit = async () => {
  if (!titleInput || !activeThreadId) return;

  if (!titleEditMode) {
    titleEditMode = true;
    titleInput.removeAttribute("readonly");
    titleInput.focus();
    titleInput.select();
    return;
  }

  const newTitle = (titleInput.value || "").trim() || "New Support Chat";
  titleInput.value = newTitle;

  const { error } = await _supabase
    .from("support_threads")
    .update({ subject: newTitle })
    .eq("id", activeThreadId);

  if (error) {
    console.error("update subject error:", error);
    alert("Could not update title.");
  }

  titleEditMode = false;
  titleInput.setAttribute("readonly", "readonly");

  await loadMyThreads();
};

/* ========= SEND MESSAGE ========= */
const sendMessage = async () => {
  const user = getUser();
  if (!user) return;

  if (!activeThreadId) return;

  const msg = (inputEl?.value || "").trim();
  if (!msg) {
    alert("You cannot send an empty message.");
    return;
  }

  const { error } = await _supabase
    .from("support_messages")
    .insert({
      thread_id: activeThreadId,
      sender_user_id: user.id,
      sender_role: user.role || "teacher",
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

newChatBtn?.addEventListener("click", async () => {
  const created = await createNewThread("New Support Chat");
  if (!created?.id) return;
  await selectThread(created.id);
  closeDrawer();
});

editTitleBtn?.addEventListener("click", toggleTitleEdit);

titleInput?.addEventListener("keydown", async (e) => {
  if (e.key === "Enter") {
    e.preventDefault();
    await toggleTitleEdit();
  }
});
titleInput?.addEventListener("blur", async () => {
  if (titleEditMode) await toggleTitleEdit();
});

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
    window.location.href = "../../index.html";
  };
}

document.addEventListener("DOMContentLoaded", async () => {
  const user = getUser();

  // Teacher sayfasında teacher olmayan giremesin
  if (!user || user.role !== "teacher") {
    window.location.href = "../../index.html";
    return;
  }

  if (welcomeMessage) welcomeMessage.innerText = `Welcome, ${user.full_name}!`;
  if (userAvatar) userAvatar.src = user.avatar_url ? user.avatar_url : DEFAULT_AVATAR_URL;

  await loadMyThreads();

  const first = await ensureAtLeastOneThread();
  if (!first) {
    setChatEmpty("Could not create chat.");
    return;
  }

  await selectThread(first);
});
