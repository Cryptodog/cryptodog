const chat = function () {
    'use strict';
    const buffers = {};
    const recentEntriesCutoff = 100;
    const groupChat = 'group';
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
        if (!(chat in buffers)) {
            buffers[chat] = [];
        }
        if (!(entry instanceof Entry)) {
            throw 'Entry type required';
        }
        buffers[chat].push(entry);

        if (chat === current) {
            const chatWindow = $('#conversationWindow');
            const wasScrolledDown = (Math.ceil(chatWindow.scrollTop() + chatWindow.innerHeight()) >= chatWindow[0].scrollHeight);

            loadRecentEntries(1);
            $('#conversationWindow .line').last().animate({ 'top': 0 }, 100);

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
        $('#conversationWindow .line').addClass('no-animate');
        const last = $('#conversationWindow').children().last();
        if (last.length > 0) {
            last.get(0).scrollIntoView();
        }
    }

    // Render the `recentEntriesCutoff` messages prior to those already displayed.
    function loadPreviousEntries() {
        const numDisplayed = $('#conversationWindow').children().length;
        const prev = buffers[current].slice(0, buffers[current].length - numDisplayed).slice(-recentEntriesCutoff);
        for (let i = prev.length - 1; i >= 0; i--) {
            $('#conversationWindow').prepend(prev[i].render());
        }
        $('#conversationWindow .line').addClass('no-animate');
    }

    // Render the `numEntries` most recent entries, or the `recentEntriesCutoff` most recent if `numEntries` is undefined.
    function loadRecentEntries(numEntries) {
        buffers[current].slice(-(numEntries || recentEntriesCutoff)).forEach(entry => {
            $('#conversationWindow').append(entry.render());
        });
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

        autolink() {
            const pattern = /(\s*)(https?:\/\/\S+)/gi;
            return this.escapedBody.replace(pattern, '$1<a target="_blank" rel="noopener" href="$2">$2</a>');
        }

        render() {
            /* HTML-encode the message body before auto-linking.
               Mustache.js also encodes forward slashes, so we unescape them at the end to allow links. */
            this.escapedBody = Mustache.render('{{body}}', this).replace(/&#x2F;/g, '/');

            return Mustache.render(Cryptodog.templates.message, {
                nickname: this.buddy.nickname,
                timestamp: this.timestamp,
                // body is not HTML-encoded in the message template.
                body: this.autolink(),
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
                // Prevent auto-scrolling to the top when we prepend the entries.
                $('#conversationWindow').scrollTop(1);
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

                let destination, type;
                if (current === groupChat) {
                    destination = null;
                    type = 'groupchat';
                } else {
                    destination = Cryptodog.getBuddyNicknameByID(current);
                    type = 'chat';
                }

                Cryptodog.xmpp.connection.muc.message(
                    Cryptodog.me.conversation + '@' + Cryptodog.xmpp.currentServer.conference,
                    destination, '', null, type, 'composing'
                );

                window.setTimeout(function (destination, type) {
                    Cryptodog.xmpp.connection.muc.message(
                        Cryptodog.me.conversation + '@' + Cryptodog.xmpp.currentServer.conference,
                        destination, '', null, type, 'paused'
                    );
                    composing = false;
                }, 7000, destination, type);
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
            }
            addGroupMessage(Cryptodog.me, timestamp, message);
        });

        function tabComplete(input) {
            let nickname, suffix;
            const potentials = [];
            for (nickname in Cryptodog.buddies) {
                if (Cryptodog.buddies.hasOwnProperty(nickname)) {
                    potentials.push({
                        score: nickname.score(input.match(/(\S)+$/)[0], 0.01),
                        value: nickname
                    });
                }
            }
            var largest = potentials[0];

            // find item with largest score
            potentials.forEach(function (item) {
                if (item.score > largest.score) {
                    largest = item;
                }
            }, this);

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
        switchTo,
        addJoin,
        addLeave,
        addGroupMessage,
        addPrivateMessage,
        addWarning
    };
}();
