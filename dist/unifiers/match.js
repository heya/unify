(function(_,f,g){g=window.heya.unify;g=g.unifiers||(g.unifiers={});g.match=f(window.heya.unify);})
(["../main"], function(unify){
	"use strict";

	function Match(f){
		this.f = f;
	}

	Match.prototype = Object.create(unify.Unifier.prototype);

	Match.prototype.unify = function(val, ls, rs, env){
		return this.f(val, ls, rs, env);
	};

	return function match(f){
		return new Match(f);
	};
});
