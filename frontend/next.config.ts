import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // 靜態匯出，由 FastAPI 同源 serve frontend/out
  output: "export",
  trailingSlash: true,
  images: { unoptimized: true },
  // 不要把 /api/accounts 先導成 /api/accounts/（會繞過 rewrite 又撞 FastAPI 的反向導向）
  skipTrailingSlashRedirect: true,
  // 不要自動產生 AGENTS.md / CLAUDE.md
  agentRules: false,
  // 只在 next dev 生效；output: export 的 build 會忽略 rewrites（預期行為）
  async rewrites() {
    return [{ source: "/api/:path*", destination: "http://localhost:8000/api/:path*" }];
  },
};

export default nextConfig;
