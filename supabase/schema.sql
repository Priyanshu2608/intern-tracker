-- Database Schema for Turn2Law Intern Tracker

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Drop existing tables/triggers if they exist (for clean setup)
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
DROP FUNCTION IF EXISTS public.handle_new_user();
DROP TRIGGER IF EXISTS check_profiles_before_update ON public.profiles;
DROP FUNCTION IF EXISTS public.check_profile_update();
DROP TABLE IF EXISTS public.meeting_attendance CASCADE;
DROP TABLE IF EXISTS public.meetings CASCADE;
DROP TABLE IF EXISTS public.standups CASCADE;
DROP TABLE IF EXISTS public.task_activity CASCADE;
DROP TABLE IF EXISTS public.tasks CASCADE;
DROP TABLE IF EXISTS public.profiles CASCADE;
DROP TABLE IF EXISTS public.teams CASCADE;

-- 1. TEAMS TABLE
CREATE TABLE public.teams (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name TEXT NOT NULL UNIQUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 2. PROFILES TABLE
CREATE TABLE public.profiles (
    id UUID PRIMARY KEY REFERENCES auth.users ON DELETE CASCADE,
    email TEXT NOT NULL UNIQUE,
    name TEXT NOT NULL,
    role TEXT NOT NULL CHECK (role IN ('admin', 'lead', 'intern')),
    team_id UUID REFERENCES public.teams(id) ON DELETE SET NULL,
    status TEXT NOT NULL CHECK (status IN ('active', 'inactive')) DEFAULT 'active',
    must_reset_password BOOLEAN NOT NULL DEFAULT true,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 3. TASKS TABLE
CREATE TABLE public.tasks (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    title TEXT NOT NULL,
    description TEXT,
    acceptance_criteria TEXT,
    priority TEXT NOT NULL CHECK (priority IN ('low', 'medium', 'high', 'urgent')) DEFAULT 'medium',
    status TEXT NOT NULL CHECK (status IN ('todo', 'in_progress', 'review', 'done', 'blocked')) DEFAULT 'todo',
    due_date DATE,
    assignee_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    team_id UUID REFERENCES public.teams(id) ON DELETE SET NULL,
    created_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 4. TASK ACTIVITY TABLE
CREATE TABLE public.task_activity (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    task_id UUID NOT NULL REFERENCES public.tasks(id) ON DELETE CASCADE,
    changed_by UUID NOT NULL REFERENCES public.profiles(id) ON DELETE SET NULL,
    change_type TEXT NOT NULL CHECK (change_type IN ('status_change', 'edit', 'assignment', 'creation')),
    from_value TEXT,
    to_value TEXT,
    comment TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 5. STANDUPS TABLE
CREATE TABLE public.standups (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    date DATE NOT NULL DEFAULT CURRENT_DATE,
    did_yesterday TEXT NOT NULL,
    doing_today TEXT NOT NULL,
    blockers TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    UNIQUE (user_id, date)
);

-- 6. MEETINGS TABLE
CREATE TABLE public.meetings (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    title TEXT NOT NULL,
    description TEXT,
    start_time TIMESTAMP WITH TIME ZONE NOT NULL,
    end_time TIMESTAMP WITH TIME ZONE NOT NULL,
    team_id UUID REFERENCES public.teams(id) ON DELETE SET NULL, -- NULL indicates All-Hands
    created_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 7. MEETING ATTENDANCE TABLE
CREATE TABLE public.meeting_attendance (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    meeting_id UUID NOT NULL REFERENCES public.meetings(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    status TEXT NOT NULL CHECK (status IN ('present', 'absent', 'excused')) DEFAULT 'present',
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    UNIQUE (meeting_id, user_id)
);

-- INDEXES FOR PERFORMANCE
CREATE INDEX idx_profiles_team_id ON public.profiles(team_id);
CREATE INDEX idx_tasks_assignee_id ON public.tasks(assignee_id);
CREATE INDEX idx_tasks_team_id ON public.tasks(team_id);
CREATE INDEX idx_task_activity_task_id ON public.task_activity(task_id);
CREATE INDEX idx_standups_user_date ON public.standups(user_id, date);
CREATE INDEX idx_attendance_meeting_user ON public.meeting_attendance(meeting_id, user_id);

-- TRIGGER FOR NEW AUTH USERS
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
BEGIN
  INSERT INTO public.profiles (id, email, name, role, team_id, status, must_reset_password)
  VALUES (
    new.id,
    new.email,
    COALESCE(new.raw_user_meta_data->>'name', 'New User'),
    COALESCE(new.raw_user_meta_data->>'role', 'intern'),
    (new.raw_user_meta_data->>'team_id')::uuid,
    'active',
    COALESCE((new.raw_user_meta_data->>'must_reset_password')::boolean, true)
  );
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- ENABLE ROW LEVEL SECURITY
ALTER TABLE public.teams ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.task_activity ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.standups ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.meetings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.meeting_attendance ENABLE ROW LEVEL SECURITY;

-- ==================== RLS POLICIES ====================

-- Helper: Check if user is admin
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS boolean AS $$
  SELECT COALESCE(
    (SELECT role = 'admin' FROM public.profiles WHERE id = auth.uid()),
    false
  );
$$ LANGUAGE sql SECURITY DEFINER;

-- Helper: Check if user is lead
CREATE OR REPLACE FUNCTION public.is_lead()
RETURNS boolean AS $$
  SELECT COALESCE(
    (SELECT role = 'lead' FROM public.profiles WHERE id = auth.uid()),
    false
  );
$$ LANGUAGE sql SECURITY DEFINER;

-- Helper: Get current user's team_id
CREATE OR REPLACE FUNCTION public.my_team_id()
RETURNS uuid AS $$
  SELECT team_id FROM public.profiles WHERE id = auth.uid();
$$ LANGUAGE sql SECURITY DEFINER;


-- Trigger to check profile updates: prevent non-admins from changing role, team_id, or status
CREATE OR REPLACE FUNCTION public.check_profile_update()
RETURNS trigger AS $$
BEGIN
  -- Enforce checks only for 'authenticated' or 'anon' database roles
  IF current_user NOT IN ('authenticated', 'anon') THEN
    RETURN NEW;
  END IF;

  IF NOT public.is_admin() THEN
    IF OLD.role IS DISTINCT FROM NEW.role THEN
      RAISE EXCEPTION 'Only administrators can change roles.';
    END IF;
    IF OLD.team_id IS DISTINCT FROM NEW.team_id THEN
      RAISE EXCEPTION 'Only administrators can change team assignments.';
    END IF;
    IF OLD.status IS DISTINCT FROM NEW.status THEN
      RAISE EXCEPTION 'Only administrators can change account status.';
    END IF;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER check_profiles_before_update
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.check_profile_update();


-- 1. TEAMS POLICIES
CREATE POLICY "Allow read access to authenticated users" ON public.teams
    FOR SELECT TO authenticated USING (true);

CREATE POLICY "Allow all access to admin users" ON public.teams
    FOR ALL TO authenticated USING (public.is_admin());


-- 2. PROFILES POLICIES
CREATE POLICY "Allow read access to profiles for authenticated users" ON public.profiles
    FOR SELECT TO authenticated USING (true);

-- Admins can update/insert profiles. Since handle_new_user runs as SECURITY DEFINER, it bypasses RLS for creation.
CREATE POLICY "Allow admin to manage profiles" ON public.profiles
    FOR ALL TO authenticated USING (public.is_admin());

-- Users can update their own must_reset_password / name (except changing role or team_id unless admin)
CREATE POLICY "Allow users to update own profile" ON public.profiles
    FOR UPDATE TO authenticated 
    USING (auth.uid() = id)
    WITH CHECK (auth.uid() = id);


-- 3. TASKS POLICIES
CREATE POLICY "Allow select tasks to squad members and admins" ON public.tasks
    FOR SELECT TO authenticated 
    USING (
        public.is_admin() 
        OR NOT (team_id IS DISTINCT FROM public.my_team_id())
        OR assignee_id = auth.uid()
    );

CREATE POLICY "Allow admin and leads to insert tasks" ON public.tasks
    FOR INSERT TO authenticated
    WITH CHECK (
        public.is_admin()
        OR (public.is_lead() AND NOT (team_id IS DISTINCT FROM public.my_team_id()))
    );

CREATE POLICY "Allow users to update their tasks" ON public.tasks
    FOR UPDATE TO authenticated
    USING (
        public.is_admin()
        -- Lead can update tasks in their own team
        OR (public.is_lead() AND NOT (team_id IS DISTINCT FROM public.my_team_id()))
        -- Interns can update tasks assigned to them
        OR (assignee_id = auth.uid())
    )
    WITH CHECK (
        public.is_admin()
        OR (public.is_lead() AND NOT (team_id IS DISTINCT FROM public.my_team_id()))
        OR (assignee_id = auth.uid())
    );

CREATE POLICY "Allow admins to delete tasks" ON public.tasks
    FOR DELETE TO authenticated
    USING (public.is_admin());


-- 4. TASK ACTIVITY POLICIES
CREATE POLICY "Allow read access to task activity for squad/assignees/admin" ON public.task_activity
    FOR SELECT TO authenticated
    USING (
        public.is_admin()
        OR EXISTS (
            SELECT 1 FROM public.tasks t 
            WHERE t.id = task_id 
            AND (NOT (t.team_id IS DISTINCT FROM public.my_team_id()) OR t.assignee_id = auth.uid())
        )
    );

CREATE POLICY "Allow insert task activity for authorized users" ON public.task_activity
    FOR INSERT TO authenticated
    WITH CHECK (
        public.is_admin()
        OR EXISTS (
            SELECT 1 FROM public.tasks t 
            WHERE t.id = task_id 
            AND (NOT (t.team_id IS DISTINCT FROM public.my_team_id()) OR t.assignee_id = auth.uid())
        )
    );


-- 5. STANDUPS POLICIES
CREATE POLICY "Allow select standups for squad and admins" ON public.standups
    FOR SELECT TO authenticated
    USING (
        public.is_admin()
        OR EXISTS (
            SELECT 1 FROM public.profiles p 
            WHERE p.id = user_id 
            AND (NOT (p.team_id IS DISTINCT FROM public.my_team_id()) OR p.id = auth.uid())
        )
    );

CREATE POLICY "Allow users to insert/update their own standups" ON public.standups
    FOR ALL TO authenticated
    USING (user_id = auth.uid())
    WITH CHECK (user_id = auth.uid());


-- 6. MEETINGS POLICIES
CREATE POLICY "Allow read meetings for squad/all-hands and admins" ON public.meetings
    FOR SELECT TO authenticated
    USING (
        public.is_admin()
        OR team_id IS NULL -- All Hands
        OR NOT (team_id IS DISTINCT FROM public.my_team_id())
    );

CREATE POLICY "Allow admins and leads to manage meetings" ON public.meetings
    FOR ALL TO authenticated
    USING (
        public.is_admin()
        OR (public.is_lead() AND NOT (team_id IS DISTINCT FROM public.my_team_id()))
    );


-- 7. MEETING ATTENDANCE POLICIES
CREATE POLICY "Allow read meeting attendance" ON public.meeting_attendance
    FOR SELECT TO authenticated
    USING (
        public.is_admin()
        OR EXISTS (
            SELECT 1 FROM public.meetings m 
            WHERE m.id = meeting_id 
            AND (m.team_id IS NULL OR NOT (m.team_id IS DISTINCT FROM public.my_team_id()))
        )
    );

CREATE POLICY "Allow managers to update attendance" ON public.meeting_attendance
    FOR ALL TO authenticated
    USING (
        public.is_admin()
        OR EXISTS (
            SELECT 1 FROM public.meetings m
            WHERE m.id = meeting_id
            AND NOT (m.team_id IS DISTINCT FROM public.my_team_id())
            AND public.is_lead()
        )
        OR user_id = auth.uid() -- Users can view/rsvp their own attendance
    );
