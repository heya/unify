/* UMD.define */ (typeof define=="function"&&define||function(d,f,m){m={module:module,require:require};module.exports=f.apply(null,d.map(function(n){return m[n]||require(n)}))})
(["module", "heya-ice/assert", "../unify", "./walk"], function(module, ice, unify, walk){
	"use strict";

	ice = ice.specialize(module);

	return function preprocess(source, nonExactObjects, nonExactArrays){

		var wrapObject = nonExactObjects && unify.open,
			wrapArray  = nonExactArrays  && unify.open,
			stackOut = [];

		function postArray(){
			var t = [];
			for(var i = 0, s = this.s, l = s.length; i < l; ++i){
				if(s.hasOwnProperty(i)){
					t[i] = stackOut.pop();
				}
			}
			stackOut.push(wrapArray ? wrapArray(t) : t);
		}

		function postObject(){
			var t = {}, s = this.s;
			for(var k in s){
				if(s.hasOwnProperty(k)){
					t[k] = stackOut.pop();
				}
			}
			stackOut.push(wrapObject ? wrapObject(t) : t);
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
				unify.Variable, processOther,
				Date,           processOther,
				RegExp,         processOther
			];

		walk(source, {
			processObject: processObject,
			processOther:  processOther,
			registry:      registry
		});

		ice.assert(stackOut.length == 1);
		return stackOut[0];
	};
});
