(function(_,f,g){g=window.heya.unify;g=g.unifiers||(g.unifiers={});g.matchTypeOf=f(window.heya.unify);})
(["../main"], function(unify){
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
