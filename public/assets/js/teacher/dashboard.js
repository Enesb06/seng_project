import { _supabase } from '../supabaseClient.js';

const user = JSON.parse(localStorage.getItem('user'));

async function initDashboard() {
    if (!user || user.role !== 'teacher') {
        window.location.href = '/index.html';
        return;
    }

    document.getElementById('welcome-message').innerText = `Welcome, ${user.full_name}`;

    // 1. Get Class Count
    const { count: classCount } = await _supabase
        .from('classes')
        .select('*', { count: 'exact', head: true })
        .eq('teacher_id', user.id);
    
    document.getElementById('total-classes').innerText = classCount || 0;

    // 2. Get Total Student Count (Unique students in teacher's classes)
    const { data: classes } = await _supabase.from('classes').select('id').eq('teacher_id', user.id);
    const classIds = classes.map(c => c.id);

    if (classIds.length > 0) {
        const { count: studentCount } = await _supabase
            .from('class_members')
            .select('*', { count: 'exact', head: true })
            .in('class_id', classIds);
        document.getElementById('total-students').innerText = studentCount || 0;
    }
}

document.getElementById('logout-button').addEventListener('click', () => {
    localStorage.removeItem('user');
    
    // YÖNLENDİRMEYİ MUTLAKA BU ŞEKİLDE DÜZELT:
    window.location.href = 'index.html'; 
    
    // Veya:
    // window.location.href = '/index.html'; // Eğer sunucu / ile kökü işaret ediyorsa bu da çalışmalı, ancak ilki daha güvenli.
});
const userForAvatar = JSON.parse(localStorage.getItem('user'));
if (userForAvatar && userForAvatar.avatar_url) {
    document.getElementById('header-avatar').src = userForAvatar.avatar_url;
}
initDashboard();