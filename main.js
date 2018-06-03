/* UMD.define */ (typeof define=="function"&&define||function(d,f,m){m={module:module,require:require};module.exports=f.apply(null,d.map(function(n){return m[n]||require(n)}))})
([], function(){
	"use strict";

	// AnyVar

	var _ = {};

	// Env

	function Env(){
		this.variables = {};
		this.values = {};
	}

	Env.prototype = {
		declaredClass: "unify/Env",
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

	// Command

	function Command(f, l, r){
		this.f = f;
		this.l = l;
		this.r = r;
	}
	Command.prototype.declaredClass = "unify/Command";

	// Custom unifier

	function Unifier(){}
	Unifier.prototype.declaredClass = "unify/Unifier";

	function isUnifier(x){
		return x && x instanceof Unifier;
	}

	// Unifier should define a method:
	// unify(val, ls, rs, env):
	// val is a value we are unifying with
	// ls is a stack of left arguments
	// rs is a stack of right arguments corresponding to ls
	// env is an environment
	// the result should be true/false for success/failure

	// Var

	var unique = 0;

	function Var(name){
		this.name = name || ("var" + unique++);
	}
	Var.prototype = Object.create(Unifier.prototype);
	Var.prototype.declaredClass = "unify/Var";

	Var.prototype.bound = function(env){
		return env.values.hasOwnProperty(this.name);
	};
	Var.prototype.alias = function(name, env){
		var t = env.variables[this.name];
		return t && t[name];
	};
	Var.prototype.get = function(env){
		return env.values[this.name];
	};

	Var.prototype.unify = function(val, ls, rs, env){
		if(this.bound(env)){
			ls.push(this.get(env));
			rs.push(val);
			return true;
		}
		// the next case is taken care of in unify() directly
		// the case of unbound variable
		//if(val === _ || val === this){
		//	return true;
		//}
		if(val instanceof Var){
			if(val.bound(env)){
				env.bindVal(this.name, val.get(env));
			}else{
				env.bindVar(this.name, val.name);
			}
			return true;
		}
		env.bindVal(this.name, val);
		return true;
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
	Wrap.prototype = Object.create(Unifier.prototype);
	Wrap.prototype.declaredClass = "unify/Wrap";

	Wrap.prototype.unify = function(val, ls, rs, env){
		var ops;
		if(this.object instanceof Array){
			// unify arrays
			if(!val) return false;
			if(val instanceof Array){
				// with a naked array
				return unifyArrays(this.object, this.type, this,
					val, env.arrayType ? "open" : "exact", null, ls, rs, env);
			}
			if(val instanceof Wrap){
				// with a wrapped array
				return val.object instanceof Array &&
					unifyArrays(this.object, this.type, this,
						val.object, val.type, val, ls, rs, env);
			}
			return false;
		}
		// unify objects
		if(!val || val instanceof Array) return false;
		if(val instanceof Wrap){
			// with a wrapped object
			return !(val.object instanceof Array) &&
				unifyObjects(this.object, this.type, this,
					val.object, val.type, val, ls, rs, env);
		}
		// with a naked object
		return typeof val == "object" &&
			unifyObjects(this.object, this.type, this,
				val, env.objectType ? "open" : "exact", null, ls, rs, env);
	};

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

	// registry of well-known constructors
	var registry = [
			Array,  unifyArray,
			Date,   unifyDate,
			RegExp, unifyRegExp
		];
	var filters = [];

	function unifyArray(l, r, ls, rs, env){
		if(!r || !(r instanceof Array) || !env.arrayType && l.length != r.length) return false;
		for(var i = 0, n = Math.min(l.length, r.length); i < n; ++i){
			ls.push(l[i]);
			rs.push(r[i]);
		}
		return true;
	}

	function unifyDate(l, r, ls, rs, env){
		return r && r instanceof Date && l.getTime() == r.getTime();
	}

	function unifyRegExp(l, r, ls, rs, env){
		return r && r instanceof RegExp && l.source == r.source &&
			l.global == r.global && l.multiline == r.multiline &&
			l.ignoreCase == r.ignoreCase;
	}

	// unification of arrays

	var arrayOps = {
			exact: {
				exact: {
					precheck: function(l, r){ return l.length == r.length; }
				},
				open: {
					precheck: function(l, r){ return l.length >= r.length; }
				},
				soft: {
					precheck: function(l, r){ return l.length >= r.length; },
					fix: function(){ this.l.type = "exact"; }
				}
			},
			open: {
				open: {},
				soft: {}
			},
			soft: {
				soft: {
					update: function(){
						if(this.l.length > this.r.length){
							this.r.push.apply(this.r, this.l.slice(this.r.length));
						}else if(this.l.length < this.r.length){
							this.l.push.apply(this.l, this.r.slice(this.l.length));
						}
					}
				}
			}
		};
	arrayOps.exact.exact.compare = arrayOps.exact.open.compare = arrayOps.exact.soft.compare =
		function(l, r, ls, rs){
			for(var i = 0, n = r.length; i < n; ++i){
				ls.push(l[i]);
				rs.push(r[i]);
			}
		};
	arrayOps.open.open.compare = arrayOps.open.soft.compare = arrayOps.soft.soft.compare =
		function(l, r, ls, rs){
			for(var i = 0, n = Math.min(l.length, r.length); i < n; ++i){
				ls.push(l[i]);
				rs.push(r[i]);
			}
		};
	arrayOps.exact.soft.update = arrayOps.open.soft.update =
		function(){
			if(this.l.length > this.r.length){
				this.r.push.apply(this.r, this.l.slice(this.r.length));
			}
		};

	function unifyArrays(l, lt, lm, r, rt, rm, ls, rs, env){
		if(lt > rt){
			var t = l; l = r; r = t;
			t = lm; lm = rm; rm = t;
			t = lt; lt = rt; rt = t;
		}
		var ops = arrayOps[lt][rt];
		if(ops.precheck && !ops.precheck(l, r)) return false;
		if(ops.fix && rm) ls.push(new Command(ops.fix, rm));
		if(ops.update && l.length != r.length) ls.push(new Command(ops.update, l, r));
		ops.compare(l, r, ls, rs, env);
		return true;
	}

	// unification of objects

	var hasOwnProperty = Object.prototype.hasOwnProperty;

	var objectOps = {
			exact: {
				exact: {
					precheck: function(l, r){
						if(typeof l.hasOwnProperty == 'function'){
							if(typeof r.hasOwnProperty == 'function'){
								for(var k in l){
									if(l.hasOwnProperty(k) && !r.hasOwnProperty(k)) return false;
								}
							}else{
								for(var k in l){
									if(l.hasOwnProperty(k) && !hasOwnProperty.call(r, k)) return false;
								}
							}
						}else{
							if(typeof r.hasOwnProperty == 'function'){
								for(var k in l){
									if(hasOwnProperty.call(l, k) && !r.hasOwnProperty(k)) return false;
								}
							}else{
								for(var k in l){
									if(hasOwnProperty.call(l, k) && !hasOwnProperty.call(r, k)) return false;
								}
							}
						}
						return true;
					}
				},
				open: {},
				soft: {
					fix: function(){ this.l.type = "exact"; }
				}
			},
			open: {
				open: {},
				soft: {}
			},
			soft: {
				soft: {
					update: function(){
						if(typeof this.l.hasOwnProperty == 'function'){
							if(typeof this.r.hasOwnProperty == 'function'){
								for(var k in this.l){
									if(this.l.hasOwnProperty(k) && !this.r.hasOwnProperty(k)){
										this.r[k] = this.l[k];
									}
								}
								for(k in this.r){
									if(this.r.hasOwnProperty(k) && !this.l.hasOwnProperty(k)){
										this.l[k] = this.r[k];
									}
								}
							}else{
								for(var k in this.l){
									if(this.l.hasOwnProperty(k) && !hasOwnProperty.call(this.r, k)){
										this.r[k] = this.l[k];
									}
								}
								for(k in this.r){
									if(this.r.hasOwnProperty(k) && !hasOwnProperty.call(this.l, k)){
										this.l[k] = this.r[k];
									}
								}
							}
						}else{
							if(typeof this.r.hasOwnProperty == 'function'){
								for(var k in this.l){
									if(hasOwnProperty.call(this.l, k) && !this.r.hasOwnProperty(k)){
										this.r[k] = this.l[k];
									}
								}
								for(k in this.r){
									if(hasOwnProperty.call(this.rk) && !this.l.hasOwnProperty(k)){
										this.l[k] = this.r[k];
									}
								}
							}else{
								if(typeof this.r.hasOwnProperty == 'function'){
									for(var k in this.l){
										if(hasOwnProperty.call(this.l, k) && !hasOwnProperty.call(this.r, k)){
											this.r[k] = this.l[k];
										}
									}
									for(k in this.r){
										if(hasOwnProperty.call(this.rk) && !hasOwnProperty.call(this.l, k)){
											this.l[k] = this.r[k];
										}
									}
								}
							}
						}
					}
				}
			}
		};
	objectOps.exact.exact.compare = objectOps.exact.open.compare = objectOps.exact.soft.compare =
		function(l, r, ls, rs){
			if(typeof l.hasOwnProperty == 'function'){
				if(typeof r.hasOwnProperty == 'function'){
					for(var k in r){
						if(r.hasOwnProperty(k)){
							if(!l.hasOwnProperty(k)){
								return false;
							}
							ls.push(l[k]);
							rs.push(r[k])
						}
					}
				}else{
					for(var k in r){
						if(hasOwnProperty.call(r, k)){
							if(!l.hasOwnProperty(k)){
								return false;
							}
							ls.push(l[k]);
							rs.push(r[k])
						}
					}
				}
			}else{
				if(typeof r.hasOwnProperty == 'function'){
					for(var k in r){
						if(r.hasOwnProperty(k)){
							if(!hasOwnProperty.call(l, k)){
								return false;
							}
							ls.push(l[k]);
							rs.push(r[k])
						}
					}
				}else{
					for(var k in r){
						if(hasOwnProperty.call(r, k)){
							if(!hasOwnProperty.call(l, k)){
								return false;
							}
							ls.push(l[k]);
							rs.push(r[k])
						}
					}
				}
			}
			return true;
		};
	objectOps.open.open.compare = objectOps.open.soft.compare = objectOps.soft.soft.compare =
		function(l, r, ls, rs){
			if(typeof l.hasOwnProperty == 'function'){
				if(typeof r.hasOwnProperty == 'function'){
					for(var k in r){
						if(r.hasOwnProperty(k) && l.hasOwnProperty(k)){
							ls.push(l[k]);
							rs.push(r[k])
						}
					}
				}else{
					for(var k in r){
						if(hasOwnProperty.call(r, k) && l.hasOwnProperty(k)){
							ls.push(l[k]);
							rs.push(r[k])
						}
					}
				}
			}else{
				if(typeof r.hasOwnProperty == 'function'){
					for(var k in r){
						if(r.hasOwnProperty(k) && hasOwnProperty.call(l, k)){
							ls.push(l[k]);
							rs.push(r[k])
						}
					}
				}else{
					for(var k in r){
						if(hasOwnProperty.call(r, k) && hasOwnProperty.call(l, k)){
							ls.push(l[k]);
							rs.push(r[k])
						}
					}
				}
			}
			return true;
		};
	objectOps.exact.soft.update = objectOps.open.soft.update =
		function(){
			if(typeof this.l.hasOwnProperty == 'function'){
				if(typeof this.r.hasOwnProperty == 'function'){
					for(var k in this.l){
						if(this.l.hasOwnProperty(k) && !this.r.hasOwnProperty(k)){
							this.r[k] = this.l[k];
						}
					}
				}else{
					for(var k in this.l){
						if(this.l.hasOwnProperty(k) && !hasOwnProperty.call(this.r, k)){
							this.r[k] = this.l[k];
						}
					}
				}
			}else{
				if(typeof this.r.hasOwnProperty == 'function'){
					for(var k in this.l){
						if(hasOwnProperty.call(this.l, k) && !this.r.hasOwnProperty(k)){
							this.r[k] = this.l[k];
						}
					}
				}else{
					for(var k in this.l){
						if(hasOwnProperty.call(this.l, k) && !hasOwnProperty.call(this.r, k)){
							this.r[k] = this.l[k];
						}
					}
				}
			}
		};

	function unifyObjects(l, lt, lm, r, rt, rm, ls, rs, env){
		if(lt > rt){
			var t = l; l = r; r = t;
			t = lm; lm = rm; rm = t;
			t = lt; lt = rt; rt = t;
		}
		var ops = objectOps[lt][rt];
		if(ops.precheck && !ops.precheck(l, r)) return false;
		if(ops.fix && rm) ls.push(new Command(ops.fix, rm));
		if(ops.update) ls.push(new Command(ops.update, l, r));
		return ops.compare(l, r, ls, rs, env);
	}

	// unification

	function unify(l, r, env){
		env = env || new Env();
		var ls = [l], rs = [r], objectType = env.objectType ? "open" : "exact";
		main: while(ls.length){
			// perform a command, or extract a pair
			l = ls.pop();
			if(l && l instanceof Command){
				l.f();
				continue;
			}
			r = rs.pop();
			// direct unity or anyvar
			if(l === r || l === _ || r === _){
				continue;
			}
			// process variables (variables have priority)
			if(l instanceof Var){
				if(l.unify(r, ls, rs, env)) continue;
				return null;
			}
			if(r instanceof Var){
				if(r.unify(l, ls, rs, env)) continue;
				return null;
			}
			// invoke custom unifiers
			if(l instanceof Unifier){
				if(l.unify(r, ls, rs, env)) continue;
				return null;
			}
			if(r instanceof Unifier){
				if(r.unify(l, ls, rs, env)) continue;
				return null;
			}
			// check rough types
			if(typeof l != typeof r){
				return null;
			}
			// special case: NaN
			if(typeof l == "number" && isNaN(l) && isNaN(r)){
				continue;
			}
			// cut off impossible combinations
			if(typeof l != "object" && typeof l != "function" || !l || !r){
				return null;
			}
			// process registered constructors
			var registry = unify.registry;
			for(var i = 0, len = registry.length; i < len; i += 2){
				if(l instanceof registry[i] || r instanceof registry[i]){
					if(registry[i + 1](l, r, ls, rs, env)) continue main;
					return null;
				}
			}
			// process registered filters
			registry = unify.filters;
			for(i = 0, len = registry.length; i < len; i += 2){
				if(registry[i](l, r)){
					if(registry[i + 1](l, r, ls, rs, env)) continue main;
					return null;
				}
			}
			// process naked objects
			if(!unifyObjects(l, objectType, null, r, objectType, null, ls, rs, env)) return null;
		}
		return env;
	}

	// exports

	unify._ = unify.any = _;
	unify.registry = registry;
	unify.filters  = filters;
	unify.Env = Env;
	unify.Unifier = Unifier;
	unify.Variable = Var;
	unify.variable = variable;
	unify.open = open;
	unify.soft = soft;
	unify.isUnifier  = isUnifier;
	unify.isVariable = isVariable;
	unify.isWrapped  = isWrapped;
	unify.isOpen = isOpen;
	unify.isSoft = isSoft;

	return unify;
});
