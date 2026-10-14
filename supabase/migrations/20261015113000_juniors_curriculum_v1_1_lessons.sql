begin;

insert into public.juniors_curriculum_versions(version,title,status,published_at)
values('1.1','MPC foundation curriculum','published',now())
on conflict(version) do update set title=excluded.title,status='published',published_at=coalesce(juniors_curriculum_versions.published_at,now());

with lesson_data(subject,chapter_slug,lesson_slug,title,display_order) as (values
  ('mathematics','trigonometry','unit-circle-values','Unit-circle values without memorising',20),
  ('mathematics','coordinate-geometry','line-from-two-points','A line through two points',30),
  ('mathematics','calculus','derivative-as-rate','Derivative as an instantaneous rate',40),
  ('mathematics','vectors','vector-components','Working with vector components',50),
  ('mathematics','probability','conditional-probability','Probability after new information',60),
  ('mathematics','statistics','mean-and-spread','Centre and spread tell different stories',70),
  ('physics','thermodynamics','first-law','Tracking thermal energy',20),
  ('physics','waves','wave-speed','Linking speed, frequency and wavelength',30),
  ('physics','electricity','ohms-law','Voltage, current and resistance',40),
  ('physics','magnetism','force-on-charge','A moving charge in a magnetic field',50),
  ('physics','optics','snells-law','Why light bends',60),
  ('physics','modern-physics','photon-energy','Light arrives in energy packets',70),
  ('chemistry','inorganic-chemistry','periodic-radius','Why atomic size changes',20),
  ('chemistry','organic-chemistry','functional-groups','Functional groups predict behaviour',30)
)
insert into public.juniors_lessons(curriculum_version_id,subject,chapter_slug,lesson_slug,title,content,status,display_order)
select version.id,data.subject,data.chapter_slug,data.lesson_slug,data.title,
       jsonb_build_object('origin','taksh_original','review_status','published_foundation','curriculum_version','1.1'),
       'published',data.display_order
from lesson_data data cross join public.juniors_curriculum_versions version
where version.version='1.1'
on conflict(curriculum_version_id,lesson_slug) do update
set title=excluded.title,content=excluded.content,status=excluded.status,display_order=excluded.display_order,updated_at=now();

-- Carry the three original foundation lessons into v1.1 so the published version is complete.
with lesson_data(subject,chapter_slug,lesson_slug,title,display_order) as (values
  ('mathematics','algebra','quadratic-roots','Reading quadratic roots',10),
  ('physics','mechanics','newtons-second-law','Force changes motion',10),
  ('chemistry','physical-chemistry','mole-concept','The mole as a counting unit',10)
)
insert into public.juniors_lessons(curriculum_version_id,subject,chapter_slug,lesson_slug,title,content,status,display_order)
select version.id,data.subject,data.chapter_slug,data.lesson_slug,data.title,
       jsonb_build_object('origin','taksh_original','review_status','published_foundation','curriculum_version','1.1'),
       'published',data.display_order
from lesson_data data cross join public.juniors_curriculum_versions version
where version.version='1.1'
on conflict(curriculum_version_id,lesson_slug) do update
set title=excluded.title,content=excluded.content,status=excluded.status,display_order=excluded.display_order,updated_at=now();

update public.juniors_curriculum_versions set status='archived' where version='1.0';

commit;
