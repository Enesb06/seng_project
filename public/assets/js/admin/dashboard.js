import { _supabase } from '../supabaseClient.js';
import { loadPendingTeachers } from './verification.js';

const userListBody = document.getElementById('user-list-body');
const userSearch = document.getElementById('user-search');
const editModal = document.getElementById('edit-user-modal');
const editForm = document.getElementById('edit-user-form');

const usersSection = document.getElementById('users-section');
const verifySection = document.getElementById('verification-section');
const pageTitle = document.getElementById('page-title');
const liUsers = document.getElementById('li-users');
const liVerify = document.getElementById('li-verification');

const getUser = () => JSON.parse(localStorage.getItem('user'));

// İstatistikleri ve Kullanıcı Tablosunu Yükle
const loadAdminData = async () => {
    try {
        const { data: users } = await _supabase.from('profiles').select('*');
        const { count: contentCount } = await _supabase.from('contents').select('*', { count: 'exact', head: true });

        // İstatistikleri güncelle
        document.getElementById('total-students').textContent = users.filter(u => u.role === 'student').length;
        document.getElementById('total-teachers').textContent = users.filter(u => u.role === 'teacher').length;
        document.getElementById('total-contents').textContent = contentCount || 0;

        renderTable(users);

        userSearch.oninput = () => {
            const term = userSearch.value.toLowerCase();
            renderTable(users.filter(u => u.full_name.toLowerCase().includes(term) || u.email.toLowerCase().includes(term)));
        };
    } catch (err) { console.error("Veri yükleme hatası:", err); }
};

// Tabloyu Oluştur
const renderTable = (users) => {
    userListBody.innerHTML = '';
    users.forEach(u => {
        const row = document.createElement('tr');
        row.innerHTML = `
            <td>
                <div style="display:flex; align-items:center; gap:12px;">
                    <div class="user-avatar-mini">${u.full_name.charAt(0)}</div>
                    <span style="font-weight:600;">${u.full_name}</span>
                </div>
            </td>
            <td style="color:var(--muted);">${u.email}</td>
            <td><span class="role-badge ${u.role}">${u.role}</span></td>
            <td style="text-align: right;">
                <button class="action-btn edit" onclick="window.openEdit('${u.id}','${u.full_name}','${u.role}')" title="Edit">✏️</button>
                <button class="action-btn delete" onclick="window.delUser('${u.id}')" title="Delete">🗑️</button>
            </td>
        `;
        userListBody.appendChild(row);
    });
};

// ROUTER: Bölümler arası geçişi yöneten ana fonksiyon
const handleHashRouting = () => {
    const hash = window.location.hash || "#users"; // Varsayılan #users

    // Önce her şeyi gizle ve aktiflikleri kaldır (Flicker'ı önlemek için)
    usersSection.classList.add('hidden');
    verifySection.classList.add('hidden');
    liUsers.classList.remove('active');
    liVerify.classList.remove('active');

    if (hash === "#verification") {
        verifySection.classList.remove('hidden');
        liVerify.classList.add('active');
        pageTitle.textContent = "Teacher Approvals";
        loadPendingTeachers(); // Sadece onay bekleyenleri yükle
    } else {
        usersSection.classList.remove('hidden');
        liUsers.classList.add('active');
        pageTitle.textContent = "User Management";
        loadAdminData(); // Tüm kullanıcıları ve istatistikleri yükle
    }
};

// Global Fonksiyonlar
window.openEdit = (id, name, role) => {
    document.getElementById('edit-user-id').value = id;
    document.getElementById('edit-full-name').value = name;
    document.getElementById('edit-user-role').value = role;
    editModal.classList.remove('hidden');
};

editForm.onsubmit = async (e) => {
    e.preventDefault();
    await _supabase.from('profiles').update({ role: document.getElementById('edit-user-role').value }).eq('id', document.getElementById('edit-user-id').value);
    editModal.classList.add('hidden');
    handleHashRouting(); // Tabloyu yenile
};

window.delUser = async (id) => {
    if (confirm("Permanently delete this user?")) {
        await _supabase.from('profiles').delete().eq('id', id);
        handleHashRouting();
    }
};

// Event Listeners
window.addEventListener("hashchange", handleHashRouting);

document.addEventListener('DOMContentLoaded', () => {
    const user = getUser();
    if (!user || user.role !== 'admin') {
        window.location.href = 'index.html';
        return;
    }
    document.getElementById('admin-display-name').textContent = user.full_name;
    
    // Uygulama başladığında bekleyen öğretmen sayısını her zaman çek (Badge için)
    loadPendingTeachers(); 
    
    // İlk yönlendirmeyi yap
    handleHashRouting();
});

document.getElementById('logout-button').onclick = () => {
    localStorage.removeItem('user');
    window.location.href = 'index.html';
};