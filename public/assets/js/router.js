// Supabase istemcisine gerek yok çünkü bu script Supabase ile konuşmayacak
// import { _supabase } from './supabaseClient.js';

const protectPageAndRoute = () => {
    // Oturum bilgisini localStorage'dan al
    const userString = localStorage.getItem('user');
    const user = userString ? JSON.parse(userString) : null;
    
    const currentPath = window.location.pathname;
    const isAuthPage = currentPath === '/index.html' || currentPath === '/';

    if (!user) {
        // Oturum yoksa ve kullanıcı ana sayfada değilse, ana sayfaya yönlendir.
        if (!isAuthPage) {
            window.location.href = '/index.html';
        }
        return;
    }

    // Oturum VARSA, ama kullanıcı ana sayfaya gitmeye çalışıyorsa, onu kendi paneline geri yönlendir.
    if (isAuthPage) {
        if (user.role) {
            switch (user.role) {
                case 'student': window.location.href = '/student.html'; break;
                case 'teacher': window.location.href = '/teacher.html'; break;
                case 'admin': window.location.href = '/admin.html'; break;
                default: 
                    // Geçersiz rol, oturumu temizle ve ana sayfada kal
                    localStorage.removeItem('user');
                    break;
            }
        }
    }
};

// Bu script panel sayfalarında yüklendiği anda korumayı ve yönlendirmeyi çalıştırır.
protectPageAndRoute();