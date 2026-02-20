-- =========================
-- DROP VIEWS
-- =========================
DROP VIEW IF EXISTS field_analytics_view CASCADE;
DROP VIEW IF EXISTS field_summary CASCADE;

-- =========================
-- DROP FUNCTIONS
-- =========================
DROP FUNCTION IF EXISTS calculate_field_stats(uuid) CASCADE;
DROP FUNCTION IF EXISTS update_updated_at_column() CASCADE;

-- =========================
-- DROP TABLES (order matters due to FKs)
-- =========================
DROP TABLE IF EXISTS prescription_action_items CASCADE;
DROP TABLE IF EXISTS prescriptions CASCADE;
DROP TABLE IF EXISTS consultations CASCADE;

DROP TABLE IF EXISTS spray_chemicals CASCADE;
DROP TABLE IF EXISTS sprays CASCADE;

DROP TABLE IF EXISTS activity_expenses CASCADE;
DROP TABLE IF EXISTS labour_workers CASCADE;
DROP TABLE IF EXISTS income_entries CASCADE;

DROP TABLE IF EXISTS field_analytics CASCADE;
DROP TABLE IF EXISTS harvests CASCADE;
DROP TABLE IF EXISTS expenses CASCADE;
DROP TABLE IF EXISTS tasks CASCADE;
DROP TABLE IF EXISTS notifications CASCADE;
DROP TABLE IF EXISTS weather_data CASCADE;
DROP TABLE IF EXISTS activities CASCADE;
DROP TABLE IF EXISTS soil_test_results CASCADE;
DROP TABLE IF EXISTS production_records CASCADE;
DROP TABLE IF EXISTS orchard_varieties CASCADE;
DROP TABLE IF EXISTS tree_tags CASCADE;
DROP TABLE IF EXISTS fields CASCADE;
DROP TABLE IF EXISTS profiles CASCADE;

-- =========================
-- DROP EXTENSIONS (optional)
-- =========================
DROP EXTENSION IF EXISTS postgis CASCADE;
DROP EXTENSION IF EXISTS "uuid-ossp" CASCADE;

-- Drop existing storage policies (safe)
DROP POLICY IF EXISTS "Avatar images are publicly accessible" ON storage.objects;
DROP POLICY IF EXISTS "Users can upload their own avatar" ON storage.objects;
DROP POLICY IF EXISTS "Users can update their own avatar" ON storage.objects;

DROP POLICY IF EXISTS "Field images are publicly accessible" ON storage.objects;
DROP POLICY IF EXISTS "Users can upload field images" ON storage.objects;

DROP POLICY IF EXISTS "Harvest images are publicly accessible" ON storage.objects;
DROP POLICY IF EXISTS "Users can upload harvest images" ON storage.objects;

DROP POLICY IF EXISTS "Users can access their own receipts" ON storage.objects;
DROP POLICY IF EXISTS "Users can upload their own receipts" ON storage.objects;