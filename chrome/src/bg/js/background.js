/*
 * background.js
 *
 * Copyright © 2016 Dustin Falgout <dustin@falgout.us>
 *
 * This file is part of Frequently Used Responses, (FUR).
 *
 * FUR is free software; you can redistribute it and/or modify
 * it under the terms of the GNU General Public License as published by
 * the Free Software Foundation; either version 3 of the License, or
 * (at your option) any later version.
 *
 * FUR is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 * GNU General Public License for more details.
 *
 * The following additional terms are in effect as per Section 7 of the license:
 *
 * The preservation of all legal notices and author attributions in
 * the material or in the Appropriate Legal Notices displayed
 * by works containing it is required.
 *
 * You should have received a copy of the GNU General Public License
 * along with FUR; If not, see <http://www.gnu.org/licenses/>.
 */

let _self = null;

class FrequentlyUsedResponses {
	construct() {
		if ( null !== _self ) {
			return _self;
		}
		_self = this;

		this.initialize();

	}

	initialize() {
		chrome.runtime.onMessage.addListener(this.chrome_on_message_cb);
	}

	playSound() {
		try {
			document.getElementById( 'notify_sound' ).currentTime = 0;
			document.getElementById( 'notify_sound' ).play();
		} catch ( e ) {
			console.error( e );
		}
	}

	notify() {
		if ( localStorage.sound === "true" ) {
			playSound();
		}
	}

	onPageActionMessage( request, sender, sendResponse ) {
		// TODO "Format JS" in eclipse orion moves trailing comments on case labels to next line!
		// Use find regexp replace to fix that for now:
		// From:\n[ \t]+(//\$NON.+)
		// To: $1
		// Options: [v] Regular expression
		switch ( request.action ) {
			case "show":
				if ( localStorage.hideicon !== "true" ) {
					chrome.pageAction.setIcon( {
						"tabId": sender.tab.id,
						"path": default_icon
					} );
					chrome.pageAction.show( sender.tab.id );
				}
				break;
			case "hide":
				chrome.pageAction.hide( sender.tab.id );
				break;
			case "notify":
				notify( sender.tab.id );
				break;
			default:
				console.warn( "unknown pageaction request" );
				console.warn( request );
				// don't respond if you don't understand the message.
				return;
		}
		sendResponse( {} ); // snub them.
	}

	onClipboardMessage( request, sender, sendResponse ) {
		if ( request.action === "paste" ) {
			sendResponse( {
				"paste": getClipboard()
			} );
		}
	}

	handleMessage( request, sender, sendResponse ) {
		// TODO "Format JS" in eclipse orion moves trailing comments on case labels to next line!
		// Use find regexp replace to fix that for now:
		// From:\n[ \t]+(//\$NON.+)
		// To: $1
		// Options: [v] Regular expression
		switch ( request.cmd ) {
			case "options":
				reloadOptionsPage( "createAsWell" );
				break;
			case "read":
				onReadMessage( request, sender, sendResponse );
				break;
			case "pageaction":
				onPageActionMessage( request, sender, sendResponse );
				break;
			case "clipboard":
				onClipboardMessage( request, sender, sendResponse );
				break;
			case "issuedetails":
				chrome.tabs.query( {
					"active": true,
					"currentWindow": true
				}, function ( tab ) {
					chrome.tabs.sendMessage( tab[0].id, {
						"cmd": "onSubmitPopchromIssue", //$NON-NLS-1$ 
						"url": tab[0].url,
						"appDetails": JSON.stringify( chrome.app.getDetails() )
					}, function ( response ) {
						if ( response ) {
							sendResponse( {
								"summary": response.summary,
								"body": response.body
							} );
							chrome.tabs.update( sender.tab.id, {
								"highlighted": true
								//					active: true
							} );
						} else {
							console.log( "onSubmitPopchromIssue leads undefined " + JSON.stringify( response ) );
							// TODO Yep I am the background page, I just use what other scripts should.
							chrome.extension.getBackgroundPage().alert( chrome.i18n.getMessage( "bad_issue_tab" ) ); //$NON-NLS-1$
																													 //
						}
					} );
				} );
				// TODO Note that I am fixing following problem here: Could not send response: The
				// chrome.runtime.onMessage listener must return true if you want to send a response after the listener
				// returns  (message was sent by extension hiefpgnngkikffmhgghabfikbbeilkif).
				return true;
			// TODO Note that not all message types are handled for a single content script.
			// It is OK to not understand a message.
			// don't respond if you don't understand the message.
			// sendResponse({}); // snub them.
		}
	}

