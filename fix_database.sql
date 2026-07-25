-- 0. Make sure is_admin function exists
CREATE OR REPLACE FUNCTION public.is_admin(uid uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
AS $$
  SELECT EXISTS(SELECT 1 FROM public.profiles p WHERE p.id = uid AND p.role = 'admin');
$$;

GRANT EXECUTE ON FUNCTION public.is_admin(uuid) TO authenticated;

-- 1. Add missing avatar_url column to profiles
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS avatar_url text;

-- 2. Add admin_image_url column to complaints
ALTER TABLE public.complaints ADD COLUMN IF NOT EXISTS admin_image_url text;

-- 2. Enable Row Level Security on both tables
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.complaints ENABLE ROW LEVEL SECURITY;

-- 3. Drop existing policies (to avoid conflicts)
DROP POLICY IF EXISTS "profiles_select_self" ON public.profiles;
DROP POLICY IF EXISTS "profiles_select_admin_all" ON public.profiles;
DROP POLICY IF EXISTS "profiles_insert_self" ON public.profiles;
DROP POLICY IF EXISTS "profiles_update_self" ON public.profiles;

DROP POLICY IF EXISTS "complaints_select_own" ON public.complaints;
DROP POLICY IF EXISTS "complaints_select_admin_all" ON public.complaints;
DROP POLICY IF EXISTS "complaints_insert_own" ON public.complaints;
DROP POLICY IF EXISTS "complaints_update_admin_all" ON public.complaints;
DROP POLICY IF EXISTS "complaints_update_own_before_resolved" ON public.complaints;
DROP POLICY IF EXISTS "complaints_delete_own_before_resolved" ON public.complaints;

-- 4. Recreate policies for profiles
CREATE POLICY "profiles_select_self" ON public.profiles FOR SELECT
  USING (auth.uid() = id);

CREATE POLICY "profiles_select_admin_all" ON public.profiles FOR SELECT
  USING (public.is_admin(auth.uid()));

CREATE POLICY "profiles_insert_self" ON public.profiles FOR INSERT
  WITH CHECK (auth.uid() = id);

CREATE POLICY "profiles_update_self" ON public.profiles FOR UPDATE
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

-- 5. Recreate policies for complaints
CREATE POLICY "complaints_select_own" ON public.complaints FOR SELECT
  USING (user_id = auth.uid());

CREATE POLICY "complaints_select_admin_all" ON public.complaints FOR SELECT
  USING (public.is_admin(auth.uid()));

CREATE POLICY "complaints_insert_own" ON public.complaints FOR INSERT
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "complaints_update_admin_all" ON public.complaints FOR UPDATE
  USING (public.is_admin(auth.uid()))
  WITH CHECK (public.is_admin(auth.uid()));

CREATE POLICY "complaints_update_own_before_resolved" ON public.complaints FOR UPDATE
  USING (user_id = auth.uid() AND status <> 'Resolved')
  WITH CHECK (user_id = auth.uid() AND status <> 'Resolved');

CREATE POLICY "complaints_delete_own_before_resolved" ON public.complaints FOR DELETE
  USING (user_id = auth.uid() AND status <> 'Resolved');

-- 6. Find user with email admin@gmail.com and make them an admin
DO $$
DECLARE
  admin_user_id uuid;
BEGIN
  -- First, get the user ID from auth.users
  SELECT id INTO admin_user_id FROM auth.users WHERE email = 'admin@gmail.com';
  
  -- If found, make sure their profile is admin
  IF admin_user_id IS NOT NULL THEN
    INSERT INTO public.profiles (id, name, email, role, student_id, department, phone)
    VALUES (
      admin_user_id, 
      'System Admin', 
      'admin@gmail.com', 
      'admin', 
      'ADM001', 
      'Management', 
      '0000000000'
    )
    ON CONFLICT (id) DO UPDATE SET role = 'admin';
    
    RAISE NOTICE 'Admin profile updated successfully!';
  ELSE
    RAISE NOTICE 'User admin@gmail.com not found in auth.users';
  END IF;
END $$;

-- 7. Create departments table
CREATE TABLE IF NOT EXISTS public.departments (
  id uuid primary key default uuid_generate_v4(),
  name text not null unique,
  created_at timestamptz default now()
);

-- 8. Enable RLS on departments
ALTER TABLE public.departments ENABLE ROW LEVEL SECURITY;

-- 9. Drop existing policies
DROP POLICY IF EXISTS "departments_select_all" ON public.departments;
DROP POLICY IF EXISTS "departments_insert_admin" ON public.departments;
DROP POLICY IF EXISTS "departments_delete_admin" ON public.departments;

-- 10. Create policies for departments
CREATE POLICY "departments_select_all" ON public.departments FOR SELECT
  USING (true);

CREATE POLICY "departments_insert_admin" ON public.departments FOR INSERT
  WITH CHECK (public.is_admin(auth.uid()));

CREATE POLICY "departments_delete_admin" ON public.departments FOR DELETE
  USING (public.is_admin(auth.uid()));

-- 11. Insert default departments
INSERT INTO public.departments (name) VALUES
  ('MCA'),
  ('MMS'),
  ('BMS'),
  ('Pharma')
ON CONFLICT (name) DO NOTHING;
