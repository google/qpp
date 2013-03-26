// Demo app for Querypoint debugging

var obj = {
  prop: ko.observable(0)
};

var condition = {
  value: 1
};

var oldValue;
var message;

obj.prop.subscribe(function(newValue){
    message = ko.computed(function(){
        return "I've been clicked " + newValue + " times";
    }).extend({throttle: 2000});
});

function onClick() {
  foo() + 1;
  var p = 'prop';
  obj[p](obj[p]() + 1);
  bar();
  // lots more code....
  updateButton();
  setTimeout(function(){ doSetTimeouts(1)}, 2000);
}

function doSetTimeouts(number){
  condition.prop = number;
  console.warn('Asynchronous call ' + number);
  if(number < 5) setTimeout(function(){ doSetTimeouts(number + 1)}, 2000);
}

function updateButton() {
  console.error(message());
  document.querySelector("#myButton").innerHTML = message();
  console.log(message());
}

function foo() {
  condition.value = oldValue;
}

function bar() {
  if (!condition.value) {
    obj.prop(0);
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
