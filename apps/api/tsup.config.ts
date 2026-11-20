import { defineConfig } from "tsup";

export default defineConfig({
  entry: ["src/server.ts", "src/worker.ts"],
  format: ["esm"],
  platform: "node",
  target: "node26",
  outDir: "dist",
  clean: true,
  // @rm/shared ships raw .ts, so it must be bundled into the output.
  noExternal: ["@rm/shared"],
});
