"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

export default function AuthCallbackPage() {
  const router = useRouter();
  const [error, setError] = useState("");

  useEffect(() => {
    const supabase = createClient();
    let cancelled = false;

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, session) => {
      if (session && !cancelled) router.replace("/dashboard");
    });

    supabase.auth.getSession().then(({ data }) => {
      if (data.session && !cancelled) router.replace("/dashboard");
    });

    const timeout = setTimeout(() => {
      if (!cancelled) setError("Este link ya no es válido o expiró. Pide uno nuevo.");
    }, 4000);

    return () => {
      cancelled = true;
      subscription.unsubscribe();
      clearTimeout(timeout);
    };
  }, [router]);

  return (
    <div className="min-h-screen flex items-center justify-center px-4 text-center">
      <div>
        <p className="text-sm" style={{ color: "var(--color-ink-soft)" }}>
          {error || "Entrando..."}
        </p>
        {error && (
          <a href="/login" className="text-xs font-mono underline mt-2 inline-block">
            ir al login
          </a>
        )}
      </div>
    </div>
  );
}
