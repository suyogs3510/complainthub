-- ============================================
-- COMPLETE DATABASE FIX SCRIPT FOR STERLING CMS
-- Run this in Supabase SQL Editor!
-- ============================================

-- 1. Make sure is_admin function exists
CREATE OR REPLACE FUNCTION public.is_admin(uid uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
AS $$
  SELECT EXISTS(SELECT 1 FROM public.profiles p WHERE p.id = uid AND p.role = 'admin');
$$;

GRANT EXECUTE ON FUNCTION public.is_admin(uuid) TO authenticated;

-- 2. ADD MISSING COLUMNS TO COMPLAINTS TABLE
ALTER TABLE public.complaints ADD COLUMN IF NOT EXISTS priority text DEFAULT 'Medium';
ALTER TABLE public.complaints ADD COLUMN IF NOT EXISTS department text;
ALTER TABLE public.complaints ADD COLUMN IF NOT EXISTS admin_image_url text;

-- 3. UPDATE COMPLAINTS CHECK CONSTRAINTS (DROP OLD, RECREATE WITH MORE CATEGORIES)
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'complaints_category_check'
  ) THEN
    ALTER TABLE public.complaints DROP CONSTRAINT complaints_category_check;
  END IF;
END $$;

ALTER TABLE public.complaints ADD CONSTRAINT complaints_category_check 
CHECK (category IN (
  'Academic','Administrative','Facilities','Faculty','Hostel','Library',
  'Transportation','Electricity','Cleaning','Ragging','Other'
));

-- 4. CREATE CATEGORIES TABLE (IF NOT EXISTS)
CREATE TABLE IF NOT EXISTS public.categories (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  name text NOT NULL UNIQUE,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE public.categories ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "categories_select_all" ON public.categories;
CREATE POLICY "categories_select_all" ON public.categories FOR SELECT
  USING (true);

DROP POLICY IF EXISTS "categories_insert_admin" ON public.categories;
CREATE POLICY "categories_insert_admin" ON public.categories FOR INSERT
  WITH CHECK (public.is_admin(auth.uid()));

DROP POLICY IF EXISTS "categories_delete_admin" ON public.categories;
CREATE POLICY "categories_delete_admin" ON public.categories FOR DELETE
  USING (public.is_admin(auth.uid()));

-- Insert default categories
INSERT INTO public.categories (name) VALUES
  ('Academic'),
  ('Administrative'),
  ('Facilities'),
  ('Faculty'),
  ('Hostel'),
  ('Library'),
  ('Transportation'),
  ('Ragging'),
  ('Other')
ON CONFLICT (name) DO NOTHING;

-- 5. CREATE DEPARTMENTS TABLE (IF NOT EXISTS)
CREATE TABLE IF NOT EXISTS public.departments (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  name text NOT NULL UNIQUE,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE public.departments ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "departments_select_all" ON public.departments;
CREATE POLICY "departments_select_all" ON public.departments FOR SELECT
  USING (true);

DROP POLICY IF EXISTS "departments_insert_admin" ON public.departments;
CREATE POLICY "departments_insert_admin" ON public.departments FOR INSERT
  WITH CHECK (public.is_admin(auth.uid()));

DROP POLICY IF EXISTS "departments_delete_admin" ON public.departments;
CREATE POLICY "departments_delete_admin" ON public.departments FOR DELETE
  USING (public.is_admin(auth.uid()));

-- Insert default departments
INSERT INTO public.departments (name) VALUES
  ('Information Technology'),
  ('Computer Science'),
  ('Mechanical'),
  ('Electronics'),
  ('MCA'),
  ('MMS'),
  ('BMS'),
  ('Pharma')
ON CONFLICT (name) DO NOTHING;

-- 6. CREATE STORAGE BUCKET FOR COMPLAINTS (IF NOT EXISTS)
-- NOTE: Buckets are created in Supabase Storage UI, or use this:
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES ('complaints', 'complaints', true, 52428800, ARRAY['image/*','application/pdf','application/msword','application/vnd.openxmlformats-officedocument.wordprocessingml.document'])
ON CONFLICT (id) DO NOTHING;

-- 7. SET admin@gmail.com AS ADMIN
DO $$
DECLARE
  admin_user_id uuid;
BEGIN
  SELECT id INTO admin_user_id FROM auth.users WHERE email = 'admin@gmail.com';
  
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
  END IF;
END $$;

-- 8. ADD PROFILES TRIGGER & POLICIES
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS avatar_url text;

DROP POLICY IF EXISTS "profiles_select_self" ON public.profiles;
CREATE POLICY "profiles_select_self" ON public.profiles FOR SELECT
  USING (auth.uid() = id);

DROP POLICY IF EXISTS "profiles_select_admin_all" ON public.profiles;
CREATE POLICY "profiles_select_admin_all" ON public.profiles FOR SELECT
  USING (public.is_admin(auth.uid()));

DROP POLICY IF EXISTS "profiles_insert_self" ON public.profiles;
CREATE POLICY "profiles_insert_self" ON public.profiles FOR INSERT
  WITH CHECK (auth.uid() = id);

DROP POLICY IF EXISTS "profiles_update_self" ON public.profiles;
CREATE POLICY "profiles_update_self" ON public.profiles FOR UPDATE
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

-- 9. COMPLAINTS POLICIES
DROP POLICY IF EXISTS "complaints_select_own" ON public.complaints;
CREATE POLICY "complaints_select_own" ON public.complaints FOR SELECT
  USING (user_id = auth.uid());

DROP POLICY IF EXISTS "complaints_select_admin_all" ON public.complaints;
CREATE POLICY "complaints_select_admin_all" ON public.complaints FOR SELECT
  USING (public.is_admin(auth.uid()));

DROP POLICY IF EXISTS "complaints_insert_own" ON public.complaints;
CREATE POLICY "complaints_insert_own" ON public.complaints FOR INSERT
  WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS "complaints_update_admin_all" ON public.complaints;
CREATE POLICY "complaints_update_admin_all" ON public.complaints FOR UPDATE
  USING (public.is_admin(auth.uid()))
  WITH CHECK (public.is_admin(auth.uid()));

DROP POLICY IF EXISTS "complaints_update_own_before_resolved" ON public.complaints;
CREATE POLICY "complaints_update_own_before_resolved" ON public.complaints FOR UPDATE
  USING (user_id = auth.uid() AND status <> 'Resolved')
  WITH CHECK (user_id = auth.uid() AND status <> 'Resolved');

DROP POLICY IF EXISTS "complaints_delete_own_before_resolved" ON public.complaints;
CREATE POLICY "complaints_delete_own_before_resolved" ON public.complaints FOR DELETE
  USING (user_id = auth.uid() AND status <> 'Resolved');

-- COMPLETE!
