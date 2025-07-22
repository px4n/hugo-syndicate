const BaseProvider = require("../../providers/base/BaseProvider");

describe("BaseProvider", () => {
  describe("constructor", () => {
    test("initializes with valid config", () => {
      const config = {
        apiKey: "test-key",
        baseUrl: "https://api.example.com",
        name: "test-provider",
      };

      const provider = new BaseProvider(config);

      expect(provider.apiKey).toBe("test-key");
      expect(provider.baseUrl).toBe("https://api.example.com");
      expect(provider.name).toBe("test-provider");
    });

    test("throws error when apiKey is missing", () => {
      const config = {
        baseUrl: "https://api.example.com",
      };

      expect(() => new BaseProvider(config)).toThrow("API key is required");
    });

    test("throws error when baseUrl is missing", () => {
      const config = {
        apiKey: "test-key",
      };

      expect(() => new BaseProvider(config)).toThrow("Base URL is required");
    });

    test("uses default name when not provided", () => {
      const config = {
        apiKey: "test-key",
        baseUrl: "https://api.example.com",
      };

      const provider = new BaseProvider(config);
      expect(provider.name).toBe("base");
    });
  });

  describe("abstract methods", () => {
    let provider;

    beforeEach(() => {
      provider = new BaseProvider({
        apiKey: "test-key",
        baseUrl: "https://api.example.com",
      });
    });

    test("authenticate throws not implemented error", async () => {
      await expect(provider.authenticate()).rejects.toThrow("authenticate() must be implemented by subclass");
    });

    test("createArticle throws not implemented error", async () => {
      await expect(provider.createArticle({})).rejects.toThrow("createArticle() must be implemented by subclass");
    });

    test("updateArticle throws not implemented error", async () => {
      await expect(provider.updateArticle("123", {})).rejects.toThrow(
        "updateArticle() must be implemented by subclass"
      );
    });

    test("getArticles throws not implemented error", async () => {
      await expect(provider.getArticles()).rejects.toThrow("getArticles() must be implemented by subclass");
    });

    test("deleteArticle throws not implemented error", async () => {
      await expect(provider.deleteArticle("123")).rejects.toThrow("deleteArticle() must be implemented by subclass");
    });

    test("transformContent has default implementation", () => {
      const content = "Some content {{< image src=\"/test.jpg\" alt=\"Test\" >}}";
      const result = provider.transformContent(content);
      expect(result).toContain("![Test](https://yoursite.com/test.jpg)");
    });

    test("checkIfArticleExists throws not implemented error", async () => {
      await expect(provider.checkIfArticleExists("url")).rejects.toThrow(
        "checkIfArticleExists() must be implemented by subclass"
      );
    });
  });

  describe("extractFrontMatter", () => {
    let provider;

    beforeEach(() => {
      provider = new BaseProvider({
        apiKey: "test-key",
        baseUrl: "https://api.example.com",
      });
    });

    test("extracts YAML front matter correctly", () => {
      const content = `---
title: Test Post
tags: [javascript, nodejs]
draft: false
---

# Content here`;

      const result = provider.extractFrontMatter(content);

      expect(result.frontMatter.title).toBe("Test Post");
      expect(result.frontMatter.tags).toEqual(["javascript", "nodejs"]);
      expect(result.frontMatter.draft).toBe("false");
      expect(result.content).toBe("# Content here");
    });

    test("handles content without front matter", () => {
      const content = "# Just content";
      const result = provider.extractFrontMatter(content);

      expect(result.frontMatter).toEqual({});
      expect(result.content).toBe("# Just content");
    });

    test("handles quoted values", () => {
      const content = `---
title: "Test: A Post"
description: 'Single quotes work too'
---

Content`;

      const result = provider.extractFrontMatter(content);

      expect(result.frontMatter.title).toBe("Test: A Post");
      expect(result.frontMatter.description).toBe("Single quotes work too");
    });
  });

  describe("handleApiError", () => {
    let provider;
    let consoleErrorSpy;

    beforeEach(() => {
      provider = new BaseProvider({
        apiKey: "test-key",
        baseUrl: "https://api.example.com",
        name: "test-provider",
      });
      consoleErrorSpy = jest.spyOn(console, "error").mockImplementation();
    });

    afterEach(() => {
      consoleErrorSpy.mockRestore();
    });

    test("handles error with response data", () => {
      const error = {
        response: {
          status: 404,
          data: {
            message: "Not found",
          },
        },
        message: "Request failed",
      };

      expect(() => provider.handleApiError(error, "test operation")).toThrow(
        "test-provider test operation failed: Not found"
      );

      expect(consoleErrorSpy).toHaveBeenCalledWith(
        "Error during test operation on test-provider:",
        expect.objectContaining({
          status: 404,
          message: "Not found",
        })
      );
    });

    test("handles error without response", () => {
      const error = {
        message: "Network error",
      };

      expect(() => provider.handleApiError(error, "test operation")).toThrow(
        "test-provider test operation failed: Network error"
      );
    });
  });

  describe("utility methods", () => {
    let provider;

    beforeEach(() => {
      provider = new BaseProvider({
        apiKey: "test-key",
        baseUrl: "https://api.example.com",
      });
    });

    test("formatTags returns tags unchanged", () => {
      const tags = ["tag1", "tag2"];
      expect(provider.formatTags(tags)).toEqual(tags);
    });

    test("getHeaders returns empty object", () => {
      expect(provider.getHeaders()).toEqual({});
    });
  });
});
