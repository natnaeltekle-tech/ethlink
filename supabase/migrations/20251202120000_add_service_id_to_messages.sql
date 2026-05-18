alter table messages add column if not exists service_id uuid references services(id);
