Cryptodog.kommy = {};
Cryptodog.kommy.utils = {};

Cryptodog.kommy.utils.replaceAll = function (input, search, replacement) {
    var target = input;
    return target.replace(new RegExp(search), replacement);
};

Cryptodog.kommy.utils.encodeBase64 = function (iny) {
    var input = btoa(iny);
    var input = Cryptodog.kommy.utils.replaceAll(input, /\+/g, ".");
    var input = Cryptodog.kommy.utils.replaceAll(input, /=/g, "-");
    var input = Cryptodog.kommy.utils.replaceAll(input, /\//g, "_");
    return input;
};

Cryptodog.kommy.utils.randomHex = function () {
    var buf = window.crypto.getRandomValues(new Uint8Array(32));
    return hex(buf.buffer);
}

function hex(buffer) {
    var hexCodes = [];
    var view = new DataView(buffer);
    for (var i = 0; i < view.byteLength; i += 4) {
        // Using getUint32 reduces the number of iterations needed (we process 4 bytes each time)
        var value = view.getUint32(i)
        // toString(16) will give the hex representation of the number without padding
        var stringValue = value.toString(16)
        // We use concatenation and slice for padding
        var padding = '00000000'
        var paddedValue = (padding + stringValue).slice(-padding.length)
        hexCodes.push(paddedValue);
    }

    // Join all the hex strings into one
    return hexCodes.join("");
}

Cryptodog.kommy.utils.btoa = function (bytes) {
    var binary = '';
    var len = bytes.byteLength;
    for (var i = 0; i < len; i++) {
        binary += String.fromCharCode(bytes[i]);
    }
    return window.btoa(binary);
}

Cryptodog.kommy.utils.atob = function (s) {
    function validateBase64(s) {
        if (!(/^(?:[A-Za-z0-9+/]{4})*(?:[A-Za-z0-9+/]{2}==|[A-Za-z0-9+/]{3}=)?$/.test(s))) {
            throw new TypeError('invalid encoding');
        }
    }

    validateBase64(s);
    var i, d = atob(s), b = new Uint8Array(d.length);
    for (i = 0; i < d.length; i++) b[i] = d.charCodeAt(i);
    return b;
};


Cryptodog.kommy.http = {};

Cryptodog.kommy.http.request = (function () {
    function HTTPRequest(method, url, isBinary, headers) {
        this.payload = null;
        this.isBinary = false;
        var xhr = new XMLHttpRequest();
        this.headers = headers;
        xhr.open(method, url, true);
        var reqHeaders = Object.keys(this.headers);
        for (var i = 0; i < reqHeaders.length; i++) {
            xhr.setRequestHeader(reqHeaders[i], this.headers[reqHeaders[i]]);
        }
        this.isBinary = isBinary;
        if (this.isBinary == true) {
            xhr.responseType = "arraybuffer";
        }
        else {
            xhr.responseType = "text";
        }
        this.req = xhr;
    }

    HTTPRequest.prototype.do = function () {
        var _this = this;
        return new Promise(function (resolve, reject) {
            try {
                _this.req.send(_this.payload);
                _this.req.onreadystatechange = function (event) {
                    if (_this.req.readyState == 4) {
                        var s = _this.req.status;
                        if (s == 429 || s == 404 || s == 502) {
                            reject(new Error("cantConnect"));
                            return;
                        }
                        if (_this.isBinary == true) {
                            resolve(new Uint8Array(_this.req.response));
                        }
                        else {
                            resolve(_this.req.responseText);
                        }
                    }
                };
            }
            catch (err) {
                reject(err);
            }
        });
    };
    return HTTPRequest;
}());


Cryptodog.kommy.http.client = (function () {
    function HTTPClient() {
        this.headers = {};
    }
    HTTPClient.prototype.setHeader = function (key, value) {
        this.headers[key] = value;
    };
    HTTPClient.prototype.getText = function (url) {
        var req = new Cryptodog.kommy.http.request("GET", url, false, this.headers);
        return req.do();
    };
    HTTPClient.prototype.getBuffer = function (url) {
        var req = new Cryptodog.kommy.http.request("GET", url, true, this.headers);
        return req.do();
    };
    HTTPClient.prototype.postText = function (url, data) {
        var req = new Cryptodog.kommy.http.request("POST", url, false, this.headers);
        req.payload = data;
        return req.do();
    };
    HTTPClient.prototype.postBuffer = function (url, data) {
        var req = new Cryptodog.kommy.http.request("POST", url, true, this.headers);
        req.payload = data;
        return req.do();
    };
    return HTTPClient;
}());

Cryptodog.kommy.httpit = function (url) {
    var urle = "";
    if (url.startsWith("wss://")) {
        urle = Cryptodog.kommy.utils.replaceAll(url, "wss", "https");
    }

    if (url.startsWith("ws://")) {
        urle = Cryptodog.kommy.utils.replaceAll(url, "ws", "http");
    }

    return urle;
}

Cryptodog.kommy.isPhoxyServer = function (url) {
    var cli = new Cryptodog.kommy.http.client();
    url = Cryptodog.kommy.httpit(url);
    return cli.getText(url + "?phoxy=q");
};

Cryptodog.kommy.verifyURL = function (url, cb) {
    var resolved = false;
    function cbe(u) {
        if (resolved == false) {
            cb(u);
            resolved = true;
        }
    }

    Cryptodog.kommy.isPhoxyServer(url).then(function (resp) {
        var data = JSON.parse(resp);
        var ok = data["phoxyEnabled"];
        if (ok == false) {
            cbe(url);
            return;
        }

        log("Connecting to Phoxy server")

        var signature = Cryptodog.me.otrKey.sign("login");

        var R = Cryptodog.kommy.utils.encodeBase64(BigInt.bigInt2bits(signature[0]));
        var S = Cryptodog.kommy.utils.encodeBase64(BigInt.bigInt2bits(signature[1]));

        var signedUrl = url
            + "?k="         // Public Key
            + Cryptodog.kommy.utils.encodeBase64(Cryptodog.me.otrKey.packPublic())
            + "&r=" + R     // Signature
            + "&s=" + S
            + "&api_key=" + Cryptodog.me.api_key; // Allows non-ascii names

        cbe(signedUrl);
    }).catch(function (err) {
        console.warn("Server validation error! ", err.message);
        cbe(url);
    });
};
