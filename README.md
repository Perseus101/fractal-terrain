# WebGL Shell

This is a basic WebGL environment with a mobile camera.

Click on the canvas to grab the mouse and look around, press escape to release the mouse.

## Installation
These special instructions are for installing [node-webgl][1], which is
required for unit testing.

### Linux

```bash
$ sudo add-apt-repository ppa:karcaw/atb
$ sudo apt update
$ sudo apt install libglfw3-dev libglew-dev libanttweakbar-dev
```

### Mac

```bash
brew install anttweakbar freeimage
```

After installing the above dependencies, run:
* `npm install`

## Run in development
This will start a local server on `http://localhost:3000` where you can view the code.
* `npm start`

### Running unit tests
Assuming you have correctly installed [node-webgl][1], run `npm test` to run the unit tests.

[1]: https://github.com/mikeseven/node-webgl