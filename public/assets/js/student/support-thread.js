// assets/js/student/support-thread.js
import { _supabase } from "../supabaseClient.js";

const qs = new URLSearchParams(window.location.search);
const threadId = qs.get("id");

const backBtn = document.getElementById("back-btn");
const subjectEl = document.getElementById("thread-subject");
const metaEl = document.getElementById("thread-meta");
const statusEl = document.getElementById("thread-status");

const messagesEl = document.getElementById("chat-messages");
const inputEl = document.getElementById("chat-input");
const sendBtn = document.getElementById("chat-send");

const getUser = () => JSON.parse(localStorage.getItem("user") || "null");

function escapeHtml(str = "") {
  return str
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

const formatStatusText = (status) => (status === "closed" ? "Closed" : "Open");

const setStatusPill = (status) => {
  if (!statusEl) return;
  statusEl.textContent = formatStatusText(status);

  if (status === "closed") {
    statusEl.style.background = "#fee2e2";
    statusEl.style.color = "#b91c1c";
  } else {
    statusEl.style.background = "#dcfce7";
    statusEl.style.color = "#166534";
  }
};

backBtn?.addEventListener("click", () => {
  window.location.href = "support.html";
});

const renderMessage = (m, myRole) => {
  const isMine = (m.sender_role === myRole);
  const roleLabel = (m.sender_role === "admin") ? "Admin" : "You";

  const wrap = document.createElement("div");

  // ✅ ÖNEMLİ DÜZELTME: CSS'in beklediği class isimleriyle eşleştiriyoruz
  // mine/theirs yerine me/other
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

const loadThreadInfo = async () => {
  const { data, error } = await _supabase
    .from("support_threads")
    .select("*")
    .eq("id", threadId)
    .single();

  if (error || !data) {
    if (subjectEl) subjectEl.textContent = "Thread not found";
    if (metaEl) metaEl.textContent = "";
    return null;
  }

  if (subjectEl) subjectEl.textContent = data.subject || "Untitled";
  if (metaEl) metaEl.textContent = new Date(data.created_at).toLocaleString("tr-TR");
  setStatusPill(data.status);

  const isClosed = data.status === "closed";
  if (inputEl) inputEl.disabled = isClosed;
  if (sendBtn) sendBtn.disabled = isClosed;
  if (inputEl) inputEl.placeholder = isClosed
    ? "Request closed. You cannot send messages."
    : "Type a message...";

  return data;
};

const loadMessages = async () => {
  if (!messagesEl) return;

  messagesEl.innerHTML = `<div style="padding:14px;color:#6b7280;">Loading messages...</div>`;

  const { data, error } = await _supabase
    .from("support_messages")
    .select("*")
    .eq("thread_id", threadId)
    .order("created_at", { ascending: true });

  if (error) {
    messagesEl.innerHTML = `<div style="padding:14px;color:red;">Error: ${error.message || ""}</div>`;
    return;
  }

  messagesEl.innerHTML = "";

  const user = getUser();
  const myRole = user?.role || "student";

  if (!data || data.length === 0) {
    messagesEl.innerHTML = `<div style="padding:14px;color:#6b7280;">No messages yet.</div>`;
    return;
  }

  data.forEach(m => renderMessage(m, myRole));
  messagesEl.scrollTop = messagesEl.scrollHeight;
};

sendBtn?.addEventListener("click", async () => {
  const user = getUser();
  if (!user) return;

  const msg = (inputEl?.value || "").trim();
  if (!msg) {
    alert("You cannot send an empty message.");
    return;
  }

  const { error } = await _supabase
    .from("support_messages")
    .insert({
      thread_id: threadId,
      sender_user_id: user.id,
      sender_role: user.role || "student",
      message: msg
    });

  if (error) {
    alert("Error sending message: " + (error.message || ""));
    return;
  }

  inputEl.value = "";
  await loadMessages();
});

document.addEventListener("DOMContentLoaded", async () => {
  const user = getUser();
  if (!user) {
    window.location.href = "../../index.html";
    return;
  }

  if (!threadId) {
    if (subjectEl) subjectEl.textContent = "Thread not found";
    return;
  }

  await loadThreadInfo();
  await loadMessages();
});
