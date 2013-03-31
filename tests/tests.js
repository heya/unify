(function(factory){
	var deps = ["module", "heya-logger", "../main", "../preprocess",
			"../unifiers/matchString"];
	if(typeof define != "undefined"){ // AMD
		define(deps, factory);
	}else if(typeof module != "undefined"){ // node.js
		factory.apply(null,
			deps.filter(function(_, i){ return i < factory.length; }).
			map(function req(name){
				return name === "require" && require || name === "module" && module || require(name);
			}));
	}
})(function(module, logger, unify, preprocess, matchString){
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
			res("Success: " + msg + " --- in " + _current + ", #" + (_local + 1));
		}else{
			res("Failed: " + msg + " --- in " + _current + ", #" + (_local + 1), true);
		}
	}

	function test(condition){
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
			eval(test("unify(1, 1)"));
			eval(test("unify(0, 0)"));
			eval(test("unify(null, null)"));
			eval(test("unify(undefined, undefined)"));
			eval(test("unify(true, true)"));
			eval(test("unify(false, false)"));
			eval(test("unify('', '')"));
			eval(test("unify('1', '1')"));
			eval(test("unify(Infinity, Infinity)"));
			eval(test("unify(-Infinity, -Infinity)"));
			eval(test("unify(NaN, NaN)"));
			eval(test("!unify(1, 2)"));
			eval(test("!unify(1, true)"));
			eval(test("!unify(1, '1')"));
			eval(test("!unify(1, [])"));
			eval(test("!unify(1, {})"));
		},
		function test_anyvar(){
			eval(test("unify(_, 1)"));
			eval(test("unify(_, 2)"));
			eval(test("unify(_, true)"));
			eval(test("unify(_, '1')"));
			eval(test("unify(_, [])"));
			eval(test("unify(_, {})"));
			eval(test("unify(1, _)"));
			eval(test("unify(2, _)"));
			eval(test("unify(true, _)"));
			eval(test("unify('1', _)"));
			eval(test("unify([], _)"));
			eval(test("unify({}, _)"));
		},
		function test_exact_arrays(){
			eval(test("unify([], [])"));
			eval(test("unify([1], [1])"));
			eval(test("unify([1,2], [1,2])"));
			eval(test("!unify([], [1])"));
			eval(test("!unify([1], [2])"));
			eval(test("!unify([2,1], [1,2])"));
			eval(test("unify([1,_,3], [_,2,_])"));
			eval(test("unify([_,_,3], [1,_,_])"));
			eval(test("unify([[]], [[]])"));
			eval(test("unify([[], []], [[], []])"));
		},
		function test_exact_objects(){
			eval(test("unify({}, {})"));
			eval(test("unify({a: 1}, {a: 1})"));
			eval(test("unify({a: 1, b: 2}, {b: 2, a: 1})"));
			eval(test("!unify({}, {a: 1})"));
			eval(test("!unify({a: 1}, {a: 2})"));
			eval(test("!unify({a: 1}, {b: 1})"));
			eval(test("unify({a: _, b: 2}, {a: 1, b: _})"));
			eval(test("unify({a: {a: 1}, b: 2}, {a: {a: 1}, b: 2})"));
			eval(test("!unify({a: {a: 1}, b: 2}, {a: {a: 3}, b: 2})"));
			eval(test("!unify({a: {a: 1}, b: 2}, {a: {a: 1}, b: 3})"));
		},
		function test_variables(){
			var result = unify(1, 1);
			eval(test("result && unify(result.values, {})"));
			result = unify(1, _);
			eval(test("result && unify(result.values, {})"));
			result = unify(1, v("x"));
			eval(test("result && unify(result.values, {x: 1})"));
			result = unify(v("y"), v("x"));
			eval(test("result && unify(result.values, {})"));
			eval(test("result && unify(result.variables, {x: {x: 1, y: 1}, y: {x: 1, y: 1}})"));
			result = unify(v("y"), _);
			eval(test("result && unify(result.values, {})"));
			result = unify([1, v("x")], [v("y"), 2]);
			eval(test("result && unify(result.values, {x: 2, y: 1})"));
			result = unify({a: 1, b: v("x")}, {a: v("y"), b: 2});
			eval(test("result && unify(result.values, {x: 2, y: 1})"));
			result = unify({a: 1, b: v("x")}, {a: v("y"), c: 2});
			eval(test("!result"));
			result = unify({c: 1, b: v("x")}, {a: v("y"), b: 2});
			eval(test("!result"));
		},
		function test_regexes(){
			eval(test("unify(/\\b\\w+\\b/, /\\b\\w+\\b/)"));
			eval(test("!unify(/\\b\\w+\\b/m, /\\b\\w+\\b/)"));
			eval(test("!unify(/\\b\\w+\\b/m, /\\b\\w+\\b/g)"));
			eval(test("!unify(/\\b\\w+\\b/, /\\b\\w+\\b/i)"));
			eval(test("!unify(/\\b\\w+\\b/, 1)"));
			eval(test("unify(/\\b\\w+\\b/, new RegExp('\\\\b\\\\w+\\\\b'))"));
		},
		function test_dates(){
			eval(test("unify(new Date(2013, 6, 4), new Date(2013, 6, 4))"));
			eval(test("!unify(new Date(2013, 6, 4), new Date(2012, 6, 4))"));
			eval(test("!unify(new Date(2013, 6, 4), new Date(2013, 6, 4, 6))"));
			eval(test("unify(new Date(2013, 6, 4, 6), new Date(2013, 6, 4, 6))"));
		},
		function test_open_structures(){
			eval(test("unify({a: 1, b: 2, c: 3}, open({a: 1}))"));
			eval(test("unify(open({a: 1}), {a: 1, b: 2, c: 3})"));
			eval(test("unify([1, 2, 3], open([1,2]))"));
			eval(test("unify(open([1, 2]), [1, 2, 3])"));
			eval(test("unify(open({a: 1}), open({b: 2}))"));
			eval(test("unify(open([1]), open([1, 2]))"));
		},
		function test_soft_structures(){
			var x = v("x");
			var result = unify([soft({a: 1}), soft({b: 2})], soft([x, x]));
			eval(test("result && isSoft(x.get(result))"));
			eval(test("result && x.get(result).type === 'soft'"));
			eval(test("result && unify(x.get(result).object, {a: 1, b: 2})"));
			result = unify([soft({a: 1}), x], soft([x, soft({b: 2})]));
			eval(test("result && isSoft(x.get(result))"));
			eval(test("result && x.get(result).type === 'soft'"));
			eval(test("result && unify(x.get(result).object, {a: 1, b: 2})"));
		},
		function test_soft_presets(){
			var x = v("x"), env = unify(x, soft({}));
			var result = unify([1], [x], env);
			eval(test("!result"));
			result = unify([open({a: 1}), open({b: 2})], [x, x], env);
			eval(test("result && isSoft(x.get(result))"));
			eval(test("result && x.get(result).type === 'soft'"));
			eval(test("result && unify(x.get(env).object, {a: 1, b: 2})"));
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
			eval(test("result && x.get(result) === 0"));
			eval(test("result && unify(y.get(result), {value: 3})"));
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
			eval(test("!result"));
			result = unify(l, preprocess(r));
			eval(test("!result"));
			result = unify(l, preprocess(r, true));
			eval(test("result"));
			result = unify(l.y, {c: [1, 2]});
			eval(test("!result"));
			result = unify(l.y, preprocess({c: [1, 2]}));
			eval(test("!result"));
			result = unify(l.y, preprocess({c: [1, 2]}, false, true));
			eval(test("!result"));
			result = unify(l.y, preprocess({c: [1, 2]}, true, true));
			eval(test("result"));
		},
		function test_matchString(){
			var result = unify("12345", matchString(/1(2)3/));
			eval(test("result"));
			result = unify("12345", matchString(/1(2)3/, null, {input: "12345", index: 0}));
			eval(test("result"));
			result = unify("12345", matchString(/1(2)3/, ["123", "2"]));
			eval(test("result"));
			//
			var x = v("x"), y = v("y");
			result = unify("12345", matchString(/1(2)3/, x, y));
			eval(test("result"));
			eval(test("result && unify(x.get(result), ['123', '2'])"));
			eval(test("result && unify(y.get(result), {index: 0, input: '12345'})"));
			eval(test("result && unify(y.get(result), open({index: 0}))"));
			//
			result = unify("12345", matchString(/1(2)3/, [_, x], open({index: y})));
			eval(test("result && x.get(result) === '2'"));
			eval(test("result && y.get(result) === 0"));
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
