
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

