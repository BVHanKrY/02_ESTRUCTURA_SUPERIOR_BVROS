-- BVros pilot seed. Run after 001_bvros_schema.sql.

insert into public.artists (public_id, slug, name, bio, country, status)
values ('BVROS-ART-000001','bvhankry','BVHanKrY','Artista piloto y primer cliente experimental de BVros.','Ecuador','published')
on conflict (public_id) do update set name=excluded.name, status=excluded.status;

insert into public.releases (public_id, artist_id, slug, title, release_type, status)
select 'BVROS-REL-PULSO-001', id, 'pulso', 'Pulso', 'ep', 'published'
from public.artists where public_id='BVROS-ART-000001'
on conflict (public_id) do update set status=excluded.status;

insert into public.tracks (public_id, release_id, slug, title, track_number, status)
select v.public_id, r.id, v.slug, v.title, v.track_number, 'published'::public.catalog_status
from public.releases r
cross join (values
 ('BVROS-TRK-PULSO-001','tinkuy','Tinkuy',1),
 ('BVROS-TRK-PULSO-002','subtle-gad','Subtle Gad',2),
 ('BVROS-TRK-PULSO-003','regresion','Regresión',3)
) as v(public_id,slug,title,track_number)
where r.public_id='BVROS-REL-PULSO-001'
on conflict (public_id) do update set title=excluded.title, status=excluded.status;

-- Paths expected after you upload STREAMING COPIES, not masters.
insert into public.track_assets (track_id, kind, bucket_name, object_path, mime_type, active)
select t.id, 'stream', 'bvros-stream-private', v.object_path, 'audio/mpeg', true
from public.tracks t
join (values
 ('BVROS-TRK-PULSO-001','artists/bvhankry/pulso/tinkuy/stream.mp3'),
 ('BVROS-TRK-PULSO-002','artists/bvhankry/pulso/subtle-gad/stream.mp3'),
 ('BVROS-TRK-PULSO-003','artists/bvhankry/pulso/regresion/stream.mp3')
) as v(public_id, object_path) on v.public_id=t.public_id
on conflict (track_id, kind, object_path) do update set active=true;

-- Native BVros pilot release. It remains draft until ready.
insert into public.releases (public_id, artist_id, slug, title, release_type, status)
select 'BVROS-REL-RAIZ-001', id, 'raiz-de-mi-ser', 'Raíz de mi ser', 'single', 'draft'
from public.artists where public_id='BVROS-ART-000001'
on conflict (public_id) do nothing;

insert into public.tracks (public_id, release_id, slug, title, track_number, status)
select 'BVROS-TRK-RAIZ-001', id, 'raiz-de-mi-ser', 'Raíz de mi ser', 1, 'draft'
from public.releases where public_id='BVROS-REL-RAIZ-001'
on conflict (public_id) do nothing;
