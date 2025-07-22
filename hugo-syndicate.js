#!/usr/bin/env node
const fs = require("fs");
const path = require("path");
const fm = require("front-matter");
const { execSync } = require("child_process");
const TOML = require("@iarna/toml");
const { createProvider, getAvailableProviders } = require("./providers");

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

function logError(message, data = null) {
  log(DEBUG_LEVELS.ERROR, message, data);
}

function logWarn(message, data = null) {
  log(DEBUG_LEVELS.WARN, message, data);
}

function logInfo(message, data = null) {
  log(DEBUG_LEVELS.INFO, message, data);
}

function logDebug(message, data = null) {
  log(DEBUG_LEVELS.DEBUG, message, data);
}

function logVerbose(message, data = null) {
  log(DEBUG_LEVELS.VERBOSE, message, data);
}

const SYNC_CONFIG = {
  contentDir: process.env.CONTENT_DIR || "content/",
  allowedTypes: ["post"],
  allowedDirectories: ["blog/", "articles/", "posts/", "tech/", "tutorials/"],
  requireExplicitSync: true,
  defaultProvider: process.env.DEFAULT_PROVIDER || "devto",
  providers: (process.env.PROVIDERS || "devto").split(",").map((p) => p.trim()),
};

// Cache for Hugo config to avoid re-reading
let hugoConfig = null;

/**
 * Loads Hugo configuration from config files
 * @returns {Object} Hugo configuration object
 */
function loadHugoConfig() {
  if (hugoConfig) return hugoConfig;

  try {
    const configPath = path.join(process.cwd(), "hugo.toml");
    if (fs.existsSync(configPath)) {
      const configContent = fs.readFileSync(configPath, "utf8");
      hugoConfig = TOML.parse(configContent);
      logDebug("Loaded Hugo configuration from hugo.toml");
    } else {
      logWarn("hugo.toml not found, using fallback URL generation");
      hugoConfig = { permalinks: {} };
    }
  } catch (error) {
    logError("Failed to parse hugo.toml", error.message);
    hugoConfig = { permalinks: {} };
  }

  return hugoConfig;
}

/**
 * Gets configuration for a specific provider
 * @param {string} providerName - Name of the provider (devto, qiita)
 * @returns {Object} Provider configuration with apiKey and baseUrl
 * @throws {Error} If provider API key is missing
 */
function getProviderConfig(providerName) {
  const configs = {
    devto: {
      apiKey: process.env.DEVTO_API_KEY,
      baseUrl: process.env.DEVTO_API_BASE || "https://dev.to/api",
    },
    qiita: {
      apiKey: process.env.QIITA_ACCESS_TOKEN,
      baseUrl: process.env.QIITA_API_BASE || "https://qiita.com/api/v2",
    },
  };

  const config = configs[providerName.toLowerCase()];
  if (!config || !config.apiKey) {
    throw new Error(`Missing API key for provider: ${providerName}. Please set the appropriate environment variable.`);
  }

  return config;
}

/**
 * Parses command line arguments
 * @returns {Object} Options object with providers, forceAll, and autoDelete settings
 */
function parseArgs() {
  const args = process.argv.slice(2);
  const options = {
    providers: SYNC_CONFIG.providers,
    forceAll: process.env.FORCE_SYNC_ALL === "true",
    autoDelete: process.env.AUTO_DELETE === "true",
  };

  for (let i = 0; i < args.length; i++) {
    switch (args[i]) {
      case "--provider":
      case "-p":
        if (args[i + 1]) {
          options.providers = [args[i + 1]];
          i++;
        }
        break;
      case "--providers":
        if (args[i + 1]) {
          options.providers = args[i + 1].split(",").map((p) => p.trim());
          i++;
        }
        break;
      case "--force-all":
      case "-f":
        options.forceAll = true;
        break;
      case "--auto-delete":
        options.autoDelete = true;
        break;
      case "--help":
      case "-h":
      case "--version":
      case "-v":
        // Already handled before main() is called
        break;
    }
  }

  return options;
}

