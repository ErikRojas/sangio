# Estudio · Proyectos

Sistema de manejo de proyectos con vista de equipo y vista de cliente, sobre Next.js + Supabase.

## 1. Configurar variables de entorno

Copia `.env.local.example` a `.env.local` y completa con los datos de tu proyecto
(Supabase → Project Settings → API):

```
cp .env.local.example .env.local
```

## 2. Instalar dependencias

```
npm install
```

## 3. Correr el esquema en Supabase

Si aún no lo hiciste: pega el contenido de `schema.sql` (el que te compartí antes)
en el SQL Editor de tu proyecto Supabase y ejecútalo. Esto crea las tablas,
los roles y las políticas de seguridad (RLS).

## 4. Crear tu primer usuario admin

1. En Supabase → Authentication → Users, crea un usuario manualmente (tu correo + contraseña).
2. Copia su UUID.
3. En el SQL Editor, crea su perfil como admin:

```sql
insert into profiles (id, full_name, role)
values ('EL-UUID-QUE-COPIASTE', 'Tu nombre', 'admin');
```

Para crear un usuario cliente, el proceso es igual pero con `role = 'client'`
y además le asignas `client_id` (el id de la fila en `clients` que le corresponde).

## 5. Correr en local

```
npm run dev
```

Abre `http://localhost:3000/login` e inicia sesión con el usuario que creaste.

## 6. Desplegar

Como ya conectaste tu cuenta de Supabase con GitHub, el paso natural es:

1. Sube este proyecto a un repo de GitHub.
2. Conéctalo en [vercel.com](https://vercel.com) (gratis para este tamaño de proyecto).
3. Agrega las mismas variables de entorno de `.env.local` en Vercel → Project Settings → Environment Variables.
4. Cada push a `main` se despliega automáticamente.

## Notas

- El filtro de "qué ve cada cliente" no depende del código de la app — está resuelto
  con Row Level Security en la base de datos, así que aunque alguien manipule el
  frontend, Supabase bloquea igual el acceso a datos que no le corresponden.
- Los campos `tasks` (tareas internas del equipo) no se muestran en este dashboard
  todavía — están en el esquema listos para cuando quieras agregar esa vista.
