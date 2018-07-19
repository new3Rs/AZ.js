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
        const [move] = await this.mcts.search(this.b, Infinity, true, false);
        return move === this.b.C.PASS ? 'pass' : this.b.C.ev2xy(move);
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
const FEATURE_CNT = KEEP_PREV_CNT * 2 + 4;

/**
 * ニューラルネットワークの入力のインデックスを計算します。
 * @param {*} rv 碁盤の交点の線形座標
 * @param {*} f フィーチャー番号
 * @param {*} symmetry 対称変換
 */
function featureIndex(rv, f) {
    return rv * FEATURE_CNT + f;
}

/**
 * 碁盤の基本クラスです。
 */
class BaseBoard {
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

/**
 * 碁盤クラスです。
 */
class Board extends BaseBoard {
    /**
     * ニューラルネットワークを使用する際の入力フィーチャーを生成します。
     * @param {Integer} symmetry
     * @returns {Float32Array}
     */
    feature(symmetry = 0) {
        const array = new Float32Array(this.C.BVCNT * FEATURE_CNT);
        const my = this.turn;
        const opp = this.C.opponentOf(this.turn);

        const N = KEEP_PREV_CNT + 1;
        for (let p = 0; p < this.C.BVCNT; p++) {
            array[featureIndex(this.C.getSymmetricRawVertex(p, symmetry), 0)] = this.state[this.C.rv2ev(p)] === my ? 1.0 : 0.0;
        }
        for (let p = 0; p < this.C.BVCNT; p++) {
            array[featureIndex(this.C.getSymmetricRawVertex(p, symmetry), N)] = this.state[this.C.rv2ev(p)] === opp ? 1.0 : 0.0;
        }
        for (let i = 0; i < KEEP_PREV_CNT; i++) {
            for (let p = 0; p < this.C.BVCNT; p++) {
                array[featureIndex(this.C.getSymmetricRawVertex(p, symmetry), i + 1)] = this.prevState[i][this.C.rv2ev(p)] === my ? 1.0 : 0.0;
            }
            for (let p = 0; p < this.C.BVCNT; p++) {
                array[featureIndex(this.C.getSymmetricRawVertex(p, symmetry), N + i + 1)] = this.prevState[i][this.C.rv2ev(p)] === opp ? 1.0 : 0.0;
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
            array[featureIndex(p, FEATURE_CNT - 2)] = is_black_turn;
            array[featureIndex(p, FEATURE_CNT - 1)] = is_white_turn;
        }
        return array;
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
 * 碁盤の交点をxy座標で表すときも左下が原点です。xy座標は盤上左下が(1,1)です。
 * <pre style="font-family: Courier;">
 *       ###### #が盤外(実際の値はEXTERIOR)
 *     4|#....# .は盤上交点(実際の値はEMPTY)
 *     3|#....#
 *     2|#....#
 *     1|#....#
 *       ######
 *        1234
 * </pre>
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
        this.symmetricRawVertex = new Uint16Array(this.BVCNT * 8);
        this.initializeSymmetricRawVertex();
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

    initializeSymmetricRawVertex() {
        for (let sym = 0; sym < 8; sym++) {
            for (let rv = 0; rv < this.BVCNT; rv++) {
                this.symmetricRawVertex[rv * 8 + sym] = this.calcSymmetricRawVertex(rv, sym);
            }
        }
    }

    /**
     * 線形座標の対称変換を返します。
     * @param {Uint16} rv 線形座標
     * @param {Integer} symmetry 対称番号
     * @return {Uint16}
     */
    getSymmetricRawVertex(rv, symmetry) {
        return this.symmetricRawVertex[rv * 8 + symmetry];
    }

    /**
     * 線形座標の対称変換を計算して返します。
     * @param {Uint16} rv 線形座標
     * @param {Integer} symmetry 対称番号
     */
    calcSymmetricRawVertex(rv, symmetry) {
        const center = (this.BSIZE - 1) / 2;
        let x = rv % this.BSIZE - center;
        let y = Math.floor(rv / this.BSIZE) - center;
        if (symmetry >= 4) {
            // 鏡像変換
            x = -x;
        }
        let tmp;
        // 回転
        switch (symmetry % 4) {
            case 1:
                tmp = y;
                y = x;
                x = -tmp;
                break;
            case 2:
                x = -x;
                y = -y;
                break;
            case 3:
                tmp = y;
                y = -x;
                x = tmp;
                break;
        }
        return x + center + (y + center) * this.BSIZE;
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
     * ニューラルネットワークで局面を評価します。
     * ランダムに局面を対称変換させる機能を持ちます。
     * @param {Board} b
     * @param {bool} random
     * @returns {Float32Array[]}
     */
    async evaluate(b, random = true) {
        const symmetry = random ? Math.floor(Math.random() * 8) : 0;
        const [prob, value] = await this.nn.evaluate(b.feature(symmetry));
        if (symmetry !== 0) {
            const p = new Float32Array(prob.length);
            for (let rv = 0; rv < b.C.BVCNT; rv++) {
                p[rv] = prob[b.C.getSymmetricRawVertex(rv, symmetry)];
            }
            p[prob.length - 1] = prob[prob.length - 1];
            return [p, value];
        } else {
            return [prob, value];
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
            const [prob] = await this.evaluate(b);

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
        let [prob, value] = await this.evaluate(b);
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

        console.log('\nmove number=%d: left time=%s[sec] evaluated=%d', this.rootMoveNumber + 1, Math.max(this.leftTime - time, 0.0).toFixed(1), this.evalCount);
        this.printInfo(this.rootId, b.C);
        this.leftTime = this.leftTime - (Date.now() - start) / 1000;
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
            this.vAtr = this.libs[0];
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
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIm5vZGVfbW9kdWxlcy9icm93c2VyLXBhY2svX3ByZWx1ZGUuanMiLCJub2RlX21vZHVsZXMvYnNvbi1vYmplY3RpZC9vYmplY3RpZC5qcyIsIm5vZGVfbW9kdWxlcy9wcm9jZXNzL2Jyb3dzZXIuanMiLCJub2RlX21vZHVsZXMvd29ya2VyLXJtaS93b3JrZXItcm1pLmpzIiwic3JjL2F6anNfZW5naW5lLmpzIiwic3JjL2JvYXJkLmpzIiwic3JjL2JvYXJkX2NvbnN0YW50cy5qcyIsInNyYy9tY3RzLmpzIiwic3JjL25ldXJhbF9uZXR3b3JrX2NsaWVudC5qcyIsInNyYy9zdG9uZV9ncm91cC5qcyIsInNyYy91dGlscy5qcyIsInNyYy93b3JrZXIuanMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7O0FDQUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7Ozs7QUM5TkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUN4TEE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDM0tBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQzVKQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDMWZBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDL05BO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDeGdCQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUMzQkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNsRkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQzVJQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0EiLCJmaWxlIjoiZ2VuZXJhdGVkLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXNDb250ZW50IjpbIihmdW5jdGlvbigpe2Z1bmN0aW9uIHIoZSxuLHQpe2Z1bmN0aW9uIG8oaSxmKXtpZighbltpXSl7aWYoIWVbaV0pe3ZhciBjPVwiZnVuY3Rpb25cIj09dHlwZW9mIHJlcXVpcmUmJnJlcXVpcmU7aWYoIWYmJmMpcmV0dXJuIGMoaSwhMCk7aWYodSlyZXR1cm4gdShpLCEwKTt2YXIgYT1uZXcgRXJyb3IoXCJDYW5ub3QgZmluZCBtb2R1bGUgJ1wiK2krXCInXCIpO3Rocm93IGEuY29kZT1cIk1PRFVMRV9OT1RfRk9VTkRcIixhfXZhciBwPW5baV09e2V4cG9ydHM6e319O2VbaV1bMF0uY2FsbChwLmV4cG9ydHMsZnVuY3Rpb24ocil7dmFyIG49ZVtpXVsxXVtyXTtyZXR1cm4gbyhufHxyKX0scCxwLmV4cG9ydHMscixlLG4sdCl9cmV0dXJuIG5baV0uZXhwb3J0c31mb3IodmFyIHU9XCJmdW5jdGlvblwiPT10eXBlb2YgcmVxdWlyZSYmcmVxdWlyZSxpPTA7aTx0Lmxlbmd0aDtpKyspbyh0W2ldKTtyZXR1cm4gb31yZXR1cm4gcn0pKCkiLCJcbnZhciBNQUNISU5FX0lEID0gTWF0aC5mbG9vcihNYXRoLnJhbmRvbSgpICogMHhGRkZGRkYpO1xudmFyIGluZGV4ID0gT2JqZWN0SUQuaW5kZXggPSBwYXJzZUludChNYXRoLnJhbmRvbSgpICogMHhGRkZGRkYsIDEwKTtcbnZhciBwaWQgPSAodHlwZW9mIHByb2Nlc3MgPT09ICd1bmRlZmluZWQnIHx8IHR5cGVvZiBwcm9jZXNzLnBpZCAhPT0gJ251bWJlcicgPyBNYXRoLmZsb29yKE1hdGgucmFuZG9tKCkgKiAxMDAwMDApIDogcHJvY2Vzcy5waWQpICUgMHhGRkZGO1xuXG4vKipcbiAqIERldGVybWluZSBpZiBhbiBvYmplY3QgaXMgQnVmZmVyXG4gKlxuICogQXV0aG9yOiAgIEZlcm9zcyBBYm91a2hhZGlqZWggPGZlcm9zc0BmZXJvc3Mub3JnPiA8aHR0cDovL2Zlcm9zcy5vcmc+XG4gKiBMaWNlbnNlOiAgTUlUXG4gKlxuICovXG52YXIgaXNCdWZmZXIgPSBmdW5jdGlvbiAob2JqKSB7XG4gIHJldHVybiAhIShcbiAgb2JqICE9IG51bGwgJiZcbiAgb2JqLmNvbnN0cnVjdG9yICYmXG4gIHR5cGVvZiBvYmouY29uc3RydWN0b3IuaXNCdWZmZXIgPT09ICdmdW5jdGlvbicgJiZcbiAgb2JqLmNvbnN0cnVjdG9yLmlzQnVmZmVyKG9iailcbiAgKVxufTtcblxuLyoqXG4gKiBDcmVhdGUgYSBuZXcgaW1tdXRhYmxlIE9iamVjdElEIGluc3RhbmNlXG4gKlxuICogQGNsYXNzIFJlcHJlc2VudHMgdGhlIEJTT04gT2JqZWN0SUQgdHlwZVxuICogQHBhcmFtIHtTdHJpbmd8TnVtYmVyfSBhcmcgQ2FuIGJlIGEgMjQgYnl0ZSBoZXggc3RyaW5nLCAxMiBieXRlIGJpbmFyeSBzdHJpbmcgb3IgYSBOdW1iZXIuXG4gKiBAcmV0dXJuIHtPYmplY3R9IGluc3RhbmNlIG9mIE9iamVjdElELlxuICovXG5mdW5jdGlvbiBPYmplY3RJRChhcmcpIHtcbiAgaWYoISh0aGlzIGluc3RhbmNlb2YgT2JqZWN0SUQpKSByZXR1cm4gbmV3IE9iamVjdElEKGFyZyk7XG4gIGlmKGFyZyAmJiAoKGFyZyBpbnN0YW5jZW9mIE9iamVjdElEKSB8fCBhcmcuX2Jzb250eXBlPT09XCJPYmplY3RJRFwiKSlcbiAgICByZXR1cm4gYXJnO1xuXG4gIHZhciBidWY7XG5cbiAgaWYoaXNCdWZmZXIoYXJnKSB8fCAoQXJyYXkuaXNBcnJheShhcmcpICYmIGFyZy5sZW5ndGg9PT0xMikpIHtcbiAgICBidWYgPSBBcnJheS5wcm90b3R5cGUuc2xpY2UuY2FsbChhcmcpO1xuICB9XG4gIGVsc2UgaWYodHlwZW9mIGFyZyA9PT0gXCJzdHJpbmdcIikge1xuICAgIGlmKGFyZy5sZW5ndGghPT0xMiAmJiAhT2JqZWN0SUQuaXNWYWxpZChhcmcpKVxuICAgICAgdGhyb3cgbmV3IEVycm9yKFwiQXJndW1lbnQgcGFzc2VkIGluIG11c3QgYmUgYSBzaW5nbGUgU3RyaW5nIG9mIDEyIGJ5dGVzIG9yIGEgc3RyaW5nIG9mIDI0IGhleCBjaGFyYWN0ZXJzXCIpO1xuXG4gICAgYnVmID0gYnVmZmVyKGFyZyk7XG4gIH1cbiAgZWxzZSBpZigvbnVtYmVyfHVuZGVmaW5lZC8udGVzdCh0eXBlb2YgYXJnKSkge1xuICAgIGJ1ZiA9IGJ1ZmZlcihnZW5lcmF0ZShhcmcpKTtcbiAgfVxuXG4gIE9iamVjdC5kZWZpbmVQcm9wZXJ0eSh0aGlzLCBcImlkXCIsIHtcbiAgICBlbnVtZXJhYmxlOiB0cnVlLFxuICAgIGdldDogZnVuY3Rpb24oKSB7IHJldHVybiBTdHJpbmcuZnJvbUNoYXJDb2RlLmFwcGx5KHRoaXMsIGJ1Zik7IH1cbiAgfSk7XG4gIE9iamVjdC5kZWZpbmVQcm9wZXJ0eSh0aGlzLCBcInN0clwiLCB7XG4gICAgZ2V0OiBmdW5jdGlvbigpIHsgcmV0dXJuIGJ1Zi5tYXAoaGV4LmJpbmQodGhpcywgMikpLmpvaW4oJycpOyB9XG4gIH0pO1xufVxubW9kdWxlLmV4cG9ydHMgPSBPYmplY3RJRDtcbk9iamVjdElELmdlbmVyYXRlID0gZ2VuZXJhdGU7XG5PYmplY3RJRC5kZWZhdWx0ID0gT2JqZWN0SUQ7XG5cbi8qKlxuICogQ3JlYXRlcyBhbiBPYmplY3RJRCBmcm9tIGEgc2Vjb25kIGJhc2VkIG51bWJlciwgd2l0aCB0aGUgcmVzdCBvZiB0aGUgT2JqZWN0SUQgemVyb2VkIG91dC4gVXNlZCBmb3IgY29tcGFyaXNvbnMgb3Igc29ydGluZyB0aGUgT2JqZWN0SUQuXG4gKlxuICogQHBhcmFtIHtOdW1iZXJ9IHRpbWUgYW4gaW50ZWdlciBudW1iZXIgcmVwcmVzZW50aW5nIGEgbnVtYmVyIG9mIHNlY29uZHMuXG4gKiBAcmV0dXJuIHtPYmplY3RJRH0gcmV0dXJuIHRoZSBjcmVhdGVkIE9iamVjdElEXG4gKiBAYXBpIHB1YmxpY1xuICovXG5PYmplY3RJRC5jcmVhdGVGcm9tVGltZSA9IGZ1bmN0aW9uKHRpbWUpe1xuICB0aW1lID0gcGFyc2VJbnQodGltZSwgMTApICUgMHhGRkZGRkZGRjtcbiAgcmV0dXJuIG5ldyBPYmplY3RJRChoZXgoOCx0aW1lKStcIjAwMDAwMDAwMDAwMDAwMDBcIik7XG59O1xuXG4vKipcbiAqIENyZWF0ZXMgYW4gT2JqZWN0SUQgZnJvbSBhIGhleCBzdHJpbmcgcmVwcmVzZW50YXRpb24gb2YgYW4gT2JqZWN0SUQuXG4gKlxuICogQHBhcmFtIHtTdHJpbmd9IGhleFN0cmluZyBjcmVhdGUgYSBPYmplY3RJRCBmcm9tIGEgcGFzc2VkIGluIDI0IGJ5dGUgaGV4c3RyaW5nLlxuICogQHJldHVybiB7T2JqZWN0SUR9IHJldHVybiB0aGUgY3JlYXRlZCBPYmplY3RJRFxuICogQGFwaSBwdWJsaWNcbiAqL1xuT2JqZWN0SUQuY3JlYXRlRnJvbUhleFN0cmluZyA9IGZ1bmN0aW9uKGhleFN0cmluZykge1xuICBpZighT2JqZWN0SUQuaXNWYWxpZChoZXhTdHJpbmcpKVxuICAgIHRocm93IG5ldyBFcnJvcihcIkludmFsaWQgT2JqZWN0SUQgaGV4IHN0cmluZ1wiKTtcblxuICByZXR1cm4gbmV3IE9iamVjdElEKGhleFN0cmluZyk7XG59O1xuXG4vKipcbiAqIENoZWNrcyBpZiBhIHZhbHVlIGlzIGEgdmFsaWQgYnNvbiBPYmplY3RJZFxuICpcbiAqIEBwYXJhbSB7U3RyaW5nfSBvYmplY3RpZCBDYW4gYmUgYSAyNCBieXRlIGhleCBzdHJpbmcgb3IgYW4gaW5zdGFuY2Ugb2YgT2JqZWN0SUQuXG4gKiBAcmV0dXJuIHtCb29sZWFufSByZXR1cm4gdHJ1ZSBpZiB0aGUgdmFsdWUgaXMgYSB2YWxpZCBic29uIE9iamVjdElELCByZXR1cm4gZmFsc2Ugb3RoZXJ3aXNlLlxuICogQGFwaSBwdWJsaWNcbiAqXG4gKiBUSEUgTkFUSVZFIERPQ1VNRU5UQVRJT04gSVNOJ1QgQ0xFQVIgT04gVEhJUyBHVVkhXG4gKiBodHRwOi8vbW9uZ29kYi5naXRodWIuaW8vbm9kZS1tb25nb2RiLW5hdGl2ZS9hcGktYnNvbi1nZW5lcmF0ZWQvb2JqZWN0aWQuaHRtbCNvYmplY3RpZC1pc3ZhbGlkXG4gKi9cbk9iamVjdElELmlzVmFsaWQgPSBmdW5jdGlvbihvYmplY3RpZCkge1xuICBpZighb2JqZWN0aWQpIHJldHVybiBmYWxzZTtcblxuICAvL2NhbGwgLnRvU3RyaW5nKCkgdG8gZ2V0IHRoZSBoZXggaWYgd2UncmVcbiAgLy8gd29ya2luZyB3aXRoIGFuIGluc3RhbmNlIG9mIE9iamVjdElEXG4gIHJldHVybiAvXlswLTlBLUZdezI0fSQvaS50ZXN0KG9iamVjdGlkLnRvU3RyaW5nKCkpO1xufTtcblxuLyoqXG4gKiBzZXQgYSBjdXN0b20gbWFjaGluZUlEXG4gKiBcbiAqIEBwYXJhbSB7U3RyaW5nfE51bWJlcn0gbWFjaGluZWlkIENhbiBiZSBhIHN0cmluZywgaGV4LXN0cmluZyBvciBhIG51bWJlclxuICogQHJldHVybiB7dm9pZH1cbiAqIEBhcGkgcHVibGljXG4gKi9cbk9iamVjdElELnNldE1hY2hpbmVJRCA9IGZ1bmN0aW9uKGFyZykge1xuICB2YXIgbWFjaGluZUlEO1xuXG4gIGlmKHR5cGVvZiBhcmcgPT09IFwic3RyaW5nXCIpIHtcbiAgICAvLyBoZXggc3RyaW5nXG4gICAgbWFjaGluZUlEID0gcGFyc2VJbnQoYXJnLCAxNik7XG4gICBcbiAgICAvLyBhbnkgc3RyaW5nXG4gICAgaWYoaXNOYU4obWFjaGluZUlEKSkge1xuICAgICAgYXJnID0gKCcwMDAwMDAnICsgYXJnKS5zdWJzdHIoLTcsNik7XG5cbiAgICAgIG1hY2hpbmVJRCA9IFwiXCI7XG4gICAgICBmb3IodmFyIGkgPSAwO2k8NjsgaSsrKSB7XG4gICAgICAgIG1hY2hpbmVJRCArPSAoYXJnLmNoYXJDb2RlQXQoaSkpO1xuICAgICAgfVxuICAgIH1cbiAgfVxuICBlbHNlIGlmKC9udW1iZXJ8dW5kZWZpbmVkLy50ZXN0KHR5cGVvZiBhcmcpKSB7XG4gICAgbWFjaGluZUlEID0gYXJnIHwgMDtcbiAgfVxuXG4gIE1BQ0hJTkVfSUQgPSAobWFjaGluZUlEICYgMHhGRkZGRkYpO1xufVxuXG4vKipcbiAqIGdldCB0aGUgbWFjaGluZUlEXG4gKiBcbiAqIEByZXR1cm4ge251bWJlcn1cbiAqIEBhcGkgcHVibGljXG4gKi9cbk9iamVjdElELmdldE1hY2hpbmVJRCA9IGZ1bmN0aW9uKCkge1xuICByZXR1cm4gTUFDSElORV9JRDtcbn1cblxuT2JqZWN0SUQucHJvdG90eXBlID0ge1xuICBfYnNvbnR5cGU6ICdPYmplY3RJRCcsXG4gIGNvbnN0cnVjdG9yOiBPYmplY3RJRCxcblxuICAvKipcbiAgICogUmV0dXJuIHRoZSBPYmplY3RJRCBpZCBhcyBhIDI0IGJ5dGUgaGV4IHN0cmluZyByZXByZXNlbnRhdGlvblxuICAgKlxuICAgKiBAcmV0dXJuIHtTdHJpbmd9IHJldHVybiB0aGUgMjQgYnl0ZSBoZXggc3RyaW5nIHJlcHJlc2VudGF0aW9uLlxuICAgKiBAYXBpIHB1YmxpY1xuICAgKi9cbiAgdG9IZXhTdHJpbmc6IGZ1bmN0aW9uKCkge1xuICAgIHJldHVybiB0aGlzLnN0cjtcbiAgfSxcblxuICAvKipcbiAgICogQ29tcGFyZXMgdGhlIGVxdWFsaXR5IG9mIHRoaXMgT2JqZWN0SUQgd2l0aCBgb3RoZXJJRGAuXG4gICAqXG4gICAqIEBwYXJhbSB7T2JqZWN0fSBvdGhlciBPYmplY3RJRCBpbnN0YW5jZSB0byBjb21wYXJlIGFnYWluc3QuXG4gICAqIEByZXR1cm4ge0Jvb2xlYW59IHRoZSByZXN1bHQgb2YgY29tcGFyaW5nIHR3byBPYmplY3RJRCdzXG4gICAqIEBhcGkgcHVibGljXG4gICAqL1xuICBlcXVhbHM6IGZ1bmN0aW9uIChvdGhlcil7XG4gICAgcmV0dXJuICEhb3RoZXIgJiYgdGhpcy5zdHIgPT09IG90aGVyLnRvU3RyaW5nKCk7XG4gIH0sXG5cbiAgLyoqXG4gICAqIFJldHVybnMgdGhlIGdlbmVyYXRpb24gZGF0ZSAoYWNjdXJhdGUgdXAgdG8gdGhlIHNlY29uZCkgdGhhdCB0aGlzIElEIHdhcyBnZW5lcmF0ZWQuXG4gICAqXG4gICAqIEByZXR1cm4ge0RhdGV9IHRoZSBnZW5lcmF0aW9uIGRhdGVcbiAgICogQGFwaSBwdWJsaWNcbiAgICovXG4gIGdldFRpbWVzdGFtcDogZnVuY3Rpb24oKXtcbiAgICByZXR1cm4gbmV3IERhdGUocGFyc2VJbnQodGhpcy5zdHIuc3Vic3RyKDAsOCksIDE2KSAqIDEwMDApO1xuICB9XG59O1xuXG5mdW5jdGlvbiBuZXh0KCkge1xuICByZXR1cm4gaW5kZXggPSAoaW5kZXgrMSkgJSAweEZGRkZGRjtcbn1cblxuZnVuY3Rpb24gZ2VuZXJhdGUodGltZSkge1xuICBpZiAodHlwZW9mIHRpbWUgIT09ICdudW1iZXInKVxuICAgIHRpbWUgPSBEYXRlLm5vdygpLzEwMDA7XG5cbiAgLy9rZWVwIGl0IGluIHRoZSByaW5nIVxuICB0aW1lID0gcGFyc2VJbnQodGltZSwgMTApICUgMHhGRkZGRkZGRjtcblxuICAvL0ZGRkZGRkZGIEZGRkZGRiBGRkZGIEZGRkZGRlxuICByZXR1cm4gaGV4KDgsdGltZSkgKyBoZXgoNixNQUNISU5FX0lEKSArIGhleCg0LHBpZCkgKyBoZXgoNixuZXh0KCkpO1xufVxuXG5mdW5jdGlvbiBoZXgobGVuZ3RoLCBuKSB7XG4gIG4gPSBuLnRvU3RyaW5nKDE2KTtcbiAgcmV0dXJuIChuLmxlbmd0aD09PWxlbmd0aCk/IG4gOiBcIjAwMDAwMDAwXCIuc3Vic3RyaW5nKG4ubGVuZ3RoLCBsZW5ndGgpICsgbjtcbn1cblxuZnVuY3Rpb24gYnVmZmVyKHN0cikge1xuICB2YXIgaT0wLG91dD1bXTtcblxuICBpZihzdHIubGVuZ3RoPT09MjQpXG4gICAgZm9yKDtpPDI0OyBvdXQucHVzaChwYXJzZUludChzdHJbaV0rc3RyW2krMV0sIDE2KSksaSs9Mik7XG5cbiAgZWxzZSBpZihzdHIubGVuZ3RoPT09MTIpXG4gICAgZm9yKDtpPDEyOyBvdXQucHVzaChzdHIuY2hhckNvZGVBdChpKSksaSsrKTtcblxuICByZXR1cm4gb3V0O1xufVxuXG4vKipcbiAqIENvbnZlcnRzIHRvIGEgc3RyaW5nIHJlcHJlc2VudGF0aW9uIG9mIHRoaXMgSWQuXG4gKlxuICogQHJldHVybiB7U3RyaW5nfSByZXR1cm4gdGhlIDI0IGJ5dGUgaGV4IHN0cmluZyByZXByZXNlbnRhdGlvbi5cbiAqIEBhcGkgcHJpdmF0ZVxuICovXG5PYmplY3RJRC5wcm90b3R5cGUuaW5zcGVjdCA9IGZ1bmN0aW9uKCkgeyByZXR1cm4gXCJPYmplY3RJRChcIit0aGlzK1wiKVwiIH07XG5PYmplY3RJRC5wcm90b3R5cGUudG9KU09OID0gT2JqZWN0SUQucHJvdG90eXBlLnRvSGV4U3RyaW5nO1xuT2JqZWN0SUQucHJvdG90eXBlLnRvU3RyaW5nID0gT2JqZWN0SUQucHJvdG90eXBlLnRvSGV4U3RyaW5nO1xuIiwiLy8gc2hpbSBmb3IgdXNpbmcgcHJvY2VzcyBpbiBicm93c2VyXG52YXIgcHJvY2VzcyA9IG1vZHVsZS5leHBvcnRzID0ge307XG5cbi8vIGNhY2hlZCBmcm9tIHdoYXRldmVyIGdsb2JhbCBpcyBwcmVzZW50IHNvIHRoYXQgdGVzdCBydW5uZXJzIHRoYXQgc3R1YiBpdFxuLy8gZG9uJ3QgYnJlYWsgdGhpbmdzLiAgQnV0IHdlIG5lZWQgdG8gd3JhcCBpdCBpbiBhIHRyeSBjYXRjaCBpbiBjYXNlIGl0IGlzXG4vLyB3cmFwcGVkIGluIHN0cmljdCBtb2RlIGNvZGUgd2hpY2ggZG9lc24ndCBkZWZpbmUgYW55IGdsb2JhbHMuICBJdCdzIGluc2lkZSBhXG4vLyBmdW5jdGlvbiBiZWNhdXNlIHRyeS9jYXRjaGVzIGRlb3B0aW1pemUgaW4gY2VydGFpbiBlbmdpbmVzLlxuXG52YXIgY2FjaGVkU2V0VGltZW91dDtcbnZhciBjYWNoZWRDbGVhclRpbWVvdXQ7XG5cbmZ1bmN0aW9uIGRlZmF1bHRTZXRUaW1vdXQoKSB7XG4gICAgdGhyb3cgbmV3IEVycm9yKCdzZXRUaW1lb3V0IGhhcyBub3QgYmVlbiBkZWZpbmVkJyk7XG59XG5mdW5jdGlvbiBkZWZhdWx0Q2xlYXJUaW1lb3V0ICgpIHtcbiAgICB0aHJvdyBuZXcgRXJyb3IoJ2NsZWFyVGltZW91dCBoYXMgbm90IGJlZW4gZGVmaW5lZCcpO1xufVxuKGZ1bmN0aW9uICgpIHtcbiAgICB0cnkge1xuICAgICAgICBpZiAodHlwZW9mIHNldFRpbWVvdXQgPT09ICdmdW5jdGlvbicpIHtcbiAgICAgICAgICAgIGNhY2hlZFNldFRpbWVvdXQgPSBzZXRUaW1lb3V0O1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgY2FjaGVkU2V0VGltZW91dCA9IGRlZmF1bHRTZXRUaW1vdXQ7XG4gICAgICAgIH1cbiAgICB9IGNhdGNoIChlKSB7XG4gICAgICAgIGNhY2hlZFNldFRpbWVvdXQgPSBkZWZhdWx0U2V0VGltb3V0O1xuICAgIH1cbiAgICB0cnkge1xuICAgICAgICBpZiAodHlwZW9mIGNsZWFyVGltZW91dCA9PT0gJ2Z1bmN0aW9uJykge1xuICAgICAgICAgICAgY2FjaGVkQ2xlYXJUaW1lb3V0ID0gY2xlYXJUaW1lb3V0O1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgY2FjaGVkQ2xlYXJUaW1lb3V0ID0gZGVmYXVsdENsZWFyVGltZW91dDtcbiAgICAgICAgfVxuICAgIH0gY2F0Y2ggKGUpIHtcbiAgICAgICAgY2FjaGVkQ2xlYXJUaW1lb3V0ID0gZGVmYXVsdENsZWFyVGltZW91dDtcbiAgICB9XG59ICgpKVxuZnVuY3Rpb24gcnVuVGltZW91dChmdW4pIHtcbiAgICBpZiAoY2FjaGVkU2V0VGltZW91dCA9PT0gc2V0VGltZW91dCkge1xuICAgICAgICAvL25vcm1hbCBlbnZpcm9tZW50cyBpbiBzYW5lIHNpdHVhdGlvbnNcbiAgICAgICAgcmV0dXJuIHNldFRpbWVvdXQoZnVuLCAwKTtcbiAgICB9XG4gICAgLy8gaWYgc2V0VGltZW91dCB3YXNuJ3QgYXZhaWxhYmxlIGJ1dCB3YXMgbGF0dGVyIGRlZmluZWRcbiAgICBpZiAoKGNhY2hlZFNldFRpbWVvdXQgPT09IGRlZmF1bHRTZXRUaW1vdXQgfHwgIWNhY2hlZFNldFRpbWVvdXQpICYmIHNldFRpbWVvdXQpIHtcbiAgICAgICAgY2FjaGVkU2V0VGltZW91dCA9IHNldFRpbWVvdXQ7XG4gICAgICAgIHJldHVybiBzZXRUaW1lb3V0KGZ1biwgMCk7XG4gICAgfVxuICAgIHRyeSB7XG4gICAgICAgIC8vIHdoZW4gd2hlbiBzb21lYm9keSBoYXMgc2NyZXdlZCB3aXRoIHNldFRpbWVvdXQgYnV0IG5vIEkuRS4gbWFkZG5lc3NcbiAgICAgICAgcmV0dXJuIGNhY2hlZFNldFRpbWVvdXQoZnVuLCAwKTtcbiAgICB9IGNhdGNoKGUpe1xuICAgICAgICB0cnkge1xuICAgICAgICAgICAgLy8gV2hlbiB3ZSBhcmUgaW4gSS5FLiBidXQgdGhlIHNjcmlwdCBoYXMgYmVlbiBldmFsZWQgc28gSS5FLiBkb2Vzbid0IHRydXN0IHRoZSBnbG9iYWwgb2JqZWN0IHdoZW4gY2FsbGVkIG5vcm1hbGx5XG4gICAgICAgICAgICByZXR1cm4gY2FjaGVkU2V0VGltZW91dC5jYWxsKG51bGwsIGZ1biwgMCk7XG4gICAgICAgIH0gY2F0Y2goZSl7XG4gICAgICAgICAgICAvLyBzYW1lIGFzIGFib3ZlIGJ1dCB3aGVuIGl0J3MgYSB2ZXJzaW9uIG9mIEkuRS4gdGhhdCBtdXN0IGhhdmUgdGhlIGdsb2JhbCBvYmplY3QgZm9yICd0aGlzJywgaG9wZnVsbHkgb3VyIGNvbnRleHQgY29ycmVjdCBvdGhlcndpc2UgaXQgd2lsbCB0aHJvdyBhIGdsb2JhbCBlcnJvclxuICAgICAgICAgICAgcmV0dXJuIGNhY2hlZFNldFRpbWVvdXQuY2FsbCh0aGlzLCBmdW4sIDApO1xuICAgICAgICB9XG4gICAgfVxuXG5cbn1cbmZ1bmN0aW9uIHJ1bkNsZWFyVGltZW91dChtYXJrZXIpIHtcbiAgICBpZiAoY2FjaGVkQ2xlYXJUaW1lb3V0ID09PSBjbGVhclRpbWVvdXQpIHtcbiAgICAgICAgLy9ub3JtYWwgZW52aXJvbWVudHMgaW4gc2FuZSBzaXR1YXRpb25zXG4gICAgICAgIHJldHVybiBjbGVhclRpbWVvdXQobWFya2VyKTtcbiAgICB9XG4gICAgLy8gaWYgY2xlYXJUaW1lb3V0IHdhc24ndCBhdmFpbGFibGUgYnV0IHdhcyBsYXR0ZXIgZGVmaW5lZFxuICAgIGlmICgoY2FjaGVkQ2xlYXJUaW1lb3V0ID09PSBkZWZhdWx0Q2xlYXJUaW1lb3V0IHx8ICFjYWNoZWRDbGVhclRpbWVvdXQpICYmIGNsZWFyVGltZW91dCkge1xuICAgICAgICBjYWNoZWRDbGVhclRpbWVvdXQgPSBjbGVhclRpbWVvdXQ7XG4gICAgICAgIHJldHVybiBjbGVhclRpbWVvdXQobWFya2VyKTtcbiAgICB9XG4gICAgdHJ5IHtcbiAgICAgICAgLy8gd2hlbiB3aGVuIHNvbWVib2R5IGhhcyBzY3Jld2VkIHdpdGggc2V0VGltZW91dCBidXQgbm8gSS5FLiBtYWRkbmVzc1xuICAgICAgICByZXR1cm4gY2FjaGVkQ2xlYXJUaW1lb3V0KG1hcmtlcik7XG4gICAgfSBjYXRjaCAoZSl7XG4gICAgICAgIHRyeSB7XG4gICAgICAgICAgICAvLyBXaGVuIHdlIGFyZSBpbiBJLkUuIGJ1dCB0aGUgc2NyaXB0IGhhcyBiZWVuIGV2YWxlZCBzbyBJLkUuIGRvZXNuJ3QgIHRydXN0IHRoZSBnbG9iYWwgb2JqZWN0IHdoZW4gY2FsbGVkIG5vcm1hbGx5XG4gICAgICAgICAgICByZXR1cm4gY2FjaGVkQ2xlYXJUaW1lb3V0LmNhbGwobnVsbCwgbWFya2VyKTtcbiAgICAgICAgfSBjYXRjaCAoZSl7XG4gICAgICAgICAgICAvLyBzYW1lIGFzIGFib3ZlIGJ1dCB3aGVuIGl0J3MgYSB2ZXJzaW9uIG9mIEkuRS4gdGhhdCBtdXN0IGhhdmUgdGhlIGdsb2JhbCBvYmplY3QgZm9yICd0aGlzJywgaG9wZnVsbHkgb3VyIGNvbnRleHQgY29ycmVjdCBvdGhlcndpc2UgaXQgd2lsbCB0aHJvdyBhIGdsb2JhbCBlcnJvci5cbiAgICAgICAgICAgIC8vIFNvbWUgdmVyc2lvbnMgb2YgSS5FLiBoYXZlIGRpZmZlcmVudCBydWxlcyBmb3IgY2xlYXJUaW1lb3V0IHZzIHNldFRpbWVvdXRcbiAgICAgICAgICAgIHJldHVybiBjYWNoZWRDbGVhclRpbWVvdXQuY2FsbCh0aGlzLCBtYXJrZXIpO1xuICAgICAgICB9XG4gICAgfVxuXG5cblxufVxudmFyIHF1ZXVlID0gW107XG52YXIgZHJhaW5pbmcgPSBmYWxzZTtcbnZhciBjdXJyZW50UXVldWU7XG52YXIgcXVldWVJbmRleCA9IC0xO1xuXG5mdW5jdGlvbiBjbGVhblVwTmV4dFRpY2soKSB7XG4gICAgaWYgKCFkcmFpbmluZyB8fCAhY3VycmVudFF1ZXVlKSB7XG4gICAgICAgIHJldHVybjtcbiAgICB9XG4gICAgZHJhaW5pbmcgPSBmYWxzZTtcbiAgICBpZiAoY3VycmVudFF1ZXVlLmxlbmd0aCkge1xuICAgICAgICBxdWV1ZSA9IGN1cnJlbnRRdWV1ZS5jb25jYXQocXVldWUpO1xuICAgIH0gZWxzZSB7XG4gICAgICAgIHF1ZXVlSW5kZXggPSAtMTtcbiAgICB9XG4gICAgaWYgKHF1ZXVlLmxlbmd0aCkge1xuICAgICAgICBkcmFpblF1ZXVlKCk7XG4gICAgfVxufVxuXG5mdW5jdGlvbiBkcmFpblF1ZXVlKCkge1xuICAgIGlmIChkcmFpbmluZykge1xuICAgICAgICByZXR1cm47XG4gICAgfVxuICAgIHZhciB0aW1lb3V0ID0gcnVuVGltZW91dChjbGVhblVwTmV4dFRpY2spO1xuICAgIGRyYWluaW5nID0gdHJ1ZTtcblxuICAgIHZhciBsZW4gPSBxdWV1ZS5sZW5ndGg7XG4gICAgd2hpbGUobGVuKSB7XG4gICAgICAgIGN1cnJlbnRRdWV1ZSA9IHF1ZXVlO1xuICAgICAgICBxdWV1ZSA9IFtdO1xuICAgICAgICB3aGlsZSAoKytxdWV1ZUluZGV4IDwgbGVuKSB7XG4gICAgICAgICAgICBpZiAoY3VycmVudFF1ZXVlKSB7XG4gICAgICAgICAgICAgICAgY3VycmVudFF1ZXVlW3F1ZXVlSW5kZXhdLnJ1bigpO1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICAgIHF1ZXVlSW5kZXggPSAtMTtcbiAgICAgICAgbGVuID0gcXVldWUubGVuZ3RoO1xuICAgIH1cbiAgICBjdXJyZW50UXVldWUgPSBudWxsO1xuICAgIGRyYWluaW5nID0gZmFsc2U7XG4gICAgcnVuQ2xlYXJUaW1lb3V0KHRpbWVvdXQpO1xufVxuXG5wcm9jZXNzLm5leHRUaWNrID0gZnVuY3Rpb24gKGZ1bikge1xuICAgIHZhciBhcmdzID0gbmV3IEFycmF5KGFyZ3VtZW50cy5sZW5ndGggLSAxKTtcbiAgICBpZiAoYXJndW1lbnRzLmxlbmd0aCA+IDEpIHtcbiAgICAgICAgZm9yICh2YXIgaSA9IDE7IGkgPCBhcmd1bWVudHMubGVuZ3RoOyBpKyspIHtcbiAgICAgICAgICAgIGFyZ3NbaSAtIDFdID0gYXJndW1lbnRzW2ldO1xuICAgICAgICB9XG4gICAgfVxuICAgIHF1ZXVlLnB1c2gobmV3IEl0ZW0oZnVuLCBhcmdzKSk7XG4gICAgaWYgKHF1ZXVlLmxlbmd0aCA9PT0gMSAmJiAhZHJhaW5pbmcpIHtcbiAgICAgICAgcnVuVGltZW91dChkcmFpblF1ZXVlKTtcbiAgICB9XG59O1xuXG4vLyB2OCBsaWtlcyBwcmVkaWN0aWJsZSBvYmplY3RzXG5mdW5jdGlvbiBJdGVtKGZ1biwgYXJyYXkpIHtcbiAgICB0aGlzLmZ1biA9IGZ1bjtcbiAgICB0aGlzLmFycmF5ID0gYXJyYXk7XG59XG5JdGVtLnByb3RvdHlwZS5ydW4gPSBmdW5jdGlvbiAoKSB7XG4gICAgdGhpcy5mdW4uYXBwbHkobnVsbCwgdGhpcy5hcnJheSk7XG59O1xucHJvY2Vzcy50aXRsZSA9ICdicm93c2VyJztcbnByb2Nlc3MuYnJvd3NlciA9IHRydWU7XG5wcm9jZXNzLmVudiA9IHt9O1xucHJvY2Vzcy5hcmd2ID0gW107XG5wcm9jZXNzLnZlcnNpb24gPSAnJzsgLy8gZW1wdHkgc3RyaW5nIHRvIGF2b2lkIHJlZ2V4cCBpc3N1ZXNcbnByb2Nlc3MudmVyc2lvbnMgPSB7fTtcblxuZnVuY3Rpb24gbm9vcCgpIHt9XG5cbnByb2Nlc3Mub24gPSBub29wO1xucHJvY2Vzcy5hZGRMaXN0ZW5lciA9IG5vb3A7XG5wcm9jZXNzLm9uY2UgPSBub29wO1xucHJvY2Vzcy5vZmYgPSBub29wO1xucHJvY2Vzcy5yZW1vdmVMaXN0ZW5lciA9IG5vb3A7XG5wcm9jZXNzLnJlbW92ZUFsbExpc3RlbmVycyA9IG5vb3A7XG5wcm9jZXNzLmVtaXQgPSBub29wO1xucHJvY2Vzcy5wcmVwZW5kTGlzdGVuZXIgPSBub29wO1xucHJvY2Vzcy5wcmVwZW5kT25jZUxpc3RlbmVyID0gbm9vcDtcblxucHJvY2Vzcy5saXN0ZW5lcnMgPSBmdW5jdGlvbiAobmFtZSkgeyByZXR1cm4gW10gfVxuXG5wcm9jZXNzLmJpbmRpbmcgPSBmdW5jdGlvbiAobmFtZSkge1xuICAgIHRocm93IG5ldyBFcnJvcigncHJvY2Vzcy5iaW5kaW5nIGlzIG5vdCBzdXBwb3J0ZWQnKTtcbn07XG5cbnByb2Nlc3MuY3dkID0gZnVuY3Rpb24gKCkgeyByZXR1cm4gJy8nIH07XG5wcm9jZXNzLmNoZGlyID0gZnVuY3Rpb24gKGRpcikge1xuICAgIHRocm93IG5ldyBFcnJvcigncHJvY2Vzcy5jaGRpciBpcyBub3Qgc3VwcG9ydGVkJyk7XG59O1xucHJvY2Vzcy51bWFzayA9IGZ1bmN0aW9uKCkgeyByZXR1cm4gMDsgfTtcbiIsIi8qIGdsb2JhbCBleHBvcnRzICovXG4vKipcbiAqIEBmaWxlb3ZlcnZpZXcgYSB0aW55IGxpYnJhcnkgZm9yIFdlYiBXb3JrZXIgUmVtb3RlIE1ldGhvZCBJbnZvY2F0aW9uXG4gKlxuICovXG5jb25zdCBPYmplY3RJRCA9IHJlcXVpcmUoJ2Jzb24tb2JqZWN0aWQnKTtcblxuLyoqXG4gKiBAcHJpdmF0ZSByZXR1cm5zIGEgbGlzdCBvZiBUcmFuc2ZlcmFibGUgb2JqZWN0cyB3aGljaCB7QGNvZGUgb2JqfSBpbmNsdWRlc1xuICogQHBhcmFtIHtvYmplY3R9IG9iaiBhbnkgb2JqZWN0XG4gKiBAcGFyYW0ge0FycmF5fSBsaXN0IGZvciBpbnRlcm5hbCByZWN1cnNpb24gb25seVxuICogQHJldHVybiB7TGlzdH0gYSBsaXN0IG9mIFRyYW5zZmVyYWJsZSBvYmplY3RzXG4gKi9cbmZ1bmN0aW9uIGdldFRyYW5zZmVyTGlzdChvYmosIGxpc3QgPSBbXSkge1xuICAgIGlmIChBcnJheUJ1ZmZlci5pc1ZpZXcob2JqKSkge1xuICAgICAgICBsaXN0LnB1c2gob2JqLmJ1ZmZlcik7XG4gICAgICAgIHJldHVybiBsaXN0O1xuICAgIH1cbiAgICBpZiAoaXNUcmFuc2ZlcmFibGUob2JqKSkge1xuICAgICAgICBsaXN0LnB1c2gob2JqKTtcbiAgICAgICAgcmV0dXJuIGxpc3Q7XG4gICAgfVxuICAgIGlmICghKHR5cGVvZiBvYmogPT09ICdvYmplY3QnKSkge1xuICAgICAgICByZXR1cm4gbGlzdDtcbiAgICB9XG4gICAgZm9yIChjb25zdCBwcm9wIGluIG9iaikge1xuICAgICAgICBpZiAob2JqLmhhc093blByb3BlcnR5KHByb3ApKSB7XG4gICAgICAgICAgICBnZXRUcmFuc2Zlckxpc3Qob2JqW3Byb3BdLCBsaXN0KTtcbiAgICAgICAgfVxuICAgIH1cbiAgICByZXR1cm4gbGlzdDtcbn1cblxuLyoqXG4gKiBAcHJpdmF0ZSBjaGVja3MgaWYge0Bjb2RlIG9ian0gaXMgVHJhbnNmZXJhYmxlIG9yIG5vdC5cbiAqIEBwYXJhbSB7b2JqZWN0fSBvYmogYW55IG9iamVjdFxuICogQHJldHVybiB7Ym9vbGVhbn1cbiAqL1xuZnVuY3Rpb24gaXNUcmFuc2ZlcmFibGUob2JqKSB7XG4gICAgY29uc3QgdHJhbnNmZXJhYmxlID0gW0FycmF5QnVmZmVyXTtcbiAgICBpZiAodHlwZW9mIE1lc3NhZ2VQb3J0ICE9PSAndW5kZWZpbmVkJykge1xuICAgICAgICB0cmFuc2ZlcmFibGUucHVzaChNZXNzYWdlUG9ydCk7XG4gICAgfVxuICAgIGlmICh0eXBlb2YgSW1hZ2VCaXRtYXAgIT09ICd1bmRlZmluZWQnKSB7XG4gICAgICAgIHRyYW5zZmVyYWJsZS5wdXNoKEltYWdlQml0bWFwKTtcbiAgICB9XG4gICAgcmV0dXJuIHRyYW5zZmVyYWJsZS5zb21lKGUgPT4gb2JqIGluc3RhbmNlb2YgZSk7XG59XG5cbi8qKlxuICogQGNsYXNzIGJhc2UgY2xhc3Mgd2hvc2UgY2hpbGQgY2xhc3NlcyB1c2UgUk1JXG4gKi9cbmNsYXNzIFdvcmtlclJNSSB7XG4gICAgLyoqXG4gICAgICogQGNvbnN0cnVjdG9yXG4gICAgICogQHBhcmFtIHtvYmplY3R9IHJlbW90ZSBhbiBpbnN0YW5jZSB0byBjYWxsIHBvc3RNZXNzYWdlIG1ldGhvZFxuICAgICAqIEBwYXJhbSB7QXJyYXl9IGFyZ3MgYXJndW1lbnRzIHRvIGJlIHBhc3NlZCB0byBzZXJ2ZXItc2lkZSBpbnN0YW5jZVxuICAgICAqL1xuICAgIGNvbnN0cnVjdG9yKHJlbW90ZSwgLi4uYXJncykge1xuICAgICAgICB0aGlzLnJlbW90ZSA9IHJlbW90ZTtcbiAgICAgICAgdGhpcy5pZCA9IE9iamVjdElEKCkudG9TdHJpbmcoKTtcbiAgICAgICAgdGhpcy5tZXRob2RTdGF0ZXMgPSB7fTtcbiAgICAgICAgdGhpcy5yZW1vdGUuYWRkRXZlbnRMaXN0ZW5lcignbWVzc2FnZScsIGV2ZW50ID0+IHtcbiAgICAgICAgICAgIGNvbnN0IGRhdGEgPSBldmVudC5kYXRhO1xuICAgICAgICAgICAgaWYgKGRhdGEuaWQgPT09IHRoaXMuaWQpIHtcbiAgICAgICAgICAgICAgICB0aGlzLnJldHVybkhhbmRsZXIoZGF0YSk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH0sIGZhbHNlKTtcbiAgICAgICAgdGhpcy5jb25zdHJ1Y3RvclByb21pc2UgPSB0aGlzLmludm9rZVJNKHRoaXMuY29uc3RydWN0b3IubmFtZSwgYXJncyk7XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogaW52b2tlcyByZW1vdGUgbWV0aG9kXG4gICAgICogQHBhcmFtIHtzdHJpbmd9IG1ldGhvZE5hbWUgTWV0aG9kIG5hbWVcbiAgICAgKiBAcGFyYW0ge0FycmF5fSBhcmdzIGFyZ3VtZW50cyB0byBiZSBwYXNzZWQgdG8gc2VydmVyLXNpZGUgaW5zdGFuY2VcbiAgICAgKiBAcmV0dXJuIHtQcm9taXNlfVxuICAgICAqL1xuICAgIGludm9rZVJNKG1ldGhvZE5hbWUsIGFyZ3MgPSBbXSkge1xuICAgICAgICBpZiAoIXRoaXMubWV0aG9kU3RhdGVzW21ldGhvZE5hbWVdKSB7XG4gICAgICAgICAgICB0aGlzLm1ldGhvZFN0YXRlc1ttZXRob2ROYW1lXSA9IHtcbiAgICAgICAgICAgICAgICBudW06IDAsXG4gICAgICAgICAgICAgICAgcmVzb2x2ZVJlamVjdHM6IHt9XG4gICAgICAgICAgICB9O1xuICAgICAgICB9XG4gICAgICAgIHJldHVybiBuZXcgUHJvbWlzZSgocmVzb2x2ZSwgcmVqZWN0KSA9PiB7XG4gICAgICAgICAgICBjb25zdCBtZXRob2RTdGF0ZSA9IHRoaXMubWV0aG9kU3RhdGVzW21ldGhvZE5hbWVdO1xuICAgICAgICAgICAgbWV0aG9kU3RhdGUubnVtICs9IDE7XG4gICAgICAgICAgICBtZXRob2RTdGF0ZS5yZXNvbHZlUmVqZWN0c1ttZXRob2RTdGF0ZS5udW1dID0geyByZXNvbHZlLCByZWplY3QgfTtcbiAgICAgICAgICAgIHRoaXMucmVtb3RlLnBvc3RNZXNzYWdlKHtcbiAgICAgICAgICAgICAgICBpZDogdGhpcy5pZCxcbiAgICAgICAgICAgICAgICBtZXRob2ROYW1lLFxuICAgICAgICAgICAgICAgIG51bTogbWV0aG9kU3RhdGUubnVtLFxuICAgICAgICAgICAgICAgIGFyZ3NcbiAgICAgICAgICAgIH0sIGdldFRyYW5zZmVyTGlzdChhcmdzKSk7XG4gICAgICAgIH0pO1xuICAgIH1cblxuICAgIC8qKlxuICAgICAqIEBwcml2YXRlIGhhbmRsZXMgY29ycmVzcG9uZGVudCAnbWVzc2FnZScgZXZlbnRcbiAgICAgKiBAcGFyYW0ge29ian0gZGF0YSBkYXRhIHByb3BlcnR5IG9mICdtZXNzYWdlJyBldmVudFxuICAgICAqL1xuICAgIHJldHVybkhhbmRsZXIoZGF0YSkge1xuICAgICAgICBjb25zdCByZXNvbHZlUmVqZWN0cyA9IHRoaXMubWV0aG9kU3RhdGVzW2RhdGEubWV0aG9kTmFtZV0ucmVzb2x2ZVJlamVjdHM7XG4gICAgICAgIGlmIChkYXRhLmVycm9yKSB7XG4gICAgICAgICAgICByZXNvbHZlUmVqZWN0c1tkYXRhLm51bV0ucmVqZWN0KGRhdGEuZXJyb3IpO1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgcmVzb2x2ZVJlamVjdHNbZGF0YS5udW1dLnJlc29sdmUoZGF0YS5yZXN1bHQpO1xuICAgICAgICB9XG4gICAgICAgIGRlbGV0ZSByZXNvbHZlUmVqZWN0c1tkYXRhLm51bV07XG4gICAgfVxufVxuXG5cbi8qKlxuICogQHByaXZhdGUgZXhlY3V0ZXMgYSBtZXRob2Qgb24gc2VydmVyIGFuZCBwb3N0IGEgcmVzdWx0IGFzIG1lc3NhZ2UuXG4gKiBAcGFyYW0ge29ian0gZXZlbnQgJ21lc3NhZ2UnIGV2ZW50XG4gKi9cbmFzeW5jIGZ1bmN0aW9uIGhhbmRsZVdvcmtlclJNSShldmVudCkge1xuICAgIGNvbnN0IGRhdGEgPSBldmVudC5kYXRhO1xuICAgIGNvbnN0IG1lc3NhZ2UgPSB7XG4gICAgICAgIGlkOiBkYXRhLmlkLFxuICAgICAgICBtZXRob2ROYW1lOiBkYXRhLm1ldGhvZE5hbWUsXG4gICAgICAgIG51bTogZGF0YS5udW0sXG4gICAgfTtcbiAgICBsZXQgcmVzdWx0O1xuICAgIGlmIChkYXRhLm1ldGhvZE5hbWUgPT09IHRoaXMubmFtZSkge1xuICAgICAgICB0aGlzLndvcmtlclJNSS5pbnN0YW5jZXNbZGF0YS5pZF0gPSBuZXcgdGhpcyguLi5kYXRhLmFyZ3MpO1xuICAgICAgICBtZXNzYWdlLnJlc3VsdCA9IG51bGw7XG4gICAgICAgIHRoaXMud29ya2VyUk1JLnRhcmdldC5wb3N0TWVzc2FnZShtZXNzYWdlLCBnZXRUcmFuc2Zlckxpc3QocmVzdWx0KSk7XG4gICAgfSBlbHNlIHtcbiAgICAgICAgY29uc3QgaW5zdGFuY2UgPSB0aGlzLndvcmtlclJNSS5pbnN0YW5jZXNbZGF0YS5pZF07XG4gICAgICAgIGlmIChpbnN0YW5jZSkge1xuICAgICAgICAgICAgdHJ5IHtcbiAgICAgICAgICAgICAgICByZXN1bHQgPSBhd2FpdCBpbnN0YW5jZVtkYXRhLm1ldGhvZE5hbWVdLmFwcGx5KGluc3RhbmNlLCBkYXRhLmFyZ3MpXG4gICAgICAgICAgICAgICAgbWVzc2FnZS5yZXN1bHQgPSByZXN1bHQ7XG4gICAgICAgICAgICAgICAgdGhpcy53b3JrZXJSTUkudGFyZ2V0LnBvc3RNZXNzYWdlKG1lc3NhZ2UsIGdldFRyYW5zZmVyTGlzdChyZXN1bHQpKTtcbiAgICAgICAgICAgIH0gY2F0Y2ggKGUpIHtcbiAgICAgICAgICAgICAgICBtZXNzYWdlLmVycm9yID0gZS50b1N0cmluZygpO1xuICAgICAgICAgICAgICAgIHRoaXMud29ya2VyUk1JLnRhcmdldC5wb3N0TWVzc2FnZShtZXNzYWdlKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgIH1cbn1cblxuLyoqXG4gKiByZWdpc3RlcnMgYSBjbGFzcyBhcyBhbiBleGVjdXRlciBvZiBSTUkgb24gc2VydmVyXG4gKiBAcGFyYW0ge29ian0gdGFyZ2V0IGFuIGluc3RhbmNlIHRoYXQgcmVjZWl2ZXMgJ21lc3NhZ2UnIGV2ZW50cyBvZiBSTUlcbiAqIEBwYXJhbSB7Q2xhc3N9IGtsYXNzIGEgY2xhc3MgdG8gYmUgcmVnaXN0ZXJlZFxuICovXG5mdW5jdGlvbiByZXNpZ3RlcldvcmtlclJNSSh0YXJnZXQsIGtsYXNzKSB7XG4gICAga2xhc3Mud29ya2VyUk1JID0ge1xuICAgICAgICB0YXJnZXQsXG4gICAgICAgIGluc3RhbmNlczoge30sXG4gICAgICAgIGhhbmRsZXI6IGhhbmRsZVdvcmtlclJNSS5iaW5kKGtsYXNzKVxuICAgIH1cbiAgICB0YXJnZXQuYWRkRXZlbnRMaXN0ZW5lcignbWVzc2FnZScsIGtsYXNzLndvcmtlclJNSS5oYW5kbGVyKTtcbn1cblxuLyoqXG4gKiB1bnJlc2lndGVycyBhIGNsYXNzIHJlZ2lzdGVyZWQgYnkgcmVnaXN0ZXJXb3JrZXJSTUlcbiAqIEBwYXJhbSB7b2JqfSB0YXJnZXQgYW4gaW5zdGFuY2UgdGhhdCByZWNlaXZlcyAnbWVzc2FnZScgZXZlbnRzIG9mIFJNSVxuICogQHBhcmFtIHtDbGFzc30ga2xhc3MgYSBjbGFzcyB0byBiZSB1bnJlZ2lzdGVyZWRcbiAqL1xuZnVuY3Rpb24gdW5yZXNpZ3RlcldvcmtlclJNSSh0YXJnZXQsIGtsYXNzKSB7XG4gICAgdGFyZ2V0LnJlbW92ZUV2ZW50TGlzdGVuZXIoJ21lc3NhZ2UnLCBrbGFzcy53b3JrZXJSTUkuaGFuZGxlcilcbiAgICBkZWxldGUga2xhc3Mud29ya2VyUk1JO1xufVxuXG5leHBvcnRzLldvcmtlclJNSSA9IFdvcmtlclJNSTtcbmV4cG9ydHMucmVzaWd0ZXJXb3JrZXJSTUkgPSByZXNpZ3RlcldvcmtlclJNSTtcbmV4cG9ydHMudW5yZXNpZ3RlcldvcmtlclJNSSA9IHVucmVzaWd0ZXJXb3JrZXJSTUk7XG4iLCIndXNlIHN0cmljdCc7XG5cbk9iamVjdC5kZWZpbmVQcm9wZXJ0eShleHBvcnRzLCBcIl9fZXNNb2R1bGVcIiwge1xuICAgIHZhbHVlOiB0cnVlXG59KTtcbmV4cG9ydHMuQVpqc0VuZ2luZSA9IHVuZGVmaW5lZDtcblxudmFyIF9uZXVyYWxfbmV0d29ya19jbGllbnQgPSByZXF1aXJlKCcuL25ldXJhbF9uZXR3b3JrX2NsaWVudC5qcycpO1xuXG52YXIgX2JvYXJkX2NvbnN0YW50cyA9IHJlcXVpcmUoJy4vYm9hcmRfY29uc3RhbnRzLmpzJyk7XG5cbnZhciBfYm9hcmQgPSByZXF1aXJlKCcuL2JvYXJkLmpzJyk7XG5cbnZhciBfbWN0cyA9IHJlcXVpcmUoJy4vbWN0cy5qcycpO1xuXG4vKipcbiAqIOWvvuWxgOOCkuihjOOBhuaAneiAg+OCqOODs+OCuOODs+OCr+ODqeOCueOBp+OBmeOAglxuICog44Km44Kn44OW44Ov44O844Kr44Gn5YuV44GL44GZ44GT44Go44KS5YmN5o+Q44Gr44CB44Oh44Kk44Oz44K544Os44OD44OJ44Gu44Ki44OX44Oq44GoTmV1cmFsTmV0d29ya+OBrjLjgaTjgajpgJrkv6HjgZfjgarjgYzjgolNQ1RT44KS5a6f6KGM44GX44G+44GZ44CCXG4gKi9cbi8qKlxuICogQGZpbGUg5a++5bGA44KS6KGM44GG5oCd6ICD44Ko44Oz44K444Oz44Kv44Op44K5QVpqc0VuZ2luZeOBruOCs+ODvOODieOBp+OBmeOAglxuICog44Km44Kn44OW44Ov44O844Kr44Gn5YuV44GL44GZ44GT44Go44KS5YmN5o+Q44Gr44CB44Oh44Kk44Oz44K544Os44OD44OJ44Gu44Ki44OX44Oq44GoTmV1cmFsTmV0d29ya+OBrjLjgaTjgajpgJrkv6HjgZfjgarjgYzjgonjg6Ljg7Pjg4bjgqvjg6vjg63jg4Tjg6rjg7zmjqLntKLjgpLlrp/ooYzjgZfjgb7jgZnjgIJcbiAqL1xuLypcbiAqIEBhdXRob3Ig5biC5bed6ZuE5LqMXG4gKiBAY29weXJpZ2h0IDIwMTggSUNISUtBV0EsIFl1amkgKE5ldyAzIFJzKVxuICogQGxpY2Vuc2UgTUlUXG4gKi9cbi8vIOODoeOCpOODs+OCueODrOODg+ODieOBp+WLleOBi+OBmeWgtOWQiOOAgeS7peS4i+OBrmltcG9ydOOCkicuL25ldXJhbF9uZXR3b3JrLmpzJ+OBq+WkieOBiOOBvuOBmeOAglxuY2xhc3MgQVpqc0VuZ2luZSB7XG4gICAgLyoqXG4gICAgICogQHBhcmFtIHtJbnRlZ2VyfSBzaXplIOeigeebpOOCteOCpOOCulxuICAgICAqIEBwYXJhbSB7bnVtYmVyfSBrb21pIOOCs+ODn1xuICAgICAqL1xuICAgIGNvbnN0cnVjdG9yKHNpemUgPSAxOSwga29taSA9IDcpIHtcbiAgICAgICAgdGhpcy5iID0gbmV3IF9ib2FyZC5Cb2FyZChuZXcgX2JvYXJkX2NvbnN0YW50cy5Cb2FyZENvbnN0YW50cyhzaXplKSwga29taSk7XG4gICAgICAgIHRoaXMubm4gPSBuZXcgX25ldXJhbF9uZXR3b3JrX2NsaWVudC5OZXVyYWxOZXR3b3JrKHNlbGYpO1xuICAgICAgICB0aGlzLm1jdHMgPSBuZXcgX21jdHMuTUNUUyh0aGlzLm5uLCB0aGlzLmIuQyk7XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICog44OL44Ol44O844Op44Or44ON44OD44OI44Ov44O844Kv44Gu44Km44Kn44Kk44OI44KS44Ot44O844OJ44GX44G+44GZ44CCXG4gICAgICovXG4gICAgYXN5bmMgbG9hZE5OKCkge1xuICAgICAgICBsZXQgYXJncztcbiAgICAgICAgc3dpdGNoICh0aGlzLmIuQy5CU0laRSkge1xuICAgICAgICAgICAgY2FzZSA5OlxuICAgICAgICAgICAgICAgIGFyZ3MgPSBbJ2h0dHBzOi8vc3RvcmFnZS5nb29nbGVhcGlzLmNvbS9taW1pYWthLXN0b3JhZ2UvTGVlbGFaZXJvOSddO1xuICAgICAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICAgICAgY2FzZSAxOTpcbiAgICAgICAgICAgICAgICBhcmdzID0gWydodHRwczovL3N0b3JhZ2UuZ29vZ2xlYXBpcy5jb20vbWltaWFrYS1zdG9yYWdlL0VMRl9PcGVuR28nLCAyXTtcbiAgICAgICAgICAgICAgICBicmVhaztcbiAgICAgICAgICAgIGRlZmF1bHQ6XG4gICAgICAgICAgICAgICAgdGhyb3cgbmV3IEVycm9yKCdzaXplIGlzIG5vdCBzdXBwb3J0ZWQnKTtcbiAgICAgICAgfVxuICAgICAgICBhd2FpdCB0aGlzLm5uLmludm9rZVJNKCdsb2FkJywgYXJncyk7XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICog5YaF6YOo54q25oWL44KS44Kv44Oq44Ki44GX44G+44GZ44CCXG4gICAgICog5pS544KB44Gm5Yid5omL44GL44KJ5a++5bGA5Y+v6IO944Gr44Gq44KK44G+44GZ44CCXG4gICAgICovXG4gICAgY2xlYXIoKSB7XG4gICAgICAgIHRoaXMuYi5yZXNldCgpO1xuICAgICAgICB0aGlzLm1jdHMuY2xlYXIoKTtcbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiDmjIHjgaHmmYLplpPjgpLoqK3lrprjgZfjgb7jgZnjgIJcbiAgICAgKiBAcGFyYW0ge251bWJlcn0gbWFpblRpbWUg56eSXG4gICAgICogQHBhcmFtIHtudW1iZXJ9IGJ5b3lvbWkg56eSXG4gICAgICovXG4gICAgdGltZVNldHRpbmdzKG1haW5UaW1lLCBieW95b21pKSB7XG4gICAgICAgIHRoaXMubWN0cy5zZXRUaW1lKG1haW5UaW1lLCBieW95b21pKTtcbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiDmrKHjga7miYvjgpLov5TjgZfjgb7jgZnjgILnirbms4Hjgavlv5zjgZjjgabmipXkuobjgZfjgb7jgZnjgIJcbiAgICAgKiDmiLvjgorlgKRbeCwgeV3jga/lt6bkuIrjgYwxLeOCquODquOCuOODs+OBrjLmrKHlhYPluqfmqJnjgafjgZnjgILjgoLjgZfjgY/jga8ncmVzZ2luJ+OBvuOBn+OBrydwYXNzJ+OCkui/lOOBl+OBvuOBmeOAglxuICAgICAqIOWGhemDqOOBp+S/neaMgeOBl+OBpuOBhOOCi+WxgOmdouOCgumAsuOCgeOBvuOBmeOAglxuICAgICAqIEByZXR1cm5zIHtJbnRlZ2VyW118c3RyaW5nfVxuICAgICAqL1xuICAgIGFzeW5jIGdlbm1vdmUoKSB7XG4gICAgICAgIHRyeSB7XG4gICAgICAgICAgICBjb25zdCBbbW92ZSwgd2luUmF0ZV0gPSBhd2FpdCB0aGlzLnNlYXJjaCgpO1xuICAgICAgICAgICAgaWYgKHdpblJhdGUgPCAwLjA1KSB7XG4gICAgICAgICAgICAgICAgcmV0dXJuICdyZXNpZ24nO1xuICAgICAgICAgICAgfSBlbHNlIGlmIChtb3ZlID09PSB0aGlzLmIuQy5QQVNTIHx8IHRoaXMuYi5zdGF0ZVttb3ZlXSA9PT0gdGhpcy5iLkMuRU1QVFkpIHtcbiAgICAgICAgICAgICAgICB0aGlzLmIucGxheShtb3ZlLCB0cnVlKTtcbiAgICAgICAgICAgICAgICByZXR1cm4gbW92ZSA9PT0gdGhpcy5iLkMuUEFTUyA/ICdwYXNzJyA6IHRoaXMuYi5DLmV2Mnh5KG1vdmUpO1xuICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICBjb25zb2xlLmxvZygnZXJyb3InKTtcbiAgICAgICAgICAgICAgICBjb25zb2xlLmxvZygnJWQoJXMpIGlzIG5vdCBlbXB0eScsIG1vdmUsIHRoaXMuYi5DLmV2MnN0cihtb3ZlKSk7XG4gICAgICAgICAgICAgICAgdGhpcy5iLnNob3dib2FyZCgpO1xuICAgICAgICAgICAgICAgIGNvbnNvbGUubG9nKHRoaXMuYi5jYW5kaWRhdGVzKCkpO1xuICAgICAgICAgICAgfVxuICAgICAgICB9IGNhdGNoIChlKSB7XG4gICAgICAgICAgICBjb25zb2xlLmVycm9yKGUpO1xuICAgICAgICB9XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICog5qyh44Gu5omL44KS5omT44Gj44Gm54++5bGA6Z2i44KS6YCy44KB44G+44GZ44CCXG4gICAgICogKHgsIHkp44Gv5bem5LiK44GMMS3jgqrjg6rjgrjjg7Pjga4y5qyh5YWD5bqn5qiZ44Gn44GZ44CCXG4gICAgICogQHBhcmFtIHtJbnRlZ2VyfSB4IFxuICAgICAqIEBwYXJhbSB7SW50ZWdlcn0geSBcbiAgICAgKi9cbiAgICBwbGF5KHgsIHkpIHtcbiAgICAgICAgdGhpcy5iLnBsYXkodGhpcy5iLkMueHkyZXYoeCwgeSkpO1xuICAgIH1cblxuICAgIC8qKlxuICAgICAqIOasoeOBruaJi+OCkuODkeOCueOBl+OBpuePvuWxgOmdouOCkumAsuOCgeOBvuOBmeOAglxuICAgICAqL1xuICAgIHBhc3MoKSB7XG4gICAgICAgIHRoaXMuYi5wbGF5KHRoaXMuYi5DLlBBU1MpO1xuICAgIH1cblxuICAgIC8qKlxuICAgICAqIEBwcml2YXRlXG4gICAgICovXG4gICAgYXN5bmMgc2VhcmNoKCkge1xuICAgICAgICByZXR1cm4gYXdhaXQgdGhpcy5tY3RzLnNlYXJjaCh0aGlzLmIsIDAuMCwgZmFsc2UsIGZhbHNlKTtcbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBAcHJpdmF0ZVxuICAgICAqL1xuICAgIGZpbmFsU2NvcmUoKSB7XG4gICAgICAgIHJldHVybiB0aGlzLmIuZmluYWxTY29yZSgpO1xuICAgIH1cblxuICAgIC8qKlxuICAgICAqIOebuOaJi+OBruiAg+aFruS4reOBq+aOoue0ouOCkue2mee2muOBl+OBvuOBmeOAglxuICAgICAqL1xuICAgIGFzeW5jIHBvbmRlcigpIHtcbiAgICAgICAgY29uc3QgW21vdmVdID0gYXdhaXQgdGhpcy5tY3RzLnNlYXJjaCh0aGlzLmIsIEluZmluaXR5LCB0cnVlLCBmYWxzZSk7XG4gICAgICAgIHJldHVybiBtb3ZlID09PSB0aGlzLmIuQy5QQVNTID8gJ3Bhc3MnIDogdGhpcy5iLkMuZXYyeHkobW92ZSk7XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICog5o6i57Si44KS5by35Yi257WC5LqG44GV44Gb44G+44GZ44CCXG4gICAgICog5o6i57Si44OE44Oq44O844Gv5pyJ5Yq544Gq44G+44G+44Gn44GZ44CC5Li744Gr44Od44Oz44OA44Oq44Oz44Kw57WC5LqG44Gr5L2/44GE44G+44GZ44CCXG4gICAgICovXG4gICAgc3RvcCgpIHtcbiAgICAgICAgdGhpcy5tY3RzLnN0b3AoKTtcbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiDjg6HjgqTjg7PmmYLplpPjga7mrovjgormmYLplpPjgpLov5TjgZfjgb7jgZnjgIJcbiAgICAgKiBAcmV0dXJucyB7bnVtYmVyfSDmrovjgorjga7np5LmlbBcbiAgICAgKi9cbiAgICB0aW1lTGVmdCgpIHtcbiAgICAgICAgcmV0dXJuIHRoaXMubWN0cy5sZWZ0VGltZTtcbiAgICB9XG59XG5leHBvcnRzLkFaanNFbmdpbmUgPSBBWmpzRW5naW5lOyIsIid1c2Ugc3RyaWN0JztcblxuT2JqZWN0LmRlZmluZVByb3BlcnR5KGV4cG9ydHMsIFwiX19lc01vZHVsZVwiLCB7XG4gICAgdmFsdWU6IHRydWVcbn0pO1xuZXhwb3J0cy5Cb2FyZCA9IHVuZGVmaW5lZDtcblxudmFyIF91dGlscyA9IHJlcXVpcmUoJy4vdXRpbHMuanMnKTtcblxudmFyIF9zdG9uZV9ncm91cCA9IHJlcXVpcmUoJy4vc3RvbmVfZ3JvdXAuanMnKTtcblxuLy8vIOODi+ODpeODvOODqeODq+ODjeODg+ODiOODr+ODvOOCr+OBuOOBruWFpeWKm+OBq+mWouOBmeOCi+WxpeattOOBrua3seOBleOBp+OBmeOAglxuLyoqXG4gKiBAZmlsZSDnooHnm6Tjgq/jg6njgrnjgafjgZnjgIJcbiAqIOOBk+OBruOCs+ODvOODieOBr1B5YXHjga7np7vmpI3jgrPjg7zjg4njgafjgZnjgIJcbiAqIEBzZWUge0BsaW5rIGh0dHBzOi8vZ2l0aHViLmNvbS95bWdhcS9QeWFxfVxuICovXG4vKlxuICogQGF1dGhvciDluILlt53pm4TkuowgXG4gKiBAY29weXJpZ2h0IDIwMTggSUNISUtBV0EsIFl1amkgKE5ldyAzIFJzKVxuICogQGxpY2Vuc2UgTUlUXG4gKi9cbmNvbnN0IEtFRVBfUFJFVl9DTlQgPSA3O1xuY29uc3QgRkVBVFVSRV9DTlQgPSBLRUVQX1BSRVZfQ05UICogMiArIDQ7XG5cbi8qKlxuICog44OL44Ol44O844Op44Or44ON44OD44OI44Ov44O844Kv44Gu5YWl5Yqb44Gu44Kk44Oz44OH44OD44Kv44K544KS6KiI566X44GX44G+44GZ44CCXG4gKiBAcGFyYW0geyp9IHJ2IOeigeebpOOBruS6pOeCueOBrue3muW9ouW6p+aomVxuICogQHBhcmFtIHsqfSBmIOODleOCo+ODvOODgeODo+ODvOeVquWPt1xuICogQHBhcmFtIHsqfSBzeW1tZXRyeSDlr77np7DlpInmj5tcbiAqL1xuZnVuY3Rpb24gZmVhdHVyZUluZGV4KHJ2LCBmKSB7XG4gICAgcmV0dXJuIHJ2ICogRkVBVFVSRV9DTlQgKyBmO1xufVxuXG4vKipcbiAqIOeigeebpOOBruWfuuacrOOCr+ODqeOCueOBp+OBmeOAglxuICovXG5jbGFzcyBCYXNlQm9hcmQge1xuICAgIC8qKlxuICAgICAqIEBwYXJhbSB7Qm9hcmRDb25zdGFudHN9IGNvbnN0YW50c1xuICAgICAqIEBwYXJhbSB7bnVtYmVyfSBrb21pIFxuICAgICAqL1xuICAgIGNvbnN0cnVjdG9yKGNvbnN0YW50cywga29taSA9IDcuNSkge1xuICAgICAgICB0aGlzLkMgPSBjb25zdGFudHM7XG4gICAgICAgIHRoaXMua29taSA9IGtvbWk7XG4gICAgICAgIC8qKiDkuqTngrnjga7nirbmhYvphY3liJfjgafjgZnjgILmi6HlvLXnt5rlvaLluqfmqJnjgafjgZnjgIIgKi9cbiAgICAgICAgdGhpcy5zdGF0ZSA9IG5ldyBVaW50OEFycmF5KHRoaXMuQy5FQlZDTlQpO1xuICAgICAgICB0aGlzLnN0YXRlLmZpbGwodGhpcy5DLkVYVEVSSU9SKTtcbiAgICAgICAgdGhpcy5pZCA9IG5ldyBVaW50MTZBcnJheSh0aGlzLkMuRUJWQ05UKTsgLy8g5Lqk54K544Gu6YCjSUTjgafjgZnjgIJcbiAgICAgICAgdGhpcy5uZXh0ID0gbmV3IFVpbnQxNkFycmF5KHRoaXMuQy5FQlZDTlQpOyAvLyDkuqTngrnjgpLlkKvjgoDpgKPjga7mrKHjga7nn7Pjga7luqfmqJnjgafjgZnjgIJcbiAgICAgICAgdGhpcy5zZyA9IFtdOyAvLyDpgKPmg4XloLHjgafjgZnjgIJcbiAgICAgICAgZm9yIChsZXQgaSA9IDA7IGkgPCB0aGlzLkMuRUJWQ05UOyBpKyspIHtcbiAgICAgICAgICAgIHRoaXMuc2cucHVzaChuZXcgX3N0b25lX2dyb3VwLlN0b25lR3JvdXAodGhpcy5DKSk7XG4gICAgICAgIH1cbiAgICAgICAgdGhpcy5wcmV2U3RhdGUgPSBbXTtcbiAgICAgICAgdGhpcy5rbyA9IHRoaXMuQy5WTlVMTDtcbiAgICAgICAgLyoqIOaJi+eVquOBp+OBmeOAgiAqL1xuICAgICAgICB0aGlzLnR1cm4gPSB0aGlzLkMuQkxBQ0s7XG4gICAgICAgIC8qKiDnj77lnKjjga7miYvmlbDjgafjgZnjgIIgKi9cbiAgICAgICAgdGhpcy5tb3ZlTnVtYmVyID0gMDtcbiAgICAgICAgLyoqIOebtOWJjeOBruedgOaJi+OBp+OBmeOAgiAqL1xuICAgICAgICB0aGlzLnByZXZNb3ZlID0gdGhpcy5DLlZOVUxMO1xuICAgICAgICB0aGlzLnJlbW92ZUNudCA9IDA7XG4gICAgICAgIHRoaXMuaGlzdG9yeSA9IFtdO1xuICAgICAgICB0aGlzLnJlc2V0KCk7XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICog54q25oWL44KS5Yid5pyf5YyW44GX44G+44GZ44CCXG4gICAgICovXG4gICAgcmVzZXQoKSB7XG4gICAgICAgIGZvciAobGV0IHggPSAxOyB4IDw9IHRoaXMuQy5CU0laRTsgeCsrKSB7XG4gICAgICAgICAgICBmb3IgKGxldCB5ID0gMTsgeSA8PSB0aGlzLkMuQlNJWkU7IHkrKykge1xuICAgICAgICAgICAgICAgIHRoaXMuc3RhdGVbdGhpcy5DLnh5MmV2KHgsIHkpXSA9IHRoaXMuQy5FTVBUWTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgICBmb3IgKGxldCBpID0gMDsgaSA8IHRoaXMuaWQubGVuZ3RoOyBpKyspIHtcbiAgICAgICAgICAgIHRoaXMuaWRbaV0gPSBpO1xuICAgICAgICB9XG4gICAgICAgIGZvciAobGV0IGkgPSAwOyBpIDwgdGhpcy5uZXh0Lmxlbmd0aDsgaSsrKSB7XG4gICAgICAgICAgICB0aGlzLm5leHRbaV0gPSBpO1xuICAgICAgICB9XG4gICAgICAgIHRoaXMuc2cuZm9yRWFjaChlID0+IHtcbiAgICAgICAgICAgIGUuY2xlYXIoZmFsc2UpO1xuICAgICAgICB9KTtcbiAgICAgICAgdGhpcy5wcmV2U3RhdGUgPSBbXTtcbiAgICAgICAgZm9yIChsZXQgaSA9IDA7IGkgPCBLRUVQX1BSRVZfQ05UOyBpKyspIHtcbiAgICAgICAgICAgIHRoaXMucHJldlN0YXRlLnB1c2godGhpcy5zdGF0ZS5zbGljZSgpKTtcbiAgICAgICAgfVxuICAgICAgICB0aGlzLmtvID0gdGhpcy5DLlZOVUxMO1xuICAgICAgICB0aGlzLnR1cm4gPSB0aGlzLkMuQkxBQ0s7XG4gICAgICAgIHRoaXMubW92ZU51bWJlciA9IDA7XG4gICAgICAgIHRoaXMucHJldk1vdmUgPSB0aGlzLkMuVk5VTEw7XG4gICAgICAgIHRoaXMucmVtb3ZlQ250ID0gMDtcbiAgICAgICAgdGhpcy5oaXN0b3J5ID0gW107XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogZGVzdOOBq+eKtuaFi+OCkuOCs+ODlOODvOOBl+OBvuOBmeOAglxuICAgICAqIEBwYXJhbSB7Qm9hcmR9IGRlc3QgXG4gICAgICovXG4gICAgY29weVRvKGRlc3QpIHtcbiAgICAgICAgZGVzdC5zdGF0ZSA9IHRoaXMuc3RhdGUuc2xpY2UoKTtcbiAgICAgICAgZGVzdC5pZCA9IHRoaXMuaWQuc2xpY2UoKTtcbiAgICAgICAgZGVzdC5uZXh0ID0gdGhpcy5uZXh0LnNsaWNlKCk7XG4gICAgICAgIGZvciAobGV0IGkgPSAwOyBpIDwgZGVzdC5zZy5sZW5ndGg7IGkrKykge1xuICAgICAgICAgICAgdGhpcy5zZ1tpXS5jb3B5VG8oZGVzdC5zZ1tpXSk7XG4gICAgICAgIH1cbiAgICAgICAgZGVzdC5wcmV2U3RhdGUgPSBbXTtcbiAgICAgICAgZm9yIChsZXQgaSA9IDA7IGkgPCBLRUVQX1BSRVZfQ05UOyBpKyspIHtcbiAgICAgICAgICAgIGRlc3QucHJldlN0YXRlLnB1c2godGhpcy5wcmV2U3RhdGVbaV0uc2xpY2UoKSk7XG4gICAgICAgIH1cbiAgICAgICAgZGVzdC5rbyA9IHRoaXMua287XG4gICAgICAgIGRlc3QudHVybiA9IHRoaXMudHVybjtcbiAgICAgICAgZGVzdC5tb3ZlTnVtYmVyID0gdGhpcy5tb3ZlTnVtYmVyO1xuICAgICAgICBkZXN0LnJlbW92ZUNudCA9IHRoaXMucmVtb3ZlQ250O1xuICAgICAgICBkZXN0Lmhpc3RvcnkgPSBBcnJheS5mcm9tKHRoaXMuaGlzdG9yeSk7XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICog5ouh5by157ea5b2i5bqn5qiZ44Gu6YWN5YiX44KS5Y+X44GR5Y+W44Gj44Gm6aCG44Gr552A5omL44GX44G+44GZ44CCXG4gICAgICogQHBhcmFtIHtVaW4xNltdfSBzZXF1ZW5jZSBcbiAgICAgKi9cbiAgICBwbGF5U2VxdWVuY2Uoc2VxdWVuY2UpIHtcbiAgICAgICAgZm9yIChjb25zdCB2IG9mIHNlcXVlbmNlKSB7XG4gICAgICAgICAgICB0aGlzLnBsYXkodik7XG4gICAgICAgIH1cbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiDkuqTngrnjgavjgYLjgovnn7PjgpLlkKvjgoDpgKPjgpLnm6TkuIrjgYvjgonmiZPjgaHkuIrjgZLjgb7jgZnjgIJcbiAgICAgKiBAcGFyYW0ge1VpbnQxNn0gdiDmi6HlvLXnt5rlvaLluqfmqJlcbiAgICAgKi9cbiAgICByZW1vdmUodikge1xuICAgICAgICBsZXQgdlRtcCA9IHY7XG4gICAgICAgIHdoaWxlICh0cnVlKSB7XG4gICAgICAgICAgICB0aGlzLnJlbW92ZUNudCArPSAxO1xuICAgICAgICAgICAgdGhpcy5zdGF0ZVt2VG1wXSA9IHRoaXMuQy5FTVBUWTtcbiAgICAgICAgICAgIHRoaXMuaWRbdlRtcF0gPSB2VG1wO1xuICAgICAgICAgICAgZm9yIChjb25zdCBudiBvZiB0aGlzLkMubmVpZ2hib3JzKHZUbXApKSB7XG4gICAgICAgICAgICAgICAgdGhpcy5zZ1t0aGlzLmlkW252XV0uYWRkKHZUbXApO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgY29uc3Qgdk5leHQgPSB0aGlzLm5leHRbdlRtcF07XG4gICAgICAgICAgICB0aGlzLm5leHRbdlRtcF0gPSB2VG1wO1xuICAgICAgICAgICAgdlRtcCA9IHZOZXh0O1xuICAgICAgICAgICAgaWYgKHZUbXAgPT09IHYpIHtcbiAgICAgICAgICAgICAgICBicmVhaztcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgIH1cblxuICAgIC8qKlxuICAgICAqIOS6pOeCueOBq+OBguOCi+efs+OBrumAo+OCkue1kOWQiOOBl+OBvuOBmeOAglxuICAgICAqIEBwYXJhbSB7VWludDE2fSB2MSDmi6HlvLXnt5rlvaLluqfmqJlcbiAgICAgKiBAcGFyYW0ge1VpbnQxNn0gdjIg5ouh5by157ea5b2i5bqn5qiZXG4gICAgICovXG4gICAgbWVyZ2UodjEsIHYyKSB7XG4gICAgICAgIGxldCBpZEJhc2UgPSB0aGlzLmlkW3YxXTtcbiAgICAgICAgbGV0IGlkQWRkID0gdGhpcy5pZFt2Ml07XG4gICAgICAgIGlmICh0aGlzLnNnW2lkQmFzZV0uZ2V0U2l6ZSgpIDwgdGhpcy5zZ1tpZEFkZF0uZ2V0U2l6ZSgpKSB7XG4gICAgICAgICAgICBsZXQgdG1wID0gaWRCYXNlO1xuICAgICAgICAgICAgaWRCYXNlID0gaWRBZGQ7XG4gICAgICAgICAgICBpZEFkZCA9IHRtcDtcbiAgICAgICAgfVxuXG4gICAgICAgIHRoaXMuc2dbaWRCYXNlXS5tZXJnZSh0aGlzLnNnW2lkQWRkXSk7XG5cbiAgICAgICAgbGV0IHZUbXAgPSBpZEFkZDtcbiAgICAgICAgZG8ge1xuICAgICAgICAgICAgdGhpcy5pZFt2VG1wXSA9IGlkQmFzZTtcbiAgICAgICAgICAgIHZUbXAgPSB0aGlzLm5leHRbdlRtcF07XG4gICAgICAgIH0gd2hpbGUgKHZUbXAgIT09IGlkQWRkKTtcbiAgICAgICAgY29uc3QgdG1wID0gdGhpcy5uZXh0W3YxXTtcbiAgICAgICAgdGhpcy5uZXh0W3YxXSA9IHRoaXMubmV4dFt2Ml07XG4gICAgICAgIHRoaXMubmV4dFt2Ml0gPSB0bXA7XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICog5Lqk54K5duOBq+edgOaJi+OBmeOCi+ODmOODq+ODkeODvOODoeOCveODg+ODieOBp+OBmeOAglxuICAgICAqIOedgOaJi+OBq+OBr3BsYXnjg6Hjgr3jg4Pjg4njgpLkvb/jgaPjgabjgY/jgaDjgZXjgYTjgIJcbiAgICAgKiBAcHJpdmF0ZVxuICAgICAqIEBwYXJhbSB7VWludDE2fSB2IOaLoeW8tee3muW9ouW6p+aomVxuICAgICAqL1xuICAgIHBsYWNlU3RvbmUodikge1xuICAgICAgICBjb25zdCBzdG9uZUNvbG9yID0gdGhpcy50dXJuO1xuICAgICAgICB0aGlzLnN0YXRlW3ZdID0gc3RvbmVDb2xvcjtcbiAgICAgICAgdGhpcy5pZFt2XSA9IHY7XG4gICAgICAgIHRoaXMuc2dbdGhpcy5pZFt2XV0uY2xlYXIodHJ1ZSk7XG4gICAgICAgIGZvciAoY29uc3QgbnYgb2YgdGhpcy5DLm5laWdoYm9ycyh2KSkge1xuICAgICAgICAgICAgaWYgKHRoaXMuc3RhdGVbbnZdID09PSB0aGlzLkMuRU1QVFkpIHtcbiAgICAgICAgICAgICAgICB0aGlzLnNnW3RoaXMuaWRbdl1dLmFkZChudik7XG4gICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgIHRoaXMuc2dbdGhpcy5pZFtudl1dLnN1Yih2KTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgICBmb3IgKGNvbnN0IG52IG9mIHRoaXMuQy5uZWlnaGJvcnModikpIHtcbiAgICAgICAgICAgIGlmICh0aGlzLnN0YXRlW252XSA9PT0gc3RvbmVDb2xvciAmJiB0aGlzLmlkW252XSAhPT0gdGhpcy5pZFt2XSkge1xuICAgICAgICAgICAgICAgIHRoaXMubWVyZ2UodiwgbnYpO1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICAgIHRoaXMucmVtb3ZlQ250ID0gMDtcbiAgICAgICAgY29uc3Qgb3Bwb25lbnRTdG9uZSA9IHRoaXMuQy5vcHBvbmVudE9mKHRoaXMudHVybik7XG4gICAgICAgIGZvciAoY29uc3QgbnYgb2YgdGhpcy5DLm5laWdoYm9ycyh2KSkge1xuICAgICAgICAgICAgaWYgKHRoaXMuc3RhdGVbbnZdID09PSBvcHBvbmVudFN0b25lICYmIHRoaXMuc2dbdGhpcy5pZFtudl1dLmdldExpYkNudCgpID09PSAwKSB7XG4gICAgICAgICAgICAgICAgdGhpcy5yZW1vdmUobnYpO1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICog5Lqk54K544GM552A5omL56aB5q2i44Gn44Gq44GE44GL44KS6L+U44GX44G+44GZ44CCXG4gICAgICog55+z44GM5pei44Gr5a2Y5Zyo44GZ44KL5Lqk54K544CB44Kz44Km44Gr44KI44KL56aB5q2i44CB6Ieq5q665omL44GM552A5omL56aB5q2i54K544Gn44GZ44CCXG4gICAgICogQHBhcmFtIHsqfSB2IOaLoeW8tee3muW9ouW6p+aomVxuICAgICAqIEByZXR1cm5zIHtib29sfSBcbiAgICAgKi9cbiAgICBsZWdhbCh2KSB7XG4gICAgICAgIGlmICh2ID09PSB0aGlzLkMuUEFTUykge1xuICAgICAgICAgICAgcmV0dXJuIHRydWU7XG4gICAgICAgIH0gZWxzZSBpZiAodiA9PT0gdGhpcy5rbyB8fCB0aGlzLnN0YXRlW3ZdICE9PSB0aGlzLkMuRU1QVFkpIHtcbiAgICAgICAgICAgIHJldHVybiBmYWxzZTtcbiAgICAgICAgfVxuXG4gICAgICAgIGNvbnN0IHN0b25lQ250ID0gWzAsIDBdO1xuICAgICAgICBjb25zdCBhdHJDbnQgPSBbMCwgMF07XG4gICAgICAgIGZvciAoY29uc3QgbnYgb2YgdGhpcy5DLm5laWdoYm9ycyh2KSkge1xuICAgICAgICAgICAgY29uc3QgYyA9IHRoaXMuc3RhdGVbbnZdO1xuICAgICAgICAgICAgc3dpdGNoIChjKSB7XG4gICAgICAgICAgICAgICAgY2FzZSB0aGlzLkMuRU1QVFk6XG4gICAgICAgICAgICAgICAgICAgIHJldHVybiB0cnVlO1xuICAgICAgICAgICAgICAgIGNhc2UgdGhpcy5DLkJMQUNLOlxuICAgICAgICAgICAgICAgIGNhc2UgdGhpcy5DLldISVRFOlxuICAgICAgICAgICAgICAgICAgICBzdG9uZUNudFtjXSArPSAxO1xuICAgICAgICAgICAgICAgICAgICBpZiAodGhpcy5zZ1t0aGlzLmlkW252XV0uZ2V0TGliQ250KCkgPT09IDEpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIGF0ckNudFtjXSArPSAxO1xuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgICAgcmV0dXJuIGF0ckNudFt0aGlzLkMub3Bwb25lbnRPZih0aGlzLnR1cm4pXSAhPT0gMCB8fCBhdHJDbnRbdGhpcy50dXJuXSA8IHN0b25lQ250W3RoaXMudHVybl07XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICog5Lqk54K5duOBjOOBjOOCk+W9ouOBi+OBqeOBhuOBi+OCkui/lOOBl+OBvuOBmeOAglxuICAgICAqIEBwcml2YXRlXG4gICAgICogQHBhcmFtIHtVaW50MTZ9IHYgXG4gICAgICogQHBhcmFtIHtudW1iZXJ9IHBsIHBsYXllciBjb2xvclxuICAgICAqL1xuICAgIGV5ZXNoYXBlKHYsIHBsKSB7XG4gICAgICAgIGlmICh2ID09PSB0aGlzLkMuUEFTUykge1xuICAgICAgICAgICAgcmV0dXJuIGZhbHNlO1xuICAgICAgICB9XG4gICAgICAgIGZvciAoY29uc3QgbnYgb2YgdGhpcy5DLm5laWdoYm9ycyh2KSkge1xuICAgICAgICAgICAgY29uc3QgYyA9IHRoaXMuc3RhdGVbbnZdO1xuICAgICAgICAgICAgaWYgKGMgPT09IHRoaXMuQy5FTVBUWSB8fCBjID09PSB0aGlzLkMub3Bwb25lbnRPZihwbCkpIHtcbiAgICAgICAgICAgICAgICByZXR1cm4gZmFsc2U7XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgICAgY29uc3QgZGlhZ0NudCA9IFswLCAwLCAwLCAwXTtcbiAgICAgICAgZm9yIChjb25zdCBudiBvZiB0aGlzLkMuZGlhZ29uYWxzKHYpKSB7XG4gICAgICAgICAgICBkaWFnQ250W3RoaXMuc3RhdGVbbnZdXSArPSAxO1xuICAgICAgICB9XG4gICAgICAgIGNvbnN0IHdlZGdlQ250ID0gZGlhZ0NudFt0aGlzLkMub3Bwb25lbnRPZihwbCldICsgKGRpYWdDbnRbM10gPiAwID8gMSA6IDApO1xuICAgICAgICBpZiAod2VkZ2VDbnQgPT09IDIpIHtcbiAgICAgICAgICAgIGZvciAoY29uc3QgbnYgb2YgdGhpcy5DLmRpYWdvbmFscyh2KSkge1xuICAgICAgICAgICAgICAgIGlmICh0aGlzLnN0YXRlW252XSA9PT0gdGhpcy5DLm9wcG9uZW50T2YocGwpICYmIHRoaXMuc2dbdGhpcy5pZFtudl1dLmdldExpYkNudCgpID09PSAxICYmIHRoaXMuc2dbdGhpcy5pZFtudl1dLmdldFZBdHIoKSAhPT0gdGhpcy5rbykge1xuICAgICAgICAgICAgICAgICAgICByZXR1cm4gdHJ1ZTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgICAgcmV0dXJuIHdlZGdlQ250IDwgMjtcbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiDkuqTngrl244Gr552A5omL44GX44G+44GZ44CCXG4gICAgICogQHBhcmFtIHsqfSB2IOaLoeW8tee3muW9ouW6p+aomVxuICAgICAqIEBwYXJhbSB7Kn0gbm90RmlsbEV5ZSDnnLzjgpLmvbDjgZnjgZPjgajjgpLoqLHlj6/jgZfjgarjgYRcbiAgICAgKi9cbiAgICBwbGF5KHYsIG5vdEZpbGxFeWUgPSBmYWxzZSkge1xuICAgICAgICBpZiAoIXRoaXMubGVnYWwodikpIHtcbiAgICAgICAgICAgIHJldHVybiBmYWxzZTtcbiAgICAgICAgfVxuICAgICAgICBpZiAobm90RmlsbEV5ZSAmJiB0aGlzLmV5ZXNoYXBlKHYsIHRoaXMudHVybikpIHtcbiAgICAgICAgICAgIHJldHVybiBmYWxzZTtcbiAgICAgICAgfVxuICAgICAgICBmb3IgKGxldCBpID0gS0VFUF9QUkVWX0NOVCAtIDI7IGkgPj0gMDsgaS0tKSB7XG4gICAgICAgICAgICB0aGlzLnByZXZTdGF0ZVtpICsgMV0gPSB0aGlzLnByZXZTdGF0ZVtpXTtcbiAgICAgICAgfVxuICAgICAgICB0aGlzLnByZXZTdGF0ZVswXSA9IHRoaXMuc3RhdGUuc2xpY2UoKTtcbiAgICAgICAgaWYgKHYgPT09IHRoaXMuQy5QQVNTKSB7XG4gICAgICAgICAgICB0aGlzLmtvID0gdGhpcy5DLlZOVUxMO1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgdGhpcy5wbGFjZVN0b25lKHYpO1xuICAgICAgICAgICAgY29uc3QgaWQgPSB0aGlzLmlkW3ZdO1xuICAgICAgICAgICAgdGhpcy5rbyA9IHRoaXMuQy5WTlVMTDtcbiAgICAgICAgICAgIGlmICh0aGlzLnJlbW92ZUNudCA9PT0gMSAmJiB0aGlzLnNnW2lkXS5nZXRMaWJDbnQoKSA9PT0gMSAmJiB0aGlzLnNnW2lkXS5nZXRTaXplKCkgPT09IDEpIHtcbiAgICAgICAgICAgICAgICB0aGlzLmtvID0gdGhpcy5zZ1tpZF0uZ2V0VkF0cigpO1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICAgIHRoaXMucHJldk1vdmUgPSB2O1xuICAgICAgICB0aGlzLmhpc3RvcnkucHVzaCh2KTtcbiAgICAgICAgdGhpcy50dXJuID0gdGhpcy5DLm9wcG9uZW50T2YodGhpcy50dXJuKTtcbiAgICAgICAgdGhpcy5tb3ZlTnVtYmVyICs9IDE7XG4gICAgICAgIHJldHVybiB0cnVlO1xuICAgIH1cblxuICAgIC8qKlxuICAgICAqIOecvOW9ouOCkua9sOOBleOBquOBhOOCiOOBhuOBq+ODqeODs+ODgOODoOOBq+edgOaJi+OBl+OBvuOBmeOAglxuICAgICAqL1xuICAgIHJhbmRvbVBsYXkoKSB7XG4gICAgICAgIGNvbnN0IGVtcHR5TGlzdCA9IFtdO1xuICAgICAgICBmb3IgKGxldCBpID0gMDsgaSA8IHRoaXMuc3RhdGUubGVuZ3RoOyBpKyspIHtcbiAgICAgICAgICAgIGlmICh0aGlzLnN0YXRlW2ldID09PSB0aGlzLkMuRU1QVFkpIHtcbiAgICAgICAgICAgICAgICBlbXB0eUxpc3QucHVzaChpKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgICAoMCwgX3V0aWxzLnNodWZmbGUpKGVtcHR5TGlzdCk7XG4gICAgICAgIGZvciAoY29uc3QgdiBvZiBlbXB0eUxpc3QpIHtcbiAgICAgICAgICAgIGlmICh0aGlzLnBsYXkodiwgdHJ1ZSkpIHtcbiAgICAgICAgICAgICAgICByZXR1cm4gdjtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgICB0aGlzLnBsYXkodGhpcy5DLlBBU1MsIHRydWUpO1xuICAgICAgICByZXR1cm4gdGhpcy5DLlBBU1M7XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICog44K544Kz44Ki5beu44KS6L+U44GX44G+44GZ44CCXG4gICAgICog5ZCM44GY6Imy44Gu55+z44Gu5pWw44Go5LiA5pa544Gu55+z44Gr44Gg44GR6Zqj5o6l44GZ44KL5Lqk54K544Gu5pWw44GM44Gd44Gu6Imy44Gu44K544Kz44Ki44Go44GE44GG57Ch5piT44Or44O844Or44Gn44GZ44CCXG4gICAgICogKHJhbmRvbVBsYXnjgpLlrp/ooYzjgZfjgZ/lvozjgafjga/kuK3lm73jg6vjg7zjg6vjgajlkIzjgZjlgKTjgavjgarjgorjgb7jgZkpXG4gICAgICovXG4gICAgc2NvcmUoKSB7XG4gICAgICAgIGNvbnN0IHN0b25lQ250ID0gWzAsIDBdO1xuICAgICAgICBmb3IgKGxldCB2ID0gMDsgdiA8IHRoaXMuQy5FQlZDTlQ7IHYrKykge1xuICAgICAgICAgICAgY29uc3QgcyA9IHRoaXMuc3RhdGVbdl07XG4gICAgICAgICAgICBpZiAocyA9PT0gdGhpcy5DLkJMQUNLIHx8IHMgPT09IHRoaXMuQy5XSElURSkge1xuICAgICAgICAgICAgICAgIHN0b25lQ250W3NdICs9IDE7XG4gICAgICAgICAgICB9IGVsc2UgaWYgKHMgPT09IHRoaXMuQy5FTVBUWSkge1xuICAgICAgICAgICAgICAgIGNvbnN0IG5ickNudCA9IFswLCAwLCAwLCAwXTtcbiAgICAgICAgICAgICAgICBmb3IgKGNvbnN0IG52IG9mIHRoaXMuQy5uZWlnaGJvcnModikpIHtcbiAgICAgICAgICAgICAgICAgICAgbmJyQ250W3RoaXMuc3RhdGVbbnZdXSArPSAxO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICBpZiAobmJyQ250W3RoaXMuQy5XSElURV0gPiAwICYmIG5ickNudFt0aGlzLkMuQkxBQ0tdID09PSAwKSB7XG4gICAgICAgICAgICAgICAgICAgIHN0b25lQ250W3RoaXMuQy5XSElURV0gKz0gMTtcbiAgICAgICAgICAgICAgICB9IGVsc2UgaWYgKG5ickNudFt0aGlzLkMuQkxBQ0tdID4gMCAmJiBuYnJDbnRbdGhpcy5DLldISVRFXSA9PT0gMCkge1xuICAgICAgICAgICAgICAgICAgICBzdG9uZUNudFt0aGlzLkMuQkxBQ0tdICs9IDE7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICAgIHJldHVybiBzdG9uZUNudFsxXSAtIHN0b25lQ250WzBdIC0gdGhpcy5rb21pO1xuICAgIH1cblxuICAgIC8qKlxuICAgICAqIOecvOS7peWkluedgOaJi+WPr+iDveOBquS6pOeCueOBjOOBquOBj+OBquOCi+OBvuOBp+ODqeODs+ODgOODoOOBq+edgOaJi+OBl+OBvuOBmeOAglxuICAgICAqIHNob3dCb2FyZOOBjHRydWXjga7jgajjgY3ntYLlsYBcbiAgICAgKiBAcGFyYW0ge2Jvb2x9fSBzaG93Qm9hcmQgXG4gICAgICovXG4gICAgcm9sbG91dChzaG93Qm9hcmQpIHtcbiAgICAgICAgd2hpbGUgKHRoaXMubW92ZU51bWJlciA8IHRoaXMuQy5FQlZDTlQgKiAyKSB7XG4gICAgICAgICAgICBjb25zdCBwcmV2TW92ZSA9IHRoaXMucHJldk1vdmU7XG4gICAgICAgICAgICBjb25zdCBtb3ZlID0gdGhpcy5yYW5kb21QbGF5KCk7XG4gICAgICAgICAgICBpZiAoc2hvd0JvYXJkICYmIG1vdmUgIT09IHRoaXMuQy5QQVNTKSB7XG4gICAgICAgICAgICAgICAgY29uc29sZS5sb2coJ1xcbm1vdmUgY291bnQ9JWQnLCB0aGlzLm1vdmVOdW1iZXIpO1xuICAgICAgICAgICAgICAgIHRoaXMuc2hvd2JvYXJkKCk7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBpZiAocHJldk1vdmUgPT09IHRoaXMuQy5QQVNTICYmIG1vdmUgPT09IHRoaXMuQy5QQVNTKSB7XG4gICAgICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiDnooHnm6Tjga546Lu444Op44OZ44Or44KS6KGo56S644GX44G+44GZ44CCXG4gICAgICogQHByaXZhdGVcbiAgICAgKi9cbiAgICBwcmludFhsYWJlbCgpIHtcbiAgICAgICAgbGV0IGxpbmVTdHIgPSAnICAnO1xuICAgICAgICBmb3IgKGxldCB4ID0gMTsgeCA8PSB0aGlzLkMuQlNJWkU7IHgrKykge1xuICAgICAgICAgICAgbGluZVN0ciArPSBgICR7dGhpcy5DLlhfTEFCRUxTW3hdfSBgO1xuICAgICAgICB9XG4gICAgICAgIGNvbnNvbGUubG9nKGxpbmVTdHIpO1xuICAgIH1cblxuICAgIC8qKlxuICAgICAqIOeigeebpOOCkuOCs+ODs+OCveODvOODq+OBq+WHuuWKm+OBl+OBvuOBmeOAglxuICAgICAqL1xuICAgIHNob3dib2FyZCgpIHtcbiAgICAgICAgdGhpcy5wcmludFhsYWJlbCgpO1xuICAgICAgICBmb3IgKGxldCB5ID0gdGhpcy5DLkJTSVpFOyB5ID4gMDsgeS0tKSB7XG4gICAgICAgICAgICBsZXQgbGluZVN0ciA9ICgnICcgKyB5LnRvU3RyaW5nKCkpLnNsaWNlKC0yKTtcbiAgICAgICAgICAgIGZvciAobGV0IHggPSAxOyB4IDw9IHRoaXMuQy5CU0laRTsgeCsrKSB7XG4gICAgICAgICAgICAgICAgY29uc3QgdiA9IHRoaXMuQy54eTJldih4LCB5KTtcbiAgICAgICAgICAgICAgICBsZXQgeFN0cjtcbiAgICAgICAgICAgICAgICBzd2l0Y2ggKHRoaXMuc3RhdGVbdl0pIHtcbiAgICAgICAgICAgICAgICAgICAgY2FzZSB0aGlzLkMuQkxBQ0s6XG4gICAgICAgICAgICAgICAgICAgICAgICB4U3RyID0gdiA9PT0gdGhpcy5wcmV2TW92ZSA/ICdbWF0nIDogJyBYICc7XG4gICAgICAgICAgICAgICAgICAgICAgICBicmVhaztcbiAgICAgICAgICAgICAgICAgICAgY2FzZSB0aGlzLkMuV0hJVEU6XG4gICAgICAgICAgICAgICAgICAgICAgICB4U3RyID0gdiA9PT0gdGhpcy5wcmV2TW92ZSA/ICdbT10nIDogJyBPICc7XG4gICAgICAgICAgICAgICAgICAgICAgICBicmVhaztcbiAgICAgICAgICAgICAgICAgICAgY2FzZSB0aGlzLkMuRU1QVFk6XG4gICAgICAgICAgICAgICAgICAgICAgICB4U3RyID0gJyAuICc7XG4gICAgICAgICAgICAgICAgICAgICAgICBicmVhaztcbiAgICAgICAgICAgICAgICAgICAgZGVmYXVsdDpcbiAgICAgICAgICAgICAgICAgICAgICAgIHhTdHIgPSAnID8gJztcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgbGluZVN0ciArPSB4U3RyO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgbGluZVN0ciArPSAoJyAnICsgeS50b1N0cmluZygpKS5zbGljZSgtMik7XG4gICAgICAgICAgICBjb25zb2xlLmxvZyhsaW5lU3RyKTtcbiAgICAgICAgfVxuICAgICAgICB0aGlzLnByaW50WGxhYmVsKCk7XG4gICAgICAgIGNvbnNvbGUubG9nKCcnKTtcbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiDnj77lnKjjga7lsYDpnaLjga7jg4/jg4Pjgrfjg6XlgKTjgpLov5TjgZfjgb7jgZnjgIJcbiAgICAgKiAo5rOoKeaJi+aVsOaDheWgseOBr+WQq+OBv+OBvuOBm+OCk+OAguOBquOBruOBp+avlOi8g+OBq+OBr+ODj+ODg+OCt+ODpeWApOOBqOaJi+aVsOS4oeaWueOCkuS9v+OBhOOBvuOBmeOAglxuICAgICAqL1xuICAgIGhhc2goKSB7XG4gICAgICAgIHJldHVybiAoMCwgX3V0aWxzLmhhc2gpKCh0aGlzLnN0YXRlLnRvU3RyaW5nKCkgKyB0aGlzLnByZXZTdGF0ZVswXS50b1N0cmluZygpICsgdGhpcy50dXJuLnRvU3RyaW5nKCkpLnJlcGxhY2UoJywnLCAnJykpO1xuICAgIH1cblxuICAgIC8qKlxuICAgICAqIEB0eXBlZGVmIHtPYmplY3R9IENhbmRpZGF0ZXNcbiAgICAgKiBAcHJvcGVydHkge251bWJlcn0gaGFzaCBcbiAgICAgKiBAcHJvcGVydHkge0ludGVnZXJ9IG1vdmVDbnRcbiAgICAgKiBAcHJvcGVydHkge0ludGVnZXJbXX0gbGlzdCDnnYDmiYvlj6/og73jgarkuqTngrnnt5rlvaLluqfmqJko5ouh5by157ea5b2i5bqn5qiZ44Gn44Gv44GC44KK44G+44Gb44KTKVxuICAgICAqIOedgOaJi+WPr+iDveOBquS6pOeCueOBruaDheWgseOCkui/lOOBl+OBvuOBmeOAglxuICAgICAqIEByZXR1cm5zIHtvYmplY3R9IHsgaGFzaDog44OP44OD44K344Ol5YCkLCBtb3ZlTnVtYmVyOiDmiYvmlbAsIGxpc3Q6IOWAmeijnOaJi+mFjeWIlyB9XG4gICAgICovXG4gICAgY2FuZGlkYXRlcygpIHtcbiAgICAgICAgY29uc3QgY2FuZExpc3QgPSBbXTtcbiAgICAgICAgZm9yIChsZXQgdiA9IDA7IHYgPCB0aGlzLnN0YXRlLmxlbmd0aDsgdisrKSB7XG4gICAgICAgICAgICBpZiAodGhpcy5sZWdhbCh2KSkge1xuICAgICAgICAgICAgICAgIGNhbmRMaXN0LnB1c2godGhpcy5DLmV2MnJ2KHYpKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgICBjYW5kTGlzdC5wdXNoKHRoaXMuQy5ldjJydih0aGlzLkMuUEFTUykpO1xuICAgICAgICByZXR1cm4ge1xuICAgICAgICAgICAgaGFzaDogdGhpcy5oYXNoKCksXG4gICAgICAgICAgICBtb3ZlTnVtYmVyOiB0aGlzLm1vdmVOdW1iZXIsXG4gICAgICAgICAgICBsaXN0OiBjYW5kTGlzdFxuICAgICAgICB9O1xuICAgIH1cblxuICAgIC8qKlxuICAgICAqIOe1seioiOeahOaJi+azleOBp+aVtOWcsOOBl+OBn+e1kOaenOOCkui/lOOBl+OBvuOBmeOAglxuICAgICAqIEBwcml2YXRlXG4gICAgICovXG4gICAgZmluYWxTY29yZSgpIHtcbiAgICAgICAgY29uc3QgUk9MTF9PVVRfTlVNID0gMjU2O1xuICAgICAgICBjb25zdCBkb3VibGVTY29yZUxpc3QgPSBbXTtcbiAgICAgICAgbGV0IGJDcHkgPSBuZXcgQm9hcmQodGhpcy5DLCB0aGlzLmtvbWkpO1xuICAgICAgICBmb3IgKGxldCBpID0gMDsgaSA8IFJPTExfT1VUX05VTTsgaSsrKSB7XG4gICAgICAgICAgICB0aGlzLmNvcHlUbyhiQ3B5KTtcbiAgICAgICAgICAgIGJDcHkucm9sbG91dChmYWxzZSk7XG4gICAgICAgICAgICBkb3VibGVTY29yZUxpc3QucHVzaChiQ3B5LnNjb3JlKCkpO1xuICAgICAgICB9XG4gICAgICAgIHJldHVybiAoMCwgX3V0aWxzLm1vc3RDb21tb24pKGRvdWJsZVNjb3JlTGlzdCk7XG4gICAgfVxufVxuXG4vKipcbiAqIOeigeebpOOCr+ODqeOCueOBp+OBmeOAglxuICovXG5jbGFzcyBCb2FyZCBleHRlbmRzIEJhc2VCb2FyZCB7XG4gICAgLyoqXG4gICAgICog44OL44Ol44O844Op44Or44ON44OD44OI44Ov44O844Kv44KS5L2/55So44GZ44KL6Zqb44Gu5YWl5Yqb44OV44Kj44O844OB44Oj44O844KS55Sf5oiQ44GX44G+44GZ44CCXG4gICAgICogQHBhcmFtIHtJbnRlZ2VyfSBzeW1tZXRyeVxuICAgICAqIEByZXR1cm5zIHtGbG9hdDMyQXJyYXl9XG4gICAgICovXG4gICAgZmVhdHVyZShzeW1tZXRyeSA9IDApIHtcbiAgICAgICAgY29uc3QgYXJyYXkgPSBuZXcgRmxvYXQzMkFycmF5KHRoaXMuQy5CVkNOVCAqIEZFQVRVUkVfQ05UKTtcbiAgICAgICAgY29uc3QgbXkgPSB0aGlzLnR1cm47XG4gICAgICAgIGNvbnN0IG9wcCA9IHRoaXMuQy5vcHBvbmVudE9mKHRoaXMudHVybik7XG5cbiAgICAgICAgY29uc3QgTiA9IEtFRVBfUFJFVl9DTlQgKyAxO1xuICAgICAgICBmb3IgKGxldCBwID0gMDsgcCA8IHRoaXMuQy5CVkNOVDsgcCsrKSB7XG4gICAgICAgICAgICBhcnJheVtmZWF0dXJlSW5kZXgodGhpcy5DLmdldFN5bW1ldHJpY1Jhd1ZlcnRleChwLCBzeW1tZXRyeSksIDApXSA9IHRoaXMuc3RhdGVbdGhpcy5DLnJ2MmV2KHApXSA9PT0gbXkgPyAxLjAgOiAwLjA7XG4gICAgICAgIH1cbiAgICAgICAgZm9yIChsZXQgcCA9IDA7IHAgPCB0aGlzLkMuQlZDTlQ7IHArKykge1xuICAgICAgICAgICAgYXJyYXlbZmVhdHVyZUluZGV4KHRoaXMuQy5nZXRTeW1tZXRyaWNSYXdWZXJ0ZXgocCwgc3ltbWV0cnkpLCBOKV0gPSB0aGlzLnN0YXRlW3RoaXMuQy5ydjJldihwKV0gPT09IG9wcCA/IDEuMCA6IDAuMDtcbiAgICAgICAgfVxuICAgICAgICBmb3IgKGxldCBpID0gMDsgaSA8IEtFRVBfUFJFVl9DTlQ7IGkrKykge1xuICAgICAgICAgICAgZm9yIChsZXQgcCA9IDA7IHAgPCB0aGlzLkMuQlZDTlQ7IHArKykge1xuICAgICAgICAgICAgICAgIGFycmF5W2ZlYXR1cmVJbmRleCh0aGlzLkMuZ2V0U3ltbWV0cmljUmF3VmVydGV4KHAsIHN5bW1ldHJ5KSwgaSArIDEpXSA9IHRoaXMucHJldlN0YXRlW2ldW3RoaXMuQy5ydjJldihwKV0gPT09IG15ID8gMS4wIDogMC4wO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgZm9yIChsZXQgcCA9IDA7IHAgPCB0aGlzLkMuQlZDTlQ7IHArKykge1xuICAgICAgICAgICAgICAgIGFycmF5W2ZlYXR1cmVJbmRleCh0aGlzLkMuZ2V0U3ltbWV0cmljUmF3VmVydGV4KHAsIHN5bW1ldHJ5KSwgTiArIGkgKyAxKV0gPSB0aGlzLnByZXZTdGF0ZVtpXVt0aGlzLkMucnYyZXYocCldID09PSBvcHAgPyAxLjAgOiAwLjA7XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgICAgbGV0IGlzX2JsYWNrX3R1cm4sIGlzX3doaXRlX3R1cm47XG4gICAgICAgIGlmIChteSA9PT0gdGhpcy5DLkJMQUNLKSB7XG4gICAgICAgICAgICBpc19ibGFja190dXJuID0gMS4wO1xuICAgICAgICAgICAgaXNfd2hpdGVfdHVybiA9IDAuMDtcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIGlzX2JsYWNrX3R1cm4gPSAwLjA7XG4gICAgICAgICAgICBpc193aGl0ZV90dXJuID0gMS4wO1xuICAgICAgICB9XG4gICAgICAgIGZvciAobGV0IHAgPSAwOyBwIDwgdGhpcy5DLkJWQ05UOyBwKyspIHtcbiAgICAgICAgICAgIGFycmF5W2ZlYXR1cmVJbmRleChwLCBGRUFUVVJFX0NOVCAtIDIpXSA9IGlzX2JsYWNrX3R1cm47XG4gICAgICAgICAgICBhcnJheVtmZWF0dXJlSW5kZXgocCwgRkVBVFVSRV9DTlQgLSAxKV0gPSBpc193aGl0ZV90dXJuO1xuICAgICAgICB9XG4gICAgICAgIHJldHVybiBhcnJheTtcbiAgICB9XG59XG5leHBvcnRzLkJvYXJkID0gQm9hcmQ7IiwiJ3VzZSBzdHJpY3QnO1xuXG5PYmplY3QuZGVmaW5lUHJvcGVydHkoZXhwb3J0cywgXCJfX2VzTW9kdWxlXCIsIHtcbiAgICB2YWx1ZTogdHJ1ZVxufSk7XG4vKipcbiAqIEBmaWxlIOeigeebpOOBruWumuaVsOOCr+ODqeOCueOBp+OBmVxuICovXG4vKlxuICogQGF1dGhvciDluILlt53pm4TkuowgXG4gKiBAY29weXJpZ2h0IDIwMTggSUNISUtBV0EsIFl1amkgKE5ldyAzIFJzKVxuICogQGxpY2Vuc2UgTUlUXG4gKi9cblxuLy8g5bqn5qiZ5aSJ5o+b55So5a6a5pWw44Gn44GZ44CCXG5jb25zdCBPRkZTRVQgPSAnYScuY2hhckNvZGVBdCgwKSAtIDE7XG5cbi8qKlxuICog56KB55uk5a6a5pWw44Go5bqn5qiZ5aSJ5o+b44Gu44Kv44Op44K544Gn44GZ44CCPGJyPlxuICog56KB55uk44Kv44Op44K544Gn44Gv5bqn5qiZ57O744Gr5ouh5by157ea5b2i5bqn5qiZ44KS5L2/44GE44G+44GZ44CCXG4gKiDmi6HlvLXnt5rlvaLluqfmqJnjga/nm6TlpJbjga7kuqTngrnjgpLmjIHjgaTnooHnm6Tjga7luqfmqJnjgafjgZnjgIJcbiAqIOWbm+i3r+ebpOOBruWgtOWQiOOAgeS7peS4i+OBruOCiOOBhuOBquani+mAoOOBq+OBquOCiuOBvuOBmeOAglxuICogPHByZSBzdHlsZT1cImZvbnQtZmFtaWx5OiBDb3VyaWVyO1wiPlxuICogICAgICMjIyMjIyAj44GM55uk5aSWKOWun+mam+OBruWApOOBr0VYVEVSSU9SKVxuICogICAgICMuLi4uIyAu44Gv55uk5LiK5Lqk54K5KOWun+mam+OBruWApOOBr0VNUFRZKVxuICogICAgICMuLi4uI1xuICogICAgICMuLi4uI1xuICogICAgICMuLi4uI1xuICogICAgICMjIyMjI1xuICogPC9wcmU+XG4gKiDlt6bkuIvjgYvjgokwLeOCquODquOCuOODs+OBp+aVsOOBiOOBvuOBmeOAguWbm+i3r+ebpOOBruWgtOWQiOOAgVxuICogPHByZSBzdHlsZT1cImZvbnQtZmFtaWx5OiBDb3VyaWVyO1wiPlxuICogICAgIDMwIDMxIDMyIDMzIDM0IDM1XG4gKiAgICAgMjQgMjUgMjYgMjcgMjggMjlcbiAqICAgICAxOCAxOSAyMCAyMSAyMiAyM1xuICogICAgIDEyIDEzIDE0IDE1IDE2IDE3XG4gKiAgICAgIDYgIDcgIDggIDkgMTAgMTFcbiAqICAgICAgMCAgMSAgMiAgMyAgNCAgNVxuICogPC9wcmU+XG4gKiDnooHnm6Tjga7kuqTngrnjgpJ4eeW6p+aomeOBp+ihqOOBmeOBqOOBjeOCguW3puS4i+OBjOWOn+eCueOBp+OBmeOAgnh55bqn5qiZ44Gv55uk5LiK5bem5LiL44GMKDEsMSnjgafjgZnjgIJcbiAqIDxwcmUgc3R5bGU9XCJmb250LWZhbWlseTogQ291cmllcjtcIj5cbiAqICAgICAgICMjIyMjIyAj44GM55uk5aSWKOWun+mam+OBruWApOOBr0VYVEVSSU9SKVxuICogICAgIDR8Iy4uLi4jIC7jga/nm6TkuIrkuqTngrko5a6f6Zqb44Gu5YCk44GvRU1QVFkpXG4gKiAgICAgM3wjLi4uLiNcbiAqICAgICAyfCMuLi4uI1xuICogICAgIDF8Iy4uLi4jXG4gKiAgICAgICAjIyMjIyNcbiAqICAgICAgICAxMjM0XG4gKiA8L3ByZT5cbiAqL1xuY2xhc3MgQm9hcmRDb25zdGFudHMge1xuICAgIGNvbnN0cnVjdG9yKHNpemUgPSAxOSkge1xuICAgICAgICB0aGlzLldISVRFID0gMDtcbiAgICAgICAgdGhpcy5CTEFDSyA9IDE7XG4gICAgICAgIHRoaXMuRU1QVFkgPSAyO1xuICAgICAgICB0aGlzLkVYVEVSSU9SID0gMztcbiAgICAgICAgdGhpcy5YX0xBQkVMUyA9ICdAQUJDREVGR0hKS0xNTk9QUVJTVCc7XG4gICAgICAgIHRoaXMuQlNJWkUgPSBzaXplOyAvLyDnooHnm6TjgrXjgqTjgrpcbiAgICAgICAgdGhpcy5FQlNJWkUgPSB0aGlzLkJTSVpFICsgMjsgLy8g5ouh5by156KB55uk44K144Kk44K6XG4gICAgICAgIHRoaXMuRUJWQ05UID0gdGhpcy5FQlNJWkUgKiB0aGlzLkVCU0laRTtcbiAgICAgICAgdGhpcy5QQVNTID0gdGhpcy5FQlZDTlQ7XG4gICAgICAgIHRoaXMuVk5VTEwgPSB0aGlzLkVCVkNOVCArIDE7XG4gICAgICAgIHRoaXMuQlZDTlQgPSB0aGlzLkJTSVpFICogdGhpcy5CU0laRTtcbiAgICAgICAgdGhpcy5zeW1tZXRyaWNSYXdWZXJ0ZXggPSBuZXcgVWludDE2QXJyYXkodGhpcy5CVkNOVCAqIDgpO1xuICAgICAgICB0aGlzLmluaXRpYWxpemVTeW1tZXRyaWNSYXdWZXJ0ZXgoKTtcbiAgICAgICAgT2JqZWN0LmZyZWV6ZSh0aGlzKTtcbiAgICB9XG5cbiAgICBvcHBvbmVudE9mKGNvbG9yKSB7XG4gICAgICAgIHN3aXRjaCAoY29sb3IpIHtcbiAgICAgICAgICAgIGNhc2UgdGhpcy5XSElURTpcbiAgICAgICAgICAgICAgICByZXR1cm4gdGhpcy5CTEFDSztcbiAgICAgICAgICAgIGNhc2UgdGhpcy5CTEFDSzpcbiAgICAgICAgICAgICAgICByZXR1cm4gdGhpcy5XSElURTtcbiAgICAgICAgICAgIGRlZmF1bHQ6XG4gICAgICAgICAgICAgICAgdGhyb3cgbmV3IEVycm9yKCdpbnZhbGlkIGNvbG9yJyk7XG4gICAgICAgIH1cbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBTR0bjg5Xjgqnjg7zjg57jg4Pjg4jjga7luqfmqJnjgpJ4eeW6p+aomeOBq+WkieaPm+OBl+OBvuOBmeOAglxuICAgICAqIEBwYXJhbSB7c3RyaW5nfSBzIFxuICAgICAqIEByZXR1cm5zIHtJbnRlZ2VyW119IHh55bqn5qiZXG4gICAgICovXG4gICAgbW92ZTJ4eShzKSB7XG4gICAgICAgIHJldHVybiBbcy5jaGFyQ29kZUF0KDApIC0gT0ZGU0VULCB0aGlzLkJTSVpFICsgMSAtIChzLmNoYXJDb2RlQXQoMSkgLSBPRkZTRVQpXTtcbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiDmi6HlvLXnt5rlvaLluqfmqJnjgpJ4eeW6p+aomeOBq+WkieaPm+OBl+OBvuOBmeOAglxuICAgICAqIEBwYXJhbSB7VWludDE2fSBldiBcbiAgICAgKiBAcmV0dXJucyB7SW50ZWdlcltdfSB4eeW6p+aomVxuICAgICAqL1xuICAgIGV2Mnh5KGV2KSB7XG4gICAgICAgIHJldHVybiBbZXYgJSB0aGlzLkVCU0laRSwgTWF0aC5mbG9vcihldiAvIHRoaXMuRUJTSVpFKV07XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogeHnluqfmqJnjgpLmi6HlvLXnt5rlvaLluqfmqJnjgavlpInmj5vjgZfjgb7jgZnjgIJcbiAgICAgKiBAcGFyYW0ge0ludGVnZXJ9IHggXG4gICAgICogQHBhcmFtIHtJbnRlZ2VyfSB5IFxuICAgICAqIEByZXR1cm5zIHtVaW50MTZ9IGV4dGVuZGVkIHZlcnRleFxuICAgICAqL1xuICAgIHh5MmV2KHgsIHkpIHtcbiAgICAgICAgcmV0dXJuIHkgKiB0aGlzLkVCU0laRSArIHg7XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICog57ea5b2i5bqn5qiZ44KS5ouh5by157ea5b2i5bqn5qiZ44Gr5aSJ5o+b44GX44G+44GZ44CCXG4gICAgICogQHBhcmFtIHtVaW50MTZ9IHJ2IHJhdyB2ZXJ0ZXhcbiAgICAgKiBAcmV0dXJucyB7VWludDE2fSBleHRlbmRlZCB2ZXJ0ZXhcbiAgICAgKi9cbiAgICBydjJldihydikge1xuICAgICAgICByZXR1cm4gcnYgPT09IHRoaXMuQlZDTlQgPyB0aGlzLlBBU1MgOiBydiAlIHRoaXMuQlNJWkUgKyAxICsgTWF0aC5mbG9vcihydiAvIHRoaXMuQlNJWkUgKyAxKSAqIHRoaXMuRUJTSVpFO1xuICAgIH1cblxuICAgIC8qKlxuICAgICAqIOaLoeW8tee3muW9ouW6p+aomeOCkue3muW9ouW6p+aomeOBq+WkieaPm+OBl+OBvuOBmeOAglxuICAgICAqIEBwYXJhbSB7VWludDE2fSBldlxuICAgICAqIEByZXR1cm5zIHtVaW50MTZ9IHJhdyB2ZXJ0ZXhcbiAgICAgKi9cbiAgICBldjJydihldikge1xuICAgICAgICByZXR1cm4gZXYgPT09IHRoaXMuUEFTUyA/IHRoaXMuQlZDTlQgOiBldiAlIHRoaXMuRUJTSVpFIC0gMSArIE1hdGguZmxvb3IoZXYgLyB0aGlzLkVCU0laRSAtIDEpICogdGhpcy5CU0laRTtcbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiDmi6HlvLXnt5rlvaLluqfmqJnjgpJHVFDjgYzkvb/nlKjjgZnjgovluqfmqJnjgavlpInmj5vjgZfjgb7jgZnjgIJcbiAgICAgKiBAcGFyYW0ge1VpbnQxNn0gZXZcbiAgICAgKiBAcmV0dXJucyB7c3RyaW5nfSBHVFDluqfmqJlcbiAgICAgKi9cbiAgICBldjJzdHIoZXYpIHtcbiAgICAgICAgaWYgKGV2ID49IHRoaXMuUEFTUykge1xuICAgICAgICAgICAgcmV0dXJuICdwYXNzJztcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIGNvbnN0IFt4LCB5XSA9IHRoaXMuZXYyeHkoZXYpO1xuICAgICAgICAgICAgcmV0dXJuIHRoaXMuWF9MQUJFTFMuY2hhckF0KHgpICsgeS50b1N0cmluZygpO1xuICAgICAgICB9XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogR1RQ44GM5L2/55So44GZ44KL5ouh5by157ea5b2i5bqn5qiZ44Gr5aSJ5o+b44GX44G+44GZ44CCXG4gICAgICogQHBhcmFtIHtzdHJpbmd9IHZcbiAgICAgKiBAcmV0dXJucyB7VWludDE2fSBleHRlbmRlZCB2ZXJ0ZXhcbiAgICAgKi9cbiAgICBzdHIyZXYodikge1xuICAgICAgICBjb25zdCB2U3RyID0gdi50b1VwcGVyQ2FzZSgpO1xuICAgICAgICBpZiAodlN0ciA9PT0gJ1BBU1MnIHx8IHZTdHIgPT09ICdSRVNJR04nKSB7XG4gICAgICAgICAgICByZXR1cm4gdGhpcy5QQVNTO1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgY29uc3QgeCA9IHRoaXMuWF9MQUJFTFMuaW5kZXhPZih2U3RyLmNoYXJBdCgwKSk7XG4gICAgICAgICAgICBjb25zdCB5ID0gcGFyc2VJbnQodlN0ci5zbGljZSgxKSk7XG4gICAgICAgICAgICByZXR1cm4gdGhpcy54eTJldih4LCB5KTtcbiAgICAgICAgfVxuICAgIH1cblxuICAgIC8qKlxuICAgICAqIHbjgavpmqPmjqXjgZnjgovkuqTngrnjga7luqfmqJnjgpLov5TjgZfjgb7jgZnjgIJcbiAgICAgKiBAcGFyYW0ge1VpbnQxNn19IHYg5ouh5by157ea5b2i5bqn5qiZXG4gICAgICovXG4gICAgbmVpZ2hib3JzKHYpIHtcbiAgICAgICAgcmV0dXJuIFt2ICsgMSwgdiArIHRoaXMuRUJTSVpFLCB2IC0gMSwgdiAtIHRoaXMuRUJTSVpFXTtcbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiB244Gr5pac44KB6Zqj5o6l44GZ44KL5Lqk54K544Gu5bqn5qiZ44KS6L+U44GX44G+44GZ44CCXG4gICAgICogQHBhcmFtIHtVaW50MTZ9fSB2IOaLoeW8tee3muW9ouW6p+aomVxuICAgICAqL1xuICAgIGRpYWdvbmFscyh2KSB7XG4gICAgICAgIHJldHVybiBbdiArIHRoaXMuRUJTSVpFICsgMSwgdiArIHRoaXMuRUJTSVpFIC0gMSwgdiAtIHRoaXMuRUJTSVpFIC0gMSwgdiAtIHRoaXMuRUJTSVpFICsgMV07XG4gICAgfVxuXG4gICAgaW5pdGlhbGl6ZVN5bW1ldHJpY1Jhd1ZlcnRleCgpIHtcbiAgICAgICAgZm9yIChsZXQgc3ltID0gMDsgc3ltIDwgODsgc3ltKyspIHtcbiAgICAgICAgICAgIGZvciAobGV0IHJ2ID0gMDsgcnYgPCB0aGlzLkJWQ05UOyBydisrKSB7XG4gICAgICAgICAgICAgICAgdGhpcy5zeW1tZXRyaWNSYXdWZXJ0ZXhbcnYgKiA4ICsgc3ltXSA9IHRoaXMuY2FsY1N5bW1ldHJpY1Jhd1ZlcnRleChydiwgc3ltKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgIH1cblxuICAgIC8qKlxuICAgICAqIOe3muW9ouW6p+aomeOBruWvvuensOWkieaPm+OCkui/lOOBl+OBvuOBmeOAglxuICAgICAqIEBwYXJhbSB7VWludDE2fSBydiDnt5rlvaLluqfmqJlcbiAgICAgKiBAcGFyYW0ge0ludGVnZXJ9IHN5bW1ldHJ5IOWvvuensOeVquWPt1xuICAgICAqIEByZXR1cm4ge1VpbnQxNn1cbiAgICAgKi9cbiAgICBnZXRTeW1tZXRyaWNSYXdWZXJ0ZXgocnYsIHN5bW1ldHJ5KSB7XG4gICAgICAgIHJldHVybiB0aGlzLnN5bW1ldHJpY1Jhd1ZlcnRleFtydiAqIDggKyBzeW1tZXRyeV07XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICog57ea5b2i5bqn5qiZ44Gu5a++56ew5aSJ5o+b44KS6KiI566X44GX44Gm6L+U44GX44G+44GZ44CCXG4gICAgICogQHBhcmFtIHtVaW50MTZ9IHJ2IOe3muW9ouW6p+aomVxuICAgICAqIEBwYXJhbSB7SW50ZWdlcn0gc3ltbWV0cnkg5a++56ew55Wq5Y+3XG4gICAgICovXG4gICAgY2FsY1N5bW1ldHJpY1Jhd1ZlcnRleChydiwgc3ltbWV0cnkpIHtcbiAgICAgICAgY29uc3QgY2VudGVyID0gKHRoaXMuQlNJWkUgLSAxKSAvIDI7XG4gICAgICAgIGxldCB4ID0gcnYgJSB0aGlzLkJTSVpFIC0gY2VudGVyO1xuICAgICAgICBsZXQgeSA9IE1hdGguZmxvb3IocnYgLyB0aGlzLkJTSVpFKSAtIGNlbnRlcjtcbiAgICAgICAgaWYgKHN5bW1ldHJ5ID49IDQpIHtcbiAgICAgICAgICAgIC8vIOmPoeWDj+WkieaPm1xuICAgICAgICAgICAgeCA9IC14O1xuICAgICAgICB9XG4gICAgICAgIGxldCB0bXA7XG4gICAgICAgIC8vIOWbnui7olxuICAgICAgICBzd2l0Y2ggKHN5bW1ldHJ5ICUgNCkge1xuICAgICAgICAgICAgY2FzZSAxOlxuICAgICAgICAgICAgICAgIHRtcCA9IHk7XG4gICAgICAgICAgICAgICAgeSA9IHg7XG4gICAgICAgICAgICAgICAgeCA9IC10bXA7XG4gICAgICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgICAgICBjYXNlIDI6XG4gICAgICAgICAgICAgICAgeCA9IC14O1xuICAgICAgICAgICAgICAgIHkgPSAteTtcbiAgICAgICAgICAgICAgICBicmVhaztcbiAgICAgICAgICAgIGNhc2UgMzpcbiAgICAgICAgICAgICAgICB0bXAgPSB5O1xuICAgICAgICAgICAgICAgIHkgPSAteDtcbiAgICAgICAgICAgICAgICB4ID0gdG1wO1xuICAgICAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICB9XG4gICAgICAgIHJldHVybiB4ICsgY2VudGVyICsgKHkgKyBjZW50ZXIpICogdGhpcy5CU0laRTtcbiAgICB9XG59XG5leHBvcnRzLkJvYXJkQ29uc3RhbnRzID0gQm9hcmRDb25zdGFudHM7IiwiJ3VzZSBzdHJpY3QnO1xuXG5PYmplY3QuZGVmaW5lUHJvcGVydHkoZXhwb3J0cywgXCJfX2VzTW9kdWxlXCIsIHtcbiAgICB2YWx1ZTogdHJ1ZVxufSk7XG5leHBvcnRzLk1DVFMgPSB1bmRlZmluZWQ7XG5cbnZhciBfdXRpbHMgPSByZXF1aXJlKCcuL3V0aWxzLmpzJyk7XG5cbnZhciBfYm9hcmQgPSByZXF1aXJlKCcuL2JvYXJkLmpzJyk7XG5cbi8qKlxuICogQGZpbGUg44Oi44Oz44OG44Kr44Or44Ot44OE44Oq44O85o6i57Si44Gu5a6f6KOF44Gn44GZ44CCXG4gKiDjgZPjga7jgrPjg7zjg4njga9QeWFx44Gu56e75qSN44Kz44O844OJ44Gn44GZ44CCXG4gKiBAc2VlIHtAbGluayBodHRwczovL2dpdGh1Yi5jb20veW1nYXEvUHlhcX1cbiAqL1xuLypcbiAqIEBhdXRob3Ig5biC5bed6ZuE5LqMXG4gKiBAY29weXJpZ2h0IDIwMTggSUNISUtBV0EsIFl1amkgKE5ldyAzIFJzKVxuICogQGxpY2Vuc2UgTUlUXG4gKi9cbmNvbnN0IE5PREVTX01BWF9MRU5HVEggPSAxNjM4NDtcbmNvbnN0IEVYUEFORF9DTlQgPSA4O1xuXG4vKiogTUNUU+OBruODjuODvOODieOCr+ODqeOCueOBp+OBmeOAgiAqL1xuY2xhc3MgTm9kZSB7XG4gICAgLyoqXG4gICAgICogTUNUU+OBruODjuODvOODieOCkueUn+aIkOOBl+OBvuOBmeOAglxuICAgICAqIEBwYXJhbSB7Qm9hcmRDb25zdGFudHN9IGNvbnN0YW50c1xuICAgICAqL1xuICAgIGNvbnN0cnVjdG9yKGNvbnN0YW50cykge1xuICAgICAgICB0aGlzLkMgPSBjb25zdGFudHM7XG4gICAgICAgIC8qKiDnnYDmiYvlgJnoo5zmlbDjgafjgZnjgIIo5ZCN5YmN44GuZWRnZeOBr+OCsOODqeODleeQhuirluOBruaeneOBruOBk+OBqOOBp+OBmeOAgikgKi9cbiAgICAgICAgdGhpcy5lZGdlTGVuZ3RoID0gMDtcbiAgICAgICAgLy/poLvnuYHjgarjg6Hjg6Ljg6rjgqLjg63jgrHjg7zjgrfjg6fjg7PjgpLpgb/jgZHjgovjgZ/jgoHjgIHmnp3mg4XloLHjgavlv4XopoHjgarmnIDlpKfjg6Hjg6Ljg6rjgpLkuojjgoHnorrkv53jgZfjgb7jgZnjgIJcbiAgICAgICAgLyoqIOODneODquOCt+ODvOeiuueOh+OBrumrmOOBhOmghuS4puOCk+OBoOedgOaJi+WAmeijnOOBp+OBmeOAgiAqL1xuICAgICAgICB0aGlzLm1vdmVzID0gbmV3IFVpbnQxNkFycmF5KHRoaXMuQy5CVkNOVCArIDEpO1xuICAgICAgICAvKiogbW92ZXPopoHntKDjgavlr77lv5zjgZnjgovjg53jg6rjgrfjg7znorrnjofjgafjgZnjgIIgKi9cbiAgICAgICAgdGhpcy5wcm9iYWJpbGl0aWVzID0gbmV3IEZsb2F0MzJBcnJheSh0aGlzLkMuQlZDTlQgKyAxKTtcbiAgICAgICAgLyoqIG1vdmVz6KaB57Sg44Gr5a++5b+c44GZ44KL44OQ44Oq44Ol44O844Gn44GZ44CC44Gf44Gg44GX44OO44O844OJ44Gu5omL55Wq44GL44KJ6KaL44Gm44Gu5YCk44Gn44GZ44CCICovXG4gICAgICAgIHRoaXMudmFsdWVzID0gbmV3IEZsb2F0MzJBcnJheSh0aGlzLkMuQlZDTlQgKyAxKTtcbiAgICAgICAgLyoqIG1vdmVz6KaB57Sg44Gr5a++5b+c44GZ44KL57eP44Ki44Kv44K344On44Oz44OQ44Oq44Ol44O844Gn44GZ44CC44Gf44Gg44GX44OO44O844OJ44Gu5omL55Wq44GL44KJ6KaL44Gm44Gu5YCk44Gn44GZ44CCICovXG4gICAgICAgIHRoaXMudG90YWxBY3Rpb25WYWx1ZXMgPSBuZXcgRmxvYXQzMkFycmF5KHRoaXMuQy5CVkNOVCArIDEpO1xuICAgICAgICAvKiogbW92ZXPopoHntKDjgavlr77lv5zjgZnjgovoqKrllY/lm57mlbDjgafjgZnjgIIgKi9cbiAgICAgICAgdGhpcy52aXNpdENvdW50cyA9IG5ldyBVaW50MzJBcnJheSh0aGlzLkMuQlZDTlQgKyAxKTtcbiAgICAgICAgLyoqIG1vdmVz6KaB57Sg44Gr5a++5b+c44GZ44KL44OO44O844OJSUTjgafjgZnjgIIgKi9cbiAgICAgICAgdGhpcy5ub2RlSWRzID0gbmV3IEludDE2QXJyYXkodGhpcy5DLkJWQ05UICsgMSk7XG4gICAgICAgIC8qKiBtb3Zlc+imgee0oOOBq+WvvuW/nOOBmeOCi+ODj+ODg+OCt+ODpeOBp+OBmeOAgiAqL1xuICAgICAgICB0aGlzLmhhc2hlcyA9IG5ldyBVaW50MzJBcnJheSh0aGlzLkMuQlZDTlQgKyAxKTtcbiAgICAgICAgLyoqIG1vdmVz6KaB57Sg44Gr5a++5b+c44GZ44KL5bGA6Z2i44Gu44OL44Ol44O844Op44Or44ON44OD44OI44Ov44O844Kv44KS6KiI566X44GX44Gf44GL5ZCm44GL44KS5L+d5oyB44GX44G+44GZ44CCICovXG4gICAgICAgIHRoaXMuZXZhbHVhdGVkID0gbmV3IFVpbnQ4QXJyYXkodGhpcy5DLkJWQ05UICsgMSk7XG4gICAgICAgIHRoaXMudG90YWxWYWx1ZSA9IDAuMDtcbiAgICAgICAgdGhpcy50b3RhbENvdW50ID0gMDtcbiAgICAgICAgdGhpcy5oYXNoID0gMDtcbiAgICAgICAgdGhpcy5tb3ZlTnVtYmVyID0gLTE7XG4gICAgICAgIHRoaXMuZXhpdENvbmRpdGlvbiA9IG51bGw7XG4gICAgICAgIHRoaXMuY2xlYXIoKTtcbiAgICB9XG5cbiAgICAvKiog5pyq5L2/55So54q25oWL44Gr44GX44G+44GZ44CCICovXG4gICAgY2xlYXIoKSB7XG4gICAgICAgIHRoaXMuZWRnZUxlbmd0aCA9IDA7XG4gICAgICAgIHRoaXMudG90YWxWYWx1ZSA9IDAuMDtcbiAgICAgICAgdGhpcy50b3RhbENvdW50ID0gMDtcbiAgICAgICAgdGhpcy5oYXNoID0gMDtcbiAgICAgICAgdGhpcy5tb3ZlTnVtYmVyID0gLTE7XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICog5Yid5pyf5YyW44GX44G+44GZ44CCXG4gICAgICogQHBhcmFtIHtvYmplY3R9IGNhbmRpZGF0ZXMgQm9hcmTjgYznlJ/miJDjgZnjgovlgJnoo5zmiYvmg4XloLHjgafjgZnjgIJcbiAgICAgKiBAcGFyYW0ge0Zsb2F0MzJBcnJheX0gcHJvYiDnnYDmiYvnorrnjoco44OL44Ol44O844Op44Or44ON44OD44OI44Ov44O844Kv44Gu44Od44Oq44K344O85Ye65YqbKeOBp+OBmeOAglxuICAgICAqL1xuICAgIGluaXRpYWxpemUoY2FuZGlkYXRlcywgcHJvYikge1xuICAgICAgICB0aGlzLmNsZWFyKCk7XG4gICAgICAgIHRoaXMubW92ZU51bWJlciA9IGNhbmRpZGF0ZXMubW92ZU51bWJlcjtcbiAgICAgICAgdGhpcy5oYXNoID0gY2FuZGlkYXRlcy5oYXNoO1xuXG4gICAgICAgIGZvciAoY29uc3QgcnYgb2YgKDAsIF91dGlscy5hcmdzb3J0KShwcm9iLCB0cnVlKSkge1xuICAgICAgICAgICAgaWYgKGNhbmRpZGF0ZXMubGlzdC5pbmNsdWRlcyhydikpIHtcbiAgICAgICAgICAgICAgICB0aGlzLm1vdmVzW3RoaXMuZWRnZUxlbmd0aF0gPSB0aGlzLkMucnYyZXYocnYpO1xuICAgICAgICAgICAgICAgIHRoaXMucHJvYmFiaWxpdGllc1t0aGlzLmVkZ2VMZW5ndGhdID0gcHJvYltydl07XG4gICAgICAgICAgICAgICAgdGhpcy52YWx1ZXNbdGhpcy5lZGdlTGVuZ3RoXSA9IDAuMDtcbiAgICAgICAgICAgICAgICB0aGlzLnRvdGFsQWN0aW9uVmFsdWVzW3RoaXMuZWRnZUxlbmd0aF0gPSAwLjA7XG4gICAgICAgICAgICAgICAgdGhpcy52aXNpdENvdW50c1t0aGlzLmVkZ2VMZW5ndGhdID0gMDtcbiAgICAgICAgICAgICAgICB0aGlzLm5vZGVJZHNbdGhpcy5lZGdlTGVuZ3RoXSA9IC0xO1xuICAgICAgICAgICAgICAgIHRoaXMuaGFzaGVzW3RoaXMuZWRnZUxlbmd0aF0gPSAwO1xuICAgICAgICAgICAgICAgIHRoaXMuZXZhbHVhdGVkW3RoaXMuZWRnZUxlbmd0aF0gPSBmYWxzZTtcbiAgICAgICAgICAgICAgICB0aGlzLmVkZ2VMZW5ndGggKz0gMTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgIH1cblxuICAgIC8qKlxuICAgICAqIOOCqOODg+OCuOOBruS4reOBruODmeOCueODiDLjga7jgqTjg7Pjg4fjg4Pjgq/jgrnjgpLov5TjgZfjgb7jgZnjgIJcbiAgICAgKiBAcmV0dXJucyB7SW50ZWdlcltdfVxuICAgICAqL1xuICAgIGJlc3QyKCkge1xuICAgICAgICBjb25zdCBvcmRlciA9ICgwLCBfdXRpbHMuYXJnc29ydCkodGhpcy52aXNpdENvdW50cy5zbGljZSgwLCB0aGlzLmVkZ2VMZW5ndGgpLCB0cnVlKTtcbiAgICAgICAgcmV0dXJuIG9yZGVyLnNsaWNlKDAsIDIpO1xuICAgIH1cbn1cblxuLyoqIOODouODs+ODhuOCq+ODq+ODreODhOODquODvOaOoue0ouOCkuWun+ihjOOBmeOCi+OCr+ODqeOCueOBp+OBmeOAgiAqL1xuY2xhc3MgTUNUUyB7XG4gICAgLyoqXG4gICAgICog44Kz44Oz44K544OI44Op44Kv44K/XG4gICAgICogQHBhcmFtIHtOZXVyYWxOZXR3b3JrfSBubiBcbiAgICAgKiBAcGFyYW0ge0JvYXJkQ29uc3RhbnRzfSBDXG4gICAgICovXG4gICAgY29uc3RydWN0b3Iobm4sIEMpIHtcbiAgICAgICAgdGhpcy5DX1BVQ1QgPSAwLjAxO1xuICAgICAgICB0aGlzLm1haW5UaW1lID0gMC4wO1xuICAgICAgICB0aGlzLmJ5b3lvbWkgPSAxLjA7XG4gICAgICAgIHRoaXMubGVmdFRpbWUgPSAwLjA7XG4gICAgICAgIHRoaXMubm9kZXMgPSBbXTtcbiAgICAgICAgdGhpcy5ub2Rlc0xlbmd0aCA9IDA7XG4gICAgICAgIGZvciAobGV0IGkgPSAwOyBpIDwgTk9ERVNfTUFYX0xFTkdUSDsgaSsrKSB7XG4gICAgICAgICAgICB0aGlzLm5vZGVzLnB1c2gobmV3IE5vZGUoQykpO1xuICAgICAgICB9XG4gICAgICAgIHRoaXMucm9vdElkID0gMDtcbiAgICAgICAgdGhpcy5yb290TW92ZU51bWJlciA9IDA7XG4gICAgICAgIHRoaXMubm9kZUhhc2hlcyA9IG5ldyBNYXAoKTtcbiAgICAgICAgdGhpcy5ldmFsQ291bnQgPSAwO1xuICAgICAgICB0aGlzLm5uID0gbm47XG4gICAgICAgIHRoaXMudGVybWluYXRlRmxhZyA9IGZhbHNlO1xuICAgIH1cblxuICAgIC8qKlxuICAgICAqIOaMgeOBoeaZgumWk+OBruioreWumuOCkuOBl+OBvuOBmeOAglxuICAgICAqIOaui+OCiuaZgumWk+OCguODquOCu+ODg+ODiOOBl+OBvuOBmeOAglxuICAgICAqIEBwYXJhbSB7bnVtYmVyfSBtYWluVGltZSDnp5JcbiAgICAgKiBAcGFyYW0ge251bWJlcn0gYnlveW9taSDnp5JcbiAgICAgKi9cbiAgICBzZXRUaW1lKG1haW5UaW1lLCBieW95b21pKSB7XG4gICAgICAgIHRoaXMubWFpblRpbWUgPSBtYWluVGltZTtcbiAgICAgICAgdGhpcy5sZWZ0VGltZSA9IG1haW5UaW1lO1xuICAgICAgICB0aGlzLmJ5b3lvbWkgPSBieW95b21pO1xuICAgIH1cblxuICAgIC8qKlxuICAgICAqIOaui+OCiuaZgumWk+OCkuioreWumuOBl+OBvuOBmeOAglxuICAgICAqIEBwYXJhbSB7bnVtYmVyfSBsZWZ0VGltZSDnp5JcbiAgICAgKi9cbiAgICBzZXRMZWZ0VGltZShsZWZ0VGltZSkge1xuICAgICAgICB0aGlzLmxlZnRUaW1lID0gbGVmdFRpbWU7XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICog5YaF6YOo54q25oWL44KS44Kv44Oq44Ki44GX44G+44GZ44CCXG4gICAgICog5ZCM5LiA5pmC6ZaT6Kit5a6a44Gn5Yid5omL44GL44KJ5a++5bGA44Gn44GN44KL44KI44GG44Gr44Gq44KK44G+44GZ44CCXG4gICAgICovXG4gICAgY2xlYXIoKSB7XG4gICAgICAgIHRoaXMubGVmdFRpbWUgPSB0aGlzLm1haW5UaW1lO1xuICAgICAgICBmb3IgKGNvbnN0IG5vZGUgb2YgdGhpcy5ub2Rlcykge1xuICAgICAgICAgICAgbm9kZS5jbGVhcigpO1xuICAgICAgICB9XG4gICAgICAgIHRoaXMubm9kZXNMZW5ndGggPSAwO1xuICAgICAgICB0aGlzLnJvb3RJZCA9IDA7XG4gICAgICAgIHRoaXMucm9vdE1vdmVOdW1iZXIgPSAwO1xuICAgICAgICB0aGlzLm5vZGVIYXNoZXMuY2xlYXIoKTtcbiAgICAgICAgdGhpcy5ldmFsQ291bnQgPSAwO1xuICAgIH1cblxuICAgIC8qKlxuICAgICAqIOWxgOmdomLjga5NQ1RT44Gu5o6i57Si44OO44O844OJ44GM5pei44Gr44GC44KL44GL56K66KqN44GX44CB44Gq44GR44KM44Gw55Sf5oiQ44GX44Gm44OO44O844OJSUTjgpLov5TjgZfjgb7jgZnjgIJcbiAgICAgKiBAcGFyYW0ge0JvYXJkfSBiIFxuICAgICAqIEBwYXJhbSB7RmxvYXQzMkFycmF5fSBwcm9iIFxuICAgICAqIEByZXR1cm5zIHtJbnRlZ2VyfSDjg47jg7zjg4lJRFxuICAgICAqL1xuICAgIGNyZWF0ZU5vZGUoYiwgcHJvYikge1xuICAgICAgICBjb25zdCBjYW5kaWRhdGVzID0gYi5jYW5kaWRhdGVzKCk7XG4gICAgICAgIGNvbnN0IGhhc2ggPSBjYW5kaWRhdGVzLmhhc2g7XG4gICAgICAgIGlmICh0aGlzLm5vZGVIYXNoZXMuaGFzKGhhc2gpICYmIHRoaXMubm9kZXNbdGhpcy5ub2RlSGFzaGVzLmdldChoYXNoKV0uaGFzaCA9PT0gaGFzaCAmJiB0aGlzLm5vZGVzW3RoaXMubm9kZUhhc2hlcy5nZXQoaGFzaCldLm1vdmVOdW1iZXIgPT09IGNhbmRpZGF0ZXMubW92ZU51bWJlcikge1xuICAgICAgICAgICAgcmV0dXJuIHRoaXMubm9kZUhhc2hlcy5nZXQoaGFzaCk7XG4gICAgICAgIH1cblxuICAgICAgICBsZXQgbm9kZUlkID0gaGFzaCAlIE5PREVTX01BWF9MRU5HVEg7XG4gICAgICAgIHdoaWxlICh0aGlzLm5vZGVzW25vZGVJZF0ubW92ZU51bWJlciAhPT0gLTEpIHtcbiAgICAgICAgICAgIG5vZGVJZCA9IG5vZGVJZCArIDEgPCBOT0RFU19NQVhfTEVOR1RIID8gbm9kZUlkICsgMSA6IDA7XG4gICAgICAgIH1cblxuICAgICAgICB0aGlzLm5vZGVIYXNoZXMuc2V0KGhhc2gsIG5vZGVJZCk7XG4gICAgICAgIHRoaXMubm9kZXNMZW5ndGggKz0gMTtcblxuICAgICAgICBjb25zdCBub2RlID0gdGhpcy5ub2Rlc1tub2RlSWRdO1xuICAgICAgICBub2RlLmluaXRpYWxpemUoY2FuZGlkYXRlcywgcHJvYik7XG4gICAgICAgIHJldHVybiBub2RlSWQ7XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogbm9kZXPjga7kuK3jga7kuI3opoHjgarjg47jg7zjg4njgpLmnKrkvb/nlKjnirbmhYvjgavmiLvjgZfjgb7jgZnjgIJcbiAgICAgKi9cbiAgICBjbGVhbnVwTm9kZXMoKSB7XG4gICAgICAgIGlmICh0aGlzLm5vZGVzTGVuZ3RoIDwgTk9ERVNfTUFYX0xFTkdUSCAvIDIpIHtcbiAgICAgICAgICAgIHJldHVybjtcbiAgICAgICAgfVxuICAgICAgICBmb3IgKGxldCBpID0gMDsgaSA8IE5PREVTX01BWF9MRU5HVEg7IGkrKykge1xuICAgICAgICAgICAgY29uc3QgbWMgPSB0aGlzLm5vZGVzW2ldLm1vdmVOdW1iZXI7XG4gICAgICAgICAgICBpZiAobWMgIT0gbnVsbCAmJiBtYyA8IHRoaXMucm9vdE1vdmVOdW1iZXIpIHtcbiAgICAgICAgICAgICAgICB0aGlzLm5vZGVIYXNoZXMuZGVsZXRlKHRoaXMubm9kZXNbaV0uaGFzaCk7XG4gICAgICAgICAgICAgICAgdGhpcy5ub2Rlc1tpXS5jbGVhcigpO1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogVUNC6KmV5L6h44Gn5pyA5ZaE44Gu552A5omL5oOF5aCx44KS6L+U44GX44G+44GZ44CCXG4gICAgICogQHBhcmFtIHtCb2FyZH0gYiBcbiAgICAgKiBAcGFyYW0ge0ludGVnZXJ9IG5vZGVJZCBcbiAgICAgKiBAcmV0dXJucyB7QXJyYXl9IFtVQ0Lpgbjmip7jgqTjg7Pjg4fjg4Pjgq/jgrksIOacgOWWhOODluODqeODs+ODgeOBruWtkOODjuODvOODiUlELCDnnYDmiYtdXG4gICAgICovXG4gICAgc2VsZWN0QnlVQ0IoYiwgbm9kZSkge1xuICAgICAgICBjb25zdCBuZFJhdGUgPSBub2RlLnRvdGFsQ291bnQgPT09IDAgPyAwLjAgOiBub2RlLnRvdGFsVmFsdWUgLyBub2RlLnRvdGFsQ291bnQ7XG4gICAgICAgIGNvbnN0IGNwc3YgPSB0aGlzLkNfUFVDVCAqIE1hdGguc3FydChub2RlLnRvdGFsQ291bnQpO1xuICAgICAgICBjb25zdCBtZWFuQWN0aW9uVmFsdWVzID0gbmV3IEZsb2F0MzJBcnJheShub2RlLmVkZ2VMZW5ndGgpO1xuICAgICAgICBmb3IgKGxldCBpID0gMDsgaSA8IG1lYW5BY3Rpb25WYWx1ZXMubGVuZ3RoOyBpKyspIHtcbiAgICAgICAgICAgIG1lYW5BY3Rpb25WYWx1ZXNbaV0gPSBub2RlLnZpc2l0Q291bnRzW2ldID09PSAwID8gbmRSYXRlIDogbm9kZS50b3RhbEFjdGlvblZhbHVlc1tpXSAvIG5vZGUudmlzaXRDb3VudHNbaV07XG4gICAgICAgIH1cbiAgICAgICAgY29uc3QgdWNiID0gbmV3IEZsb2F0MzJBcnJheShub2RlLmVkZ2VMZW5ndGgpO1xuICAgICAgICBmb3IgKGxldCBpID0gMDsgaSA8IHVjYi5sZW5ndGg7IGkrKykge1xuICAgICAgICAgICAgdWNiW2ldID0gbWVhbkFjdGlvblZhbHVlc1tpXSArIGNwc3YgKiBub2RlLnByb2JhYmlsaXRpZXNbaV0gLyAoMSArIG5vZGUudmlzaXRDb3VudHNbaV0pO1xuICAgICAgICB9XG4gICAgICAgIGNvbnN0IHNlbGVjdGVkSW5kZXggPSAoMCwgX3V0aWxzLmFyZ21heCkodWNiKTtcbiAgICAgICAgY29uc3Qgc2VsZWN0ZWRJZCA9IG5vZGUubm9kZUlkc1tzZWxlY3RlZEluZGV4XTtcbiAgICAgICAgY29uc3Qgc2VsZWN0ZWRNb3ZlID0gbm9kZS5tb3Zlc1tzZWxlY3RlZEluZGV4XTtcbiAgICAgICAgcmV0dXJuIFtzZWxlY3RlZEluZGV4LCBzZWxlY3RlZElkLCBzZWxlY3RlZE1vdmVdO1xuICAgIH1cblxuICAgIC8qKlxuICAgICAqIOaknOe0ouOBmeOCi+OBi+OBqeOBhuOBi+OCkuaxuuWumuOBl+OBvuOBmeOAglxuICAgICAqIEBwYXJhbSB7SW50ZWdlcn0gYmVzdCBcbiAgICAgKiBAcGFyYW0ge0ludGVnZXJ9IHNlY29uZCBcbiAgICAgKi9cbiAgICBzaG91bGRTZWFyY2goYmVzdCwgc2Vjb25kKSB7XG4gICAgICAgIGNvbnN0IG5vZGUgPSB0aGlzLm5vZGVzW3RoaXMucm9vdElkXTtcbiAgICAgICAgY29uc3Qgd2lucmF0ZSA9IHRoaXMud2lucmF0ZShub2RlLCBiZXN0KTtcblxuICAgICAgICAvLyDoqKrllY/lm57mlbDjgYzotrPjgorjgabjgYTjgarjgYTjgYvjgIHpmpvnq4vjgaPjgZ/miYvjgYzjgarjgY/jgYvjgaTjga/jgaPjgY3jgorli53jgaHjgZjjgoPjgarjgYTjgajjgY1cbiAgICAgICAgcmV0dXJuIG5vZGUudG90YWxDb3VudCA8PSA1MDAwIHx8IG5vZGUudmlzaXRDb3VudHNbYmVzdF0gPD0gbm9kZS52aXNpdENvdW50c1tzZWNvbmRdICogMTAwICYmIHdpbnJhdGUgPD0gMC45NTtcbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiDmrKHjga7nnYDmiYvjga7ogIPmha7mmYLplpPjgpLnrpflh7rjgZfjgb7jgZnjgIJcbiAgICAgKiBAcmV0dXJucyB7bnVtYmVyfSDkvb/nlKjjgZnjgovmmYLplpMo56eSKVxuICAgICAqL1xuICAgIGdldFNlYXJjaFRpbWUoQykge1xuICAgICAgICBpZiAodGhpcy5tYWluVGltZSA9PT0gMC4wIHx8IHRoaXMubGVmdFRpbWUgPCB0aGlzLmJ5b3lvbWkgKiAyLjApIHtcbiAgICAgICAgICAgIHJldHVybiBNYXRoLm1heCh0aGlzLmJ5b3lvbWksIDEuMCk7XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAvLyDnooHnm6TjgpLln4vjgoHjgovjgZPjgajjgpLku67lrprjgZfjgIHmrovjgorjga7miYvmlbDjgpLnrpflh7rjgZfjgb7jgZnjgIJcbiAgICAgICAgICAgIGNvbnN0IGFzc3VtZWRSZW1haW5pbmdNb3ZlcyA9IChDLkJWQ05UIC0gdGhpcy5yb290TW92ZU51bWJlcikgLyAyO1xuICAgICAgICAgICAgLy/luIPnn7Pjgafjga/jgojjgorlpJrjgY/jga7miYvmlbDjgpLku67lrprjgZfjgIHmgKXjgY7jgb7jgZnjgIJcbiAgICAgICAgICAgIGNvbnN0IG9wZW5pbmdPZmZzZXQgPSBNYXRoLm1heChDLkJWQ05UIC8gMTAgLSB0aGlzLnJvb3RNb3ZlTnVtYmVyLCAwKTtcbiAgICAgICAgICAgIHJldHVybiB0aGlzLmxlZnRUaW1lIC8gKGFzc3VtZWRSZW1haW5pbmdNb3ZlcyArIG9wZW5pbmdPZmZzZXQpICsgdGhpcy5ieW95b21pO1xuICAgICAgICB9XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogbm9kZUlk44Gu44OO44O844OJ44GuZWRnZUluZGV444Gu44Ko44OD44K444Gr5a++5b+c44GZ44KL44OO44O844OJ44GM5pei44Gr5a2Y5Zyo44GZ44KL44GL6L+U44GX44G+44GZ44CCXG4gICAgICogQHBhcmFtIHtJbnRlZ2VyfSBub2RlSWQgXG4gICAgICogQHBhcmFtIHtJbnRlZ2VyfSBlZGdlSW5kZXggXG4gICAgICogQHBhcmFtIHtJbnRlZ2VyfSBtb3ZlTnVtYmVyIFxuICAgICAqIEByZXR1cm5zIHtib29sfVxuICAgICAqL1xuICAgIGhhc0VkZ2VOb2RlKGVkZ2VJbmRleCwgbm9kZUlkLCBtb3ZlTnVtYmVyKSB7XG4gICAgICAgIGNvbnN0IG5vZGUgPSB0aGlzLm5vZGVzW25vZGVJZF07XG4gICAgICAgIGNvbnN0IGVkZ2VJZCA9IG5vZGUubm9kZUlkc1tlZGdlSW5kZXhdO1xuICAgICAgICByZXR1cm4gZWRnZUlkID49IDAgJiYgbm9kZS5oYXNoZXNbZWRnZUluZGV4XSA9PT0gdGhpcy5ub2Rlc1tlZGdlSWRdLmhhc2ggJiYgdGhpcy5ub2Rlc1tlZGdlSWRdLm1vdmVOdW1iZXIgPT09IG1vdmVOdW1iZXI7XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogaW5kZXjjga7jgqjjg4Pjgrjjga7li53njofjgpLov5TjgZfjgb7jgZnjgIJcbiAgICAgKiBAcGFyYW0ge05vZGV9IG5vZGUgXG4gICAgICogQHBhcmFtIHtJbnRlZ2VyfSBpbmRleCBcbiAgICAgKiBAcmV0dXJucyB7bnVtYmVyfVxuICAgICAqL1xuICAgIHdpbnJhdGUobm9kZSwgaW5kZXgpIHtcbiAgICAgICAgcmV0dXJuIG5vZGUudG90YWxBY3Rpb25WYWx1ZXNbaW5kZXhdIC8gTWF0aC5tYXgobm9kZS52aXNpdENvdW50c1tpbmRleF0sIDEpIC8gMi4wICsgMC41O1xuICAgIH1cblxuICAgIC8qKlxuICAgICAqIHByaW50SW5mb+OBruODmOODq+ODkeODvOmWouaVsOOBp+OBmeOAglxuICAgICAqIEBwcml2YXRlXG4gICAgICogQHBhcmFtIHtJbnRlZ2VyfSBub2RlSWQgXG4gICAgICogQHBhcmFtIHsqfSBoZWFkTW92ZSBcbiAgICAgKiBAcGFyYW0ge0JvYXJkQ29uc3RhbnRzfSBjIFxuICAgICAqL1xuICAgIGJlc3RTZXF1ZW5jZShub2RlSWQsIGhlYWRNb3ZlLCBjKSB7XG4gICAgICAgIGxldCBzZXFTdHIgPSAoJyAgICcgKyBjLmV2MnN0cihoZWFkTW92ZSkpLnNsaWNlKC01KTtcbiAgICAgICAgbGV0IG5leHRNb3ZlID0gaGVhZE1vdmU7XG5cbiAgICAgICAgZm9yIChsZXQgaSA9IDA7IGkgPCA3OyBpKyspIHtcbiAgICAgICAgICAgIGNvbnN0IG5vZGUgPSB0aGlzLm5vZGVzW25vZGVJZF07XG4gICAgICAgICAgICBpZiAobmV4dE1vdmUgPT09IGMuUEFTUyB8fCBub2RlLmVkZ2VMZW5ndGggPCAxKSB7XG4gICAgICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgICAgICB9XG5cbiAgICAgICAgICAgIGNvbnN0IGJlc3QgPSAoMCwgX3V0aWxzLmFyZ21heCkobm9kZS52aXNpdENvdW50cy5zbGljZSgwLCBub2RlLmVkZ2VMZW5ndGgpKTtcbiAgICAgICAgICAgIGlmIChub2RlLnZpc2l0Q291bnRzW2Jlc3RdID09PSAwKSB7XG4gICAgICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBuZXh0TW92ZSA9IG5vZGUubW92ZXNbYmVzdF07XG4gICAgICAgICAgICBzZXFTdHIgKz0gJy0+JyArICgnICAgJyArIGMuZXYyc3RyKG5leHRNb3ZlKSkuc2xpY2UoLTUpO1xuXG4gICAgICAgICAgICBpZiAoIXRoaXMuaGFzRWRnZU5vZGUoYmVzdCwgbm9kZUlkLCBub2RlLm1vdmVOdW1iZXIgKyAxKSkge1xuICAgICAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgbm9kZUlkID0gbm9kZS5ub2RlSWRzW2Jlc3RdO1xuICAgICAgICB9XG5cbiAgICAgICAgcmV0dXJuIHNlcVN0cjtcbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiDmjqLntKLntZDmnpzjga7oqbPntLDjgpLooajnpLrjgZfjgb7jgZnjgIJcbiAgICAgKiBAcGFyYW0ge0ludGVnZXJ9IG5vZGVJZCBcbiAgICAgKiBAcGFyYW0ge0JvYXJkQ29uc3RhbnRzfSBjXG4gICAgICovXG4gICAgcHJpbnRJbmZvKG5vZGVJZCwgYykge1xuICAgICAgICBjb25zdCBub2RlID0gdGhpcy5ub2Rlc1tub2RlSWRdO1xuICAgICAgICBjb25zdCBvcmRlciA9ICgwLCBfdXRpbHMuYXJnc29ydCkobm9kZS52aXNpdENvdW50cy5zbGljZSgwLCBub2RlLmVkZ2VMZW5ndGgpLCB0cnVlKTtcbiAgICAgICAgY29uc29sZS5sb2coJ3xtb3ZlfGNvdW50ICB8cmF0ZSB8dmFsdWV8cHJvYiB8IGJlc3Qgc2VxdWVuY2UnKTtcbiAgICAgICAgZm9yIChsZXQgaSA9IDA7IGkgPCBNYXRoLm1pbihvcmRlci5sZW5ndGgsIDkpOyBpKyspIHtcbiAgICAgICAgICAgIGNvbnN0IG0gPSBvcmRlcltpXTtcbiAgICAgICAgICAgIGNvbnN0IHZpc2l0Q291bnRzID0gbm9kZS52aXNpdENvdW50c1ttXTtcbiAgICAgICAgICAgIGlmICh2aXNpdENvdW50cyA9PT0gMCkge1xuICAgICAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICBjb25zdCByYXRlID0gdmlzaXRDb3VudHMgPT09IDAgPyAwLjAgOiB0aGlzLndpbnJhdGUobm9kZSwgbSkgKiAxMDAuMDtcbiAgICAgICAgICAgIGNvbnN0IHZhbHVlID0gKG5vZGUudmFsdWVzW21dIC8gMi4wICsgMC41KSAqIDEwMC4wO1xuICAgICAgICAgICAgY29uc29sZS5sb2coJ3wlc3wlc3wlc3wlc3wlc3wgJXMnLCAoJyAgICcgKyBjLmV2MnN0cihub2RlLm1vdmVzW21dKSkuc2xpY2UoLTQpLCAodmlzaXRDb3VudHMgKyAnICAgICAgJykuc2xpY2UoMCwgNyksICgnICAnICsgcmF0ZS50b0ZpeGVkKDEpKS5zbGljZSgtNSksICgnICAnICsgdmFsdWUudG9GaXhlZCgxKSkuc2xpY2UoLTUpLCAoJyAgJyArIChub2RlLnByb2JhYmlsaXRpZXNbbV0gKiAxMDAuMCkudG9GaXhlZCgxKSkuc2xpY2UoLTUpLCB0aGlzLmJlc3RTZXF1ZW5jZShub2RlLm5vZGVJZHNbbV0sIG5vZGUubW92ZXNbbV0sIGMpKTtcbiAgICAgICAgfVxuICAgIH1cblxuICAgIC8qKlxuICAgICAqIOODi+ODpeODvOODqeODq+ODjeODg+ODiOODr+ODvOOCr+OBp+WxgOmdouOCkuipleS+oeOBl+OBvuOBmeOAglxuICAgICAqIOODqeODs+ODgOODoOOBq+WxgOmdouOCkuWvvuensOWkieaPm+OBleOBm+OCi+apn+iDveOCkuaMgeOBoeOBvuOBmeOAglxuICAgICAqIEBwYXJhbSB7Qm9hcmR9IGJcbiAgICAgKiBAcGFyYW0ge2Jvb2x9IHJhbmRvbVxuICAgICAqIEByZXR1cm5zIHtGbG9hdDMyQXJyYXlbXX1cbiAgICAgKi9cbiAgICBhc3luYyBldmFsdWF0ZShiLCByYW5kb20gPSB0cnVlKSB7XG4gICAgICAgIGNvbnN0IHN5bW1ldHJ5ID0gcmFuZG9tID8gTWF0aC5mbG9vcihNYXRoLnJhbmRvbSgpICogOCkgOiAwO1xuICAgICAgICBjb25zdCBbcHJvYiwgdmFsdWVdID0gYXdhaXQgdGhpcy5ubi5ldmFsdWF0ZShiLmZlYXR1cmUoc3ltbWV0cnkpKTtcbiAgICAgICAgaWYgKHN5bW1ldHJ5ICE9PSAwKSB7XG4gICAgICAgICAgICBjb25zdCBwID0gbmV3IEZsb2F0MzJBcnJheShwcm9iLmxlbmd0aCk7XG4gICAgICAgICAgICBmb3IgKGxldCBydiA9IDA7IHJ2IDwgYi5DLkJWQ05UOyBydisrKSB7XG4gICAgICAgICAgICAgICAgcFtydl0gPSBwcm9iW2IuQy5nZXRTeW1tZXRyaWNSYXdWZXJ0ZXgocnYsIHN5bW1ldHJ5KV07XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBwW3Byb2IubGVuZ3RoIC0gMV0gPSBwcm9iW3Byb2IubGVuZ3RoIC0gMV07XG4gICAgICAgICAgICByZXR1cm4gW3AsIHZhbHVlXTtcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIHJldHVybiBbcHJvYiwgdmFsdWVdO1xuICAgICAgICB9XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICog5qSc57Si44Gu5YmN5Yem55CG44Gn44GZ44CCXG4gICAgICogQHByaXZhdGVcbiAgICAgKiBAcGFyYW0ge0JvYXJkfSBiIFxuICAgICAqL1xuICAgIGFzeW5jIHByZXBhcmVSb290Tm9kZShiKSB7XG4gICAgICAgIGNvbnN0IGhhc2ggPSBiLmhhc2goKTtcbiAgICAgICAgdGhpcy5yb290TW92ZU51bWJlciA9IGIubW92ZU51bWJlcjtcbiAgICAgICAgdGhpcy5DX1BVQ1QgPSB0aGlzLnJvb3RNb3ZlTnVtYmVyIDwgOCA/IDAuMDEgOiAxLjU7XG4gICAgICAgIGlmICh0aGlzLm5vZGVIYXNoZXMuaGFzKGhhc2gpICYmIHRoaXMubm9kZXNbdGhpcy5ub2RlSGFzaGVzLmdldChoYXNoKV0uaGFzaCA9PT0gaGFzaCAmJiB0aGlzLm5vZGVzW3RoaXMubm9kZUhhc2hlcy5nZXQoaGFzaCldLm1vdmVOdW1iZXIgPT09IHRoaXMucm9vdE1vdmVOdW1iZXIpIHtcbiAgICAgICAgICAgIHRoaXMucm9vdElkID0gdGhpcy5ub2RlSGFzaGVzLmdldChoYXNoKTtcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIGNvbnN0IFtwcm9iXSA9IGF3YWl0IHRoaXMuZXZhbHVhdGUoYik7XG5cbiAgICAgICAgICAgIC8vIEFscGhhR28gWmVyb+OBp+OBr+iHquW3seWvvuaIpuaZguOBq+OBr+OBk+OBk+OBp3Byb2LjgatcIkRpcmljaGxldOODjuOCpOOCulwi44KS6L+95Yqg44GX44G+44GZ44GM44CB5pys44Kz44O844OJ44Gn44Gv5by35YyW5a2m57+S44Gv5LqI5a6a44GX44Gm44GE44Gq44GE44Gu44Gn6KiY6L+w44GX44G+44Gb44KT44CCXG5cbiAgICAgICAgICAgIHRoaXMucm9vdElkID0gdGhpcy5jcmVhdGVOb2RlKGIsIHByb2IpO1xuICAgICAgICB9XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogZWRnZUluZGV444Gu44Ko44OD44K444Gu5bGA6Z2i44KS6KmV5L6h44GX44OO44O844OJ44KS55Sf5oiQ44GX44Gm44OQ44Oq44Ol44O844KS6L+U44GX44G+44GZ44CCXG4gICAgICogQHByaXZhdGVcbiAgICAgKiBAcGFyYW0ge0JvYXJkfSBiIFxuICAgICAqIEBwYXJhbSB7SW50ZWdlcn0gZWRnZUluZGV4IFxuICAgICAqIEBwYXJhbSB7Tm9kZX0gcGFyZW50Tm9kZSBcbiAgICAgKiBAcmV0dXJucyB7bnVtYmVyfSBwYXJlbnROb2Rl44Gu5omL55Wq44GL44KJ6KaL44GfZWRnZeWxgOmdouOBruODkOODquODpeODvFxuICAgICAqL1xuICAgIGFzeW5jIGV2YWx1YXRlRWRnZShiLCBlZGdlSW5kZXgsIHBhcmVudE5vZGUpIHtcbiAgICAgICAgbGV0IFtwcm9iLCB2YWx1ZV0gPSBhd2FpdCB0aGlzLmV2YWx1YXRlKGIpO1xuICAgICAgICB0aGlzLmV2YWxDb3VudCArPSAxO1xuICAgICAgICB2YWx1ZSA9IC12YWx1ZVswXTsgLy8gcGFyZW50Tm9kZeOBruaJi+eVquOBi+OCieimi+OBn+ODkOODquODpeODvOOBq+WkieaPm+OBl+OBvuOBmeOAglxuICAgICAgICBwYXJlbnROb2RlLnZhbHVlc1tlZGdlSW5kZXhdID0gdmFsdWU7XG4gICAgICAgIHBhcmVudE5vZGUuZXZhbHVhdGVkW2VkZ2VJbmRleF0gPSB0cnVlO1xuICAgICAgICBpZiAodGhpcy5ub2Rlc0xlbmd0aCA+IDAuODUgKiBOT0RFU19NQVhfTEVOR1RIKSB7XG4gICAgICAgICAgICB0aGlzLmNsZWFudXBOb2RlcygpO1xuICAgICAgICB9XG4gICAgICAgIGNvbnN0IG5vZGVJZCA9IHRoaXMuY3JlYXRlTm9kZShiLCBwcm9iKTtcbiAgICAgICAgcGFyZW50Tm9kZS5ub2RlSWRzW2VkZ2VJbmRleF0gPSBub2RlSWQ7XG4gICAgICAgIHBhcmVudE5vZGUuaGFzaGVzW2VkZ2VJbmRleF0gPSBiLmhhc2goKTtcbiAgICAgICAgcGFyZW50Tm9kZS50b3RhbFZhbHVlIC09IHBhcmVudE5vZGUudG90YWxBY3Rpb25WYWx1ZXNbZWRnZUluZGV4XTtcbiAgICAgICAgcGFyZW50Tm9kZS50b3RhbENvdW50ICs9IHBhcmVudE5vZGUudmlzaXRDb3VudHNbZWRnZUluZGV4XTtcbiAgICAgICAgcmV0dXJuIHZhbHVlO1xuICAgIH1cblxuICAgIC8qKlxuICAgICAqIE1DVFPjg4Tjg6rjg7zjgpJVQ0LjgavlvpPjgaPjgabkuIvjgorjgIHjg6rjg7zjg5Xjg47jg7zjg4njgavliLDpgZTjgZfjgZ/jgonlsZXplovjgZfjgb7jgZnjgIJcbiAgICAgKiBAcHJpdmF0ZVxuICAgICAqIEBwYXJhbSB7Qm9hcmR9IGIgXG4gICAgICogQHBhcmFtIHtJbnRlZ2VyfSBub2RlSWRcbiAgICAgKi9cbiAgICBhc3luYyBwbGF5b3V0KGIsIG5vZGVJZCkge1xuICAgICAgICBjb25zdCBub2RlID0gdGhpcy5ub2Rlc1tub2RlSWRdO1xuICAgICAgICBjb25zdCBbc2VsZWN0ZWRJbmRleCwgc2VsZWN0ZWRJZCwgc2VsZWN0ZWRNb3ZlXSA9IHRoaXMuc2VsZWN0QnlVQ0IoYiwgbm9kZSk7XG4gICAgICAgIGIucGxheShzZWxlY3RlZE1vdmUpO1xuICAgICAgICBjb25zdCBpc0hlYWROb2RlID0gIXRoaXMuaGFzRWRnZU5vZGUoc2VsZWN0ZWRJbmRleCwgbm9kZUlkLCBiLm1vdmVOdW1iZXIpO1xuICAgICAgICAvKlxuICAgICAgICAvLyDku6XkuIvjga9QeWFx44GM5o6h55So44GX44Gf44OY44OD44OJ44OO44O844OJ44Gu5p2h5Lu244Gn44GZ44CCXG4gICAgICAgIGNvbnN0IGlzSGVhZE5vZGUgPSAhdGhpcy5oYXNFZGdlTm9kZShzZWxlY3RlZEluZGV4LCBub2RlSWQsIGIubW92ZU51bWJlcikgfHxcbiAgICAgICAgICAgIG5vZGUudmlzaXRDb3VudHNbc2VsZWN0ZWRJbmRleF0gPCBFWFBBTkRfQ05UIHx8XG4gICAgICAgICAgICBiLm1vdmVOdW1iZXIgPiBiLkMuQlZDTlQgKiAyIHx8XG4gICAgICAgICAgICAoc2VsZWN0ZWRNb3ZlID09PSBiLkMuUEFTUyAmJiBiLnByZXZNb3ZlID09PSBiLkMuUEFTUyk7XG4gICAgICAgICovXG4gICAgICAgIGNvbnN0IHZhbHVlID0gaXNIZWFkTm9kZSA/IG5vZGUuZXZhbHVhdGVkW3NlbGVjdGVkSW5kZXhdID8gbm9kZS52YWx1ZXNbc2VsZWN0ZWRJbmRleF0gOiBhd2FpdCB0aGlzLmV2YWx1YXRlRWRnZShiLCBzZWxlY3RlZEluZGV4LCBub2RlKSA6IC0oYXdhaXQgdGhpcy5wbGF5b3V0KGIsIHNlbGVjdGVkSWQpKTsgLy8gc2VsZWN0ZWRJZOOBruaJi+eVquOBp+OBruODkOODquODpeODvOOBjOi/lOOBleOCjOOCi+OBi+OCieespuWPt+OCkuWPjei7ouOBleOBm+OBvuOBmeOAglxuICAgICAgICBub2RlLnRvdGFsVmFsdWUgKz0gdmFsdWU7XG4gICAgICAgIG5vZGUudG90YWxDb3VudCArPSAxO1xuICAgICAgICBub2RlLnRvdGFsQWN0aW9uVmFsdWVzW3NlbGVjdGVkSW5kZXhdICs9IHZhbHVlO1xuICAgICAgICBub2RlLnZpc2l0Q291bnRzW3NlbGVjdGVkSW5kZXhdICs9IDE7XG4gICAgICAgIHJldHVybiB2YWx1ZTtcbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiDjg5fjg6zjgqTjgqLjgqbjg4jjgpLnubDjgorov5TjgZfjgaZNQ1RT44OE44Oq44O844KS5pu05paw44GX44G+44GZ44CCXG4gICAgICogQHByaXZhdGVcbiAgICAgKiBAcGFyYW0ge0JvYXJkfSBiIFxuICAgICAqL1xuICAgIGFzeW5jIGtlZXBQbGF5b3V0KGIpIHtcbiAgICAgICAgdGhpcy5ldmFsQ291bnQgPSAwO1xuICAgICAgICBsZXQgYkNweSA9IG5ldyBfYm9hcmQuQm9hcmQoYi5DLCBiLmtvbWkpO1xuICAgICAgICBkbyB7XG4gICAgICAgICAgICBiLmNvcHlUbyhiQ3B5KTtcbiAgICAgICAgICAgIGF3YWl0IHRoaXMucGxheW91dChiQ3B5LCB0aGlzLnJvb3RJZCk7XG4gICAgICAgIH0gd2hpbGUgKCF0aGlzLmV4aXRDb25kaXRpb24oKSk7XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICog5o6i57Si44GM5b+F6KaB44GL5Yik5a6a44GX44Gm5b+F6KaB44Gr5b+c44GY44Gm5qSc57Si44GX44CB5pyA5ZaE44Go5Yik5pat44GX44Gf552A5omL44Go5Yud546H44KS6L+U44GX44G+44GZ44CCXG4gICAgICogQHByaXZhdGVcbiAgICAgKiBAcGFyYW0ge0JvYXJkfSBiIFxuICAgICAqIEBwYXJhbSB7Ym9vbH0gcG9uZGVyIHRydWXjga7jgajjgY1zdG9w44Oh44K944OD44OJ44GM5ZG844Gw44KM44KL44G+44Gn5o6i57Si44KS57aZ57aa44GX44G+44GZXG4gICAgICogQHBhcmFtIHtib29sfSBjbGVhbiDlvaLli6LjgYzlpInjgo/jgonjgarjgYTpmZDjgorjg5Hjgrnku6XlpJbjga7nnYDmiYvjgpLpgbjjgbPjgb7jgZlcbiAgICAgKiBAcmV0dXJucyB7QXJyYXl9IFvnnYDmiYso5pu444GP5pyd6a6u57O75bqn5qiZKSwg5Yud546HXVxuICAgICAqL1xuICAgIGFzeW5jIF9zZWFyY2goYiwgcG9uZGVyLCBjbGVhbikge1xuICAgICAgICAvLyBBbHBoYUdvIFplcm/jgafjga/oh6rlt7Hlr77miKbjga7luo/nm6QzMOaJi+OBvuOBp+OBr+OCqOODg+OCuOOBrue3j+ioquWVj+WbnuaVsOOBi+OCieeiuueOh+WIhuW4g+OCkueul+WHuuOBl+OBpuS5seaVsOOBp+edgOaJi+OCkua0l+a/r+OBl+OBvuOBmeOBjOOAgeacrOOCs+ODvOODieOBp+OBr+W8t+WMluWtpue/kuOBr+S6iOWumuOBl+OBpuOBhOOBquOBhOOBruOBp+acgOWWhOOBqOWIpOaWreOBl+OBn+edgOaJi+OCkui/lOOBl+OBvuOBmeOAglxuICAgICAgICBsZXQgYmVzdDtcbiAgICAgICAgbGV0IHNlY29uZDtcbiAgICAgICAgaWYgKHBvbmRlciB8fCB0aGlzLnNob3VsZFNlYXJjaChiZXN0LCBzZWNvbmQpKSB7XG4gICAgICAgICAgICBhd2FpdCB0aGlzLmtlZXBQbGF5b3V0KGIpO1xuICAgICAgICAgICAgY29uc3QgYmVzdDIgPSB0aGlzLm5vZGVzW3RoaXMucm9vdElkXS5iZXN0MigpO1xuICAgICAgICAgICAgYmVzdCA9IGJlc3QyWzBdO1xuICAgICAgICAgICAgc2Vjb25kID0gYmVzdDJbMV07XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICBjb25zdCBiZXN0MiA9IHRoaXMubm9kZXNbdGhpcy5yb290SWRdLmJlc3QyKCk7XG4gICAgICAgICAgICBiZXN0ID0gYmVzdDJbMF07XG4gICAgICAgICAgICBzZWNvbmQgPSBiZXN0MlsxXTtcbiAgICAgICAgfVxuXG4gICAgICAgIGNvbnN0IG5vZGUgPSB0aGlzLm5vZGVzW3RoaXMucm9vdElkXTtcblxuICAgICAgICBpZiAoY2xlYW4gJiYgbm9kZS5tb3Zlc1tiZXN0XSA9PT0gYi5DLlBBU1MgJiYgbm9kZS50b3RhbEFjdGlvblZhbHVlc1tiZXN0XSAqIG5vZGUudG90YWxBY3Rpb25WYWx1ZXNbc2Vjb25kXSA+IDAuMCkge1xuICAgICAgICAgICAgcmV0dXJuIFtub2RlLm1vdmVzW3NlY29uZF0sIHRoaXMud2lucmF0ZShub2RlLCBzZWNvbmQpXTtcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIHJldHVybiBbbm9kZS5tb3Zlc1tiZXN0XSwgdGhpcy53aW5yYXRlKG5vZGUsIGJlc3QpXTtcbiAgICAgICAgfVxuICAgIH1cblxuICAgIC8qKlxuICAgICAqIE1DVFPmjqLntKLjg6Hjgr3jg4Pjg4njgafjgZnjgIJcbiAgICAgKiBfc2VhcmNo44Oh44K944OD44OJ44Gu44Op44OD44OR44O844Oh44K944OD44OJ44Gn44GZ44CCXG4gICAgICog57WC5LqG5p2h5Lu244KS6Kit5a6a44GX44CB5bGA6Z2iYuOCknRpbWXmmYLplpPmjqLntKLjgZfjgIHntZDmnpzjgpLjg63jgrDlh7rlipvjgZfjgabmrKHjga7kuIDmiYvjgajli53njofjgpLov5TjgZfjgb7jgZnjgIJcbiAgICAgKiBAcGFyYW0ge0JvYXJkfSBiIFxuICAgICAqIEBwYXJhbSB7bnVtYmVyfSB0aW1lIOaOoue0ouaZgumWk+OCkuenkuWNmOS9jeOBp+aMh+WumuOBl+OBvuOBmVxuICAgICAqIEBwYXJhbSB7Ym9vbH0gcG9uZGVyIHR0cnVl44Gu44Go44GNc3RvcOODoeOCveODg+ODieOBjOWRvOOBsOOCjOOCi+OBvuOBp+aOoue0ouOCkue2mee2muOBl+OBvuOBmVxuICAgICAqIEBwYXJhbSB7Ym9vbH0gY2xlYW4g5b2i5Yui44GM5aSJ44KP44KJ44Gq44GE6ZmQ44KK44OR44K55Lul5aSW44Gu552A5omL44KS6YG444Gz44G+44GZXG4gICAgICogQHJldHVybnMge0FycmF5fSBb552A5omLKOabuOOBj+acnemuruezu+W6p+aomSksIOWLneeOh11cbiAgICAgKi9cbiAgICBhc3luYyBzZWFyY2goYiwgdGltZSwgcG9uZGVyLCBjbGVhbikge1xuICAgICAgICBjb25zdCBzdGFydCA9IERhdGUubm93KCk7XG4gICAgICAgIGF3YWl0IHRoaXMucHJlcGFyZVJvb3ROb2RlKGIpO1xuXG4gICAgICAgIGlmICh0aGlzLm5vZGVzW3RoaXMucm9vdElkXS5lZGdlTGVuZ3RoIDw9IDEpIHtcbiAgICAgICAgICAgIC8vIOWAmeijnOaJi+OBjOODkeOCueOBl+OBi+OBquOBkeOCjOOBsFxuICAgICAgICAgICAgY29uc29sZS5sb2coJ1xcbm1vdmUgbnVtYmVyPSVkOicsIHRoaXMucm9vdE1vdmVOdW1iZXIgKyAxKTtcbiAgICAgICAgICAgIHRoaXMucHJpbnRJbmZvKHRoaXMucm9vdElkLCBiLkMpO1xuICAgICAgICAgICAgcmV0dXJuIFtiLkMuUEFTUywgMC41XTtcbiAgICAgICAgfVxuXG4gICAgICAgIHRoaXMuY2xlYW51cE5vZGVzKCk7XG5cbiAgICAgICAgY29uc3QgdGltZV8gPSAodGltZSA9PT0gMC4wID8gdGhpcy5nZXRTZWFyY2hUaW1lKGIuQykgOiB0aW1lKSAqIDEwMDAgLSA1MDA7IC8vIDAuNeenkuOBruODnuODvOOCuOODs1xuICAgICAgICB0aGlzLnRlcm1pbmF0ZUZsYWcgPSBmYWxzZTtcbiAgICAgICAgdGhpcy5leGl0Q29uZGl0aW9uID0gcG9uZGVyID8gZnVuY3Rpb24gKCkge1xuICAgICAgICAgICAgcmV0dXJuIHRoaXMudGVybWluYXRlRmxhZztcbiAgICAgICAgfSA6IGZ1bmN0aW9uICgpIHtcbiAgICAgICAgICAgIHJldHVybiB0aGlzLnRlcm1pbmF0ZUZsYWcgfHwgRGF0ZS5ub3coKSAtIHN0YXJ0ID4gdGltZV87XG4gICAgICAgIH07XG4gICAgICAgIGNvbnN0IFtuZXh0TW92ZSwgd2luUmF0ZV0gPSBhd2FpdCB0aGlzLl9zZWFyY2goYiwgcG9uZGVyLCBjbGVhbik7XG5cbiAgICAgICAgY29uc29sZS5sb2coJ1xcbm1vdmUgbnVtYmVyPSVkOiBsZWZ0IHRpbWU9JXNbc2VjXSBldmFsdWF0ZWQ9JWQnLCB0aGlzLnJvb3RNb3ZlTnVtYmVyICsgMSwgTWF0aC5tYXgodGhpcy5sZWZ0VGltZSAtIHRpbWUsIDAuMCkudG9GaXhlZCgxKSwgdGhpcy5ldmFsQ291bnQpO1xuICAgICAgICB0aGlzLnByaW50SW5mbyh0aGlzLnJvb3RJZCwgYi5DKTtcbiAgICAgICAgdGhpcy5sZWZ0VGltZSA9IHRoaXMubGVmdFRpbWUgLSAoRGF0ZS5ub3coKSAtIHN0YXJ0KSAvIDEwMDA7XG4gICAgICAgIHJldHVybiBbbmV4dE1vdmUsIHdpblJhdGVdO1xuICAgIH1cblxuICAgIC8qKlxuICAgICAqIOWun+ihjOS4reOBrmtlZXBQbGF5b3V044KS5YGc5q2i44GV44Gb44G+44GZ44CCXG4gICAgICovXG4gICAgc3RvcCgpIHtcbiAgICAgICAgdGhpcy50ZXJtaW5hdGVGbGFnID0gdHJ1ZTtcbiAgICB9XG59XG5leHBvcnRzLk1DVFMgPSBNQ1RTOyIsIid1c2Ugc3RyaWN0JztcblxuT2JqZWN0LmRlZmluZVByb3BlcnR5KGV4cG9ydHMsIFwiX19lc01vZHVsZVwiLCB7XG4gIHZhbHVlOiB0cnVlXG59KTtcbmV4cG9ydHMuTmV1cmFsTmV0d29yayA9IHVuZGVmaW5lZDtcblxudmFyIF93b3JrZXJSbWkgPSByZXF1aXJlKCd3b3JrZXItcm1pJyk7XG5cbi8qKlxuICog44OL44Ol44O844Op44Or44ON44OD44OI44Ov44O844Kv44GuUk1J44Gn44GZ44CC44OJ44Kt44Ol44Oh44Oz44OI44Gv5pys5L2T5YG044Gu44Kz44O844OJ44KS5Y+C54Wn44GX44Gm44GP44Gg44GV44GE44CCXG4gKiBAYWxpYXMgTmV1cmFsTmV0d29ya1JNSVxuICogQHNlZSBOZXVyYWxOZXR3b3JrXG4gKi9cbmNsYXNzIE5ldXJhbE5ldHdvcmsgZXh0ZW5kcyBfd29ya2VyUm1pLldvcmtlclJNSSB7XG4gIGFzeW5jIGV2YWx1YXRlKC4uLmlucHV0cykge1xuICAgIGNvbnN0IHJlc3VsdCA9IGF3YWl0IHRoaXMuaW52b2tlUk0oJ2V2YWx1YXRlJywgaW5wdXRzKTtcbiAgICByZXR1cm4gcmVzdWx0O1xuICB9XG59XG5leHBvcnRzLk5ldXJhbE5ldHdvcmsgPSBOZXVyYWxOZXR3b3JrOyAvKipcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAqIEBmaWxlIOODi+ODpeODvOODqeODq+ODjeODg+ODiOODr+ODvOOCr+OBrlJNSeOBp+OBmeOAglxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICovXG4vKlxuICogQGF1dGhvciDluILlt53pm4TkuoxcbiAqIEBjb3B5cmlnaHQgMjAxOCBJQ0hJS0FXQSwgWXVqaSAoTmV3IDMgUnMpXG4gKiBAbGljZW5zZSBNSVRcbiAqLyIsIlwidXNlIHN0cmljdFwiO1xuXG5PYmplY3QuZGVmaW5lUHJvcGVydHkoZXhwb3J0cywgXCJfX2VzTW9kdWxlXCIsIHtcbiAgICB2YWx1ZTogdHJ1ZVxufSk7XG4vKipcbiAqIEBmaWxlIOWbsueigeOBrumAo+OCkuihqOOBmeOCr+ODqeOCueOBp+OBmeOAglxuICog44GT44Gu44Kz44O844OJ44GvUHlhceOBruenu+akjeOCs+ODvOODieOBp+OBmeOAglxuICogQHNlZSB7QGxpbmsgaHR0cHM6Ly9naXRodWIuY29tL3ltZ2FxL1B5YXF9XG4gKi9cbi8qXG4gKiBAYXV0aG9yIOW4guW3nembhOS6jFxuICogQGNvcHlyaWdodCAyMDE4IElDSElLQVdBLCBZdWppIChOZXcgMyBScylcbiAqIEBsaWNlbnNlIE1JVFxuICovXG5cbi8qKiDpgKPmg4XloLHjgq/jg6njgrkgKi9cbmNsYXNzIFN0b25lR3JvdXAge1xuICAgIC8qKlxuICAgICAqIFxuICAgICAqIEBwYXJhbSB7b2JqZWN0fSBib2FyZENvbnN0YW50c1xuICAgICAqL1xuICAgIGNvbnN0cnVjdG9yKGJvYXJkQ29uc3RhbnRzKSB7XG4gICAgICAgIHRoaXMuQyA9IGJvYXJkQ29uc3RhbnRzO1xuICAgICAgICB0aGlzLmxpYkNudCA9IHRoaXMuQy5WTlVMTDtcbiAgICAgICAgdGhpcy5zaXplID0gdGhpcy5DLlZOVUxMO1xuICAgICAgICB0aGlzLnZBdHIgPSB0aGlzLkMuVk5VTEw7XG4gICAgICAgIHRoaXMubGlicyA9IG5ldyBTZXQoKTtcbiAgICB9XG5cbiAgICBnZXRTaXplKCkge1xuICAgICAgICByZXR1cm4gdGhpcy5zaXplO1xuICAgIH1cblxuICAgIGdldExpYkNudCgpIHtcbiAgICAgICAgcmV0dXJuIHRoaXMubGliQ250O1xuICAgIH1cblxuICAgIGdldFZBdHIoKSB7XG4gICAgICAgIHJldHVybiB0aGlzLnZBdHI7XG4gICAgfVxuXG4gICAgY2xlYXIoc3RvbmUpIHtcbiAgICAgICAgdGhpcy5saWJDbnQgPSBzdG9uZSA/IDAgOiB0aGlzLkMuVk5VTEw7XG4gICAgICAgIHRoaXMuc2l6ZSA9IHN0b25lID8gMSA6IHRoaXMuQy5WTlVMTDtcbiAgICAgICAgdGhpcy52QXRyID0gdGhpcy5DLlZOVUxMO1xuICAgICAgICB0aGlzLmxpYnMuY2xlYXIoKTtcbiAgICB9XG5cbiAgICBhZGQodikge1xuICAgICAgICBpZiAodGhpcy5saWJzLmhhcyh2KSkge1xuICAgICAgICAgICAgcmV0dXJuO1xuICAgICAgICB9XG4gICAgICAgIHRoaXMubGlicy5hZGQodik7XG4gICAgICAgIHRoaXMubGliQ250ICs9IDE7XG4gICAgICAgIHRoaXMudkF0ciA9IHY7XG4gICAgfVxuXG4gICAgc3ViKHYpIHtcbiAgICAgICAgaWYgKCF0aGlzLmxpYnMuaGFzKHYpKSB7XG4gICAgICAgICAgICByZXR1cm47XG4gICAgICAgIH1cbiAgICAgICAgdGhpcy5saWJzLmRlbGV0ZSh2KTtcbiAgICAgICAgdGhpcy5saWJDbnQgLT0gMTtcbiAgICB9XG5cbiAgICBtZXJnZShvdGhlcikge1xuICAgICAgICB0aGlzLmxpYnMgPSBuZXcgU2V0KFsuLi50aGlzLmxpYnMsIC4uLm90aGVyLmxpYnNdKTtcbiAgICAgICAgdGhpcy5saWJDbnQgPSB0aGlzLmxpYnMuc2l6ZTtcbiAgICAgICAgdGhpcy5zaXplICs9IG90aGVyLnNpemU7XG4gICAgICAgIGlmICh0aGlzLmxpYkNudCA9PT0gMSkge1xuICAgICAgICAgICAgdGhpcy52QXRyID0gdGhpcy5saWJzWzBdO1xuICAgICAgICB9XG4gICAgfVxuXG4gICAgY29weVRvKGRlc3QpIHtcbiAgICAgICAgZGVzdC5saWJDbnQgPSB0aGlzLmxpYkNudDtcbiAgICAgICAgZGVzdC5zaXplID0gdGhpcy5zaXplO1xuICAgICAgICBkZXN0LnZBdHIgPSB0aGlzLnZBdHI7XG4gICAgICAgIGRlc3QubGlicyA9IG5ldyBTZXQodGhpcy5saWJzKTtcbiAgICB9XG59XG5leHBvcnRzLlN0b25lR3JvdXAgPSBTdG9uZUdyb3VwOyIsIid1c2Ugc3RyaWN0JztcblxuT2JqZWN0LmRlZmluZVByb3BlcnR5KGV4cG9ydHMsIFwiX19lc01vZHVsZVwiLCB7XG4gICAgdmFsdWU6IHRydWVcbn0pO1xuZXhwb3J0cy5zaHVmZmxlID0gc2h1ZmZsZTtcbmV4cG9ydHMubW9zdENvbW1vbiA9IG1vc3RDb21tb247XG5leHBvcnRzLmFyZ3NvcnQgPSBhcmdzb3J0O1xuZXhwb3J0cy5hcmdtYXggPSBhcmdtYXg7XG5leHBvcnRzLmhhc2ggPSBoYXNoO1xuZXhwb3J0cy5zb2Z0bWF4ID0gc29mdG1heDtcbmV4cG9ydHMucHJpbnRQcm9iID0gcHJpbnRQcm9iO1xuLyoqXG4gKiBAZmlsZSDlkITnqK7jg6bjg7zjg4bjgqPjg6rjg4bjgqPplqLmlbDnvqTjgafjgZnjgIJcbiAqL1xuLypcbiAqIEBhdXRob3Ig5biC5bed6ZuE5LqMXG4gKiBAY29weXJpZ2h0IDIwMTggSUNISUtBV0EsIFl1amkgKE5ldyAzIFJzKVxuICogQGxpY2Vuc2UgTUlUXG4gKi9cblxuLyoqXG4gKiBAcGFyYW0ge0FycmF5fSBhcnJheVxuICovXG5mdW5jdGlvbiBzaHVmZmxlKGFycmF5KSB7XG4gICAgbGV0IG4gPSBhcnJheS5sZW5ndGg7XG4gICAgbGV0IHQ7XG4gICAgbGV0IGk7XG5cbiAgICB3aGlsZSAobikge1xuICAgICAgICBpID0gTWF0aC5mbG9vcihNYXRoLnJhbmRvbSgpICogbi0tKTtcbiAgICAgICAgdCA9IGFycmF5W25dO1xuICAgICAgICBhcnJheVtuXSA9IGFycmF5W2ldO1xuICAgICAgICBhcnJheVtpXSA9IHQ7XG4gICAgfVxuXG4gICAgcmV0dXJuIGFycmF5O1xufVxuXG4vKipcbiAqIGFycmF544Gu5Lit44Gu5pyA6aC75Ye66KaB57Sg44KS6L+U44GX44G+44GZ44CCXG4gKiBAcGFyYW0ge0FycmF5fSBhcnJheSBcbiAqL1xuZnVuY3Rpb24gbW9zdENvbW1vbihhcnJheSkge1xuICAgIGNvbnN0IG1hcCA9IG5ldyBNYXAoKTtcbiAgICBmb3IgKGxldCBpID0gMDsgaSA8IGFycmF5Lmxlbmd0aDsgaSsrKSB7XG4gICAgICAgIGNvbnN0IGUgPSBhcnJheVtpXTtcbiAgICAgICAgaWYgKG1hcC5oYXMoZSkpIHtcbiAgICAgICAgICAgIG1hcC5zZXQoZSwgbWFwLmdldChlKSArIDEpO1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgbWFwLnNldChlLCAxKTtcbiAgICAgICAgfVxuICAgIH1cbiAgICBsZXQgbWF4S2V5O1xuICAgIGxldCBtYXhWYWx1ZSA9IC0xO1xuICAgIGZvciAoY29uc3QgW2tleSwgdmFsdWVdIG9mIG1hcC5lbnRyaWVzKCkpIHtcbiAgICAgICAgaWYgKHZhbHVlID4gbWF4VmFsdWUpIHtcbiAgICAgICAgICAgIG1heEtleSA9IGtleTtcbiAgICAgICAgICAgIG1heFZhbHVlID0gdmFsdWU7XG4gICAgICAgIH1cbiAgICB9XG4gICAgcmV0dXJuIG1heEtleTtcbn1cblxuLyoqIGFycmF544KS44K944O844OI44GX44Gf5pmC44Gu44Kk44Oz44OH44OD44Kv44K56YWN5YiX44KS6L+U44GX44G+44GZ44CCXG4gKiBAcGFyYW0ge251bWJlcltdfSBhcnJheSBcbiAqIEBwYXJhbSB7Ym9vbH0gcmV2ZXJzZSBcbiAqL1xuZnVuY3Rpb24gYXJnc29ydChhcnJheSwgcmV2ZXJzZSkge1xuICAgIGNvbnN0IGVuID0gQXJyYXkuZnJvbShhcnJheSkubWFwKChlLCBpKSA9PiBbaSwgZV0pO1xuICAgIGVuLnNvcnQoKGEsIGIpID0+IHJldmVyc2UgPyBiWzFdIC0gYVsxXSA6IGFbMV0gLSBiWzFdKTtcbiAgICByZXR1cm4gZW4ubWFwKGUgPT4gZVswXSk7XG59XG5cbi8qKlxuICogYXJyYXnjga7kuK3jga7mnIDlpKflgKTjga7jgqTjg7Pjg4fjg4Pjgq/jgrnjgpLov5TjgZfjgb7jgZnjgIJcbiAqIEBwYXJhbSB7bnVtYmVyW119IGFycmF5IFxuICovXG5mdW5jdGlvbiBhcmdtYXgoYXJyYXkpIHtcbiAgICBsZXQgbWF4SW5kZXg7XG4gICAgbGV0IG1heFZhbHVlID0gLUluZmluaXR5O1xuICAgIGZvciAobGV0IGkgPSAwOyBpIDwgYXJyYXkubGVuZ3RoOyBpKyspIHtcbiAgICAgICAgY29uc3QgdiA9IGFycmF5W2ldO1xuICAgICAgICBpZiAodiA+IG1heFZhbHVlKSB7XG4gICAgICAgICAgICBtYXhJbmRleCA9IGk7XG4gICAgICAgICAgICBtYXhWYWx1ZSA9IHY7XG4gICAgICAgIH1cbiAgICB9XG4gICAgcmV0dXJuIG1heEluZGV4O1xufVxuXG4vKipcbiAqIHN0cuOBrjMyLWJpdOODj+ODg+OCt+ODpeWApOOCkui/lOOBl+OBvuOBmeOAglxuICogKOazqCkxOei3r+ebpOOBp+OBrzMyLWJpdOODj+ODg+OCt+ODpeWApOOBr+ihneeqgeOBmeOCi+OBqOiogOOCj+OCjOOBpuOBhOOBvuOBmeOBjOihneeqgeOBq+OBr+WvvuW/nOOBl+OBpuOBhOOBvuOBm+OCk+OAglxuICogQHBhcmFtIHtzdHJpbmd9IHN0ciBcbiAqIEByZXR1cm5zIHtJbnRlZ2VyfVxuICovXG5mdW5jdGlvbiBoYXNoKHN0cikge1xuICAgIGxldCBoYXNoID0gNTM4MTtcbiAgICBmb3IgKGxldCBpID0gMDsgaSA8IHN0ci5sZW5ndGg7IGkrKykge1xuICAgICAgICBjb25zdCBjaGFyID0gc3RyLmNoYXJDb2RlQXQoaSk7XG4gICAgICAgIGhhc2ggPSAoaGFzaCA8PCA1KSArIGhhc2ggKyBjaGFyOyAvKiBoYXNoICogMzMgKyBjICovXG4gICAgICAgIGhhc2ggPSBoYXNoICYgaGFzaDsgLy8gQ29udmVydCB0byAzMmJpdCBpbnRlZ2VyXG4gICAgfVxuICAgIHJldHVybiBNYXRoLmFicyhoYXNoKTtcbn1cblxuLyoqXG4gKiDmuKnluqbjg5Hjg6njg6Hjg7zjgr/jgYLjgorjga7jgr3jg5Xjg4jjg57jg4Pjgq/jgrnplqLmlbDjgafjgZnjgIJcbiAqIEBwYXJhbSB7RmxvYXQzMkFycmF5fSBpbnB1dCBcbiAqIEBwYXJhbSB7bnVtYmVyfSB0ZW1wZXJhdHVyZVxuICogQHJldHVybnMge0Zsb2F0MzJBcnJheX1cbiAqL1xuZnVuY3Rpb24gc29mdG1heChpbnB1dCwgdGVtcGVyYXR1cmUgPSAxLjApIHtcbiAgICBjb25zdCBvdXRwdXQgPSBuZXcgRmxvYXQzMkFycmF5KGlucHV0Lmxlbmd0aCk7XG4gICAgY29uc3QgYWxwaGEgPSBNYXRoLm1heC5hcHBseShudWxsLCBpbnB1dCk7XG4gICAgbGV0IGRlbm9tID0gMC4wO1xuXG4gICAgZm9yIChsZXQgaSA9IDA7IGkgPCBpbnB1dC5sZW5ndGg7IGkrKykge1xuICAgICAgICBjb25zdCB2YWwgPSBNYXRoLmV4cCgoaW5wdXRbaV0gLSBhbHBoYSkgLyB0ZW1wZXJhdHVyZSk7XG4gICAgICAgIGRlbm9tICs9IHZhbDtcbiAgICAgICAgb3V0cHV0W2ldID0gdmFsO1xuICAgIH1cblxuICAgIGZvciAobGV0IGkgPSAwOyBpIDwgb3V0cHV0Lmxlbmd0aDsgaSsrKSB7XG4gICAgICAgIG91dHB1dFtpXSAvPSBkZW5vbTtcbiAgICB9XG5cbiAgICByZXR1cm4gb3V0cHV0O1xufVxuXG5mdW5jdGlvbiBwcmludFByb2IocHJvYiwgc2l6ZSkge1xuICAgIGZvciAobGV0IHkgPSAwOyB5IDwgc2l6ZTsgeSsrKSB7XG4gICAgICAgIGxldCBzdHIgPSBgJHt5ICsgMX0gYDtcbiAgICAgICAgZm9yIChsZXQgeCA9IDA7IHggPCBzaXplOyB4KyspIHtcbiAgICAgICAgICAgIHN0ciArPSAoJyAgJyArIHByb2JbeCArIHkgKiBzaXplXS50b0ZpeGVkKDEpKS5zbGljZSgtNSk7XG4gICAgICAgIH1cbiAgICAgICAgY29uc29sZS5sb2coc3RyKTtcbiAgICB9XG4gICAgY29uc29sZS5sb2coJ3Bhc3M9JXMnLCBwcm9iW3Byb2IubGVuZ3RoIC0gMV0udG9GaXhlZCgxKSk7XG59IiwiJ3VzZSBzdHJpY3QnO1xuXG52YXIgX3dvcmtlclJtaSA9IHJlcXVpcmUoJ3dvcmtlci1ybWknKTtcblxudmFyIF9hempzX2VuZ2luZSA9IHJlcXVpcmUoJy4vYXpqc19lbmdpbmUuanMnKTtcblxuLyoqXG4gKiBAZmlsZSDjgqbjgqfjg5bjg6/jg7zjgqvjga7jgqjjg7Pjg4jjg6rjg7zjg53jgqTjg7Pjg4jjgafjgZnjgIJcbiAqL1xuLypcbiAqIEBhdXRob3Ig5biC5bed6ZuE5LqMXG4gKiBAY29weXJpZ2h0IDIwMTggSUNISUtBV0EsIFl1amkgKE5ldyAzIFJzKVxuICogQGxpY2Vuc2UgTUlUXG4gKi9cbigwLCBfd29ya2VyUm1pLnJlc2lndGVyV29ya2VyUk1JKShzZWxmLCBfYXpqc19lbmdpbmUuQVpqc0VuZ2luZSk7Il19
