(function() {
'use strict';

Cryptocat.locale = {}
var languageObject

// Get locale file, call other functions
Cryptocat.locale.set = function(locale, refresh) {
	locale = Cryptocat.locale.handleAliases(locale.toLowerCase())
	$.ajax({
		url : 'locale/' + locale + '.txt',
		dataType: 'text',
		accepts: 'text/html',
		contentType: 'text/html',
		complete: function(data) {
			try {
				var language = data.responseText.split('\n')
				if (language.length < 5) { // data too small, dismiss
					Cryptocat.locale.set('en', true)
					return false
				}
				for (var i in language) {
					if (language.hasOwnProperty(i)) {
						language[i] = $.trim(language[i])
					}
				}
				languageObject = Cryptocat.locale.buildObject(locale, language)
				if (refresh) {
					Cryptocat.locale.refresh(languageObject)
				}
			}
			catch(err) {
				Cryptocat.locale.set('en', true)
			}
		},
		error: function() {
			Cryptocat.locale.set('en', true)
		}
	})
}

// Build and deliver language object
Cryptocat.locale.buildObject = function(locale, language) {
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
			authSlide1:               language[i++]
			                            || languageObject.auth.authSlide1,
			authSlide2:               language[i++]
			                            || languageObject.auth.authSlide2,
			authSlide3:               language[i++]
			                            || languageObject.auth.authSlide3,
			authSlide4:               language[i++]
			                            || languageObject.auth.authSlide4,
			authSlide5:               language[i++]
			                            || languageObject.auth.authSlide5,
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
	var decodeFileSize = function (str) { return str.replace('(SIZE)', (Cryptocat.otr.maximumFileSize / 1024)) }
	languageObject.chatWindow.fileTransferInfo = decodeFileSize(languageObject.chatWindow.fileTransferInfo)
	languageObject.chatWindow.fileSizeError = decodeFileSize(languageObject.chatWindow.fileSizeError)
	for (var o in languageObject) {
		if (languageObject.hasOwnProperty(o)) {
			Cryptocat.locale[o] = languageObject[o]
		}
	}
	return languageObject
}

// Re-render login page with new strings
Cryptocat.locale.refresh = function(languageObject) {
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
	$('[data-login=facebook]').text(languageObject.login.facebook)
	$('.facebookInfo').text(languageObject.login.facebookInfo)
	$('#facebookConnect').val(languageObject.login.chatViaFacebook)
	$('[data-utip]').utip()
	$('html').attr('dir', languageObject['direction'])
	$('#encryptionStatus').attr('dir', languageObject['direction'])
	if (languageObject['direction'] === 'ltr') {
		$('div#bubble #info li').css('background-position', 'top left')
	}
	else {
		$('div#bubble #info li').css('background-position', 'top right')
	}
	$('#conversationName').select()
}

// Handle aliases
Cryptocat.locale.handleAliases = function(locale) {
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
if (typeof(window) !== 'undefined') {
	Cryptocat.locale.set('en', true)
}

})()
