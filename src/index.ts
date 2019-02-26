import { setupWebGL } from './setupWebGL';

function main() {
    let canvas = document.createElement("canvas");
    canvas.height = 512;
    canvas.width = 512;
    document.querySelector("body").appendChild(canvas);
    let gl = setupWebGL(canvas);
}


function onReady(fn: Function) {
    if (document.readyState != 'loading'){
        fn();
    } else {
        document.addEventListener('DOMContentLoaded', (fn as any));
    }
}

onReady(main);