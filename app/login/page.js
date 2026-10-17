"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

export default function LoginPage() {
  const router = useRouter();
  const supabase = createClient();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");
    setLoading(true);

    const { error } = await supabase.auth.signInWithPassword({ email, password });

    setLoading(false);

    if (error) {
      setError("Correo o contraseña incorrectos.");
      return;
    }

    router.push("/dashboard");
    router.refresh();
  }

  return (
    <div className="min-h-screen flex items-center justify-center px-4">
      <form
        onSubmit={handleSubmit}
        className="w-full max-w-sm border p-8"
        style={{ borderColor: "var(--color-line)" }}
      >
        <img
          src="/logo.png"
          alt="Logo del estudio"
          className="h-9 w-auto mb-5"
          onError={(e) => { e.currentTarget.style.display = "none"; }}
        />
        <h1 className="font-display text-xl font-bold mb-1">Proyectos</h1>
        <p className="text-sm mb-6" style={{ color: "var(--color-ink-soft)" }}>
          Acceso para el equipo. Si eres cliente, usa el link que te compartió el estudio.
        </p>

        <label className="block text-xs font-mono uppercase tracking-wide mb-1">Correo</label>
        <input
          type="email"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="w-full border px-3 py-2 mb-4 text-sm"
          style={{ borderColor: "var(--color-line)" }}
        />

        <label className="block text-xs font-mono uppercase tracking-wide mb-1">Contraseña</label>
        <input
          type="password"
          required
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className="w-full border px-3 py-2 mb-4 text-sm"
          style={{ borderColor: "var(--color-line)" }}
        />

        {error && (
          <p className="text-xs mb-4" style={{ color: "#BC4749" }}>
            {error}
          </p>
        )}

        <button
          type="submit"
          disabled={loading}
          className="btn btn-primary btn-lg w-full"
        >
          {loading ? "Entrando..." : "Entrar"}
        </button>
      </form>
    </div>
  );
}
