(function(_,f,g){g=window.heya.unify;g=g.unifiers||(g.unifiers={});g.matchString=f(window.heya.unify);})
(["../main"], function(unify){
	"use strict";

	function MatchString(regexp, matches, props){
		this.regexp  = regexp;
		this.matches = matches;
		this.props   = props;
	}

	MatchString.prototype = Object.create(unify.Unifier.prototype);

	MatchString.prototype.unify = function(val, ls, rs){
		if(unify.isVariable(val)){
			// cannot match with an unbound variable
			return false;
		}
		var result = this.regexp.exec("" + val);
		if(result){
			if(this.matches){
				ls.push(this.matches);
				rs.push(Array.prototype.slice.call(result, 0));
			}
			if(this.props){
				ls.push(this.props);
				rs.push({index: result.index, input: result.input});
			}
		}
		return result;
	};

	return function matchString(regexp, matches, props){
		return new MatchString(regexp, matches, props);
	};
});
