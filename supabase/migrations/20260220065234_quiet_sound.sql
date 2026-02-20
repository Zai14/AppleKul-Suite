/*
  # Complete AppleKul™ Suite Database Schema

  This migration creates the complete database schema for the AppleKul™ Suite application,
  including all tables, relationships, security policies, and functions.

  ## Tables Created:
  1. profiles - User profile information
  2. fields - Orchard/field management
  3. tree_tags - Individual tree tracking
  4. orchard_varieties - Variety management per field
  5. production_records - Harvest and production data
  6. soil_test_results - Soil analysis data
  7. activities - User activity tracking
  8. weather_data - Weather information storage
  9. notifications - User notifications
  10. tasks - Task management
  11. expenses - Expense tracking
  12. harvests - Harvest records
  13. field_analytics - Analytics data
  14. consultations - Orchard doctor consultations
  15. prescriptions - Digital prescriptions
  16. prescription_action_items - Prescription action items
  17. sprays - Spray application records
  18. spray_chemicals - Chemical details for sprays
  19. activity_expenses - Activity-based expenses
  20. labour_workers - Worker management
  21. income_entries - Income tracking

  ## Security:
  - Row Level Security (RLS) enabled on all tables
  - Policies for authenticated users to access their own data
  - Public read access for reference data where appropriate

  ## Functions:
  - Helper functions for analytics and calculations
*/

-- Enable necessary extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "postgis";

-- ============================================================================
-- PROFILES TABLE
-- ============================================================================
CREATE TABLE IF NOT EXISTS profiles (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  name text,
  email text,
  phone text,
  farm_name text,
  avatar_url text,
  khasra_number text,
  khata_number text,
  whatsapp text,
  address text,
  language text DEFAULT 'en',
  currency text DEFAULT 'INR',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read own profile"
  ON profiles
  FOR SELECT
  TO authenticated
  USING (auth.uid() = id);

CREATE POLICY "Users can update own profile"
  ON profiles
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = id);

CREATE POLICY "Users can insert own profile"
  ON profiles
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = id);

