import { notFound } from "next/navigation";
import { createAdminClient } from "@/lib/supabase/admin";

export const dynamic = "force-dynamic";
export const revalidate = 0;

const STAGE_LABELS = {
  brief: "Brief",
  diseno: "Diseño",
  revision: "Revisión cliente",
  produccion: "Producción",
};

export default async function ProjectTrackingPage({ params }) {
  const { token } = await params;

  // La clave service-role solo se usa en servidor. La consulta devuelve
  // únicamente los campos que esta página pública necesita mostrar.
  const supabase = createAdminClient();
  const { data: project, error } = await supabase
    .from("projects")
    .select(`
      id, code, name, stage, progress, due_date,
      milestones ( id, title, is_done, due_date, sort_order ),
      project_updates ( id, message, is_client_visible, created_at )
    `)
    .eq("public_token", token)
    .maybeSingle();

  if (error || !project || project.stage === "entregado") notFound();

  const milestones = [...(project.milestones || [])].sort(
    (a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0)
  );
  const updates = (project.project_updates || [])
    .filter((update) => update.is_client_visible)
    .sort((a, b) => new Date(b.created_at) - new Date(a.created_at));

  const progress = Math.max(0, Math.min(100, Number(project.progress) || 0));
  const dateLabel = (value) =>
    value
      ? new Date(`${value}T00:00:00`).toLocaleDateString("es-BO", {
          day: "numeric",
          month: "long",
          year: "numeric",
        })
      : null;

  return (
    <main className="min-h-screen px-5 py-10" style={{ background: "var(--color-paper)", color: "var(--color-ink)" }}>
      <div className="mx-auto max-w-2xl space-y-6">
        <header className="space-y-2">
          <p className="text-xs uppercase tracking-[0.2em]" style={{ color: "var(--color-ink-soft)" }}>Seguimiento de proyecto</p>
          <h1 className="text-3xl font-semibold">{project.name}</h1>
          <p className="text-sm" style={{ color: "var(--color-ink-soft)" }}>Proyecto {project.code}</p>
        </header>

        <section className="border p-5 space-y-4" style={{ borderColor: "var(--color-line)", background: "var(--color-card, transparent)" }}>
          <div className="flex items-center justify-between gap-4">
            <h2 className="font-medium">Estado actual</h2>
            <span className="text-sm px-3 py-1 rounded-full border" style={{ borderColor: "var(--color-line)" }}>
              {STAGE_LABELS[project.stage] || "En progreso"}
            </span>
          </div>
          <div className="flex items-end justify-between">
            <span className="text-sm" style={{ color: "var(--color-ink-soft)" }}>Avance general</span>
            <strong className="text-2xl tabular-nums">{progress}%</strong>
          </div>
          <div className="h-2 w-full overflow-hidden rounded-full" style={{ background: "var(--color-line-soft, #e5e5e5)" }}>
            <div className="h-full rounded-full" style={{ width: `${progress}%`, background: "var(--color-accent, #3D5A80)" }} />
          </div>
          {project.due_date && <p className="text-sm" style={{ color: "var(--color-ink-soft)" }}>Fecha estimada: {dateLabel(project.due_date)}</p>}
        </section>

        {milestones.length > 0 && (
          <section className="border p-5 space-y-4" style={{ borderColor: "var(--color-line)" }}>
            <h2 className="font-medium">Etapas del proyecto</h2>
            <ul className="space-y-3">
              {milestones.map((milestone) => (
                <li key={milestone.id} className="flex items-start gap-3 text-sm">
                  <span aria-hidden="true" className="mt-0.5 inline-flex h-5 w-5 items-center justify-center rounded-full border" style={{ borderColor: milestone.is_done ? "#588157" : "var(--color-line)", color: milestone.is_done ? "#588157" : "var(--color-ink-soft)" }}>
                    {milestone.is_done ? "✓" : "·"}
                  </span>
                  <div className="min-w-0 flex-1">
                    <p>{milestone.title}</p>
                    {milestone.due_date && <p className="mt-1 text-xs" style={{ color: "var(--color-ink-soft)" }}>Fecha: {dateLabel(milestone.due_date)}</p>}
                  </div>
                  <span className="text-xs" style={{ color: "var(--color-ink-soft)" }}>{milestone.is_done ? "Completado" : "Pendiente"}</span>
                </li>
              ))}
            </ul>
          </section>
        )}

        {updates.length > 0 && (
          <section className="border p-5 space-y-4" style={{ borderColor: "var(--color-line)" }}>
            <h2 className="font-medium">Actualizaciones</h2>
            <ul className="space-y-4">
              {updates.map((update) => (
                <li key={update.id} className="border-b pb-4 last:border-b-0 last:pb-0" style={{ borderColor: "var(--color-line)" }}>
                  <p className="text-xs mb-2" style={{ color: "var(--color-ink-soft)" }}>
                    {new Date(update.created_at).toLocaleDateString("es-BO", { day: "numeric", month: "long", year: "numeric" })}
                  </p>
                  <p className="text-sm whitespace-pre-wrap">{update.message}</p>
                </li>
              ))}
            </ul>
          </section>
        )}

        <footer className="text-xs" style={{ color: "var(--color-ink-soft)" }}>
          Esta página se actualiza al volver a abrirla. El enlace se desactiva cuando el proyecto se marca como entregado.
        </footer>
      </div>
    </main>
  );
}
