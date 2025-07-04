// Test setup and custom matchers

// Add custom console logging for test descriptions
const originalTest = global.test;
global.test = (description, fn) => {
  return originalTest(description, async () => {
    console.log(`    → ${description}`);
    return await fn();
  });
};

// Override console.log during tests to make output cleaner
const originalLog = console.log;
console.log = (...args) => {
  // Only show our custom test messages and results
  if (args[0] && (args[0].includes("→") || args[0].includes("✓") || args[0].includes("✗"))) {
    originalLog(...args);
  }
};
