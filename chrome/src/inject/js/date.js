/*
 *
 * date.js
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

/*jslint browser: true, devel: true, todo: true */
/*global Settings, PageAction, window: false, chrome: false*/
"use strict"; //$NON-NLS-0$

function currentTime() {
	//    var d = new Date();
	//    var hours = d.getHours();
	//    var minutes = d.getMinutes();
	//    var seconds = d.getSeconds();
	//    var milliseconds = d.getMilliseconds;
}

function isNumeric(sText) {
	var validChars = "0123456789"; //$NON-NLS-0$
	var isNumber = true;
	var chr;
	for (var i = 0; i < sText.length && isNumber === true; i++) {
		chr = sText.charAt(i);
		if (validChars.indexOf(chr) === -1) {
			isNumber = false;
		}
	}
	if (sText.length === 0) {
		isNumber = false;
	}
	return isNumber;
}

function getOperator(value) {
	var operator = "+"; //$NON-NLS-0$
	var pattern = /-/;
	if (pattern.exec(value)) {
		operator = "-"; //$NON-NLS-0$
	}
	return operator;
}

function getAddOn(pattern, value) {
	pattern.exec(value);
	var match = RegExp.$1;
	match = match.replace(/\+/, "");
	return match;
}

function replaceDate(value) {
	var pDate = /%DATE([\+\-](\d*d)?(\d*m)?(\d*y)?)?%/,
		future, match, months, operator;
	pDate.exec(value);
	var days = "";
	//    var month = "";
	var years = "";
	var regexp = RegExp.$1;
	var pattern = /(\d*d)/;
	pattern.exec(regexp);
	match = RegExp.$1;
	days = match.replace("d", ""); //$NON-NLS-0$ //$NON-NLS-1$
	pattern = /(\d*m)/;
	pattern.exec(regexp);
	match = RegExp.$1;
	months = match.replace("m", ""); //$NON-NLS-0$ //$NON-NLS-1$
	pattern = /(\d*y)/;
	pattern.exec(regexp);
	match = RegExp.$1;
	years = match.replace("y", ""); //$NON-NLS-0$ //$NON-NLS-1$
	operator = getOperator(value);
	future = new Date();
	if (operator === "+") { //$NON-NLS-0$
		if (isNumeric(days)) {
			future.setDate(future.getDate() + parseInt(days, 10));
		}
		if (isNumeric(months)) {
			future.setMonth(future.getMonth() + parseInt(months, 10));
		}
		if (isNumeric(years)) {
			future.setYear(future.getFullYear() + parseInt(years, 10));
		}
	} else if (operator === "-") { //$NON-NLS-0$
		if (isNumeric(days)) {
			future.setDate(future.getDate() - parseInt(days, 10));
		}
		if (isNumeric(months)) {
			future.setMonth(future.getMonth() - parseInt(months, 10));
		}
		if (isNumeric(years)) {
			future.setYear(future.getFullYear() - parseInt(years, 10));
		}
	}
	value = value.replace(pDate, future.getDate() + "." + (future.getMonth() + 1) + "." + future.getFullYear()); //$NON-NLS-0$ //$NON-NLS-1$
	return value;
}

function replaceDates(value) {
	var d = new Date();
	//	TODO getDay() returns the day of week,
	//	see http://www.ecma-international.org/ecma-262/5.1/#sec-15.9.5.16
	value = value.replace(/(?:%DAY%|%d)/, (d.getDate() < 10) ? "0" + d.getDate() : d.getDate()); //$NON-NLS-0$
	var month = d.getMonth() + 1;
	value = value.replace(/(?:%MONTH%|%m)/, (month < 10) ? "0" + month : month); //$NON-NLS-0$
	value = value.replace(/(?:%YEAR%|%Y)/, d.getFullYear());
	var hours = d.getHours();
	value = value.replace(/%H/, (hours < 10) ? "0" + hours : hours); //$NON-NLS-0$
	var minutes = d.getMinutes();
	value = value.replace(/%M/, (minutes < 10) ? "0" + minutes : minutes);
	var seconds = d.getSeconds();
	value = value.replace(/%S/, (seconds < 10) ? "0" + seconds : seconds); //$NON-NLS-0$
	var timeZoneOffset = -d.getTimezoneOffset();
	var offsetMinutes = timeZoneOffset % 60;
	var offsetHours = (timeZoneOffset - offsetMinutes) / 60;
	value = value.replace(/%z/, (offsetHours > 0 ? "+" : "") + ((offsetHours < 10) ? "0" + offsetHours : offsetHours) + ((offsetMinutes < 10) ? "0" + offsetMinutes : offsetMinutes)); //$NON-NLS-0$
	value = replaceDate(value);
	return value;
}

function replaceAllDates(value) {
	var oldValue;
	do {
		oldValue = value;
		value = replaceDates(value);
	} while (oldValue !== value);
	return value;
}
