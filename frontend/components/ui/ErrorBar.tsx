// 頁面頂端的紅字錯誤列（不用 alert）
export default function ErrorBar({ message, onClose }: { message: string | null; onClose?: () => void }) {
  if (!message) return null;
  return (
    <div className="flex items-center justify-between rounded-lg border border-red/40 bg-red-bg px-3.5 py-2 text-[12px] font-semibold text-red">
      <span>{message}</span>
      {onClose && (
        <button type="button" onClick={onClose} className="ml-4 text-red hover:text-white">
          關閉
        </button>
      )}
    </div>
  );
}
