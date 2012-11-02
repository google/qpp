var obj = {
  field: 6
};
obj['field']++;

var f = 5;

function foo() {
  return 6;
}

function bar() {
  return obj.field;
}

function baz(a, b) {
  var x = bar();
  x = x + a + b;
  return x + foo();
}

baz(f, f+1);
