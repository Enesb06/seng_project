<?php

// handle_login.php

require __DIR__ . '/config.php';

$email = $_POST['email'] ?? null;
$password = $_POST['password'] ?? null;

if (!$email || !$password) {
    die("E-posta ve şifre gereklidir.");
}

// Adresin /auth/v1/token olduğuna dikkat et
$loginUrl = $supabaseUrl . '/auth/v1/token?grant_type=password';
$loginData = ['email' => $email, 'password' => $password];

$ch = curl_init($loginUrl);
curl_setopt_array($ch, [
    CURLOPT_RETURNTRANSFER => true,
    CURLOPT_POST => true,
    CURLOPT_POSTFIELDS => json_encode($loginData),
    CURLOPT_HTTPHEADER => [
        'Content-Type: application/json',
        'apikey: ' . $supabaseAnonKey
    ]
]);

$response = curl_exec($ch);
$http_code = curl_getinfo($ch, CURLINFO_HTTP_CODE);
curl_close($ch);

$responseData = json_decode($response, true);

// Giriş başarısızsa
if ($http_code >= 400 || !isset($responseData['access_token'])) {
    die("E-posta veya şifre hatalı. <a href='login.html'>Tekrar Dene</a>");
}

// GİRİŞ BAŞARILI! Oturum (Session) bilgilerini kaydedelim.
$_SESSION['supabase_token'] = $responseData['access_token'];
$_SESSION['user'] = $responseData['user'];

// Kullanıcıyı ana paneline yönlendir
header("Location: dashboard.php");
exit();

?>