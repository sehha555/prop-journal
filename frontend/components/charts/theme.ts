// Recharts 共用樣式
export const C = {
  gold: "#e0b45c",
  green: "#7fbf8e",
  red: "#c96a6a",
  muted: "#8b929b",
  faint: "#5f666e",
  line: "#23272d",
  card: "#171a1f",
};

export const tooltipStyle = {
  contentStyle: {
    background: "#171a1f",
    border: "1px solid #23272d",
    borderRadius: 8,
    fontSize: 12,
    fontWeight: 600,
    color: "#d7dbe0",
    fontVariantNumeric: "tabular-nums" as const,
  },
  labelStyle: { color: "#8b929b", marginBottom: 4 },
  itemStyle: { color: "#d7dbe0" },
  cursor: { stroke: "#23272d" },
};

export const axisTick = { fill: "#5f666e", fontSize: 10, fontWeight: 600 };
