(function() {
'use strict';

Cryptodog.locale = {}
Cryptodog.locales = {}
var languageObject

Cryptodog.locale.set = function(locale, refresh) {
	if (Cryptodog.locales[locale] === undefined){return}
	locale = Cryptodog.locale.handleAliases(locale.toLowerCase())
	languageObject = Cryptodog.locale.buildObject(locale)
	if (refresh) {
		Cryptodog.locale.refresh(languageObject)
	}
}

// Build and deliver language object
Cryptodog.locale.buildObject = function(locale) {
	var language = Cryptodog.locales[locale]
	var i = 0
	languageObject = {
		language:                     locale,
		direction:                    language[i++],
		fonts:                        language[i++],
		loginWindow: {
			introHeader:              language[i++],
			introParagraph:           language[i++],
			blog:                     language[i++],
			customServer:             language[i++],
			reset:                    language[i++],
			conversationName:         language[i++],
			nickname:                 language[i++],
			connect:                  language[i++],
			conversationNameTooltip:  language[i++],
			enterConversation:        language[i++]
		},
		loginMessage: {
			enterConversation:        language[i++],
			conversationAlphanumeric: language[i++],
			enterNickname:            language[i++],
			nicknameAlphanumeric:     language[i++],
			nicknameInUse:            language[i++],
			authenticationFailure:    language[i++],
			connectionFailed:         language[i++],
			thankYouUsing:            language[i++],
			registering:              language[i++],
			connecting:               language[i++],
			connected:                language[i++],
			typeRandomly:             language[i++],
			generatingKeys:           language[i++]
		},
		chatWindow: {
			groupConversation:        language[i++],
			otrFingerprint:           language[i++],
			groupFingerprint:         language[i++],
			resetKeys:                language[i++],
			resetKeysWarn:            language[i++],
			cont:                     language[i++],
			statusAvailable:          language[i++],
			statusAway:               language[i++],
			myInfo:                   language[i++],
			desktopNotificationsOn:   language[i++],
			desktopNotificationsOff:  language[i++],
			audioNotificationsOn:     language[i++],
			audioNotificationsOff:    language[i++],
			rememberNickname:         language[i++],
			doNotRememberNickname:    language[i++],
			logout:                   language[i++],
			displayInfo:              language[i++],
			sendEncryptedFile:        language[i++],
			viewImage:                language[i++],
			downloadFile:             language[i++],
			conversation:             language[i++],
			fileTransferInfo:         language[i++],
			fileTypeError:            language[i++],
			fileSizeError:            language[i++],
			startVideoChat:           language[i++],
			endVideoChat:             language[i++],
			videoChatQuery:           language[i++],
			cancel:                   language[i++],
			ignore:                   language[i++],
			unignore:                 language[i++],
			authenticate:             language[i++],
			verifyUserIdentity:       language[i++],
			secretQuestion:           language[i++],
			secretAnswer:             language[i++],
			ask:                      language[i++],
			asking:                   language[i++],
			failed:                   language[i++],
			identityVerified:         language[i++],
			authRequest:              language[i++],
			answerMustMatch:          language[i++],
			answer:                   language[i++]
		},
		warnings: {
			messageWarning:           language[i++]
			                            || languageObject.warnings.messageWarning,
			updateWarning:            language[i++]
			                            || languageObject.warnings.updateWarning,
			missingRecipientWarning:  language[i++]
			                            || languageObject.warnings.missingRecipientWarning
		},
		auth: {
			authenticated:            language[i++]
			                            || languageObject.auth.authenticated,
			userNotAuthenticated:     language[i++]
			                            || languageObject.auth.userNotAuthenticated,
			clickToLearnMore:         language[i++]
			                            || languageObject.auth.clickToLearnMore,
			learnMoreAuth:            language[i++]
                                        || languageObject.auth.learnMoreAuth,
			authPhrase1:               language[i++]
			                            || languageObject.auth.authPhrase1,
			authPhrase2:               language[i++]
			                            || languageObject.auth.authPhrase2,
			authPhrase3:               language[i++]
			                            || languageObject.auth.authPhrase3,
			authPhrase4:               language[i++]
			                            || languageObject.auth.authPhrase4,
			authPhrase5:               language[i++]
			                            || languageObject.auth.authPhrase5,
			AKEWarning:               language[i++]
			                            || languageObject.auth.AKEWarning
		},
		login: {
			groupChat:               language[i++]
			|| languageObject.login.groupChat,
			facebook:               language[i++]
			|| languageObject.login.facebook,
			facebookInfo:           language[i++]
			|| languageObject.login.facebookInfo,
			chatViaFacebook:        language[i++]
			|| languageObject.login.chatViaFacebook,
			conversationStatus:     language[i++]
			|| languageObject.login.conversationStatus,
			encrypted:              language[i++]
			|| languageObject.login.encrypted,
			notEncrypted:           language[i++]
			|| languageObject.login.notEncrypted,
			facebookWarning:        language[i++]
			|| languageObject.login.facebookWarning,
		}
	}
	for (var o in languageObject) {
		if (languageObject.hasOwnProperty(o)) {
			Cryptodog.locale[o] = languageObject[o]
		}
	}
	return languageObject
}

// Re-render login page with new strings
Cryptodog.locale.refresh = function(languageObject) {
	var smallType = ['bo', 'ar', 'in']
	if (smallType.indexOf(languageObject['language']) >= 0) {
		$('body').css({'font-size': '13px'})
	}
	else {
		$('body').css({'font-size': '11px'})
	}
	$('body').css('font-family', languageObject['fonts'])
	$('#introHeader').text(languageObject['loginWindow']['introHeader'])
	$('#introParagraph').html(languageObject['loginWindow']['introParagraph'])
	$('#customServer').text(languageObject['loginWindow']['customServer'])
	$('#conversationName').attr('placeholder', languageObject['loginWindow']['conversationName'])
	$('#conversationName').attr('data-utip', languageObject['loginWindow']['conversationNameTooltip'])
	$('#nickname').attr('placeholder', languageObject['loginWindow']['nickname'])
	$('#loginSubmit').val(languageObject['loginWindow']['connect'])
	$('#loginInfo').text(languageObject['loginWindow']['enterConversation'])
	$('#logout').attr('data-utip', languageObject['chatWindow']['logout'])
	$('#audio').attr('data-utip', languageObject['chatWindow']['audioNotificationsOff'])
	$('#notifications').attr('data-utip', languageObject['chatWindow']['desktopNotificationsOff'])
	$('#myInfo').attr('data-utip', languageObject['chatWindow']['myInfo'])
	$('#status').attr('data-utip', languageObject['chatWindow']['statusAvailable'])
	$('#buddy-groupChat').find('span').text(languageObject['chatWindow']['conversation'])
	$('#languageSelect').text($('[data-locale=' + languageObject['language'] + ']').text())
	$('[data-login=cryptocat]').text(languageObject.login.groupChat)
	$('[data-utip]').utip()
	$('html').attr('dir', languageObject['direction'])
	if (languageObject['direction'] === 'ltr') {
		$('div#bubble #info li').css('background-position', 'top left')
	}
	else {
		$('div#bubble #info li').css('background-position', 'top right')
	}
	$('#conversationName').select()
}

// Handle aliases
Cryptodog.locale.handleAliases = function(locale) {
	if (locale === ('zh-hk' || 'zh-tw')) {
		return 'zh-hk'
	}
	else if (locale === ('zh-cn' || 'zh-sg')) {
		return 'zh-cn'
	}
	else if (locale.match('-')) {
		return locale.match(/[a-z]+/)[0]
	}
	return locale
}

// Populate language
if (typeof(window) !== 'undefined') { $(window).ready(function() {
	Cryptodog.locale.set('en', true)
})}

})()
