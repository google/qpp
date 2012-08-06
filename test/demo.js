// Demo app for Querypoint debugging

var obj = {
  prop: 1
};

var condition = {
	value: 1
};

var oldValue;

function onClick() {
	foo();
	obj.prop++;
	bar();
	// lots more code...
	updateButton();
}

function updateButton() {
	var message = "I've been clicked " + obj.prop + " times";
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
}

function onLoad() {
	var button = document.createElement('button');
	button.innerHTML = "Try Me!";
	button.addEventListener('click', onClick);
	button.id = "myButton";
    document.body.appendChild(button);	
}

onLoad();