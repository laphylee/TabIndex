/*
Main logic:
	Update all tab titles when create/remove/move any tab.
	When a new tab is updated and not caused by adding index, we update this single tab title.
*/

var indexTitleRegex = /^\d+\./;
var isChromeUrl = function(url) {return url.startsWith('chrome')};

//The Listener for 'OnUpdated' event
function updateListener(tabId, changeInfo, tab) {
	//Only call this when a new original page is loaded.
	if(
		changeInfo.title == undefined //not a title change. 
		|| indexTitleRegex.test(changeInfo.title) //a title change triggered by this extension. (Not considering the rare case where an original title starting with this regex)
		|| isChromeUrl(tab.url) //no need update title
		) {
		return;
	}
	//console.log(changeInfo);
	//console.log(tab);

	update(tab);
};


//Update the title of a single tab
function update(details, enableListener = false) {
  var id = details.id;
  var index = details.index;
  var title = details.title;
  var url = details.url;

	if(isChromeUrl(url)) {
		return;
	}
  
	//Some sites may change the title by themselves after prepending the "<id>.", such as "(10 new messages) 7. Your zhihu site", so we need to remove the "<id>." first.
  if (title && title.indexOf('. ') != -1) {
		title = title.replace(/\d+\./, '');
  }

	//Need to replace <"> with <\">
  title = (index + 1) + '. ' + title.replace(/"/g,'\\"');

  chrome.tabs.executeScript(
      id,
      {
				code :  `document.title="${title}";`
				//file: "tabScript.js"
      },
			function(result) {
				if(enableListener) { //no need any more
					chrome.tabs.onUpdated.addListener(updateListener);		
					//console.log(`Update listener added.`);
				}
				if (chrome.runtime.lastError) {
					console.log(`error: ${chrome.runtime.lastError.message}. Url=${url}`);
				}
			}
    );

};

//Update the titles of all tabs
function updateAll() {
  chrome.tabs.query({currentWindow: true}, function(tabs) {
		//console.log(`There are ${tabs.length} tabs`);
		tabs.forEach(tab=>update(tab));
  });
}

//Remove the index of all tabs
function removeAllIndex () {
  chrome.tabs.query({}, function(tabs) {
		tabs.forEach(tab=>{
			if(isChromeUrl(tab.url)) return;
			chrome.tabs.executeScript(
				tab.id,
				{
					code :  `document.title="${tab.title.replace(/^\d+\./, '')}";`
				},
			);
		}
		)
});
};

//entry point
chrome.tabs.onCreated.addListener(updateAll);
chrome.tabs.onMoved.addListener(updateAll);
chrome.tabs.onRemoved.addListener(updateAll);
chrome.tabs.onUpdated.addListener(updateListener);
updateAll();

//Add a toggle item on the context menu
chrome.contextMenus.removeAll();
chrome.contextMenus.create({
			id: "1",
      title: "Enable Tab Index",
      contexts: ["browser_action"],
			type: "checkbox",
			checked: true
},
			function() {
				if (chrome.runtime.lastError) {
					console.log("error: "+chrome.runtime.lastError.message);
				}
			}
);
chrome.contextMenus.onClicked.addListener(function(info) {
	info.checked=!info.wasChecked;
	if(info.checked) {
		chrome.tabs.onCreated.addListener(updateAll);
		chrome.tabs.onMoved.addListener(updateAll);
		chrome.tabs.onRemoved.addListener(updateAll);
		chrome.tabs.onUpdated.addListener(updateListener);
		updateAll();
	}
	else {
		chrome.tabs.onCreated.removeListener(updateAll);
		chrome.tabs.onMoved.removeListener(updateAll);
		chrome.tabs.onRemoved.removeListener(updateAll);
		chrome.tabs.onUpdated.removeListener(updateListener);
		removeAllIndex();
	}
});
