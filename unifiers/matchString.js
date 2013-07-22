/* UMD.define */ (typeof define=="function"&&define||function(d,f,m){m={module:module,require:require};module.exports=f.apply(null,d.map(function(n){return m[n]||require(n)}))})
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
