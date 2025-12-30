import { _supabase } from '../supabaseClient.js';

const verificationListBody = document.getElementById('verification-list-body');
const pendingBadge = document.getElementById('pending-count');

// --- 1. SADECE ONAY BEKLEYEN ÖĞRETMENLERİ GETİR ---
export const loadPendingTeachers = async () => {
    try {
        const { data, error } = await _supabase
            .from('profiles')
            .select('*')
            .eq('role', 'teacher')
            .eq('is_verified', false);

        if (error) throw error;

        // Badge güncelle (Yan menüdeki sayı)
        if (data.length > 0) {
            pendingBadge.textContent = data.length;
            pendingBadge.classList.remove('hidden');
        } else {
            pendingBadge.classList.add('hidden');
        }

        renderVerificationTable(data);
    } catch (err) {
        console.error("Onay listesi yüklenemedi:", err);
    }
};

// --- 2. TABLOYA YAZDIR ---
const renderVerificationTable = (teachers) => {
    verificationListBody.innerHTML = '';
    if (teachers.length === 0) {
        verificationListBody.innerHTML = '<tr><td colspan="4">Onay bekleyen öğretmen bulunmuyor.</td></tr>';
        return;
    }

    teachers.forEach(t => {
        const row = document.createElement('tr');
        row.innerHTML = `
            <td><strong>${t.full_name}</strong></td>
            <td>${t.email}</td>
            <td>${new Date(t.created_at).toLocaleDateString('tr-TR')}</td>
            <td>
                <button class="action-btn verify" onclick="window.confirmTeacher('${t.id}')">✅ Onayla</button>
                <button class="action-btn delete" onclick="window.rejectTeacher('${t.id}')">❌ Reddet</button>
            </td>
        `;
        verificationListBody.appendChild(row);
    });
};

// --- 3. ONAYLA VE REDDET (GLOBAL) ---
window.confirmTeacher = async (id) => {
    const { error } = await _supabase
        .from('profiles')
        .update({ is_verified: true })
        .eq('id', id);

    if (!error) {
        alert("Öğretmen onaylandı!");
        loadPendingTeachers(); // Listeyi yenile
        // Eğer dashboard açıksa onu da yenilemek için tetiklenebilir
    }
};

window.rejectTeacher = async (id) => {
    if (!confirm("Bu öğretmen başvurusunu reddetmek ve hesabı silmek istiyor musunuz?")) return;
    const { error } = await _supabase.from('profiles').delete().eq('id', id);
    if (!error) loadPendingTeachers();
};