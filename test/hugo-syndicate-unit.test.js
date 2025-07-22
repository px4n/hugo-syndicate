const mockExecSync = jest.fn();
const mockCreateProvider = jest.fn();
const mockGetAvailableProviders = jest.fn(() => ["devto", "qiita"]);

// Mock dependencies
jest.mock("child_process", () => ({
  execSync: mockExecSync,
}));

jest.mock("../providers", () => ({
  createProvider: mockCreateProvider,
  getAvailableProviders: mockGetAvailableProviders,
}));

describe("Hugo Syndicate Unit Tests", () => {
  let originalEnv;
  let originalExit;
  let originalConsoleLog;
  let originalConsoleError;
  let exitCode;
  let consoleOutput;

  beforeAll(() => {
    originalEnv = process.env;
    originalExit = process.exit;
    originalConsoleLog = console.log;
    originalConsoleError = console.error;
  });

  beforeEach(() => {
    jest.resetModules();
    jest.clearAllMocks();

    // Reset environment
    process.env = { ...originalEnv, NODE_ENV: "test" };

    // Mock process.exit
    exitCode = null;
    process.exit = jest.fn((code) => {
      exitCode = code;
      throw new Error(`process.exit(${code})`);
    });

    // Mock console
    consoleOutput = [];
    console.log = jest.fn((...args) => consoleOutput.push(args.join(" ")));
    console.error = jest.fn((...args) => consoleOutput.push(args.join(" ")));
  });

  afterEach(() => {
    process.env = originalEnv;
    process.exit = originalExit;
    console.log = originalConsoleLog;
    console.error = originalConsoleError;
  });

  describe("parseHugoFile", () => {
    let parseHugoFile;
    let fs;

    beforeEach(() => {
      jest.resetModules();
      fs = require("fs");
      jest.spyOn(fs, "readFileSync");

      const hugo = require("../hugo-syndicate");
      parseHugoFile = hugo.parseHugoFile;
    });

    test("parses YAML front matter", () => {
      const yamlContent = `---
title: "Test Post"
description: "A test post"
tags: ["javascript", "testing"]
devto: true
draft: false
---

# Content

This is the body.`;

      fs.readFileSync.mockReturnValue(yamlContent);

      const result = parseHugoFile("/test/file.md");

      expect(result.attributes.title).toBe("Test Post");
      expect(result.attributes.description).toBe("A test post");
      expect(result.attributes.tags).toEqual(["javascript", "testing"]);
      expect(result.attributes.devto).toBe(true);
      expect(result.attributes.draft).toBe(false);
      expect(result.body).toContain("This is the body.");
    });

    test("parses TOML front matter", () => {
      const tomlContent = `+++
title = "Test Post"
description = "A test post"
tags = ["javascript", "testing"]
devto = true
draft = false
+++

# Content

This is the body.`;

      fs.readFileSync.mockReturnValue(tomlContent);

      const result = parseHugoFile("/test/file.md");

      expect(result.attributes.title).toBe("Test Post");
      expect(result.attributes.description).toBe("A test post");
      expect(result.attributes.tags).toEqual(["javascript", "testing"]);
      expect(result.attributes.devto).toBe(true);
      expect(result.attributes.draft).toBe(false);
      expect(result.body).toContain("This is the body.");
    });

    test("generates canonical URL when missing", () => {
      const content = `---
title: "Test Post"
---
Content`;

      fs.readFileSync.mockReturnValue(content);
      process.env.HUGO_BASE_URL = "https://example.com";

      const result = parseHugoFile("/content/blog/test-post.md");

      expect(result.attributes.canonical_url).toBeDefined();
      expect(result.attributes.canonical_url).toContain("https://example.com");
    });

    test("throws error for invalid front matter", () => {
      const invalidContent = `This is not valid front matter

Content`;

      fs.readFileSync.mockReturnValue(invalidContent);

      expect(() => parseHugoFile("/test/file.md")).toThrow();
    });
  });

  describe("shouldSyncPost", () => {
    let shouldSyncPost;

    beforeEach(() => {
      jest.resetModules();
      const hugo = require("../hugo-syndicate");
      shouldSyncPost = hugo.shouldSyncPost;
    });

    test("returns sync false for draft posts", () => {
      const result = shouldSyncPost({ draft: true, devto: true }, "/test/file.md", "devto");
      expect(result.sync).toBe(false);
      expect(result.reason).toContain("draft");
    });

    test("returns sync false when provider not enabled", () => {
      const result = shouldSyncPost({ devto: false }, "/test/file.md", "devto");
      expect(result.sync).toBe(false);
      expect(result.reason).toContain("syndication not enabled");
    });

    test("returns sync true when all conditions met", () => {
      process.env.CONTENT_DIR = "content/";
      const result = shouldSyncPost({ devto: true, draft: false }, "content/blog/file.md", "devto");
      expect(result.sync).toBe(true);
      expect(result.reason).toContain("validation checks passed");
    });

    test("respects syndicate flag", () => {
      process.env.CONTENT_DIR = "content/";
      const result = shouldSyncPost({ syndicate: true, draft: false }, "content/blog/file.md", "devto");
      expect(result.sync).toBe(true);
    });

    test("returns sync false for private posts", () => {
      const result = shouldSyncPost({ devto: true, visibility: "private" }, "/test/file.md", "devto");
      expect(result.sync).toBe(false);
      expect(result.reason).toContain("private");
    });
  });

  describe("generateCanonicalUrl", () => {
    let generateCanonicalUrl;

    beforeEach(() => {
      jest.resetModules();
      process.env.HUGO_BASE_URL = "https://example.com";
      const hugo = require("../hugo-syndicate");
      generateCanonicalUrl = hugo.generateCanonicalUrl;
    });

    test("generates URL with slug from filename", () => {
      process.env.CONTENT_DIR = "content/";
      const url = generateCanonicalUrl("content/blog/my-test-post.md", {});
      expect(url).toBe("https://example.com/blog/my-test-post/");
    });

    test("uses custom slug from front matter", () => {
      process.env.CONTENT_DIR = "content/";
      const url = generateCanonicalUrl("content/blog/my-test-post.md", { slug: "custom-slug" });
      expect(url).toBe("https://example.com/blog/custom-slug/");
    });

    test("handles language suffix", () => {
      process.env.CONTENT_DIR = "content/";
      const url = generateCanonicalUrl("content/blog/my-post.es.md", {});
      expect(url).toBe("https://example.com/es/blog/my-post/");
    });

    test("handles files without directory", () => {
      process.env.CONTENT_DIR = "content/";
      const url = generateCanonicalUrl("content/my-post.md", {});
      expect(url).toBe("https://example.com/my-post/");
    });
  });

  describe("getChangedFiles", () => {
    let getChangedFiles;
    let fs;

    beforeEach(() => {
      jest.resetModules();
      fs = require("fs");
      jest.spyOn(fs, "existsSync");
      jest.spyOn(fs, "readdirSync");
      jest.spyOn(fs, "statSync");

      // Clear all mocks
      mockExecSync.mockClear();

      const hugo = require("../hugo-syndicate");
      getChangedFiles = hugo.getChangedFiles;
    });

    test("returns all files when forceAll is true", async () => {
      fs.existsSync.mockReturnValue(true);
      fs.readdirSync.mockImplementation((dir) => {
        if (dir === "content/") return ["blog"];
        if (dir === "content/blog") return ["post1.md", "post2.md", "image.png"];
        return [];
      });
      fs.statSync.mockImplementation((path) => ({
        isDirectory: () => path.includes("blog") && !path.includes(".md"),
      }));

      const files = await getChangedFiles(true);

      expect(files).toHaveLength(2);
      expect(files).toContain("content/blog/post1.md");
      expect(files).toContain("content/blog/post2.md");
    });

    test("uses git diff when forceAll is false", async () => {
      process.env.CONTENT_DIR = "content/";
      // Mock successful git diff
      mockExecSync.mockReturnValue("content/blog/changed1.md\ncontent/blog/changed2.md\nREADME.md\n");

      const files = await getChangedFiles(false);

      expect(files).toHaveLength(2);
      expect(files).toContain("content/blog/changed1.md");
      expect(files).toContain("content/blog/changed2.md");
      expect(files).not.toContain("README.md");
    });

    test("handles git errors gracefully", async () => {
      mockExecSync.mockImplementation(() => {
        throw new Error("Not a git repository");
      });

      const files = await getChangedFiles(false);

      expect(files).toEqual([]);
    });

    test("handles initial commit scenario", async () => {
      process.env.CONTENT_DIR = "content/";

      let callCount = 0;
      mockExecSync.mockImplementation((cmd) => {
        callCount++;
        if (callCount === 1) {
          // First call - HEAD~1 fails
          throw new Error("HEAD~1 not found");
        } else {
          // Second call - ls-tree succeeds
          return "content/blog/initial.md\n";
        }
      });

      const files = await getChangedFiles(false);

      expect(files).toHaveLength(1);
      expect(files).toContain("content/blog/initial.md");
    });
  });

  describe("main function", () => {
    let main;
    let fs;

    beforeEach(() => {
      jest.resetModules();

      // Set required env vars
      process.env.HUGO_BASE_URL = "https://example.com";
      process.env.DEVTO_API_KEY = "test-key";

      fs = require("fs");
      jest.spyOn(fs, "readFileSync");
      jest.spyOn(fs, "existsSync").mockReturnValue(true);

      mockExecSync.mockReturnValue("");

      const hugo = require("../hugo-syndicate");
      main = hugo.main;
    });

    test("exits gracefully when no files to process", async () => {
      mockExecSync.mockReturnValue("");

      await main();

      expect(consoleOutput.join(" ")).toContain("No markdown files to process");
      expect(exitCode).toBeNull();
    });

    test("handles provider initialization errors", async () => {
      process.env.CONTENT_DIR = "content/";
      process.env.DEVTO_API_KEY = "test-key";

      // Mock git to return a file
      mockExecSync.mockReturnValue("content/blog/test.md\n");
      fs.readFileSync.mockReturnValue('---\ntitle: "Test"\ndevto: true\n---\nContent');

      // Make createProvider throw
      mockCreateProvider.mockImplementation(() => {
        throw new Error("Provider initialization failed");
      });

      try {
        await main();
      } catch (e) {
        // Expected to throw due to process.exit
      }

      expect(consoleOutput.join(" ")).toContain("Failed to initialize provider");
      expect(exitCode).toBe(1);
    });

    test("processes files with multiple providers", async () => {
      process.env.CONTENT_DIR = "content/";
      process.env.PROVIDERS = "devto";
      process.env.DEVTO_API_KEY = "test-key";

      // Mock git to return a file
      mockExecSync.mockReturnValue("content/blog/test.md\n");
      fs.readFileSync.mockReturnValue('---\ntitle: "Test"\ndevto: true\n---\nContent');

      const mockProvider = {
        authenticate: jest.fn().mockResolvedValue({ user: { name: "Test" } }),
        getArticles: jest.fn().mockResolvedValue([]),
        checkIfArticleExists: jest.fn().mockResolvedValue(null),
        createArticle: jest.fn().mockResolvedValue({ url: "https://example.com/article" }),
      };

      mockCreateProvider.mockReturnValue(mockProvider);

      await main();

      expect(mockCreateProvider).toHaveBeenCalledTimes(1);
      expect(mockProvider.createArticle).toHaveBeenCalledTimes(1);
      expect(consoleOutput.join(" ")).toContain("Synchronization completed successfully");
    });
  });

  describe("syncWithProvider", () => {
    let syncWithProvider;
    let fs;

    beforeEach(() => {
      jest.resetModules();
      fs = require("fs");
      jest.spyOn(fs, "existsSync").mockReturnValue(true);
      jest.spyOn(fs, "readFileSync");

      const hugo = require("../hugo-syndicate");
      syncWithProvider = hugo.syncWithProvider;
    });

    test("handles authentication failure", async () => {
      const mockProvider = {
        authenticate: jest.fn().mockRejectedValue(new Error("Auth failed")),
      };

      const result = await syncWithProvider(mockProvider, "devto", ["test.md"], {});

      expect(result.error).toBe("Auth failed");
      expect(result.processed).toBe(0);
    });

    test("creates new articles", async () => {
      const mockProvider = {
        authenticate: jest.fn().mockResolvedValue({ user: { name: "Test" } }),
        getArticles: jest.fn().mockResolvedValue([]),
        checkIfArticleExists: jest.fn().mockResolvedValue(null),
        createArticle: jest.fn().mockResolvedValue({ url: "https://example.com/new" }),
      };

      fs.readFileSync.mockReturnValue('---\ntitle: "New Post"\ndevto: true\n---\nContent');

      const result = await syncWithProvider(mockProvider, "devto", ["content/blog/new.md"], {});

      expect(mockProvider.createArticle).toHaveBeenCalled();
      expect(result.created).toBe(1);
      expect(result.updated).toBe(0);
    });

    test("updates existing articles", async () => {
      const mockProvider = {
        authenticate: jest.fn().mockResolvedValue({ user: { name: "Test" } }),
        getArticles: jest.fn().mockResolvedValue([{ id: 1, title: "Existing Post" }]),
        checkIfArticleExists: jest.fn().mockResolvedValue({ id: 1 }),
        updateArticle: jest.fn().mockResolvedValue({ url: "https://example.com/updated" }),
      };

      fs.readFileSync.mockReturnValue('---\ntitle: "Existing Post"\ndevto: true\n---\nUpdated content');

      const result = await syncWithProvider(mockProvider, "devto", ["content/blog/existing.md"], {});

      expect(mockProvider.updateArticle).toHaveBeenCalled();
      expect(result.created).toBe(0);
      expect(result.updated).toBe(1);
    });

    test("skips posts without titles", async () => {
      const mockProvider = {
        authenticate: jest.fn().mockResolvedValue({ user: { name: "Test" } }),
        getArticles: jest.fn().mockResolvedValue([]),
      };

      fs.readFileSync.mockReturnValue("---\ndevto: true\n---\nContent without title");

      const result = await syncWithProvider(mockProvider, "devto", ["content/blog/no-title.md"], {});

      expect(result.skipped).toBe(1);
      expect(result.processed).toBe(1);
    });

    test("handles file processing errors", async () => {
      const mockProvider = {
        authenticate: jest.fn().mockResolvedValue({ user: { name: "Test" } }),
        getArticles: jest.fn().mockResolvedValue([]),
      };

      fs.readFileSync.mockImplementation(() => {
        throw new Error("Read error");
      });

      const result = await syncWithProvider(mockProvider, "devto", ["content/blog/error.md"], {});

      expect(result.errors).toBe(1);
      expect(result.processed).toBe(1);
    });
  });
});
