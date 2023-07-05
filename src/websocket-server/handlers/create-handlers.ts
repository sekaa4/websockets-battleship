import { RawData, WebSocket } from 'ws';

export class CreateHandlers {
  public ws: WebSocket;
  constructor() {
    // wss.send('Hi');
  }

  public connection = (ws: WebSocket): void => {
    this.ws = ws;
    ws.on('error', console.error);

    ws.on('message', this.message);

    ws.send('WebSocketServer ready to connect');
  };

  private message = (data: RawData): void => {
    const dat = JSON.parse(data.toString());
    //   {
    //     type: "reg",
    //     data:
    //         {
    //             name: <string>,
    //             index: <number>,
    //             error: <bool>,
    //             errorText: <string>,
    //         },
    //     id: 0,
    // }
    const dataObject = JSON.stringify({
      name: dat.name,
      index: 0,
      error: false,
      errorText: '',
    });
    const messageObject = {
      type: 'reg',
      data: dataObject,
      id: 0,
    };
    console.log('received: %s', dat);
    console.log('received this: %s', this);

    this.ws.send(JSON.stringify(messageObject));
  };
}
