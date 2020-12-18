'use strict';
const template = {
    buddy:
        '<div class="buddy" title="{{nickname}}" id="buddy-{{buddyID}}" status="{{status}}" data-id="{{buddyID}}" dir="ltr">' +
        '<span class="nickname">{{nickname}}</span></div>',

    buddyMenu:
        '<div class="buddyMenu" id="{{buddyID}}-menu">' +
        '<li class="option1">{{displayInfo}}</li>' +
        '<li class="option2">{{ignore}}</li>' +
        '</div>',

    buddyInfo:
        `<div class="safetyNumberTitle">{{safetyNumberTitle}}{{nickname}}</div>
        <div class="safetyNumber">{{#safetyNumber}}{{#.}}{{.}} {{/.}}<br>{{/safetyNumber}}</div>
        <p class="safetyNumberExplanation">{{safetyNumberExplanation}}</p>
        </div>`,

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
