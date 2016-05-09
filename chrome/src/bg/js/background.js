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
		this.options = {};
		this.default_icon = chrome.extension.getURL( 'icons/icon-16x16.png' );

		this.get_options();

		return _self;
	}

	initialize() {
		chrome.runtime.onMessage.addListener( this.chrome_on_message_cb );

		if ( false !== this.get_option( 'first_run' ) ) {
			this.save_default_settings();
		}

		this.create_context_menu();

		chrome.pageAction.onClicked.addListener( function ( tab ) {
			console.log( 'clicked popchrom pageAction on tab ' + tab.url );
			this.reload_options_page( 'createAsWell' );
		} );
	}

	get_options() {
		chrome.storage.sync.get( { 'fur_options': {} }, ( data ) => {
			console.log( data );
			this.options = data.fur_options;
			this.initialize();
		} );
	}

	update_options() {
		chrome.storage.sync.set( this.options, () => {
		} );
	}

	get_option( option_name ) {
		if ( 'undefined' !== this.options[option_name] ) {
			return this.options[option_name];
		}
	}

	play_sound() {
		try {
			document.getElementById( 'notify_sound' ).currentTime = 0;
			document.getElementById( 'notify_sound' ).play();
		} catch ( e ) {
			console.error( e );
		}
	}

	notify() {
		if ( localStorage.sound === 'true' ) {
			this.play_sound();
		}
	}

	save_default_settings() {
		this.options.hideicon = false;
		this.options.sound = true;
		this.options.selectphrase = true;
		this.options.map = chrome.i18n.getMessage( 'map_template' );
		this.first_run = false;
		this.update_options();
	}

	add_or_import_response( text ) {
		var parsedText;
		try {
			parsedText = JSON.parse( text );
			if ( parsedText instanceof Array ) {
				if ( chrome.extension.getBackgroundPage().confirm( chrome.i18n.getMessage( 'import_set' ) + parsedText.length / 2 + chrome.i18n.getMessage( 'import_selected_text' ) ) ) {
					import_settings( parsedText );
				}
				return;
			}
		} catch ( e ) {
			// NOTE OK, this does not look like an import data array.
			var name = chrome.extension.getBackgroundPage().prompt( chrome.i18n.getMessage( 'name_abbrev' ) );
			if ( name === null || name === '' ) {
			} else {
				var re = chrome.extension.getBackgroundPage().prompt( chrome.i18n.getMessage( 'enter_pattern' ) + name + chrome.i18n.getMessage( 'or_delete_pattern' ),
					'\\s+(\\d+)\\s+(\\w+)' );
				var regexp = new RegExp( re );
				if ( re === null || re === '' ) {
					import_settings( [name, text] );
				} else {
					if ( regexp && regexp instanceof RegExp ) {
						import_settings( [name, JSON.stringify( [re, text] )] );
						chrome.extension.getBackgroundPage().confirm( chrome.i18n.getMessage( 'review_expansion' ) + name + chrome.i18n.getMessage( 'place_substitutions' ) );
					} else {
						chrome.extension.getBackgroundPage().confirm( chrome.i18n.getMessage( 'cannot_construct_regexp' ) + re + '"' );
					}
				}
			}
		}
	}

	reload_options_page( create ) {
		let url = chrome.extension.getURL( 'options.html' );

		chrome.tabs.query( {
			'url': url
		}, function ( tabs ) {
			// Just update an open options page, don't open it.
			if ( tabs.length === 1 ) {
				chrome.tabs.update( tabs[0].id, { 'highlighted': true } );
				chrome.tabs.reload( tabs[0].id );
			} else if ( create ) {
				chrome.tabs.query( {
					'active': true,
					'currentWindow': true
				}, function ( tab ) {
					chrome.tabs.create( {
						'url': url,
						'openerTabId': tab[0].id
					}, function ( tab ) {

					} );
				} );
			}
		} );
	}

	create_context_menu() {
		chrome.contextMenus.create( {
			id: 'addAbbrevId',
			type: 'normal',
			title: chrome.i18n.getMessage( 'add_import_for' ),
			onclick: this.context_menu_on_click_cb,
			contexts: ['selection']
		}, function () {
			if ( chrome.extension.lastError ) {
				console.log( 'lastError:' + chrome.extension.lastError.message );
			}
		} );
	}

	page_action_message_handler( request, sender, send_response ) {
		switch ( request.action ) {
			case 'show':
				if ( true !== this.get_option( 'hideicon' ) ) {
					chrome.pageAction.setIcon( {
						tabId: sender.tab.id,
						path: this.default_icon
					} );
					chrome.pageAction.show( sender.tab.id );
				}
				break;

			case 'hide':
				chrome.pageAction.hide( sender.tab.id );
				break;

			case 'notify':
				if ( true === this.get_option( 'sound' ) ) {
					this.playSound();
				}
				break;

			default:
				console.warn( 'unknown pageaction request' );
				console.warn( request );
				return;
		}
		send_response( {} );
	}

	clipboard_message_handler( action ) {
		if ( 'paste' === action ) {
			return { paste: getClipboard() };
		}
	}

	context_menu_on_click_cb( info, tab ) {
		console.log( JSON.stringify( [info, tab] ) );
		chrome.tabs.sendMessage( tab.id, {
			'cmd': 'getSelection',  
			'url': tab.url
		}, function ( response ) {
			if ( response && response.selection ) {
				this.add_or_import_response( response.selection );
			} else {
				// TODO Yep I am the background page, I just use what other scripts should.
				chrome.extension.getBackgroundPage().alert( chrome.i18n.getMessage( 'bad_abbrev_tab' ) );
				this.add_or_import_response( info.selectionText );
			}
		} );
	}

	chrome_on_message_cb( message, sender, send_response ) {
		if ( 'object' === typeof(message) && 'action' in message ) {
			let response = '';

			switch ( message.action ) {
				case 'update_option':
					if ( 'option_name' in message && '' !== message['option_name'] ) {
						let option_name = message['option_name'];
						this.options[option_name] = message['option_value'];

						response = this.update_options();
					}
					break;

				case 'get_option':
					let option_name = message['option_name'],
						option_value = '';

					option_value = this.get_option( option_name );
					response = option_value;
					break;

				case 'reload_options_page':
					response = this.reload_options_page( 'createAsWell' );
					break;

				case 'page_action':
					response = this.page_action_message_handler( message );
					break;

				case 'clipboard':
					response = this.clipboard_message_handler( message.action );
					break;
			}

			return send_response( response );
		}
	}
}

new FrequentlyUsedResponses();
