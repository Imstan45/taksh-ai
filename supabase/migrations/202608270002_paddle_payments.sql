begin;

update public.products set price_in_paise=49900,reference_price_in_paise=99900,
 metadata=metadata||'{"paddle_product_id":"pro_01m11bn6jg9vc4q4k93nc56z2q"}'::jsonb,updated_at=now()
where code='aptitude-english';
update public.products set reference_price_in_paise=99900,
 metadata=metadata||'{"paddle_product_id":"pro_01m11bmsb5g4201r1eehx2ppa9"}'::jsonb,updated_at=now()
where code='servicenow-itsm-developer';
update public.products set reference_price_in_paise=99900,
 metadata=metadata||'{"paddle_product_id":"pro_01m11bkndeqa8frgjdjvjwthmz"}'::jsonb,updated_at=now()
where code='java-full-stack';
update public.products set reference_price_in_paise=99900,
 metadata=metadata||'{"paddle_product_id":"pro_01m11bfxvdjgy2ermvfszxz13r"}'::jsonb,updated_at=now()
where code='python-full-stack';
update public.products set price_in_paise=99900,reference_price_in_paise=199900,
 metadata=metadata||'{"paddle_product_id":"pro_01m11bn8wv6ynm42d1pas23jt0","paddle_price_id":"pri_01m11bybevtrabhg6rde19g6v6"}'::jsonb,updated_at=now()
where code='complete-placement-bundle';

insert into public.schema_migrations(version,description)
values ('202608270002','Configure live Paddle product mappings and launch prices') on conflict do nothing;

commit;