function showHelp() {
  console.log(`
Hugo Syndicate - Multi-provider content syndication for Hugo

Usage: hugo-syndicate [options]

Options:
  -p, --provider <name>     Use a specific provider (default: ${SYNC_CONFIG.defaultProvider})
  --providers <names>       Use multiple providers (comma-separated)
  -f, --force-all          Force sync all posts (not just changed)
  --auto-delete            Automatically delete orphaned articles
  -h, --help               Show this help message
  -v, --version            Show version information

Available providers: ${getAvailableProviders().join(", ")}

Environment variables:
  DEVTO_API_KEY           API key for dev.to
  QIITA_ACCESS_TOKEN      Access token for Qiita
  DEFAULT_PROVIDER        Default provider to use
  PROVIDERS               Comma-separated list of providers to sync
  CONTENT_DIR             Hugo content directory (default: content/)
  HUGO_BASE_URL           Base URL for your Hugo site
  DEBUG_LEVEL             Debug level (0-4)
  FORCE_SYNC_ALL          Force sync all posts (true/false)
  AUTO_DELETE             Auto-delete orphaned articles (true/false)
`);
}

function showVersion() {
  const packageInfo = require("./package.json");
  const os = require("os");

  console.log(`Hugo Syndicate v${packageInfo.version}

Build Information:
  Node.js: ${process.version}
  Platform: ${os.platform()} (${os.arch()})
  OS: ${os.type()} ${os.release()}

Package Information:
  Name: ${packageInfo.name}
  Description: ${packageInfo.description}
  License: ${packageInfo.license}
  Repository: ${packageInfo.repository.url}

Supported Providers:
  ${getAvailableProviders()
    .map((p) => `- ${p}`)
    .join("\n  ")}

For more information, visit: ${packageInfo.homepage}`);
}

/**
 * Determines if a post should be synced to a provider
 * @param {Object} frontMatter - Post front matter object
 * @param {string} filePath - Path to the markdown file
 * @param {string} providerName - Name of the provider
 * @returns {Object} Object with sync boolean and reason string
 */
function shouldSyncPost(frontMatter, filePath, providerName) {
  logDebug(`Evaluating sync eligibility for: ${filePath} (provider: ${providerName})`);

  const providerKey = providerName.toLowerCase().replace(/\./g, "");
  if (SYNC_CONFIG.requireExplicitSync && frontMatter[providerKey] !== true && frontMatter.syndicate !== true) {
    return { sync: false, reason: `syndication not enabled for ${providerName} in front matter` };
  }

  if (frontMatter.draft === true) {
    return { sync: false, reason: "post is marked as draft" };
  }

  if (frontMatter.visibility === "private") {
    return { sync: false, reason: "post marked as private" };
  }

  if (SYNC_CONFIG.allowedDirectories.length > 0) {
    const relativePath = filePath.replace(new RegExp(`^${SYNC_CONFIG.contentDir}`), "");
    const inAllowedDir = SYNC_CONFIG.allowedDirectories.some((dir) => relativePath.startsWith(dir));
    if (!inAllowedDir) {
      return { sync: false, reason: "not in allowed directory" };
    }
  }

  // TODO: Future consideration: scheduled posts based on publish_date
  const postType = frontMatter.type || "post";
  if (!SYNC_CONFIG.allowedTypes.includes(postType)) {
    return { sync: false, reason: `post type '${postType}' not allowed` };
  }

  return { sync: true, reason: "all validation checks passed" };
}

/**
 * Generates canonical URL for a post
 * @param {string} filePath - Path to the markdown file
 * @param {Object} frontMatter - Post front matter object
 * @returns {string} Canonical URL for the post
 */
