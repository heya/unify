/* UMD.define */ (typeof define=="function"&&define||function(d,f,m){m={module:module,require:require};module.exports=f.apply(null,d.map(function(n){return m[n]||require(n)}))})
([], function(){
	"use strict";

	var empty = {};

	function nop(){}
	function Command(f, s){ this.f = f; this.s = s; }

	function processObject(x, stack){
		for(var k in x){
			if(x.hasOwnProperty(k)){
				stack.push(x[k]);
			}
		}
	}

	function processArray(x, stack){
		for(var i = 0, l = x.length; i < l; ++i){
			if(x.hasOwnProperty(i)){
				stack.push(x[i]);
			}
		}
	}

	var defaultRegistry = [
				Array,  processArray,
				Date,   nop,
				RegExp, nop
			];

	function walk(o, opt){
		// non-recursive stack-based walk about an object tree
		opt = opt || empty;
		var doObject = opt.processObject || processObject,
			doOther  = opt.processOther  || nop,
			registry = opt.registry      || defaultRegistry,
			stack    = [o];
		main: while(stack.length){
			o = stack.pop();
			if(o && typeof o == "object"){
				// process commands
				if(o instanceof Command){
					o.f(stack);
					continue;
				}
				// process registered constructors
				for(var i = 0; i < registry.length; i += 2){
					if(o instanceof registry[i]){
						registry[i + 1](o, stack);
						continue main;
					}
				}
				// process naked objects
				doObject(o, stack);
				continue;
			}
			doOther(o, stack);
		}
	}

	walk.Command = Command;

	return walk;
});
