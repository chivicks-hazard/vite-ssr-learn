import fs from "fs";
import path from "path";
import url from "url";

const __dirname = path.dirname(url.fileURLToPath(import.meta.url));

const template = fs.readFileSync(
  path.resolve(__dirname, "dist/client/index.html"),
  "utf-8"
);

const { render } = await import("./dist/server/server.js");

// Define portfolio routes to pre-render
const routes = ["/"];

for (const route of routes) {
  const appHtml = render();

  const html = template.replace(`<!--app-html-->`, appHtml);

  const filePath =
    route === "/" ? "dist/index.html" : `dist${route}/index.html`;

  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, html);
  console.log(`✔ Pre-rendered: ${filePath}`);
}
