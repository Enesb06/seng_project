<?php

// logout.php

require __DIR__ . '/config.php';

// Tüm oturum bilgilerini temizle
session_unset();
session_destroy();

// Kullanıcıyı giriş sayfasına yönlendir
header("Location: login.html");
exit();

?>