import { readFile, writeFile } from "node:fs/promises";
const file = "apps/mobile/package.json";
const pkg = JSON.parse(await readFile(file, "utf8"));
for (const [name, version] of Object.entries(pkg.dependencies)) {
  if (version.startsWith("workspace:")) continue;
  const installed = JSON.parse(
    await readFile(`apps/mobile/node_modules/${name}/package.json`, "utf8"),
  );
  pkg.dependencies[name] = installed.version;
}
pkg.scripts.export =
  "expo export --platform android --output-dir dist/android && expo export --platform ios --output-dir dist/ios";
await writeFile(file, JSON.stringify(pkg, null, 2) + "\n");
