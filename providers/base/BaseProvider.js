/**
 * Base provider class that defines the interface for content syndication providers
 */
class BaseProvider {
  /**
   * Creates a new provider instance
   * @param {Object} config - Provider configuration
   * @param {string} config.apiKey - API key for authentication
   * @param {string} config.baseUrl - Base URL for API endpoints
   * @param {string} [config.name] - Provider name
   */
  constructor(config) {
    this.apiKey = config.apiKey;
    this.baseUrl = config.baseUrl;
    this.name = config.name || "base";
    this.validateConfig();
  }

  /**
   * Validates provider configuration
   * @throws {Error} If required configuration is missing
   */
  validateConfig() {
    if (!this.apiKey) {
      throw new Error(`API key is required for ${this.name} provider`);
    }
    if (!this.baseUrl) {
      throw new Error(`Base URL is required for ${this.name} provider`);
    }
  }

  /**
   * Authenticates with the provider API
   * @returns {Promise<Object>} Authentication result
   * @abstract
   */
  async authenticate() {
    throw new Error("authenticate() must be implemented by subclass");
  }

  /**
   * Creates a new article on the provider platform
   * @param {Object} article - Article data
   * @returns {Promise<Object>} Created article response
   * @abstract
   */
  async createArticle(article) {
    throw new Error("createArticle() must be implemented by subclass");
  }

  /**
   * Updates an existing article
   * @param {string} id - Article ID
   * @param {Object} article - Updated article data
   * @returns {Promise<Object>} Updated article response
   * @abstract
   */
  async updateArticle(id, article) {
    throw new Error("updateArticle() must be implemented by subclass");
  }

  /**
   * Retrieves all articles from the provider
   * @returns {Promise<Array>} Array of articles
   * @abstract
   */
  async getArticles() {
    throw new Error("getArticles() must be implemented by subclass");
  }

  /**
   * Deletes an article
   * @param {string} id - Article ID to delete
   * @returns {Promise<Object>} Deletion result
   * @abstract
   */
  async deleteArticle(id) {
    throw new Error("deleteArticle() must be implemented by subclass");
  }

  /**
   * Transforms Hugo content to provider-specific format
   * @param {string} hugoContent - Original Hugo markdown content
   * @returns {string} Transformed content
   */
  transformContent(hugoContent) {
    if (!hugoContent) return "";
    let transformed = hugoContent;

    // Transform image shortcodes
    transformed = this.transformImages(transformed);

    // Transform code blocks
    transformed = this.transformCodeBlocks(transformed);

    // Transform platform-specific embeds
    transformed = this.transformEmbeds(transformed);

    return transformed;
  }

  /**
   * Transforms Hugo image shortcodes to markdown
   * @param {string} content - Content to transform
   * @returns {string} Transformed content
   */
  transformImages(content) {
    return content.replace(
      /\{\{<\s*image\s+src="([^"]+)"\s+alt="([^"]*)"\s*(?:position="[^"]*")?\s*(?:style="[^"]*")?\s*>\}\}/g,
      (match, src, alt) => {
        const imageUrl = src.startsWith("/") ? `${process.env.HUGO_BASE_URL || "https://yoursite.com"}${src}` : src;
        return `![${alt}](${imageUrl})`;
      }
    );
  }

  /**
   * Transforms Hugo code shortcodes to markdown code blocks
   * @param {string} content - Content to transform
   * @returns {string} Transformed content
   */
  transformCodeBlocks(content) {
    return content.replace(
      /\{\{<\s*code\s+language="([^"]+)"\s+title="([^"]*)"\s*(?:open="[^"]*")?\s*>\}\}([\s\S]*?)\{\{<\s*\/code\s*>\}\}/g,
      (match, language, title, code) => {
        const cleanCode = code.trim();
        return title
          ? `**${title}**\n\n\`\`\`${language}\n${cleanCode}\n\`\`\``
          : `\`\`\`${language}\n${cleanCode}\n\`\`\``;
      }
    );
  }

  /**
   * Transforms Hugo embed shortcodes - should be overridden by subclasses
   * @param {string} content - Content to transform
   * @returns {string} Transformed content
   */
  transformEmbeds(content) {
    // Default implementation - subclasses should override for provider-specific formats
    return content;
  }

  /**
   * Checks if an article exists by URL
   * @param {string} url - Article URL to check
   * @returns {Promise<Object|null>} Article if found, null otherwise
   * @abstract
   */
  async checkIfArticleExists(url) {
    throw new Error("checkIfArticleExists() must be implemented by subclass");
  }

  /**
   * Handles API errors with consistent formatting
   * @param {Error} error - Error object from API call
   * @param {string} operation - Name of the operation that failed
   * @throws {Error} Formatted error with details
   */
  handleApiError(error, operation) {
    const message = error.response?.data?.message || error.message;
    const status = error.response?.status;

    console.error(`Error during ${operation} on ${this.name}:`, {
      status,
      message,
      details: error.response?.data,
    });

    throw new Error(`${this.name} ${operation} failed: ${message}`);
  }

  formatTags(tags) {
    return tags;
  }

  extractFrontMatter(content) {
    const frontMatterMatch = content.match(/^---\n([\s\S]*?)\n---/);
    if (!frontMatterMatch) {
      return { frontMatter: {}, content };
    }

    const frontMatterText = frontMatterMatch[1];
    const contentWithoutFrontMatter = content.slice(frontMatterMatch[0].length);

    const frontMatter = {};
    frontMatterText.split("\n").forEach((line) => {
      const [key, ...valueParts] = line.split(":");
      if (key && valueParts.length > 0) {
        const value = valueParts.join(":").trim();
        if (value.startsWith("[") && value.endsWith("]")) {
          frontMatter[key.trim()] = value
            .slice(1, -1)
            .split(",")
            .map((item) => item.trim());
        } else {
          frontMatter[key.trim()] = value.replace(/^["']|["']$/g, "");
        }
      }
    });

    return { frontMatter, content: contentWithoutFrontMatter.trim() };
  }

  getHeaders() {
    return {};
  }
}

module.exports = BaseProvider;
