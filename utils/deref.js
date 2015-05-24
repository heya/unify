/* UMD.define */ (typeof define=="function"&&define||function(d,f,m){m={module:module,require:require};module.exports=f.apply(null,d.map(function(n){return m[n]||require(n)}))})
(["module", "heya-ice/assert", "../main", "./walk"], function(module, ice, unify, walk){
	"use strict";

	ice = ice.specialize(module);

	var empty = {};

	function postArray(context){
		var stackOut = context.stackOut, s = this.s, l = s.length,
			i = 0, j = stackOut.length - 1, t;
		for(; i < l; ++i){
			if(s.hasOwnProperty(i)){
				s[i] = stackOut[j--];
			}
		}
		l = stackOut.length - 1 - j;
		if(l){
			stackOut.splice(-l, l, s);
		}else{
			stackOut.push(s);
		}
	}

	function postObject(context){
		var stackOut = context.stackOut, s = this.s, k, j = stackOut.length - 1, t;
		for(k in s){
			if(s.hasOwnProperty(k)){
				s[k] = stackOut[j--];
			}
		}
		var l = stackOut.length - 1 - j;
		if(l){
			stackOut.splice(-l, l, s);
		}else{
			stackOut.push(s);
		}
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
			unify.Variable,
			function processVariable(val, context){
				var env = context.env;
				if(val.bound(env)){
					context.stack.push(val.get(env));
				}else{
					context.stackOut.push(val);
				}
			},
			unify.Unifier, processOther,
			Date,          processOther,
			RegExp,        processOther
		],
		filters = [];

	function deref(source, env, opt){
		opt = opt || empty;

		var context = opt.context || {}, stackOut = [];
		context.stackOut = stackOut;
		context.env = env;

		walk(source, {
			processObject: opt.processObject || processObject,
			processOther:  opt.processOther  || processOther,
			registry:      opt.registry || deref.registry,
			filters:       opt.filters  || deref.filters,
			context:       context
		});

		ice.assert(stackOut.length == 1);
		return stackOut[0];
	}
	deref.registry = registry;
	deref.filters  = filters;

	return deref;
});
