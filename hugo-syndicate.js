#!/usr/bin/env node
const fs = require("fs");
const path = require("path");
const axios = require("axios");
const fm = require("front-matter");
const { execSync } = require("child_process");
const TOML = require("@iarna/toml");

const DEVTO_API_KEY = process.env.DEVTO_API_KEY;
const API_BASE = "https://dev.to/api";

// Debug levels
const DEBUG_LEVELS = {
  ERROR: 0,
  WARN: 1,
  INFO: 2,
  DEBUG: 3,
  VERBOSE: 4,
};

const DEBUG_LEVEL = process.env.DEBUG_LEVEL ? parseInt(process.env.DEBUG_LEVEL) : DEBUG_LEVELS.INFO;

function log(level, message, data = null) {
  if (level <= DEBUG_LEVEL) {
    const levels = ["ERROR", "WARN", "INFO", "DEBUG", "VERBOSE"];
    const timestamp = new Date().toISOString();
    const prefix = `[${timestamp}] [${levels[level]}]`;

    console.log(`${prefix} ${message}`);
    if (data && DEBUG_LEVEL >= DEBUG_LEVELS.DEBUG) {
      console.log(JSON.stringify(data, null, 2));
    }
  }
}

// Configurable settings
const SYNC_CONFIG = {
  contentDir: process.env.CONTENT_DIR || "content/",
  allowedTypes: ["post"],
  allowedDirectories: ["blog/", "articles/", "posts/", "tech/", "tutorials/"], // relative to contentDir
  requireExplicitSync: true,
  maxTags: 4, // dev.to API limitation
};

// Cache for Hugo config to avoid re-reading
let hugoConfig = null;

function loadHugoConfig() {
  if (hugoConfig) return hugoConfig;

  try {
    const configPath = path.join(process.cwd(), "hugo.toml");
    if (fs.existsSync(configPath)) {
      const configContent = fs.readFileSync(configPath, "utf8");
      hugoConfig = TOML.parse(configContent);
      log(DEBUG_LEVELS.DEBUG, "Loaded Hugo configuration from hugo.toml");
    } else {
      log(DEBUG_LEVELS.WARN, "hugo.toml not found, using fallback URL generation");
      hugoConfig = { permalinks: {} };
    }
  } catch (error) {
    log(DEBUG_LEVELS.ERROR, "Failed to parse hugo.toml", error.message);
    hugoConfig = { permalinks: {} };
  }

  return hugoConfig;
}

function validateEnvironment() {
  log(DEBUG_LEVELS.INFO, "Validating environment...");

  if (!DEVTO_API_KEY) {
    log(DEBUG_LEVELS.ERROR, "DEVTO_API_KEY environment variable is not set");
    process.exit(1);
  }

  log(DEBUG_LEVELS.DEBUG, "DEVTO_API_KEY found", {
    keyPreview: DEVTO_API_KEY.substring(0, 8) + "...",
  });
}

async function testDevToConnection() {
  log(DEBUG_LEVELS.INFO, "Testing dev.to API connection...");

  try {
    const response = await axios.get(`${API_BASE}/users/me`, {
      headers: { "api-key": DEVTO_API_KEY },
    });

    log(DEBUG_LEVELS.INFO, `Connected to dev.to as: ${response.data.name} (@${response.data.username})`);
    return true;
  } catch (error) {
    log(DEBUG_LEVELS.ERROR, "Failed to connect to dev.to API");
    log(DEBUG_LEVELS.ERROR, "Error details", {
      status: error.response?.status,
      message: error.message,
    });
    return false;
  }
}

async function getAllDevToArticles() {
  log(DEBUG_LEVELS.INFO, "Fetching all articles from dev.to...");

  try {
    const [publishedResponse, unpublishedResponse] = await Promise.all([
      axios.get(`${API_BASE}/articles/me/published`, {
        headers: { "api-key": DEVTO_API_KEY },
        timeout: 10000,
      }),
      axios.get(`${API_BASE}/articles/me/unpublished`, {
        headers: { "api-key": DEVTO_API_KEY },
        timeout: 10000,
      }),
    ]);

    const allArticles = [...(publishedResponse.data || []), ...(unpublishedResponse.data || [])];

    log(DEBUG_LEVELS.INFO, `Found ${allArticles.length} articles on dev.to`);
    log(
      DEBUG_LEVELS.DEBUG,
      "dev.to articles",
      allArticles.map((article) => ({
        id: article.id,
        title: article.title,
        canonical_url: article.canonical_url,
        published: article.published,
      }))
    );

    return allArticles;
  } catch (error) {
    log(DEBUG_LEVELS.ERROR, "Failed to fetch articles from dev.to");
    throw error;
  }
}

