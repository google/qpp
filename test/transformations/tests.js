function testGetterAssignment() {
  function Foo(x) {
    this.message = x;
  }
  function Bar(x) {
    Foo.call(this, x);
  }
  Bar.prototype = {
    get message() {
      throw new Error('Do not call getters in assignments');
    }
  };
  return new Bar('good');
}

function testAssignmentInCondition() {
    var other = 'prop';
    var name = 'value';
    console.assert((other = name) === 'value');
}

function testShortCurcuit() {
    var lhs = false;
    // LHS is false, RHS is not evaluated, result is false
    var isFalse = lhs && console.error('&& Not shortCurcuited');
    console.assert(!isFalse);
    lhs = true;
    // LHS is true, RHS is not evaluated, result is true
    var isTrue = lhs || console.error('|| Not shortCurcuited');
    console.assert(isTrue);
}

function testTypeof() {
    var isAnUndefined = typeof anUndefined !== "undefined";
    console.assert(!isAnUndefined);
}

function testConditionalExpression() {
  var isNull = null;
  var isTrue = isNull ? isNull.name() : true;
  console.assert(isTrue);
}

function testForIn() {
  var prop;
  var loaded = {foo: false};
  for (prop in loaded) {
      if (!loaded[prop]) 
              break;
  }
}

function testConst() {
  const isConst = 5;
  console.assert(isConst);
}

function testDoWhile() {
  var index = 0;
  do {
      if (index === 1)
          break;
      index++;
  } while (index <= 2);
  console.assert(index == 1);
}

function testSwitch() {
  var obj = { foo: 5};
  switch(obj.foo){
    case 5:
       obj.ok = true;
     break;
    default:
     obj.ok = false;
  }
  console.assert(obj.ok);
}

function testEval() {
  'use strict';

  // LHS for the compile context of the devtools script preprocessor,
  // RHS for the runtime context of the devtools script preprocessor...
  var global = ('global', eval)('this') || window;

  global.Querypoint = {};
  console.assert(typeof global.Querypoint === 'object');
}

function testTypeofInSwitch(GeneratorReturn) {
  switch (typeof GeneratorReturn) {
    case 'function':
      return;
    case 'undefined':
      return;
    default:
      throw new Error('FAIL testTypeofInSwitch');
  }
}

function testPropertyAccessInCase() {
  var v = 1;
  var obj = {prop: 1};
  switch(v) {
    case obj.prop: return;
    default: throw new Error('FAIL testPropertyAccessInCase');
  }
}

function test(aTestCase) {
  console.log('start ' + aTestCase);
  window[aTestCase]();
  console.log('end ' + aTestCase);
}

function onLoad() {
  test('testGetterAssignment');
  test('testTypeofInSwitch');
  test('testPropertyAccessInCase');
  test('testAssignmentInCondition');
  test('testShortCurcuit');
  test('testTypeof');
  test('testConditionalExpression');
  test('testForIn');
  test('testConst');
  test('testDoWhile');
  test('testEval');
  console.warn("Tests complete");  
}

window.addEventListener('load',onLoad);