-- ============================================================================
-- FIELDS TABLE
-- ============================================================================
CREATE TABLE IF NOT EXISTS fields (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  name text NOT NULL,
  area numeric,
  soil_type text,
  crop_stage text DEFAULT 'Growing',
  health_status text DEFAULT 'Good',
  location text,
  planted_date date,
  latitude numeric,
  longitude numeric,
  boundary_path jsonb,
  details jsonb DEFAULT '{}',
  image_urls text[],
  notes text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE fields ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage own fields"
  ON fields
  FOR ALL
  TO authenticated
  USING (auth.uid() = user_id);

-- ============================================================================
-- TREE TAGS TABLE
-- ============================================================================
CREATE TABLE IF NOT EXISTS tree_tags (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  field_id uuid REFERENCES fields(id) ON DELETE CASCADE NOT NULL,
  name text,
  variety text,
  row_number integer,
  latitude numeric NOT NULL,
  longitude numeric NOT NULL,
  health_status text DEFAULT 'Good',
  planted_date date,
  notes text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE tree_tags ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage own tree tags"
  ON tree_tags
  FOR ALL
  TO authenticated
  USING (auth.uid() = user_id);

-- ============================================================================
-- ORCHARD VARIETIES TABLE
-- ============================================================================
CREATE TABLE IF NOT EXISTS orchard_varieties (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  field_id uuid REFERENCES fields(id) ON DELETE CASCADE NOT NULL,
  variety_name text NOT NULL,
  variety_type text DEFAULT 'traditional' CHECK (variety_type IN ('traditional', 'high_density', 'exotic')),
  role text DEFAULT 'main' CHECK (role IN ('main', 'pollinator', 'both')),
  total_trees integer DEFAULT 0,
  planted_trees integer DEFAULT 0,
  healthy_trees integer DEFAULT 0,
  production_per_tree numeric DEFAULT 0,
  expected_yield numeric DEFAULT 0,
  actual_yield numeric DEFAULT 0,
  planting_date date,
  first_harvest_date date,
  notes text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE orchard_varieties ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage own orchard varieties"
  ON orchard_varieties
  FOR ALL
  TO authenticated
  USING (auth.uid() = user_id);

-- ============================================================================
-- PRODUCTION RECORDS TABLE
-- ============================================================================
CREATE TABLE IF NOT EXISTS production_records (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  field_id uuid REFERENCES fields(id) ON DELETE CASCADE NOT NULL,
  variety_name text NOT NULL,
  harvest_date date NOT NULL,
  quantity numeric DEFAULT 0,
  unit text DEFAULT 'kg',
  quality_grade text DEFAULT 'A',
  price_per_unit numeric DEFAULT 0,
  total_value numeric GENERATED ALWAYS AS (quantity * price_per_unit) STORED,
  buyer_name text,
  buyer_contact text,
  weather_conditions text,
  notes text,
  images text[],
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE production_records ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage own production records"
  ON production_records
  FOR ALL
  TO authenticated
  USING (auth.uid() = user_id);

-- ============================================================================
-- SOIL TEST RESULTS TABLE
-- ============================================================================
CREATE TABLE IF NOT EXISTS soil_test_results (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  field_id uuid REFERENCES fields(id) ON DELETE CASCADE,
  test_date date NOT NULL,
  soil_ph numeric,
  nitrogen numeric,
  phosphorus numeric,
  potassium numeric,
  organic_matter numeric,
  ec numeric,
  calcium numeric,
  magnesium numeric,
  sulfur numeric,
  iron numeric,
  manganese numeric,
  zinc numeric,
  copper numeric,
  boron numeric,
  recorded_date date DEFAULT CURRENT_DATE,
  lab_name text,
  recommendations text,
  notes text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE soil_test_results ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage own soil test results"
  ON soil_test_results
  FOR ALL
  TO authenticated
  USING (auth.uid() = user_id);

-- ============================================================================
-- ACTIVITIES TABLE
-- ============================================================================
CREATE TABLE IF NOT EXISTS activities (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  field_id uuid REFERENCES fields(id) ON DELETE SET NULL,
  title text NOT NULL,
  description text,
  kind text DEFAULT 'info' CHECK (kind IN ('success', 'warning', 'info', 'error')),
  metadata jsonb DEFAULT '{}',
  created_at timestamptz DEFAULT now()
);

ALTER TABLE activities ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage own activities"
  ON activities
  FOR ALL
  TO authenticated
  USING (auth.uid() = user_id);

-- ============================================================================
-- WEATHER DATA TABLE
-- ============================================================================
CREATE TABLE IF NOT EXISTS weather_data (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  location text NOT NULL,
  latitude numeric,
  longitude numeric,
  temperature numeric,
  humidity numeric,
  precipitation numeric,
  wind_speed numeric,
  weather_condition text,
  forecast_data jsonb DEFAULT '{}',
  data_source text DEFAULT 'open-meteo',
  recorded_at timestamptz DEFAULT now(),
  created_at timestamptz DEFAULT now()
);

ALTER TABLE weather_data ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage own weather data"
  ON weather_data
  FOR ALL
  TO authenticated
  USING (auth.uid() = user_id);

-- ============================================================================
-- NOTIFICATIONS TABLE
-- ============================================================================
CREATE TABLE IF NOT EXISTS notifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  title text NOT NULL,
  message text NOT NULL,
  type text DEFAULT 'info' CHECK (type IN ('info', 'warning', 'success', 'error')),
  read boolean DEFAULT false,
  action_url text,
  metadata jsonb DEFAULT '{}',
  created_at timestamptz DEFAULT now()
);

ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage own notifications"
  ON notifications
  FOR ALL
  TO authenticated
  USING (auth.uid() = user_id);

-- ============================================================================
-- TASKS TABLE
-- ============================================================================
CREATE TABLE IF NOT EXISTS tasks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  field_id uuid REFERENCES fields(id) ON DELETE SET NULL,
  title text NOT NULL,
  description text,
  status text DEFAULT 'pending' CHECK (status IN ('pending', 'in_progress', 'completed', 'cancelled')),
  priority text DEFAULT 'medium' CHECK (priority IN ('low', 'medium', 'high', 'urgent')),
  due_date timestamptz,
  completed_at timestamptz,
  assigned_to uuid REFERENCES auth.users(id),
  tags text[],
  metadata jsonb DEFAULT '{}',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE tasks ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage own tasks"
  ON tasks
  FOR ALL
  TO authenticated
  USING (auth.uid() = user_id);

-- ============================================================================
-- EXPENSES TABLE
-- ============================================================================
CREATE TABLE IF NOT EXISTS expenses (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  field_id uuid REFERENCES fields(id) ON DELETE SET NULL,
  title text NOT NULL,
  description text,
  amount numeric NOT NULL,
  currency text DEFAULT 'INR',
  category text NOT NULL,
  expense_date date NOT NULL,
  payment_method text,
  receipt_url text,
  tags text[],
  metadata jsonb DEFAULT '{}',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE expenses ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage own expenses"
  ON expenses
  FOR ALL
  TO authenticated
  USING (auth.uid() = user_id);

-- ============================================================================
-- HARVESTS TABLE
-- ============================================================================
CREATE TABLE IF NOT EXISTS harvests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  field_id uuid REFERENCES fields(id) ON DELETE CASCADE NOT NULL,
  harvest_date date NOT NULL,
  quantity numeric NOT NULL,
  unit text DEFAULT 'kg',
  quality_grade text DEFAULT 'A',
  price_per_unit numeric DEFAULT 0,
  total_value numeric GENERATED ALWAYS AS (quantity * price_per_unit) STORED,
  buyer_name text,
  buyer_contact text,
  notes text,
  images text[],
  metadata jsonb DEFAULT '{}',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE harvests ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage own harvests"
  ON harvests
  FOR ALL
  TO authenticated
  USING (auth.uid() = user_id);

-- ============================================================================
-- FIELD ANALYTICS TABLE
-- ============================================================================
CREATE TABLE IF NOT EXISTS field_analytics (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  field_id uuid REFERENCES fields(id) ON DELETE CASCADE NOT NULL,
  metric_type text NOT NULL,
  metric_value numeric NOT NULL,
  unit text,
  recorded_date date DEFAULT CURRENT_DATE,
  notes text,
  metadata jsonb DEFAULT '{}',
  created_at timestamptz DEFAULT now()
);

ALTER TABLE field_analytics ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage own field analytics"
  ON field_analytics
  FOR ALL
  TO authenticated
  USING (auth.uid() = user_id);

-- ============================================================================
-- ORCHARD DOCTOR TABLES
-- ============================================================================

-- Consultations Table
CREATE TABLE IF NOT EXISTS consultations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  grower_name text NOT NULL,
  grower_phone text NOT NULL,
  field_id uuid REFERENCES fields(id) ON DELETE CASCADE NOT NULL,
  orchard_name text NOT NULL,
  doctor_id text,
  type text NOT NULL CHECK (type IN ('CHAT', 'CALL', 'VIDEO', 'ONSITE_VISIT')),
  status text NOT NULL DEFAULT 'REQUESTED' CHECK (status IN ('REQUESTED', 'IN_PROGRESS', 'COMPLETED')),
  target_datetime timestamptz NOT NULL,
  notes text NOT NULL,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE consultations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage own consultations"
  ON consultations
  FOR ALL
  TO authenticated
  USING (auth.uid() = user_id);

-- Prescriptions Table
CREATE TABLE IF NOT EXISTS prescriptions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  consultation_id uuid REFERENCES consultations(id) ON DELETE CASCADE NOT NULL,
  doctor_name text NOT NULL,
  hospital_name text NOT NULL,
  issue_diagnosed text NOT NULL,
  eppo_code text NOT NULL,
  recommendation text NOT NULL,
  status text NOT NULL DEFAULT 'PENDING' CHECK (status IN ('PENDING', 'APPLIED', 'NEEDS_CORRECTION')),
  issued_at date NOT NULL,
  follow_up_date date NOT NULL,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE prescriptions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can manage prescriptions"
  ON prescriptions
  FOR ALL
  TO authenticated
  USING (true);

-- Prescription Action Items Table
CREATE TABLE IF NOT EXISTS prescription_action_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  prescription_id uuid REFERENCES prescriptions(id) ON DELETE CASCADE NOT NULL,
  category text NOT NULL CHECK (category IN ('FUNGICIDE', 'INSECTICIDE', 'FERTILIZER', 'LABOR', 'IRRIGATION', 'OTHER')),
  product_name text NOT NULL,
  dosage text NOT NULL,
  estimated_cost numeric NOT NULL,
  sort_order integer NOT NULL DEFAULT 0
);

ALTER TABLE prescription_action_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can manage prescription action items"
  ON prescription_action_items
  FOR ALL
  TO authenticated
  USING (true);

-- ============================================================================
-- FINANCIAL LEDGER TABLES
-- ============================================================================

CREATE TABLE IF NOT EXISTS sprays (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  spray_no integer NOT NULL,
  stage text NOT NULL,
  spray_date date NOT NULL,
  water_litres numeric NOT NULL,
  labour_count integer NOT NULL,
  labour_rate numeric NOT NULL,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE sprays ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can manage sprays"
  ON sprays
  FOR ALL
  TO authenticated
  USING (true);

CREATE TABLE IF NOT EXISTS spray_chemicals (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  spray_id uuid REFERENCES sprays(id) ON DELETE CASCADE NOT NULL,
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  chemical_name text NOT NULL,
  brand text NOT NULL,
  qty numeric NOT NULL,
  unit text NOT NULL,
  rate numeric NOT NULL,
  recommended text NOT NULL,
  sort_order integer NOT NULL DEFAULT 0
);

ALTER TABLE spray_chemicals ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can manage spray chemicals"
  ON spray_chemicals
  FOR ALL
  TO authenticated
  USING (true);

CREATE TABLE IF NOT EXISTS activity_expenses (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  category text NOT NULL CHECK (category IN ('PRUNING', 'DIGGING', 'IRRIGATION', 'GENERAL', 'PICKING', 'GRADING', 'PACKAGING', 'FORWARDING', 'SERVICES', 'FERTILIZER', 'OTHER')),
  expense_date date NOT NULL,
  description text NOT NULL,
  amount numeric NOT NULL,
  days integer NOT NULL,
  labour_count integer NOT NULL,
  rate_per_day numeric NOT NULL,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE activity_expenses ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can manage activity expenses"
  ON activity_expenses
  FOR ALL
  TO authenticated
  USING (true);

CREATE TABLE IF NOT EXISTS labour_workers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  worker_name text NOT NULL,
  phone text NOT NULL,
  activity text NOT NULL,
  start_date date NOT NULL,
  end_date date NOT NULL,
  days integer NOT NULL,
  rate_per_day numeric NOT NULL,
  advance numeric NOT NULL DEFAULT 0,
  paid boolean NOT NULL DEFAULT false,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE labour_workers ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can manage labour workers"
  ON labour_workers
  FOR ALL
  TO authenticated
  USING (true);

CREATE TABLE IF NOT EXISTS income_entries (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  variety text NOT NULL,
  crates integer NOT NULL,
  kg_per_crate numeric NOT NULL,
  price_per_crate numeric NOT NULL,
  sale_date date NOT NULL,
  buyer text NOT NULL,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE income_entries ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can manage income entries"
  ON income_entries
  FOR ALL
  TO authenticated
  USING (true);

-- ============================================================================
-- VIEWS
-- ============================================================================

-- Field Analytics View
CREATE OR REPLACE VIEW field_analytics_view AS
SELECT 
  f.id,
  f.user_id,
  f.name,
  f.area,
  COALESCE(tt.tagged_trees, 0) as tagged_trees,
  COALESCE(ov.total_varieties, 0) as total_varieties,
  COALESCE(ov.total_planned_trees, 0) as total_planned_trees,
  COALESCE(pr.total_harvests, 0) as total_harvests,
  COALESCE(pr.total_production_kg, 0) as total_production_kg,
  COALESCE(pr.total_production_value, 0) as total_production_value,
  COALESCE(pr.average_quality, 'N/A') as average_quality,
  pr.latest_harvest_date,
  COALESCE(pr.latest_harvest_quantity, 0) as latest_harvest_quantity
FROM fields f
LEFT JOIN (
  SELECT 
    field_id,
    COUNT(*) as tagged_trees
  FROM tree_tags
  GROUP BY field_id
) tt ON f.id = tt.field_id
LEFT JOIN (
  SELECT 
    field_id,
    COUNT(*) as total_varieties,
    SUM(total_trees) as total_planned_trees
  FROM orchard_varieties
  GROUP BY field_id
) ov ON f.id = ov.field_id
LEFT JOIN (
  SELECT 
    field_id,
    COUNT(*) as total_harvests,
    SUM(quantity) as total_production_kg,
    SUM(total_value) as total_production_value,
    MODE() WITHIN GROUP (ORDER BY quality_grade) as average_quality,
    MAX(harvest_date) as latest_harvest_date,
    (SELECT quantity FROM production_records pr2 WHERE pr2.field_id = pr1.field_id ORDER BY harvest_date DESC LIMIT 1) as latest_harvest_quantity
  FROM production_records pr1
  GROUP BY field_id
) pr ON f.id = pr.field_id;

-- Field Summary View
CREATE OR REPLACE VIEW field_summary AS
SELECT 
  f.id,
  f.user_id,
  f.name,
  f.area,
  f.health_status,
  f.crop_stage,
  f.location,
  COALESCE(h.total_harvest, 0) as total_harvest,
  COALESCE(e.total_expenses, 0) as total_expenses,
  COALESCE(h.total_harvest, 0) - COALESCE(e.total_expenses, 0) as net_profit,
  f.created_at,
  f.updated_at
FROM fields f
LEFT JOIN (
  SELECT 
    field_id,
    SUM(total_value) as total_harvest
  FROM harvests
  GROUP BY field_id
) h ON f.id = h.field_id
LEFT JOIN (
  SELECT 
    field_id,
    SUM(amount) as total_expenses
  FROM expenses
  GROUP BY field_id
) e ON f.id = e.field_id;

-- ============================================================================
-- FUNCTIONS
-- ============================================================================

-- Function to calculate field statistics
CREATE OR REPLACE FUNCTION calculate_field_stats(field_uuid uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  result jsonb;
BEGIN
  SELECT jsonb_build_object(
    'total_trees', COALESCE(tree_count.count, 0),
    'total_varieties', COALESCE(variety_count.count, 0),
    'total_production', COALESCE(production_sum.total, 0),
    'total_expenses', COALESCE(expense_sum.total, 0),
    'net_profit', COALESCE(production_sum.total, 0) - COALESCE(expense_sum.total, 0)
  ) INTO result
  FROM (SELECT 1) as dummy
  LEFT JOIN (
    SELECT COUNT(*) as count
    FROM tree_tags
    WHERE field_id = field_uuid
  ) tree_count ON true
  LEFT JOIN (
    SELECT COUNT(*) as count
    FROM orchard_varieties
    WHERE field_id = field_uuid
  ) variety_count ON true
  LEFT JOIN (
    SELECT SUM(total_value) as total
    FROM production_records
    WHERE field_id = field_uuid
  ) production_sum ON true
  LEFT JOIN (
    SELECT SUM(amount) as total
    FROM expenses
    WHERE field_id = field_uuid
  ) expense_sum ON true;

  RETURN result;
END;
$$;

-- ============================================================================
-- TRIGGERS
-- ============================================================================

-- Update timestamps trigger function
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ language 'plpgsql';

-- Apply updated_at triggers to relevant tables
CREATE TRIGGER update_profiles_updated_at BEFORE UPDATE ON profiles FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_fields_updated_at BEFORE UPDATE ON fields FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_tree_tags_updated_at BEFORE UPDATE ON tree_tags FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_orchard_varieties_updated_at BEFORE UPDATE ON orchard_varieties FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_production_records_updated_at BEFORE UPDATE ON production_records FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_soil_test_results_updated_at BEFORE UPDATE ON soil_test_results FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_tasks_updated_at BEFORE UPDATE ON tasks FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_expenses_updated_at BEFORE UPDATE ON expenses FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_harvests_updated_at BEFORE UPDATE ON harvests FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================================================
-- INDEXES
-- ============================================================================

-- Performance indexes
CREATE INDEX IF NOT EXISTS idx_fields_user_id ON fields(user_id);
CREATE INDEX IF NOT EXISTS idx_tree_tags_field_id ON tree_tags(field_id);
CREATE INDEX IF NOT EXISTS idx_tree_tags_user_id ON tree_tags(user_id);
CREATE INDEX IF NOT EXISTS idx_orchard_varieties_field_id ON orchard_varieties(field_id);
CREATE INDEX IF NOT EXISTS idx_production_records_field_id ON production_records(field_id);
CREATE INDEX IF NOT EXISTS idx_production_records_harvest_date ON production_records(harvest_date);
CREATE INDEX IF NOT EXISTS idx_soil_test_results_field_id ON soil_test_results(field_id);
CREATE INDEX IF NOT EXISTS idx_activities_user_id ON activities(user_id);
CREATE INDEX IF NOT EXISTS idx_weather_data_user_id ON weather_data(user_id);
CREATE INDEX IF NOT EXISTS idx_notifications_user_id ON notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_tasks_user_id ON tasks(user_id);
CREATE INDEX IF NOT EXISTS idx_expenses_user_id ON expenses(user_id);
CREATE INDEX IF NOT EXISTS idx_harvests_field_id ON harvests(field_id);
CREATE INDEX IF NOT EXISTS idx_field_analytics_field_id ON field_analytics(field_id);

-- Spatial indexes (if using PostGIS)
CREATE INDEX IF NOT EXISTS idx_fields_location ON fields USING GIST(ST_Point(longitude, latitude)) WHERE latitude IS NOT NULL AND longitude IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_tree_tags_location ON tree_tags USING GIST(ST_Point(longitude, latitude));

-- ============================================================================
-- STORAGE BUCKETS
-- ============================================================================

-- Create storage buckets for file uploads
INSERT INTO storage.buckets (id, name, public) 
VALUES 
  ('avatars', 'avatars', true),
  ('field-images', 'field-images', true),
  ('harvest-images', 'harvest-images', true),
  ('receipts', 'receipts', false)
ON CONFLICT (id) DO NOTHING;

-- Storage policies
CREATE POLICY "Avatar images are publicly accessible"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'avatars');

CREATE POLICY "Users can upload their own avatar"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (bucket_id = 'avatars' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users can update their own avatar"
  ON storage.objects FOR UPDATE
  TO authenticated
  USING (bucket_id = 'avatars' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Field images are publicly accessible"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'field-images');

CREATE POLICY "Users can upload field images"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (bucket_id = 'field-images');

CREATE POLICY "Harvest images are publicly accessible"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'harvest-images');

CREATE POLICY "Users can upload harvest images"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (bucket_id = 'harvest-images');

CREATE POLICY "Users can access their own receipts"
  ON storage.objects FOR SELECT
  TO authenticated
  USING (bucket_id = 'receipts' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users can upload their own receipts"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (bucket_id = 'receipts' AND auth.uid()::text = (storage.foldername(name))[1]);