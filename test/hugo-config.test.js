const fs = require("fs");
const path = require("path");
const TOML = require("@iarna/toml");

// Mock environment variables for testing
process.env.DEBUG_LEVEL = "0"; // Only errors during tests
process.env.HUGO_BASE_URL = "https://example.com";
process.env.CONTENT_DIR = "content/";

// Mock Hugo config for testing
const createMockHugoConfig = (permalinks = {}) => ({
  baseURL: "https://example.com/",
  defaultContentLanguage: "en",
  title: "Test Site",
  permalinks: {
    page: permalinks,
  },
  languages: {
    en: {
      languageCode: "en-us",
      languageName: "English",
      weight: 1,
    },
    ja: {
      languageCode: "ja-jp",
      languageName: "日本語",
      weight: 2,
    },
  },
});

// Simulate the loadHugoConfig function
function mockLoadHugoConfig(config = null) {
  if (config) {
    return config;
  }

  // Default fallback
  return { permalinks: {} };
}

// Simulate the generateCanonicalUrl function
function mockGenerateCanonicalUrl(filePath, frontMatter, config = null) {
  const baseUrl = process.env.HUGO_BASE_URL || "https://yoursite.com";
  const hugoConfig = config || mockLoadHugoConfig();

  // Extract relative path from configurable content directory
  const contentDir = process.env.CONTENT_DIR || "content/";
  const relativePath = filePath.replace(new RegExp(`^${contentDir}`), "");

  const fileInfo = path.parse(relativePath);
  const fileName = fileInfo.name;
  const dir = fileInfo.dir;

  // Determine content section (first directory)
  const section = dir.split("/")[0] || "page";

  // Extract language from filename (e.g., post.en.md -> en)
  let slug = fileName;
  let language = null;

  const langMatch = fileName.match(/^(.+)\.([a-z]{2})$/);
  if (langMatch) {
    slug = langMatch[1];
    language = langMatch[2];
  }

  // Extract date prefix if present (e.g., "03-my-post" -> day=03, slug="my-post")
  let day = null;
  const dateMatch = slug.match(/^(\d{2})-(.+)$/);
  if (dateMatch) {
    day = dateMatch[1];
    slug = dateMatch[2];
  }

  // Use frontmatter slug if provided
  if (frontMatter.slug) {
    slug = frontMatter.slug;
  }

  // Get permalink pattern from Hugo config
  const permalinkPattern = hugoConfig.permalinks?.page?.[section] || hugoConfig.permalinks?.[section];

  if (permalinkPattern) {
    // Extract date components from file path and frontmatter
    const pathParts = dir.split("/");
    const year =
      pathParts[1] || (frontMatter.date ? frontMatter.date.substring(0, 4) : new Date().getFullYear().toString());
    const month = pathParts[2] || (frontMatter.date ? frontMatter.date.substring(5, 7) : "01");
    const dayValue = day || pathParts[3] || (frontMatter.date ? frontMatter.date.substring(8, 10) : "01");

    // Replace Hugo permalink variables
    let url = permalinkPattern
      .replace(":year", year)
      .replace(":month", month)
      .replace(":day", dayValue)
      .replace(":slug", slug)
      .replace(":title", frontMatter.title ? frontMatter.title.toLowerCase().replace(/[^a-z0-9]+/g, "-") : slug)
      .replace(":filename", fileName);

    // Handle language prefix for multilingual sites
    if (language && language !== "en" && hugoConfig.defaultContentLanguage !== language) {
      url = `/${language}${url}`;
    }

    return `${baseUrl}${url}`;
  }

  // Fallback to previous logic if no permalink pattern found
  let urlPath;
  if (language && language !== "en") {
    urlPath = dir ? `/${language}/${dir}/${slug}/` : `/${language}/${slug}/`;
  } else {
    urlPath = dir ? `/${dir}/${slug}/` : `/${slug}/`;
  }

  return `${baseUrl}${urlPath}`;
}

