import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // 🌟 ここにメインPCのローカルIPを追加して、アクセスを許可するわ！
  allowedDevOrigins: ['192.168.11.21'],
};

export default nextConfig;