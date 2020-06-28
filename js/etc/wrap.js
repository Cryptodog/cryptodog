const wrap = function () {
    class Buffer {
        static growSize = 512;

        /**
         * Get size of data
         * 
         * @returns {Number}
         */
        size() {
            return this.writeOffset;
        }

        // Read a byte 
        getUint8() {
            if (this.readOffset >= this.size())
                throw new Error(`readOffset ${this.readOffset}) is larger than buffer size ${this.size()}`);

            return this.data[this.readOffset++];
        }

        /** 
         * Read a variable-length encoded uint (LEB-128) 
    
         * @param {Number} maxSize
         * @returns {Number}
         */
        getUint(maxSize = 20) {
            var byte = this.getUint8();
            if (byte < 0x80) {
                return byte;
            }

            var value = BigInt(byte) & 0x7Fn;

            var shift = 7n;
            var startOffset = this.readOffset;

            while (byte >= 0x80n) {
                if (this.readOffset - startOffset > maxSize)
                    throw new Error(`wrap.Buffer: attempted to decode varint larger than safe maximum: ${this.readOffset - startOffset}`);
                byte = this.getUint8();

                value = value | (BigInt(byte & 0x7F) << shift);
                shift += 7n;
            }

            if (value > BigInt(Number.MAX_SAFE_INTEGER)) {
                throw new Error(`wrap.Buffer: decoded value ${value} is larger than Number.MAX_SAFE_INTEGER`);
            }

            return Number(value);
        }

        /**
         * Append a variable-length encoded uint (LEB-128)
         * 
         * @param {Number} value 
         */
        putUint(value) {
            var x = BigInt(value);
            while (x > 0x7Fn) {
                this.putUint8(Number((x | 0x80n) & 0xFFn));
                x >>= 7n;
            }
            this.putUint8(Number(x) & 0xFF);
        }

        growBuffer() {
            var newBuffer = new Uint8Array(this.data.length + Buffer.growSize);
            newBuffer.set(this.data);
            this.data = newBuffer;
        }

        /**
         * Append a byte
         * 
         * @param {Number} byte 
         */
        putUint8(byte) {
            if (this.writeOffset >= this.data.length)
                this.growBuffer();

            this.data[this.writeOffset++] = byte;
        }

        /** Append raw bytes
         * 
         * @param {Uint8Array} bytes 
         */
        putRawBytes(bytes) {
            for (var byte of bytes) {
                this.putUint8(byte);
            }
        }

        /**
         * Read a length of raw bytes
         * 
         * @param {Number} length 
         * @returns {Uint8Array}
         */
        getRawBytes(length) {
            var raw = new Uint8Array(length);

            for (var x = 0; x < length; x++) {
                raw[x] = this.getUint8();
            }

            return raw;
        }

        /**
         * Append varint-prefixed length of bytes
         * 
         * @param {Uint8Array} bytes 
         */
        putBytes(bytes) {
            this.putUint(bytes.length);
            this.putRawBytes(bytes);
        }

        /**
         * Read a varint-prefixed length of bytes
         * 
         * @param {Number} maxLength 
         */
        getBytes(maxLength = 65536) {
            var length = this.getUint();
            if (length > maxLength) {
                throw new Error(`wrap.Buffer: attempted to decode buffer ${maxLength} larger than maximum length ${maxLength}`);
            }
            return this.getRawBytes(length);
        }

        /**
         * Append a varint-prefixed string
         * 
         * @param {String} string 
         */
        putString(string) {
            var bytes = new TextEncoder("utf-8").encode(string);
            this.putBytes(bytes);
        }

        /**
         * Read a varint-prefixed string
         * 
         * @param {Number} maxLength 
         */
        getString(maxLength) {
            var bytes = this.getBytes(maxLength);
            return new TextDecoder("utf-8").decode(bytes);
        }

        /**
         * Get number of bytes left to read in buffer
         * @returns {Number}
         */
        available() {
            return this.size() - this.readOffset;
        }

        /**
         * @returns {Uint8Array}
         */
        bytes() {
            return this.data.slice(0, this.writeOffset);
        }

        /**
         * @param {Uint8Array} u8array 
         */
        constructor(u8array) {
            if (u8array) {
                this.data = u8array;
                this.writeOffset = this.data.length;
            } else {
                this.data = new Uint8Array();
                this.writeOffset = 0;
            }
            this.readOffset = 0;
        }
    }

    class Frame {
        static types = {};

        /**
         * Register a global frame type with the Wrap parser
         * 
         * @param {Frame} frameClass 
         */
        static addType(frameClass) {
            Frame.types[frameClass.type] = frameClass;
        }

        parse() { }
        encode() { }
    }

    class Envelope {
        static maxFrameCount = 6;

        constructor() {
            this.frames = [];
        }

        /**
         * Add a frame to the Envelope.
         * 
         * @param {Frame} frame 
         */
        add(frame) {
            if (this.frames.length >= Envelope.maxFrameCount)
                throw new Error(`wrap.Envelope.addFrame: envelope is at maximum capacity ${this.frames.length}`);

            for (var existingFrame of this.frames) {
                if (existingFrame.constructor.type == frame.type)
                    throw new Error(`wrap.Envelope.addFrame: envelope already contains a frame of type ${frame.constructor.type}`);
            }

            this.frames.push(frame);
        }

        /**
         * Parse a Wrap envelope
         * 
         * @param {Uint8Array} input 
         */
        static parse(input) {
            var buffer = new Buffer(input);
            var envelope = new Envelope();
            var frameCount = buffer.getUint();
            if (frameCount > Envelope.maxFrameCount)
                throw new Error(`wrap.Envelope frame count ${frameCount} exceeded maximum ${Envelope.maxFrameCount}`);

            for (var frameIndex = 0; frameIndex < frameCount; frameIndex++) {
                var frameType = buffer.getUint();
                var frameLength = buffer.getUint();

                var frameClass = Frame.types[frameType];
                // This is an unrecognized type.
                if (!frameClass) {
                    console.log(`Unrecognized frame type detected: ${frameType}`);
                    // Set offset to next frame
                    buffer.readOffset += frameLength;
                    continue;
                }

                var frame = new frameClass;
                frame.type = frameType;

                var startOffset = buffer.readOffset;
                frame.parse(buffer);
                var bytesRead = buffer.readOffset - startOffset;
                if (bytesRead > frameLength) {
                    throw new Error(`wrap.Envelope.parse: ${frame.constructor.name} buffer overread`);
                }
                // Ensure correct alignment for the next frame.
                buffer.readOffset = startOffset + frameLength;
                envelope.frames.push(frame);
            }

            return envelope;
        }

        /**
         * Encode a wrap envelope
         * 
         * @returns {Uint8Array}
         */
        encode() {
            var envelopeBuffer = new Buffer();
            envelopeBuffer.putUint(this.frames.length);

            for (var frame of this.frames) {
                if (typeof frame.constructor["type"] === "undefined") {
                    throw new Error(`wrap.Envelope.encode: class ${frame.constructor.name} has no static wire type property`);
                }

                envelopeBuffer.putUint(frame.constructor.type);

                var frameBuffer = new Buffer();
                frame.encode(frameBuffer);

                envelopeBuffer.putBytes(frameBuffer.bytes());
            }

            var encoded = envelopeBuffer.bytes();
            return encoded;
        }
    }

    class SetColor extends Frame {
        static type = 4;

        static hex2bytes(hex) {
            if (hex.length % 2 !== 0) {
                throw new Error("cannot decode odd hex string");
            }

            var data = new Uint8Array(hex.length / 2);

            for (var c = 0; c < hex.length; c += 2) {
                data[c / 2] = parseInt(hex.slice(c, c + 2), 16);
            }

            return str;
        }

        static bytes2hex(bytes) {
            var hex = "";
            for (var c = 0; c < bytes.length; c++) {
                var hexCode = bytes[c].toString(16);
                if (hexCode.length == 1)
                    hexCode = "0" + hexCode;
                hex += hexCode;
            }
            return hex;
        }

        parse(input) {
            var rgba = input.getRawBytes(3);
            this.color = "#" + SetColor.bytes2hex(rgba);
        }

        encode(output) {
            var hash = this.color[0];
            if (hash !== '#')
                throw new Error("wrap.SetColor: color code must be in hash format.");

            var channels = hex2bytes(this.color.slice(1));
            output.putRawBytes(channels);
        }
    };

    class Composing extends Frame {
        static type = 5;
    };

    class Paused extends Frame {
        static type = 6;
    };

    class Online extends Frame {
        static type = 7;
    };

    class Away extends Frame {
        static type = 8;
    };

    class TextMessage extends Frame {
        static type = 9;

        constructor(text) {
            super();

            this.text = text;
        }

        parse(input) {
            this.text = input.getString();
        }

        encode(output) {
            output.putString(this.text || "");
        }
    }

    Frame.addType(SetColor);
    Frame.addType(Composing);
    Frame.addType(Paused);
    Frame.addType(Online);
    Frame.addType(Away);
    Frame.addType(TextMessage);

    return {
        Buffer,
        Frame,
        Envelope,
        SetColor,
        Composing,
        Paused,
        Online,
        Away,
        TextMessage
    };
}();
