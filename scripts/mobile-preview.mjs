// Only serves the already exported Expo web QA bundle, on loopback.
import http from "node:http";
import { readFile } from "node:fs/promises";
import path from "node:path";
const root = path.resolve(process.env.MOBILE_PREVIEW_DIR ?? "apps/mobile/dist");
const port = Number(process.env.MOBILE_PREVIEW_PORT ?? 5185);
if (!Number.isInteger(port) || port < 1024 || port > 65535)
  throw new Error("MOBILE_PREVIEW_PORT geçerli bir yerel port olmalı.");
const mime = {
  ".html": "text/html",
  ".js": "application/javascript",
  ".json": "application/json",
  ".png": "image/png",
};
const server = http.createServer(async (req, res) => {
  try {
    const url = new URL(req.url, `http://127.0.0.1:${port}`);
    const filename = path.resolve(
      root,
      "." +
        decodeURIComponent(url.pathname === "/" ? "/index.html" : url.pathname),
    );
    if (!filename.startsWith(root + path.sep)) {
      res.writeHead(403).end();
      return;
    }
    const file = await readFile(filename);
    res.setHeader(
      "Content-Type",
      mime[path.extname(filename)] ?? "application/octet-stream",
    );
    res.setHeader("Cache-Control", "no-store");
    res.end(file);
  } catch {
    res.writeHead(404).end("Export the mobile preview first.");
  }
});
server.listen(port, "127.0.0.1");
for (const signal of ["SIGTERM", "SIGINT"])
  process.on(signal, () => server.close(() => process.exit()));
