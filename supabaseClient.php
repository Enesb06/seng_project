<?php


require __DIR__ . '/vendor/autoload.php';

require __DIR__ . '/config.php';

$supabase = new \Supabase\SupabaseClient($supabaseUrl, $supabaseAnonKey);

?>