(function(factory){
	if(typeof define != "undefined"){ // AMD
		define([], factory);
	}else if(typeof module != "undefined"){ // node.js
		module.exports = factory();
	}else{
		unify = factory();
	}
})(function(){
	"use strict";

	// AnyVar

	var _ = {};

	// Env

	function Env(){
		this.variables = {};
		this.values = {};
	}

	Env.prototype = {
		bindVar: function(name1, name2){
			var vars = this.variables, u, t, k;
			if(vars.hasOwnProperty(name1)){
				u = vars[name1];
				if(vars.hasOwnProperty(name2)){
					t = vars[name2];
					for(k in t){
						if(t.hasOwnProperty(k)){
							vars[k] = u;
							u[k] = 1;
						}
					}
				}else{
					vars[name2] = u;
					u[name2] = 1;
				}
			}else{
				if(vars.hasOwnProperty(name2)){
					u = vars[name1] = vars[name2];
					u[name1] = 1;
				}else{
					u = vars[name1] = vars[name2] = {};
					u[name1] = u[name2] = 1;
				}
			}
		},
		bindVal: function(name, val){
			if(this.variables.hasOwnProperty(name)){
				var names = this.variables[name];
				for(var k in names){
					if(names.hasOwnProperty(k)){
						this.values[k] = val;
					}
				}
			}else{
				this.values[name] = val;
			}
		}
	};

	// Var

	var unique = 0;

	function Var(name){
		this.name = name || ("var" + unique++);
	}

	Var.prototype = {
		bound: function(env){
			return env.values.hasOwnProperty(this.name);
		},
		get: function(env){
			return env.values[this.name];
		},
		unify: function(val, env){
			if(this.bound(env)){
				return unify(this.get(env), val, env);
			}
			// the next case is taken care of in unify() directly
			// the case of unbound variable
			//if(val === _ || val === this){
			//	return env;
			//}
			if(val instanceof Var){
				if(val.bound(env)){
					env.bindVal(this.name, val.get(env));
				}else{
					env.bindVar(this.name, val.name);
				}
				return env;
			}
			env.bindVal(this.name, val);
			return env;
		}
	};

	function isVariable(x){
		return x && x instanceof Var;
	}

	function variable(name){
		return new Var(name);
	}

	// type wrapper

	function Wrap(type, o){
		this.type = type;
		this.object = o;
	}

	function isWrapped(o){
		return o && o instanceof Wrap;
	}

	function open(o){
		return new Wrap("open", o);
	}

	function isOpen(o){
		return o && o instanceof Wrap && o.type === "open";
	}

	function soft(o){
		return new Wrap("soft", o);
	}

	function isSoft(o){
		return o && o instanceof Wrap && o.type === "soft";
	}

	// unification

	function unify(l, r, env){
		env = env || new Env();
		// direct unity or anyvar
		if(l === r || l === _ || r === _){
			return env;
		}
		// unify with variables
		if(l && l instanceof Var) {
			return l.unify(r, env);
		}
		if(r && r instanceof Var) {
			return r.unify(l, env);
		}
		// check rough types
		if(typeof l != typeof r){
			return null;
		}
		// special case: NaN
		if(typeof l == "number" && isNaN(l) && isNaN(r)){
			return env;
		}
		// cut off impossible combinations
		if(typeof l != "object" && typeof l != "function" || !l || !r){
			return null;
		}
		// unify dates
		if(l instanceof Date){
			if(r instanceof Date){
				return l.getTime() == r.getTime() ? env : null;
			}
			return null;
		}
		if(r instanceof Date){
			return null;
		}
		// unify regular expressions
		if(l instanceof RegExp){
			if(r instanceof RegExp){
				return l.source == r.source && l.global == r.global &&
					l.multiline == r.multiline && l.ignoreCase == r.ignoreCase ?
						env : null;
			}
			return null;
		}
		if(r instanceof RegExp){
			return null;
		}
		// unify arrays and objects
		if(l instanceof Array){
			// unify a naked array
			if(r instanceof Array){
				// with another naked array
				return unifyArrays(l, "exact", r, "exact", env);
			}
			if(r instanceof Wrap){
				// with a wrapped array
				return r.object instanceof Array ? unifyAndFix(unifyArrays, l, "exact", r, env) : null;
			}
			return null;
		}
		// unify a wrapped object
		if(l instanceof Wrap){
			if(l.object instanceof Array){
				// unify arrays
				if(r instanceof Array){
					// with another naked array
					return unifyAndFix(unifyArrays, r, "exact", l, env);
				}
				if(r instanceof Wrap){
					if(r.object instanceof Array){
						// with another wrapped array
						return l.type < r.type ?
							unifyAndFix(unifyArrays, l.object, l.type, r, env) :
							unifyAndFix(unifyArrays, r.object, r.type, l, env);
					}
					return null;
				}
				return null;
			}
			// unify objects
			if(r instanceof Array) return null;
			if(r instanceof Wrap){
				if(r.object instanceof Array) return null;
				// with a wrapped object
				return l.type < r.type ?
					unifyAndFix(unifyObjects, l.object, l.type, r, env) :
					unifyAndFix(unifyObjects, r.object, r.type, l, env);
			}
			// with a naked object
			return unifyAndFix(unifyObjects, r, "exact", l, env);
		}
		// unify a naked object
		if(r instanceof Array) return null;
		if(r instanceof Wrap){
			if(r.object instanceof Array) return null;
			// with a wrapped object
			return unifyAndFix(unifyObjects, l, "exact", r, env);
		}
		// unify naked objects
		return unifyObjects(l, "exact", r, "exact", env);
	}

	// unification helpers

	function unifyAndFix(unify, l, lt, r, env){
		if(unify(l, lt, r.object, r.type, env)){
			// promote from soft to exact
			if(lt == "exact" && r.type == "soft"){
				r.type = "exact";
			}
			return env;
		}
		return null;
	}

	// array unification helpers

	var checkAgainst = {
		exact: {
			exact: function(a, b, env){
				if(a.length != b.length) return null;
				for(var k = a.length - 1; k >= 0; --k){
					if(!unify(a[k], b[k], env)) return null;
				}
				return env;
			},
			open: function(a, b, env){
				if(a.length < b.length) return null;
				for(var k = b.length - 1; k >= 0; --k){
					if(!unify(a[k], b[k], env)) return null;
				}
				return env;
			},
			soft: function(a, b, env){
				if(a.length < b.length) return null;
				for(var k = b.length - 1; k >= 0; --k){
					if(!unify(a[k], b[k], env)) return null;
				}
				if(a.length > b.length){
					b.push.apply(b, a.slice(b.length));
				}
				return env;
			}
		},
		open: {
			open: function(a, b, env){
				for(var k = Math.min(a.length, b.length) - 1; k >= 0; --k){
					if(!unify(a[k], b[k], env)) return null;
				}
				return env;
			},
			soft: function(a, b, env){
				for(var k = Math.min(a.length, b.length) - 1; k >= 0; --k){
					if(!unify(a[k], b[k], env)) return null;
				}
				if(a.length > b.length){
					b.push.apply(b, a.slice(b.length));
				}
				return env;
			}
		},
		soft: {
			soft: function(a, b, env){
				for(var k = Math.min(a.length, b.length) - 1; k >= 0; --k){
					if(!unify(a[k], b[k], env)) return null;
				}
				if(a.length > b.length){
					b.push.apply(b, a.slice(b.length));
				}else if(a.length < b.length){
					a.push.apply(a, b.slice(a.length));
				}
				return env;
			}
		}
	};

	function unifyArrays(l, lt, r, rt, env){
		return checkAgainst[lt][rt](l, r, env) ? env : null;
	}

	// object unification helpers

	var check1st = {
		exact: function(a, b, env){
			for(var k in a){
				if(a.hasOwnProperty(k)){
					if(b.hasOwnProperty(k)){
						if(!unify(a[k], b[k], env)) return null;
					}else{
						return null;
					}
				}
			}
			return env;
		},
		open: function(a, b, env){
			for(var k in a){
				if(a.hasOwnProperty(k) && b.hasOwnProperty(k) &&
					!unify(a[k], b[k], env)) return null;
			}
			return env;
		},
		soft: function(a, b, env){
			for(var k in a){
				if(a.hasOwnProperty(k)){
					if(b.hasOwnProperty(k)){
						if(!unify(a[k], b[k], env)) return null;
					}else{
						b[k] = a[k];
					}
				}
			}
			return env;
		}
	};

	var check2nd = {
		exact: function(a, b, env){
			for(var k in b){
				if(b.hasOwnProperty(k) && !a.hasOwnProperty(k)) return null;
			}
			return env;
		},
		open: function(a, b, env){ return env; },
		soft: function(a, b, env){
			for(var k in b){
				if(b.hasOwnProperty(k) && !a.hasOwnProperty(k)){
					a[k] = b[k];
				}
			}
			return env;
		}
	};

	function unifyObjects(l, lt, r, rt, env){
		return check1st[rt](l, r, env) && check2nd[lt](l, r, env) ? env : null;
	}

	// exports

	unify._ = unify.any = _;
	unify.Env  = Env;
	unify.open = open;
	unify.soft = soft;
	unify.variable   = variable;
	unify.isVariable = isVariable;
	unify.isWrapped  = isWrapped;
	unify.isOpen = isOpen;
	unify.isSoft = isSoft;

	return unify;
});
