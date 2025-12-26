import { _supabase } from '../supabaseClient.js';

const user = JSON.parse(localStorage.getItem('user'));

async function initDashboard() {
    if (!user || user.role !== 'teacher') {
        window.location.href = '/index.html';
        return;
    }

    document.getElementById('welcome-message').innerText = `Hoş geldin, ${user.full_name}`;

    // 1. Sınıf Sayısını Al
    const { count: classCount } = await _supabase
        .from('classes')
        .select('*', { count: 'exact', head: true })
        .eq('teacher_id', user.id);
    
    document.getElementById('total-classes').innerText = classCount || 0;

    // 2. Toplam Öğrenci Sayısını Al (Öğretmenin sınıflarındaki benzersiz öğrenciler)
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

initDashboard();