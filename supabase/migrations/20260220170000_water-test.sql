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
  -- Enable Row Level Security for storage.objects
alter table storage.objects enable row level security;


-- Allow authenticated users to upload files to the water-reports bucket
create policy "Authenticated users can upload to water-reports"
on storage.objects
for insert
using (
  bucket_id = 'water-reports'
  AND auth.role() = 'authenticated'
);
-- Allow authenticated users to read files from the water-reports bucket
create policy "Authenticated users can read from water-reports"
on storage.objects
for select
using (
  bucket_id = 'water-reports'
  AND auth.role() = 'authenticated'
);

-- (Optional) Allow all authenticated users to read any file in water-reports
-- Remove the AND clause if you want all authenticated users to read all files in the bucket