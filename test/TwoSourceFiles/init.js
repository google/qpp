// Demo app for Querypoint debugging

var obj = {
  prop: 0
};

var condition = {
  value: 1
};

var oldValue;

function foo() {
  condition.value = oldValue;
}

function bar() {
  if (!condition.value) {
    obj.prop = 0;
  }
  condition.prop = 7;
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