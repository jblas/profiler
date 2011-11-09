// profiler-dump.js - version 0.1
// Copyright (c) 2011, Kin Blas
// All rights reserved.
// 
// Redistribution and use in source and binary forms, with or without
// modification, are permitted provided that the following conditions are met:
//     * Redistributions of source code must retain the above copyright
//       notice, this list of conditions and the following disclaimer.
//     * Redistributions in binary form must reproduce the above copyright
//       notice, this list of conditions and the following disclaimer in the
//       documentation and/or other materials provided with the distribution.
//     * Neither the name of the <organization> nor the
//       names of its contributors may be used to endorse or promote products
//       derived from this software without specific prior written permission.
// 
// THIS SOFTWARE IS PROVIDED BY THE COPYRIGHT HOLDERS AND CONTRIBUTORS "AS IS" AND
// ANY EXPRESS OR IMPLIED WARRANTIES, INCLUDING, BUT NOT LIMITED TO, THE IMPLIED
// WARRANTIES OF MERCHANTABILITY AND FITNESS FOR A PARTICULAR PURPOSE ARE
// DISCLAIMED. IN NO EVENT SHALL <COPYRIGHT HOLDER> BE LIABLE FOR ANY
// DIRECT, INDIRECT, INCIDENTAL, SPECIAL, EXEMPLARY, OR CONSEQUENTIAL DAMAGES
// (INCLUDING, BUT NOT LIMITED TO, PROCUREMENT OF SUBSTITUTE GOODS OR SERVICES;
// LOSS OF USE, DATA, OR PROFITS; OR BUSINESS INTERRUPTION) HOWEVER CAUSED AND
// ON ANY THEORY OF LIABILITY, WHETHER IN CONTRACT, STRICT LIABILITY, OR TORT
// (INCLUDING NEGLIGENCE OR OTHERWISE) ARISING IN ANY WAY OUT OF THE USE OF THIS
// SOFTWARE, EVEN IF ADVISED OF THE POSSIBILITY OF SUCH DAMAGE.

