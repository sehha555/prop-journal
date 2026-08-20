// 頁首：標題 + 副標 + 右側動作
export default function PageHeader({
  title,
  subtitle,
  left,
  actions,
}: {
  title: string;
  subtitle?: string;
  left?: React.ReactNode;
  actions?: React.ReactNode;
}) {
  return (
    <div className="flex items-center justify-between">
      <div className="flex items-center gap-[22px]">
        <div className="flex flex-col gap-0.5">
          <div className="text-[20px] font-extrabold tracking-[-0.02em] text-white">{title}</div>
          {subtitle && <div className="text-[12px] font-semibold text-muted">{subtitle}</div>}
        </div>
        {left}
      </div>
      {actions && <div className="flex gap-2">{actions}</div>}
    </div>
  );
}
