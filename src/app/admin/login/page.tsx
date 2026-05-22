import { redirect } from "next/navigation";

import { AdminLoginForm } from "@/components/admin/admin-login-form";
import { getAdminSession } from "@/lib/admin-session";

export default async function AdminLoginPage() {
  const session = await getAdminSession();
  if (session) {
    redirect("/admin/dashboard");
  }

  return (
    <main className="bg-background relative flex min-h-screen items-center justify-center overflow-hidden px-4 py-10 md:px-8">
      <div className="pointer-events-none absolute top-0 left-0 h-72 w-72 rounded-full bg-cyan-300/20 blur-[100px]" />
      <div className="pointer-events-none absolute right-0 bottom-0 h-72 w-72 rounded-full bg-orange-300/20 blur-[100px]" />

      <div className="border-outline-variant/45 bg-surface-container-low/55 relative z-10 grid w-full max-w-5xl overflow-hidden rounded-[2rem] border lg:grid-cols-[0.95fr_1.05fr]">
        <div className="from-surface-container-highest/65 to-surface-container-low relative hidden flex-col justify-between bg-gradient-to-br p-10 lg:flex">
          <div>
            <p className="font-label text-primary text-[11px] tracking-[0.24em] uppercase">
              Закрытый раздел
            </p>
            <h2 className="font-display text-on-surface mt-4 text-6xl leading-[0.88] tracking-[0.09em] uppercase">
              BRANYA
            </h2>
            <p className="text-on-surface-variant mt-5 max-w-sm text-sm leading-relaxed">
              Панель управления концертами: расписание, порядок и визуальные
              настройки секции LIVE.
            </p>
          </div>

          <p className="font-label text-on-surface-variant text-[11px] tracking-[0.22em] uppercase">
            Только для команды
          </p>
        </div>

        <div className="p-6 md:p-10">
          <AdminLoginForm />
        </div>
      </div>
    </main>
  );
}
