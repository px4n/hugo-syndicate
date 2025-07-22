const fm = require("front-matter");
const TOML = require("@iarna/toml");

describe("Hugo Syndicate Coverage Tests", () => {
  describe("TOML Parsing", () => {
    test("parses TOML front matter with all field types", () => {
      const tomlContent = `+++
title = "Test Post"
description = "A test post"
date = "2025-01-09"
tags = ["javascript", "testing", "node"]
categories = ["tech"]
series = "Testing Series"
devto = true
qiita = false
draft = false
weight = 100
[params]
author = "Test Author"
+++

# Content

This is the body.`;

      const tomlMatch = tomlContent.match(/^\+\+\+([\s\S]*?)\+\+\+/);
      const parsed = TOML.parse(tomlMatch[1]);

      expect(parsed.title).toBe("Test Post");
      expect(parsed.description).toBe("A test post");
      expect(parsed.date).toBe("2025-01-09");
      expect(parsed.tags).toEqual(["javascript", "testing", "node"]);
      expect(parsed.devto).toBe(true);
      expect(parsed.qiita).toBe(false);
      expect(parsed.draft).toBe(false);
      expect(parsed.weight).toBe(100);
      expect(parsed.params.author).toBe("Test Author");
    });

    test("handles TOML parsing errors", () => {
      const invalidTOML = `+++
title = "Unclosed string
date = 2025-01-09
+++`;

      const tomlMatch = invalidTOML.match(/^\+\+\+([\s\S]*?)\+\+\+/);

      expect(() => {
        TOML.parse(tomlMatch[1]);
      }).toThrow();
    });

    test("handles empty TOML front matter", () => {
      const emptyTOML = `+++
+++

Content`;

      const tomlMatch = emptyTOML.match(/^\+\+\+([\s\S]*?)\+\+\+/);
      const parsed = TOML.parse(tomlMatch[1]);

      expect(parsed).toEqual({});
    });
  });

  describe("URL Slug Generation", () => {
    test("generates clean slugs from various inputs", () => {
      const testCases = [
        { input: "Simple Title", expected: "simple-title" },
        { input: "Title with Numbers 123", expected: "title-with-numbers-123" },
        { input: "Special!@#$%^&*()Characters", expected: "special-characters" },
        { input: "Multiple   Spaces", expected: "multiple-spaces" },
        { input: "Trailing-Dashes---", expected: "trailing-dashes" },
        { input: "---Leading-Dashes", expected: "leading-dashes" },
        { input: "CamelCaseTitle", expected: "camelcasetitle" },
        { input: "Title_with_underscores", expected: "title-with-underscores" },
        { input: "Ação Português", expected: "a-o-portugu-s" },
        { input: "日本語タイトル", expected: "" },
      ];

      testCases.forEach(({ input, expected }) => {
        const slug = input
          .toLowerCase()
          .replace(/[^a-z0-9-]/g, "-")
          .replace(/-+/g, "-")
          .replace(/^-|-$/g, "");

        expect(slug).toBe(expected);
      });
    });

    test("generates date-based permalinks", () => {
      const dates = [
        { date: "2025-01-09", expected: { year: "2025", month: "01" } },
        { date: "2024-12-31", expected: { year: "2024", month: "12" } },
        { date: "2023-07-04", expected: { year: "2023", month: "07" } },
        { date: "2025-1-9", expected: { year: "2025", month: "1" } }, // Non-padded
      ];

      dates.forEach(({ date, expected }) => {
        const parts = date.split("-");
        expect(parts[0]).toBe(expected.year);
        expect(parts[1]).toBe(expected.month);
      });
    });
  });

  describe("File Filtering Logic", () => {
    test("filters posts by provider and draft status", () => {
      const posts = [
        { title: "Post 1", devto: true, qiita: false, draft: false },
        { title: "Post 2", devto: false, qiita: true, draft: false },
        { title: "Post 3", devto: true, qiita: true, draft: false },
        { title: "Post 4", devto: true, qiita: true, draft: true },
        { title: "Post 5", devto: false, qiita: false, draft: false },
        { title: "Post 6", devto: true, qiita: false, draft: true },
      ];

      // Test filtering for dev.to
      const devtoPosts = posts.filter((p) => p.devto && !p.draft);
      expect(devtoPosts.length).toBe(2);
      expect(devtoPosts.map((p) => p.title)).toEqual(["Post 1", "Post 3"]);

      // Test filtering for Qiita
      const qiitaPosts = posts.filter((p) => p.qiita && !p.draft);
      expect(qiitaPosts.length).toBe(2);
      expect(qiitaPosts.map((p) => p.title)).toEqual(["Post 2", "Post 3"]);

      // Test draft filtering
      const publishedPosts = posts.filter((p) => !p.draft);
      expect(publishedPosts.length).toBe(4);
    });

    test("validates required fields for syncing", () => {
      const posts = [
        { title: "Valid Post", content: "Content", valid: true },
        { title: "", content: "Content", valid: false },
        { title: null, content: "Content", valid: false },
        { title: undefined, content: "Content", valid: false },
        { content: "Content only", valid: false },
        { title: "Title only", valid: true },
      ];

      posts.forEach((post) => {
        const isValid = !!post.title;
        expect(isValid).toBe(post.valid);
      });
    });
  });

  describe("Orphaned Article Detection", () => {
    test("identifies orphaned articles", () => {
      const remoteArticles = [
        { id: 1, canonical_url: "https://example.com/2025/01/post-1/" },
        { id: 2, canonical_url: "https://example.com/2025/01/post-2/" },
        { id: 3, canonical_url: "https://example.com/2025/01/post-3/" },
        { id: 4, canonical_url: null }, // No URL
        { id: 5, canonical_url: "" }, // Empty URL
      ];

      const localUrls = new Set(["https://example.com/2025/01/post-1/", "https://example.com/2025/01/post-3/"]);

      const orphaned = remoteArticles.filter((article) => {
        if (!article.canonical_url) return false;
        return !localUrls.has(article.canonical_url);
      });

      expect(orphaned.length).toBe(1);
      expect(orphaned[0].id).toBe(2);
    });

    test("handles articles without canonical URLs", () => {
      const articles = [
        { id: 1, canonical_url: null },
        { id: 2, canonical_url: "" },
        { id: 3, canonical_url: undefined },
      ];

      const withUrls = articles.filter((a) => a.canonical_url);
      expect(withUrls.length).toBe(0);
    });
  });

  describe("Error Recovery", () => {
    test("continues processing after individual file errors", () => {
      const files = [
        { name: "file1.md", shouldFail: false },
        { name: "file2.md", shouldFail: true },
        { name: "file3.md", shouldFail: false },
        { name: "file4.md", shouldFail: true },
        { name: "file5.md", shouldFail: false },
      ];

      const processed = [];
      const errors = [];

      files.forEach((file) => {
        try {
          if (file.shouldFail) {
            throw new Error(`Failed to process ${file.name}`);
          }
          processed.push(file.name);
        } catch (error) {
          errors.push({ file: file.name, error: error.message });
        }
      });

      expect(processed).toEqual(["file1.md", "file3.md", "file5.md"]);
      expect(errors).toHaveLength(2);
      expect(errors[0].file).toBe("file2.md");
      expect(errors[1].file).toBe("file4.md");
    });

    test("aggregates sync results across providers", () => {
      const providers = ["devto", "qiita", "medium"];
      const results = {
        devto: { success: true, synced: 3 },
        qiita: { success: false, error: "Auth failed" },
        medium: { success: true, synced: 2 },
      };

      const successCount = Object.values(results).filter((r) => r.success).length;
      const failedProviders = Object.entries(results)
        .filter(([_, r]) => !r.success)
        .map(([provider, _]) => provider);

      const totalSynced = Object.values(results)
        .filter((r) => r.success)
        .reduce((sum, r) => sum + r.synced, 0);

      expect(successCount).toBe(2);
      expect(failedProviders).toEqual(["qiita"]);
      expect(totalSynced).toBe(5);
    });
  });

  describe("Git Integration", () => {
    test("parses git diff output", () => {
      const gitOutput = `content/blog/post1.md
content/blog/post2.md
content/pages/about.md
static/images/logo.png
content/blog/post3.md`;

      const lines = gitOutput.split("\n").filter((line) => line.trim());
      const mdFiles = lines.filter((file) => file.endsWith(".md"));

      expect(mdFiles).toHaveLength(4);
      expect(mdFiles).toContain("content/blog/post1.md");
      expect(mdFiles).toContain("content/pages/about.md");
      expect(mdFiles).not.toContain("static/images/logo.png");
    });

    test("handles empty git diff", () => {
      const gitOutput = "";
      const lines = gitOutput.split("\n").filter((line) => line.trim());

      expect(lines).toHaveLength(0);
    });
  });
});
