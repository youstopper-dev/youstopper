(function() {
	var enabledIconObj = {
			"32": "icons/youstop_icon_32.png",
			"48": "icons/youstop_icon_48.png",
			"64": "icons/youstop_icon_64.png",
			"128": "icons/youstop_icon_128.png",
			"512": "icons/youstop_icon_512.png"
		},
	    disabledIconObj = {
			"32": "icons/youstop_icon_bw_32.png",
			"48": "icons/youstop_icon_bw_48.png",
			"64": "icons/youstop_icon_bw_64.png",
			"128": "icons/youstop_icon_bw_128.png",
			"512": "icons/youstop_icon_bw_512.png"
		},
		enabledTitile = chrome.i18n.getMessage("ba_click2disable"),
		disabledTitle = chrome.i18n.getMessage("ba_click2enable");
		
	function updateBrowserAction(disabled) {
		chrome.browserAction.setTitle({'title': disabled ? disabledTitle : enabledTitile});
		chrome.browserAction.setIcon({'path': disabled ? disabledIconObj : enabledIconObj});
	}

	chrome.storage.sync.get({'disabled': false}, function (storageVal) {
		updateBrowserAction(storageVal['disabled']);
	});

	chrome.browserAction.onClicked.addListener(function () {
		chrome.storage.sync.get({'disabled': false}, function (storageVal) {
			var disabled = !storageVal['disabled'];
			chrome.storage.sync.set({'disabled': disabled}, function() {
				updateBrowserAction(disabled);
			});
		});
	});
})();
