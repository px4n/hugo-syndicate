const axios = require("axios");
const BaseProvider = require("../base/BaseProvider");

class QiitaProvider extends BaseProvider {
  constructor(config) {
    super({
      ...config,
      name: "Qiita",
      baseUrl: config.baseUrl || "https://qiita.com/api/v2",
    });
  }

  async authenticate() {
    try {
      const response = await axios.get(`${this.baseUrl}/authenticated_user`, {
        headers: this.getHeaders(),
      });
      return {
        success: true,
        user: {
          id: response.data.id,
          name: response.data.name,
          description: response.data.description,
        },
      };
    } catch (error) {
      this.handleApiError(error, "authentication");
    }
  }

  async createArticle(article) {
    try {
      const qiitaArticle = this.transformToQiitaFormat(article);

      const response = await axios.post(`${this.baseUrl}/items`, qiitaArticle, {
        headers: this.getHeaders(),
        timeout: 10000,
      });

      return {
        id: response.data.id,
        url: response.data.url,
        published: !response.data.private,
      };
    } catch (error) {
      this.handleApiError(error, "create article");
    }
  }

  async updateArticle(id, article) {
    try {
      const qiitaArticle = this.transformToQiitaFormat(article);
      delete qiitaArticle.tags;

      const response = await axios.patch(`${this.baseUrl}/items/${id}`, qiitaArticle, {
        headers: this.getHeaders(),
        timeout: 10000,
      });

      return {
        id: response.data.id,
        url: response.data.url,
        published: !response.data.private,
      };
    } catch (error) {
      this.handleApiError(error, "update article");
    }
  }

  async getArticles() {
    try {
      const response = await axios.get(`${this.baseUrl}/authenticated_user/items`, {
        headers: this.getHeaders(),
        params: {
          page: 1,
          per_page: 100,
        },
        timeout: 10000,
      });

      return response.data.map((article) => ({
        id: article.id,
        title: article.title,
        url: article.url,
        canonical_url: article.url,
        published: !article.private,
        tags: article.tags.map((tag) => tag.name),
      }));
    } catch (error) {
      this.handleApiError(error, "get articles");
    }
  }

  async deleteArticle(id) {
    try {
      await axios.delete(`${this.baseUrl}/items/${id}`, {
        headers: this.getHeaders(),
        timeout: 10000,
      });

      return { success: true, deleted: true };
    } catch (error) {
      this.handleApiError(error, "delete article");
    }
  }

  async checkIfArticleExists(canonicalUrl, title) {
    const articles = await this.getArticles();

    if (canonicalUrl) {
      const byCanonical = articles.find(
        (article) => article.url === canonicalUrl || article.canonical_url === canonicalUrl
      );
      if (byCanonical) return byCanonical;
    }

    if (title) {
      const byTitle = articles.find((article) => article.title === title);
      if (byTitle) return byTitle;
    }

    return null;
  }

  transformEmbeds(content) {
    // Transform YouTube shortcodes to links (Qiita doesn't support embeds)
    content = content.replace(/\{\{<\s*youtube\s+([^>\s]+)\s*>\}\}/g, (match, videoId) => {
      return `[YouTube: https://www.youtube.com/watch?v=${videoId}](https://www.youtube.com/watch?v=${videoId})`;
    });

    // Transform Twitter shortcodes to links
    content = content.replace(/\{\{<\s*twitter\s+([^>\s]+)\s*>\}\}/g, (match, tweetId) => {
      return `[Tweet: https://twitter.com/i/web/status/${tweetId}](https://twitter.com/i/web/status/${tweetId})`;
    });

    // Transform Gist shortcodes to links
    content = content.replace(/\{\{<\s*gist\s+([^>\s]+)\s+([^>\s]+)\s*>\}\}/g, (match, username, gistId) => {
      return `[Gist: https://gist.github.com/${username}/${gistId}](https://gist.github.com/${username}/${gistId})`;
    });

    return content;
  }

  formatTags(tags, articleTitle) {
    if (!tags || !Array.isArray(tags)) return [];

    const filtered = [];
    const formatted = tags
      .slice(0, 5)
      .map((tag) => {
        const originalTag = String(tag);
        const sanitizedName = originalTag
          .toLowerCase()
          .replace(/[^a-z0-9\-]/g, "")
          .substring(0, 40);

        // Japanese characters not supported in tags
        if (originalTag && sanitizedName.length === 0) {
          filtered.push(originalTag);
        }

        return {
          name: sanitizedName,
          original: originalTag,
        };
      })
      .filter((tag) => tag.name.length > 0);

    // Warn about filtered non-ASCII tags
    if (filtered.length > 0) {
      console.warn(
        `⚠️  Warning: The following tags were removed for "${articleTitle}" (Qiita only supports alphanumeric tags and hyphens):`
      );
      console.warn(`   Removed: ${filtered.join(", ")}`);
      if (formatted.length > 0) {
        console.warn(`   Keeping: ${formatted.map((t) => t.name).join(", ")}`);
      } else {
        console.warn(
          `   No valid tags remaining. Consider adding alphanumeric tags like: javascript, react, web-dev, etc.`
        );
      }
    }

    // Also warn if we had to truncate tags
    if (tags.length > 5) {
      const truncated = tags.slice(5);
      console.warn(`⚠️  Warning: Too many tags for "${articleTitle}". Qiita allows max 5 tags.`);
      console.warn(`   Removed: ${truncated.join(", ")}`);
    }

    return formatted.map((t) => ({ name: t.name }));
  }

  transformToQiitaFormat(article) {
    const qiitaArticle = {
      title: article.title,
      body: this.transformContent(article.content),
      tags: this.formatTags(article.tags, article.title),
      private: article.published === false,
    };

    if (article.canonical_url && article.canonical_url !== "") {
      qiitaArticle.body = `> この記事は[${article.canonical_url}](${article.canonical_url})からの転載です。\n\n${qiitaArticle.body}`;
    }

    return qiitaArticle;
  }

  getHeaders() {
    return {
      Authorization: `Bearer ${this.apiKey}`,
      "Content-Type": "application/json",
    };
  }
}

module.exports = QiitaProvider;
