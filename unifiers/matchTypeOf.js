/* UMD.define */ (typeof define=="function"&&define||function(d,f,m){m={module:module,require:require};module.exports=f.apply(null,d.map(function(n){return m[n]||require(n)}))})
(["../unify"], function(unify){
	"use strict";

	function MatchTypeOf(types){
		this.types = types instanceof Array ? types : [types];
	}

	MatchTypeOf.prototype = Object.create(unify.Unifier.prototype);

	MatchTypeOf.prototype.unify = function(val, ls, rs){
		return !unify.isVariable(val) && this.types.indexOf(typeof val) >= 0;
	};

	return function matchTypeOf(types){
		return new MatchTypeOf(types);
	};
});
