// assets/js/admin/support-thread.js
import { _supabase } from "../supabaseClient.js";

const params = new URLSearchParams(window.location.search);
const threadId = params.get("id");

function escapeHtml(str = "") {
  return String(str)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

const formatRole = (role) => {
  if (role === "student") return "Student";
  if (role === "teacher") return "Teacher";
  if (role === "admin") return "Admin";
  return role || "-";
};

const formatStatusText = (status) => (status === "closed" ? "Closed" : "Open");

document.addEventListener("DOMContentLoaded", () => {
  if (!threadId) {
    alert("Thread ID not found");
    window.location.href = "./admin_support.html";
    return;
  }

  const backBtn = document.getElementById("back-btn");

  const subjectEl = document.getElementById("thread-subject");
  const metaEl = document.getElementById("thread-meta");
  const statusPillEl = document.getElementById("thread-status");

  const statusSelect = document.getElementById("thread-status-select");
  const updateStatusBtn = document.getElementById("update-status-btn");

  const messagesEl = document.getElementById("chat-messages");
  const inputEl = document.getElementById("chat-input");
  const sendBtn = document.getElementById("chat-send");

  const currentUser = JSON.parse(localStorage.getItem("user") || "null");

  const goBack = () => {
    window.location.href = "./admin_support.html";
  };
  backBtn?.addEventListener("click", goBack);

  const setStatusPill = (status) => {
    if (!statusPillEl) return;
    statusPillEl.textContent = formatStatusText(status);

    if (status === "closed") statusPillEl.classList.add("closed");
    else statusPillEl.classList.remove("closed");
  };

  const applyClosedState = (status) => {
    const isClosed = status === "closed";
    if (inputEl) inputEl.disabled = isClosed;
    if (sendBtn) sendBtn.disabled = isClosed;
    if (inputEl) {
      inputEl.placeholder = isClosed
        ? "Request closed. You cannot send messages."
        : "Write a reply to this request...";
    }
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

      // ✅ UI tutarlılığı: bulunamadıysa kapalı gibi davran
      if (statusSelect) statusSelect.value = "closed";
      setStatusPill("closed");
      applyClosedState("closed");
      return null;
    }

    if (subjectEl) subjectEl.textContent = data.subject || "Untitled";
    if (metaEl) {
      metaEl.textContent = `${formatRole(data.created_by_role)} • ${new Date(
        data.created_at
      ).toLocaleString("tr-TR")}`;
    }

    const status = data.status || "open";
    if (statusSelect) statusSelect.value = status;
    setStatusPill(status);
    applyClosedState(status);

    return data;
  };

  const loadMessages = async () => {
    if (!messagesEl) return;

    messagesEl.innerHTML = `<div style="color:#6b7280;">Loading messages...</div>`;

    const { data, error } = await _supabase
      .from("support_messages")
      .select("*")
      .eq("thread_id", threadId)
      .order("created_at", { ascending: true });

    if (error) {
      messagesEl.innerHTML = `<div style="color:red;">Error loading messages: ${escapeHtml(
        error.message || ""
      )}</div>`;
      return;
    }

    if (!data || data.length === 0) {
      messagesEl.innerHTML = `<div style="color:#6b7280;">No messages yet.</div>`;
      return;
    }

    messagesEl.innerHTML = data
      .map((m) => {
        const isMe = m.sender_role === "admin";
        return `
          <div class="msg ${isMe ? "me" : "other"}">
            <div class="meta">
              <strong>${formatRole(m.sender_role)}</strong> • ${new Date(
                m.created_at
              ).toLocaleString("tr-TR")}
            </div>
            <div class="text">${escapeHtml(m.message)}</div>
          </div>
        `;
      })
      .join("");

    messagesEl.scrollTop = messagesEl.scrollHeight;
  };

  updateStatusBtn?.addEventListener("click", async () => {
    const newStatus = statusSelect?.value || "open";

    const { error } = await _supabase
      .from("support_threads")
      .update({ status: newStatus })
      .eq("id", threadId);

    if (error) {
      alert("Error updating status: " + (error.message || ""));
      return;
    }

    setStatusPill(newStatus);
    applyClosedState(newStatus);
  });

  const sendMessage = async () => {
    const msg = (inputEl?.value || "").trim();
    if (!msg) return;

    if (!currentUser) {
      alert("Session not found.");
      return;
    }

    const payload = {
      thread_id: threadId,
      sender_role: "admin",
      message: msg,
    };

    if (currentUser?.id) payload.sender_user_id = currentUser.id;

    const { error } = await _supabase.from("support_messages").insert(payload);

    if (error) {
      alert("Error sending message: " + (error.message || ""));
      return;
    }

    if (inputEl) inputEl.value = "";
    await loadMessages();
  };

  sendBtn?.addEventListener("click", sendMessage);

  inputEl?.addEventListener("keydown", (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  });

  (async () => {
    await loadThreadInfo();
    await loadMessages();
  })();
});
