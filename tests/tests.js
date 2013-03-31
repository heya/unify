(function(factory){
	if(typeof define != "undefined"){ // AMD
		define(["module", "../main", "../preprocess", "heya-logger"], factory);
	}else if(typeof module != "undefined"){ // node.js
		factory(module, require("../main"), require("../preprocess"), require("heya-logger"));
	}
})(function(module, unify, preprocess, logger){
	"use strict";

	logger = logger.getLogger(module);

	// test harness

	function out(msg){
		console.log(msg);
	};

	var _total = 0, _errors = 0, _current = null, _local = 0;

	function res(msg, isError){
		++_local;
		++_total;
		if(isError){
			++_errors;
			console.log(msg);
		}
	};

	var SHOW_FAILED_TEST_CODE = true;

	function submit(msg, success){
		if(success){
			res("Success: " + msg + " --- in " + _current + ", #" + _local);
		}else{
			res("Failed: " + msg + " --- in " + _current + ", #" + _local, true);
		}
	}

	function assert(condition){
		return "submit('" + quoteString(condition) + "', (" + condition + "))";
	}

	function quoteString(text){
		return text.replace(/['"\\]/g, "\\$&");
	}

	// setup

	var _ = unify._, v = unify.variable, open = unify.open, soft = unify.soft,
		isOpen = unify.isOpen, isSoft = unify.isSoft;

	// tests

	var tests = [
		function test_constants(){
			eval(assert("unify(1, 1)"));
			eval(assert("unify(0, 0)"));
			eval(assert("unify(null, null)"));
			eval(assert("unify(undefined, undefined)"));
			eval(assert("unify(true, true)"));
			eval(assert("unify(false, false)"));
			eval(assert("unify('', '')"));
			eval(assert("unify('1', '1')"));
			eval(assert("unify(Infinity, Infinity)"));
			eval(assert("unify(-Infinity, -Infinity)"));
			eval(assert("unify(NaN, NaN)"));
			eval(assert("!unify(1, 2)"));
			eval(assert("!unify(1, true)"));
			eval(assert("!unify(1, '1')"));
			eval(assert("!unify(1, [])"));
			eval(assert("!unify(1, {})"));
		},
		function test_anyvar(){
			eval(assert("unify(_, 1)"));
			eval(assert("unify(_, 2)"));
			eval(assert("unify(_, true)"));
			eval(assert("unify(_, '1')"));
			eval(assert("unify(_, [])"));
			eval(assert("unify(_, {})"));
			eval(assert("unify(1, _)"));
			eval(assert("unify(2, _)"));
			eval(assert("unify(true, _)"));
			eval(assert("unify('1', _)"));
			eval(assert("unify([], _)"));
			eval(assert("unify({}, _)"));
		},
		function test_exact_arrays(){
			eval(assert("unify([], [])"));
			eval(assert("unify([1], [1])"));
			eval(assert("unify([1,2], [1,2])"));
			eval(assert("!unify([], [1])"));
			eval(assert("!unify([1], [2])"));
			eval(assert("!unify([2,1], [1,2])"));
			eval(assert("unify([1,_,3], [_,2,_])"));
			eval(assert("unify([_,_,3], [1,_,_])"));
			eval(assert("unify([[]], [[]])"));
			eval(assert("unify([[], []], [[], []])"));
		},
		function test_exact_objects(){
			eval(assert("unify({}, {})"));
			eval(assert("unify({a: 1}, {a: 1})"));
			eval(assert("unify({a: 1, b: 2}, {b: 2, a: 1})"));
			eval(assert("!unify({}, {a: 1})"));
			eval(assert("!unify({a: 1}, {a: 2})"));
			eval(assert("!unify({a: 1}, {b: 1})"));
			eval(assert("unify({a: _, b: 2}, {a: 1, b: _})"));
			eval(assert("unify({a: {a: 1}, b: 2}, {a: {a: 1}, b: 2})"));
			eval(assert("!unify({a: {a: 1}, b: 2}, {a: {a: 3}, b: 2})"));
			eval(assert("!unify({a: {a: 1}, b: 2}, {a: {a: 1}, b: 3})"));
		},
		function test_variables(){
			var result = unify(1, 1);
			eval(assert("result && unify(result.values, {})"));
			result = unify(1, _);
			eval(assert("result && unify(result.values, {})"));
			result = unify(1, v("x"));
			eval(assert("result && unify(result.values, {x: 1})"));
			result = unify(v("y"), v("x"));
			eval(assert("result && unify(result.values, {})"));
			eval(assert("result && unify(result.variables, {x: {x: 1, y: 1}, y: {x: 1, y: 1}})"));
			result = unify(v("y"), _);
			eval(assert("result && unify(result.values, {})"));
			result = unify([1, v("x")], [v("y"), 2]);
			eval(assert("result && unify(result.values, {x: 2, y: 1})"));
			result = unify({a: 1, b: v("x")}, {a: v("y"), b: 2});
			eval(assert("result && unify(result.values, {x: 2, y: 1})"));
			result = unify({a: 1, b: v("x")}, {a: v("y"), c: 2});
			eval(assert("!result"));
			result = unify({c: 1, b: v("x")}, {a: v("y"), b: 2});
			eval(assert("!result"));
		},
		function test_regexes(){
			eval(assert("unify(/\\b\\w+\\b/, /\\b\\w+\\b/)"));
			eval(assert("!unify(/\\b\\w+\\b/m, /\\b\\w+\\b/)"));
			eval(assert("!unify(/\\b\\w+\\b/m, /\\b\\w+\\b/g)"));
			eval(assert("!unify(/\\b\\w+\\b/, /\\b\\w+\\b/i)"));
			eval(assert("!unify(/\\b\\w+\\b/, 1)"));
			eval(assert("unify(/\\b\\w+\\b/, new RegExp('\\\\b\\\\w+\\\\b'))"));
		},
		function test_dates(){
			eval(assert("unify(new Date(2013, 6, 4), new Date(2013, 6, 4))"));
			eval(assert("!unify(new Date(2013, 6, 4), new Date(2012, 6, 4))"));
			eval(assert("!unify(new Date(2013, 6, 4), new Date(2013, 6, 4, 6))"));
			eval(assert("unify(new Date(2013, 6, 4, 6), new Date(2013, 6, 4, 6))"));
		},
		function test_open_structures(){
			eval(assert("unify({a: 1, b: 2, c: 3}, open({a: 1}))"));
			eval(assert("unify(open({a: 1}), {a: 1, b: 2, c: 3})"));
			eval(assert("unify([1, 2, 3], open([1,2]))"));
			eval(assert("unify(open([1, 2]), [1, 2, 3])"));
			eval(assert("unify(open({a: 1}), open({b: 2}))"));
			eval(assert("unify(open([1]), open([1, 2]))"));
		},
		function test_soft_structures(){
			var x = v("x");
			var result = unify([soft({a: 1}), soft({b: 2})], soft([x, x]));
			eval(assert("result && isSoft(x.get(result))"));
			eval(assert("result && x.get(result).type === 'soft'"));
			eval(assert("result && unify(x.get(result).object, {a: 1, b: 2})"));
			result = unify([soft({a: 1}), x], soft([x, soft({b: 2})]));
			eval(assert("result && isSoft(x.get(result))"));
			eval(assert("result && x.get(result).type === 'soft'"));
			eval(assert("result && unify(x.get(result).object, {a: 1, b: 2})"));
		},
		function test_complex_structures(){
			var x = v("x"), y = v("y");
			var tree = {
				value: 0,
				left: {
					value: 1,
					left: {
						value: 3
					},
					right: {
						value: 4
					}
				},
				right: {
					value: 2,
					left: null,
					right: {
						value: 3
					}
				}
			};
			var result = unify(tree, {
				value: x,
				left: open({left: y}),
				right: open({right: y})
			});
			eval(assert("result && x.get(result) === 0"));
			eval(assert("result && unify(y.get(result), {value: 3})"));
		},
		function test_soft_presets(){
			var x = v("x"), env = unify(x, soft({}));
			var result = unify([1], [x], env);
			eval(assert("!result"));
			result = unify([open({a: 1}), open({b: 2})], [x, x], env);
			eval(assert("result && isSoft(x.get(result))"));
			eval(assert("result && x.get(result).type === 'soft'"));
			eval(assert("result && unify(x.get(env).object, {a: 1, b: 2})"));
		},
		function test_preprocess(){
			var l = {
					x: 5,
					y: {
						a: 42,
						b: {},
						c: [1, 2, 3]
					},
					z: "ah!"
				},
				r = {
					y: {
						b: {}
					},
					z: "ah!"
				};
			var result = unify(l, r);
			eval(assert("!result"));
			result = unify(l, preprocess(r));
			eval(assert("!result"));
			result = unify(l, preprocess(r, true));
			eval(assert("result"));
			result = unify(l.y, {c: [1, 2]});
			eval(assert("!result"));
			result = unify(l.y, preprocess({c: [1, 2]}));
			eval(assert("!result"));
			result = unify(l.y, preprocess({c: [1, 2]}, false, true));
			eval(assert("!result"));
			result = unify(l.y, preprocess({c: [1, 2]}, true, true));
			eval(assert("result"));
		}
	];

	function runTests(){
		_total = _errors = 0;
		var exceptionFlag = false;
		out("Starting tests...");
		for(var i = 0, l = tests.length; i < l; ++i){
			_current = tests[i].name;
			_local = 0;
			try{
				tests[i]();
			}catch(e){
				exceptionFlag = true;
				if(typeof console != "undefined"){	// IE < 9 :-(
					console.log("Unhandled exception in test #" + i +
						" (" + tests[i].name + "): " + e.message);
					if(e.stack){
						console.log("Stack: ", e.stack);
					}
					if(SHOW_FAILED_TEST_CODE){
						console.log("Code: ", tests[i].toString());
					}
				}
			}
		}
		out(_errors ? "Failed " + _errors + " out of " + _total + " tests." : "Finished " + _total + " tests.");
		if(typeof process != "undefined"){
			process.exit(_errors || exceptionFlag ? 1 : 0);
		}else if(typeof window != "undefined" && window){
			if(typeof window.callPhantom != "undefined"){
				window.callPhantom(_errors || exceptionFlag ? "failure" : "success");
			}
		}
	}

	runTests();
});
