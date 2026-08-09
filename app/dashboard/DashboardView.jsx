"use client";

import { useState, useTransition } from "react";
import { Check, ChevronRight, MessageSquare, AlertTriangle, X, Plus, Pencil, Trash2 } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import {
  toggleMilestone,
  createStudioClient,
  createProject,
  addMilestone,
  editMilestone,
  deleteMilestone,
  addUpdate,
  updateProjectStage,
  setProjectProgress,
  getClientMagicLink,
} from "./actions";

const STAGE_META = {
  brief: { label: "Brief", color: "#6C7A89" },
  diseno: { label: "Diseño", color: "#3D5A80" },
  revision: { label: "Revisión cliente", color: "#E0A458" },
  produccion: { label: "Producción", color: "#8A7CA8" },
  entregado: { label: "Entregado", color: "#588157" },
};

const stageMeta = (key) => STAGE_META[key] || STAGE_META.brief;

function RulerProgress({ value, color }) {
  const ticks = Array.from({ length: 11 });
  return (
    <div className="relative w-full h-5">
      <div className="absolute inset-x-0 top-2 h-[2px]" style={{ backgroundColor: "var(--color-line-soft)" }} />
      <div className="absolute inset-y-0 top-2 h-[2px] transition-all" style={{ width: `${value}%`, backgroundColor: color }} />
      <div className="absolute inset-x-0 top-0 flex justify-between">
        {ticks.map((_, i) => (
          <div key={i} className="w-px" style={{ height: i % 5 === 0 ? 10 : 6, backgroundColor: i * 10 <= value ? color : "var(--color-line)" }} />
        ))}
      </div>
    </div>
  );
}

function StageTab({ stage }) {
  const meta = stageMeta(stage);
  return (
    <span className="inline-flex items-center gap-1.5 text-[11px] font-mono uppercase px-2 py-1" style={{ backgroundColor: `${meta.color}1A`, color: meta.color }}>
      <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: meta.color }} />
      {meta.label}
    </span>
  );
}

function inputStyle() {
  return { borderColor: "var(--color-line)" };
}

function Modal({ title, onClose, children }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center px-4" style={{ backgroundColor: "rgba(27,31,35,0.4)" }}>
      <div className="w-full max-w-md" style={{ backgroundColor: "var(--color-paper)" }}>
        <div className="flex items-center justify-between px-6 py-4 border-b" style={{ borderColor: "var(--color-line-soft)" }}>
          <h2 className="font-display font-bold">{title}</h2>
          <button onClick={onClose}><X size={18} color="var(--color-ink-soft)" /></button>
        </div>
        <div className="px-6 py-5">{children}</div>
      </div>
    </div>
  );
}

function NewClientModal({ onClose }) {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [invite, setInvite] = useState(true);
  const [error, setError] = useState("");
  const [warning, setWarning] = useState("");
  const [isPending, startTransition] = useTransition();

  function handleSubmit(e) {
    e.preventDefault();
    setError("");
    setWarning("");
    startTransition(async () => {
      const res = await createStudioClient({ name, contactEmail: email, inviteAsClient: invite && !!email });
      if (!res.success) setError(res.message);
      else if (res.warning) setWarning(res.warning);
      else onClose();
    });
  }

  return (
    <Modal title="Nuevo cliente" onClose={onClose}>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-xs font-mono uppercase mb-1">Nombre</label>
          <input value={name} onChange={(e) => setName(e.target.value)} required className="w-full border px-3 py-2 text-sm" style={inputStyle()} />
        </div>
        <div>
          <label className="block text-xs font-mono uppercase mb-1">Correo de contacto</label>
          <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} className="w-full border px-3 py-2 text-sm" style={inputStyle()} />
        </div>
        {email && (
          <label className="flex items-center gap-1.5 text-xs" style={{ color: "var(--color-ink-soft)" }}>
            <input type="checkbox" checked={invite} onChange={(e) => setInvite(e.target.checked)} />
            crear acceso para este correo (después copias su link desde el proyecto)
          </label>
        )}
        {error && <p className="text-xs" style={{ color: "#BC4749" }}>{error}</p>}
        {warning && <p className="text-xs" style={{ color: "#E0A458" }}>{warning}</p>}
        <button disabled={isPending} type="submit" className="w-full py-2 text-sm font-mono" style={{ backgroundColor: "var(--color-ink)", color: "var(--color-paper)" }}>
          {isPending ? "Guardando..." : "Crear cliente"}
        </button>
        {warning && (
          <button type="button" onClick={onClose} className="w-full py-2 text-sm font-mono" style={{ color: "var(--color-ink-soft)" }}>
            cerrar de todas formas
          </button>
        )}
      </form>
    </Modal>
  );
}

