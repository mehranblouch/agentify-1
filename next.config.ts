import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  serverExternalPackages: [
    "@whiskeysockets/baileys",
    "ws",
    "bufferutil",
    "utf-8-validate",
    "better-sqlite3",
    "pino",
    "googleapis",
  ],
};

export default nextConfig;
