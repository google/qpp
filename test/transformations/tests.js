

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

function onLoad() {
  testAssignmentInCondition();
  testShortCurcuit();
  testTypeof();
  testConditionalExpression();
  console.warn("Tests complete");  
}

window.addEventListener('load',onLoad);
