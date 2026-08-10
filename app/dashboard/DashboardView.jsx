"use client";

import { useState, useTransition, useEffect } from "react";
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
  createTask,
  updateTaskStatus,
  deleteTask,
  inviteTeamMember,
  getTeamMemberMagicLink,
  updateProject,
  deleteProject,
  updateClient,
  deleteClient,
  editUpdate,
  deleteUpdate,
  addProjectMember,
  removeProjectMember,
  duplicateProject,
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

// Paleta deliberadamente distinta a la de las etapas (STAGE_META) —
// así un vistazo rápido distingue "esto es la etapa del proyecto"
// de "esto es la categoría del hito".
const MILESTONE_COLORS = ["#B5563C", "#2F6F76", "#A98237", "#6B4E71", "#B0637A", "#7A7F3E"];

function GenerateTeamLinkModal({ onClose }) {
  const [email, setEmail] = useState("");
  const [link, setLink] = useState("");
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState("");
  const [isPending, startTransition] = useTransition();

  function handleSubmit(e) {
    e.preventDefault();
    setError("");
    setLink("");
    startTransition(async () => {
      const res = await getTeamMemberMagicLink(email);
      if (res.success) setLink(res.link);
      else setError(res.message);
    });
  }

  function handleCopy() {
    navigator.clipboard.writeText(link);
    setCopied(true);
  }

  return (
    <Modal title="Generar link de acceso" onClose={onClose}>
      {link ? (
        <div className="space-y-3">
          <div className="text-[11px] break-all border px-2 py-1.5" style={{ borderColor: "var(--color-line)", color: "var(--color-ink-soft)" }}>
            {link}
          </div>
          <div className="flex items-center gap-3">
            <button onClick={handleCopy} className="text-xs font-mono">{copied ? "¡copiado!" : "copiar"}</button>
            <span className="text-[10px]" style={{ color: "var(--color-ink-soft)" }}>expira en un tiempo limitado</span>
          </div>
          <button onClick={onClose} className="w-full py-2 text-sm font-mono" style={{ backgroundColor: "var(--color-ink)", color: "var(--color-paper)" }}>
            listo
          </button>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="space-y-4">
          <p className="text-sm" style={{ color: "var(--color-ink-soft)" }}>
            Para alguien de tu equipo que ya tiene cuenta creada pero necesita un link nuevo para entrar (o para poner su contraseña por primera vez).
          </p>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            placeholder="correo@ejemplo.com"
            className="w-full border px-3 py-2 text-sm"
            style={inputStyle()}
          />
          {error && <p className="text-xs" style={{ color: "#BC4749" }}>{error}</p>}
          <button disabled={isPending} type="submit" className="w-full py-2 text-sm font-mono" style={{ backgroundColor: "var(--color-ink)", color: "var(--color-paper)" }}>
            {isPending ? "Generando..." : "Generar link"}
          </button>
        </form>
      )}
    </Modal>
  );
}

function ChangePasswordModal({ onClose }) {
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");

    if (password.length < 6) {
      setError("La contraseña debe tener al menos 6 caracteres.");
      return;
    }
    if (password !== confirm) {
      setError("Las contraseñas no coinciden.");
      return;
    }

    setLoading(true);
    const supabase = createClient();
    const { error } = await supabase.auth.updateUser({ password });
    setLoading(false);

    if (error) {
      setError(error.message);
      return;
    }
    setSuccess(true);
  }

  return (
    <Modal title="Cambiar contraseña" onClose={onClose}>
      {success ? (
        <div className="space-y-3">
          <p className="text-sm">Listo, tu contraseña quedó actualizada. La próxima vez puedes entrar con correo y contraseña directamente.</p>
          <button onClick={onClose} className="w-full py-2 text-sm font-mono" style={{ backgroundColor: "var(--color-ink)", color: "var(--color-paper)" }}>
            listo
          </button>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-mono uppercase mb-1">Nueva contraseña</label>
            <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} required className="w-full border px-3 py-2 text-sm" style={inputStyle()} />
          </div>
          <div>
            <label className="block text-xs font-mono uppercase mb-1">Repetir contraseña</label>
            <input type="password" value={confirm} onChange={(e) => setConfirm(e.target.value)} required className="w-full border px-3 py-2 text-sm" style={inputStyle()} />
          </div>
          {error && <p className="text-xs" style={{ color: "#BC4749" }}>{error}</p>}
          <button disabled={loading} type="submit" className="w-full py-2 text-sm font-mono" style={{ backgroundColor: "var(--color-ink)", color: "var(--color-paper)" }}>
            {loading ? "Guardando..." : "Guardar contraseña"}
          </button>
        </form>
      )}
    </Modal>
  );
}

