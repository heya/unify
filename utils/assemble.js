/* UMD.define */ (typeof define=="function"&&define||function(d,f,m){m={module:module,require:require};module.exports=f.apply(null,d.map(function(n){return m[n]||require(n)}))})
(["module", "heya-ice/assert", "../main", "./walk"], function(module, ice, unify, walk){
	"use strict";

	ice = ice.specialize(module);

	var empty = {};

	return function assemble(source, env, opt){

		var stackOut = [];

		function postArray(){
			var s = this.s, l = s.length, i = 0, j = stackOut.length - 1, t;
			main: {
				for(; i < l; ++i){
					if(s.hasOwnProperty(i)){
						t = stackOut[j--];
						if(typeof t == "number" && isNaN(t) ? typeof s[i] == "number" && !isNaN(s[i]) : s[i] !== t){
							break main;
						}
					}
				}
				l = stackOut.length - 1 - j;
				if(l){
					stackOut.splice(-l, l, s);
				}else{
					stackOut.push(s);
				}
				return;
			}
			t = [];
			for(i = 0; i < l; ++i){
				if(s.hasOwnProperty(i)){
					t[i] = stackOut.pop();
				}
			}
			stackOut.push(t);
		}

		function postObject(){
			var s = this.s, k, j = stackOut.length - 1, t;
			main: {
				for(k in s){
					if(s.hasOwnProperty(k)){
						t = stackOut[j--];
						if(typeof t == "number" && isNaN(t) ? typeof s[k] == "number" && !isNaN(s[k]) : s[k] !== t){
							break main;
						}
					}
				}
				var l = stackOut.length - 1 - j;
				if(l){
					stackOut.splice(-l, l, s);
				}else{
					stackOut.push(s);
				}
				return;
			}
			t = {};
			for(k in s){
				if(s.hasOwnProperty(k)){
					t[k] = stackOut.pop();
				}
			}
			stackOut.push(t);
		}

		function processObject(s, stack){
			if(s === unify._){
				stackOut.push(s);
			}else{
				stack.push(new (walk.Command)(postObject, s));
				for(var k in s){
					if(s.hasOwnProperty(k)){
						stack.push(s[k]);
					}
				}
			}
		}

		function processOther(s){
			stackOut.push(s);
		}

		var registry = [
				walk.Command,
				function processCommand(s, stack){
					s.f(stack);
				},
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
				Date,   processOther,
				RegExp, processOther
			];

		opt = opt || empty;

		walk(source, {
			processObject: opt.processObject || processObject,
			processOther:  opt.processOther  || processOther,
			registry:      opt.registry ? opt.registry.concat(registry) : registry
		});

		ice.assert(stackOut.length == 1);
		return stackOut[0];
	};
});
