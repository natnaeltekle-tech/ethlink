alter table messages add column service_id uuid references services(id);