function NewTeamMemberModal({ onClose }) {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [role, setRole] = useState("team");
  const [error, setError] = useState("");
  const [link, setLink] = useState("");
  const [copied, setCopied] = useState(false);
  const [isPending, startTransition] = useTransition();

  function handleSubmit(e) {
    e.preventDefault();
    setError("");
    startTransition(async () => {
      const res = await inviteTeamMember({ email, fullName: name, role });
      if (!res.success) {
        setError(res.message);
        return;
      }
      const linkRes = await getTeamMemberMagicLink(email);
      if (linkRes.success) setLink(linkRes.link);
      else setError(linkRes.message);
    });
  }

  function handleCopy() {
    navigator.clipboard.writeText(link);
    setCopied(true);
  }

  return (
    <Modal title="Nuevo miembro de equipo" onClose={onClose}>
      {link ? (
        <div className="space-y-3">
          <p className="text-sm">Cuenta creada. Copia este link y mándaselo para que entre por primera vez:</p>
          <div className="text-[11px] break-all border px-2 py-1.5" style={{ borderColor: "var(--color-line)", color: "var(--color-ink-soft)" }}>
            {link}
          </div>
          <div className="flex items-center gap-3">
            <button onClick={handleCopy} className="text-xs font-mono">{copied ? "¡copiado!" : "copiar"}</button>
            <span className="text-[10px]" style={{ color: "var(--color-ink-soft)" }}>expira en un tiempo limitado</span>
          </div>
          <button onClick={onClose} className="w-full py-2 text-sm font-mono" style={{ backgroundColor: "var(--color-ink)", color: "var(--color-paper)" }}>
            listo
          </button>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-mono uppercase mb-1">Nombre</label>
            <input value={name} onChange={(e) => setName(e.target.value)} required className="w-full border px-3 py-2 text-sm" style={inputStyle()} />
          </div>
          <div>
            <label className="block text-xs font-mono uppercase mb-1">Correo</label>
            <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required className="w-full border px-3 py-2 text-sm" style={inputStyle()} />
          </div>
          <div>
            <label className="block text-xs font-mono uppercase mb-1">Rol</label>
            <select value={role} onChange={(e) => setRole(e.target.value)} className="w-full border px-3 py-2 text-sm" style={inputStyle()}>
              <option value="team">Equipo</option>
              <option value="admin">Admin</option>
            </select>
          </div>
          {error && <p className="text-xs" style={{ color: "#BC4749" }}>{error}</p>}
          <button disabled={isPending} type="submit" className="w-full py-2 text-sm font-mono" style={{ backgroundColor: "var(--color-ink)", color: "var(--color-paper)" }}>
            {isPending ? "Creando..." : "Crear cuenta"}
          </button>
        </form>
      )}
    </Modal>
  );
}

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

const TASK_STATUS_META = {
  pendiente: { label: "Pendiente", color: "#6C7A89" },
  en_progreso: { label: "En progreso", color: "#2F6F76" },
  hecho: { label: "Hecho", color: "#588157" },
};
const TASK_STATUS_ORDER = ["pendiente", "en_progreso", "hecho"];

