import { _supabase } from '../supabaseClient.js';

export const loadPendingTeachers = async () => {
    const { data } = await _supabase.from('profiles').select('*').eq('role', 'teacher').eq('is_verified', false);
    renderVerificationTable(data || []);
};

const renderVerificationTable = (teachers) => {
    const body = document.getElementById('verification-list-body');
    body.innerHTML = teachers.length === 0 ? '<tr><td colspan="4" style="text-align:center; padding:30px;">No pending applications.</td></tr>' : '';
    teachers.forEach(t => {
        const row = document.createElement('tr');
        row.innerHTML = `
            <td><strong>${t.full_name}</strong></td>
            <td>${t.email}</td>
            <td>${new Date(t.created_at).toLocaleDateString('en-US')}</td>
            <td>
                <button class="action-btn verify" onclick="window.confirmTeacher('${t.id}')">Approve</button>
                <button class="action-btn delete" onclick="window.rejectTeacher('${t.id}')">🗑️</button>
            </td>
        `;
        body.appendChild(row);
    });
};

window.confirmTeacher = async (id) => {
    await _supabase.from('profiles').update({ is_verified: true }).eq('id', id);
    loadPendingTeachers();
};

window.rejectTeacher = async (id) => {
    if (confirm("Reject this application?")) {
        await _supabase.from('profiles').delete().eq('id', id);
        loadPendingTeachers();
    }
};