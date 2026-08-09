import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import DashboardView from "./DashboardView";

export default async function DashboardPage() {
  const supabase = createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", user.id)
    .single();

  // Gracias a RLS, esta consulta ya devuelve solo lo que el usuario
  // tiene permitido ver (todo si es admin/team, solo lo suyo si es cliente).
  const { data: projects, error } = await supabase
    .from("projects")
    .select(
      `
      id, code, name, stage, progress, due_date,
      clients ( id, name ),
      milestones ( id, title, is_done, due_date, sort_order, category, color ),
      project_updates ( id, message, author_id, is_client_visible, created_at )
    `
    )
    .order("created_at", { ascending: false });

  const isTeam = profile?.role === "admin" || profile?.role === "team";

  // La lista de clientes solo se necesita para el selector del
  // formulario de "nuevo proyecto", que solo ve el equipo.
  const { data: clients } = isTeam
    ? await supabase.from("clients").select("id, name").order("name")
    : { data: [] };

  return (
    <DashboardView
      role={profile?.role || "client"}
      fullName={profile?.full_name || user.email}
      projects={projects || []}
      clients={clients || []}
      loadError={error?.message}
    />
  );
}
