// 表單欄位：label + 控制項
export default function Field({ label, children, className = "" }: { label: string; children: React.ReactNode; className?: string }) {
  return (
    <label className={`flex flex-col gap-1 ${className}`}>
      <span className="th">{label}</span>
      {children}
    </label>
  );
}
