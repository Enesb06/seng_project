import { _supabase } from './supabaseClient.js';

const protectPageAndRoute = async () => {
    const { data: { session } } = await _supabase.auth.getSession();
    const currentPath = window.location.pathname;

    if (!session) {
        // Oturum yoksa ve kullanıcı zaten ana sayfada değilse, ana sayfaya yönlendir.
        if (currentPath !== '/index.html' && currentPath !== '/') {
            window.location.href = '/index.html';
        }
        return;
    }

    // Oturum VARSA, ama kullanıcı ana sayfaya gitmeye çalışıyorsa, onu kendi paneline geri yönlendir.
    if (currentPath === '/index.html' || currentPath === '/') {
        const { data: profile } = await _supabase
            .from('profiles')
            .select('role')
            .eq('id', session.user.id)
            .single();

        if (profile) {
            switch (profile.role) {
                case 'student': window.location.href = '/student.html'; break;
                case 'teacher': window.location.href = '/teacher.html'; break;
                case 'admin': window.location.href = '/admin.html'; break;
                default: window.location.href = '/index.html'; break;
            }
        }
    }
};

// Bu script panel sayfalarında yüklendiği anda korumayı ve yönlendirmeyi çalıştırır.
protectPageAndRoute();