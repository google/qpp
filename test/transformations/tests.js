

function test() {
    var other = 'prop';
    var name = 'value';
    console.assert((other = name) === 'value');

    var isOpera = typeof opera !== "undefined" && opera.toString() === "[object Opera]";
    console.assert(!isOpera)
}

function onLoad() {
  test();
  console.warn("Tests complete");  
}

window.addEventListener('load',onLoad);
