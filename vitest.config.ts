import { defineConfig } from "vitest/config";
import path from "node:path";
export default defineConfig({ test: { environment: "node", coverage: { provider: "v8", reporter: ["text", "json", "html"], include: ["src/lib/auth/validation.ts", "src/lib/security/tokens.ts"] } }, resolve: { alias: { "@": path.resolve(__dirname, "./src") } } });