function generateCanonicalUrl(filePath, frontMatter) {
  logDebug(`Generating canonical URL for: ${filePath}`);

  const baseUrl = process.env.HUGO_BASE_URL || "https://yoursite.com";
  const config = loadHugoConfig();

  const contentDirRegex = new RegExp(`^${SYNC_CONFIG.contentDir}`);
  const relativePath = filePath.replace(contentDirRegex, "");

  const fileInfo = path.parse(relativePath);
  const fileName = fileInfo.name;
  const dir = fileInfo.dir;

  const section = dir.split("/")[0] || "page";

  let slug = fileName;
  let language = null;

  const langMatch = fileName.match(/^(.+)\.([a-z]{2})$/);
  if (langMatch) {
    slug = langMatch[1];
    language = langMatch[2];
  }

  let day = null;
  const dateMatch = slug.match(/^(\d{2})-(.+)$/);
  if (dateMatch) {
    day = dateMatch[1];
    slug = dateMatch[2];
  }

  if (frontMatter.slug) {
    slug = frontMatter.slug;
  }

  const permalinkPattern = config.permalinks?.page?.[section] || config.permalinks?.[section];

  if (permalinkPattern) {
    logDebug(`Using Hugo permalink pattern: ${permalinkPattern}`);

    const pathParts = dir.split("/");
    const year =
      pathParts[1] || (frontMatter.date ? frontMatter.date.substring(0, 4) : new Date().getFullYear().toString());
    const month = pathParts[2] || (frontMatter.date ? frontMatter.date.substring(5, 7) : "01");
    const dayValue = day || pathParts[3] || (frontMatter.date ? frontMatter.date.substring(8, 10) : "01");

    let url = permalinkPattern
      .replace(":year", year)
      .replace(":month", month)
      .replace(":day", dayValue)
      .replace(":slug", slug)
      .replace(":title", frontMatter.title ? frontMatter.title.toLowerCase().replace(/[^a-z0-9]+/g, "-") : slug)
      .replace(":filename", fileName);

    if (language && language !== "en" && config.defaultContentLanguage !== language) {
      url = `/${language}${url}`;
    }

    const canonicalUrl = `${baseUrl}${url}`;
    logDebug(`Generated canonical URL: ${canonicalUrl}`);

    return canonicalUrl;
  }

  logDebug(`No permalink pattern found for section '${section}', using fallback`);

  let urlPath;
  if (language && language !== "en") {
    urlPath = dir ? `/${language}/${dir}/${slug}/` : `/${language}/${slug}/`;
  } else {
    urlPath = dir ? `/${dir}/${slug}/` : `/${slug}/`;
  }

  const canonicalUrl = `${baseUrl}${urlPath}`;
  logDebug(`Fallback canonical URL: ${canonicalUrl}`);

  return canonicalUrl;
}

/**
 * Parses a Hugo markdown file and extracts front matter
 * @param {string} filePath - Path to the markdown file
 * @returns {Object|null} Parsed content with frontMatter and content, or null if invalid
 */
function parseHugoFile(filePath) {
  const content = fs.readFileSync(filePath, "utf8");

  try {
    let parsed;

    if (content.startsWith("---")) {
      parsed = fm(content);
      logDebug("Parsed as YAML front matter");
    } else if (content.startsWith("+++")) {
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

        logDebug("Parsed as TOML front matter");
      } else {
        throw new Error("Invalid TOML front matter format");
      }
    } else {
      throw new Error("Unsupported front matter format - must start with --- or +++");
    }

    if (!parsed.attributes.canonical_url) {
      parsed.attributes.canonical_url = generateCanonicalUrl(filePath, parsed.attributes);
      logInfo(`Auto-generated canonical URL: ${parsed.attributes.canonical_url}`);
    }

    return parsed;
  } catch (parseError) {
    logError(`Failed to parse front matter in ${filePath}`, parseError.message);
    // Add more debugging info
    if (logLevel >= 3) {
      logDebug(`File starts with: ${content.substring(0, 10).replace(/\n/g, "\\n")}`);
      logDebug(`Parse error details: ${parseError.stack}`);
    }
    throw parseError;
  }
}

/**
 * Gets list of changed files or all files based on options
 * @param {boolean} forceAll - Whether to process all files instead of just changed
 * @returns {Promise<Array<string>>} Array of file paths to process
 */
