-- Allow authenticated users to upload files to the soil-reports bucket
create policy "Authenticated users can upload to soil-reports"
on storage.objects
for insert
using (
  bucket_id = 'soil-reports'
  AND auth.role() = 'authenticated'
);
-- Allow authenticated users to read files from the soil-reports bucket
create policy "Authenticated users can read from soil-reports"
on storage.objects
for select
using (
  bucket_id = 'soil-reports'
  AND auth.role() = 'authenticated'
);

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