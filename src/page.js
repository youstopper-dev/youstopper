(function(doc, wnd) {
	'use strict';

	var log = emptyFn;

	function emptyFn() {
	}

	function toLower(s) {
		return typeof s == 'string' ? s.toLowerCase() : s;
	}

	function parseSearchString(s) {
		var m = new Map(),
			decode = wnd.decodeURIComponent,
			parts, i, len, key, value, pair;
			
		if (s.length > 0 && s.charAt(0) == '?') {
			s = s.substring(1);
		}

		parts = s.split('&');
		for (i = 0, len = parts.length; i < len; ++i) {
			pair = parts[i].split('=');
			if (pair.length == 2) {
				key = decode(pair[0]);
				value = decode(pair[1]);
				m.set(key, value);
			}
		}
		
		return m;
	}

	function getSingleParameter(queryString, paramName) {
		var searchString = '&' + paramName + '=',
			startIdx, endIdx;

		if (queryString.length > 0 && queryString.charAt(0) == '?') {
			queryString = '&' + queryString.substring(1);
		}

		startIdx = queryString.lastIndexOf(searchString);
		if (startIdx < 0) {
			return null;
		}

		startIdx += searchString.length;
		endIdx = queryString.indexOf('&', startIdx);
		if (endIdx < 0) {
			endIdx = queryString.length;
		}
		return wnd.decodeURIComponent(queryString.substring(startIdx, endIdx));
	}

	function realLog() {
		wnd.console.log.apply(wnd.console, Array.prototype.slice.call(arguments));
	}

	function wait4visibility(doc) {
		return new Promise(function (resolve, reject) {
			if (doc.visibilityState == 'visible') {
				resolve(doc);
			}
			else {
				doc.addEventListener('visibilitychange', function onVisibilityChange() {
					if (doc.visibilityState == 'visible') {
						doc.removeEventListener('visibilitychange', onVisibilityChange, false);
						resolve(doc);
					}
				}, false)
			}
		});
	}

	function PlayerStopper() {
		this.isDestroyed = false;
		this.start();
	}

	PlayerStopper.prototype.PlayerState = {
		PLAYING: 1,
		PAUSED: 2,
		ADS: 3,
		CUED: 5
	};

	PlayerStopper.prototype.getHtml5Player = function () {
		var player = doc.getElementById('movie_player');
		if (player != null && player.nodeType == 1 && toLower(player.tagName) == 'div') {
			return player;
		}
		return null;
	};

	PlayerStopper.prototype.getFlashPlayer = function() {	
		if (typeof wnd.yt != 'undefined' && typeof wnd.yt.player != 'undefined') {
			return wnd.yt.player.getPlayerByElement('player-api');
		}
		return null;
	};

	PlayerStopper.prototype.wait4player = function() {
		var self = this;
		return new Promise(function check(resolve, reject) {
			if (self.isDestroyed) {
				reject();
				return;
			}

			var player = self.getHtml5Player() || self.getFlashPlayer();
			if (player != null && self.isPlayerReady(player)) {
				log('player ready', player);
				resolve(player);
			}
			else {
				wnd.setTimeout(check, 50, resolve, reject);
			}
		});
	};

	PlayerStopper.prototype.wait4playerState = function(player) {
		return new Promise(function(resolve, reject) {
			function checkState(player) {
				var state = player.getPlayerState();
				if (state < 0) {
					return reject;
				}
				if (state == 1 || state == 2 || state == 5) {
					return resolve;
				}
				return null;
			}

			var checkFn = checkState(player);
			if (checkFn == null) {
				player.addEventListener('onStateChange', function onStateChange() {
					var checkFn = checkState(player);
					if (checkFn != null) {
						player.removeEventListener('onStateChange', onStateChange, false);
						checkFn(player);
					}
				}, false);
			}
			else {
				checkFn(player);
			}
		});
	};

	PlayerStopper.prototype.isPlayerReady = function(player) {
		return typeof player.getPlayerState == 'function' && player.getPlayerState() > 0;
	};

	PlayerStopper.prototype.start = function() {
		var self = this;
		self.wait4player().then(function(player) {
			var origTime = player.getCurrentTime();

			log('origTime == ', origTime);
			function restorePlayer(player) {
				if (origTime >= 0 && origTime > player.getCurrentTime()) {
					player.seekTo(origTime);
				}
			}

			self.wait4playerState(player).then(function (player) {
				self.pauseVideo(player).then(restorePlayer, emptyFn);
			}, restorePlayer);
		}, emptyFn);
	};
	
	PlayerStopper.prototype.pauseVideo = function(player) {
		var self = this;
		return new Promise(function tryPause(resolve, reject) {
			if (self.isDestroyed) {
				reject(player);
				return;
			}

			var state = player.getPlayerState();
			log('Video state ', state);
			if (state < 0 || state == 5) {
				reject(player);
				return;
			}
			if (state == 2) {
				resolve(player);
				return;
			}
			if (state == 3) {
				wnd.setTimeout(tryPause, 32, resolve, reject);
				return;
			}

			player.pauseVideo();
			wnd.setTimeout(tryPause, 32, resolve, reject);
		});
	}

	PlayerStopper.prototype.destroy = function() {
		this.isDestroyed = true;
	};

	function isPlaylistPage(doc) {
		var listId = getSingleParameter(doc.location.search, 'list');
		return listId != null && listId.length > 0;
	}

	function observeSettings(changeCallback) {
		function wait4settings(doc) {
			return new Promise(function check(resolve, reject) {
				var settingsEl = doc.getElementById('youstop-settings-el');
				if (settingsEl != null) {
					resolve(settingsEl);
				}
				else {
					wnd.setTimeout(check, 500, resolve, reject);
				}
			});
		}

		function isTrueDataAttrString(s) {
			return s != null && s.length > 0 && parseInt(s) != 0;
		}

		function getSettingsFromEl(settingsEl) {
			return {
				'disabled': isTrueDataAttrString(settingsEl.dataset['disabled']),
				'loggingEnabled': isTrueDataAttrString(settingsEl.dataset['loggingEnabled'])
			};
		}

		wait4settings(doc).then(function (settingsEl) {
			wnd.setTimeout(changeCallback, 0, getSettingsFromEl(settingsEl));

			var mo = new MutationObserver(function onMutation(mutations) {
				if (mutations.length > 0) {
					wnd.setTimeout(changeCallback, 0, getSettingsFromEl(mutations[0].target));
				}
			});
			mo.observe(settingsEl, {'attributes': true, 'childList': false, 'subtree': false, 'attributeFilter': ['data-disabled', 'data-logging-enabled']});
		});
	}

	function main() {
		var playerStopper = null,
			disabled = false,
			loggingEnabled = false;

		function onNavigated() {
			destroyStopper();
			if (!disabled && toLower(doc.location.pathname) == '/watch' && !isPlaylistPage(doc)) {
				playerStopper = new PlayerStopper();
			}
		}

		function onNavigatingOut() {
			destroyStopper();
		}
		
		function destroyStopper() {
			if (playerStopper != null) {
				playerStopper.destroy();
				playerStopper = null;
			}
		}

		observeSettings(function osSettingsChanges(settings) {
			disabled = settings['disabled'];
			if (disabled) {
				destroyStopper();
			}

			loggingEnabled = settings['loggingEnabled'];
			log = loggingEnabled ? realLog : emptyFn;
		});

		doc.addEventListener('spfrequest', function() { wnd.setTimeout(onNavigatingOut, 0); }, false);
		doc.addEventListener('spfdone', function() { wnd.setTimeout(onNavigated, 0); }, false);
		onNavigated();
	}

	wait4visibility(doc).then(main, emptyFn);
})(document, document.defaultView);
