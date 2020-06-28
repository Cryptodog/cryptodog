class Connection {
    // Internal events.
    static Event = {
        Connected: 1,
        Reconnecting: 2
    };

    constructor(url) {
        this.url = url;
        this.eventHandlers = {};
        this.messageHandlers = {};
    }

    connect() {
        this.websocket = new WebSocket(this.url);

        this.websocket.onopen = (() => {
            this.eventHandlers[Connection.Event.Connected]();
        }).bind(this);

        this.websocket.onclose = (() => {
            this.eventHandlers[Connection.Event.Reconnecting]();
            this.connect();
        }).bind(this);

        this.websocket.onmessage = ((event) => {
            const type = event.data.slice(0, 1);
            const message = JSON.parse(event.data.slice(1));

            if (!(type in this.messageHandlers)) {
                throw 'No handler for message type: ' + type;
            }

            this.messageHandlers[type](message);
        }).bind(this);
    }

    onEvent(event, handler) {
        this.eventHandlers[event] = handler;
    }

    onMessage(type, handler) {
        this.messageHandlers[type] = handler;
    }

    send(type, data) {
        if (!this.isOpen()) {
            return;
        }
        const message = data ? JSON.stringify(data) : '';
        this.websocket.send(type + message);
    }

    disconnect() {
        if (!this.isOpen()) {
            return;
        }
        this.websocket.close();
    }

    isOpen() {
        return this.websocket && this.websocket.readyState == WebSocket.OPEN;
    }
}
