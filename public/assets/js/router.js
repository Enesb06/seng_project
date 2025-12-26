// Dosya: public/assets/js/router.js

import { _supabase } from './supabaseClient.js';

/**
 * Kullanıcıyı rolüne göre doğru panele yönlendirir.
 * Eğer kullanıcı giriş yapmamışsa veya ana sayfadaysa hiçbir şey yapmaz.
 */
export const handleAuthRedirect = async () => {
    // Mevcut sayfanın index.html olup olmadığını kontrol et
    const isIndexPage = window.location.pathname.endsWith('index.html') || window.location.pathname === '/';
    
    const { data: { session } } = await _supabase.auth.getSession();

    if (session) {
        // Eğer kullanıcı giriş yapmışsa ve hala index sayfasındaysa, onu paneline yönlendir.
        if (isIndexPage) {
            const { data: profile, error } = await _supabase
                .from('profiles')
                .select('role')
                .eq('id', session.user.id)
                .single();

            if (error) {
                console.error('Profil alınamadı:', error);
                return;
            }

            if (profile) {
                switch (profile.role) {
                    case 'ogrenci':
                        window.location.href = 'student.html';
                        break;
                    case 'ogretmen':
                        window.location.href = 'teacher.html';
                        break;
                    case 'admin':
                        window.location.href = 'admin.html';
                        break;
                    default:
                        // Rolü belirsizse ana sayfada kalsın
                        console.error('Bilinmeyen kullanıcı rolü:', profile.role);
                }
            }
        }
    } else {
        // Eğer kullanıcı giriş yapmamışsa ve index sayfasında DEĞİLSE, onu index'e gönder.
        if (!isIndexPage) {
            window.location.href = 'index.html';
        }
    }
};