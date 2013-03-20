// Demo app for Querypoint debugging

var obj = {
  prop: 0
};

function onClick() {
  bar();
  updateButton();
}

function updateButton() {
  var message = "I've been clicked " + obj.prop + " times";
  document.querySelector("#myButton").innerHTML = message;
}

function bar() {
    var other = 'prop';
    var name = 'value';
    obj.prop++;
    if ((other = name) === 'value') obj[other]=0;
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
