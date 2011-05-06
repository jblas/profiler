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

/*

{
	"functions": {
		"10": {
			"count": 100,
			"total": 123456,
			"min":   123,
			"max":   500,
			"label": "obj.foo"
		}
	},

	"callgraphs": [
		{
			"start": 0,
			"stop":  10,
			"duration": 10,
			"id": 10,
			"parentId": 0,
			"children": [
				{
					"start": 0,
					"stop":  10,
					"duration": 10,
					"id": 10,
					"parentId": 0,
					"children": []
				}
			]
		}
	]
}

 */

function dumpJSONCallGraph(callItem, output)
{
	output.push('{"id":' + callItem.profileItem.id + ',');
	output.push('"start":' + callItem.startTime + ',');
	output.push('"stop":' + callItem.stopTime + ',');
	output.push('"duration":' + callItem.duration + ',');
	output.push('"parentId":' + (callItem.parent ? callItem.parent.profileItem.id : 0) + ',');
	output.push('"children":[');
	var children = callItem.children;
	if (children) {
		var len = children.length,
			last = len - 1;
		for (var i = 0; i < len; i++) {
			dumpJSONCallGraph(children[i], output);
			if (i != last) {
				output.push(',');
			}
		}
	}
	output.push(']}');
}

function dumpProfileJSON(profiler)
{
	var pid = profiler.profileItemDict,
		arr = [],
		output = [];

	for (var k in pid) {
		arr.push(pid[k]);
	}

	arr = arr.sort(function(a,b){
		a = a.label;
		b = b.label;
		return a == b ? 0 : (a > b ? 1 : -1);
	});

	output.push('{"functions":{');
	var len = arr.length, last = len - 1;
	for (var i = 0; i < len; i++) {
		var p = arr[i];
		output.push('"' + p.id + '":{');
		output.push('"label":"' + p.label + '",');
		output.push('"count":' + p.count + ',');
		output.push('"total":' + p.total + ',');
		output.push('"min":' + p.min + ',');
		output.push('"max":' + p.max);
		output.push(i == last ? '}' : '},');
	}
	output.push('},"callgraphs":[');
	arr = profiler.callGraphs;
	len = arr.length;
	last = len -1;

	for (i = 0; i < len; i++) {
		dumpJSONCallGraph(arr[i], output);
		if (i != last) {
			output.push(',');
		}
	}
	output.push(']}');
	return output.join("");
}

//
// Expose Public Functions
//

window.$dumpProfileText = dumpProfileText;
window.$dumpProfileHTML = dumpProfileHTML;
window.$dumpProfileJSON = dumpProfileJSON;

})(window);
