const chat = function () {
    'use strict';
    const buffers = {};
    const recentEntriesCutoff = 100;
    const groupChat = 'groupChat';
    let current = groupChat;

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
    function addWarning(buddy, timestamp) {
        // TODO: implement
        throw "Not implemented";
    }
    function addMissingRecipients(buddies) {
        // TODO: implement
        throw "Not implemented";
    }
    function addEntry(chat, entry) {
        // TODO: text formatting
        if (!(chat in buffers)) {
            buffers[chat] = [];
        }
        if (!(entry instanceof Entry)) {
            throw 'Entry type required';
        }
        buffers[chat].push(entry);

        if (chat === current) {
            loadRecentEntries(1);
            $('.line').last().css({ 'opacity': '0', 'top': '20px' }).animate({ 'opacity': 1, 'top': 0 }, 100);
        } else {
            $('#buddy-' + chat).addClass('newMessage');
        }

        if (entry instanceof Message || entry instanceof Join) {
            Cryptodog.newMessageCount(++Cryptodog.me.newMessages);
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
        $('#conversationWindow').empty();
        loadRecentEntries();
    }

    // Render the `recentEntriesCutoff` messages prior to those already displayed.
    function loadPreviousEntries() {
        const numDisplayed = $('#conversationWindow').children().length;
        const prev = buffers[current].slice(0, buffers[current].length - numDisplayed).slice(-recentEntriesCutoff);
        for (let i = prev.length - 1; i >= 0; i--) {
            $('#conversationWindow').prepend(prev[i].render());
        }
    }

    // Render the `numEntries` most recent entries, or the `recentEntriesCutoff` most recent if `numEntries` is undefined.
    function loadRecentEntries(numEntries) {
        buffers[current].slice(-(numEntries || recentEntriesCutoff)).forEach(entry => {
            $('#conversationWindow').append(entry.render());
        });
        scrollToLastMessage();
    }

    // TODO: don't scroll if the user is reading old messages
    // Possibly: if the last message is not in view?
    function scrollToLastMessage() {
        const lastLine = $('.line').last();
        if (lastLine.length) {
            lastLine.get(0).scrollIntoView();
        }
    }

    class Entry {
        constructor(buddy, timestamp) {
            this.buddy = buddy;
            this.timestamp = timestamp;
        }
    }
    class Message extends Entry {
        constructor(buddy, timestamp, body) {
            super(buddy, timestamp);
            this.body = body;
        }

        render() {
            return Mustache.render(Cryptodog.templates.message, {
                nickname: this.buddy.nickname,
                timestamp: this.timestamp,
                body: this.body,
                color: this.buddy.color
            });
        }
    };
    class Join extends Entry {
        render() {
            return Mustache.render(Cryptodog.templates.userJoin, {
                nickname: this.buddy.nickname,
                timestamp: this.timestamp,
                color: this.buddy.color
            });
        }
    }
    class Leave extends Entry {
        render() {
            return Mustache.render(Cryptodog.templates.userLeave, {
                nickname: this.buddy.nickname,
                timestamp: this.timestamp,
            });
        }
    }

    $(document).ready(function () {
        'use strict';
        $('#conversationWindow').scroll(function () {
            if ($('#conversationWindow').scrollTop() === 0) {
                loadPreviousEntries();
            }
        });

        // Show and hide timestamp when hovering over a message's sender element.
        $('#conversationWindow').on('mouseenter', '.sender', function () {
            $(this).find('.nickname').text($(this).attr('data-timestamp'));
        });
        $('#conversationWindow').on('mouseleave', '.sender', function () {
            $(this).find('.nickname').text($(this).attr('data-sender'));
        });

        $('#userInputSubmit').click(function () {
            $('#userInput').submit();
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
                const buddy = Cryptodog.buddies[Cryptodog.getBuddyNicknameByID(current)];
                buddy.otr.sendMsg(message);
                addPrivateMessage(buddy, Cryptodog.me, timestamp, message);
                return true;
            }

            if (Object.keys(Cryptodog.buddies).length) {
                const ciphertext = JSON.parse(Cryptodog.multiParty.sendMessage(message));
                let missingRecipients = [];
                for (let b in Cryptodog.buddies) {
                    if (typeof (ciphertext['text'][b]) !== 'object') {
                        missingRecipients.push(b);
                    }
                }
                if (missingRecipients.length) {
                    addMissingRecipients(buddies);
                }
                Cryptodog.xmpp.connection.muc.message(
                    Cryptodog.me.conversation + '@' + Cryptodog.xmpp.currentServer.conference,
                    null, JSON.stringify(ciphertext), null, 'groupchat', 'active');

                addGroupMessage(Cryptodog.me, timestamp, message);
            }
        });
    });

    return {
        switchTo,
        addJoin,
        addLeave,
        addGroupMessage,
        addPrivateMessage,
        addWarning
    };
}();
