import fs from 'node:fs';
import path from 'node:path';
import http from 'node:http';

export const httpServer = http.createServer(function (request, response) {
  const __dirname = path.resolve(path.dirname(''));
  const file_path = __dirname + (request.url === '/' ? '/front/index.html' : '/front' + request.url);
  fs.readFile(file_path, function (error, data) {
    if (error) {
      response.writeHead(404);
      response.end(JSON.stringify(error));
      return;
    }
    response.writeHead(200);
    response.end(data);
  });
});
