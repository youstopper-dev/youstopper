(function(doc) {
	'use strict';

	function wait4doc(doc) {
		return new Promise(function(resolve, reject) {
			var state = doc.readyState;
			if (state == 'loading') {
				doc.addEventListener('DOMContentLoaded', function onDomLoaded() {
					doc.removeEventListener('DOMContentLoaded', onDomLoaded, false);
					resolve(doc);
				}, false);
			}
			else {
				resolve(doc);
			}
		});
	}

	function setDomFlag(name, value) {
		wait4doc(doc).then(function (doc) {
			var el = doc.getElementById('youstop-settings-el');
			if (el == null) {
				el = doc.createElement('div');
				el.setAttribute('style', 'display: none;');
				el.setAttribute('id', 'youstop-settings-el');
				doc.body.appendChild(el);
			}
			el.dataset[name] = value ? "1" : "0";
		});
	}

	function injectScript() {
		wait4doc(doc).then(function (doc) {
			var pageScript = doc.createElement('script');
			pageScript.type = 'text/javascript';
			pageScript.async = false;
			pageScript.src = chrome.extension.getURL('page.js');
			(doc.head || doc.getElementsByTagName('head')[0]).appendChild(pageScript);
		});
	}

	function main() {
		var injected = false;

		function onDisabledChanged(disabled) {
			if (!disabled && !injected) {
				injectScript();
				injected = true;
			}
			setDomFlag('disabled', disabled);
		}

		chrome.storage.sync.get({'disabled': false}, function (storageValue) {
			onDisabledChanged(storageValue['disabled']);
			chrome.storage.onChanged.addListener(function (changes) {
				if (changes.hasOwnProperty('disabled')) {
					onDisabledChanged(changes['disabled'].newValue);
				}
			})
		});
	}
	
	main();
})(document);
