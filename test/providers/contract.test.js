const axios = require("axios");
const DevToProvider = require("../../providers/devto/DevToProvider");
const QiitaProvider = require("../../providers/qiita/QiitaProvider");

jest.mock("axios");

describe("Provider API Contract Tests", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe("dev.to API Contract", () => {
    let provider;

    beforeEach(() => {
      provider = new DevToProvider({ apiKey: "test-key" });
    });

    test("authentication request format", async () => {
      axios.get.mockResolvedValue({ data: { username: "test" } });

      await provider.authenticate();

      expect(axios.get).toHaveBeenCalledWith("https://dev.to/api/users/me", {
        headers: {
          "api-key": "test-key",
        },
      });
    });

    test("create article request format", async () => {
      axios.post.mockResolvedValue({
        data: {
          id: 123,
          url: "https://dev.to/testuser/test-article",
          published: true,
        },
      });

      const article = {
        title: "Test Article",
        content: "# Test Content",
        tags: ["javascript", "testing"],
        canonical_url: "https://example.com/test",
        description: "Test description",
        series: "Test Series",
        published: true,
      };

      await provider.createArticle(article);

      const [url, payload, config] = axios.post.mock.calls[0];

      expect(url).toBe("https://dev.to/api/articles");
      expect(config.headers).toEqual({ "api-key": "test-key" });
      expect(config.timeout).toBe(10000);

      // Verify required fields
      expect(payload.article).toBeDefined();
      expect(payload.article.title).toBe("Test Article");
      expect(payload.article.body_markdown).toBeDefined();
      expect(payload.article.published).toBe(true);

      // Verify optional fields
      expect(payload.article.tags).toEqual(["javascript", "testing"]);
      expect(payload.article.canonical_url).toBe("https://example.com/test");
      expect(payload.article.series).toBe("Test Series");
      expect(payload.article.description).toBe("Test description");
    });

    test("update article request format", async () => {
      axios.put.mockResolvedValue({ data: { id: 123 } });

      await provider.updateArticle(123, {
        title: "Updated",
        content: "Updated content",
        published: true,
      });

      const [url, payload, config] = axios.put.mock.calls[0];

      expect(url).toBe("https://dev.to/api/articles/123");
      expect(payload.article).toBeDefined();
      expect(payload.article.title).toBe("Updated");
      expect(payload.article.body_markdown).toBe("Updated content");

      // Tags should not be in update payload
      expect(payload.article.tags).toBeDefined();
    });

    test("response format validation", async () => {
      // Test various response formats
      const responses = {
        auth: {
          id: 123,
          username: "testuser",
          name: "Test User",
          twitter_username: "test",
          github_username: "test",
        },
        article: {
          id: 456,
          title: "Test Article",
          description: "Description",
          published: true,
          published_at: "2025-01-09T10:00:00Z",
          slug: "test-article-abc",
          path: "/testuser/test-article-abc",
          url: "https://dev.to/testuser/test-article-abc",
          comments_count: 0,
          public_reactions_count: 0,
          page_views_count: 0,
          published_timestamp: "2025-01-09T10:00:00Z",
          body_markdown: "# Content",
          positive_reactions_count: 0,
          cover_image: null,
          tag_list: ["javascript", "testing"],
          canonical_url: "https://example.com/test",
          reading_time_minutes: 1,
          user: {
            name: "Test User",
            username: "testuser",
          },
        },
      };

      axios.get.mockResolvedValue({ data: responses.auth });
      const authResult = await provider.authenticate();
      expect(authResult.user.username).toBe("testuser");

      axios.post.mockResolvedValue({ data: responses.article });
      const createResult = await provider.createArticle({
        title: "Test",
        content: "# Content",
        published: true,
      });
      expect(createResult.id).toBe(456);
      expect(createResult.url).toBe("https://dev.to/testuser/test-article-abc");
    });

    test("error response handling", async () => {
      const errorResponses = [
        {
          status: 422,
          data: {
            error: "Unprocessable Entity",
            status: 422,
            message: "Validation failed",
            errors: {
              title: ["can't be blank"],
              body_markdown: ["is too short (minimum is 100 characters)"],
            },
          },
        },
        {
          status: 401,
          data: {
            error: "Unauthorized",
            status: 401,
            message: "Invalid API key",
          },
        },
        {
          status: 429,
          data: {
            error: "Too Many Requests",
            status: 429,
            message: "Rate limit exceeded",
          },
        },
      ];

      for (const errorResponse of errorResponses) {
        axios.post.mockRejectedValue({
          response: errorResponse,
        });

        await expect(provider.createArticle({ title: "Test" })).rejects.toThrow(`dev.to create article failed`);
      }
    });
  });

  describe("Qiita API Contract", () => {
    let provider;

    beforeEach(() => {
      provider = new QiitaProvider({ apiKey: "test-token" });
    });

    test("authentication request format", async () => {
      axios.get.mockResolvedValue({ data: { id: "test" } });

      await provider.authenticate();

      expect(axios.get).toHaveBeenCalledWith("https://qiita.com/api/v2/authenticated_user", {
        headers: {
          Authorization: "Bearer test-token",
          "Content-Type": "application/json",
        },
      });
    });

    test("create article request format", async () => {
      axios.post.mockResolvedValue({ data: { id: "abc123" } });

      const article = {
        title: "Test Article",
        content: "# Test Content",
        tags: ["javascript", "testing"],
        published: true,
      };

      await provider.createArticle(article);

      const [url, payload, config] = axios.post.mock.calls[0];

      expect(url).toBe("https://qiita.com/api/v2/items");
      expect(config.headers).toEqual({
        Authorization: "Bearer test-token",
        "Content-Type": "application/json",
      });

      // Verify required fields
      expect(payload.title).toBe("Test Article");
      expect(payload.body).toBeDefined();
      expect(payload.tags).toEqual([{ name: "javascript" }, { name: "testing" }]);
      expect(payload.private).toBe(false);

      // Qiita doesn't have description or series fields
      expect(payload.description).toBeUndefined();
      expect(payload.series).toBeUndefined();
    });

    test("update article request format", async () => {
      axios.patch.mockResolvedValue({ data: { id: "abc123" } });

      await provider.updateArticle("abc123", {
        title: "Updated",
        content: "Updated content",
        tags: ["newtag"], // Should be ignored in update
        published: true,
      });

      const [url, payload, config] = axios.patch.mock.calls[0];

      expect(url).toBe("https://qiita.com/api/v2/items/abc123");
      expect(payload.title).toBe("Updated");
      expect(payload.body).toBe("Updated content");
      expect(payload.private).toBe(false);

      // Tags cannot be updated via PATCH
      expect(payload.tags).toBeUndefined();
    });

    test("response format validation", async () => {
      const responses = {
        auth: {
          description: "Test user",
          facebook_id: "",
          followees_count: 10,
          followers_count: 20,
          github_login_name: "testuser",
          id: "testuser",
          items_count: 5,
          linkedin_id: "",
          location: "Tokyo",
          name: "Test User",
          organization: "Test Org",
          permanent_id: 12345,
          profile_image_url: "https://example.com/avatar.jpg",
          twitter_screen_name: "test",
          website_url: "https://example.com",
        },
        item: {
          rendered_body: "<h1>Test</h1>",
          body: "# Test",
          coediting: false,
          comments_count: 0,
          created_at: "2025-01-09T10:00:00+09:00",
          group: null,
          id: "abc123def456",
          likes_count: 0,
          private: false,
          reactions_count: 0,
          tags: [
            {
              name: "JavaScript",
              versions: [],
            },
          ],
          title: "Test Article",
          updated_at: "2025-01-09T10:00:00+09:00",
          url: "https://qiita.com/testuser/items/abc123def456",
          user: {
            description: "Test user",
            facebook_id: "",
            followees_count: 10,
            followers_count: 20,
            github_login_name: "testuser",
            id: "testuser",
            items_count: 5,
            linkedin_id: "",
            location: "Tokyo",
            name: "Test User",
            organization: "Test Org",
            permanent_id: 12345,
            profile_image_url: "https://example.com/avatar.jpg",
            twitter_screen_name: "test",
            website_url: "https://example.com",
          },
          page_views_count: null,
        },
      };

      axios.get.mockResolvedValue({ data: responses.auth });
      const authResult = await provider.authenticate();
      expect(authResult.user.id).toBe("testuser");

      axios.post.mockResolvedValue({ data: responses.item });
      const createResult = await provider.createArticle({
        title: "Test",
        content: "# Test",
        tags: ["JavaScript"],
        published: true,
      });
      expect(createResult.id).toBe("abc123def456");
      expect(createResult.url).toBe("https://qiita.com/testuser/items/abc123def456");
    });

    test("list articles pagination", async () => {
      axios.get.mockResolvedValue({
        data: Array(100)
          .fill(null)
          .map((_, i) => ({
            id: `item${i}`,
            title: `Article ${i}`,
            private: false,
            tags: [],
          })),
      });

      await provider.getArticles();

      expect(axios.get).toHaveBeenCalledWith(
        "https://qiita.com/api/v2/authenticated_user/items",
        expect.objectContaining({
          params: {
            page: 1,
            per_page: 100,
          },
        })
      );
    });

    test("error response handling", async () => {
      const errorResponses = [
        {
          status: 400,
          data: {
            message: "Bad Request",
            type: "bad_request",
          },
        },
        {
          status: 401,
          data: {
            message: "Unauthorized",
            type: "unauthorized",
          },
        },
        {
          status: 403,
          data: {
            message: "Rate limit exceeded",
            type: "rate_limit_exceeded",
          },
        },
        {
          status: 404,
          data: {
            message: "Not found",
            type: "not_found",
          },
        },
      ];

      for (const errorResponse of errorResponses) {
        axios.post.mockRejectedValue({
          response: errorResponse,
        });

        await expect(provider.createArticle({ title: "Test" })).rejects.toThrow("Qiita create article failed");
      }
    });
  });

  describe("Cross-provider compatibility", () => {
    test("both providers handle same article structure", async () => {
      const article = {
        title: "Cross-Platform Article",
        content: "# Content\n\nWith **markdown**",
        tags: ["javascript", "nodejs", "testing"],
        canonical_url: "https://example.com/article",
        description: "Article description",
        published: true,
      };

      const devtoProvider = new DevToProvider({ apiKey: "devto-key" });
      const qiitaProvider = new QiitaProvider({ apiKey: "qiita-key" });

      // Mock successful responses
      axios.post.mockResolvedValue({ data: { id: "test-id", url: "test-url" } });

      // Both should handle the same article
      await devtoProvider.createArticle(article);
      await qiitaProvider.createArticle(article);

      // Verify both made POST requests
      expect(axios.post).toHaveBeenCalledTimes(2);

      // dev.to call
      expect(axios.post.mock.calls[0][1].article.title).toBe("Cross-Platform Article");

      // Qiita call
      expect(axios.post.mock.calls[1][1].title).toBe("Cross-Platform Article");
    });

    test("tag sanitization differences", () => {
      const tags = ["C++", "ASP.NET Core", "F#", "machine-learning", "real-time-systems"];

      const devtoProvider = new DevToProvider({ apiKey: "key" });
      const qiitaProvider = new QiitaProvider({ apiKey: "key" });

      const devtoTags = devtoProvider.formatTags(tags);
      const qiitaTags = qiitaProvider.formatTags(tags);

      // dev.to removes all special chars, limits to 4
      expect(devtoTags).toHaveLength(4);
      expect(devtoTags).toEqual(["c", "aspnetcore", "f", "machinelearning"]);

      // Qiita keeps hyphens, limits to 5, returns objects
      expect(qiitaTags).toHaveLength(5);
      expect(qiitaTags).toEqual([
        { name: "c" },
        { name: "aspnetcore" },
        { name: "f" },
        { name: "machine-learning" },
        { name: "real-time-systems" },
      ]);
    });
  });
});
