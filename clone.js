/* UMD.define */ (typeof define=="function"&&define||function(d,f,m){m={module:module,require:require};module.exports=f.apply(null,d.map(function(n){return m[n]||require(n)}))})
(["./main", "./walk"], function(unify, walk){
	"use strict";

	var empty = {};

	return function clone(source, env, opt){

		var stackOut = [];

		function postArray(){
			var t = [];
			for(var i = 0, s = this.s, l = s.length; i < l; ++i){
				if(s.hasOwnProperty(i)){
					t[i] = stackOut.pop();
				}
			}
			stackOut.push(t);
		}

		function postObject(){
			var t = {}, s = this.s;
			for(var k in s){
				if(s.hasOwnProperty(k)){
					t[k] = stackOut.pop();
				}
			}
			stackOut.push(t);
		}

		function processObject(s, stack){
			stack.push(new (walk.Command)(postObject, s));
			for(var k in s){
				if(s.hasOwnProperty(k)){
					stack.push(s[k]);
				}
			}
		}

		function processOther(s){
			stackOut.push(s);
		}

		var registry = [
				Array,
				function processArray(s, stack){
					stack.push(new (walk.Command)(postArray, s));
					for(var i = 0, l = s.length; i < l; ++i){
						if(s.hasOwnProperty(i)){
							stack.push(s[i]);
						}
					}
				},
				unify.Variable,
				function processVariable(s, stack){
					if(s.bound(env)){
						stack.push(s.get(env));
					}else{
						stackOut.push(s);
					}
				},
				Date,
				function processDate(s){
					stackOut.push(new Date(s.getTime()));
				},
				RegExp,
				function processRegExp(s){
					stackOut.push(new RegExp(s.source,
							(s.global ? "g" : "") +
							(s.multiline ? "m" : "") +
							(s.ignoreCase ? "i" : "")
						));
				}
			];

		opt = opt || empty;

		walk(source, {
			processObject: opt.processObject || processObject,
			processOther:  opt.processOther  || processOther,
			registry:      opt.registry ? opt.registry.concat(registry) : registry
		});

		return stackOut[0];
	};
});
