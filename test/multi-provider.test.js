const fs = require("fs");
const path = require("path");

// Test the actual provider loading and coordination
describe("Multi-Provider Coordination", () => {
  test("loads multiple providers correctly", () => {
    const providers = ["devto", "qiita"];
    const loadedProviders = [];

    for (const providerName of providers) {
      // Providers are loaded differently - check main provider file
      const providerFile = providerName === "devto" ? "DevToProvider.js" : "QiitaProvider.js";
      const providerPath = path.join(__dirname, "..", "providers", providerName, providerFile);
      expect(fs.existsSync(providerPath)).toBe(true);

      const Provider = require(providerPath);
      const instance = new Provider({ apiKey: "test-key" });

      expect(instance.name).toBe(providerName === "devto" ? "dev.to" : "Qiita");
      loadedProviders.push(instance);
    }

    expect(loadedProviders).toHaveLength(2);
  });

  test("providers have consistent interfaces", () => {
    const DevToProvider = require("../providers/devto/DevToProvider");
    const QiitaProvider = require("../providers/qiita/QiitaProvider");

    const providers = [new DevToProvider({ apiKey: "test" }), new QiitaProvider({ apiKey: "test" })];

    for (const provider of providers) {
      // Check all required methods exist
      expect(typeof provider.authenticate).toBe("function");
      expect(typeof provider.createArticle).toBe("function");
      expect(typeof provider.updateArticle).toBe("function");
      expect(typeof provider.getArticles).toBe("function");
      expect(typeof provider.checkIfArticleExists).toBe("function");
      expect(typeof provider.transformContent).toBe("function");
      expect(typeof provider.formatTags).toBe("function");
    }
  });

  test("content transformation differs between providers", () => {
    const DevToProvider = require("../providers/devto/DevToProvider");
    const QiitaProvider = require("../providers/qiita/QiitaProvider");

    const devto = new DevToProvider({ apiKey: "test" });
    const qiita = new QiitaProvider({ apiKey: "test" });

    const testContent = "{{< youtube abc123 >}}";

    const devtoTransformed = devto.transformContent(testContent);
    const qiitaTransformed = qiita.transformContent(testContent);

    // DevTo uses liquid tags
    expect(devtoTransformed).toBe("{% youtube abc123 %}");

    // Qiita uses link format with URL
    expect(qiitaTransformed).toBe(
      "[YouTube: https://www.youtube.com/watch?v=abc123](https://www.youtube.com/watch?v=abc123)"
    );
  });

  test("tag formatting differs between providers", () => {
    const DevToProvider = require("../providers/devto/DevToProvider");
    const QiitaProvider = require("../providers/qiita/QiitaProvider");

    const devto = new DevToProvider({ apiKey: "test" });
    const qiita = new QiitaProvider({ apiKey: "test" });

    const tags = ["React.js", "node-js", "初心者向け", "web-dev"];

    // DevTo: lowercase, alphanumeric only, max 4
    const devtoTags = devto.formatTags(tags, "Test Article");
    expect(devtoTags).toEqual(["reactjs", "nodejs", "webdev"]);

    // Qiita: allows hyphens, max 5, returns objects
    const qiitaTags = qiita.formatTags(tags, "Test Article");
    expect(qiitaTags).toEqual([
      { name: "reactjs" }, // dots are removed
      { name: "node-js" },
      { name: "web-dev" },
    ]);
  });
});
