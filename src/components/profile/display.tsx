// Small display helpers shared by the 프로필 and 나의 AI 교육 tabs. Server-safe.

export function SectionTitle({ children }: { children: React.ReactNode }) {
  return <h2 className="mb-3 text-base font-extrabold tracking-tight">{children}</h2>;
}

export function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex gap-3">
      <dt className="w-16 shrink-0 text-gray-500">{label}</dt>
      <dd className="min-w-0 flex-1 break-words">{value}</dd>
    </div>
  );
}

export function formatDate(iso: string | null | undefined): string | null {
  if (!iso) return null;
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return null;
  return date.toLocaleDateString("ko-KR", {
    year: "numeric",
    month: "long",
    day: "numeric",
    timeZone: "Asia/Seoul",
  });
}
