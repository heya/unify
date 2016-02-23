(function(_,f,g){g=window;g=g.heya||(g.heya={});g=g.unify||(g.unify={});g=g.utils||(g.utils={});g.replace=f();})
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
