// 膠囊標籤：EVAL / FUNDED / FAILED 等
const TONES = {
  gold: "text-gold bg-gold-bg",
  green: "text-green bg-green-bg",
  red: "text-red bg-red-bg",
  muted: "text-muted bg-line",
};

export default function Badge({ tone = "muted", children }: { tone?: keyof typeof TONES; children: React.ReactNode }) {
  return (
    <span className={`rounded-full px-2 py-0.5 text-[11px] font-extrabold ${TONES[tone]}`}>{children}</span>
  );
}
