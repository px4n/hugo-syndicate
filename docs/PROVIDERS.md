# Provider Development Guide (WIP)

This guide covers the provider API reference and development instructions for Hugo Syndicate.

## Table of Contents

- [Architecture Overview](#architecture-overview)
- [Provider Interface](#provider-interface)
- [Creating a Custom Provider](#creating-a-custom-provider)
- [API Reference](#api-reference)
- [Implementation Guide](#implementation-guide)
- [Platform-Specific Considerations](#platform-specific-considerations)
- [Testing Your Provider](#testing-your-provider)
- [Example: Medium Provider](#example-medium-provider)
- [Contributing Your Provider](#contributing-your-provider)

## Architecture Overview

Hugo Syndicate uses a provider-based architecture where each content platform (dev.to, Qiita, etc.) is implemented as a provider that extends the BaseProvider class.

```
hugo-syndicate.js (main orchestrator)
    ↓
providers/
    ├── base/BaseProvider.js (abstract base class)
    ├── devto/DevToProvider.js
    ├── qiita/QiitaProvider.js
    └── index.js (provider registry)
```

## Provider Interface

All providers must extend the `BaseProvider` class and implement its abstract methods.

```javascript
const BaseProvider = require('./providers/base/BaseProvider');
```

## API Reference

### BaseProvider Class

#### Constructor

```javascript
new BaseProvider(config)
```

**Parameters:**
- `config` (Object) - Provider configuration
  - `apiKey` (string) - API key for authentication
  - `baseUrl` (string) - Base URL for API endpoints
  - `name` (string, optional) - Provider name

#### Methods

All methods return Promises and should be implemented by provider subclasses.

##### `authenticate()`

Authenticates with the provider API.

**Returns:** `Promise<Object>` - Authentication result with user details

**Example Response:**
```javascript
{
  success: true,
  user: {
    id: "user123",
    name: "John Doe",
    email: "john@example.com"
  }
}
```

##### `createArticle(article)`

Creates a new article on the provider platform.

**Parameters:**
- `article` (Object) - Article data
  - `title` (string) - Article title
  - `content` (string) - Article content in provider format
  - `tags` (Array<string>) - Article tags
  - `published` (boolean) - Whether to publish immediately
  - `canonical_url` (string) - Original article URL

**Returns:** `Promise<Object>` - Created article details
```javascript
{
  id: "article123",
  url: "https://provider.com/article123",
  published: true
}
```

##### `updateArticle(id, article)`

Updates an existing article.

**Parameters:**
- `id` (string) - Article ID on the provider platform
- `article` (Object) - Updated article data (same structure as createArticle)

**Returns:** `Promise<Object>` - Updated article details

##### `getArticles()`

Retrieves all articles from the provider.

**Returns:** `Promise<Array>` - Array of article objects
```javascript
[
  {
    id: "article123",
    title: "My Article",
    url: "https://provider.com/article123",
    canonical_url: "https://myblog.com/article",
    published: true,
    tags: ["javascript", "nodejs"]
  }
]
```

##### `deleteArticle(id)`

Deletes an article from the provider.

**Parameters:**
- `id` (string) - Article ID to delete

**Returns:** `Promise<Object>` - Deletion result
```javascript
{
  success: true,
  deleted: true
}
```

##### `transformContent(hugoContent)`

Transforms Hugo markdown content to provider-specific format. BaseProvider provides default implementations for common transformations.

**Parameters:**
- `hugoContent` (string) - Original Hugo markdown content

**Returns:** `string` - Transformed content suitable for the provider

**Built-in Transformations:**
- `transformImages()` - Converts Hugo image shortcodes to markdown
- `transformCodeBlocks()` - Converts Hugo code blocks to markdown
- `transformEmbeds()` - Override this for provider-specific embed formats

##### `checkIfArticleExists(url, title)`

Checks if an article already exists on the provider.

**Parameters:**
- `url` (string) - Canonical URL to check
- `title` (string) - Article title (fallback matching)

**Returns:** `Promise<Object|null>` - Article if found, null otherwise

##### `handleApiError(error, operation)`

Handles API errors with consistent formatting.

**Parameters:**
- `error` (Error) - Error object from API call
- `operation` (string) - Name of the operation that failed

**Throws:** `Error` - Formatted error with provider details

## Creating a Custom Provider

### Quick Start

1. Create a new directory for your provider:
```bash
mkdir providers/myprovider
```

2. Create your provider class:
```javascript
// providers/myprovider/MyProvider.js
const BaseProvider = require('../base/BaseProvider');
const axios = require('axios');

class MyProvider extends BaseProvider {
  constructor(config) {
    super({
      ...config,
      name: 'MyProvider',
      baseUrl: config.baseUrl || 'https://api.myprovider.com'
    });
  }

  async authenticate() {
    try {
      const response = await axios.get(`${this.baseUrl}/user`, {
        headers: { 'Authorization': `Bearer ${this.apiKey}` }
      });
      return {
        success: true,
        user: response.data
      };
    } catch (error) {
      this.handleApiError(error, 'authentication');
    }
  }

  async createArticle(article) {
    // Transform content using base class method
    const transformedContent = this.transformContent(article.content);

    try {
      const response = await axios.post(`${this.baseUrl}/articles`, {
        title: article.title,
        body: transformedContent,
        tags: article.tags,
        published: article.published
      }, {
        headers: { 'Authorization': `Bearer ${this.apiKey}` }
      });

      return {
        id: response.data.id,
        url: response.data.url,
        published: response.data.published
      };
    } catch (error) {
      this.handleApiError(error, 'article creation');
    }
  }

  // Override to provide custom embed transformations
  transformEmbeds(content) {
    // Transform YouTube shortcodes
    content = content.replace(/{{< youtube (\w+) >}}/g, '[youtube:$1]');
    content = content.replace(/{{< gist (\w+) (\w+) >}}/g, '[gist:$2]');

    // Add your provider-specific transformations

    return content;
  }

  // Implement other required methods...
}

module.exports = MyProvider;
```

3. Register your provider in `providers/index.js`:
```javascript
const providers = {
  devto: require('./devto/DevToProvider'),
  qiita: require('./qiita/QiitaProvider'),
  myprovider: require('./myprovider/MyProvider'), // Add your provider
};
```

## Implementation Guide

### 1. Authentication

Implement the `authenticate()` method to verify API credentials:

```javascript
async authenticate() {
  try {
    const response = await axios.get(`${this.baseUrl}/user`, {
      headers: this.getHeaders()
    });

    return {
      success: true,
      user: response.data
    };
  } catch (error) {
    this.handleApiError(error, 'authentication');
  }
}

getHeaders() {
  return {
    'Authorization': `Bearer ${this.apiKey}`,
    'Content-Type': 'application/json'
  };
}
```

### 2. Content Transformation

The BaseProvider class now provides built-in transformations for common Hugo shortcodes:

```javascript
// BaseProvider handles these automatically:
// - Image shortcodes → Markdown images
// - Code blocks → Markdown code blocks

// Override transformEmbeds() for provider-specific formats:
transformEmbeds(content) {
  // YouTube embeds
  content = content.replace(
    /{{< youtube (\w+) >}}/g,
    '<iframe src="https://youtube.com/embed/$1"></iframe>'
  );

  // Add more provider-specific transformations
  return content;
}
```

### 3. Article Management

Implement CRUD operations for articles:

```javascript
async createArticle(article) {
  const payload = {
    title: article.title,
    body: this.transformContent(article.content),
    tags: this.formatTags(article.tags),
    published: article.published,
    canonical_url: article.canonical_url
  };

  try {
    const response = await axios.post(
      `${this.baseUrl}/articles`,
      payload,
      { headers: this.getHeaders() }
    );

    return {
      id: response.data.id,
      url: response.data.url,
      published: response.data.published
    };
  } catch (error) {
    this.handleApiError(error, 'article creation');
  }
}

formatTags(tags) {
  // Apply platform-specific tag rules
  return tags
    .slice(0, this.maxTags) // Platform tag limit
    .map(tag => tag.toLowerCase())
    .filter(tag => this.isValidTag(tag));
}
```

### 4. Error Handling

Use consistent error handling:

```javascript
handleApiError(error, operation) {
  if (error.response?.status === 401) {
    throw new Error(`Authentication failed for ${this.name}`);
  }

  if (error.response?.status === 429) {
    throw new Error(`Rate limit exceeded for ${this.name}`);
  }

  // Call parent error handler for other cases
  super.handleApiError(error, operation);
}
```

## Platform-Specific Considerations

### API Rate Limits

Implement rate limiting awareness:

```javascript
constructor(config) {
  super(config);
  this.requestDelay = 1000; // 1 second between requests
  this.lastRequest = 0;
}

async throttleRequest() {
  const now = Date.now();
  const timeSinceLastRequest = now - this.lastRequest;

  if (timeSinceLastRequest < this.requestDelay) {
    await new Promise(resolve =>
      setTimeout(resolve, this.requestDelay - timeSinceLastRequest)
    );
  }

  this.lastRequest = Date.now();
}
```

### Tag Validation

Different platforms have different tag requirements:

```javascript
isValidTag(tag) {
  // Example: alphanumeric only, max 20 chars
  return /^[a-z0-9]{1,20}$/.test(tag);
}

sanitizeTag(tag) {
  return tag
    .toLowerCase()
    .replace(/[^a-z0-9]/g, '')
    .slice(0, 20);
}
```

### Content Limitations

Handle platform-specific content limits:

```javascript
validateContent(article) {
  const MAX_TITLE_LENGTH = 100;
  const MAX_CONTENT_LENGTH = 50000;

  if (article.title.length > MAX_TITLE_LENGTH) {
    throw new Error(`Title exceeds ${MAX_TITLE_LENGTH} characters`);
  }

  if (article.content.length > MAX_CONTENT_LENGTH) {
    throw new Error(`Content exceeds ${MAX_CONTENT_LENGTH} characters`);
  }
}
```

## Testing Your Provider

### 1. Create unit tests:

```javascript
// test/providers/MyProvider.test.js
const MyProvider = require('../../providers/myprovider/MyProvider');

describe('MyProvider', () => {
  let provider;

  beforeEach(() => {
    provider = new MyProvider({
      apiKey: 'test-key',
      baseUrl: 'https://api.test.com'
    });
  });

  test('transforms content correctly', () => {
    const input = '{{< youtube abc123 >}}';
    const output = provider.transformContent(input);
    expect(output).toContain('youtube');
  });

  test('authenticates successfully', async () => {
    const result = await provider.authenticate();
    expect(result.success).toBe(true);
  });

  // Test other methods...
});
```

### 2. Test with real content:

```bash
# Set up environment
export MYPROVIDER_API_KEY=your_test_key

# Test with a single post
node hugo-syndicate.js --provider myprovider --force-all
```

### Environment Variables

Configure your provider with environment variables:

```bash
# Your provider's API key
MYPROVIDER_API_KEY=your_api_key_here

# Optional: Custom API base URL
MYPROVIDER_API_BASE=https://api.custom.com/v1
```

Update the main script to recognize your provider's environment variables:

```javascript
// In hugo-syndicate.js getProviderConfig()
myprovider: {
  apiKey: process.env.MYPROVIDER_API_KEY,
  baseUrl: process.env.MYPROVIDER_API_BASE || "https://api.myprovider.com",
},
```

## Example: Medium Provider

Here's a mock example of adding Medium support:

```javascript
// providers/medium/MediumProvider.js
const BaseProvider = require('../base/BaseProvider');
const axios = require('axios');

class MediumProvider extends BaseProvider {
  constructor(config) {
    super({
      ...config,
      name: 'Medium',
      baseUrl: 'https://api.medium.com/v1'
    });
    this.userId = null;
  }

  async authenticate() {
    try {
      const response = await axios.get(`${this.baseUrl}/me`, {
        headers: {
          'Authorization': `Bearer ${this.apiKey}`
        }
      });

      this.userId = response.data.data.id;
      return {
        success: true,
        user: response.data.data
      };
    } catch (error) {
      this.handleApiError(error, 'authentication');
    }
  }

  async createArticle(article) {
    if (!this.userId) {
      await this.authenticate();
    }

    const payload = {
      title: article.title,
      contentFormat: 'markdown',
      content: this.transformContent(article.content),
      tags: article.tags.slice(0, 5), // Medium allows max 5 tags
      publishStatus: article.published ? 'public' : 'draft',
      canonicalUrl: article.canonical_url
    };

    try {
      const response = await axios.post(
        `${this.baseUrl}/users/${this.userId}/posts`,
        payload,
        {
          headers: {
            'Authorization': `Bearer ${this.apiKey}`,
            'Content-Type': 'application/json'
          }
        }
      );

      return {
        id: response.data.data.id,
        url: response.data.data.url,
        published: response.data.data.publishStatus === 'public'
      };
    } catch (error) {
      this.handleApiError(error, 'article creation');
    }
  }

  async updateArticle(id, article) {
    // Medium doesn't support updating published articles
    throw new Error('Medium does not support updating published articles');
  }

  async getArticles() {
    if (!this.userId) {
      await this.authenticate();
    }

    try {
      const response = await axios.get(
        `${this.baseUrl}/users/${this.userId}/posts`,
        {
          headers: {
            'Authorization': `Bearer ${this.apiKey}`
          }
        }
      );

      return response.data.data.map(article => ({
        id: article.id,
        title: article.title,
        url: article.url,
        canonical_url: article.canonicalUrl,
        published: article.publishStatus === 'public',
        tags: article.tags || []
      }));
    } catch (error) {
      this.handleApiError(error, 'get articles');
    }
  }

  async deleteArticle(id) {
    // Medium doesn't support deleting articles via API
    throw new Error('Medium does not support deleting articles via API');
  }

  async checkIfArticleExists(url, title) {
    const articles = await this.getArticles();

    if (url) {
      const byCanonical = articles.find(article => article.canonical_url === url);
      if (byCanonical) return byCanonical;
    }

    if (title) {
      const byTitle = articles.find(article => article.title === title);
      if (byTitle) return byTitle;
    }

    return null;
  }

  transformEmbeds(content) {
    // Medium doesn't support special embeds, convert to links
    content = content.replace(/{{< youtube (\w+) >}}/g,
      'Watch on YouTube: https://www.youtube.com/watch?v=$1');

    content = content.replace(/{{< gist (\w+) (\w+) >}}/g,
      'View Gist: https://gist.github.com/$1/$2');

    return content;
  }
}

module.exports = MediumProvider;
```

## Contributing Your Provider

### Best Practices

1. **Respect API Limits**: Implement proper rate limiting
2. **Validate Early**: Check requirements before API calls
3. **Transform Safely**: Preserve content integrity during transformation
4. **Handle Errors Gracefully**: Provide clear error messages
5. **Document Limitations**: Be clear about platform constraints
6. **Test Thoroughly**: Include edge cases in your tests
7. **Use Base Class Methods**: Leverage built-in transformations when possible

### Submission Checklist

When submitting a pull request for your provider:

1. [ ] Provider implementation in `providers/[name]/`
2. [ ] Tests in `test/providers/[name].test.js`
3. [ ] Registration in `providers/index.js`
4. [ ] Environment variable configuration in main script
5. [ ] Documentation updates:
   - Add to README.md supported providers list
   - Update example workflows
   - Document platform-specific limitations
6. [ ] Example configuration in `.env.example`
7. [ ] All tests passing
8. [ ] Code follows project style guidelines

### Error Handling Best Practices

All providers should:
1. Use `this.handleApiError()` for consistent error formatting
2. Include operation context in error messages
3. Preserve original error details for debugging
4. Return meaningful error messages to users
5. Fail gracefully with helpful suggestions