function NewProjectModal({ clients, onClose }) {
  const [form, setForm] = useState({ code: "", name: "", clientId: clients[0]?.id || "", stage: "brief", dueDate: "" });
  const [error, setError] = useState("");
  const [isPending, startTransition] = useTransition();

  function handleSubmit(e) {
    e.preventDefault();
    setError("");
    startTransition(async () => {
      const res = await createProject(form);
      if (!res.success) setError(res.message);
      else onClose();
    });
  }

  return (
    <Modal title="Nuevo proyecto" onClose={onClose}>
      {clients.length === 0 ? (
        <p className="text-sm" style={{ color: "var(--color-ink-soft)" }}>
          Primero necesitas crear al menos un cliente.
        </p>
      ) : (
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-mono uppercase mb-1">Código (ej. PRJ-018)</label>
            <input value={form.code} onChange={(e) => setForm({ ...form, code: e.target.value })} required className="w-full border px-3 py-2 text-sm" style={inputStyle()} />
          </div>
          <div>
            <label className="block text-xs font-mono uppercase mb-1">Nombre del proyecto</label>
            <input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required className="w-full border px-3 py-2 text-sm" style={inputStyle()} />
          </div>
          <div>
            <label className="block text-xs font-mono uppercase mb-1">Cliente</label>
            <select value={form.clientId} onChange={(e) => setForm({ ...form, clientId: e.target.value })} className="w-full border px-3 py-2 text-sm" style={inputStyle()}>
              {clients.map((c) => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-xs font-mono uppercase mb-1">Etapa inicial</label>
            <select value={form.stage} onChange={(e) => setForm({ ...form, stage: e.target.value })} className="w-full border px-3 py-2 text-sm" style={inputStyle()}>
              {Object.entries(STAGE_META).map(([key, meta]) => (
                <option key={key} value={key}>{meta.label}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-xs font-mono uppercase mb-1">Fecha de entrega</label>
            <input type="date" value={form.dueDate} onChange={(e) => setForm({ ...form, dueDate: e.target.value })} className="w-full border px-3 py-2 text-sm" style={inputStyle()} />
          </div>
          {error && <p className="text-xs" style={{ color: "#BC4749" }}>{error}</p>}
          <button disabled={isPending} type="submit" className="w-full py-2 text-sm font-mono" style={{ backgroundColor: "var(--color-ink)", color: "var(--color-paper)" }}>
            {isPending ? "Guardando..." : "Crear proyecto"}
          </button>
        </form>
      )}
    </Modal>
  );
}

const MILESTONE_COLORS = ["#3D5A80", "#E0A458", "#588157", "#8A7CA8", "#BC4749", "#6C7A89"];

function CopyClientLink({ clientId }) {
  const [link, setLink] = useState("");
  const [error, setError] = useState("");
  const [copied, setCopied] = useState(false);
  const [isPending, startTransition] = useTransition();

  function handleGenerate() {
    setError("");
    setCopied(false);
    startTransition(async () => {
      const res = await getClientMagicLink(clientId);
      if (res.success) setLink(res.link);
      else setError(res.message);
    });
  }

  function handleCopy() {
    navigator.clipboard.writeText(link);
    setCopied(true);
  }

  if (link) {
    return (
      <div className="mt-2 space-y-1.5">
        <div className="text-[11px] break-all border px-2 py-1.5" style={{ borderColor: "var(--color-line)", color: "var(--color-ink-soft)" }}>
          {link}
        </div>
        <div className="flex items-center gap-3">
          <button onClick={handleCopy} className="text-xs font-mono" style={{ color: "var(--color-ink)" }}>
            {copied ? "¡copiado!" : "copiar"}
          </button>
          <span className="text-[10px]" style={{ color: "var(--color-ink-soft)" }}>
            expira en un tiempo limitado, envíalo pronto
          </span>
        </div>
      </div>
    );
  }

  return (
    <div className="mt-2">
      <button onClick={handleGenerate} disabled={isPending} className="text-xs font-mono" style={{ color: "var(--color-ink-soft)" }}>
        {isPending ? "generando..." : "copiar link de acceso del cliente"}
      </button>
      {error && <p className="text-[11px] mt-1" style={{ color: "#BC4749" }}>{error}</p>}
    </div>
  );
}

function MilestoneRow({ milestone: m, isTeam, isPending, onToggle }) {
  const [editing, setEditing] = useState(false);
  const [title, setTitle] = useState(m.title);
  const [dueDate, setDueDate] = useState(m.due_date || "");
  const [category, setCategory] = useState(m.category || "");
  const [color, setColor] = useState(m.color || MILESTONE_COLORS[0]);
  const [busy, startTransition] = useTransition();

  function handleSave(e) {
    e.preventDefault();
    startTransition(async () => {
      const res = await editMilestone({ milestoneId: m.id, title, dueDate, category, color });
      if (res.success) setEditing(false);
    });
  }

  function handleDelete() {
    if (!confirm(`¿Borrar el hito "${m.title}"? Esto no se puede deshacer.`)) return;
    startTransition(async () => {
      await deleteMilestone(m.id, m.project_id);
    });
  }

  if (editing) {
    return (
      <form onSubmit={handleSave} className="space-y-2 py-2 border-b" style={{ borderColor: "var(--color-line-soft)" }}>
        <input value={title} onChange={(e) => setTitle(e.target.value)} required className="w-full border px-2 py-1.5 text-sm" style={inputStyle()} />
        <input
          value={category}
          onChange={(e) => setCategory(e.target.value)}
          placeholder="Categoría"
          className="w-full border px-2 py-1.5 text-sm"
          style={inputStyle()}
        />
        <div className="flex items-center gap-2">
          {MILESTONE_COLORS.map((c) => (
            <button
              type="button"
              key={c}
              onClick={() => setColor(c)}
              className="w-5 h-5 rounded-full flex-shrink-0"
              style={{ backgroundColor: c, outline: color === c ? `2px solid ${c}` : "none", outlineOffset: "2px" }}
            />
          ))}
        </div>
        <div className="flex gap-2">
          <input type="date" value={dueDate} onChange={(e) => setDueDate(e.target.value)} className="flex-1 border px-2 py-1.5 text-xs" style={inputStyle()} />
          <button disabled={busy} type="submit" className="px-3 text-xs font-mono" style={{ backgroundColor: "var(--color-ink)", color: "var(--color-paper)" }}>
            guardar
          </button>
          <button type="button" onClick={() => setEditing(false)} className="px-3 text-xs font-mono" style={{ color: "var(--color-ink-soft)" }}>
            cancelar
          </button>
        </div>
      </form>
    );
  }

  return (
    <div className="w-full flex items-center gap-3 group">
      <button
        disabled={!isTeam || isPending}
        onClick={() => onToggle(m.id, m.is_done)}
        className="flex items-center justify-center w-5 h-5 rounded-full border-2 flex-shrink-0"
        style={{ borderColor: m.color || "var(--color-line)", backgroundColor: m.is_done ? (m.color || "var(--color-line)") : "transparent" }}
      >
        {m.is_done && <Check size={12} color="white" />}
      </button>
      <span className="flex-1 text-left">
        <span className="block text-sm" style={{ color: m.is_done ? "var(--color-ink-soft)" : "var(--color-ink)", textDecoration: m.is_done ? "line-through" : "none" }}>
          {m.title}
        </span>
        {m.category && (
          <span className="text-[10px] font-mono uppercase" style={{ color: m.color || "var(--color-ink-soft)" }}>
            {m.category}
          </span>
        )}
      </span>
      <span className="text-xs font-mono" style={{ color: "var(--color-ink-soft)" }}>{m.due_date}</span>
      {isTeam && (
        <div className="flex items-center gap-1.5 opacity-0 group-hover:opacity-100 transition-opacity">
          <button onClick={() => setEditing(true)}><Pencil size={13} color="var(--color-ink-soft)" /></button>
          <button onClick={handleDelete}><Trash2 size={13} color="#BC4749" /></button>
        </div>
      )}
    </div>
  );
}

function AddMilestoneForm({ projectId }) {
  const [title, setTitle] = useState("");
  const [dueDate, setDueDate] = useState("");
  const [category, setCategory] = useState("");
  const [color, setColor] = useState(MILESTONE_COLORS[0]);
  const [open, setOpen] = useState(false);
  const [isPending, startTransition] = useTransition();

  function handleSubmit(e) {
    e.preventDefault();
    startTransition(async () => {
      const res = await addMilestone({ projectId, title, dueDate, category, color });
      if (res.success) {
        setTitle("");
        setDueDate("");
        setCategory("");
        setColor(MILESTONE_COLORS[0]);
        setOpen(false);
      }
    });
  }

  if (!open) {
    return (
      <button onClick={() => setOpen(true)} className="flex items-center gap-1.5 text-xs font-mono mt-3" style={{ color: "var(--color-ink-soft)" }}>
        <Plus size={12} /> agregar hito
      </button>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="mt-3 space-y-2">
      <input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Título del hito" required className="w-full border px-2 py-1.5 text-sm" style={inputStyle()} />
      <input
        value={category}
        onChange={(e) => setCategory(e.target.value)}
        placeholder="Categoría (ej. Diseño, Aprobación, Producción)"
        list="milestone-categories"
        className="w-full border px-2 py-1.5 text-sm"
        style={inputStyle()}
      />
      <datalist id="milestone-categories">
        <option value="Diseño" />
        <option value="Aprobación cliente" />
        <option value="Producción" />
        <option value="Contenido" />
        <option value="Entrega" />
      </datalist>
      <div className="flex items-center gap-2">
        {MILESTONE_COLORS.map((c) => (
          <button
            type="button"
            key={c}
            onClick={() => setColor(c)}
            className="w-5 h-5 rounded-full flex-shrink-0"
            style={{ backgroundColor: c, outline: color === c ? `2px solid ${c}` : "none", outlineOffset: "2px" }}
          />
        ))}
      </div>
      <div className="flex gap-2">
        <input type="date" value={dueDate} onChange={(e) => setDueDate(e.target.value)} className="flex-1 border px-2 py-1.5 text-xs" style={inputStyle()} />
        <button disabled={isPending} type="submit" className="px-3 text-xs font-mono" style={{ backgroundColor: "var(--color-ink)", color: "var(--color-paper)" }}>
          agregar
        </button>
      </div>
    </form>
  );
}

function AddUpdateForm({ projectId }) {
  const [message, setMessage] = useState("");
  const [visible, setVisible] = useState(true);
  const [isPending, startTransition] = useTransition();

  function handleSubmit(e) {
    e.preventDefault();
    startTransition(async () => {
      const res = await addUpdate({ projectId, message, isClientVisible: visible });
      if (res.success) setMessage("");
    });
  }

  return (
    <form onSubmit={handleSubmit} className="mb-4 space-y-2">
      <textarea
        value={message}
        onChange={(e) => setMessage(e.target.value)}
        placeholder="Escribe una actualización de avance..."
        required
        rows={2}
        className="w-full border px-2 py-1.5 text-sm"
        style={inputStyle()}
      />
      <div className="flex items-center justify-between">
        <label className="flex items-center gap-1.5 text-xs" style={{ color: "var(--color-ink-soft)" }}>
          <input type="checkbox" checked={visible} onChange={(e) => setVisible(e.target.checked)} />
          visible para el cliente
        </label>
        <button disabled={isPending} type="submit" className="px-3 py-1 text-xs font-mono" style={{ backgroundColor: "var(--color-ink)", color: "var(--color-paper)" }}>
          publicar
        </button>
      </div>
    </form>
  );
}

export default function DashboardView({ role, fullName, projects, clients, loadError }) {
  const [selectedId, setSelectedId] = useState(projects[0]?.id ?? null);
  const [isPending, startTransition] = useTransition();
  const [showClientModal, setShowClientModal] = useState(false);
  const [showProjectModal, setShowProjectModal] = useState(false);
  const isTeam = role === "admin" || role === "team";
  const selected = projects.find((p) => p.id === selectedId);
  const supabase = createClient();

  function handleLogout() {
    supabase.auth.signOut().then(() => window.location.assign("/login"));
  }

  function handleToggle(milestoneId, currentlyDone) {
    startTransition(async () => {
      await toggleMilestone(milestoneId, !currentlyDone, selected?.id);
    });
  }

  function handleStageChange(stage) {
    startTransition(async () => {
      await updateProjectStage(selected.id, stage);
    });
  }

  function handleProgressChange(value) {
    startTransition(async () => {
      await setProjectProgress(selected.id, value);
    });
  }

  if (loadError) {
    return <div className="p-6 text-sm" style={{ color: "#BC4749" }}>Error cargando proyectos: {loadError}</div>;
  }

  return (
    <div className="min-h-screen flex flex-col">
      <div className="flex items-center justify-between px-6 py-4 border-b" style={{ borderColor: "var(--color-line)" }}>
        <div>
          <div className="font-display text-lg font-bold">Estudio · Proyectos</div>
          <div className="text-xs" style={{ color: "var(--color-ink-soft)" }}>
            {fullName} · {isTeam ? "equipo" : "cliente"}
          </div>
        </div>
        <div className="flex items-center gap-4">
          {isTeam && (
            <>
              <button onClick={() => setShowClientModal(true)} className="text-xs font-mono">+ cliente</button>
              <button onClick={() => setShowProjectModal(true)} className="text-xs font-mono">+ proyecto</button>
            </>
          )}
          <button onClick={handleLogout} className="text-xs font-mono" style={{ color: "var(--color-ink-soft)" }}>
            cerrar sesión
          </button>
        </div>
      </div>

      <div className="flex flex-1 min-h-0">
        <div className="flex-1 overflow-y-auto">
          {projects.length === 0 && (
            <div className="p-6 text-sm" style={{ color: "var(--color-ink-soft)" }}>
              Todavía no hay proyectos para mostrar aquí.
            </div>
          )}
          {projects.map((p) => {
            const meta = stageMeta(p.stage);
            const isOverdue = p.due_date && new Date(p.due_date) < new Date() && p.stage !== "entregado";
            return (
              <button
                key={p.id}
                onClick={() => setSelectedId(p.id)}
                className="w-full text-left grid grid-cols-[4px_1fr]"
                style={{ backgroundColor: selectedId === p.id ? "var(--color-paper-soft)" : "transparent" }}
              >
                <div style={{ backgroundColor: meta.color }} />
                <div className="grid grid-cols-12 gap-3 items-center px-4 py-4 border-b" style={{ borderColor: "var(--color-line-soft)" }}>
                  <div className="col-span-12 md:col-span-2 text-xs font-mono" style={{ color: "var(--color-ink-soft)" }}>{p.code}</div>
                  <div className="col-span-12 md:col-span-3">
                    <div className="font-display font-semibold">{p.name}</div>
                    <div className="text-xs" style={{ color: "var(--color-ink-soft)" }}>{p.clients?.name}</div>
                  </div>
                  <div className="col-span-6 md:col-span-2"><StageTab stage={p.stage} /></div>
                  <div className="col-span-6 md:col-span-3"><RulerProgress value={p.progress} color={meta.color} /></div>
                  <div className="col-span-10 md:col-span-1 text-xs font-mono flex items-center gap-1" style={{ color: isOverdue ? "#BC4749" : "var(--color-ink-soft)" }}>
                    {isOverdue && <AlertTriangle size={12} />}
                    {p.due_date}
                  </div>
                  <div className="col-span-2 md:col-span-1 flex justify-end">
                    <ChevronRight size={16} color="var(--color-ink-soft)" />
                  </div>
                </div>
              </button>
            );
          })}
        </div>

        {selected && (
          <div className="w-[380px] flex-shrink-0 hidden lg:flex flex-col border-l" style={{ borderColor: "var(--color-line)" }}>
            <div className="px-6 py-5 border-b flex items-start justify-between" style={{ borderColor: "var(--color-line-soft)" }}>
              <div>
                <div className="text-xs font-mono mb-1" style={{ color: "var(--color-ink-soft)" }}>{selected.code} · {selected.clients?.name}</div>
                {isTeam && <CopyClientLink clientId={selected.clients?.id} />}
                <div className="font-display text-xl font-bold">{selected.name}</div>
                <div className="mt-2">
                  {isTeam ? (
                    <select
                      value={selected.stage}
                      onChange={(e) => handleStageChange(e.target.value)}
                      className="text-[11px] font-mono uppercase px-2 py-1 border"
                      style={{ borderColor: stageMeta(selected.stage).color, color: stageMeta(selected.stage).color, backgroundColor: `${stageMeta(selected.stage).color}1A` }}
                    >
                      {Object.entries(STAGE_META).map(([key, meta]) => (
                        <option key={key} value={key}>{meta.label}</option>
                      ))}
                    </select>
                  ) : (
                    <StageTab stage={selected.stage} />
                  )}
                </div>
              </div>
              <button onClick={() => setSelectedId(null)}><X size={18} color="var(--color-ink-soft)" /></button>
            </div>

            <div className="px-6 py-5 border-b" style={{ borderColor: "var(--color-line-soft)" }}>
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-mono uppercase" style={{ color: "var(--color-ink-soft)" }}>Avance</span>
                <span className="text-xs font-mono" style={{ color: stageMeta(selected.stage).color }}>{selected.progress}%</span>
              </div>
              <RulerProgress value={selected.progress} color={stageMeta(selected.stage).color} />
              {isTeam && (
                <input
                  type="range"
                  min="0"
                  max="100"
                  step="5"
                  value={selected.progress}
                  onChange={(e) => handleProgressChange(e.target.value)}
                  className="w-full mt-3"
                />
              )}
              {isTeam && (selected.milestones || []).length > 0 && (
                <p className="text-[11px] mt-1" style={{ color: "var(--color-ink-soft)" }}>
                  Se recalcula solo al marcar hitos. Muévelo a mano si quieres ajustarlo.
                </p>
              )}
            </div>

            <div className="px-6 py-5 border-b" style={{ borderColor: "var(--color-line-soft)" }}>
              <div className="text-xs font-mono uppercase mb-3" style={{ color: "var(--color-ink-soft)" }}>Hitos</div>
              <div className="space-y-3">
                {[...(selected.milestones || [])]
                  .sort((a, b) => a.sort_order - b.sort_order)
                  .map((m) => (
                    <MilestoneRow
                      key={m.id}
                      milestone={{ ...m, project_id: selected.id }}
                      isTeam={isTeam}
                      isPending={isPending}
                      onToggle={handleToggle}
                    />
                  ))}
              </div>
              {isTeam && <AddMilestoneForm projectId={selected.id} />}
            </div>

            <div className="px-6 py-5 flex-1 overflow-y-auto">
              <div className="text-xs font-mono uppercase mb-3 flex items-center gap-2" style={{ color: "var(--color-ink-soft)" }}>
                <MessageSquare size={12} /> Bitácora
              </div>
              {isTeam && <AddUpdateForm projectId={selected.id} />}
              {(selected.project_updates || [])
                .filter((u) => isTeam || u.is_client_visible)
                .map((u) => (
                  <div key={u.id} className="text-sm mb-4">
                    <div className="flex items-center gap-2 mb-1 text-xs font-mono" style={{ color: "var(--color-ink-soft)" }}>
                      {new Date(u.created_at).toLocaleDateString("es-ES")}
                      {isTeam && !u.is_client_visible && (
                        <span className="px-1.5 py-0.5" style={{ backgroundColor: "var(--color-line-soft)" }}>solo equipo</span>
                      )}
                    </div>
                    <div style={{ color: "var(--color-ink-soft)" }}>{u.message}</div>
                  </div>
                ))}
            </div>
          </div>
        )}
      </div>

      {showClientModal && <NewClientModal onClose={() => setShowClientModal(false)} />}
      {showProjectModal && <NewProjectModal clients={clients} onClose={() => setShowProjectModal(false)} />}
    </div>
  );
}
