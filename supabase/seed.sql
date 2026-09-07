insert into public.maintenance_areas(id,name,slug) values
('10000000-0000-4000-8000-000000000001','Bacheo','pothole_repair'),
('10000000-0000-4000-8000-000000000002','Alumbrado público','public_lighting'),
('10000000-0000-4000-8000-000000000003','Basura','waste_management') on conflict(id) do nothing;
insert into public.incident_categories(name,slug,maintenance_area_id) values
('Bache','bache','10000000-0000-4000-8000-000000000001'),
('Alumbrado público','alumbrado','10000000-0000-4000-8000-000000000002'),
('Basura','basura','10000000-0000-4000-8000-000000000003'),
('Otra incidencia','otra',null) on conflict(slug) do nothing;
