import 'dotenv/config';
import { CreateWebSocketServer } from './src/websocket-server';
import { httpServer } from './src/http_server/index';

const HTTP_PORT = Number(process.env.HTTP_PORT ?? 8181);
const WS_PORT = Number(process.env.WS_PORT ?? 3000);

httpServer.listen(HTTP_PORT);
new CreateWebSocketServer(WS_PORT);
console.log(`Start static http server on the ${HTTP_PORT} port!`);
console.log(`Start websocket server on the ${WS_PORT} port!`);
