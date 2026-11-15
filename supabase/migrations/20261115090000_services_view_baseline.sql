-- Baseline: services_view exactly as it exists in production (market-ai-v3),
-- captured 2026-11-15 via pg_get_viewdef. The view was created outside the
-- migration history; this file records it so the repo matches the live DB.
-- Applying it to production is a no-op (same columns, same options).
--
-- Columns: id, title, category, description, price, location, image_url,
--   user_id, created_at, updated_at, images, is_active, avg_rating, review_count
-- NOTE: gallery, latitude, longitude and amenities exist on `services` but are
--   NOT exposed by this view.
--
-- security_invoker = true → RLS on services/reviews applies to the caller.

CREATE OR REPLACE VIEW public.services_view
WITH (security_invoker = true) AS
 SELECT s.id,
    s.title,
    s.category,
    s.description,
    s.price,
    s.location,
    s.image_url,
    s.user_id,
    s.created_at,
    s.updated_at,
    s.images,
    s.is_active,
    COALESCE(avg(r.rating), 0::numeric) AS avg_rating,
    count(r.id) AS review_count
   FROM services s
     LEFT JOIN reviews r ON s.id = r.service_id
  GROUP BY s.id;

GRANT SELECT ON public.services_view TO anon, authenticated;
