create table public.love_gallery_photos (
 id uuid primary key default gen_random_uuid(),
 source_bucket text not null default 'love-gallery' check(source_bucket in ('love-gallery','product-images')),
 image_path text not null check(length(image_path) between 1 and 512 and image_path not like '%..%' and left(image_path,1)<>'/'),
 alt text not null default 'Bella by RT lip gloss' check(length(alt)<=240),
 caption text not null default '' check(length(caption)<=180),
 display_order integer not null default 0 check(display_order>=0),
 is_active boolean not null default true,
 created_at timestamptz not null default now(),
 updated_at timestamptz not null default now(),
 unique(source_bucket,image_path)
);
create index love_gallery_active_order_idx on public.love_gallery_photos(is_active,display_order,created_at,id);
create trigger love_gallery_updated before update on public.love_gallery_photos for each row execute function private.touch_updated_at();
alter table public.love_gallery_photos enable row level security;
revoke all on public.love_gallery_photos from anon,authenticated;
grant select on public.love_gallery_photos to anon,authenticated;
grant insert,update,delete on public.love_gallery_photos to authenticated;
grant all on public.love_gallery_photos to service_role;
create policy love_gallery_read on public.love_gallery_photos for select to anon,authenticated using(is_active or (select private.is_admin()));
create policy love_gallery_admin_insert on public.love_gallery_photos for insert to authenticated with check((select private.is_admin()));
create policy love_gallery_admin_update on public.love_gallery_photos for update to authenticated using((select private.is_admin())) with check((select private.is_admin()));
create policy love_gallery_admin_delete on public.love_gallery_photos for delete to authenticated using((select private.is_admin()));
insert into storage.buckets(id,name,public,file_size_limit,allowed_mime_types) values('love-gallery','love-gallery',true,5242880,array['image/jpeg','image/png','image/webp']);
create policy love_gallery_storage_insert on storage.objects for insert to authenticated with check(bucket_id='love-gallery' and (storage.foldername(name))[1]='gallery' and (select private.is_admin()));
create policy love_gallery_storage_read on storage.objects for select to authenticated using(bucket_id='love-gallery' and (select private.is_admin()));
create policy love_gallery_storage_delete on storage.objects for delete to authenticated using(bucket_id='love-gallery' and (select private.is_admin()));
-- Reuse existing published product photos without copying or modifying those assets.
insert into public.love_gallery_photos(source_bucket,image_path,alt,caption,display_order)
select 'product-images',photo.path,coalesce(nullif(photo.alt,''),p.name),p.name,(row_number() over(order by p.created_at,p.id)-1)::integer
from public.products p cross join lateral(select path,alt from public.product_images where product_id=p.id order by position,id limit 1) photo
where p.status='published';
