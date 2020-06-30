'use strict';
const template = {
    customServer: '<option data-relay="{{relay}}">' + '{{name}}</option>',

    buddy:
        '<div class="buddy" title="{{nickname}}" id="buddy-{{buddyID}}" status="{{status}}" data-id="{{buddyID}}" dir="ltr">' +
        '<span class="nickname">{{nickname}}</span></div>',

    buddyMenu:
        '<div class="buddyMenu" id="{{buddyID}}-menu">' +
        '<li class="option1">{{displayInfo}}</li>' +
        '<li class="option2">{{ignore}}</li>' +
        '</div>',

    myInfo:
        '<div class="title">{{nickname}}</div>' +
        '<div id="displayInfo">' +
        '{{groupFingerprint}}<br /><span id="multiPartyFingerprint"></span></div>',

    buddyInfo:
        '<div class="title">{{nickname}}</div>' +
        '<div id="displayInfo">' +
        '<h2>{{authenticated}}</h2>' +
        '<span id="authenticated">&#x2713</span><span id="notAuthenticated">X</span><br /><br />' +
        '<div class="authInfo" style="height:95px">{{groupFingerprint}}<br />' +
        '<span id="multiPartyFingerprint"></span></div></div>',

    missingRecipients: '<div class="missingRecipients" dir="{{dir}}">{{text}}</div>',

    message:
        '<div class="line" style="border-color:{{color}};">' +
        '<span class="sender" title="{{nickname}}" data-sender="{{nickname}}"' +
        ' data-timestamp="{{timestamp}}" style="background-color:{{color}};"><span class="nickname">{{nickname}}</span></span>' +
        '<span class="message" style="font-style:{{style}};">{{{body}}}</span></div>',

    userJoin:
        '<div class="userJoin" title="{{nickname}}" style="background-color:{{color}};"><span class="timestamp">{{timestamp}}</span>' +
        '<strong>+</strong>{{nickname}}</div>',

    userLeave:
        '<div class="userLeave" title="{{nickname}}"><span class="timestamp">{{timestamp}}</span>' +
        '<strong>-</strong>{{nickname}}</div>',

    decryptError:
        `<div class="decrypt-error">
            <span class="content" title="Could not decrypt message from {{nickname}}">Could not decrypt message from {{nickname}}</span>
        </div>`
};
