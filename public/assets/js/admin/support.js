// assets/js/admin/support.js
import { _supabase } from "../supabaseClient.js";

// DEBUG: JS gerçekten yüklendi mi?
console.log("admin/support.js yüklendi");

const currentUser = JSON.parse(localStorage.getItem("user") || "null");

const tbody           = document.getElementById("support-threads-body");
const counterEl       = document.getElementById("support-total-count");
const messagesBox     = document.getElementById("messages-box");
const titleEl         = document.getElementById("selected-thread-title");
const metaEl          = document.getElementById("selected-thread-meta");
const statusBadge     = document.getElementById("selected-thread-status-badge");
const statusSelect    = document.getElementById("thread-status-select");
const updateStatusBtn = document.getElementById("update-status-btn");
const replyInput      = document.getElementById("admin-reply-input");
const replyBtn        = document.getElementById("send-reply-btn");
const logoutBtn       = document.getElementById("logout-button");

// Admin adı
if (currentUser && document.getElementById("admin-display-name")) {
    document.getElementById("admin-display-name").textContent =
        currentUser.full_name || currentUser.email || "Admin";
}

// Çıkış butonu
if (logoutBtn) {
    logoutBtn.addEventListener("click", () => {
        localStorage.removeItem("user");
        window.location.href = "index.html";
    });
}

let selectedThreadId   = null;
let selectedThreadData = null;

const formatRole = (role) => {
    if (role === "student") return "Öğrenci";
    if (role === "teacher") return "Öğretmen";
    if (role === "admin")   return "Admin";
    return role || "-";
};

const formatStatus = (status) => (status === "closed" ? "Kapalı" : "Açık");

const updateStatusBadgeView = (status) => {
    if (!statusBadge) return;
    statusBadge.style.display = "inline-block";
    statusBadge.textContent = formatStatus(status);

    if (status === "closed") {
        statusBadge.style.background = "#fee2e2";
        statusBadge.style.color = "#b91c1c";
    } else {
        statusBadge.style.background = "#dcfce7";
        statusBadge.style.color = "#166534";
    }
};

// ---------------- MESAJLARI YÜKLE ----------------
const loadMessages = async (threadId) => {
    if (!threadId || !messagesBox) return;

    messagesBox.innerHTML = "<p style='color:#6b7280;'>Mesajlar yükleniyor...</p>";

    const { data, error } = await _supabase
        .from("support_messages")
        .select("*")
        .eq("thread_id", threadId)
        .order("created_at", { ascending: true });

    console.log("support_messages response:", { data, error });

    if (error) {
        messagesBox.innerHTML =
            "<p style='color:red;'>Mesajlar yüklenirken hata oluştu: " +
            (error.message || "") +
            "</p>";
        return;
    }

    if (!data || data.length === 0) {
        messagesBox.innerHTML =
            "<p style='color:#6b7280;'>Bu talep için hiç mesaj yok.</p>";
        return;
    }

    messagesBox.innerHTML = data
        .map(
            (msg) => `
        <div style="margin-bottom:10px;padding:8px 10px;border-radius:8px;
                    background:${msg.sender_role === "admin" ? "#eff6ff" : "#f9fafb"};
                    border:1px solid #e5e7eb;">
            <div style="font-size:0.8rem;color:#6b7280;margin-bottom:2px;">
                <strong>${formatRole(msg.sender_role)}</strong>
                • ${new Date(msg.created_at).toLocaleString("tr-TR")}
            </div>
            <div style="font-size:0.9rem;white-space:pre-wrap;">${msg.message}</div>
        </div>
    `
        )
        .join("");

    // En alta kaydır
    messagesBox.scrollTop = messagesBox.scrollHeight;
};

// ---------------- THREAD SEÇ ----------------
const selectThread = (thread) => {
    selectedThreadId   = thread.id;
    selectedThreadData = thread;

    // Satırları highlight et
    Array.from(tbody.querySelectorAll("tr")).forEach((tr) => {
        tr.classList.remove("selected-row");
        tr.style.backgroundColor = "";
    });
    const activeRow = tbody.querySelector(`tr[data-thread-id="${thread.id}"]`);
    if (activeRow) {
        activeRow.classList.add("selected-row");
        activeRow.style.backgroundColor = "#eff6ff";
    }

    if (titleEl) {
        titleEl.textContent = thread.subject || "Başlıksız talep";
    }
    if (metaEl) {
        metaEl.textContent =
            `${formatRole(thread.created_by_role || "-")} • ` +
            new Date(thread.created_at).toLocaleString("tr-TR");
    }

    if (statusSelect) {
        statusSelect.value = thread.status || "open";
    }
    updateStatusBadgeView(thread.status);
    loadMessages(thread.id);
};

