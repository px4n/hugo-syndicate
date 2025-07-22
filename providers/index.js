const DevToProvider = require("./devto/DevToProvider");
const QiitaProvider = require("./qiita/QiitaProvider");

const PROVIDERS = {
  devto: DevToProvider,
  qiita: QiitaProvider,
};

function createProvider(providerName, config) {
  const Provider = PROVIDERS[providerName.toLowerCase()];

  if (!Provider) {
    throw new Error(`Unknown provider: ${providerName}. Available providers: ${Object.keys(PROVIDERS).join(", ")}`);
  }

  return new Provider(config);
}

function getAvailableProviders() {
  return Object.keys(PROVIDERS);
}

module.exports = {
  createProvider,
  getAvailableProviders,
  DevToProvider,
  QiitaProvider,
};
