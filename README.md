# profiler.js

A utility class for instrumenting functions and collecting statistics such as the number of calls, the min/max duration, and the duration of each call. The class also tracks nested calls of instrumented functions, so if you instrument enough of your code, it can also be used as a tracer.

While not as accurate as some of the profilers built into desktop browsers, it is meant to be used as a tool for gathering information on mobile platforms, where performance/analysis tools are lacking.

## Usage

### Creating a Profiler Object

To start profiling, you need to first create a profiler object.

    var profiler = $createProfiler();

You can create any number of profiler classes, for example, you may want to track statistics for a specific component in your code separately, but in most cases, you'll probably only need one.

### Instrumenting a Function

The instrumentFunction() method on the profiler object takes 2 arguments:

    profiler.instrumentFunction(funcRef, label)

The first argument is a reference to the function you want to instrument, the 2nd argument is the label to be used to identify that function. If you don't provide a label, the profiler will give it a label of "anonymous". The instrumentFunction() returns a new function reference that is a function that generates the statistical information during the profile and actually makes the call to the original function. It does not actually override original function, you have to do it manually.

As an example, suppose you want to instrument a global function called myDoSomethingFunction() so that every time it gets called, it gets profiled. You would instrument it like this:

<pre>
	function myDoSomethingFunction()
	{
		...
	}

	...

	window.myDoSomethingFunction = profiler.instrumentFunction(myDoSomethingFunction, "myDoSomethingFunction");
</pre>

### Instrumenting Object Functions

If you want to instrument all of the function properties within a given object, you would use the instrumentObjectFunctions() method:

    profiler.instrumentObjectFunctions(object, label)

The first argument is a reference to an object that contains functions you want to instrument. The 2nd argument is a label you want to use as a prefix for the label of each function.

<pre>

	var obj = {
		type: "foo",
		func1: function(){ alert("func1"); },
		func2: function(){ alert("func2"); },
	};

	...
	
	profiler.instrumentObjectFunctions(obj, "obj.");

</pre>

In the example above the profiler will instrument and then set both func1 and func2 properties of obj. Under the hood, instrumentObjectFunctions() finds all properties within obj that are functions, it then instruments each function and then sets that property so that it points to the instrumented version of the function. The labels for each function will be the concatenation of the label passed into instrumentObjectFunctions()  with the name of the property.

If you use jQuery Mobile, you can get some useful/interesting metrics and traces like this:

	profiler.instrumentObjectFunctions($.find, "$.find.");
	profiler.instrumentObjectFunctions($, "$.");
	profiler.instrumentObjectFunctions($.fn, "$.fn.");
	profiler.instrumentObjectFunctions($.mobile, "$.mobile.");

### Instrumenting Selected Object Functions

If you want to instrument a specific function within an object, you can call instrumentObjectFunction(): 

    profiler.instrumentObjectFunction(object, funcName, label)

The first argument is an object that contains the function you want to instrument. The 2nd argument is the name of the property, within that obj, that contains the function reference you want to instrument. The 3rd argument is the label to be used to identify this function while profiling.


<pre>

	var obj = {
		type: "foo",
		func1: function(){ alert("func1"); },
		func2: function(){ alert("func2"); },
	};

	...
	
	profiler.instrumentObjectFunction(obj, "func2", obj.func2");

</pre>

In the above example, only func2 will be profiled. func1 is untouched.

### Profiling a Section of Code

There may be times when you want to profile specific sections of code, not an entire function. To do this, you simply bracket the code you want to profile with startProfile() and stopProfile() method calls.

<pre>
    profiler.startProfile(label)
	profiler.stopProfile(label)
</pre>

So for example if you wanted to profile a couple of sections of a function, you could do something like this:

<pre>
	function myDoSomethingFunction()
	{
		...

		profiler.startProfiler("for-loop");

		for (var i = 0; i < len; i+++)
		{
		}

		profiler.stopProfiler("for-loop");

		...

		profiler.startProfiler("something-else-section");

		doSomethingElse1();
		doSomethingElse2();

		profiler.stopProfiler("something-else-section");
	}
</pre>

### Enabling/Disabling Profiling

Profiling can generate a lot of data and affect the performance of your code. You may want to enable and disable it in specific areas of your code so that you are only gathering metrics in a specific case. By default the profiler is enabled and gathers metrics anytime one of the functions it instrumented is called. You can turn the profiler on and off with the enable() and disable() methods.

<pre>
	function myDoSomethingFunction()
	{
		...
	}

    var profiler = $createProfiler();
	profiler.disable();
	window.myDoSomethingFunction = profiler.instrumentFunction(myDoSomethingFunction, "myDoSomethingFunction");

	...

	function foo()
	{
		profiler.enable();
		...
		profiler.disable();
	}
</pre>

In the example above, metrics for the myDoSomethingFunction() will only be generated if something calls foo() and the code within foo() triggers a call to myDoSomethingFunction().

### Enabling/Disabling a Profiled Function

## Issues