async function getChangedFiles(forceAll) {
  logInfo("Getting files to process...");

  if (forceAll) {
    logInfo("Force sync all enabled - processing all posts");

    const contentDir = SYNC_CONFIG.contentDir;
    if (!fs.existsSync(contentDir)) {
      logWarn(`Content directory '${contentDir}' does not exist`);
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
    logInfo(`Found ${allFiles.length} total markdown files`);
    return allFiles;
  }

  try {
    // Try to get changed files from the last commit
    let gitOutput;
    try {
      // Try HEAD~1 first (for regular commits)
      gitOutput = execSync("git diff --name-only HEAD~1 HEAD", { encoding: "utf8" });
    } catch (e) {
      // Handle initial commit scenario
      gitOutput = execSync("git ls-tree --name-only -r HEAD", { encoding: "utf8" });
    }

    const changedFiles = gitOutput
      .split("\n")
      .filter(Boolean)
      .filter((file) => file.startsWith(SYNC_CONFIG.contentDir) && file.endsWith(".md"));

    logInfo(`Found ${changedFiles.length} changed markdown files`);
    return changedFiles;
  } catch (error) {
    logError("Failed to get changed files from Git", error.message);
    return [];
  }
}

async function syncWithProvider(provider, providerName, filesToProcess, options) {
  logInfo(`\n=== Starting sync with ${providerName} ===`);

  // Test connection
  try {
    const auth = await provider.authenticate();
    logInfo(`Connected to ${providerName} as: ${auth.user.name || auth.user.username}`);
  } catch (error) {
    logError(`Failed to connect to ${providerName}`);
    return {
      provider: providerName,
      error: error.message,
      processed: 0,
      created: 0,
      updated: 0,
      skipped: 0,
      errors: 0,
    };
  }

  // Get all articles for matching
  let allArticles = [];
  try {
    allArticles = await provider.getArticles();
    logInfo(`Found ${allArticles.length} articles on ${providerName}`);
  } catch (error) {
    logError(`Failed to fetch articles from ${providerName}`);
  }

  const stats = {
    provider: providerName,
    processed: 0,
    created: 0,
    updated: 0,
    skipped: 0,
    errors: 0,
    orphaned: 0,
    deleted: 0,
  };

  // Process each file
  for (const file of filesToProcess) {
    stats.processed++;
    logInfo(`\n[${stats.processed}/${filesToProcess.length}] Processing: ${file}`);

    try {
      if (!fs.existsSync(file)) {
        logWarn(`File ${file} no longer exists, skipping...`);
        continue;
      }

      const parsed = parseHugoFile(file);

      if (!parsed.attributes.title) {
        logWarn(`Skipping ${file}: No title found`);
        stats.skipped++;
        continue;
      }

      const syncCheck = shouldSyncPost(parsed.attributes, file, providerName);

      if (!syncCheck.sync) {
        logInfo(`Skipping: ${syncCheck.reason}`);
        stats.skipped++;
        continue;
      }

      const article = {
        title: parsed.attributes.title,
        content: parsed.body,
        tags: parsed.attributes.tags || [],
        canonical_url: parsed.attributes.canonical_url,
        description: parsed.attributes.description,
        series: parsed.attributes.series,
        published: parsed.attributes.published !== false && parsed.attributes.draft !== true,
      };

      const existingArticle = await provider.checkIfArticleExists(article.canonical_url, article.title);

      let result;
      if (existingArticle) {
        logInfo(`Updating existing article: "${article.title}"`);
        result = await provider.updateArticle(existingArticle.id, article);
        stats.updated++;
      } else {
        logInfo(`Creating new article: "${article.title}"`);
        result = await provider.createArticle(article);
        stats.created++;
      }

      logInfo(`Article URL: ${result.url}`);
    } catch (error) {
      stats.errors++;
      logError(`Failed to process ${file}`);
      logError("Processing error", error.message);
    }
  }

  // Cleanup orphaned articles if requested
  if (options.forceAll && options.autoDelete) {
    const hugoArticles = new Set();

    for (const file of filesToProcess) {
      try {
        if (!fs.existsSync(file)) continue;

        const parsed = parseHugoFile(file);
        const syncCheck = shouldSyncPost(parsed.attributes, file, providerName);

        if (syncCheck.sync) {
          if (parsed.attributes.canonical_url) {
            hugoArticles.add(parsed.attributes.canonical_url);
          }
          if (parsed.attributes.title) {
            hugoArticles.add(parsed.attributes.title);
          }
        }
      } catch (error) {
        logDebug(`Failed to parse ${file}`, error.message);
      }
    }

    const orphanedArticles = allArticles.filter((article) => {
      const hasCanonicalMatch = article.canonical_url && hugoArticles.has(article.canonical_url);
      const hasTitleMatch = article.title && hugoArticles.has(article.title);
      return !hasCanonicalMatch && !hasTitleMatch;
    });

    stats.orphaned = orphanedArticles.length;

    if (orphanedArticles.length > 0) {
      logInfo(`Found ${orphanedArticles.length} orphaned articles on ${providerName}`);

      for (const article of orphanedArticles) {
        try {
          await provider.deleteArticle(article.id);
          logInfo(`Deleted orphaned article: "${article.title}"`);
          stats.deleted++;
        } catch (error) {
          logError(`Failed to delete "${article.title}"`);
        }
      }
    }
  }

  return stats;
}

/**
 * Main function that orchestrates the sync process
 * @returns {Promise<void>}
 */
async function main() {
  logInfo("Starting Hugo Syndicate multi-provider synchronization...");
  logInfo(`Debug level: ${Object.keys(DEBUG_LEVELS)[DEBUG_LEVEL]} (${DEBUG_LEVEL})`);

  const options = parseArgs();
  const filesToProcess = await getChangedFiles(options.forceAll);

  if (filesToProcess.length === 0) {
    logInfo("No markdown files to process");
    return;
  }

  logInfo(`Processing ${filesToProcess.length} files with providers: ${options.providers.join(", ")}`);

  const results = [];

  for (const providerName of options.providers) {
    try {
      const config = getProviderConfig(providerName);
      const provider = createProvider(providerName, config);
      const result = await syncWithProvider(provider, providerName, filesToProcess, options);
      results.push(result);
    } catch (error) {
      logError(`Failed to initialize provider ${providerName}: ${error.message}`);
      results.push({
        provider: providerName,
        error: error.message,
        processed: 0,
        created: 0,
        updated: 0,
        skipped: 0,
        errors: 0,
      });
    }
  }

  // Final summary
  logInfo("\n=== Synchronization Summary ===");

  let totalErrors = 0;
  for (const result of results) {
    logInfo(`\n${result.provider}:`);
    if (result.error) {
      logError(`  Error: ${result.error}`);
      totalErrors++;
    } else {
      logInfo(`  Files processed: ${result.processed}`);
      logInfo(`  Created: ${result.created}`);
      logInfo(`  Updated: ${result.updated}`);
      logInfo(`  Skipped: ${result.skipped}`);
      logInfo(`  Errors: ${result.errors}`);
      if (result.orphaned > 0) {
        logInfo(`  Orphaned cleaned: ${result.deleted}/${result.orphaned}`);
      }
      totalErrors += result.errors;
    }
  }

  if (totalErrors > 0) {
    logError("\nSome operations failed - check logs above");
    process.exit(1);
  }

  logInfo("\nSynchronization completed successfully!");
}

// Handle unexpected errors appropriately
process.on("uncaughtException", (error) => {
  logError("Uncaught exception", error);
  process.exit(1);
});

process.on("unhandledRejection", (reason, promise) => {
  logError("Unhandled promise rejection", { reason, promise });
  process.exit(1);
});

// Run if called directly
if (require.main === module) {
  // Check for version or help flags before running main
  const args = process.argv.slice(2);
  if (args.includes("--version") || args.includes("-v")) {
    showVersion();
    process.exit(0);
  } else if (args.includes("--help") || args.includes("-h")) {
    showHelp();
    process.exit(0);
  }

  main().catch((error) => {
    logError("Sync failed", error);
    process.exit(1);
  });
}

// Export for testing
module.exports = {
  parseHugoFile,
  generateCanonicalUrl,
  getChangedFiles,
  syncWithProvider,
  main,
  shouldSyncPost,
};
