import { redirect } from "next/navigation";

import { getAdminSession } from "@/lib/admin-session";

export default async function AdminDashboardLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  const session = await getAdminSession();
  if (!session) {
    redirect("/admin/login");
  }

  return <div className="admin-page">{children}</div>;
}
