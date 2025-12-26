import { _supabase } from '../supabaseClient.js';

const user = JSON.parse(localStorage.getItem('user'));
const classSelect = document.getElementById('select-class');
const contentSelect = document.getElementById('select-content');

// 1. 6 Haneli Rastgele Sınıf Kodu Üret (SQL'deki class_code için)
function generateCode() {
    return Math.random().toString(36).substring(2, 8).toUpperCase();
}

// 2. Sınıfları ve İçerikleri Yükle
async function loadFormData() {
    // Sınıflar
    const { data: classes } = await _supabase.from('classes').select('*').eq('teacher_id', user.id);
    classSelect.innerHTML = classes.map(c => `<option value="${c.id}">${c.class_name} (${c.class_code})</option>`).join('');

    // İçerikler (contents tablosundan okuma parçaları)
    const { data: contents } = await _supabase.from('contents').select('id, title');
    contentSelect.innerHTML = '<option value="">Parça Seçilmedi</option>' + 
        contents.map(cnt => `<option value="${cnt.id}">${cnt.title}</option>`).join('');
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
        loadFormData();
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
    else alert("Ödev başarıyla atandı!");
});

loadFormData();