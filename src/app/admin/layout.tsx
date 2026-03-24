import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Shutterly Admin",
  description: "Shutterly admin dashboard",
};

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
