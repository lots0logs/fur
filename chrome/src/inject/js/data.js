/*
 *
 * data.js
 *
 * Copyright © 2016 Dustin Falgout <dustin@falgout.us>
 *
 * This file is part of FUR.
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

/*global window, Map*/
"use strict"; //$NON-NLS-0$
// get hash map for key -> value transformation
function getHashMap() {
	var o = window.localStorage.map;
	var a = JSON.parse(o);
	var map = new Map();
	for (var i = 0;
	(i + 1) < a.length; i += 2) {
		map.put(a[i], a[i + 1]);
	}
	return map;
}
