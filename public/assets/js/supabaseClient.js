// Supabase istemcisini başlatma
const supabaseUrl = 'https://infmglbngspopnxrjnfv.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImluZm1nbGJuZ3Nwb3BueHJqbmZ2Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjU5NzM5MjQsImV4cCI6MjA4MTU0OTkyNH0.GBzIbFNM6ezxtDAlWpCIMSabhTmXAXOALNrVkpEgS2c';
const _supabase = supabase.createClient(supabaseUrl, supabaseKey);

// İstemciyi diğer dosyalarda kullanmak için dışa aktar
export { _supabase };