	// Updates all settings in all tabs
	updateSettings( windows ) {
		// TODO same in backgroundpage... migrate!
		var settings = getSettings(),
			w, t, callback = function ( response ) {
			};
		if ( toggleMarkText ) {
			chrome.contextMenus.update( toggleMarkText, {
				checked: JSON.parse( settings.selectPhrase )
			} );
		}
		for ( w in windows ) {
			var tabs = windows[w].tabs;
			for ( t in tabs ) {
				var tab = tabs[t];
				chrome.tabs.sendMessage( tab.id, settings, callback );
			}
		}
	}

	broadcastSettings() {
		chrome.windows.getAll( {
			"populate": true
		}, updateSettings );
	}

	save_default() {
		localStorage.hideicon = "false";
		localStorage.animate = "true";
		localStorage.sound = "true";
		localStorage.selectphrase = "true";
		localStorage.map = chrome.i18n.getMessage( "map_template" );
	}

	addOrImportAbbrevs( text ) {
		var parsedText;
		try {
			parsedText = JSON.parse( text );
			if ( parsedText instanceof Array ) {
				if ( chrome.extension.getBackgroundPage().confirm( chrome.i18n.getMessage( "import_set" ) + parsedText.length / 2 + chrome.i18n.getMessage( "import_selected_text" ) ) ) {
					import_settings( parsedText );
				}
				return;
			}
		} catch ( e ) {
			// NOTE OK, this does not look like an import data array.
			var name = chrome.extension.getBackgroundPage().prompt( chrome.i18n.getMessage( "name_abbrev" ) );
			if ( name === null || name === "" ) {
			} else {
				var re = chrome.extension.getBackgroundPage().prompt( chrome.i18n.getMessage( "enter_pattern" ) + name + chrome.i18n.getMessage( "or_delete_pattern" ),
					"\\s+(\\d+)\\s+(\\w+)" );
				var regexp = new RegExp( re );
				if ( re === null || re === "" ) {
					import_settings( [name, text] );
				} else {
					if ( regexp && regexp instanceof RegExp ) {
						import_settings( [name, JSON.stringify( [re, text] )] );
						chrome.extension.getBackgroundPage().confirm( chrome.i18n.getMessage( "review_expansion" ) + name + chrome.i18n.getMessage( "place_substitutions" ) );
					} else {
						chrome.extension.getBackgroundPage().confirm( chrome.i18n.getMessage( "cannot_construct_regexp" ) + re + "'" );
					}
				}
			}
		}
	}

	reloadOptionsPage( create ) {
		var url = chrome.extension.getURL( "options.html" );
		chrome.tabs.query( {
			"url": url
		}, function ( tabs ) {
			// Just update an open options page, don't open it.
			if ( tabs.length === 1 ) {
				chrome.tabs.update( tabs[0].id, {
					"highlighted": true
					// active: true
				} );
				chrome.tabs.reload( tabs[0].id );
			} else if ( create ) {
				chrome.tabs.query( {
					"active": true,
					"currentWindow": true
				}, function ( tab ) {
					chrome.tabs.create( {
						"url": url,
						// TODO Please note that when we specify openerTabId closing the new tab brings us back to that
						// tab when it still exists.
						"openerTabId": tab[0].id
					}, function ( tab ) {
					} );
				} );
			}
		} );
	}

