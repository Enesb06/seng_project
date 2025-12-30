import { _supabase } from '../supabaseClient.js';
// Yeni eklediğimiz modülü dahil ediyoruz
import { loadPendingTeachers } from './verification.js';

// --- ELEMENT SEÇİMİ ---
const userListBody = document.getElementById('user-list-body');
const userSearch = document.getElementById('user-search');
const editModal = document.getElementById('edit-user-modal');
const editForm = document.getElementById('edit-user-form');

// Navigasyon Elemanları
const navUsers = document.getElementById('nav-users');
const navVerify = document.getElementById('nav-verification');
const usersSection = document.getElementById('users-section');
const verifySection = document.getElementById('verification-section');
const pageTitle = document.getElementById('page-title');
const liUsers = document.getElementById('li-users');
const liVerify = document.getElementById('li-verification');

const getUser = () => JSON.parse(localStorage.getItem('user'));

// --- VERİLERİ YÜKLE ---
const loadAdminData = async () => {
    try {
        const { data: users, error: userErr } = await _supabase.from('profiles').select('*');
        if (userErr) throw userErr;

        const { count: contentCount } = await _supabase.from('contents').select('*', { count: 'exact', head: true });

        document.getElementById('total-students').textContent = users.filter(u => u.role === 'student').length;
        document.getElementById('total-teachers').textContent = users.filter(u => u.role === 'teacher').length;
        document.getElementById('total-contents').textContent = contentCount || 0;

        renderTable(users);

        // Arama kutusunu dinle
        userSearch.oninput = () => {
            const term = userSearch.value.toLowerCase();
            renderTable(users.filter(u => u.full_name.toLowerCase().includes(term) || u.email.toLowerCase().includes(term)));
        };

        // Onay bekleyenleri de arka planda yükle (Badge sayısını güncellemek için)
        loadPendingTeachers();

    } catch (err) { 
        console.error("Veri yükleme hatası:", err); 
    }
};

// --- TABLOYA YAZDIRMA ---
const renderTable = (users) => {
    userListBody.innerHTML = '';
    users.forEach(u => {
        const row = document.createElement('tr');
        row.innerHTML = `
            <td>${u.full_name}</td>
            <td>${u.email}</td>
            <td><span class="role-badge ${u.role}">${u.role.toUpperCase()}</span></td>
            <td>
                <button class="action-btn edit" onclick="window.openEdit('${u.id}','${u.full_name}','${u.role}')">✏️</button>
                <button class="action-btn delete" onclick="window.delUser('${u.id}')">🗑️</button>
            </td>
        `;
        userListBody.appendChild(row);
    });
};

// --- GLOBAL PENCERE FONKSİYONLARI ---
window.delUser = async (id) => {
    if(confirm("Bu kullanıcıyı silmek istediğinize emin misiniz?")) {
        await _supabase.from('profiles').delete().eq('id', id);
        loadAdminData();
    }
};

window.openEdit = (id, name, role) => {
    document.getElementById('edit-user-id').value = id;
    document.getElementById('edit-full-name').value = name;
    document.getElementById('edit-user-role').value = role;
    editModal.classList.remove('hidden');
};

// --- FORM İŞLEMLERİ ---
editForm.onsubmit = async (e) => {
    e.preventDefault();
    const { error } = await _supabase.from('profiles').update({
        full_name: document.getElementById('edit-full-name').value,
        role: document.getElementById('edit-user-role').value
    }).eq('id', document.getElementById('edit-user-id').value);
    
    if(!error) { 
        editModal.classList.add('hidden'); 
        loadAdminData(); 
    } else {
        alert("Hata: " + error.message);
    }
};

// --- NAVİGASYON MANTIĞI ---
const setupNavigation = () => {
    navUsers.onclick = (e) => {
        e.preventDefault();
        usersSection.classList.remove('hidden');
        verifySection.classList.add('hidden');
        liUsers.classList.add('active');
        liVerify.classList.remove('active');
        pageTitle.textContent = "Kullanıcı Yönetimi";
        loadAdminData();
    };

    navVerify.onclick = (e) => {
        e.preventDefault();
        verifySection.classList.remove('hidden');
        usersSection.classList.add('hidden');
        liVerify.classList.add('active');
        liUsers.classList.remove('active');
        pageTitle.textContent = "Öğretmen Onayları";
        loadPendingTeachers(); // Onay bekleyenleri yükle
    };
};

// --- SAYFA BAŞLATMA VE GÜVENLİK ---
document.addEventListener('DOMContentLoaded', () => {
    const user = getUser();
    
    // Admin yetki kontrolü
    if(!user || user.role !== 'admin') {
        alert("Yetkisiz erişim!");
        return window.location.href = 'index.html';
    }

    document.getElementById('admin-display-name').textContent = user.full_name;
    
    // Fonksiyonları çalıştır
    loadAdminData();
    setupNavigation();
});

// Çıkış Butonu
document.getElementById('logout-button').onclick = () => { 
    localStorage.removeItem('user'); 
    window.location.href = 'index.html'; 
};