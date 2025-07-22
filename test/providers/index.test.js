const { createProvider, getAvailableProviders } = require("../../providers");
const DevToProvider = require("../../providers/devto/DevToProvider");
const QiitaProvider = require("../../providers/qiita/QiitaProvider");

describe("Provider Factory", () => {
  describe("createProvider", () => {
    test('creates DevToProvider with "devto" name', () => {
      const config = { apiKey: "test-key" };
      const provider = createProvider("devto", config);

      expect(provider).toBeInstanceOf(DevToProvider);
      expect(provider.apiKey).toBe("test-key");
    });

    test('creates QiitaProvider with "qiita" name', () => {
      const config = { apiKey: "test-key" };
      const provider = createProvider("qiita", config);

      expect(provider).toBeInstanceOf(QiitaProvider);
      expect(provider.apiKey).toBe("test-key");
    });

    test("is case insensitive", () => {
      const config = { apiKey: "test-key" };

      const provider1 = createProvider("DEVTO", config);
      expect(provider1).toBeInstanceOf(DevToProvider);

      const provider2 = createProvider("Qiita", config);
      expect(provider2).toBeInstanceOf(QiitaProvider);
    });

    test("throws error for unknown provider", () => {
      const config = { apiKey: "test-key" };

      expect(() => createProvider("unknown", config)).toThrow(
        "Unknown provider: unknown. Available providers: devto, qiita"
      );
    });

    test("passes through all config options", () => {
      const config = {
        apiKey: "test-key",
        baseUrl: "https://custom.api.com",
        customOption: "value",
      };

      const provider = createProvider("devto", config);

      expect(provider.apiKey).toBe("test-key");
      expect(provider.baseUrl).toBe("https://custom.api.com");
    });
  });

  describe("getAvailableProviders", () => {
    test("returns list of available providers", () => {
      const providers = getAvailableProviders();

      expect(providers).toEqual(["devto", "qiita"]);
      expect(providers).toContain("devto");
      expect(providers).toContain("qiita");
    });
  });
});
