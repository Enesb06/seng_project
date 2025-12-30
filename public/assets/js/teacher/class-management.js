import { _supabase } from '../supabaseClient.js';

const user = JSON.parse(localStorage.getItem('user'));
const classSelect = document.getElementById('select-class');
const contentSelect = document.getElementById('select-content');
const studentStatusArea = document.getElementById('student-status-area'); // Rapor tablosunun gösterileceği alan

// 1. 6 Haneli Rastgele Sınıf Kodu Üret
function generateCode() {
    return Math.random().toString(36).substring(2, 8).toUpperCase();
}

// 2. Sınıfları ve İçerikleri Yükle
async function loadFormData() {
    // Sınıflar
    const { data: classes } = await _supabase.from('classes').select('*').eq('teacher_id', user.id);
    if (classes) {
        classSelect.innerHTML = classes.map(c => `<option value="${c.id}">${c.class_name} (${c.class_code})</option>`).join('');
        
        // Sayfa yüklendiğinde listedeki ilk sınıfın ilerleme durumunu otomatik olarak yükle
        if (classes.length > 0) {
            loadStudentProgress(classes[0].id);
        }
    }


    // İçerikler (contents tablosundan okuma parçaları)
    const { data: contents } = await _supabase.from('contents').select('id, title');
    if (contents) {
        contentSelect.innerHTML = '<option value="">Parça Seçilmedi</option>' +
            contents.map(cnt => `<option value="${cnt.id}">${cnt.title}</option>`).join('');
    }
}

// 3. Sınıf Oluşturma
document.getElementById('create-class-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    const className = document.getElementById('class-name').value;
    const classCode = generateCode();

    const { error } = await _supabase.from('classes').insert([{
        teacher_id: user.id,
        class_name: className,
        class_code: classCode
    }]);

    if (error) alert("Hata: " + error.message);
    else {
        alert(`Sınıf Açıldı! Kod: ${classCode}`);
        loadFormData(); // Yeni sınıfı listeye ekle
        document.getElementById('create-class-form').reset();
    }
});

// 4. Ödev Atama
document.getElementById('assign-homework-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    const { error } = await _supabase.from('assignments').insert([{
        teacher_id: user.id,
        class_id: classSelect.value,
        content_id: contentSelect.value || null,
        title: document.getElementById('hw-title').value,
        due_date: document.getElementById('hw-due-date').value
    }]);

    if (error) alert("Hata: " + error.message);
    else {
        alert("Ödev başarıyla atandı!");
        // Ödev atandıktan sonra o sınıfın tablosunu yenile
        loadStudentProgress(classSelect.value);
        document.getElementById('assign-homework-form').reset();
    }
});


// --- YENİ EKLENEN KOD: ÖĞRENCİ İLERLEME RAPORU ---

const loadStudentProgress = async (classId) => {
    if (!classId) {
        studentStatusArea.innerHTML = "<p>Raporu görmek için lütfen bir sınıf seçin.</p>";
        return;
    }
    
    studentStatusArea.innerHTML = "<p>Öğrenci verileri yükleniyor...</p>";

    // 1. Sınıftaki öğrencileri al (kullanıcı adlarıyla birlikte)
    const { data: students, error: studentsError } = await _supabase
        .from('class_members')
        .select(`student_id, users:student_id(full_name)`)
        .eq('class_id', classId);

    // 2. Bu sınıfa atanan ödevleri al
    const { data: assignments, error: assignmentsError } = await _supabase
        .from('assignments')
        .select('id, title')
        .eq('class_id', classId);

    // 3. İlgili ödevleri bitirme durumlarını al
    const assignmentIds = assignments.map(a => a.id);
    const { data: completions, error: completionsError } = await _supabase
        .from('assignment_completions')
        .select('assignment_id, student_id')
        .in('assignment_id', assignmentIds); // Sadece bu sınıfa ait ödevlerin tamamlanma durumlarını çek

    if(studentsError || assignmentsError || completionsError){
        studentStatusArea.innerHTML = "<p>Veriler yüklenirken bir hata oluştu.</p>";
        console.error(studentsError || assignmentsError || completionsError);
        return;
    }

    if(students.length === 0){
         studentStatusArea.innerHTML = "<h4>Öğrenci Durum Raporu</h4><p>Bu sınıfta henüz kayıtlı öğrenci yok.</p>";
         return;
    }
    
    if(assignments.length === 0){
         studentStatusArea.innerHTML = "<h4>Öğrenci Durum Raporu</h4><p>Bu sınıfa henüz atanmış bir ödev yok.</p>";
         return;
    }

    // Rapor Tablosunu Oluştur
    let html = `<h4>Öğrenci Durum Raporu</h4><table class="report-table"><tr><th>Öğrenci</th>`;
    assignments.forEach(hw => html += `<th>${hw.title}</th>`);
    html += `</tr>`;

    students.forEach(student => {
        // users tablosundan veri gelmediyse student_id'yi göster
        const studentName = student.users ? student.users.full_name : student.student_id;
        html += `<tr><td>${studentName}</td>`;
        assignments.forEach(hw => {
            // some() metodu ile bu öğrencinin bu ödevi tamamlayıp tamamlamadığını kontrol et
            const isDone = completions.some(c => c.assignment_id === hw.id && c.student_id === student.student_id);
            html += `<td class="status-cell">${isDone ? '✅ Tamamladı' : '❌ Tamamlamadı'}</td>`;
        });
        html += `</tr>`;
    });
    html += `</table>`;
    
    studentStatusArea.innerHTML = html;
};

// Sınıf dropdown'ı değiştiğinde ilgili sınıfın raporunu yükle
classSelect.addEventListener('change', (e) => {
    const selectedClassId = e.target.value;
    loadStudentProgress(selectedClassId);
});


// --- BAŞLANGIÇ ---
loadFormData();