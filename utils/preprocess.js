/* UMD.define */ (typeof define=="function"&&define||function(d,f,m){m={module:module,require:require};module.exports=f.apply(null,d.map(function(n){return m[n]||require(n)}))})
(["module", "heya-ice/assert", "../main", "./walk"], function(module, ice, unify, walk){
	"use strict";

	ice = ice.specialize(module);

	var empty = {};

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
			unify.Unifier,  processOther,
			Date,           processOther,
			RegExp,         processOther
		],
		filters = [];

	function preprocess(source, nonExactObjects, nonExactArrays, opt){
		opt = opt || empty;

		var context = opt.context || {}, stackOut = [];
		context.stackOut = stackOut;
		context.wrapObject = nonExactObjects && unify.open;
		context.wrapArray  = nonExactArrays  && unify.open;

		walk(source, {
			processObject: opt.processObject || processObject,
			processOther:  opt.processOther  || processOther,
			registry:      opt.registry || preprocess.registry,
			filters:       opt.filters  || preprocess.filters,
			context:       context
		});

		ice.assert(stackOut.length == 1);
		return stackOut[0];
	}
	preprocess.registry = registry;
	preprocess.filters  = filters;

	return preprocess;
});
