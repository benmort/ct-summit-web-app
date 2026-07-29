"use client";

import { EyeIcon, EyeSlashIcon } from "@heroicons/react/24/outline";
import { useCallback, useState } from "react";

type Props = {
  onSuccess: () => void;
};

export default function ModerationLogin({ onSuccess }: Props) {
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [show, setShow] = useState(true);

  const submit = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();
      setError(null);
      setLoading(true);
      try {
        const res = await fetch("/api/auth/moderation", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ password }),
        });
        if (!res.ok) {
          const data = (await res.json()) as { error?: string };
          setError(data.error || "Could not sign in");
          return;
        }
        setPassword("");
        onSuccess();
      } catch {
        setError("Network error. Try again.");
      } finally {
        setLoading(false);
      }
    },
    [onSuccess, password],
  );

  return (
    <div className="mx-auto mb-8 max-w-md rounded-xl border border-veil/15 bg-veil/5 px-4 py-6 text-center ring-1 ring-veil/10">
      <h2 className="text-lg font-semibold text-ink-100">Protected</h2>
      <p className="mt-2 text-sm text-ink-400">
        Enter the password to view Moments.
      </p>
      <form onSubmit={(e) => void submit(e)} className="mt-4 flex flex-col gap-3">
        <label className="sr-only" htmlFor="mod-password">
          Password
        </label>
        <div className="relative">
          <input
            id="mod-password"
            type={show ? "text" : "password"}
            autoComplete="off"
            autoCapitalize="none"
            autoCorrect="off"
            spellCheck={false}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="w-full rounded-lg border border-veil/20 bg-scrim/40 px-3 py-2 pr-11 text-ink-100 placeholder:text-ink-500 focus:outline-none focus:ring-2 focus:ring-brand-400/80"
            placeholder="Password"
            required
          />
          <button
            type="button"
            onClick={() => setShow((v) => !v)}
            className="absolute inset-y-0 right-0 flex items-center px-3 text-ink-400 transition hover:text-ink-100"
            aria-label={show ? "Hide password" : "Show password"}
            aria-pressed={show}
          >
            {show ? (
              <EyeSlashIcon className="h-5 w-5" aria-hidden />
            ) : (
              <EyeIcon className="h-5 w-5" aria-hidden />
            )}
          </button>
        </div>
        {error && (
          <p className="text-sm text-danger-300" role="alert">
            {error}
          </p>
        )}
        <button
          type="submit"
          disabled={loading}
          className="rounded-lg bg-brand-500 px-4 py-2 text-sm font-semibold text-black transition hover:bg-brand-400 disabled:opacity-50"
        >
          {loading ? "Signing in…" : "Continue"}
        </button>
      </form>
    </div>
  );
}
