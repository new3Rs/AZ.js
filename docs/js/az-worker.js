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

var _neural_network_client = require('./neural_network_client.js');

var _board_constants = require('./board_constants.js');

var _board = require('./board.js');

var _mcts = require('./mcts.js');

/**
 * 対局を行う思考エンジンクラスです。
 * ウェブワーカで動かすことを前提に、メインスレッドのアプリとNeuralNetworkの2つと通信しながらMCTSを実行します。
 */
/**
 * @file 対局を行う思考エンジンクラスAZjsEngineのコードです。
 * ウェブワーカで動かすことを前提に、メインスレッドのアプリとNeuralNetworkの2つと通信しながらモンテカルロツリー探索を実行します。
 */
/*
 * @author 市川雄二
 * @copyright 2018 ICHIKAWA, Yuji (New 3 Rs)
 * @license MIT
 */
// メインスレッドで動かす場合、以下のimportを'./neural_network.js'に変えます。
class AZjsEngine {
    /**
     * @param {Integer} size 碁盤サイズ
     * @param {number} komi コミ
     */
    constructor(size = 19, komi = 7) {
        this.b = new _board.Board(new _board_constants.BoardConstants(size), komi);
        this.nn = new _neural_network_client.NeuralNetwork(self);
        this.mcts = new _mcts.MCTS(this.nn, this.b.C);
    }

    /**
     * ニューラルネットワークのウェイトをロードします。
     */
    async loadNN() {
        let args;
        switch (this.b.C.BSIZE) {
            case 9:
                args = ['https://storage.googleapis.com/mimiaka-storage/LeelaZero9'];
                break;
            case 19:
                args = ['https://storage.googleapis.com/mimiaka-storage/ELF_OpenGo', 2];
                break;
            default:
                throw new Error('size is not supported');
        }
        await this.nn.invokeRM('load', args);
    }

    /**
     * 内部状態をクリアします。
     * 改めて初手から対局可能になります。
     */
    clear() {
        this.b.reset();
        this.mcts.clear();
    }

    /**
     * 持ち時間を設定します。
     * @param {number} mainTime 秒
     * @param {number} byoyomi 秒
     */
    timeSettings(mainTime, byoyomi) {
        this.mcts.setTime(mainTime, byoyomi);
    }

    /**
     * 次の手を返します。状況に応じて投了します。
     * 戻り値[x, y]は左上が1-オリジンの2次元座標です。もしくは'resgin'または'pass'を返します。
     * 内部で保持している局面も進めます。
     * @returns {Integer[]|string}
     */
    async genmove() {
        try {
            const [move, winRate] = await this.search();
            if (winRate < 0.05) {
                return 'resign';
            } else if (move === this.b.C.PASS || this.b.state[move] === this.b.C.EMPTY) {
                this.b.play(move, true);
                return move === this.b.C.PASS ? 'pass' : this.b.C.ev2xy(move);
            } else {
                console.log('error');
                console.log('%d(%s) is not empty', move, this.b.C.ev2str(move));
                this.b.showboard();
                console.log(this.b.candidates());
            }
        } catch (e) {
            console.error(e);
        }
    }

    /**
     * 次の手を打って現局面を進めます。
     * (x, y)は左上が1-オリジンの2次元座標です。
     * @param {Integer} x 
     * @param {Integer} y 
     */
    play(x, y) {
        this.b.play(this.b.C.xy2ev(x, y));
    }

    /**
     * 次の手をパスして現局面を進めます。
     */
    pass() {
        this.b.play(this.b.C.PASS);
    }

    /**
     * @private
     */
    async search() {
        return await this.mcts.search(this.b, 0.0, false, false);
    }

    /**
     * @private
     */
    finalScore() {
        return this.b.finalScore();
    }

    /**
     * 相手の考慮中に探索を継続します。
     */
    async ponder() {
        return await this.mcts.search(this.b, Infinity, true, false);
    }

    /**
     * 探索を強制終了させます。
     * 探索ツリーは有効なままです。主にポンダリング終了に使います。
     */
    stop() {
        this.mcts.stop();
    }

