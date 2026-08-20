// 空狀態文字
export default function Empty({ children }: { children: React.ReactNode }) {
  return <div className="py-8 text-center text-[12px] font-semibold text-faint">{children}</div>;
}
