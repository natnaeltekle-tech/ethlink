-- Expose gallery + coordinates on services_view so list cards can fall back to
-- gallery[0] and the map / "sorted by nearest" features get real coordinates.
-- New columns are appended at the end, which CREATE OR REPLACE VIEW allows
-- without touching existing columns or dependants.

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
    count(r.id) AS review_count,
    s.gallery,
    s.latitude,
    s.longitude
   FROM services s
     LEFT JOIN reviews r ON s.id = r.service_id
  GROUP BY s.id;

GRANT SELECT ON public.services_view TO anon, authenticated;
