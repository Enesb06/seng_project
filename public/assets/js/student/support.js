// assets/js/student/support.js
import { _supabase } from "../supabaseClient.js";

const subjectInput = document.getElementById("support-subject");
const messageInput = document.getElementById("support-message");
const createBtn    = document.getElementById("create-thread");

const threadsList  = document.getElementById("my-threads-list");

const titleEl      = document.getElementById("user-selected-title");
const metaEl       = document.getElementById("user-selected-meta");
const statusEl     = document.getElementById("user-selected-status");

const messagesBox  = document.getElementById("user-messages-box");
const replyInput   = document.getElementById("user-reply-input");
const sendBtn      = document.getElementById("user-send-btn");

const logoutBtn    = document.getElementById("logout-button");
const welcomeMessage = document.getElementById("welcome-message");
const userAvatar = document.getElementById("user-avatar")

const getUser = () => JSON.parse(localStorage.getItem("user") || "null");

let selectedThreadId = null;
let threadsCache = [];

function escapeHtml(str = "") {
  return str
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

const formatStatusText = (status) => (status === "closed" ? "Kapalı" : "Açık");

const setStatusBadge = (status) => {
  if (!statusEl) return;
  statusEl.style.display = "inline-block";
  statusEl.textContent = formatStatusText(status);

  if (status === "closed") {
    statusEl.style.background = "#fee2e2";
    statusEl.style.color = "#b91c1c";
  } else {
    statusEl.style.background = "#dcfce7";
    statusEl.style.color = "#166534";
  }
};

const loadMessages = async (threadId) => {
  if (!threadId || !messagesBox) return;

  messagesBox.innerHTML = "<p style='color:#6b7280;'>Mesajlar yükleniyor...</p>";

  const { data, error } = await _supabase
    .from("support_messages")
    .select("*")
    .eq("thread_id", threadId)
    .order("created_at", { ascending: true });

  if (error) {
    messagesBox.innerHTML = `<p style="color:red;">Hata: ${error.message || ""}</p>`;
    return;
  }

  if (!data || data.length === 0) {
    messagesBox.innerHTML = "<p style='color:#6b7280;'>Henüz mesaj yok.</p>";
    return;
  }

  messagesBox.innerHTML = data.map((m) => `
    <div style="margin-bottom:10px;padding:8px 10px;border-radius:8px;
                background:${m.sender_role === "admin" ? "#eff6ff" : "#f9fafb"};
                border:1px solid #e5e7eb;">
      <div style="font-size:0.8rem;color:#6b7280;margin-bottom:2px;">
        <strong>${m.sender_role === "admin" ? "Admin" : "Siz"}</strong>
        • ${new Date(m.created_at).toLocaleString("tr-TR")}
      </div>
      <div style="font-size:0.9rem;white-space:pre-wrap;">${escapeHtml(m.message)}</div>
    </div>
  `).join("");

  messagesBox.scrollTop = messagesBox.scrollHeight;
};

const selectThread = (t) => {
  selectedThreadId = t.id;

  // highlight
  Array.from(threadsList.querySelectorAll(".u-thread")).forEach(el => el.style.background = "#ffffff");
  const active = threadsList.querySelector(`[data-thread-id="${t.id}"]`);
  if (active) active.style.background = "#eff6ff";

  if (titleEl) titleEl.textContent = t.subject || "Başlıksız";
  if (metaEl) metaEl.textContent = new Date(t.created_at).toLocaleString("tr-TR");

  setStatusBadge(t.status);

  const isClosed = t.status === "closed";
  if (replyInput) replyInput.disabled = isClosed;
  if (sendBtn) sendBtn.disabled = isClosed;
  if (replyInput) replyInput.placeholder = isClosed ? "Talep kapalı. Mesaj gönderemezsiniz." : "Mesaj yazın...";

  loadMessages(t.id);
};

const renderThreads = (threads) => {
  if (!threadsList) return;

  if (!threads || threads.length === 0) {
    threadsList.innerHTML = `<p style="color:#6b7280;margin:0;">Henüz destek talebiniz yok.</p>`;
    return;
  }

  threadsList.innerHTML = threads.map((t) => `
    <div class="u-thread" data-thread-id="${t.id}" style="
      border:1px solid #e5e7eb;border-radius:10px;padding:10px 12px;margin-bottom:8px;background:#ffffff;cursor:pointer;">
      <div style="display:flex;justify-content:space-between;gap:10px;align-items:center;">
        <div style="font-weight:700;font-size:0.95rem;">${escapeHtml(t.subject || "Başlıksız")}</div>
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
      const t = threadsCache.find(x => String(x.id) === String(id));
      if (t) selectThread(t);
    });
  });

  // otomatik ilkini aç
  selectThread(threads[0]);
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
    threadsList.innerHTML = "Yüklenirken hata oluştu.";
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
      alert("Başlık ve mesaj boş olamaz!");
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
      alert("Talep oluşturulurken bir hata oluştu.");
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
      alert("Mesaj eklenirken hata oluştu.");
      return;
    }

    subjectInput.value = "";
    messageInput.value = "";

    await loadMyThreads();

    // yeni thread'i seç
    const newest = threadsCache.find(x => x.id === thread.id);
    if (newest) selectThread(newest);
  };
}

// Kullanıcı cevap gönder
if (sendBtn) {
  sendBtn.addEventListener("click", async () => {
    const user = getUser();
    if (!user) return;

    if (!selectedThreadId) {
      alert("Önce bir talep seçin.");
      return;
    }

    const msg = (replyInput?.value || "").trim();
    if (!msg) {
      alert("Boş mesaj gönderemezsiniz.");
      return;
    }

    const { error } = await _supabase
      .from("support_messages")
      .insert({
        thread_id: selectedThreadId,
        sender_user_id: user.id,
        sender_role: user.role || "student",
        message: msg
      });

    if (error) {
      alert("Mesaj gönderilirken hata: " + (error.message || ""));
      return;
    }

    replyInput.value = "";
    loadMessages(selectedThreadId);
  });
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
  
  // 1. Kullanıcı Kontrolü
  if (!user) {
      window.location.href = "../../index.html"; // Güvenlik kontrolü
      return;
  }

  // 2. Header Bilgilerini Doldur
  if (welcomeMessage) {
      welcomeMessage.innerText = `Hoş geldin, ${user.full_name}!`;
  }
  
  if (userAvatar) {
      if (user.avatar_url) {
          userAvatar.src = user.avatar_url; // Kayıtlı avatarı kullan
      } else {
          // Kayıtlı avatar yoksa isme göre rastgele bir placeholder avatar kullan
          userAvatar.src = `https://api.dicebear.com/7.x/avataaars/svg?seed=${user.full_name}&mouth=smile&top=shortHair&style=circle`; 
      }
  }
  
  // 3. Ana Veriyi Yükle
  loadMyThreads();
});
