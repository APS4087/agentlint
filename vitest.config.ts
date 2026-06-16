import { fileURLToPath } from "node:url";
import { defineConfig } from "vitest/config";

// Mirror the tsconfig "@/*" alias so tests can import app modules the same way
// the app does. Scanner tests use relative imports and don't need it, but the
// alias keeps the door open for testing modules like src/lib/ai/prompt.ts.
export default defineConfig({
  resolve: {
    alias: {
      "@": fileURLToPath(new URL("./src", import.meta.url)),
    },
  },
  test: {
    environment: "node",
    include: ["src/**/*.test.ts"],
  },
});
