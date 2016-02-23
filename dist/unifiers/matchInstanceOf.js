(function(_,f,g){g=window.heya.unify;g=g.unifiers||(g.unifiers={});g.matchInstanceOf=f(window.heya.unify);})
(["../main"], function(unify){
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
