import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const envPath = path.resolve(__dirname, '../.env');
const envContent = fs.readFileSync(envPath, 'utf8');
const env = {};
envContent.split('\n').forEach(line => {
  const match = line.match(/^([^=]+)=(.*)$/);
  if (match) env[match[1].trim()] = match[2].trim();
});

const supabase = createClient(env.VITE_SUPABASE_PROJECT_URL, env.VITE_SUPABASE_PUBLIC_ANON_KEY);

async function main() {
  console.log('Creating admin user...');
  const email = 'admin@gmail.com';
  const password = 'admin123';

  // 1. Sign Up (create user)
  const { data, error } = await supabase.auth.signUp({
    email,
    password
  });

  if (error) {
    console.error('Error signing up:', error.message);
    return;
  }

  const userId = data.user?.id;
  console.log('User created with ID:', userId);

  // 2. Upsert profile as 'admin'
  console.log('Setting profile to admin...');
  const { error: profileError } = await supabase.from('profiles').upsert({
    id: userId,
    name: 'System Admin',
    email: email,
    role: 'admin',
    student_id: 'ADM001',
    department: 'Management',
    phone: '0000000000'
  }, { onConflict: 'id' });

  if (profileError) {
    console.error('Error updating profile:', profileError.message);
    console.log('\n--- MANUAL SQL NEEDED ---');
    console.log(`UPDATE public.profiles SET role = 'admin' WHERE email = '${email}';`);
  } else {
    console.log('Successfully created admin account!');
    console.log('Email: admin@gmail.com');
    console.log('Password: admin123');
  }
}

main();