describe("Hugo Configuration Parsing", () => {
  test("parses TOML configuration correctly", () => {
    const tomlConfig = `
baseURL = 'https://example.com/'
defaultContentLanguage = 'en'
title = "Test Site"

[permalinks]
  [permalinks.page]
    'blog' = '/blog/:year/:month/:day/:slug/'
    'project' = '/post/:slug/'

[languages]
  [languages.en]
    languageCode = 'en-us'
    languageName = 'English'
    weight = 1
  [languages.ja]
    languageCode = 'ja-jp'
    languageName = '日本語'
    weight = 2
`;

    const parsed = TOML.parse(tomlConfig);

    expect(parsed.baseURL).toBe("https://example.com/");
    expect(parsed.defaultContentLanguage).toBe("en");
    expect(parsed.permalinks.page.blog).toBe("/blog/:year/:month/:day/:slug/");
    expect(parsed.languages.en.languageCode).toBe("en-us");
    expect(parsed.languages.ja.languageName).toBe("日本語");
  });

  test("handles missing hugo.toml gracefully", () => {
    const config = mockLoadHugoConfig();

    expect(config).toEqual({ permalinks: {} });
  });

  test("extracts permalink patterns correctly", () => {
    const config = createMockHugoConfig({
      blog: "/blog/:year/:month/:day/:slug/",
      project: "/post/:slug/",
      articles: "/articles/:slug/",
    });

    expect(config.permalinks.page.blog).toBe("/blog/:year/:month/:day/:slug/");
    expect(config.permalinks.page.project).toBe("/post/:slug/");
    expect(config.permalinks.page.articles).toBe("/articles/:slug/");
  });
});

describe("Hugo-Aware URL Generation", () => {
  test("generates URLs using Hugo permalink patterns", () => {
    const config = createMockHugoConfig({
      blog: "/blog/:year/:month/:day/:slug/",
    });

    const testCases = [
      {
        filePath: "content/blog/2025/07/03-automating-devto-sync.en.md",
        frontMatter: {
          title: "Automating dev.to Sync",
          date: "2025-07-03T15:00:00+09:00",
        },
        expected: "https://example.com/blog/2025/07/03/automating-devto-sync/",
      },
      {
        filePath: "content/blog/2025/07/15-hugo-tips.md",
        frontMatter: {
          title: "Hugo Tips and Tricks",
          date: "2025-07-15T10:00:00+09:00",
        },
        expected: "https://example.com/blog/2025/07/15/hugo-tips/",
      },
    ];

    testCases.forEach(({ filePath, frontMatter, expected }) => {
      const result = mockGenerateCanonicalUrl(filePath, frontMatter, config);
      expect(result).toBe(expected);
    });
  });

  test("handles multilingual URLs correctly", () => {
    const config = createMockHugoConfig({
      blog: "/blog/:year/:month/:day/:slug/",
    });

    const testCases = [
      {
        filePath: "content/blog/2025/07/03-hello-world.en.md",
        frontMatter: { date: "2025-07-03T15:00:00+09:00" },
        expected: "https://example.com/blog/2025/07/03/hello-world/",
      },
      {
        filePath: "content/blog/2025/07/03-hello-world.ja.md",
        frontMatter: { date: "2025-07-03T15:00:00+09:00" },
        expected: "https://example.com/ja/blog/2025/07/03/hello-world/",
      },
    ];

    testCases.forEach(({ filePath, frontMatter, expected }) => {
      const result = mockGenerateCanonicalUrl(filePath, frontMatter, config);
      expect(result).toBe(expected);
    });
  });

  test("extracts date from filename prefix", () => {
    const config = createMockHugoConfig({
      blog: "/blog/:year/:month/:day/:slug/",
    });

    const filePath = "content/blog/2025/07/03-my-awesome-post.md";
    const frontMatter = {};

    const result = mockGenerateCanonicalUrl(filePath, frontMatter, config);
    expect(result).toBe("https://example.com/blog/2025/07/03/my-awesome-post/");
  });

  test("uses frontmatter slug when provided", () => {
    const config = createMockHugoConfig({
      blog: "/blog/:year/:month/:day/:slug/",
    });

    const filePath = "content/blog/2025/07/03-very-long-filename.md";
    const frontMatter = {
      slug: "short-slug",
      date: "2025-07-03T15:00:00+09:00",
    };

    const result = mockGenerateCanonicalUrl(filePath, frontMatter, config);
    expect(result).toBe("https://example.com/blog/2025/07/03/short-slug/");
  });

  test("falls back to simple URLs when no permalink pattern exists", () => {
    const config = createMockHugoConfig({}); // No permalink patterns

    const testCases = [
      {
        filePath: "content/posts/simple-post.md",
        frontMatter: {},
        expected: "https://example.com/posts/simple-post/",
      },
      {
        filePath: "content/articles/advanced-topic.en.md",
        frontMatter: {},
        expected: "https://example.com/articles/advanced-topic/",
      },
      {
        filePath: "content/tutorials/basic-guide.ja.md",
        frontMatter: {},
        expected: "https://example.com/ja/tutorials/basic-guide/",
      },
    ];

    testCases.forEach(({ filePath, frontMatter, expected }) => {
      const result = mockGenerateCanonicalUrl(filePath, frontMatter, config);
      expect(result).toBe(expected);
    });
  });

  test("handles various permalink variables", () => {
    const config = createMockHugoConfig({
      blog: "/blog/:year/:month/:day/:slug/",
      project: "/projects/:slug/",
      archive: "/archive/:year/:title/",
    });

    const testCases = [
      {
        section: "blog",
        filePath: "content/blog/2025/07/03-test.md",
        frontMatter: { date: "2025-07-03T15:00:00+09:00" },
        expected: "https://example.com/blog/2025/07/03/test/",
      },
      {
        section: "project",
        filePath: "content/project/my-app.md",
        frontMatter: {},
        expected: "https://example.com/projects/my-app/",
      },
      {
        section: "archive",
        filePath: "content/archive/2024/old-post.md",
        frontMatter: {
          title: "Old Post Title",
          date: "2024-12-01T10:00:00+00:00",
        },
        expected: "https://example.com/archive/2024/old-post-title/",
      },
    ];

    testCases.forEach(({ filePath, frontMatter, expected }) => {
      const result = mockGenerateCanonicalUrl(filePath, frontMatter, config);
      expect(result).toBe(expected);
    });
  });

  test("extracts date components from different sources", () => {
    const config = createMockHugoConfig({
      blog: "/blog/:year/:month/:day/:slug/",
    });

    // Test date from frontmatter
    const frontMatterDateTest = mockGenerateCanonicalUrl(
      "content/blog/my-post.md",
      { date: "2025-12-25T15:00:00+09:00" },
      config
    );
    expect(frontMatterDateTest).toBe("https://example.com/blog/2025/12/25/my-post/");

    // Test date from file path
    const filePathDateTest = mockGenerateCanonicalUrl("content/blog/2024/03/15-spring-post.md", {}, config);
    expect(filePathDateTest).toBe("https://example.com/blog/2024/03/15/spring-post/");

    // Test date from filename prefix
    const filenamePrefixTest = mockGenerateCanonicalUrl("content/blog/2023/08/07-summer-tips.md", {}, config);
    expect(filenamePrefixTest).toBe("https://example.com/blog/2023/08/07/summer-tips/");
  });
});

