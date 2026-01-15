import { _supabase } from '../supabaseClient.js';

const verificationListBody = document.getElementById('verification-list-body');
const pendingBadge = document.getElementById('pending-count');

export const loadPendingTeachers = async () => {
    const { data } = await _supabase.from('profiles').select('*').eq('role', 'teacher').eq('is_verified', false);
    
    if (data && data.length > 0) {
        pendingBadge.textContent = data.length;
        pendingBadge.classList.remove('hidden');
    } else {
        pendingBadge.classList.add('hidden');
    }
    renderVerificationTable(data || []);
};

const renderVerificationTable = (teachers) => {
    verificationListBody.innerHTML = '';
    if (teachers.length === 0) {
        verificationListBody.innerHTML = '<tr><td colspan="4" style="text-align:center; padding:30px; color:#64748b;">No pending applications.</td></tr>';
        return;
    }
    teachers.forEach(t => {
        const row = document.createElement('tr');
        row.innerHTML = `
            <td><strong>${t.full_name}</strong></td>
            <td>${t.email}</td>
            <td>${new Date(t.created_at).toLocaleDateString('tr-TR')}</td>
            <td style="text-align: right;">
                <button class="action-btn verify" onclick="window.confirmTeacher('${t.id}')">Approve</button>
                <button class="action-btn delete" onclick="window.rejectTeacher('${t.id}')" title="Reject">🗑️</button>
            </td>
        `;
        verificationListBody.appendChild(row);
    });
};

window.confirmTeacher = async (id) => {
    await _supabase.from('profiles').update({ is_verified: true }).eq('id', id);
    loadPendingTeachers();
};

window.rejectTeacher = async (id) => {
    if (confirm("Reject and delete this application?")) {
        await _supabase.from('profiles').delete().eq('id', id);
        loadPendingTeachers();
    }
};