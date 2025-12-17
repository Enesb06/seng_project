
<?php

// handle_register.php


require __DIR__ . '/supabaseClient.php';

// Formdan gelen verileri al
$firstName = $_POST['first_name'];
$lastName = $_POST['last_name'];
$email = $_POST['email'];
$password = $_POST['password'];
$role = $_POST['role'];

// 1. Supabase Auth ile kullanıcıyı oluştur
try {
    $authResponse = $supabase->auth()->signUp([
        'email' => $email,
        'password' => $password,
    ]);

    
    $user = $authResponse->data->user;
    if ($user) {
        
        $profileData = [
            'id' => $user->id, 
            'first_name' => $firstName,
            'last_name' => $lastName,
            'role' => $role
        ];

        $supabase->from('profiles')->insert($profileData)->execute();
        
        
        if ($role === 'teacher') {
            $supabase->from('teacher_approvals')->insert(['teacher_id' => $user->id, 'status' => 'pending'])->execute();
        }

        echo "Kayıt başarılı! Lütfen e-postanızı kontrol ederek hesabınızı doğrulayın.";
        

    } else {
         
         throw new Exception("Kullanıcı oluşturulamadı veya zaten mevcut.");
    }
} catch (Exception $e) {
    
    echo "Kayıt sırasında bir hata oluştu: " . $e->getMessage();
}

?>