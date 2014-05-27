/* UMD.define */ (typeof define=="function"&&define||function(d,f,m){m={module:module,require:require};module.exports=f.apply(null,d.map(function(n){return m[n]||require(n)}))})
(["../unify"], function(unify){
	"use strict";

	function MatchInstanceOf(types){
		this.types = types instanceof Array ? types : [types];
	}

	MatchInstanceOf.prototype = Object.create(unify.Unifier.prototype);

	MatchInstanceOf.prototype.unify = function(val, ls, rs){
		return val && !unify.isVariable(val) && this.types.some(function(type){
			return val instanceof type;
		});
	};

	return function matchInstanceOf(types){
		return new MatchInstanceOf(types);
	};
});
