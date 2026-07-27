/// <reference types="vitest/config" />
import path from "path";
import { execSync } from "child_process";
import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";

/** Obtém a versão a partir da tag git mais recente (ex: v1.3.0 → 1.3.0) */
function getVersion(): string {
  try {
    const tag = execSync("git describe --tags --abbrev=0", { encoding: "utf-8" }).trim();
    return tag.replace(/^v/, "");
  } catch {
    return "0.0.0";
  }
}

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  define: {
    "import.meta.env.VITE_APP_VERSION": JSON.stringify(getVersion()),
  },
  test: {
    environment: "jsdom",
    globals: true,
    setupFiles: ["./src/test-setup.ts"],
    include: ["src/**/*.test.{ts,tsx}"],
  },
});