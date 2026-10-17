-- Token de acceso persistente para la vista pública de seguimiento.
-- El token se elimina al entregar el proyecto desde la acción del dashboard.
alter table public.projects
  add column if not exists public_token text;

create unique index if not exists projects_public_token_unique
  on public.projects (public_token)
  where public_token is not null;
