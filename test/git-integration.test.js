const { execSync } = require("child_process");
const fs = require("fs");
const path = require("path");

describe("Git Integration", () => {
  let testDir;
  const originalCwd = process.cwd();

  beforeEach(() => {
    testDir = path.join(__dirname, `git-test-${Date.now()}`);
    fs.mkdirSync(testDir, { recursive: true });
    process.chdir(testDir);
  });

  afterEach(() => {
    process.chdir(originalCwd);
    if (fs.existsSync(testDir)) {
      fs.rmSync(testDir, { recursive: true, force: true });
    }
  });

  test("detects changed files in git diff", () => {
    execSync("git init", { stdio: "ignore" });
    execSync('git config user.email "test@example.com"', { stdio: "ignore" });
    execSync('git config user.name "Test User"', { stdio: "ignore" });
    fs.writeFileSync("file1.md", "content1");
    execSync("git add . && git commit -m 'Initial'", { stdio: "ignore" });
    fs.writeFileSync("file1.md", "content2");
    execSync("git add . && git commit -m 'Update'", { stdio: "ignore" });
    const diff = execSync("git diff --name-only HEAD~1 HEAD", { encoding: "utf8" });
    expect(diff.trim()).toBe("file1.md");
  });

  test("handles first commit without HEAD~1", () => {
    execSync("git init", { stdio: "ignore" });
    execSync('git config user.email "test@example.com"', { stdio: "ignore" });
    execSync('git config user.name "Test User"', { stdio: "ignore" });

    fs.writeFileSync("first.md", "content");
    execSync("git add . && git commit -m 'First'", { stdio: "ignore" });
    expect(() => {
      execSync("git diff --name-only HEAD~1 HEAD", { encoding: "utf8" });
    }).toThrow();
    const files = execSync("git ls-tree --name-only -r HEAD", { encoding: "utf8" });
    expect(files.trim()).toBe("first.md");
  });

  test("tracks multiple file changes", () => {
    execSync("git init", { stdio: "ignore" });
    execSync('git config user.email "test@example.com"', { stdio: "ignore" });
    execSync('git config user.name "Test User"', { stdio: "ignore" });
    fs.writeFileSync("unchanged.md", "stay same");
    execSync("git add . && git commit -m 'Initial'", { stdio: "ignore" });
    fs.writeFileSync("new1.md", "content1");
    fs.writeFileSync("new2.md", "content2");
    fs.unlinkSync("unchanged.md");

    execSync("git add . && git commit -m 'Changes'", { stdio: "ignore" });

    const diff = execSync("git diff --name-only HEAD~1 HEAD", { encoding: "utf8" });
    const files = diff.trim().split("\n").sort();

    expect(files).toContain("new1.md");
    expect(files).toContain("new2.md");
    expect(files).toContain("unchanged.md");
  });
});
