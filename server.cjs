const http = require("http");
const fs = require("fs");
const path = require("path");

const port = Number(process.env.PORT || 5501);
const host = process.env.HOST || "0.0.0.0";
const root = __dirname;

const types = {
  ".html": "text/html; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".js": "application/javascript; charset=utf-8",
};

const server = http.createServer((request, response) => {
  const requestPath = new URL(request.url, `http://${host}:${port}`).pathname;
  const url = requestPath === "/" ? "/index.html" : decodeURIComponent(requestPath);
  const filePath = path.normalize(path.join(root, url));

  if (!filePath.startsWith(root)) {
    response.writeHead(403);
    response.end("Forbidden");
    return;
  }

  fs.readFile(filePath, (error, data) => {
    if (error) {
      response.writeHead(404);
      response.end("Not found");
      return;
    }

    response.writeHead(200, {
      "Content-Type": types[path.extname(filePath)] || "text/plain; charset=utf-8",
    });
    response.end(data);
  });
});

server.listen(port, host, () => {
  console.log(`Sales app running at http://${host}:${port}`);
});