function TaskRow({ task: t }) {
  const [busy, startTransition] = useTransition();
  const meta = TASK_STATUS_META[t.status] || TASK_STATUS_META.pendiente;

  function handleCycle() {
    const next = TASK_STATUS_ORDER[(TASK_STATUS_ORDER.indexOf(t.status) + 1) % TASK_STATUS_ORDER.length];
    startTransition(async () => {
      await updateTaskStatus(t.id, next);
    });
  }

  function handleDelete() {
    if (!confirm(`¿Borrar la tarea "${t.title}"?`)) return;
    startTransition(async () => {
      await deleteTask(t.id);
    });
  }

  return (
    <div className="py-2 border-b group" style={{ borderColor: "var(--color-line-soft)" }}>
      <div className="flex items-start gap-2">
        <button
          disabled={busy}
          onClick={handleCycle}
          className="text-[10px] font-mono uppercase px-2 py-0.5 flex-shrink-0 mt-0.5"
          style={{ backgroundColor: `${meta.color}1A`, color: meta.color }}
          title="Clic para cambiar el estado"
        >
          {meta.label}
        </button>
        <span className="flex-1 text-sm break-words" style={{ color: "var(--color-ink)" }}>{t.title}</span>
        <button onClick={handleDelete} className="opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0 mt-0.5">
          <Trash2 size={12} color="#BC4749" />
        </button>
      </div>
      {(t.assignee?.full_name || t.due_date) && (
        <div className="flex items-center gap-3 mt-1 pl-1">
          {t.assignee?.full_name && (
            <span className="text-[11px]" style={{ color: "var(--color-ink-soft)" }}>{t.assignee.full_name}</span>
          )}
          {t.due_date && (
            <span className="text-[11px] font-mono" style={{ color: "var(--color-ink-soft)" }}>{t.due_date}</span>
          )}
        </div>
      )}
    </div>
  );
}

