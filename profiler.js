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

(function(window){

var JSP = window.JSP = {
	nextProfiledItemId: 1,
	nextCallInstanceId: 1,
	funcPropExceptions: {
		"arguments":    true,
		"arity":        true,
		"caller":       true,
		"constructor":  true,
		"length":       true,
		"name":         true,
		"apply":        true,
		"bind":         true,
		"call":         true
	}
};

// CallInstance object stores the data
// for a unique call to a profiled function/method.

JSP.CallInstance = function(profiledItem)
{
	this.id =            JSP.nextCallInstanceId++;
	this.startTime =     0;
	this.stopTime =      0;
	this.duration =      0;
	this.profiledItem =  profiledItem;
	this.callNumber =    0;
	this.parent =        null;
	this.children =      null;
};

JSP.CallInstance.prototype = {
	constructor: JSP.CallInstance,
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

// JSP.ProfiledItem stores all of the call data for
// a specific function/method.

JSP.ProfiledItem = function(label)
{
	this.stack = [];
	this.calls = [];
	this.count = this.total = this.avg = this.max = 0;
	this.min = 100000;
	this.disabled = false;
	this.label = label || "anonymous";
	this.id = JSP.nextProfiledItemId++;
};

JSP.ProfiledItem.prototype = {
	constructor: JSP.ProfiledItem,

	start: function()
	{
		var ci = new JSP.CallInstance(this);
		this.stack.push(ci);
		this.calls.push(ci);
		++this.count;

		ci.startTimer();

		return ci;
	},

	stop: function()
	{
		var ci = this.stack.pop(),
			duration;

		ci.stopTimer();

		duration = ci.duration;
		this.total += duration;
		this.min = Math.min(this.min, duration);
		this.max = Math.max(this.max, duration);

		// This may not be accurate until the
		// callstack completely unwinds.
		this.avg = this.total / this.count;

		return ci;
	},

	clear: function() {
		this.stack.length = 0;
		this.calls.length = 0;
		this.count = this.total = this.avg = this.min = this.max = 0;
	}
};

// JSP.Profiler stores the profile data for all functions/methods
// it manages.

JSP.Profiler = function()
{
	this.sectionMap = {};
	this.profiledItemDict = {};
	this.callGraphs = [];
	this.callStack = [];
	this.disabled = false;
};

JSP.Profiler.prototype = {
	constructor: JSP.Profiler,

	instrumentFunction: function(funcRef, label)
	{
		var self = this,
			pi = new JSP.ProfiledItem(label),
			pf = function(){
				var enabled = !self.disabled && !pi.disabled,
					rv;
				if (enabled){
					self._startFunction(pi, arguments);
				}
				rv = funcRef.apply(this, arguments);
				if (enabled){
					self._stopFunction(pi, arguments, rv);
				}
				return rv;
			},
			prop;

		// The goal here is to make the instrumented function
		// look just like the original function, including any
		// properties that may be hanging off of it. This allows
		// us to instrument constructors as well as functions
		// that are used as namespaces for other functionality.

		for (prop in funcRef){
			if (!JSP.funcPropExceptions[prop]){
				pf[prop] = funcRef[prop];
			}
		}

		pf.prototype = funcRef.prototype;
		pi.oFunc = funcRef;
		pi.pFunc = pf;

		this.profiledItemDict[pi.id] = pi;

		return pf;
	},

	instrumentObjectFunction: function(obj, funcName, funcLabel)
	{
		var pf = null,
			funcRef;
		obj = obj || window;
		if (obj && funcName){
			funcLabel = funcLabel || funcName;
			funcRef = obj[funcName];
			if (typeof funcRef === "function"){
				pf = this.instrumentFunction(funcRef, funcLabel);
				obj[funcName] = pf;
			}
		}
		return pf;
	},

	instrumentObjectFunctions: function(obj, objLabel)
	{
		var isFunc = typeof obj === "function",
			prop;

		for (prop in obj){
			if (!isFunc || !JSP.funcPropExceptions[prop]){
				this.instrumentObjectFunction(obj, prop, objLabel + prop);
			}
		}
	},

	startProfile: function(label)
	{
		if ( !this.disabled ){
			// XXX: Add observer hook.
			var pi = this._getSectionProfiledItem(label, true);
			if (pi && !pi.disabled){
				this._startCall(pi);
			}
		}
	},

	stopProfile: function(label)
	{
		if (!this.disabled){
			// XXX: Add observer hook.
			var pi = this._getSectionProfiledItem(label);
			if (pi && !pi.disabled){
				this._stopCall(pi);
			}
		}
	},

	enable: function(id)
	{
		if (id){
			var ci = this.profiledItemDict[id];
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
			var ci = this.profiledItemDict[id];
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
		var dict = this.profiledItemDict,
			k;
		for (k in dict){
			dict[k].clear();
		}
		this.callGraphs.length = 0;
		this.callStack.length = 0;
	},

	_getSectionProfiledItem: function(label, canCreate)
	{
		var id = this.sectionMap[label],
			pi = id ? this.profiledItemDict[id] : null;
		if (!pi && canCreate){
			pi = new JSP.ProfiledItem(label);
			this.profiledItemDict[pi.id] = pi;
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
			this.callGraphs.push(ci);
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
	return new JSP.Profiler();
};

})(window);
