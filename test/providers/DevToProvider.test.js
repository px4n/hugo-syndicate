const axios = require("axios");
const DevToProvider = require("../../providers/devto/DevToProvider");

// Mock axios
jest.mock("axios");

describe("DevToProvider", () => {
  let provider;
  let consoleErrorSpy;

  beforeEach(() => {
    jest.clearAllMocks();
    provider = new DevToProvider({
      apiKey: "test-devto-key",
    });
    consoleErrorSpy = jest.spyOn(console, "error").mockImplementation();
  });

  afterEach(() => {
    consoleErrorSpy.mockRestore();
  });

  describe("constructor", () => {
    test("sets default baseUrl", () => {
      expect(provider.baseUrl).toBe("https://dev.to/api");
      expect(provider.name).toBe("dev.to");
      expect(provider.maxTags).toBe(4);
    });

    test("allows custom baseUrl", () => {
      const customProvider = new DevToProvider({
        apiKey: "test-key",
        baseUrl: "https://custom.dev.to/api",
      });
      expect(customProvider.baseUrl).toBe("https://custom.dev.to/api");
    });
  });

  describe("authenticate", () => {
    test("successful authentication", async () => {
      const mockResponse = {
        data: {
          name: "Test User",
          username: "testuser",
        },
      };
      axios.get.mockResolvedValue(mockResponse);

      const result = await provider.authenticate();

      expect(axios.get).toHaveBeenCalledWith("https://dev.to/api/users/me", {
        headers: { "api-key": "test-devto-key" },
      });
      expect(result).toEqual({
        success: true,
        user: {
          name: "Test User",
          username: "testuser",
        },
      });
    });

    test("handles authentication error", async () => {
      const error = {
        response: { status: 401, data: { message: "Unauthorized" } },
      };
      axios.get.mockRejectedValue(error);

      await expect(provider.authenticate()).rejects.toThrow("dev.to authentication failed: Unauthorized");
    });
  });

  describe("createArticle", () => {
    test("creates article successfully", async () => {
      const article = {
        title: "Test Article",
        content: "# Test Content",
        tags: ["javascript", "nodejs"],
        canonical_url: "https://example.com/test",
        description: "Test description",
        series: "Test Series",
        published: true,
      };

      // Standard test response data
      const mockResponse = {
        data: {
          id: 12345,
          url: "https://dev.to/testuser/test-article",
          published: true,
        },
      };
      axios.post.mockResolvedValue(mockResponse);

      const result = await provider.createArticle(article);

      expect(axios.post).toHaveBeenCalledWith(
        "https://dev.to/api/articles",
        {
          article: {
            title: "Test Article",
            published: true,
            body_markdown: "# Test Content",
            tags: ["javascript", "nodejs"],
            canonical_url: "https://example.com/test",
            series: "Test Series",
            description: "Test description",
          },
        },
        {
          headers: { "api-key": "test-devto-key" },
          timeout: 10000,
        }
      );

      expect(result).toEqual({
        id: 12345,
        url: "https://dev.to/testuser/test-article",
        published: true,
      });
    });

    test("handles empty description", async () => {
      const article = {
        title: "Test Article",
        content: "# Test Content",
        tags: ["javascript"],
        description: "",
        published: true,
      };

      axios.post.mockResolvedValue({
        data: {
          id: 123,
          url: "https://dev.to/testuser/test-article",
          published: true,
        },
      });

      await provider.createArticle(article);

      const callArgs = axios.post.mock.calls[0][1];
      expect(callArgs.article).not.toHaveProperty("description");
    });
  });

  describe("updateArticle", () => {
    test("updates article successfully", async () => {
      const article = {
        title: "Updated Article",
        content: "# Updated Content",
        tags: ["javascript"],
        published: true,
      };

      const mockResponse = {
        data: {
          id: 12345,
          url: "https://dev.to/testuser/updated-article",
          published: true,
        },
      };
      axios.put.mockResolvedValue(mockResponse);

      const result = await provider.updateArticle(12345, article);

      expect(axios.put).toHaveBeenCalledWith(
        "https://dev.to/api/articles/12345",
        {
          article: {
            title: "Updated Article",
            published: true,
            body_markdown: "# Updated Content",
            tags: ["javascript"],
          },
        },
        {
          headers: { "api-key": "test-devto-key" },
          timeout: 10000,
        }
      );

      expect(result).toEqual({
        id: 12345,
        url: "https://dev.to/testuser/updated-article",
        published: true,
      });
    });
  });

  describe("getArticles", () => {
    test("fetches both published and unpublished articles", async () => {
      const publishedArticles = [
        { id: 1, title: "Published 1", tag_list: ["tag1"], published: true },
        { id: 2, title: "Published 2", tag_list: ["tag2"], published: true },
      ];

      const unpublishedArticles = [{ id: 3, title: "Draft 1", tag_list: ["tag3"], published: false }];

      axios.get.mockResolvedValueOnce({ data: publishedArticles }).mockResolvedValueOnce({ data: unpublishedArticles });

      const result = await provider.getArticles();

      expect(axios.get).toHaveBeenCalledTimes(2);
      expect(axios.get).toHaveBeenCalledWith("https://dev.to/api/articles/me/published", {
        headers: { "api-key": "test-devto-key" },
        timeout: 10000,
      });
      expect(axios.get).toHaveBeenCalledWith("https://dev.to/api/articles/me/unpublished", {
        headers: { "api-key": "test-devto-key" },
        timeout: 10000,
      });

      expect(result).toHaveLength(3);
      expect(result[0]).toEqual({
        id: 1,
        title: "Published 1",
        url: undefined,
        canonical_url: undefined,
        published: true,
        tags: ["tag1"],
      });
    });

    test("handles empty article lists", async () => {
      axios.get.mockResolvedValueOnce({ data: null }).mockResolvedValueOnce({ data: [] });

      const result = await provider.getArticles();
      expect(result).toEqual([]);
    });
  });

  describe("deleteArticle", () => {
    test("unpublishes article (dev.to does not support delete)", async () => {
      axios.put.mockResolvedValue({ data: {} });

      const result = await provider.deleteArticle(12345);

      expect(axios.put).toHaveBeenCalledWith(
        "https://dev.to/api/articles/12345",
        {
          article: {
            published: false,
            body_markdown: expect.stringContaining("This article has been removed"),
          },
        },
        {
          headers: { "api-key": "test-devto-key" },
          timeout: 10000,
        }
      );

      expect(result).toEqual({ success: true, unpublished: true });
    });
  });

  describe("checkIfArticleExists", () => {
    test("finds article by canonical URL", async () => {
      const articles = [
        { id: 1, title: "Article 1", canonical_url: "https://example.com/article1" },
        { id: 2, title: "Article 2", canonical_url: "https://example.com/article2" },
      ];

      axios.get.mockResolvedValueOnce({ data: articles }).mockResolvedValueOnce({ data: [] });

      const result = await provider.checkIfArticleExists("https://example.com/article2", "Some Title");

      expect(result).toEqual({
        id: 2,
        title: "Article 2",
        url: undefined,
        canonical_url: "https://example.com/article2",
        published: undefined,
        tags: [],
      });
    });

    test("finds article by title when no canonical URL match", async () => {
      const articles = [
        { id: 1, title: "Article 1" },
        { id: 2, title: "Article 2" },
      ];

      axios.get.mockResolvedValueOnce({ data: articles }).mockResolvedValueOnce({ data: [] });

      const result = await provider.checkIfArticleExists(null, "Article 2");

      expect(result).toEqual({
        id: 2,
        title: "Article 2",
        url: undefined,
        canonical_url: undefined,
        published: undefined,
        tags: [],
      });
    });

    test("returns null when no match found", async () => {
      axios.get.mockResolvedValueOnce({ data: [] }).mockResolvedValueOnce({ data: [] });

      const result = await provider.checkIfArticleExists("https://example.com/notfound", "Not Found");
      expect(result).toBeNull();
    });
  });

  describe("transformContent", () => {
    test("transforms Hugo image shortcode", () => {
      const content = '{{< image src="/images/test.jpg" alt="Test image" >}}';
      const result = provider.transformContent(content);
      expect(result).toBe("![Test image](https://yoursite.com/images/test.jpg)");
    });

    test("transforms Hugo code shortcode with title", () => {
      const content = `{{< code language="javascript" title="Example" >}}
console.log("Hello");
{{< /code >}}`;
      const result = provider.transformContent(content);
      expect(result).toContain("**Example**");
      expect(result).toContain("```javascript");
      expect(result).toContain('console.log("Hello");');
      expect(result).toContain("```");
    });

    test("transforms Hugo code shortcode without title", () => {
      const content = `{{< code language="javascript" title="" >}}
console.log("Hello");
{{< /code >}}`;
      const result = provider.transformContent(content);
      expect(result).toBe('```javascript\nconsole.log("Hello");\n```');
    });

    test("transforms YouTube shortcode", () => {
      const content = "{{< youtube dQw4w9WgXcQ >}}";
      const result = provider.transformContent(content);
      expect(result).toBe("{% youtube dQw4w9WgXcQ %}");
    });

    test("transforms Twitter shortcode", () => {
      const content = "{{< twitter 1234567890 >}}";
      const result = provider.transformContent(content);
      expect(result).toBe("{% twitter 1234567890 %}");
    });

    test("transforms Gist shortcode", () => {
      const content = "{{< gist username 1234567890abcdef >}}";
      const result = provider.transformContent(content);
      expect(result).toBe("{% gist 1234567890abcdef %}");
    });

    test("handles multiple shortcodes", () => {
      const content = `# Article

{{< image src="/img1.jpg" alt="Image 1" >}}

Some text

{{< youtube abc123 >}}

More text

{{< code language="python" title="Example" >}}
print("Hello")
{{< /code >}}`;

      const result = provider.transformContent(content);
      expect(result).toContain("![Image 1](https://yoursite.com/img1.jpg)");
      expect(result).toContain("{% youtube abc123 %}");
      expect(result).toContain("**Example**");
      expect(result).toContain('```python\nprint("Hello")\n```');
    });
  });

  describe("formatTags", () => {
    test("sanitizes tags correctly", () => {
      const tags = ["Java-Script", "Node.js", "web-development", "123numbers"];
      const result = provider.formatTags(tags);
      expect(result).toEqual(["javascript", "nodejs", "webdevelopment", "123numbers"]);
    });

    test("removes empty tags after sanitization", () => {
      const tags = ["valid", "!!!", "...", "another-valid"];
      const result = provider.formatTags(tags);
      expect(result).toEqual(["valid", "anothervalid"]);
    });

    test("limits tags to maxTags (4)", () => {
      const tags = ["tag1", "tag2", "tag3", "tag4", "tag5", "tag6"];
      const result = provider.formatTags(tags);
      expect(result).toHaveLength(4);
      expect(result).toEqual(["tag1", "tag2", "tag3", "tag4"]);
    });

    test("truncates long tags to 30 characters", () => {
      const tags = ["thistagiswaytooooooooooooooooooooooolong"];
      const result = provider.formatTags(tags);
      expect(result[0]).toHaveLength(30);
      expect(result[0]).toBe("thistagiswaytooooooooooooooooo");
    });

    test("handles null/undefined tags", () => {
      expect(provider.formatTags(null)).toEqual([]);
      expect(provider.formatTags(undefined)).toEqual([]);
      expect(provider.formatTags([])).toEqual([]);
    });
  });

  describe("getHeaders", () => {
    test("returns correct headers", () => {
      const headers = provider.getHeaders();
      expect(headers).toEqual({
        "api-key": "test-devto-key",
      });
    });
  });
});
