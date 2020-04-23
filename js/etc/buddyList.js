const buddyList = function () {
    'use strict';

    function add(buddy) {
        $('#buddyList').queue(function () {
            const buddyTemplate = Mustache.render(Cryptodog.templates.buddy, {
                buddyID: buddy.id,
                nickname: buddy.nickname,
                status: buddy.status
            });
            const placement = place(buddy);

            $(buddyTemplate).insertAfter(placement).slideDown(100, function () {
                $('#buddy-' + buddy.id).unbind().click(function () {
                    bindBuddyClick($(this));
                });

                $('#buddy-' + buddy.id).unbind('contextmenu').contextmenu(function (e) {
                    e.preventDefault();
                    bindBuddyContextMenu(e, buddy);
                });
            });
        });

        $('#buddyList').dequeue();
        if (buddy.ignored()) {
            $('#buddy-' + buddy.id).addClass('ignored');
        }
    }

    function bindBuddyClick(buddyElement) {
        buddyElement.removeClass('newMessage');
        if (buddyElement.prev().attr('id') === 'currentConversation') {
            $('#userInputText').focus();
            return;
        }

        const id = buddyElement.attr('data-id');
        Cryptodog.me.currentBuddy = id;
        initializeConversationBuffer(id);

        // Switch currently active conversation.
        $('#conversationWindow').html(Cryptodog.conversationBuffers[id]);
        Cryptodog.UI.bindSenderElement();
        Cryptodog.UI.scrollDownConversation(0, false);
        $('#userInputText').focus();
        $('#buddy-' + id).addClass('currentConversation');

        // Clean up finished conversations.
        $('#buddyList div').each(function () {
            if ($(this).attr('data-id') !== id) {
                $(this).removeClass('currentConversation');
                if (!$(this).hasClass('newMessage') && ($(this).attr('status') === 'offline')) {
                    $(this).slideUp(500, function () {
                        $(this).remove();
                    });
                }
            }
        });
        $('#conversationWindow').children().addClass('visibleLine');
        Cryptodog.rebindDataURIs();
    }

    function bindBuddyContextMenu(e, buddy) {
        const buddyElement = $('#buddy-' + buddy.id);
        buddyElement.toggleClass('active');

        // Create buddy menu element if it doesn't exist.
        if ($('#' + buddy.id + '-menu').length === 0) {
            $('body').append(Mustache.render(Cryptodog.templates.buddyMenu, {
                buddyID: buddy.id,
                sendEncryptedFile: Cryptodog.locale.chatWindow.sendEncryptedFile,
                displayInfo: Cryptodog.locale.chatWindow.displayInfo,
                ignore: Cryptodog.locale.chatWindow[buddy.ignored() ? 'unignore' : 'ignore']
            }));
        }
        const $menu = $('#' + buddy.id + '-menu');

        // Insert buddy menu at location of right-click.
        $menu.css({
            display: "block",
            top: e.pageY + "px",
            left: e.pageX + "px"
        });

        // Register menu item events.
        $menu.find('.option1').unbind().click(function (e) {
            e.stopPropagation();
            buddy.ensureOTR(false, function () {
                dialog.showBuddyInfo(buddy);
            });
            $menu.hide();
        });
        $menu.find('.option2').unbind().click(function (e) {
            e.stopPropagation();
            sendFile(buddy.nickname);
            $menu.hide();
        });
        $menu.find('.option3').unbind().click(function (e) {
            e.stopPropagation();
            buddy.toggleIgnored();
            $menu.hide();
        });
    }

    function place(buddy) {
        const sorted = Object.keys(Cryptodog.buddies).map(
            nickname => ({
                nickname: nickname,
                id: Cryptodog.buddies[nickname].id
            })
        );

        sorted.sort(function (a, b) {
            const nameA = a.nickname.toLowerCase();
            const nameB = b.nickname.toLowerCase();
            if (nameA < nameB) {
                return -1;
            }
            return 1;
        });

        for (let i = 0; i < sorted.length; i++) {
            if (sorted[i].id === buddy.id) {
                if (i === 0) {
                    return '#buddiesOnline';
                }
                return '[data-id=' + sorted[i - 1].id + ']';
            }
        }
    }

    return {
        add
    };
}();