const chat = function () {
    'use strict';
    let buffers = {};
    const recentEntriesCutoff = 100;
    const groupChat = 'group';
    let current = groupChat;
    let newMessageCount = 0;

    function timestamp() {
        return new Date(Date.now()).toLocaleTimeString('en-US', { hour12: false });
    };

    function addJoin(buddy, timestamp) {
        addEntry(groupChat, new Join(buddy, timestamp));
    }
    function addLeave(buddy, timestamp) {
        addEntry(groupChat, new Leave(buddy, timestamp));
    }
    function addGroupMessage(buddy, timestamp, body) {
        addEntry(groupChat, new Message(buddy, timestamp, body));
    }
    // `sender` can be me or the buddy in this chat.
    function addPrivateMessage(buddy, sender, timestamp, body) {
        addEntry(buddy.id, new Message(sender, timestamp, body));
    }
    function addDecryptError(buddy, timestamp) {
        addEntry(groupChat, new DecryptError(buddy, timestamp));
    }
    function addMissingRecipients(buddies) {
        // TODO: implement
        return;
    }

    function reset() {
        buffers = {};
        current = groupChat;
        $('#chatWindow').empty();
    }

    function addEntry(chat, entry) {
        if (!(chat in buffers)) {
            buffers[chat] = [];
        }
        if (!(entry instanceof Entry)) {
            throw 'Entry type required';
        }
        buffers[chat].push(entry);

        if (chat === current) {
            const chatWindow = $('#chatWindow');
            const wasScrolledDown = (Math.ceil(chatWindow.scrollTop() + chatWindow.innerHeight()) >= chatWindow[0].scrollHeight);

            loadRecentEntries(1);
            $('#chatWindow .line').last().animate({ 'top': 0 }, 100);

            if (wasScrolledDown) {
                // Scroll the chat window down.
                chatWindow.stop().animate({ scrollTop: chatWindow[0].scrollHeight });

                const chatEntries = chatWindow.children();
                if (chatEntries.length > recentEntriesCutoff) {
                    // Keep the chat window trimmed to `recentEntriesCutoff`.
                    chatEntries.slice(0, chatEntries.length - recentEntriesCutoff).remove();
                }
            }
            // TODO: show indicator for new messages if the user was scrolled up
        } else {
            $('#buddy-' + chat).addClass('newMessage');
        }

        if (entry instanceof Message || entry instanceof Join) {
            newMessageCount++;
            if (!document.hasFocus()) {
                document.title = '(' + newMessageCount + ') ' + Cryptodog.me.nickname + '@' + Cryptodog.me.conversation;
            }
        }
        // TODO: Handle audio and desktop notifications
    }

    function switchTo(chat) {
        $('#userInputText').focus();
        if (chat === current) {
            return;
        }
        current = chat;
        if (!(current in buffers)) {
            buffers[current] = [];
        }
        $('#chatWindow').empty();
        loadRecentEntries();
        $('#chatWindow .line').addClass('no-animate');
        const last = $('#chatWindow').children().last();
        if (last.length > 0) {
            last.get(0).scrollIntoView();
        }
    }

    // Render the `recentEntriesCutoff` messages prior to those already displayed.
    function loadPreviousEntries() {
        const numDisplayed = $('#chatWindow').children().length;
        const prev = buffers[current].slice(0, buffers[current].length - numDisplayed).slice(-recentEntriesCutoff);
        for (let i = prev.length - 1; i >= 0; i--) {
            $('#chatWindow').prepend(prev[i].render());
        }
        $('#chatWindow .line').addClass('no-animate');
    }

    // Render the `numEntries` most recent entries, or the `recentEntriesCutoff` most recent if `numEntries` is undefined.
    function loadRecentEntries(numEntries) {
        buffers[current].slice(-(numEntries || recentEntriesCutoff)).forEach(entry => {
            $('#chatWindow').append(entry.render());
        });
    }

    class Entry {
        constructor(buddy, timestamp) {
            this.buddy = buddy;
            this.timestamp = timestamp;
        }
    }
    class Message extends Entry {
        static linkPattern = /(\s*)(https?:\/\/\S+)/gi;

        constructor(buddy, timestamp, body) {
            super(buddy, timestamp);
            this.body = body;
        }

        autolink() {
            this.escapedBody = this.escapedBody.replace(Message.linkPattern, '$1<a target="_blank" rel="noopener" href="$2">$2</a>');
        }

        markup() {
            // For now, don't allow formatting and links in the same message.
            if (!this.escapedBody.match(Message.linkPattern)) {
                const strongItalicPattern = /\*\*\*((?!\s).+)\*\*\*/gi;
                const strongPattern = /\*\*((?!\s).+)\*\*/gi;
                const italicPattern = /\*((?!\s).+)\*/gi;

                this.escapedBody = this.escapedBody.replace(strongItalicPattern, '<strong><i>$1</i></strong>')
                    .replace(strongPattern, '<strong>$1</strong>')
                    .replace(italicPattern, '<i>$1</i>');
            }
        }

        render() {
            /* HTML-encode the message body before auto-linking.
               Mustache.js also encodes forward slashes, so we unescape them at the end to allow links. */
            this.escapedBody = Mustache.escape(this.body).replace(/&#x2F;/g, '/');
            this.markup();
            this.autolink();

            return Mustache.render(template.message, {
                nickname: this.buddy.nickname,
                timestamp: this.timestamp,
                // body is not HTML-encoded in the message template.
                body: this.escapedBody,
                color: this.buddy.color
            });
        }
    };
    class Join extends Entry {
        render() {
            return Mustache.render(template.userJoin, {
                nickname: this.buddy.nickname,
                timestamp: this.timestamp,
                color: this.buddy.color
            });
        }
    }
    class Leave extends Entry {
        render() {
            return Mustache.render(template.userLeave, {
                nickname: this.buddy.nickname,
                timestamp: this.timestamp,
            });
        }
    }
    class DecryptError extends Entry {
        render() {
            return Mustache.render(template.decryptError, {
                nickname: this.buddy.nickname,
            });
        }
    }

    $(document).ready(function () {
        'use strict';

        $(window).focus(function () {
            if (Cryptodog.me.nickname && Cryptodog.me.conversation) {
                newMessageCount = 0;
                document.title = Cryptodog.me.nickname + '@' + Cryptodog.me.conversation;
                $('#userInputText').focus();
            }
        });

        $('#chatWindow').scroll(function () {
            if ($('#chatWindow').scrollTop() === 0) {
                // Prevent auto-scrolling to the top when we prepend the entries.
                $('#chatWindow').scrollTop(1);
                loadPreviousEntries();
            }
        });

        // Show and hide timestamp when hovering over a message's sender element.
        $('#chatWindow').on('mouseenter', '.sender', function () {
            $(this).find('.nickname').text($(this).attr('data-timestamp'));
        });
        $('#chatWindow').on('mouseleave', '.sender', function () {
            $(this).find('.nickname').text($(this).attr('data-sender'));
        });

        $('#userInputSubmit').click(function () {
            $('#userInput').submit();
        });

        let composing = false;
        $('#userInputText').keydown(function (e) {
            if (e.key === 'Tab') {
                e.preventDefault();
                if (!$(this).val()) {
                    return;
                }
                const nickComplete = tabComplete($(this).val());
                if (nickComplete) {
                    $(this).val(nickComplete);
                }
                return;
            }
            if (e.key === 'Enter') {
                e.preventDefault();
                $('#userInput').submit();
                composing = false;
                return;
            }

            // XXX: potentially hacky way to determine if key is a printable character
            if (e.key.length !== 1) {
                return;
            }

            if (!composing) {
                composing = true;

                let destination;
                if (current !== groupChat) {
                    destination = Cryptodog.userFromId(current);
                }
                meta.sendComposing(destination);

                window.setTimeout(function () {
                    meta.sendPaused(destination);
                    composing = false;
                }, 7000);
            }
        });

        $('#userInput').submit(function (e) {
            e.preventDefault();
            const timestamp = new Date(Date.now()).toLocaleTimeString('en-US', { hour12: false });
            const message = $.trim($('#userInputText').val());
            $('#userInputText').val('');
            if (!message.length) {
                return true;
            }

            if (current !== groupChat) {
                const recipient = Cryptodog.userFromId(current);
                meta.sendPrivateTextMessage(recipient, message);
                addPrivateMessage(recipient, Cryptodog.me, timestamp, message);
            } else {
                meta.sendGroupTextMessage(message);
                // TODO: handle missing recipients
                addGroupMessage(Cryptodog.me, timestamp, message);
            }
        });

        function tabComplete(input) {
            const potentials = [];
            for (const user of Cryptodog.allUsers()) {
                potentials.push({
                    score: user.nickname.score(input.match(/(\S)+$/)[0], 0.01),
                    value: user.nickname
                });
            }
            var largest = potentials[0];

            // find item with largest score
            potentials.forEach(function (item) {
                if (item.score > largest.score) {
                    largest = item;
                }
            }, this);

            let suffix;
            if (input.match(/\s/)) {
                suffix = ' ';
            } else {
                suffix = ': ';
            }
            if (largest.score < 0.1) {
                // cut-off matching attempt if all scores are low
                return input;
            }
            return input.replace(/(\S)+$/, largest.value + suffix);
        };
    });

    return {
        timestamp,
        switchTo,
        addJoin,
        addLeave,
        addGroupMessage,
        addPrivateMessage,
        addDecryptError,
        addMissingRecipients,
        reset
    };
}();
