class Connection {
  static Event = {
    // Protocol events
    Join: 'j',
    Leave: 'l',
    GroupMessage: 'g',
    PrivateMessage: 'p',
    Roster: 'r',
    Error: 'e',

    // Internal events:
    Connected: "connected"
  };

  constructor(websocketURL) {
    this.handlers = {};
    this.websocketURL = websocketURL;
  }

  on(event, handler) {
    this.handlers[event] = handler;
  }

  emit(event, data) {
    var handler = this.handlers[event];
    if (handler) {
      handler(data);
    }
  }

  isOpen() {
    return this.websocket && this.websocket.readyState == WebSocket.OPEN;
  }

  connect() {
    // If this connection is already open, do nothing.
    if (this.isOpen()) {
      return;
    }

    this.websocket = new WebSocket(websocketURL);
    this.websocket.addEventListener("open", this.onOpen.bind(this));
    this.websocket.addEventListener("message", this.onMessage.bind(this));
    this.websocket.addEventListener("error", this.onSocketError.bind(this));
  }

  onOpen() {
    this.emit("open");
  }

  // Triggered when a WebSocket message is received.
  onMessage(event) {
    if (event.data.length == 0) {
      return;
    }

    var msgType = event.data.slice(0, 1);
    var msg = JSON.parse(event.data.slice(1));

    if (!Object.values(Connection.Event).includes(msgType)) {
      this.error("unknownMsgTypeReceived", { msgType });
      return;
    }

    this.emit(msgType, msg);
  }

  send(event, data) {
    var text = event + JSON.stringify(data);
    this.websocket.send(text);
  }

  disconnect() {
    this.websocket.close();
  }

  // The WebSocket unexpectedly closed.
  onSocketError(event) {

  } 
}