var obj = {
  field: 6
};

obj.field = 7;

obj['field'] = 9;

obj.field++;

obj['field']++;

console.log(obj.field);

function inside() {
	var obj = {
	  field: 6
	};

	obj.field = 7;

	obj['field'] = 9;

	obj.field++;

	obj['field']++;

	console.log(obj.field);
}

window.addEventListener('load', inside);