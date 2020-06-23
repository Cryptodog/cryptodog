class Connection {
    static Event = {
        // Protocol events
        Join: 'j',
        Leave: 'l',
        GroupMessage: 'g',
        PrivateMessage: 'p',
        Roster: 'r',
        Error: 'e',

        // Internal events
        Connected: 'connected',
        Reconnecting: 'reconnecting'
    };

    constructor(websocketURL) {
        this.handlers = {};
        this.websocketURL = websocketURL;
    }

    on(event, handler) {
        this.handlers[event] = handler;
    }

    emit(event, data) {
        const handler = this.handlers[event];
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

        this.websocket = new WebSocket(this.websocketURL);
        this.websocket.addEventListener('open', this.onOpen.bind(this));
        this.websocket.addEventListener('message', this.onMessage.bind(this));

        this.websocket.onclose = (() => {
            this.emit(Connection.Event.Reconnecting);
            this.connect();
        }).bind(this);
    }

    onOpen() {
        this.emit(Connection.Event.Connected);
    }

    // Triggered when a WebSocket message is received.
    onMessage(event) {
        const type = event.data.slice(0, 1);
        const msg = JSON.parse(event.data.slice(1));

        if (!Object.values(Connection.Event).includes(type)) {
            throw 'Unknown message type received: ' + type;
        }
        this.emit(type, msg);
    }

    send(event, data) {
        if (!this.isOpen()) {
            return;
        }

        const body = data ? JSON.stringify(data) : '';
        this.websocket.send(event + body);
    }

    disconnect() {
        this.websocket.close();
    }
}