function findExistingArticle(frontMatter, devtoArticles) {
  log(DEBUG_LEVELS.DEBUG, `Looking for existing article: "${frontMatter.title}"`);

  // Try to match by canonical URL first (most reliable)
  if (frontMatter.canonical_url) {
    const byCanonical = devtoArticles.find((article) => article.canonical_url === frontMatter.canonical_url);
    if (byCanonical) {
      log(DEBUG_LEVELS.DEBUG, `Found match by canonical URL: ${byCanonical.id}`);
      return byCanonical;
    }
  }

  // Fallback to title matching
  const byTitle = devtoArticles.find((article) => article.title === frontMatter.title);

  if (byTitle) {
    log(DEBUG_LEVELS.DEBUG, `Found match by title: ${byTitle.id}`);
    return byTitle;
  }

  log(DEBUG_LEVELS.DEBUG, `No existing article found`);
  return null;
}

function shouldSyncPost(frontMatter, filePath) {
  log(DEBUG_LEVELS.DEBUG, `Evaluating sync eligibility for: ${filePath}`);

  // Check explicit sync flag
  if (SYNC_CONFIG.requireExplicitSync && frontMatter.devto !== true) {
    return { sync: false, reason: "syndication not enabled in front matter" };
  }

  // Check draft status
  if (frontMatter.draft === true) {
    return { sync: false, reason: "post is marked as draft" };
  }

  // Check visibility
  if (frontMatter.visibility === "private") {
    return { sync: false, reason: "post marked as private" };
  }

  // Check directory path
  if (SYNC_CONFIG.allowedDirectories.length > 0) {
    // Make file path relative to content directory
    const relativePath = filePath.replace(new RegExp(`^${SYNC_CONFIG.contentDir}`), "");
    const inAllowedDir = SYNC_CONFIG.allowedDirectories.some((dir) => relativePath.startsWith(dir));
    if (!inAllowedDir) {
      return { sync: false, reason: "not in allowed directory" };
    }
  }

  // Check post type
  const postType = frontMatter.type || "post";
  if (!SYNC_CONFIG.allowedTypes.includes(postType)) {
    return { sync: false, reason: `post type '${postType}' not allowed` };
  }

  // No additional filtering needed - devto=true flag is sufficient
  return { sync: true, reason: "all validation checks passed" };
}