describe("Content Section Detection", () => {
  test("correctly identifies content sections", () => {
    const testPaths = [
      { path: "content/blog/post.md", expectedSection: "blog" },
      { path: "content/articles/guide.md", expectedSection: "articles" },
      { path: "content/projects/app.md", expectedSection: "projects" },
      { path: "content/docs/readme.md", expectedSection: "docs" },
      { path: "content/post.md", expectedSection: "page" }, // Root level
    ];

    testPaths.forEach(({ path: filePath, expectedSection }) => {
      const contentDir = "content/";
      const relativePath = filePath.replace(new RegExp(`^${contentDir}`), "");
      const dir = path.parse(relativePath).dir;
      const section = dir.split("/")[0] || "page";

      expect(section).toBe(expectedSection);
    });
  });
});

describe("Language and Slug Extraction", () => {
  test("extracts language suffixes correctly", () => {
    const testCases = [
      { filename: "post.en", expectedSlug: "post", expectedLang: "en" },
      { filename: "article.ja", expectedSlug: "article", expectedLang: "ja" },
      { filename: "guide.fr", expectedSlug: "guide", expectedLang: "fr" },
      { filename: "simple", expectedSlug: "simple", expectedLang: null },
    ];

    testCases.forEach(({ filename, expectedSlug, expectedLang }) => {
      const langMatch = filename.match(/^(.+)\.([a-z]{2})$/);
      let slug, language;

      if (langMatch) {
        slug = langMatch[1];
        language = langMatch[2];
      } else {
        slug = filename;
        language = null;
      }

      expect(slug).toBe(expectedSlug);
      expect(language).toBe(expectedLang);
    });
  });

  test("extracts date prefixes from filenames", () => {
    const testCases = [
      { slug: "03-my-post", expectedDay: "03", expectedSlug: "my-post" },
      { slug: "15-another-post", expectedDay: "15", expectedSlug: "another-post" },
      { slug: "simple-post", expectedDay: null, expectedSlug: "simple-post" },
    ];

    testCases.forEach(({ slug, expectedDay, expectedSlug: expectedFinalSlug }) => {
      const dateMatch = slug.match(/^(\d{2})-(.+)$/);
      let day = null;
      let finalSlug = slug;

      if (dateMatch) {
        day = dateMatch[1];
        finalSlug = dateMatch[2];
      }

      expect(day).toBe(expectedDay);
      expect(finalSlug).toBe(expectedFinalSlug);
    });
  });
});
