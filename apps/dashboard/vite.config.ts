import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  server: { port: 4173 },
  define: {
    __CHALLENGE_REF__: JSON.stringify(process.env.VERCEL_GIT_COMMIT_REF ?? ""),
  },
});
