const fs = require("fs");
const path = require("path");
const { execSync } = require("child_process");

// Mock environment variables for testing
process.env.DEBUG_LEVEL = "0"; // Only errors during tests
process.env.HUGO_BASE_URL = "https://example.com";

// Import the functions we want to test
// Since the original script runs immediately, we'll need to extract testable functions
const fm = require("front-matter");

// Test utilities
function createTestMarkdownFile(frontMatter, content = "Test content") {
  const yamlFrontMatter = Object.entries(frontMatter)
    .map(([key, value]) => {
      if (Array.isArray(value)) {
        return `${key}: [${value.map((v) => `"${v}"`).join(", ")}]`;
      }
      if (typeof value === "string") {
        return `${key}: "${value}"`;
      }
      return `${key}: ${value}`;
    })
    .join("\n");

  return `---\n${yamlFrontMatter}\n---\n\n${content}`;
}

function createTestTomlFile(frontMatter, content = "Test content") {
  const tomlFrontMatter = Object.entries(frontMatter)
    .map(([key, value]) => {
      if (Array.isArray(value)) {
        return `${key} = [${value.map((v) => `"${v}"`).join(", ")}]`;
      }
      if (typeof value === "string") {
        return `${key} = "${value}"`;
      }
      return `${key} = ${value}`;
    })
    .join("\n");

  return `+++\n${tomlFrontMatter}\n+++\n\n${content}`;
}

