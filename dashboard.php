<?php

// dashboard.php

require __DIR__ . '/config.php';

// Kullanıcı giriş yapmamışsa, login sayfasına yönlendir
if (!isset($_SESSION['user'])) {
    header("Location: login.html");
    exit();
}

// Oturumdan kullanıcı bilgilerini al
$user = $_SESSION['user'];

?>
<!DOCTYPE html>
<html lang="tr">
<head>
    <meta charset="UTF-8">
    <title>Ana Panel</title>
</head>
<body>
    <h1>Hoş Geldin!</h1>
    <p>Merhaba, <strong><?php echo htmlspecialchars($user['email']); ?></strong>!</p>
    
    <p>Bu sayfayı sadece giriş yapmış kullanıcılar görebilir.</p>
    
    <a href="logout.php">Çıkış Yap</a>
</body>
</html>