// ---------------- THREAD LİSTESİNİ YÜKLE ----------------
const loadThreads = async () => {
    if (!tbody) {
        console.warn("support-threads-body bulunamadı");
        return;
    }

    tbody.innerHTML = `
        <tr>
            <td colspan="5" style="text-align:center;color:#6b7280;">
                Yükleniyor...
            </td>
        </tr>
    `;

    const { data, error } = await _supabase
        .from("support_threads")
        .select("*")
        .order("created_at", { ascending: false });

    console.log("support_threads response:", { data, error });

    if (error) {
        tbody.innerHTML = `
            <tr>
                <td colspan="5" style="text-align:center;color:red;">
                    Destek talepleri yüklenirken hata oluştu:<br>
                    ${error.message || ""}
                </td>
            </tr>
        `;
        if (counterEl) counterEl.textContent = "0";
        return;
    }

    if (!data || data.length === 0) {
        tbody.innerHTML = `
            <tr>
                <td colspan="5" style="text-align:center;color:#6b7280;">
                    Henüz hiç destek talebi yok.
                </td>
            </tr>
        `;
        if (counterEl) counterEl.textContent = "0";
        return;
    }

    if (counterEl) counterEl.textContent = String(data.length);

    tbody.innerHTML = data
        .map(
            (t) => `
        <tr data-thread-id="${t.id}" style="cursor:pointer;">
            <td>${t.id}</td>
            <td>${t.subject || "-"}</td>
            <td>${formatRole(t.created_by_role)}</td>
            <td>${new Date(t.created_at).toLocaleString("tr-TR")}</td>
            <td>${formatStatus(t.status)}</td>
        </tr>
    `
        )
        .join("");

    // Her satıra tıklama ekle
    Array.from(tbody.querySelectorAll("tr")).forEach((tr, index) => {
        tr.addEventListener("click", () => {
            const id = Number(tr.getAttribute("data-thread-id"));
            const thread = data.find((d) => d.id === id);
            if (thread) selectThread(thread);
        });

        // İlk satırı otomatik seç
        if (index === 0) {
            const firstThread = data[0];
            selectThread(firstThread);
        }
    });
};

// ---------------- DURUM GÜNCELLE ----------------
if (updateStatusBtn) {
    updateStatusBtn.addEventListener("click", async () => {
        if (!selectedThreadId) {
            alert("Önce bir destek talebi seçin.");
            return;
        }

        const newStatus = statusSelect.value || "open";

        const { error } = await _supabase
            .from("support_threads")
            .update({ status: newStatus })
            .eq("id", selectedThreadId);

        if (error) {
            alert("Durum güncellenirken hata: " + (error.message || ""));
            return;
        }

        updateStatusBadgeView(newStatus);
        loadThreads(); // listeyi tazele
    });
}

// ---------------- ADMIN CEVAP GÖNDER ----------------
if (replyBtn) {
    replyBtn.addEventListener("click", async () => {
        if (!selectedThreadId) {
            alert("Önce bir destek talebi seçin.");
            return;
        }

        const msg = (replyInput.value || "").trim();
        if (!msg) {
            alert("Boş mesaj gönderemezsiniz.");
            return;
        }

        const adminUser = JSON.parse(localStorage.getItem("user") || "null");
        if (!adminUser) {
            alert("Oturum bulunamadı.");
            return;
        }

        const { error } = await _supabase
            .from("support_messages")
            .insert({
                thread_id: selectedThreadId,
                sender_user_id: adminUser.id,
                sender_role: "admin",
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

// ---------------- BAŞLAT ----------------
document.addEventListener("DOMContentLoaded", () => {
    console.log("DOM yüklendi, loadThreads çağrılıyor");
    loadThreads();
});
