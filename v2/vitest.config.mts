import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    environment: "node",
    include: ["lib/**/*.test.ts", "eval/**/*.test.ts"],
  },
  resolve: {
    alias: { "@": import.meta.dirname },
  },
});