    /**
     * メイン時間の残り時間を返します。
     * @returns {number} 残りの秒数
     */
    timeLeft() {
        return this.mcts.leftTime;
    }
}
exports.AZjsEngine = AZjsEngine;
},{"./board.js":5,"./board_constants.js":6,"./mcts.js":7,"./neural_network_client.js":8}],5:[function(require,module,exports){
'use strict';

Object.defineProperty(exports, "__esModule", {
    value: true
});
exports.Board = undefined;

var _utils = require('./utils.js');

var _stone_group = require('./stone_group.js');

/// ニューラルネットワークへの入力に関する履歴の深さです。
/**
 * @file 碁盤クラスです。
 * このコードはPyaqの移植コードです。
 * @see {@link https://github.com/ymgaq/Pyaq}
 */
/*
 * @author 市川雄二 
 * @copyright 2018 ICHIKAWA, Yuji (New 3 Rs)
 * @license MIT
 */
const KEEP_PREV_CNT = 7;

/**
 * 碁盤クラスです。
 */
class Board {
    /**
     * @param {BoardConstants} constants
     * @param {number} komi 
     */
    constructor(constants, komi = 7.5) {
        this.C = constants;
        this.komi = komi;
        /** 交点の状態配列です。拡張線形座標です。 */
        this.state = new Uint8Array(this.C.EBVCNT);
        this.state.fill(this.C.EXTERIOR);
        this.id = new Uint16Array(this.C.EBVCNT); // 交点の連IDです。
        this.next = new Uint16Array(this.C.EBVCNT); // 交点を含む連の次の石の座標です。
        this.sg = []; // 連情報です。
        for (let i = 0; i < this.C.EBVCNT; i++) {
            this.sg.push(new _stone_group.StoneGroup(this.C));
        }
        this.prevState = [];
        this.ko = this.C.VNULL;
        /** 手番です。 */
        this.turn = this.C.BLACK;
        /** 現在の手数です。 */
        this.moveNumber = 0;
        /** 直前の着手です。 */
        this.prevMove = this.C.VNULL;
        this.removeCnt = 0;
        this.history = [];
        this.reset();
    }

    /**
     * 状態を初期化します。
     */
    reset() {
        for (let x = 1; x <= this.C.BSIZE; x++) {
            for (let y = 1; y <= this.C.BSIZE; y++) {
                this.state[this.C.xy2ev(x, y)] = this.C.EMPTY;
            }
        }
        for (let i = 0; i < this.id.length; i++) {
            this.id[i] = i;
        }
        for (let i = 0; i < this.next.length; i++) {
            this.next[i] = i;
        }
        this.sg.forEach(e => {
            e.clear(false);
        });
        this.prevState = [];
        for (let i = 0; i < KEEP_PREV_CNT; i++) {
            this.prevState.push(this.state.slice());
        }
        this.ko = this.C.VNULL;
        this.turn = this.C.BLACK;
        this.moveNumber = 0;
        this.prevMove = this.C.VNULL;
        this.removeCnt = 0;
        this.history = [];
    }

    /**
     * destに状態をコピーします。
     * @param {Board} dest 
     */
    copyTo(dest) {
        dest.state = this.state.slice();
        dest.id = this.id.slice();
        dest.next = this.next.slice();
        for (let i = 0; i < dest.sg.length; i++) {
            this.sg[i].copyTo(dest.sg[i]);
        }
        dest.prevState = [];
        for (let i = 0; i < KEEP_PREV_CNT; i++) {
            dest.prevState.push(this.prevState[i].slice());
        }
        dest.ko = this.ko;
        dest.turn = this.turn;
        dest.moveNumber = this.moveNumber;
        dest.removeCnt = this.removeCnt;
        dest.history = Array.from(this.history);
    }

    /**
     * 拡張線形座標の配列を受け取って順に着手します。
     * @param {Uin16[]} sequence 
     */
    playSequence(sequence) {
        for (const v of sequence) {
            this.play(v);
        }
    }

    /**
     * 交点にある石を含む連を盤上から打ち上げます。
     * @param {Uint16} v 拡張線形座標
     */
    remove(v) {
        let vTmp = v;
        while (true) {
            this.removeCnt += 1;
            this.state[vTmp] = this.C.EMPTY;
            this.id[vTmp] = vTmp;
            for (const nv of this.C.neighbors(vTmp)) {
                this.sg[this.id[nv]].add(vTmp);
            }
            const vNext = this.next[vTmp];
            this.next[vTmp] = vTmp;
            vTmp = vNext;
            if (vTmp === v) {
                break;
            }
        }
    }

    /**
     * 交点にある石の連を結合します。
     * @param {Uint16} v1 拡張線形座標
     * @param {Uint16} v2 拡張線形座標
     */
    merge(v1, v2) {
        let idBase = this.id[v1];
        let idAdd = this.id[v2];
        if (this.sg[idBase].getSize() < this.sg[idAdd].getSize()) {
            let tmp = idBase;
            idBase = idAdd;
            idAdd = tmp;
        }

        this.sg[idBase].merge(this.sg[idAdd]);

        let vTmp = idAdd;
        do {
            this.id[vTmp] = idBase;
            vTmp = this.next[vTmp];
        } while (vTmp !== idAdd);
        const tmp = this.next[v1];
        this.next[v1] = this.next[v2];
        this.next[v2] = tmp;
    }

    /**
     * 交点vに着手するヘルパーメソッドです。
     * 着手にはplayメソッドを使ってください。
     * @private
     * @param {Uint16} v 拡張線形座標
     */
    placeStone(v) {
        const stoneColor = this.turn;
        this.state[v] = stoneColor;
        this.id[v] = v;
        this.sg[this.id[v]].clear(true);
        for (const nv of this.C.neighbors(v)) {
            if (this.state[nv] === this.C.EMPTY) {
                this.sg[this.id[v]].add(nv);
            } else {
                this.sg[this.id[nv]].sub(v);
            }
        }
        for (const nv of this.C.neighbors(v)) {
            if (this.state[nv] === stoneColor && this.id[nv] !== this.id[v]) {
                this.merge(v, nv);
            }
        }
        this.removeCnt = 0;
        const opponentStone = this.C.opponentOf(this.turn);
        for (const nv of this.C.neighbors(v)) {
            if (this.state[nv] === opponentStone && this.sg[this.id[nv]].getLibCnt() === 0) {
                this.remove(nv);
            }
        }
    }

    /**
     * 交点が着手禁止でないかを返します。
     * 石が既に存在する交点、コウによる禁止、自殺手が着手禁止点です。
     * @param {*} v 拡張線形座標
     * @returns {bool} 
     */
    legal(v) {
        if (v === this.C.PASS) {
            return true;
        } else if (v === this.ko || this.state[v] !== this.C.EMPTY) {
            return false;
        }

        const stoneCnt = [0, 0];
        const atrCnt = [0, 0];
        for (const nv of this.C.neighbors(v)) {
            const c = this.state[nv];
            switch (c) {
                case this.C.EMPTY:
                    return true;
                case this.C.BLACK:
                case this.C.WHITE:
                    stoneCnt[c] += 1;
                    if (this.sg[this.id[nv]].getLibCnt() === 1) {
                        atrCnt[c] += 1;
                    }
            }
        }
        return atrCnt[this.C.opponentOf(this.turn)] !== 0 || atrCnt[this.turn] < stoneCnt[this.turn];
    }

    /**
     * 交点vががん形かどうかを返します。
     * @private
     * @param {Uint16} v 
     * @param {number} pl player color
     */
    eyeshape(v, pl) {
        if (v === this.C.PASS) {
            return false;
        }
        for (const nv of this.C.neighbors(v)) {
            const c = this.state[nv];
            if (c === this.C.EMPTY || c === this.C.opponentOf(pl)) {
                return false;
            }
        }
        const diagCnt = [0, 0, 0, 0];
        for (const nv of this.C.diagonals(v)) {
            diagCnt[this.state[nv]] += 1;
        }
        const wedgeCnt = diagCnt[this.C.opponentOf(pl)] + (diagCnt[3] > 0 ? 1 : 0);
        if (wedgeCnt === 2) {
            for (const nv of this.C.diagonals(v)) {
                if (this.state[nv] === this.C.opponentOf(pl) && this.sg[this.id[nv]].getLibCnt() === 1 && this.sg[this.id[nv]].getVAtr() !== this.ko) {
                    return true;
                }
            }
        }
        return wedgeCnt < 2;
    }

    /**
     * 交点vに着手します。
     * @param {*} v 拡張線形座標
     * @param {*} notFillEye 眼を潰すことを許可しない
     */
    play(v, notFillEye = false) {
        if (!this.legal(v)) {
            return false;
        }
        if (notFillEye && this.eyeshape(v, this.turn)) {
            return false;
        }
        for (let i = KEEP_PREV_CNT - 2; i >= 0; i--) {
            this.prevState[i + 1] = this.prevState[i];
        }
        this.prevState[0] = this.state.slice();
        if (v === this.C.PASS) {
            this.ko = this.C.VNULL;
        } else {
            this.placeStone(v);
            const id = this.id[v];
            this.ko = this.C.VNULL;
            if (this.removeCnt === 1 && this.sg[id].getLibCnt() === 1 && this.sg[id].getSize() === 1) {
                this.ko = this.sg[id].getVAtr();
            }
        }
        this.prevMove = v;
        this.history.push(v);
        this.turn = this.C.opponentOf(this.turn);
        this.moveNumber += 1;
        return true;
    }

    /**
     * 眼形を潰さないようにランダムに着手します。
     */
    randomPlay() {
        const emptyList = [];
        for (let i = 0; i < this.state.length; i++) {
            if (this.state[i] === this.C.EMPTY) {
                emptyList.push(i);
            }
        }
        (0, _utils.shuffle)(emptyList);
        for (const v of emptyList) {
            if (this.play(v, true)) {
                return v;
            }
        }
        this.play(this.C.PASS, true);
        return this.C.PASS;
    }

    /**
     * スコア差を返します。
     * 同じ色の石の数と一方の石にだけ隣接する交点の数がその色のスコアという簡易ルールです。
     * (randomPlayを実行した後では中国ルールと同じ値になります)
     */
    score() {
        const stoneCnt = [0, 0];
        for (let v = 0; v < this.C.EBVCNT; v++) {
            const s = this.state[v];
            if (s === this.C.BLACK || s === this.C.WHITE) {
                stoneCnt[s] += 1;
            } else if (s === this.C.EMPTY) {
                const nbrCnt = [0, 0, 0, 0];
                for (const nv of this.C.neighbors(v)) {
                    nbrCnt[this.state[nv]] += 1;
                }
                if (nbrCnt[this.C.WHITE] > 0 && nbrCnt[this.C.BLACK] === 0) {
                    stoneCnt[this.C.WHITE] += 1;
                } else if (nbrCnt[this.C.BLACK] > 0 && nbrCnt[this.C.WHITE] === 0) {
                    stoneCnt[this.C.BLACK] += 1;
                }
            }
        }
        return stoneCnt[1] - stoneCnt[0] - this.komi;
    }

    /**
     * 眼以外着手可能な交点がなくなるまでランダムに着手します。
     * showBoardがtrueのとき終局
     * @param {bool}} showBoard 
     */
    rollout(showBoard) {
        while (this.moveNumber < this.C.EBVCNT * 2) {
            const prevMove = this.prevMove;
            const move = this.randomPlay();
            if (showBoard && move !== this.C.PASS) {
                console.log('\nmove count=%d', this.moveNumber);
                this.showboard();
            }
            if (prevMove === this.C.PASS && move === this.C.PASS) {
                break;
            }
        }
    }

    /**
     * 碁盤のx軸ラベルを表示します。
     * @private
     */
    printXlabel() {
        let lineStr = '  ';
        for (let x = 1; x <= this.C.BSIZE; x++) {
            lineStr += ` ${this.C.X_LABELS[x]} `;
        }
        console.log(lineStr);
    }

    /**
     * 碁盤をコンソールに出力します。
     */
    showboard() {
        this.printXlabel();
        for (let y = this.C.BSIZE; y > 0; y--) {
            let lineStr = (' ' + y.toString()).slice(-2);
            for (let x = 1; x <= this.C.BSIZE; x++) {
                const v = this.C.xy2ev(x, y);
                let xStr;
                switch (this.state[v]) {
                    case this.C.BLACK:
                        xStr = v === this.prevMove ? '[X]' : ' X ';
                        break;
                    case this.C.WHITE:
                        xStr = v === this.prevMove ? '[O]' : ' O ';
                        break;
                    case this.C.EMPTY:
                        xStr = ' . ';
                        break;
                    default:
                        xStr = ' ? ';
                }
                lineStr += xStr;
            }
            lineStr += (' ' + y.toString()).slice(-2);
            console.log(lineStr);
        }
        this.printXlabel();
        console.log('');
    }

    /**
     * ニューラルネットワークを使用する際の入力フィーチャーを生成します。
     * @returns {Float32Array}
     */
    feature() {
        const FEATURE_CNT = KEEP_PREV_CNT * 2 + 4;
        const index = (p, f) => p * FEATURE_CNT + f;
        const array = new Float32Array(this.C.BVCNT * FEATURE_CNT);
        const my = this.turn;
        const opp = this.C.opponentOf(this.turn);

        const N = KEEP_PREV_CNT + 1;
        for (let p = 0; p < this.C.BVCNT; p++) {
            array[index(p, 0)] = this.state[this.C.rv2ev(p)] === my ? 1.0 : 0.0;
        }
        for (let p = 0; p < this.C.BVCNT; p++) {
            array[index(p, N)] = this.state[this.C.rv2ev(p)] === opp ? 1.0 : 0.0;
        }
        for (let i = 0; i < KEEP_PREV_CNT; i++) {
            for (let p = 0; p < this.C.BVCNT; p++) {
                array[index(p, i + 1)] = this.prevState[i][this.C.rv2ev(p)] === my ? 1.0 : 0.0;
            }
            for (let p = 0; p < this.C.BVCNT; p++) {
                array[index(p, N + i + 1)] = this.prevState[i][this.C.rv2ev(p)] === opp ? 1.0 : 0.0;
            }
        }
        let is_black_turn, is_white_turn;
        if (my === this.C.BLACK) {
            is_black_turn = 1.0;
            is_white_turn = 0.0;
        } else {
            is_black_turn = 0.0;
            is_white_turn = 1.0;
        }
        for (let p = 0; p < this.C.BVCNT; p++) {
            array[index(p, FEATURE_CNT - 2)] = is_black_turn;
            array[index(p, FEATURE_CNT - 1)] = is_white_turn;
        }
        return array;
    }

    /**
     * 現在の局面のハッシュ値を返します。
     * (注)手数情報は含みません。なので比較にはハッシュ値と手数両方を使います。
     */
    hash() {
        return (0, _utils.hash)((this.state.toString() + this.prevState[0].toString() + this.turn.toString()).replace(',', ''));
    }

    /**
     * @typedef {Object} Candidates
     * @property {number} hash 
     * @property {Integer} moveCnt
     * @property {Integer[]} list 着手可能な交点線形座標(拡張線形座標ではありません)
     * 着手可能な交点の情報を返します。
     * @returns {object} { hash: ハッシュ値, moveNumber: 手数, list: 候補手配列 }
     */
    candidates() {
        const candList = [];
        for (let v = 0; v < this.state.length; v++) {
            if (this.legal(v)) {
                candList.push(this.C.ev2rv(v));
            }
        }
        candList.push(this.C.ev2rv(this.C.PASS));
        return {
            hash: this.hash(),
            moveNumber: this.moveNumber,
            list: candList
        };
    }

    /**
     * 統計的手法で整地した結果を返します。
     * @private
     */
    finalScore() {
        const ROLL_OUT_NUM = 256;
        const doubleScoreList = [];
        let bCpy = new Board(this.C, this.komi);
        for (let i = 0; i < ROLL_OUT_NUM; i++) {
            this.copyTo(bCpy);
            bCpy.rollout(false);
            doubleScoreList.push(bCpy.score());
        }
        return (0, _utils.mostCommon)(doubleScoreList);
    }
}
exports.Board = Board;
},{"./stone_group.js":9,"./utils.js":10}],6:[function(require,module,exports){
'use strict';

Object.defineProperty(exports, "__esModule", {
    value: true
});
/**
 * @file 碁盤の定数クラスです
 */
/*
 * @author 市川雄二 
 * @copyright 2018 ICHIKAWA, Yuji (New 3 Rs)
 * @license MIT
 */

// 座標変換用定数です。
const OFFSET = 'a'.charCodeAt(0) - 1;

/**
 * 碁盤定数と座標変換のクラスです。<br>
 * 碁盤クラスでは座標系に拡張線形座標を使います。
 * 拡張線形座標は盤外の交点を持つ碁盤の座標です。
 * 四路盤の場合、以下のような構造になります。
 * <pre style="font-family: Courier;">
 *     ###### #が盤外(実際の値はEXTERIOR)
 *     #....# .は盤上交点(実際の値はEMPTY)
 *     #....#
 *     #....#
 *     #....#
 *     ######
 * </pre>
 * 左下から0-オリジンで数えます。四路盤の場合、
 * <pre style="font-family: Courier;">
 *     30 31 32 33 34 35
 *     24 25 26 27 28 29
 *     18 19 20 21 22 23
 *     12 13 14 15 16 17
 *      6  7  8  9 10 11
 *      0  1  2  3  4  5
 * </pre>
 * 碁盤の交点をxy座標で表すときも左下が原点です。ただしxy座標の場合、1-オリジンです。
 */
class BoardConstants {
    constructor(size = 19) {
        this.WHITE = 0;
        this.BLACK = 1;
        this.EMPTY = 2;
        this.EXTERIOR = 3;
        this.X_LABELS = '@ABCDEFGHJKLMNOPQRST';
        this.BSIZE = size; // 碁盤サイズ
        this.EBSIZE = this.BSIZE + 2; // 拡張碁盤サイズ
        this.EBVCNT = this.EBSIZE * this.EBSIZE;
        this.PASS = this.EBVCNT;
        this.VNULL = this.EBVCNT + 1;
        this.BVCNT = this.BSIZE * this.BSIZE;
        Object.freeze(this);
    }

    opponentOf(color) {
        switch (color) {
            case this.WHITE:
                return this.BLACK;
            case this.BLACK:
                return this.WHITE;
            default:
                throw new Error('invalid color');
        }
    }

    /**
     * SGFフォーマットの座標をxy座標に変換します。
     * @param {string} s 
     * @returns {Integer[]} xy座標
     */
    move2xy(s) {
        return [s.charCodeAt(0) - OFFSET, this.BSIZE + 1 - (s.charCodeAt(1) - OFFSET)];
    }

    /**
     * 拡張線形座標をxy座標に変換します。
     * @param {Uint16} ev 
     * @returns {Integer[]} xy座標
     */
    ev2xy(ev) {
        return [ev % this.EBSIZE, Math.floor(ev / this.EBSIZE)];
    }

    /**
     * xy座標を拡張線形座標に変換します。
     * @param {Integer} x 
     * @param {Integer} y 
     * @returns {Uint16} extended vertex
     */
    xy2ev(x, y) {
        return y * this.EBSIZE + x;
    }

    /**
     * 線形座標を拡張線形座標に変換します。
     * @param {Uint16} rv raw vertex
     * @returns {Uint16} extended vertex
     */
    rv2ev(rv) {
        return rv === this.BVCNT ? this.PASS : rv % this.BSIZE + 1 + Math.floor(rv / this.BSIZE + 1) * this.EBSIZE;
    }

    /**
     * 拡張線形座標を線形座標に変換します。
     * @param {Uint16} ev
     * @returns {Uint16} raw vertex
     */
    ev2rv(ev) {
        return ev === this.PASS ? this.BVCNT : ev % this.EBSIZE - 1 + Math.floor(ev / this.EBSIZE - 1) * this.BSIZE;
    }

    /**
     * 拡張線形座標をGTPが使用する座標に変換します。
     * @param {Uint16} ev
     * @returns {string} GTP座標
     */
    ev2str(ev) {
        if (ev >= this.PASS) {
            return 'pass';
        } else {
            const [x, y] = this.ev2xy(ev);
            return this.X_LABELS.charAt(x) + y.toString();
        }
    }

    /**
     * GTPが使用する拡張線形座標に変換します。
     * @param {string} v
     * @returns {Uint16} extended vertex
     */
    str2ev(v) {
        const vStr = v.toUpperCase();
        if (vStr === 'PASS' || vStr === 'RESIGN') {
            return this.PASS;
        } else {
            const x = this.X_LABELS.indexOf(vStr.charAt(0));
            const y = parseInt(vStr.slice(1));
            return this.xy2ev(x, y);
        }
    }

    /**
     * vに隣接する交点の座標を返します。
     * @param {Uint16}} v 拡張線形座標
     */
    neighbors(v) {
        return [v + 1, v + this.EBSIZE, v - 1, v - this.EBSIZE];
    }

    /**
     * vに斜め隣接する交点の座標を返します。
     * @param {Uint16}} v 拡張線形座標
     */
    diagonals(v) {
        return [v + this.EBSIZE + 1, v + this.EBSIZE - 1, v - this.EBSIZE - 1, v - this.EBSIZE + 1];
    }
}
exports.BoardConstants = BoardConstants;
},{}],7:[function(require,module,exports){
'use strict';

Object.defineProperty(exports, "__esModule", {
    value: true
});
exports.MCTS = undefined;

var _utils = require('./utils.js');

var _board = require('./board.js');

/**
 * @file モンテカルロツリー探索の実装です。
 * このコードはPyaqの移植コードです。
 * @see {@link https://github.com/ymgaq/Pyaq}
 */
/*
 * @author 市川雄二
 * @copyright 2018 ICHIKAWA, Yuji (New 3 Rs)
 * @license MIT
 */
const NODES_MAX_LENGTH = 16384;
const EXPAND_CNT = 8;

/** MCTSのノードクラスです。 */
class Node {
    /**
     * MCTSのノードを生成します。
     * @param {BoardConstants} constants
     */
    constructor(constants) {
        this.C = constants;
        /** 着手候補数です。(名前のedgeはグラフ理論の枝のことです。) */
        this.edgeLength = 0;
        //頻繁なメモリアロケーションを避けるため、枝情報に必要な最大メモリを予め確保します。
        /** ポリシー確率の高い順並んだ着手候補です。 */
        this.moves = new Uint16Array(this.C.BVCNT + 1);
        /** moves要素に対応するポリシー確率です。 */
        this.probabilities = new Float32Array(this.C.BVCNT + 1);
        /** moves要素に対応するバリューです。ただしノードの手番から見ての値です。 */
        this.values = new Float32Array(this.C.BVCNT + 1);
        /** moves要素に対応する総アクションバリューです。ただしノードの手番から見ての値です。 */
        this.totalActionValues = new Float32Array(this.C.BVCNT + 1);
        /** moves要素に対応する訪問回数です。 */
        this.visitCounts = new Uint32Array(this.C.BVCNT + 1);
        /** moves要素に対応するノードIDです。 */
        this.nodeIds = new Int16Array(this.C.BVCNT + 1);
        /** moves要素に対応するハッシュです。 */
        this.hashes = new Uint32Array(this.C.BVCNT + 1);
        /** moves要素に対応する局面のニューラルネットワークを計算したか否かを保持します。 */
        this.evaluated = new Uint8Array(this.C.BVCNT + 1);
        this.totalValue = 0.0;
        this.totalCount = 0;
        this.hash = 0;
        this.moveNumber = -1;
        this.exitCondition = null;
        this.clear();
    }

    /** 未使用状態にします。 */
    clear() {
        this.edgeLength = 0;
        this.totalValue = 0.0;
        this.totalCount = 0;
        this.hash = 0;
        this.moveNumber = -1;
    }

    /**
     * 初期化します。
     * @param {object} candidates Boardが生成する候補手情報です。
     * @param {Float32Array} prob 着手確率(ニューラルネットワークのポリシー出力)です。
     */
    initialize(candidates, prob) {
        this.clear();
        this.moveNumber = candidates.moveNumber;
        this.hash = candidates.hash;

        for (const rv of (0, _utils.argsort)(prob, true)) {
            if (candidates.list.includes(rv)) {
                this.moves[this.edgeLength] = this.C.rv2ev(rv);
                this.probabilities[this.edgeLength] = prob[rv];
                this.values[this.edgeLength] = 0.0;
                this.totalActionValues[this.edgeLength] = 0.0;
                this.visitCounts[this.edgeLength] = 0;
                this.nodeIds[this.edgeLength] = -1;
                this.hashes[this.edgeLength] = 0;
                this.evaluated[this.edgeLength] = false;
                this.edgeLength += 1;
            }
        }
    }

    /**
     * エッジの中のベスト2のインデックスを返します。
     * @returns {Integer[]}
     */
    best2() {
        const order = (0, _utils.argsort)(this.visitCounts.slice(0, this.edgeLength), true);
        return order.slice(0, 2);
    }
}

/** モンテカルロツリー探索を実行するクラスです。 */
class MCTS {
    /**
     * コンストラクタ
     * @param {NeuralNetwork} nn 
     * @param {BoardConstants} C
     */
    constructor(nn, C) {
        this.C_PUCT = 0.01;
        this.mainTime = 0.0;
        this.byoyomi = 1.0;
        this.leftTime = 0.0;
        this.nodes = [];
        this.nodesLength = 0;
        for (let i = 0; i < NODES_MAX_LENGTH; i++) {
            this.nodes.push(new Node(C));
        }
        this.rootId = 0;
        this.rootMoveNumber = 0;
        this.nodeHashes = new Map();
        this.evalCount = 0;
        this.nn = nn;
        this.terminateFlag = false;
    }

    /**
     * 持ち時間の設定をします。
     * 残り時間もリセットします。
     * @param {number} mainTime 秒
     * @param {number} byoyomi 秒
     */
    setTime(mainTime, byoyomi) {
        this.mainTime = mainTime;
        this.leftTime = mainTime;
        this.byoyomi = byoyomi;
    }

    /**
     * 残り時間を設定します。
     * @param {number} leftTime 秒
     */
    setLeftTime(leftTime) {
        this.leftTime = leftTime;
    }

    /**
     * 内部状態をクリアします。
     * 同一時間設定で初手から対局できるようになります。
     */
    clear() {
        this.leftTime = this.mainTime;
        for (const node of this.nodes) {
            node.clear();
        }
        this.nodesLength = 0;
        this.rootId = 0;
        this.rootMoveNumber = 0;
        this.nodeHashes.clear();
        this.evalCount = 0;
    }

    /**
     * 局面bのMCTSの探索ノードが既にあるか確認し、なければ生成してノードIDを返します。
     * @param {Board} b 
     * @param {Float32Array} prob 
     * @returns {Integer} ノードID
     */
    createNode(b, prob) {
        const candidates = b.candidates();
        const hash = candidates.hash;
        if (this.nodeHashes.has(hash) && this.nodes[this.nodeHashes.get(hash)].hash === hash && this.nodes[this.nodeHashes.get(hash)].moveNumber === candidates.moveNumber) {
            return this.nodeHashes.get(hash);
        }

        let nodeId = hash % NODES_MAX_LENGTH;
        while (this.nodes[nodeId].moveNumber !== -1) {
            nodeId = nodeId + 1 < NODES_MAX_LENGTH ? nodeId + 1 : 0;
        }

        this.nodeHashes.set(hash, nodeId);
        this.nodesLength += 1;

        const node = this.nodes[nodeId];
        node.initialize(candidates, prob);
        return nodeId;
    }

    /**
     * nodesの中の不要なノードを未使用状態に戻します。
     */
    cleanupNodes() {
        if (this.nodesLength < NODES_MAX_LENGTH / 2) {
            return;
        }
        for (let i = 0; i < NODES_MAX_LENGTH; i++) {
            const mc = this.nodes[i].moveNumber;
            if (mc != null && mc < this.rootMoveNumber) {
                this.nodeHashes.delete(this.nodes[i].hash);
                this.nodes[i].clear();
            }
        }
    }

    /**
     * UCB評価で最善の着手情報を返します。
     * @param {Board} b 
     * @param {Integer} nodeId 
     * @returns {Array} [UCB選択インデックス, 最善ブランチの子ノードID, 着手]
     */
    selectByUCB(b, node) {
        const ndRate = node.totalCount === 0 ? 0.0 : node.totalValue / node.totalCount;
        const cpsv = this.C_PUCT * Math.sqrt(node.totalCount);
        const meanActionValues = new Float32Array(node.edgeLength);
        for (let i = 0; i < meanActionValues.length; i++) {
            meanActionValues[i] = node.visitCounts[i] === 0 ? ndRate : node.totalActionValues[i] / node.visitCounts[i];
        }
        const ucb = new Float32Array(node.edgeLength);
        for (let i = 0; i < ucb.length; i++) {
            ucb[i] = meanActionValues[i] + cpsv * node.probabilities[i] / (1 + node.visitCounts[i]);
        }
        const selectedIndex = (0, _utils.argmax)(ucb);
        const selectedId = node.nodeIds[selectedIndex];
        const selectedMove = node.moves[selectedIndex];
        return [selectedIndex, selectedId, selectedMove];
    }

    /**
     * 検索するかどうかを決定します。
     * @param {Integer} best 
     * @param {Integer} second 
     */
    shouldSearch(best, second) {
        const node = this.nodes[this.rootId];
        const winrate = this.winrate(node, best);

        // 訪問回数が足りていないか、際立った手がなくかつはっきり勝ちじゃないとき
        return node.totalCount <= 5000 || node.visitCounts[best] <= node.visitCounts[second] * 100 && winrate <= 0.95;
    }

    /**
     * 次の着手の考慮時間を算出します。
     * @returns {number} 使用する時間(秒)
     */
    getSearchTime(C) {
        if (this.mainTime === 0.0 || this.leftTime < this.byoyomi * 2.0) {
            return Math.max(this.byoyomi, 1.0);
        } else {
            // 碁盤を埋めることを仮定し、残りの手数を算出します。
            const assumedRemainingMoves = (C.BVCNT - this.rootMoveNumber) / 2;
            //布石ではより多くの手数を仮定し、急ぎます。
            const openingOffset = Math.max(C.BVCNT / 10 - this.rootMoveNumber, 0);
            return this.leftTime / (assumedRemainingMoves + openingOffset) + this.byoyomi;
        }
    }

    /**
     * nodeIdのノードのedgeIndexのエッジに対応するノードが既に存在するか返します。
     * @param {Integer} nodeId 
     * @param {Integer} edgeIndex 
     * @param {Integer} moveNumber 
     * @returns {bool}
     */
    hasEdgeNode(edgeIndex, nodeId, moveNumber) {
        const node = this.nodes[nodeId];
        const edgeId = node.nodeIds[edgeIndex];
        return edgeId >= 0 && node.hashes[edgeIndex] === this.nodes[edgeId].hash && this.nodes[edgeId].moveNumber === moveNumber;
    }

    /**
     * indexのエッジの勝率を返します。
     * @param {Node} node 
     * @param {Integer} index 
     * @returns {number}
     */
    winrate(node, index) {
        return node.totalActionValues[index] / Math.max(node.visitCounts[index], 1) / 2.0 + 0.5;
    }

    /**
     * printInfoのヘルパー関数です。
     * @private
     * @param {Integer} nodeId 
     * @param {*} headMove 
     * @param {BoardConstants} c 
     */
    bestSequence(nodeId, headMove, c) {
        let seqStr = ('   ' + c.ev2str(headMove)).slice(-5);
        let nextMove = headMove;

        for (let i = 0; i < 7; i++) {
            const node = this.nodes[nodeId];
            if (nextMove === c.PASS || node.edgeLength < 1) {
                break;
            }

            const best = (0, _utils.argmax)(node.visitCounts.slice(0, node.edgeLength));
            if (node.visitCounts[best] === 0) {
                break;
            }
            nextMove = node.moves[best];
            seqStr += '->' + ('   ' + c.ev2str(nextMove)).slice(-5);

            if (!this.hasEdgeNode(best, nodeId, node.moveNumber + 1)) {
                break;
            }
            nodeId = node.nodeIds[best];
        }

        return seqStr;
    }

    /**
     * 探索結果の詳細を表示します。
     * @param {Integer} nodeId 
     * @param {BoardConstants} c
     */
    printInfo(nodeId, c) {
        const node = this.nodes[nodeId];
        const order = (0, _utils.argsort)(node.visitCounts.slice(0, node.edgeLength), true);
        console.log('|move|count  |rate |value|prob | best sequence');
        for (let i = 0; i < Math.min(order.length, 9); i++) {
            const m = order[i];
            const visitCounts = node.visitCounts[m];
            if (visitCounts === 0) {
                break;
            }

            const rate = visitCounts === 0 ? 0.0 : this.winrate(node, m) * 100.0;
            const value = (node.values[m] / 2.0 + 0.5) * 100.0;
            console.log('|%s|%s|%s|%s|%s| %s', ('   ' + c.ev2str(node.moves[m])).slice(-4), (visitCounts + '      ').slice(0, 7), ('  ' + rate.toFixed(1)).slice(-5), ('  ' + value.toFixed(1)).slice(-5), ('  ' + (node.probabilities[m] * 100.0).toFixed(1)).slice(-5), this.bestSequence(node.nodeIds[m], node.moves[m], c));
        }
    }

    /**
     * 検索の前処理です。
     * @private
     * @param {Board} b 
     */
    async prepareRootNode(b) {
        const hash = b.hash();
        this.rootMoveNumber = b.moveNumber;
        this.C_PUCT = this.rootMoveNumber < 8 ? 0.01 : 1.5;
        if (this.nodeHashes.has(hash) && this.nodes[this.nodeHashes.get(hash)].hash === hash && this.nodes[this.nodeHashes.get(hash)].moveNumber === this.rootMoveNumber) {
            this.rootId = this.nodeHashes.get(hash);
        } else {
            const [prob] = await this.nn.evaluate(b.feature());

            // AlphaGo Zeroでは自己対戦時にはここでprobに"Dirichletノイズ"を追加しますが、本コードでは強化学習は予定していないので記述しません。

            this.rootId = this.createNode(b, prob);
        }
    }

    /**
     * edgeIndexのエッジの局面を評価しノードを生成してバリューを返します。
     * @private
     * @param {Board} b 
     * @param {Integer} edgeIndex 
     * @param {Node} parentNode 
     * @returns {number} parentNodeの手番から見たedge局面のバリュー
     */
    async evaluateEdge(b, edgeIndex, parentNode) {
        let [prob, value] = await this.nn.evaluate(b.feature());
        this.evalCount += 1;
        value = -value[0]; // parentNodeの手番から見たバリューに変換します。
        parentNode.values[edgeIndex] = value;
        parentNode.evaluated[edgeIndex] = true;
        if (this.nodesLength > 0.85 * NODES_MAX_LENGTH) {
            this.cleanupNodes();
        }
        const nodeId = this.createNode(b, prob);
        parentNode.nodeIds[edgeIndex] = nodeId;
        parentNode.hashes[edgeIndex] = b.hash();
        parentNode.totalValue -= parentNode.totalActionValues[edgeIndex];
        parentNode.totalCount += parentNode.visitCounts[edgeIndex];
        return value;
    }

    /**
     * MCTSツリーをUCBに従って下り、リーフノードに到達したら展開します。
     * @private
     * @param {Board} b 
     * @param {Integer} nodeId
     */
    async playout(b, nodeId) {
        const node = this.nodes[nodeId];
        const [selectedIndex, selectedId, selectedMove] = this.selectByUCB(b, node);
        b.play(selectedMove);
        const isHeadNode = !this.hasEdgeNode(selectedIndex, nodeId, b.moveNumber);
        /*
        // 以下はPyaqが採用したヘッドノードの条件です。
        const isHeadNode = !this.hasEdgeNode(selectedIndex, nodeId, b.moveNumber) ||
            node.visitCounts[selectedIndex] < EXPAND_CNT ||
            b.moveNumber > b.C.BVCNT * 2 ||
            (selectedMove === b.C.PASS && b.prevMove === b.C.PASS);
        */
        const value = isHeadNode ? node.evaluated[selectedIndex] ? node.values[selectedIndex] : await this.evaluateEdge(b, selectedIndex, node) : -(await this.playout(b, selectedId)); // selectedIdの手番でのバリューが返されるから符号を反転させます。
        node.totalValue += value;
        node.totalCount += 1;
        node.totalActionValues[selectedIndex] += value;
        node.visitCounts[selectedIndex] += 1;
        return value;
    }

    /**
     * プレイアウトを繰り返してMCTSツリーを更新します。
     * @private
     * @param {Board} b 
     */
    async keepPlayout(b) {
        this.evalCount = 0;
        let bCpy = new _board.Board(b.C, b.komi);
        do {
            b.copyTo(bCpy);
            await this.playout(bCpy, this.rootId);
        } while (!this.exitCondition());
    }

    /**
     * 探索が必要か判定して必要に応じて検索し、最善と判断した着手と勝率を返します。
     * @private
     * @param {Board} b 
     * @param {bool} ponder trueのときstopメソッドが呼ばれるまで探索を継続します
     * @param {bool} clean 形勢が変わらない限りパス以外の着手を選びます
     * @returns {Array} [着手(書く朝鮮系座標), 勝率]
     */
    async _search(b, ponder, clean) {
        // AlphaGo Zeroでは自己対戦の序盤30手まではエッジの総訪問回数から確率分布を算出して乱数で着手を洗濯しますが、本コードでは強化学習は予定していないので最善と判断した着手を返します。
        let best;
        let second;
        if (ponder || this.shouldSearch(best, second)) {
            await this.keepPlayout(b);
            const best2 = this.nodes[this.rootId].best2();
            best = best2[0];
            second = best2[1];
        } else {
            const best2 = this.nodes[this.rootId].best2();
            best = best2[0];
            second = best2[1];
        }

        const node = this.nodes[this.rootId];

        if (clean && node.moves[best] === b.C.PASS && node.totalActionValues[best] * node.totalActionValues[second] > 0.0) {
            return [node.moves[second], this.winrate(node, second)];
        } else {
            return [node.moves[best], this.winrate(node, best)];
        }
    }

    /**
     * MCTS探索メソッドです。
     * _searchメソッドのラッパーメソッドです。
     * 終了条件を設定し、局面bをtime時間探索し、結果をログ出力して次の一手と勝率を返します。
     * @param {Board} b 
     * @param {number} time 探索時間を秒単位で指定します
     * @param {bool} ponder ttrueのときstopメソッドが呼ばれるまで探索を継続します
     * @param {bool} clean 形勢が変わらない限りパス以外の着手を選びます
     * @returns {Array} [着手(書く朝鮮系座標), 勝率]
     */
    async search(b, time, ponder, clean) {
        const start = Date.now();
        await this.prepareRootNode(b);

        if (this.nodes[this.rootId].edgeLength <= 1) {
            // 候補手がパスしかなければ
            console.log('\nmove number=%d:', this.rootMoveNumber + 1);
            this.printInfo(this.rootId, b.C);
            return [b.C.PASS, 0.5];
        }

        this.cleanupNodes();

        const time_ = (time === 0.0 ? this.getSearchTime(b.C) : time) * 1000 - 500; // 0.5秒のマージン
        this.terminateFlag = false;
        this.exitCondition = ponder ? function () {
            return this.terminateFlag;
        } : function () {
            return this.terminateFlag || Date.now() - start > time_;
        };
        const [nextMove, winRate] = await this._search(b, ponder, clean);

        if (!ponder) {
            console.log('\nmove number=%d: left time=%s[sec] evaluated=%d', this.rootMoveNumber + 1, Math.max(this.leftTime - time, 0.0).toFixed(1), this.evalCount);
            this.printInfo(this.rootId, b.C);
            this.leftTime = this.leftTime - (Date.now() - start) / 1000;
        }
        return [nextMove, winRate];
    }

    /**
     * 実行中のkeepPlayoutを停止させます。
     */
    stop() {
        this.terminateFlag = true;
    }
}
exports.MCTS = MCTS;
},{"./board.js":5,"./utils.js":10}],8:[function(require,module,exports){
'use strict';

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.NeuralNetwork = undefined;

var _workerRmi = require('worker-rmi');

/**
 * ニューラルネットワークのRMIです。ドキュメントは本体側のコードを参照してください。
 * @alias NeuralNetworkRMI
 * @see NeuralNetwork
 */
class NeuralNetwork extends _workerRmi.WorkerRMI {
  async evaluate(...inputs) {
    const result = await this.invokeRM('evaluate', inputs);
    return result;
  }
}
exports.NeuralNetwork = NeuralNetwork; /**
                                        * @file ニューラルネットワークのRMIです。
                                        */
/*
 * @author 市川雄二
 * @copyright 2018 ICHIKAWA, Yuji (New 3 Rs)
 * @license MIT
 */
},{"worker-rmi":3}],9:[function(require,module,exports){
"use strict";

Object.defineProperty(exports, "__esModule", {
    value: true
});
/**
 * @file 囲碁の連を表すクラスです。
 * このコードはPyaqの移植コードです。
 * @see {@link https://github.com/ymgaq/Pyaq}
 */
/*
 * @author 市川雄二
 * @copyright 2018 ICHIKAWA, Yuji (New 3 Rs)
 * @license MIT
 */

/** 連情報クラス */
class StoneGroup {
    /**
     * 
     * @param {object} boardConstants
     */
    constructor(boardConstants) {
        this.C = boardConstants;
        this.libCnt = this.C.VNULL;
        this.size = this.C.VNULL;
        this.vAtr = this.C.VNULL;
        this.libs = new Set();
    }

    getSize() {
        return this.size;
    }

    getLibCnt() {
        return this.libCnt;
    }

    getVAtr() {
        return this.vAtr;
    }

    clear(stone) {
        this.libCnt = stone ? 0 : this.C.VNULL;
        this.size = stone ? 1 : this.C.VNULL;
        this.vAtr = this.C.VNULL;
        this.libs.clear();
    }

    add(v) {
        if (this.libs.has(v)) {
            return;
        }
        this.libs.add(v);
        this.libCnt += 1;
        this.vAtr = v;
    }

    sub(v) {
        if (!this.libs.has(v)) {
            return;
        }
        this.libs.delete(v);
        this.libCnt -= 1;
    }

    merge(other) {
        this.libs = new Set([...this.libs, ...other.libs]);
        this.libCnt = this.libs.size;
        this.size += other.size;
        if (this.libCnt === 1) {
            self.vAtr = this.libs[0];
        }
    }

    copyTo(dest) {
        dest.libCnt = this.libCnt;
        dest.size = this.size;
        dest.vAtr = this.vAtr;
        dest.libs = new Set(this.libs);
    }
}
exports.StoneGroup = StoneGroup;
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
},{}],11:[function(require,module,exports){
'use strict';

var _workerRmi = require('worker-rmi');

var _azjs_engine = require('./azjs_engine.js');

/**
 * @file ウェブワーカのエントリーポイントです。
 */
/*
 * @author 市川雄二
 * @copyright 2018 ICHIKAWA, Yuji (New 3 Rs)
 * @license MIT
 */
(0, _workerRmi.resigterWorkerRMI)(self, _azjs_engine.AZjsEngine);
},{"./azjs_engine.js":4,"worker-rmi":3}]},{},[11])
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIm5vZGVfbW9kdWxlcy9icm93c2VyLXBhY2svX3ByZWx1ZGUuanMiLCJub2RlX21vZHVsZXMvYnNvbi1vYmplY3RpZC9vYmplY3RpZC5qcyIsIm5vZGVfbW9kdWxlcy9wcm9jZXNzL2Jyb3dzZXIuanMiLCJub2RlX21vZHVsZXMvd29ya2VyLXJtaS93b3JrZXItcm1pLmpzIiwic3JjL2F6anNfZW5naW5lLmpzIiwic3JjL2JvYXJkLmpzIiwic3JjL2JvYXJkX2NvbnN0YW50cy5qcyIsInNyYy9tY3RzLmpzIiwic3JjL25ldXJhbF9uZXR3b3JrX2NsaWVudC5qcyIsInNyYy9zdG9uZV9ncm91cC5qcyIsInNyYy91dGlscy5qcyIsInNyYy93b3JrZXIuanMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7O0FDQUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7Ozs7QUM5TkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUN4TEE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDM0tBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUMzSkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQzNlQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ2hLQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDcGZBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQzNCQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ2xGQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDNUlBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQSIsImZpbGUiOiJnZW5lcmF0ZWQuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlc0NvbnRlbnQiOlsiKGZ1bmN0aW9uKCl7ZnVuY3Rpb24gcihlLG4sdCl7ZnVuY3Rpb24gbyhpLGYpe2lmKCFuW2ldKXtpZighZVtpXSl7dmFyIGM9XCJmdW5jdGlvblwiPT10eXBlb2YgcmVxdWlyZSYmcmVxdWlyZTtpZighZiYmYylyZXR1cm4gYyhpLCEwKTtpZih1KXJldHVybiB1KGksITApO3ZhciBhPW5ldyBFcnJvcihcIkNhbm5vdCBmaW5kIG1vZHVsZSAnXCIraStcIidcIik7dGhyb3cgYS5jb2RlPVwiTU9EVUxFX05PVF9GT1VORFwiLGF9dmFyIHA9bltpXT17ZXhwb3J0czp7fX07ZVtpXVswXS5jYWxsKHAuZXhwb3J0cyxmdW5jdGlvbihyKXt2YXIgbj1lW2ldWzFdW3JdO3JldHVybiBvKG58fHIpfSxwLHAuZXhwb3J0cyxyLGUsbix0KX1yZXR1cm4gbltpXS5leHBvcnRzfWZvcih2YXIgdT1cImZ1bmN0aW9uXCI9PXR5cGVvZiByZXF1aXJlJiZyZXF1aXJlLGk9MDtpPHQubGVuZ3RoO2krKylvKHRbaV0pO3JldHVybiBvfXJldHVybiByfSkoKSIsIlxudmFyIE1BQ0hJTkVfSUQgPSBNYXRoLmZsb29yKE1hdGgucmFuZG9tKCkgKiAweEZGRkZGRik7XG52YXIgaW5kZXggPSBPYmplY3RJRC5pbmRleCA9IHBhcnNlSW50KE1hdGgucmFuZG9tKCkgKiAweEZGRkZGRiwgMTApO1xudmFyIHBpZCA9ICh0eXBlb2YgcHJvY2VzcyA9PT0gJ3VuZGVmaW5lZCcgfHwgdHlwZW9mIHByb2Nlc3MucGlkICE9PSAnbnVtYmVyJyA/IE1hdGguZmxvb3IoTWF0aC5yYW5kb20oKSAqIDEwMDAwMCkgOiBwcm9jZXNzLnBpZCkgJSAweEZGRkY7XG5cbi8qKlxuICogRGV0ZXJtaW5lIGlmIGFuIG9iamVjdCBpcyBCdWZmZXJcbiAqXG4gKiBBdXRob3I6ICAgRmVyb3NzIEFib3VraGFkaWplaCA8ZmVyb3NzQGZlcm9zcy5vcmc+IDxodHRwOi8vZmVyb3NzLm9yZz5cbiAqIExpY2Vuc2U6ICBNSVRcbiAqXG4gKi9cbnZhciBpc0J1ZmZlciA9IGZ1bmN0aW9uIChvYmopIHtcbiAgcmV0dXJuICEhKFxuICBvYmogIT0gbnVsbCAmJlxuICBvYmouY29uc3RydWN0b3IgJiZcbiAgdHlwZW9mIG9iai5jb25zdHJ1Y3Rvci5pc0J1ZmZlciA9PT0gJ2Z1bmN0aW9uJyAmJlxuICBvYmouY29uc3RydWN0b3IuaXNCdWZmZXIob2JqKVxuICApXG59O1xuXG4vKipcbiAqIENyZWF0ZSBhIG5ldyBpbW11dGFibGUgT2JqZWN0SUQgaW5zdGFuY2VcbiAqXG4gKiBAY2xhc3MgUmVwcmVzZW50cyB0aGUgQlNPTiBPYmplY3RJRCB0eXBlXG4gKiBAcGFyYW0ge1N0cmluZ3xOdW1iZXJ9IGFyZyBDYW4gYmUgYSAyNCBieXRlIGhleCBzdHJpbmcsIDEyIGJ5dGUgYmluYXJ5IHN0cmluZyBvciBhIE51bWJlci5cbiAqIEByZXR1cm4ge09iamVjdH0gaW5zdGFuY2Ugb2YgT2JqZWN0SUQuXG4gKi9cbmZ1bmN0aW9uIE9iamVjdElEKGFyZykge1xuICBpZighKHRoaXMgaW5zdGFuY2VvZiBPYmplY3RJRCkpIHJldHVybiBuZXcgT2JqZWN0SUQoYXJnKTtcbiAgaWYoYXJnICYmICgoYXJnIGluc3RhbmNlb2YgT2JqZWN0SUQpIHx8IGFyZy5fYnNvbnR5cGU9PT1cIk9iamVjdElEXCIpKVxuICAgIHJldHVybiBhcmc7XG5cbiAgdmFyIGJ1ZjtcblxuICBpZihpc0J1ZmZlcihhcmcpIHx8IChBcnJheS5pc0FycmF5KGFyZykgJiYgYXJnLmxlbmd0aD09PTEyKSkge1xuICAgIGJ1ZiA9IEFycmF5LnByb3RvdHlwZS5zbGljZS5jYWxsKGFyZyk7XG4gIH1cbiAgZWxzZSBpZih0eXBlb2YgYXJnID09PSBcInN0cmluZ1wiKSB7XG4gICAgaWYoYXJnLmxlbmd0aCE9PTEyICYmICFPYmplY3RJRC5pc1ZhbGlkKGFyZykpXG4gICAgICB0aHJvdyBuZXcgRXJyb3IoXCJBcmd1bWVudCBwYXNzZWQgaW4gbXVzdCBiZSBhIHNpbmdsZSBTdHJpbmcgb2YgMTIgYnl0ZXMgb3IgYSBzdHJpbmcgb2YgMjQgaGV4IGNoYXJhY3RlcnNcIik7XG5cbiAgICBidWYgPSBidWZmZXIoYXJnKTtcbiAgfVxuICBlbHNlIGlmKC9udW1iZXJ8dW5kZWZpbmVkLy50ZXN0KHR5cGVvZiBhcmcpKSB7XG4gICAgYnVmID0gYnVmZmVyKGdlbmVyYXRlKGFyZykpO1xuICB9XG5cbiAgT2JqZWN0LmRlZmluZVByb3BlcnR5KHRoaXMsIFwiaWRcIiwge1xuICAgIGVudW1lcmFibGU6IHRydWUsXG4gICAgZ2V0OiBmdW5jdGlvbigpIHsgcmV0dXJuIFN0cmluZy5mcm9tQ2hhckNvZGUuYXBwbHkodGhpcywgYnVmKTsgfVxuICB9KTtcbiAgT2JqZWN0LmRlZmluZVByb3BlcnR5KHRoaXMsIFwic3RyXCIsIHtcbiAgICBnZXQ6IGZ1bmN0aW9uKCkgeyByZXR1cm4gYnVmLm1hcChoZXguYmluZCh0aGlzLCAyKSkuam9pbignJyk7IH1cbiAgfSk7XG59XG5tb2R1bGUuZXhwb3J0cyA9IE9iamVjdElEO1xuT2JqZWN0SUQuZ2VuZXJhdGUgPSBnZW5lcmF0ZTtcbk9iamVjdElELmRlZmF1bHQgPSBPYmplY3RJRDtcblxuLyoqXG4gKiBDcmVhdGVzIGFuIE9iamVjdElEIGZyb20gYSBzZWNvbmQgYmFzZWQgbnVtYmVyLCB3aXRoIHRoZSByZXN0IG9mIHRoZSBPYmplY3RJRCB6ZXJvZWQgb3V0LiBVc2VkIGZvciBjb21wYXJpc29ucyBvciBzb3J0aW5nIHRoZSBPYmplY3RJRC5cbiAqXG4gKiBAcGFyYW0ge051bWJlcn0gdGltZSBhbiBpbnRlZ2VyIG51bWJlciByZXByZXNlbnRpbmcgYSBudW1iZXIgb2Ygc2Vjb25kcy5cbiAqIEByZXR1cm4ge09iamVjdElEfSByZXR1cm4gdGhlIGNyZWF0ZWQgT2JqZWN0SURcbiAqIEBhcGkgcHVibGljXG4gKi9cbk9iamVjdElELmNyZWF0ZUZyb21UaW1lID0gZnVuY3Rpb24odGltZSl7XG4gIHRpbWUgPSBwYXJzZUludCh0aW1lLCAxMCkgJSAweEZGRkZGRkZGO1xuICByZXR1cm4gbmV3IE9iamVjdElEKGhleCg4LHRpbWUpK1wiMDAwMDAwMDAwMDAwMDAwMFwiKTtcbn07XG5cbi8qKlxuICogQ3JlYXRlcyBhbiBPYmplY3RJRCBmcm9tIGEgaGV4IHN0cmluZyByZXByZXNlbnRhdGlvbiBvZiBhbiBPYmplY3RJRC5cbiAqXG4gKiBAcGFyYW0ge1N0cmluZ30gaGV4U3RyaW5nIGNyZWF0ZSBhIE9iamVjdElEIGZyb20gYSBwYXNzZWQgaW4gMjQgYnl0ZSBoZXhzdHJpbmcuXG4gKiBAcmV0dXJuIHtPYmplY3RJRH0gcmV0dXJuIHRoZSBjcmVhdGVkIE9iamVjdElEXG4gKiBAYXBpIHB1YmxpY1xuICovXG5PYmplY3RJRC5jcmVhdGVGcm9tSGV4U3RyaW5nID0gZnVuY3Rpb24oaGV4U3RyaW5nKSB7XG4gIGlmKCFPYmplY3RJRC5pc1ZhbGlkKGhleFN0cmluZykpXG4gICAgdGhyb3cgbmV3IEVycm9yKFwiSW52YWxpZCBPYmplY3RJRCBoZXggc3RyaW5nXCIpO1xuXG4gIHJldHVybiBuZXcgT2JqZWN0SUQoaGV4U3RyaW5nKTtcbn07XG5cbi8qKlxuICogQ2hlY2tzIGlmIGEgdmFsdWUgaXMgYSB2YWxpZCBic29uIE9iamVjdElkXG4gKlxuICogQHBhcmFtIHtTdHJpbmd9IG9iamVjdGlkIENhbiBiZSBhIDI0IGJ5dGUgaGV4IHN0cmluZyBvciBhbiBpbnN0YW5jZSBvZiBPYmplY3RJRC5cbiAqIEByZXR1cm4ge0Jvb2xlYW59IHJldHVybiB0cnVlIGlmIHRoZSB2YWx1ZSBpcyBhIHZhbGlkIGJzb24gT2JqZWN0SUQsIHJldHVybiBmYWxzZSBvdGhlcndpc2UuXG4gKiBAYXBpIHB1YmxpY1xuICpcbiAqIFRIRSBOQVRJVkUgRE9DVU1FTlRBVElPTiBJU04nVCBDTEVBUiBPTiBUSElTIEdVWSFcbiAqIGh0dHA6Ly9tb25nb2RiLmdpdGh1Yi5pby9ub2RlLW1vbmdvZGItbmF0aXZlL2FwaS1ic29uLWdlbmVyYXRlZC9vYmplY3RpZC5odG1sI29iamVjdGlkLWlzdmFsaWRcbiAqL1xuT2JqZWN0SUQuaXNWYWxpZCA9IGZ1bmN0aW9uKG9iamVjdGlkKSB7XG4gIGlmKCFvYmplY3RpZCkgcmV0dXJuIGZhbHNlO1xuXG4gIC8vY2FsbCAudG9TdHJpbmcoKSB0byBnZXQgdGhlIGhleCBpZiB3ZSdyZVxuICAvLyB3b3JraW5nIHdpdGggYW4gaW5zdGFuY2Ugb2YgT2JqZWN0SURcbiAgcmV0dXJuIC9eWzAtOUEtRl17MjR9JC9pLnRlc3Qob2JqZWN0aWQudG9TdHJpbmcoKSk7XG59O1xuXG4vKipcbiAqIHNldCBhIGN1c3RvbSBtYWNoaW5lSURcbiAqIFxuICogQHBhcmFtIHtTdHJpbmd8TnVtYmVyfSBtYWNoaW5laWQgQ2FuIGJlIGEgc3RyaW5nLCBoZXgtc3RyaW5nIG9yIGEgbnVtYmVyXG4gKiBAcmV0dXJuIHt2b2lkfVxuICogQGFwaSBwdWJsaWNcbiAqL1xuT2JqZWN0SUQuc2V0TWFjaGluZUlEID0gZnVuY3Rpb24oYXJnKSB7XG4gIHZhciBtYWNoaW5lSUQ7XG5cbiAgaWYodHlwZW9mIGFyZyA9PT0gXCJzdHJpbmdcIikge1xuICAgIC8vIGhleCBzdHJpbmdcbiAgICBtYWNoaW5lSUQgPSBwYXJzZUludChhcmcsIDE2KTtcbiAgIFxuICAgIC8vIGFueSBzdHJpbmdcbiAgICBpZihpc05hTihtYWNoaW5lSUQpKSB7XG4gICAgICBhcmcgPSAoJzAwMDAwMCcgKyBhcmcpLnN1YnN0cigtNyw2KTtcblxuICAgICAgbWFjaGluZUlEID0gXCJcIjtcbiAgICAgIGZvcih2YXIgaSA9IDA7aTw2OyBpKyspIHtcbiAgICAgICAgbWFjaGluZUlEICs9IChhcmcuY2hhckNvZGVBdChpKSk7XG4gICAgICB9XG4gICAgfVxuICB9XG4gIGVsc2UgaWYoL251bWJlcnx1bmRlZmluZWQvLnRlc3QodHlwZW9mIGFyZykpIHtcbiAgICBtYWNoaW5lSUQgPSBhcmcgfCAwO1xuICB9XG5cbiAgTUFDSElORV9JRCA9IChtYWNoaW5lSUQgJiAweEZGRkZGRik7XG59XG5cbi8qKlxuICogZ2V0IHRoZSBtYWNoaW5lSURcbiAqIFxuICogQHJldHVybiB7bnVtYmVyfVxuICogQGFwaSBwdWJsaWNcbiAqL1xuT2JqZWN0SUQuZ2V0TWFjaGluZUlEID0gZnVuY3Rpb24oKSB7XG4gIHJldHVybiBNQUNISU5FX0lEO1xufVxuXG5PYmplY3RJRC5wcm90b3R5cGUgPSB7XG4gIF9ic29udHlwZTogJ09iamVjdElEJyxcbiAgY29uc3RydWN0b3I6IE9iamVjdElELFxuXG4gIC8qKlxuICAgKiBSZXR1cm4gdGhlIE9iamVjdElEIGlkIGFzIGEgMjQgYnl0ZSBoZXggc3RyaW5nIHJlcHJlc2VudGF0aW9uXG4gICAqXG4gICAqIEByZXR1cm4ge1N0cmluZ30gcmV0dXJuIHRoZSAyNCBieXRlIGhleCBzdHJpbmcgcmVwcmVzZW50YXRpb24uXG4gICAqIEBhcGkgcHVibGljXG4gICAqL1xuICB0b0hleFN0cmluZzogZnVuY3Rpb24oKSB7XG4gICAgcmV0dXJuIHRoaXMuc3RyO1xuICB9LFxuXG4gIC8qKlxuICAgKiBDb21wYXJlcyB0aGUgZXF1YWxpdHkgb2YgdGhpcyBPYmplY3RJRCB3aXRoIGBvdGhlcklEYC5cbiAgICpcbiAgICogQHBhcmFtIHtPYmplY3R9IG90aGVyIE9iamVjdElEIGluc3RhbmNlIHRvIGNvbXBhcmUgYWdhaW5zdC5cbiAgICogQHJldHVybiB7Qm9vbGVhbn0gdGhlIHJlc3VsdCBvZiBjb21wYXJpbmcgdHdvIE9iamVjdElEJ3NcbiAgICogQGFwaSBwdWJsaWNcbiAgICovXG4gIGVxdWFsczogZnVuY3Rpb24gKG90aGVyKXtcbiAgICByZXR1cm4gISFvdGhlciAmJiB0aGlzLnN0ciA9PT0gb3RoZXIudG9TdHJpbmcoKTtcbiAgfSxcblxuICAvKipcbiAgICogUmV0dXJucyB0aGUgZ2VuZXJhdGlvbiBkYXRlIChhY2N1cmF0ZSB1cCB0byB0aGUgc2Vjb25kKSB0aGF0IHRoaXMgSUQgd2FzIGdlbmVyYXRlZC5cbiAgICpcbiAgICogQHJldHVybiB7RGF0ZX0gdGhlIGdlbmVyYXRpb24gZGF0ZVxuICAgKiBAYXBpIHB1YmxpY1xuICAgKi9cbiAgZ2V0VGltZXN0YW1wOiBmdW5jdGlvbigpe1xuICAgIHJldHVybiBuZXcgRGF0ZShwYXJzZUludCh0aGlzLnN0ci5zdWJzdHIoMCw4KSwgMTYpICogMTAwMCk7XG4gIH1cbn07XG5cbmZ1bmN0aW9uIG5leHQoKSB7XG4gIHJldHVybiBpbmRleCA9IChpbmRleCsxKSAlIDB4RkZGRkZGO1xufVxuXG5mdW5jdGlvbiBnZW5lcmF0ZSh0aW1lKSB7XG4gIGlmICh0eXBlb2YgdGltZSAhPT0gJ251bWJlcicpXG4gICAgdGltZSA9IERhdGUubm93KCkvMTAwMDtcblxuICAvL2tlZXAgaXQgaW4gdGhlIHJpbmchXG4gIHRpbWUgPSBwYXJzZUludCh0aW1lLCAxMCkgJSAweEZGRkZGRkZGO1xuXG4gIC8vRkZGRkZGRkYgRkZGRkZGIEZGRkYgRkZGRkZGXG4gIHJldHVybiBoZXgoOCx0aW1lKSArIGhleCg2LE1BQ0hJTkVfSUQpICsgaGV4KDQscGlkKSArIGhleCg2LG5leHQoKSk7XG59XG5cbmZ1bmN0aW9uIGhleChsZW5ndGgsIG4pIHtcbiAgbiA9IG4udG9TdHJpbmcoMTYpO1xuICByZXR1cm4gKG4ubGVuZ3RoPT09bGVuZ3RoKT8gbiA6IFwiMDAwMDAwMDBcIi5zdWJzdHJpbmcobi5sZW5ndGgsIGxlbmd0aCkgKyBuO1xufVxuXG5mdW5jdGlvbiBidWZmZXIoc3RyKSB7XG4gIHZhciBpPTAsb3V0PVtdO1xuXG4gIGlmKHN0ci5sZW5ndGg9PT0yNClcbiAgICBmb3IoO2k8MjQ7IG91dC5wdXNoKHBhcnNlSW50KHN0cltpXStzdHJbaSsxXSwgMTYpKSxpKz0yKTtcblxuICBlbHNlIGlmKHN0ci5sZW5ndGg9PT0xMilcbiAgICBmb3IoO2k8MTI7IG91dC5wdXNoKHN0ci5jaGFyQ29kZUF0KGkpKSxpKyspO1xuXG4gIHJldHVybiBvdXQ7XG59XG5cbi8qKlxuICogQ29udmVydHMgdG8gYSBzdHJpbmcgcmVwcmVzZW50YXRpb24gb2YgdGhpcyBJZC5cbiAqXG4gKiBAcmV0dXJuIHtTdHJpbmd9IHJldHVybiB0aGUgMjQgYnl0ZSBoZXggc3RyaW5nIHJlcHJlc2VudGF0aW9uLlxuICogQGFwaSBwcml2YXRlXG4gKi9cbk9iamVjdElELnByb3RvdHlwZS5pbnNwZWN0ID0gZnVuY3Rpb24oKSB7IHJldHVybiBcIk9iamVjdElEKFwiK3RoaXMrXCIpXCIgfTtcbk9iamVjdElELnByb3RvdHlwZS50b0pTT04gPSBPYmplY3RJRC5wcm90b3R5cGUudG9IZXhTdHJpbmc7XG5PYmplY3RJRC5wcm90b3R5cGUudG9TdHJpbmcgPSBPYmplY3RJRC5wcm90b3R5cGUudG9IZXhTdHJpbmc7XG4iLCIvLyBzaGltIGZvciB1c2luZyBwcm9jZXNzIGluIGJyb3dzZXJcbnZhciBwcm9jZXNzID0gbW9kdWxlLmV4cG9ydHMgPSB7fTtcblxuLy8gY2FjaGVkIGZyb20gd2hhdGV2ZXIgZ2xvYmFsIGlzIHByZXNlbnQgc28gdGhhdCB0ZXN0IHJ1bm5lcnMgdGhhdCBzdHViIGl0XG4vLyBkb24ndCBicmVhayB0aGluZ3MuICBCdXQgd2UgbmVlZCB0byB3cmFwIGl0IGluIGEgdHJ5IGNhdGNoIGluIGNhc2UgaXQgaXNcbi8vIHdyYXBwZWQgaW4gc3RyaWN0IG1vZGUgY29kZSB3aGljaCBkb2Vzbid0IGRlZmluZSBhbnkgZ2xvYmFscy4gIEl0J3MgaW5zaWRlIGFcbi8vIGZ1bmN0aW9uIGJlY2F1c2UgdHJ5L2NhdGNoZXMgZGVvcHRpbWl6ZSBpbiBjZXJ0YWluIGVuZ2luZXMuXG5cbnZhciBjYWNoZWRTZXRUaW1lb3V0O1xudmFyIGNhY2hlZENsZWFyVGltZW91dDtcblxuZnVuY3Rpb24gZGVmYXVsdFNldFRpbW91dCgpIHtcbiAgICB0aHJvdyBuZXcgRXJyb3IoJ3NldFRpbWVvdXQgaGFzIG5vdCBiZWVuIGRlZmluZWQnKTtcbn1cbmZ1bmN0aW9uIGRlZmF1bHRDbGVhclRpbWVvdXQgKCkge1xuICAgIHRocm93IG5ldyBFcnJvcignY2xlYXJUaW1lb3V0IGhhcyBub3QgYmVlbiBkZWZpbmVkJyk7XG59XG4oZnVuY3Rpb24gKCkge1xuICAgIHRyeSB7XG4gICAgICAgIGlmICh0eXBlb2Ygc2V0VGltZW91dCA9PT0gJ2Z1bmN0aW9uJykge1xuICAgICAgICAgICAgY2FjaGVkU2V0VGltZW91dCA9IHNldFRpbWVvdXQ7XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICBjYWNoZWRTZXRUaW1lb3V0ID0gZGVmYXVsdFNldFRpbW91dDtcbiAgICAgICAgfVxuICAgIH0gY2F0Y2ggKGUpIHtcbiAgICAgICAgY2FjaGVkU2V0VGltZW91dCA9IGRlZmF1bHRTZXRUaW1vdXQ7XG4gICAgfVxuICAgIHRyeSB7XG4gICAgICAgIGlmICh0eXBlb2YgY2xlYXJUaW1lb3V0ID09PSAnZnVuY3Rpb24nKSB7XG4gICAgICAgICAgICBjYWNoZWRDbGVhclRpbWVvdXQgPSBjbGVhclRpbWVvdXQ7XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICBjYWNoZWRDbGVhclRpbWVvdXQgPSBkZWZhdWx0Q2xlYXJUaW1lb3V0O1xuICAgICAgICB9XG4gICAgfSBjYXRjaCAoZSkge1xuICAgICAgICBjYWNoZWRDbGVhclRpbWVvdXQgPSBkZWZhdWx0Q2xlYXJUaW1lb3V0O1xuICAgIH1cbn0gKCkpXG5mdW5jdGlvbiBydW5UaW1lb3V0KGZ1bikge1xuICAgIGlmIChjYWNoZWRTZXRUaW1lb3V0ID09PSBzZXRUaW1lb3V0KSB7XG4gICAgICAgIC8vbm9ybWFsIGVudmlyb21lbnRzIGluIHNhbmUgc2l0dWF0aW9uc1xuICAgICAgICByZXR1cm4gc2V0VGltZW91dChmdW4sIDApO1xuICAgIH1cbiAgICAvLyBpZiBzZXRUaW1lb3V0IHdhc24ndCBhdmFpbGFibGUgYnV0IHdhcyBsYXR0ZXIgZGVmaW5lZFxuICAgIGlmICgoY2FjaGVkU2V0VGltZW91dCA9PT0gZGVmYXVsdFNldFRpbW91dCB8fCAhY2FjaGVkU2V0VGltZW91dCkgJiYgc2V0VGltZW91dCkge1xuICAgICAgICBjYWNoZWRTZXRUaW1lb3V0ID0gc2V0VGltZW91dDtcbiAgICAgICAgcmV0dXJuIHNldFRpbWVvdXQoZnVuLCAwKTtcbiAgICB9XG4gICAgdHJ5IHtcbiAgICAgICAgLy8gd2hlbiB3aGVuIHNvbWVib2R5IGhhcyBzY3Jld2VkIHdpdGggc2V0VGltZW91dCBidXQgbm8gSS5FLiBtYWRkbmVzc1xuICAgICAgICByZXR1cm4gY2FjaGVkU2V0VGltZW91dChmdW4sIDApO1xuICAgIH0gY2F0Y2goZSl7XG4gICAgICAgIHRyeSB7XG4gICAgICAgICAgICAvLyBXaGVuIHdlIGFyZSBpbiBJLkUuIGJ1dCB0aGUgc2NyaXB0IGhhcyBiZWVuIGV2YWxlZCBzbyBJLkUuIGRvZXNuJ3QgdHJ1c3QgdGhlIGdsb2JhbCBvYmplY3Qgd2hlbiBjYWxsZWQgbm9ybWFsbHlcbiAgICAgICAgICAgIHJldHVybiBjYWNoZWRTZXRUaW1lb3V0LmNhbGwobnVsbCwgZnVuLCAwKTtcbiAgICAgICAgfSBjYXRjaChlKXtcbiAgICAgICAgICAgIC8vIHNhbWUgYXMgYWJvdmUgYnV0IHdoZW4gaXQncyBhIHZlcnNpb24gb2YgSS5FLiB0aGF0IG11c3QgaGF2ZSB0aGUgZ2xvYmFsIG9iamVjdCBmb3IgJ3RoaXMnLCBob3BmdWxseSBvdXIgY29udGV4dCBjb3JyZWN0IG90aGVyd2lzZSBpdCB3aWxsIHRocm93IGEgZ2xvYmFsIGVycm9yXG4gICAgICAgICAgICByZXR1cm4gY2FjaGVkU2V0VGltZW91dC5jYWxsKHRoaXMsIGZ1biwgMCk7XG4gICAgICAgIH1cbiAgICB9XG5cblxufVxuZnVuY3Rpb24gcnVuQ2xlYXJUaW1lb3V0KG1hcmtlcikge1xuICAgIGlmIChjYWNoZWRDbGVhclRpbWVvdXQgPT09IGNsZWFyVGltZW91dCkge1xuICAgICAgICAvL25vcm1hbCBlbnZpcm9tZW50cyBpbiBzYW5lIHNpdHVhdGlvbnNcbiAgICAgICAgcmV0dXJuIGNsZWFyVGltZW91dChtYXJrZXIpO1xuICAgIH1cbiAgICAvLyBpZiBjbGVhclRpbWVvdXQgd2Fzbid0IGF2YWlsYWJsZSBidXQgd2FzIGxhdHRlciBkZWZpbmVkXG4gICAgaWYgKChjYWNoZWRDbGVhclRpbWVvdXQgPT09IGRlZmF1bHRDbGVhclRpbWVvdXQgfHwgIWNhY2hlZENsZWFyVGltZW91dCkgJiYgY2xlYXJUaW1lb3V0KSB7XG4gICAgICAgIGNhY2hlZENsZWFyVGltZW91dCA9IGNsZWFyVGltZW91dDtcbiAgICAgICAgcmV0dXJuIGNsZWFyVGltZW91dChtYXJrZXIpO1xuICAgIH1cbiAgICB0cnkge1xuICAgICAgICAvLyB3aGVuIHdoZW4gc29tZWJvZHkgaGFzIHNjcmV3ZWQgd2l0aCBzZXRUaW1lb3V0IGJ1dCBubyBJLkUuIG1hZGRuZXNzXG4gICAgICAgIHJldHVybiBjYWNoZWRDbGVhclRpbWVvdXQobWFya2VyKTtcbiAgICB9IGNhdGNoIChlKXtcbiAgICAgICAgdHJ5IHtcbiAgICAgICAgICAgIC8vIFdoZW4gd2UgYXJlIGluIEkuRS4gYnV0IHRoZSBzY3JpcHQgaGFzIGJlZW4gZXZhbGVkIHNvIEkuRS4gZG9lc24ndCAgdHJ1c3QgdGhlIGdsb2JhbCBvYmplY3Qgd2hlbiBjYWxsZWQgbm9ybWFsbHlcbiAgICAgICAgICAgIHJldHVybiBjYWNoZWRDbGVhclRpbWVvdXQuY2FsbChudWxsLCBtYXJrZXIpO1xuICAgICAgICB9IGNhdGNoIChlKXtcbiAgICAgICAgICAgIC8vIHNhbWUgYXMgYWJvdmUgYnV0IHdoZW4gaXQncyBhIHZlcnNpb24gb2YgSS5FLiB0aGF0IG11c3QgaGF2ZSB0aGUgZ2xvYmFsIG9iamVjdCBmb3IgJ3RoaXMnLCBob3BmdWxseSBvdXIgY29udGV4dCBjb3JyZWN0IG90aGVyd2lzZSBpdCB3aWxsIHRocm93IGEgZ2xvYmFsIGVycm9yLlxuICAgICAgICAgICAgLy8gU29tZSB2ZXJzaW9ucyBvZiBJLkUuIGhhdmUgZGlmZmVyZW50IHJ1bGVzIGZvciBjbGVhclRpbWVvdXQgdnMgc2V0VGltZW91dFxuICAgICAgICAgICAgcmV0dXJuIGNhY2hlZENsZWFyVGltZW91dC5jYWxsKHRoaXMsIG1hcmtlcik7XG4gICAgICAgIH1cbiAgICB9XG5cblxuXG59XG52YXIgcXVldWUgPSBbXTtcbnZhciBkcmFpbmluZyA9IGZhbHNlO1xudmFyIGN1cnJlbnRRdWV1ZTtcbnZhciBxdWV1ZUluZGV4ID0gLTE7XG5cbmZ1bmN0aW9uIGNsZWFuVXBOZXh0VGljaygpIHtcbiAgICBpZiAoIWRyYWluaW5nIHx8ICFjdXJyZW50UXVldWUpIHtcbiAgICAgICAgcmV0dXJuO1xuICAgIH1cbiAgICBkcmFpbmluZyA9IGZhbHNlO1xuICAgIGlmIChjdXJyZW50UXVldWUubGVuZ3RoKSB7XG4gICAgICAgIHF1ZXVlID0gY3VycmVudFF1ZXVlLmNvbmNhdChxdWV1ZSk7XG4gICAgfSBlbHNlIHtcbiAgICAgICAgcXVldWVJbmRleCA9IC0xO1xuICAgIH1cbiAgICBpZiAocXVldWUubGVuZ3RoKSB7XG4gICAgICAgIGRyYWluUXVldWUoKTtcbiAgICB9XG59XG5cbmZ1bmN0aW9uIGRyYWluUXVldWUoKSB7XG4gICAgaWYgKGRyYWluaW5nKSB7XG4gICAgICAgIHJldHVybjtcbiAgICB9XG4gICAgdmFyIHRpbWVvdXQgPSBydW5UaW1lb3V0KGNsZWFuVXBOZXh0VGljayk7XG4gICAgZHJhaW5pbmcgPSB0cnVlO1xuXG4gICAgdmFyIGxlbiA9IHF1ZXVlLmxlbmd0aDtcbiAgICB3aGlsZShsZW4pIHtcbiAgICAgICAgY3VycmVudFF1ZXVlID0gcXVldWU7XG4gICAgICAgIHF1ZXVlID0gW107XG4gICAgICAgIHdoaWxlICgrK3F1ZXVlSW5kZXggPCBsZW4pIHtcbiAgICAgICAgICAgIGlmIChjdXJyZW50UXVldWUpIHtcbiAgICAgICAgICAgICAgICBjdXJyZW50UXVldWVbcXVldWVJbmRleF0ucnVuKCk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgICAgcXVldWVJbmRleCA9IC0xO1xuICAgICAgICBsZW4gPSBxdWV1ZS5sZW5ndGg7XG4gICAgfVxuICAgIGN1cnJlbnRRdWV1ZSA9IG51bGw7XG4gICAgZHJhaW5pbmcgPSBmYWxzZTtcbiAgICBydW5DbGVhclRpbWVvdXQodGltZW91dCk7XG59XG5cbnByb2Nlc3MubmV4dFRpY2sgPSBmdW5jdGlvbiAoZnVuKSB7XG4gICAgdmFyIGFyZ3MgPSBuZXcgQXJyYXkoYXJndW1lbnRzLmxlbmd0aCAtIDEpO1xuICAgIGlmIChhcmd1bWVudHMubGVuZ3RoID4gMSkge1xuICAgICAgICBmb3IgKHZhciBpID0gMTsgaSA8IGFyZ3VtZW50cy5sZW5ndGg7IGkrKykge1xuICAgICAgICAgICAgYXJnc1tpIC0gMV0gPSBhcmd1bWVudHNbaV07XG4gICAgICAgIH1cbiAgICB9XG4gICAgcXVldWUucHVzaChuZXcgSXRlbShmdW4sIGFyZ3MpKTtcbiAgICBpZiAocXVldWUubGVuZ3RoID09PSAxICYmICFkcmFpbmluZykge1xuICAgICAgICBydW5UaW1lb3V0KGRyYWluUXVldWUpO1xuICAgIH1cbn07XG5cbi8vIHY4IGxpa2VzIHByZWRpY3RpYmxlIG9iamVjdHNcbmZ1bmN0aW9uIEl0ZW0oZnVuLCBhcnJheSkge1xuICAgIHRoaXMuZnVuID0gZnVuO1xuICAgIHRoaXMuYXJyYXkgPSBhcnJheTtcbn1cbkl0ZW0ucHJvdG90eXBlLnJ1biA9IGZ1bmN0aW9uICgpIHtcbiAgICB0aGlzLmZ1bi5hcHBseShudWxsLCB0aGlzLmFycmF5KTtcbn07XG5wcm9jZXNzLnRpdGxlID0gJ2Jyb3dzZXInO1xucHJvY2Vzcy5icm93c2VyID0gdHJ1ZTtcbnByb2Nlc3MuZW52ID0ge307XG5wcm9jZXNzLmFyZ3YgPSBbXTtcbnByb2Nlc3MudmVyc2lvbiA9ICcnOyAvLyBlbXB0eSBzdHJpbmcgdG8gYXZvaWQgcmVnZXhwIGlzc3Vlc1xucHJvY2Vzcy52ZXJzaW9ucyA9IHt9O1xuXG5mdW5jdGlvbiBub29wKCkge31cblxucHJvY2Vzcy5vbiA9IG5vb3A7XG5wcm9jZXNzLmFkZExpc3RlbmVyID0gbm9vcDtcbnByb2Nlc3Mub25jZSA9IG5vb3A7XG5wcm9jZXNzLm9mZiA9IG5vb3A7XG5wcm9jZXNzLnJlbW92ZUxpc3RlbmVyID0gbm9vcDtcbnByb2Nlc3MucmVtb3ZlQWxsTGlzdGVuZXJzID0gbm9vcDtcbnByb2Nlc3MuZW1pdCA9IG5vb3A7XG5wcm9jZXNzLnByZXBlbmRMaXN0ZW5lciA9IG5vb3A7XG5wcm9jZXNzLnByZXBlbmRPbmNlTGlzdGVuZXIgPSBub29wO1xuXG5wcm9jZXNzLmxpc3RlbmVycyA9IGZ1bmN0aW9uIChuYW1lKSB7IHJldHVybiBbXSB9XG5cbnByb2Nlc3MuYmluZGluZyA9IGZ1bmN0aW9uIChuYW1lKSB7XG4gICAgdGhyb3cgbmV3IEVycm9yKCdwcm9jZXNzLmJpbmRpbmcgaXMgbm90IHN1cHBvcnRlZCcpO1xufTtcblxucHJvY2Vzcy5jd2QgPSBmdW5jdGlvbiAoKSB7IHJldHVybiAnLycgfTtcbnByb2Nlc3MuY2hkaXIgPSBmdW5jdGlvbiAoZGlyKSB7XG4gICAgdGhyb3cgbmV3IEVycm9yKCdwcm9jZXNzLmNoZGlyIGlzIG5vdCBzdXBwb3J0ZWQnKTtcbn07XG5wcm9jZXNzLnVtYXNrID0gZnVuY3Rpb24oKSB7IHJldHVybiAwOyB9O1xuIiwiLyogZ2xvYmFsIGV4cG9ydHMgKi9cbi8qKlxuICogQGZpbGVvdmVydmlldyBhIHRpbnkgbGlicmFyeSBmb3IgV2ViIFdvcmtlciBSZW1vdGUgTWV0aG9kIEludm9jYXRpb25cbiAqXG4gKi9cbmNvbnN0IE9iamVjdElEID0gcmVxdWlyZSgnYnNvbi1vYmplY3RpZCcpO1xuXG4vKipcbiAqIEBwcml2YXRlIHJldHVybnMgYSBsaXN0IG9mIFRyYW5zZmVyYWJsZSBvYmplY3RzIHdoaWNoIHtAY29kZSBvYmp9IGluY2x1ZGVzXG4gKiBAcGFyYW0ge29iamVjdH0gb2JqIGFueSBvYmplY3RcbiAqIEBwYXJhbSB7QXJyYXl9IGxpc3QgZm9yIGludGVybmFsIHJlY3Vyc2lvbiBvbmx5XG4gKiBAcmV0dXJuIHtMaXN0fSBhIGxpc3Qgb2YgVHJhbnNmZXJhYmxlIG9iamVjdHNcbiAqL1xuZnVuY3Rpb24gZ2V0VHJhbnNmZXJMaXN0KG9iaiwgbGlzdCA9IFtdKSB7XG4gICAgaWYgKEFycmF5QnVmZmVyLmlzVmlldyhvYmopKSB7XG4gICAgICAgIGxpc3QucHVzaChvYmouYnVmZmVyKTtcbiAgICAgICAgcmV0dXJuIGxpc3Q7XG4gICAgfVxuICAgIGlmIChpc1RyYW5zZmVyYWJsZShvYmopKSB7XG4gICAgICAgIGxpc3QucHVzaChvYmopO1xuICAgICAgICByZXR1cm4gbGlzdDtcbiAgICB9XG4gICAgaWYgKCEodHlwZW9mIG9iaiA9PT0gJ29iamVjdCcpKSB7XG4gICAgICAgIHJldHVybiBsaXN0O1xuICAgIH1cbiAgICBmb3IgKGNvbnN0IHByb3AgaW4gb2JqKSB7XG4gICAgICAgIGlmIChvYmouaGFzT3duUHJvcGVydHkocHJvcCkpIHtcbiAgICAgICAgICAgIGdldFRyYW5zZmVyTGlzdChvYmpbcHJvcF0sIGxpc3QpO1xuICAgICAgICB9XG4gICAgfVxuICAgIHJldHVybiBsaXN0O1xufVxuXG4vKipcbiAqIEBwcml2YXRlIGNoZWNrcyBpZiB7QGNvZGUgb2JqfSBpcyBUcmFuc2ZlcmFibGUgb3Igbm90LlxuICogQHBhcmFtIHtvYmplY3R9IG9iaiBhbnkgb2JqZWN0XG4gKiBAcmV0dXJuIHtib29sZWFufVxuICovXG5mdW5jdGlvbiBpc1RyYW5zZmVyYWJsZShvYmopIHtcbiAgICBjb25zdCB0cmFuc2ZlcmFibGUgPSBbQXJyYXlCdWZmZXJdO1xuICAgIGlmICh0eXBlb2YgTWVzc2FnZVBvcnQgIT09ICd1bmRlZmluZWQnKSB7XG4gICAgICAgIHRyYW5zZmVyYWJsZS5wdXNoKE1lc3NhZ2VQb3J0KTtcbiAgICB9XG4gICAgaWYgKHR5cGVvZiBJbWFnZUJpdG1hcCAhPT0gJ3VuZGVmaW5lZCcpIHtcbiAgICAgICAgdHJhbnNmZXJhYmxlLnB1c2goSW1hZ2VCaXRtYXApO1xuICAgIH1cbiAgICByZXR1cm4gdHJhbnNmZXJhYmxlLnNvbWUoZSA9PiBvYmogaW5zdGFuY2VvZiBlKTtcbn1cblxuLyoqXG4gKiBAY2xhc3MgYmFzZSBjbGFzcyB3aG9zZSBjaGlsZCBjbGFzc2VzIHVzZSBSTUlcbiAqL1xuY2xhc3MgV29ya2VyUk1JIHtcbiAgICAvKipcbiAgICAgKiBAY29uc3RydWN0b3JcbiAgICAgKiBAcGFyYW0ge29iamVjdH0gcmVtb3RlIGFuIGluc3RhbmNlIHRvIGNhbGwgcG9zdE1lc3NhZ2UgbWV0aG9kXG4gICAgICogQHBhcmFtIHtBcnJheX0gYXJncyBhcmd1bWVudHMgdG8gYmUgcGFzc2VkIHRvIHNlcnZlci1zaWRlIGluc3RhbmNlXG4gICAgICovXG4gICAgY29uc3RydWN0b3IocmVtb3RlLCAuLi5hcmdzKSB7XG4gICAgICAgIHRoaXMucmVtb3RlID0gcmVtb3RlO1xuICAgICAgICB0aGlzLmlkID0gT2JqZWN0SUQoKS50b1N0cmluZygpO1xuICAgICAgICB0aGlzLm1ldGhvZFN0YXRlcyA9IHt9O1xuICAgICAgICB0aGlzLnJlbW90ZS5hZGRFdmVudExpc3RlbmVyKCdtZXNzYWdlJywgZXZlbnQgPT4ge1xuICAgICAgICAgICAgY29uc3QgZGF0YSA9IGV2ZW50LmRhdGE7XG4gICAgICAgICAgICBpZiAoZGF0YS5pZCA9PT0gdGhpcy5pZCkge1xuICAgICAgICAgICAgICAgIHRoaXMucmV0dXJuSGFuZGxlcihkYXRhKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfSwgZmFsc2UpO1xuICAgICAgICB0aGlzLmNvbnN0cnVjdG9yUHJvbWlzZSA9IHRoaXMuaW52b2tlUk0odGhpcy5jb25zdHJ1Y3Rvci5uYW1lLCBhcmdzKTtcbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBpbnZva2VzIHJlbW90ZSBtZXRob2RcbiAgICAgKiBAcGFyYW0ge3N0cmluZ30gbWV0aG9kTmFtZSBNZXRob2QgbmFtZVxuICAgICAqIEBwYXJhbSB7QXJyYXl9IGFyZ3MgYXJndW1lbnRzIHRvIGJlIHBhc3NlZCB0byBzZXJ2ZXItc2lkZSBpbnN0YW5jZVxuICAgICAqIEByZXR1cm4ge1Byb21pc2V9XG4gICAgICovXG4gICAgaW52b2tlUk0obWV0aG9kTmFtZSwgYXJncyA9IFtdKSB7XG4gICAgICAgIGlmICghdGhpcy5tZXRob2RTdGF0ZXNbbWV0aG9kTmFtZV0pIHtcbiAgICAgICAgICAgIHRoaXMubWV0aG9kU3RhdGVzW21ldGhvZE5hbWVdID0ge1xuICAgICAgICAgICAgICAgIG51bTogMCxcbiAgICAgICAgICAgICAgICByZXNvbHZlUmVqZWN0czoge31cbiAgICAgICAgICAgIH07XG4gICAgICAgIH1cbiAgICAgICAgcmV0dXJuIG5ldyBQcm9taXNlKChyZXNvbHZlLCByZWplY3QpID0+IHtcbiAgICAgICAgICAgIGNvbnN0IG1ldGhvZFN0YXRlID0gdGhpcy5tZXRob2RTdGF0ZXNbbWV0aG9kTmFtZV07XG4gICAgICAgICAgICBtZXRob2RTdGF0ZS5udW0gKz0gMTtcbiAgICAgICAgICAgIG1ldGhvZFN0YXRlLnJlc29sdmVSZWplY3RzW21ldGhvZFN0YXRlLm51bV0gPSB7IHJlc29sdmUsIHJlamVjdCB9O1xuICAgICAgICAgICAgdGhpcy5yZW1vdGUucG9zdE1lc3NhZ2Uoe1xuICAgICAgICAgICAgICAgIGlkOiB0aGlzLmlkLFxuICAgICAgICAgICAgICAgIG1ldGhvZE5hbWUsXG4gICAgICAgICAgICAgICAgbnVtOiBtZXRob2RTdGF0ZS5udW0sXG4gICAgICAgICAgICAgICAgYXJnc1xuICAgICAgICAgICAgfSwgZ2V0VHJhbnNmZXJMaXN0KGFyZ3MpKTtcbiAgICAgICAgfSk7XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogQHByaXZhdGUgaGFuZGxlcyBjb3JyZXNwb25kZW50ICdtZXNzYWdlJyBldmVudFxuICAgICAqIEBwYXJhbSB7b2JqfSBkYXRhIGRhdGEgcHJvcGVydHkgb2YgJ21lc3NhZ2UnIGV2ZW50XG4gICAgICovXG4gICAgcmV0dXJuSGFuZGxlcihkYXRhKSB7XG4gICAgICAgIGNvbnN0IHJlc29sdmVSZWplY3RzID0gdGhpcy5tZXRob2RTdGF0ZXNbZGF0YS5tZXRob2ROYW1lXS5yZXNvbHZlUmVqZWN0cztcbiAgICAgICAgaWYgKGRhdGEuZXJyb3IpIHtcbiAgICAgICAgICAgIHJlc29sdmVSZWplY3RzW2RhdGEubnVtXS5yZWplY3QoZGF0YS5lcnJvcik7XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICByZXNvbHZlUmVqZWN0c1tkYXRhLm51bV0ucmVzb2x2ZShkYXRhLnJlc3VsdCk7XG4gICAgICAgIH1cbiAgICAgICAgZGVsZXRlIHJlc29sdmVSZWplY3RzW2RhdGEubnVtXTtcbiAgICB9XG59XG5cblxuLyoqXG4gKiBAcHJpdmF0ZSBleGVjdXRlcyBhIG1ldGhvZCBvbiBzZXJ2ZXIgYW5kIHBvc3QgYSByZXN1bHQgYXMgbWVzc2FnZS5cbiAqIEBwYXJhbSB7b2JqfSBldmVudCAnbWVzc2FnZScgZXZlbnRcbiAqL1xuYXN5bmMgZnVuY3Rpb24gaGFuZGxlV29ya2VyUk1JKGV2ZW50KSB7XG4gICAgY29uc3QgZGF0YSA9IGV2ZW50LmRhdGE7XG4gICAgY29uc3QgbWVzc2FnZSA9IHtcbiAgICAgICAgaWQ6IGRhdGEuaWQsXG4gICAgICAgIG1ldGhvZE5hbWU6IGRhdGEubWV0aG9kTmFtZSxcbiAgICAgICAgbnVtOiBkYXRhLm51bSxcbiAgICB9O1xuICAgIGxldCByZXN1bHQ7XG4gICAgaWYgKGRhdGEubWV0aG9kTmFtZSA9PT0gdGhpcy5uYW1lKSB7XG4gICAgICAgIHRoaXMud29ya2VyUk1JLmluc3RhbmNlc1tkYXRhLmlkXSA9IG5ldyB0aGlzKC4uLmRhdGEuYXJncyk7XG4gICAgICAgIG1lc3NhZ2UucmVzdWx0ID0gbnVsbDtcbiAgICAgICAgdGhpcy53b3JrZXJSTUkudGFyZ2V0LnBvc3RNZXNzYWdlKG1lc3NhZ2UsIGdldFRyYW5zZmVyTGlzdChyZXN1bHQpKTtcbiAgICB9IGVsc2Uge1xuICAgICAgICBjb25zdCBpbnN0YW5jZSA9IHRoaXMud29ya2VyUk1JLmluc3RhbmNlc1tkYXRhLmlkXTtcbiAgICAgICAgaWYgKGluc3RhbmNlKSB7XG4gICAgICAgICAgICB0cnkge1xuICAgICAgICAgICAgICAgIHJlc3VsdCA9IGF3YWl0IGluc3RhbmNlW2RhdGEubWV0aG9kTmFtZV0uYXBwbHkoaW5zdGFuY2UsIGRhdGEuYXJncylcbiAgICAgICAgICAgICAgICBtZXNzYWdlLnJlc3VsdCA9IHJlc3VsdDtcbiAgICAgICAgICAgICAgICB0aGlzLndvcmtlclJNSS50YXJnZXQucG9zdE1lc3NhZ2UobWVzc2FnZSwgZ2V0VHJhbnNmZXJMaXN0KHJlc3VsdCkpO1xuICAgICAgICAgICAgfSBjYXRjaCAoZSkge1xuICAgICAgICAgICAgICAgIG1lc3NhZ2UuZXJyb3IgPSBlLnRvU3RyaW5nKCk7XG4gICAgICAgICAgICAgICAgdGhpcy53b3JrZXJSTUkudGFyZ2V0LnBvc3RNZXNzYWdlKG1lc3NhZ2UpO1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgfVxufVxuXG4vKipcbiAqIHJlZ2lzdGVycyBhIGNsYXNzIGFzIGFuIGV4ZWN1dGVyIG9mIFJNSSBvbiBzZXJ2ZXJcbiAqIEBwYXJhbSB7b2JqfSB0YXJnZXQgYW4gaW5zdGFuY2UgdGhhdCByZWNlaXZlcyAnbWVzc2FnZScgZXZlbnRzIG9mIFJNSVxuICogQHBhcmFtIHtDbGFzc30ga2xhc3MgYSBjbGFzcyB0byBiZSByZWdpc3RlcmVkXG4gKi9cbmZ1bmN0aW9uIHJlc2lndGVyV29ya2VyUk1JKHRhcmdldCwga2xhc3MpIHtcbiAgICBrbGFzcy53b3JrZXJSTUkgPSB7XG4gICAgICAgIHRhcmdldCxcbiAgICAgICAgaW5zdGFuY2VzOiB7fSxcbiAgICAgICAgaGFuZGxlcjogaGFuZGxlV29ya2VyUk1JLmJpbmQoa2xhc3MpXG4gICAgfVxuICAgIHRhcmdldC5hZGRFdmVudExpc3RlbmVyKCdtZXNzYWdlJywga2xhc3Mud29ya2VyUk1JLmhhbmRsZXIpO1xufVxuXG4vKipcbiAqIHVucmVzaWd0ZXJzIGEgY2xhc3MgcmVnaXN0ZXJlZCBieSByZWdpc3RlcldvcmtlclJNSVxuICogQHBhcmFtIHtvYmp9IHRhcmdldCBhbiBpbnN0YW5jZSB0aGF0IHJlY2VpdmVzICdtZXNzYWdlJyBldmVudHMgb2YgUk1JXG4gKiBAcGFyYW0ge0NsYXNzfSBrbGFzcyBhIGNsYXNzIHRvIGJlIHVucmVnaXN0ZXJlZFxuICovXG5mdW5jdGlvbiB1bnJlc2lndGVyV29ya2VyUk1JKHRhcmdldCwga2xhc3MpIHtcbiAgICB0YXJnZXQucmVtb3ZlRXZlbnRMaXN0ZW5lcignbWVzc2FnZScsIGtsYXNzLndvcmtlclJNSS5oYW5kbGVyKVxuICAgIGRlbGV0ZSBrbGFzcy53b3JrZXJSTUk7XG59XG5cbmV4cG9ydHMuV29ya2VyUk1JID0gV29ya2VyUk1JO1xuZXhwb3J0cy5yZXNpZ3RlcldvcmtlclJNSSA9IHJlc2lndGVyV29ya2VyUk1JO1xuZXhwb3J0cy51bnJlc2lndGVyV29ya2VyUk1JID0gdW5yZXNpZ3RlcldvcmtlclJNSTtcbiIsIid1c2Ugc3RyaWN0JztcblxuT2JqZWN0LmRlZmluZVByb3BlcnR5KGV4cG9ydHMsIFwiX19lc01vZHVsZVwiLCB7XG4gICAgdmFsdWU6IHRydWVcbn0pO1xuZXhwb3J0cy5BWmpzRW5naW5lID0gdW5kZWZpbmVkO1xuXG52YXIgX25ldXJhbF9uZXR3b3JrX2NsaWVudCA9IHJlcXVpcmUoJy4vbmV1cmFsX25ldHdvcmtfY2xpZW50LmpzJyk7XG5cbnZhciBfYm9hcmRfY29uc3RhbnRzID0gcmVxdWlyZSgnLi9ib2FyZF9jb25zdGFudHMuanMnKTtcblxudmFyIF9ib2FyZCA9IHJlcXVpcmUoJy4vYm9hcmQuanMnKTtcblxudmFyIF9tY3RzID0gcmVxdWlyZSgnLi9tY3RzLmpzJyk7XG5cbi8qKlxuICog5a++5bGA44KS6KGM44GG5oCd6ICD44Ko44Oz44K444Oz44Kv44Op44K544Gn44GZ44CCXG4gKiDjgqbjgqfjg5bjg6/jg7zjgqvjgafli5XjgYvjgZnjgZPjgajjgpLliY3mj5DjgavjgIHjg6HjgqTjg7Pjgrnjg6zjg4Pjg4njga7jgqLjg5fjg6rjgahOZXVyYWxOZXR3b3Jr44GuMuOBpOOBqOmAmuS/oeOBl+OBquOBjOOCiU1DVFPjgpLlrp/ooYzjgZfjgb7jgZnjgIJcbiAqL1xuLyoqXG4gKiBAZmlsZSDlr77lsYDjgpLooYzjgYbmgJ3ogIPjgqjjg7Pjgrjjg7Pjgq/jg6njgrlBWmpzRW5naW5l44Gu44Kz44O844OJ44Gn44GZ44CCXG4gKiDjgqbjgqfjg5bjg6/jg7zjgqvjgafli5XjgYvjgZnjgZPjgajjgpLliY3mj5DjgavjgIHjg6HjgqTjg7Pjgrnjg6zjg4Pjg4njga7jgqLjg5fjg6rjgahOZXVyYWxOZXR3b3Jr44GuMuOBpOOBqOmAmuS/oeOBl+OBquOBjOOCieODouODs+ODhuOCq+ODq+ODreODhOODquODvOaOoue0ouOCkuWun+ihjOOBl+OBvuOBmeOAglxuICovXG4vKlxuICogQGF1dGhvciDluILlt53pm4TkuoxcbiAqIEBjb3B5cmlnaHQgMjAxOCBJQ0hJS0FXQSwgWXVqaSAoTmV3IDMgUnMpXG4gKiBAbGljZW5zZSBNSVRcbiAqL1xuLy8g44Oh44Kk44Oz44K544Os44OD44OJ44Gn5YuV44GL44GZ5aC05ZCI44CB5Lul5LiL44GuaW1wb3J044KSJy4vbmV1cmFsX25ldHdvcmsuanMn44Gr5aSJ44GI44G+44GZ44CCXG5jbGFzcyBBWmpzRW5naW5lIHtcbiAgICAvKipcbiAgICAgKiBAcGFyYW0ge0ludGVnZXJ9IHNpemUg56KB55uk44K144Kk44K6XG4gICAgICogQHBhcmFtIHtudW1iZXJ9IGtvbWkg44Kz44OfXG4gICAgICovXG4gICAgY29uc3RydWN0b3Ioc2l6ZSA9IDE5LCBrb21pID0gNykge1xuICAgICAgICB0aGlzLmIgPSBuZXcgX2JvYXJkLkJvYXJkKG5ldyBfYm9hcmRfY29uc3RhbnRzLkJvYXJkQ29uc3RhbnRzKHNpemUpLCBrb21pKTtcbiAgICAgICAgdGhpcy5ubiA9IG5ldyBfbmV1cmFsX25ldHdvcmtfY2xpZW50Lk5ldXJhbE5ldHdvcmsoc2VsZik7XG4gICAgICAgIHRoaXMubWN0cyA9IG5ldyBfbWN0cy5NQ1RTKHRoaXMubm4sIHRoaXMuYi5DKTtcbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiDjg4vjg6Xjg7zjg6njg6vjg43jg4Pjg4jjg6/jg7zjgq/jga7jgqbjgqfjgqTjg4jjgpLjg63jg7zjg4njgZfjgb7jgZnjgIJcbiAgICAgKi9cbiAgICBhc3luYyBsb2FkTk4oKSB7XG4gICAgICAgIGxldCBhcmdzO1xuICAgICAgICBzd2l0Y2ggKHRoaXMuYi5DLkJTSVpFKSB7XG4gICAgICAgICAgICBjYXNlIDk6XG4gICAgICAgICAgICAgICAgYXJncyA9IFsnaHR0cHM6Ly9zdG9yYWdlLmdvb2dsZWFwaXMuY29tL21pbWlha2Etc3RvcmFnZS9MZWVsYVplcm85J107XG4gICAgICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgICAgICBjYXNlIDE5OlxuICAgICAgICAgICAgICAgIGFyZ3MgPSBbJ2h0dHBzOi8vc3RvcmFnZS5nb29nbGVhcGlzLmNvbS9taW1pYWthLXN0b3JhZ2UvRUxGX09wZW5HbycsIDJdO1xuICAgICAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICAgICAgZGVmYXVsdDpcbiAgICAgICAgICAgICAgICB0aHJvdyBuZXcgRXJyb3IoJ3NpemUgaXMgbm90IHN1cHBvcnRlZCcpO1xuICAgICAgICB9XG4gICAgICAgIGF3YWl0IHRoaXMubm4uaW52b2tlUk0oJ2xvYWQnLCBhcmdzKTtcbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiDlhoXpg6jnirbmhYvjgpLjgq/jg6rjgqLjgZfjgb7jgZnjgIJcbiAgICAgKiDmlLnjgoHjgabliJ3miYvjgYvjgonlr77lsYDlj6/og73jgavjgarjgorjgb7jgZnjgIJcbiAgICAgKi9cbiAgICBjbGVhcigpIHtcbiAgICAgICAgdGhpcy5iLnJlc2V0KCk7XG4gICAgICAgIHRoaXMubWN0cy5jbGVhcigpO1xuICAgIH1cblxuICAgIC8qKlxuICAgICAqIOaMgeOBoeaZgumWk+OCkuioreWumuOBl+OBvuOBmeOAglxuICAgICAqIEBwYXJhbSB7bnVtYmVyfSBtYWluVGltZSDnp5JcbiAgICAgKiBAcGFyYW0ge251bWJlcn0gYnlveW9taSDnp5JcbiAgICAgKi9cbiAgICB0aW1lU2V0dGluZ3MobWFpblRpbWUsIGJ5b3lvbWkpIHtcbiAgICAgICAgdGhpcy5tY3RzLnNldFRpbWUobWFpblRpbWUsIGJ5b3lvbWkpO1xuICAgIH1cblxuICAgIC8qKlxuICAgICAqIOasoeOBruaJi+OCkui/lOOBl+OBvuOBmeOAgueKtuazgeOBq+W/nOOBmOOBpuaKleS6huOBl+OBvuOBmeOAglxuICAgICAqIOaIu+OCiuWApFt4LCB5XeOBr+W3puS4iuOBjDEt44Kq44Oq44K444Oz44GuMuasoeWFg+W6p+aomeOBp+OBmeOAguOCguOBl+OBj+OBrydyZXNnaW4n44G+44Gf44GvJ3Bhc3Mn44KS6L+U44GX44G+44GZ44CCXG4gICAgICog5YaF6YOo44Gn5L+d5oyB44GX44Gm44GE44KL5bGA6Z2i44KC6YCy44KB44G+44GZ44CCXG4gICAgICogQHJldHVybnMge0ludGVnZXJbXXxzdHJpbmd9XG4gICAgICovXG4gICAgYXN5bmMgZ2VubW92ZSgpIHtcbiAgICAgICAgdHJ5IHtcbiAgICAgICAgICAgIGNvbnN0IFttb3ZlLCB3aW5SYXRlXSA9IGF3YWl0IHRoaXMuc2VhcmNoKCk7XG4gICAgICAgICAgICBpZiAod2luUmF0ZSA8IDAuMDUpIHtcbiAgICAgICAgICAgICAgICByZXR1cm4gJ3Jlc2lnbic7XG4gICAgICAgICAgICB9IGVsc2UgaWYgKG1vdmUgPT09IHRoaXMuYi5DLlBBU1MgfHwgdGhpcy5iLnN0YXRlW21vdmVdID09PSB0aGlzLmIuQy5FTVBUWSkge1xuICAgICAgICAgICAgICAgIHRoaXMuYi5wbGF5KG1vdmUsIHRydWUpO1xuICAgICAgICAgICAgICAgIHJldHVybiBtb3ZlID09PSB0aGlzLmIuQy5QQVNTID8gJ3Bhc3MnIDogdGhpcy5iLkMuZXYyeHkobW92ZSk7XG4gICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgIGNvbnNvbGUubG9nKCdlcnJvcicpO1xuICAgICAgICAgICAgICAgIGNvbnNvbGUubG9nKCclZCglcykgaXMgbm90IGVtcHR5JywgbW92ZSwgdGhpcy5iLkMuZXYyc3RyKG1vdmUpKTtcbiAgICAgICAgICAgICAgICB0aGlzLmIuc2hvd2JvYXJkKCk7XG4gICAgICAgICAgICAgICAgY29uc29sZS5sb2codGhpcy5iLmNhbmRpZGF0ZXMoKSk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH0gY2F0Y2ggKGUpIHtcbiAgICAgICAgICAgIGNvbnNvbGUuZXJyb3IoZSk7XG4gICAgICAgIH1cbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiDmrKHjga7miYvjgpLmiZPjgaPjgabnj77lsYDpnaLjgpLpgLLjgoHjgb7jgZnjgIJcbiAgICAgKiAoeCwgeSnjga/lt6bkuIrjgYwxLeOCquODquOCuOODs+OBrjLmrKHlhYPluqfmqJnjgafjgZnjgIJcbiAgICAgKiBAcGFyYW0ge0ludGVnZXJ9IHggXG4gICAgICogQHBhcmFtIHtJbnRlZ2VyfSB5IFxuICAgICAqL1xuICAgIHBsYXkoeCwgeSkge1xuICAgICAgICB0aGlzLmIucGxheSh0aGlzLmIuQy54eTJldih4LCB5KSk7XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICog5qyh44Gu5omL44KS44OR44K544GX44Gm54++5bGA6Z2i44KS6YCy44KB44G+44GZ44CCXG4gICAgICovXG4gICAgcGFzcygpIHtcbiAgICAgICAgdGhpcy5iLnBsYXkodGhpcy5iLkMuUEFTUyk7XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogQHByaXZhdGVcbiAgICAgKi9cbiAgICBhc3luYyBzZWFyY2goKSB7XG4gICAgICAgIHJldHVybiBhd2FpdCB0aGlzLm1jdHMuc2VhcmNoKHRoaXMuYiwgMC4wLCBmYWxzZSwgZmFsc2UpO1xuICAgIH1cblxuICAgIC8qKlxuICAgICAqIEBwcml2YXRlXG4gICAgICovXG4gICAgZmluYWxTY29yZSgpIHtcbiAgICAgICAgcmV0dXJuIHRoaXMuYi5maW5hbFNjb3JlKCk7XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICog55u45omL44Gu6ICD5oWu5Lit44Gr5o6i57Si44KS57aZ57aa44GX44G+44GZ44CCXG4gICAgICovXG4gICAgYXN5bmMgcG9uZGVyKCkge1xuICAgICAgICByZXR1cm4gYXdhaXQgdGhpcy5tY3RzLnNlYXJjaCh0aGlzLmIsIEluZmluaXR5LCB0cnVlLCBmYWxzZSk7XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICog5o6i57Si44KS5by35Yi257WC5LqG44GV44Gb44G+44GZ44CCXG4gICAgICog5o6i57Si44OE44Oq44O844Gv5pyJ5Yq544Gq44G+44G+44Gn44GZ44CC5Li744Gr44Od44Oz44OA44Oq44Oz44Kw57WC5LqG44Gr5L2/44GE44G+44GZ44CCXG4gICAgICovXG4gICAgc3RvcCgpIHtcbiAgICAgICAgdGhpcy5tY3RzLnN0b3AoKTtcbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiDjg6HjgqTjg7PmmYLplpPjga7mrovjgormmYLplpPjgpLov5TjgZfjgb7jgZnjgIJcbiAgICAgKiBAcmV0dXJucyB7bnVtYmVyfSDmrovjgorjga7np5LmlbBcbiAgICAgKi9cbiAgICB0aW1lTGVmdCgpIHtcbiAgICAgICAgcmV0dXJuIHRoaXMubWN0cy5sZWZ0VGltZTtcbiAgICB9XG59XG5leHBvcnRzLkFaanNFbmdpbmUgPSBBWmpzRW5naW5lOyIsIid1c2Ugc3RyaWN0JztcblxuT2JqZWN0LmRlZmluZVByb3BlcnR5KGV4cG9ydHMsIFwiX19lc01vZHVsZVwiLCB7XG4gICAgdmFsdWU6IHRydWVcbn0pO1xuZXhwb3J0cy5Cb2FyZCA9IHVuZGVmaW5lZDtcblxudmFyIF91dGlscyA9IHJlcXVpcmUoJy4vdXRpbHMuanMnKTtcblxudmFyIF9zdG9uZV9ncm91cCA9IHJlcXVpcmUoJy4vc3RvbmVfZ3JvdXAuanMnKTtcblxuLy8vIOODi+ODpeODvOODqeODq+ODjeODg+ODiOODr+ODvOOCr+OBuOOBruWFpeWKm+OBq+mWouOBmeOCi+WxpeattOOBrua3seOBleOBp+OBmeOAglxuLyoqXG4gKiBAZmlsZSDnooHnm6Tjgq/jg6njgrnjgafjgZnjgIJcbiAqIOOBk+OBruOCs+ODvOODieOBr1B5YXHjga7np7vmpI3jgrPjg7zjg4njgafjgZnjgIJcbiAqIEBzZWUge0BsaW5rIGh0dHBzOi8vZ2l0aHViLmNvbS95bWdhcS9QeWFxfVxuICovXG4vKlxuICogQGF1dGhvciDluILlt53pm4TkuowgXG4gKiBAY29weXJpZ2h0IDIwMTggSUNISUtBV0EsIFl1amkgKE5ldyAzIFJzKVxuICogQGxpY2Vuc2UgTUlUXG4gKi9cbmNvbnN0IEtFRVBfUFJFVl9DTlQgPSA3O1xuXG4vKipcbiAqIOeigeebpOOCr+ODqeOCueOBp+OBmeOAglxuICovXG5jbGFzcyBCb2FyZCB7XG4gICAgLyoqXG4gICAgICogQHBhcmFtIHtCb2FyZENvbnN0YW50c30gY29uc3RhbnRzXG4gICAgICogQHBhcmFtIHtudW1iZXJ9IGtvbWkgXG4gICAgICovXG4gICAgY29uc3RydWN0b3IoY29uc3RhbnRzLCBrb21pID0gNy41KSB7XG4gICAgICAgIHRoaXMuQyA9IGNvbnN0YW50cztcbiAgICAgICAgdGhpcy5rb21pID0ga29taTtcbiAgICAgICAgLyoqIOS6pOeCueOBrueKtuaFi+mFjeWIl+OBp+OBmeOAguaLoeW8tee3muW9ouW6p+aomeOBp+OBmeOAgiAqL1xuICAgICAgICB0aGlzLnN0YXRlID0gbmV3IFVpbnQ4QXJyYXkodGhpcy5DLkVCVkNOVCk7XG4gICAgICAgIHRoaXMuc3RhdGUuZmlsbCh0aGlzLkMuRVhURVJJT1IpO1xuICAgICAgICB0aGlzLmlkID0gbmV3IFVpbnQxNkFycmF5KHRoaXMuQy5FQlZDTlQpOyAvLyDkuqTngrnjga7pgKNJROOBp+OBmeOAglxuICAgICAgICB0aGlzLm5leHQgPSBuZXcgVWludDE2QXJyYXkodGhpcy5DLkVCVkNOVCk7IC8vIOS6pOeCueOCkuWQq+OCgOmAo+OBruasoeOBruefs+OBruW6p+aomeOBp+OBmeOAglxuICAgICAgICB0aGlzLnNnID0gW107IC8vIOmAo+aDheWgseOBp+OBmeOAglxuICAgICAgICBmb3IgKGxldCBpID0gMDsgaSA8IHRoaXMuQy5FQlZDTlQ7IGkrKykge1xuICAgICAgICAgICAgdGhpcy5zZy5wdXNoKG5ldyBfc3RvbmVfZ3JvdXAuU3RvbmVHcm91cCh0aGlzLkMpKTtcbiAgICAgICAgfVxuICAgICAgICB0aGlzLnByZXZTdGF0ZSA9IFtdO1xuICAgICAgICB0aGlzLmtvID0gdGhpcy5DLlZOVUxMO1xuICAgICAgICAvKiog5omL55Wq44Gn44GZ44CCICovXG4gICAgICAgIHRoaXMudHVybiA9IHRoaXMuQy5CTEFDSztcbiAgICAgICAgLyoqIOePvuWcqOOBruaJi+aVsOOBp+OBmeOAgiAqL1xuICAgICAgICB0aGlzLm1vdmVOdW1iZXIgPSAwO1xuICAgICAgICAvKiog55u05YmN44Gu552A5omL44Gn44GZ44CCICovXG4gICAgICAgIHRoaXMucHJldk1vdmUgPSB0aGlzLkMuVk5VTEw7XG4gICAgICAgIHRoaXMucmVtb3ZlQ250ID0gMDtcbiAgICAgICAgdGhpcy5oaXN0b3J5ID0gW107XG4gICAgICAgIHRoaXMucmVzZXQoKTtcbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiDnirbmhYvjgpLliJ3mnJ/ljJbjgZfjgb7jgZnjgIJcbiAgICAgKi9cbiAgICByZXNldCgpIHtcbiAgICAgICAgZm9yIChsZXQgeCA9IDE7IHggPD0gdGhpcy5DLkJTSVpFOyB4KyspIHtcbiAgICAgICAgICAgIGZvciAobGV0IHkgPSAxOyB5IDw9IHRoaXMuQy5CU0laRTsgeSsrKSB7XG4gICAgICAgICAgICAgICAgdGhpcy5zdGF0ZVt0aGlzLkMueHkyZXYoeCwgeSldID0gdGhpcy5DLkVNUFRZO1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICAgIGZvciAobGV0IGkgPSAwOyBpIDwgdGhpcy5pZC5sZW5ndGg7IGkrKykge1xuICAgICAgICAgICAgdGhpcy5pZFtpXSA9IGk7XG4gICAgICAgIH1cbiAgICAgICAgZm9yIChsZXQgaSA9IDA7IGkgPCB0aGlzLm5leHQubGVuZ3RoOyBpKyspIHtcbiAgICAgICAgICAgIHRoaXMubmV4dFtpXSA9IGk7XG4gICAgICAgIH1cbiAgICAgICAgdGhpcy5zZy5mb3JFYWNoKGUgPT4ge1xuICAgICAgICAgICAgZS5jbGVhcihmYWxzZSk7XG4gICAgICAgIH0pO1xuICAgICAgICB0aGlzLnByZXZTdGF0ZSA9IFtdO1xuICAgICAgICBmb3IgKGxldCBpID0gMDsgaSA8IEtFRVBfUFJFVl9DTlQ7IGkrKykge1xuICAgICAgICAgICAgdGhpcy5wcmV2U3RhdGUucHVzaCh0aGlzLnN0YXRlLnNsaWNlKCkpO1xuICAgICAgICB9XG4gICAgICAgIHRoaXMua28gPSB0aGlzLkMuVk5VTEw7XG4gICAgICAgIHRoaXMudHVybiA9IHRoaXMuQy5CTEFDSztcbiAgICAgICAgdGhpcy5tb3ZlTnVtYmVyID0gMDtcbiAgICAgICAgdGhpcy5wcmV2TW92ZSA9IHRoaXMuQy5WTlVMTDtcbiAgICAgICAgdGhpcy5yZW1vdmVDbnQgPSAwO1xuICAgICAgICB0aGlzLmhpc3RvcnkgPSBbXTtcbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBkZXN044Gr54q25oWL44KS44Kz44OU44O844GX44G+44GZ44CCXG4gICAgICogQHBhcmFtIHtCb2FyZH0gZGVzdCBcbiAgICAgKi9cbiAgICBjb3B5VG8oZGVzdCkge1xuICAgICAgICBkZXN0LnN0YXRlID0gdGhpcy5zdGF0ZS5zbGljZSgpO1xuICAgICAgICBkZXN0LmlkID0gdGhpcy5pZC5zbGljZSgpO1xuICAgICAgICBkZXN0Lm5leHQgPSB0aGlzLm5leHQuc2xpY2UoKTtcbiAgICAgICAgZm9yIChsZXQgaSA9IDA7IGkgPCBkZXN0LnNnLmxlbmd0aDsgaSsrKSB7XG4gICAgICAgICAgICB0aGlzLnNnW2ldLmNvcHlUbyhkZXN0LnNnW2ldKTtcbiAgICAgICAgfVxuICAgICAgICBkZXN0LnByZXZTdGF0ZSA9IFtdO1xuICAgICAgICBmb3IgKGxldCBpID0gMDsgaSA8IEtFRVBfUFJFVl9DTlQ7IGkrKykge1xuICAgICAgICAgICAgZGVzdC5wcmV2U3RhdGUucHVzaCh0aGlzLnByZXZTdGF0ZVtpXS5zbGljZSgpKTtcbiAgICAgICAgfVxuICAgICAgICBkZXN0LmtvID0gdGhpcy5rbztcbiAgICAgICAgZGVzdC50dXJuID0gdGhpcy50dXJuO1xuICAgICAgICBkZXN0Lm1vdmVOdW1iZXIgPSB0aGlzLm1vdmVOdW1iZXI7XG4gICAgICAgIGRlc3QucmVtb3ZlQ250ID0gdGhpcy5yZW1vdmVDbnQ7XG4gICAgICAgIGRlc3QuaGlzdG9yeSA9IEFycmF5LmZyb20odGhpcy5oaXN0b3J5KTtcbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiDmi6HlvLXnt5rlvaLluqfmqJnjga7phY3liJfjgpLlj5fjgZHlj5bjgaPjgabpoIbjgavnnYDmiYvjgZfjgb7jgZnjgIJcbiAgICAgKiBAcGFyYW0ge1VpbjE2W119IHNlcXVlbmNlIFxuICAgICAqL1xuICAgIHBsYXlTZXF1ZW5jZShzZXF1ZW5jZSkge1xuICAgICAgICBmb3IgKGNvbnN0IHYgb2Ygc2VxdWVuY2UpIHtcbiAgICAgICAgICAgIHRoaXMucGxheSh2KTtcbiAgICAgICAgfVxuICAgIH1cblxuICAgIC8qKlxuICAgICAqIOS6pOeCueOBq+OBguOCi+efs+OCkuWQq+OCgOmAo+OCkuebpOS4iuOBi+OCieaJk+OBoeS4iuOBkuOBvuOBmeOAglxuICAgICAqIEBwYXJhbSB7VWludDE2fSB2IOaLoeW8tee3muW9ouW6p+aomVxuICAgICAqL1xuICAgIHJlbW92ZSh2KSB7XG4gICAgICAgIGxldCB2VG1wID0gdjtcbiAgICAgICAgd2hpbGUgKHRydWUpIHtcbiAgICAgICAgICAgIHRoaXMucmVtb3ZlQ250ICs9IDE7XG4gICAgICAgICAgICB0aGlzLnN0YXRlW3ZUbXBdID0gdGhpcy5DLkVNUFRZO1xuICAgICAgICAgICAgdGhpcy5pZFt2VG1wXSA9IHZUbXA7XG4gICAgICAgICAgICBmb3IgKGNvbnN0IG52IG9mIHRoaXMuQy5uZWlnaGJvcnModlRtcCkpIHtcbiAgICAgICAgICAgICAgICB0aGlzLnNnW3RoaXMuaWRbbnZdXS5hZGQodlRtcCk7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBjb25zdCB2TmV4dCA9IHRoaXMubmV4dFt2VG1wXTtcbiAgICAgICAgICAgIHRoaXMubmV4dFt2VG1wXSA9IHZUbXA7XG4gICAgICAgICAgICB2VG1wID0gdk5leHQ7XG4gICAgICAgICAgICBpZiAodlRtcCA9PT0gdikge1xuICAgICAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICog5Lqk54K544Gr44GC44KL55+z44Gu6YCj44KS57WQ5ZCI44GX44G+44GZ44CCXG4gICAgICogQHBhcmFtIHtVaW50MTZ9IHYxIOaLoeW8tee3muW9ouW6p+aomVxuICAgICAqIEBwYXJhbSB7VWludDE2fSB2MiDmi6HlvLXnt5rlvaLluqfmqJlcbiAgICAgKi9cbiAgICBtZXJnZSh2MSwgdjIpIHtcbiAgICAgICAgbGV0IGlkQmFzZSA9IHRoaXMuaWRbdjFdO1xuICAgICAgICBsZXQgaWRBZGQgPSB0aGlzLmlkW3YyXTtcbiAgICAgICAgaWYgKHRoaXMuc2dbaWRCYXNlXS5nZXRTaXplKCkgPCB0aGlzLnNnW2lkQWRkXS5nZXRTaXplKCkpIHtcbiAgICAgICAgICAgIGxldCB0bXAgPSBpZEJhc2U7XG4gICAgICAgICAgICBpZEJhc2UgPSBpZEFkZDtcbiAgICAgICAgICAgIGlkQWRkID0gdG1wO1xuICAgICAgICB9XG5cbiAgICAgICAgdGhpcy5zZ1tpZEJhc2VdLm1lcmdlKHRoaXMuc2dbaWRBZGRdKTtcblxuICAgICAgICBsZXQgdlRtcCA9IGlkQWRkO1xuICAgICAgICBkbyB7XG4gICAgICAgICAgICB0aGlzLmlkW3ZUbXBdID0gaWRCYXNlO1xuICAgICAgICAgICAgdlRtcCA9IHRoaXMubmV4dFt2VG1wXTtcbiAgICAgICAgfSB3aGlsZSAodlRtcCAhPT0gaWRBZGQpO1xuICAgICAgICBjb25zdCB0bXAgPSB0aGlzLm5leHRbdjFdO1xuICAgICAgICB0aGlzLm5leHRbdjFdID0gdGhpcy5uZXh0W3YyXTtcbiAgICAgICAgdGhpcy5uZXh0W3YyXSA9IHRtcDtcbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiDkuqTngrl244Gr552A5omL44GZ44KL44OY44Or44OR44O844Oh44K944OD44OJ44Gn44GZ44CCXG4gICAgICog552A5omL44Gr44GvcGxheeODoeOCveODg+ODieOCkuS9v+OBo+OBpuOBj+OBoOOBleOBhOOAglxuICAgICAqIEBwcml2YXRlXG4gICAgICogQHBhcmFtIHtVaW50MTZ9IHYg5ouh5by157ea5b2i5bqn5qiZXG4gICAgICovXG4gICAgcGxhY2VTdG9uZSh2KSB7XG4gICAgICAgIGNvbnN0IHN0b25lQ29sb3IgPSB0aGlzLnR1cm47XG4gICAgICAgIHRoaXMuc3RhdGVbdl0gPSBzdG9uZUNvbG9yO1xuICAgICAgICB0aGlzLmlkW3ZdID0gdjtcbiAgICAgICAgdGhpcy5zZ1t0aGlzLmlkW3ZdXS5jbGVhcih0cnVlKTtcbiAgICAgICAgZm9yIChjb25zdCBudiBvZiB0aGlzLkMubmVpZ2hib3JzKHYpKSB7XG4gICAgICAgICAgICBpZiAodGhpcy5zdGF0ZVtudl0gPT09IHRoaXMuQy5FTVBUWSkge1xuICAgICAgICAgICAgICAgIHRoaXMuc2dbdGhpcy5pZFt2XV0uYWRkKG52KTtcbiAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgdGhpcy5zZ1t0aGlzLmlkW252XV0uc3ViKHYpO1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICAgIGZvciAoY29uc3QgbnYgb2YgdGhpcy5DLm5laWdoYm9ycyh2KSkge1xuICAgICAgICAgICAgaWYgKHRoaXMuc3RhdGVbbnZdID09PSBzdG9uZUNvbG9yICYmIHRoaXMuaWRbbnZdICE9PSB0aGlzLmlkW3ZdKSB7XG4gICAgICAgICAgICAgICAgdGhpcy5tZXJnZSh2LCBudik7XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgICAgdGhpcy5yZW1vdmVDbnQgPSAwO1xuICAgICAgICBjb25zdCBvcHBvbmVudFN0b25lID0gdGhpcy5DLm9wcG9uZW50T2YodGhpcy50dXJuKTtcbiAgICAgICAgZm9yIChjb25zdCBudiBvZiB0aGlzLkMubmVpZ2hib3JzKHYpKSB7XG4gICAgICAgICAgICBpZiAodGhpcy5zdGF0ZVtudl0gPT09IG9wcG9uZW50U3RvbmUgJiYgdGhpcy5zZ1t0aGlzLmlkW252XV0uZ2V0TGliQ250KCkgPT09IDApIHtcbiAgICAgICAgICAgICAgICB0aGlzLnJlbW92ZShudik7XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiDkuqTngrnjgYznnYDmiYvnpoHmraLjgafjgarjgYTjgYvjgpLov5TjgZfjgb7jgZnjgIJcbiAgICAgKiDnn7PjgYzml6LjgavlrZjlnKjjgZnjgovkuqTngrnjgIHjgrPjgqbjgavjgojjgovnpoHmraLjgIHoh6rmrrrmiYvjgYznnYDmiYvnpoHmraLngrnjgafjgZnjgIJcbiAgICAgKiBAcGFyYW0geyp9IHYg5ouh5by157ea5b2i5bqn5qiZXG4gICAgICogQHJldHVybnMge2Jvb2x9IFxuICAgICAqL1xuICAgIGxlZ2FsKHYpIHtcbiAgICAgICAgaWYgKHYgPT09IHRoaXMuQy5QQVNTKSB7XG4gICAgICAgICAgICByZXR1cm4gdHJ1ZTtcbiAgICAgICAgfSBlbHNlIGlmICh2ID09PSB0aGlzLmtvIHx8IHRoaXMuc3RhdGVbdl0gIT09IHRoaXMuQy5FTVBUWSkge1xuICAgICAgICAgICAgcmV0dXJuIGZhbHNlO1xuICAgICAgICB9XG5cbiAgICAgICAgY29uc3Qgc3RvbmVDbnQgPSBbMCwgMF07XG4gICAgICAgIGNvbnN0IGF0ckNudCA9IFswLCAwXTtcbiAgICAgICAgZm9yIChjb25zdCBudiBvZiB0aGlzLkMubmVpZ2hib3JzKHYpKSB7XG4gICAgICAgICAgICBjb25zdCBjID0gdGhpcy5zdGF0ZVtudl07XG4gICAgICAgICAgICBzd2l0Y2ggKGMpIHtcbiAgICAgICAgICAgICAgICBjYXNlIHRoaXMuQy5FTVBUWTpcbiAgICAgICAgICAgICAgICAgICAgcmV0dXJuIHRydWU7XG4gICAgICAgICAgICAgICAgY2FzZSB0aGlzLkMuQkxBQ0s6XG4gICAgICAgICAgICAgICAgY2FzZSB0aGlzLkMuV0hJVEU6XG4gICAgICAgICAgICAgICAgICAgIHN0b25lQ250W2NdICs9IDE7XG4gICAgICAgICAgICAgICAgICAgIGlmICh0aGlzLnNnW3RoaXMuaWRbbnZdXS5nZXRMaWJDbnQoKSA9PT0gMSkge1xuICAgICAgICAgICAgICAgICAgICAgICAgYXRyQ250W2NdICs9IDE7XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgICByZXR1cm4gYXRyQ250W3RoaXMuQy5vcHBvbmVudE9mKHRoaXMudHVybildICE9PSAwIHx8IGF0ckNudFt0aGlzLnR1cm5dIDwgc3RvbmVDbnRbdGhpcy50dXJuXTtcbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiDkuqTngrl244GM44GM44KT5b2i44GL44Gp44GG44GL44KS6L+U44GX44G+44GZ44CCXG4gICAgICogQHByaXZhdGVcbiAgICAgKiBAcGFyYW0ge1VpbnQxNn0gdiBcbiAgICAgKiBAcGFyYW0ge251bWJlcn0gcGwgcGxheWVyIGNvbG9yXG4gICAgICovXG4gICAgZXllc2hhcGUodiwgcGwpIHtcbiAgICAgICAgaWYgKHYgPT09IHRoaXMuQy5QQVNTKSB7XG4gICAgICAgICAgICByZXR1cm4gZmFsc2U7XG4gICAgICAgIH1cbiAgICAgICAgZm9yIChjb25zdCBudiBvZiB0aGlzLkMubmVpZ2hib3JzKHYpKSB7XG4gICAgICAgICAgICBjb25zdCBjID0gdGhpcy5zdGF0ZVtudl07XG4gICAgICAgICAgICBpZiAoYyA9PT0gdGhpcy5DLkVNUFRZIHx8IGMgPT09IHRoaXMuQy5vcHBvbmVudE9mKHBsKSkge1xuICAgICAgICAgICAgICAgIHJldHVybiBmYWxzZTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgICBjb25zdCBkaWFnQ250ID0gWzAsIDAsIDAsIDBdO1xuICAgICAgICBmb3IgKGNvbnN0IG52IG9mIHRoaXMuQy5kaWFnb25hbHModikpIHtcbiAgICAgICAgICAgIGRpYWdDbnRbdGhpcy5zdGF0ZVtudl1dICs9IDE7XG4gICAgICAgIH1cbiAgICAgICAgY29uc3Qgd2VkZ2VDbnQgPSBkaWFnQ250W3RoaXMuQy5vcHBvbmVudE9mKHBsKV0gKyAoZGlhZ0NudFszXSA+IDAgPyAxIDogMCk7XG4gICAgICAgIGlmICh3ZWRnZUNudCA9PT0gMikge1xuICAgICAgICAgICAgZm9yIChjb25zdCBudiBvZiB0aGlzLkMuZGlhZ29uYWxzKHYpKSB7XG4gICAgICAgICAgICAgICAgaWYgKHRoaXMuc3RhdGVbbnZdID09PSB0aGlzLkMub3Bwb25lbnRPZihwbCkgJiYgdGhpcy5zZ1t0aGlzLmlkW252XV0uZ2V0TGliQ250KCkgPT09IDEgJiYgdGhpcy5zZ1t0aGlzLmlkW252XV0uZ2V0VkF0cigpICE9PSB0aGlzLmtvKSB7XG4gICAgICAgICAgICAgICAgICAgIHJldHVybiB0cnVlO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgICByZXR1cm4gd2VkZ2VDbnQgPCAyO1xuICAgIH1cblxuICAgIC8qKlxuICAgICAqIOS6pOeCuXbjgavnnYDmiYvjgZfjgb7jgZnjgIJcbiAgICAgKiBAcGFyYW0geyp9IHYg5ouh5by157ea5b2i5bqn5qiZXG4gICAgICogQHBhcmFtIHsqfSBub3RGaWxsRXllIOecvOOCkua9sOOBmeOBk+OBqOOCkuioseWPr+OBl+OBquOBhFxuICAgICAqL1xuICAgIHBsYXkodiwgbm90RmlsbEV5ZSA9IGZhbHNlKSB7XG4gICAgICAgIGlmICghdGhpcy5sZWdhbCh2KSkge1xuICAgICAgICAgICAgcmV0dXJuIGZhbHNlO1xuICAgICAgICB9XG4gICAgICAgIGlmIChub3RGaWxsRXllICYmIHRoaXMuZXllc2hhcGUodiwgdGhpcy50dXJuKSkge1xuICAgICAgICAgICAgcmV0dXJuIGZhbHNlO1xuICAgICAgICB9XG4gICAgICAgIGZvciAobGV0IGkgPSBLRUVQX1BSRVZfQ05UIC0gMjsgaSA+PSAwOyBpLS0pIHtcbiAgICAgICAgICAgIHRoaXMucHJldlN0YXRlW2kgKyAxXSA9IHRoaXMucHJldlN0YXRlW2ldO1xuICAgICAgICB9XG4gICAgICAgIHRoaXMucHJldlN0YXRlWzBdID0gdGhpcy5zdGF0ZS5zbGljZSgpO1xuICAgICAgICBpZiAodiA9PT0gdGhpcy5DLlBBU1MpIHtcbiAgICAgICAgICAgIHRoaXMua28gPSB0aGlzLkMuVk5VTEw7XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICB0aGlzLnBsYWNlU3RvbmUodik7XG4gICAgICAgICAgICBjb25zdCBpZCA9IHRoaXMuaWRbdl07XG4gICAgICAgICAgICB0aGlzLmtvID0gdGhpcy5DLlZOVUxMO1xuICAgICAgICAgICAgaWYgKHRoaXMucmVtb3ZlQ250ID09PSAxICYmIHRoaXMuc2dbaWRdLmdldExpYkNudCgpID09PSAxICYmIHRoaXMuc2dbaWRdLmdldFNpemUoKSA9PT0gMSkge1xuICAgICAgICAgICAgICAgIHRoaXMua28gPSB0aGlzLnNnW2lkXS5nZXRWQXRyKCk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgICAgdGhpcy5wcmV2TW92ZSA9IHY7XG4gICAgICAgIHRoaXMuaGlzdG9yeS5wdXNoKHYpO1xuICAgICAgICB0aGlzLnR1cm4gPSB0aGlzLkMub3Bwb25lbnRPZih0aGlzLnR1cm4pO1xuICAgICAgICB0aGlzLm1vdmVOdW1iZXIgKz0gMTtcbiAgICAgICAgcmV0dXJuIHRydWU7XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICog55y85b2i44KS5r2w44GV44Gq44GE44KI44GG44Gr44Op44Oz44OA44Og44Gr552A5omL44GX44G+44GZ44CCXG4gICAgICovXG4gICAgcmFuZG9tUGxheSgpIHtcbiAgICAgICAgY29uc3QgZW1wdHlMaXN0ID0gW107XG4gICAgICAgIGZvciAobGV0IGkgPSAwOyBpIDwgdGhpcy5zdGF0ZS5sZW5ndGg7IGkrKykge1xuICAgICAgICAgICAgaWYgKHRoaXMuc3RhdGVbaV0gPT09IHRoaXMuQy5FTVBUWSkge1xuICAgICAgICAgICAgICAgIGVtcHR5TGlzdC5wdXNoKGkpO1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICAgICgwLCBfdXRpbHMuc2h1ZmZsZSkoZW1wdHlMaXN0KTtcbiAgICAgICAgZm9yIChjb25zdCB2IG9mIGVtcHR5TGlzdCkge1xuICAgICAgICAgICAgaWYgKHRoaXMucGxheSh2LCB0cnVlKSkge1xuICAgICAgICAgICAgICAgIHJldHVybiB2O1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICAgIHRoaXMucGxheSh0aGlzLkMuUEFTUywgdHJ1ZSk7XG4gICAgICAgIHJldHVybiB0aGlzLkMuUEFTUztcbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiDjgrnjgrPjgqLlt67jgpLov5TjgZfjgb7jgZnjgIJcbiAgICAgKiDlkIzjgZjoibLjga7nn7Pjga7mlbDjgajkuIDmlrnjga7nn7PjgavjgaDjgZHpmqPmjqXjgZnjgovkuqTngrnjga7mlbDjgYzjgZ3jga7oibLjga7jgrnjgrPjgqLjgajjgYTjgYbnsKHmmJPjg6vjg7zjg6vjgafjgZnjgIJcbiAgICAgKiAocmFuZG9tUGxheeOCkuWun+ihjOOBl+OBn+W+jOOBp+OBr+S4reWbveODq+ODvOODq+OBqOWQjOOBmOWApOOBq+OBquOCiuOBvuOBmSlcbiAgICAgKi9cbiAgICBzY29yZSgpIHtcbiAgICAgICAgY29uc3Qgc3RvbmVDbnQgPSBbMCwgMF07XG4gICAgICAgIGZvciAobGV0IHYgPSAwOyB2IDwgdGhpcy5DLkVCVkNOVDsgdisrKSB7XG4gICAgICAgICAgICBjb25zdCBzID0gdGhpcy5zdGF0ZVt2XTtcbiAgICAgICAgICAgIGlmIChzID09PSB0aGlzLkMuQkxBQ0sgfHwgcyA9PT0gdGhpcy5DLldISVRFKSB7XG4gICAgICAgICAgICAgICAgc3RvbmVDbnRbc10gKz0gMTtcbiAgICAgICAgICAgIH0gZWxzZSBpZiAocyA9PT0gdGhpcy5DLkVNUFRZKSB7XG4gICAgICAgICAgICAgICAgY29uc3QgbmJyQ250ID0gWzAsIDAsIDAsIDBdO1xuICAgICAgICAgICAgICAgIGZvciAoY29uc3QgbnYgb2YgdGhpcy5DLm5laWdoYm9ycyh2KSkge1xuICAgICAgICAgICAgICAgICAgICBuYnJDbnRbdGhpcy5zdGF0ZVtudl1dICs9IDE7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIGlmIChuYnJDbnRbdGhpcy5DLldISVRFXSA+IDAgJiYgbmJyQ250W3RoaXMuQy5CTEFDS10gPT09IDApIHtcbiAgICAgICAgICAgICAgICAgICAgc3RvbmVDbnRbdGhpcy5DLldISVRFXSArPSAxO1xuICAgICAgICAgICAgICAgIH0gZWxzZSBpZiAobmJyQ250W3RoaXMuQy5CTEFDS10gPiAwICYmIG5ickNudFt0aGlzLkMuV0hJVEVdID09PSAwKSB7XG4gICAgICAgICAgICAgICAgICAgIHN0b25lQ250W3RoaXMuQy5CTEFDS10gKz0gMTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgICAgcmV0dXJuIHN0b25lQ250WzFdIC0gc3RvbmVDbnRbMF0gLSB0aGlzLmtvbWk7XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICog55y85Lul5aSW552A5omL5Y+v6IO944Gq5Lqk54K544GM44Gq44GP44Gq44KL44G+44Gn44Op44Oz44OA44Og44Gr552A5omL44GX44G+44GZ44CCXG4gICAgICogc2hvd0JvYXJk44GMdHJ1ZeOBruOBqOOBjee1guWxgFxuICAgICAqIEBwYXJhbSB7Ym9vbH19IHNob3dCb2FyZCBcbiAgICAgKi9cbiAgICByb2xsb3V0KHNob3dCb2FyZCkge1xuICAgICAgICB3aGlsZSAodGhpcy5tb3ZlTnVtYmVyIDwgdGhpcy5DLkVCVkNOVCAqIDIpIHtcbiAgICAgICAgICAgIGNvbnN0IHByZXZNb3ZlID0gdGhpcy5wcmV2TW92ZTtcbiAgICAgICAgICAgIGNvbnN0IG1vdmUgPSB0aGlzLnJhbmRvbVBsYXkoKTtcbiAgICAgICAgICAgIGlmIChzaG93Qm9hcmQgJiYgbW92ZSAhPT0gdGhpcy5DLlBBU1MpIHtcbiAgICAgICAgICAgICAgICBjb25zb2xlLmxvZygnXFxubW92ZSBjb3VudD0lZCcsIHRoaXMubW92ZU51bWJlcik7XG4gICAgICAgICAgICAgICAgdGhpcy5zaG93Ym9hcmQoKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIGlmIChwcmV2TW92ZSA9PT0gdGhpcy5DLlBBU1MgJiYgbW92ZSA9PT0gdGhpcy5DLlBBU1MpIHtcbiAgICAgICAgICAgICAgICBicmVhaztcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgIH1cblxuICAgIC8qKlxuICAgICAqIOeigeebpOOBrnjou7jjg6njg5njg6vjgpLooajnpLrjgZfjgb7jgZnjgIJcbiAgICAgKiBAcHJpdmF0ZVxuICAgICAqL1xuICAgIHByaW50WGxhYmVsKCkge1xuICAgICAgICBsZXQgbGluZVN0ciA9ICcgICc7XG4gICAgICAgIGZvciAobGV0IHggPSAxOyB4IDw9IHRoaXMuQy5CU0laRTsgeCsrKSB7XG4gICAgICAgICAgICBsaW5lU3RyICs9IGAgJHt0aGlzLkMuWF9MQUJFTFNbeF19IGA7XG4gICAgICAgIH1cbiAgICAgICAgY29uc29sZS5sb2cobGluZVN0cik7XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICog56KB55uk44KS44Kz44Oz44K944O844Or44Gr5Ye65Yqb44GX44G+44GZ44CCXG4gICAgICovXG4gICAgc2hvd2JvYXJkKCkge1xuICAgICAgICB0aGlzLnByaW50WGxhYmVsKCk7XG4gICAgICAgIGZvciAobGV0IHkgPSB0aGlzLkMuQlNJWkU7IHkgPiAwOyB5LS0pIHtcbiAgICAgICAgICAgIGxldCBsaW5lU3RyID0gKCcgJyArIHkudG9TdHJpbmcoKSkuc2xpY2UoLTIpO1xuICAgICAgICAgICAgZm9yIChsZXQgeCA9IDE7IHggPD0gdGhpcy5DLkJTSVpFOyB4KyspIHtcbiAgICAgICAgICAgICAgICBjb25zdCB2ID0gdGhpcy5DLnh5MmV2KHgsIHkpO1xuICAgICAgICAgICAgICAgIGxldCB4U3RyO1xuICAgICAgICAgICAgICAgIHN3aXRjaCAodGhpcy5zdGF0ZVt2XSkge1xuICAgICAgICAgICAgICAgICAgICBjYXNlIHRoaXMuQy5CTEFDSzpcbiAgICAgICAgICAgICAgICAgICAgICAgIHhTdHIgPSB2ID09PSB0aGlzLnByZXZNb3ZlID8gJ1tYXScgOiAnIFggJztcbiAgICAgICAgICAgICAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICAgICAgICAgICAgICBjYXNlIHRoaXMuQy5XSElURTpcbiAgICAgICAgICAgICAgICAgICAgICAgIHhTdHIgPSB2ID09PSB0aGlzLnByZXZNb3ZlID8gJ1tPXScgOiAnIE8gJztcbiAgICAgICAgICAgICAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICAgICAgICAgICAgICBjYXNlIHRoaXMuQy5FTVBUWTpcbiAgICAgICAgICAgICAgICAgICAgICAgIHhTdHIgPSAnIC4gJztcbiAgICAgICAgICAgICAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICAgICAgICAgICAgICBkZWZhdWx0OlxuICAgICAgICAgICAgICAgICAgICAgICAgeFN0ciA9ICcgPyAnO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICBsaW5lU3RyICs9IHhTdHI7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBsaW5lU3RyICs9ICgnICcgKyB5LnRvU3RyaW5nKCkpLnNsaWNlKC0yKTtcbiAgICAgICAgICAgIGNvbnNvbGUubG9nKGxpbmVTdHIpO1xuICAgICAgICB9XG4gICAgICAgIHRoaXMucHJpbnRYbGFiZWwoKTtcbiAgICAgICAgY29uc29sZS5sb2coJycpO1xuICAgIH1cblxuICAgIC8qKlxuICAgICAqIOODi+ODpeODvOODqeODq+ODjeODg+ODiOODr+ODvOOCr+OCkuS9v+eUqOOBmeOCi+mam+OBruWFpeWKm+ODleOCo+ODvOODgeODo+ODvOOCkueUn+aIkOOBl+OBvuOBmeOAglxuICAgICAqIEByZXR1cm5zIHtGbG9hdDMyQXJyYXl9XG4gICAgICovXG4gICAgZmVhdHVyZSgpIHtcbiAgICAgICAgY29uc3QgRkVBVFVSRV9DTlQgPSBLRUVQX1BSRVZfQ05UICogMiArIDQ7XG4gICAgICAgIGNvbnN0IGluZGV4ID0gKHAsIGYpID0+IHAgKiBGRUFUVVJFX0NOVCArIGY7XG4gICAgICAgIGNvbnN0IGFycmF5ID0gbmV3IEZsb2F0MzJBcnJheSh0aGlzLkMuQlZDTlQgKiBGRUFUVVJFX0NOVCk7XG4gICAgICAgIGNvbnN0IG15ID0gdGhpcy50dXJuO1xuICAgICAgICBjb25zdCBvcHAgPSB0aGlzLkMub3Bwb25lbnRPZih0aGlzLnR1cm4pO1xuXG4gICAgICAgIGNvbnN0IE4gPSBLRUVQX1BSRVZfQ05UICsgMTtcbiAgICAgICAgZm9yIChsZXQgcCA9IDA7IHAgPCB0aGlzLkMuQlZDTlQ7IHArKykge1xuICAgICAgICAgICAgYXJyYXlbaW5kZXgocCwgMCldID0gdGhpcy5zdGF0ZVt0aGlzLkMucnYyZXYocCldID09PSBteSA/IDEuMCA6IDAuMDtcbiAgICAgICAgfVxuICAgICAgICBmb3IgKGxldCBwID0gMDsgcCA8IHRoaXMuQy5CVkNOVDsgcCsrKSB7XG4gICAgICAgICAgICBhcnJheVtpbmRleChwLCBOKV0gPSB0aGlzLnN0YXRlW3RoaXMuQy5ydjJldihwKV0gPT09IG9wcCA/IDEuMCA6IDAuMDtcbiAgICAgICAgfVxuICAgICAgICBmb3IgKGxldCBpID0gMDsgaSA8IEtFRVBfUFJFVl9DTlQ7IGkrKykge1xuICAgICAgICAgICAgZm9yIChsZXQgcCA9IDA7IHAgPCB0aGlzLkMuQlZDTlQ7IHArKykge1xuICAgICAgICAgICAgICAgIGFycmF5W2luZGV4KHAsIGkgKyAxKV0gPSB0aGlzLnByZXZTdGF0ZVtpXVt0aGlzLkMucnYyZXYocCldID09PSBteSA/IDEuMCA6IDAuMDtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIGZvciAobGV0IHAgPSAwOyBwIDwgdGhpcy5DLkJWQ05UOyBwKyspIHtcbiAgICAgICAgICAgICAgICBhcnJheVtpbmRleChwLCBOICsgaSArIDEpXSA9IHRoaXMucHJldlN0YXRlW2ldW3RoaXMuQy5ydjJldihwKV0gPT09IG9wcCA/IDEuMCA6IDAuMDtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgICBsZXQgaXNfYmxhY2tfdHVybiwgaXNfd2hpdGVfdHVybjtcbiAgICAgICAgaWYgKG15ID09PSB0aGlzLkMuQkxBQ0spIHtcbiAgICAgICAgICAgIGlzX2JsYWNrX3R1cm4gPSAxLjA7XG4gICAgICAgICAgICBpc193aGl0ZV90dXJuID0gMC4wO1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgaXNfYmxhY2tfdHVybiA9IDAuMDtcbiAgICAgICAgICAgIGlzX3doaXRlX3R1cm4gPSAxLjA7XG4gICAgICAgIH1cbiAgICAgICAgZm9yIChsZXQgcCA9IDA7IHAgPCB0aGlzLkMuQlZDTlQ7IHArKykge1xuICAgICAgICAgICAgYXJyYXlbaW5kZXgocCwgRkVBVFVSRV9DTlQgLSAyKV0gPSBpc19ibGFja190dXJuO1xuICAgICAgICAgICAgYXJyYXlbaW5kZXgocCwgRkVBVFVSRV9DTlQgLSAxKV0gPSBpc193aGl0ZV90dXJuO1xuICAgICAgICB9XG4gICAgICAgIHJldHVybiBhcnJheTtcbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiDnj77lnKjjga7lsYDpnaLjga7jg4/jg4Pjgrfjg6XlgKTjgpLov5TjgZfjgb7jgZnjgIJcbiAgICAgKiAo5rOoKeaJi+aVsOaDheWgseOBr+WQq+OBv+OBvuOBm+OCk+OAguOBquOBruOBp+avlOi8g+OBq+OBr+ODj+ODg+OCt+ODpeWApOOBqOaJi+aVsOS4oeaWueOCkuS9v+OBhOOBvuOBmeOAglxuICAgICAqL1xuICAgIGhhc2goKSB7XG4gICAgICAgIHJldHVybiAoMCwgX3V0aWxzLmhhc2gpKCh0aGlzLnN0YXRlLnRvU3RyaW5nKCkgKyB0aGlzLnByZXZTdGF0ZVswXS50b1N0cmluZygpICsgdGhpcy50dXJuLnRvU3RyaW5nKCkpLnJlcGxhY2UoJywnLCAnJykpO1xuICAgIH1cblxuICAgIC8qKlxuICAgICAqIEB0eXBlZGVmIHtPYmplY3R9IENhbmRpZGF0ZXNcbiAgICAgKiBAcHJvcGVydHkge251bWJlcn0gaGFzaCBcbiAgICAgKiBAcHJvcGVydHkge0ludGVnZXJ9IG1vdmVDbnRcbiAgICAgKiBAcHJvcGVydHkge0ludGVnZXJbXX0gbGlzdCDnnYDmiYvlj6/og73jgarkuqTngrnnt5rlvaLluqfmqJko5ouh5by157ea5b2i5bqn5qiZ44Gn44Gv44GC44KK44G+44Gb44KTKVxuICAgICAqIOedgOaJi+WPr+iDveOBquS6pOeCueOBruaDheWgseOCkui/lOOBl+OBvuOBmeOAglxuICAgICAqIEByZXR1cm5zIHtvYmplY3R9IHsgaGFzaDog44OP44OD44K344Ol5YCkLCBtb3ZlTnVtYmVyOiDmiYvmlbAsIGxpc3Q6IOWAmeijnOaJi+mFjeWIlyB9XG4gICAgICovXG4gICAgY2FuZGlkYXRlcygpIHtcbiAgICAgICAgY29uc3QgY2FuZExpc3QgPSBbXTtcbiAgICAgICAgZm9yIChsZXQgdiA9IDA7IHYgPCB0aGlzLnN0YXRlLmxlbmd0aDsgdisrKSB7XG4gICAgICAgICAgICBpZiAodGhpcy5sZWdhbCh2KSkge1xuICAgICAgICAgICAgICAgIGNhbmRMaXN0LnB1c2godGhpcy5DLmV2MnJ2KHYpKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgICBjYW5kTGlzdC5wdXNoKHRoaXMuQy5ldjJydih0aGlzLkMuUEFTUykpO1xuICAgICAgICByZXR1cm4ge1xuICAgICAgICAgICAgaGFzaDogdGhpcy5oYXNoKCksXG4gICAgICAgICAgICBtb3ZlTnVtYmVyOiB0aGlzLm1vdmVOdW1iZXIsXG4gICAgICAgICAgICBsaXN0OiBjYW5kTGlzdFxuICAgICAgICB9O1xuICAgIH1cblxuICAgIC8qKlxuICAgICAqIOe1seioiOeahOaJi+azleOBp+aVtOWcsOOBl+OBn+e1kOaenOOCkui/lOOBl+OBvuOBmeOAglxuICAgICAqIEBwcml2YXRlXG4gICAgICovXG4gICAgZmluYWxTY29yZSgpIHtcbiAgICAgICAgY29uc3QgUk9MTF9PVVRfTlVNID0gMjU2O1xuICAgICAgICBjb25zdCBkb3VibGVTY29yZUxpc3QgPSBbXTtcbiAgICAgICAgbGV0IGJDcHkgPSBuZXcgQm9hcmQodGhpcy5DLCB0aGlzLmtvbWkpO1xuICAgICAgICBmb3IgKGxldCBpID0gMDsgaSA8IFJPTExfT1VUX05VTTsgaSsrKSB7XG4gICAgICAgICAgICB0aGlzLmNvcHlUbyhiQ3B5KTtcbiAgICAgICAgICAgIGJDcHkucm9sbG91dChmYWxzZSk7XG4gICAgICAgICAgICBkb3VibGVTY29yZUxpc3QucHVzaChiQ3B5LnNjb3JlKCkpO1xuICAgICAgICB9XG4gICAgICAgIHJldHVybiAoMCwgX3V0aWxzLm1vc3RDb21tb24pKGRvdWJsZVNjb3JlTGlzdCk7XG4gICAgfVxufVxuZXhwb3J0cy5Cb2FyZCA9IEJvYXJkOyIsIid1c2Ugc3RyaWN0JztcblxuT2JqZWN0LmRlZmluZVByb3BlcnR5KGV4cG9ydHMsIFwiX19lc01vZHVsZVwiLCB7XG4gICAgdmFsdWU6IHRydWVcbn0pO1xuLyoqXG4gKiBAZmlsZSDnooHnm6Tjga7lrprmlbDjgq/jg6njgrnjgafjgZlcbiAqL1xuLypcbiAqIEBhdXRob3Ig5biC5bed6ZuE5LqMIFxuICogQGNvcHlyaWdodCAyMDE4IElDSElLQVdBLCBZdWppIChOZXcgMyBScylcbiAqIEBsaWNlbnNlIE1JVFxuICovXG5cbi8vIOW6p+aomeWkieaPm+eUqOWumuaVsOOBp+OBmeOAglxuY29uc3QgT0ZGU0VUID0gJ2EnLmNoYXJDb2RlQXQoMCkgLSAxO1xuXG4vKipcbiAqIOeigeebpOWumuaVsOOBqOW6p+aomeWkieaPm+OBruOCr+ODqeOCueOBp+OBmeOAgjxicj5cbiAqIOeigeebpOOCr+ODqeOCueOBp+OBr+W6p+aomeezu+OBq+aLoeW8tee3muW9ouW6p+aomeOCkuS9v+OBhOOBvuOBmeOAglxuICog5ouh5by157ea5b2i5bqn5qiZ44Gv55uk5aSW44Gu5Lqk54K544KS5oyB44Gk56KB55uk44Gu5bqn5qiZ44Gn44GZ44CCXG4gKiDlm5vot6/nm6Tjga7loLTlkIjjgIHku6XkuIvjga7jgojjgYbjgarmp4vpgKDjgavjgarjgorjgb7jgZnjgIJcbiAqIDxwcmUgc3R5bGU9XCJmb250LWZhbWlseTogQ291cmllcjtcIj5cbiAqICAgICAjIyMjIyMgI+OBjOebpOWklijlrp/pmpvjga7lgKTjga9FWFRFUklPUilcbiAqICAgICAjLi4uLiMgLuOBr+ebpOS4iuS6pOeCuSjlrp/pmpvjga7lgKTjga9FTVBUWSlcbiAqICAgICAjLi4uLiNcbiAqICAgICAjLi4uLiNcbiAqICAgICAjLi4uLiNcbiAqICAgICAjIyMjIyNcbiAqIDwvcHJlPlxuICog5bem5LiL44GL44KJMC3jgqrjg6rjgrjjg7PjgafmlbDjgYjjgb7jgZnjgILlm5vot6/nm6Tjga7loLTlkIjjgIFcbiAqIDxwcmUgc3R5bGU9XCJmb250LWZhbWlseTogQ291cmllcjtcIj5cbiAqICAgICAzMCAzMSAzMiAzMyAzNCAzNVxuICogICAgIDI0IDI1IDI2IDI3IDI4IDI5XG4gKiAgICAgMTggMTkgMjAgMjEgMjIgMjNcbiAqICAgICAxMiAxMyAxNCAxNSAxNiAxN1xuICogICAgICA2ICA3ICA4ICA5IDEwIDExXG4gKiAgICAgIDAgIDEgIDIgIDMgIDQgIDVcbiAqIDwvcHJlPlxuICog56KB55uk44Gu5Lqk54K544KSeHnluqfmqJnjgafooajjgZnjgajjgY3jgoLlt6bkuIvjgYzljp/ngrnjgafjgZnjgILjgZ/jgaDjgZd4eeW6p+aomeOBruWgtOWQiOOAgTEt44Kq44Oq44K444Oz44Gn44GZ44CCXG4gKi9cbmNsYXNzIEJvYXJkQ29uc3RhbnRzIHtcbiAgICBjb25zdHJ1Y3RvcihzaXplID0gMTkpIHtcbiAgICAgICAgdGhpcy5XSElURSA9IDA7XG4gICAgICAgIHRoaXMuQkxBQ0sgPSAxO1xuICAgICAgICB0aGlzLkVNUFRZID0gMjtcbiAgICAgICAgdGhpcy5FWFRFUklPUiA9IDM7XG4gICAgICAgIHRoaXMuWF9MQUJFTFMgPSAnQEFCQ0RFRkdISktMTU5PUFFSU1QnO1xuICAgICAgICB0aGlzLkJTSVpFID0gc2l6ZTsgLy8g56KB55uk44K144Kk44K6XG4gICAgICAgIHRoaXMuRUJTSVpFID0gdGhpcy5CU0laRSArIDI7IC8vIOaLoeW8teeigeebpOOCteOCpOOCulxuICAgICAgICB0aGlzLkVCVkNOVCA9IHRoaXMuRUJTSVpFICogdGhpcy5FQlNJWkU7XG4gICAgICAgIHRoaXMuUEFTUyA9IHRoaXMuRUJWQ05UO1xuICAgICAgICB0aGlzLlZOVUxMID0gdGhpcy5FQlZDTlQgKyAxO1xuICAgICAgICB0aGlzLkJWQ05UID0gdGhpcy5CU0laRSAqIHRoaXMuQlNJWkU7XG4gICAgICAgIE9iamVjdC5mcmVlemUodGhpcyk7XG4gICAgfVxuXG4gICAgb3Bwb25lbnRPZihjb2xvcikge1xuICAgICAgICBzd2l0Y2ggKGNvbG9yKSB7XG4gICAgICAgICAgICBjYXNlIHRoaXMuV0hJVEU6XG4gICAgICAgICAgICAgICAgcmV0dXJuIHRoaXMuQkxBQ0s7XG4gICAgICAgICAgICBjYXNlIHRoaXMuQkxBQ0s6XG4gICAgICAgICAgICAgICAgcmV0dXJuIHRoaXMuV0hJVEU7XG4gICAgICAgICAgICBkZWZhdWx0OlxuICAgICAgICAgICAgICAgIHRocm93IG5ldyBFcnJvcignaW52YWxpZCBjb2xvcicpO1xuICAgICAgICB9XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogU0dG44OV44Kp44O844Oe44OD44OI44Gu5bqn5qiZ44KSeHnluqfmqJnjgavlpInmj5vjgZfjgb7jgZnjgIJcbiAgICAgKiBAcGFyYW0ge3N0cmluZ30gcyBcbiAgICAgKiBAcmV0dXJucyB7SW50ZWdlcltdfSB4eeW6p+aomVxuICAgICAqL1xuICAgIG1vdmUyeHkocykge1xuICAgICAgICByZXR1cm4gW3MuY2hhckNvZGVBdCgwKSAtIE9GRlNFVCwgdGhpcy5CU0laRSArIDEgLSAocy5jaGFyQ29kZUF0KDEpIC0gT0ZGU0VUKV07XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICog5ouh5by157ea5b2i5bqn5qiZ44KSeHnluqfmqJnjgavlpInmj5vjgZfjgb7jgZnjgIJcbiAgICAgKiBAcGFyYW0ge1VpbnQxNn0gZXYgXG4gICAgICogQHJldHVybnMge0ludGVnZXJbXX0geHnluqfmqJlcbiAgICAgKi9cbiAgICBldjJ4eShldikge1xuICAgICAgICByZXR1cm4gW2V2ICUgdGhpcy5FQlNJWkUsIE1hdGguZmxvb3IoZXYgLyB0aGlzLkVCU0laRSldO1xuICAgIH1cblxuICAgIC8qKlxuICAgICAqIHh55bqn5qiZ44KS5ouh5by157ea5b2i5bqn5qiZ44Gr5aSJ5o+b44GX44G+44GZ44CCXG4gICAgICogQHBhcmFtIHtJbnRlZ2VyfSB4IFxuICAgICAqIEBwYXJhbSB7SW50ZWdlcn0geSBcbiAgICAgKiBAcmV0dXJucyB7VWludDE2fSBleHRlbmRlZCB2ZXJ0ZXhcbiAgICAgKi9cbiAgICB4eTJldih4LCB5KSB7XG4gICAgICAgIHJldHVybiB5ICogdGhpcy5FQlNJWkUgKyB4O1xuICAgIH1cblxuICAgIC8qKlxuICAgICAqIOe3muW9ouW6p+aomeOCkuaLoeW8tee3muW9ouW6p+aomeOBq+WkieaPm+OBl+OBvuOBmeOAglxuICAgICAqIEBwYXJhbSB7VWludDE2fSBydiByYXcgdmVydGV4XG4gICAgICogQHJldHVybnMge1VpbnQxNn0gZXh0ZW5kZWQgdmVydGV4XG4gICAgICovXG4gICAgcnYyZXYocnYpIHtcbiAgICAgICAgcmV0dXJuIHJ2ID09PSB0aGlzLkJWQ05UID8gdGhpcy5QQVNTIDogcnYgJSB0aGlzLkJTSVpFICsgMSArIE1hdGguZmxvb3IocnYgLyB0aGlzLkJTSVpFICsgMSkgKiB0aGlzLkVCU0laRTtcbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiDmi6HlvLXnt5rlvaLluqfmqJnjgpLnt5rlvaLluqfmqJnjgavlpInmj5vjgZfjgb7jgZnjgIJcbiAgICAgKiBAcGFyYW0ge1VpbnQxNn0gZXZcbiAgICAgKiBAcmV0dXJucyB7VWludDE2fSByYXcgdmVydGV4XG4gICAgICovXG4gICAgZXYycnYoZXYpIHtcbiAgICAgICAgcmV0dXJuIGV2ID09PSB0aGlzLlBBU1MgPyB0aGlzLkJWQ05UIDogZXYgJSB0aGlzLkVCU0laRSAtIDEgKyBNYXRoLmZsb29yKGV2IC8gdGhpcy5FQlNJWkUgLSAxKSAqIHRoaXMuQlNJWkU7XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICog5ouh5by157ea5b2i5bqn5qiZ44KSR1RQ44GM5L2/55So44GZ44KL5bqn5qiZ44Gr5aSJ5o+b44GX44G+44GZ44CCXG4gICAgICogQHBhcmFtIHtVaW50MTZ9IGV2XG4gICAgICogQHJldHVybnMge3N0cmluZ30gR1RQ5bqn5qiZXG4gICAgICovXG4gICAgZXYyc3RyKGV2KSB7XG4gICAgICAgIGlmIChldiA+PSB0aGlzLlBBU1MpIHtcbiAgICAgICAgICAgIHJldHVybiAncGFzcyc7XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICBjb25zdCBbeCwgeV0gPSB0aGlzLmV2Mnh5KGV2KTtcbiAgICAgICAgICAgIHJldHVybiB0aGlzLlhfTEFCRUxTLmNoYXJBdCh4KSArIHkudG9TdHJpbmcoKTtcbiAgICAgICAgfVxuICAgIH1cblxuICAgIC8qKlxuICAgICAqIEdUUOOBjOS9v+eUqOOBmeOCi+aLoeW8tee3muW9ouW6p+aomeOBq+WkieaPm+OBl+OBvuOBmeOAglxuICAgICAqIEBwYXJhbSB7c3RyaW5nfSB2XG4gICAgICogQHJldHVybnMge1VpbnQxNn0gZXh0ZW5kZWQgdmVydGV4XG4gICAgICovXG4gICAgc3RyMmV2KHYpIHtcbiAgICAgICAgY29uc3QgdlN0ciA9IHYudG9VcHBlckNhc2UoKTtcbiAgICAgICAgaWYgKHZTdHIgPT09ICdQQVNTJyB8fCB2U3RyID09PSAnUkVTSUdOJykge1xuICAgICAgICAgICAgcmV0dXJuIHRoaXMuUEFTUztcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIGNvbnN0IHggPSB0aGlzLlhfTEFCRUxTLmluZGV4T2YodlN0ci5jaGFyQXQoMCkpO1xuICAgICAgICAgICAgY29uc3QgeSA9IHBhcnNlSW50KHZTdHIuc2xpY2UoMSkpO1xuICAgICAgICAgICAgcmV0dXJuIHRoaXMueHkyZXYoeCwgeSk7XG4gICAgICAgIH1cbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiB244Gr6Zqj5o6l44GZ44KL5Lqk54K544Gu5bqn5qiZ44KS6L+U44GX44G+44GZ44CCXG4gICAgICogQHBhcmFtIHtVaW50MTZ9fSB2IOaLoeW8tee3muW9ouW6p+aomVxuICAgICAqL1xuICAgIG5laWdoYm9ycyh2KSB7XG4gICAgICAgIHJldHVybiBbdiArIDEsIHYgKyB0aGlzLkVCU0laRSwgdiAtIDEsIHYgLSB0aGlzLkVCU0laRV07XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogduOBq+aWnOOCgemao+aOpeOBmeOCi+S6pOeCueOBruW6p+aomeOCkui/lOOBl+OBvuOBmeOAglxuICAgICAqIEBwYXJhbSB7VWludDE2fX0gdiDmi6HlvLXnt5rlvaLluqfmqJlcbiAgICAgKi9cbiAgICBkaWFnb25hbHModikge1xuICAgICAgICByZXR1cm4gW3YgKyB0aGlzLkVCU0laRSArIDEsIHYgKyB0aGlzLkVCU0laRSAtIDEsIHYgLSB0aGlzLkVCU0laRSAtIDEsIHYgLSB0aGlzLkVCU0laRSArIDFdO1xuICAgIH1cbn1cbmV4cG9ydHMuQm9hcmRDb25zdGFudHMgPSBCb2FyZENvbnN0YW50czsiLCIndXNlIHN0cmljdCc7XG5cbk9iamVjdC5kZWZpbmVQcm9wZXJ0eShleHBvcnRzLCBcIl9fZXNNb2R1bGVcIiwge1xuICAgIHZhbHVlOiB0cnVlXG59KTtcbmV4cG9ydHMuTUNUUyA9IHVuZGVmaW5lZDtcblxudmFyIF91dGlscyA9IHJlcXVpcmUoJy4vdXRpbHMuanMnKTtcblxudmFyIF9ib2FyZCA9IHJlcXVpcmUoJy4vYm9hcmQuanMnKTtcblxuLyoqXG4gKiBAZmlsZSDjg6Ljg7Pjg4bjgqvjg6vjg63jg4Tjg6rjg7zmjqLntKLjga7lrp/oo4XjgafjgZnjgIJcbiAqIOOBk+OBruOCs+ODvOODieOBr1B5YXHjga7np7vmpI3jgrPjg7zjg4njgafjgZnjgIJcbiAqIEBzZWUge0BsaW5rIGh0dHBzOi8vZ2l0aHViLmNvbS95bWdhcS9QeWFxfVxuICovXG4vKlxuICogQGF1dGhvciDluILlt53pm4TkuoxcbiAqIEBjb3B5cmlnaHQgMjAxOCBJQ0hJS0FXQSwgWXVqaSAoTmV3IDMgUnMpXG4gKiBAbGljZW5zZSBNSVRcbiAqL1xuY29uc3QgTk9ERVNfTUFYX0xFTkdUSCA9IDE2Mzg0O1xuY29uc3QgRVhQQU5EX0NOVCA9IDg7XG5cbi8qKiBNQ1RT44Gu44OO44O844OJ44Kv44Op44K544Gn44GZ44CCICovXG5jbGFzcyBOb2RlIHtcbiAgICAvKipcbiAgICAgKiBNQ1RT44Gu44OO44O844OJ44KS55Sf5oiQ44GX44G+44GZ44CCXG4gICAgICogQHBhcmFtIHtCb2FyZENvbnN0YW50c30gY29uc3RhbnRzXG4gICAgICovXG4gICAgY29uc3RydWN0b3IoY29uc3RhbnRzKSB7XG4gICAgICAgIHRoaXMuQyA9IGNvbnN0YW50cztcbiAgICAgICAgLyoqIOedgOaJi+WAmeijnOaVsOOBp+OBmeOAgijlkI3liY3jga5lZGdl44Gv44Kw44Op44OV55CG6KuW44Gu5p6d44Gu44GT44Go44Gn44GZ44CCKSAqL1xuICAgICAgICB0aGlzLmVkZ2VMZW5ndGggPSAwO1xuICAgICAgICAvL+mgu+e5geOBquODoeODouODquOCouODreOCseODvOOCt+ODp+ODs+OCkumBv+OBkeOCi+OBn+OCgeOAgeaeneaDheWgseOBq+W/heimgeOBquacgOWkp+ODoeODouODquOCkuS6iOOCgeeiuuS/neOBl+OBvuOBmeOAglxuICAgICAgICAvKiog44Od44Oq44K344O856K6546H44Gu6auY44GE6aCG5Lim44KT44Gg552A5omL5YCZ6KOc44Gn44GZ44CCICovXG4gICAgICAgIHRoaXMubW92ZXMgPSBuZXcgVWludDE2QXJyYXkodGhpcy5DLkJWQ05UICsgMSk7XG4gICAgICAgIC8qKiBtb3Zlc+imgee0oOOBq+WvvuW/nOOBmeOCi+ODneODquOCt+ODvOeiuueOh+OBp+OBmeOAgiAqL1xuICAgICAgICB0aGlzLnByb2JhYmlsaXRpZXMgPSBuZXcgRmxvYXQzMkFycmF5KHRoaXMuQy5CVkNOVCArIDEpO1xuICAgICAgICAvKiogbW92ZXPopoHntKDjgavlr77lv5zjgZnjgovjg5Djg6rjg6Xjg7zjgafjgZnjgILjgZ/jgaDjgZfjg47jg7zjg4njga7miYvnlarjgYvjgonopovjgabjga7lgKTjgafjgZnjgIIgKi9cbiAgICAgICAgdGhpcy52YWx1ZXMgPSBuZXcgRmxvYXQzMkFycmF5KHRoaXMuQy5CVkNOVCArIDEpO1xuICAgICAgICAvKiogbW92ZXPopoHntKDjgavlr77lv5zjgZnjgovnt4/jgqLjgq/jgrfjg6fjg7Pjg5Djg6rjg6Xjg7zjgafjgZnjgILjgZ/jgaDjgZfjg47jg7zjg4njga7miYvnlarjgYvjgonopovjgabjga7lgKTjgafjgZnjgIIgKi9cbiAgICAgICAgdGhpcy50b3RhbEFjdGlvblZhbHVlcyA9IG5ldyBGbG9hdDMyQXJyYXkodGhpcy5DLkJWQ05UICsgMSk7XG4gICAgICAgIC8qKiBtb3Zlc+imgee0oOOBq+WvvuW/nOOBmeOCi+ioquWVj+WbnuaVsOOBp+OBmeOAgiAqL1xuICAgICAgICB0aGlzLnZpc2l0Q291bnRzID0gbmV3IFVpbnQzMkFycmF5KHRoaXMuQy5CVkNOVCArIDEpO1xuICAgICAgICAvKiogbW92ZXPopoHntKDjgavlr77lv5zjgZnjgovjg47jg7zjg4lJROOBp+OBmeOAgiAqL1xuICAgICAgICB0aGlzLm5vZGVJZHMgPSBuZXcgSW50MTZBcnJheSh0aGlzLkMuQlZDTlQgKyAxKTtcbiAgICAgICAgLyoqIG1vdmVz6KaB57Sg44Gr5a++5b+c44GZ44KL44OP44OD44K344Ol44Gn44GZ44CCICovXG4gICAgICAgIHRoaXMuaGFzaGVzID0gbmV3IFVpbnQzMkFycmF5KHRoaXMuQy5CVkNOVCArIDEpO1xuICAgICAgICAvKiogbW92ZXPopoHntKDjgavlr77lv5zjgZnjgovlsYDpnaLjga7jg4vjg6Xjg7zjg6njg6vjg43jg4Pjg4jjg6/jg7zjgq/jgpLoqIjnrpfjgZfjgZ/jgYvlkKbjgYvjgpLkv53mjIHjgZfjgb7jgZnjgIIgKi9cbiAgICAgICAgdGhpcy5ldmFsdWF0ZWQgPSBuZXcgVWludDhBcnJheSh0aGlzLkMuQlZDTlQgKyAxKTtcbiAgICAgICAgdGhpcy50b3RhbFZhbHVlID0gMC4wO1xuICAgICAgICB0aGlzLnRvdGFsQ291bnQgPSAwO1xuICAgICAgICB0aGlzLmhhc2ggPSAwO1xuICAgICAgICB0aGlzLm1vdmVOdW1iZXIgPSAtMTtcbiAgICAgICAgdGhpcy5leGl0Q29uZGl0aW9uID0gbnVsbDtcbiAgICAgICAgdGhpcy5jbGVhcigpO1xuICAgIH1cblxuICAgIC8qKiDmnKrkvb/nlKjnirbmhYvjgavjgZfjgb7jgZnjgIIgKi9cbiAgICBjbGVhcigpIHtcbiAgICAgICAgdGhpcy5lZGdlTGVuZ3RoID0gMDtcbiAgICAgICAgdGhpcy50b3RhbFZhbHVlID0gMC4wO1xuICAgICAgICB0aGlzLnRvdGFsQ291bnQgPSAwO1xuICAgICAgICB0aGlzLmhhc2ggPSAwO1xuICAgICAgICB0aGlzLm1vdmVOdW1iZXIgPSAtMTtcbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiDliJ3mnJ/ljJbjgZfjgb7jgZnjgIJcbiAgICAgKiBAcGFyYW0ge29iamVjdH0gY2FuZGlkYXRlcyBCb2FyZOOBjOeUn+aIkOOBmeOCi+WAmeijnOaJi+aDheWgseOBp+OBmeOAglxuICAgICAqIEBwYXJhbSB7RmxvYXQzMkFycmF5fSBwcm9iIOedgOaJi+eiuueOhyjjg4vjg6Xjg7zjg6njg6vjg43jg4Pjg4jjg6/jg7zjgq/jga7jg53jg6rjgrfjg7zlh7rlipsp44Gn44GZ44CCXG4gICAgICovXG4gICAgaW5pdGlhbGl6ZShjYW5kaWRhdGVzLCBwcm9iKSB7XG4gICAgICAgIHRoaXMuY2xlYXIoKTtcbiAgICAgICAgdGhpcy5tb3ZlTnVtYmVyID0gY2FuZGlkYXRlcy5tb3ZlTnVtYmVyO1xuICAgICAgICB0aGlzLmhhc2ggPSBjYW5kaWRhdGVzLmhhc2g7XG5cbiAgICAgICAgZm9yIChjb25zdCBydiBvZiAoMCwgX3V0aWxzLmFyZ3NvcnQpKHByb2IsIHRydWUpKSB7XG4gICAgICAgICAgICBpZiAoY2FuZGlkYXRlcy5saXN0LmluY2x1ZGVzKHJ2KSkge1xuICAgICAgICAgICAgICAgIHRoaXMubW92ZXNbdGhpcy5lZGdlTGVuZ3RoXSA9IHRoaXMuQy5ydjJldihydik7XG4gICAgICAgICAgICAgICAgdGhpcy5wcm9iYWJpbGl0aWVzW3RoaXMuZWRnZUxlbmd0aF0gPSBwcm9iW3J2XTtcbiAgICAgICAgICAgICAgICB0aGlzLnZhbHVlc1t0aGlzLmVkZ2VMZW5ndGhdID0gMC4wO1xuICAgICAgICAgICAgICAgIHRoaXMudG90YWxBY3Rpb25WYWx1ZXNbdGhpcy5lZGdlTGVuZ3RoXSA9IDAuMDtcbiAgICAgICAgICAgICAgICB0aGlzLnZpc2l0Q291bnRzW3RoaXMuZWRnZUxlbmd0aF0gPSAwO1xuICAgICAgICAgICAgICAgIHRoaXMubm9kZUlkc1t0aGlzLmVkZ2VMZW5ndGhdID0gLTE7XG4gICAgICAgICAgICAgICAgdGhpcy5oYXNoZXNbdGhpcy5lZGdlTGVuZ3RoXSA9IDA7XG4gICAgICAgICAgICAgICAgdGhpcy5ldmFsdWF0ZWRbdGhpcy5lZGdlTGVuZ3RoXSA9IGZhbHNlO1xuICAgICAgICAgICAgICAgIHRoaXMuZWRnZUxlbmd0aCArPSAxO1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICog44Ko44OD44K444Gu5Lit44Gu44OZ44K544OIMuOBruOCpOODs+ODh+ODg+OCr+OCueOCkui/lOOBl+OBvuOBmeOAglxuICAgICAqIEByZXR1cm5zIHtJbnRlZ2VyW119XG4gICAgICovXG4gICAgYmVzdDIoKSB7XG4gICAgICAgIGNvbnN0IG9yZGVyID0gKDAsIF91dGlscy5hcmdzb3J0KSh0aGlzLnZpc2l0Q291bnRzLnNsaWNlKDAsIHRoaXMuZWRnZUxlbmd0aCksIHRydWUpO1xuICAgICAgICByZXR1cm4gb3JkZXIuc2xpY2UoMCwgMik7XG4gICAgfVxufVxuXG4vKiog44Oi44Oz44OG44Kr44Or44Ot44OE44Oq44O85o6i57Si44KS5a6f6KGM44GZ44KL44Kv44Op44K544Gn44GZ44CCICovXG5jbGFzcyBNQ1RTIHtcbiAgICAvKipcbiAgICAgKiDjgrPjg7Pjgrnjg4jjg6njgq/jgr9cbiAgICAgKiBAcGFyYW0ge05ldXJhbE5ldHdvcmt9IG5uIFxuICAgICAqIEBwYXJhbSB7Qm9hcmRDb25zdGFudHN9IENcbiAgICAgKi9cbiAgICBjb25zdHJ1Y3RvcihubiwgQykge1xuICAgICAgICB0aGlzLkNfUFVDVCA9IDAuMDE7XG4gICAgICAgIHRoaXMubWFpblRpbWUgPSAwLjA7XG4gICAgICAgIHRoaXMuYnlveW9taSA9IDEuMDtcbiAgICAgICAgdGhpcy5sZWZ0VGltZSA9IDAuMDtcbiAgICAgICAgdGhpcy5ub2RlcyA9IFtdO1xuICAgICAgICB0aGlzLm5vZGVzTGVuZ3RoID0gMDtcbiAgICAgICAgZm9yIChsZXQgaSA9IDA7IGkgPCBOT0RFU19NQVhfTEVOR1RIOyBpKyspIHtcbiAgICAgICAgICAgIHRoaXMubm9kZXMucHVzaChuZXcgTm9kZShDKSk7XG4gICAgICAgIH1cbiAgICAgICAgdGhpcy5yb290SWQgPSAwO1xuICAgICAgICB0aGlzLnJvb3RNb3ZlTnVtYmVyID0gMDtcbiAgICAgICAgdGhpcy5ub2RlSGFzaGVzID0gbmV3IE1hcCgpO1xuICAgICAgICB0aGlzLmV2YWxDb3VudCA9IDA7XG4gICAgICAgIHRoaXMubm4gPSBubjtcbiAgICAgICAgdGhpcy50ZXJtaW5hdGVGbGFnID0gZmFsc2U7XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICog5oyB44Gh5pmC6ZaT44Gu6Kit5a6a44KS44GX44G+44GZ44CCXG4gICAgICog5q6L44KK5pmC6ZaT44KC44Oq44K744OD44OI44GX44G+44GZ44CCXG4gICAgICogQHBhcmFtIHtudW1iZXJ9IG1haW5UaW1lIOenklxuICAgICAqIEBwYXJhbSB7bnVtYmVyfSBieW95b21pIOenklxuICAgICAqL1xuICAgIHNldFRpbWUobWFpblRpbWUsIGJ5b3lvbWkpIHtcbiAgICAgICAgdGhpcy5tYWluVGltZSA9IG1haW5UaW1lO1xuICAgICAgICB0aGlzLmxlZnRUaW1lID0gbWFpblRpbWU7XG4gICAgICAgIHRoaXMuYnlveW9taSA9IGJ5b3lvbWk7XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICog5q6L44KK5pmC6ZaT44KS6Kit5a6a44GX44G+44GZ44CCXG4gICAgICogQHBhcmFtIHtudW1iZXJ9IGxlZnRUaW1lIOenklxuICAgICAqL1xuICAgIHNldExlZnRUaW1lKGxlZnRUaW1lKSB7XG4gICAgICAgIHRoaXMubGVmdFRpbWUgPSBsZWZ0VGltZTtcbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiDlhoXpg6jnirbmhYvjgpLjgq/jg6rjgqLjgZfjgb7jgZnjgIJcbiAgICAgKiDlkIzkuIDmmYLplpPoqK3lrprjgafliJ3miYvjgYvjgonlr77lsYDjgafjgY3jgovjgojjgYbjgavjgarjgorjgb7jgZnjgIJcbiAgICAgKi9cbiAgICBjbGVhcigpIHtcbiAgICAgICAgdGhpcy5sZWZ0VGltZSA9IHRoaXMubWFpblRpbWU7XG4gICAgICAgIGZvciAoY29uc3Qgbm9kZSBvZiB0aGlzLm5vZGVzKSB7XG4gICAgICAgICAgICBub2RlLmNsZWFyKCk7XG4gICAgICAgIH1cbiAgICAgICAgdGhpcy5ub2Rlc0xlbmd0aCA9IDA7XG4gICAgICAgIHRoaXMucm9vdElkID0gMDtcbiAgICAgICAgdGhpcy5yb290TW92ZU51bWJlciA9IDA7XG4gICAgICAgIHRoaXMubm9kZUhhc2hlcy5jbGVhcigpO1xuICAgICAgICB0aGlzLmV2YWxDb3VudCA9IDA7XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICog5bGA6Z2iYuOBrk1DVFPjga7mjqLntKLjg47jg7zjg4njgYzml6LjgavjgYLjgovjgYvnorroqo3jgZfjgIHjgarjgZHjgozjgbDnlJ/miJDjgZfjgabjg47jg7zjg4lJROOCkui/lOOBl+OBvuOBmeOAglxuICAgICAqIEBwYXJhbSB7Qm9hcmR9IGIgXG4gICAgICogQHBhcmFtIHtGbG9hdDMyQXJyYXl9IHByb2IgXG4gICAgICogQHJldHVybnMge0ludGVnZXJ9IOODjuODvOODiUlEXG4gICAgICovXG4gICAgY3JlYXRlTm9kZShiLCBwcm9iKSB7XG4gICAgICAgIGNvbnN0IGNhbmRpZGF0ZXMgPSBiLmNhbmRpZGF0ZXMoKTtcbiAgICAgICAgY29uc3QgaGFzaCA9IGNhbmRpZGF0ZXMuaGFzaDtcbiAgICAgICAgaWYgKHRoaXMubm9kZUhhc2hlcy5oYXMoaGFzaCkgJiYgdGhpcy5ub2Rlc1t0aGlzLm5vZGVIYXNoZXMuZ2V0KGhhc2gpXS5oYXNoID09PSBoYXNoICYmIHRoaXMubm9kZXNbdGhpcy5ub2RlSGFzaGVzLmdldChoYXNoKV0ubW92ZU51bWJlciA9PT0gY2FuZGlkYXRlcy5tb3ZlTnVtYmVyKSB7XG4gICAgICAgICAgICByZXR1cm4gdGhpcy5ub2RlSGFzaGVzLmdldChoYXNoKTtcbiAgICAgICAgfVxuXG4gICAgICAgIGxldCBub2RlSWQgPSBoYXNoICUgTk9ERVNfTUFYX0xFTkdUSDtcbiAgICAgICAgd2hpbGUgKHRoaXMubm9kZXNbbm9kZUlkXS5tb3ZlTnVtYmVyICE9PSAtMSkge1xuICAgICAgICAgICAgbm9kZUlkID0gbm9kZUlkICsgMSA8IE5PREVTX01BWF9MRU5HVEggPyBub2RlSWQgKyAxIDogMDtcbiAgICAgICAgfVxuXG4gICAgICAgIHRoaXMubm9kZUhhc2hlcy5zZXQoaGFzaCwgbm9kZUlkKTtcbiAgICAgICAgdGhpcy5ub2Rlc0xlbmd0aCArPSAxO1xuXG4gICAgICAgIGNvbnN0IG5vZGUgPSB0aGlzLm5vZGVzW25vZGVJZF07XG4gICAgICAgIG5vZGUuaW5pdGlhbGl6ZShjYW5kaWRhdGVzLCBwcm9iKTtcbiAgICAgICAgcmV0dXJuIG5vZGVJZDtcbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBub2Rlc+OBruS4reOBruS4jeimgeOBquODjuODvOODieOCkuacquS9v+eUqOeKtuaFi+OBq+aIu+OBl+OBvuOBmeOAglxuICAgICAqL1xuICAgIGNsZWFudXBOb2RlcygpIHtcbiAgICAgICAgaWYgKHRoaXMubm9kZXNMZW5ndGggPCBOT0RFU19NQVhfTEVOR1RIIC8gMikge1xuICAgICAgICAgICAgcmV0dXJuO1xuICAgICAgICB9XG4gICAgICAgIGZvciAobGV0IGkgPSAwOyBpIDwgTk9ERVNfTUFYX0xFTkdUSDsgaSsrKSB7XG4gICAgICAgICAgICBjb25zdCBtYyA9IHRoaXMubm9kZXNbaV0ubW92ZU51bWJlcjtcbiAgICAgICAgICAgIGlmIChtYyAhPSBudWxsICYmIG1jIDwgdGhpcy5yb290TW92ZU51bWJlcikge1xuICAgICAgICAgICAgICAgIHRoaXMubm9kZUhhc2hlcy5kZWxldGUodGhpcy5ub2Rlc1tpXS5oYXNoKTtcbiAgICAgICAgICAgICAgICB0aGlzLm5vZGVzW2ldLmNsZWFyKCk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBVQ0LoqZXkvqHjgafmnIDlloTjga7nnYDmiYvmg4XloLHjgpLov5TjgZfjgb7jgZnjgIJcbiAgICAgKiBAcGFyYW0ge0JvYXJkfSBiIFxuICAgICAqIEBwYXJhbSB7SW50ZWdlcn0gbm9kZUlkIFxuICAgICAqIEByZXR1cm5zIHtBcnJheX0gW1VDQumBuOaKnuOCpOODs+ODh+ODg+OCr+OCuSwg5pyA5ZaE44OW44Op44Oz44OB44Gu5a2Q44OO44O844OJSUQsIOedgOaJi11cbiAgICAgKi9cbiAgICBzZWxlY3RCeVVDQihiLCBub2RlKSB7XG4gICAgICAgIGNvbnN0IG5kUmF0ZSA9IG5vZGUudG90YWxDb3VudCA9PT0gMCA/IDAuMCA6IG5vZGUudG90YWxWYWx1ZSAvIG5vZGUudG90YWxDb3VudDtcbiAgICAgICAgY29uc3QgY3BzdiA9IHRoaXMuQ19QVUNUICogTWF0aC5zcXJ0KG5vZGUudG90YWxDb3VudCk7XG4gICAgICAgIGNvbnN0IG1lYW5BY3Rpb25WYWx1ZXMgPSBuZXcgRmxvYXQzMkFycmF5KG5vZGUuZWRnZUxlbmd0aCk7XG4gICAgICAgIGZvciAobGV0IGkgPSAwOyBpIDwgbWVhbkFjdGlvblZhbHVlcy5sZW5ndGg7IGkrKykge1xuICAgICAgICAgICAgbWVhbkFjdGlvblZhbHVlc1tpXSA9IG5vZGUudmlzaXRDb3VudHNbaV0gPT09IDAgPyBuZFJhdGUgOiBub2RlLnRvdGFsQWN0aW9uVmFsdWVzW2ldIC8gbm9kZS52aXNpdENvdW50c1tpXTtcbiAgICAgICAgfVxuICAgICAgICBjb25zdCB1Y2IgPSBuZXcgRmxvYXQzMkFycmF5KG5vZGUuZWRnZUxlbmd0aCk7XG4gICAgICAgIGZvciAobGV0IGkgPSAwOyBpIDwgdWNiLmxlbmd0aDsgaSsrKSB7XG4gICAgICAgICAgICB1Y2JbaV0gPSBtZWFuQWN0aW9uVmFsdWVzW2ldICsgY3BzdiAqIG5vZGUucHJvYmFiaWxpdGllc1tpXSAvICgxICsgbm9kZS52aXNpdENvdW50c1tpXSk7XG4gICAgICAgIH1cbiAgICAgICAgY29uc3Qgc2VsZWN0ZWRJbmRleCA9ICgwLCBfdXRpbHMuYXJnbWF4KSh1Y2IpO1xuICAgICAgICBjb25zdCBzZWxlY3RlZElkID0gbm9kZS5ub2RlSWRzW3NlbGVjdGVkSW5kZXhdO1xuICAgICAgICBjb25zdCBzZWxlY3RlZE1vdmUgPSBub2RlLm1vdmVzW3NlbGVjdGVkSW5kZXhdO1xuICAgICAgICByZXR1cm4gW3NlbGVjdGVkSW5kZXgsIHNlbGVjdGVkSWQsIHNlbGVjdGVkTW92ZV07XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICog5qSc57Si44GZ44KL44GL44Gp44GG44GL44KS5rG65a6a44GX44G+44GZ44CCXG4gICAgICogQHBhcmFtIHtJbnRlZ2VyfSBiZXN0IFxuICAgICAqIEBwYXJhbSB7SW50ZWdlcn0gc2Vjb25kIFxuICAgICAqL1xuICAgIHNob3VsZFNlYXJjaChiZXN0LCBzZWNvbmQpIHtcbiAgICAgICAgY29uc3Qgbm9kZSA9IHRoaXMubm9kZXNbdGhpcy5yb290SWRdO1xuICAgICAgICBjb25zdCB3aW5yYXRlID0gdGhpcy53aW5yYXRlKG5vZGUsIGJlc3QpO1xuXG4gICAgICAgIC8vIOioquWVj+WbnuaVsOOBjOi2s+OCiuOBpuOBhOOBquOBhOOBi+OAgemam+eri+OBo+OBn+aJi+OBjOOBquOBj+OBi+OBpOOBr+OBo+OBjeOCiuWLneOBoeOBmOOCg+OBquOBhOOBqOOBjVxuICAgICAgICByZXR1cm4gbm9kZS50b3RhbENvdW50IDw9IDUwMDAgfHwgbm9kZS52aXNpdENvdW50c1tiZXN0XSA8PSBub2RlLnZpc2l0Q291bnRzW3NlY29uZF0gKiAxMDAgJiYgd2lucmF0ZSA8PSAwLjk1O1xuICAgIH1cblxuICAgIC8qKlxuICAgICAqIOasoeOBruedgOaJi+OBruiAg+aFruaZgumWk+OCkueul+WHuuOBl+OBvuOBmeOAglxuICAgICAqIEByZXR1cm5zIHtudW1iZXJ9IOS9v+eUqOOBmeOCi+aZgumWkyjnp5IpXG4gICAgICovXG4gICAgZ2V0U2VhcmNoVGltZShDKSB7XG4gICAgICAgIGlmICh0aGlzLm1haW5UaW1lID09PSAwLjAgfHwgdGhpcy5sZWZ0VGltZSA8IHRoaXMuYnlveW9taSAqIDIuMCkge1xuICAgICAgICAgICAgcmV0dXJuIE1hdGgubWF4KHRoaXMuYnlveW9taSwgMS4wKTtcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIC8vIOeigeebpOOCkuWfi+OCgeOCi+OBk+OBqOOCkuS7ruWumuOBl+OAgeaui+OCiuOBruaJi+aVsOOCkueul+WHuuOBl+OBvuOBmeOAglxuICAgICAgICAgICAgY29uc3QgYXNzdW1lZFJlbWFpbmluZ01vdmVzID0gKEMuQlZDTlQgLSB0aGlzLnJvb3RNb3ZlTnVtYmVyKSAvIDI7XG4gICAgICAgICAgICAvL+W4g+efs+OBp+OBr+OCiOOCiuWkmuOBj+OBruaJi+aVsOOCkuS7ruWumuOBl+OAgeaApeOBjuOBvuOBmeOAglxuICAgICAgICAgICAgY29uc3Qgb3BlbmluZ09mZnNldCA9IE1hdGgubWF4KEMuQlZDTlQgLyAxMCAtIHRoaXMucm9vdE1vdmVOdW1iZXIsIDApO1xuICAgICAgICAgICAgcmV0dXJuIHRoaXMubGVmdFRpbWUgLyAoYXNzdW1lZFJlbWFpbmluZ01vdmVzICsgb3BlbmluZ09mZnNldCkgKyB0aGlzLmJ5b3lvbWk7XG4gICAgICAgIH1cbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBub2RlSWTjga7jg47jg7zjg4njga5lZGdlSW5kZXjjga7jgqjjg4Pjgrjjgavlr77lv5zjgZnjgovjg47jg7zjg4njgYzml6LjgavlrZjlnKjjgZnjgovjgYvov5TjgZfjgb7jgZnjgIJcbiAgICAgKiBAcGFyYW0ge0ludGVnZXJ9IG5vZGVJZCBcbiAgICAgKiBAcGFyYW0ge0ludGVnZXJ9IGVkZ2VJbmRleCBcbiAgICAgKiBAcGFyYW0ge0ludGVnZXJ9IG1vdmVOdW1iZXIgXG4gICAgICogQHJldHVybnMge2Jvb2x9XG4gICAgICovXG4gICAgaGFzRWRnZU5vZGUoZWRnZUluZGV4LCBub2RlSWQsIG1vdmVOdW1iZXIpIHtcbiAgICAgICAgY29uc3Qgbm9kZSA9IHRoaXMubm9kZXNbbm9kZUlkXTtcbiAgICAgICAgY29uc3QgZWRnZUlkID0gbm9kZS5ub2RlSWRzW2VkZ2VJbmRleF07XG4gICAgICAgIHJldHVybiBlZGdlSWQgPj0gMCAmJiBub2RlLmhhc2hlc1tlZGdlSW5kZXhdID09PSB0aGlzLm5vZGVzW2VkZ2VJZF0uaGFzaCAmJiB0aGlzLm5vZGVzW2VkZ2VJZF0ubW92ZU51bWJlciA9PT0gbW92ZU51bWJlcjtcbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBpbmRleOOBruOCqOODg+OCuOOBruWLneeOh+OCkui/lOOBl+OBvuOBmeOAglxuICAgICAqIEBwYXJhbSB7Tm9kZX0gbm9kZSBcbiAgICAgKiBAcGFyYW0ge0ludGVnZXJ9IGluZGV4IFxuICAgICAqIEByZXR1cm5zIHtudW1iZXJ9XG4gICAgICovXG4gICAgd2lucmF0ZShub2RlLCBpbmRleCkge1xuICAgICAgICByZXR1cm4gbm9kZS50b3RhbEFjdGlvblZhbHVlc1tpbmRleF0gLyBNYXRoLm1heChub2RlLnZpc2l0Q291bnRzW2luZGV4XSwgMSkgLyAyLjAgKyAwLjU7XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogcHJpbnRJbmZv44Gu44OY44Or44OR44O86Zai5pWw44Gn44GZ44CCXG4gICAgICogQHByaXZhdGVcbiAgICAgKiBAcGFyYW0ge0ludGVnZXJ9IG5vZGVJZCBcbiAgICAgKiBAcGFyYW0geyp9IGhlYWRNb3ZlIFxuICAgICAqIEBwYXJhbSB7Qm9hcmRDb25zdGFudHN9IGMgXG4gICAgICovXG4gICAgYmVzdFNlcXVlbmNlKG5vZGVJZCwgaGVhZE1vdmUsIGMpIHtcbiAgICAgICAgbGV0IHNlcVN0ciA9ICgnICAgJyArIGMuZXYyc3RyKGhlYWRNb3ZlKSkuc2xpY2UoLTUpO1xuICAgICAgICBsZXQgbmV4dE1vdmUgPSBoZWFkTW92ZTtcblxuICAgICAgICBmb3IgKGxldCBpID0gMDsgaSA8IDc7IGkrKykge1xuICAgICAgICAgICAgY29uc3Qgbm9kZSA9IHRoaXMubm9kZXNbbm9kZUlkXTtcbiAgICAgICAgICAgIGlmIChuZXh0TW92ZSA9PT0gYy5QQVNTIHx8IG5vZGUuZWRnZUxlbmd0aCA8IDEpIHtcbiAgICAgICAgICAgICAgICBicmVhaztcbiAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgY29uc3QgYmVzdCA9ICgwLCBfdXRpbHMuYXJnbWF4KShub2RlLnZpc2l0Q291bnRzLnNsaWNlKDAsIG5vZGUuZWRnZUxlbmd0aCkpO1xuICAgICAgICAgICAgaWYgKG5vZGUudmlzaXRDb3VudHNbYmVzdF0gPT09IDApIHtcbiAgICAgICAgICAgICAgICBicmVhaztcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIG5leHRNb3ZlID0gbm9kZS5tb3Zlc1tiZXN0XTtcbiAgICAgICAgICAgIHNlcVN0ciArPSAnLT4nICsgKCcgICAnICsgYy5ldjJzdHIobmV4dE1vdmUpKS5zbGljZSgtNSk7XG5cbiAgICAgICAgICAgIGlmICghdGhpcy5oYXNFZGdlTm9kZShiZXN0LCBub2RlSWQsIG5vZGUubW92ZU51bWJlciArIDEpKSB7XG4gICAgICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBub2RlSWQgPSBub2RlLm5vZGVJZHNbYmVzdF07XG4gICAgICAgIH1cblxuICAgICAgICByZXR1cm4gc2VxU3RyO1xuICAgIH1cblxuICAgIC8qKlxuICAgICAqIOaOoue0oue1kOaenOOBruips+e0sOOCkuihqOekuuOBl+OBvuOBmeOAglxuICAgICAqIEBwYXJhbSB7SW50ZWdlcn0gbm9kZUlkIFxuICAgICAqIEBwYXJhbSB7Qm9hcmRDb25zdGFudHN9IGNcbiAgICAgKi9cbiAgICBwcmludEluZm8obm9kZUlkLCBjKSB7XG4gICAgICAgIGNvbnN0IG5vZGUgPSB0aGlzLm5vZGVzW25vZGVJZF07XG4gICAgICAgIGNvbnN0IG9yZGVyID0gKDAsIF91dGlscy5hcmdzb3J0KShub2RlLnZpc2l0Q291bnRzLnNsaWNlKDAsIG5vZGUuZWRnZUxlbmd0aCksIHRydWUpO1xuICAgICAgICBjb25zb2xlLmxvZygnfG1vdmV8Y291bnQgIHxyYXRlIHx2YWx1ZXxwcm9iIHwgYmVzdCBzZXF1ZW5jZScpO1xuICAgICAgICBmb3IgKGxldCBpID0gMDsgaSA8IE1hdGgubWluKG9yZGVyLmxlbmd0aCwgOSk7IGkrKykge1xuICAgICAgICAgICAgY29uc3QgbSA9IG9yZGVyW2ldO1xuICAgICAgICAgICAgY29uc3QgdmlzaXRDb3VudHMgPSBub2RlLnZpc2l0Q291bnRzW21dO1xuICAgICAgICAgICAgaWYgKHZpc2l0Q291bnRzID09PSAwKSB7XG4gICAgICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgICAgICB9XG5cbiAgICAgICAgICAgIGNvbnN0IHJhdGUgPSB2aXNpdENvdW50cyA9PT0gMCA/IDAuMCA6IHRoaXMud2lucmF0ZShub2RlLCBtKSAqIDEwMC4wO1xuICAgICAgICAgICAgY29uc3QgdmFsdWUgPSAobm9kZS52YWx1ZXNbbV0gLyAyLjAgKyAwLjUpICogMTAwLjA7XG4gICAgICAgICAgICBjb25zb2xlLmxvZygnfCVzfCVzfCVzfCVzfCVzfCAlcycsICgnICAgJyArIGMuZXYyc3RyKG5vZGUubW92ZXNbbV0pKS5zbGljZSgtNCksICh2aXNpdENvdW50cyArICcgICAgICAnKS5zbGljZSgwLCA3KSwgKCcgICcgKyByYXRlLnRvRml4ZWQoMSkpLnNsaWNlKC01KSwgKCcgICcgKyB2YWx1ZS50b0ZpeGVkKDEpKS5zbGljZSgtNSksICgnICAnICsgKG5vZGUucHJvYmFiaWxpdGllc1ttXSAqIDEwMC4wKS50b0ZpeGVkKDEpKS5zbGljZSgtNSksIHRoaXMuYmVzdFNlcXVlbmNlKG5vZGUubm9kZUlkc1ttXSwgbm9kZS5tb3Zlc1ttXSwgYykpO1xuICAgICAgICB9XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICog5qSc57Si44Gu5YmN5Yem55CG44Gn44GZ44CCXG4gICAgICogQHByaXZhdGVcbiAgICAgKiBAcGFyYW0ge0JvYXJkfSBiIFxuICAgICAqL1xuICAgIGFzeW5jIHByZXBhcmVSb290Tm9kZShiKSB7XG4gICAgICAgIGNvbnN0IGhhc2ggPSBiLmhhc2goKTtcbiAgICAgICAgdGhpcy5yb290TW92ZU51bWJlciA9IGIubW92ZU51bWJlcjtcbiAgICAgICAgdGhpcy5DX1BVQ1QgPSB0aGlzLnJvb3RNb3ZlTnVtYmVyIDwgOCA/IDAuMDEgOiAxLjU7XG4gICAgICAgIGlmICh0aGlzLm5vZGVIYXNoZXMuaGFzKGhhc2gpICYmIHRoaXMubm9kZXNbdGhpcy5ub2RlSGFzaGVzLmdldChoYXNoKV0uaGFzaCA9PT0gaGFzaCAmJiB0aGlzLm5vZGVzW3RoaXMubm9kZUhhc2hlcy5nZXQoaGFzaCldLm1vdmVOdW1iZXIgPT09IHRoaXMucm9vdE1vdmVOdW1iZXIpIHtcbiAgICAgICAgICAgIHRoaXMucm9vdElkID0gdGhpcy5ub2RlSGFzaGVzLmdldChoYXNoKTtcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIGNvbnN0IFtwcm9iXSA9IGF3YWl0IHRoaXMubm4uZXZhbHVhdGUoYi5mZWF0dXJlKCkpO1xuXG4gICAgICAgICAgICAvLyBBbHBoYUdvIFplcm/jgafjga/oh6rlt7Hlr77miKbmmYLjgavjga/jgZPjgZPjgadwcm9i44GrXCJEaXJpY2hsZXTjg47jgqTjgrpcIuOCkui/veWKoOOBl+OBvuOBmeOBjOOAgeacrOOCs+ODvOODieOBp+OBr+W8t+WMluWtpue/kuOBr+S6iOWumuOBl+OBpuOBhOOBquOBhOOBruOBp+iomOi/sOOBl+OBvuOBm+OCk+OAglxuXG4gICAgICAgICAgICB0aGlzLnJvb3RJZCA9IHRoaXMuY3JlYXRlTm9kZShiLCBwcm9iKTtcbiAgICAgICAgfVxuICAgIH1cblxuICAgIC8qKlxuICAgICAqIGVkZ2VJbmRleOOBruOCqOODg+OCuOOBruWxgOmdouOCkuipleS+oeOBl+ODjuODvOODieOCkueUn+aIkOOBl+OBpuODkOODquODpeODvOOCkui/lOOBl+OBvuOBmeOAglxuICAgICAqIEBwcml2YXRlXG4gICAgICogQHBhcmFtIHtCb2FyZH0gYiBcbiAgICAgKiBAcGFyYW0ge0ludGVnZXJ9IGVkZ2VJbmRleCBcbiAgICAgKiBAcGFyYW0ge05vZGV9IHBhcmVudE5vZGUgXG4gICAgICogQHJldHVybnMge251bWJlcn0gcGFyZW50Tm9kZeOBruaJi+eVquOBi+OCieimi+OBn2VkZ2XlsYDpnaLjga7jg5Djg6rjg6Xjg7xcbiAgICAgKi9cbiAgICBhc3luYyBldmFsdWF0ZUVkZ2UoYiwgZWRnZUluZGV4LCBwYXJlbnROb2RlKSB7XG4gICAgICAgIGxldCBbcHJvYiwgdmFsdWVdID0gYXdhaXQgdGhpcy5ubi5ldmFsdWF0ZShiLmZlYXR1cmUoKSk7XG4gICAgICAgIHRoaXMuZXZhbENvdW50ICs9IDE7XG4gICAgICAgIHZhbHVlID0gLXZhbHVlWzBdOyAvLyBwYXJlbnROb2Rl44Gu5omL55Wq44GL44KJ6KaL44Gf44OQ44Oq44Ol44O844Gr5aSJ5o+b44GX44G+44GZ44CCXG4gICAgICAgIHBhcmVudE5vZGUudmFsdWVzW2VkZ2VJbmRleF0gPSB2YWx1ZTtcbiAgICAgICAgcGFyZW50Tm9kZS5ldmFsdWF0ZWRbZWRnZUluZGV4XSA9IHRydWU7XG4gICAgICAgIGlmICh0aGlzLm5vZGVzTGVuZ3RoID4gMC44NSAqIE5PREVTX01BWF9MRU5HVEgpIHtcbiAgICAgICAgICAgIHRoaXMuY2xlYW51cE5vZGVzKCk7XG4gICAgICAgIH1cbiAgICAgICAgY29uc3Qgbm9kZUlkID0gdGhpcy5jcmVhdGVOb2RlKGIsIHByb2IpO1xuICAgICAgICBwYXJlbnROb2RlLm5vZGVJZHNbZWRnZUluZGV4XSA9IG5vZGVJZDtcbiAgICAgICAgcGFyZW50Tm9kZS5oYXNoZXNbZWRnZUluZGV4XSA9IGIuaGFzaCgpO1xuICAgICAgICBwYXJlbnROb2RlLnRvdGFsVmFsdWUgLT0gcGFyZW50Tm9kZS50b3RhbEFjdGlvblZhbHVlc1tlZGdlSW5kZXhdO1xuICAgICAgICBwYXJlbnROb2RlLnRvdGFsQ291bnQgKz0gcGFyZW50Tm9kZS52aXNpdENvdW50c1tlZGdlSW5kZXhdO1xuICAgICAgICByZXR1cm4gdmFsdWU7XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogTUNUU+ODhOODquODvOOCklVDQuOBq+W+k+OBo+OBpuS4i+OCiuOAgeODquODvOODleODjuODvOODieOBq+WIsOmBlOOBl+OBn+OCieWxlemWi+OBl+OBvuOBmeOAglxuICAgICAqIEBwcml2YXRlXG4gICAgICogQHBhcmFtIHtCb2FyZH0gYiBcbiAgICAgKiBAcGFyYW0ge0ludGVnZXJ9IG5vZGVJZFxuICAgICAqL1xuICAgIGFzeW5jIHBsYXlvdXQoYiwgbm9kZUlkKSB7XG4gICAgICAgIGNvbnN0IG5vZGUgPSB0aGlzLm5vZGVzW25vZGVJZF07XG4gICAgICAgIGNvbnN0IFtzZWxlY3RlZEluZGV4LCBzZWxlY3RlZElkLCBzZWxlY3RlZE1vdmVdID0gdGhpcy5zZWxlY3RCeVVDQihiLCBub2RlKTtcbiAgICAgICAgYi5wbGF5KHNlbGVjdGVkTW92ZSk7XG4gICAgICAgIGNvbnN0IGlzSGVhZE5vZGUgPSAhdGhpcy5oYXNFZGdlTm9kZShzZWxlY3RlZEluZGV4LCBub2RlSWQsIGIubW92ZU51bWJlcik7XG4gICAgICAgIC8qXG4gICAgICAgIC8vIOS7peS4i+OBr1B5YXHjgYzmjqHnlKjjgZfjgZ/jg5jjg4Pjg4njg47jg7zjg4njga7mnaHku7bjgafjgZnjgIJcbiAgICAgICAgY29uc3QgaXNIZWFkTm9kZSA9ICF0aGlzLmhhc0VkZ2VOb2RlKHNlbGVjdGVkSW5kZXgsIG5vZGVJZCwgYi5tb3ZlTnVtYmVyKSB8fFxuICAgICAgICAgICAgbm9kZS52aXNpdENvdW50c1tzZWxlY3RlZEluZGV4XSA8IEVYUEFORF9DTlQgfHxcbiAgICAgICAgICAgIGIubW92ZU51bWJlciA+IGIuQy5CVkNOVCAqIDIgfHxcbiAgICAgICAgICAgIChzZWxlY3RlZE1vdmUgPT09IGIuQy5QQVNTICYmIGIucHJldk1vdmUgPT09IGIuQy5QQVNTKTtcbiAgICAgICAgKi9cbiAgICAgICAgY29uc3QgdmFsdWUgPSBpc0hlYWROb2RlID8gbm9kZS5ldmFsdWF0ZWRbc2VsZWN0ZWRJbmRleF0gPyBub2RlLnZhbHVlc1tzZWxlY3RlZEluZGV4XSA6IGF3YWl0IHRoaXMuZXZhbHVhdGVFZGdlKGIsIHNlbGVjdGVkSW5kZXgsIG5vZGUpIDogLShhd2FpdCB0aGlzLnBsYXlvdXQoYiwgc2VsZWN0ZWRJZCkpOyAvLyBzZWxlY3RlZElk44Gu5omL55Wq44Gn44Gu44OQ44Oq44Ol44O844GM6L+U44GV44KM44KL44GL44KJ56ym5Y+344KS5Y+N6Lui44GV44Gb44G+44GZ44CCXG4gICAgICAgIG5vZGUudG90YWxWYWx1ZSArPSB2YWx1ZTtcbiAgICAgICAgbm9kZS50b3RhbENvdW50ICs9IDE7XG4gICAgICAgIG5vZGUudG90YWxBY3Rpb25WYWx1ZXNbc2VsZWN0ZWRJbmRleF0gKz0gdmFsdWU7XG4gICAgICAgIG5vZGUudmlzaXRDb3VudHNbc2VsZWN0ZWRJbmRleF0gKz0gMTtcbiAgICAgICAgcmV0dXJuIHZhbHVlO1xuICAgIH1cblxuICAgIC8qKlxuICAgICAqIOODl+ODrOOCpOOCouOCpuODiOOCkue5sOOCiui/lOOBl+OBpk1DVFPjg4Tjg6rjg7zjgpLmm7TmlrDjgZfjgb7jgZnjgIJcbiAgICAgKiBAcHJpdmF0ZVxuICAgICAqIEBwYXJhbSB7Qm9hcmR9IGIgXG4gICAgICovXG4gICAgYXN5bmMga2VlcFBsYXlvdXQoYikge1xuICAgICAgICB0aGlzLmV2YWxDb3VudCA9IDA7XG4gICAgICAgIGxldCBiQ3B5ID0gbmV3IF9ib2FyZC5Cb2FyZChiLkMsIGIua29taSk7XG4gICAgICAgIGRvIHtcbiAgICAgICAgICAgIGIuY29weVRvKGJDcHkpO1xuICAgICAgICAgICAgYXdhaXQgdGhpcy5wbGF5b3V0KGJDcHksIHRoaXMucm9vdElkKTtcbiAgICAgICAgfSB3aGlsZSAoIXRoaXMuZXhpdENvbmRpdGlvbigpKTtcbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiDmjqLntKLjgYzlv4XopoHjgYvliKTlrprjgZfjgablv4XopoHjgavlv5zjgZjjgabmpJzntKLjgZfjgIHmnIDlloTjgajliKTmlq3jgZfjgZ/nnYDmiYvjgajli53njofjgpLov5TjgZfjgb7jgZnjgIJcbiAgICAgKiBAcHJpdmF0ZVxuICAgICAqIEBwYXJhbSB7Qm9hcmR9IGIgXG4gICAgICogQHBhcmFtIHtib29sfSBwb25kZXIgdHJ1ZeOBruOBqOOBjXN0b3Djg6Hjgr3jg4Pjg4njgYzlkbzjgbDjgozjgovjgb7jgafmjqLntKLjgpLntpnntprjgZfjgb7jgZlcbiAgICAgKiBAcGFyYW0ge2Jvb2x9IGNsZWFuIOW9ouWLouOBjOWkieOCj+OCieOBquOBhOmZkOOCiuODkeOCueS7peWkluOBruedgOaJi+OCkumBuOOBs+OBvuOBmVxuICAgICAqIEByZXR1cm5zIHtBcnJheX0gW+edgOaJiyjmm7jjgY/mnJ3prq7ns7vluqfmqJkpLCDli53njoddXG4gICAgICovXG4gICAgYXN5bmMgX3NlYXJjaChiLCBwb25kZXIsIGNsZWFuKSB7XG4gICAgICAgIC8vIEFscGhhR28gWmVyb+OBp+OBr+iHquW3seWvvuaIpuOBruW6j+ebpDMw5omL44G+44Gn44Gv44Ko44OD44K444Gu57eP6Kiq5ZWP5Zue5pWw44GL44KJ56K6546H5YiG5biD44KS566X5Ye644GX44Gm5Lmx5pWw44Gn552A5omL44KS5rSX5r+v44GX44G+44GZ44GM44CB5pys44Kz44O844OJ44Gn44Gv5by35YyW5a2m57+S44Gv5LqI5a6a44GX44Gm44GE44Gq44GE44Gu44Gn5pyA5ZaE44Go5Yik5pat44GX44Gf552A5omL44KS6L+U44GX44G+44GZ44CCXG4gICAgICAgIGxldCBiZXN0O1xuICAgICAgICBsZXQgc2Vjb25kO1xuICAgICAgICBpZiAocG9uZGVyIHx8IHRoaXMuc2hvdWxkU2VhcmNoKGJlc3QsIHNlY29uZCkpIHtcbiAgICAgICAgICAgIGF3YWl0IHRoaXMua2VlcFBsYXlvdXQoYik7XG4gICAgICAgICAgICBjb25zdCBiZXN0MiA9IHRoaXMubm9kZXNbdGhpcy5yb290SWRdLmJlc3QyKCk7XG4gICAgICAgICAgICBiZXN0ID0gYmVzdDJbMF07XG4gICAgICAgICAgICBzZWNvbmQgPSBiZXN0MlsxXTtcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIGNvbnN0IGJlc3QyID0gdGhpcy5ub2Rlc1t0aGlzLnJvb3RJZF0uYmVzdDIoKTtcbiAgICAgICAgICAgIGJlc3QgPSBiZXN0MlswXTtcbiAgICAgICAgICAgIHNlY29uZCA9IGJlc3QyWzFdO1xuICAgICAgICB9XG5cbiAgICAgICAgY29uc3Qgbm9kZSA9IHRoaXMubm9kZXNbdGhpcy5yb290SWRdO1xuXG4gICAgICAgIGlmIChjbGVhbiAmJiBub2RlLm1vdmVzW2Jlc3RdID09PSBiLkMuUEFTUyAmJiBub2RlLnRvdGFsQWN0aW9uVmFsdWVzW2Jlc3RdICogbm9kZS50b3RhbEFjdGlvblZhbHVlc1tzZWNvbmRdID4gMC4wKSB7XG4gICAgICAgICAgICByZXR1cm4gW25vZGUubW92ZXNbc2Vjb25kXSwgdGhpcy53aW5yYXRlKG5vZGUsIHNlY29uZCldO1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgcmV0dXJuIFtub2RlLm1vdmVzW2Jlc3RdLCB0aGlzLndpbnJhdGUobm9kZSwgYmVzdCldO1xuICAgICAgICB9XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogTUNUU+aOoue0ouODoeOCveODg+ODieOBp+OBmeOAglxuICAgICAqIF9zZWFyY2jjg6Hjgr3jg4Pjg4njga7jg6njg4Pjg5Hjg7zjg6Hjgr3jg4Pjg4njgafjgZnjgIJcbiAgICAgKiDntYLkuobmnaHku7bjgpLoqK3lrprjgZfjgIHlsYDpnaJi44KSdGltZeaZgumWk+aOoue0ouOBl+OAgee1kOaenOOCkuODreOCsOWHuuWKm+OBl+OBpuasoeOBruS4gOaJi+OBqOWLneeOh+OCkui/lOOBl+OBvuOBmeOAglxuICAgICAqIEBwYXJhbSB7Qm9hcmR9IGIgXG4gICAgICogQHBhcmFtIHtudW1iZXJ9IHRpbWUg5o6i57Si5pmC6ZaT44KS56eS5Y2Y5L2N44Gn5oyH5a6a44GX44G+44GZXG4gICAgICogQHBhcmFtIHtib29sfSBwb25kZXIgdHRydWXjga7jgajjgY1zdG9w44Oh44K944OD44OJ44GM5ZG844Gw44KM44KL44G+44Gn5o6i57Si44KS57aZ57aa44GX44G+44GZXG4gICAgICogQHBhcmFtIHtib29sfSBjbGVhbiDlvaLli6LjgYzlpInjgo/jgonjgarjgYTpmZDjgorjg5Hjgrnku6XlpJbjga7nnYDmiYvjgpLpgbjjgbPjgb7jgZlcbiAgICAgKiBAcmV0dXJucyB7QXJyYXl9IFvnnYDmiYso5pu444GP5pyd6a6u57O75bqn5qiZKSwg5Yud546HXVxuICAgICAqL1xuICAgIGFzeW5jIHNlYXJjaChiLCB0aW1lLCBwb25kZXIsIGNsZWFuKSB7XG4gICAgICAgIGNvbnN0IHN0YXJ0ID0gRGF0ZS5ub3coKTtcbiAgICAgICAgYXdhaXQgdGhpcy5wcmVwYXJlUm9vdE5vZGUoYik7XG5cbiAgICAgICAgaWYgKHRoaXMubm9kZXNbdGhpcy5yb290SWRdLmVkZ2VMZW5ndGggPD0gMSkge1xuICAgICAgICAgICAgLy8g5YCZ6KOc5omL44GM44OR44K544GX44GL44Gq44GR44KM44GwXG4gICAgICAgICAgICBjb25zb2xlLmxvZygnXFxubW92ZSBudW1iZXI9JWQ6JywgdGhpcy5yb290TW92ZU51bWJlciArIDEpO1xuICAgICAgICAgICAgdGhpcy5wcmludEluZm8odGhpcy5yb290SWQsIGIuQyk7XG4gICAgICAgICAgICByZXR1cm4gW2IuQy5QQVNTLCAwLjVdO1xuICAgICAgICB9XG5cbiAgICAgICAgdGhpcy5jbGVhbnVwTm9kZXMoKTtcblxuICAgICAgICBjb25zdCB0aW1lXyA9ICh0aW1lID09PSAwLjAgPyB0aGlzLmdldFNlYXJjaFRpbWUoYi5DKSA6IHRpbWUpICogMTAwMCAtIDUwMDsgLy8gMC4156eS44Gu44Oe44O844K444OzXG4gICAgICAgIHRoaXMudGVybWluYXRlRmxhZyA9IGZhbHNlO1xuICAgICAgICB0aGlzLmV4aXRDb25kaXRpb24gPSBwb25kZXIgPyBmdW5jdGlvbiAoKSB7XG4gICAgICAgICAgICByZXR1cm4gdGhpcy50ZXJtaW5hdGVGbGFnO1xuICAgICAgICB9IDogZnVuY3Rpb24gKCkge1xuICAgICAgICAgICAgcmV0dXJuIHRoaXMudGVybWluYXRlRmxhZyB8fCBEYXRlLm5vdygpIC0gc3RhcnQgPiB0aW1lXztcbiAgICAgICAgfTtcbiAgICAgICAgY29uc3QgW25leHRNb3ZlLCB3aW5SYXRlXSA9IGF3YWl0IHRoaXMuX3NlYXJjaChiLCBwb25kZXIsIGNsZWFuKTtcblxuICAgICAgICBpZiAoIXBvbmRlcikge1xuICAgICAgICAgICAgY29uc29sZS5sb2coJ1xcbm1vdmUgbnVtYmVyPSVkOiBsZWZ0IHRpbWU9JXNbc2VjXSBldmFsdWF0ZWQ9JWQnLCB0aGlzLnJvb3RNb3ZlTnVtYmVyICsgMSwgTWF0aC5tYXgodGhpcy5sZWZ0VGltZSAtIHRpbWUsIDAuMCkudG9GaXhlZCgxKSwgdGhpcy5ldmFsQ291bnQpO1xuICAgICAgICAgICAgdGhpcy5wcmludEluZm8odGhpcy5yb290SWQsIGIuQyk7XG4gICAgICAgICAgICB0aGlzLmxlZnRUaW1lID0gdGhpcy5sZWZ0VGltZSAtIChEYXRlLm5vdygpIC0gc3RhcnQpIC8gMTAwMDtcbiAgICAgICAgfVxuICAgICAgICByZXR1cm4gW25leHRNb3ZlLCB3aW5SYXRlXTtcbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiDlrp/ooYzkuK3jga5rZWVwUGxheW91dOOCkuWBnOatouOBleOBm+OBvuOBmeOAglxuICAgICAqL1xuICAgIHN0b3AoKSB7XG4gICAgICAgIHRoaXMudGVybWluYXRlRmxhZyA9IHRydWU7XG4gICAgfVxufVxuZXhwb3J0cy5NQ1RTID0gTUNUUzsiLCIndXNlIHN0cmljdCc7XG5cbk9iamVjdC5kZWZpbmVQcm9wZXJ0eShleHBvcnRzLCBcIl9fZXNNb2R1bGVcIiwge1xuICB2YWx1ZTogdHJ1ZVxufSk7XG5leHBvcnRzLk5ldXJhbE5ldHdvcmsgPSB1bmRlZmluZWQ7XG5cbnZhciBfd29ya2VyUm1pID0gcmVxdWlyZSgnd29ya2VyLXJtaScpO1xuXG4vKipcbiAqIOODi+ODpeODvOODqeODq+ODjeODg+ODiOODr+ODvOOCr+OBrlJNSeOBp+OBmeOAguODieOCreODpeODoeODs+ODiOOBr+acrOS9k+WBtOOBruOCs+ODvOODieOCkuWPgueFp+OBl+OBpuOBj+OBoOOBleOBhOOAglxuICogQGFsaWFzIE5ldXJhbE5ldHdvcmtSTUlcbiAqIEBzZWUgTmV1cmFsTmV0d29ya1xuICovXG5jbGFzcyBOZXVyYWxOZXR3b3JrIGV4dGVuZHMgX3dvcmtlclJtaS5Xb3JrZXJSTUkge1xuICBhc3luYyBldmFsdWF0ZSguLi5pbnB1dHMpIHtcbiAgICBjb25zdCByZXN1bHQgPSBhd2FpdCB0aGlzLmludm9rZVJNKCdldmFsdWF0ZScsIGlucHV0cyk7XG4gICAgcmV0dXJuIHJlc3VsdDtcbiAgfVxufVxuZXhwb3J0cy5OZXVyYWxOZXR3b3JrID0gTmV1cmFsTmV0d29yazsgLyoqXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgKiBAZmlsZSDjg4vjg6Xjg7zjg6njg6vjg43jg4Pjg4jjg6/jg7zjgq/jga5STUnjgafjgZnjgIJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAqL1xuLypcbiAqIEBhdXRob3Ig5biC5bed6ZuE5LqMXG4gKiBAY29weXJpZ2h0IDIwMTggSUNISUtBV0EsIFl1amkgKE5ldyAzIFJzKVxuICogQGxpY2Vuc2UgTUlUXG4gKi8iLCJcInVzZSBzdHJpY3RcIjtcblxuT2JqZWN0LmRlZmluZVByb3BlcnR5KGV4cG9ydHMsIFwiX19lc01vZHVsZVwiLCB7XG4gICAgdmFsdWU6IHRydWVcbn0pO1xuLyoqXG4gKiBAZmlsZSDlm7LnooHjga7pgKPjgpLooajjgZnjgq/jg6njgrnjgafjgZnjgIJcbiAqIOOBk+OBruOCs+ODvOODieOBr1B5YXHjga7np7vmpI3jgrPjg7zjg4njgafjgZnjgIJcbiAqIEBzZWUge0BsaW5rIGh0dHBzOi8vZ2l0aHViLmNvbS95bWdhcS9QeWFxfVxuICovXG4vKlxuICogQGF1dGhvciDluILlt53pm4TkuoxcbiAqIEBjb3B5cmlnaHQgMjAxOCBJQ0hJS0FXQSwgWXVqaSAoTmV3IDMgUnMpXG4gKiBAbGljZW5zZSBNSVRcbiAqL1xuXG4vKiog6YCj5oOF5aCx44Kv44Op44K5ICovXG5jbGFzcyBTdG9uZUdyb3VwIHtcbiAgICAvKipcbiAgICAgKiBcbiAgICAgKiBAcGFyYW0ge29iamVjdH0gYm9hcmRDb25zdGFudHNcbiAgICAgKi9cbiAgICBjb25zdHJ1Y3Rvcihib2FyZENvbnN0YW50cykge1xuICAgICAgICB0aGlzLkMgPSBib2FyZENvbnN0YW50cztcbiAgICAgICAgdGhpcy5saWJDbnQgPSB0aGlzLkMuVk5VTEw7XG4gICAgICAgIHRoaXMuc2l6ZSA9IHRoaXMuQy5WTlVMTDtcbiAgICAgICAgdGhpcy52QXRyID0gdGhpcy5DLlZOVUxMO1xuICAgICAgICB0aGlzLmxpYnMgPSBuZXcgU2V0KCk7XG4gICAgfVxuXG4gICAgZ2V0U2l6ZSgpIHtcbiAgICAgICAgcmV0dXJuIHRoaXMuc2l6ZTtcbiAgICB9XG5cbiAgICBnZXRMaWJDbnQoKSB7XG4gICAgICAgIHJldHVybiB0aGlzLmxpYkNudDtcbiAgICB9XG5cbiAgICBnZXRWQXRyKCkge1xuICAgICAgICByZXR1cm4gdGhpcy52QXRyO1xuICAgIH1cblxuICAgIGNsZWFyKHN0b25lKSB7XG4gICAgICAgIHRoaXMubGliQ250ID0gc3RvbmUgPyAwIDogdGhpcy5DLlZOVUxMO1xuICAgICAgICB0aGlzLnNpemUgPSBzdG9uZSA/IDEgOiB0aGlzLkMuVk5VTEw7XG4gICAgICAgIHRoaXMudkF0ciA9IHRoaXMuQy5WTlVMTDtcbiAgICAgICAgdGhpcy5saWJzLmNsZWFyKCk7XG4gICAgfVxuXG4gICAgYWRkKHYpIHtcbiAgICAgICAgaWYgKHRoaXMubGlicy5oYXModikpIHtcbiAgICAgICAgICAgIHJldHVybjtcbiAgICAgICAgfVxuICAgICAgICB0aGlzLmxpYnMuYWRkKHYpO1xuICAgICAgICB0aGlzLmxpYkNudCArPSAxO1xuICAgICAgICB0aGlzLnZBdHIgPSB2O1xuICAgIH1cblxuICAgIHN1Yih2KSB7XG4gICAgICAgIGlmICghdGhpcy5saWJzLmhhcyh2KSkge1xuICAgICAgICAgICAgcmV0dXJuO1xuICAgICAgICB9XG4gICAgICAgIHRoaXMubGlicy5kZWxldGUodik7XG4gICAgICAgIHRoaXMubGliQ250IC09IDE7XG4gICAgfVxuXG4gICAgbWVyZ2Uob3RoZXIpIHtcbiAgICAgICAgdGhpcy5saWJzID0gbmV3IFNldChbLi4udGhpcy5saWJzLCAuLi5vdGhlci5saWJzXSk7XG4gICAgICAgIHRoaXMubGliQ250ID0gdGhpcy5saWJzLnNpemU7XG4gICAgICAgIHRoaXMuc2l6ZSArPSBvdGhlci5zaXplO1xuICAgICAgICBpZiAodGhpcy5saWJDbnQgPT09IDEpIHtcbiAgICAgICAgICAgIHNlbGYudkF0ciA9IHRoaXMubGlic1swXTtcbiAgICAgICAgfVxuICAgIH1cblxuICAgIGNvcHlUbyhkZXN0KSB7XG4gICAgICAgIGRlc3QubGliQ250ID0gdGhpcy5saWJDbnQ7XG4gICAgICAgIGRlc3Quc2l6ZSA9IHRoaXMuc2l6ZTtcbiAgICAgICAgZGVzdC52QXRyID0gdGhpcy52QXRyO1xuICAgICAgICBkZXN0LmxpYnMgPSBuZXcgU2V0KHRoaXMubGlicyk7XG4gICAgfVxufVxuZXhwb3J0cy5TdG9uZUdyb3VwID0gU3RvbmVHcm91cDsiLCIndXNlIHN0cmljdCc7XG5cbk9iamVjdC5kZWZpbmVQcm9wZXJ0eShleHBvcnRzLCBcIl9fZXNNb2R1bGVcIiwge1xuICAgIHZhbHVlOiB0cnVlXG59KTtcbmV4cG9ydHMuc2h1ZmZsZSA9IHNodWZmbGU7XG5leHBvcnRzLm1vc3RDb21tb24gPSBtb3N0Q29tbW9uO1xuZXhwb3J0cy5hcmdzb3J0ID0gYXJnc29ydDtcbmV4cG9ydHMuYXJnbWF4ID0gYXJnbWF4O1xuZXhwb3J0cy5oYXNoID0gaGFzaDtcbmV4cG9ydHMuc29mdG1heCA9IHNvZnRtYXg7XG5leHBvcnRzLnByaW50UHJvYiA9IHByaW50UHJvYjtcbi8qKlxuICogQGZpbGUg5ZCE56iu44Om44O844OG44Kj44Oq44OG44Kj6Zai5pWw576k44Gn44GZ44CCXG4gKi9cbi8qXG4gKiBAYXV0aG9yIOW4guW3nembhOS6jFxuICogQGNvcHlyaWdodCAyMDE4IElDSElLQVdBLCBZdWppIChOZXcgMyBScylcbiAqIEBsaWNlbnNlIE1JVFxuICovXG5cbi8qKlxuICogQHBhcmFtIHtBcnJheX0gYXJyYXlcbiAqL1xuZnVuY3Rpb24gc2h1ZmZsZShhcnJheSkge1xuICAgIGxldCBuID0gYXJyYXkubGVuZ3RoO1xuICAgIGxldCB0O1xuICAgIGxldCBpO1xuXG4gICAgd2hpbGUgKG4pIHtcbiAgICAgICAgaSA9IE1hdGguZmxvb3IoTWF0aC5yYW5kb20oKSAqIG4tLSk7XG4gICAgICAgIHQgPSBhcnJheVtuXTtcbiAgICAgICAgYXJyYXlbbl0gPSBhcnJheVtpXTtcbiAgICAgICAgYXJyYXlbaV0gPSB0O1xuICAgIH1cblxuICAgIHJldHVybiBhcnJheTtcbn1cblxuLyoqXG4gKiBhcnJheeOBruS4reOBruacgOmgu+WHuuimgee0oOOCkui/lOOBl+OBvuOBmeOAglxuICogQHBhcmFtIHtBcnJheX0gYXJyYXkgXG4gKi9cbmZ1bmN0aW9uIG1vc3RDb21tb24oYXJyYXkpIHtcbiAgICBjb25zdCBtYXAgPSBuZXcgTWFwKCk7XG4gICAgZm9yIChsZXQgaSA9IDA7IGkgPCBhcnJheS5sZW5ndGg7IGkrKykge1xuICAgICAgICBjb25zdCBlID0gYXJyYXlbaV07XG4gICAgICAgIGlmIChtYXAuaGFzKGUpKSB7XG4gICAgICAgICAgICBtYXAuc2V0KGUsIG1hcC5nZXQoZSkgKyAxKTtcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIG1hcC5zZXQoZSwgMSk7XG4gICAgICAgIH1cbiAgICB9XG4gICAgbGV0IG1heEtleTtcbiAgICBsZXQgbWF4VmFsdWUgPSAtMTtcbiAgICBmb3IgKGNvbnN0IFtrZXksIHZhbHVlXSBvZiBtYXAuZW50cmllcygpKSB7XG4gICAgICAgIGlmICh2YWx1ZSA+IG1heFZhbHVlKSB7XG4gICAgICAgICAgICBtYXhLZXkgPSBrZXk7XG4gICAgICAgICAgICBtYXhWYWx1ZSA9IHZhbHVlO1xuICAgICAgICB9XG4gICAgfVxuICAgIHJldHVybiBtYXhLZXk7XG59XG5cbi8qKiBhcnJheeOCkuOCveODvOODiOOBl+OBn+aZguOBruOCpOODs+ODh+ODg+OCr+OCuemFjeWIl+OCkui/lOOBl+OBvuOBmeOAglxuICogQHBhcmFtIHtudW1iZXJbXX0gYXJyYXkgXG4gKiBAcGFyYW0ge2Jvb2x9IHJldmVyc2UgXG4gKi9cbmZ1bmN0aW9uIGFyZ3NvcnQoYXJyYXksIHJldmVyc2UpIHtcbiAgICBjb25zdCBlbiA9IEFycmF5LmZyb20oYXJyYXkpLm1hcCgoZSwgaSkgPT4gW2ksIGVdKTtcbiAgICBlbi5zb3J0KChhLCBiKSA9PiByZXZlcnNlID8gYlsxXSAtIGFbMV0gOiBhWzFdIC0gYlsxXSk7XG4gICAgcmV0dXJuIGVuLm1hcChlID0+IGVbMF0pO1xufVxuXG4vKipcbiAqIGFycmF544Gu5Lit44Gu5pyA5aSn5YCk44Gu44Kk44Oz44OH44OD44Kv44K544KS6L+U44GX44G+44GZ44CCXG4gKiBAcGFyYW0ge251bWJlcltdfSBhcnJheSBcbiAqL1xuZnVuY3Rpb24gYXJnbWF4KGFycmF5KSB7XG4gICAgbGV0IG1heEluZGV4O1xuICAgIGxldCBtYXhWYWx1ZSA9IC1JbmZpbml0eTtcbiAgICBmb3IgKGxldCBpID0gMDsgaSA8IGFycmF5Lmxlbmd0aDsgaSsrKSB7XG4gICAgICAgIGNvbnN0IHYgPSBhcnJheVtpXTtcbiAgICAgICAgaWYgKHYgPiBtYXhWYWx1ZSkge1xuICAgICAgICAgICAgbWF4SW5kZXggPSBpO1xuICAgICAgICAgICAgbWF4VmFsdWUgPSB2O1xuICAgICAgICB9XG4gICAgfVxuICAgIHJldHVybiBtYXhJbmRleDtcbn1cblxuLyoqXG4gKiBzdHLjga4zMi1iaXTjg4/jg4Pjgrfjg6XlgKTjgpLov5TjgZfjgb7jgZnjgIJcbiAqICjms6gpMTnot6/nm6Tjgafjga8zMi1iaXTjg4/jg4Pjgrfjg6XlgKTjga/ooZ3nqoHjgZnjgovjgajoqIDjgo/jgozjgabjgYTjgb7jgZnjgYzooZ3nqoHjgavjga/lr77lv5zjgZfjgabjgYTjgb7jgZvjgpPjgIJcbiAqIEBwYXJhbSB7c3RyaW5nfSBzdHIgXG4gKiBAcmV0dXJucyB7SW50ZWdlcn1cbiAqL1xuZnVuY3Rpb24gaGFzaChzdHIpIHtcbiAgICBsZXQgaGFzaCA9IDUzODE7XG4gICAgZm9yIChsZXQgaSA9IDA7IGkgPCBzdHIubGVuZ3RoOyBpKyspIHtcbiAgICAgICAgY29uc3QgY2hhciA9IHN0ci5jaGFyQ29kZUF0KGkpO1xuICAgICAgICBoYXNoID0gKGhhc2ggPDwgNSkgKyBoYXNoICsgY2hhcjsgLyogaGFzaCAqIDMzICsgYyAqL1xuICAgICAgICBoYXNoID0gaGFzaCAmIGhhc2g7IC8vIENvbnZlcnQgdG8gMzJiaXQgaW50ZWdlclxuICAgIH1cbiAgICByZXR1cm4gTWF0aC5hYnMoaGFzaCk7XG59XG5cbi8qKlxuICog5rip5bqm44OR44Op44Oh44O844K/44GC44KK44Gu44K944OV44OI44Oe44OD44Kv44K56Zai5pWw44Gn44GZ44CCXG4gKiBAcGFyYW0ge0Zsb2F0MzJBcnJheX0gaW5wdXQgXG4gKiBAcGFyYW0ge251bWJlcn0gdGVtcGVyYXR1cmVcbiAqIEByZXR1cm5zIHtGbG9hdDMyQXJyYXl9XG4gKi9cbmZ1bmN0aW9uIHNvZnRtYXgoaW5wdXQsIHRlbXBlcmF0dXJlID0gMS4wKSB7XG4gICAgY29uc3Qgb3V0cHV0ID0gbmV3IEZsb2F0MzJBcnJheShpbnB1dC5sZW5ndGgpO1xuICAgIGNvbnN0IGFscGhhID0gTWF0aC5tYXguYXBwbHkobnVsbCwgaW5wdXQpO1xuICAgIGxldCBkZW5vbSA9IDAuMDtcblxuICAgIGZvciAobGV0IGkgPSAwOyBpIDwgaW5wdXQubGVuZ3RoOyBpKyspIHtcbiAgICAgICAgY29uc3QgdmFsID0gTWF0aC5leHAoKGlucHV0W2ldIC0gYWxwaGEpIC8gdGVtcGVyYXR1cmUpO1xuICAgICAgICBkZW5vbSArPSB2YWw7XG4gICAgICAgIG91dHB1dFtpXSA9IHZhbDtcbiAgICB9XG5cbiAgICBmb3IgKGxldCBpID0gMDsgaSA8IG91dHB1dC5sZW5ndGg7IGkrKykge1xuICAgICAgICBvdXRwdXRbaV0gLz0gZGVub207XG4gICAgfVxuXG4gICAgcmV0dXJuIG91dHB1dDtcbn1cblxuZnVuY3Rpb24gcHJpbnRQcm9iKHByb2IsIHNpemUpIHtcbiAgICBmb3IgKGxldCB5ID0gMDsgeSA8IHNpemU7IHkrKykge1xuICAgICAgICBsZXQgc3RyID0gYCR7eSArIDF9IGA7XG4gICAgICAgIGZvciAobGV0IHggPSAwOyB4IDwgc2l6ZTsgeCsrKSB7XG4gICAgICAgICAgICBzdHIgKz0gKCcgICcgKyBwcm9iW3ggKyB5ICogc2l6ZV0udG9GaXhlZCgxKSkuc2xpY2UoLTUpO1xuICAgICAgICB9XG4gICAgICAgIGNvbnNvbGUubG9nKHN0cik7XG4gICAgfVxuICAgIGNvbnNvbGUubG9nKCdwYXNzPSVzJywgcHJvYltwcm9iLmxlbmd0aCAtIDFdLnRvRml4ZWQoMSkpO1xufSIsIid1c2Ugc3RyaWN0JztcblxudmFyIF93b3JrZXJSbWkgPSByZXF1aXJlKCd3b3JrZXItcm1pJyk7XG5cbnZhciBfYXpqc19lbmdpbmUgPSByZXF1aXJlKCcuL2F6anNfZW5naW5lLmpzJyk7XG5cbi8qKlxuICogQGZpbGUg44Km44Kn44OW44Ov44O844Kr44Gu44Ko44Oz44OI44Oq44O844Od44Kk44Oz44OI44Gn44GZ44CCXG4gKi9cbi8qXG4gKiBAYXV0aG9yIOW4guW3nembhOS6jFxuICogQGNvcHlyaWdodCAyMDE4IElDSElLQVdBLCBZdWppIChOZXcgMyBScylcbiAqIEBsaWNlbnNlIE1JVFxuICovXG4oMCwgX3dvcmtlclJtaS5yZXNpZ3RlcldvcmtlclJNSSkoc2VsZiwgX2F6anNfZW5naW5lLkFaanNFbmdpbmUpOyJdfQ==
