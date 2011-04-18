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

var nextProfilerFuncId = 1,
	funcPropExceptions = {
		// Native Props
		arguments:    true,
		arity:        true,
		caller:       true,
		constructor:  true,
		length:       true,
		name:         true,
		apply:        true,
		bind:         true,
		call:         true,
		// ProfilerProps
		_funcRef:     true,
		_profileData: true,
		_funcId:      true
	};

function ProfileTimer()
{
	this.startTime = 0;
	this.stopTime = 0;
	this.duration;
}

// ProfileTimer object stores the data
// for a unique call to a profiled function/method.

ProfileTimer.prototype = {
	constructor: ProfileTimer,
	start: function()
	{
		this.startTime = this.stopTime = this.currentTime();
		this.duration = 0;
	},

	stop: function()
	{
		this.stopTime = this.currentTime();
		this.duration = this.stopTime - this.startTime;
	},

	currentTime: function()
	{
		return (new Date()).getTime();
	}
};

// ProfileData stores all of the call data for
// a specific function/method.

function ProfileData(label)
{
	this.stack = [];
	this.calls = [];
	this.callCount = 0;
	this.totalTime = 0;
	this.disabled = false;
	this.label = label || "anonymous";
}

ProfileData.prototype = {
	constructor: ProfileData,

	start: function()
	{
		if (this.isEnabled()){
			var t = new ProfileTimer();
			++this.callCount;
			this.stack.push(t);
			this.calls.push(t);
			t.start();
		}
	},

	stop: function()
	{
		if (this.isEnabled()){
			var t = this.stack.pop();
			if (t){
				t.stop();
				this.totalTime += t.duration;
			}
		}
	},

	enable: function(){ this.disabled = false; },
	disable: function(){ this.disabled = true; },
	isEnabled: function() { return !this.disabled; },
	clear: function() {
		this.stack.length = 0;
		this.calls.length = 0;
		this.callCount = 0;
		this.totalTime = 0;
	},

	currentTime: function()
	{
		return (new Date()).getTime();
	}
};

// Profiler stores the profile data for all functions/methods
// it manages.

function Profiler()
{
	this.funcDict = {};
	this.callBranches = [];
	this.callStack = [];
	this.disabled = false;
}

Profiler.prototype = {
	constructor: Profiler,

	wrapFunction: function(funcRef, label)
	{
		var self = this,
			pd = new ProfileData(label),
			pf = function(){
				var args = arguments;
					enabled = !self.disabled;
				if (enabled){
					pd.start();
					self.handleStart(pf, pd, args);
				}
				var rv = funcRef.apply(this, args);
				if (enabled){
					pd.stop();
					self.handleStop(pf, pd, args, rv);
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
		pf._funcRef = funcRef;
		pf._profileData = pd;
		pf._funcId = nextProfilerFuncId++;

		this.funcDict[pf._funcId] = pf;

		return pf;
	},

	wrapObjectMethod: function(obj, funcName, funcLabel)
	{
		var pf = null;
		obj = obj || window;
		if (obj && funcName){
			funcLabel = funcLabel || funcName;
			var funcRef = obj[funcName];
			if (typeof funcRef === "function"){
				pf = this.wrapFunction(funcRef, funcLabel);
				obj[funcName] = pf;
			}
		}
		return pf;
	},

	wrapObjectMethods: function(obj, objLabel)
	{
		var isFunc = typeof obj === "function";
		for (var k in obj){
			if (!isFunc || !funcPropExceptions[k]){
				this.wrapObjectMethod(obj, k, objLabel + k);
			}
		}
	},

	enable: function(funcId)
	{
		if (funcId){
			var func = this.funcDict[funcId];
			if (func){
				func._profileData.enable();
			}
		}
		else {
			this.disabled = false;
		}
	},

	disable: function(funcId)
	{
		if (funcId){
			var func = this.funcDict[funcId];
			if (func){
				func._profileData.disable();
			}
		}
		else {
			this.disabled = true;
		}
	},

	reset: function()
	{
		var fd = this.funcDict;
		for (var k in fd){
			fd[k]._profileData.clear();
		}
		this.callBranches.length = 0;
		this.callStack.length = 0;
	},

	handleStart: function(pf, pd, args)
	{
		var cs = this.callStack,
			top = cs.length ? cs[cs.length - 1] : null,
			callData = {
				pf: pf,
				pd: pd,
				call: pd.calls[pd.calls.length - 1],
				children: null
			};

		if (top){
			if (!top.children){
				top.children = [];
			}
			top.children.push(callData);
		}
		else {
			this.callBranches.push(callData);
		}
		
		cs.push(callData);
	},

	handleStop: function(pf, pd, args, rv)
	{
		this.callStack.pop();
	}
};

window.$createProfiler = function()
{
	return new Profiler();
}

})();
