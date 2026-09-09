import path from "node:path";
import { fileURLToPath } from "node:url";
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");

export default defineConfig({
  plugins: [react()],
  server: { port: 4173 },
  define: {
    __CHALLENGE_REF__: JSON.stringify(process.env.VERCEL_GIT_COMMIT_REF ?? ""),
  },
  build: {
    outDir: path.join(repoRoot, "dist"),
    emptyOutDir: true,
  },
});
