const { execSync } = require("child_process");
const fs = require("fs");
const path = require("path");

describe("Hugo Syndicate CLI Integration Tests", () => {
  const scriptPath = path.join(__dirname, "..", "hugo-syndicate.js");
  let testDir;
  let originalCwd;

  beforeAll(() => {
    // Clean up any leftover test directories from previous runs
    const testDirPattern = /^test-cli-\d+$/;
    const parentDir = __dirname;
    fs.readdirSync(parentDir).forEach(file => {
      if (testDirPattern.test(file)) {
        const fullPath = path.join(parentDir, file);
        if (fs.statSync(fullPath).isDirectory()) {
          fs.rmSync(fullPath, { recursive: true, force: true });
        }
      }
    });

    testDir = path.join(__dirname, "test-cli-" + Date.now());
    originalCwd = process.cwd();
    fs.mkdirSync(testDir, { recursive: true });
    fs.mkdirSync(path.join(testDir, "content", "blog"), { recursive: true });
  });

  afterAll(() => {
    process.chdir(originalCwd);
    if (fs.existsSync(testDir)) {
      fs.rmSync(testDir, { recursive: true, force: true });
    }
  });

  beforeEach(() => {
    process.chdir(testDir);
    if (fs.existsSync(path.join(testDir, ".git"))) {
      fs.rmSync(path.join(testDir, ".git"), { recursive: true, force: true });
    }
    const contentDir = path.join(testDir, "content", "blog");
    if (fs.existsSync(contentDir)) {
      fs.readdirSync(contentDir).forEach((file) => {
        if (file.endsWith(".md")) {
          fs.unlinkSync(path.join(contentDir, file));
        }
      });
    }
  });

  test("displays help when --help is passed", () => {
    const result = execSync(`node "${scriptPath}" --help`, {
      encoding: "utf8",
      cwd: testDir,
    });

    expect(result).toContain("Hugo Syndicate - Multi-provider content syndication");
    expect(result).toContain("Usage:");
    expect(result).toContain("--provider");
    expect(result).toContain("--providers");
    expect(result).toContain("--force-all");
    expect(result).toContain("Available providers:");
    expect(result).toContain("devto");
    expect(result).toContain("qiita");
  });

  test("handles missing HUGO_BASE_URL gracefully", () => {
    const env = {
      PATH: process.env.PATH,
      HOME: process.env.HOME,
      NODE_ENV: "production",
      DEVTO_API_KEY: "test-key",
    };

    const result = execSync(`node "${scriptPath}" --provider devto`, {
      encoding: "utf8",
      env,
      cwd: testDir,
    });

    expect(result).toContain("No markdown files to process");
  });

  test("handles missing provider API key", () => {
    execSync("git init", { cwd: testDir, stdio: "ignore" });
    execSync('git config user.email "test@example.com"', { cwd: testDir, stdio: "ignore" });
    execSync('git config user.name "Test User"', { cwd: testDir, stdio: "ignore" });

    // Create a test file and commit it
    const testFile = path.join(testDir, "content", "blog", "test.md");
    fs.writeFileSync(testFile, `---\ntitle: "Test"\ndevto: true\n---\nTest content`);
    execSync("git add .", { cwd: testDir, stdio: "ignore" });
    execSync('git commit -m "Initial commit"', { cwd: testDir, stdio: "ignore" });

    const env = {
      PATH: process.env.PATH,
      HOME: process.env.HOME,
      HUGO_BASE_URL: "https://example.com",
      CONTENT_DIR: "content/",
      NODE_ENV: "production",
      FORCE_SYNC_ALL: "true", // Force processing all files
    };

    try {
      const result = execSync(`node "${scriptPath}" --provider devto`, {
        encoding: "utf8",
        env,
        cwd: testDir,
      });

      expect(result).toContain("Failed to initialize provider devto");
      expect(result).toContain("Missing API key for provider");
    } catch (error) {
      // If the command fails (non-zero exit), check stderr
      const output = error.stdout ? error.stdout.toString() : error.toString();
      expect(output).toContain("Failed to initialize provider devto");
      expect(output).toContain("Missing API key for provider");
    }
  });

  test("handles no changed files gracefully", () => {
    execSync("git init", { cwd: testDir, stdio: "ignore" });
    execSync('git config user.email "test@example.com"', { cwd: testDir, stdio: "ignore" });
    execSync('git config user.name "Test User"', { cwd: testDir, stdio: "ignore" });
    fs.writeFileSync(path.join(testDir, ".gitignore"), "node_modules/\n");
    execSync("git add .", { cwd: testDir, stdio: "ignore" });
    execSync('git commit -m "Initial commit"', { cwd: testDir, stdio: "ignore" });

    const env = {
      ...process.env,
      HUGO_BASE_URL: "https://example.com",
      CONTENT_DIR: "content/",
      DEVTO_API_KEY: "dummy-key",
      NODE_ENV: "production",
    };

    const result = execSync(`node "${scriptPath}" --provider devto`, {
      encoding: "utf8",
      env,
      cwd: testDir,
    });

    expect(result).toContain("No markdown files to process");
  });
});
