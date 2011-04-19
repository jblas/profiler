// profiler.js - version 0.1
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

(function(){

var nextProfileItemId = 1,
	funcPropExceptions = {
		arguments:    true,
		arity:        true,
		caller:       true,
		constructor:  true,
		length:       true,
		name:         true,
		apply:        true,
		bind:         true,
		call:         true,
	};

function CallInstance(profileItem)
{
	this.startTime =     0;
	this.stopTime =      0;
	this.duration =      0;
	this.profileItem =   profileItem;
	this.callNumber =    0;
	this.parent =        null;
	this.children =      null;
}

// CallInstance object stores the data
// for a unique call to a profiled function/method.

CallInstance.prototype = {
	constructor: CallInstance,
	startTimer: function()
	{
		this.startTime = this.stopTime = this.currentTime();
		this.duration = 0;
	},

	stopTimer: function()
	{
		this.stopTime = this.currentTime();
		this.duration = this.stopTime - this.startTime;
	},

	currentTime: function()
	{
		return (new Date()).getTime();
	},
	
	addChild: function(child)
	{
		if (child){
			if (!this.children){
				this.children = [];
			}
			child.parent = this;
			this.children.push(child);
		}
	}
};

// ProfileItem stores all of the call data for
// a specific function/method.

function ProfileItem(label)
{
	this.stack = [];
	this.calls = [];
	this.count = this.total = this.min = this.max = 0;
	this.disabled = false;
	this.label = label || "anonymous";
	this.id = nextProfileItemId++;
}

ProfileItem.prototype = {
	constructor: ProfileItem,

	start: function()
	{
		var ci = new CallInstance(this);
		this.stack.push(ci);
		this.calls.push(ci);
		++this.count;

		ci.startTimer();

		return ci;
	},

	stop: function()
	{
		var ci = this.stack.pop();

		ci.stopTimer();

		var duration = ci.duration;
		this.total += duration;
		this.min = Math.min(this.min, duration);
		this.max = Math.max(this.max, duration);

		return ci;
	},

	clear: function() {
		this.stack.length;
		this.calls.length;
		this.count = this.total = this.min = this.max = 0;
	}
};

// Profiler stores the profile data for all functions/methods
// it manages.

function Profiler()
{
	this.sectionMap = {};
	this.profileItemDict = {};
	this.callBranches = [];
	this.callStack = [];
	this.disabled = false;
}

Profiler.prototype = {
	constructor: Profiler,

	instrumentFunction: function(funcRef, label)
	{
		var self = this,
			pi = new ProfileItem(label),
			pf = function(){
				var enabled = !self.disabled && !pi.disabled;
				if (enabled){
					self._startFunction(pi, arguments);
				}
				var rv = funcRef.apply(this, arguments);
				if (enabled){
					self._stopFunction(pi, arguments, rv);
				}
				return rv;
			};

		// The goal here is to make the instrumented function
		// look just like the original function, including any
		// properties that may be hanging off of it. This allows
		// us to instrument constructors as well as functions
		// that are used as namespaces for other functionality.

		for (var prop in funcRef){
			if (!funcPropExceptions[prop]){
				pf[prop] = funcRef[prop];
			}
		}

		pf.prototype = funcRef.prototype;
		pi.oFunc = funcRef;
		pi.pFunc = pf;

		this.profileItemDict[pi.id] = pi;

		return pf;
	},

	instrumentObjectFunction: function(obj, funcName, funcLabel)
	{
		var pf = null;
		obj = obj || window;
		if (obj && funcName){
			funcLabel = funcLabel || funcName;
			var funcRef = obj[funcName];
			if (typeof funcRef === "function"){
				pf = this.instrumentFunction(funcRef, funcLabel);
				obj[funcName] = pf;
			}
		}
		return pf;
	},

	instrumentObjectFunctions: function(obj, objLabel)
	{
		var isFunc = typeof obj === "function";
		for (var prop in obj){
			if (!isFunc || !funcPropExceptions[prop]){
				this.instrumentObjectFunction(obj, prop, objLabel + prop);
			}
		}
	},

	startProfile: function(label)
	{
		// XXX: Add observer hook.
		var pi = this._getSectionProfileItem(label, true);
		if (pi){
			this._startCall(pi);
		}
	},

	stopProfile: function(label)
	{
		// XXX: Add observer hook.
		var pi = this._getSectionProfileItem(label);
		if (pi){
			this._stopCall(pi);
		}
	},

	enable: function(id)
	{
		if (id){
			var ci = this.profileItemDict[id];
			if (ci){
				ci.disable = false;
			}
		}
		else {
			this.disabled = false;
		}
	},

	disable: function(id)
	{
		if (id){
			var ci = this.profileItemDict[id];
			if (ci){
				ci.disabled = true;
			}
		}
		else {
			this.disabled = true;
		}
	},

	reset: function()
	{
		var dict = this.profileItemDict;
		for (var k in dict){
			dict[k].clear();
		}
		this.callBranches.length = 0;
		this.callStack.length = 0;
	},

	_getSectionProfileItem: function(label, canCreate)
	{
		var id = this.sectionMap[label],
			pi = id ? this.profileItemDict[id] : null;
		if (!pi && canCreate){
			pi = new ProfileItem(label);
			this.profileItemDict[pi.id] = pi;
			this.sectionMap[label] = pi.id;
		}
		return pi;
	},

	_startCall: function(pi)
	{
		var cs = this.callStack,
			top = cs.length ? cs[cs.length - 1] : null,
			ci = pi.start();

		if (top){
			top.addChild(ci);
		}
		else {
			this.callBranches.push(ci);
		}
		
		cs.push(ci);
	},

	_stopCall: function(pi)
	{
		pi.stop();
		this.callStack.pop();
	},

	_startFunction: function(pi, args)
	{
		// XXX: Add observer hook.
		this._startCall(pi);
	},

	_stopFunction: function(pi, args, rv)
	{
		// XXX: Add observer hook.
		this._stopCall(pi);
	}
};

window.$createProfiler = function()
{
	return new Profiler();
}

})();
