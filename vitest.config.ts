import { defineConfig } from "vitest/config";
import path from "path";

export default defineConfig({
  test: {
    environment: "node",
    setupFiles: ["./vitest.setup.ts"],
    include: ["src/**/*.test.ts", "tests/**/*.test.ts"],
    testTimeout: 30000,
    pool: "forks",
    poolOptions: { forks: { singleFork: true } }, // sequential DB tests
  },
  resolve: {
    alias: { "@": path.resolve(__dirname, "./src") },
  },
});
