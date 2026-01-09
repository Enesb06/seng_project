// assets/js/student/support.js
import { _supabase } from "../supabaseClient.js";

const subjectInput = document.getElementById("support-subject");
const messageInput = document.getElementById("support-message");
const createBtn    = document.getElementById("create-thread");

const threadsList  = document.getElementById("my-threads-list");

const logoutBtn    = document.getElementById("logout-button");
const welcomeMessage = document.getElementById("welcome-message");
const userAvatar = document.getElementById("user-avatar");
const DEFAULT_AVATAR_URL = "https://api.dicebear.com/7.x/avataaars/svg?seed=base";

const getUser = () => JSON.parse(localStorage.getItem("user") || "null");

let threadsCache = [];

function escapeHtml(str = "") {
  return str
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

const formatStatusText = (status) => (status === "closed" ? "Closed" : "Open");

const goToThread = (threadId) => {
  // aynı klasörde support-thread.html olacağı için bu şekilde bırakıyoruz
  window.location.href = `support-thread.html?id=${encodeURIComponent(threadId)}`;
};

const renderThreads = (threads) => {
  if (!threadsList) return;

  if (!threads || threads.length === 0) {
    threadsList.innerHTML = `<p style="color:#6b7280;margin:0;">You don't have any support requests yet.</p>`;
    return;
  }

  threadsList.innerHTML = threads.map((t) => `
    <div class="u-thread" data-thread-id="${t.id}" style="
      border:1px solid #e5e7eb;border-radius:10px;padding:10px 12px;margin-bottom:8px;background:#ffffff;cursor:pointer;">
      <div style="display:flex;justify-content:space-between;gap:10px;align-items:center;">
        <div style="font-weight:700;font-size:0.95rem;">${escapeHtml(t.subject || "Untitled")}</div>
        <span style="font-size:0.72rem;padding:4px 8px;border-radius:999px;
          background:${t.status === "closed" ? "#fee2e2" : "#dcfce7"};
          color:${t.status === "closed" ? "#b91c1c" : "#166534"};">
          ${formatStatusText(t.status)}
        </span>
      </div>
      <div style="font-size:0.8rem;color:#6b7280;margin-top:2px;">
        ${new Date(t.created_at).toLocaleString("tr-TR")}
      </div>
    </div>
  `).join("");

  Array.from(threadsList.querySelectorAll(".u-thread")).forEach((el) => {
    el.addEventListener("click", () => {
      const id = el.getAttribute("data-thread-id");
      if (id) goToThread(id);
    });
  });
};

const loadMyThreads = async () => {
  const user = getUser();
  if (!user) return;

  const { data, error } = await _supabase
    .from("support_threads")
    .select("*")
    .eq("created_by_user_id", user.id)
    .order("created_at", { ascending: false });

  if (error) {
    if (threadsList) threadsList.innerHTML = "Error occurred while loading.";
    return;
  }

  threadsCache = data || [];
  renderThreads(threadsCache);
};

// Yeni talep oluştur (thread + ilk mesaj)
if (createBtn) {
  createBtn.onclick = async () => {
    const user = getUser();
    if (!user) return;

    const subject = (subjectInput?.value || "").trim();
    const message = (messageInput?.value || "").trim();

    if (!subject || !message) {
      alert("Subject and message cannot be empty!");
      return;
    }

    const { data: thread, error } = await _supabase
      .from("support_threads")
      .insert({
        created_by_user_id: user.id,
        created_by_role: user.role || "student",
        subject,
        status: "open"
      })
      .select()
      .single();

    if (error) {
      console.error(error);
      alert("An error occurred while creating the request.");
      return;
    }

    const { error: msgErr } = await _supabase
      .from("support_messages")
      .insert({
        thread_id: thread.id,
        sender_user_id: user.id,
        sender_role: user.role || "student",
        message
      });

    if (msgErr) {
      console.error(msgErr);
      alert("An error occurred while adding the message.");
      return;
    }

    subjectInput.value = "";
    messageInput.value = "";

    // listeyi güncelle ve direkt yeni sayfaya git
    await loadMyThreads();
    goToThread(thread.id);
  };
}

// Logout
if (logoutBtn) {
  logoutBtn.onclick = () => {
    localStorage.removeItem("user");
    window.location.href = "../../index.html";
  };
}

// Başlat
document.addEventListener('DOMContentLoaded', () => {
  const user = getUser();

  if (!user) {
    window.location.href = "../../index.html";
    return;
  }

  if (welcomeMessage) {
    welcomeMessage.innerText = `Welcome, ${user.full_name}!`;
  }

  if (userAvatar) {
    if (user.avatar_url) {
      userAvatar.src = user.avatar_url;
    } else {
      userAvatar.src = DEFAULT_AVATAR_URL;
    }
  }

  loadMyThreads();
});