function AddTaskForm({ projectId, teamMembers }) {
  const [title, setTitle] = useState("");
  const [assignedTo, setAssignedTo] = useState("");
  const [dueDate, setDueDate] = useState("");
  const [open, setOpen] = useState(false);
  const [isPending, startTransition] = useTransition();

  function handleSubmit(e) {
    e.preventDefault();
    startTransition(async () => {
      const res = await createTask({ projectId, title, assignedTo: assignedTo || null, dueDate });
      if (res.success) {
        setTitle("");
        setAssignedTo("");
        setDueDate("");
        setOpen(false);
      }
    });
  }

  if (!open) {
    return (
      <button onClick={() => setOpen(true)} className="flex items-center gap-1.5 text-xs font-mono mt-2" style={{ color: "var(--color-ink-soft)" }}>
        <Plus size={12} /> agregar tarea
      </button>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="mt-2 space-y-2">
      <input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Título de la tarea" required className="w-full border px-2 py-1.5 text-sm" style={inputStyle()} />
      <div className="flex gap-2">
        <select value={assignedTo} onChange={(e) => setAssignedTo(e.target.value)} className="flex-1 border px-2 py-1.5 text-xs" style={inputStyle()}>
          <option value="">Sin asignar</option>
          {teamMembers.map((m) => (
            <option key={m.id} value={m.id}>{m.full_name}</option>
          ))}
        </select>
        <input type="date" value={dueDate} onChange={(e) => setDueDate(e.target.value)} className="border px-2 py-1.5 text-xs" style={inputStyle()} />
        <button disabled={isPending} type="submit" className="px-3 text-xs font-mono" style={{ backgroundColor: "var(--color-ink)", color: "var(--color-paper)" }}>
          agregar
        </button>
      </div>
    </form>
  );
}

function UpdateRow({ update: u, isTeam }) {
  const [editing, setEditing] = useState(false);
  const [message, setMessage] = useState(u.message);
  const [visible, setVisible] = useState(u.is_client_visible);
  const [isPending, startTransition] = useTransition();

  function handleSave(e) {
    e.preventDefault();
    startTransition(async () => {
      const res = await editUpdate({ updateId: u.id, message, isClientVisible: visible });
      if (res.success) setEditing(false);
    });
  }

  function handleDelete() {
    if (!confirm("¿Borrar esta nota de la bitácora?")) return;
    startTransition(async () => {
      await deleteUpdate(u.id);
    });
  }

  if (editing) {
    return (
      <form onSubmit={handleSave} className="mb-4 space-y-2">
        <textarea value={message} onChange={(e) => setMessage(e.target.value)} rows={2} className="w-full border px-2 py-1.5 text-sm" style={inputStyle()} />
        <label className="flex items-center gap-1.5 text-xs" style={{ color: "var(--color-ink-soft)" }}>
          <input type="checkbox" checked={visible} onChange={(e) => setVisible(e.target.checked)} />
          visible para el cliente
        </label>
        <div className="flex gap-2">
          <button disabled={isPending} type="submit" className="text-xs font-mono px-3 py-1" style={{ backgroundColor: "var(--color-ink)", color: "var(--color-paper)" }}>
            guardar
          </button>
          <button type="button" onClick={() => setEditing(false)} className="text-xs font-mono" style={{ color: "var(--color-ink-soft)" }}>
            cancelar
          </button>
        </div>
      </form>
    );
  }

  return (
    <div className="text-sm mb-4 group">
      <div className="flex items-center gap-2 mb-1 text-xs font-mono" style={{ color: "var(--color-ink-soft)" }}>
        {new Date(u.created_at).toLocaleDateString("es-ES")}
        {isTeam && !u.is_client_visible && (
          <span className="px-1.5 py-0.5" style={{ backgroundColor: "var(--color-line-soft)" }}>solo equipo</span>
        )}
        {isTeam && (
          <span className="ml-auto flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
            <button onClick={() => setEditing(true)}><Pencil size={11} color="var(--color-ink-soft)" /></button>
            <button onClick={handleDelete}><Trash2 size={11} color="#BC4749" /></button>
          </span>
        )}
      </div>
      <div style={{ color: "var(--color-ink-soft)" }}>{u.message}</div>
    </div>
  );
}

function ProjectTeamSection({ project, teamMembers }) {
  const [adding, setAdding] = useState(false);
  const [pickId, setPickId] = useState("");
  const [isPending, startTransition] = useTransition();

  const assignedIds = new Set((project.project_members || []).map((m) => m.profile_id));
  const available = teamMembers.filter((m) => !assignedIds.has(m.id));

  function handleAdd(e) {
    e.preventDefault();
    if (!pickId) return;
    startTransition(async () => {
      await addProjectMember(project.id, pickId);
      setPickId("");
      setAdding(false);
    });
  }

  function handleRemove(memberRowId) {
    startTransition(async () => {
      await removeProjectMember(memberRowId);
    });
  }

  return (
    <div className="px-6 py-5 border-b" style={{ borderColor: "var(--color-line-soft)" }}>
      <div className="text-xs font-mono uppercase mb-3" style={{ color: "var(--color-ink-soft)" }}>Equipo asignado</div>
      <div className="flex flex-wrap gap-2 mb-2">
        {(project.project_members || []).length === 0 && (
          <p className="text-xs" style={{ color: "var(--color-ink-soft)" }}>Nadie asignado todavía.</p>
        )}
        {(project.project_members || []).map((m) => (
          <span key={m.id} className="text-xs px-2 py-1 flex items-center gap-1.5" style={{ backgroundColor: "var(--color-paper-soft)" }}>
            {m.profiles?.full_name || "—"}
            <button disabled={isPending} onClick={() => handleRemove(m.id)}><X size={11} color="var(--color-ink-soft)" /></button>
          </span>
        ))}
      </div>
      {adding ? (
        <form onSubmit={handleAdd} className="flex gap-2">
          <select value={pickId} onChange={(e) => setPickId(e.target.value)} className="flex-1 border px-2 py-1.5 text-xs" style={inputStyle()}>
            <option value="">Elegir...</option>
            {available.map((m) => (
              <option key={m.id} value={m.id}>{m.full_name}</option>
            ))}
          </select>
          <button disabled={isPending} type="submit" className="px-3 text-xs font-mono" style={{ backgroundColor: "var(--color-ink)", color: "var(--color-paper)" }}>
            agregar
          </button>
        </form>
      ) : (
        available.length > 0 && (
          <button onClick={() => setAdding(true)} className="flex items-center gap-1.5 text-xs font-mono" style={{ color: "var(--color-ink-soft)" }}>
            <Plus size={12} /> agregar al equipo
          </button>
        )
      )}
    </div>
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

function EditProjectForm({ project, clients, onDone }) {
  const [code, setCode] = useState(project.code);
  const [name, setName] = useState(project.name);
  const [clientId, setClientId] = useState(project.clients?.id || "");
  const [dueDate, setDueDate] = useState(project.due_date || "");
  const [error, setError] = useState("");
  const [isPending, startTransition] = useTransition();

  function handleSubmit(e) {
    e.preventDefault();
    setError("");
    startTransition(async () => {
      const res = await updateProject({ projectId: project.id, code, name, clientId, dueDate });
      if (res.success) onDone();
      else setError(res.message);
    });
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-2 w-full">
      <input value={code} onChange={(e) => setCode(e.target.value)} required className="w-full border px-2 py-1.5 text-sm font-mono" style={inputStyle()} />
      <input value={name} onChange={(e) => setName(e.target.value)} required className="w-full border px-2 py-1.5 text-sm" style={inputStyle()} />
      <select value={clientId} onChange={(e) => setClientId(e.target.value)} className="w-full border px-2 py-1.5 text-sm" style={inputStyle()}>
        {clients.map((c) => (
          <option key={c.id} value={c.id}>{c.name}</option>
        ))}
      </select>
      <input type="date" value={dueDate} onChange={(e) => setDueDate(e.target.value)} className="w-full border px-2 py-1.5 text-xs" style={inputStyle()} />
      {error && <p className="text-xs" style={{ color: "#BC4749" }}>{error}</p>}
      <div className="flex gap-2">
        <button disabled={isPending} type="submit" className="flex-1 py-1.5 text-xs font-mono" style={{ backgroundColor: "var(--color-ink)", color: "var(--color-paper)" }}>
          {isPending ? "Guardando..." : "Guardar"}
        </button>
        <button type="button" onClick={onDone} className="flex-1 py-1.5 text-xs font-mono" style={{ color: "var(--color-ink-soft)" }}>
          cancelar
        </button>
      </div>
    </form>
  );
}

function ClientsListModal({ clients, onClose }) {
  const [editingId, setEditingId] = useState(null);

  return (
    <Modal title="Clientes" onClose={onClose}>
      <div className="space-y-4 max-h-[60vh] overflow-y-auto">
        {clients.length === 0 && <p className="text-sm" style={{ color: "var(--color-ink-soft)" }}>Todavía no tienes clientes.</p>}
        {clients.map((c) =>
          editingId === c.id ? (
            <EditClientRow key={c.id} client={c} onDone={() => setEditingId(null)} />
          ) : (
            <ClientRow key={c.id} client={c} onEdit={() => setEditingId(c.id)} />
          )
        )}
      </div>
    </Modal>
  );
}

function ClientRow({ client, onEdit }) {
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState("");

  function handleDelete() {
    if (!confirm(`¿Borrar a "${client.name}"? Esto borra también TODOS sus proyectos, hitos y bitácora. Esta acción no se puede deshacer.`)) return;
    startTransition(async () => {
      const res = await deleteClient(client.id);
      if (!res.success) setError(res.message);
    });
  }

  return (
    <div className="border-b pb-3" style={{ borderColor: "var(--color-line-soft)" }}>
      <div className="flex items-center justify-between">
        <div>
          <div className="text-sm font-semibold" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>{client.name}</div>
          <div className="text-xs" style={{ color: "var(--color-ink-soft)" }}>{client.contact_email || "sin correo"}</div>
        </div>
        <div className="flex items-center gap-3">
          <button onClick={onEdit} className="text-xs font-mono">editar</button>
          <button disabled={isPending} onClick={handleDelete} className="text-xs font-mono" style={{ color: "#BC4749" }}>eliminar</button>
        </div>
      </div>
      {error && <p className="text-xs mt-1" style={{ color: "#BC4749" }}>{error}</p>}
    </div>
  );
}

function EditClientRow({ client, onDone }) {
  const [name, setName] = useState(client.name);
  const [email, setEmail] = useState(client.contact_email || "");
  const [error, setError] = useState("");
  const [isPending, startTransition] = useTransition();

  function handleSubmit(e) {
    e.preventDefault();
    setError("");
    startTransition(async () => {
      const res = await updateClient({ clientId: client.id, name, contactEmail: email });
      if (res.success) onDone();
      else setError(res.message);
    });
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-2 border-b pb-3" style={{ borderColor: "var(--color-line-soft)" }}>
      <input value={name} onChange={(e) => setName(e.target.value)} required className="w-full border px-2 py-1.5 text-sm" style={inputStyle()} />
      <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} className="w-full border px-2 py-1.5 text-sm" style={inputStyle()} />
      {error && <p className="text-xs" style={{ color: "#BC4749" }}>{error}</p>}
      <div className="flex gap-2">
        <button disabled={isPending} type="submit" className="flex-1 py-1.5 text-xs font-mono" style={{ backgroundColor: "var(--color-ink)", color: "var(--color-paper)" }}>
          {isPending ? "Guardando..." : "Guardar"}
        </button>
        <button type="button" onClick={onDone} className="flex-1 py-1.5 text-xs font-mono" style={{ color: "var(--color-ink-soft)" }}>
          cancelar
        </button>
      </div>
    </form>
  );
}

export default function DashboardView({ role, fullName, projects, clients, teamMembers, loadError }) {
  const [selectedId, setSelectedId] = useState(projects[0]?.id ?? null);
  const [isPending, startTransition] = useTransition();
  const [showClientModal, setShowClientModal] = useState(false);
  const [showProjectModal, setShowProjectModal] = useState(false);
  const [showTeamModal, setShowTeamModal] = useState(false);
  const [showGenLinkModal, setShowGenLinkModal] = useState(false);
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [showClientsListModal, setShowClientsListModal] = useState(false);
  const [stageFilter, setStageFilter] = useState("todos");
  const [editingProject, setEditingProject] = useState(false);
  const isTeam = role === "admin" || role === "team";
  const selected = projects.find((p) => p.id === selectedId);
  const visibleProjects = stageFilter === "todos" ? projects : projects.filter((p) => p.stage === stageFilter);
  const supabase = createClient();

  useEffect(() => {
    setEditingProject(false);
  }, [selectedId]);

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

  function handleDeleteProject() {
    if (!confirm(`¿Borrar el proyecto "${selected.name}"? Se borran también sus hitos, tareas y bitácora. Esto no se puede deshacer.`)) return;
    startTransition(async () => {
      await deleteProject(selected.id);
      setSelectedId(null);
    });
  }

  function handleDuplicateProject() {
    startTransition(async () => {
      const res = await duplicateProject(selected.id);
      if (res.success) setSelectedId(res.newProjectId);
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
            {fullName} · {role === "admin" ? "admin" : role === "team" ? "equipo" : "cliente"}
          </div>
        </div>
        <div className="flex items-center gap-4">
          {isTeam && (
            <>
              <button onClick={() => setShowClientsListModal(true)} className="text-xs font-mono">clientes</button>
              <button onClick={() => setShowClientModal(true)} className="text-xs font-mono">+ cliente</button>
              <button onClick={() => setShowProjectModal(true)} className="text-xs font-mono">+ proyecto</button>
              {role === "admin" && (
                <>
                  <button onClick={() => setShowTeamModal(true)} className="text-xs font-mono">+ equipo</button>
                  <button onClick={() => setShowGenLinkModal(true)} className="text-xs font-mono">acceso</button>
                </>
              )}
              {isTeam && (
                <button onClick={() => setShowPasswordModal(true)} className="text-xs font-mono" style={{ color: "var(--color-ink-soft)" }}>
                  contraseña
                </button>
              )}
            </>
          )}
          <button onClick={handleLogout} className="text-xs font-mono" style={{ color: "var(--color-ink-soft)" }}>
            cerrar sesión
          </button>
        </div>
      </div>

      <div className="flex items-center gap-2 px-6 py-3 border-b overflow-x-auto flex-shrink-0" style={{ borderColor: "var(--color-line-soft)" }}>
        <button
          onClick={() => setStageFilter("todos")}
          className="text-[11px] font-mono uppercase px-2 py-1 flex-shrink-0"
          style={{ backgroundColor: stageFilter === "todos" ? "var(--color-ink)" : "var(--color-paper-soft)", color: stageFilter === "todos" ? "var(--color-paper)" : "var(--color-ink-soft)" }}
        >
          Todos ({projects.length})
        </button>
        {Object.entries(STAGE_META).map(([key, meta]) => (
          <button
            key={key}
            onClick={() => setStageFilter(key)}
            className="text-[11px] font-mono uppercase px-2 py-1 flex-shrink-0 flex items-center gap-1.5"
            style={{
              backgroundColor: stageFilter === key ? `${meta.color}1A` : "transparent",
              color: meta.color,
              border: `1px solid ${stageFilter === key ? meta.color : "var(--color-line)"}`,
            }}
          >
            <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: meta.color }} />
            {meta.label} ({projects.filter((p) => p.stage === key).length})
          </button>
        ))}
      </div>

      <div className="flex flex-1 min-h-0">
        <div className="flex-1 overflow-y-auto">
          {visibleProjects.length === 0 && (
            <div className="p-6 text-sm" style={{ color: "var(--color-ink-soft)" }}>
              No hay proyectos en esta etapa.
            </div>
          )}
          {visibleProjects.map((p) => {
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
              <div className="flex-1">
                {editingProject ? (
                  <EditProjectForm project={selected} clients={clients} onDone={() => setEditingProject(false)} />
                ) : (
                  <>
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
                    {isTeam && (
                      <div className="flex items-center gap-3 mt-3">
                        <button onClick={() => setEditingProject(true)} className="text-xs font-mono" style={{ color: "var(--color-ink-soft)" }}>editar</button>
                        <button onClick={handleDuplicateProject} className="text-xs font-mono" style={{ color: "var(--color-ink-soft)" }}>duplicar</button>
                        <button onClick={handleDeleteProject} className="text-xs font-mono" style={{ color: "#BC4749" }}>eliminar</button>
                      </div>
                    )}
                  </>
                )}
              </div>
              <button onClick={() => setSelectedId(null)}><X size={18} color="var(--color-ink-soft)" /></button>
            </div>

            {isTeam && <ProjectTeamSection project={selected} teamMembers={teamMembers} />}

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

            {isTeam && (
              <div className="px-6 py-5 border-b" style={{ borderColor: "var(--color-line-soft)" }}>
                <div className="text-xs font-mono uppercase mb-3" style={{ color: "var(--color-ink-soft)" }}>
                  Tareas internas <span style={{ color: "var(--color-ink-soft)", fontWeight: 400 }}>· no las ve el cliente</span>
                </div>
                <div>
                  {(selected.tasks || []).length === 0 && (
                    <p className="text-xs" style={{ color: "var(--color-ink-soft)" }}>Sin tareas todavía.</p>
                  )}
                  {(selected.tasks || []).map((t) => (
                    <TaskRow key={t.id} task={t} />
                  ))}
                </div>
                <AddTaskForm projectId={selected.id} teamMembers={teamMembers} />
              </div>
            )}

            <div className="px-6 py-5 flex-1 overflow-y-auto">
              <div className="text-xs font-mono uppercase mb-3 flex items-center gap-2" style={{ color: "var(--color-ink-soft)" }}>
                <MessageSquare size={12} /> Bitácora
              </div>
              {isTeam && <AddUpdateForm projectId={selected.id} />}
              {(selected.project_updates || [])
                .filter((u) => isTeam || u.is_client_visible)
                .map((u) => (
                  <UpdateRow key={u.id} update={u} isTeam={isTeam} />
                ))}
            </div>
          </div>
        )}
      </div>

      {showClientModal && <NewClientModal onClose={() => setShowClientModal(false)} />}
      {showProjectModal && <NewProjectModal clients={clients} onClose={() => setShowProjectModal(false)} />}
      {showTeamModal && <NewTeamMemberModal onClose={() => setShowTeamModal(false)} />}
      {showGenLinkModal && <GenerateTeamLinkModal onClose={() => setShowGenLinkModal(false)} />}
      {showPasswordModal && <ChangePasswordModal onClose={() => setShowPasswordModal(false)} />}
      {showClientsListModal && <ClientsListModal clients={clients} onClose={() => setShowClientsListModal(false)} />}
    </div>
  );
}
