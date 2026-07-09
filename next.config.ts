import type { NextConfig } from "next";

const appUrl = process.env.APP_URL ?? process.env.NEXT_PUBLIC_APP_URL ?? "";
const defaultStorageUrl = appUrl ? `${appUrl.replace(/\/+$/, "")}/storage` : "";

const nextConfig: NextConfig = {
  env: {
    STORAGE_URL: process.env.STORAGE_URL ?? defaultStorageUrl,
  },
};

export default nextConfig;
