-- Copy and run this code in your Supabase SQL Editor to clear all data
-- This will delete all users (students and admins), profiles, and complaints.

TRUNCATE TABLE auth.users CASCADE;

-- Note: Because of 'CASCADE', this will automatically delete everything in the 'profiles' and 'complaints' tables as well.
