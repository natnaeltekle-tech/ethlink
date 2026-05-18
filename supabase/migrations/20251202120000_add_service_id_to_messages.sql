DO $$ BEGIN alter table messages add column service_id uuid references services(id); EXCEPTION WHEN duplicate_column THEN END $$;
