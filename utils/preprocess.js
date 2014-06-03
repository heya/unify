/* UMD.define */ (typeof define=="function"&&define||function(d,f,m){m={module:module,require:require};module.exports=f.apply(null,d.map(function(n){return m[n]||require(n)}))})
(["module", "heya-ice/assert", "../main", "./walk"], function(module, ice, unify, walk){
	"use strict";

	ice = ice.specialize(module);

	function postArray(context){
		var stackOut = context.stackOut, wrapArray = context.wrapArray, t = [];
		for(var i = 0, s = this.s, l = s.length; i < l; ++i){
			if(s.hasOwnProperty(i)){
				t[i] = stackOut.pop();
			}
		}
		stackOut.push(wrapArray ? wrapArray(t) : t);
	}

	function postObject(context){
		var stackOut = context.stackOut, wrapObject = context.wrapObject, t = {}, s = this.s;
		for(var k in s){
			if(s.hasOwnProperty(k)){
				t[k] = stackOut.pop();
			}
		}
		stackOut.push(wrapObject ? wrapObject(t) : t);
	}

	function processObject(val, context){
		if(val === unify._){
			context.stackOut.push(val);
		}else{
			var stack = context.stack;
			stack.push(new (walk.Command)(postObject, val));
			for(var k in val){
				if(val.hasOwnProperty(k)){
					stack.push(val[k]);
				}
			}
		}
	}

	function processOther(val, context){
		context.stackOut.push(val);
	}

	var registry = [
			walk.Command,
			function processCommand(val, context){
				val.f(context);
			},
			Array,
			function processArray(val, context){
				var stack = context.stack;
				stack.push(new (walk.Command)(postArray, val));
				for(var i = 0, l = val.length; i < l; ++i){
					if(val.hasOwnProperty(i)){
						stack.push(val[i]);
					}
				}
			},
			unify.Variable, processOther,
			Date,           processOther,
			RegExp,         processOther
		];

	function preprocess(source, nonExactObjects, nonExactArrays){
		var stackOut = [];

		walk(source, {
			processObject: processObject,
			processOther:  processOther,
			registry:      registry,
			context: {
				wrapObject: nonExactObjects && unify.open,
				wrapArray:  nonExactArrays  && unify.open,
				stackOut:   stackOut
			}
		});

		ice.assert(stackOut.length == 1);
		return stackOut[0];
	}

	return preprocess;
});
