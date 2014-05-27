/* UMD.define */ (typeof define=="function"&&define||function(d,f,m){m={module:module,require:require};module.exports=f.apply(null,d.map(function(n){return m[n]||require(n)}))})
([], function(){
	"use strict";
	return function replace(tmpl, env){
		return tmpl.replace(/\$+\{([^\}\s\r\n]+)\}/g, function(match, name){
			if(match.length - name.length > 3){
				return match.substring(1);
			}
			return env.values[name];
		});
	};
});
