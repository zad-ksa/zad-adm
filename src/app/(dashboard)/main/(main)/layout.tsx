import { Metadata } from "next";

export const metadata: Metadata = {
  title: "لوحة التحكم | زاد التنموية",
};

export default function MainLayout({ children }: { children: React.ReactNode }) {
  // DashboardLayoutClient wrapper is now handled by the shared layout in src/app/(dashboard)/layout.tsx
  return <>{children}</>;
}
