import Link from "next/link";

export default async function DashboardPage({ params }: { params: Promise<{ orgSlug: string }> }) {
  const { orgSlug } = await params;
  return (
    <main className="space-y-4 p-6">
      <h1 className="text-xl font-semibold">Dashboard</h1>
      <Link href={`/${orgSlug}/notes`} className="inline-block text-blue-600 underline">
        Catatan
      </Link>
    </main>
  );
}
