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
  console.log('Making sure admin@gmail.com is an admin...');
  
  // Sign in first to get the user ID
  const email = 'admin@gmail.com';
  const password = 'admin123';
  
  const { data, error } = await supabase.auth.signInWithPassword({ email, password });
  
  if (error) {
    console.error('Error signing in:', error.message);
    console.log('Trying to sign up first...');
    const { data: signUpData, error: signUpError } = await supabase.auth.signUp({ email, password });
    if (signUpError) {
      console.error('Error signing up:', signUpError.message);
      return;
    }
  }

  // Now get the session
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) {
    console.error('No session found');
    return;
  }

  const userId = session.user.id;
  
  console.log('User ID:', userId);
  
  // Update profile
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
  } else {
    console.log('\n✅ Done!');
    console.log('📧 Email:', email);
    console.log('🔑 Password:', password);
    console.log('🎉 You are now an admin!');
  }
}

main();
