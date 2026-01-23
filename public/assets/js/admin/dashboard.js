import { _supabase } from '../supabaseClient.js';
import { loadPendingTeachers } from './verification.js';

let usersCache = []; 
let currentFilter = 'all';

const userListBody = document.getElementById('user-list-body');
const userSearch = document.getElementById('user-search');

const loadAdminData = async () => {
    const { data: users } = await _supabase.from('profiles').select('*');
    const { count: cCount } = await _supabase.from('contents').select('*', { count: 'exact', head: true });
    usersCache = users || [];
    
    document.getElementById('total-students').textContent = usersCache.filter(u => u.role === 'student').length;
    document.getElementById('total-teachers').textContent = usersCache.filter(u => u.role === 'teacher').length;
    document.getElementById('total-contents').textContent = cCount || 0;

    applyFilters();
};

const applyFilters = () => {
    const term = userSearch.value.toLowerCase();
    const filtered = usersCache.filter(u => {
        const matchesSearch = u.full_name.toLowerCase().includes(term) || u.email.toLowerCase().includes(term);
        const matchesRole = currentFilter === 'all' || u.role === currentFilter;
        return matchesSearch && matchesRole;
    });
    renderUserTable(filtered);
};

const renderUserTable = (list) => {
    userListBody.innerHTML = '';
    list.forEach(u => {
        const row = document.createElement('tr');
        row.innerHTML = `
            <td>
                <div style="display:flex; align-items:center; gap:10px;">
                    <div style="width:30px; height:30px; border-radius:50%; background:rgba(255,255,255,0.1); color:#DDD6FE; display:flex; align-items:center; justify-content:center; font-weight:bold; font-size:0.75rem; border:1px solid rgba(255,255,255,0.1);">
                        ${u.full_name.charAt(0).toUpperCase()}
                    </div>
                    <strong>${u.full_name}</strong>
                </div>
            </td>
            <td style="opacity:0.7;">${u.email}</td>
            <td><span class="role-badge ${u.role}">${u.role}</span></td>
            <td>
                <button class="action-btn edit" onclick="window.openEdit('${u.id}','${u.full_name}','${u.role}')" title="Edit">✏️</button>
                <button class="action-btn delete" onclick="window.delUser('${u.id}')" title="Delete">🗑️</button>
            </td>
        `;
        userListBody.appendChild(row);
    });
};

// ... Filtre ve Diğer Fonksiyonlar ...
document.querySelectorAll('[data-role]').forEach(btn => {
    btn.onclick = () => {
        document.querySelectorAll('[data-role]').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        currentFilter = btn.dataset.role;
        applyFilters();
    };
});

userSearch.oninput = applyFilters;

const handleHash = () => {
    const hash = window.location.hash || "#users";
    const uSec = document.getElementById('users-section');
    const vSec = document.getElementById('verification-section');
    
    if (hash === "#verification") {
        uSec.classList.add('hidden');
        vSec.classList.remove('hidden');
        document.getElementById('li-users').classList.remove('active');
        document.getElementById('li-verification').classList.add('active');
        loadPendingTeachers();
    } else {
        vSec.classList.add('hidden');
        uSec.classList.remove('hidden');
        document.getElementById('li-verification').classList.remove('active');
        document.getElementById('li-users').classList.add('active');
        loadAdminData();
    }
};

window.addEventListener("hashchange", handleHash);
document.addEventListener('DOMContentLoaded', () => {
    const user = JSON.parse(localStorage.getItem('user'));
    if (!user || user.role !== 'admin') window.location.href = 'index.html';
    document.getElementById('admin-display-name').textContent = user.full_name;
    handleHash();
});

window.openEdit = (id, name, role) => {
    document.getElementById('edit-user-id').value = id;
    document.getElementById('edit-full-name').value = name;
    document.getElementById('edit-user-role').value = role;
    document.getElementById('edit-user-modal').classList.remove('hidden');
};

document.getElementById('edit-user-form').onsubmit = async (e) => {
    e.preventDefault();
    const id = document.getElementById('edit-user-id').value;
    const role = document.getElementById('edit-user-role').value;
    const { error } = await _supabase.from('profiles').update({ role }).eq('id', id);
    if (!error) {
        document.getElementById('edit-user-modal').classList.add('hidden');
        loadAdminData();
    }
};

window.delUser = async (id) => {
    if (confirm("Are you sure you want to delete this user?")) {
        const { error } = await _supabase.from('profiles').delete().eq('id', id);
        if(!error) loadAdminData();
    }
};

document.getElementById('logout-button').onclick = () => {
    localStorage.removeItem('user'); window.location.href = 'index.html';
};