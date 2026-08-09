"use client";

import { Suspense, useState } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

function ConfirmInner() {
  const params = useSearchParams();
  const router = useRouter();
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleEnter() {
    setLoading(true);
    setError("");

    const token_hash = params.get("token_hash");
    const type = params.get("type") || "magiclink";

    if (!token_hash) {
      setError("Este link no es válido.");
      setLoading(false);
      return;
    }

    const supabase = createClient();
    const { error } = await supabase.auth.verifyOtp({ token_hash, type });

    setLoading(false);

    if (error) {
      setError("Este link ya no es válido o expiró. Pide uno nuevo.");
      return;
    }

    router.replace("/dashboard");
  }

  return (
    <div className="min-h-screen flex items-center justify-center px-4 text-center">
      <div className="max-w-sm">
        <h1 className="font-display text-xl font-bold mb-2">Estudio · Proyectos</h1>
        <p className="text-sm mb-6" style={{ color: "var(--color-ink-soft)" }}>
          Toca el botón para entrar y ver el avance de tu proyecto.
        </p>
        <button
          onClick={handleEnter}
          disabled={loading}
          className="w-full py-2 text-sm font-mono"
          style={{ backgroundColor: "var(--color-ink)", color: "var(--color-paper)" }}
        >
          {loading ? "Entrando..." : "Entrar a mi proyecto"}
        </button>
        {error && (
          <p className="text-xs mt-3" style={{ color: "#BC4749" }}>
            {error}
          </p>
        )}
      </div>
    </div>
  );
}

export default function ConfirmPage() {
  return (
    <Suspense fallback={<div className="min-h-screen flex items-center justify-center text-sm">Cargando...</div>}>
      <ConfirmInner />
    </Suspense>
  );
}
