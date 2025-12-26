import { _supabase } from '../supabaseClient.js';

const user = JSON.parse(localStorage.getItem('user'));

async function loadReports() {
    // Önce öğretmenin sınıflarını bul
    const { data: myClasses } = await _supabase.from('classes').select('id').eq('teacher_id', user.id);
    const classIds = myClasses.map(c => c.id);

    // Bu sınıflardaki öğrencilerin ID'lerini al
    const { data: members } = await _supabase.from('class_members').select('student_id').in('class_id', classIds);
    const studentIds = [...new Set(members.map(m => m.student_id))];

    // Öğrenci bilgilerini ve puanlarını getir
    const { data: students } = await _supabase
        .from('profiles')
        .select(`
            full_name,
            email,
            id,
            quiz_results(score, success_rate),
            word_list(id)
        `)
        .in('id', studentIds);

    const tbody = document.getElementById('student-table-body');
    tbody.innerHTML = students.map(s => {
        const avgScore = s.quiz_results.length > 0 
            ? (s.quiz_results.reduce((acc, curr) => acc + curr.score, 0) / s.quiz_results.length).toFixed(1)
            : 'N/A';
        
        return `
            <tr>
                <td>${s.full_name}</td>
                <td>${avgScore}</td>
                <td>${s.word_list.length} Kelime</td>
                <td><button onclick="alert('Detay yakında eklenecek')">İncele</button></td>
            </tr>
        `;
    }).join('');
}

loadReports();