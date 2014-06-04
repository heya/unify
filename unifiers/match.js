/* UMD.define */ (typeof define=="function"&&define||function(d,f,m){m={module:module,require:require};module.exports=f.apply(null,d.map(function(n){return m[n]||require(n)}))})
(["../main"], function(unify){
	"use strict";

	function Match(f){
		this.f = f;
	}

	Match.prototype = Object.create(unify.Unifier.prototype);

	Match.prototype.unify = function(val, ls, rs){
		return this.f(val, ls, rs);
	};

	return function match(f){
		return new Match(f);
	};
});
