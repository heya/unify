dojo.provide("shards.unify");

(function(){

	// AnyVar

	var _ = {};

	// Env

	function Env(){
		this.variables = {};
		this.values = {};
	}

	Env.prototype.bindVar = function(name1, name2){
		var vars = this.variables, u, t, k;
		if(vars.hasOwnProperty(name1)){
			if(vars.hasOwnProperty(name2)){
				u = vars[name1];
				t = vars[name2];
				for(k in t){
					if(t.hasOwnProperty(k)){
						u[k] = 1;
					}
				}
			}else{
				u = vars[name1];
				u[name2] = 1;
			}
		}else{
			if(vars.hasOwnProperty(name2)){
				u = vars[name2];
				u[name1] = 1;
			}else{
				u = {};
				u[name1] = u[name2] = 1;
			}
		}
		for(k in u){
			if(u.hasOwnProperty(k)){
				vars[k] = u;
			}
		}
	};

	Env.prototype.bindVal = function(name, val){
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
	};

	// Var

	var unique = 0;

	function Var(name){
		this.name = name || ("var" + unique++);
	}

	Var.prototype.bound = function(env){
		return env.values.hasOwnProperty(this.name);
	};

	Var.prototype.get = function(env){
		return env.values[this.name];
	};

	Var.prototype.unify = function(val, env){
		if(this.bound(env)){
			return unify(this.get(env), val, env);
		}
		// unbound variable
		if(val === _ || val === this){
			return env.values;
		}
		if(val instanceof Var){
			if(val.bound(env)){
				env.bindVal(this.name, val.get(env));
			}else{
				env.bindVar(this.name, val.name);
			}
			return env.values;
		}
		env.bindVal(this.name, val);
		return env.values;
	};

	function isVariable(x){
		return x && x instanceof Var;
	}

	function variable(name){
		return new Var(name);
	}

	// Incomplete

	function Incomplete(object, rest){
		this.object = object;
		this.rest = rest;
	}

	function isIncomplete(x){
		return x && x instanceof Incomplete;
	}

	function incomplete(object, rest){
		return new Incomplete(object, rest);
	}

	// unification

	function unify(l, r, env){
		env = env || new Env();
		// direct unity or anyvar
		if(l === r || l === _ || r === _){
			return env.values;
		}
		// unify with variables
		if(l instanceof Var) {
			return l.unify(r, env);
		}
		if(r instanceof Var) {
			return r.unify(l, env);
		}
		// check rough types
		if(typeof l != typeof r || typeof l != "object"){
			return null;
		}
		// unify arrays
		if(l instanceof Array){
			if(r instanceof Array){
				return unifyArrays(l, r, env);
			}
			return null;
		}
		if(r instanceof Array){
			return null;
		}
		// unify dates
		if(l instanceof Date){
			if(r instanceof Date){
				return l.getTime() == r.getTime ? env.values : null;
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
					l.multiline == r.multiline && l.ignoreCase == r.ignoreCase ? env.values : null;
			}
			return null;
		}
		if(r instanceof RegExp){
			return null;
		}
		// unify objects
		if(l instanceof Incomplete){
			if(r instanceof Incomplete){
				return unifyExactObjects(l.object, r.object, env);
			}
			return unifyIncompleteObjects(l, r, env);
		}
		if(r instanceof Incomplete){
			return unifyIncompleteObjects(r, l, env);
		}
		return unifyExactObjects(l, r, env);
	}

	function unifyArrays(l, r, env){
		if(l.length != r.length){
			return null;
		}
		for(var i = 0; i < l.length; ++i){
			var result = unify(l[i], r[i], env);
			if(!result){
				return null;
			}
		}
		return env.values;
	}

	function unifyIncompleteObjects(il, r, env){
		// left is incomplete
		var l = il.object;
		// unify all left properties
		for(var k in l){
			if(l.hasOwnProperty(k)){
				if(!r.hasOwnProperty(k)){
					return null;
				}
				var result = unify(l[k], r[k], env);
				if(!result){
					return null;
				}
			}
		}
		// unify the rest variable, if needed
		if(il.rest){
			// collect extra properties
			var o = {};
			for(k in r){
				if(r.hasOwnProperty(k)){
					if(!l.hasOwnProperty(k)){
						o[k] = r[k];
					}
				}
			}
			return unify(il.rest, o, env);
		}
		return env.values;
	}

	function unifyExactObjects(l, r, env){
		// unify all left properties
		for(var k in l){
			if(l.hasOwnProperty(k)){
				if(!r.hasOwnProperty(k)){
					return null;
				}
				var result = unify(l[k], r[k], env);
				if(!result){
					return null;
				}
			}
		}
		// check if any right properties are missing in the left
		for(k in r){
			if(r.hasOwnProperty(k)){
				if(!l.hasOwnProperty(k)){
					return null;
				}
			}
		}
		return env.values;
	}

	unify._ = _;
	unify.variable = variable;
	unify.isVariable = isVariable;
	unify.incomplete = incomplete;
	unify.isIncomplete = isIncomplete;

	shards.unify = unify;
})();
