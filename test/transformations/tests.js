function testDoubleCalls() {
  var shouldBeOne = 0;
  function foo() {
    shouldBeOne++;
    return false;
  }
  if (!foo()) {
    if (shouldBeOne !== 1)
      throw new Error("Double Calls");
    else
      return true;
  } else {
       throw new Error("We have no foo here");
  }
}


function testFunctionToString() {
  function testMe() {
    return true;
  }
  var testMeString = '(' + testMe + ")();";
  var testMeFunction = ('global', eval)(testMeString);
  return testMeFunction;
}


function testBind() {
  this.foo = true;
  var onNavigated = function(url) {
    return this.foo;
  }.bind(this);
  if (!onNavigated('foo'))
    throw new Error("bind this should bind this");
  return true;    
}

function testPostfixIncrement() {
  var i = 0;
  var ary = [];
  ary[i++] = "Zero";
  if (!ary[0])
    throw new Error('PostfixIncrement should evaluate to pre-value');
  if (i !== 1)
    throw new Error('PostfixIncrement should increment');
  return true;    
}

function testPrefixDecrement() {
  var i = 1;
  --i;
  if (i !== 0)
    throw new Error('1 - 1 should equal 0');
  return true;    
}

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
  var bar = new Bar('good');
  return true;    
}

function testAssignmentInCondition() {
    var other = 'prop';
    var name = 'value';
    console.assert((other = name) === 'value');
    return true;    
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
    return true;    
}

function testTypeof() {
    var isAnUndefined = typeof anUndefined !== "undefined";
    console.assert(!isAnUndefined);
    return true;    
}

function testConditionalExpression() {
  var isNull = null;
  var isTrue = isNull ? isNull.name() : true;
  console.assert(isTrue);
  return true;    
}

function testForIn() {
  var prop;
  var loaded = {foo: false};
  for (prop in loaded) {
      if (!loaded[prop]) 
              break;
  }
  return true;    
}

function testConst() {
  const isConst = 5;
  console.assert(isConst);
  return true;    
}

function testDoWhile() {
  var index = 0;
  do {
      if (index === 1)
          break;
      index++;
  } while (index <= 2);
  console.assert(index == 1);
  return true;    
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
  return true;    
}

function testEval() {
  'use strict';

  // LHS for the compile context of the devtools script preprocessor,
  // RHS for the runtime context of the devtools script preprocessor...
  var global = ('global', eval)('this') || window;

  global.Querypoint = {};
  console.assert(typeof global.Querypoint === 'object');
  return true;    
}

function testTypeofInSwitch(GeneratorReturn) {
  switch (typeof GeneratorReturn) {
    case 'function':
      return false;
    case 'undefined':
      return true;
    default:
      throw new Error('FAIL testTypeofInSwitch');
  }
}

function testPropertyAccessInCase() {
  var v = 1;
  var obj = {prop: 1};
  switch(v) {
    case obj.prop: return true;
    default: throw new Error('FAIL testPropertyAccessInCase');
  }
}

function test(aTestCase) {
  console.log('start ' + aTestCase);
  if (window[aTestCase]()) 
    console.log('end ' + aTestCase);
  else
    console.error('FAIL ' + aTestCase);
}

function onLoad() {
  test('testDoubleCalls');
  test('testFunctionToString');
  test('testBind');
  test('testPostfixIncrement');
  test('testPrefixDecrement');
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