	init() {
		chrome.extension.onMessage.addListener( handleMessage );
		if ( localStorage.used_before !== "true" ) {
			save_default();
		}
		localStorage.used_before = "true";
		// TODO Please note this removeAll is necessary to avoid following warning when extension is reloaded:
		// contextMenus.create: Cannot create item with duplicate id ID
		chrome.contextMenus.removeAll( function () {
			if ( chrome.extension.lastError ) {
				console.log( "lastError:" + chrome.extension.lastError.message );
			}
		} );
		var onAddOrImportAbbrevs = function ( info, tab ) {
			console.log( JSON.stringify( [info, tab] ) );
			chrome.tabs.sendMessage( tab.id, {
				"cmd": "getSelection", //$NON-NLS-1$ 
				"url": tab.url
			}, function ( response ) {
				if ( response && response.selection ) {
					addOrImportAbbrevs( response.selection );
				} else {
					// TODO Yep I am the background page, I just use what other scripts should.
					chrome.extension.getBackgroundPage().alert( chrome.i18n.getMessage( "bad_abbrev_tab" ) ); //$NON-NLS-1$
																											  //
					addOrImportAbbrevs( info.selectionText );
				}
			} );
		};
		var addAbbrevId = chrome.contextMenus.create( {
			// TODO Causes lastError:Cannot create item with duplicate id addAbbrevId background.js:250
			// but multiple items are created if id is absent. Live with the error for now.
			"id": "addAbbrevId", //$NON-NLS-1$ 
			"type": "normal", //$NON-NLS-1$ 
			"title": chrome.i18n.getMessage( "add_import_for" ),
			"onclick": onAddOrImportAbbrevs,
			"contexts": ["selection"] //$NON-NLS-1$ 
		}, function () {
			if ( chrome.extension.lastError ) {
				console.log( "lastError:" + chrome.extension.lastError.message );
			}
		} );
		var onSubmitPopchromIssue = function ( info, tab ) {
			try {
				console.log( JSON.stringify( [info, tab] ) );
				// TODO This URL is duplicated in search.js so that the content script can determine whether it has to
				// send an "issuedetails" message.
				var newIssueUrl = "https://code.google.com/p/trnsfrmr/issues/entry";
				// TODO Note that the content script of the issue page will send us a "issuedetails" message.
				chrome.tabs.create( {
					"active": false,
					"url": newIssueUrl
				}, function ( tab ) {
				} );
			} catch ( e ) {
				console.log( "onSubmitPopchromIssue reports " + e );
			}
		};
		var submitPopchromIssueId = chrome.contextMenus.create( {
			// TODO Causes lastError:Cannot create item with duplicate id submitPopchromIssueId
			// but multiple items are created if id is absent. Live with the error for now.
			"id": "submitPopchromIssueId", //$NON-NLS-1$ 
			"type": "normal", //$NON-NLS-1$ 
			"title": chrome.i18n.getMessage( "submit_issue_for" ),
			"onclick": onSubmitPopchromIssue,
			"contexts": ["all"] //$NON-NLS-1$ 
		}, function () {
			if ( chrome.extension.lastError ) {
				console.log( "lastError:" + chrome.extension.lastError.message );
			}
		} );
		var toggleMarkingText = function ( info, tab ) {
			localStorage.selectphrase = JSON.stringify( !JSON.parse( localStorage.selectphrase ) );
			broadcastSettings();
			reloadOptionsPage();
		};
		toggleMarkText = chrome.contextMenus.create( {
			// TODO Causes lastError:Cannot create item with duplicate id
			// toggleMarkText but multiple items are created if id is
			// absent. Live with the error for now.
			"id": "toggleMarkText", //$NON-NLS-1$ 
			"type": "checkbox", //$NON-NLS-1$ 
			"checked": JSON.parse( localStorage.selectphrase ),
			"title": chrome.i18n.getMessage( "selectphrase" ), //$NON-NLS-1$ 
			"onclick": toggleMarkingText,
			"contexts": ["all"] //$NON-NLS-1$ 
		}, function () {
			if ( chrome.extension.lastError ) {
				console.log( "lastError:" + chrome.extension.lastError.message );
			}
		} );
		chrome.pageAction.onClicked.addListener( function ( tab ) {
			console.log( "clicked popchrom pageAction on tab " + tab.url );
			reloadOptionsPage( "createAsWell" );
		} );
	}

	chrome_on_message_cb( message, sender, send_response ) {
		if ( 'object' === typeof(message) && 'action' in message ) {

			if ('set' === message.action && '' !== message.key ) {
				let save = {};
				save[message.key] = message.value;

				chrome.storage.sync.set(save, () => {
					chrome.storage.sync.get(message.key, (data) => {
						console.log(data);
						return send_response(data);
					});
				});

			} else if ('get' === message.action && '' !== message.key) {
				chrome.storage.sync.get(message.key, (data) => {
					console.log(data);
					return send_response(data);
				});

			} else if ('remove' === message.action && '' !== message.key) {
				chrome.storage.sync.remove(message.key, () => {
					return send_response();
				});
			}

		}
		return send_response();
	}
}
var default_icon = chrome.extension.getURL( "icons/icon-16x16.png" );
var toggleMarkText;

var notifyDelay = 100;


init();
