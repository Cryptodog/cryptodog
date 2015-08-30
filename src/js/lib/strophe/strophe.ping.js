Strophe.addConnectionPlugin('connectionmanager', {
  
	pingTime: 12000, // the time in ms between each ping
	timeoutTime: 6000,	// the time in ms to wait for a ping to return
	pingInterval: null,
	connection: null,
	failedPings: 0,
	
	init: function(connection) {
		this.connection = connection
	},
	
	// Called automatically by Strophe when the connection status changes
	statusChanged: function(status) {
		var self = this
		switch(status) {
			case Strophe.Status.CONNECTED:
			case Strophe.Status.ATTACHED:
				// start monitoring the connection
				clearInterval(this.pingInterval)
				this.pingInterval = setInterval(function(){ self.pingServer() }, this.pingTime)
				break
			case Strophe.Status.DISCONNECTED:
				// stop monitoring the connection
				this.failedPings = 0
				clearInterval(this.pingInterval)
				break
		}
	},
	
	pingServer: function() {
		var self = this
		var stanza = $iq({
			id:	"ping",
			type: "get",
			to:	this.connection.domain
		}).c("ping", {xmlns: 'urn:xmpp:ping'})
		
		this.connection.sendIQ(stanza, null, function(){ self.requestTimedOut() }, this.timeoutTime)
	},
	
	requestTimedOut: function() {
		this.failedPings++
		console.log('FP')
		if (this.failedPings === 2) {
			this.failedPings = 0
			clearInterval(this.pingInterval)
			console.log('FP!')
			this.connection.disconnect()
		}
	}

})