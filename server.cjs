const http = require("http");
const { readFile } = require("fs");
const { extname, join, normalize } = require("path");

const root = __dirname;
const port = 4173;
const mime = {
  ".css": "text/css; charset=utf-8",
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".md": "text/markdown; charset=utf-8"
};

http.createServer((request, response) => {
  const pathname = new URL(request.url, "http://localhost").pathname;
  const relative = pathname === "/" ? "index.html" : decodeURIComponent(pathname).replace(/^\/+/, "");
  const filePath = normalize(join(root, relative));
  if (!filePath.startsWith(root)) {
    response.writeHead(403).end("Forbidden");
    return;
  }
  readFile(filePath, (error, file) => {
    if (error) {
      response.writeHead(404, { "Content-Type": "text/plain; charset=utf-8" }).end("Not found");
      return;
    }
    response.writeHead(200, { "Content-Type": mime[extname(filePath)] || "application/octet-stream", "Cache-Control": "no-store" });
    response.end(file);
  });
}).listen(port, "127.0.0.1", () => console.log(`Augment Line: http://127.0.0.1:${port}`));