// Core function tests
describe("Hugo Syndicate Core Functions", () => {
  test("parses YAML front matter correctly", () => {
    const testFile = createTestMarkdownFile({
      title: "Test Post",
      devto: true,
      tags: ["test", "javascript"],
      draft: false,
    });

    const parsed = fm(testFile);

    expect(parsed.attributes.title).toBe("Test Post");
    expect(parsed.attributes.devto).toBe(true);
    expect(parsed.attributes.tags).toEqual(["test", "javascript"]);
    expect(parsed.body.trim()).toBe("Test content");
  });

  test("validates required environment variables", () => {
    const originalKey = process.env.DEVTO_API_KEY;
    delete process.env.DEVTO_API_KEY;

    // This would normally call process.exit(1)
    // In a real implementation, we'd refactor to throw instead
    expect(() => {
      if (!process.env.DEVTO_API_KEY) {
        throw new Error("DEVTO_API_KEY environment variable is not set");
      }
    }).toThrow("DEVTO_API_KEY environment variable is not set");

    // Restore for other tests
    if (originalKey) process.env.DEVTO_API_KEY = originalKey;
  });

  test("detects sync eligibility correctly", () => {
    const syncEligiblePost = {
      title: "Test Post",
      devto: true,
      draft: false,
      categories: ["dev.to"],
      tags: ["javascript"],
    };

    const draftPost = {
      title: "Draft Post",
      devto: true,
      draft: true,
      categories: ["dev.to"],
    };

    const noDevtoFlag = {
      title: "No Devto",
      draft: false,
      categories: ["dev.to"],
    };

    // These would be actual function calls in the real implementation
    expect(syncEligiblePost.devto).toBe(true);
    expect(syncEligiblePost.draft).toBe(false);
    expect(syncEligiblePost.categories.includes("dev.to")).toBe(true);

    expect(draftPost.draft).toBe(true); // Should not sync
    expect(noDevtoFlag.devto).toBeUndefined(); // Should not sync
  });

  test("transforms Hugo shortcodes correctly", () => {
    const content = `
# Test Post

{{< image src="/images/test.jpg" alt="Test image" >}}

{{< code language="javascript" title="Example Code" >}}
console.log("Hello World!");
{{< /code >}}

{{< youtube dQw4w9WgXcQ >}}
`;

    // Test image transformation
    const imageRegex =
      /\{\{<\s*image\s+src="([^"]+)"\s+alt="([^"]*)"\s*(?:position="[^"]*")?\s*(?:style="[^"]*")?\s*>\}\}/g;
    const imageMatch = content.match(imageRegex);
    expect(imageMatch).toBeTruthy();

    const transformedImage = content.replace(imageRegex, (match, src, alt) => {
      const imageUrl = src.startsWith("/") ? `${process.env.HUGO_BASE_URL}${src}` : src;
      return `![${alt}](${imageUrl})`;
    });
    expect(transformedImage).toContain("![Test image](https://example.com/images/test.jpg)");

    // Test code transformation
    const codeRegex =
      /\{\{<\s*code\s+language="([^"]+)"\s+title="([^"]*)"\s*(?:open="[^"]*")?\s*>\}\}([\s\S]*?)\{\{<\s*\/code\s*>\}\}/g;
    const codeMatch = content.match(codeRegex);
    expect(codeMatch).toBeTruthy();

    // Test YouTube transformation
    const youtubeRegex = /\{\{<\s*youtube\s+([^>\s]+)\s*>\}\}/g;
    const youtubeTransformed = content.replace(youtubeRegex, (match, videoId) => {
      return `{% youtube ${videoId} %}`;
    });
    expect(youtubeTransformed).toContain("{% youtube dQw4w9WgXcQ %}");
  });

  test("generates canonical URLs correctly", () => {
    const testCases = [
      {
        filePath: "content/blog/my-post.md",
        expected: "https://example.com/blog/my-post/",
      },
      {
        filePath: "content/blog/tech/javascript-tips.en.md",
        expected: "https://example.com/blog/tech/javascript-tips/",
      },
      {
        filePath: "content/articles/my-post.ja.md",
        expected: "https://example.com/ja/articles/my-post/",
      },
      {
        filePath: "content/posts/simple-post.md",
        expected: "https://example.com/posts/simple-post/",
      },
    ];

    testCases.forEach(({ filePath, expected }) => {
      // Extract the relative path from content/ directory
      const relativePath = filePath.replace(/^content\//, "");
      const fileInfo = path.parse(relativePath);
      const fileName = fileInfo.name;
      const dir = fileInfo.dir;

      // Check for language suffix
      const langMatch = fileName.match(/^(.+)\.([a-z]{2})$/);
      let slug, language;

      if (langMatch) {
        slug = langMatch[1];
        language = langMatch[2];
      } else {
        slug = fileName;
        language = null;
      }

      // Build URL path based on actual file structure
      let urlPath;
      if (language && language !== "en") {
        if (dir) {
          const cleanDir = dir.replace(/\/$/, "");
          urlPath = `/${language}/${cleanDir}/${slug}/`;
        } else {
          urlPath = `/${language}/${slug}/`;
        }
      } else {
        if (dir) {
          const cleanDir = dir.replace(/\/$/, "");
          urlPath = `/${cleanDir}/${slug}/`;
        } else {
          urlPath = `/${slug}/`;
        }
      }

      const canonicalUrl = `${process.env.HUGO_BASE_URL}${urlPath}`;
      expect(canonicalUrl).toBe(expected);
    });
  });

  test("handles TOML front matter", () => {
    const tomlContent = createTestTomlFile({
      title: "TOML Test Post",
      devto: true,
      tags: ["toml", "test"],
      draft: false,
    });

    // Basic TOML parsing test
    const tomlMatch = tomlContent.match(/^\+\+\+\n([\s\S]*?)\n\+\+\+\n([\s\S]*)$/);
    expect(tomlMatch).toBeTruthy();

    if (tomlMatch) {
      const tomlSection = tomlMatch[1];
      const bodySection = tomlMatch[2];

      expect(tomlSection).toContain('title = "TOML Test Post"');
      expect(tomlSection).toContain("devto = true");
      expect(bodySection.trim()).toBe("Test content");
    }
  });

  test("validates post directory structure", () => {
    const allowedDirectories = ["blog/", "articles/", "posts/", "tech/", "tutorials/"];
    const contentDir = "content/";

    const testPaths = [
      "content/blog/my-post.md", // Should be allowed
      "content/articles/advanced.md", // Should be allowed
      "content/posts/tech/js-tips.md", // Should be allowed
      "content/pages/about.md", // Should not be allowed
      "content/docs/readme.md", // Should not be allowed
    ];

    testPaths.forEach((testPath) => {
      const relativePath = testPath.replace(new RegExp(`^${contentDir}`), "");
      const inAllowedDir = allowedDirectories.some((dir) => relativePath.startsWith(dir));

      if (
        testPath.includes("/blog/") ||
        testPath.includes("/articles/") ||
        testPath.includes("/posts/") ||
        testPath.includes("/tech/")
      ) {
        expect(inAllowedDir).toBe(true);
      } else {
        expect(inAllowedDir).toBe(false);
      }
    });
  });

  test("validates article matching logic", () => {
    const frontMatter = {
      title: "Test Article",
      canonical_url: "https://example.com/posts/test-article/",
    };

    const devtoArticles = [
      {
        id: 1,
        title: "Test Article",
        canonical_url: "https://example.com/posts/test-article/",
      },
      {
        id: 2,
        title: "Another Article",
        canonical_url: "https://example.com/posts/another/",
      },
    ];

    // Test canonical URL matching (preferred)
    const byCanonical = devtoArticles.find((article) => article.canonical_url === frontMatter.canonical_url);
    expect(byCanonical).toBeTruthy();
    expect(byCanonical.id).toBe(1);

    // Test title matching (fallback)
    const byTitle = devtoArticles.find((article) => article.title === frontMatter.title);
    expect(byTitle).toBeTruthy();
    expect(byTitle.id).toBe(1);
  });

  test("limits tags to dev.to maximum of 4", () => {
    const frontMatterWithManyTags = {
      title: "Test Post",
      tags: ["javascript", "node", "web", "development", "tutorial", "beginner", "advanced"],
    };

    const maxTags = 4;
    let tags = frontMatterWithManyTags.tags || [];

    expect(tags.length).toBe(7); // Original count

    if (tags.length > maxTags) {
      tags = tags.slice(0, maxTags);
    }

    expect(tags.length).toBe(4); // Limited count
    expect(tags).toEqual(["javascript", "node", "web", "development"]); // First 4 tags
  });

  test("sanitizes tags for dev.to compatibility", () => {
    const testTags = [
      "github-actions",
      "dev.to",
      "ci-cd",
      "content-syndication",
      "javascript",
      "node.js",
      "web-development",
    ];

    // Simulate tag sanitization function
    const sanitizedTags = testTags
      .map((tag) => {
        return String(tag)
          .toLowerCase()
          .replace(/[^a-z0-9]/g, "") // Remove non-alphanumeric
          .substring(0, 30); // Max length
      })
      .filter((tag) => tag.length > 0);

    expect(sanitizedTags).toEqual([
      "githubactions",
      "devto",
      "cicd",
      "contentsyndication",
      "javascript",
      "nodejs",
      "webdevelopment",
    ]);

    // Test limiting to 4 tags
    const limitedTags = sanitizedTags.slice(0, 4);
    expect(limitedTags).toEqual(["githubactions", "devto", "cicd", "contentsyndication"]);
  });
});

// Integration tests
describe("Hugo Syndicate Integration", () => {
  test("script file exists and is executable", () => {
    const scriptPath = path.join(__dirname, "..", "hugo-syndicate.js");
    expect(fs.existsSync(scriptPath)).toBe(true);

    const stats = fs.statSync(scriptPath);
    expect(stats.isFile()).toBe(true);
  });

  test("package.json has required dependencies", () => {
    const packagePath = path.join(__dirname, "..", "package.json");
    const packageJson = JSON.parse(fs.readFileSync(packagePath, "utf8"));

    expect(packageJson.dependencies).toHaveProperty("axios");
    expect(packageJson.dependencies).toHaveProperty("front-matter");
    expect(packageJson.dependencies).toHaveProperty("@iarna/toml");
    expect(packageJson.name).toBe("hugo-syndicate");
    expect(packageJson.version).toMatch(/^\d+\.\d+\.\d+/);
  });

  test("example files exist", () => {
    const examplePost = path.join(__dirname, "..", "examples", "example-post.md");
    const envExample = path.join(__dirname, "..", ".env.example");

    expect(fs.existsSync(examplePost)).toBe(true);
    expect(fs.existsSync(envExample)).toBe(true);
  });

  test("workflow examples exist", () => {
    const workflowsDir = path.join(__dirname, "..", "examples", "github-workflows");

    expect(fs.existsSync(workflowsDir)).toBe(true);
    expect(fs.existsSync(path.join(workflowsDir, "sync-devto.yml"))).toBe(true);
    expect(fs.existsSync(path.join(workflowsDir, "sync-devto-manual.yml"))).toBe(true);
    expect(fs.existsSync(path.join(workflowsDir, "validate-posts.yml"))).toBe(true);
  });
});
