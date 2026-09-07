module.exports = {
  preset: "jest-expo",
  testMatch: ["<rootDir>/tests/**/*.test.tsx"],
  transformIgnorePatterns: [
    "node_modules/(?!((\\.pnpm/)?(jest-)?react-native|\\.pnpm/|@react-native|expo|@expo|react-navigation|@react-navigation))",
  ],
};
