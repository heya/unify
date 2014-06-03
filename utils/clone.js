/* UMD.define */ (typeof define=="function"&&define||function(d,f,m){m={module:module,require:require};module.exports=f.apply(null,d.map(function(n){return m[n]||require(n)}))})
(["module", "heya-ice/assert", "../main", "./walk"], function(module, ice, unify, walk){
	"use strict";

	ice = ice.specialize(module);

	var empty = {};

	function postArray(context){
		var stackOut = context.stackOut, t = [];
		for(var i = 0, s = this.s, l = s.length; i < l; ++i){
			if(s.hasOwnProperty(i)){
				t[i] = stackOut.pop();
			}
		}
		stackOut.push(t);
	}

	function postObject(context){
		var stackOut = context.stackOut, t = {}, s = this.s;
		for(var k in s){
			if(s.hasOwnProperty(k)){
				t[k] = stackOut.pop();
			}
		}
		stackOut.push(t);
	}

	function processObject(val, context){
		if(val === unify._){
			context.stackOut.push(s);
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
			Date,
			function processDate(val, context){
				context.stackOut.push(new Date(val.getTime()));
			},
			RegExp,
			function processRegExp(val, context){
				context.stackOut.push(new RegExp(val.source,
						(val.global ? "g" : "") +
						(val.multiline ? "m" : "") +
						(val.ignoreCase ? "i" : "")
					));
			}
		],
		filters = [];

	function processOther(val, context){
		context.stackOut.push(val);
	}

	function clone(source, env, opt){
		var stackOut = [];

		opt = opt || empty;

		var context = opt.context || {}, stackOut = [];
		context.stackOut = stackOut;
		context.env = env;

		walk(source, {
			processObject: opt.processObject || processObject,
			processOther:  opt.processOther  || processOther,
			registry:      opt.registry || clone.registry,
			filters:       opt.filters  || clone.filters,
			context:       context
		});

		ice.assert(stackOut.length == 1);
		return stackOut[0];
	}
	clone.registry = registry;
	clone.filters  = filters;

	return clone;
});
