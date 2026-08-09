"use server";

import { revalidatePath } from "next/cache";
import { createClient as createSupabaseServerClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { sendClientNotification } from "@/lib/email";

const STAGE_LABELS = {
  brief: "Brief",
  diseno: "Diseño",
  revision: "Revisión cliente",
  produccion: "Producción",
  entregado: "Entregado",
};

async function assertIsTeam(supabase) {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return false;
  const { data: profile } = await supabase.from("profiles").select("role").eq("id", user.id).single();
  return profile?.role === "admin" || profile?.role === "team";
}

export async function toggleMilestone(milestoneId, nextDone, projectId) {
  const supabase = createSupabaseServerClient();

  // La política RLS de "milestones_write" ya bloquea esto si el usuario
  // autenticado no tiene rol admin/team, pero igual devolvemos el error
  // con claridad por si el intento viene de un cliente.
  const { error } = await supabase
    .from("milestones")
    .update({ is_done: nextDone })
    .eq("id", milestoneId);

  if (error) return { success: false, message: error.message };

  // Recalcula el % de avance del proyecto según cuántos hitos
  // están completados, para que no haya que tocarlo a mano.
  if (projectId) {
    const { data: milestones } = await supabase
      .from("milestones")
      .select("is_done")
      .eq("project_id", projectId);

    if (milestones && milestones.length > 0) {
      const done = milestones.filter((m) => m.is_done).length;
      const progress = Math.round((done / milestones.length) * 100);
      await supabase.from("projects").update({ progress }).eq("id", projectId);
    }
  }

  revalidatePath("/dashboard");
  return { success: true };
}

export async function updateProjectStage(projectId, stage) {
  const supabase = createSupabaseServerClient();

  const { error } = await supabase.from("projects").update({ stage }).eq("id", projectId);

  if (error) return { success: false, message: error.message };

  const { data: project } = await supabase
    .from("projects")
    .select("name, code, clients ( contact_email )")
    .eq("id", projectId)
    .single();

  if (project?.clients?.contact_email) {
    await sendClientNotification({
      to: project.clients.contact_email,
      subject: `${project.name} (${project.code}) avanzó a "${STAGE_LABELS[stage] || stage}"`,
      html: `<p>Hola,</p><p>Tu proyecto <strong>${project.name}</strong> ahora está en la etapa <strong>${STAGE_LABELS[stage] || stage}</strong>.</p><p><a href="${process.env.NEXT_PUBLIC_SITE_URL || ""}/dashboard">Ver el avance completo</a></p>`,
    });
  }

  revalidatePath("/dashboard");
  return { success: true };
}

export async function setProjectProgress(projectId, progress) {
  const supabase = createSupabaseServerClient();

  const clamped = Math.max(0, Math.min(100, Number(progress) || 0));
  const { error } = await supabase.from("projects").update({ progress: clamped }).eq("id", projectId);

  if (error) return { success: false, message: error.message };

  revalidatePath("/dashboard");
  return { success: true };
}

// Crea (o reutiliza) el usuario de autenticación y su perfil de cliente,
// SIN enviar ningún correo automático — admin.createUser() con
// email_confirm:true no dispara ningún email por sí solo.
async function ensureClientAuth({ email, fullName, clientId }) {
  const admin = createAdminClient();
  const { data: created, error: createError } = await admin.auth.admin.createUser({
    email: email.trim(),
    email_confirm: true,
  });

  let userId = created?.user?.id;

  if (createError) {
    // Si el correo ya tenía cuenta, la reutilizamos en vez de fallar.
    const { data: list } = await admin.auth.admin.listUsers();
    const existing = list?.users?.find((u) => u.email === email.trim());
    if (existing) userId = existing.id;
    if (!userId) return { success: false, message: createError.message };
  }

  const { error: profileError } = await admin
    .from("profiles")
    .upsert({ id: userId, full_name: fullName || email.trim(), role: "client", client_id: clientId });

  if (profileError) return { success: false, message: profileError.message };

  return { success: true, userId };
}

export async function inviteClient({ email, fullName, clientId }) {
  const supabase = createSupabaseServerClient();

  if (!(await assertIsTeam(supabase))) {
    return { success: false, message: "No autorizado." };
  }
  if (!email?.trim()) return { success: false, message: "Correo requerido." };

  return ensureClientAuth({ email, fullName, clientId });
}

// Genera un link de acceso (magic link) para el correo del cliente y lo
// devuelve como texto, sin que Supabase envíe ningún correo. Tú decides
// cómo hacérselo llegar (correo, WhatsApp, etc.).
export async function getClientMagicLink(clientId) {
  const supabase = createSupabaseServerClient();

  if (!(await assertIsTeam(supabase))) {
    return { success: false, message: "No autorizado." };
  }

  const { data: client } = await supabase.from("clients").select("contact_email, name").eq("id", clientId).single();

  if (!client?.contact_email) {
    return { success: false, message: "Este cliente no tiene un correo de contacto configurado. Edítalo primero." };
  }

  // Se asegura de que la cuenta exista, por si nunca se marcó "crear acceso".
  const ensured = await ensureClientAuth({ email: client.contact_email, fullName: client.name, clientId });
  if (!ensured.success) return ensured;

  const admin = createAdminClient();
  const { data, error } = await admin.auth.admin.generateLink({
    type: "magiclink",
    email: client.contact_email,
    options: { redirectTo: `${process.env.NEXT_PUBLIC_SITE_URL || ""}/auth/callback` },
  });

  if (error) return { success: false, message: error.message };

  return { success: true, link: data?.properties?.action_link };
}

export async function createStudioClient({ name, contactEmail, inviteAsClient }) {
  const supabase = createSupabaseServerClient();

  if (!name?.trim()) {
    return { success: false, message: "El nombre del cliente es obligatorio." };
  }

  const { data, error } = await supabase
    .from("clients")
    .insert({ name: name.trim(), contact_email: contactEmail?.trim() || null })
    .select()
    .single();

  if (error) return { success: false, message: error.message };

  let warning = null;
  if (inviteAsClient && contactEmail?.trim()) {
    const inviteRes = await inviteClient({ email: contactEmail, fullName: name, clientId: data.id });
    if (!inviteRes.success) {
      warning = `El cliente se creó, pero no se pudo invitar el acceso: ${inviteRes.message}`;
    }
  }

  revalidatePath("/dashboard");
  return { success: true, warning };
}

export async function createProject({ code, name, clientId, stage, dueDate }) {
  const supabase = createSupabaseServerClient();

  if (!code?.trim() || !name?.trim() || !clientId) {
    return { success: false, message: "Código, nombre y cliente son obligatorios." };
  }

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { error } = await supabase.from("projects").insert({
    code: code.trim(),
    name: name.trim(),
    client_id: clientId,
    stage: stage || "brief",
    due_date: dueDate || null,
    progress: 0,
    created_by: user?.id || null,
  });

  if (error) return { success: false, message: error.message };

  revalidatePath("/dashboard");
  return { success: true };
}

export async function addMilestone({ projectId, title, dueDate, category, color }) {
  const supabase = createSupabaseServerClient();

  if (!title?.trim()) {
    return { success: false, message: "El título del hito es obligatorio." };
  }

  const { count } = await supabase
    .from("milestones")
    .select("id", { count: "exact", head: true })
    .eq("project_id", projectId);

  const { error } = await supabase.from("milestones").insert({
    project_id: projectId,
    title: title.trim(),
    due_date: dueDate || null,
    category: category?.trim() || null,
    color: color || "#3D5A80",
    sort_order: count || 0,
  });

  if (error) return { success: false, message: error.message };

  revalidatePath("/dashboard");
  return { success: true };
}

export async function editMilestone({ milestoneId, title, dueDate, category, color }) {
  const supabase = createSupabaseServerClient();

  if (!title?.trim()) {
    return { success: false, message: "El título del hito es obligatorio." };
  }

  const { error } = await supabase
    .from("milestones")
    .update({
      title: title.trim(),
      due_date: dueDate || null,
      category: category?.trim() || null,
      color: color || "#3D5A80",
    })
    .eq("id", milestoneId);

  if (error) return { success: false, message: error.message };

  revalidatePath("/dashboard");
  return { success: true };
}

export async function deleteMilestone(milestoneId, projectId) {
  const supabase = createSupabaseServerClient();

  const { error } = await supabase.from("milestones").delete().eq("id", milestoneId);

  if (error) return { success: false, message: error.message };

  // Recalcula el avance tras borrar, por si el hito borrado estaba marcado como hecho.
  if (projectId) {
    const { data: milestones } = await supabase
      .from("milestones")
      .select("is_done")
      .eq("project_id", projectId);

    if (milestones && milestones.length > 0) {
      const done = milestones.filter((m) => m.is_done).length;
      const progress = Math.round((done / milestones.length) * 100);
      await supabase.from("projects").update({ progress }).eq("id", projectId);
    }
  }

  revalidatePath("/dashboard");
  return { success: true };
}
export async function addUpdate({ projectId, message, isClientVisible }) {
  const supabase = createSupabaseServerClient();

  if (!message?.trim()) {
    return { success: false, message: "El mensaje no puede estar vacío." };
  }

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { error } = await supabase.from("project_updates").insert({
    project_id: projectId,
    author_id: user?.id || null,
    message: message.trim(),
    is_client_visible: isClientVisible,
  });

  if (error) return { success: false, message: error.message };

  if (isClientVisible) {
    const { data: project } = await supabase
      .from("projects")
      .select("name, code, clients ( contact_email )")
      .eq("id", projectId)
      .single();

    if (project?.clients?.contact_email) {
      await sendClientNotification({
        to: project.clients.contact_email,
        subject: `Nueva actualización en ${project.name} (${project.code})`,
        html: `<p>Hola,</p><p>Hay una nueva actualización en tu proyecto <strong>${project.name}</strong>:</p><p style="padding:12px;background:#F1EFE7;border-radius:4px;">${message.trim()}</p><p><a href="${process.env.NEXT_PUBLIC_SITE_URL || ""}/dashboard">Ver el proyecto completo</a></p>`,
      });
    }
  }

  revalidatePath("/dashboard");
  return { success: true };
}
