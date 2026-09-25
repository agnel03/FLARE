/** @type {import('jest').Config} */
module.exports = {
  rootDir: ".",
  testEnvironment: "node",
  transform: { "^.+\\.ts$": ["ts-jest", { tsconfig: "tsconfig.json" }] },
  testRegex: "test/.*\\.spec\\.ts$",
  setupFiles: ["<rootDir>/test/env.ts"],
  testTimeout: 20000,
  moduleFileExtensions: ["ts", "js", "json"],
};
