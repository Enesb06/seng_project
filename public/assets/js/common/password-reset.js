import { _supabase } from '../../supabaseClient.js';

const newPasswordForm = document.getElementById('new-password-form');
const newPasswordInput = document.getElementById('new-password');
const confirmPasswordInput = document.getElementById('confirm-password');
const resetMessage = document.getElementById('reset-message');

newPasswordForm.addEventListener('submit', async (e) => {
    e.preventDefault();

    const newPassword = newPasswordInput.value;
    const confirmPassword = confirmPasswordInput.value;

    if (newPassword !== confirmPassword) {
        displayMessage('Passwords do not match!', 'error');
        return;
    }

    if (newPassword.length < 6) {
        displayMessage('Password must be at least 6 characters long.', 'error');
        return;
    }

    try {
        const { data, error } = await _supabase.auth.updateUser({
            password: newPassword
        });

        if (error) {
            displayMessage('An error occurred while updating password: ' + error.message, 'error');
        } else {
            displayMessage('Your password has been successfully updated! You can now log in.', 'success');
            newPasswordForm.reset();
            // Kullanıcıyı giriş sayfasına yönlendir
            setTimeout(() => {
                window.location.href = '/index.html';
            }, 3000); // 3 saniye sonra yönlendir
        }
    } catch (err) {
        console.error('Şifre güncelleme sırasında beklenmeyen hata:', err);
        displayMessage('An unexpected error occurred. Please try again.', 'error');
    }
});

function displayMessage(message, type) {
    resetMessage.textContent = message;
    resetMessage.className = `message ${type}`;
    resetMessage.classList.remove('hidden');
}

// Şifre sıfırlama sayfasında oturum kontrolü, eğer kullanıcı doğrudan buraya gelirse
document.addEventListener('DOMContentLoaded', async () => {
    const { data: { session } } = await _supabase.auth.getSession();
    if (!session) {
        // Eğer bir oturum yoksa ve kullanıcı şifre sıfırlama bağlantısı ile gelmediyse
        // bu durum normalde olmaz, çünkü link tıklanınca geçici bir oturum açılır.
        // Ama yine de bir güvenlik katmanı olarak düşünülebilir.
        // Genelde Supabase bu akışı kendi içinde yönetir.
        console.log("Şifre sıfırlama sayfasında oturum bulunamadı, ancak bu beklenmedik olabilir.");
        // Gerekirse kullanıcıyı ana sayfaya yönlendirebilirsiniz.
    }
});