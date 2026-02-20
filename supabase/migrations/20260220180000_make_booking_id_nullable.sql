-- Make booking_id and uploaded_by_lab_id nullable in water_test_results
ALTER TABLE water_test_results ALTER COLUMN booking_id DROP NOT NULL;
ALTER TABLE water_test_results ALTER COLUMN uploaded_by_lab_id DROP NOT NULL;
alter table water_test_results
  add column if not exists ph numeric,
  add column if not exists ec numeric,
  add column if not exists tds numeric,
  add column if not exists hardness numeric,
  add column if not exists na numeric,
  add column if not exists ca numeric,
  add column if not exists mg numeric,
  add column if not exists sar numeric,
  add column if not exists rsc numeric,
  add column if not exists hco3 numeric,
  add column if not exists co3 numeric,
  add column if not exists cl numeric,
  add column if not exists so4 numeric,
  add column if not exists boron numeric,
  add column if not exists no3_n numeric,
  add column if not exists fe numeric,
  add column if not exists f numeric,
  add column if not exists report_url text,
  add column if not exists booking_id uuid null,
  add column if not exists uploaded_by_lab_id uuid null,
  add column if not exists created_at timestamp with time zone default now();
  alter table water_test_results
  add column if not exists field_id uuid references fields(id);
  alter table water_test_results
  add column if not exists user_id uuid references auth.users(id);