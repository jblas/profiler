function buildFunctionList(dict)
{
	var arr = [];
	if (dict){
		for (var k in dict){
			var d = dict[k];
			arr.push(d);
			d.id = k;
			d.average = Math.ceil((d.total || 0) / (d.count || 1));
		}
	}
	return arr;
}

function augmentFunctionData(functionDict, callArray, callDict)
{
	var count = callArray.length,
		countDict = {};
	for (var i = 0; i < count; i++){
		var c = callArray[i],
			id = c.id,
			f = functionDict[id],
			children = c.children;

		// Assign a unique id to each call so we can reference
		// them immediately.

		c.callId = countDict[id] = (countDict[id] || 0) + 1;

		// Add the call to the profiled function's list
		// of calls.

		if (!f.calls){
			f.calls = [];
		}
		f.calls.push(c);

		// Add the call to our global call dictionary.

		callDict[c.callId] = c;

		if (children && children.length){
			augmentFunctionData(functionDict, children, callDict);
		}
	}
}

function augmentProfilerData(pdata)
{
	// We need an array of the profiled functions so we can
	// use them with data sets.

	pdata.functionList = buildFunctionList(pdata.functions);

	// Crawl the call graphs to build a call dictionary and associate
	// each call with its corresponding function.

	pdata.callDict = {};
	augmentFunctionData(pdata.functions, pdata.callgraphs, pdata.callDict);
}

// Preprocess the JSON data.

augmentProfilerData(gJSONData);

var dsFuncs = new Spry.Data.DataSet();
dsFuncs.setDataFromArray(gJSONData.functionList);

var pvFuncs = new Spry.Data.PagedView(dsFuncs, { pageSize: 20 });

pvFuncs.setColumnType(["id", "min", "max", "average", "total", "count"], "number");

Spry.Utils.addLoadListener(function(){
	Spry.Utils.addEventListener("first-btn", "click", function(){ pvFuncs.firstPage(); });
	Spry.Utils.addEventListener("prev-btn", "click", function(){ pvFuncs.previousPage(); });
	Spry.Utils.addEventListener("next-btn", "click", function(){ pvFuncs.nextPage(); });
	Spry.Utils.addEventListener("last-btn", "click", function(){ pvFuncs.lastPage(); });
});