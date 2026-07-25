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
  console.log('Updating admin account email...');
  const oldEmail = 'admin@cms.com';
  const newEmail = 'admin@gmail.com';
  const password = 'admin123';

  // 1. First, create the new admin user
  console.log('Creating new admin user at', newEmail);
  const { data, error: signUpError } = await supabase.auth.signUp({
    email: newEmail,
    password
  });

  if (signUpError && !signUpError.message.includes('User already registered')) {
    console.error('Error signing up new admin:', signUpError.message);
    return;
  }

  const userId = data.user?.id;
  if (userId) {
    console.log('New admin user created with ID:', userId);

    // 2. Create admin profile
    console.log('Creating admin profile...');
    const { error: profileError } = await supabase.from('profiles').upsert({
      id: userId,
      name: 'System Admin',
      email: newEmail,
      role: 'admin',
      student_id: 'ADM001',
      department: 'Management',
      phone: '0000000000'
    }, { onConflict: 'id' });

    if (profileError) {
      console.error('Error creating profile:', profileError.message);
    } else {
      console.log('\n✅ Success! New admin account created!');
      console.log('📧 Email:', newEmail);
      console.log('🔑 Password:', password);
    }
  } else {
    console.log('User might already exist. You can try logging in with', newEmail);
  }
}

main();
