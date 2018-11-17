Cryptodog.fileTransfer = function(file, result) {
	var prefixSize = etc.RandomInt(400, 14000);
	var prefix = etc.crypto.nacl.randomBytes(prefixSize);

	var plaintext = new Uint8Array(result);
	var envelope = new Uint8Array(plaintext.length + prefixSize);
	for (var i = 0; i < prefixSize; i++) envelope[i] = prefix[i];
	for (var i = 0; i < plaintext.length; i++) envelope[i+prefixSize] = plaintext[i];

	var key       = etc.crypto.nacl.randomBytes(32);
	var nonce     = etc.crypto.nacl.randomBytes(24);
	var did       = etc.Encoding.encodeToHex(nonce);
	var encrypted = etc.crypto.nacl.secretbox(envelope, nonce, key);
	var server    = new etc.URL(Cryptodog.bex.server);
	var request   = new XMLHttpRequest();

	request.responseType = "arraybuffer";
	request.open("POST",
		server.subPath("upload")
		.setQ("cl", encrypted.length.toString())
		.toString());

	var statusObject = {
		type:    "fileupload",
		progress: 0,
		id:       did,
		time:     Cryptodog.currentTime(true),
		nickname: Cryptodog.me.nickname,
		color:    Cryptodog.me.color,
		prefixSize: prefixSize
	};

	var cbud = Cryptodog.me.currentBuddy
	Cryptodog.pushAndRedraw(cbud, statusObject);

	request.onreadystatechange = function() {
		if (request.readyState === 4) {
			if (request.status == 429) {
				statusObject.type = "warning";
				statusObject.message = "The file upload server has marked your IP address as a likely source of spam. Please wait for a little while before uploading again.";
				Cryptodog.redraw(cbud);
				return;
			}

			if (request.status == 200) {
				var rsp = new etc.Buffer(new Uint8Array(request.response));

				statusObject.type = "filelink";
				statusObject.nonce = nonce;
				statusObject.key = key;
				statusObject.mime = file.type;
				var uid = rsp.readUUID();
				statusObject.fileID = uid.toString();

				Cryptodog.redraw(Cryptodog.me.currentBuddy);

				var attach = {
					header:            Cryptodog.bex.op.FILE_ATTACHMENT,
					prefixSize:        statusObject.prefixSize,
					fileEncryptionKey: key,
					fileNonce:         nonce,
					fileMime:          file.type,
					fileID:            uid
				};

				if (cbud == "groupChat") {
					Cryptodog.bex.transmitGroup([attach]);
				} else {
					var name = Cryptodog.getBuddyNicknameByID(Cryptodog.me.currentBuddy);
					if (name) {
						Cryptodog.bex.transmitPrivate(name, [attach]);
					}
				}
				return;
			}

			statusObject.type = "warning";
			statusObject.message = "An unexpected error occured while uploading. (HTTP " + request.status.toString() + ")";
			Cryptodog.redraw(cbud);
		}
	}

	request.upload.onprogress = function(ev) {
		var progress = Math.floor((ev.loaded / ev.total) * 100);
		statusObject.progress = progress;
		$('.fileProgressBarFill')
		.filterByData('id', did)
		.animate({'width': progress + '%'}, 50);
	}

	request.send(encrypted);
}

Cryptodog.fileTransfer.readFile = function(file) {
	if (Object.keys(Cryptodog.bex.mimeExtensions).includes(file.type) === false) {
		alert("Sorry, files of this type: " + file.type + " are not supported by Cryptodog.");
		return;
	}

	if (file.size > Cryptodog.bex.maxFileSize) {
		alert("Sorry, this file is too large to be uploaded successfully.");
		return;
	}

	var reader = new FileReader();
	reader.onload = function() {
		// Prefix upload data with random bytes to avoid an attacker guessing the file based on ciphertext length
		Cryptodog.fileTransfer(file, this.result);
	}

	reader.readAsArrayBuffer(file)
}