function transformHugoShortcodes(content) {
  log(DEBUG_LEVELS.DEBUG, "Transforming Hugo shortcodes for dev.to...");

  let transformed = content;

  // Transform {{< image >}} shortcode to markdown image
  transformed = transformed.replace(
    /\{\{<\s*image\s+src="([^"]+)"\s+alt="([^"]*)"\s*(?:position="[^"]*")?\s*(?:style="[^"]*")?\s*>\}\}/g,
    (match, src, alt) => {
      // Convert relative URLs to absolute
      const imageUrl = src.startsWith("/") ? `${process.env.HUGO_BASE_URL || "https://yoursite.com"}${src}` : src;
      return `![${alt}](${imageUrl})`;
    }
  );

  // Transform {{< code >}} shortcode to fenced code block
  transformed = transformed.replace(
    /\{\{<\s*code\s+language="([^"]+)"\s+title="([^"]*)"\s*(?:open="[^"]*")?\s*>\}\}([\s\S]*?)\{\{<\s*\/code\s*>\}\}/g,
    (match, language, title, code) => {
      const cleanCode = code.trim();
      return title
        ? `**${title}**\n\n\`\`\`${language}\n${cleanCode}\n\`\`\``
        : `\`\`\`${language}\n${cleanCode}\n\`\`\``;
    }
  );

  // Transform {{< youtube >}} shortcode
  transformed = transformed.replace(/\{\{<\s*youtube\s+([^>\s]+)\s*>\}\}/g, (match, videoId) => {
    return `{% youtube ${videoId} %}`;
  });

  // Transform {{< twitter >}} shortcode
  transformed = transformed.replace(/\{\{<\s*twitter\s+([^>\s]+)\s*>\}\}/g, (match, tweetId) => {
    return `{% twitter ${tweetId} %}`;
  });

  // Transform {{< gist >}} shortcode
  transformed = transformed.replace(/\{\{<\s*gist\s+([^>\s]+)\s+([^>\s]+)\s*>\}\}/g, (match, username, gistId) => {
    return `{% gist ${gistId} %}`;
  });

  if (transformed !== content) {
    log(DEBUG_LEVELS.DEBUG, "Transformed Hugo shortcodes to dev.to compatible format");
  }

  return transformed;
}

function sanitizeTagsForDevTo(tags) {
  if (!tags || !Array.isArray(tags)) return [];

  return tags
    .map((tag) => {
      // Convert to string and sanitize
      let sanitized = String(tag)
        .toLowerCase()
        .replace(/[^a-z0-9]/g, "") // Remove all non-alphanumeric characters
        .substring(0, 30); // dev.to has max tag length

      // Log transformations for transparency
      if (sanitized !== tag.toLowerCase()) {
        log(DEBUG_LEVELS.INFO, `Tag transformed: "${tag}" → "${sanitized}"`);
      }

      return sanitized;
    })
    .filter((tag) => tag.length > 0); // Remove empty tags
}

async function deleteAndRecreateArticle(existingArticle, parsed) {
  const frontMatter = parsed.attributes;

  log(DEBUG_LEVELS.INFO, `Deleting and recreating article: "${frontMatter.title}"`);

  try {
    // Mark as unpublished instead of deleting (dev.to doesn't have delete API)
    await axios.put(
      `${API_BASE}/articles/${existingArticle.id}`,
      {
        article: {
          published: false,
          body_markdown: `This article has been replaced.\n\n*Replaced on: ${new Date().toISOString()}*`,
        },
      },
      {
        headers: { "api-key": DEVTO_API_KEY },
        timeout: 10000,
      }
    );

    log(DEBUG_LEVELS.INFO, `Marked old article as unpublished: ${existingArticle.id}`);

    // Transform Hugo shortcodes for the new article
    const transformedBody = transformHugoShortcodes(parsed.body);

    // Sanitize and limit tags for dev.to
    let tags = sanitizeTagsForDevTo(frontMatter.tags || []);
    if (tags.length > SYNC_CONFIG.maxTags) {
      log(DEBUG_LEVELS.WARN, `Post has ${tags.length} tags, limiting to first ${SYNC_CONFIG.maxTags} for dev.to`);
      tags = tags.slice(0, SYNC_CONFIG.maxTags);
    }

    // Create new article
    const article = {
      title: frontMatter.title,
      published: frontMatter.published !== false && frontMatter.draft !== true,
      body_markdown: transformedBody,
      tags: tags,
      canonical_url: frontMatter.canonical_url,
      series: frontMatter.series,
    };

    // Only add description if it exists and is not empty
    if (frontMatter.description && frontMatter.description.trim() !== "") {
      article.description = frontMatter.description;
    }

    // Remove undefined/null values
    Object.keys(article).forEach((key) => {
      if (article[key] === undefined || article[key] === null || article[key] === "") {
        delete article[key];
      }
    });

    log(DEBUG_LEVELS.DEBUG, "Article payload for dev.to", {
      title: article.title,
      tags: article.tags,
      canonical_url: article.canonical_url,
      published: article.published,
    });

    const response = await axios.post(
      `${API_BASE}/articles`,
      { article },
      {
        headers: { "api-key": DEVTO_API_KEY },
        timeout: 10000,
      }
    );

    log(DEBUG_LEVELS.INFO, `Created new article: "${frontMatter.title}"`);
    log(DEBUG_LEVELS.INFO, `Article URL: ${response.data.url}`);

    return response.data;
  } catch (error) {
    log(DEBUG_LEVELS.ERROR, `Failed to delete and recreate article`);
    log(DEBUG_LEVELS.ERROR, "Delete/recreate error details", {
      status: error.response?.status,
      message: error.message,
      data: error.response?.data,
    });
    throw error;
  }
}

async function createOrUpdateArticle(parsed, existingArticle) {
  const frontMatter = parsed.attributes;

  // Transform Hugo shortcodes to dev.to compatible format
  const transformedBody = transformHugoShortcodes(parsed.body);

  // Sanitize and limit tags for dev.to
  let tags = sanitizeTagsForDevTo(frontMatter.tags || []);
  if (tags.length > SYNC_CONFIG.maxTags) {
    log(DEBUG_LEVELS.WARN, `Post has ${tags.length} tags, limiting to first ${SYNC_CONFIG.maxTags} for dev.to`);
    tags = tags.slice(0, SYNC_CONFIG.maxTags);
  }

  const article = {
    title: frontMatter.title,
    published: frontMatter.published !== false && frontMatter.draft !== true,
    body_markdown: transformedBody,
    tags: tags,
    canonical_url: frontMatter.canonical_url,
    series: frontMatter.series,
  };

  // Only add description if it exists and is not empty
  if (frontMatter.description && frontMatter.description.trim() !== "") {
    article.description = frontMatter.description;
  }

  // Remove undefined/null values
  Object.keys(article).forEach((key) => {
    if (article[key] === undefined || article[key] === null || article[key] === "") {
      delete article[key];
    }
  });

  try {
    let response;

    if (existingArticle) {
      // Check if we should delete and recreate due to major changes
      const hasCanonicalMismatch = existingArticle.canonical_url !== article.canonical_url;
      const hasTitleMismatch = existingArticle.title !== article.title;

      if (hasCanonicalMismatch || hasTitleMismatch) {
        log(DEBUG_LEVELS.INFO, `Major changes detected, will delete and recreate`);
        if (hasCanonicalMismatch) {
          log(DEBUG_LEVELS.DEBUG, `Canonical URL: "${existingArticle.canonical_url}" → "${article.canonical_url}"`);
        }
        if (hasTitleMismatch) {
          log(DEBUG_LEVELS.DEBUG, `Title: "${existingArticle.title}" → "${article.title}"`);
        }

        const result = await deleteAndRecreateArticle(existingArticle, parsed);
        return result;
      }

      // Update existing article
      log(DEBUG_LEVELS.INFO, `Updating existing article: "${frontMatter.title}"`);

      response = await axios.put(
        `${API_BASE}/articles/${existingArticle.id}`,
        { article },
        {
          headers: { "api-key": DEVTO_API_KEY },
          timeout: 10000,
        }
      );

      log(DEBUG_LEVELS.INFO, `Successfully updated: "${frontMatter.title}"`);
    } else {
      // Create new article
      log(DEBUG_LEVELS.INFO, `Creating new article: "${frontMatter.title}"`);

      response = await axios.post(
        `${API_BASE}/articles`,
        { article },
        {
          headers: { "api-key": DEVTO_API_KEY },
          timeout: 10000,
        }
      );

      log(DEBUG_LEVELS.INFO, `Successfully created: "${frontMatter.title}"`);
      log(DEBUG_LEVELS.INFO, `Article URL: ${response.data.url}`);
    }

    return response.data;
  } catch (error) {
    log(DEBUG_LEVELS.ERROR, `Error syncing "${frontMatter.title}"`);
    log(DEBUG_LEVELS.ERROR, "Sync error details", {
      status: error.response?.status,
      message: error.message,
      data: error.response?.data,
    });
    throw error;
  }
}

function generateCanonicalUrl(filePath, frontMatter) {
  log(DEBUG_LEVELS.DEBUG, `Generating canonical URL for: ${filePath}`);

  const baseUrl = process.env.HUGO_BASE_URL || "https://yoursite.com";
  const config = loadHugoConfig();

  // Extract relative path from configurable content directory
  const contentDirRegex = new RegExp(`^${SYNC_CONFIG.contentDir}`);
  const relativePath = filePath.replace(contentDirRegex, "");

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
  const permalinkPattern = config.permalinks?.page?.[section] || config.permalinks?.[section];

  if (permalinkPattern) {
    log(DEBUG_LEVELS.DEBUG, `Using Hugo permalink pattern: ${permalinkPattern}`);

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
    if (language && language !== "en" && config.defaultContentLanguage !== language) {
      url = `/${language}${url}`;
    }

    const canonicalUrl = `${baseUrl}${url}`;
    log(DEBUG_LEVELS.DEBUG, `Generated canonical URL: ${canonicalUrl}`);

    log(DEBUG_LEVELS.VERBOSE, "Hugo-aware URL generation details", {
      filePath,
      relativePath,
      section,
      slug,
      language: language || "en (default)",
      permalinkPattern,
      year,
      month,
      day: dayValue,
      url,
      canonicalUrl,
    });

    return canonicalUrl;
  }

  // Fallback to previous logic if no permalink pattern found
  log(DEBUG_LEVELS.DEBUG, `No permalink pattern found for section '${section}', using fallback`);

  let urlPath;
  if (language && language !== "en") {
    urlPath = dir ? `/${language}/${dir}/${slug}/` : `/${language}/${slug}/`;
  } else {
    urlPath = dir ? `/${dir}/${slug}/` : `/${slug}/`;
  }

  const canonicalUrl = `${baseUrl}${urlPath}`;
  log(DEBUG_LEVELS.DEBUG, `Fallback canonical URL: ${canonicalUrl}`);

  log(DEBUG_LEVELS.VERBOSE, "Fallback URL generation details", {
    filePath,
    relativePath,
    slug,
    language: language || "en (default)",
    directory: dir || "root",
    urlPath,
    canonicalUrl,
  });

  return canonicalUrl;
}

function parseHugoFile(filePath) {
  const content = fs.readFileSync(filePath, "utf8");

  try {
    let parsed;

    if (content.startsWith("---")) {
      // YAML front matter
      parsed = fm(content);
      log(DEBUG_LEVELS.DEBUG, "Parsed as YAML front matter");
    } else if (content.startsWith("+++")) {
      // TOML front matter
      const tomlMatch = content.match(/^\+\+\+\n([\s\S]*?)\n\+\+\+\n([\s\S]*)$/);
      if (tomlMatch) {
        const tomlContent = tomlMatch[1];
        const bodyContent = tomlMatch[2];

        const attributes = {};
        const lines = tomlContent.split("\n");

        for (const line of lines) {
          const trimmed = line.trim();
          if (trimmed && !trimmed.startsWith("#")) {
            const equalIndex = trimmed.indexOf("=");
            if (equalIndex > 0) {
              const key = trimmed.substring(0, equalIndex).trim();
              let value = trimmed.substring(equalIndex + 1).trim();

              if (value.startsWith('"') && value.endsWith('"')) {
                value = value.slice(1, -1);
              } else if (value.startsWith("[") && value.endsWith("]")) {
                value = value
                  .slice(1, -1)
                  .split(",")
                  .map((item) => item.trim().replace(/"/g, ""))
                  .filter((item) => item);
              } else if (value === "true") {
                value = true;
              } else if (value === "false") {
                value = false;
              }

              attributes[key] = value;
            }
          }
        }

        parsed = {
          attributes: attributes,
          body: bodyContent.trim(),
        };

        log(DEBUG_LEVELS.DEBUG, "Parsed as TOML front matter");
      } else {
        throw new Error("Invalid TOML front matter format");
      }
    } else {
      throw new Error("Unsupported front matter format - must start with --- or +++");
    }

    // Auto-generate canonical URL if not provided
    if (!parsed.attributes.canonical_url) {
      parsed.attributes.canonical_url = generateCanonicalUrl(filePath, parsed.attributes);
      log(DEBUG_LEVELS.INFO, `Auto-generated canonical URL: ${parsed.attributes.canonical_url}`);
    }

    return parsed;
  } catch (parseError) {
    log(DEBUG_LEVELS.ERROR, `Failed to parse front matter in ${filePath}`, parseError.message);
    throw parseError;
  }
}

async function cleanupOrphanedArticles(allHugoFiles, allDevToArticles) {
  log(DEBUG_LEVELS.INFO, "Checking for orphaned articles on dev.to...");

  // Get all canonical URLs and titles from Hugo files
  const hugoArticles = new Set();

  for (const file of allHugoFiles) {
    try {
      if (!fs.existsSync(file)) continue;

      const parsed = parseHugoFile(file);
      const syncCheck = shouldSyncPost(parsed.attributes, file);

      if (syncCheck.sync) {
        // Add canonical URL as primary identifier
        if (parsed.attributes.canonical_url) {
          hugoArticles.add(parsed.attributes.canonical_url);
        }
        // Add title as fallback identifier
        if (parsed.attributes.title) {
          hugoArticles.add(parsed.attributes.title);
        }
      }
    } catch (error) {
      log(DEBUG_LEVELS.DEBUG, `Failed to parse ${file}`, error.message);
    }
  }

  log(DEBUG_LEVELS.DEBUG, `Found ${hugoArticles.size} sync-eligible articles in Hugo`);

  // Find orphaned articles
  const orphanedArticles = allDevToArticles.filter((article) => {
    const hasCanonicalMatch = article.canonical_url && hugoArticles.has(article.canonical_url);
    const hasTitleMatch = article.title && hugoArticles.has(article.title);
    return !hasCanonicalMatch && !hasTitleMatch;
  });

  if (orphanedArticles.length === 0) {
    log(DEBUG_LEVELS.INFO, "No orphaned articles found on dev.to");
    return { checked: allDevToArticles.length, orphaned: 0, deleted: 0 };
  }

  log(DEBUG_LEVELS.INFO, `Found ${orphanedArticles.length} orphaned articles on dev.to`);

  let deletedCount = 0;

  for (const article of orphanedArticles) {
    log(DEBUG_LEVELS.INFO, `  "${article.title}" (ID: ${article.id})`);

    if (process.env.AUTO_DELETE_DEVTO === "true") {
      try {
        await axios.put(
          `${API_BASE}/articles/${article.id}`,
          {
            article: {
              published: false,
              body_markdown: `This article has been removed from the source blog.\n\n*Removed on: ${new Date().toISOString()}*`,
            },
          },
          {
            headers: { "api-key": DEVTO_API_KEY },
            timeout: 10000,
          }
        );

        log(DEBUG_LEVELS.INFO, `Unpublished orphaned article: "${article.title}"`);
        deletedCount++;
      } catch (deleteError) {
        log(DEBUG_LEVELS.ERROR, `Failed to unpublish "${article.title}"`);
      }
    } else {
      log(DEBUG_LEVELS.INFO, `Manual action: Consider removing "${article.title}" from dev.to`);
    }
  }

  return {
    checked: allDevToArticles.length,
    orphaned: orphanedArticles.length,
    deleted: deletedCount,
  };
}

async function getChangedFiles() {
  log(DEBUG_LEVELS.INFO, "Getting files to process...");

  if (process.env.FORCE_SYNC_ALL === "true") {
    log(DEBUG_LEVELS.INFO, "FORCE_SYNC_ALL enabled - processing all posts");

    const contentDir = SYNC_CONFIG.contentDir;
    if (!fs.existsSync(contentDir)) {
      log(DEBUG_LEVELS.WARN, `Content directory '${contentDir}' does not exist`);
      return [];
    }

    const allFiles = [];

    function findMarkdownFiles(dir) {
      const items = fs.readdirSync(dir);
      for (const item of items) {
        const fullPath = path.join(dir, item);
        if (fs.statSync(fullPath).isDirectory()) {
          findMarkdownFiles(fullPath);
        } else if (item.endsWith(".md")) {
          allFiles.push(fullPath);
        }
      }
    }

    findMarkdownFiles(contentDir);
    log(DEBUG_LEVELS.INFO, `Found ${allFiles.length} total markdown files`);
    return allFiles;
  }

  // Normal mode: only changed files
  try {
    const gitOutput = execSync("git diff --name-only HEAD~1 HEAD", { encoding: "utf8" });
    const changedFiles = gitOutput
      .split("\n")
      .filter(Boolean)
      .filter((file) => file.startsWith(SYNC_CONFIG.contentDir) && file.endsWith(".md"));

    log(DEBUG_LEVELS.INFO, `Found ${changedFiles.length} changed markdown files`);
    return changedFiles;
  } catch (error) {
    log(DEBUG_LEVELS.ERROR, "Failed to get changed files from Git");
    return [];
  }
}

async function syncToDevTo() {
  log(DEBUG_LEVELS.INFO, "Starting Hugo Syndicate synchronization...");
  log(DEBUG_LEVELS.INFO, `Debug level: ${Object.keys(DEBUG_LEVELS)[DEBUG_LEVEL]} (${DEBUG_LEVEL})`);

  validateEnvironment();

  const connected = await testDevToConnection();
  if (!connected) {
    log(DEBUG_LEVELS.ERROR, "Aborting sync due to API connection failure");
    process.exit(1);
  }

  // Get all dev.to articles for matching and cleanup
  const allDevToArticles = await getAllDevToArticles();

  // Get files to process
  const filesToProcess = await getChangedFiles();

  let cleanupStats = { checked: 0, orphaned: 0, deleted: 0 };

  // If FORCE_SYNC_ALL, also cleanup orphaned articles
  if (process.env.FORCE_SYNC_ALL === "true") {
    cleanupStats = await cleanupOrphanedArticles(filesToProcess, allDevToArticles);
  }

  if (filesToProcess.length === 0) {
    log(DEBUG_LEVELS.INFO, "No markdown files to process");
    if (cleanupStats.orphaned > 0) {
      log(DEBUG_LEVELS.INFO, `Cleanup: ${cleanupStats.deleted}/${cleanupStats.orphaned} orphaned articles handled`);
    }
    return;
  }

  log(DEBUG_LEVELS.INFO, `Processing ${filesToProcess.length} files...`);

  let processed = 0;
  let created = 0;
  let updated = 0;
  let recreated = 0;
  let skipped = 0;
  let errors = 0;

  for (const file of filesToProcess) {
    processed++;
    log(DEBUG_LEVELS.INFO, `\n[${processed}/${filesToProcess.length}] Processing: ${file}`);

    try {
      if (!fs.existsSync(file)) {
        log(DEBUG_LEVELS.WARN, `File ${file} no longer exists, skipping...`);
        continue;
      }

      const parsed = parseHugoFile(file);

      if (!parsed.attributes.title) {
        log(DEBUG_LEVELS.WARN, `Skipping ${file}: No title found`);
        skipped++;
        continue;
      }

      const syncCheck = shouldSyncPost(parsed.attributes, file);

      if (!syncCheck.sync) {
        log(DEBUG_LEVELS.INFO, `Skipping: ${syncCheck.reason}`);
        skipped++;
        continue;
      }

      // Find existing article using natural keys
      const existingArticle = findExistingArticle(parsed.attributes, allDevToArticles);

      const result = await createOrUpdateArticle(parsed, existingArticle);

      if (!existingArticle) {
        created++;
      } else if (result.id !== existingArticle.id) {
        recreated++; // Delete and recreate happened
      } else {
        updated++;
      }
    } catch (error) {
      errors++;
      log(DEBUG_LEVELS.ERROR, `Failed to process ${file}`);
      log(DEBUG_LEVELS.ERROR, "Processing error", error.message);
    }
  }

  // Final summary
  log(DEBUG_LEVELS.INFO, "\nSynchronization Summary:");
  log(DEBUG_LEVELS.INFO, `  Files processed: ${processed}`);
  log(DEBUG_LEVELS.INFO, `  Created: ${created}`);
  log(DEBUG_LEVELS.INFO, `  Updated: ${updated}`);
  log(DEBUG_LEVELS.INFO, `  Recreated: ${recreated}`);
  log(DEBUG_LEVELS.INFO, `  Skipped: ${skipped}`);
  log(DEBUG_LEVELS.INFO, `  Errors: ${errors}`);

  if (process.env.FORCE_SYNC_ALL === "true" && cleanupStats.orphaned > 0) {
    log(DEBUG_LEVELS.INFO, `  Orphaned cleaned: ${cleanupStats.deleted}/${cleanupStats.orphaned}`);
  }

  if (errors > 0) {
    log(DEBUG_LEVELS.ERROR, "Some files failed to sync - check logs above");
    process.exit(1);
  }

  log(DEBUG_LEVELS.INFO, "Synchronization completed successfully!");
}

// Handle uncaught errors
process.on("uncaughtException", (error) => {
  log(DEBUG_LEVELS.ERROR, "Uncaught exception", error);
  process.exit(1);
});

process.on("unhandledRejection", (reason, promise) => {
  log(DEBUG_LEVELS.ERROR, "Unhandled promise rejection", { reason, promise });
  process.exit(1);
});

// Run the sync
syncToDevTo().catch((error) => {
  log(DEBUG_LEVELS.ERROR, "Sync failed", error);
  process.exit(1);
});
