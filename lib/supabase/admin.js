import { createClient } from "@supabase/supabase-js";

// OJO: este cliente usa la "service role key", que tiene permisos totales
// y se salta RLS. NUNCA debe importarse desde un componente de cliente
// ("use client") ni exponerse al navegador. Solo se usa dentro de
// Server Actions (archivos "use server").
export function createAdminClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY,
    { auth: { autoRefreshToken: false, persistSession: false } }
  );
}
