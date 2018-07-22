(function(){function r(e,n,t){function o(i,f){if(!n[i]){if(!e[i]){var c="function"==typeof require&&require;if(!f&&c)return c(i,!0);if(u)return u(i,!0);var a=new Error("Cannot find module '"+i+"'");throw a.code="MODULE_NOT_FOUND",a}var p=n[i]={exports:{}};e[i][0].call(p.exports,function(r){var n=e[i][1][r];return o(n||r)},p,p.exports,r,e,n,t)}return n[i].exports}for(var u="function"==typeof require&&require,i=0;i<t.length;i++)o(t[i]);return o}return r})()({1:[function(require,module,exports){
(function (process){

var MACHINE_ID = Math.floor(Math.random() * 0xFFFFFF);
var index = ObjectID.index = parseInt(Math.random() * 0xFFFFFF, 10);
var pid = (typeof process === 'undefined' || typeof process.pid !== 'number' ? Math.floor(Math.random() * 100000) : process.pid) % 0xFFFF;

/**
 * Determine if an object is Buffer
 *
 * Author:   Feross Aboukhadijeh <feross@feross.org> <http://feross.org>
 * License:  MIT
 *
 */
var isBuffer = function (obj) {
  return !!(
  obj != null &&
  obj.constructor &&
  typeof obj.constructor.isBuffer === 'function' &&
  obj.constructor.isBuffer(obj)
  )
};

/**
 * Create a new immutable ObjectID instance
 *
 * @class Represents the BSON ObjectID type
 * @param {String|Number} arg Can be a 24 byte hex string, 12 byte binary string or a Number.
 * @return {Object} instance of ObjectID.
 */
function ObjectID(arg) {
  if(!(this instanceof ObjectID)) return new ObjectID(arg);
  if(arg && ((arg instanceof ObjectID) || arg._bsontype==="ObjectID"))
    return arg;

  var buf;

  if(isBuffer(arg) || (Array.isArray(arg) && arg.length===12)) {
    buf = Array.prototype.slice.call(arg);
  }
  else if(typeof arg === "string") {
    if(arg.length!==12 && !ObjectID.isValid(arg))
      throw new Error("Argument passed in must be a single String of 12 bytes or a string of 24 hex characters");

    buf = buffer(arg);
  }
  else if(/number|undefined/.test(typeof arg)) {
    buf = buffer(generate(arg));
  }

  Object.defineProperty(this, "id", {
    enumerable: true,
    get: function() { return String.fromCharCode.apply(this, buf); }
  });
  Object.defineProperty(this, "str", {
    get: function() { return buf.map(hex.bind(this, 2)).join(''); }
  });
}
module.exports = ObjectID;
ObjectID.generate = generate;
ObjectID.default = ObjectID;

/**
 * Creates an ObjectID from a second based number, with the rest of the ObjectID zeroed out. Used for comparisons or sorting the ObjectID.
 *
 * @param {Number} time an integer number representing a number of seconds.
 * @return {ObjectID} return the created ObjectID
 * @api public
 */
ObjectID.createFromTime = function(time){
  time = parseInt(time, 10) % 0xFFFFFFFF;
  return new ObjectID(hex(8,time)+"0000000000000000");
};

/**
 * Creates an ObjectID from a hex string representation of an ObjectID.
 *
 * @param {String} hexString create a ObjectID from a passed in 24 byte hexstring.
 * @return {ObjectID} return the created ObjectID
 * @api public
 */
ObjectID.createFromHexString = function(hexString) {
  if(!ObjectID.isValid(hexString))
    throw new Error("Invalid ObjectID hex string");

  return new ObjectID(hexString);
};

/**
 * Checks if a value is a valid bson ObjectId
 *
 * @param {String} objectid Can be a 24 byte hex string or an instance of ObjectID.
 * @return {Boolean} return true if the value is a valid bson ObjectID, return false otherwise.
 * @api public
 *
 * THE NATIVE DOCUMENTATION ISN'T CLEAR ON THIS GUY!
 * http://mongodb.github.io/node-mongodb-native/api-bson-generated/objectid.html#objectid-isvalid
 */
ObjectID.isValid = function(objectid) {
  if(!objectid) return false;

  //call .toString() to get the hex if we're
  // working with an instance of ObjectID
  return /^[0-9A-F]{24}$/i.test(objectid.toString());
};

/**
 * set a custom machineID
 * 
 * @param {String|Number} machineid Can be a string, hex-string or a number
 * @return {void}
 * @api public
 */
ObjectID.setMachineID = function(arg) {
  var machineID;

  if(typeof arg === "string") {
    // hex string
    machineID = parseInt(arg, 16);
   
    // any string
    if(isNaN(machineID)) {
      arg = ('000000' + arg).substr(-7,6);

      machineID = "";
      for(var i = 0;i<6; i++) {
        machineID += (arg.charCodeAt(i));
      }
    }
  }
  else if(/number|undefined/.test(typeof arg)) {
    machineID = arg | 0;
  }

  MACHINE_ID = (machineID & 0xFFFFFF);
}

/**
 * get the machineID
 * 
 * @return {number}
 * @api public
 */
ObjectID.getMachineID = function() {
  return MACHINE_ID;
}

ObjectID.prototype = {
  _bsontype: 'ObjectID',
  constructor: ObjectID,

  /**
   * Return the ObjectID id as a 24 byte hex string representation
   *
   * @return {String} return the 24 byte hex string representation.
   * @api public
   */
  toHexString: function() {
    return this.str;
  },

  /**
   * Compares the equality of this ObjectID with `otherID`.
   *
   * @param {Object} other ObjectID instance to compare against.
   * @return {Boolean} the result of comparing two ObjectID's
   * @api public
   */
  equals: function (other){
    return !!other && this.str === other.toString();
  },

  /**
   * Returns the generation date (accurate up to the second) that this ID was generated.
   *
   * @return {Date} the generation date
   * @api public
   */
  getTimestamp: function(){
    return new Date(parseInt(this.str.substr(0,8), 16) * 1000);
  }
};

function next() {
  return index = (index+1) % 0xFFFFFF;
}

function generate(time) {
  if (typeof time !== 'number')
    time = Date.now()/1000;

  //keep it in the ring!
  time = parseInt(time, 10) % 0xFFFFFFFF;

  //FFFFFFFF FFFFFF FFFF FFFFFF
  return hex(8,time) + hex(6,MACHINE_ID) + hex(4,pid) + hex(6,next());
}

function hex(length, n) {
  n = n.toString(16);
  return (n.length===length)? n : "00000000".substring(n.length, length) + n;
}

function buffer(str) {
  var i=0,out=[];

  if(str.length===24)
    for(;i<24; out.push(parseInt(str[i]+str[i+1], 16)),i+=2);

  else if(str.length===12)
    for(;i<12; out.push(str.charCodeAt(i)),i++);

  return out;
}

/**
 * Converts to a string representation of this Id.
 *
 * @return {String} return the 24 byte hex string representation.
 * @api private
 */
ObjectID.prototype.inspect = function() { return "ObjectID("+this+")" };
ObjectID.prototype.toJSON = ObjectID.prototype.toHexString;
ObjectID.prototype.toString = ObjectID.prototype.toHexString;

}).call(this,require('_process'))

},{"_process":2}],2:[function(require,module,exports){
// shim for using process in browser
var process = module.exports = {};

// cached from whatever global is present so that test runners that stub it
// don't break things.  But we need to wrap it in a try catch in case it is
// wrapped in strict mode code which doesn't define any globals.  It's inside a
// function because try/catches deoptimize in certain engines.

var cachedSetTimeout;
var cachedClearTimeout;

function defaultSetTimout() {
    throw new Error('setTimeout has not been defined');
}
function defaultClearTimeout () {
    throw new Error('clearTimeout has not been defined');
}
(function () {
    try {
        if (typeof setTimeout === 'function') {
            cachedSetTimeout = setTimeout;
        } else {
            cachedSetTimeout = defaultSetTimout;
        }
    } catch (e) {
        cachedSetTimeout = defaultSetTimout;
    }
    try {
        if (typeof clearTimeout === 'function') {
            cachedClearTimeout = clearTimeout;
        } else {
            cachedClearTimeout = defaultClearTimeout;
        }
    } catch (e) {
        cachedClearTimeout = defaultClearTimeout;
    }
} ())
function runTimeout(fun) {
    if (cachedSetTimeout === setTimeout) {
        //normal enviroments in sane situations
        return setTimeout(fun, 0);
    }
    // if setTimeout wasn't available but was latter defined
    if ((cachedSetTimeout === defaultSetTimout || !cachedSetTimeout) && setTimeout) {
        cachedSetTimeout = setTimeout;
        return setTimeout(fun, 0);
    }
    try {
        // when when somebody has screwed with setTimeout but no I.E. maddness
        return cachedSetTimeout(fun, 0);
    } catch(e){
        try {
            // When we are in I.E. but the script has been evaled so I.E. doesn't trust the global object when called normally
            return cachedSetTimeout.call(null, fun, 0);
        } catch(e){
            // same as above but when it's a version of I.E. that must have the global object for 'this', hopfully our context correct otherwise it will throw a global error
            return cachedSetTimeout.call(this, fun, 0);
        }
    }


}
function runClearTimeout(marker) {
    if (cachedClearTimeout === clearTimeout) {
        //normal enviroments in sane situations
        return clearTimeout(marker);
    }
    // if clearTimeout wasn't available but was latter defined
    if ((cachedClearTimeout === defaultClearTimeout || !cachedClearTimeout) && clearTimeout) {
        cachedClearTimeout = clearTimeout;
        return clearTimeout(marker);
    }
    try {
        // when when somebody has screwed with setTimeout but no I.E. maddness
        return cachedClearTimeout(marker);
    } catch (e){
        try {
            // When we are in I.E. but the script has been evaled so I.E. doesn't  trust the global object when called normally
            return cachedClearTimeout.call(null, marker);
        } catch (e){
            // same as above but when it's a version of I.E. that must have the global object for 'this', hopfully our context correct otherwise it will throw a global error.
            // Some versions of I.E. have different rules for clearTimeout vs setTimeout
            return cachedClearTimeout.call(this, marker);
        }
    }



}
var queue = [];
var draining = false;
var currentQueue;
var queueIndex = -1;

function cleanUpNextTick() {
    if (!draining || !currentQueue) {
        return;
    }
    draining = false;
    if (currentQueue.length) {
        queue = currentQueue.concat(queue);
    } else {
        queueIndex = -1;
    }
    if (queue.length) {
        drainQueue();
    }
}

function drainQueue() {
    if (draining) {
        return;
    }
    var timeout = runTimeout(cleanUpNextTick);
    draining = true;

    var len = queue.length;
    while(len) {
        currentQueue = queue;
        queue = [];
        while (++queueIndex < len) {
            if (currentQueue) {
                currentQueue[queueIndex].run();
            }
        }
        queueIndex = -1;
        len = queue.length;
    }
    currentQueue = null;
    draining = false;
    runClearTimeout(timeout);
}

process.nextTick = function (fun) {
    var args = new Array(arguments.length - 1);
    if (arguments.length > 1) {
        for (var i = 1; i < arguments.length; i++) {
            args[i - 1] = arguments[i];
        }
    }
    queue.push(new Item(fun, args));
    if (queue.length === 1 && !draining) {
        runTimeout(drainQueue);
    }
};

// v8 likes predictible objects
function Item(fun, array) {
    this.fun = fun;
    this.array = array;
}
Item.prototype.run = function () {
    this.fun.apply(null, this.array);
};
process.title = 'browser';
process.browser = true;
process.env = {};
process.argv = [];
process.version = ''; // empty string to avoid regexp issues
process.versions = {};

function noop() {}

process.on = noop;
process.addListener = noop;
process.once = noop;
process.off = noop;
process.removeListener = noop;
process.removeAllListeners = noop;
process.emit = noop;
process.prependListener = noop;
process.prependOnceListener = noop;

process.listeners = function (name) { return [] }

process.binding = function (name) {
    throw new Error('process.binding is not supported');
};

process.cwd = function () { return '/' };
process.chdir = function (dir) {
    throw new Error('process.chdir is not supported');
};
process.umask = function() { return 0; };

},{}],3:[function(require,module,exports){
/* global exports */
/**
 * @fileoverview a tiny library for Web Worker Remote Method Invocation
 *
 */
const ObjectID = require('bson-objectid');

/**
 * @private returns a list of Transferable objects which {@code obj} includes
 * @param {object} obj any object
 * @param {Array} list for internal recursion only
 * @return {List} a list of Transferable objects
 */
function getTransferList(obj, list = []) {
    if (ArrayBuffer.isView(obj)) {
        list.push(obj.buffer);
        return list;
    }
    if (isTransferable(obj)) {
        list.push(obj);
        return list;
    }
    if (!(typeof obj === 'object')) {
        return list;
    }
    for (const prop in obj) {
        if (obj.hasOwnProperty(prop)) {
            getTransferList(obj[prop], list);
        }
    }
    return list;
}

/**
 * @private checks if {@code obj} is Transferable or not.
 * @param {object} obj any object
 * @return {boolean}
 */
function isTransferable(obj) {
    const transferable = [ArrayBuffer];
    if (typeof MessagePort !== 'undefined') {
        transferable.push(MessagePort);
    }
    if (typeof ImageBitmap !== 'undefined') {
        transferable.push(ImageBitmap);
    }
    return transferable.some(e => obj instanceof e);
}

/**
 * @class base class whose child classes use RMI
 */
class WorkerRMI {
    /**
     * @constructor
     * @param {object} remote an instance to call postMessage method
     * @param {Array} args arguments to be passed to server-side instance
     */
    constructor(remote, ...args) {
        this.remote = remote;
        this.id = ObjectID().toString();
        this.methodStates = {};
        this.remote.addEventListener('message', event => {
            const data = event.data;
            if (data.id === this.id) {
                this.returnHandler(data);
            }
        }, false);
        this.constructorPromise = this.invokeRM(this.constructor.name, args);
    }

    /**
     * invokes remote method
     * @param {string} methodName Method name
     * @param {Array} args arguments to be passed to server-side instance
     * @return {Promise}
     */
    invokeRM(methodName, args = []) {
        if (!this.methodStates[methodName]) {
            this.methodStates[methodName] = {
                num: 0,
                resolveRejects: {}
            };
        }
        return new Promise((resolve, reject) => {
            const methodState = this.methodStates[methodName];
            methodState.num += 1;
            methodState.resolveRejects[methodState.num] = { resolve, reject };
            this.remote.postMessage({
                id: this.id,
                methodName,
                num: methodState.num,
                args
            }, getTransferList(args));
        });
    }

    /**
     * @private handles correspondent 'message' event
     * @param {obj} data data property of 'message' event
     */
    returnHandler(data) {
        const resolveRejects = this.methodStates[data.methodName].resolveRejects;
        if (data.error) {
            resolveRejects[data.num].reject(data.error);
        } else {
            resolveRejects[data.num].resolve(data.result);
        }
        delete resolveRejects[data.num];
    }
}


/**
 * @private executes a method on server and post a result as message.
 * @param {obj} event 'message' event
 */
async function handleWorkerRMI(event) {
    const data = event.data;
    const message = {
        id: data.id,
        methodName: data.methodName,
        num: data.num,
    };
    let result;
    if (data.methodName === this.name) {
        this.workerRMI.instances[data.id] = new this(...data.args);
        message.result = null;
        this.workerRMI.target.postMessage(message, getTransferList(result));
    } else {
        const instance = this.workerRMI.instances[data.id];
        if (instance) {
            try {
                result = await instance[data.methodName].apply(instance, data.args)
                message.result = result;
                this.workerRMI.target.postMessage(message, getTransferList(result));
            } catch (e) {
                message.error = e.toString();
                this.workerRMI.target.postMessage(message);
            }
        }
    }
}

/**
 * registers a class as an executer of RMI on server
 * @param {obj} target an instance that receives 'message' events of RMI
 * @param {Class} klass a class to be registered
 */
function resigterWorkerRMI(target, klass) {
    klass.workerRMI = {
        target,
        instances: {},
        handler: handleWorkerRMI.bind(klass)
    }
    target.addEventListener('message', klass.workerRMI.handler);
}

/**
 * unresigters a class registered by registerWorkerRMI
 * @param {obj} target an instance that receives 'message' events of RMI
 * @param {Class} klass a class to be unregistered
 */
function unresigterWorkerRMI(target, klass) {
    target.removeEventListener('message', klass.workerRMI.handler)
    delete klass.workerRMI;
}

exports.WorkerRMI = WorkerRMI;
exports.resigterWorkerRMI = resigterWorkerRMI;
exports.unresigterWorkerRMI = unresigterWorkerRMI;

},{"bson-objectid":1}],4:[function(require,module,exports){
'use strict';

Object.defineProperty(exports, "__esModule", {
    value: true
});
exports.AZjsEngine = undefined;

var _workerRmi = require('worker-rmi');

var _neural_network = require('./neural_network.js');

// 思考エンジンAZjsEngineの本体をウェブワーカーとして動かします。
/**
 * @file 思考エンジンAZjsEngineのRMI版です。ドキュメントは本体側のコードを参照してください。
 */
/*
 * @author 市川雄二
 * @copyright 2018 ICHIKAWA, Yuji (New 3 Rs)
 * @license MIT
 */
const worker = new Worker('js/az-worker.js');
// ニューラルネットワークをメインスレッドで動かすように登録します。
// WebGL/WebGPUがメインスレッドのみで動作するからです。
// 実際の呼び出しは上記ワーカがします。
(0, _workerRmi.resigterWorkerRMI)(worker, _neural_network.NeuralNetwork);

/**
 * 思考エンジンAZjsEngineのRMI版です。ドキュメントは本体側のコードを参照してください。
 * @alias AZjsEngineRMI
 * @see AZjsEngine
 */
class AZjsEngine extends _workerRmi.WorkerRMI {
    /**
     * 碁盤サイズsizeの思考エンジンを返します。
     * @param {Integer} size 
     */
    constructor(size) {
        super(worker, size);
    }

    /** */
    async loadNN() {
        await this.invokeRM('loadNN');
    }

    /** */
    async clear() {
        await this.stop();
        await this.invokeRM('clear');
    }

    /**
     * timeSettingsのRMIです。
     * mainTimeとbyoyomiの取得でRMIを避けるため、設定値をこちらでも保持します。
     * @param {number} mainTime 
     * @param {number} byoyomi 
     */
    async timeSettings(mainTime, byoyomi) {
        this.mainTime = mainTime;
        this.byoyomi = byoyomi;
        await this.invokeRM('timeSettings', [mainTime, byoyomi]);
    }

    async genmove() {
        return await this.invokeRM('genmove');
    }

    async play(x, y) {
        await this.invokeRM('play', [x, y]);
    }

    async pass() {
        await this.invokeRM('pass');
    }

    async search() {
        return await this.invokeRM('search');
    }

    async finalScore() {
        return await this.invokeRM('finalScore');
    }

    async ponder() {
        return await this.invokeRM('ponder');
    }

    async stop() {
        await this.invokeRM('stop');
    }

    async timeLeft() {
        return await this.invokeRM('timeLeft');
    }
}
exports.AZjsEngine = AZjsEngine;
},{"./neural_network.js":7,"worker-rmi":3}],5:[function(require,module,exports){
'use strict';

Object.defineProperty(exports, "__esModule", {
    value: true
});
/**
 * @file MVCのコントローラのオブザーバークラスです。
 */
/*
 * @author 市川雄二
 * @copyright 2017 ICHIKAWA, Yuji (New 3 Rs)
 * @license MIT
 */
/* global JGO:false, WAudio:false */

const stoneSound = new WAudio('audio/go-piece1.mp3');

/**
 *  jGoBoardのためのコントローラです。 
 * @see {@link https://github.com/jokkebk/jgoboard}
 */
class BoardController {
    /**
     * jGoBoardを生成し、描画が終わったらcallbackを呼び出します。
     * @param {Integer} boardSize 
     * @param {Integer} handicap 
     * @param {number} komi 
     * @param {Function} callback 
     */
    constructor(boardSize, handicap, komi, callback) {
        this.id = 'board';
        this.ownColor = JGO.BLACK; // ownColorはGUIを使用する側
        this.turn = JGO.BLACK;
        this.jrecord = null;
        this.jboard = null;
        this.ko = false;
        this.lastHover = null;
        this.lastMove = null;
        this.observers = [];
        this.passNum = 0;

        this.jrecord = JGO.sgf.load(`(;SZ[${boardSize}]KM[${komi}])`, false);
        this.jboard = this.jrecord.getBoard();
        if (handicap >= 2) {
            const stones = JGO.util.getHandicapCoordinates(this.jboard.width, handicap);
            this.jboard.setType(stones, JGO.BLACK);
            this.turn = JGO.WHITE;
        }

        const options = { stars: { points: 9 } };
        JGO.util.extend(options, JGO.BOARD.large);
        const jsetup = new JGO.Setup(this.jboard, options);
        jsetup.setOptions({ coordinates: {
                top: false,
                bottom: false,
                left: false,
                right: false
            } });

        jsetup.create(this.id, canvas => {
            canvas.addListener('click', this.clickHander.bind(this));
            canvas.addListener('mousemove', this.moveHandler.bind(this));
            canvas.addListener('mouseout', this.leaveHandler.bind(this));
            canvas.addListener('mousedown', this.downHandler.bind(this));
            callback(this);
        });
    }

    /**
     * 関連のオブザーバーやDOMを破棄します。 
     */
    destroy() {
        this.removeObservers();
        const dom = document.getElementById(this.id);
        while (dom.firstChild) {
            dom.removeChild(dom.firstChild);
        }
    }

    /**
     * GUIを使用する側の石の色を設定します。
     */
    setOwnColor(color) {
        this.ownColor = color;
    }

    /**
     * コミを設定します。
     * @param {*} komi 
     */
    setKomi(komi) {
        const node = this.jrecord.getRootNode();
        node.info.komi = komi.toString();
    }

    /**
     * オブザーバーを追加し、オブザーバーのupdateを呼び出します。
     * @param {*} observer 引数にcoordを受け取るupdateメソッドを持つオブジェクト。
     */
    addObserver(observer) {
        this.observers.push(observer);
        observer.update();
    }

    /**
     * 全オブザーバーを削除します。
     */
    removeObservers() {
        this.observers = [];
    }

    /**
     * jGoBoardが更新されたときに呼び出されるメソッドです。
     * @private
     * @param {*} coord 
     */
    update(coord) {
        const node = this.jrecord.getCurrentNode();
        document.getElementById('opponent-captures').innerText = node.info.captures[this.ownColor === JGO.BLACK ? JGO.WHITE : JGO.BLACK];
        document.getElementById('own-captures').innerText = node.info.captures[this.ownColor];
        setTimeout(() => {
            this.observers.forEach(function (observer) {
                observer.update(coord);
            });
        }, 10); // 0ではjGoBoardのレンダリングが終わっていないので、10にしました。
    }

    /**
     * 着手します。
     * @param {JGO.Coordinate} coord 
     * @param {bool} sound 
     */
    play(coord, sound = false) {
        const play = this.jboard.playMove(coord, this.turn, this.ko);
        if (!play.success) {
            console.log(coord, play);
            return play.success;
        }
        const node = this.jrecord.createNode(false);
        // tally captures
        node.info.captures[this.turn] += play.captures.length;
        if (coord) {
            // play stone
            node.setType(coord, this.turn);
            node.setMark(coord, JGO.MARK.CIRCLE); // mark move
            // clear opponent's stones
            node.setType(play.captures, JGO.CLEAR);
        }
        if (this.lastMove) {
            node.setMark(this.lastMove, JGO.MARK.NONE); // clear previous mark
        }
        if (this.ko) {
            node.setMark(this.ko, JGO.MARK.NONE); // clear previous ko mark
        }
        this.lastMove = coord;
        if (play.ko) {
            node.setMark(play.ko, JGO.MARK.CIRCLE); // mark ko, too
        }
        this.ko = play.ko;
        this.turn = this.turn === JGO.BLACK ? JGO.WHITE : JGO.BLACK;
        if (coord == null) {
            this.passNum += 1;
            this.update(this.passNum < 2 ? 'pass' : 'end');
        } else {
            this.passNum = 0;
            this.update(coord);
            if (sound) {
                stoneSound.play();
            }
        }
        return play.success;
    }

    /**
     * @private
     * @param {JGO.Coordinate} coord 
     * @param {Event} ev 
     */
    clickHander(coord, ev) {
        // clear hover away - it'll be replaced or
        // then it will be an illegal move in any case
        // so no need to worry about putting it back afterwards
        if (this.ownColor !== this.turn) {
            return;
        }
        if (this.lastHover != null) {
            this.jboard.setType(this.lastHover, JGO.CLEAR);
            this.lastHover = null;
        }
        if (coord.i >= 0 && coord.i < this.jboard.width && coord.j >= 0 && coord.j < this.jboard.height) {
            this.play(coord);
        }
    }

    /**
     * @private
     * @param {JGO.Coordinate} coord 
     * @param {Event} ev 
     */
    moveHandler(coord, ev) {
        if (this.ownColor !== this.turn) {
            return;
        }
        if (this.lastHover && this.lastHover.equals(coord)) {
            return;
        }

        if (this.lastHover != null) {
            // clear previous hover if there was one
            this.jboard.setType(this.lastHover, JGO.CLEAR);
        }

        if (coord.i <= -1 || coord.j <= -1 || coord.i >= this.jboard.width || coord.j >= this.jboard.height) {
            this.lastHover = null;
        } else if (this.jboard.getType(coord) === JGO.CLEAR && this.jboard.getMark(coord) == JGO.MARK.NONE) {
            this.jboard.setType(coord, this.turn == JGO.BLACK ? JGO.DIM_BLACK : JGO.DIM_WHITE);
            this.lastHover = coord;
        } else {
            this.lastHover = null;
        }
    }

    /**
     * @private
     * @param {Event} ev 
     */
    leaveHandler(ev) {
        if (this.lastHover != null) {
            this.jboard.setType(this.lastHover, JGO.CLEAR);
            this.lastHover = null;
        }
    }

    /**
     * クリックではなくてダウン/タッチで石音を立てたいのでここで処理しています。
     * @private
     * @param {Event} ev 
     */
    downHandler(ev) {
        if (this.ownColor === this.turn) {
            stoneSound.play();
        }
    }
}
exports.BoardController = BoardController;
},{}],6:[function(require,module,exports){
'use strict';

var _speech = require('./speech.js');

var _azjs_engine_client = require('./azjs_engine_client.js');

var _board_controller = require('./board_controller.js');

var _play_controller = require('./play_controller.js');

/**
 * 指定された碁盤サイズとエンジンで対局を繰り返します。
 * 手番と持ち時間は対極の都度受け付けます。
 * @param {Integer} size 
 * @param {AZjsEngine} engine 
 */
/**
 * @file アプリのエントリーポイントです。
 */
/*
 * @author 市川雄二
 * @copyright 2018 ICHIKAWA, Yuji (New 3 Rs)
 * @license MIT
 */
/* global $ JGO i18n */
async function startGame(size, engine) {
    const controller = await new Promise(function (res, rej) {
        new _board_controller.BoardController(size, 0, 7.5, res);
    });
    const $startModal = $('#start-modal');
    $startModal.modal('show');
    // ユーザーが手番と持ち時間を決める間にニューラルネットワークのウェイトをダウンロードします。
    try {
        await engine.loadNN(); // 一度だけダウンロードし、次回は再利用します。
        $('#loading-message').text(i18n.finishDownload);
        $('#start-game').prop('disabled', false);
    } catch (e) {
        if (e === 'Error: No backend is available') {
            if (/(Mac OS X 10_13|(iPad|iPhone|iPod); CPU OS 11).*Safari/.test(navigator.userAgent) && !/Chrome/.test(navigator.userAgent)) {
                (0, _speech.i18nSpeak)(i18n.notSupport + i18n.safariWithoutWebgpu);
            } else if (!(0, _speech.i18nSpeak)(i18n.notSupport)) {
                alert(i18n.notSupport);
            }
        } else {
            console.error(e);
        }
        return;
    }
    const condition = await new Promise(function (res, rej) {
        const $conditionForm = $('#condition-form');
        $conditionForm.one('submit', function (e) {
            e.preventDefault();
            $startModal.one('hidden.bs.modal', function (e) {
                res({
                    color: $conditionForm[0]['color'].value,
                    timeRule: $conditionForm[0]['time'].value,
                    time: parseInt($conditionForm[0]['ai-byoyomi'].value)
                });
            });
            $startModal.modal('hide');
        });
    });
    let mainTime;
    let byoyomi;
    switch (condition.timeRule) {
        case 'ai-time':
            mainTime = 0;
            byoyomi = condition.time;
            await engine.timeSettings(0, byoyomi);
            break;
        case 'igo-quest':
            switch (size) {
                case 9:
                    mainTime = 3 * 60;
                    byoyomi = 1;
                    break;
                case 19:
                    mainTime = 7 * 60;
                    byoyomi = 3;
                    break;
                default:
                    throw new Error('size is not supported');
            }
            await engine.timeSettings(mainTime, byoyomi);
            break;
    }
    if (condition.color === 'W') {
        controller.setOwnColor(JGO.WHITE);
        if (controller.jboard.width === 9) {
            controller.setKomi(5.5);
        }
    } else if (condition.color === 'B') {
        controller.setOwnColor(JGO.BLACK);
        if (controller.jboard.width === 9) {
            controller.setKomi(6.5);
        }
    }
    const isSelfPlay = condition.color === 'self-play';
    const observer = new _play_controller.PlayController(engine, controller, mainTime, byoyomi, condition.timeRule === 'igo-quest', isSelfPlay);
    if (!isSelfPlay) {
        (0, _speech.i18nSpeak)(i18n.startGreet);
    }
    observer.setIsSelfPlay(isSelfPlay);
    controller.addObserver(observer);
    $('#pass').on('click', function (event) {
        observer.pass();
    });
    $('#resign').one('click', async function (event) {
        observer.clearTimer();
        await engine.stop();
        (0, _speech.i18nSpeak)(i18n.endGreet);
        $(document.body).addClass('end');
    });
    $('#retry').one('click', async function (event) {
        $('#pass').off('click');
        $('#resign').off('click');
        controller.destroy();
        engine.clear();
        $(document.body).removeClass('end');
        setTimeout(async function () {
            await startGame(size, engine);
        }, 0);
    });
}

/**
 * 碁盤サイズを受け付け、エンジンを生成し、対局を開始します。
 * 碁盤サイズとエンジンは再対局の際に再利用します。
 */
async function main() {
    const $sizeModal = $('#size-modal');
    $sizeModal.modal('show');
    const size = await new Promise(function (res, rej) {
        $('.button-size').one('click', function (e) {
            res(parseInt(e.currentTarget.dataset.value));
        });
    });
    switch (size) {
        case 9:
            $('#size-9-rule').show();
            break;
        default:
            $('#size-19-rule').show();
    }
    const engine = new _azjs_engine_client.AZjsEngine(size);
    await startGame(size, engine);
}

main();
},{"./azjs_engine_client.js":4,"./board_controller.js":5,"./play_controller.js":8,"./speech.js":9}],7:[function(require,module,exports){
'use strict';

Object.defineProperty(exports, "__esModule", {
    value: true
});
exports.NeuralNetwork = undefined;

var _utils = require('./utils.js');

/* sliceのpolyfill */
if (!ArrayBuffer.prototype.slice) {
    ArrayBuffer.prototype.slice = function (start, end) {
        var that = new Uint8Array(this);
        if (end == undefined) end = that.length;
        var result = new ArrayBuffer(end - start);
        var resultArray = new Uint8Array(result);
        for (var i = 0; i < resultArray.length; i++) resultArray[i] = that[i + start];
        return result;
    };
}

/**
 * ウェイトをロードする際のプログレスバーを更新します。
 * @param {number} percentage 
 */
/**
 * @file ニューラルネットワークを計算するクラスです。
 */
/*
 * @author 市川雄二
 * @copyright 2018 ICHIKAWA, Yuji (New 3 Rs)
 * @license MIT
 */
/* global WebDNN $ */
function setLoadingBar(percentage) {
    const $loadingBar = $('#loading-bar');
    $loadingBar.attr('aria-valuenow', percentage);
    $loadingBar.css('width', percentage.toString() + '%');
}

/** ニューラルネットワークを計算するクラス(WebDNNのDescriptorRunnerのラッパークラス) */
class NeuralNetwork {
    constructor() {
        this.version = 1;
        this.nn = null;
    }

    /**
     * ウェイトファイルをダウンロードします。
     * @param {string} path WebDNNデータのURL
     * @param {Integer} version Leela Zeroのウェイトフォーマット番号
     */
    async load(path, version = 1) {
        this.version = version;
        if (this.nn) {
            setLoadingBar(100);
            return;
        }
        const options = {
            backendOrder: ['webgpu', 'webgl'],
            progressCallback: function (loaded, total) {
                setLoadingBar(loaded / total * 100);
            }
        };
        setLoadingBar(0);
        this.nn = await WebDNN.load(path, options);
        setLoadingBar(100); // progressCallbackがコールさえないパターンがあるので完了時にコールします。
    }

    /**
     * ニューラルネットワークを評価した結果を返します。
     * @param {Array} inputs 
     * @returns {Array}
     */
    async evaluate(...inputs) {
        const views = this.nn.getInputViews();
        for (let i = 0; i < inputs.length; i++) {
            views[i].set(inputs[i]);
        }
        await this.nn.run();
        const result = this.nn.getOutputViews().map(e => e.toActual());
        result[0] = (0, _utils.softmax)(result[0]);
        result[1] = result[1].slice(0); // to.ActualそのものではpostMessageでdetachができないのでコピーする。
        if (this.version === 2 && inputs[0][inputs[0].length - 1] === 1.0) {
            result[1][0] = -result[1][0];
        }
        return result;
    }
}
exports.NeuralNetwork = NeuralNetwork;
},{"./utils.js":10}],8:[function(require,module,exports){
'use strict';

Object.defineProperty(exports, "__esModule", {
    value: true
});
exports.PlayController = undefined;

var _speech = require('./speech.js');

/**
 * MVCのコントローラのオブザーバークラスです。
 * 思考エンジンの起動と着手、クロック更新、終局処理をします。
 */
class PlayController {
    /**
     * @param {AZjsEngine} engine 
     * @param {BoardController} controller 
     * @param {number} mainTime 
     * @param {number} byoyomi 
     * @param {bool} fisherRule 
     * @param {bool} isSelfPlay 
     */
    constructor(engine, controller, mainTime, byoyomi, fisherRule, isSelfPlay) {
        this.engine = engine;
        this.controller = controller;
        this.isSelfPlay = isSelfPlay;
        this.byoyomi = byoyomi;
        this.fisherRule = fisherRule;
        this.isFirstMove = true;
        if (this.fisherRule) {
            this.timeLeft = [0, // dumy
            mainTime * 1000, // black
            mainTime * 1000];
            this.start = Date.now();
            this.timer = setInterval(() => {
                const start = Date.now();
                this.timeLeft[this.controller.turn] -= start - this.start;
                this.start = start;
                if (this.isSelfPlay) {
                    // AIのセルフプレイの時には右の情報(時計、アゲハマ)が黒、左の情報(時計、アゲハマ)が白です。
                    $(this.controller.turn === JGO.BLACK ? '#right-clock' : '#left-clock').text(Math.ceil(this.timeLeft[this.controller.turn] / 1000));
                } else {
                    // ユーザーとAIの対戦の時には右の情報(時計、アゲハマ)がユーザー、左の情報(時計、アゲハマ)がAIです。
                    if (this.controller.ownColor === this.controller.turn) {
                        $('#right-clock').text(Math.ceil(this.timeLeft[this.controller.turn] / 1000));
                    } else {
                        $('#left-clock').text(Math.ceil(this.timeLeft[JGO.opponentOf(this.controller.turn)] / 1000));
                    }
                }
                if (this.timeLeft[this.controller.turn] < 0) {
                    clearInterval(this.timer);
                    this.timer = null;
                    this.engine.stop();
                    alert(i18n.timeout);
                }
            }, 100);
        } else {
            this.timeLeft = [0, // dumy
            this.isSelfPlay || this.controller.ownColor !== JGO.BLACK ? this.engine.byoyomi * 1000 : Infinity, // black
            this.isSelfPlay || this.controller.ownColor !== JGO.WHITE ? this.engine.byoyomi * 1000 : Infinity];
            this.start = Date.now();
            this.timer = setInterval(() => {
                const start = Date.now();
                this.timeLeft[this.controller.turn] -= start - this.start;
                this.start = start;
                let clock;
                if (this.isSelfPlay) {
                    clock = this.controller.turn === JGO.BLACK ? '#right-clock' : '#left-clock';
                } else {
                    clock = this.controller.turn === this.controller.ownColor ? '#right-clock' : '#left-clock';
                }
                $(clock).text(Math.ceil(this.timeLeft[this.controller.turn] / 1000));
            }, 100);
        }
        if (this.isSelfPlay) {
            $('#right-clock').text(Math.ceil(this.timeLeft[JGO.BLACK] / 1000));
            $('#left-clock').text(Math.ceil(this.timeLeft[JGO.WHITE] / 1000));
        } else {
            $('#right-clock').text(Math.ceil(this.timeLeft[this.controller.ownColor] / 1000));
            $('#left-clock').text(Math.ceil(this.timeLeft[JGO.opponentOf(this.controller.ownColor)] / 1000));
        }
    }

    clearTimer() {
        if (this.timer) {
            clearInterval(this.timer);
            this.timer = null;
        }
    }

    /**
     * AI同士のセルフプレイかどうかを設定します。
     * @param {*} isSelfPlay 
     */
    setIsSelfPlay(isSelfPlay) {
        this.isSelfPlay = isSelfPlay;
    }

    /**
     * 終局処理
     * @private
     */
    async endGame() {
        (0, _speech.i18nSpeak)(i18n.scoring);
        try {
            const score = await this.finalScore();
            let message;
            if (score === 0) {
                message = i18n.jigo;
            } else {
                message = i18n[score > 0 ? 'black' : 'white'];
                switch (i18n.lang) {
                    case 'en':
                        message += ` won by ${score} points`;
                        break;
                    case 'ja':
                        {
                            const absScore = Math.abs(score);
                            message += absScore < 1 ? '半目勝ち' : Math.floor(absScore) + '目半勝ち';
                        }
                        break;
                }
            }
            switch (i18n.lang) {
                case 'en':
                    message += '?';
                    break;
                case 'ja':
                    message += 'ですか？';
                    break;
            }
            (0, _speech.i18nSpeak)(message.replace('半', 'はん'));
            setTimeout(function () {
                alert(message);
                $(document.body).addClass('end');
            }, 3000);
        } catch (e) {
            console.log(e);
            (0, _speech.i18nSpeak)(i18n.failScoring);
        }
    }

    updateClock() {
        if (this.fisherRule) {
            const played = JGO.opponentOf(this.controller.turn);
            const $playedTimer = $(this.isSelfPlay ? this.controller.turn === JGO.BLACK ? '#right-clock' : '#left-clock' : played === this.controller.ownColor ? '#right-clock' : '#left-clock');
            $playedTimer.text(`${Math.ceil(this.timeLeft[played] / 1000)}+${this.byoyomi}`);
            this.timeLeft[played] += this.byoyomi * 1000;
            setTimeout(() => {
                $playedTimer.text(Math.ceil(this.timeLeft[played] / 1000));
            }, 2000);
        } else {
            if (this.isSelfPlay) {
                const played = JGO.opponentOf(this.controller.turn);
                this.timeLeft[played] = this.engine.byoyomi * 1000;
                $(played === JGO.BLACK ? '#right-clock' : '#left-clock').text(Math.ceil(this.timeLeft[played] / 1000));
            } else if (this.controller.turn === this.controller.ownColor) {
                this.timeLeft[JGO.opponentOf(this.controller.turn)] = this.engine.byoyomi * 1000;
                $('#left-clock').text(Math.ceil(this.timeLeft[JGO.opponentOf(this.controller.turn)] / 1000));
            }
        }
    }

    async updateEngine(coord) {
        if (!this.isSelfPlay && typeof coord === 'object') {
            await this.engine.stop();
            await this.engine.play(coord.i + 1, this.controller.jboard.height - coord.j);
        }
    }

    async enginePlay() {
        const move = await this.engine.genmove();
        if (!this.timer) {
            return; // 時間切れもしくは相手の投了
        }
        switch (move) {
            case 'resign':
                this.clearTimer();
                (0, _speech.i18nSpeak)(i18n.resign);
                $(document.body).addClass('end');
                break;
            case 'pass':
                this.controller.play(null);
                (0, _speech.i18nSpeak)(i18n.pass);
                break;
            default:
                this.controller.play(new JGO.Coordinate(move[0] - 1, this.controller.jboard.height - move[1]), true);
        }
        if (this.fisherRule) {
            await this.engine.timeSettings(this.timeLeft[JGO.opponentOf(this.controller.turn)] / 1000, this.byoyomi);
        }
    }

    /**
     * BoardControllerのオブザーバーになるためのメソッド
     * @param {JGO.Coordinate} coord 
     */
    async update(coord) {
        if (coord === 'end') {
            this.clearTimer();
            await this.endGame();
            return;
        }
        if (!this.isFirstMove) {
            this.updateClock();
        } else {
            this.isFirstMove = false;
        }
        this.coord = coord; // ポンダーと一致するか確認するために直前の座標を保存。
        await this.updateEngine(coord);
        if (this.isSelfPlay || this.controller.turn !== this.controller.ownColor) {
            setTimeout(async () => {
                try {
                    await this.enginePlay();
                } catch (e) {
                    console.error(e);
                }
            }, 0);
        } else {
            const [x, y] = await this.engine.ponder();
            // ponderが終了するときには次の着手が打たれていて、this.coordに保存されている。
            if (x === this.coord.i + 1 && y === this.controller.jboard.height - this.coord.j) {
                const $thumbsUp = $('#thumbs-up');
                $thumbsUp.text(parseInt($thumbsUp.text()) + 1);
            }
        }
    }

    async pass() {
        if (!this.isSelfPlay && this.controller.ownColor === this.controller.turn) {
            await this.engine.stop();
            this.engine.pass();
            this.controller.play(null);
        }
    }

    async finalScore() {
        const result = await $.post({
            url: 'https://mimiaka-python.herokuapp.com/gnugo', // httpでは通信できなかった。 'http://35.203.161.100/gnugo',
            data: {
                sgf: this.controller.jrecord.toSgf(),
                move: 'est',
                method: 'aftermath',
                rule: this.controller.jrecord.getRootNode().info.komi === '6.5' ? 'japanese' : 'chinese'
            }
        });
        if (/Jigo/.test(result)) {
            return 0;
        }
        const match = result.match(/(Black|White) wins by ([0-9.]+) points/);
        if (match) {
            let score = parseFloat(match[2]);
            if (match[1] === 'Black') {
                return score;
            } else {
                return -score;
            }
        } else {
            return null;
        }
    }
}
exports.PlayController = PlayController; /**
                                          * @file MVCのコントローラのオブザーバークラスです。
                                          */
/*
 * @author 市川雄二
 * @copyright 2018 ICHIKAWA, Yuji (New 3 Rs)
 * @license MIT
 */
/* global $ JGO i18n */
},{"./speech.js":9}],9:[function(require,module,exports){
'use strict';

Object.defineProperty(exports, "__esModule", {
    value: true
});
exports.speak = speak;
exports.i18nSpeak = i18nSpeak;
/**
 * @file 音声合成のラッパー関数群です。
 */
/*
 * @author 市川雄二
 * @copyright 2017 ICHIKAWA, Yuji (New 3 Rs)
 * @license MIT
 */
/* global i18n */

/**
 * @param {string} text
 * @param {string} lang
 * @param {string} gender
 */
function speak(text, lang, gender) {
    if (!SpeechSynthesisUtterance) return false;

    switch (lang) {
        case 'en':
            lang = 'en-us';
            break;
        case 'ja':
            lang = 'ja-jp';
            break;
    }
    const utterance = new SpeechSynthesisUtterance(text);
    if (/(iPhone|iPad|iPod)(?=.*OS [7-8])/.test(navigator.userAgent)) utterance.rate = 0.2;
    const voices = speechSynthesis.getVoices().filter(e => e.lang.toLowerCase() === lang);
    let voice = null;
    if (voices.length > 1) {
        let names = null;
        switch (lang) {
            case 'ja-jp':
                switch (gender) {
                    case 'male':
                        names = ['Otoya', 'Hattori', 'Ichiro'];
                        break;
                    case 'female':
                        names = ['O-ren（拡張）', 'O-ren', 'Kyoko', 'Haruka']; // Windows 10のAyumiの声は今ひとつ
                        break;
                }
                break;
            case 'en-us':
                switch (gender) {
                    case 'male':
                        names = ['Alex', 'Fred'];
                        break;
                    case 'female':
                        names = ['Samantha', 'Victoria'];
                        break;
                }
                break;
        }
        if (names) {
            voice = voices.filter(v => names.some(n => v.name.indexOf(n) >= 0))[0];
        }
        if (!voice) {
            voice = voices.filter(v => v.gender && v.gender.toLowerCase() === gender)[0];
        }
    }
    utterance.voice = voice || voices[0];
    // iOS 10 Safari has a bug that utterance.voice is no effect.
    utterance.volume = parseFloat(localStorage.getItem('volume') || '1.0');
    speechSynthesis.speak(utterance);
    return true;
}

/**
 * @private
 */
function unlock() {
    window.removeEventListener('click', unlock);
    speechSynthesis.speak(new SpeechSynthesisUtterance(''));
}

/**
 * 
 * @param {string} message 
 */
function i18nSpeak(message) {
    return speak(message, i18n.lang, 'female');
}

window.addEventListener('load', function (event) {
    if (speechSynthesis) {
        speechSynthesis.getVoices();
        if (speechSynthesis.onvoiceschanged !== undefined) {
            speechSynthesis.onvoiceschanged = function () {
                console.log('onvoiceschanged');
            };
        }
        window.addEventListener('click', unlock, false); // for iOS
    }
});
},{}],10:[function(require,module,exports){
'use strict';

Object.defineProperty(exports, "__esModule", {
    value: true
});
exports.shuffle = shuffle;
exports.mostCommon = mostCommon;
exports.argsort = argsort;
exports.argmax = argmax;
exports.hash = hash;
exports.softmax = softmax;
exports.printProb = printProb;
/**
 * @file 各種ユーティリティ関数群です。
 */
/*
 * @author 市川雄二
 * @copyright 2018 ICHIKAWA, Yuji (New 3 Rs)
 * @license MIT
 */

/**
 * @param {Array} array
 */
function shuffle(array) {
    let n = array.length;
    let t;
    let i;

    while (n) {
        i = Math.floor(Math.random() * n--);
        t = array[n];
        array[n] = array[i];
        array[i] = t;
    }

    return array;
}

/**
 * arrayの中の最頻出要素を返します。
 * @param {Array} array 
 */
function mostCommon(array) {
    const map = new Map();
    for (let i = 0; i < array.length; i++) {
        const e = array[i];
        if (map.has(e)) {
            map.set(e, map.get(e) + 1);
        } else {
            map.set(e, 1);
        }
    }
    let maxKey;
    let maxValue = -1;
    for (const [key, value] of map.entries()) {
        if (value > maxValue) {
            maxKey = key;
            maxValue = value;
        }
    }
    return maxKey;
}

/** arrayをソートした時のインデックス配列を返します。
 * @param {number[]} array 
 * @param {bool} reverse 
 */
function argsort(array, reverse) {
    const en = Array.from(array).map((e, i) => [i, e]);
    en.sort((a, b) => reverse ? b[1] - a[1] : a[1] - b[1]);
    return en.map(e => e[0]);
}

/**
 * arrayの中の最大値のインデックスを返します。
 * @param {number[]} array 
 */
function argmax(array) {
    let maxIndex;
    let maxValue = -Infinity;
    for (let i = 0; i < array.length; i++) {
        const v = array[i];
        if (v > maxValue) {
            maxIndex = i;
            maxValue = v;
        }
    }
    return maxIndex;
}

/**
 * strの32-bitハッシュ値を返します。
 * (注)19路盤では32-bitハッシュ値は衝突すると言われていますが衝突には対応していません。
 * @param {string} str 
 * @returns {Integer}
 */
function hash(str) {
    let hash = 5381;
    for (let i = 0; i < str.length; i++) {
        const char = str.charCodeAt(i);
        hash = (hash << 5) + hash + char; /* hash * 33 + c */
        hash = hash & hash; // Convert to 32bit integer
    }
    return Math.abs(hash);
}

/**
 * 温度パラメータありのソフトマックス関数です。
 * @param {Float32Array} input 
 * @param {number} temperature
 * @returns {Float32Array}
 */
function softmax(input, temperature = 1.0) {
    const output = new Float32Array(input.length);
    const alpha = Math.max.apply(null, input);
    let denom = 0.0;

    for (let i = 0; i < input.length; i++) {
        const val = Math.exp((input[i] - alpha) / temperature);
        denom += val;
        output[i] = val;
    }

    for (let i = 0; i < output.length; i++) {
        output[i] /= denom;
    }

    return output;
}

function printProb(prob, size) {
    for (let y = 0; y < size; y++) {
        let str = `${y + 1} `;
        for (let x = 0; x < size; x++) {
            str += ('  ' + prob[x + y * size].toFixed(1)).slice(-5);
        }
        console.log(str);
    }
    console.log('pass=%s', prob[prob.length - 1].toFixed(1));
}
},{}]},{},[6])
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIm5vZGVfbW9kdWxlcy9icm93c2VyLXBhY2svX3ByZWx1ZGUuanMiLCJub2RlX21vZHVsZXMvYnNvbi1vYmplY3RpZC9vYmplY3RpZC5qcyIsIm5vZGVfbW9kdWxlcy9wcm9jZXNzL2Jyb3dzZXIuanMiLCJub2RlX21vZHVsZXMvd29ya2VyLXJtaS93b3JrZXItcm1pLmpzIiwic3JjL2F6anNfZW5naW5lX2NsaWVudC5qcyIsInNyYy9ib2FyZF9jb250cm9sbGVyLmpzIiwic3JjL21haW4uanMiLCJzcmMvbmV1cmFsX25ldHdvcmsuanMiLCJzcmMvcGxheV9jb250cm9sbGVyLmpzIiwic3JjL3NwZWVjaC5qcyIsInNyYy91dGlscy5qcyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7QUNBQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7OztBQzlOQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ3hMQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUMzS0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQy9GQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ3BQQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ3BKQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDekZBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQzlRQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDckdBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQSIsImZpbGUiOiJnZW5lcmF0ZWQuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlc0NvbnRlbnQiOlsiKGZ1bmN0aW9uKCl7ZnVuY3Rpb24gcihlLG4sdCl7ZnVuY3Rpb24gbyhpLGYpe2lmKCFuW2ldKXtpZighZVtpXSl7dmFyIGM9XCJmdW5jdGlvblwiPT10eXBlb2YgcmVxdWlyZSYmcmVxdWlyZTtpZighZiYmYylyZXR1cm4gYyhpLCEwKTtpZih1KXJldHVybiB1KGksITApO3ZhciBhPW5ldyBFcnJvcihcIkNhbm5vdCBmaW5kIG1vZHVsZSAnXCIraStcIidcIik7dGhyb3cgYS5jb2RlPVwiTU9EVUxFX05PVF9GT1VORFwiLGF9dmFyIHA9bltpXT17ZXhwb3J0czp7fX07ZVtpXVswXS5jYWxsKHAuZXhwb3J0cyxmdW5jdGlvbihyKXt2YXIgbj1lW2ldWzFdW3JdO3JldHVybiBvKG58fHIpfSxwLHAuZXhwb3J0cyxyLGUsbix0KX1yZXR1cm4gbltpXS5leHBvcnRzfWZvcih2YXIgdT1cImZ1bmN0aW9uXCI9PXR5cGVvZiByZXF1aXJlJiZyZXF1aXJlLGk9MDtpPHQubGVuZ3RoO2krKylvKHRbaV0pO3JldHVybiBvfXJldHVybiByfSkoKSIsIlxudmFyIE1BQ0hJTkVfSUQgPSBNYXRoLmZsb29yKE1hdGgucmFuZG9tKCkgKiAweEZGRkZGRik7XG52YXIgaW5kZXggPSBPYmplY3RJRC5pbmRleCA9IHBhcnNlSW50KE1hdGgucmFuZG9tKCkgKiAweEZGRkZGRiwgMTApO1xudmFyIHBpZCA9ICh0eXBlb2YgcHJvY2VzcyA9PT0gJ3VuZGVmaW5lZCcgfHwgdHlwZW9mIHByb2Nlc3MucGlkICE9PSAnbnVtYmVyJyA/IE1hdGguZmxvb3IoTWF0aC5yYW5kb20oKSAqIDEwMDAwMCkgOiBwcm9jZXNzLnBpZCkgJSAweEZGRkY7XG5cbi8qKlxuICogRGV0ZXJtaW5lIGlmIGFuIG9iamVjdCBpcyBCdWZmZXJcbiAqXG4gKiBBdXRob3I6ICAgRmVyb3NzIEFib3VraGFkaWplaCA8ZmVyb3NzQGZlcm9zcy5vcmc+IDxodHRwOi8vZmVyb3NzLm9yZz5cbiAqIExpY2Vuc2U6ICBNSVRcbiAqXG4gKi9cbnZhciBpc0J1ZmZlciA9IGZ1bmN0aW9uIChvYmopIHtcbiAgcmV0dXJuICEhKFxuICBvYmogIT0gbnVsbCAmJlxuICBvYmouY29uc3RydWN0b3IgJiZcbiAgdHlwZW9mIG9iai5jb25zdHJ1Y3Rvci5pc0J1ZmZlciA9PT0gJ2Z1bmN0aW9uJyAmJlxuICBvYmouY29uc3RydWN0b3IuaXNCdWZmZXIob2JqKVxuICApXG59O1xuXG4vKipcbiAqIENyZWF0ZSBhIG5ldyBpbW11dGFibGUgT2JqZWN0SUQgaW5zdGFuY2VcbiAqXG4gKiBAY2xhc3MgUmVwcmVzZW50cyB0aGUgQlNPTiBPYmplY3RJRCB0eXBlXG4gKiBAcGFyYW0ge1N0cmluZ3xOdW1iZXJ9IGFyZyBDYW4gYmUgYSAyNCBieXRlIGhleCBzdHJpbmcsIDEyIGJ5dGUgYmluYXJ5IHN0cmluZyBvciBhIE51bWJlci5cbiAqIEByZXR1cm4ge09iamVjdH0gaW5zdGFuY2Ugb2YgT2JqZWN0SUQuXG4gKi9cbmZ1bmN0aW9uIE9iamVjdElEKGFyZykge1xuICBpZighKHRoaXMgaW5zdGFuY2VvZiBPYmplY3RJRCkpIHJldHVybiBuZXcgT2JqZWN0SUQoYXJnKTtcbiAgaWYoYXJnICYmICgoYXJnIGluc3RhbmNlb2YgT2JqZWN0SUQpIHx8IGFyZy5fYnNvbnR5cGU9PT1cIk9iamVjdElEXCIpKVxuICAgIHJldHVybiBhcmc7XG5cbiAgdmFyIGJ1ZjtcblxuICBpZihpc0J1ZmZlcihhcmcpIHx8IChBcnJheS5pc0FycmF5KGFyZykgJiYgYXJnLmxlbmd0aD09PTEyKSkge1xuICAgIGJ1ZiA9IEFycmF5LnByb3RvdHlwZS5zbGljZS5jYWxsKGFyZyk7XG4gIH1cbiAgZWxzZSBpZih0eXBlb2YgYXJnID09PSBcInN0cmluZ1wiKSB7XG4gICAgaWYoYXJnLmxlbmd0aCE9PTEyICYmICFPYmplY3RJRC5pc1ZhbGlkKGFyZykpXG4gICAgICB0aHJvdyBuZXcgRXJyb3IoXCJBcmd1bWVudCBwYXNzZWQgaW4gbXVzdCBiZSBhIHNpbmdsZSBTdHJpbmcgb2YgMTIgYnl0ZXMgb3IgYSBzdHJpbmcgb2YgMjQgaGV4IGNoYXJhY3RlcnNcIik7XG5cbiAgICBidWYgPSBidWZmZXIoYXJnKTtcbiAgfVxuICBlbHNlIGlmKC9udW1iZXJ8dW5kZWZpbmVkLy50ZXN0KHR5cGVvZiBhcmcpKSB7XG4gICAgYnVmID0gYnVmZmVyKGdlbmVyYXRlKGFyZykpO1xuICB9XG5cbiAgT2JqZWN0LmRlZmluZVByb3BlcnR5KHRoaXMsIFwiaWRcIiwge1xuICAgIGVudW1lcmFibGU6IHRydWUsXG4gICAgZ2V0OiBmdW5jdGlvbigpIHsgcmV0dXJuIFN0cmluZy5mcm9tQ2hhckNvZGUuYXBwbHkodGhpcywgYnVmKTsgfVxuICB9KTtcbiAgT2JqZWN0LmRlZmluZVByb3BlcnR5KHRoaXMsIFwic3RyXCIsIHtcbiAgICBnZXQ6IGZ1bmN0aW9uKCkgeyByZXR1cm4gYnVmLm1hcChoZXguYmluZCh0aGlzLCAyKSkuam9pbignJyk7IH1cbiAgfSk7XG59XG5tb2R1bGUuZXhwb3J0cyA9IE9iamVjdElEO1xuT2JqZWN0SUQuZ2VuZXJhdGUgPSBnZW5lcmF0ZTtcbk9iamVjdElELmRlZmF1bHQgPSBPYmplY3RJRDtcblxuLyoqXG4gKiBDcmVhdGVzIGFuIE9iamVjdElEIGZyb20gYSBzZWNvbmQgYmFzZWQgbnVtYmVyLCB3aXRoIHRoZSByZXN0IG9mIHRoZSBPYmplY3RJRCB6ZXJvZWQgb3V0LiBVc2VkIGZvciBjb21wYXJpc29ucyBvciBzb3J0aW5nIHRoZSBPYmplY3RJRC5cbiAqXG4gKiBAcGFyYW0ge051bWJlcn0gdGltZSBhbiBpbnRlZ2VyIG51bWJlciByZXByZXNlbnRpbmcgYSBudW1iZXIgb2Ygc2Vjb25kcy5cbiAqIEByZXR1cm4ge09iamVjdElEfSByZXR1cm4gdGhlIGNyZWF0ZWQgT2JqZWN0SURcbiAqIEBhcGkgcHVibGljXG4gKi9cbk9iamVjdElELmNyZWF0ZUZyb21UaW1lID0gZnVuY3Rpb24odGltZSl7XG4gIHRpbWUgPSBwYXJzZUludCh0aW1lLCAxMCkgJSAweEZGRkZGRkZGO1xuICByZXR1cm4gbmV3IE9iamVjdElEKGhleCg4LHRpbWUpK1wiMDAwMDAwMDAwMDAwMDAwMFwiKTtcbn07XG5cbi8qKlxuICogQ3JlYXRlcyBhbiBPYmplY3RJRCBmcm9tIGEgaGV4IHN0cmluZyByZXByZXNlbnRhdGlvbiBvZiBhbiBPYmplY3RJRC5cbiAqXG4gKiBAcGFyYW0ge1N0cmluZ30gaGV4U3RyaW5nIGNyZWF0ZSBhIE9iamVjdElEIGZyb20gYSBwYXNzZWQgaW4gMjQgYnl0ZSBoZXhzdHJpbmcuXG4gKiBAcmV0dXJuIHtPYmplY3RJRH0gcmV0dXJuIHRoZSBjcmVhdGVkIE9iamVjdElEXG4gKiBAYXBpIHB1YmxpY1xuICovXG5PYmplY3RJRC5jcmVhdGVGcm9tSGV4U3RyaW5nID0gZnVuY3Rpb24oaGV4U3RyaW5nKSB7XG4gIGlmKCFPYmplY3RJRC5pc1ZhbGlkKGhleFN0cmluZykpXG4gICAgdGhyb3cgbmV3IEVycm9yKFwiSW52YWxpZCBPYmplY3RJRCBoZXggc3RyaW5nXCIpO1xuXG4gIHJldHVybiBuZXcgT2JqZWN0SUQoaGV4U3RyaW5nKTtcbn07XG5cbi8qKlxuICogQ2hlY2tzIGlmIGEgdmFsdWUgaXMgYSB2YWxpZCBic29uIE9iamVjdElkXG4gKlxuICogQHBhcmFtIHtTdHJpbmd9IG9iamVjdGlkIENhbiBiZSBhIDI0IGJ5dGUgaGV4IHN0cmluZyBvciBhbiBpbnN0YW5jZSBvZiBPYmplY3RJRC5cbiAqIEByZXR1cm4ge0Jvb2xlYW59IHJldHVybiB0cnVlIGlmIHRoZSB2YWx1ZSBpcyBhIHZhbGlkIGJzb24gT2JqZWN0SUQsIHJldHVybiBmYWxzZSBvdGhlcndpc2UuXG4gKiBAYXBpIHB1YmxpY1xuICpcbiAqIFRIRSBOQVRJVkUgRE9DVU1FTlRBVElPTiBJU04nVCBDTEVBUiBPTiBUSElTIEdVWSFcbiAqIGh0dHA6Ly9tb25nb2RiLmdpdGh1Yi5pby9ub2RlLW1vbmdvZGItbmF0aXZlL2FwaS1ic29uLWdlbmVyYXRlZC9vYmplY3RpZC5odG1sI29iamVjdGlkLWlzdmFsaWRcbiAqL1xuT2JqZWN0SUQuaXNWYWxpZCA9IGZ1bmN0aW9uKG9iamVjdGlkKSB7XG4gIGlmKCFvYmplY3RpZCkgcmV0dXJuIGZhbHNlO1xuXG4gIC8vY2FsbCAudG9TdHJpbmcoKSB0byBnZXQgdGhlIGhleCBpZiB3ZSdyZVxuICAvLyB3b3JraW5nIHdpdGggYW4gaW5zdGFuY2Ugb2YgT2JqZWN0SURcbiAgcmV0dXJuIC9eWzAtOUEtRl17MjR9JC9pLnRlc3Qob2JqZWN0aWQudG9TdHJpbmcoKSk7XG59O1xuXG4vKipcbiAqIHNldCBhIGN1c3RvbSBtYWNoaW5lSURcbiAqIFxuICogQHBhcmFtIHtTdHJpbmd8TnVtYmVyfSBtYWNoaW5laWQgQ2FuIGJlIGEgc3RyaW5nLCBoZXgtc3RyaW5nIG9yIGEgbnVtYmVyXG4gKiBAcmV0dXJuIHt2b2lkfVxuICogQGFwaSBwdWJsaWNcbiAqL1xuT2JqZWN0SUQuc2V0TWFjaGluZUlEID0gZnVuY3Rpb24oYXJnKSB7XG4gIHZhciBtYWNoaW5lSUQ7XG5cbiAgaWYodHlwZW9mIGFyZyA9PT0gXCJzdHJpbmdcIikge1xuICAgIC8vIGhleCBzdHJpbmdcbiAgICBtYWNoaW5lSUQgPSBwYXJzZUludChhcmcsIDE2KTtcbiAgIFxuICAgIC8vIGFueSBzdHJpbmdcbiAgICBpZihpc05hTihtYWNoaW5lSUQpKSB7XG4gICAgICBhcmcgPSAoJzAwMDAwMCcgKyBhcmcpLnN1YnN0cigtNyw2KTtcblxuICAgICAgbWFjaGluZUlEID0gXCJcIjtcbiAgICAgIGZvcih2YXIgaSA9IDA7aTw2OyBpKyspIHtcbiAgICAgICAgbWFjaGluZUlEICs9IChhcmcuY2hhckNvZGVBdChpKSk7XG4gICAgICB9XG4gICAgfVxuICB9XG4gIGVsc2UgaWYoL251bWJlcnx1bmRlZmluZWQvLnRlc3QodHlwZW9mIGFyZykpIHtcbiAgICBtYWNoaW5lSUQgPSBhcmcgfCAwO1xuICB9XG5cbiAgTUFDSElORV9JRCA9IChtYWNoaW5lSUQgJiAweEZGRkZGRik7XG59XG5cbi8qKlxuICogZ2V0IHRoZSBtYWNoaW5lSURcbiAqIFxuICogQHJldHVybiB7bnVtYmVyfVxuICogQGFwaSBwdWJsaWNcbiAqL1xuT2JqZWN0SUQuZ2V0TWFjaGluZUlEID0gZnVuY3Rpb24oKSB7XG4gIHJldHVybiBNQUNISU5FX0lEO1xufVxuXG5PYmplY3RJRC5wcm90b3R5cGUgPSB7XG4gIF9ic29udHlwZTogJ09iamVjdElEJyxcbiAgY29uc3RydWN0b3I6IE9iamVjdElELFxuXG4gIC8qKlxuICAgKiBSZXR1cm4gdGhlIE9iamVjdElEIGlkIGFzIGEgMjQgYnl0ZSBoZXggc3RyaW5nIHJlcHJlc2VudGF0aW9uXG4gICAqXG4gICAqIEByZXR1cm4ge1N0cmluZ30gcmV0dXJuIHRoZSAyNCBieXRlIGhleCBzdHJpbmcgcmVwcmVzZW50YXRpb24uXG4gICAqIEBhcGkgcHVibGljXG4gICAqL1xuICB0b0hleFN0cmluZzogZnVuY3Rpb24oKSB7XG4gICAgcmV0dXJuIHRoaXMuc3RyO1xuICB9LFxuXG4gIC8qKlxuICAgKiBDb21wYXJlcyB0aGUgZXF1YWxpdHkgb2YgdGhpcyBPYmplY3RJRCB3aXRoIGBvdGhlcklEYC5cbiAgICpcbiAgICogQHBhcmFtIHtPYmplY3R9IG90aGVyIE9iamVjdElEIGluc3RhbmNlIHRvIGNvbXBhcmUgYWdhaW5zdC5cbiAgICogQHJldHVybiB7Qm9vbGVhbn0gdGhlIHJlc3VsdCBvZiBjb21wYXJpbmcgdHdvIE9iamVjdElEJ3NcbiAgICogQGFwaSBwdWJsaWNcbiAgICovXG4gIGVxdWFsczogZnVuY3Rpb24gKG90aGVyKXtcbiAgICByZXR1cm4gISFvdGhlciAmJiB0aGlzLnN0ciA9PT0gb3RoZXIudG9TdHJpbmcoKTtcbiAgfSxcblxuICAvKipcbiAgICogUmV0dXJucyB0aGUgZ2VuZXJhdGlvbiBkYXRlIChhY2N1cmF0ZSB1cCB0byB0aGUgc2Vjb25kKSB0aGF0IHRoaXMgSUQgd2FzIGdlbmVyYXRlZC5cbiAgICpcbiAgICogQHJldHVybiB7RGF0ZX0gdGhlIGdlbmVyYXRpb24gZGF0ZVxuICAgKiBAYXBpIHB1YmxpY1xuICAgKi9cbiAgZ2V0VGltZXN0YW1wOiBmdW5jdGlvbigpe1xuICAgIHJldHVybiBuZXcgRGF0ZShwYXJzZUludCh0aGlzLnN0ci5zdWJzdHIoMCw4KSwgMTYpICogMTAwMCk7XG4gIH1cbn07XG5cbmZ1bmN0aW9uIG5leHQoKSB7XG4gIHJldHVybiBpbmRleCA9IChpbmRleCsxKSAlIDB4RkZGRkZGO1xufVxuXG5mdW5jdGlvbiBnZW5lcmF0ZSh0aW1lKSB7XG4gIGlmICh0eXBlb2YgdGltZSAhPT0gJ251bWJlcicpXG4gICAgdGltZSA9IERhdGUubm93KCkvMTAwMDtcblxuICAvL2tlZXAgaXQgaW4gdGhlIHJpbmchXG4gIHRpbWUgPSBwYXJzZUludCh0aW1lLCAxMCkgJSAweEZGRkZGRkZGO1xuXG4gIC8vRkZGRkZGRkYgRkZGRkZGIEZGRkYgRkZGRkZGXG4gIHJldHVybiBoZXgoOCx0aW1lKSArIGhleCg2LE1BQ0hJTkVfSUQpICsgaGV4KDQscGlkKSArIGhleCg2LG5leHQoKSk7XG59XG5cbmZ1bmN0aW9uIGhleChsZW5ndGgsIG4pIHtcbiAgbiA9IG4udG9TdHJpbmcoMTYpO1xuICByZXR1cm4gKG4ubGVuZ3RoPT09bGVuZ3RoKT8gbiA6IFwiMDAwMDAwMDBcIi5zdWJzdHJpbmcobi5sZW5ndGgsIGxlbmd0aCkgKyBuO1xufVxuXG5mdW5jdGlvbiBidWZmZXIoc3RyKSB7XG4gIHZhciBpPTAsb3V0PVtdO1xuXG4gIGlmKHN0ci5sZW5ndGg9PT0yNClcbiAgICBmb3IoO2k8MjQ7IG91dC5wdXNoKHBhcnNlSW50KHN0cltpXStzdHJbaSsxXSwgMTYpKSxpKz0yKTtcblxuICBlbHNlIGlmKHN0ci5sZW5ndGg9PT0xMilcbiAgICBmb3IoO2k8MTI7IG91dC5wdXNoKHN0ci5jaGFyQ29kZUF0KGkpKSxpKyspO1xuXG4gIHJldHVybiBvdXQ7XG59XG5cbi8qKlxuICogQ29udmVydHMgdG8gYSBzdHJpbmcgcmVwcmVzZW50YXRpb24gb2YgdGhpcyBJZC5cbiAqXG4gKiBAcmV0dXJuIHtTdHJpbmd9IHJldHVybiB0aGUgMjQgYnl0ZSBoZXggc3RyaW5nIHJlcHJlc2VudGF0aW9uLlxuICogQGFwaSBwcml2YXRlXG4gKi9cbk9iamVjdElELnByb3RvdHlwZS5pbnNwZWN0ID0gZnVuY3Rpb24oKSB7IHJldHVybiBcIk9iamVjdElEKFwiK3RoaXMrXCIpXCIgfTtcbk9iamVjdElELnByb3RvdHlwZS50b0pTT04gPSBPYmplY3RJRC5wcm90b3R5cGUudG9IZXhTdHJpbmc7XG5PYmplY3RJRC5wcm90b3R5cGUudG9TdHJpbmcgPSBPYmplY3RJRC5wcm90b3R5cGUudG9IZXhTdHJpbmc7XG4iLCIvLyBzaGltIGZvciB1c2luZyBwcm9jZXNzIGluIGJyb3dzZXJcbnZhciBwcm9jZXNzID0gbW9kdWxlLmV4cG9ydHMgPSB7fTtcblxuLy8gY2FjaGVkIGZyb20gd2hhdGV2ZXIgZ2xvYmFsIGlzIHByZXNlbnQgc28gdGhhdCB0ZXN0IHJ1bm5lcnMgdGhhdCBzdHViIGl0XG4vLyBkb24ndCBicmVhayB0aGluZ3MuICBCdXQgd2UgbmVlZCB0byB3cmFwIGl0IGluIGEgdHJ5IGNhdGNoIGluIGNhc2UgaXQgaXNcbi8vIHdyYXBwZWQgaW4gc3RyaWN0IG1vZGUgY29kZSB3aGljaCBkb2Vzbid0IGRlZmluZSBhbnkgZ2xvYmFscy4gIEl0J3MgaW5zaWRlIGFcbi8vIGZ1bmN0aW9uIGJlY2F1c2UgdHJ5L2NhdGNoZXMgZGVvcHRpbWl6ZSBpbiBjZXJ0YWluIGVuZ2luZXMuXG5cbnZhciBjYWNoZWRTZXRUaW1lb3V0O1xudmFyIGNhY2hlZENsZWFyVGltZW91dDtcblxuZnVuY3Rpb24gZGVmYXVsdFNldFRpbW91dCgpIHtcbiAgICB0aHJvdyBuZXcgRXJyb3IoJ3NldFRpbWVvdXQgaGFzIG5vdCBiZWVuIGRlZmluZWQnKTtcbn1cbmZ1bmN0aW9uIGRlZmF1bHRDbGVhclRpbWVvdXQgKCkge1xuICAgIHRocm93IG5ldyBFcnJvcignY2xlYXJUaW1lb3V0IGhhcyBub3QgYmVlbiBkZWZpbmVkJyk7XG59XG4oZnVuY3Rpb24gKCkge1xuICAgIHRyeSB7XG4gICAgICAgIGlmICh0eXBlb2Ygc2V0VGltZW91dCA9PT0gJ2Z1bmN0aW9uJykge1xuICAgICAgICAgICAgY2FjaGVkU2V0VGltZW91dCA9IHNldFRpbWVvdXQ7XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICBjYWNoZWRTZXRUaW1lb3V0ID0gZGVmYXVsdFNldFRpbW91dDtcbiAgICAgICAgfVxuICAgIH0gY2F0Y2ggKGUpIHtcbiAgICAgICAgY2FjaGVkU2V0VGltZW91dCA9IGRlZmF1bHRTZXRUaW1vdXQ7XG4gICAgfVxuICAgIHRyeSB7XG4gICAgICAgIGlmICh0eXBlb2YgY2xlYXJUaW1lb3V0ID09PSAnZnVuY3Rpb24nKSB7XG4gICAgICAgICAgICBjYWNoZWRDbGVhclRpbWVvdXQgPSBjbGVhclRpbWVvdXQ7XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICBjYWNoZWRDbGVhclRpbWVvdXQgPSBkZWZhdWx0Q2xlYXJUaW1lb3V0O1xuICAgICAgICB9XG4gICAgfSBjYXRjaCAoZSkge1xuICAgICAgICBjYWNoZWRDbGVhclRpbWVvdXQgPSBkZWZhdWx0Q2xlYXJUaW1lb3V0O1xuICAgIH1cbn0gKCkpXG5mdW5jdGlvbiBydW5UaW1lb3V0KGZ1bikge1xuICAgIGlmIChjYWNoZWRTZXRUaW1lb3V0ID09PSBzZXRUaW1lb3V0KSB7XG4gICAgICAgIC8vbm9ybWFsIGVudmlyb21lbnRzIGluIHNhbmUgc2l0dWF0aW9uc1xuICAgICAgICByZXR1cm4gc2V0VGltZW91dChmdW4sIDApO1xuICAgIH1cbiAgICAvLyBpZiBzZXRUaW1lb3V0IHdhc24ndCBhdmFpbGFibGUgYnV0IHdhcyBsYXR0ZXIgZGVmaW5lZFxuICAgIGlmICgoY2FjaGVkU2V0VGltZW91dCA9PT0gZGVmYXVsdFNldFRpbW91dCB8fCAhY2FjaGVkU2V0VGltZW91dCkgJiYgc2V0VGltZW91dCkge1xuICAgICAgICBjYWNoZWRTZXRUaW1lb3V0ID0gc2V0VGltZW91dDtcbiAgICAgICAgcmV0dXJuIHNldFRpbWVvdXQoZnVuLCAwKTtcbiAgICB9XG4gICAgdHJ5IHtcbiAgICAgICAgLy8gd2hlbiB3aGVuIHNvbWVib2R5IGhhcyBzY3Jld2VkIHdpdGggc2V0VGltZW91dCBidXQgbm8gSS5FLiBtYWRkbmVzc1xuICAgICAgICByZXR1cm4gY2FjaGVkU2V0VGltZW91dChmdW4sIDApO1xuICAgIH0gY2F0Y2goZSl7XG4gICAgICAgIHRyeSB7XG4gICAgICAgICAgICAvLyBXaGVuIHdlIGFyZSBpbiBJLkUuIGJ1dCB0aGUgc2NyaXB0IGhhcyBiZWVuIGV2YWxlZCBzbyBJLkUuIGRvZXNuJ3QgdHJ1c3QgdGhlIGdsb2JhbCBvYmplY3Qgd2hlbiBjYWxsZWQgbm9ybWFsbHlcbiAgICAgICAgICAgIHJldHVybiBjYWNoZWRTZXRUaW1lb3V0LmNhbGwobnVsbCwgZnVuLCAwKTtcbiAgICAgICAgfSBjYXRjaChlKXtcbiAgICAgICAgICAgIC8vIHNhbWUgYXMgYWJvdmUgYnV0IHdoZW4gaXQncyBhIHZlcnNpb24gb2YgSS5FLiB0aGF0IG11c3QgaGF2ZSB0aGUgZ2xvYmFsIG9iamVjdCBmb3IgJ3RoaXMnLCBob3BmdWxseSBvdXIgY29udGV4dCBjb3JyZWN0IG90aGVyd2lzZSBpdCB3aWxsIHRocm93IGEgZ2xvYmFsIGVycm9yXG4gICAgICAgICAgICByZXR1cm4gY2FjaGVkU2V0VGltZW91dC5jYWxsKHRoaXMsIGZ1biwgMCk7XG4gICAgICAgIH1cbiAgICB9XG5cblxufVxuZnVuY3Rpb24gcnVuQ2xlYXJUaW1lb3V0KG1hcmtlcikge1xuICAgIGlmIChjYWNoZWRDbGVhclRpbWVvdXQgPT09IGNsZWFyVGltZW91dCkge1xuICAgICAgICAvL25vcm1hbCBlbnZpcm9tZW50cyBpbiBzYW5lIHNpdHVhdGlvbnNcbiAgICAgICAgcmV0dXJuIGNsZWFyVGltZW91dChtYXJrZXIpO1xuICAgIH1cbiAgICAvLyBpZiBjbGVhclRpbWVvdXQgd2Fzbid0IGF2YWlsYWJsZSBidXQgd2FzIGxhdHRlciBkZWZpbmVkXG4gICAgaWYgKChjYWNoZWRDbGVhclRpbWVvdXQgPT09IGRlZmF1bHRDbGVhclRpbWVvdXQgfHwgIWNhY2hlZENsZWFyVGltZW91dCkgJiYgY2xlYXJUaW1lb3V0KSB7XG4gICAgICAgIGNhY2hlZENsZWFyVGltZW91dCA9IGNsZWFyVGltZW91dDtcbiAgICAgICAgcmV0dXJuIGNsZWFyVGltZW91dChtYXJrZXIpO1xuICAgIH1cbiAgICB0cnkge1xuICAgICAgICAvLyB3aGVuIHdoZW4gc29tZWJvZHkgaGFzIHNjcmV3ZWQgd2l0aCBzZXRUaW1lb3V0IGJ1dCBubyBJLkUuIG1hZGRuZXNzXG4gICAgICAgIHJldHVybiBjYWNoZWRDbGVhclRpbWVvdXQobWFya2VyKTtcbiAgICB9IGNhdGNoIChlKXtcbiAgICAgICAgdHJ5IHtcbiAgICAgICAgICAgIC8vIFdoZW4gd2UgYXJlIGluIEkuRS4gYnV0IHRoZSBzY3JpcHQgaGFzIGJlZW4gZXZhbGVkIHNvIEkuRS4gZG9lc24ndCAgdHJ1c3QgdGhlIGdsb2JhbCBvYmplY3Qgd2hlbiBjYWxsZWQgbm9ybWFsbHlcbiAgICAgICAgICAgIHJldHVybiBjYWNoZWRDbGVhclRpbWVvdXQuY2FsbChudWxsLCBtYXJrZXIpO1xuICAgICAgICB9IGNhdGNoIChlKXtcbiAgICAgICAgICAgIC8vIHNhbWUgYXMgYWJvdmUgYnV0IHdoZW4gaXQncyBhIHZlcnNpb24gb2YgSS5FLiB0aGF0IG11c3QgaGF2ZSB0aGUgZ2xvYmFsIG9iamVjdCBmb3IgJ3RoaXMnLCBob3BmdWxseSBvdXIgY29udGV4dCBjb3JyZWN0IG90aGVyd2lzZSBpdCB3aWxsIHRocm93IGEgZ2xvYmFsIGVycm9yLlxuICAgICAgICAgICAgLy8gU29tZSB2ZXJzaW9ucyBvZiBJLkUuIGhhdmUgZGlmZmVyZW50IHJ1bGVzIGZvciBjbGVhclRpbWVvdXQgdnMgc2V0VGltZW91dFxuICAgICAgICAgICAgcmV0dXJuIGNhY2hlZENsZWFyVGltZW91dC5jYWxsKHRoaXMsIG1hcmtlcik7XG4gICAgICAgIH1cbiAgICB9XG5cblxuXG59XG52YXIgcXVldWUgPSBbXTtcbnZhciBkcmFpbmluZyA9IGZhbHNlO1xudmFyIGN1cnJlbnRRdWV1ZTtcbnZhciBxdWV1ZUluZGV4ID0gLTE7XG5cbmZ1bmN0aW9uIGNsZWFuVXBOZXh0VGljaygpIHtcbiAgICBpZiAoIWRyYWluaW5nIHx8ICFjdXJyZW50UXVldWUpIHtcbiAgICAgICAgcmV0dXJuO1xuICAgIH1cbiAgICBkcmFpbmluZyA9IGZhbHNlO1xuICAgIGlmIChjdXJyZW50UXVldWUubGVuZ3RoKSB7XG4gICAgICAgIHF1ZXVlID0gY3VycmVudFF1ZXVlLmNvbmNhdChxdWV1ZSk7XG4gICAgfSBlbHNlIHtcbiAgICAgICAgcXVldWVJbmRleCA9IC0xO1xuICAgIH1cbiAgICBpZiAocXVldWUubGVuZ3RoKSB7XG4gICAgICAgIGRyYWluUXVldWUoKTtcbiAgICB9XG59XG5cbmZ1bmN0aW9uIGRyYWluUXVldWUoKSB7XG4gICAgaWYgKGRyYWluaW5nKSB7XG4gICAgICAgIHJldHVybjtcbiAgICB9XG4gICAgdmFyIHRpbWVvdXQgPSBydW5UaW1lb3V0KGNsZWFuVXBOZXh0VGljayk7XG4gICAgZHJhaW5pbmcgPSB0cnVlO1xuXG4gICAgdmFyIGxlbiA9IHF1ZXVlLmxlbmd0aDtcbiAgICB3aGlsZShsZW4pIHtcbiAgICAgICAgY3VycmVudFF1ZXVlID0gcXVldWU7XG4gICAgICAgIHF1ZXVlID0gW107XG4gICAgICAgIHdoaWxlICgrK3F1ZXVlSW5kZXggPCBsZW4pIHtcbiAgICAgICAgICAgIGlmIChjdXJyZW50UXVldWUpIHtcbiAgICAgICAgICAgICAgICBjdXJyZW50UXVldWVbcXVldWVJbmRleF0ucnVuKCk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgICAgcXVldWVJbmRleCA9IC0xO1xuICAgICAgICBsZW4gPSBxdWV1ZS5sZW5ndGg7XG4gICAgfVxuICAgIGN1cnJlbnRRdWV1ZSA9IG51bGw7XG4gICAgZHJhaW5pbmcgPSBmYWxzZTtcbiAgICBydW5DbGVhclRpbWVvdXQodGltZW91dCk7XG59XG5cbnByb2Nlc3MubmV4dFRpY2sgPSBmdW5jdGlvbiAoZnVuKSB7XG4gICAgdmFyIGFyZ3MgPSBuZXcgQXJyYXkoYXJndW1lbnRzLmxlbmd0aCAtIDEpO1xuICAgIGlmIChhcmd1bWVudHMubGVuZ3RoID4gMSkge1xuICAgICAgICBmb3IgKHZhciBpID0gMTsgaSA8IGFyZ3VtZW50cy5sZW5ndGg7IGkrKykge1xuICAgICAgICAgICAgYXJnc1tpIC0gMV0gPSBhcmd1bWVudHNbaV07XG4gICAgICAgIH1cbiAgICB9XG4gICAgcXVldWUucHVzaChuZXcgSXRlbShmdW4sIGFyZ3MpKTtcbiAgICBpZiAocXVldWUubGVuZ3RoID09PSAxICYmICFkcmFpbmluZykge1xuICAgICAgICBydW5UaW1lb3V0KGRyYWluUXVldWUpO1xuICAgIH1cbn07XG5cbi8vIHY4IGxpa2VzIHByZWRpY3RpYmxlIG9iamVjdHNcbmZ1bmN0aW9uIEl0ZW0oZnVuLCBhcnJheSkge1xuICAgIHRoaXMuZnVuID0gZnVuO1xuICAgIHRoaXMuYXJyYXkgPSBhcnJheTtcbn1cbkl0ZW0ucHJvdG90eXBlLnJ1biA9IGZ1bmN0aW9uICgpIHtcbiAgICB0aGlzLmZ1bi5hcHBseShudWxsLCB0aGlzLmFycmF5KTtcbn07XG5wcm9jZXNzLnRpdGxlID0gJ2Jyb3dzZXInO1xucHJvY2Vzcy5icm93c2VyID0gdHJ1ZTtcbnByb2Nlc3MuZW52ID0ge307XG5wcm9jZXNzLmFyZ3YgPSBbXTtcbnByb2Nlc3MudmVyc2lvbiA9ICcnOyAvLyBlbXB0eSBzdHJpbmcgdG8gYXZvaWQgcmVnZXhwIGlzc3Vlc1xucHJvY2Vzcy52ZXJzaW9ucyA9IHt9O1xuXG5mdW5jdGlvbiBub29wKCkge31cblxucHJvY2Vzcy5vbiA9IG5vb3A7XG5wcm9jZXNzLmFkZExpc3RlbmVyID0gbm9vcDtcbnByb2Nlc3Mub25jZSA9IG5vb3A7XG5wcm9jZXNzLm9mZiA9IG5vb3A7XG5wcm9jZXNzLnJlbW92ZUxpc3RlbmVyID0gbm9vcDtcbnByb2Nlc3MucmVtb3ZlQWxsTGlzdGVuZXJzID0gbm9vcDtcbnByb2Nlc3MuZW1pdCA9IG5vb3A7XG5wcm9jZXNzLnByZXBlbmRMaXN0ZW5lciA9IG5vb3A7XG5wcm9jZXNzLnByZXBlbmRPbmNlTGlzdGVuZXIgPSBub29wO1xuXG5wcm9jZXNzLmxpc3RlbmVycyA9IGZ1bmN0aW9uIChuYW1lKSB7IHJldHVybiBbXSB9XG5cbnByb2Nlc3MuYmluZGluZyA9IGZ1bmN0aW9uIChuYW1lKSB7XG4gICAgdGhyb3cgbmV3IEVycm9yKCdwcm9jZXNzLmJpbmRpbmcgaXMgbm90IHN1cHBvcnRlZCcpO1xufTtcblxucHJvY2Vzcy5jd2QgPSBmdW5jdGlvbiAoKSB7IHJldHVybiAnLycgfTtcbnByb2Nlc3MuY2hkaXIgPSBmdW5jdGlvbiAoZGlyKSB7XG4gICAgdGhyb3cgbmV3IEVycm9yKCdwcm9jZXNzLmNoZGlyIGlzIG5vdCBzdXBwb3J0ZWQnKTtcbn07XG5wcm9jZXNzLnVtYXNrID0gZnVuY3Rpb24oKSB7IHJldHVybiAwOyB9O1xuIiwiLyogZ2xvYmFsIGV4cG9ydHMgKi9cbi8qKlxuICogQGZpbGVvdmVydmlldyBhIHRpbnkgbGlicmFyeSBmb3IgV2ViIFdvcmtlciBSZW1vdGUgTWV0aG9kIEludm9jYXRpb25cbiAqXG4gKi9cbmNvbnN0IE9iamVjdElEID0gcmVxdWlyZSgnYnNvbi1vYmplY3RpZCcpO1xuXG4vKipcbiAqIEBwcml2YXRlIHJldHVybnMgYSBsaXN0IG9mIFRyYW5zZmVyYWJsZSBvYmplY3RzIHdoaWNoIHtAY29kZSBvYmp9IGluY2x1ZGVzXG4gKiBAcGFyYW0ge29iamVjdH0gb2JqIGFueSBvYmplY3RcbiAqIEBwYXJhbSB7QXJyYXl9IGxpc3QgZm9yIGludGVybmFsIHJlY3Vyc2lvbiBvbmx5XG4gKiBAcmV0dXJuIHtMaXN0fSBhIGxpc3Qgb2YgVHJhbnNmZXJhYmxlIG9iamVjdHNcbiAqL1xuZnVuY3Rpb24gZ2V0VHJhbnNmZXJMaXN0KG9iaiwgbGlzdCA9IFtdKSB7XG4gICAgaWYgKEFycmF5QnVmZmVyLmlzVmlldyhvYmopKSB7XG4gICAgICAgIGxpc3QucHVzaChvYmouYnVmZmVyKTtcbiAgICAgICAgcmV0dXJuIGxpc3Q7XG4gICAgfVxuICAgIGlmIChpc1RyYW5zZmVyYWJsZShvYmopKSB7XG4gICAgICAgIGxpc3QucHVzaChvYmopO1xuICAgICAgICByZXR1cm4gbGlzdDtcbiAgICB9XG4gICAgaWYgKCEodHlwZW9mIG9iaiA9PT0gJ29iamVjdCcpKSB7XG4gICAgICAgIHJldHVybiBsaXN0O1xuICAgIH1cbiAgICBmb3IgKGNvbnN0IHByb3AgaW4gb2JqKSB7XG4gICAgICAgIGlmIChvYmouaGFzT3duUHJvcGVydHkocHJvcCkpIHtcbiAgICAgICAgICAgIGdldFRyYW5zZmVyTGlzdChvYmpbcHJvcF0sIGxpc3QpO1xuICAgICAgICB9XG4gICAgfVxuICAgIHJldHVybiBsaXN0O1xufVxuXG4vKipcbiAqIEBwcml2YXRlIGNoZWNrcyBpZiB7QGNvZGUgb2JqfSBpcyBUcmFuc2ZlcmFibGUgb3Igbm90LlxuICogQHBhcmFtIHtvYmplY3R9IG9iaiBhbnkgb2JqZWN0XG4gKiBAcmV0dXJuIHtib29sZWFufVxuICovXG5mdW5jdGlvbiBpc1RyYW5zZmVyYWJsZShvYmopIHtcbiAgICBjb25zdCB0cmFuc2ZlcmFibGUgPSBbQXJyYXlCdWZmZXJdO1xuICAgIGlmICh0eXBlb2YgTWVzc2FnZVBvcnQgIT09ICd1bmRlZmluZWQnKSB7XG4gICAgICAgIHRyYW5zZmVyYWJsZS5wdXNoKE1lc3NhZ2VQb3J0KTtcbiAgICB9XG4gICAgaWYgKHR5cGVvZiBJbWFnZUJpdG1hcCAhPT0gJ3VuZGVmaW5lZCcpIHtcbiAgICAgICAgdHJhbnNmZXJhYmxlLnB1c2goSW1hZ2VCaXRtYXApO1xuICAgIH1cbiAgICByZXR1cm4gdHJhbnNmZXJhYmxlLnNvbWUoZSA9PiBvYmogaW5zdGFuY2VvZiBlKTtcbn1cblxuLyoqXG4gKiBAY2xhc3MgYmFzZSBjbGFzcyB3aG9zZSBjaGlsZCBjbGFzc2VzIHVzZSBSTUlcbiAqL1xuY2xhc3MgV29ya2VyUk1JIHtcbiAgICAvKipcbiAgICAgKiBAY29uc3RydWN0b3JcbiAgICAgKiBAcGFyYW0ge29iamVjdH0gcmVtb3RlIGFuIGluc3RhbmNlIHRvIGNhbGwgcG9zdE1lc3NhZ2UgbWV0aG9kXG4gICAgICogQHBhcmFtIHtBcnJheX0gYXJncyBhcmd1bWVudHMgdG8gYmUgcGFzc2VkIHRvIHNlcnZlci1zaWRlIGluc3RhbmNlXG4gICAgICovXG4gICAgY29uc3RydWN0b3IocmVtb3RlLCAuLi5hcmdzKSB7XG4gICAgICAgIHRoaXMucmVtb3RlID0gcmVtb3RlO1xuICAgICAgICB0aGlzLmlkID0gT2JqZWN0SUQoKS50b1N0cmluZygpO1xuICAgICAgICB0aGlzLm1ldGhvZFN0YXRlcyA9IHt9O1xuICAgICAgICB0aGlzLnJlbW90ZS5hZGRFdmVudExpc3RlbmVyKCdtZXNzYWdlJywgZXZlbnQgPT4ge1xuICAgICAgICAgICAgY29uc3QgZGF0YSA9IGV2ZW50LmRhdGE7XG4gICAgICAgICAgICBpZiAoZGF0YS5pZCA9PT0gdGhpcy5pZCkge1xuICAgICAgICAgICAgICAgIHRoaXMucmV0dXJuSGFuZGxlcihkYXRhKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfSwgZmFsc2UpO1xuICAgICAgICB0aGlzLmNvbnN0cnVjdG9yUHJvbWlzZSA9IHRoaXMuaW52b2tlUk0odGhpcy5jb25zdHJ1Y3Rvci5uYW1lLCBhcmdzKTtcbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBpbnZva2VzIHJlbW90ZSBtZXRob2RcbiAgICAgKiBAcGFyYW0ge3N0cmluZ30gbWV0aG9kTmFtZSBNZXRob2QgbmFtZVxuICAgICAqIEBwYXJhbSB7QXJyYXl9IGFyZ3MgYXJndW1lbnRzIHRvIGJlIHBhc3NlZCB0byBzZXJ2ZXItc2lkZSBpbnN0YW5jZVxuICAgICAqIEByZXR1cm4ge1Byb21pc2V9XG4gICAgICovXG4gICAgaW52b2tlUk0obWV0aG9kTmFtZSwgYXJncyA9IFtdKSB7XG4gICAgICAgIGlmICghdGhpcy5tZXRob2RTdGF0ZXNbbWV0aG9kTmFtZV0pIHtcbiAgICAgICAgICAgIHRoaXMubWV0aG9kU3RhdGVzW21ldGhvZE5hbWVdID0ge1xuICAgICAgICAgICAgICAgIG51bTogMCxcbiAgICAgICAgICAgICAgICByZXNvbHZlUmVqZWN0czoge31cbiAgICAgICAgICAgIH07XG4gICAgICAgIH1cbiAgICAgICAgcmV0dXJuIG5ldyBQcm9taXNlKChyZXNvbHZlLCByZWplY3QpID0+IHtcbiAgICAgICAgICAgIGNvbnN0IG1ldGhvZFN0YXRlID0gdGhpcy5tZXRob2RTdGF0ZXNbbWV0aG9kTmFtZV07XG4gICAgICAgICAgICBtZXRob2RTdGF0ZS5udW0gKz0gMTtcbiAgICAgICAgICAgIG1ldGhvZFN0YXRlLnJlc29sdmVSZWplY3RzW21ldGhvZFN0YXRlLm51bV0gPSB7IHJlc29sdmUsIHJlamVjdCB9O1xuICAgICAgICAgICAgdGhpcy5yZW1vdGUucG9zdE1lc3NhZ2Uoe1xuICAgICAgICAgICAgICAgIGlkOiB0aGlzLmlkLFxuICAgICAgICAgICAgICAgIG1ldGhvZE5hbWUsXG4gICAgICAgICAgICAgICAgbnVtOiBtZXRob2RTdGF0ZS5udW0sXG4gICAgICAgICAgICAgICAgYXJnc1xuICAgICAgICAgICAgfSwgZ2V0VHJhbnNmZXJMaXN0KGFyZ3MpKTtcbiAgICAgICAgfSk7XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogQHByaXZhdGUgaGFuZGxlcyBjb3JyZXNwb25kZW50ICdtZXNzYWdlJyBldmVudFxuICAgICAqIEBwYXJhbSB7b2JqfSBkYXRhIGRhdGEgcHJvcGVydHkgb2YgJ21lc3NhZ2UnIGV2ZW50XG4gICAgICovXG4gICAgcmV0dXJuSGFuZGxlcihkYXRhKSB7XG4gICAgICAgIGNvbnN0IHJlc29sdmVSZWplY3RzID0gdGhpcy5tZXRob2RTdGF0ZXNbZGF0YS5tZXRob2ROYW1lXS5yZXNvbHZlUmVqZWN0cztcbiAgICAgICAgaWYgKGRhdGEuZXJyb3IpIHtcbiAgICAgICAgICAgIHJlc29sdmVSZWplY3RzW2RhdGEubnVtXS5yZWplY3QoZGF0YS5lcnJvcik7XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICByZXNvbHZlUmVqZWN0c1tkYXRhLm51bV0ucmVzb2x2ZShkYXRhLnJlc3VsdCk7XG4gICAgICAgIH1cbiAgICAgICAgZGVsZXRlIHJlc29sdmVSZWplY3RzW2RhdGEubnVtXTtcbiAgICB9XG59XG5cblxuLyoqXG4gKiBAcHJpdmF0ZSBleGVjdXRlcyBhIG1ldGhvZCBvbiBzZXJ2ZXIgYW5kIHBvc3QgYSByZXN1bHQgYXMgbWVzc2FnZS5cbiAqIEBwYXJhbSB7b2JqfSBldmVudCAnbWVzc2FnZScgZXZlbnRcbiAqL1xuYXN5bmMgZnVuY3Rpb24gaGFuZGxlV29ya2VyUk1JKGV2ZW50KSB7XG4gICAgY29uc3QgZGF0YSA9IGV2ZW50LmRhdGE7XG4gICAgY29uc3QgbWVzc2FnZSA9IHtcbiAgICAgICAgaWQ6IGRhdGEuaWQsXG4gICAgICAgIG1ldGhvZE5hbWU6IGRhdGEubWV0aG9kTmFtZSxcbiAgICAgICAgbnVtOiBkYXRhLm51bSxcbiAgICB9O1xuICAgIGxldCByZXN1bHQ7XG4gICAgaWYgKGRhdGEubWV0aG9kTmFtZSA9PT0gdGhpcy5uYW1lKSB7XG4gICAgICAgIHRoaXMud29ya2VyUk1JLmluc3RhbmNlc1tkYXRhLmlkXSA9IG5ldyB0aGlzKC4uLmRhdGEuYXJncyk7XG4gICAgICAgIG1lc3NhZ2UucmVzdWx0ID0gbnVsbDtcbiAgICAgICAgdGhpcy53b3JrZXJSTUkudGFyZ2V0LnBvc3RNZXNzYWdlKG1lc3NhZ2UsIGdldFRyYW5zZmVyTGlzdChyZXN1bHQpKTtcbiAgICB9IGVsc2Uge1xuICAgICAgICBjb25zdCBpbnN0YW5jZSA9IHRoaXMud29ya2VyUk1JLmluc3RhbmNlc1tkYXRhLmlkXTtcbiAgICAgICAgaWYgKGluc3RhbmNlKSB7XG4gICAgICAgICAgICB0cnkge1xuICAgICAgICAgICAgICAgIHJlc3VsdCA9IGF3YWl0IGluc3RhbmNlW2RhdGEubWV0aG9kTmFtZV0uYXBwbHkoaW5zdGFuY2UsIGRhdGEuYXJncylcbiAgICAgICAgICAgICAgICBtZXNzYWdlLnJlc3VsdCA9IHJlc3VsdDtcbiAgICAgICAgICAgICAgICB0aGlzLndvcmtlclJNSS50YXJnZXQucG9zdE1lc3NhZ2UobWVzc2FnZSwgZ2V0VHJhbnNmZXJMaXN0KHJlc3VsdCkpO1xuICAgICAgICAgICAgfSBjYXRjaCAoZSkge1xuICAgICAgICAgICAgICAgIG1lc3NhZ2UuZXJyb3IgPSBlLnRvU3RyaW5nKCk7XG4gICAgICAgICAgICAgICAgdGhpcy53b3JrZXJSTUkudGFyZ2V0LnBvc3RNZXNzYWdlKG1lc3NhZ2UpO1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgfVxufVxuXG4vKipcbiAqIHJlZ2lzdGVycyBhIGNsYXNzIGFzIGFuIGV4ZWN1dGVyIG9mIFJNSSBvbiBzZXJ2ZXJcbiAqIEBwYXJhbSB7b2JqfSB0YXJnZXQgYW4gaW5zdGFuY2UgdGhhdCByZWNlaXZlcyAnbWVzc2FnZScgZXZlbnRzIG9mIFJNSVxuICogQHBhcmFtIHtDbGFzc30ga2xhc3MgYSBjbGFzcyB0byBiZSByZWdpc3RlcmVkXG4gKi9cbmZ1bmN0aW9uIHJlc2lndGVyV29ya2VyUk1JKHRhcmdldCwga2xhc3MpIHtcbiAgICBrbGFzcy53b3JrZXJSTUkgPSB7XG4gICAgICAgIHRhcmdldCxcbiAgICAgICAgaW5zdGFuY2VzOiB7fSxcbiAgICAgICAgaGFuZGxlcjogaGFuZGxlV29ya2VyUk1JLmJpbmQoa2xhc3MpXG4gICAgfVxuICAgIHRhcmdldC5hZGRFdmVudExpc3RlbmVyKCdtZXNzYWdlJywga2xhc3Mud29ya2VyUk1JLmhhbmRsZXIpO1xufVxuXG4vKipcbiAqIHVucmVzaWd0ZXJzIGEgY2xhc3MgcmVnaXN0ZXJlZCBieSByZWdpc3RlcldvcmtlclJNSVxuICogQHBhcmFtIHtvYmp9IHRhcmdldCBhbiBpbnN0YW5jZSB0aGF0IHJlY2VpdmVzICdtZXNzYWdlJyBldmVudHMgb2YgUk1JXG4gKiBAcGFyYW0ge0NsYXNzfSBrbGFzcyBhIGNsYXNzIHRvIGJlIHVucmVnaXN0ZXJlZFxuICovXG5mdW5jdGlvbiB1bnJlc2lndGVyV29ya2VyUk1JKHRhcmdldCwga2xhc3MpIHtcbiAgICB0YXJnZXQucmVtb3ZlRXZlbnRMaXN0ZW5lcignbWVzc2FnZScsIGtsYXNzLndvcmtlclJNSS5oYW5kbGVyKVxuICAgIGRlbGV0ZSBrbGFzcy53b3JrZXJSTUk7XG59XG5cbmV4cG9ydHMuV29ya2VyUk1JID0gV29ya2VyUk1JO1xuZXhwb3J0cy5yZXNpZ3RlcldvcmtlclJNSSA9IHJlc2lndGVyV29ya2VyUk1JO1xuZXhwb3J0cy51bnJlc2lndGVyV29ya2VyUk1JID0gdW5yZXNpZ3RlcldvcmtlclJNSTtcbiIsIid1c2Ugc3RyaWN0JztcblxuT2JqZWN0LmRlZmluZVByb3BlcnR5KGV4cG9ydHMsIFwiX19lc01vZHVsZVwiLCB7XG4gICAgdmFsdWU6IHRydWVcbn0pO1xuZXhwb3J0cy5BWmpzRW5naW5lID0gdW5kZWZpbmVkO1xuXG52YXIgX3dvcmtlclJtaSA9IHJlcXVpcmUoJ3dvcmtlci1ybWknKTtcblxudmFyIF9uZXVyYWxfbmV0d29yayA9IHJlcXVpcmUoJy4vbmV1cmFsX25ldHdvcmsuanMnKTtcblxuLy8g5oCd6ICD44Ko44Oz44K444OzQVpqc0VuZ2luZeOBruacrOS9k+OCkuOCpuOCp+ODluODr+ODvOOCq+ODvOOBqOOBl+OBpuWLleOBi+OBl+OBvuOBmeOAglxuLyoqXG4gKiBAZmlsZSDmgJ3ogIPjgqjjg7Pjgrjjg7NBWmpzRW5naW5l44GuUk1J54mI44Gn44GZ44CC44OJ44Kt44Ol44Oh44Oz44OI44Gv5pys5L2T5YG044Gu44Kz44O844OJ44KS5Y+C54Wn44GX44Gm44GP44Gg44GV44GE44CCXG4gKi9cbi8qXG4gKiBAYXV0aG9yIOW4guW3nembhOS6jFxuICogQGNvcHlyaWdodCAyMDE4IElDSElLQVdBLCBZdWppIChOZXcgMyBScylcbiAqIEBsaWNlbnNlIE1JVFxuICovXG5jb25zdCB3b3JrZXIgPSBuZXcgV29ya2VyKCdqcy9hei13b3JrZXIuanMnKTtcbi8vIOODi+ODpeODvOODqeODq+ODjeODg+ODiOODr+ODvOOCr+OCkuODoeOCpOODs+OCueODrOODg+ODieOBp+WLleOBi+OBmeOCiOOBhuOBq+eZu+mMsuOBl+OBvuOBmeOAglxuLy8gV2ViR0wvV2ViR1BV44GM44Oh44Kk44Oz44K544Os44OD44OJ44Gu44G/44Gn5YuV5L2c44GZ44KL44GL44KJ44Gn44GZ44CCXG4vLyDlrp/pmpvjga7lkbzjgbPlh7rjgZfjga/kuIroqJjjg6/jg7zjgqvjgYzjgZfjgb7jgZnjgIJcbigwLCBfd29ya2VyUm1pLnJlc2lndGVyV29ya2VyUk1JKSh3b3JrZXIsIF9uZXVyYWxfbmV0d29yay5OZXVyYWxOZXR3b3JrKTtcblxuLyoqXG4gKiDmgJ3ogIPjgqjjg7Pjgrjjg7NBWmpzRW5naW5l44GuUk1J54mI44Gn44GZ44CC44OJ44Kt44Ol44Oh44Oz44OI44Gv5pys5L2T5YG044Gu44Kz44O844OJ44KS5Y+C54Wn44GX44Gm44GP44Gg44GV44GE44CCXG4gKiBAYWxpYXMgQVpqc0VuZ2luZVJNSVxuICogQHNlZSBBWmpzRW5naW5lXG4gKi9cbmNsYXNzIEFaanNFbmdpbmUgZXh0ZW5kcyBfd29ya2VyUm1pLldvcmtlclJNSSB7XG4gICAgLyoqXG4gICAgICog56KB55uk44K144Kk44K6c2l6ZeOBruaAneiAg+OCqOODs+OCuOODs+OCkui/lOOBl+OBvuOBmeOAglxuICAgICAqIEBwYXJhbSB7SW50ZWdlcn0gc2l6ZSBcbiAgICAgKi9cbiAgICBjb25zdHJ1Y3RvcihzaXplKSB7XG4gICAgICAgIHN1cGVyKHdvcmtlciwgc2l6ZSk7XG4gICAgfVxuXG4gICAgLyoqICovXG4gICAgYXN5bmMgbG9hZE5OKCkge1xuICAgICAgICBhd2FpdCB0aGlzLmludm9rZVJNKCdsb2FkTk4nKTtcbiAgICB9XG5cbiAgICAvKiogKi9cbiAgICBhc3luYyBjbGVhcigpIHtcbiAgICAgICAgYXdhaXQgdGhpcy5zdG9wKCk7XG4gICAgICAgIGF3YWl0IHRoaXMuaW52b2tlUk0oJ2NsZWFyJyk7XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogdGltZVNldHRpbmdz44GuUk1J44Gn44GZ44CCXG4gICAgICogbWFpblRpbWXjgahieW95b21p44Gu5Y+W5b6X44GnUk1J44KS6YG/44GR44KL44Gf44KB44CB6Kit5a6a5YCk44KS44GT44Gh44KJ44Gn44KC5L+d5oyB44GX44G+44GZ44CCXG4gICAgICogQHBhcmFtIHtudW1iZXJ9IG1haW5UaW1lIFxuICAgICAqIEBwYXJhbSB7bnVtYmVyfSBieW95b21pIFxuICAgICAqL1xuICAgIGFzeW5jIHRpbWVTZXR0aW5ncyhtYWluVGltZSwgYnlveW9taSkge1xuICAgICAgICB0aGlzLm1haW5UaW1lID0gbWFpblRpbWU7XG4gICAgICAgIHRoaXMuYnlveW9taSA9IGJ5b3lvbWk7XG4gICAgICAgIGF3YWl0IHRoaXMuaW52b2tlUk0oJ3RpbWVTZXR0aW5ncycsIFttYWluVGltZSwgYnlveW9taV0pO1xuICAgIH1cblxuICAgIGFzeW5jIGdlbm1vdmUoKSB7XG4gICAgICAgIHJldHVybiBhd2FpdCB0aGlzLmludm9rZVJNKCdnZW5tb3ZlJyk7XG4gICAgfVxuXG4gICAgYXN5bmMgcGxheSh4LCB5KSB7XG4gICAgICAgIGF3YWl0IHRoaXMuaW52b2tlUk0oJ3BsYXknLCBbeCwgeV0pO1xuICAgIH1cblxuICAgIGFzeW5jIHBhc3MoKSB7XG4gICAgICAgIGF3YWl0IHRoaXMuaW52b2tlUk0oJ3Bhc3MnKTtcbiAgICB9XG5cbiAgICBhc3luYyBzZWFyY2goKSB7XG4gICAgICAgIHJldHVybiBhd2FpdCB0aGlzLmludm9rZVJNKCdzZWFyY2gnKTtcbiAgICB9XG5cbiAgICBhc3luYyBmaW5hbFNjb3JlKCkge1xuICAgICAgICByZXR1cm4gYXdhaXQgdGhpcy5pbnZva2VSTSgnZmluYWxTY29yZScpO1xuICAgIH1cblxuICAgIGFzeW5jIHBvbmRlcigpIHtcbiAgICAgICAgcmV0dXJuIGF3YWl0IHRoaXMuaW52b2tlUk0oJ3BvbmRlcicpO1xuICAgIH1cblxuICAgIGFzeW5jIHN0b3AoKSB7XG4gICAgICAgIGF3YWl0IHRoaXMuaW52b2tlUk0oJ3N0b3AnKTtcbiAgICB9XG5cbiAgICBhc3luYyB0aW1lTGVmdCgpIHtcbiAgICAgICAgcmV0dXJuIGF3YWl0IHRoaXMuaW52b2tlUk0oJ3RpbWVMZWZ0Jyk7XG4gICAgfVxufVxuZXhwb3J0cy5BWmpzRW5naW5lID0gQVpqc0VuZ2luZTsiLCIndXNlIHN0cmljdCc7XG5cbk9iamVjdC5kZWZpbmVQcm9wZXJ0eShleHBvcnRzLCBcIl9fZXNNb2R1bGVcIiwge1xuICAgIHZhbHVlOiB0cnVlXG59KTtcbi8qKlxuICogQGZpbGUgTVZD44Gu44Kz44Oz44OI44Ot44O844Op44Gu44Kq44OW44K244O844OQ44O844Kv44Op44K544Gn44GZ44CCXG4gKi9cbi8qXG4gKiBAYXV0aG9yIOW4guW3nembhOS6jFxuICogQGNvcHlyaWdodCAyMDE3IElDSElLQVdBLCBZdWppIChOZXcgMyBScylcbiAqIEBsaWNlbnNlIE1JVFxuICovXG4vKiBnbG9iYWwgSkdPOmZhbHNlLCBXQXVkaW86ZmFsc2UgKi9cblxuY29uc3Qgc3RvbmVTb3VuZCA9IG5ldyBXQXVkaW8oJ2F1ZGlvL2dvLXBpZWNlMS5tcDMnKTtcblxuLyoqXG4gKiAgakdvQm9hcmTjga7jgZ/jgoHjga7jgrPjg7Pjg4jjg63jg7zjg6lcYuOBp+OBmeOAgiBcbiAqIEBzZWUge0BsaW5rIGh0dHBzOi8vZ2l0aHViLmNvbS9qb2trZWJrL2pnb2JvYXJkfVxuICovXG5jbGFzcyBCb2FyZENvbnRyb2xsZXIge1xuICAgIC8qKlxuICAgICAqIGpHb0JvYXJk44KS55Sf5oiQ44GX44CB5o+P55S744GM57WC44KP44Gj44Gf44KJY2FsbGJhY2vjgpLlkbzjgbPlh7rjgZfjgb7jgZnjgIJcbiAgICAgKiBAcGFyYW0ge0ludGVnZXJ9IGJvYXJkU2l6ZSBcbiAgICAgKiBAcGFyYW0ge0ludGVnZXJ9IGhhbmRpY2FwIFxuICAgICAqIEBwYXJhbSB7bnVtYmVyfSBrb21pIFxuICAgICAqIEBwYXJhbSB7RnVuY3Rpb259IGNhbGxiYWNrIFxuICAgICAqL1xuICAgIGNvbnN0cnVjdG9yKGJvYXJkU2l6ZSwgaGFuZGljYXAsIGtvbWksIGNhbGxiYWNrKSB7XG4gICAgICAgIHRoaXMuaWQgPSAnYm9hcmQnO1xuICAgICAgICB0aGlzLm93bkNvbG9yID0gSkdPLkJMQUNLOyAvLyBvd25Db2xvcuOBr0dVSeOCkuS9v+eUqOOBmeOCi+WBtFxuICAgICAgICB0aGlzLnR1cm4gPSBKR08uQkxBQ0s7XG4gICAgICAgIHRoaXMuanJlY29yZCA9IG51bGw7XG4gICAgICAgIHRoaXMuamJvYXJkID0gbnVsbDtcbiAgICAgICAgdGhpcy5rbyA9IGZhbHNlO1xuICAgICAgICB0aGlzLmxhc3RIb3ZlciA9IG51bGw7XG4gICAgICAgIHRoaXMubGFzdE1vdmUgPSBudWxsO1xuICAgICAgICB0aGlzLm9ic2VydmVycyA9IFtdO1xuICAgICAgICB0aGlzLnBhc3NOdW0gPSAwO1xuXG4gICAgICAgIHRoaXMuanJlY29yZCA9IEpHTy5zZ2YubG9hZChgKDtTWlske2JvYXJkU2l6ZX1dS01bJHtrb21pfV0pYCwgZmFsc2UpO1xuICAgICAgICB0aGlzLmpib2FyZCA9IHRoaXMuanJlY29yZC5nZXRCb2FyZCgpO1xuICAgICAgICBpZiAoaGFuZGljYXAgPj0gMikge1xuICAgICAgICAgICAgY29uc3Qgc3RvbmVzID0gSkdPLnV0aWwuZ2V0SGFuZGljYXBDb29yZGluYXRlcyh0aGlzLmpib2FyZC53aWR0aCwgaGFuZGljYXApO1xuICAgICAgICAgICAgdGhpcy5qYm9hcmQuc2V0VHlwZShzdG9uZXMsIEpHTy5CTEFDSyk7XG4gICAgICAgICAgICB0aGlzLnR1cm4gPSBKR08uV0hJVEU7XG4gICAgICAgIH1cblxuICAgICAgICBjb25zdCBvcHRpb25zID0geyBzdGFyczogeyBwb2ludHM6IDkgfSB9O1xuICAgICAgICBKR08udXRpbC5leHRlbmQob3B0aW9ucywgSkdPLkJPQVJELmxhcmdlKTtcbiAgICAgICAgY29uc3QganNldHVwID0gbmV3IEpHTy5TZXR1cCh0aGlzLmpib2FyZCwgb3B0aW9ucyk7XG4gICAgICAgIGpzZXR1cC5zZXRPcHRpb25zKHsgY29vcmRpbmF0ZXM6IHtcbiAgICAgICAgICAgICAgICB0b3A6IGZhbHNlLFxuICAgICAgICAgICAgICAgIGJvdHRvbTogZmFsc2UsXG4gICAgICAgICAgICAgICAgbGVmdDogZmFsc2UsXG4gICAgICAgICAgICAgICAgcmlnaHQ6IGZhbHNlXG4gICAgICAgICAgICB9IH0pO1xuXG4gICAgICAgIGpzZXR1cC5jcmVhdGUodGhpcy5pZCwgY2FudmFzID0+IHtcbiAgICAgICAgICAgIGNhbnZhcy5hZGRMaXN0ZW5lcignY2xpY2snLCB0aGlzLmNsaWNrSGFuZGVyLmJpbmQodGhpcykpO1xuICAgICAgICAgICAgY2FudmFzLmFkZExpc3RlbmVyKCdtb3VzZW1vdmUnLCB0aGlzLm1vdmVIYW5kbGVyLmJpbmQodGhpcykpO1xuICAgICAgICAgICAgY2FudmFzLmFkZExpc3RlbmVyKCdtb3VzZW91dCcsIHRoaXMubGVhdmVIYW5kbGVyLmJpbmQodGhpcykpO1xuICAgICAgICAgICAgY2FudmFzLmFkZExpc3RlbmVyKCdtb3VzZWRvd24nLCB0aGlzLmRvd25IYW5kbGVyLmJpbmQodGhpcykpO1xuICAgICAgICAgICAgY2FsbGJhY2sodGhpcyk7XG4gICAgICAgIH0pO1xuICAgIH1cblxuICAgIC8qKlxuICAgICAqIOmWoumAo+OBruOCquODluOCtuODvOODkOODvOOChERPTeOCkuegtOajhOOBl+OBvuOBmeOAgiBcbiAgICAgKi9cbiAgICBkZXN0cm95KCkge1xuICAgICAgICB0aGlzLnJlbW92ZU9ic2VydmVycygpO1xuICAgICAgICBjb25zdCBkb20gPSBkb2N1bWVudC5nZXRFbGVtZW50QnlJZCh0aGlzLmlkKTtcbiAgICAgICAgd2hpbGUgKGRvbS5maXJzdENoaWxkKSB7XG4gICAgICAgICAgICBkb20ucmVtb3ZlQ2hpbGQoZG9tLmZpcnN0Q2hpbGQpO1xuICAgICAgICB9XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogR1VJ44KS5L2/55So44GZ44KL5YG044Gu55+z44Gu6Imy44KS6Kit5a6a44GX44G+44GZ44CCXG4gICAgICovXG4gICAgc2V0T3duQ29sb3IoY29sb3IpIHtcbiAgICAgICAgdGhpcy5vd25Db2xvciA9IGNvbG9yO1xuICAgIH1cblxuICAgIC8qKlxuICAgICAqIOOCs+ODn+OCkuioreWumuOBl+OBvuOBmeOAglxuICAgICAqIEBwYXJhbSB7Kn0ga29taSBcbiAgICAgKi9cbiAgICBzZXRLb21pKGtvbWkpIHtcbiAgICAgICAgY29uc3Qgbm9kZSA9IHRoaXMuanJlY29yZC5nZXRSb290Tm9kZSgpO1xuICAgICAgICBub2RlLmluZm8ua29taSA9IGtvbWkudG9TdHJpbmcoKTtcbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiDjgqrjg5bjgrbjg7zjg5Djg7zjgpLov73liqDjgZfjgIHjgqrjg5bjgrbjg7zjg5Djg7zjga51cGRhdGXjgpLlkbzjgbPlh7rjgZfjgb7jgZnjgIJcbiAgICAgKiBAcGFyYW0geyp9IG9ic2VydmVyIOW8leaVsOOBq2Nvb3Jk44KS5Y+X44GR5Y+W44KLdXBkYXRl44Oh44K944OD44OJ44KS5oyB44Gk44Kq44OW44K444Kn44Kv44OI44CCXG4gICAgICovXG4gICAgYWRkT2JzZXJ2ZXIob2JzZXJ2ZXIpIHtcbiAgICAgICAgdGhpcy5vYnNlcnZlcnMucHVzaChvYnNlcnZlcik7XG4gICAgICAgIG9ic2VydmVyLnVwZGF0ZSgpO1xuICAgIH1cblxuICAgIC8qKlxuICAgICAqIOWFqOOCquODluOCtuODvOODkOODvOOCkuWJiumZpOOBl+OBvuOBmeOAglxuICAgICAqL1xuICAgIHJlbW92ZU9ic2VydmVycygpIHtcbiAgICAgICAgdGhpcy5vYnNlcnZlcnMgPSBbXTtcbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBqR29Cb2FyZOOBjOabtOaWsOOBleOCjOOBn+OBqOOBjeOBq+WRvOOBs+WHuuOBleOCjOOCi+ODoeOCveODg+ODieOBp+OBmeOAglxuICAgICAqIEBwcml2YXRlXG4gICAgICogQHBhcmFtIHsqfSBjb29yZCBcbiAgICAgKi9cbiAgICB1cGRhdGUoY29vcmQpIHtcbiAgICAgICAgY29uc3Qgbm9kZSA9IHRoaXMuanJlY29yZC5nZXRDdXJyZW50Tm9kZSgpO1xuICAgICAgICBkb2N1bWVudC5nZXRFbGVtZW50QnlJZCgnb3Bwb25lbnQtY2FwdHVyZXMnKS5pbm5lclRleHQgPSBub2RlLmluZm8uY2FwdHVyZXNbdGhpcy5vd25Db2xvciA9PT0gSkdPLkJMQUNLID8gSkdPLldISVRFIDogSkdPLkJMQUNLXTtcbiAgICAgICAgZG9jdW1lbnQuZ2V0RWxlbWVudEJ5SWQoJ293bi1jYXB0dXJlcycpLmlubmVyVGV4dCA9IG5vZGUuaW5mby5jYXB0dXJlc1t0aGlzLm93bkNvbG9yXTtcbiAgICAgICAgc2V0VGltZW91dCgoKSA9PiB7XG4gICAgICAgICAgICB0aGlzLm9ic2VydmVycy5mb3JFYWNoKGZ1bmN0aW9uIChvYnNlcnZlcikge1xuICAgICAgICAgICAgICAgIG9ic2VydmVyLnVwZGF0ZShjb29yZCk7XG4gICAgICAgICAgICB9KTtcbiAgICAgICAgfSwgMTApOyAvLyAw44Gn44GvakdvQm9hcmTjga7jg6zjg7Pjg4Djg6rjg7PjgrDjgYzntYLjgo/jgaPjgabjgYTjgarjgYTjga7jgafjgIExMOOBq+OBl+OBvuOBl+OBn+OAglxuICAgIH1cblxuICAgIC8qKlxuICAgICAqIOedgOaJi+OBl+OBvuOBmeOAglxuICAgICAqIEBwYXJhbSB7SkdPLkNvb3JkaW5hdGV9IGNvb3JkIFxuICAgICAqIEBwYXJhbSB7Ym9vbH0gc291bmQgXG4gICAgICovXG4gICAgcGxheShjb29yZCwgc291bmQgPSBmYWxzZSkge1xuICAgICAgICBjb25zdCBwbGF5ID0gdGhpcy5qYm9hcmQucGxheU1vdmUoY29vcmQsIHRoaXMudHVybiwgdGhpcy5rbyk7XG4gICAgICAgIGlmICghcGxheS5zdWNjZXNzKSB7XG4gICAgICAgICAgICBjb25zb2xlLmxvZyhjb29yZCwgcGxheSk7XG4gICAgICAgICAgICByZXR1cm4gcGxheS5zdWNjZXNzO1xuICAgICAgICB9XG4gICAgICAgIGNvbnN0IG5vZGUgPSB0aGlzLmpyZWNvcmQuY3JlYXRlTm9kZShmYWxzZSk7XG4gICAgICAgIC8vIHRhbGx5IGNhcHR1cmVzXG4gICAgICAgIG5vZGUuaW5mby5jYXB0dXJlc1t0aGlzLnR1cm5dICs9IHBsYXkuY2FwdHVyZXMubGVuZ3RoO1xuICAgICAgICBpZiAoY29vcmQpIHtcbiAgICAgICAgICAgIC8vIHBsYXkgc3RvbmVcbiAgICAgICAgICAgIG5vZGUuc2V0VHlwZShjb29yZCwgdGhpcy50dXJuKTtcbiAgICAgICAgICAgIG5vZGUuc2V0TWFyayhjb29yZCwgSkdPLk1BUksuQ0lSQ0xFKTsgLy8gbWFyayBtb3ZlXG4gICAgICAgICAgICAvLyBjbGVhciBvcHBvbmVudCdzIHN0b25lc1xuICAgICAgICAgICAgbm9kZS5zZXRUeXBlKHBsYXkuY2FwdHVyZXMsIEpHTy5DTEVBUik7XG4gICAgICAgIH1cbiAgICAgICAgaWYgKHRoaXMubGFzdE1vdmUpIHtcbiAgICAgICAgICAgIG5vZGUuc2V0TWFyayh0aGlzLmxhc3RNb3ZlLCBKR08uTUFSSy5OT05FKTsgLy8gY2xlYXIgcHJldmlvdXMgbWFya1xuICAgICAgICB9XG4gICAgICAgIGlmICh0aGlzLmtvKSB7XG4gICAgICAgICAgICBub2RlLnNldE1hcmsodGhpcy5rbywgSkdPLk1BUksuTk9ORSk7IC8vIGNsZWFyIHByZXZpb3VzIGtvIG1hcmtcbiAgICAgICAgfVxuICAgICAgICB0aGlzLmxhc3RNb3ZlID0gY29vcmQ7XG4gICAgICAgIGlmIChwbGF5LmtvKSB7XG4gICAgICAgICAgICBub2RlLnNldE1hcmsocGxheS5rbywgSkdPLk1BUksuQ0lSQ0xFKTsgLy8gbWFyayBrbywgdG9vXG4gICAgICAgIH1cbiAgICAgICAgdGhpcy5rbyA9IHBsYXkua287XG4gICAgICAgIHRoaXMudHVybiA9IHRoaXMudHVybiA9PT0gSkdPLkJMQUNLID8gSkdPLldISVRFIDogSkdPLkJMQUNLO1xuICAgICAgICBpZiAoY29vcmQgPT0gbnVsbCkge1xuICAgICAgICAgICAgdGhpcy5wYXNzTnVtICs9IDE7XG4gICAgICAgICAgICB0aGlzLnVwZGF0ZSh0aGlzLnBhc3NOdW0gPCAyID8gJ3Bhc3MnIDogJ2VuZCcpO1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgdGhpcy5wYXNzTnVtID0gMDtcbiAgICAgICAgICAgIHRoaXMudXBkYXRlKGNvb3JkKTtcbiAgICAgICAgICAgIGlmIChzb3VuZCkge1xuICAgICAgICAgICAgICAgIHN0b25lU291bmQucGxheSgpO1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICAgIHJldHVybiBwbGF5LnN1Y2Nlc3M7XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogQHByaXZhdGVcbiAgICAgKiBAcGFyYW0ge0pHTy5Db29yZGluYXRlfSBjb29yZCBcbiAgICAgKiBAcGFyYW0ge0V2ZW50fSBldiBcbiAgICAgKi9cbiAgICBjbGlja0hhbmRlcihjb29yZCwgZXYpIHtcbiAgICAgICAgLy8gY2xlYXIgaG92ZXIgYXdheSAtIGl0J2xsIGJlIHJlcGxhY2VkIG9yXG4gICAgICAgIC8vIHRoZW4gaXQgd2lsbCBiZSBhbiBpbGxlZ2FsIG1vdmUgaW4gYW55IGNhc2VcbiAgICAgICAgLy8gc28gbm8gbmVlZCB0byB3b3JyeSBhYm91dCBwdXR0aW5nIGl0IGJhY2sgYWZ0ZXJ3YXJkc1xuICAgICAgICBpZiAodGhpcy5vd25Db2xvciAhPT0gdGhpcy50dXJuKSB7XG4gICAgICAgICAgICByZXR1cm47XG4gICAgICAgIH1cbiAgICAgICAgaWYgKHRoaXMubGFzdEhvdmVyICE9IG51bGwpIHtcbiAgICAgICAgICAgIHRoaXMuamJvYXJkLnNldFR5cGUodGhpcy5sYXN0SG92ZXIsIEpHTy5DTEVBUik7XG4gICAgICAgICAgICB0aGlzLmxhc3RIb3ZlciA9IG51bGw7XG4gICAgICAgIH1cbiAgICAgICAgaWYgKGNvb3JkLmkgPj0gMCAmJiBjb29yZC5pIDwgdGhpcy5qYm9hcmQud2lkdGggJiYgY29vcmQuaiA+PSAwICYmIGNvb3JkLmogPCB0aGlzLmpib2FyZC5oZWlnaHQpIHtcbiAgICAgICAgICAgIHRoaXMucGxheShjb29yZCk7XG4gICAgICAgIH1cbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBAcHJpdmF0ZVxuICAgICAqIEBwYXJhbSB7SkdPLkNvb3JkaW5hdGV9IGNvb3JkIFxuICAgICAqIEBwYXJhbSB7RXZlbnR9IGV2IFxuICAgICAqL1xuICAgIG1vdmVIYW5kbGVyKGNvb3JkLCBldikge1xuICAgICAgICBpZiAodGhpcy5vd25Db2xvciAhPT0gdGhpcy50dXJuKSB7XG4gICAgICAgICAgICByZXR1cm47XG4gICAgICAgIH1cbiAgICAgICAgaWYgKHRoaXMubGFzdEhvdmVyICYmIHRoaXMubGFzdEhvdmVyLmVxdWFscyhjb29yZCkpIHtcbiAgICAgICAgICAgIHJldHVybjtcbiAgICAgICAgfVxuXG4gICAgICAgIGlmICh0aGlzLmxhc3RIb3ZlciAhPSBudWxsKSB7XG4gICAgICAgICAgICAvLyBjbGVhciBwcmV2aW91cyBob3ZlciBpZiB0aGVyZSB3YXMgb25lXG4gICAgICAgICAgICB0aGlzLmpib2FyZC5zZXRUeXBlKHRoaXMubGFzdEhvdmVyLCBKR08uQ0xFQVIpO1xuICAgICAgICB9XG5cbiAgICAgICAgaWYgKGNvb3JkLmkgPD0gLTEgfHwgY29vcmQuaiA8PSAtMSB8fCBjb29yZC5pID49IHRoaXMuamJvYXJkLndpZHRoIHx8IGNvb3JkLmogPj0gdGhpcy5qYm9hcmQuaGVpZ2h0KSB7XG4gICAgICAgICAgICB0aGlzLmxhc3RIb3ZlciA9IG51bGw7XG4gICAgICAgIH0gZWxzZSBpZiAodGhpcy5qYm9hcmQuZ2V0VHlwZShjb29yZCkgPT09IEpHTy5DTEVBUiAmJiB0aGlzLmpib2FyZC5nZXRNYXJrKGNvb3JkKSA9PSBKR08uTUFSSy5OT05FKSB7XG4gICAgICAgICAgICB0aGlzLmpib2FyZC5zZXRUeXBlKGNvb3JkLCB0aGlzLnR1cm4gPT0gSkdPLkJMQUNLID8gSkdPLkRJTV9CTEFDSyA6IEpHTy5ESU1fV0hJVEUpO1xuICAgICAgICAgICAgdGhpcy5sYXN0SG92ZXIgPSBjb29yZDtcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIHRoaXMubGFzdEhvdmVyID0gbnVsbDtcbiAgICAgICAgfVxuICAgIH1cblxuICAgIC8qKlxuICAgICAqIEBwcml2YXRlXG4gICAgICogQHBhcmFtIHtFdmVudH0gZXYgXG4gICAgICovXG4gICAgbGVhdmVIYW5kbGVyKGV2KSB7XG4gICAgICAgIGlmICh0aGlzLmxhc3RIb3ZlciAhPSBudWxsKSB7XG4gICAgICAgICAgICB0aGlzLmpib2FyZC5zZXRUeXBlKHRoaXMubGFzdEhvdmVyLCBKR08uQ0xFQVIpO1xuICAgICAgICAgICAgdGhpcy5sYXN0SG92ZXIgPSBudWxsO1xuICAgICAgICB9XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICog44Kv44Oq44OD44Kv44Gn44Gv44Gq44GP44Gm44OA44Km44OzL+OCv+ODg+ODgeOBp+efs+mfs+OCkueri+OBpuOBn+OBhOOBruOBp+OBk+OBk+OBp+WHpueQhuOBl+OBpuOBhOOBvuOBmeOAglxuICAgICAqIEBwcml2YXRlXG4gICAgICogQHBhcmFtIHtFdmVudH0gZXYgXG4gICAgICovXG4gICAgZG93bkhhbmRsZXIoZXYpIHtcbiAgICAgICAgaWYgKHRoaXMub3duQ29sb3IgPT09IHRoaXMudHVybikge1xuICAgICAgICAgICAgc3RvbmVTb3VuZC5wbGF5KCk7XG4gICAgICAgIH1cbiAgICB9XG59XG5leHBvcnRzLkJvYXJkQ29udHJvbGxlciA9IEJvYXJkQ29udHJvbGxlcjsiLCIndXNlIHN0cmljdCc7XG5cbnZhciBfc3BlZWNoID0gcmVxdWlyZSgnLi9zcGVlY2guanMnKTtcblxudmFyIF9hempzX2VuZ2luZV9jbGllbnQgPSByZXF1aXJlKCcuL2F6anNfZW5naW5lX2NsaWVudC5qcycpO1xuXG52YXIgX2JvYXJkX2NvbnRyb2xsZXIgPSByZXF1aXJlKCcuL2JvYXJkX2NvbnRyb2xsZXIuanMnKTtcblxudmFyIF9wbGF5X2NvbnRyb2xsZXIgPSByZXF1aXJlKCcuL3BsYXlfY29udHJvbGxlci5qcycpO1xuXG4vKipcbiAqIOaMh+WumuOBleOCjOOBn+eigeebpOOCteOCpOOCuuOBqOOCqOODs+OCuOODs+OBp+WvvuWxgOOCkue5sOOCiui/lOOBl+OBvuOBmeOAglxuICog5omL55Wq44Go5oyB44Gh5pmC6ZaT44Gv5a++5qW144Gu6YO95bqm5Y+X44GR5LuY44GR44G+44GZ44CCXG4gKiBAcGFyYW0ge0ludGVnZXJ9IHNpemUgXG4gKiBAcGFyYW0ge0FaanNFbmdpbmV9IGVuZ2luZSBcbiAqL1xuLyoqXG4gKiBAZmlsZSDjgqLjg5fjg6rjga7jgqjjg7Pjg4jjg6rjg7zjg53jgqTjg7Pjg4jjgafjgZnjgIJcbiAqL1xuLypcbiAqIEBhdXRob3Ig5biC5bed6ZuE5LqMXG4gKiBAY29weXJpZ2h0IDIwMTggSUNISUtBV0EsIFl1amkgKE5ldyAzIFJzKVxuICogQGxpY2Vuc2UgTUlUXG4gKi9cbi8qIGdsb2JhbCAkIEpHTyBpMThuICovXG5hc3luYyBmdW5jdGlvbiBzdGFydEdhbWUoc2l6ZSwgZW5naW5lKSB7XG4gICAgY29uc3QgY29udHJvbGxlciA9IGF3YWl0IG5ldyBQcm9taXNlKGZ1bmN0aW9uIChyZXMsIHJlaikge1xuICAgICAgICBuZXcgX2JvYXJkX2NvbnRyb2xsZXIuQm9hcmRDb250cm9sbGVyKHNpemUsIDAsIDcuNSwgcmVzKTtcbiAgICB9KTtcbiAgICBjb25zdCAkc3RhcnRNb2RhbCA9ICQoJyNzdGFydC1tb2RhbCcpO1xuICAgICRzdGFydE1vZGFsLm1vZGFsKCdzaG93Jyk7XG4gICAgLy8g44Om44O844K244O844GM5omL55Wq44Go5oyB44Gh5pmC6ZaT44KS5rG644KB44KL6ZaT44Gr44OL44Ol44O844Op44Or44ON44OD44OI44Ov44O844Kv44Gu44Km44Kn44Kk44OI44KS44OA44Km44Oz44Ot44O844OJ44GX44G+44GZ44CCXG4gICAgdHJ5IHtcbiAgICAgICAgYXdhaXQgZW5naW5lLmxvYWROTigpOyAvLyDkuIDluqbjgaDjgZHjg4Djgqbjg7Pjg63jg7zjg4njgZfjgIHmrKHlm57jga/lho3liKnnlKjjgZfjgb7jgZnjgIJcbiAgICAgICAgJCgnI2xvYWRpbmctbWVzc2FnZScpLnRleHQoaTE4bi5maW5pc2hEb3dubG9hZCk7XG4gICAgICAgICQoJyNzdGFydC1nYW1lJykucHJvcCgnZGlzYWJsZWQnLCBmYWxzZSk7XG4gICAgfSBjYXRjaCAoZSkge1xuICAgICAgICBpZiAoZSA9PT0gJ0Vycm9yOiBObyBiYWNrZW5kIGlzIGF2YWlsYWJsZScpIHtcbiAgICAgICAgICAgIGlmICgvKE1hYyBPUyBYIDEwXzEzfChpUGFkfGlQaG9uZXxpUG9kKTsgQ1BVIE9TIDExKS4qU2FmYXJpLy50ZXN0KG5hdmlnYXRvci51c2VyQWdlbnQpICYmICEvQ2hyb21lLy50ZXN0KG5hdmlnYXRvci51c2VyQWdlbnQpKSB7XG4gICAgICAgICAgICAgICAgKDAsIF9zcGVlY2guaTE4blNwZWFrKShpMThuLm5vdFN1cHBvcnQgKyBpMThuLnNhZmFyaVdpdGhvdXRXZWJncHUpO1xuICAgICAgICAgICAgfSBlbHNlIGlmICghKDAsIF9zcGVlY2guaTE4blNwZWFrKShpMThuLm5vdFN1cHBvcnQpKSB7XG4gICAgICAgICAgICAgICAgYWxlcnQoaTE4bi5ub3RTdXBwb3J0KTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIGNvbnNvbGUuZXJyb3IoZSk7XG4gICAgICAgIH1cbiAgICAgICAgcmV0dXJuO1xuICAgIH1cbiAgICBjb25zdCBjb25kaXRpb24gPSBhd2FpdCBuZXcgUHJvbWlzZShmdW5jdGlvbiAocmVzLCByZWopIHtcbiAgICAgICAgY29uc3QgJGNvbmRpdGlvbkZvcm0gPSAkKCcjY29uZGl0aW9uLWZvcm0nKTtcbiAgICAgICAgJGNvbmRpdGlvbkZvcm0ub25lKCdzdWJtaXQnLCBmdW5jdGlvbiAoZSkge1xuICAgICAgICAgICAgZS5wcmV2ZW50RGVmYXVsdCgpO1xuICAgICAgICAgICAgJHN0YXJ0TW9kYWwub25lKCdoaWRkZW4uYnMubW9kYWwnLCBmdW5jdGlvbiAoZSkge1xuICAgICAgICAgICAgICAgIHJlcyh7XG4gICAgICAgICAgICAgICAgICAgIGNvbG9yOiAkY29uZGl0aW9uRm9ybVswXVsnY29sb3InXS52YWx1ZSxcbiAgICAgICAgICAgICAgICAgICAgdGltZVJ1bGU6ICRjb25kaXRpb25Gb3JtWzBdWyd0aW1lJ10udmFsdWUsXG4gICAgICAgICAgICAgICAgICAgIHRpbWU6IHBhcnNlSW50KCRjb25kaXRpb25Gb3JtWzBdWydhaS1ieW95b21pJ10udmFsdWUpXG4gICAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICB9KTtcbiAgICAgICAgICAgICRzdGFydE1vZGFsLm1vZGFsKCdoaWRlJyk7XG4gICAgICAgIH0pO1xuICAgIH0pO1xuICAgIGxldCBtYWluVGltZTtcbiAgICBsZXQgYnlveW9taTtcbiAgICBzd2l0Y2ggKGNvbmRpdGlvbi50aW1lUnVsZSkge1xuICAgICAgICBjYXNlICdhaS10aW1lJzpcbiAgICAgICAgICAgIG1haW5UaW1lID0gMDtcbiAgICAgICAgICAgIGJ5b3lvbWkgPSBjb25kaXRpb24udGltZTtcbiAgICAgICAgICAgIGF3YWl0IGVuZ2luZS50aW1lU2V0dGluZ3MoMCwgYnlveW9taSk7XG4gICAgICAgICAgICBicmVhaztcbiAgICAgICAgY2FzZSAnaWdvLXF1ZXN0JzpcbiAgICAgICAgICAgIHN3aXRjaCAoc2l6ZSkge1xuICAgICAgICAgICAgICAgIGNhc2UgOTpcbiAgICAgICAgICAgICAgICAgICAgbWFpblRpbWUgPSAzICogNjA7XG4gICAgICAgICAgICAgICAgICAgIGJ5b3lvbWkgPSAxO1xuICAgICAgICAgICAgICAgICAgICBicmVhaztcbiAgICAgICAgICAgICAgICBjYXNlIDE5OlxuICAgICAgICAgICAgICAgICAgICBtYWluVGltZSA9IDcgKiA2MDtcbiAgICAgICAgICAgICAgICAgICAgYnlveW9taSA9IDM7XG4gICAgICAgICAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICAgICAgICAgIGRlZmF1bHQ6XG4gICAgICAgICAgICAgICAgICAgIHRocm93IG5ldyBFcnJvcignc2l6ZSBpcyBub3Qgc3VwcG9ydGVkJyk7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBhd2FpdCBlbmdpbmUudGltZVNldHRpbmdzKG1haW5UaW1lLCBieW95b21pKTtcbiAgICAgICAgICAgIGJyZWFrO1xuICAgIH1cbiAgICBpZiAoY29uZGl0aW9uLmNvbG9yID09PSAnVycpIHtcbiAgICAgICAgY29udHJvbGxlci5zZXRPd25Db2xvcihKR08uV0hJVEUpO1xuICAgICAgICBpZiAoY29udHJvbGxlci5qYm9hcmQud2lkdGggPT09IDkpIHtcbiAgICAgICAgICAgIGNvbnRyb2xsZXIuc2V0S29taSg1LjUpO1xuICAgICAgICB9XG4gICAgfSBlbHNlIGlmIChjb25kaXRpb24uY29sb3IgPT09ICdCJykge1xuICAgICAgICBjb250cm9sbGVyLnNldE93bkNvbG9yKEpHTy5CTEFDSyk7XG4gICAgICAgIGlmIChjb250cm9sbGVyLmpib2FyZC53aWR0aCA9PT0gOSkge1xuICAgICAgICAgICAgY29udHJvbGxlci5zZXRLb21pKDYuNSk7XG4gICAgICAgIH1cbiAgICB9XG4gICAgY29uc3QgaXNTZWxmUGxheSA9IGNvbmRpdGlvbi5jb2xvciA9PT0gJ3NlbGYtcGxheSc7XG4gICAgY29uc3Qgb2JzZXJ2ZXIgPSBuZXcgX3BsYXlfY29udHJvbGxlci5QbGF5Q29udHJvbGxlcihlbmdpbmUsIGNvbnRyb2xsZXIsIG1haW5UaW1lLCBieW95b21pLCBjb25kaXRpb24udGltZVJ1bGUgPT09ICdpZ28tcXVlc3QnLCBpc1NlbGZQbGF5KTtcbiAgICBpZiAoIWlzU2VsZlBsYXkpIHtcbiAgICAgICAgKDAsIF9zcGVlY2guaTE4blNwZWFrKShpMThuLnN0YXJ0R3JlZXQpO1xuICAgIH1cbiAgICBvYnNlcnZlci5zZXRJc1NlbGZQbGF5KGlzU2VsZlBsYXkpO1xuICAgIGNvbnRyb2xsZXIuYWRkT2JzZXJ2ZXIob2JzZXJ2ZXIpO1xuICAgICQoJyNwYXNzJykub24oJ2NsaWNrJywgZnVuY3Rpb24gKGV2ZW50KSB7XG4gICAgICAgIG9ic2VydmVyLnBhc3MoKTtcbiAgICB9KTtcbiAgICAkKCcjcmVzaWduJykub25lKCdjbGljaycsIGFzeW5jIGZ1bmN0aW9uIChldmVudCkge1xuICAgICAgICBvYnNlcnZlci5jbGVhclRpbWVyKCk7XG4gICAgICAgIGF3YWl0IGVuZ2luZS5zdG9wKCk7XG4gICAgICAgICgwLCBfc3BlZWNoLmkxOG5TcGVhaykoaTE4bi5lbmRHcmVldCk7XG4gICAgICAgICQoZG9jdW1lbnQuYm9keSkuYWRkQ2xhc3MoJ2VuZCcpO1xuICAgIH0pO1xuICAgICQoJyNyZXRyeScpLm9uZSgnY2xpY2snLCBhc3luYyBmdW5jdGlvbiAoZXZlbnQpIHtcbiAgICAgICAgJCgnI3Bhc3MnKS5vZmYoJ2NsaWNrJyk7XG4gICAgICAgICQoJyNyZXNpZ24nKS5vZmYoJ2NsaWNrJyk7XG4gICAgICAgIGNvbnRyb2xsZXIuZGVzdHJveSgpO1xuICAgICAgICBlbmdpbmUuY2xlYXIoKTtcbiAgICAgICAgJChkb2N1bWVudC5ib2R5KS5yZW1vdmVDbGFzcygnZW5kJyk7XG4gICAgICAgIHNldFRpbWVvdXQoYXN5bmMgZnVuY3Rpb24gKCkge1xuICAgICAgICAgICAgYXdhaXQgc3RhcnRHYW1lKHNpemUsIGVuZ2luZSk7XG4gICAgICAgIH0sIDApO1xuICAgIH0pO1xufVxuXG4vKipcbiAqIOeigeebpOOCteOCpOOCuuOCkuWPl+OBkeS7mOOBkeOAgeOCqOODs+OCuOODs+OCkueUn+aIkOOBl+OAgeWvvuWxgOOCkumWi+Wni+OBl+OBvuOBmeOAglxuICog56KB55uk44K144Kk44K644Go44Ko44Oz44K444Oz44Gv5YaN5a++5bGA44Gu6Zqb44Gr5YaN5Yip55So44GX44G+44GZ44CCXG4gKi9cbmFzeW5jIGZ1bmN0aW9uIG1haW4oKSB7XG4gICAgY29uc3QgJHNpemVNb2RhbCA9ICQoJyNzaXplLW1vZGFsJyk7XG4gICAgJHNpemVNb2RhbC5tb2RhbCgnc2hvdycpO1xuICAgIGNvbnN0IHNpemUgPSBhd2FpdCBuZXcgUHJvbWlzZShmdW5jdGlvbiAocmVzLCByZWopIHtcbiAgICAgICAgJCgnLmJ1dHRvbi1zaXplJykub25lKCdjbGljaycsIGZ1bmN0aW9uIChlKSB7XG4gICAgICAgICAgICByZXMocGFyc2VJbnQoZS5jdXJyZW50VGFyZ2V0LmRhdGFzZXQudmFsdWUpKTtcbiAgICAgICAgfSk7XG4gICAgfSk7XG4gICAgc3dpdGNoIChzaXplKSB7XG4gICAgICAgIGNhc2UgOTpcbiAgICAgICAgICAgICQoJyNzaXplLTktcnVsZScpLnNob3coKTtcbiAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICBkZWZhdWx0OlxuICAgICAgICAgICAgJCgnI3NpemUtMTktcnVsZScpLnNob3coKTtcbiAgICB9XG4gICAgY29uc3QgZW5naW5lID0gbmV3IF9hempzX2VuZ2luZV9jbGllbnQuQVpqc0VuZ2luZShzaXplKTtcbiAgICBhd2FpdCBzdGFydEdhbWUoc2l6ZSwgZW5naW5lKTtcbn1cblxubWFpbigpOyIsIid1c2Ugc3RyaWN0JztcblxuT2JqZWN0LmRlZmluZVByb3BlcnR5KGV4cG9ydHMsIFwiX19lc01vZHVsZVwiLCB7XG4gICAgdmFsdWU6IHRydWVcbn0pO1xuZXhwb3J0cy5OZXVyYWxOZXR3b3JrID0gdW5kZWZpbmVkO1xuXG52YXIgX3V0aWxzID0gcmVxdWlyZSgnLi91dGlscy5qcycpO1xuXG4vKiBzbGljZeOBrnBvbHlmaWxsICovXG5pZiAoIUFycmF5QnVmZmVyLnByb3RvdHlwZS5zbGljZSkge1xuICAgIEFycmF5QnVmZmVyLnByb3RvdHlwZS5zbGljZSA9IGZ1bmN0aW9uIChzdGFydCwgZW5kKSB7XG4gICAgICAgIHZhciB0aGF0ID0gbmV3IFVpbnQ4QXJyYXkodGhpcyk7XG4gICAgICAgIGlmIChlbmQgPT0gdW5kZWZpbmVkKSBlbmQgPSB0aGF0Lmxlbmd0aDtcbiAgICAgICAgdmFyIHJlc3VsdCA9IG5ldyBBcnJheUJ1ZmZlcihlbmQgLSBzdGFydCk7XG4gICAgICAgIHZhciByZXN1bHRBcnJheSA9IG5ldyBVaW50OEFycmF5KHJlc3VsdCk7XG4gICAgICAgIGZvciAodmFyIGkgPSAwOyBpIDwgcmVzdWx0QXJyYXkubGVuZ3RoOyBpKyspIHJlc3VsdEFycmF5W2ldID0gdGhhdFtpICsgc3RhcnRdO1xuICAgICAgICByZXR1cm4gcmVzdWx0O1xuICAgIH07XG59XG5cbi8qKlxuICog44Km44Kn44Kk44OI44KS44Ot44O844OJ44GZ44KL6Zqb44Gu44OX44Ot44Kw44Os44K544OQ44O844KS5pu05paw44GX44G+44GZ44CCXG4gKiBAcGFyYW0ge251bWJlcn0gcGVyY2VudGFnZSBcbiAqL1xuLyoqXG4gKiBAZmlsZSDjg4vjg6Xjg7zjg6njg6vjg43jg4Pjg4jjg6/jg7zjgq/jgpLoqIjnrpfjgZnjgovjgq/jg6njgrnjgafjgZnjgIJcbiAqL1xuLypcbiAqIEBhdXRob3Ig5biC5bed6ZuE5LqMXG4gKiBAY29weXJpZ2h0IDIwMTggSUNISUtBV0EsIFl1amkgKE5ldyAzIFJzKVxuICogQGxpY2Vuc2UgTUlUXG4gKi9cbi8qIGdsb2JhbCBXZWJETk4gJCAqL1xuZnVuY3Rpb24gc2V0TG9hZGluZ0JhcihwZXJjZW50YWdlKSB7XG4gICAgY29uc3QgJGxvYWRpbmdCYXIgPSAkKCcjbG9hZGluZy1iYXInKTtcbiAgICAkbG9hZGluZ0Jhci5hdHRyKCdhcmlhLXZhbHVlbm93JywgcGVyY2VudGFnZSk7XG4gICAgJGxvYWRpbmdCYXIuY3NzKCd3aWR0aCcsIHBlcmNlbnRhZ2UudG9TdHJpbmcoKSArICclJyk7XG59XG5cbi8qKiDjg4vjg6Xjg7zjg6njg6vjg43jg4Pjg4jjg6/jg7zjgq/jgpLoqIjnrpfjgZnjgovjgq/jg6njgrkoV2ViRE5O44GuRGVzY3JpcHRvclJ1bm5lcuOBruODqeODg+ODkeODvOOCr+ODqeOCuSkgKi9cbmNsYXNzIE5ldXJhbE5ldHdvcmsge1xuICAgIGNvbnN0cnVjdG9yKCkge1xuICAgICAgICB0aGlzLnZlcnNpb24gPSAxO1xuICAgICAgICB0aGlzLm5uID0gbnVsbDtcbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiDjgqbjgqfjgqTjg4jjg5XjgqHjgqTjg6vjgpLjg4Djgqbjg7Pjg63jg7zjg4njgZfjgb7jgZnjgIJcbiAgICAgKiBAcGFyYW0ge3N0cmluZ30gcGF0aCBXZWJETk7jg4fjg7zjgr/jga5VUkxcbiAgICAgKiBAcGFyYW0ge0ludGVnZXJ9IHZlcnNpb24gTGVlbGEgWmVyb+OBruOCpuOCp+OCpOODiOODleOCqeODvOODnuODg+ODiOeVquWPt1xuICAgICAqL1xuICAgIGFzeW5jIGxvYWQocGF0aCwgdmVyc2lvbiA9IDEpIHtcbiAgICAgICAgdGhpcy52ZXJzaW9uID0gdmVyc2lvbjtcbiAgICAgICAgaWYgKHRoaXMubm4pIHtcbiAgICAgICAgICAgIHNldExvYWRpbmdCYXIoMTAwKTtcbiAgICAgICAgICAgIHJldHVybjtcbiAgICAgICAgfVxuICAgICAgICBjb25zdCBvcHRpb25zID0ge1xuICAgICAgICAgICAgYmFja2VuZE9yZGVyOiBbJ3dlYmdwdScsICd3ZWJnbCddLFxuICAgICAgICAgICAgcHJvZ3Jlc3NDYWxsYmFjazogZnVuY3Rpb24gKGxvYWRlZCwgdG90YWwpIHtcbiAgICAgICAgICAgICAgICBzZXRMb2FkaW5nQmFyKGxvYWRlZCAvIHRvdGFsICogMTAwKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfTtcbiAgICAgICAgc2V0TG9hZGluZ0JhcigwKTtcbiAgICAgICAgdGhpcy5ubiA9IGF3YWl0IFdlYkROTi5sb2FkKHBhdGgsIG9wdGlvbnMpO1xuICAgICAgICBzZXRMb2FkaW5nQmFyKDEwMCk7IC8vIHByb2dyZXNzQ2FsbGJhY2vjgYzjgrPjg7zjg6vjgZXjgYjjgarjgYTjg5Hjgr/jg7zjg7PjgYzjgYLjgovjga7jgaflrozkuobmmYLjgavjgrPjg7zjg6vjgZfjgb7jgZnjgIJcbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiDjg4vjg6Xjg7zjg6njg6vjg43jg4Pjg4jjg6/jg7zjgq/jgpLoqZXkvqHjgZfjgZ/ntZDmnpzjgpLov5TjgZfjgb7jgZnjgIJcbiAgICAgKiBAcGFyYW0ge0FycmF5fSBpbnB1dHMgXG4gICAgICogQHJldHVybnMge0FycmF5fVxuICAgICAqL1xuICAgIGFzeW5jIGV2YWx1YXRlKC4uLmlucHV0cykge1xuICAgICAgICBjb25zdCB2aWV3cyA9IHRoaXMubm4uZ2V0SW5wdXRWaWV3cygpO1xuICAgICAgICBmb3IgKGxldCBpID0gMDsgaSA8IGlucHV0cy5sZW5ndGg7IGkrKykge1xuICAgICAgICAgICAgdmlld3NbaV0uc2V0KGlucHV0c1tpXSk7XG4gICAgICAgIH1cbiAgICAgICAgYXdhaXQgdGhpcy5ubi5ydW4oKTtcbiAgICAgICAgY29uc3QgcmVzdWx0ID0gdGhpcy5ubi5nZXRPdXRwdXRWaWV3cygpLm1hcChlID0+IGUudG9BY3R1YWwoKSk7XG4gICAgICAgIHJlc3VsdFswXSA9ICgwLCBfdXRpbHMuc29mdG1heCkocmVzdWx0WzBdKTtcbiAgICAgICAgcmVzdWx0WzFdID0gcmVzdWx0WzFdLnNsaWNlKDApOyAvLyB0by5BY3R1YWzjgZ3jga7jgoLjga7jgafjga9wb3N0TWVzc2FnZeOBp2RldGFjaOOBjOOBp+OBjeOBquOBhOOBruOBp+OCs+ODlOODvOOBmeOCi+OAglxuICAgICAgICBpZiAodGhpcy52ZXJzaW9uID09PSAyICYmIGlucHV0c1swXVtpbnB1dHNbMF0ubGVuZ3RoIC0gMV0gPT09IDEuMCkge1xuICAgICAgICAgICAgcmVzdWx0WzFdWzBdID0gLXJlc3VsdFsxXVswXTtcbiAgICAgICAgfVxuICAgICAgICByZXR1cm4gcmVzdWx0O1xuICAgIH1cbn1cbmV4cG9ydHMuTmV1cmFsTmV0d29yayA9IE5ldXJhbE5ldHdvcms7IiwiJ3VzZSBzdHJpY3QnO1xuXG5PYmplY3QuZGVmaW5lUHJvcGVydHkoZXhwb3J0cywgXCJfX2VzTW9kdWxlXCIsIHtcbiAgICB2YWx1ZTogdHJ1ZVxufSk7XG5leHBvcnRzLlBsYXlDb250cm9sbGVyID0gdW5kZWZpbmVkO1xuXG52YXIgX3NwZWVjaCA9IHJlcXVpcmUoJy4vc3BlZWNoLmpzJyk7XG5cbi8qKlxuICogTVZD44Gu44Kz44Oz44OI44Ot44O844Op44Gu44Kq44OW44K244O844OQ44O844Kv44Op44K544Gn44GZ44CCXG4gKiDmgJ3ogIPjgqjjg7Pjgrjjg7Pjga7otbfli5XjgajnnYDmiYvjgIHjgq/jg63jg4Pjgq/mm7TmlrDjgIHntYLlsYDlh6bnkIbjgpLjgZfjgb7jgZnjgIJcbiAqL1xuY2xhc3MgUGxheUNvbnRyb2xsZXIge1xuICAgIC8qKlxuICAgICAqIEBwYXJhbSB7QVpqc0VuZ2luZX0gZW5naW5lIFxuICAgICAqIEBwYXJhbSB7Qm9hcmRDb250cm9sbGVyfSBjb250cm9sbGVyIFxuICAgICAqIEBwYXJhbSB7bnVtYmVyfSBtYWluVGltZSBcbiAgICAgKiBAcGFyYW0ge251bWJlcn0gYnlveW9taSBcbiAgICAgKiBAcGFyYW0ge2Jvb2x9IGZpc2hlclJ1bGUgXG4gICAgICogQHBhcmFtIHtib29sfSBpc1NlbGZQbGF5IFxuICAgICAqL1xuICAgIGNvbnN0cnVjdG9yKGVuZ2luZSwgY29udHJvbGxlciwgbWFpblRpbWUsIGJ5b3lvbWksIGZpc2hlclJ1bGUsIGlzU2VsZlBsYXkpIHtcbiAgICAgICAgdGhpcy5lbmdpbmUgPSBlbmdpbmU7XG4gICAgICAgIHRoaXMuY29udHJvbGxlciA9IGNvbnRyb2xsZXI7XG4gICAgICAgIHRoaXMuaXNTZWxmUGxheSA9IGlzU2VsZlBsYXk7XG4gICAgICAgIHRoaXMuYnlveW9taSA9IGJ5b3lvbWk7XG4gICAgICAgIHRoaXMuZmlzaGVyUnVsZSA9IGZpc2hlclJ1bGU7XG4gICAgICAgIHRoaXMuaXNGaXJzdE1vdmUgPSB0cnVlO1xuICAgICAgICBpZiAodGhpcy5maXNoZXJSdWxlKSB7XG4gICAgICAgICAgICB0aGlzLnRpbWVMZWZ0ID0gWzAsIC8vIGR1bXlcbiAgICAgICAgICAgIG1haW5UaW1lICogMTAwMCwgLy8gYmxhY2tcbiAgICAgICAgICAgIG1haW5UaW1lICogMTAwMF07XG4gICAgICAgICAgICB0aGlzLnN0YXJ0ID0gRGF0ZS5ub3coKTtcbiAgICAgICAgICAgIHRoaXMudGltZXIgPSBzZXRJbnRlcnZhbCgoKSA9PiB7XG4gICAgICAgICAgICAgICAgY29uc3Qgc3RhcnQgPSBEYXRlLm5vdygpO1xuICAgICAgICAgICAgICAgIHRoaXMudGltZUxlZnRbdGhpcy5jb250cm9sbGVyLnR1cm5dIC09IHN0YXJ0IC0gdGhpcy5zdGFydDtcbiAgICAgICAgICAgICAgICB0aGlzLnN0YXJ0ID0gc3RhcnQ7XG4gICAgICAgICAgICAgICAgaWYgKHRoaXMuaXNTZWxmUGxheSkge1xuICAgICAgICAgICAgICAgICAgICAvLyBBSeOBruOCu+ODq+ODleODl+ODrOOCpOOBruaZguOBq+OBr+WPs+OBruaDheWgsSjmmYLoqIjjgIHjgqLjgrLjg4/jg54p44GM6buS44CB5bem44Gu5oOF5aCxKOaZguioiOOAgeOCouOCsuODj+ODninjgYznmb3jgafjgZnjgIJcbiAgICAgICAgICAgICAgICAgICAgJCh0aGlzLmNvbnRyb2xsZXIudHVybiA9PT0gSkdPLkJMQUNLID8gJyNyaWdodC1jbG9jaycgOiAnI2xlZnQtY2xvY2snKS50ZXh0KE1hdGguY2VpbCh0aGlzLnRpbWVMZWZ0W3RoaXMuY29udHJvbGxlci50dXJuXSAvIDEwMDApKTtcbiAgICAgICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgICAgICAvLyDjg6bjg7zjgrbjg7zjgahBSeOBruWvvuaIpuOBruaZguOBq+OBr+WPs+OBruaDheWgsSjmmYLoqIjjgIHjgqLjgrLjg4/jg54p44GM44Om44O844K244O844CB5bem44Gu5oOF5aCxKOaZguioiOOAgeOCouOCsuODj+ODninjgYxBSeOBp+OBmeOAglxuICAgICAgICAgICAgICAgICAgICBpZiAodGhpcy5jb250cm9sbGVyLm93bkNvbG9yID09PSB0aGlzLmNvbnRyb2xsZXIudHVybikge1xuICAgICAgICAgICAgICAgICAgICAgICAgJCgnI3JpZ2h0LWNsb2NrJykudGV4dChNYXRoLmNlaWwodGhpcy50aW1lTGVmdFt0aGlzLmNvbnRyb2xsZXIudHVybl0gLyAxMDAwKSk7XG4gICAgICAgICAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAkKCcjbGVmdC1jbG9jaycpLnRleHQoTWF0aC5jZWlsKHRoaXMudGltZUxlZnRbSkdPLm9wcG9uZW50T2YodGhpcy5jb250cm9sbGVyLnR1cm4pXSAvIDEwMDApKTtcbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICBpZiAodGhpcy50aW1lTGVmdFt0aGlzLmNvbnRyb2xsZXIudHVybl0gPCAwKSB7XG4gICAgICAgICAgICAgICAgICAgIGNsZWFySW50ZXJ2YWwodGhpcy50aW1lcik7XG4gICAgICAgICAgICAgICAgICAgIHRoaXMudGltZXIgPSBudWxsO1xuICAgICAgICAgICAgICAgICAgICB0aGlzLmVuZ2luZS5zdG9wKCk7XG4gICAgICAgICAgICAgICAgICAgIGFsZXJ0KGkxOG4udGltZW91dCk7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfSwgMTAwKTtcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIHRoaXMudGltZUxlZnQgPSBbMCwgLy8gZHVteVxuICAgICAgICAgICAgdGhpcy5pc1NlbGZQbGF5IHx8IHRoaXMuY29udHJvbGxlci5vd25Db2xvciAhPT0gSkdPLkJMQUNLID8gdGhpcy5lbmdpbmUuYnlveW9taSAqIDEwMDAgOiBJbmZpbml0eSwgLy8gYmxhY2tcbiAgICAgICAgICAgIHRoaXMuaXNTZWxmUGxheSB8fCB0aGlzLmNvbnRyb2xsZXIub3duQ29sb3IgIT09IEpHTy5XSElURSA/IHRoaXMuZW5naW5lLmJ5b3lvbWkgKiAxMDAwIDogSW5maW5pdHldO1xuICAgICAgICAgICAgdGhpcy5zdGFydCA9IERhdGUubm93KCk7XG4gICAgICAgICAgICB0aGlzLnRpbWVyID0gc2V0SW50ZXJ2YWwoKCkgPT4ge1xuICAgICAgICAgICAgICAgIGNvbnN0IHN0YXJ0ID0gRGF0ZS5ub3coKTtcbiAgICAgICAgICAgICAgICB0aGlzLnRpbWVMZWZ0W3RoaXMuY29udHJvbGxlci50dXJuXSAtPSBzdGFydCAtIHRoaXMuc3RhcnQ7XG4gICAgICAgICAgICAgICAgdGhpcy5zdGFydCA9IHN0YXJ0O1xuICAgICAgICAgICAgICAgIGxldCBjbG9jaztcbiAgICAgICAgICAgICAgICBpZiAodGhpcy5pc1NlbGZQbGF5KSB7XG4gICAgICAgICAgICAgICAgICAgIGNsb2NrID0gdGhpcy5jb250cm9sbGVyLnR1cm4gPT09IEpHTy5CTEFDSyA/ICcjcmlnaHQtY2xvY2snIDogJyNsZWZ0LWNsb2NrJztcbiAgICAgICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgICAgICBjbG9jayA9IHRoaXMuY29udHJvbGxlci50dXJuID09PSB0aGlzLmNvbnRyb2xsZXIub3duQ29sb3IgPyAnI3JpZ2h0LWNsb2NrJyA6ICcjbGVmdC1jbG9jayc7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICQoY2xvY2spLnRleHQoTWF0aC5jZWlsKHRoaXMudGltZUxlZnRbdGhpcy5jb250cm9sbGVyLnR1cm5dIC8gMTAwMCkpO1xuICAgICAgICAgICAgfSwgMTAwKTtcbiAgICAgICAgfVxuICAgICAgICBpZiAodGhpcy5pc1NlbGZQbGF5KSB7XG4gICAgICAgICAgICAkKCcjcmlnaHQtY2xvY2snKS50ZXh0KE1hdGguY2VpbCh0aGlzLnRpbWVMZWZ0W0pHTy5CTEFDS10gLyAxMDAwKSk7XG4gICAgICAgICAgICAkKCcjbGVmdC1jbG9jaycpLnRleHQoTWF0aC5jZWlsKHRoaXMudGltZUxlZnRbSkdPLldISVRFXSAvIDEwMDApKTtcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICQoJyNyaWdodC1jbG9jaycpLnRleHQoTWF0aC5jZWlsKHRoaXMudGltZUxlZnRbdGhpcy5jb250cm9sbGVyLm93bkNvbG9yXSAvIDEwMDApKTtcbiAgICAgICAgICAgICQoJyNsZWZ0LWNsb2NrJykudGV4dChNYXRoLmNlaWwodGhpcy50aW1lTGVmdFtKR08ub3Bwb25lbnRPZih0aGlzLmNvbnRyb2xsZXIub3duQ29sb3IpXSAvIDEwMDApKTtcbiAgICAgICAgfVxuICAgIH1cblxuICAgIGNsZWFyVGltZXIoKSB7XG4gICAgICAgIGlmICh0aGlzLnRpbWVyKSB7XG4gICAgICAgICAgICBjbGVhckludGVydmFsKHRoaXMudGltZXIpO1xuICAgICAgICAgICAgdGhpcy50aW1lciA9IG51bGw7XG4gICAgICAgIH1cbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBBSeWQjOWjq+OBruOCu+ODq+ODleODl+ODrOOCpOOBi+OBqeOBhuOBi+OCkuioreWumuOBl+OBvuOBmeOAglxuICAgICAqIEBwYXJhbSB7Kn0gaXNTZWxmUGxheSBcbiAgICAgKi9cbiAgICBzZXRJc1NlbGZQbGF5KGlzU2VsZlBsYXkpIHtcbiAgICAgICAgdGhpcy5pc1NlbGZQbGF5ID0gaXNTZWxmUGxheTtcbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiDntYLlsYDlh6bnkIZcbiAgICAgKiBAcHJpdmF0ZVxuICAgICAqL1xuICAgIGFzeW5jIGVuZEdhbWUoKSB7XG4gICAgICAgICgwLCBfc3BlZWNoLmkxOG5TcGVhaykoaTE4bi5zY29yaW5nKTtcbiAgICAgICAgdHJ5IHtcbiAgICAgICAgICAgIGNvbnN0IHNjb3JlID0gYXdhaXQgdGhpcy5maW5hbFNjb3JlKCk7XG4gICAgICAgICAgICBsZXQgbWVzc2FnZTtcbiAgICAgICAgICAgIGlmIChzY29yZSA9PT0gMCkge1xuICAgICAgICAgICAgICAgIG1lc3NhZ2UgPSBpMThuLmppZ287XG4gICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgIG1lc3NhZ2UgPSBpMThuW3Njb3JlID4gMCA/ICdibGFjaycgOiAnd2hpdGUnXTtcbiAgICAgICAgICAgICAgICBzd2l0Y2ggKGkxOG4ubGFuZykge1xuICAgICAgICAgICAgICAgICAgICBjYXNlICdlbic6XG4gICAgICAgICAgICAgICAgICAgICAgICBtZXNzYWdlICs9IGAgd29uIGJ5ICR7c2NvcmV9IHBvaW50c2A7XG4gICAgICAgICAgICAgICAgICAgICAgICBicmVhaztcbiAgICAgICAgICAgICAgICAgICAgY2FzZSAnamEnOlxuICAgICAgICAgICAgICAgICAgICAgICAge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGNvbnN0IGFic1Njb3JlID0gTWF0aC5hYnMoc2NvcmUpO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIG1lc3NhZ2UgKz0gYWJzU2NvcmUgPCAxID8gJ+WNiuebruWLneOBoScgOiBNYXRoLmZsb29yKGFic1Njb3JlKSArICfnm67ljYrli53jgaEnO1xuICAgICAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfVxuICAgICAgICAgICAgc3dpdGNoIChpMThuLmxhbmcpIHtcbiAgICAgICAgICAgICAgICBjYXNlICdlbic6XG4gICAgICAgICAgICAgICAgICAgIG1lc3NhZ2UgKz0gJz8nO1xuICAgICAgICAgICAgICAgICAgICBicmVhaztcbiAgICAgICAgICAgICAgICBjYXNlICdqYSc6XG4gICAgICAgICAgICAgICAgICAgIG1lc3NhZ2UgKz0gJ+OBp+OBmeOBi++8nyc7XG4gICAgICAgICAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgKDAsIF9zcGVlY2guaTE4blNwZWFrKShtZXNzYWdlLnJlcGxhY2UoJ+WNiicsICfjga/jgpMnKSk7XG4gICAgICAgICAgICBzZXRUaW1lb3V0KGZ1bmN0aW9uICgpIHtcbiAgICAgICAgICAgICAgICBhbGVydChtZXNzYWdlKTtcbiAgICAgICAgICAgICAgICAkKGRvY3VtZW50LmJvZHkpLmFkZENsYXNzKCdlbmQnKTtcbiAgICAgICAgICAgIH0sIDMwMDApO1xuICAgICAgICB9IGNhdGNoIChlKSB7XG4gICAgICAgICAgICBjb25zb2xlLmxvZyhlKTtcbiAgICAgICAgICAgICgwLCBfc3BlZWNoLmkxOG5TcGVhaykoaTE4bi5mYWlsU2NvcmluZyk7XG4gICAgICAgIH1cbiAgICB9XG5cbiAgICB1cGRhdGVDbG9jaygpIHtcbiAgICAgICAgaWYgKHRoaXMuZmlzaGVyUnVsZSkge1xuICAgICAgICAgICAgY29uc3QgcGxheWVkID0gSkdPLm9wcG9uZW50T2YodGhpcy5jb250cm9sbGVyLnR1cm4pO1xuICAgICAgICAgICAgY29uc3QgJHBsYXllZFRpbWVyID0gJCh0aGlzLmlzU2VsZlBsYXkgPyB0aGlzLmNvbnRyb2xsZXIudHVybiA9PT0gSkdPLkJMQUNLID8gJyNyaWdodC1jbG9jaycgOiAnI2xlZnQtY2xvY2snIDogcGxheWVkID09PSB0aGlzLmNvbnRyb2xsZXIub3duQ29sb3IgPyAnI3JpZ2h0LWNsb2NrJyA6ICcjbGVmdC1jbG9jaycpO1xuICAgICAgICAgICAgJHBsYXllZFRpbWVyLnRleHQoYCR7TWF0aC5jZWlsKHRoaXMudGltZUxlZnRbcGxheWVkXSAvIDEwMDApfSske3RoaXMuYnlveW9taX1gKTtcbiAgICAgICAgICAgIHRoaXMudGltZUxlZnRbcGxheWVkXSArPSB0aGlzLmJ5b3lvbWkgKiAxMDAwO1xuICAgICAgICAgICAgc2V0VGltZW91dCgoKSA9PiB7XG4gICAgICAgICAgICAgICAgJHBsYXllZFRpbWVyLnRleHQoTWF0aC5jZWlsKHRoaXMudGltZUxlZnRbcGxheWVkXSAvIDEwMDApKTtcbiAgICAgICAgICAgIH0sIDIwMDApO1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgaWYgKHRoaXMuaXNTZWxmUGxheSkge1xuICAgICAgICAgICAgICAgIGNvbnN0IHBsYXllZCA9IEpHTy5vcHBvbmVudE9mKHRoaXMuY29udHJvbGxlci50dXJuKTtcbiAgICAgICAgICAgICAgICB0aGlzLnRpbWVMZWZ0W3BsYXllZF0gPSB0aGlzLmVuZ2luZS5ieW95b21pICogMTAwMDtcbiAgICAgICAgICAgICAgICAkKHBsYXllZCA9PT0gSkdPLkJMQUNLID8gJyNyaWdodC1jbG9jaycgOiAnI2xlZnQtY2xvY2snKS50ZXh0KE1hdGguY2VpbCh0aGlzLnRpbWVMZWZ0W3BsYXllZF0gLyAxMDAwKSk7XG4gICAgICAgICAgICB9IGVsc2UgaWYgKHRoaXMuY29udHJvbGxlci50dXJuID09PSB0aGlzLmNvbnRyb2xsZXIub3duQ29sb3IpIHtcbiAgICAgICAgICAgICAgICB0aGlzLnRpbWVMZWZ0W0pHTy5vcHBvbmVudE9mKHRoaXMuY29udHJvbGxlci50dXJuKV0gPSB0aGlzLmVuZ2luZS5ieW95b21pICogMTAwMDtcbiAgICAgICAgICAgICAgICAkKCcjbGVmdC1jbG9jaycpLnRleHQoTWF0aC5jZWlsKHRoaXMudGltZUxlZnRbSkdPLm9wcG9uZW50T2YodGhpcy5jb250cm9sbGVyLnR1cm4pXSAvIDEwMDApKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgIH1cblxuICAgIGFzeW5jIHVwZGF0ZUVuZ2luZShjb29yZCkge1xuICAgICAgICBpZiAoIXRoaXMuaXNTZWxmUGxheSAmJiB0eXBlb2YgY29vcmQgPT09ICdvYmplY3QnKSB7XG4gICAgICAgICAgICBhd2FpdCB0aGlzLmVuZ2luZS5zdG9wKCk7XG4gICAgICAgICAgICBhd2FpdCB0aGlzLmVuZ2luZS5wbGF5KGNvb3JkLmkgKyAxLCB0aGlzLmNvbnRyb2xsZXIuamJvYXJkLmhlaWdodCAtIGNvb3JkLmopO1xuICAgICAgICB9XG4gICAgfVxuXG4gICAgYXN5bmMgZW5naW5lUGxheSgpIHtcbiAgICAgICAgY29uc3QgbW92ZSA9IGF3YWl0IHRoaXMuZW5naW5lLmdlbm1vdmUoKTtcbiAgICAgICAgaWYgKCF0aGlzLnRpbWVyKSB7XG4gICAgICAgICAgICByZXR1cm47IC8vIOaZgumWk+WIh+OCjOOCguOBl+OBj+OBr+ebuOaJi+OBruaKleS6hlxuICAgICAgICB9XG4gICAgICAgIHN3aXRjaCAobW92ZSkge1xuICAgICAgICAgICAgY2FzZSAncmVzaWduJzpcbiAgICAgICAgICAgICAgICB0aGlzLmNsZWFyVGltZXIoKTtcbiAgICAgICAgICAgICAgICAoMCwgX3NwZWVjaC5pMThuU3BlYWspKGkxOG4ucmVzaWduKTtcbiAgICAgICAgICAgICAgICAkKGRvY3VtZW50LmJvZHkpLmFkZENsYXNzKCdlbmQnKTtcbiAgICAgICAgICAgICAgICBicmVhaztcbiAgICAgICAgICAgIGNhc2UgJ3Bhc3MnOlxuICAgICAgICAgICAgICAgIHRoaXMuY29udHJvbGxlci5wbGF5KG51bGwpO1xuICAgICAgICAgICAgICAgICgwLCBfc3BlZWNoLmkxOG5TcGVhaykoaTE4bi5wYXNzKTtcbiAgICAgICAgICAgICAgICBicmVhaztcbiAgICAgICAgICAgIGRlZmF1bHQ6XG4gICAgICAgICAgICAgICAgdGhpcy5jb250cm9sbGVyLnBsYXkobmV3IEpHTy5Db29yZGluYXRlKG1vdmVbMF0gLSAxLCB0aGlzLmNvbnRyb2xsZXIuamJvYXJkLmhlaWdodCAtIG1vdmVbMV0pLCB0cnVlKTtcbiAgICAgICAgfVxuICAgICAgICBpZiAodGhpcy5maXNoZXJSdWxlKSB7XG4gICAgICAgICAgICBhd2FpdCB0aGlzLmVuZ2luZS50aW1lU2V0dGluZ3ModGhpcy50aW1lTGVmdFtKR08ub3Bwb25lbnRPZih0aGlzLmNvbnRyb2xsZXIudHVybildIC8gMTAwMCwgdGhpcy5ieW95b21pKTtcbiAgICAgICAgfVxuICAgIH1cblxuICAgIC8qKlxuICAgICAqIEJvYXJkQ29udHJvbGxlcuOBruOCquODluOCtuODvOODkOODvOOBq+OBquOCi+OBn+OCgeOBruODoeOCveODg+ODiVxuICAgICAqIEBwYXJhbSB7SkdPLkNvb3JkaW5hdGV9IGNvb3JkIFxuICAgICAqL1xuICAgIGFzeW5jIHVwZGF0ZShjb29yZCkge1xuICAgICAgICBpZiAoY29vcmQgPT09ICdlbmQnKSB7XG4gICAgICAgICAgICB0aGlzLmNsZWFyVGltZXIoKTtcbiAgICAgICAgICAgIGF3YWl0IHRoaXMuZW5kR2FtZSgpO1xuICAgICAgICAgICAgcmV0dXJuO1xuICAgICAgICB9XG4gICAgICAgIGlmICghdGhpcy5pc0ZpcnN0TW92ZSkge1xuICAgICAgICAgICAgdGhpcy51cGRhdGVDbG9jaygpO1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgdGhpcy5pc0ZpcnN0TW92ZSA9IGZhbHNlO1xuICAgICAgICB9XG4gICAgICAgIHRoaXMuY29vcmQgPSBjb29yZDsgLy8g44Od44Oz44OA44O844Go5LiA6Ie044GZ44KL44GL56K66KqN44GZ44KL44Gf44KB44Gr55u05YmN44Gu5bqn5qiZ44KS5L+d5a2Y44CCXG4gICAgICAgIGF3YWl0IHRoaXMudXBkYXRlRW5naW5lKGNvb3JkKTtcbiAgICAgICAgaWYgKHRoaXMuaXNTZWxmUGxheSB8fCB0aGlzLmNvbnRyb2xsZXIudHVybiAhPT0gdGhpcy5jb250cm9sbGVyLm93bkNvbG9yKSB7XG4gICAgICAgICAgICBzZXRUaW1lb3V0KGFzeW5jICgpID0+IHtcbiAgICAgICAgICAgICAgICB0cnkge1xuICAgICAgICAgICAgICAgICAgICBhd2FpdCB0aGlzLmVuZ2luZVBsYXkoKTtcbiAgICAgICAgICAgICAgICB9IGNhdGNoIChlKSB7XG4gICAgICAgICAgICAgICAgICAgIGNvbnNvbGUuZXJyb3IoZSk7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfSwgMCk7XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICBjb25zdCBbeCwgeV0gPSBhd2FpdCB0aGlzLmVuZ2luZS5wb25kZXIoKTtcbiAgICAgICAgICAgIC8vIHBvbmRlcuOBjOe1guS6huOBmeOCi+OBqOOBjeOBq+OBr+asoeOBruedgOaJi+OBjOaJk+OBn+OCjOOBpuOBhOOBpuOAgXRoaXMuY29vcmTjgavkv53lrZjjgZXjgozjgabjgYTjgovjgIJcbiAgICAgICAgICAgIGlmICh4ID09PSB0aGlzLmNvb3JkLmkgKyAxICYmIHkgPT09IHRoaXMuY29udHJvbGxlci5qYm9hcmQuaGVpZ2h0IC0gdGhpcy5jb29yZC5qKSB7XG4gICAgICAgICAgICAgICAgY29uc3QgJHRodW1ic1VwID0gJCgnI3RodW1icy11cCcpO1xuICAgICAgICAgICAgICAgICR0aHVtYnNVcC50ZXh0KHBhcnNlSW50KCR0aHVtYnNVcC50ZXh0KCkpICsgMSk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICB9XG5cbiAgICBhc3luYyBwYXNzKCkge1xuICAgICAgICBpZiAoIXRoaXMuaXNTZWxmUGxheSAmJiB0aGlzLmNvbnRyb2xsZXIub3duQ29sb3IgPT09IHRoaXMuY29udHJvbGxlci50dXJuKSB7XG4gICAgICAgICAgICBhd2FpdCB0aGlzLmVuZ2luZS5zdG9wKCk7XG4gICAgICAgICAgICB0aGlzLmVuZ2luZS5wYXNzKCk7XG4gICAgICAgICAgICB0aGlzLmNvbnRyb2xsZXIucGxheShudWxsKTtcbiAgICAgICAgfVxuICAgIH1cblxuICAgIGFzeW5jIGZpbmFsU2NvcmUoKSB7XG4gICAgICAgIGNvbnN0IHJlc3VsdCA9IGF3YWl0ICQucG9zdCh7XG4gICAgICAgICAgICB1cmw6ICdodHRwczovL21pbWlha2EtcHl0aG9uLmhlcm9rdWFwcC5jb20vZ251Z28nLCAvLyBodHRw44Gn44Gv6YCa5L+h44Gn44GN44Gq44GL44Gj44Gf44CCICdodHRwOi8vMzUuMjAzLjE2MS4xMDAvZ251Z28nLFxuICAgICAgICAgICAgZGF0YToge1xuICAgICAgICAgICAgICAgIHNnZjogdGhpcy5jb250cm9sbGVyLmpyZWNvcmQudG9TZ2YoKSxcbiAgICAgICAgICAgICAgICBtb3ZlOiAnZXN0JyxcbiAgICAgICAgICAgICAgICBtZXRob2Q6ICdhZnRlcm1hdGgnLFxuICAgICAgICAgICAgICAgIHJ1bGU6IHRoaXMuY29udHJvbGxlci5qcmVjb3JkLmdldFJvb3ROb2RlKCkuaW5mby5rb21pID09PSAnNi41JyA/ICdqYXBhbmVzZScgOiAnY2hpbmVzZSdcbiAgICAgICAgICAgIH1cbiAgICAgICAgfSk7XG4gICAgICAgIGlmICgvSmlnby8udGVzdChyZXN1bHQpKSB7XG4gICAgICAgICAgICByZXR1cm4gMDtcbiAgICAgICAgfVxuICAgICAgICBjb25zdCBtYXRjaCA9IHJlc3VsdC5tYXRjaCgvKEJsYWNrfFdoaXRlKSB3aW5zIGJ5IChbMC05Ll0rKSBwb2ludHMvKTtcbiAgICAgICAgaWYgKG1hdGNoKSB7XG4gICAgICAgICAgICBsZXQgc2NvcmUgPSBwYXJzZUZsb2F0KG1hdGNoWzJdKTtcbiAgICAgICAgICAgIGlmIChtYXRjaFsxXSA9PT0gJ0JsYWNrJykge1xuICAgICAgICAgICAgICAgIHJldHVybiBzY29yZTtcbiAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgcmV0dXJuIC1zY29yZTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIHJldHVybiBudWxsO1xuICAgICAgICB9XG4gICAgfVxufVxuZXhwb3J0cy5QbGF5Q29udHJvbGxlciA9IFBsYXlDb250cm9sbGVyOyAvKipcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICogQGZpbGUgTVZD44Gu44Kz44Oz44OI44Ot44O844Op44Gu44Kq44OW44K244O844OQ44O844Kv44Op44K544Gn44GZ44CCXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAqL1xuLypcbiAqIEBhdXRob3Ig5biC5bed6ZuE5LqMXG4gKiBAY29weXJpZ2h0IDIwMTggSUNISUtBV0EsIFl1amkgKE5ldyAzIFJzKVxuICogQGxpY2Vuc2UgTUlUXG4gKi9cbi8qIGdsb2JhbCAkIEpHTyBpMThuICovIiwiJ3VzZSBzdHJpY3QnO1xuXG5PYmplY3QuZGVmaW5lUHJvcGVydHkoZXhwb3J0cywgXCJfX2VzTW9kdWxlXCIsIHtcbiAgICB2YWx1ZTogdHJ1ZVxufSk7XG5leHBvcnRzLnNwZWFrID0gc3BlYWs7XG5leHBvcnRzLmkxOG5TcGVhayA9IGkxOG5TcGVhaztcbi8qKlxuICogQGZpbGUg6Z+z5aOw5ZCI5oiQ44Gu44Op44OD44OR44O86Zai5pWw576k44Gn44GZ44CCXG4gKi9cbi8qXG4gKiBAYXV0aG9yIOW4guW3nembhOS6jFxuICogQGNvcHlyaWdodCAyMDE3IElDSElLQVdBLCBZdWppIChOZXcgMyBScylcbiAqIEBsaWNlbnNlIE1JVFxuICovXG4vKiBnbG9iYWwgaTE4biAqL1xuXG4vKipcbiAqIEBwYXJhbSB7c3RyaW5nfSB0ZXh0XG4gKiBAcGFyYW0ge3N0cmluZ30gbGFuZ1xuICogQHBhcmFtIHtzdHJpbmd9IGdlbmRlclxuICovXG5mdW5jdGlvbiBzcGVhayh0ZXh0LCBsYW5nLCBnZW5kZXIpIHtcbiAgICBpZiAoIVNwZWVjaFN5bnRoZXNpc1V0dGVyYW5jZSkgcmV0dXJuIGZhbHNlO1xuXG4gICAgc3dpdGNoIChsYW5nKSB7XG4gICAgICAgIGNhc2UgJ2VuJzpcbiAgICAgICAgICAgIGxhbmcgPSAnZW4tdXMnO1xuICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgIGNhc2UgJ2phJzpcbiAgICAgICAgICAgIGxhbmcgPSAnamEtanAnO1xuICAgICAgICAgICAgYnJlYWs7XG4gICAgfVxuICAgIGNvbnN0IHV0dGVyYW5jZSA9IG5ldyBTcGVlY2hTeW50aGVzaXNVdHRlcmFuY2UodGV4dCk7XG4gICAgaWYgKC8oaVBob25lfGlQYWR8aVBvZCkoPz0uKk9TIFs3LThdKS8udGVzdChuYXZpZ2F0b3IudXNlckFnZW50KSkgdXR0ZXJhbmNlLnJhdGUgPSAwLjI7XG4gICAgY29uc3Qgdm9pY2VzID0gc3BlZWNoU3ludGhlc2lzLmdldFZvaWNlcygpLmZpbHRlcihlID0+IGUubGFuZy50b0xvd2VyQ2FzZSgpID09PSBsYW5nKTtcbiAgICBsZXQgdm9pY2UgPSBudWxsO1xuICAgIGlmICh2b2ljZXMubGVuZ3RoID4gMSkge1xuICAgICAgICBsZXQgbmFtZXMgPSBudWxsO1xuICAgICAgICBzd2l0Y2ggKGxhbmcpIHtcbiAgICAgICAgICAgIGNhc2UgJ2phLWpwJzpcbiAgICAgICAgICAgICAgICBzd2l0Y2ggKGdlbmRlcikge1xuICAgICAgICAgICAgICAgICAgICBjYXNlICdtYWxlJzpcbiAgICAgICAgICAgICAgICAgICAgICAgIG5hbWVzID0gWydPdG95YScsICdIYXR0b3JpJywgJ0ljaGlybyddO1xuICAgICAgICAgICAgICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgICAgICAgICAgICAgIGNhc2UgJ2ZlbWFsZSc6XG4gICAgICAgICAgICAgICAgICAgICAgICBuYW1lcyA9IFsnTy1yZW7vvIjmi6HlvLXvvIknLCAnTy1yZW4nLCAnS3lva28nLCAnSGFydWthJ107IC8vIFdpbmRvd3MgMTDjga5BeXVtaeOBruWjsOOBr+S7iuOBsuOBqOOBpFxuICAgICAgICAgICAgICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICAgICAgY2FzZSAnZW4tdXMnOlxuICAgICAgICAgICAgICAgIHN3aXRjaCAoZ2VuZGVyKSB7XG4gICAgICAgICAgICAgICAgICAgIGNhc2UgJ21hbGUnOlxuICAgICAgICAgICAgICAgICAgICAgICAgbmFtZXMgPSBbJ0FsZXgnLCAnRnJlZCddO1xuICAgICAgICAgICAgICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgICAgICAgICAgICAgIGNhc2UgJ2ZlbWFsZSc6XG4gICAgICAgICAgICAgICAgICAgICAgICBuYW1lcyA9IFsnU2FtYW50aGEnLCAnVmljdG9yaWEnXTtcbiAgICAgICAgICAgICAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICBicmVhaztcbiAgICAgICAgfVxuICAgICAgICBpZiAobmFtZXMpIHtcbiAgICAgICAgICAgIHZvaWNlID0gdm9pY2VzLmZpbHRlcih2ID0+IG5hbWVzLnNvbWUobiA9PiB2Lm5hbWUuaW5kZXhPZihuKSA+PSAwKSlbMF07XG4gICAgICAgIH1cbiAgICAgICAgaWYgKCF2b2ljZSkge1xuICAgICAgICAgICAgdm9pY2UgPSB2b2ljZXMuZmlsdGVyKHYgPT4gdi5nZW5kZXIgJiYgdi5nZW5kZXIudG9Mb3dlckNhc2UoKSA9PT0gZ2VuZGVyKVswXTtcbiAgICAgICAgfVxuICAgIH1cbiAgICB1dHRlcmFuY2Uudm9pY2UgPSB2b2ljZSB8fCB2b2ljZXNbMF07XG4gICAgLy8gaU9TIDEwIFNhZmFyaSBoYXMgYSBidWcgdGhhdCB1dHRlcmFuY2Uudm9pY2UgaXMgbm8gZWZmZWN0LlxuICAgIHV0dGVyYW5jZS52b2x1bWUgPSBwYXJzZUZsb2F0KGxvY2FsU3RvcmFnZS5nZXRJdGVtKCd2b2x1bWUnKSB8fCAnMS4wJyk7XG4gICAgc3BlZWNoU3ludGhlc2lzLnNwZWFrKHV0dGVyYW5jZSk7XG4gICAgcmV0dXJuIHRydWU7XG59XG5cbi8qKlxuICogQHByaXZhdGVcbiAqL1xuZnVuY3Rpb24gdW5sb2NrKCkge1xuICAgIHdpbmRvdy5yZW1vdmVFdmVudExpc3RlbmVyKCdjbGljaycsIHVubG9jayk7XG4gICAgc3BlZWNoU3ludGhlc2lzLnNwZWFrKG5ldyBTcGVlY2hTeW50aGVzaXNVdHRlcmFuY2UoJycpKTtcbn1cblxuLyoqXG4gKiBcbiAqIEBwYXJhbSB7c3RyaW5nfSBtZXNzYWdlIFxuICovXG5mdW5jdGlvbiBpMThuU3BlYWsobWVzc2FnZSkge1xuICAgIHJldHVybiBzcGVhayhtZXNzYWdlLCBpMThuLmxhbmcsICdmZW1hbGUnKTtcbn1cblxud2luZG93LmFkZEV2ZW50TGlzdGVuZXIoJ2xvYWQnLCBmdW5jdGlvbiAoZXZlbnQpIHtcbiAgICBpZiAoc3BlZWNoU3ludGhlc2lzKSB7XG4gICAgICAgIHNwZWVjaFN5bnRoZXNpcy5nZXRWb2ljZXMoKTtcbiAgICAgICAgaWYgKHNwZWVjaFN5bnRoZXNpcy5vbnZvaWNlc2NoYW5nZWQgIT09IHVuZGVmaW5lZCkge1xuICAgICAgICAgICAgc3BlZWNoU3ludGhlc2lzLm9udm9pY2VzY2hhbmdlZCA9IGZ1bmN0aW9uICgpIHtcbiAgICAgICAgICAgICAgICBjb25zb2xlLmxvZygnb252b2ljZXNjaGFuZ2VkJyk7XG4gICAgICAgICAgICB9O1xuICAgICAgICB9XG4gICAgICAgIHdpbmRvdy5hZGRFdmVudExpc3RlbmVyKCdjbGljaycsIHVubG9jaywgZmFsc2UpOyAvLyBmb3IgaU9TXG4gICAgfVxufSk7IiwiJ3VzZSBzdHJpY3QnO1xuXG5PYmplY3QuZGVmaW5lUHJvcGVydHkoZXhwb3J0cywgXCJfX2VzTW9kdWxlXCIsIHtcbiAgICB2YWx1ZTogdHJ1ZVxufSk7XG5leHBvcnRzLnNodWZmbGUgPSBzaHVmZmxlO1xuZXhwb3J0cy5tb3N0Q29tbW9uID0gbW9zdENvbW1vbjtcbmV4cG9ydHMuYXJnc29ydCA9IGFyZ3NvcnQ7XG5leHBvcnRzLmFyZ21heCA9IGFyZ21heDtcbmV4cG9ydHMuaGFzaCA9IGhhc2g7XG5leHBvcnRzLnNvZnRtYXggPSBzb2Z0bWF4O1xuZXhwb3J0cy5wcmludFByb2IgPSBwcmludFByb2I7XG4vKipcbiAqIEBmaWxlIOWQhOeoruODpuODvOODhuOCo+ODquODhuOCo+mWouaVsOe+pOOBp+OBmeOAglxuICovXG4vKlxuICogQGF1dGhvciDluILlt53pm4TkuoxcbiAqIEBjb3B5cmlnaHQgMjAxOCBJQ0hJS0FXQSwgWXVqaSAoTmV3IDMgUnMpXG4gKiBAbGljZW5zZSBNSVRcbiAqL1xuXG4vKipcbiAqIEBwYXJhbSB7QXJyYXl9IGFycmF5XG4gKi9cbmZ1bmN0aW9uIHNodWZmbGUoYXJyYXkpIHtcbiAgICBsZXQgbiA9IGFycmF5Lmxlbmd0aDtcbiAgICBsZXQgdDtcbiAgICBsZXQgaTtcblxuICAgIHdoaWxlIChuKSB7XG4gICAgICAgIGkgPSBNYXRoLmZsb29yKE1hdGgucmFuZG9tKCkgKiBuLS0pO1xuICAgICAgICB0ID0gYXJyYXlbbl07XG4gICAgICAgIGFycmF5W25dID0gYXJyYXlbaV07XG4gICAgICAgIGFycmF5W2ldID0gdDtcbiAgICB9XG5cbiAgICByZXR1cm4gYXJyYXk7XG59XG5cbi8qKlxuICogYXJyYXnjga7kuK3jga7mnIDpoLvlh7ropoHntKDjgpLov5TjgZfjgb7jgZnjgIJcbiAqIEBwYXJhbSB7QXJyYXl9IGFycmF5IFxuICovXG5mdW5jdGlvbiBtb3N0Q29tbW9uKGFycmF5KSB7XG4gICAgY29uc3QgbWFwID0gbmV3IE1hcCgpO1xuICAgIGZvciAobGV0IGkgPSAwOyBpIDwgYXJyYXkubGVuZ3RoOyBpKyspIHtcbiAgICAgICAgY29uc3QgZSA9IGFycmF5W2ldO1xuICAgICAgICBpZiAobWFwLmhhcyhlKSkge1xuICAgICAgICAgICAgbWFwLnNldChlLCBtYXAuZ2V0KGUpICsgMSk7XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICBtYXAuc2V0KGUsIDEpO1xuICAgICAgICB9XG4gICAgfVxuICAgIGxldCBtYXhLZXk7XG4gICAgbGV0IG1heFZhbHVlID0gLTE7XG4gICAgZm9yIChjb25zdCBba2V5LCB2YWx1ZV0gb2YgbWFwLmVudHJpZXMoKSkge1xuICAgICAgICBpZiAodmFsdWUgPiBtYXhWYWx1ZSkge1xuICAgICAgICAgICAgbWF4S2V5ID0ga2V5O1xuICAgICAgICAgICAgbWF4VmFsdWUgPSB2YWx1ZTtcbiAgICAgICAgfVxuICAgIH1cbiAgICByZXR1cm4gbWF4S2V5O1xufVxuXG4vKiogYXJyYXnjgpLjgr3jg7zjg4jjgZfjgZ/mmYLjga7jgqTjg7Pjg4fjg4Pjgq/jgrnphY3liJfjgpLov5TjgZfjgb7jgZnjgIJcbiAqIEBwYXJhbSB7bnVtYmVyW119IGFycmF5IFxuICogQHBhcmFtIHtib29sfSByZXZlcnNlIFxuICovXG5mdW5jdGlvbiBhcmdzb3J0KGFycmF5LCByZXZlcnNlKSB7XG4gICAgY29uc3QgZW4gPSBBcnJheS5mcm9tKGFycmF5KS5tYXAoKGUsIGkpID0+IFtpLCBlXSk7XG4gICAgZW4uc29ydCgoYSwgYikgPT4gcmV2ZXJzZSA/IGJbMV0gLSBhWzFdIDogYVsxXSAtIGJbMV0pO1xuICAgIHJldHVybiBlbi5tYXAoZSA9PiBlWzBdKTtcbn1cblxuLyoqXG4gKiBhcnJheeOBruS4reOBruacgOWkp+WApOOBruOCpOODs+ODh+ODg+OCr+OCueOCkui/lOOBl+OBvuOBmeOAglxuICogQHBhcmFtIHtudW1iZXJbXX0gYXJyYXkgXG4gKi9cbmZ1bmN0aW9uIGFyZ21heChhcnJheSkge1xuICAgIGxldCBtYXhJbmRleDtcbiAgICBsZXQgbWF4VmFsdWUgPSAtSW5maW5pdHk7XG4gICAgZm9yIChsZXQgaSA9IDA7IGkgPCBhcnJheS5sZW5ndGg7IGkrKykge1xuICAgICAgICBjb25zdCB2ID0gYXJyYXlbaV07XG4gICAgICAgIGlmICh2ID4gbWF4VmFsdWUpIHtcbiAgICAgICAgICAgIG1heEluZGV4ID0gaTtcbiAgICAgICAgICAgIG1heFZhbHVlID0gdjtcbiAgICAgICAgfVxuICAgIH1cbiAgICByZXR1cm4gbWF4SW5kZXg7XG59XG5cbi8qKlxuICogc3Ry44GuMzItYml044OP44OD44K344Ol5YCk44KS6L+U44GX44G+44GZ44CCXG4gKiAo5rOoKTE56Lev55uk44Gn44GvMzItYml044OP44OD44K344Ol5YCk44Gv6KGd56qB44GZ44KL44Go6KiA44KP44KM44Gm44GE44G+44GZ44GM6KGd56qB44Gr44Gv5a++5b+c44GX44Gm44GE44G+44Gb44KT44CCXG4gKiBAcGFyYW0ge3N0cmluZ30gc3RyIFxuICogQHJldHVybnMge0ludGVnZXJ9XG4gKi9cbmZ1bmN0aW9uIGhhc2goc3RyKSB7XG4gICAgbGV0IGhhc2ggPSA1MzgxO1xuICAgIGZvciAobGV0IGkgPSAwOyBpIDwgc3RyLmxlbmd0aDsgaSsrKSB7XG4gICAgICAgIGNvbnN0IGNoYXIgPSBzdHIuY2hhckNvZGVBdChpKTtcbiAgICAgICAgaGFzaCA9IChoYXNoIDw8IDUpICsgaGFzaCArIGNoYXI7IC8qIGhhc2ggKiAzMyArIGMgKi9cbiAgICAgICAgaGFzaCA9IGhhc2ggJiBoYXNoOyAvLyBDb252ZXJ0IHRvIDMyYml0IGludGVnZXJcbiAgICB9XG4gICAgcmV0dXJuIE1hdGguYWJzKGhhc2gpO1xufVxuXG4vKipcbiAqIOa4qeW6puODkeODqeODoeODvOOCv+OBguOCiuOBruOCveODleODiOODnuODg+OCr+OCuemWouaVsOOBp+OBmeOAglxuICogQHBhcmFtIHtGbG9hdDMyQXJyYXl9IGlucHV0IFxuICogQHBhcmFtIHtudW1iZXJ9IHRlbXBlcmF0dXJlXG4gKiBAcmV0dXJucyB7RmxvYXQzMkFycmF5fVxuICovXG5mdW5jdGlvbiBzb2Z0bWF4KGlucHV0LCB0ZW1wZXJhdHVyZSA9IDEuMCkge1xuICAgIGNvbnN0IG91dHB1dCA9IG5ldyBGbG9hdDMyQXJyYXkoaW5wdXQubGVuZ3RoKTtcbiAgICBjb25zdCBhbHBoYSA9IE1hdGgubWF4LmFwcGx5KG51bGwsIGlucHV0KTtcbiAgICBsZXQgZGVub20gPSAwLjA7XG5cbiAgICBmb3IgKGxldCBpID0gMDsgaSA8IGlucHV0Lmxlbmd0aDsgaSsrKSB7XG4gICAgICAgIGNvbnN0IHZhbCA9IE1hdGguZXhwKChpbnB1dFtpXSAtIGFscGhhKSAvIHRlbXBlcmF0dXJlKTtcbiAgICAgICAgZGVub20gKz0gdmFsO1xuICAgICAgICBvdXRwdXRbaV0gPSB2YWw7XG4gICAgfVxuXG4gICAgZm9yIChsZXQgaSA9IDA7IGkgPCBvdXRwdXQubGVuZ3RoOyBpKyspIHtcbiAgICAgICAgb3V0cHV0W2ldIC89IGRlbm9tO1xuICAgIH1cblxuICAgIHJldHVybiBvdXRwdXQ7XG59XG5cbmZ1bmN0aW9uIHByaW50UHJvYihwcm9iLCBzaXplKSB7XG4gICAgZm9yIChsZXQgeSA9IDA7IHkgPCBzaXplOyB5KyspIHtcbiAgICAgICAgbGV0IHN0ciA9IGAke3kgKyAxfSBgO1xuICAgICAgICBmb3IgKGxldCB4ID0gMDsgeCA8IHNpemU7IHgrKykge1xuICAgICAgICAgICAgc3RyICs9ICgnICAnICsgcHJvYlt4ICsgeSAqIHNpemVdLnRvRml4ZWQoMSkpLnNsaWNlKC01KTtcbiAgICAgICAgfVxuICAgICAgICBjb25zb2xlLmxvZyhzdHIpO1xuICAgIH1cbiAgICBjb25zb2xlLmxvZygncGFzcz0lcycsIHByb2JbcHJvYi5sZW5ndGggLSAxXS50b0ZpeGVkKDEpKTtcbn0iXX0=
