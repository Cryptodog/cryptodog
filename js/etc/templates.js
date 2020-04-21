// Cryptodog templates for use with mustache.js.
'use strict';

Cryptodog.templates = {
    customServer: '<option data-domain="{{domain}}" data-xmpp="{{xmpp}}" data-relay="{{relay}}">' + '{{name}}</option>',

    buddy:
        '<div class="buddy" title="{{nickname}}" id="buddy-{{buddyID}}" status="{{status}}" data-id="{{buddyID}}" dir="ltr">' +
        '<span class="nickname">{{nickname}}</span></div>',

    buddyMenu:
        '<div class="buddyMenu" id="{{buddyID}}-menu">' +
        '<li class="option1">{{displayInfo}}</li>' +
        '<li class="option2">{{sendEncryptedFile}}</li>' +
        '<li class="option3">{{ignore}}</li>' +
        '</div>',

    myInfo:
        '<div class="title">{{nickname}}</div>' +
        '<div id="displayInfo">' +
        '{{groupFingerprint}}<br /><span id="multiPartyFingerprint"></span><br />' +
        '{{otrFingerprint}}<br /><span id="otrFingerprint"></span></div>',

    buddyInfo:
        '<div class="title">{{nickname}}</div>' +
        '<div id="displayInfo">' +
        '<h2>{{authenticated}}</h2>' +
        '<span id="authenticated">&#x2713</span><span id="notAuthenticated">X</span><br /><br />' +
        '<div class="authInfo" style="height:95px">{{groupFingerprint}}<br />' +
        '<span id="multiPartyFingerprint"></span><br />' +
        '{{otrFingerprint}}<br /><span id="otrFingerprint"></span></div>' +
        '<div class="authInfo authSMP"><span>{{verifyUserIdentity}}</span><br /><br />' +
        '<form><input type="text" id="authQuestion" placeholder="{{secretQuestion}}" maxlength="64" />' +
        '<input type="password" id="authAnswer" placeholder="{{secretAnswer}}" maxlength="64" />' +
        '<input id="authSubmit" type="submit" value="{{ask}}" /></form>' +
        '<p id="authVerified">{{identityVerified}}</p></div><br/></div>',

    authRequest:
        '<div class="title">{{authenticate}}</div>' +
        '<p>{{authRequest}}<br/>' +
        '<span id="authReplyQuestion"><strong>{{question}}</strong></span><br/>' +
        '<form id="authReplyForm"><input id="authReply" type="password" placeholder="{{secretAnswer}}" maxlength="64" />' +
        '<input id="authReplySubmit" type="submit" value="{{answer}}" /></form></p>' +
        '<p>{{answerMustMatch}}</p>',

    sendFile:
        '<div class="title">{{sendEncryptedFile}}</div>' +
        '<input type="file" id="fileSelector" name="file[]" />' +
        '<input type="button" id="fileSelectButton" value="{{sendEncryptedFile}}" />' +
        '<div id="fileInfoField">{{fileTransferInfo}}</div>',

    file:
        '<div class="fileProgressBar" data-file="{{file}}" data-id="{{id}}">' +
        '<div class="fileProgressBarFill" data-file="{{file}}" data-id="{{id}}"></div></div>',

    fileLink: '<a href="{{url}}" class="fileView" target="_blank" download="{{filename}}">{{downloadFile}}</a>',

    missingRecipients: '<div class="missingRecipients" dir="{{dir}}">{{text}}</div>',

    message:
        '<div class="line" style="border-color:{{color}};">' +
        '<span class="sender" title="{{nickname}}" data-sender="{{nickname}}"' +
        ' data-timestamp="{{currentTime}}" style="background-color:{{color}};"><span class="nickname">{{nickname}}</span></span>' +
        '<span class="message" style="font-style:{{style}};">{{&message}}</span></div>',

    userJoin:
        '<div class="userJoin" title="{{nickname}}" style="background-color:{{color}};"><span class="timestamp">{{currentTime}}</span>' +
        '<strong>+</strong>{{nickname}}</div>',

    userLeave:
        '<div class="userLeave" title="{{nickname}}"><span class="timestamp">{{currentTime}}</span>' +
        '<strong>-</strong>{{nickname}}</div>'
};
