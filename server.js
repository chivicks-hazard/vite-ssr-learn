import express from "express";
import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const isProduction = process.env.NODE_ENV === "production";
const port = process.env.PORT || 5173;
const base = process.env.BASE || "/";

const root = process.env.VERCEL ? process.cwd() : __dirname;

export async function createServer() {
  const app = express();

  /** @type {import('vite').ViteDevServer} */
  let vite;

  if (!isProduction) {
    const { createServer: createViteServer } = await import("vite");
    vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "custom",
      base,
    });

    app.use(vite.middlewares);
  } else {
    const compression = (await import("compression")).default;
    const sirv = (await import("sirv")).default;

    app.use(compression());
    app.use(base, sirv(path.resolve(root, "./dist/client"), { extensions: [] }));
  }

  app.use("*all", async (req, res) => {
    try {
      const url = req.originalUrl.replace(base, "");

      let template;
      let render;

      if (!isProduction) {
        template = await fs.readFile(path.resolve(root, "./index.html"), "utf-8");
        template = await vite.transformIndexHtml(url, template);
        render = (await vite.ssrLoadModule("/src/entry-server.jsx")).render;
      } else {
        template = await fs.readFile(path.resolve(root, "./dist/client/template.html"), "utf-8");
        const ssrModule = await import(path.resolve(root, "./dist/server/entry-server.js"));
        render = ssrModule.render;
      }

      const rendered = await render(url);

      const html = template
        .replace("<!--app-head-->", rendered.head ?? "")
        .replace("<!--app-html-->", rendered.html ?? "");

      res.status(200).set({ "Content-Type": "text/html" }).end(html);
    } catch (e) {
      vite?.ssrFixStacktrace(e);
      console.log(e.stack);
      res.status(500).end(e.stack);
    }
  });

  return { app, vite };
}

if (process.env.NODE_ENV !== "test" && import.meta.url === `file://${path.join(__dirname, "server.js").replace(/\\/g, "/")}`) {
  createServer().then(({ app }) => {
    app.listen(port, () => {
      console.log(`Server started at http://localhost:${port}`);
    });
  });
}
