/* UMD.define */ (typeof define=="function"&&define||function(d,f,m){m={module:module,require:require};module.exports=f.apply(null,d.map(function(n){return m[n]||require(n)}))})
(["module", "heya-ice", "../main", "../preprocess", "../unifiers/matchString",
	"../unifiers/matchTypeOf", "../unifiers/matchInstanceOf"],
function(module, ice, unify, preprocess, matchString, matchTypeOf, matchInstanceOf){
	"use strict";

	ice = ice.specialize(module);

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

	function TEST(condition){
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
			eval(TEST("unify(1, 1)"));
			eval(TEST("unify(0, 0)"));
			eval(TEST("unify(null, null)"));
			eval(TEST("unify(undefined, undefined)"));
			eval(TEST("unify(true, true)"));
			eval(TEST("unify(false, false)"));
			eval(TEST("unify('', '')"));
			eval(TEST("unify('1', '1')"));
			eval(TEST("unify(Infinity, Infinity)"));
			eval(TEST("unify(-Infinity, -Infinity)"));
			eval(TEST("unify(NaN, NaN)"));
			eval(TEST("!unify(1, 2)"));
			eval(TEST("!unify(1, true)"));
			eval(TEST("!unify(1, '1')"));
			eval(TEST("!unify(1, [])"));
			eval(TEST("!unify(1, {})"));
		},
		function test_anyvar(){
			eval(TEST("unify(_, 1)"));
			eval(TEST("unify(_, 2)"));
			eval(TEST("unify(_, true)"));
			eval(TEST("unify(_, '1')"));
			eval(TEST("unify(_, [])"));
			eval(TEST("unify(_, {})"));
			eval(TEST("unify(1, _)"));
			eval(TEST("unify(2, _)"));
			eval(TEST("unify(true, _)"));
			eval(TEST("unify('1', _)"));
			eval(TEST("unify([], _)"));
			eval(TEST("unify({}, _)"));
		},
		function test_exact_arrays(){
			eval(TEST("unify([], [])"));
			eval(TEST("unify([1], [1])"));
			eval(TEST("unify([1,2], [1,2])"));
			eval(TEST("!unify([], [1])"));
			eval(TEST("!unify([1], [2])"));
			eval(TEST("!unify([2,1], [1,2])"));
			eval(TEST("unify([1,_,3], [_,2,_])"));
			eval(TEST("unify([_,_,3], [1,_,_])"));
			eval(TEST("unify([[]], [[]])"));
			eval(TEST("unify([[], []], [[], []])"));
		},
		function test_exact_objects(){
			eval(TEST("unify({}, {})"));
			eval(TEST("unify({a: 1}, {a: 1})"));
			eval(TEST("unify({a: 1, b: 2}, {b: 2, a: 1})"));
			eval(TEST("!unify({}, {a: 1})"));
			eval(TEST("!unify({a: 1}, {a: 2})"));
			eval(TEST("!unify({a: 1}, {b: 1})"));
			eval(TEST("unify({a: _, b: 2}, {a: 1, b: _})"));
			eval(TEST("unify({a: {a: 1}, b: 2}, {a: {a: 1}, b: 2})"));
			eval(TEST("!unify({a: {a: 1}, b: 2}, {a: {a: 3}, b: 2})"));
			eval(TEST("!unify({a: {a: 1}, b: 2}, {a: {a: 1}, b: 3})"));
		},
		function test_variables(){
			var result = unify(1, 1);
			eval(TEST("result && unify(result.values, {})"));
			result = unify(1, _);
			eval(TEST("result && unify(result.values, {})"));
			result = unify(1, v("x"));
			eval(TEST("result && unify(result.values, {x: 1})"));
			result = unify(v("y"), v("x"));
			eval(TEST("result && unify(result.values, {})"));
			eval(TEST("result && unify(result.variables, {x: {x: 1, y: 1}, y: {x: 1, y: 1}})"));
			result = unify(v("y"), _);
			eval(TEST("result && unify(result.values, {})"));
			result = unify([1, v("x")], [v("y"), 2]);
			eval(TEST("result && unify(result.values, {x: 2, y: 1})"));
			result = unify({a: 1, b: v("x")}, {a: v("y"), b: 2});
			eval(TEST("result && unify(result.values, {x: 2, y: 1})"));
			result = unify({a: 1, b: v("x")}, {a: v("y"), c: 2});
			eval(TEST("!result"));
			result = unify({c: 1, b: v("x")}, {a: v("y"), b: 2});
			eval(TEST("!result"));
		},
		function test_regexes(){
			eval(TEST("unify(/\\b\\w+\\b/, /\\b\\w+\\b/)"));
			eval(TEST("!unify(/\\b\\w+\\b/m, /\\b\\w+\\b/)"));
			eval(TEST("!unify(/\\b\\w+\\b/m, /\\b\\w+\\b/g)"));
			eval(TEST("!unify(/\\b\\w+\\b/, /\\b\\w+\\b/i)"));
			eval(TEST("!unify(/\\b\\w+\\b/, 1)"));
			eval(TEST("unify(/\\b\\w+\\b/, new RegExp('\\\\b\\\\w+\\\\b'))"));
		},
		function test_dates(){
			eval(TEST("unify(new Date(2013, 6, 4), new Date(2013, 6, 4))"));
			eval(TEST("!unify(new Date(2013, 6, 4), new Date(2012, 6, 4))"));
			eval(TEST("!unify(new Date(2013, 6, 4), new Date(2013, 6, 4, 6))"));
			eval(TEST("unify(new Date(2013, 6, 4, 6), new Date(2013, 6, 4, 6))"));
		},
		function test_open_structures(){
			eval(TEST("unify({a: 1, b: 2, c: 3}, open({a: 1}))"));
			eval(TEST("unify(open({a: 1}), {a: 1, b: 2, c: 3})"));
			eval(TEST("unify([1, 2, 3], open([1,2]))"));
			eval(TEST("unify(open([1, 2]), [1, 2, 3])"));
			eval(TEST("unify(open({a: 1}), open({b: 2}))"));
			eval(TEST("unify(open([1]), open([1, 2]))"));
		},
		function test_soft_structures(){
			var x = v("x");
			var result = unify([soft({a: 1}), soft({b: 2})], soft([x, x]));
			eval(TEST("result && isSoft(x.get(result))"));
			eval(TEST("result && x.get(result).type === 'soft'"));
			eval(TEST("result && unify(x.get(result).object, {a: 1, b: 2})"));
			result = unify([soft({a: 1}), x], soft([x, soft({b: 2})]));
			eval(TEST("result && isSoft(x.get(result))"));
			eval(TEST("result && x.get(result).type === 'soft'"));
			eval(TEST("result && unify(x.get(result).object, {a: 1, b: 2})"));
		},
		function test_soft_presets(){
			var x = v("x"), env = unify(x, soft({}));
			var result = unify([1], [x], env);
			eval(TEST("!result"));
			result = unify([open({a: 1}), open({b: 2})], [x, x], env);
			eval(TEST("result && isSoft(x.get(result))"));
			eval(TEST("result && x.get(result).type === 'soft'"));
			eval(TEST("result && unify(x.get(env).object, {a: 1, b: 2})"));
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
			eval(TEST("result && x.get(result) === 0"));
			eval(TEST("result && unify(y.get(result), {value: 3})"));
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
			eval(TEST("!result"));
			result = unify(l, preprocess(r));
			eval(TEST("!result"));
			result = unify(l, preprocess(r, true));
			eval(TEST("result"));
			result = unify(l.y, {c: [1, 2]});
			eval(TEST("!result"));
			result = unify(l.y, preprocess({c: [1, 2]}));
			eval(TEST("!result"));
			result = unify(l.y, preprocess({c: [1, 2]}, false, true));
			eval(TEST("!result"));
			result = unify(l.y, preprocess({c: [1, 2]}, true, true));
			eval(TEST("result"));
		},
		function test_matchString(){
			var result = unify("12345", matchString(/1(2)3/));
			eval(TEST("result"));
			result = unify("12345", matchString(/1(2)3/, null, {input: "12345", index: 0}));
			eval(TEST("result"));
			result = unify("12345", matchString(/1(2)3/, ["123", "2"]));
			eval(TEST("result"));
			//
			var x = v("x"), y = v("y");
			result = unify("12345", matchString(/1(2)3/, x, y));
			eval(TEST("result"));
			eval(TEST("result && unify(x.get(result), ['123', '2'])"));
			eval(TEST("result && unify(y.get(result), {index: 0, input: '12345'})"));
			eval(TEST("result && unify(y.get(result), open({index: 0}))"));
			//
			result = unify("12345", matchString(/1(2)3/, [_, x], open({index: y})));
			eval(TEST("result && x.get(result) === '2'"));
			eval(TEST("result && y.get(result) === 0"));
		},
		function test_matchTypeOf(){
			var result = unify(1, matchTypeOf("number"));
			eval(TEST("result"));
			result = unify("a", matchTypeOf("string"));
			eval(TEST("result"));
			result = unify(true, matchTypeOf("boolean"));
			eval(TEST("result"));
			result = unify(undefined, matchTypeOf("undefined"));
			eval(TEST("result"));
			result = unify(null, matchTypeOf("object"));
			eval(TEST("result"));
			result = unify([], matchTypeOf("object"));
			eval(TEST("result"));
			result = unify({}, matchTypeOf("object"));
			eval(TEST("result"));
			result = unify(function(){}, matchTypeOf("function"));
			eval(TEST("result"));
			result = unify("a", matchTypeOf(["number", "string", "boolean"]));
			eval(TEST("result"));
			result = unify(null, matchTypeOf(["function", "object"]));
			eval(TEST("result"));
			result = unify(unify, matchTypeOf(["function", "object"]));
			eval(TEST("result"));

			result = unify([], matchTypeOf(["number", "string", "boolean"]));
			eval(TEST("!result"));
			result = unify(1, matchTypeOf(["function", "object"]));
			eval(TEST("!result"));
		},
		function test_matchInstanceOf(){
			function A(){}

			function B(){}
			B.prototype = Object.create(A.prototype);

			function C(){}
			C.prototype = Object.create(B.prototype);

			function D(){}

			function E(){}
			E.prototype = Object.create(D.prototype);

			var result = unify(new A, matchInstanceOf(Object));
			eval(TEST("result"));
			result = unify(new A, matchInstanceOf(A));
			eval(TEST("result"));
			result = unify(new A, matchInstanceOf(B));
			eval(TEST("!result"));
			result = unify(new A, matchInstanceOf(C));
			eval(TEST("!result"));
			result = unify(new A, matchInstanceOf(D));
			eval(TEST("!result"));
			result = unify(new A, matchInstanceOf(E));
			eval(TEST("!result"));

			result = unify(new B, matchInstanceOf(Object));
			eval(TEST("result"));
			result = unify(new B, matchInstanceOf(A));
			eval(TEST("result"));
			result = unify(new B, matchInstanceOf(B));
			eval(TEST("result"));
			result = unify(new B, matchInstanceOf(C));
			eval(TEST("!result"));
			result = unify(new B, matchInstanceOf(D));
			eval(TEST("!result"));
			result = unify(new B, matchInstanceOf(E));
			eval(TEST("!result"));

			result = unify(new C, matchInstanceOf(Object));
			eval(TEST("result"));
			result = unify(new C, matchInstanceOf(A));
			eval(TEST("result"));
			result = unify(new C, matchInstanceOf(B));
			eval(TEST("result"));
			result = unify(new C, matchInstanceOf(C));
			eval(TEST("result"));
			result = unify(new C, matchInstanceOf(D));
			eval(TEST("!result"));
			result = unify(new C, matchInstanceOf(E));
			eval(TEST("!result"));

			result = unify(new D, matchInstanceOf(Object));
			eval(TEST("result"));
			result = unify(new D, matchInstanceOf(A));
			eval(TEST("!result"));
			result = unify(new D, matchInstanceOf(B));
			eval(TEST("!result"));
			result = unify(new D, matchInstanceOf(C));
			eval(TEST("!result"));
			result = unify(new D, matchInstanceOf(D));
			eval(TEST("result"));
			result = unify(new D, matchInstanceOf(E));
			eval(TEST("!result"));

			result = unify(new E, matchInstanceOf(Object));
			eval(TEST("result"));
			result = unify(new E, matchInstanceOf(A));
			eval(TEST("!result"));
			result = unify(new E, matchInstanceOf(B));
			eval(TEST("!result"));
			result = unify(new E, matchInstanceOf(C));
			eval(TEST("!result"));
			result = unify(new E, matchInstanceOf(D));
			eval(TEST("result"));
			result = unify(new E, matchInstanceOf(E));
			eval(TEST("result"));

			result = unify(new Date, matchInstanceOf(Object));
			eval(TEST("result"));
			result = unify(new Date, matchInstanceOf(Date));
			eval(TEST("result"));
			result = unify(new Date, matchInstanceOf(Array));
			eval(TEST("!result"));

			result = unify([], matchInstanceOf(Object));
			eval(TEST("result"));
			result = unify([], matchInstanceOf(Date));
			eval(TEST("!result"));
			result = unify([], matchInstanceOf(Array));
			eval(TEST("result"));

			result = unify({}, matchInstanceOf(Object));
			eval(TEST("result"));
			result = unify({}, matchInstanceOf(Date));
			eval(TEST("!result"));
			result = unify({}, matchInstanceOf(Array));
			eval(TEST("!result"));
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
