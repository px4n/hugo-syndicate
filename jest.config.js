module.exports = {
  testEnvironment: "node",
  testMatch: ["**/test/**/*.test.js"],
  testTimeout: 30000, // 30 seconds timeout
  collectCoverageFrom: ["hugo-syndicate.js", "providers/**/*.js", "!node_modules/**", "!test/**"],
  coverageDirectory: "coverage",
  coverageReporters: ["text", "lcov", "html"],
  verbose: true,
  setupFilesAfterEnv: ["<rootDir>/test/setup.js"],
};
