import { _supabase } from '../supabaseClient.js';
import { loadPendingTeachers } from './verification.js';
 
// --- ELEMENTS ---
const userListBody = document.getElementById('user-list-body');
const userSearch = document.getElementById('user-search');
const editModal = document.getElementById('edit-user-modal');
const editForm = document.getElementById('edit-user-form');
 
const navUsers = document.getElementById('nav-users');
const navVerify = document.getElementById('nav-verification');
const usersSection = document.getElementById('users-section');
const verifySection = document.getElementById('verification-section');
const pageTitle = document.getElementById('page-title');
const liUsers = document.getElementById('li-users');
const liVerify = document.getElementById('li-verification');
 
const getUser = () => JSON.parse(localStorage.getItem('user'));
 
// --- LOAD USERS ---
const loadAdminData = async () => {
    try {
        const { data: users } = await _supabase.from('profiles').select('*');
        const { count: contentCount } = await _supabase.from('contents')
            .select('*', { count: 'exact', head: true });
 
        document.getElementById('total-students').textContent = users.filter(u => u.role === 'student').length;
        document.getElementById('total-teachers').textContent = users.filter(u => u.role === 'teacher').length;
        document.getElementById('total-contents').textContent = contentCount || 0;
 
        renderTable(users);
 
        userSearch.oninput = () => {
            const term = userSearch.value.toLowerCase();
            renderTable(
                users.filter(u =>
                    u.full_name.toLowerCase().includes(term) ||
                    u.email.toLowerCase().includes(term)
                )
            );
        };
 
        loadPendingTeachers();
    } catch (err) {
        console.error("Load error:", err);
    }
};
 
// --- RENDER TABLE ---
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
 
// --- GLOBAL ACTIONS ---
window.delUser = async (id) => {
    if (confirm("Are you sure you want to delete this user?")) {
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
 
editForm.onsubmit = async (e) => {
    e.preventDefault();
    await _supabase.from('profiles').update({
        full_name: document.getElementById('edit-full-name').value,
        role: document.getElementById('edit-user-role').value
    }).eq('id', document.getElementById('edit-user-id').value);
 
    editModal.classList.add('hidden');
    loadAdminData();
};
 
// --- NAVIGATION ---
const setupNavigation = () => {
    navUsers.onclick = (e) => {
        e.preventDefault();
        window.location.hash = "";
    };
 
    navVerify.onclick = (e) => {
        e.preventDefault();
        window.location.hash = "verification";
    };
};
 
// --- HASH ROUTING ---
const handleHashRouting = () => {
    const hash = window.location.hash;
 
    if (hash === "#verification") {
        usersSection.classList.add('hidden');
        verifySection.classList.remove('hidden');
 
        liUsers.classList.remove('active');
        liVerify.classList.add('active');
 
        pageTitle.textContent = "Teacher Approvals";
 
        loadPendingTeachers();
    } else {
        verifySection.classList.add('hidden');
        usersSection.classList.remove('hidden');
 
        liVerify.classList.remove('active');
        liUsers.classList.add('active');
 
        pageTitle.textContent = "User Management";
 
        loadAdminData();
    }
};
 
window.addEventListener("hashchange", handleHashRouting);
 
// --- INIT ---
document.addEventListener('DOMContentLoaded', () => {
    const user = getUser();
 
    if (!user || user.role !== 'admin') {
        alert("Unauthorized access!");
        return window.location.href = 'index.html';
    }
 
    document.getElementById('admin-display-name').textContent = user.full_name;
 
    setupNavigation();
    handleHashRouting();
});
 
// --- LOGOUT ---
document.getElementById('logout-button').onclick = () => {
    localStorage.removeItem('user');
    window.location.href = 'index.html';
};
 
 