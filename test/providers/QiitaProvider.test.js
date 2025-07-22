const axios = require("axios");
const QiitaProvider = require("../../providers/qiita/QiitaProvider");

// Mock axios
jest.mock("axios");

describe("QiitaProvider", () => {
  let provider;
  let consoleErrorSpy;

  beforeEach(() => {
    jest.clearAllMocks();
    provider = new QiitaProvider({
      apiKey: "test-qiita-token",
    });
    consoleErrorSpy = jest.spyOn(console, "error").mockImplementation();
  });

  afterEach(() => {
    consoleErrorSpy.mockRestore();
  });

  describe("constructor", () => {
    test("sets default baseUrl", () => {
      expect(provider.baseUrl).toBe("https://qiita.com/api/v2");
      expect(provider.name).toBe("Qiita");
    });

    test("allows custom baseUrl", () => {
      const customProvider = new QiitaProvider({
        apiKey: "test-key",
        baseUrl: "https://custom.qiita.com/api/v2",
      });
      expect(customProvider.baseUrl).toBe("https://custom.qiita.com/api/v2");
    });
  });

  describe("authenticate", () => {
    test("successful authentication", async () => {
      const mockResponse = {
        data: {
          id: "testuser",
          name: "Test User",
          description: "Test description",
        },
      };
      axios.get.mockResolvedValue(mockResponse);

      const result = await provider.authenticate();

      expect(axios.get).toHaveBeenCalledWith("https://qiita.com/api/v2/authenticated_user", {
        headers: {
          Authorization: "Bearer test-qiita-token",
          "Content-Type": "application/json",
        },
      });
      expect(result).toEqual({
        success: true,
        user: {
          id: "testuser",
          name: "Test User",
          description: "Test description",
        },
      });
    });

    test("handles authentication error", async () => {
      const error = {
        response: { status: 401, data: { message: "Unauthorized" } },
      };
      axios.get.mockRejectedValue(error);

      await expect(provider.authenticate()).rejects.toThrow("Qiita authentication failed: Unauthorized");
    });
  });

  describe("createArticle", () => {
    test("creates article successfully", async () => {
      const article = {
        title: "Test Article",
        content: "# Test Content",
        tags: ["javascript", "nodejs"],
        canonical_url: "https://example.com/test",
        published: true,
      };

      const mockResponse = {
        data: {
          id: "abc123",
          url: "https://qiita.com/testuser/items/abc123",
          private: false,
        },
      };
      axios.post.mockResolvedValue(mockResponse);

      const result = await provider.createArticle(article);

      expect(axios.post).toHaveBeenCalledWith(
        "https://qiita.com/api/v2/items",
        {
          title: "Test Article",
          body: expect.stringContaining("# Test Content"),
          tags: [{ name: "javascript" }, { name: "nodejs" }],
          private: false,
        },
        {
          headers: {
            Authorization: "Bearer test-qiita-token",
            "Content-Type": "application/json",
          },
          timeout: 10000,
        }
      );

      expect(result).toEqual({
        id: "abc123",
        url: "https://qiita.com/testuser/items/abc123",
        published: true,
      });
    });

    test("adds canonical URL notice to body", async () => {
      const article = {
        title: "Test Article",
        content: "# Test Content",
        tags: ["javascript"],
        canonical_url: "https://example.com/test",
        published: true,
      };

      axios.post.mockResolvedValue({ data: { id: "abc123" } });

      await provider.createArticle(article);

      const callArgs = axios.post.mock.calls[0][1];
      expect(callArgs.body).toContain(
        "> この記事は[https://example.com/test](https://example.com/test)からの転載です。"
      );
      expect(callArgs.body).toContain("# Test Content");
    });

    test("handles unpublished articles", async () => {
      const article = {
        title: "Draft Article",
        content: "# Draft",
        tags: ["test"],
        published: false,
      };

      axios.post.mockResolvedValue({ data: { id: "abc123", private: true } });

      await provider.createArticle(article);

      const callArgs = axios.post.mock.calls[0][1];
      expect(callArgs.private).toBe(true);
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
          id: "abc123",
          url: "https://qiita.com/testuser/items/abc123",
          private: false,
        },
      };
      axios.patch.mockResolvedValue(mockResponse);

      const result = await provider.updateArticle("abc123", article);

      expect(axios.patch).toHaveBeenCalledWith(
        "https://qiita.com/api/v2/items/abc123",
        {
          title: "Updated Article",
          body: "# Updated Content",
          private: false,
        },
        {
          headers: {
            Authorization: "Bearer test-qiita-token",
            "Content-Type": "application/json",
          },
          timeout: 10000,
        }
      );

      // Note: tags are not included in updates
      const callArgs = axios.patch.mock.calls[0][1];
      expect(callArgs).not.toHaveProperty("tags");

      expect(result).toEqual({
        id: "abc123",
        url: "https://qiita.com/testuser/items/abc123",
        published: true,
      });
    });
  });

  describe("getArticles", () => {
    test("fetches articles successfully", async () => {
      const mockArticles = [
        {
          id: "item1",
          title: "Article 1",
          url: "https://qiita.com/user/items/item1",
          private: false,
          tags: [{ name: "javascript" }, { name: "nodejs" }],
        },
        {
          id: "item2",
          title: "Article 2",
          url: "https://qiita.com/user/items/item2",
          private: true,
          tags: [{ name: "python" }],
        },
      ];

      axios.get.mockResolvedValue({ data: mockArticles });

      const result = await provider.getArticles();

      expect(axios.get).toHaveBeenCalledWith("https://qiita.com/api/v2/authenticated_user/items", {
        headers: {
          Authorization: "Bearer test-qiita-token",
          "Content-Type": "application/json",
        },
        params: {
          page: 1,
          per_page: 100,
        },
        timeout: 10000,
      });

      expect(result).toEqual([
        {
          id: "item1",
          title: "Article 1",
          url: "https://qiita.com/user/items/item1",
          canonical_url: "https://qiita.com/user/items/item1",
          published: true,
          tags: ["javascript", "nodejs"],
        },
        {
          id: "item2",
          title: "Article 2",
          url: "https://qiita.com/user/items/item2",
          canonical_url: "https://qiita.com/user/items/item2",
          published: false,
          tags: ["python"],
        },
      ]);
    });
  });

  describe("deleteArticle", () => {
    test("deletes article successfully", async () => {
      axios.delete.mockResolvedValue({ data: {} });

      const result = await provider.deleteArticle("abc123");

      expect(axios.delete).toHaveBeenCalledWith("https://qiita.com/api/v2/items/abc123", {
        headers: {
          Authorization: "Bearer test-qiita-token",
          "Content-Type": "application/json",
        },
        timeout: 10000,
      });

      expect(result).toEqual({ success: true, deleted: true });
    });
  });

  describe("checkIfArticleExists", () => {
    test("finds article by URL match", async () => {
      const articles = [
        {
          id: "item1",
          title: "Article 1",
          url: "https://qiita.com/user/items/item1",
          private: false,
          tags: [],
        },
      ];

      axios.get.mockResolvedValue({ data: articles });

      const result = await provider.checkIfArticleExists("https://qiita.com/user/items/item1", "Some Title");

      expect(result).toEqual({
        id: "item1",
        title: "Article 1",
        url: "https://qiita.com/user/items/item1",
        canonical_url: "https://qiita.com/user/items/item1",
        published: true,
        tags: [],
      });
    });

    test("finds article by canonical URL match", async () => {
      const articles = [
        {
          id: "item1",
          title: "Article 1",
          url: "https://qiita.com/user/items/item1",
          private: false,
          tags: [],
        },
      ];

      axios.get.mockResolvedValue({ data: articles });

      // Even if we search with a different canonical URL, it should match by Qiita URL
      const result = await provider.checkIfArticleExists("https://example.com/article", "Article 1");

      // Falls back to title match
      expect(result).toEqual({
        id: "item1",
        title: "Article 1",
        url: "https://qiita.com/user/items/item1",
        canonical_url: "https://qiita.com/user/items/item1",
        published: true,
        tags: [],
      });
    });
  });

  describe("transformContent", () => {
    test("transforms Hugo image shortcode", () => {
      const content = '{{< image src="/images/test.jpg" alt="Test image" >}}';
      const result = provider.transformContent(content);
      expect(result).toBe("![Test image](https://yoursite.com/images/test.jpg)");
    });

    test("transforms YouTube shortcode to link", () => {
      const content = "{{< youtube dQw4w9WgXcQ >}}";
      const result = provider.transformContent(content);
      expect(result).toBe(
        "[YouTube: https://www.youtube.com/watch?v=dQw4w9WgXcQ](https://www.youtube.com/watch?v=dQw4w9WgXcQ)"
      );
    });

    test("transforms Twitter shortcode to link", () => {
      const content = "{{< twitter 1234567890 >}}";
      const result = provider.transformContent(content);
      expect(result).toBe(
        "[Tweet: https://twitter.com/i/web/status/1234567890](https://twitter.com/i/web/status/1234567890)"
      );
    });

    test("transforms Gist shortcode to link", () => {
      const content = "{{< gist username 1234567890abcdef >}}";
      const result = provider.transformContent(content);
      expect(result).toBe(
        "[Gist: https://gist.github.com/username/1234567890abcdef](https://gist.github.com/username/1234567890abcdef)"
      );
    });
  });

  describe("formatTags", () => {
    test("formats tags for Qiita API", () => {
      const tags = ["JavaScript", "Node.js", "Web-Development"];
      const result = provider.formatTags(tags);
      expect(result).toEqual([{ name: "javascript" }, { name: "nodejs" }, { name: "web-development" }]);
    });

    test("limits to 5 tags", () => {
      const tags = ["tag1", "tag2", "tag3", "tag4", "tag5", "tag6", "tag7"];
      const result = provider.formatTags(tags);
      expect(result).toHaveLength(5);
      expect(result).toEqual([
        { name: "tag1" },
        { name: "tag2" },
        { name: "tag3" },
        { name: "tag4" },
        { name: "tag5" },
      ]);
    });

    test("removes special characters except hyphens", () => {
      const tags = ["c++", "asp.net", "node-js"];
      const result = provider.formatTags(tags);
      expect(result).toEqual([{ name: "c" }, { name: "aspnet" }, { name: "node-js" }]);
    });

    test("truncates long tags to 40 characters", () => {
      const tags = ["this-is-a-very-very-very-long-tag-name-that-exceeds-limit"];
      const result = provider.formatTags(tags);
      expect(result[0].name).toHaveLength(40);
      expect(result[0].name).toBe("this-is-a-very-very-very-long-tag-name-t");
    });

    test("filters out empty tags", () => {
      const tags = ["valid", "!!!", "...", "another-valid"];
      const result = provider.formatTags(tags);
      expect(result).toEqual([{ name: "valid" }, { name: "another-valid" }]);
    });
  });

  describe("getHeaders", () => {
    test("returns correct headers", () => {
      const headers = provider.getHeaders();
      expect(headers).toEqual({
        Authorization: "Bearer test-qiita-token",
        "Content-Type": "application/json",
      });
    });
  });
});
