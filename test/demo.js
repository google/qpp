// Demo app for Querypoint debugging

var obj = {
  prop: 0
};

var condition = {
  value: 1
};

var oldValue;

function onClick() {
  foo() + 1;
  var p = 'prop';
  obj[p]++;
  bar();
  // lots more code....
  updateButton();
}

function updateButton() {
  var message = "I've been clicked " + obj.prop + " times";
  console.error(message);
  document.querySelector("#myButton").innerHTML = message;
  console.log(message);
}

function foo() {
  condition.value = oldValue;
}

function bar() {
  if (!condition.value) {
    obj.prop = 0;
  }
  condition.prop = 7;
  var button = document.querySelector("#myButton");
  button.innerHTML = 'I am not a bug';
}

function onLoad() {
  var button = document.createElement('button');
  button.innerHTML = "Try Me!";
  button.addEventListener('click', onClick);
  button.id = "myButton";
  document.body.appendChild(button);
  console.warn("This is your first warning");  
}

window.addEventListener('load',onLoad);