/*
 *
 * gspreadsheet.js
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

/*
 * You wouldn't want to create these yourself, unless you can get the json yourself. Chances are you will use GSpreadsheet.load()
 */
var GSpreadsheet = function(key, json, options) {
  this.key = key;
  this.options = options || {};
  this.data = [];
  this.headers = [];
  this.index = [];

  // initialize the data
  for (var x = 0; x < json.feed.entry.length; x++) {
    var entry = json.feed.entry[x];
    var row = {};
    for (var i in entry) {
      if (i.indexOf('gsx$') == 0) {
        var key = i.substring(4);

        if (x == 0) { // add to the headers on the first time around
          this.headers.push(key);
        }
        
        if (key == this.options['index']) { // save the index'd ite
          this.index[entry[i].$t] = x;
        }
        row[key] = entry[i].$t;
      }
    }
    this.data.push(row);
  }
  
  this.each = function(callback) {
    for (var x = 0; x < this.data.length; x++) {
      callback(this.data[x]);
    }
  };
  
  /*
   * Take either a key (e.g. 'firstname') or the row id that you want
   */
  this.select = function(id) {
    if (typeof id == 'string') {
      return this.data[this.index[id]];
    } else {
      return this.data[id];
    }
  };
  
  // -- Debugging Helpers
  this.displayAll = function(inlineCSS) {
    if (!inlineCSS) inlineCSS = '';
    var table = "<table cellpadding='5' cellspacing='0' " + inlineCSS + "><tr>";
    for (var x = 0; x < this.headers.length; x++) {
      table += "<th style='background-color: black; color: white;'>" + this.headers[x] + "</th>";
    }
    table += "</tr>";

    var self = this;
    this.each(function(row) {
      var tr = "<tr>";
      for (var x = 0; x < self.headers.length; x++) {
        tr += "<td style='border: 1px solid grey;'>" + row[self.headers[x]] + "</td>";
      }
      tr += "</tr>";
      table += tr;
    });

    table += "</table>";
    return table;
  };
  
  this.displayRow = function(id) {
    var row = this.select(id);
    var keyvalues = [];
    for (var x in row) {
      keyvalues.push(x + ' = ' + row[x]);
    }
    return keyvalues.join(', ');
  }
}

/*
 * This is a static method that loads in spreadsheets and returns GSpreadsheets, passing them into their callback
 */
GSpreadsheet.load = function(key, options, callback) {
  if (!options['worksheet']) options['worksheet'] = 'od6';
  var worksheet = options['worksheet'];
  
  var callbackName = "GSpreadsheet.loader_" + key + "_" + worksheet;
  eval(callbackName + " = function(json) { var gs = new GSpreadsheet(key, json, options); callback(gs); }");
  
  var script = document.createElement('script');

  script.setAttribute('src', 'http://spreadsheets.google.com/feeds/list/' + key + '/' + worksheet + '/public/values' +
                        '?alt=json-in-script&callback=' + callbackName);
  script.setAttribute('id', 'jsonScript');
  script.setAttribute('type', 'text/javascript');
  document.documentElement.firstChild.appendChild(script);
}