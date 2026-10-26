const { getDefaultConfig } = require("expo/metro-config");
const path = require("path");

const projectRoot = __dirname;
const monorepoRoot = path.resolve(projectRoot, "../..");

const config = getDefaultConfig(projectRoot);

// Soporte para Monorepo (pnpm)
config.watchFolders = [monorepoRoot];
config.resolver.nodeModulesPaths = [
  path.resolve(projectRoot, "node_modules"),
  path.resolve(monorepoRoot, "node_modules"),
];

// Resolución específica para el reemplazo de HMR en Expo SDK 58
const defaultResolveRequest = config.resolver.resolveRequest;
config.resolver.resolveRequest = (context, moduleName, platform) => {
  if (
    moduleName === "expo/src/async-require/hmr.ts" ||
    moduleName.startsWith("expo/src/async-require/")
  ) {
    try {
      const filePath = require.resolve(moduleName, { paths: [projectRoot] });
      return {
        filePath,
        type: "sourceFile",
      };
    } catch {}
  }

  if (defaultResolveRequest) {
    return defaultResolveRequest(context, moduleName, platform);
  }
  return context.resolveRequest(context, moduleName, platform);
};

module.exports = config;
