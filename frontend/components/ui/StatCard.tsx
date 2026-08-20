// 數字卡：標籤 + 大數字 + 小註解
export default function StatCard({
  label,
  value,
  hint,
  accent = false,
  valueClass = "text-white",
  size = "lg",
}: {
  label: string;
  value: React.ReactNode;
  hint?: React.ReactNode;
  accent?: boolean;
  valueClass?: string;
  size?: "lg" | "md";
}) {
  return (
    <div
      className={
        "card flex flex-col gap-1.5 " +
        (size === "lg" ? "px-[18px] py-4" : "px-4 py-3.5") +
        (accent ? " border-gold-line bg-gold-card" : "")
      }
    >
      <div className={"text-[12px] font-bold " + (accent ? "text-gold" : "text-muted")}>{label}</div>
      <div className={`num font-extrabold ${size === "lg" ? "text-[30px]" : "text-[26px]"} ${accent ? "text-gold" : valueClass}`}>
        {value}
      </div>
      {hint && <div className="text-[11px] font-semibold text-faint">{hint}</div>}
    </div>
  );
}
