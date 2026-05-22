"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export function AdminLoginForm() {
  const router = useRouter();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setIsLoading(true);

    try {
      const response = await fetch("/api/admin/login", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ username, password }),
      });

      if (!response.ok) {
        const payload = (await response.json().catch(() => null)) as {
          error?: string;
        } | null;
        if (response.status === 429) {
          setError("Слишком много попыток. Попробуйте чуть позже.");
          return;
        }
        if (response.status === 403) {
          setError("Запрос отклонён. Проверьте домен и прокси.");
          return;
        }
        if (response.status === 401 || response.status === 400) {
          setError("Неверный логин или пароль.");
          return;
        }
        setError(payload?.error ?? "Не удалось войти");
        return;
      }

      router.replace("/admin/dashboard");
      router.refresh();
    } catch {
      setError("Сеть недоступна. Попробуйте снова.");
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <div className="border-outline-variant/45 bg-surface-container-low/75 w-full rounded-3xl border p-7 shadow-[0_28px_70px_-40px_rgba(0,0,0,0.85)] backdrop-blur-xl md:p-8">
      <h1 className="font-display text-on-surface text-4xl tracking-[0.1em] uppercase">
        Вход в Админку
      </h1>
      <p className="font-label text-on-surface-variant mt-2 mb-8 text-[11px] tracking-[0.24em] uppercase">
        BRANYA Control
      </p>

      <form className="flex flex-col gap-4" onSubmit={handleSubmit}>
        <label className="flex flex-col gap-2">
          <span className="font-label text-on-surface-variant text-[11px] tracking-[0.22em] uppercase">
            Логин
          </span>
          <input
            value={username}
            onChange={(event) => setUsername(event.target.value)}
            className="border-outline-variant/45 bg-surface-container text-on-surface focus:border-primary min-h-12 rounded-xl border px-4 transition outline-none"
            autoComplete="username"
            required
          />
        </label>

        <label className="flex flex-col gap-2">
          <span className="font-label text-on-surface-variant text-[11px] tracking-[0.22em] uppercase">
            Пароль
          </span>
          <input
            type="password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            className="border-outline-variant/45 bg-surface-container text-on-surface focus:border-primary min-h-12 rounded-xl border px-4 transition outline-none"
            autoComplete="current-password"
            required
          />
        </label>

        {error ? (
          <p className="font-label text-error mt-1 text-[11px] tracking-[0.18em] uppercase">
            {error}
          </p>
        ) : null}

        <button
          type="submit"
          disabled={isLoading}
          className="bg-primary text-on-primary hover:bg-primary-container font-label mt-4 min-h-12 rounded-xl px-4 text-xs tracking-[0.24em] uppercase transition disabled:cursor-not-allowed disabled:opacity-70"
        >
          {isLoading ? "Вход..." : "Войти"}
        </button>
      </form>
    </div>
  );
}
