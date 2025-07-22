const axios = require("axios");
const BaseProvider = require("../base/BaseProvider");

class DevToProvider extends BaseProvider {
  constructor(config) {
    super({
      ...config,
      name: "dev.to",
      baseUrl: config.baseUrl || "https://dev.to/api",
    });
    this.maxTags = 4;
  }

  async authenticate() {
    try {
      const response = await axios.get(`${this.baseUrl}/users/me`, {
        headers: { "api-key": this.apiKey },
      });
      return {
        success: true,
        user: {
          name: response.data.name,
          username: response.data.username,
        },
      };
    } catch (error) {
      this.handleApiError(error, "authentication");
    }
  }

  async createArticle(article) {
    try {
      const devtoArticle = this.transformToDevToFormat(article);

      const response = await axios.post(
        `${this.baseUrl}/articles`,
        { article: devtoArticle },
        {
          headers: { "api-key": this.apiKey },
          timeout: 10000,
        }
      );

      if (!response.data || !response.data.id || !response.data.url) {
        throw new Error("Incomplete response from dev.to");
      }

      return {
        id: response.data.id,
        url: response.data.url,
        published: response.data.published,
      };
    } catch (error) {
      this.handleApiError(error, "create article");
    }
  }

  async updateArticle(id, article) {
    try {
      const devtoArticle = this.transformToDevToFormat(article);

      const response = await axios.put(
        `${this.baseUrl}/articles/${id}`,
        { article: devtoArticle },
        {
          headers: { "api-key": this.apiKey },
          timeout: 10000,
        }
      );

      return {
        id: response.data.id,
        url: response.data.url,
        published: response.data.published,
      };
    } catch (error) {
      this.handleApiError(error, "update article");
    }
  }

  async getArticles() {
    try {
      const [publishedResponse, unpublishedResponse] = await Promise.all([
        axios.get(`${this.baseUrl}/articles/me/published`, {
          headers: { "api-key": this.apiKey },
          timeout: 10000,
        }),
        axios.get(`${this.baseUrl}/articles/me/unpublished`, {
          headers: { "api-key": this.apiKey },
          timeout: 10000,
        }),
      ]);

      const publishedData = publishedResponse.data || [];
      const unpublishedData = unpublishedResponse.data || [];

      if (!Array.isArray(publishedData)) {
        throw new Error("Invalid data format from dev.to");
      }
      if (!Array.isArray(unpublishedData)) {
        throw new Error("Invalid data format from dev.to");
      }

      const allArticles = [...publishedData, ...unpublishedData];

      return allArticles.map((article) => {
        if (!article || typeof article !== "object") {
          throw new Error("Invalid article object");
        }
        if (!article.id || !article.title) {
          throw new Error("Article missing id or title");
        }
        return {
          id: article.id,
          title: article.title,
          url: article.url,
          canonical_url: article.canonical_url,
          published: article.published,
          tags: article.tag_list || [],
        };
      });
    } catch (error) {
      this.handleApiError(error, "get articles");
    }
  }

  async deleteArticle(id) {
    try {
      await axios.put(
        `${this.baseUrl}/articles/${id}`,
        {
          article: {
            published: false,
            body_markdown: `This article has been removed.\n\n*Removed on: ${new Date().toISOString()}*`,
          },
        },
        {
          headers: { "api-key": this.apiKey },
          timeout: 10000,
        }
      );

      return { success: true, unpublished: true };
    } catch (error) {
      this.handleApiError(error, "delete article");
    }
  }

  async checkIfArticleExists(canonicalUrl, title) {
    const articles = await this.getArticles();

    if (canonicalUrl) {
      const byCanonical = articles.find((article) => article.canonical_url === canonicalUrl);
      if (byCanonical) return byCanonical;
    }

    if (title) {
      const byTitle = articles.find((article) => article.title === title);
      if (byTitle) return byTitle;
    }

    return null;
  }

  transformEmbeds(content) {
    // Transform YouTube shortcodes to dev.to liquid tags
    content = content.replace(/\{\{<\s*youtube\s+([^>\s]+)\s*>\}\}/g, (match, videoId) => {
      return `{% youtube ${videoId} %}`;
    });

    // Transform Twitter shortcodes to dev.to liquid tags
    content = content.replace(/\{\{<\s*twitter\s+([^>\s]+)\s*>\}\}/g, (match, tweetId) => {
      return `{% twitter ${tweetId} %}`;
    });

    // Transform Gist shortcodes to dev.to liquid tags
    content = content.replace(/\{\{<\s*gist\s+([^>\s]+)\s+([^>\s]+)\s*>\}\}/g, (match, username, gistId) => {
      return `{% gist ${gistId} %}`;
    });

    return content;
  }

  formatTags(tags, articleTitle) {
    if (!tags || !Array.isArray(tags)) return [];

    const filtered = [];
    const sanitized = tags
      .map((tag) => {
        const originalTag = String(tag);
        let sanitizedTag = originalTag
          .toLowerCase()
          .replace(/[^a-z0-9]/g, "")
          .substring(0, 30);

        // Non-ASCII tags are not supported by dev.to
        if (originalTag && sanitizedTag.length === 0) {
          filtered.push(originalTag);
        }

        return sanitizedTag;
      })
      .filter((tag) => tag.length > 0);

    if (filtered.length > 0) {
      console.warn(
        `⚠️  Warning: The following tags were removed for "${articleTitle}" (dev.to only supports alphanumeric tags):`
      );
      console.warn(`   Removed: ${filtered.join(", ")}`);
      if (sanitized.length > 0) {
        console.warn(`   Keeping: ${sanitized.join(", ")}`);
      } else {
        console.warn(
          `   No valid tags remaining. Consider adding alphanumeric tags like: javascript, react, webdev, etc.`
        );
      }
    }

    if (sanitized.length > this.maxTags) {
      const truncated = sanitized.slice(this.maxTags);
      console.warn(`⚠️  Warning: Too many tags for "${articleTitle}". dev.to allows max ${this.maxTags} tags.`);
      console.warn(`   Removed: ${truncated.join(", ")}`);
      return sanitized.slice(0, this.maxTags);
    }

    return sanitized;
  }

  transformToDevToFormat(article) {
    const devtoArticle = {
      title: article.title,
      published: article.published !== false,
      body_markdown: this.transformContent(article.content),
      tags: this.formatTags(article.tags, article.title),
      canonical_url: article.canonical_url,
      series: article.series,
    };

    if (article.description && article.description.trim() !== "") {
      devtoArticle.description = article.description;
    }

    Object.keys(devtoArticle).forEach((key) => {
      if (devtoArticle[key] === undefined || devtoArticle[key] === null || devtoArticle[key] === "") {
        delete devtoArticle[key];
      }
    });

    return devtoArticle;
  }

  getHeaders() {
    return {
      "api-key": this.apiKey,
    };
  }
}

module.exports = DevToProvider;
