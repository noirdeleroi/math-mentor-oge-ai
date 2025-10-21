-- Create rus_essay_topics table
create table public.rus_essay_topics (
  id uuid primary key default gen_random_uuid(),
  subject text not null,
  essay_topic text not null,
  rules text
);

-- Create student_essay table
create table public.student_essay (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  essay_topic_id uuid not null references public.rus_essay_topics (id) on delete restrict,
  text_scan text,
  analysis text,
  score integer,
  created_at timestamp with time zone not null default now()
);

-- Create index for performance
create index on public.student_essay (user_id, created_at desc);

-- Insert some sample topics
insert into public.rus_essay_topics (subject, essay_topic, rules) values
('ege', 'Проблема влияния искусства на человека', 'Рассмотрите проблему влияния искусства на человека. В своём сочинении приведите не менее двух аргументов, подтверждающих вашу точку зрения.'),
('ege', 'Проблема роли детства в жизни человека', 'Рассмотрите проблему роли детства в жизни человека. В своём сочинении приведите не менее двух аргументов, подтверждающих вашу точку зрения.'),
('ege', 'Проблема выбора жизненного пути', 'Рассмотрите проблему выбора жизненного пути. В своём сочинении приведите не менее двух аргументов, подтверждающих вашу точку зрения.'),
('ege', 'Проблема отношения к природе', 'Рассмотрите проблему отношения к природе. В своём сочинении приведите не менее двух аргументов, подтверждающих вашу точку зрения.'),
('ege', 'Проблема роли книги в жизни человека', 'Рассмотрите проблему роли книги в жизни человека. В своём сочинении приведите не менее двух аргументов, подтверждающих вашу точку зрения.');

-- RLS policies (commented out - enable if needed)
-- alter table public.rus_essay_topics enable row level security;
-- alter table public.student_essay enable row level security;

-- Policy for rus_essay_topics (read access for all authenticated users)
-- create policy "Allow read access to all users" on public.rus_essay_topics
--   for select using (auth.role() = 'authenticated');

-- Policy for student_essay (users can only access their own essays)
-- create policy "Users can access own essays" on public.student_essay
--   for all using (auth.uid() = user_id);
