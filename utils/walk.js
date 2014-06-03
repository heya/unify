/* UMD.define */ (typeof define=="function"&&define||function(d,f,m){m={module:module,require:require};module.exports=f.apply(null,d.map(function(n){return m[n]||require(n)}))})
([], function(){
	"use strict";

	var empty = {};

	function nop(){}
	function Command(f, s){ this.f = f; this.s = s; }

	function processCommand(val, context){
		val.f(context);
	}

	function processObject(val, context){
		var stack = context.stack;
		for(var k in val){
			if(val.hasOwnProperty(k)){
				stack.push(val[k]);
			}
		}
	}

	function processArray(val, context){
		var stack = context.stack;
		for(var i = 0, l = val.length; i < l; ++i){
			if(val.hasOwnProperty(i)){
				stack.push(val[i]);
			}
		}
	}

	var defaultRegistry = [
				Command, processCommand,
				Array,   processArray,
				Date,    nop,
				RegExp,  nop
			],
		defaultFilters = [];

	function walk(o, opt){
		// non-recursive stack-based walk about an object tree
		opt = opt || empty;
		var doObject = opt.processObject || processObject,
			doOther  = opt.processOther  || nop,
			registry = opt.registry      || defaultRegistry,
			filters  = opt.filters       || defaultFilters,
			context  = opt.context       || {},
			stack    = [o];
			context.stack = stack;
		main: while(stack.length){
			o = stack.pop();
			if(o && typeof o == "object"){
				// process registered constructors
				for(var i = 0; i < registry.length; i += 2){
					if(o instanceof registry[i]){
						registry[i + 1](o, context);
						continue main;
					}
				}
				// process registered filters
				for(i = 0; i < filters.length; ++i){
					if(filters[i](o, context)){
						continue main;
					}
				}
				// process naked objects
				doObject(o, context);
				continue;
			}
			doOther(o, context);
		}
	}

	walk.Command = Command;

	return walk;
});