(function(window){

//
// Dump as plain-text
//

function dumpProfileTextCallInstance(ci, indent, arr)
{
	arr = arr || [];

	arr.push(indent + ci.profileItem.label + " - duration: " + ci.duration + "\n");
	var children = ci.children,
		newIndent = indent + "    ";
	if (children){
		for (var i = 0; i < children.length; i++){
			dumpProfileTextCallInstance(children[i], newIndent, arr);
		}
	}
	return arr;
}

function dumpProfileItems( profiler, minCallCount, sortColumns )
{
	var output = [],
		items = [],
		itemsCount = 0,
		dict = profiler.profileItemDict,
		item,
		avg,
		key,
		i;

	minCallCount = minCallCount || 1;
	sortColumns = sortColumns || [ "max", "count" ];

	// Run through all the calls in our item dictionary
	// and grab only the ones that were actually called.

	for ( key in dict ) {
		var item = dict[ key ];
		if ( item.count >= minCallCount ) {
			items.push( item );
		}
	}

	itemsCount = items.length;

	items = items.sort(function( a, b ) {
		var col = 0,
			i;
		for ( col = 0; col < sortColumns.length; col++ ) {
			var prop = sortColumns[ col ];
			if ( a[ prop ] > b[ prop ] ) {
				return -1;
			} else if ( a[ prop ] < b[ prop ] ) {
				return 1;
			}
		}
		return 0;
	});

	output.push( "count\t\tmax\t\tmin\tavg\t\ttotal\t\tlabel\n" );
	for ( i = 0; i < itemsCount; i++ ) {
		item = items[ i ];
		avg = Math.round(item.avg * 100) / 100;
		output.push( item.count + "\t\t" + item.max + "\t\t" + item.min + "\t\t" + avg + "\t\t" + item.total + "\t\t" + item.label + "\n");
	}
	return output.join("");
}

function dumpProfileText(profiler)
{
	var callGraphs = profiler.callGraphs,
		output = [];

	for (var i = 0; i < callGraphs.length; i++){
		dumpProfileTextCallInstance(callGraphs[i], "", output);
		output.push("\n----\n\n");
	}

	return output.join("");
}

//
// Dump as HTML
//

function dumpProfileHTMLList(callArray, indent, arr)
{
	var indent = indent || "",
		newIndent = indent + "    ",
		contentIndent = newIndent + "    ",
		len = callArray.length;
	if (len > 0){
		arr.push(indent + "<ul>\n");
		for (var i = 0; i < len; i++){
			var ci = callArray[i];
			arr.push(newIndent + "<li>\n" + contentIndent + "<span>" + ci.profileItem.label + " - duration: " + ci.duration + "</span>\n");
			if (ci.children)
				dumpProfileHTMLList(ci.children, contentIndent, arr);
			arr.push(newIndent + "</li>\n");
		}
		arr.push(indent + "</ul>\n");
	}
}

function dumpProfileHTML(profiler)
{
	var output = [];
	dumpProfileHTMLList(profiler.callGraphs, "", output);
	return output.join("");
}


//
// Dump as JSON
//
//    {
//    	version: "0.1",
//    
//    	items: {
//    		"itemId": [ label, min, max, avg, total, count ],
//    		...
//    	},
//    
//    	calls: {
//    		"callId": [ itemId, duration, parentCallId, [ child1CallId, child2CallId, child3CallId ... ] ],
//    		...
//    	},
//    
//    	graphs: [ "callId", "callId", "callId", ... ]
//    }
//

function stringEscape( str )
{
	return str.replace(/('|"|\\)/g, "\\$1").replace( /\n/, "\\n" ).replace( /\r/, "\\r" ).replace( /\t/, "\\t" );
}

function dumpProfileJSON( profiler )
{
	var output = [ '{"version": "0.1","useragent":"' + stringEscape(navigator.userAgent) + '","date":'+ ( new Date() ).getTime() +',"items":{' ],
		itemDict = profiler.profileItemDict,
		graphs = profiler.callGraphs,
		calls = [],
		ca, cc, c, i, j, k, key, item, first = true;

	first = true;
	for ( k in itemDict ) {
		item = itemDict[ k ];

		if ( item.count > 0 ) {
			if ( !first ) {
				output.push( ',' );
			} else {
				first = false;
			}
			output.push( '"' + k + '":[' + '"' + stringEscape( item.label ) + '",' + item.min + ',' + item.max + ',' + ( Math.round( item.avg*100 ) / 100 ) + ',' + item.total + ',' + item.count + ']' );
			if ( item.calls && item.calls.length ) {
				calls.push( item.calls );
			}
		}
	}

	output.push('},"calls":{');
	first = true;
	for ( i = 0; i < calls.length; i++ ) {
		ca = calls[ i ];
		for ( j = 0; j < ca.length; j++ ) {
			if ( !first ) {
				output.push( ',' );
			} else {
				first = false;
			}
			c = ca[ j ];
			cc = c.children;

			output.push( '"' + c.id + '":["' + c.profileItem.id + '",' + c.duration + ',' + ( c.parent ? '"' + c.parent.id + '"' : 'null' ) );
			if ( cc && cc.length ) {
				output.push( ',[' );
				for ( k = 0; k < cc.length; k++ ) {
					if ( k > 0 ) {
						output.push( ',' );
					}
					output.push( '"' + cc[ k ].id + '"' );
				}
				output.push( ']' );
			}
			output.push( ']' );
		}
	}
	output.push('},"graphs":[');
	for (var i = 0; i < graphs.length; i++ ) {
		if ( i > 0 ) {
			output.push( ',' );
		}
		output.push( '"' + graphs[ i ].id + '"' );
	}
	output.push(']}');

	return output.join("");
}

//
// Expose Public Functions
//

window.$dumpProfileItems = dumpProfileItems;
window.$dumpProfileText = dumpProfileText;
window.$dumpProfileHTML = dumpProfileHTML;
window.$dumpProfileJSON = dumpProfileJSON;

})(window);
