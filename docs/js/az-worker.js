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
     * @param {Integer} symmetry
     * @returns {Float32Array}
     */
    feature(symmetry) {
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
        if (symmetry) {
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
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIm5vZGVfbW9kdWxlcy9icm93c2VyLXBhY2svX3ByZWx1ZGUuanMiLCJub2RlX21vZHVsZXMvYnNvbi1vYmplY3RpZC9vYmplY3RpZC5qcyIsIm5vZGVfbW9kdWxlcy9wcm9jZXNzL2Jyb3dzZXIuanMiLCJub2RlX21vZHVsZXMvd29ya2VyLXJtaS93b3JrZXItcm1pLmpzIiwic3JjL2F6anNfZW5naW5lLmpzIiwic3JjL2JvYXJkLmpzIiwic3JjL2JvYXJkX2NvbnN0YW50cy5qcyIsInNyYy9tY3RzLmpzIiwic3JjL25ldXJhbF9uZXR3b3JrX2NsaWVudC5qcyIsInNyYy9zdG9uZV9ncm91cC5qcyIsInNyYy91dGlscy5qcyIsInNyYy93b3JrZXIuanMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7O0FDQUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7Ozs7QUM5TkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUN4TEE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDM0tBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUMzSkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDcmZBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDdE5BO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQzFnQkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDM0JBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDbEZBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUM1SUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBIiwiZmlsZSI6ImdlbmVyYXRlZC5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzQ29udGVudCI6WyIoZnVuY3Rpb24oKXtmdW5jdGlvbiByKGUsbix0KXtmdW5jdGlvbiBvKGksZil7aWYoIW5baV0pe2lmKCFlW2ldKXt2YXIgYz1cImZ1bmN0aW9uXCI9PXR5cGVvZiByZXF1aXJlJiZyZXF1aXJlO2lmKCFmJiZjKXJldHVybiBjKGksITApO2lmKHUpcmV0dXJuIHUoaSwhMCk7dmFyIGE9bmV3IEVycm9yKFwiQ2Fubm90IGZpbmQgbW9kdWxlICdcIitpK1wiJ1wiKTt0aHJvdyBhLmNvZGU9XCJNT0RVTEVfTk9UX0ZPVU5EXCIsYX12YXIgcD1uW2ldPXtleHBvcnRzOnt9fTtlW2ldWzBdLmNhbGwocC5leHBvcnRzLGZ1bmN0aW9uKHIpe3ZhciBuPWVbaV1bMV1bcl07cmV0dXJuIG8obnx8cil9LHAscC5leHBvcnRzLHIsZSxuLHQpfXJldHVybiBuW2ldLmV4cG9ydHN9Zm9yKHZhciB1PVwiZnVuY3Rpb25cIj09dHlwZW9mIHJlcXVpcmUmJnJlcXVpcmUsaT0wO2k8dC5sZW5ndGg7aSsrKW8odFtpXSk7cmV0dXJuIG99cmV0dXJuIHJ9KSgpIiwiXG52YXIgTUFDSElORV9JRCA9IE1hdGguZmxvb3IoTWF0aC5yYW5kb20oKSAqIDB4RkZGRkZGKTtcbnZhciBpbmRleCA9IE9iamVjdElELmluZGV4ID0gcGFyc2VJbnQoTWF0aC5yYW5kb20oKSAqIDB4RkZGRkZGLCAxMCk7XG52YXIgcGlkID0gKHR5cGVvZiBwcm9jZXNzID09PSAndW5kZWZpbmVkJyB8fCB0eXBlb2YgcHJvY2Vzcy5waWQgIT09ICdudW1iZXInID8gTWF0aC5mbG9vcihNYXRoLnJhbmRvbSgpICogMTAwMDAwKSA6IHByb2Nlc3MucGlkKSAlIDB4RkZGRjtcblxuLyoqXG4gKiBEZXRlcm1pbmUgaWYgYW4gb2JqZWN0IGlzIEJ1ZmZlclxuICpcbiAqIEF1dGhvcjogICBGZXJvc3MgQWJvdWtoYWRpamVoIDxmZXJvc3NAZmVyb3NzLm9yZz4gPGh0dHA6Ly9mZXJvc3Mub3JnPlxuICogTGljZW5zZTogIE1JVFxuICpcbiAqL1xudmFyIGlzQnVmZmVyID0gZnVuY3Rpb24gKG9iaikge1xuICByZXR1cm4gISEoXG4gIG9iaiAhPSBudWxsICYmXG4gIG9iai5jb25zdHJ1Y3RvciAmJlxuICB0eXBlb2Ygb2JqLmNvbnN0cnVjdG9yLmlzQnVmZmVyID09PSAnZnVuY3Rpb24nICYmXG4gIG9iai5jb25zdHJ1Y3Rvci5pc0J1ZmZlcihvYmopXG4gIClcbn07XG5cbi8qKlxuICogQ3JlYXRlIGEgbmV3IGltbXV0YWJsZSBPYmplY3RJRCBpbnN0YW5jZVxuICpcbiAqIEBjbGFzcyBSZXByZXNlbnRzIHRoZSBCU09OIE9iamVjdElEIHR5cGVcbiAqIEBwYXJhbSB7U3RyaW5nfE51bWJlcn0gYXJnIENhbiBiZSBhIDI0IGJ5dGUgaGV4IHN0cmluZywgMTIgYnl0ZSBiaW5hcnkgc3RyaW5nIG9yIGEgTnVtYmVyLlxuICogQHJldHVybiB7T2JqZWN0fSBpbnN0YW5jZSBvZiBPYmplY3RJRC5cbiAqL1xuZnVuY3Rpb24gT2JqZWN0SUQoYXJnKSB7XG4gIGlmKCEodGhpcyBpbnN0YW5jZW9mIE9iamVjdElEKSkgcmV0dXJuIG5ldyBPYmplY3RJRChhcmcpO1xuICBpZihhcmcgJiYgKChhcmcgaW5zdGFuY2VvZiBPYmplY3RJRCkgfHwgYXJnLl9ic29udHlwZT09PVwiT2JqZWN0SURcIikpXG4gICAgcmV0dXJuIGFyZztcblxuICB2YXIgYnVmO1xuXG4gIGlmKGlzQnVmZmVyKGFyZykgfHwgKEFycmF5LmlzQXJyYXkoYXJnKSAmJiBhcmcubGVuZ3RoPT09MTIpKSB7XG4gICAgYnVmID0gQXJyYXkucHJvdG90eXBlLnNsaWNlLmNhbGwoYXJnKTtcbiAgfVxuICBlbHNlIGlmKHR5cGVvZiBhcmcgPT09IFwic3RyaW5nXCIpIHtcbiAgICBpZihhcmcubGVuZ3RoIT09MTIgJiYgIU9iamVjdElELmlzVmFsaWQoYXJnKSlcbiAgICAgIHRocm93IG5ldyBFcnJvcihcIkFyZ3VtZW50IHBhc3NlZCBpbiBtdXN0IGJlIGEgc2luZ2xlIFN0cmluZyBvZiAxMiBieXRlcyBvciBhIHN0cmluZyBvZiAyNCBoZXggY2hhcmFjdGVyc1wiKTtcblxuICAgIGJ1ZiA9IGJ1ZmZlcihhcmcpO1xuICB9XG4gIGVsc2UgaWYoL251bWJlcnx1bmRlZmluZWQvLnRlc3QodHlwZW9mIGFyZykpIHtcbiAgICBidWYgPSBidWZmZXIoZ2VuZXJhdGUoYXJnKSk7XG4gIH1cblxuICBPYmplY3QuZGVmaW5lUHJvcGVydHkodGhpcywgXCJpZFwiLCB7XG4gICAgZW51bWVyYWJsZTogdHJ1ZSxcbiAgICBnZXQ6IGZ1bmN0aW9uKCkgeyByZXR1cm4gU3RyaW5nLmZyb21DaGFyQ29kZS5hcHBseSh0aGlzLCBidWYpOyB9XG4gIH0pO1xuICBPYmplY3QuZGVmaW5lUHJvcGVydHkodGhpcywgXCJzdHJcIiwge1xuICAgIGdldDogZnVuY3Rpb24oKSB7IHJldHVybiBidWYubWFwKGhleC5iaW5kKHRoaXMsIDIpKS5qb2luKCcnKTsgfVxuICB9KTtcbn1cbm1vZHVsZS5leHBvcnRzID0gT2JqZWN0SUQ7XG5PYmplY3RJRC5nZW5lcmF0ZSA9IGdlbmVyYXRlO1xuT2JqZWN0SUQuZGVmYXVsdCA9IE9iamVjdElEO1xuXG4vKipcbiAqIENyZWF0ZXMgYW4gT2JqZWN0SUQgZnJvbSBhIHNlY29uZCBiYXNlZCBudW1iZXIsIHdpdGggdGhlIHJlc3Qgb2YgdGhlIE9iamVjdElEIHplcm9lZCBvdXQuIFVzZWQgZm9yIGNvbXBhcmlzb25zIG9yIHNvcnRpbmcgdGhlIE9iamVjdElELlxuICpcbiAqIEBwYXJhbSB7TnVtYmVyfSB0aW1lIGFuIGludGVnZXIgbnVtYmVyIHJlcHJlc2VudGluZyBhIG51bWJlciBvZiBzZWNvbmRzLlxuICogQHJldHVybiB7T2JqZWN0SUR9IHJldHVybiB0aGUgY3JlYXRlZCBPYmplY3RJRFxuICogQGFwaSBwdWJsaWNcbiAqL1xuT2JqZWN0SUQuY3JlYXRlRnJvbVRpbWUgPSBmdW5jdGlvbih0aW1lKXtcbiAgdGltZSA9IHBhcnNlSW50KHRpbWUsIDEwKSAlIDB4RkZGRkZGRkY7XG4gIHJldHVybiBuZXcgT2JqZWN0SUQoaGV4KDgsdGltZSkrXCIwMDAwMDAwMDAwMDAwMDAwXCIpO1xufTtcblxuLyoqXG4gKiBDcmVhdGVzIGFuIE9iamVjdElEIGZyb20gYSBoZXggc3RyaW5nIHJlcHJlc2VudGF0aW9uIG9mIGFuIE9iamVjdElELlxuICpcbiAqIEBwYXJhbSB7U3RyaW5nfSBoZXhTdHJpbmcgY3JlYXRlIGEgT2JqZWN0SUQgZnJvbSBhIHBhc3NlZCBpbiAyNCBieXRlIGhleHN0cmluZy5cbiAqIEByZXR1cm4ge09iamVjdElEfSByZXR1cm4gdGhlIGNyZWF0ZWQgT2JqZWN0SURcbiAqIEBhcGkgcHVibGljXG4gKi9cbk9iamVjdElELmNyZWF0ZUZyb21IZXhTdHJpbmcgPSBmdW5jdGlvbihoZXhTdHJpbmcpIHtcbiAgaWYoIU9iamVjdElELmlzVmFsaWQoaGV4U3RyaW5nKSlcbiAgICB0aHJvdyBuZXcgRXJyb3IoXCJJbnZhbGlkIE9iamVjdElEIGhleCBzdHJpbmdcIik7XG5cbiAgcmV0dXJuIG5ldyBPYmplY3RJRChoZXhTdHJpbmcpO1xufTtcblxuLyoqXG4gKiBDaGVja3MgaWYgYSB2YWx1ZSBpcyBhIHZhbGlkIGJzb24gT2JqZWN0SWRcbiAqXG4gKiBAcGFyYW0ge1N0cmluZ30gb2JqZWN0aWQgQ2FuIGJlIGEgMjQgYnl0ZSBoZXggc3RyaW5nIG9yIGFuIGluc3RhbmNlIG9mIE9iamVjdElELlxuICogQHJldHVybiB7Qm9vbGVhbn0gcmV0dXJuIHRydWUgaWYgdGhlIHZhbHVlIGlzIGEgdmFsaWQgYnNvbiBPYmplY3RJRCwgcmV0dXJuIGZhbHNlIG90aGVyd2lzZS5cbiAqIEBhcGkgcHVibGljXG4gKlxuICogVEhFIE5BVElWRSBET0NVTUVOVEFUSU9OIElTTidUIENMRUFSIE9OIFRISVMgR1VZIVxuICogaHR0cDovL21vbmdvZGIuZ2l0aHViLmlvL25vZGUtbW9uZ29kYi1uYXRpdmUvYXBpLWJzb24tZ2VuZXJhdGVkL29iamVjdGlkLmh0bWwjb2JqZWN0aWQtaXN2YWxpZFxuICovXG5PYmplY3RJRC5pc1ZhbGlkID0gZnVuY3Rpb24ob2JqZWN0aWQpIHtcbiAgaWYoIW9iamVjdGlkKSByZXR1cm4gZmFsc2U7XG5cbiAgLy9jYWxsIC50b1N0cmluZygpIHRvIGdldCB0aGUgaGV4IGlmIHdlJ3JlXG4gIC8vIHdvcmtpbmcgd2l0aCBhbiBpbnN0YW5jZSBvZiBPYmplY3RJRFxuICByZXR1cm4gL15bMC05QS1GXXsyNH0kL2kudGVzdChvYmplY3RpZC50b1N0cmluZygpKTtcbn07XG5cbi8qKlxuICogc2V0IGEgY3VzdG9tIG1hY2hpbmVJRFxuICogXG4gKiBAcGFyYW0ge1N0cmluZ3xOdW1iZXJ9IG1hY2hpbmVpZCBDYW4gYmUgYSBzdHJpbmcsIGhleC1zdHJpbmcgb3IgYSBudW1iZXJcbiAqIEByZXR1cm4ge3ZvaWR9XG4gKiBAYXBpIHB1YmxpY1xuICovXG5PYmplY3RJRC5zZXRNYWNoaW5lSUQgPSBmdW5jdGlvbihhcmcpIHtcbiAgdmFyIG1hY2hpbmVJRDtcblxuICBpZih0eXBlb2YgYXJnID09PSBcInN0cmluZ1wiKSB7XG4gICAgLy8gaGV4IHN0cmluZ1xuICAgIG1hY2hpbmVJRCA9IHBhcnNlSW50KGFyZywgMTYpO1xuICAgXG4gICAgLy8gYW55IHN0cmluZ1xuICAgIGlmKGlzTmFOKG1hY2hpbmVJRCkpIHtcbiAgICAgIGFyZyA9ICgnMDAwMDAwJyArIGFyZykuc3Vic3RyKC03LDYpO1xuXG4gICAgICBtYWNoaW5lSUQgPSBcIlwiO1xuICAgICAgZm9yKHZhciBpID0gMDtpPDY7IGkrKykge1xuICAgICAgICBtYWNoaW5lSUQgKz0gKGFyZy5jaGFyQ29kZUF0KGkpKTtcbiAgICAgIH1cbiAgICB9XG4gIH1cbiAgZWxzZSBpZigvbnVtYmVyfHVuZGVmaW5lZC8udGVzdCh0eXBlb2YgYXJnKSkge1xuICAgIG1hY2hpbmVJRCA9IGFyZyB8IDA7XG4gIH1cblxuICBNQUNISU5FX0lEID0gKG1hY2hpbmVJRCAmIDB4RkZGRkZGKTtcbn1cblxuLyoqXG4gKiBnZXQgdGhlIG1hY2hpbmVJRFxuICogXG4gKiBAcmV0dXJuIHtudW1iZXJ9XG4gKiBAYXBpIHB1YmxpY1xuICovXG5PYmplY3RJRC5nZXRNYWNoaW5lSUQgPSBmdW5jdGlvbigpIHtcbiAgcmV0dXJuIE1BQ0hJTkVfSUQ7XG59XG5cbk9iamVjdElELnByb3RvdHlwZSA9IHtcbiAgX2Jzb250eXBlOiAnT2JqZWN0SUQnLFxuICBjb25zdHJ1Y3RvcjogT2JqZWN0SUQsXG5cbiAgLyoqXG4gICAqIFJldHVybiB0aGUgT2JqZWN0SUQgaWQgYXMgYSAyNCBieXRlIGhleCBzdHJpbmcgcmVwcmVzZW50YXRpb25cbiAgICpcbiAgICogQHJldHVybiB7U3RyaW5nfSByZXR1cm4gdGhlIDI0IGJ5dGUgaGV4IHN0cmluZyByZXByZXNlbnRhdGlvbi5cbiAgICogQGFwaSBwdWJsaWNcbiAgICovXG4gIHRvSGV4U3RyaW5nOiBmdW5jdGlvbigpIHtcbiAgICByZXR1cm4gdGhpcy5zdHI7XG4gIH0sXG5cbiAgLyoqXG4gICAqIENvbXBhcmVzIHRoZSBlcXVhbGl0eSBvZiB0aGlzIE9iamVjdElEIHdpdGggYG90aGVySURgLlxuICAgKlxuICAgKiBAcGFyYW0ge09iamVjdH0gb3RoZXIgT2JqZWN0SUQgaW5zdGFuY2UgdG8gY29tcGFyZSBhZ2FpbnN0LlxuICAgKiBAcmV0dXJuIHtCb29sZWFufSB0aGUgcmVzdWx0IG9mIGNvbXBhcmluZyB0d28gT2JqZWN0SUQnc1xuICAgKiBAYXBpIHB1YmxpY1xuICAgKi9cbiAgZXF1YWxzOiBmdW5jdGlvbiAob3RoZXIpe1xuICAgIHJldHVybiAhIW90aGVyICYmIHRoaXMuc3RyID09PSBvdGhlci50b1N0cmluZygpO1xuICB9LFxuXG4gIC8qKlxuICAgKiBSZXR1cm5zIHRoZSBnZW5lcmF0aW9uIGRhdGUgKGFjY3VyYXRlIHVwIHRvIHRoZSBzZWNvbmQpIHRoYXQgdGhpcyBJRCB3YXMgZ2VuZXJhdGVkLlxuICAgKlxuICAgKiBAcmV0dXJuIHtEYXRlfSB0aGUgZ2VuZXJhdGlvbiBkYXRlXG4gICAqIEBhcGkgcHVibGljXG4gICAqL1xuICBnZXRUaW1lc3RhbXA6IGZ1bmN0aW9uKCl7XG4gICAgcmV0dXJuIG5ldyBEYXRlKHBhcnNlSW50KHRoaXMuc3RyLnN1YnN0cigwLDgpLCAxNikgKiAxMDAwKTtcbiAgfVxufTtcblxuZnVuY3Rpb24gbmV4dCgpIHtcbiAgcmV0dXJuIGluZGV4ID0gKGluZGV4KzEpICUgMHhGRkZGRkY7XG59XG5cbmZ1bmN0aW9uIGdlbmVyYXRlKHRpbWUpIHtcbiAgaWYgKHR5cGVvZiB0aW1lICE9PSAnbnVtYmVyJylcbiAgICB0aW1lID0gRGF0ZS5ub3coKS8xMDAwO1xuXG4gIC8va2VlcCBpdCBpbiB0aGUgcmluZyFcbiAgdGltZSA9IHBhcnNlSW50KHRpbWUsIDEwKSAlIDB4RkZGRkZGRkY7XG5cbiAgLy9GRkZGRkZGRiBGRkZGRkYgRkZGRiBGRkZGRkZcbiAgcmV0dXJuIGhleCg4LHRpbWUpICsgaGV4KDYsTUFDSElORV9JRCkgKyBoZXgoNCxwaWQpICsgaGV4KDYsbmV4dCgpKTtcbn1cblxuZnVuY3Rpb24gaGV4KGxlbmd0aCwgbikge1xuICBuID0gbi50b1N0cmluZygxNik7XG4gIHJldHVybiAobi5sZW5ndGg9PT1sZW5ndGgpPyBuIDogXCIwMDAwMDAwMFwiLnN1YnN0cmluZyhuLmxlbmd0aCwgbGVuZ3RoKSArIG47XG59XG5cbmZ1bmN0aW9uIGJ1ZmZlcihzdHIpIHtcbiAgdmFyIGk9MCxvdXQ9W107XG5cbiAgaWYoc3RyLmxlbmd0aD09PTI0KVxuICAgIGZvcig7aTwyNDsgb3V0LnB1c2gocGFyc2VJbnQoc3RyW2ldK3N0cltpKzFdLCAxNikpLGkrPTIpO1xuXG4gIGVsc2UgaWYoc3RyLmxlbmd0aD09PTEyKVxuICAgIGZvcig7aTwxMjsgb3V0LnB1c2goc3RyLmNoYXJDb2RlQXQoaSkpLGkrKyk7XG5cbiAgcmV0dXJuIG91dDtcbn1cblxuLyoqXG4gKiBDb252ZXJ0cyB0byBhIHN0cmluZyByZXByZXNlbnRhdGlvbiBvZiB0aGlzIElkLlxuICpcbiAqIEByZXR1cm4ge1N0cmluZ30gcmV0dXJuIHRoZSAyNCBieXRlIGhleCBzdHJpbmcgcmVwcmVzZW50YXRpb24uXG4gKiBAYXBpIHByaXZhdGVcbiAqL1xuT2JqZWN0SUQucHJvdG90eXBlLmluc3BlY3QgPSBmdW5jdGlvbigpIHsgcmV0dXJuIFwiT2JqZWN0SUQoXCIrdGhpcytcIilcIiB9O1xuT2JqZWN0SUQucHJvdG90eXBlLnRvSlNPTiA9IE9iamVjdElELnByb3RvdHlwZS50b0hleFN0cmluZztcbk9iamVjdElELnByb3RvdHlwZS50b1N0cmluZyA9IE9iamVjdElELnByb3RvdHlwZS50b0hleFN0cmluZztcbiIsIi8vIHNoaW0gZm9yIHVzaW5nIHByb2Nlc3MgaW4gYnJvd3NlclxudmFyIHByb2Nlc3MgPSBtb2R1bGUuZXhwb3J0cyA9IHt9O1xuXG4vLyBjYWNoZWQgZnJvbSB3aGF0ZXZlciBnbG9iYWwgaXMgcHJlc2VudCBzbyB0aGF0IHRlc3QgcnVubmVycyB0aGF0IHN0dWIgaXRcbi8vIGRvbid0IGJyZWFrIHRoaW5ncy4gIEJ1dCB3ZSBuZWVkIHRvIHdyYXAgaXQgaW4gYSB0cnkgY2F0Y2ggaW4gY2FzZSBpdCBpc1xuLy8gd3JhcHBlZCBpbiBzdHJpY3QgbW9kZSBjb2RlIHdoaWNoIGRvZXNuJ3QgZGVmaW5lIGFueSBnbG9iYWxzLiAgSXQncyBpbnNpZGUgYVxuLy8gZnVuY3Rpb24gYmVjYXVzZSB0cnkvY2F0Y2hlcyBkZW9wdGltaXplIGluIGNlcnRhaW4gZW5naW5lcy5cblxudmFyIGNhY2hlZFNldFRpbWVvdXQ7XG52YXIgY2FjaGVkQ2xlYXJUaW1lb3V0O1xuXG5mdW5jdGlvbiBkZWZhdWx0U2V0VGltb3V0KCkge1xuICAgIHRocm93IG5ldyBFcnJvcignc2V0VGltZW91dCBoYXMgbm90IGJlZW4gZGVmaW5lZCcpO1xufVxuZnVuY3Rpb24gZGVmYXVsdENsZWFyVGltZW91dCAoKSB7XG4gICAgdGhyb3cgbmV3IEVycm9yKCdjbGVhclRpbWVvdXQgaGFzIG5vdCBiZWVuIGRlZmluZWQnKTtcbn1cbihmdW5jdGlvbiAoKSB7XG4gICAgdHJ5IHtcbiAgICAgICAgaWYgKHR5cGVvZiBzZXRUaW1lb3V0ID09PSAnZnVuY3Rpb24nKSB7XG4gICAgICAgICAgICBjYWNoZWRTZXRUaW1lb3V0ID0gc2V0VGltZW91dDtcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIGNhY2hlZFNldFRpbWVvdXQgPSBkZWZhdWx0U2V0VGltb3V0O1xuICAgICAgICB9XG4gICAgfSBjYXRjaCAoZSkge1xuICAgICAgICBjYWNoZWRTZXRUaW1lb3V0ID0gZGVmYXVsdFNldFRpbW91dDtcbiAgICB9XG4gICAgdHJ5IHtcbiAgICAgICAgaWYgKHR5cGVvZiBjbGVhclRpbWVvdXQgPT09ICdmdW5jdGlvbicpIHtcbiAgICAgICAgICAgIGNhY2hlZENsZWFyVGltZW91dCA9IGNsZWFyVGltZW91dDtcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIGNhY2hlZENsZWFyVGltZW91dCA9IGRlZmF1bHRDbGVhclRpbWVvdXQ7XG4gICAgICAgIH1cbiAgICB9IGNhdGNoIChlKSB7XG4gICAgICAgIGNhY2hlZENsZWFyVGltZW91dCA9IGRlZmF1bHRDbGVhclRpbWVvdXQ7XG4gICAgfVxufSAoKSlcbmZ1bmN0aW9uIHJ1blRpbWVvdXQoZnVuKSB7XG4gICAgaWYgKGNhY2hlZFNldFRpbWVvdXQgPT09IHNldFRpbWVvdXQpIHtcbiAgICAgICAgLy9ub3JtYWwgZW52aXJvbWVudHMgaW4gc2FuZSBzaXR1YXRpb25zXG4gICAgICAgIHJldHVybiBzZXRUaW1lb3V0KGZ1biwgMCk7XG4gICAgfVxuICAgIC8vIGlmIHNldFRpbWVvdXQgd2Fzbid0IGF2YWlsYWJsZSBidXQgd2FzIGxhdHRlciBkZWZpbmVkXG4gICAgaWYgKChjYWNoZWRTZXRUaW1lb3V0ID09PSBkZWZhdWx0U2V0VGltb3V0IHx8ICFjYWNoZWRTZXRUaW1lb3V0KSAmJiBzZXRUaW1lb3V0KSB7XG4gICAgICAgIGNhY2hlZFNldFRpbWVvdXQgPSBzZXRUaW1lb3V0O1xuICAgICAgICByZXR1cm4gc2V0VGltZW91dChmdW4sIDApO1xuICAgIH1cbiAgICB0cnkge1xuICAgICAgICAvLyB3aGVuIHdoZW4gc29tZWJvZHkgaGFzIHNjcmV3ZWQgd2l0aCBzZXRUaW1lb3V0IGJ1dCBubyBJLkUuIG1hZGRuZXNzXG4gICAgICAgIHJldHVybiBjYWNoZWRTZXRUaW1lb3V0KGZ1biwgMCk7XG4gICAgfSBjYXRjaChlKXtcbiAgICAgICAgdHJ5IHtcbiAgICAgICAgICAgIC8vIFdoZW4gd2UgYXJlIGluIEkuRS4gYnV0IHRoZSBzY3JpcHQgaGFzIGJlZW4gZXZhbGVkIHNvIEkuRS4gZG9lc24ndCB0cnVzdCB0aGUgZ2xvYmFsIG9iamVjdCB3aGVuIGNhbGxlZCBub3JtYWxseVxuICAgICAgICAgICAgcmV0dXJuIGNhY2hlZFNldFRpbWVvdXQuY2FsbChudWxsLCBmdW4sIDApO1xuICAgICAgICB9IGNhdGNoKGUpe1xuICAgICAgICAgICAgLy8gc2FtZSBhcyBhYm92ZSBidXQgd2hlbiBpdCdzIGEgdmVyc2lvbiBvZiBJLkUuIHRoYXQgbXVzdCBoYXZlIHRoZSBnbG9iYWwgb2JqZWN0IGZvciAndGhpcycsIGhvcGZ1bGx5IG91ciBjb250ZXh0IGNvcnJlY3Qgb3RoZXJ3aXNlIGl0IHdpbGwgdGhyb3cgYSBnbG9iYWwgZXJyb3JcbiAgICAgICAgICAgIHJldHVybiBjYWNoZWRTZXRUaW1lb3V0LmNhbGwodGhpcywgZnVuLCAwKTtcbiAgICAgICAgfVxuICAgIH1cblxuXG59XG5mdW5jdGlvbiBydW5DbGVhclRpbWVvdXQobWFya2VyKSB7XG4gICAgaWYgKGNhY2hlZENsZWFyVGltZW91dCA9PT0gY2xlYXJUaW1lb3V0KSB7XG4gICAgICAgIC8vbm9ybWFsIGVudmlyb21lbnRzIGluIHNhbmUgc2l0dWF0aW9uc1xuICAgICAgICByZXR1cm4gY2xlYXJUaW1lb3V0KG1hcmtlcik7XG4gICAgfVxuICAgIC8vIGlmIGNsZWFyVGltZW91dCB3YXNuJ3QgYXZhaWxhYmxlIGJ1dCB3YXMgbGF0dGVyIGRlZmluZWRcbiAgICBpZiAoKGNhY2hlZENsZWFyVGltZW91dCA9PT0gZGVmYXVsdENsZWFyVGltZW91dCB8fCAhY2FjaGVkQ2xlYXJUaW1lb3V0KSAmJiBjbGVhclRpbWVvdXQpIHtcbiAgICAgICAgY2FjaGVkQ2xlYXJUaW1lb3V0ID0gY2xlYXJUaW1lb3V0O1xuICAgICAgICByZXR1cm4gY2xlYXJUaW1lb3V0KG1hcmtlcik7XG4gICAgfVxuICAgIHRyeSB7XG4gICAgICAgIC8vIHdoZW4gd2hlbiBzb21lYm9keSBoYXMgc2NyZXdlZCB3aXRoIHNldFRpbWVvdXQgYnV0IG5vIEkuRS4gbWFkZG5lc3NcbiAgICAgICAgcmV0dXJuIGNhY2hlZENsZWFyVGltZW91dChtYXJrZXIpO1xuICAgIH0gY2F0Y2ggKGUpe1xuICAgICAgICB0cnkge1xuICAgICAgICAgICAgLy8gV2hlbiB3ZSBhcmUgaW4gSS5FLiBidXQgdGhlIHNjcmlwdCBoYXMgYmVlbiBldmFsZWQgc28gSS5FLiBkb2Vzbid0ICB0cnVzdCB0aGUgZ2xvYmFsIG9iamVjdCB3aGVuIGNhbGxlZCBub3JtYWxseVxuICAgICAgICAgICAgcmV0dXJuIGNhY2hlZENsZWFyVGltZW91dC5jYWxsKG51bGwsIG1hcmtlcik7XG4gICAgICAgIH0gY2F0Y2ggKGUpe1xuICAgICAgICAgICAgLy8gc2FtZSBhcyBhYm92ZSBidXQgd2hlbiBpdCdzIGEgdmVyc2lvbiBvZiBJLkUuIHRoYXQgbXVzdCBoYXZlIHRoZSBnbG9iYWwgb2JqZWN0IGZvciAndGhpcycsIGhvcGZ1bGx5IG91ciBjb250ZXh0IGNvcnJlY3Qgb3RoZXJ3aXNlIGl0IHdpbGwgdGhyb3cgYSBnbG9iYWwgZXJyb3IuXG4gICAgICAgICAgICAvLyBTb21lIHZlcnNpb25zIG9mIEkuRS4gaGF2ZSBkaWZmZXJlbnQgcnVsZXMgZm9yIGNsZWFyVGltZW91dCB2cyBzZXRUaW1lb3V0XG4gICAgICAgICAgICByZXR1cm4gY2FjaGVkQ2xlYXJUaW1lb3V0LmNhbGwodGhpcywgbWFya2VyKTtcbiAgICAgICAgfVxuICAgIH1cblxuXG5cbn1cbnZhciBxdWV1ZSA9IFtdO1xudmFyIGRyYWluaW5nID0gZmFsc2U7XG52YXIgY3VycmVudFF1ZXVlO1xudmFyIHF1ZXVlSW5kZXggPSAtMTtcblxuZnVuY3Rpb24gY2xlYW5VcE5leHRUaWNrKCkge1xuICAgIGlmICghZHJhaW5pbmcgfHwgIWN1cnJlbnRRdWV1ZSkge1xuICAgICAgICByZXR1cm47XG4gICAgfVxuICAgIGRyYWluaW5nID0gZmFsc2U7XG4gICAgaWYgKGN1cnJlbnRRdWV1ZS5sZW5ndGgpIHtcbiAgICAgICAgcXVldWUgPSBjdXJyZW50UXVldWUuY29uY2F0KHF1ZXVlKTtcbiAgICB9IGVsc2Uge1xuICAgICAgICBxdWV1ZUluZGV4ID0gLTE7XG4gICAgfVxuICAgIGlmIChxdWV1ZS5sZW5ndGgpIHtcbiAgICAgICAgZHJhaW5RdWV1ZSgpO1xuICAgIH1cbn1cblxuZnVuY3Rpb24gZHJhaW5RdWV1ZSgpIHtcbiAgICBpZiAoZHJhaW5pbmcpIHtcbiAgICAgICAgcmV0dXJuO1xuICAgIH1cbiAgICB2YXIgdGltZW91dCA9IHJ1blRpbWVvdXQoY2xlYW5VcE5leHRUaWNrKTtcbiAgICBkcmFpbmluZyA9IHRydWU7XG5cbiAgICB2YXIgbGVuID0gcXVldWUubGVuZ3RoO1xuICAgIHdoaWxlKGxlbikge1xuICAgICAgICBjdXJyZW50UXVldWUgPSBxdWV1ZTtcbiAgICAgICAgcXVldWUgPSBbXTtcbiAgICAgICAgd2hpbGUgKCsrcXVldWVJbmRleCA8IGxlbikge1xuICAgICAgICAgICAgaWYgKGN1cnJlbnRRdWV1ZSkge1xuICAgICAgICAgICAgICAgIGN1cnJlbnRRdWV1ZVtxdWV1ZUluZGV4XS5ydW4oKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgICBxdWV1ZUluZGV4ID0gLTE7XG4gICAgICAgIGxlbiA9IHF1ZXVlLmxlbmd0aDtcbiAgICB9XG4gICAgY3VycmVudFF1ZXVlID0gbnVsbDtcbiAgICBkcmFpbmluZyA9IGZhbHNlO1xuICAgIHJ1bkNsZWFyVGltZW91dCh0aW1lb3V0KTtcbn1cblxucHJvY2Vzcy5uZXh0VGljayA9IGZ1bmN0aW9uIChmdW4pIHtcbiAgICB2YXIgYXJncyA9IG5ldyBBcnJheShhcmd1bWVudHMubGVuZ3RoIC0gMSk7XG4gICAgaWYgKGFyZ3VtZW50cy5sZW5ndGggPiAxKSB7XG4gICAgICAgIGZvciAodmFyIGkgPSAxOyBpIDwgYXJndW1lbnRzLmxlbmd0aDsgaSsrKSB7XG4gICAgICAgICAgICBhcmdzW2kgLSAxXSA9IGFyZ3VtZW50c1tpXTtcbiAgICAgICAgfVxuICAgIH1cbiAgICBxdWV1ZS5wdXNoKG5ldyBJdGVtKGZ1biwgYXJncykpO1xuICAgIGlmIChxdWV1ZS5sZW5ndGggPT09IDEgJiYgIWRyYWluaW5nKSB7XG4gICAgICAgIHJ1blRpbWVvdXQoZHJhaW5RdWV1ZSk7XG4gICAgfVxufTtcblxuLy8gdjggbGlrZXMgcHJlZGljdGlibGUgb2JqZWN0c1xuZnVuY3Rpb24gSXRlbShmdW4sIGFycmF5KSB7XG4gICAgdGhpcy5mdW4gPSBmdW47XG4gICAgdGhpcy5hcnJheSA9IGFycmF5O1xufVxuSXRlbS5wcm90b3R5cGUucnVuID0gZnVuY3Rpb24gKCkge1xuICAgIHRoaXMuZnVuLmFwcGx5KG51bGwsIHRoaXMuYXJyYXkpO1xufTtcbnByb2Nlc3MudGl0bGUgPSAnYnJvd3Nlcic7XG5wcm9jZXNzLmJyb3dzZXIgPSB0cnVlO1xucHJvY2Vzcy5lbnYgPSB7fTtcbnByb2Nlc3MuYXJndiA9IFtdO1xucHJvY2Vzcy52ZXJzaW9uID0gJyc7IC8vIGVtcHR5IHN0cmluZyB0byBhdm9pZCByZWdleHAgaXNzdWVzXG5wcm9jZXNzLnZlcnNpb25zID0ge307XG5cbmZ1bmN0aW9uIG5vb3AoKSB7fVxuXG5wcm9jZXNzLm9uID0gbm9vcDtcbnByb2Nlc3MuYWRkTGlzdGVuZXIgPSBub29wO1xucHJvY2Vzcy5vbmNlID0gbm9vcDtcbnByb2Nlc3Mub2ZmID0gbm9vcDtcbnByb2Nlc3MucmVtb3ZlTGlzdGVuZXIgPSBub29wO1xucHJvY2Vzcy5yZW1vdmVBbGxMaXN0ZW5lcnMgPSBub29wO1xucHJvY2Vzcy5lbWl0ID0gbm9vcDtcbnByb2Nlc3MucHJlcGVuZExpc3RlbmVyID0gbm9vcDtcbnByb2Nlc3MucHJlcGVuZE9uY2VMaXN0ZW5lciA9IG5vb3A7XG5cbnByb2Nlc3MubGlzdGVuZXJzID0gZnVuY3Rpb24gKG5hbWUpIHsgcmV0dXJuIFtdIH1cblxucHJvY2Vzcy5iaW5kaW5nID0gZnVuY3Rpb24gKG5hbWUpIHtcbiAgICB0aHJvdyBuZXcgRXJyb3IoJ3Byb2Nlc3MuYmluZGluZyBpcyBub3Qgc3VwcG9ydGVkJyk7XG59O1xuXG5wcm9jZXNzLmN3ZCA9IGZ1bmN0aW9uICgpIHsgcmV0dXJuICcvJyB9O1xucHJvY2Vzcy5jaGRpciA9IGZ1bmN0aW9uIChkaXIpIHtcbiAgICB0aHJvdyBuZXcgRXJyb3IoJ3Byb2Nlc3MuY2hkaXIgaXMgbm90IHN1cHBvcnRlZCcpO1xufTtcbnByb2Nlc3MudW1hc2sgPSBmdW5jdGlvbigpIHsgcmV0dXJuIDA7IH07XG4iLCIvKiBnbG9iYWwgZXhwb3J0cyAqL1xuLyoqXG4gKiBAZmlsZW92ZXJ2aWV3IGEgdGlueSBsaWJyYXJ5IGZvciBXZWIgV29ya2VyIFJlbW90ZSBNZXRob2QgSW52b2NhdGlvblxuICpcbiAqL1xuY29uc3QgT2JqZWN0SUQgPSByZXF1aXJlKCdic29uLW9iamVjdGlkJyk7XG5cbi8qKlxuICogQHByaXZhdGUgcmV0dXJucyBhIGxpc3Qgb2YgVHJhbnNmZXJhYmxlIG9iamVjdHMgd2hpY2gge0Bjb2RlIG9ian0gaW5jbHVkZXNcbiAqIEBwYXJhbSB7b2JqZWN0fSBvYmogYW55IG9iamVjdFxuICogQHBhcmFtIHtBcnJheX0gbGlzdCBmb3IgaW50ZXJuYWwgcmVjdXJzaW9uIG9ubHlcbiAqIEByZXR1cm4ge0xpc3R9IGEgbGlzdCBvZiBUcmFuc2ZlcmFibGUgb2JqZWN0c1xuICovXG5mdW5jdGlvbiBnZXRUcmFuc2Zlckxpc3Qob2JqLCBsaXN0ID0gW10pIHtcbiAgICBpZiAoQXJyYXlCdWZmZXIuaXNWaWV3KG9iaikpIHtcbiAgICAgICAgbGlzdC5wdXNoKG9iai5idWZmZXIpO1xuICAgICAgICByZXR1cm4gbGlzdDtcbiAgICB9XG4gICAgaWYgKGlzVHJhbnNmZXJhYmxlKG9iaikpIHtcbiAgICAgICAgbGlzdC5wdXNoKG9iaik7XG4gICAgICAgIHJldHVybiBsaXN0O1xuICAgIH1cbiAgICBpZiAoISh0eXBlb2Ygb2JqID09PSAnb2JqZWN0JykpIHtcbiAgICAgICAgcmV0dXJuIGxpc3Q7XG4gICAgfVxuICAgIGZvciAoY29uc3QgcHJvcCBpbiBvYmopIHtcbiAgICAgICAgaWYgKG9iai5oYXNPd25Qcm9wZXJ0eShwcm9wKSkge1xuICAgICAgICAgICAgZ2V0VHJhbnNmZXJMaXN0KG9ialtwcm9wXSwgbGlzdCk7XG4gICAgICAgIH1cbiAgICB9XG4gICAgcmV0dXJuIGxpc3Q7XG59XG5cbi8qKlxuICogQHByaXZhdGUgY2hlY2tzIGlmIHtAY29kZSBvYmp9IGlzIFRyYW5zZmVyYWJsZSBvciBub3QuXG4gKiBAcGFyYW0ge29iamVjdH0gb2JqIGFueSBvYmplY3RcbiAqIEByZXR1cm4ge2Jvb2xlYW59XG4gKi9cbmZ1bmN0aW9uIGlzVHJhbnNmZXJhYmxlKG9iaikge1xuICAgIGNvbnN0IHRyYW5zZmVyYWJsZSA9IFtBcnJheUJ1ZmZlcl07XG4gICAgaWYgKHR5cGVvZiBNZXNzYWdlUG9ydCAhPT0gJ3VuZGVmaW5lZCcpIHtcbiAgICAgICAgdHJhbnNmZXJhYmxlLnB1c2goTWVzc2FnZVBvcnQpO1xuICAgIH1cbiAgICBpZiAodHlwZW9mIEltYWdlQml0bWFwICE9PSAndW5kZWZpbmVkJykge1xuICAgICAgICB0cmFuc2ZlcmFibGUucHVzaChJbWFnZUJpdG1hcCk7XG4gICAgfVxuICAgIHJldHVybiB0cmFuc2ZlcmFibGUuc29tZShlID0+IG9iaiBpbnN0YW5jZW9mIGUpO1xufVxuXG4vKipcbiAqIEBjbGFzcyBiYXNlIGNsYXNzIHdob3NlIGNoaWxkIGNsYXNzZXMgdXNlIFJNSVxuICovXG5jbGFzcyBXb3JrZXJSTUkge1xuICAgIC8qKlxuICAgICAqIEBjb25zdHJ1Y3RvclxuICAgICAqIEBwYXJhbSB7b2JqZWN0fSByZW1vdGUgYW4gaW5zdGFuY2UgdG8gY2FsbCBwb3N0TWVzc2FnZSBtZXRob2RcbiAgICAgKiBAcGFyYW0ge0FycmF5fSBhcmdzIGFyZ3VtZW50cyB0byBiZSBwYXNzZWQgdG8gc2VydmVyLXNpZGUgaW5zdGFuY2VcbiAgICAgKi9cbiAgICBjb25zdHJ1Y3RvcihyZW1vdGUsIC4uLmFyZ3MpIHtcbiAgICAgICAgdGhpcy5yZW1vdGUgPSByZW1vdGU7XG4gICAgICAgIHRoaXMuaWQgPSBPYmplY3RJRCgpLnRvU3RyaW5nKCk7XG4gICAgICAgIHRoaXMubWV0aG9kU3RhdGVzID0ge307XG4gICAgICAgIHRoaXMucmVtb3RlLmFkZEV2ZW50TGlzdGVuZXIoJ21lc3NhZ2UnLCBldmVudCA9PiB7XG4gICAgICAgICAgICBjb25zdCBkYXRhID0gZXZlbnQuZGF0YTtcbiAgICAgICAgICAgIGlmIChkYXRhLmlkID09PSB0aGlzLmlkKSB7XG4gICAgICAgICAgICAgICAgdGhpcy5yZXR1cm5IYW5kbGVyKGRhdGEpO1xuICAgICAgICAgICAgfVxuICAgICAgICB9LCBmYWxzZSk7XG4gICAgICAgIHRoaXMuY29uc3RydWN0b3JQcm9taXNlID0gdGhpcy5pbnZva2VSTSh0aGlzLmNvbnN0cnVjdG9yLm5hbWUsIGFyZ3MpO1xuICAgIH1cblxuICAgIC8qKlxuICAgICAqIGludm9rZXMgcmVtb3RlIG1ldGhvZFxuICAgICAqIEBwYXJhbSB7c3RyaW5nfSBtZXRob2ROYW1lIE1ldGhvZCBuYW1lXG4gICAgICogQHBhcmFtIHtBcnJheX0gYXJncyBhcmd1bWVudHMgdG8gYmUgcGFzc2VkIHRvIHNlcnZlci1zaWRlIGluc3RhbmNlXG4gICAgICogQHJldHVybiB7UHJvbWlzZX1cbiAgICAgKi9cbiAgICBpbnZva2VSTShtZXRob2ROYW1lLCBhcmdzID0gW10pIHtcbiAgICAgICAgaWYgKCF0aGlzLm1ldGhvZFN0YXRlc1ttZXRob2ROYW1lXSkge1xuICAgICAgICAgICAgdGhpcy5tZXRob2RTdGF0ZXNbbWV0aG9kTmFtZV0gPSB7XG4gICAgICAgICAgICAgICAgbnVtOiAwLFxuICAgICAgICAgICAgICAgIHJlc29sdmVSZWplY3RzOiB7fVxuICAgICAgICAgICAgfTtcbiAgICAgICAgfVxuICAgICAgICByZXR1cm4gbmV3IFByb21pc2UoKHJlc29sdmUsIHJlamVjdCkgPT4ge1xuICAgICAgICAgICAgY29uc3QgbWV0aG9kU3RhdGUgPSB0aGlzLm1ldGhvZFN0YXRlc1ttZXRob2ROYW1lXTtcbiAgICAgICAgICAgIG1ldGhvZFN0YXRlLm51bSArPSAxO1xuICAgICAgICAgICAgbWV0aG9kU3RhdGUucmVzb2x2ZVJlamVjdHNbbWV0aG9kU3RhdGUubnVtXSA9IHsgcmVzb2x2ZSwgcmVqZWN0IH07XG4gICAgICAgICAgICB0aGlzLnJlbW90ZS5wb3N0TWVzc2FnZSh7XG4gICAgICAgICAgICAgICAgaWQ6IHRoaXMuaWQsXG4gICAgICAgICAgICAgICAgbWV0aG9kTmFtZSxcbiAgICAgICAgICAgICAgICBudW06IG1ldGhvZFN0YXRlLm51bSxcbiAgICAgICAgICAgICAgICBhcmdzXG4gICAgICAgICAgICB9LCBnZXRUcmFuc2Zlckxpc3QoYXJncykpO1xuICAgICAgICB9KTtcbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBAcHJpdmF0ZSBoYW5kbGVzIGNvcnJlc3BvbmRlbnQgJ21lc3NhZ2UnIGV2ZW50XG4gICAgICogQHBhcmFtIHtvYmp9IGRhdGEgZGF0YSBwcm9wZXJ0eSBvZiAnbWVzc2FnZScgZXZlbnRcbiAgICAgKi9cbiAgICByZXR1cm5IYW5kbGVyKGRhdGEpIHtcbiAgICAgICAgY29uc3QgcmVzb2x2ZVJlamVjdHMgPSB0aGlzLm1ldGhvZFN0YXRlc1tkYXRhLm1ldGhvZE5hbWVdLnJlc29sdmVSZWplY3RzO1xuICAgICAgICBpZiAoZGF0YS5lcnJvcikge1xuICAgICAgICAgICAgcmVzb2x2ZVJlamVjdHNbZGF0YS5udW1dLnJlamVjdChkYXRhLmVycm9yKTtcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIHJlc29sdmVSZWplY3RzW2RhdGEubnVtXS5yZXNvbHZlKGRhdGEucmVzdWx0KTtcbiAgICAgICAgfVxuICAgICAgICBkZWxldGUgcmVzb2x2ZVJlamVjdHNbZGF0YS5udW1dO1xuICAgIH1cbn1cblxuXG4vKipcbiAqIEBwcml2YXRlIGV4ZWN1dGVzIGEgbWV0aG9kIG9uIHNlcnZlciBhbmQgcG9zdCBhIHJlc3VsdCBhcyBtZXNzYWdlLlxuICogQHBhcmFtIHtvYmp9IGV2ZW50ICdtZXNzYWdlJyBldmVudFxuICovXG5hc3luYyBmdW5jdGlvbiBoYW5kbGVXb3JrZXJSTUkoZXZlbnQpIHtcbiAgICBjb25zdCBkYXRhID0gZXZlbnQuZGF0YTtcbiAgICBjb25zdCBtZXNzYWdlID0ge1xuICAgICAgICBpZDogZGF0YS5pZCxcbiAgICAgICAgbWV0aG9kTmFtZTogZGF0YS5tZXRob2ROYW1lLFxuICAgICAgICBudW06IGRhdGEubnVtLFxuICAgIH07XG4gICAgbGV0IHJlc3VsdDtcbiAgICBpZiAoZGF0YS5tZXRob2ROYW1lID09PSB0aGlzLm5hbWUpIHtcbiAgICAgICAgdGhpcy53b3JrZXJSTUkuaW5zdGFuY2VzW2RhdGEuaWRdID0gbmV3IHRoaXMoLi4uZGF0YS5hcmdzKTtcbiAgICAgICAgbWVzc2FnZS5yZXN1bHQgPSBudWxsO1xuICAgICAgICB0aGlzLndvcmtlclJNSS50YXJnZXQucG9zdE1lc3NhZ2UobWVzc2FnZSwgZ2V0VHJhbnNmZXJMaXN0KHJlc3VsdCkpO1xuICAgIH0gZWxzZSB7XG4gICAgICAgIGNvbnN0IGluc3RhbmNlID0gdGhpcy53b3JrZXJSTUkuaW5zdGFuY2VzW2RhdGEuaWRdO1xuICAgICAgICBpZiAoaW5zdGFuY2UpIHtcbiAgICAgICAgICAgIHRyeSB7XG4gICAgICAgICAgICAgICAgcmVzdWx0ID0gYXdhaXQgaW5zdGFuY2VbZGF0YS5tZXRob2ROYW1lXS5hcHBseShpbnN0YW5jZSwgZGF0YS5hcmdzKVxuICAgICAgICAgICAgICAgIG1lc3NhZ2UucmVzdWx0ID0gcmVzdWx0O1xuICAgICAgICAgICAgICAgIHRoaXMud29ya2VyUk1JLnRhcmdldC5wb3N0TWVzc2FnZShtZXNzYWdlLCBnZXRUcmFuc2Zlckxpc3QocmVzdWx0KSk7XG4gICAgICAgICAgICB9IGNhdGNoIChlKSB7XG4gICAgICAgICAgICAgICAgbWVzc2FnZS5lcnJvciA9IGUudG9TdHJpbmcoKTtcbiAgICAgICAgICAgICAgICB0aGlzLndvcmtlclJNSS50YXJnZXQucG9zdE1lc3NhZ2UobWVzc2FnZSk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICB9XG59XG5cbi8qKlxuICogcmVnaXN0ZXJzIGEgY2xhc3MgYXMgYW4gZXhlY3V0ZXIgb2YgUk1JIG9uIHNlcnZlclxuICogQHBhcmFtIHtvYmp9IHRhcmdldCBhbiBpbnN0YW5jZSB0aGF0IHJlY2VpdmVzICdtZXNzYWdlJyBldmVudHMgb2YgUk1JXG4gKiBAcGFyYW0ge0NsYXNzfSBrbGFzcyBhIGNsYXNzIHRvIGJlIHJlZ2lzdGVyZWRcbiAqL1xuZnVuY3Rpb24gcmVzaWd0ZXJXb3JrZXJSTUkodGFyZ2V0LCBrbGFzcykge1xuICAgIGtsYXNzLndvcmtlclJNSSA9IHtcbiAgICAgICAgdGFyZ2V0LFxuICAgICAgICBpbnN0YW5jZXM6IHt9LFxuICAgICAgICBoYW5kbGVyOiBoYW5kbGVXb3JrZXJSTUkuYmluZChrbGFzcylcbiAgICB9XG4gICAgdGFyZ2V0LmFkZEV2ZW50TGlzdGVuZXIoJ21lc3NhZ2UnLCBrbGFzcy53b3JrZXJSTUkuaGFuZGxlcik7XG59XG5cbi8qKlxuICogdW5yZXNpZ3RlcnMgYSBjbGFzcyByZWdpc3RlcmVkIGJ5IHJlZ2lzdGVyV29ya2VyUk1JXG4gKiBAcGFyYW0ge29ian0gdGFyZ2V0IGFuIGluc3RhbmNlIHRoYXQgcmVjZWl2ZXMgJ21lc3NhZ2UnIGV2ZW50cyBvZiBSTUlcbiAqIEBwYXJhbSB7Q2xhc3N9IGtsYXNzIGEgY2xhc3MgdG8gYmUgdW5yZWdpc3RlcmVkXG4gKi9cbmZ1bmN0aW9uIHVucmVzaWd0ZXJXb3JrZXJSTUkodGFyZ2V0LCBrbGFzcykge1xuICAgIHRhcmdldC5yZW1vdmVFdmVudExpc3RlbmVyKCdtZXNzYWdlJywga2xhc3Mud29ya2VyUk1JLmhhbmRsZXIpXG4gICAgZGVsZXRlIGtsYXNzLndvcmtlclJNSTtcbn1cblxuZXhwb3J0cy5Xb3JrZXJSTUkgPSBXb3JrZXJSTUk7XG5leHBvcnRzLnJlc2lndGVyV29ya2VyUk1JID0gcmVzaWd0ZXJXb3JrZXJSTUk7XG5leHBvcnRzLnVucmVzaWd0ZXJXb3JrZXJSTUkgPSB1bnJlc2lndGVyV29ya2VyUk1JO1xuIiwiJ3VzZSBzdHJpY3QnO1xuXG5PYmplY3QuZGVmaW5lUHJvcGVydHkoZXhwb3J0cywgXCJfX2VzTW9kdWxlXCIsIHtcbiAgICB2YWx1ZTogdHJ1ZVxufSk7XG5leHBvcnRzLkFaanNFbmdpbmUgPSB1bmRlZmluZWQ7XG5cbnZhciBfbmV1cmFsX25ldHdvcmtfY2xpZW50ID0gcmVxdWlyZSgnLi9uZXVyYWxfbmV0d29ya19jbGllbnQuanMnKTtcblxudmFyIF9ib2FyZF9jb25zdGFudHMgPSByZXF1aXJlKCcuL2JvYXJkX2NvbnN0YW50cy5qcycpO1xuXG52YXIgX2JvYXJkID0gcmVxdWlyZSgnLi9ib2FyZC5qcycpO1xuXG52YXIgX21jdHMgPSByZXF1aXJlKCcuL21jdHMuanMnKTtcblxuLyoqXG4gKiDlr77lsYDjgpLooYzjgYbmgJ3ogIPjgqjjg7Pjgrjjg7Pjgq/jg6njgrnjgafjgZnjgIJcbiAqIOOCpuOCp+ODluODr+ODvOOCq+OBp+WLleOBi+OBmeOBk+OBqOOCkuWJjeaPkOOBq+OAgeODoeOCpOODs+OCueODrOODg+ODieOBruOCouODl+ODquOBqE5ldXJhbE5ldHdvcmvjga4y44Gk44Go6YCa5L+h44GX44Gq44GM44KJTUNUU+OCkuWun+ihjOOBl+OBvuOBmeOAglxuICovXG4vKipcbiAqIEBmaWxlIOWvvuWxgOOCkuihjOOBhuaAneiAg+OCqOODs+OCuOODs+OCr+ODqeOCuUFaanNFbmdpbmXjga7jgrPjg7zjg4njgafjgZnjgIJcbiAqIOOCpuOCp+ODluODr+ODvOOCq+OBp+WLleOBi+OBmeOBk+OBqOOCkuWJjeaPkOOBq+OAgeODoeOCpOODs+OCueODrOODg+ODieOBruOCouODl+ODquOBqE5ldXJhbE5ldHdvcmvjga4y44Gk44Go6YCa5L+h44GX44Gq44GM44KJ44Oi44Oz44OG44Kr44Or44Ot44OE44Oq44O85o6i57Si44KS5a6f6KGM44GX44G+44GZ44CCXG4gKi9cbi8qXG4gKiBAYXV0aG9yIOW4guW3nembhOS6jFxuICogQGNvcHlyaWdodCAyMDE4IElDSElLQVdBLCBZdWppIChOZXcgMyBScylcbiAqIEBsaWNlbnNlIE1JVFxuICovXG4vLyDjg6HjgqTjg7Pjgrnjg6zjg4Pjg4njgafli5XjgYvjgZnloLTlkIjjgIHku6XkuIvjga5pbXBvcnTjgpInLi9uZXVyYWxfbmV0d29yay5qcyfjgavlpInjgYjjgb7jgZnjgIJcbmNsYXNzIEFaanNFbmdpbmUge1xuICAgIC8qKlxuICAgICAqIEBwYXJhbSB7SW50ZWdlcn0gc2l6ZSDnooHnm6TjgrXjgqTjgrpcbiAgICAgKiBAcGFyYW0ge251bWJlcn0ga29taSDjgrPjg59cbiAgICAgKi9cbiAgICBjb25zdHJ1Y3RvcihzaXplID0gMTksIGtvbWkgPSA3KSB7XG4gICAgICAgIHRoaXMuYiA9IG5ldyBfYm9hcmQuQm9hcmQobmV3IF9ib2FyZF9jb25zdGFudHMuQm9hcmRDb25zdGFudHMoc2l6ZSksIGtvbWkpO1xuICAgICAgICB0aGlzLm5uID0gbmV3IF9uZXVyYWxfbmV0d29ya19jbGllbnQuTmV1cmFsTmV0d29yayhzZWxmKTtcbiAgICAgICAgdGhpcy5tY3RzID0gbmV3IF9tY3RzLk1DVFModGhpcy5ubiwgdGhpcy5iLkMpO1xuICAgIH1cblxuICAgIC8qKlxuICAgICAqIOODi+ODpeODvOODqeODq+ODjeODg+ODiOODr+ODvOOCr+OBruOCpuOCp+OCpOODiOOCkuODreODvOODieOBl+OBvuOBmeOAglxuICAgICAqL1xuICAgIGFzeW5jIGxvYWROTigpIHtcbiAgICAgICAgbGV0IGFyZ3M7XG4gICAgICAgIHN3aXRjaCAodGhpcy5iLkMuQlNJWkUpIHtcbiAgICAgICAgICAgIGNhc2UgOTpcbiAgICAgICAgICAgICAgICBhcmdzID0gWydodHRwczovL3N0b3JhZ2UuZ29vZ2xlYXBpcy5jb20vbWltaWFrYS1zdG9yYWdlL0xlZWxhWmVybzknXTtcbiAgICAgICAgICAgICAgICBicmVhaztcbiAgICAgICAgICAgIGNhc2UgMTk6XG4gICAgICAgICAgICAgICAgYXJncyA9IFsnaHR0cHM6Ly9zdG9yYWdlLmdvb2dsZWFwaXMuY29tL21pbWlha2Etc3RvcmFnZS9FTEZfT3BlbkdvJywgMl07XG4gICAgICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgICAgICBkZWZhdWx0OlxuICAgICAgICAgICAgICAgIHRocm93IG5ldyBFcnJvcignc2l6ZSBpcyBub3Qgc3VwcG9ydGVkJyk7XG4gICAgICAgIH1cbiAgICAgICAgYXdhaXQgdGhpcy5ubi5pbnZva2VSTSgnbG9hZCcsIGFyZ3MpO1xuICAgIH1cblxuICAgIC8qKlxuICAgICAqIOWGhemDqOeKtuaFi+OCkuOCr+ODquOCouOBl+OBvuOBmeOAglxuICAgICAqIOaUueOCgeOBpuWIneaJi+OBi+OCieWvvuWxgOWPr+iDveOBq+OBquOCiuOBvuOBmeOAglxuICAgICAqL1xuICAgIGNsZWFyKCkge1xuICAgICAgICB0aGlzLmIucmVzZXQoKTtcbiAgICAgICAgdGhpcy5tY3RzLmNsZWFyKCk7XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICog5oyB44Gh5pmC6ZaT44KS6Kit5a6a44GX44G+44GZ44CCXG4gICAgICogQHBhcmFtIHtudW1iZXJ9IG1haW5UaW1lIOenklxuICAgICAqIEBwYXJhbSB7bnVtYmVyfSBieW95b21pIOenklxuICAgICAqL1xuICAgIHRpbWVTZXR0aW5ncyhtYWluVGltZSwgYnlveW9taSkge1xuICAgICAgICB0aGlzLm1jdHMuc2V0VGltZShtYWluVGltZSwgYnlveW9taSk7XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICog5qyh44Gu5omL44KS6L+U44GX44G+44GZ44CC54q25rOB44Gr5b+c44GY44Gm5oqV5LqG44GX44G+44GZ44CCXG4gICAgICog5oi744KK5YCkW3gsIHld44Gv5bem5LiK44GMMS3jgqrjg6rjgrjjg7Pjga4y5qyh5YWD5bqn5qiZ44Gn44GZ44CC44KC44GX44GP44GvJ3Jlc2dpbifjgb7jgZ/jga8ncGFzcyfjgpLov5TjgZfjgb7jgZnjgIJcbiAgICAgKiDlhoXpg6jjgafkv53mjIHjgZfjgabjgYTjgovlsYDpnaLjgoLpgLLjgoHjgb7jgZnjgIJcbiAgICAgKiBAcmV0dXJucyB7SW50ZWdlcltdfHN0cmluZ31cbiAgICAgKi9cbiAgICBhc3luYyBnZW5tb3ZlKCkge1xuICAgICAgICB0cnkge1xuICAgICAgICAgICAgY29uc3QgW21vdmUsIHdpblJhdGVdID0gYXdhaXQgdGhpcy5zZWFyY2goKTtcbiAgICAgICAgICAgIGlmICh3aW5SYXRlIDwgMC4wNSkge1xuICAgICAgICAgICAgICAgIHJldHVybiAncmVzaWduJztcbiAgICAgICAgICAgIH0gZWxzZSBpZiAobW92ZSA9PT0gdGhpcy5iLkMuUEFTUyB8fCB0aGlzLmIuc3RhdGVbbW92ZV0gPT09IHRoaXMuYi5DLkVNUFRZKSB7XG4gICAgICAgICAgICAgICAgdGhpcy5iLnBsYXkobW92ZSwgdHJ1ZSk7XG4gICAgICAgICAgICAgICAgcmV0dXJuIG1vdmUgPT09IHRoaXMuYi5DLlBBU1MgPyAncGFzcycgOiB0aGlzLmIuQy5ldjJ4eShtb3ZlKTtcbiAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgY29uc29sZS5sb2coJ2Vycm9yJyk7XG4gICAgICAgICAgICAgICAgY29uc29sZS5sb2coJyVkKCVzKSBpcyBub3QgZW1wdHknLCBtb3ZlLCB0aGlzLmIuQy5ldjJzdHIobW92ZSkpO1xuICAgICAgICAgICAgICAgIHRoaXMuYi5zaG93Ym9hcmQoKTtcbiAgICAgICAgICAgICAgICBjb25zb2xlLmxvZyh0aGlzLmIuY2FuZGlkYXRlcygpKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfSBjYXRjaCAoZSkge1xuICAgICAgICAgICAgY29uc29sZS5lcnJvcihlKTtcbiAgICAgICAgfVxuICAgIH1cblxuICAgIC8qKlxuICAgICAqIOasoeOBruaJi+OCkuaJk+OBo+OBpuePvuWxgOmdouOCkumAsuOCgeOBvuOBmeOAglxuICAgICAqICh4LCB5KeOBr+W3puS4iuOBjDEt44Kq44Oq44K444Oz44GuMuasoeWFg+W6p+aomeOBp+OBmeOAglxuICAgICAqIEBwYXJhbSB7SW50ZWdlcn0geCBcbiAgICAgKiBAcGFyYW0ge0ludGVnZXJ9IHkgXG4gICAgICovXG4gICAgcGxheSh4LCB5KSB7XG4gICAgICAgIHRoaXMuYi5wbGF5KHRoaXMuYi5DLnh5MmV2KHgsIHkpKTtcbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiDmrKHjga7miYvjgpLjg5HjgrnjgZfjgabnj77lsYDpnaLjgpLpgLLjgoHjgb7jgZnjgIJcbiAgICAgKi9cbiAgICBwYXNzKCkge1xuICAgICAgICB0aGlzLmIucGxheSh0aGlzLmIuQy5QQVNTKTtcbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBAcHJpdmF0ZVxuICAgICAqL1xuICAgIGFzeW5jIHNlYXJjaCgpIHtcbiAgICAgICAgcmV0dXJuIGF3YWl0IHRoaXMubWN0cy5zZWFyY2godGhpcy5iLCAwLjAsIGZhbHNlLCBmYWxzZSk7XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogQHByaXZhdGVcbiAgICAgKi9cbiAgICBmaW5hbFNjb3JlKCkge1xuICAgICAgICByZXR1cm4gdGhpcy5iLmZpbmFsU2NvcmUoKTtcbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiDnm7jmiYvjga7ogIPmha7kuK3jgavmjqLntKLjgpLntpnntprjgZfjgb7jgZnjgIJcbiAgICAgKi9cbiAgICBhc3luYyBwb25kZXIoKSB7XG4gICAgICAgIHJldHVybiBhd2FpdCB0aGlzLm1jdHMuc2VhcmNoKHRoaXMuYiwgSW5maW5pdHksIHRydWUsIGZhbHNlKTtcbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiDmjqLntKLjgpLlvLfliLbntYLkuobjgZXjgZvjgb7jgZnjgIJcbiAgICAgKiDmjqLntKLjg4Tjg6rjg7zjga/mnInlirnjgarjgb7jgb7jgafjgZnjgILkuLvjgavjg53jg7Pjg4Djg6rjg7PjgrDntYLkuobjgavkvb/jgYTjgb7jgZnjgIJcbiAgICAgKi9cbiAgICBzdG9wKCkge1xuICAgICAgICB0aGlzLm1jdHMuc3RvcCgpO1xuICAgIH1cblxuICAgIC8qKlxuICAgICAqIOODoeOCpOODs+aZgumWk+OBruaui+OCiuaZgumWk+OCkui/lOOBl+OBvuOBmeOAglxuICAgICAqIEByZXR1cm5zIHtudW1iZXJ9IOaui+OCiuOBruenkuaVsFxuICAgICAqL1xuICAgIHRpbWVMZWZ0KCkge1xuICAgICAgICByZXR1cm4gdGhpcy5tY3RzLmxlZnRUaW1lO1xuICAgIH1cbn1cbmV4cG9ydHMuQVpqc0VuZ2luZSA9IEFaanNFbmdpbmU7IiwiJ3VzZSBzdHJpY3QnO1xuXG5PYmplY3QuZGVmaW5lUHJvcGVydHkoZXhwb3J0cywgXCJfX2VzTW9kdWxlXCIsIHtcbiAgICB2YWx1ZTogdHJ1ZVxufSk7XG5leHBvcnRzLkJvYXJkID0gdW5kZWZpbmVkO1xuXG52YXIgX3V0aWxzID0gcmVxdWlyZSgnLi91dGlscy5qcycpO1xuXG52YXIgX3N0b25lX2dyb3VwID0gcmVxdWlyZSgnLi9zdG9uZV9ncm91cC5qcycpO1xuXG4vLy8g44OL44Ol44O844Op44Or44ON44OD44OI44Ov44O844Kv44G444Gu5YWl5Yqb44Gr6Zai44GZ44KL5bGl5q2044Gu5rex44GV44Gn44GZ44CCXG4vKipcbiAqIEBmaWxlIOeigeebpOOCr+ODqeOCueOBp+OBmeOAglxuICog44GT44Gu44Kz44O844OJ44GvUHlhceOBruenu+akjeOCs+ODvOODieOBp+OBmeOAglxuICogQHNlZSB7QGxpbmsgaHR0cHM6Ly9naXRodWIuY29tL3ltZ2FxL1B5YXF9XG4gKi9cbi8qXG4gKiBAYXV0aG9yIOW4guW3nembhOS6jCBcbiAqIEBjb3B5cmlnaHQgMjAxOCBJQ0hJS0FXQSwgWXVqaSAoTmV3IDMgUnMpXG4gKiBAbGljZW5zZSBNSVRcbiAqL1xuY29uc3QgS0VFUF9QUkVWX0NOVCA9IDc7XG5jb25zdCBGRUFUVVJFX0NOVCA9IEtFRVBfUFJFVl9DTlQgKiAyICsgNDtcblxuLyoqXG4gKiDjg4vjg6Xjg7zjg6njg6vjg43jg4Pjg4jjg6/jg7zjgq/jga7lhaXlipvjga7jgqTjg7Pjg4fjg4Pjgq/jgrnjgpLoqIjnrpfjgZfjgb7jgZnjgIJcbiAqIEBwYXJhbSB7Kn0gcnYg56KB55uk44Gu5Lqk54K544Gu57ea5b2i5bqn5qiZXG4gKiBAcGFyYW0geyp9IGYg44OV44Kj44O844OB44Oj44O855Wq5Y+3XG4gKiBAcGFyYW0geyp9IHN5bW1ldHJ5IOWvvuensOWkieaPm1xuICovXG5mdW5jdGlvbiBmZWF0dXJlSW5kZXgocnYsIGYpIHtcbiAgICByZXR1cm4gcnYgKiBGRUFUVVJFX0NOVCArIGY7XG59XG5cbi8qKlxuICog56KB55uk44Kv44Op44K544Gn44GZ44CCXG4gKi9cbmNsYXNzIEJvYXJkIHtcbiAgICAvKipcbiAgICAgKiBAcGFyYW0ge0JvYXJkQ29uc3RhbnRzfSBjb25zdGFudHNcbiAgICAgKiBAcGFyYW0ge251bWJlcn0ga29taSBcbiAgICAgKi9cbiAgICBjb25zdHJ1Y3Rvcihjb25zdGFudHMsIGtvbWkgPSA3LjUpIHtcbiAgICAgICAgdGhpcy5DID0gY29uc3RhbnRzO1xuICAgICAgICB0aGlzLmtvbWkgPSBrb21pO1xuICAgICAgICAvKiog5Lqk54K544Gu54q25oWL6YWN5YiX44Gn44GZ44CC5ouh5by157ea5b2i5bqn5qiZ44Gn44GZ44CCICovXG4gICAgICAgIHRoaXMuc3RhdGUgPSBuZXcgVWludDhBcnJheSh0aGlzLkMuRUJWQ05UKTtcbiAgICAgICAgdGhpcy5zdGF0ZS5maWxsKHRoaXMuQy5FWFRFUklPUik7XG4gICAgICAgIHRoaXMuaWQgPSBuZXcgVWludDE2QXJyYXkodGhpcy5DLkVCVkNOVCk7IC8vIOS6pOeCueOBrumAo0lE44Gn44GZ44CCXG4gICAgICAgIHRoaXMubmV4dCA9IG5ldyBVaW50MTZBcnJheSh0aGlzLkMuRUJWQ05UKTsgLy8g5Lqk54K544KS5ZCr44KA6YCj44Gu5qyh44Gu55+z44Gu5bqn5qiZ44Gn44GZ44CCXG4gICAgICAgIHRoaXMuc2cgPSBbXTsgLy8g6YCj5oOF5aCx44Gn44GZ44CCXG4gICAgICAgIGZvciAobGV0IGkgPSAwOyBpIDwgdGhpcy5DLkVCVkNOVDsgaSsrKSB7XG4gICAgICAgICAgICB0aGlzLnNnLnB1c2gobmV3IF9zdG9uZV9ncm91cC5TdG9uZUdyb3VwKHRoaXMuQykpO1xuICAgICAgICB9XG4gICAgICAgIHRoaXMucHJldlN0YXRlID0gW107XG4gICAgICAgIHRoaXMua28gPSB0aGlzLkMuVk5VTEw7XG4gICAgICAgIC8qKiDmiYvnlarjgafjgZnjgIIgKi9cbiAgICAgICAgdGhpcy50dXJuID0gdGhpcy5DLkJMQUNLO1xuICAgICAgICAvKiog54++5Zyo44Gu5omL5pWw44Gn44GZ44CCICovXG4gICAgICAgIHRoaXMubW92ZU51bWJlciA9IDA7XG4gICAgICAgIC8qKiDnm7TliY3jga7nnYDmiYvjgafjgZnjgIIgKi9cbiAgICAgICAgdGhpcy5wcmV2TW92ZSA9IHRoaXMuQy5WTlVMTDtcbiAgICAgICAgdGhpcy5yZW1vdmVDbnQgPSAwO1xuICAgICAgICB0aGlzLmhpc3RvcnkgPSBbXTtcbiAgICAgICAgdGhpcy5yZXNldCgpO1xuICAgIH1cblxuICAgIC8qKlxuICAgICAqIOeKtuaFi+OCkuWIneacn+WMluOBl+OBvuOBmeOAglxuICAgICAqL1xuICAgIHJlc2V0KCkge1xuICAgICAgICBmb3IgKGxldCB4ID0gMTsgeCA8PSB0aGlzLkMuQlNJWkU7IHgrKykge1xuICAgICAgICAgICAgZm9yIChsZXQgeSA9IDE7IHkgPD0gdGhpcy5DLkJTSVpFOyB5KyspIHtcbiAgICAgICAgICAgICAgICB0aGlzLnN0YXRlW3RoaXMuQy54eTJldih4LCB5KV0gPSB0aGlzLkMuRU1QVFk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgICAgZm9yIChsZXQgaSA9IDA7IGkgPCB0aGlzLmlkLmxlbmd0aDsgaSsrKSB7XG4gICAgICAgICAgICB0aGlzLmlkW2ldID0gaTtcbiAgICAgICAgfVxuICAgICAgICBmb3IgKGxldCBpID0gMDsgaSA8IHRoaXMubmV4dC5sZW5ndGg7IGkrKykge1xuICAgICAgICAgICAgdGhpcy5uZXh0W2ldID0gaTtcbiAgICAgICAgfVxuICAgICAgICB0aGlzLnNnLmZvckVhY2goZSA9PiB7XG4gICAgICAgICAgICBlLmNsZWFyKGZhbHNlKTtcbiAgICAgICAgfSk7XG4gICAgICAgIHRoaXMucHJldlN0YXRlID0gW107XG4gICAgICAgIGZvciAobGV0IGkgPSAwOyBpIDwgS0VFUF9QUkVWX0NOVDsgaSsrKSB7XG4gICAgICAgICAgICB0aGlzLnByZXZTdGF0ZS5wdXNoKHRoaXMuc3RhdGUuc2xpY2UoKSk7XG4gICAgICAgIH1cbiAgICAgICAgdGhpcy5rbyA9IHRoaXMuQy5WTlVMTDtcbiAgICAgICAgdGhpcy50dXJuID0gdGhpcy5DLkJMQUNLO1xuICAgICAgICB0aGlzLm1vdmVOdW1iZXIgPSAwO1xuICAgICAgICB0aGlzLnByZXZNb3ZlID0gdGhpcy5DLlZOVUxMO1xuICAgICAgICB0aGlzLnJlbW92ZUNudCA9IDA7XG4gICAgICAgIHRoaXMuaGlzdG9yeSA9IFtdO1xuICAgIH1cblxuICAgIC8qKlxuICAgICAqIGRlc3TjgavnirbmhYvjgpLjgrPjg5Tjg7zjgZfjgb7jgZnjgIJcbiAgICAgKiBAcGFyYW0ge0JvYXJkfSBkZXN0IFxuICAgICAqL1xuICAgIGNvcHlUbyhkZXN0KSB7XG4gICAgICAgIGRlc3Quc3RhdGUgPSB0aGlzLnN0YXRlLnNsaWNlKCk7XG4gICAgICAgIGRlc3QuaWQgPSB0aGlzLmlkLnNsaWNlKCk7XG4gICAgICAgIGRlc3QubmV4dCA9IHRoaXMubmV4dC5zbGljZSgpO1xuICAgICAgICBmb3IgKGxldCBpID0gMDsgaSA8IGRlc3Quc2cubGVuZ3RoOyBpKyspIHtcbiAgICAgICAgICAgIHRoaXMuc2dbaV0uY29weVRvKGRlc3Quc2dbaV0pO1xuICAgICAgICB9XG4gICAgICAgIGRlc3QucHJldlN0YXRlID0gW107XG4gICAgICAgIGZvciAobGV0IGkgPSAwOyBpIDwgS0VFUF9QUkVWX0NOVDsgaSsrKSB7XG4gICAgICAgICAgICBkZXN0LnByZXZTdGF0ZS5wdXNoKHRoaXMucHJldlN0YXRlW2ldLnNsaWNlKCkpO1xuICAgICAgICB9XG4gICAgICAgIGRlc3Qua28gPSB0aGlzLmtvO1xuICAgICAgICBkZXN0LnR1cm4gPSB0aGlzLnR1cm47XG4gICAgICAgIGRlc3QubW92ZU51bWJlciA9IHRoaXMubW92ZU51bWJlcjtcbiAgICAgICAgZGVzdC5yZW1vdmVDbnQgPSB0aGlzLnJlbW92ZUNudDtcbiAgICAgICAgZGVzdC5oaXN0b3J5ID0gQXJyYXkuZnJvbSh0aGlzLmhpc3RvcnkpO1xuICAgIH1cblxuICAgIC8qKlxuICAgICAqIOaLoeW8tee3muW9ouW6p+aomeOBrumFjeWIl+OCkuWPl+OBkeWPluOBo+OBpumghuOBq+edgOaJi+OBl+OBvuOBmeOAglxuICAgICAqIEBwYXJhbSB7VWluMTZbXX0gc2VxdWVuY2UgXG4gICAgICovXG4gICAgcGxheVNlcXVlbmNlKHNlcXVlbmNlKSB7XG4gICAgICAgIGZvciAoY29uc3QgdiBvZiBzZXF1ZW5jZSkge1xuICAgICAgICAgICAgdGhpcy5wbGF5KHYpO1xuICAgICAgICB9XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICog5Lqk54K544Gr44GC44KL55+z44KS5ZCr44KA6YCj44KS55uk5LiK44GL44KJ5omT44Gh5LiK44GS44G+44GZ44CCXG4gICAgICogQHBhcmFtIHtVaW50MTZ9IHYg5ouh5by157ea5b2i5bqn5qiZXG4gICAgICovXG4gICAgcmVtb3ZlKHYpIHtcbiAgICAgICAgbGV0IHZUbXAgPSB2O1xuICAgICAgICB3aGlsZSAodHJ1ZSkge1xuICAgICAgICAgICAgdGhpcy5yZW1vdmVDbnQgKz0gMTtcbiAgICAgICAgICAgIHRoaXMuc3RhdGVbdlRtcF0gPSB0aGlzLkMuRU1QVFk7XG4gICAgICAgICAgICB0aGlzLmlkW3ZUbXBdID0gdlRtcDtcbiAgICAgICAgICAgIGZvciAoY29uc3QgbnYgb2YgdGhpcy5DLm5laWdoYm9ycyh2VG1wKSkge1xuICAgICAgICAgICAgICAgIHRoaXMuc2dbdGhpcy5pZFtudl1dLmFkZCh2VG1wKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIGNvbnN0IHZOZXh0ID0gdGhpcy5uZXh0W3ZUbXBdO1xuICAgICAgICAgICAgdGhpcy5uZXh0W3ZUbXBdID0gdlRtcDtcbiAgICAgICAgICAgIHZUbXAgPSB2TmV4dDtcbiAgICAgICAgICAgIGlmICh2VG1wID09PSB2KSB7XG4gICAgICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiDkuqTngrnjgavjgYLjgovnn7Pjga7pgKPjgpLntZDlkIjjgZfjgb7jgZnjgIJcbiAgICAgKiBAcGFyYW0ge1VpbnQxNn0gdjEg5ouh5by157ea5b2i5bqn5qiZXG4gICAgICogQHBhcmFtIHtVaW50MTZ9IHYyIOaLoeW8tee3muW9ouW6p+aomVxuICAgICAqL1xuICAgIG1lcmdlKHYxLCB2Mikge1xuICAgICAgICBsZXQgaWRCYXNlID0gdGhpcy5pZFt2MV07XG4gICAgICAgIGxldCBpZEFkZCA9IHRoaXMuaWRbdjJdO1xuICAgICAgICBpZiAodGhpcy5zZ1tpZEJhc2VdLmdldFNpemUoKSA8IHRoaXMuc2dbaWRBZGRdLmdldFNpemUoKSkge1xuICAgICAgICAgICAgbGV0IHRtcCA9IGlkQmFzZTtcbiAgICAgICAgICAgIGlkQmFzZSA9IGlkQWRkO1xuICAgICAgICAgICAgaWRBZGQgPSB0bXA7XG4gICAgICAgIH1cblxuICAgICAgICB0aGlzLnNnW2lkQmFzZV0ubWVyZ2UodGhpcy5zZ1tpZEFkZF0pO1xuXG4gICAgICAgIGxldCB2VG1wID0gaWRBZGQ7XG4gICAgICAgIGRvIHtcbiAgICAgICAgICAgIHRoaXMuaWRbdlRtcF0gPSBpZEJhc2U7XG4gICAgICAgICAgICB2VG1wID0gdGhpcy5uZXh0W3ZUbXBdO1xuICAgICAgICB9IHdoaWxlICh2VG1wICE9PSBpZEFkZCk7XG4gICAgICAgIGNvbnN0IHRtcCA9IHRoaXMubmV4dFt2MV07XG4gICAgICAgIHRoaXMubmV4dFt2MV0gPSB0aGlzLm5leHRbdjJdO1xuICAgICAgICB0aGlzLm5leHRbdjJdID0gdG1wO1xuICAgIH1cblxuICAgIC8qKlxuICAgICAqIOS6pOeCuXbjgavnnYDmiYvjgZnjgovjg5jjg6vjg5Hjg7zjg6Hjgr3jg4Pjg4njgafjgZnjgIJcbiAgICAgKiDnnYDmiYvjgavjga9wbGF544Oh44K944OD44OJ44KS5L2/44Gj44Gm44GP44Gg44GV44GE44CCXG4gICAgICogQHByaXZhdGVcbiAgICAgKiBAcGFyYW0ge1VpbnQxNn0gdiDmi6HlvLXnt5rlvaLluqfmqJlcbiAgICAgKi9cbiAgICBwbGFjZVN0b25lKHYpIHtcbiAgICAgICAgY29uc3Qgc3RvbmVDb2xvciA9IHRoaXMudHVybjtcbiAgICAgICAgdGhpcy5zdGF0ZVt2XSA9IHN0b25lQ29sb3I7XG4gICAgICAgIHRoaXMuaWRbdl0gPSB2O1xuICAgICAgICB0aGlzLnNnW3RoaXMuaWRbdl1dLmNsZWFyKHRydWUpO1xuICAgICAgICBmb3IgKGNvbnN0IG52IG9mIHRoaXMuQy5uZWlnaGJvcnModikpIHtcbiAgICAgICAgICAgIGlmICh0aGlzLnN0YXRlW252XSA9PT0gdGhpcy5DLkVNUFRZKSB7XG4gICAgICAgICAgICAgICAgdGhpcy5zZ1t0aGlzLmlkW3ZdXS5hZGQobnYpO1xuICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICB0aGlzLnNnW3RoaXMuaWRbbnZdXS5zdWIodik7XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgICAgZm9yIChjb25zdCBudiBvZiB0aGlzLkMubmVpZ2hib3JzKHYpKSB7XG4gICAgICAgICAgICBpZiAodGhpcy5zdGF0ZVtudl0gPT09IHN0b25lQ29sb3IgJiYgdGhpcy5pZFtudl0gIT09IHRoaXMuaWRbdl0pIHtcbiAgICAgICAgICAgICAgICB0aGlzLm1lcmdlKHYsIG52KTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgICB0aGlzLnJlbW92ZUNudCA9IDA7XG4gICAgICAgIGNvbnN0IG9wcG9uZW50U3RvbmUgPSB0aGlzLkMub3Bwb25lbnRPZih0aGlzLnR1cm4pO1xuICAgICAgICBmb3IgKGNvbnN0IG52IG9mIHRoaXMuQy5uZWlnaGJvcnModikpIHtcbiAgICAgICAgICAgIGlmICh0aGlzLnN0YXRlW252XSA9PT0gb3Bwb25lbnRTdG9uZSAmJiB0aGlzLnNnW3RoaXMuaWRbbnZdXS5nZXRMaWJDbnQoKSA9PT0gMCkge1xuICAgICAgICAgICAgICAgIHRoaXMucmVtb3ZlKG52KTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgIH1cblxuICAgIC8qKlxuICAgICAqIOS6pOeCueOBjOedgOaJi+emgeatouOBp+OBquOBhOOBi+OCkui/lOOBl+OBvuOBmeOAglxuICAgICAqIOefs+OBjOaXouOBq+WtmOWcqOOBmeOCi+S6pOeCueOAgeOCs+OCpuOBq+OCiOOCi+emgeatouOAgeiHquauuuaJi+OBjOedgOaJi+emgeatoueCueOBp+OBmeOAglxuICAgICAqIEBwYXJhbSB7Kn0gdiDmi6HlvLXnt5rlvaLluqfmqJlcbiAgICAgKiBAcmV0dXJucyB7Ym9vbH0gXG4gICAgICovXG4gICAgbGVnYWwodikge1xuICAgICAgICBpZiAodiA9PT0gdGhpcy5DLlBBU1MpIHtcbiAgICAgICAgICAgIHJldHVybiB0cnVlO1xuICAgICAgICB9IGVsc2UgaWYgKHYgPT09IHRoaXMua28gfHwgdGhpcy5zdGF0ZVt2XSAhPT0gdGhpcy5DLkVNUFRZKSB7XG4gICAgICAgICAgICByZXR1cm4gZmFsc2U7XG4gICAgICAgIH1cblxuICAgICAgICBjb25zdCBzdG9uZUNudCA9IFswLCAwXTtcbiAgICAgICAgY29uc3QgYXRyQ250ID0gWzAsIDBdO1xuICAgICAgICBmb3IgKGNvbnN0IG52IG9mIHRoaXMuQy5uZWlnaGJvcnModikpIHtcbiAgICAgICAgICAgIGNvbnN0IGMgPSB0aGlzLnN0YXRlW252XTtcbiAgICAgICAgICAgIHN3aXRjaCAoYykge1xuICAgICAgICAgICAgICAgIGNhc2UgdGhpcy5DLkVNUFRZOlxuICAgICAgICAgICAgICAgICAgICByZXR1cm4gdHJ1ZTtcbiAgICAgICAgICAgICAgICBjYXNlIHRoaXMuQy5CTEFDSzpcbiAgICAgICAgICAgICAgICBjYXNlIHRoaXMuQy5XSElURTpcbiAgICAgICAgICAgICAgICAgICAgc3RvbmVDbnRbY10gKz0gMTtcbiAgICAgICAgICAgICAgICAgICAgaWYgKHRoaXMuc2dbdGhpcy5pZFtudl1dLmdldExpYkNudCgpID09PSAxKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICBhdHJDbnRbY10gKz0gMTtcbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICAgIHJldHVybiBhdHJDbnRbdGhpcy5DLm9wcG9uZW50T2YodGhpcy50dXJuKV0gIT09IDAgfHwgYXRyQ250W3RoaXMudHVybl0gPCBzdG9uZUNudFt0aGlzLnR1cm5dO1xuICAgIH1cblxuICAgIC8qKlxuICAgICAqIOS6pOeCuXbjgYzjgYzjgpPlvaLjgYvjganjgYbjgYvjgpLov5TjgZfjgb7jgZnjgIJcbiAgICAgKiBAcHJpdmF0ZVxuICAgICAqIEBwYXJhbSB7VWludDE2fSB2IFxuICAgICAqIEBwYXJhbSB7bnVtYmVyfSBwbCBwbGF5ZXIgY29sb3JcbiAgICAgKi9cbiAgICBleWVzaGFwZSh2LCBwbCkge1xuICAgICAgICBpZiAodiA9PT0gdGhpcy5DLlBBU1MpIHtcbiAgICAgICAgICAgIHJldHVybiBmYWxzZTtcbiAgICAgICAgfVxuICAgICAgICBmb3IgKGNvbnN0IG52IG9mIHRoaXMuQy5uZWlnaGJvcnModikpIHtcbiAgICAgICAgICAgIGNvbnN0IGMgPSB0aGlzLnN0YXRlW252XTtcbiAgICAgICAgICAgIGlmIChjID09PSB0aGlzLkMuRU1QVFkgfHwgYyA9PT0gdGhpcy5DLm9wcG9uZW50T2YocGwpKSB7XG4gICAgICAgICAgICAgICAgcmV0dXJuIGZhbHNlO1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICAgIGNvbnN0IGRpYWdDbnQgPSBbMCwgMCwgMCwgMF07XG4gICAgICAgIGZvciAoY29uc3QgbnYgb2YgdGhpcy5DLmRpYWdvbmFscyh2KSkge1xuICAgICAgICAgICAgZGlhZ0NudFt0aGlzLnN0YXRlW252XV0gKz0gMTtcbiAgICAgICAgfVxuICAgICAgICBjb25zdCB3ZWRnZUNudCA9IGRpYWdDbnRbdGhpcy5DLm9wcG9uZW50T2YocGwpXSArIChkaWFnQ250WzNdID4gMCA/IDEgOiAwKTtcbiAgICAgICAgaWYgKHdlZGdlQ250ID09PSAyKSB7XG4gICAgICAgICAgICBmb3IgKGNvbnN0IG52IG9mIHRoaXMuQy5kaWFnb25hbHModikpIHtcbiAgICAgICAgICAgICAgICBpZiAodGhpcy5zdGF0ZVtudl0gPT09IHRoaXMuQy5vcHBvbmVudE9mKHBsKSAmJiB0aGlzLnNnW3RoaXMuaWRbbnZdXS5nZXRMaWJDbnQoKSA9PT0gMSAmJiB0aGlzLnNnW3RoaXMuaWRbbnZdXS5nZXRWQXRyKCkgIT09IHRoaXMua28pIHtcbiAgICAgICAgICAgICAgICAgICAgcmV0dXJuIHRydWU7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICAgIHJldHVybiB3ZWRnZUNudCA8IDI7XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICog5Lqk54K5duOBq+edgOaJi+OBl+OBvuOBmeOAglxuICAgICAqIEBwYXJhbSB7Kn0gdiDmi6HlvLXnt5rlvaLluqfmqJlcbiAgICAgKiBAcGFyYW0geyp9IG5vdEZpbGxFeWUg55y844KS5r2w44GZ44GT44Go44KS6Kix5Y+v44GX44Gq44GEXG4gICAgICovXG4gICAgcGxheSh2LCBub3RGaWxsRXllID0gZmFsc2UpIHtcbiAgICAgICAgaWYgKCF0aGlzLmxlZ2FsKHYpKSB7XG4gICAgICAgICAgICByZXR1cm4gZmFsc2U7XG4gICAgICAgIH1cbiAgICAgICAgaWYgKG5vdEZpbGxFeWUgJiYgdGhpcy5leWVzaGFwZSh2LCB0aGlzLnR1cm4pKSB7XG4gICAgICAgICAgICByZXR1cm4gZmFsc2U7XG4gICAgICAgIH1cbiAgICAgICAgZm9yIChsZXQgaSA9IEtFRVBfUFJFVl9DTlQgLSAyOyBpID49IDA7IGktLSkge1xuICAgICAgICAgICAgdGhpcy5wcmV2U3RhdGVbaSArIDFdID0gdGhpcy5wcmV2U3RhdGVbaV07XG4gICAgICAgIH1cbiAgICAgICAgdGhpcy5wcmV2U3RhdGVbMF0gPSB0aGlzLnN0YXRlLnNsaWNlKCk7XG4gICAgICAgIGlmICh2ID09PSB0aGlzLkMuUEFTUykge1xuICAgICAgICAgICAgdGhpcy5rbyA9IHRoaXMuQy5WTlVMTDtcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIHRoaXMucGxhY2VTdG9uZSh2KTtcbiAgICAgICAgICAgIGNvbnN0IGlkID0gdGhpcy5pZFt2XTtcbiAgICAgICAgICAgIHRoaXMua28gPSB0aGlzLkMuVk5VTEw7XG4gICAgICAgICAgICBpZiAodGhpcy5yZW1vdmVDbnQgPT09IDEgJiYgdGhpcy5zZ1tpZF0uZ2V0TGliQ250KCkgPT09IDEgJiYgdGhpcy5zZ1tpZF0uZ2V0U2l6ZSgpID09PSAxKSB7XG4gICAgICAgICAgICAgICAgdGhpcy5rbyA9IHRoaXMuc2dbaWRdLmdldFZBdHIoKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgICB0aGlzLnByZXZNb3ZlID0gdjtcbiAgICAgICAgdGhpcy5oaXN0b3J5LnB1c2godik7XG4gICAgICAgIHRoaXMudHVybiA9IHRoaXMuQy5vcHBvbmVudE9mKHRoaXMudHVybik7XG4gICAgICAgIHRoaXMubW92ZU51bWJlciArPSAxO1xuICAgICAgICByZXR1cm4gdHJ1ZTtcbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiDnnLzlvaLjgpLmvbDjgZXjgarjgYTjgojjgYbjgavjg6njg7Pjg4Djg6DjgavnnYDmiYvjgZfjgb7jgZnjgIJcbiAgICAgKi9cbiAgICByYW5kb21QbGF5KCkge1xuICAgICAgICBjb25zdCBlbXB0eUxpc3QgPSBbXTtcbiAgICAgICAgZm9yIChsZXQgaSA9IDA7IGkgPCB0aGlzLnN0YXRlLmxlbmd0aDsgaSsrKSB7XG4gICAgICAgICAgICBpZiAodGhpcy5zdGF0ZVtpXSA9PT0gdGhpcy5DLkVNUFRZKSB7XG4gICAgICAgICAgICAgICAgZW1wdHlMaXN0LnB1c2goaSk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgICAgKDAsIF91dGlscy5zaHVmZmxlKShlbXB0eUxpc3QpO1xuICAgICAgICBmb3IgKGNvbnN0IHYgb2YgZW1wdHlMaXN0KSB7XG4gICAgICAgICAgICBpZiAodGhpcy5wbGF5KHYsIHRydWUpKSB7XG4gICAgICAgICAgICAgICAgcmV0dXJuIHY7XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgICAgdGhpcy5wbGF5KHRoaXMuQy5QQVNTLCB0cnVlKTtcbiAgICAgICAgcmV0dXJuIHRoaXMuQy5QQVNTO1xuICAgIH1cblxuICAgIC8qKlxuICAgICAqIOOCueOCs+OCouW3ruOCkui/lOOBl+OBvuOBmeOAglxuICAgICAqIOWQjOOBmOiJsuOBruefs+OBruaVsOOBqOS4gOaWueOBruefs+OBq+OBoOOBkemao+aOpeOBmeOCi+S6pOeCueOBruaVsOOBjOOBneOBruiJsuOBruOCueOCs+OCouOBqOOBhOOBhuewoeaYk+ODq+ODvOODq+OBp+OBmeOAglxuICAgICAqIChyYW5kb21QbGF544KS5a6f6KGM44GX44Gf5b6M44Gn44Gv5Lit5Zu944Or44O844Or44Go5ZCM44GY5YCk44Gr44Gq44KK44G+44GZKVxuICAgICAqL1xuICAgIHNjb3JlKCkge1xuICAgICAgICBjb25zdCBzdG9uZUNudCA9IFswLCAwXTtcbiAgICAgICAgZm9yIChsZXQgdiA9IDA7IHYgPCB0aGlzLkMuRUJWQ05UOyB2KyspIHtcbiAgICAgICAgICAgIGNvbnN0IHMgPSB0aGlzLnN0YXRlW3ZdO1xuICAgICAgICAgICAgaWYgKHMgPT09IHRoaXMuQy5CTEFDSyB8fCBzID09PSB0aGlzLkMuV0hJVEUpIHtcbiAgICAgICAgICAgICAgICBzdG9uZUNudFtzXSArPSAxO1xuICAgICAgICAgICAgfSBlbHNlIGlmIChzID09PSB0aGlzLkMuRU1QVFkpIHtcbiAgICAgICAgICAgICAgICBjb25zdCBuYnJDbnQgPSBbMCwgMCwgMCwgMF07XG4gICAgICAgICAgICAgICAgZm9yIChjb25zdCBudiBvZiB0aGlzLkMubmVpZ2hib3JzKHYpKSB7XG4gICAgICAgICAgICAgICAgICAgIG5ickNudFt0aGlzLnN0YXRlW252XV0gKz0gMTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgaWYgKG5ickNudFt0aGlzLkMuV0hJVEVdID4gMCAmJiBuYnJDbnRbdGhpcy5DLkJMQUNLXSA9PT0gMCkge1xuICAgICAgICAgICAgICAgICAgICBzdG9uZUNudFt0aGlzLkMuV0hJVEVdICs9IDE7XG4gICAgICAgICAgICAgICAgfSBlbHNlIGlmIChuYnJDbnRbdGhpcy5DLkJMQUNLXSA+IDAgJiYgbmJyQ250W3RoaXMuQy5XSElURV0gPT09IDApIHtcbiAgICAgICAgICAgICAgICAgICAgc3RvbmVDbnRbdGhpcy5DLkJMQUNLXSArPSAxO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgICByZXR1cm4gc3RvbmVDbnRbMV0gLSBzdG9uZUNudFswXSAtIHRoaXMua29taTtcbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiDnnLzku6XlpJbnnYDmiYvlj6/og73jgarkuqTngrnjgYzjgarjgY/jgarjgovjgb7jgafjg6njg7Pjg4Djg6DjgavnnYDmiYvjgZfjgb7jgZnjgIJcbiAgICAgKiBzaG93Qm9hcmTjgYx0cnVl44Gu44Go44GN57WC5bGAXG4gICAgICogQHBhcmFtIHtib29sfX0gc2hvd0JvYXJkIFxuICAgICAqL1xuICAgIHJvbGxvdXQoc2hvd0JvYXJkKSB7XG4gICAgICAgIHdoaWxlICh0aGlzLm1vdmVOdW1iZXIgPCB0aGlzLkMuRUJWQ05UICogMikge1xuICAgICAgICAgICAgY29uc3QgcHJldk1vdmUgPSB0aGlzLnByZXZNb3ZlO1xuICAgICAgICAgICAgY29uc3QgbW92ZSA9IHRoaXMucmFuZG9tUGxheSgpO1xuICAgICAgICAgICAgaWYgKHNob3dCb2FyZCAmJiBtb3ZlICE9PSB0aGlzLkMuUEFTUykge1xuICAgICAgICAgICAgICAgIGNvbnNvbGUubG9nKCdcXG5tb3ZlIGNvdW50PSVkJywgdGhpcy5tb3ZlTnVtYmVyKTtcbiAgICAgICAgICAgICAgICB0aGlzLnNob3dib2FyZCgpO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgaWYgKHByZXZNb3ZlID09PSB0aGlzLkMuUEFTUyAmJiBtb3ZlID09PSB0aGlzLkMuUEFTUykge1xuICAgICAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICog56KB55uk44GueOi7uOODqeODmeODq+OCkuihqOekuuOBl+OBvuOBmeOAglxuICAgICAqIEBwcml2YXRlXG4gICAgICovXG4gICAgcHJpbnRYbGFiZWwoKSB7XG4gICAgICAgIGxldCBsaW5lU3RyID0gJyAgJztcbiAgICAgICAgZm9yIChsZXQgeCA9IDE7IHggPD0gdGhpcy5DLkJTSVpFOyB4KyspIHtcbiAgICAgICAgICAgIGxpbmVTdHIgKz0gYCAke3RoaXMuQy5YX0xBQkVMU1t4XX0gYDtcbiAgICAgICAgfVxuICAgICAgICBjb25zb2xlLmxvZyhsaW5lU3RyKTtcbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiDnooHnm6TjgpLjgrPjg7Pjgr3jg7zjg6vjgavlh7rlipvjgZfjgb7jgZnjgIJcbiAgICAgKi9cbiAgICBzaG93Ym9hcmQoKSB7XG4gICAgICAgIHRoaXMucHJpbnRYbGFiZWwoKTtcbiAgICAgICAgZm9yIChsZXQgeSA9IHRoaXMuQy5CU0laRTsgeSA+IDA7IHktLSkge1xuICAgICAgICAgICAgbGV0IGxpbmVTdHIgPSAoJyAnICsgeS50b1N0cmluZygpKS5zbGljZSgtMik7XG4gICAgICAgICAgICBmb3IgKGxldCB4ID0gMTsgeCA8PSB0aGlzLkMuQlNJWkU7IHgrKykge1xuICAgICAgICAgICAgICAgIGNvbnN0IHYgPSB0aGlzLkMueHkyZXYoeCwgeSk7XG4gICAgICAgICAgICAgICAgbGV0IHhTdHI7XG4gICAgICAgICAgICAgICAgc3dpdGNoICh0aGlzLnN0YXRlW3ZdKSB7XG4gICAgICAgICAgICAgICAgICAgIGNhc2UgdGhpcy5DLkJMQUNLOlxuICAgICAgICAgICAgICAgICAgICAgICAgeFN0ciA9IHYgPT09IHRoaXMucHJldk1vdmUgPyAnW1hdJyA6ICcgWCAnO1xuICAgICAgICAgICAgICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgICAgICAgICAgICAgIGNhc2UgdGhpcy5DLldISVRFOlxuICAgICAgICAgICAgICAgICAgICAgICAgeFN0ciA9IHYgPT09IHRoaXMucHJldk1vdmUgPyAnW09dJyA6ICcgTyAnO1xuICAgICAgICAgICAgICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgICAgICAgICAgICAgIGNhc2UgdGhpcy5DLkVNUFRZOlxuICAgICAgICAgICAgICAgICAgICAgICAgeFN0ciA9ICcgLiAnO1xuICAgICAgICAgICAgICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgICAgICAgICAgICAgIGRlZmF1bHQ6XG4gICAgICAgICAgICAgICAgICAgICAgICB4U3RyID0gJyA/ICc7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIGxpbmVTdHIgKz0geFN0cjtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIGxpbmVTdHIgKz0gKCcgJyArIHkudG9TdHJpbmcoKSkuc2xpY2UoLTIpO1xuICAgICAgICAgICAgY29uc29sZS5sb2cobGluZVN0cik7XG4gICAgICAgIH1cbiAgICAgICAgdGhpcy5wcmludFhsYWJlbCgpO1xuICAgICAgICBjb25zb2xlLmxvZygnJyk7XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICog44OL44Ol44O844Op44Or44ON44OD44OI44Ov44O844Kv44KS5L2/55So44GZ44KL6Zqb44Gu5YWl5Yqb44OV44Kj44O844OB44Oj44O844KS55Sf5oiQ44GX44G+44GZ44CCXG4gICAgICogQHBhcmFtIHtJbnRlZ2VyfSBzeW1tZXRyeVxuICAgICAqIEByZXR1cm5zIHtGbG9hdDMyQXJyYXl9XG4gICAgICovXG4gICAgZmVhdHVyZShzeW1tZXRyeSkge1xuICAgICAgICBjb25zdCBhcnJheSA9IG5ldyBGbG9hdDMyQXJyYXkodGhpcy5DLkJWQ05UICogRkVBVFVSRV9DTlQpO1xuICAgICAgICBjb25zdCBteSA9IHRoaXMudHVybjtcbiAgICAgICAgY29uc3Qgb3BwID0gdGhpcy5DLm9wcG9uZW50T2YodGhpcy50dXJuKTtcblxuICAgICAgICBjb25zdCBOID0gS0VFUF9QUkVWX0NOVCArIDE7XG4gICAgICAgIGZvciAobGV0IHAgPSAwOyBwIDwgdGhpcy5DLkJWQ05UOyBwKyspIHtcbiAgICAgICAgICAgIGFycmF5W2ZlYXR1cmVJbmRleCh0aGlzLkMuZ2V0U3ltbWV0cmljUmF3VmVydGV4KHAsIHN5bW1ldHJ5KSwgMCldID0gdGhpcy5zdGF0ZVt0aGlzLkMucnYyZXYocCldID09PSBteSA/IDEuMCA6IDAuMDtcbiAgICAgICAgfVxuICAgICAgICBmb3IgKGxldCBwID0gMDsgcCA8IHRoaXMuQy5CVkNOVDsgcCsrKSB7XG4gICAgICAgICAgICBhcnJheVtmZWF0dXJlSW5kZXgodGhpcy5DLmdldFN5bW1ldHJpY1Jhd1ZlcnRleChwLCBzeW1tZXRyeSksIE4pXSA9IHRoaXMuc3RhdGVbdGhpcy5DLnJ2MmV2KHApXSA9PT0gb3BwID8gMS4wIDogMC4wO1xuICAgICAgICB9XG4gICAgICAgIGZvciAobGV0IGkgPSAwOyBpIDwgS0VFUF9QUkVWX0NOVDsgaSsrKSB7XG4gICAgICAgICAgICBmb3IgKGxldCBwID0gMDsgcCA8IHRoaXMuQy5CVkNOVDsgcCsrKSB7XG4gICAgICAgICAgICAgICAgYXJyYXlbZmVhdHVyZUluZGV4KHRoaXMuQy5nZXRTeW1tZXRyaWNSYXdWZXJ0ZXgocCwgc3ltbWV0cnkpLCBpICsgMSldID0gdGhpcy5wcmV2U3RhdGVbaV1bdGhpcy5DLnJ2MmV2KHApXSA9PT0gbXkgPyAxLjAgOiAwLjA7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBmb3IgKGxldCBwID0gMDsgcCA8IHRoaXMuQy5CVkNOVDsgcCsrKSB7XG4gICAgICAgICAgICAgICAgYXJyYXlbZmVhdHVyZUluZGV4KHRoaXMuQy5nZXRTeW1tZXRyaWNSYXdWZXJ0ZXgocCwgc3ltbWV0cnkpLCBOICsgaSArIDEpXSA9IHRoaXMucHJldlN0YXRlW2ldW3RoaXMuQy5ydjJldihwKV0gPT09IG9wcCA/IDEuMCA6IDAuMDtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgICBsZXQgaXNfYmxhY2tfdHVybiwgaXNfd2hpdGVfdHVybjtcbiAgICAgICAgaWYgKG15ID09PSB0aGlzLkMuQkxBQ0spIHtcbiAgICAgICAgICAgIGlzX2JsYWNrX3R1cm4gPSAxLjA7XG4gICAgICAgICAgICBpc193aGl0ZV90dXJuID0gMC4wO1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgaXNfYmxhY2tfdHVybiA9IDAuMDtcbiAgICAgICAgICAgIGlzX3doaXRlX3R1cm4gPSAxLjA7XG4gICAgICAgIH1cbiAgICAgICAgZm9yIChsZXQgcCA9IDA7IHAgPCB0aGlzLkMuQlZDTlQ7IHArKykge1xuICAgICAgICAgICAgYXJyYXlbZmVhdHVyZUluZGV4KHAsIEZFQVRVUkVfQ05UIC0gMildID0gaXNfYmxhY2tfdHVybjtcbiAgICAgICAgICAgIGFycmF5W2ZlYXR1cmVJbmRleChwLCBGRUFUVVJFX0NOVCAtIDEpXSA9IGlzX3doaXRlX3R1cm47XG4gICAgICAgIH1cbiAgICAgICAgcmV0dXJuIGFycmF5O1xuICAgIH1cblxuICAgIC8qKlxuICAgICAqIOePvuWcqOOBruWxgOmdouOBruODj+ODg+OCt+ODpeWApOOCkui/lOOBl+OBvuOBmeOAglxuICAgICAqICjms6gp5omL5pWw5oOF5aCx44Gv5ZCr44G/44G+44Gb44KT44CC44Gq44Gu44Gn5q+U6LyD44Gr44Gv44OP44OD44K344Ol5YCk44Go5omL5pWw5Lih5pa544KS5L2/44GE44G+44GZ44CCXG4gICAgICovXG4gICAgaGFzaCgpIHtcbiAgICAgICAgcmV0dXJuICgwLCBfdXRpbHMuaGFzaCkoKHRoaXMuc3RhdGUudG9TdHJpbmcoKSArIHRoaXMucHJldlN0YXRlWzBdLnRvU3RyaW5nKCkgKyB0aGlzLnR1cm4udG9TdHJpbmcoKSkucmVwbGFjZSgnLCcsICcnKSk7XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogQHR5cGVkZWYge09iamVjdH0gQ2FuZGlkYXRlc1xuICAgICAqIEBwcm9wZXJ0eSB7bnVtYmVyfSBoYXNoIFxuICAgICAqIEBwcm9wZXJ0eSB7SW50ZWdlcn0gbW92ZUNudFxuICAgICAqIEBwcm9wZXJ0eSB7SW50ZWdlcltdfSBsaXN0IOedgOaJi+WPr+iDveOBquS6pOeCuee3muW9ouW6p+aomSjmi6HlvLXnt5rlvaLluqfmqJnjgafjga/jgYLjgorjgb7jgZvjgpMpXG4gICAgICog552A5omL5Y+v6IO944Gq5Lqk54K544Gu5oOF5aCx44KS6L+U44GX44G+44GZ44CCXG4gICAgICogQHJldHVybnMge29iamVjdH0geyBoYXNoOiDjg4/jg4Pjgrfjg6XlgKQsIG1vdmVOdW1iZXI6IOaJi+aVsCwgbGlzdDog5YCZ6KOc5omL6YWN5YiXIH1cbiAgICAgKi9cbiAgICBjYW5kaWRhdGVzKCkge1xuICAgICAgICBjb25zdCBjYW5kTGlzdCA9IFtdO1xuICAgICAgICBmb3IgKGxldCB2ID0gMDsgdiA8IHRoaXMuc3RhdGUubGVuZ3RoOyB2KyspIHtcbiAgICAgICAgICAgIGlmICh0aGlzLmxlZ2FsKHYpKSB7XG4gICAgICAgICAgICAgICAgY2FuZExpc3QucHVzaCh0aGlzLkMuZXYycnYodikpO1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICAgIGNhbmRMaXN0LnB1c2godGhpcy5DLmV2MnJ2KHRoaXMuQy5QQVNTKSk7XG4gICAgICAgIHJldHVybiB7XG4gICAgICAgICAgICBoYXNoOiB0aGlzLmhhc2goKSxcbiAgICAgICAgICAgIG1vdmVOdW1iZXI6IHRoaXMubW92ZU51bWJlcixcbiAgICAgICAgICAgIGxpc3Q6IGNhbmRMaXN0XG4gICAgICAgIH07XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICog57Wx6KiI55qE5omL5rOV44Gn5pW05Zyw44GX44Gf57WQ5p6c44KS6L+U44GX44G+44GZ44CCXG4gICAgICogQHByaXZhdGVcbiAgICAgKi9cbiAgICBmaW5hbFNjb3JlKCkge1xuICAgICAgICBjb25zdCBST0xMX09VVF9OVU0gPSAyNTY7XG4gICAgICAgIGNvbnN0IGRvdWJsZVNjb3JlTGlzdCA9IFtdO1xuICAgICAgICBsZXQgYkNweSA9IG5ldyBCb2FyZCh0aGlzLkMsIHRoaXMua29taSk7XG4gICAgICAgIGZvciAobGV0IGkgPSAwOyBpIDwgUk9MTF9PVVRfTlVNOyBpKyspIHtcbiAgICAgICAgICAgIHRoaXMuY29weVRvKGJDcHkpO1xuICAgICAgICAgICAgYkNweS5yb2xsb3V0KGZhbHNlKTtcbiAgICAgICAgICAgIGRvdWJsZVNjb3JlTGlzdC5wdXNoKGJDcHkuc2NvcmUoKSk7XG4gICAgICAgIH1cbiAgICAgICAgcmV0dXJuICgwLCBfdXRpbHMubW9zdENvbW1vbikoZG91YmxlU2NvcmVMaXN0KTtcbiAgICB9XG59XG5leHBvcnRzLkJvYXJkID0gQm9hcmQ7IiwiJ3VzZSBzdHJpY3QnO1xuXG5PYmplY3QuZGVmaW5lUHJvcGVydHkoZXhwb3J0cywgXCJfX2VzTW9kdWxlXCIsIHtcbiAgICB2YWx1ZTogdHJ1ZVxufSk7XG4vKipcbiAqIEBmaWxlIOeigeebpOOBruWumuaVsOOCr+ODqeOCueOBp+OBmVxuICovXG4vKlxuICogQGF1dGhvciDluILlt53pm4TkuowgXG4gKiBAY29weXJpZ2h0IDIwMTggSUNISUtBV0EsIFl1amkgKE5ldyAzIFJzKVxuICogQGxpY2Vuc2UgTUlUXG4gKi9cblxuLy8g5bqn5qiZ5aSJ5o+b55So5a6a5pWw44Gn44GZ44CCXG5jb25zdCBPRkZTRVQgPSAnYScuY2hhckNvZGVBdCgwKSAtIDE7XG5cbi8qKlxuICog56KB55uk5a6a5pWw44Go5bqn5qiZ5aSJ5o+b44Gu44Kv44Op44K544Gn44GZ44CCPGJyPlxuICog56KB55uk44Kv44Op44K544Gn44Gv5bqn5qiZ57O744Gr5ouh5by157ea5b2i5bqn5qiZ44KS5L2/44GE44G+44GZ44CCXG4gKiDmi6HlvLXnt5rlvaLluqfmqJnjga/nm6TlpJbjga7kuqTngrnjgpLmjIHjgaTnooHnm6Tjga7luqfmqJnjgafjgZnjgIJcbiAqIOWbm+i3r+ebpOOBruWgtOWQiOOAgeS7peS4i+OBruOCiOOBhuOBquani+mAoOOBq+OBquOCiuOBvuOBmeOAglxuICogPHByZSBzdHlsZT1cImZvbnQtZmFtaWx5OiBDb3VyaWVyO1wiPlxuICogICAgICMjIyMjIyAj44GM55uk5aSWKOWun+mam+OBruWApOOBr0VYVEVSSU9SKVxuICogICAgICMuLi4uIyAu44Gv55uk5LiK5Lqk54K5KOWun+mam+OBruWApOOBr0VNUFRZKVxuICogICAgICMuLi4uI1xuICogICAgICMuLi4uI1xuICogICAgICMuLi4uI1xuICogICAgICMjIyMjI1xuICogPC9wcmU+XG4gKiDlt6bkuIvjgYvjgokwLeOCquODquOCuOODs+OBp+aVsOOBiOOBvuOBmeOAguWbm+i3r+ebpOOBruWgtOWQiOOAgVxuICogPHByZSBzdHlsZT1cImZvbnQtZmFtaWx5OiBDb3VyaWVyO1wiPlxuICogICAgIDMwIDMxIDMyIDMzIDM0IDM1XG4gKiAgICAgMjQgMjUgMjYgMjcgMjggMjlcbiAqICAgICAxOCAxOSAyMCAyMSAyMiAyM1xuICogICAgIDEyIDEzIDE0IDE1IDE2IDE3XG4gKiAgICAgIDYgIDcgIDggIDkgMTAgMTFcbiAqICAgICAgMCAgMSAgMiAgMyAgNCAgNVxuICogPC9wcmU+XG4gKiDnooHnm6Tjga7kuqTngrnjgpJ4eeW6p+aomeOBp+ihqOOBmeOBqOOBjeOCguW3puS4i+OBjOWOn+eCueOBp+OBmeOAguOBn+OBoOOBl3h55bqn5qiZ44Gu5aC05ZCI44CBMS3jgqrjg6rjgrjjg7PjgafjgZnjgIJcbiAqL1xuY2xhc3MgQm9hcmRDb25zdGFudHMge1xuICAgIGNvbnN0cnVjdG9yKHNpemUgPSAxOSkge1xuICAgICAgICB0aGlzLldISVRFID0gMDtcbiAgICAgICAgdGhpcy5CTEFDSyA9IDE7XG4gICAgICAgIHRoaXMuRU1QVFkgPSAyO1xuICAgICAgICB0aGlzLkVYVEVSSU9SID0gMztcbiAgICAgICAgdGhpcy5YX0xBQkVMUyA9ICdAQUJDREVGR0hKS0xNTk9QUVJTVCc7XG4gICAgICAgIHRoaXMuQlNJWkUgPSBzaXplOyAvLyDnooHnm6TjgrXjgqTjgrpcbiAgICAgICAgdGhpcy5FQlNJWkUgPSB0aGlzLkJTSVpFICsgMjsgLy8g5ouh5by156KB55uk44K144Kk44K6XG4gICAgICAgIHRoaXMuRUJWQ05UID0gdGhpcy5FQlNJWkUgKiB0aGlzLkVCU0laRTtcbiAgICAgICAgdGhpcy5QQVNTID0gdGhpcy5FQlZDTlQ7XG4gICAgICAgIHRoaXMuVk5VTEwgPSB0aGlzLkVCVkNOVCArIDE7XG4gICAgICAgIHRoaXMuQlZDTlQgPSB0aGlzLkJTSVpFICogdGhpcy5CU0laRTtcbiAgICAgICAgdGhpcy5zeW1tZXRyaWNSYXdWZXJ0ZXggPSBuZXcgVWludDE2QXJyYXkodGhpcy5CVkNOVCAqIDgpO1xuICAgICAgICB0aGlzLmluaXRpYWxpemVTeW1tZXRyaWNSYXdWZXJ0ZXgoKTtcbiAgICAgICAgT2JqZWN0LmZyZWV6ZSh0aGlzKTtcbiAgICB9XG5cbiAgICBvcHBvbmVudE9mKGNvbG9yKSB7XG4gICAgICAgIHN3aXRjaCAoY29sb3IpIHtcbiAgICAgICAgICAgIGNhc2UgdGhpcy5XSElURTpcbiAgICAgICAgICAgICAgICByZXR1cm4gdGhpcy5CTEFDSztcbiAgICAgICAgICAgIGNhc2UgdGhpcy5CTEFDSzpcbiAgICAgICAgICAgICAgICByZXR1cm4gdGhpcy5XSElURTtcbiAgICAgICAgICAgIGRlZmF1bHQ6XG4gICAgICAgICAgICAgICAgdGhyb3cgbmV3IEVycm9yKCdpbnZhbGlkIGNvbG9yJyk7XG4gICAgICAgIH1cbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBTR0bjg5Xjgqnjg7zjg57jg4Pjg4jjga7luqfmqJnjgpJ4eeW6p+aomeOBq+WkieaPm+OBl+OBvuOBmeOAglxuICAgICAqIEBwYXJhbSB7c3RyaW5nfSBzIFxuICAgICAqIEByZXR1cm5zIHtJbnRlZ2VyW119IHh55bqn5qiZXG4gICAgICovXG4gICAgbW92ZTJ4eShzKSB7XG4gICAgICAgIHJldHVybiBbcy5jaGFyQ29kZUF0KDApIC0gT0ZGU0VULCB0aGlzLkJTSVpFICsgMSAtIChzLmNoYXJDb2RlQXQoMSkgLSBPRkZTRVQpXTtcbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiDmi6HlvLXnt5rlvaLluqfmqJnjgpJ4eeW6p+aomeOBq+WkieaPm+OBl+OBvuOBmeOAglxuICAgICAqIEBwYXJhbSB7VWludDE2fSBldiBcbiAgICAgKiBAcmV0dXJucyB7SW50ZWdlcltdfSB4eeW6p+aomVxuICAgICAqL1xuICAgIGV2Mnh5KGV2KSB7XG4gICAgICAgIHJldHVybiBbZXYgJSB0aGlzLkVCU0laRSwgTWF0aC5mbG9vcihldiAvIHRoaXMuRUJTSVpFKV07XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogeHnluqfmqJnjgpLmi6HlvLXnt5rlvaLluqfmqJnjgavlpInmj5vjgZfjgb7jgZnjgIJcbiAgICAgKiBAcGFyYW0ge0ludGVnZXJ9IHggXG4gICAgICogQHBhcmFtIHtJbnRlZ2VyfSB5IFxuICAgICAqIEByZXR1cm5zIHtVaW50MTZ9IGV4dGVuZGVkIHZlcnRleFxuICAgICAqL1xuICAgIHh5MmV2KHgsIHkpIHtcbiAgICAgICAgcmV0dXJuIHkgKiB0aGlzLkVCU0laRSArIHg7XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICog57ea5b2i5bqn5qiZ44KS5ouh5by157ea5b2i5bqn5qiZ44Gr5aSJ5o+b44GX44G+44GZ44CCXG4gICAgICogQHBhcmFtIHtVaW50MTZ9IHJ2IHJhdyB2ZXJ0ZXhcbiAgICAgKiBAcmV0dXJucyB7VWludDE2fSBleHRlbmRlZCB2ZXJ0ZXhcbiAgICAgKi9cbiAgICBydjJldihydikge1xuICAgICAgICByZXR1cm4gcnYgPT09IHRoaXMuQlZDTlQgPyB0aGlzLlBBU1MgOiBydiAlIHRoaXMuQlNJWkUgKyAxICsgTWF0aC5mbG9vcihydiAvIHRoaXMuQlNJWkUgKyAxKSAqIHRoaXMuRUJTSVpFO1xuICAgIH1cblxuICAgIC8qKlxuICAgICAqIOaLoeW8tee3muW9ouW6p+aomeOCkue3muW9ouW6p+aomeOBq+WkieaPm+OBl+OBvuOBmeOAglxuICAgICAqIEBwYXJhbSB7VWludDE2fSBldlxuICAgICAqIEByZXR1cm5zIHtVaW50MTZ9IHJhdyB2ZXJ0ZXhcbiAgICAgKi9cbiAgICBldjJydihldikge1xuICAgICAgICByZXR1cm4gZXYgPT09IHRoaXMuUEFTUyA/IHRoaXMuQlZDTlQgOiBldiAlIHRoaXMuRUJTSVpFIC0gMSArIE1hdGguZmxvb3IoZXYgLyB0aGlzLkVCU0laRSAtIDEpICogdGhpcy5CU0laRTtcbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiDmi6HlvLXnt5rlvaLluqfmqJnjgpJHVFDjgYzkvb/nlKjjgZnjgovluqfmqJnjgavlpInmj5vjgZfjgb7jgZnjgIJcbiAgICAgKiBAcGFyYW0ge1VpbnQxNn0gZXZcbiAgICAgKiBAcmV0dXJucyB7c3RyaW5nfSBHVFDluqfmqJlcbiAgICAgKi9cbiAgICBldjJzdHIoZXYpIHtcbiAgICAgICAgaWYgKGV2ID49IHRoaXMuUEFTUykge1xuICAgICAgICAgICAgcmV0dXJuICdwYXNzJztcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIGNvbnN0IFt4LCB5XSA9IHRoaXMuZXYyeHkoZXYpO1xuICAgICAgICAgICAgcmV0dXJuIHRoaXMuWF9MQUJFTFMuY2hhckF0KHgpICsgeS50b1N0cmluZygpO1xuICAgICAgICB9XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogR1RQ44GM5L2/55So44GZ44KL5ouh5by157ea5b2i5bqn5qiZ44Gr5aSJ5o+b44GX44G+44GZ44CCXG4gICAgICogQHBhcmFtIHtzdHJpbmd9IHZcbiAgICAgKiBAcmV0dXJucyB7VWludDE2fSBleHRlbmRlZCB2ZXJ0ZXhcbiAgICAgKi9cbiAgICBzdHIyZXYodikge1xuICAgICAgICBjb25zdCB2U3RyID0gdi50b1VwcGVyQ2FzZSgpO1xuICAgICAgICBpZiAodlN0ciA9PT0gJ1BBU1MnIHx8IHZTdHIgPT09ICdSRVNJR04nKSB7XG4gICAgICAgICAgICByZXR1cm4gdGhpcy5QQVNTO1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgY29uc3QgeCA9IHRoaXMuWF9MQUJFTFMuaW5kZXhPZih2U3RyLmNoYXJBdCgwKSk7XG4gICAgICAgICAgICBjb25zdCB5ID0gcGFyc2VJbnQodlN0ci5zbGljZSgxKSk7XG4gICAgICAgICAgICByZXR1cm4gdGhpcy54eTJldih4LCB5KTtcbiAgICAgICAgfVxuICAgIH1cblxuICAgIC8qKlxuICAgICAqIHbjgavpmqPmjqXjgZnjgovkuqTngrnjga7luqfmqJnjgpLov5TjgZfjgb7jgZnjgIJcbiAgICAgKiBAcGFyYW0ge1VpbnQxNn19IHYg5ouh5by157ea5b2i5bqn5qiZXG4gICAgICovXG4gICAgbmVpZ2hib3JzKHYpIHtcbiAgICAgICAgcmV0dXJuIFt2ICsgMSwgdiArIHRoaXMuRUJTSVpFLCB2IC0gMSwgdiAtIHRoaXMuRUJTSVpFXTtcbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiB244Gr5pac44KB6Zqj5o6l44GZ44KL5Lqk54K544Gu5bqn5qiZ44KS6L+U44GX44G+44GZ44CCXG4gICAgICogQHBhcmFtIHtVaW50MTZ9fSB2IOaLoeW8tee3muW9ouW6p+aomVxuICAgICAqL1xuICAgIGRpYWdvbmFscyh2KSB7XG4gICAgICAgIHJldHVybiBbdiArIHRoaXMuRUJTSVpFICsgMSwgdiArIHRoaXMuRUJTSVpFIC0gMSwgdiAtIHRoaXMuRUJTSVpFIC0gMSwgdiAtIHRoaXMuRUJTSVpFICsgMV07XG4gICAgfVxuXG4gICAgaW5pdGlhbGl6ZVN5bW1ldHJpY1Jhd1ZlcnRleCgpIHtcbiAgICAgICAgZm9yIChsZXQgc3ltID0gMDsgc3ltIDwgODsgc3ltKyspIHtcbiAgICAgICAgICAgIGZvciAobGV0IHJ2ID0gMDsgcnYgPCB0aGlzLkJWQ05UOyBydisrKSB7XG4gICAgICAgICAgICAgICAgdGhpcy5zeW1tZXRyaWNSYXdWZXJ0ZXhbcnYgKiA4ICsgc3ltXSA9IHRoaXMuY2FsY1N5bW1ldHJpY1Jhd1ZlcnRleChydiwgc3ltKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgIH1cblxuICAgIC8qKlxuICAgICAqIOe3muW9ouW6p+aomeOBruWvvuensOWkieaPm+OCkui/lOOBl+OBvuOBmeOAglxuICAgICAqIEBwYXJhbSB7VWludDE2fSBydiDnt5rlvaLluqfmqJlcbiAgICAgKiBAcGFyYW0ge0ludGVnZXJ9IHN5bW1ldHJ5IOWvvuensOeVquWPt1xuICAgICAqIEByZXR1cm4ge1VpbnQxNn1cbiAgICAgKi9cbiAgICBnZXRTeW1tZXRyaWNSYXdWZXJ0ZXgocnYsIHN5bW1ldHJ5KSB7XG4gICAgICAgIHJldHVybiB0aGlzLnN5bW1ldHJpY1Jhd1ZlcnRleFtydiAqIDggKyBzeW1tZXRyeV07XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICog57ea5b2i5bqn5qiZ44Gu5a++56ew5aSJ5o+b44KS6KiI566X44GX44Gm6L+U44GX44G+44GZ44CCXG4gICAgICogQHBhcmFtIHtVaW50MTZ9IHJ2IOe3muW9ouW6p+aomVxuICAgICAqIEBwYXJhbSB7SW50ZWdlcn0gc3ltbWV0cnkg5a++56ew55Wq5Y+3XG4gICAgICovXG4gICAgY2FsY1N5bW1ldHJpY1Jhd1ZlcnRleChydiwgc3ltbWV0cnkpIHtcbiAgICAgICAgY29uc3QgY2VudGVyID0gKHRoaXMuQlNJWkUgLSAxKSAvIDI7XG4gICAgICAgIGxldCB4ID0gcnYgJSB0aGlzLkJTSVpFIC0gY2VudGVyO1xuICAgICAgICBsZXQgeSA9IE1hdGguZmxvb3IocnYgLyB0aGlzLkJTSVpFKSAtIGNlbnRlcjtcbiAgICAgICAgaWYgKHN5bW1ldHJ5ID49IDQpIHtcbiAgICAgICAgICAgIC8vIOmPoeWDj+WkieaPm1xuICAgICAgICAgICAgeCA9IC14O1xuICAgICAgICB9XG4gICAgICAgIGxldCB0bXA7XG4gICAgICAgIC8vIOWbnui7olxuICAgICAgICBzd2l0Y2ggKHN5bW1ldHJ5ICUgNCkge1xuICAgICAgICAgICAgY2FzZSAxOlxuICAgICAgICAgICAgICAgIHRtcCA9IHk7XG4gICAgICAgICAgICAgICAgeSA9IHg7XG4gICAgICAgICAgICAgICAgeCA9IC10bXA7XG4gICAgICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgICAgICBjYXNlIDI6XG4gICAgICAgICAgICAgICAgeCA9IC14O1xuICAgICAgICAgICAgICAgIHkgPSAteTtcbiAgICAgICAgICAgICAgICBicmVhaztcbiAgICAgICAgICAgIGNhc2UgMzpcbiAgICAgICAgICAgICAgICB0bXAgPSB5O1xuICAgICAgICAgICAgICAgIHkgPSAteDtcbiAgICAgICAgICAgICAgICB4ID0gdG1wO1xuICAgICAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICB9XG4gICAgICAgIHJldHVybiB4ICsgY2VudGVyICsgKHkgKyBjZW50ZXIpICogdGhpcy5CU0laRTtcbiAgICB9XG59XG5leHBvcnRzLkJvYXJkQ29uc3RhbnRzID0gQm9hcmRDb25zdGFudHM7IiwiJ3VzZSBzdHJpY3QnO1xuXG5PYmplY3QuZGVmaW5lUHJvcGVydHkoZXhwb3J0cywgXCJfX2VzTW9kdWxlXCIsIHtcbiAgICB2YWx1ZTogdHJ1ZVxufSk7XG5leHBvcnRzLk1DVFMgPSB1bmRlZmluZWQ7XG5cbnZhciBfdXRpbHMgPSByZXF1aXJlKCcuL3V0aWxzLmpzJyk7XG5cbnZhciBfYm9hcmQgPSByZXF1aXJlKCcuL2JvYXJkLmpzJyk7XG5cbi8qKlxuICogQGZpbGUg44Oi44Oz44OG44Kr44Or44Ot44OE44Oq44O85o6i57Si44Gu5a6f6KOF44Gn44GZ44CCXG4gKiDjgZPjga7jgrPjg7zjg4njga9QeWFx44Gu56e75qSN44Kz44O844OJ44Gn44GZ44CCXG4gKiBAc2VlIHtAbGluayBodHRwczovL2dpdGh1Yi5jb20veW1nYXEvUHlhcX1cbiAqL1xuLypcbiAqIEBhdXRob3Ig5biC5bed6ZuE5LqMXG4gKiBAY29weXJpZ2h0IDIwMTggSUNISUtBV0EsIFl1amkgKE5ldyAzIFJzKVxuICogQGxpY2Vuc2UgTUlUXG4gKi9cbmNvbnN0IE5PREVTX01BWF9MRU5HVEggPSAxNjM4NDtcbmNvbnN0IEVYUEFORF9DTlQgPSA4O1xuXG4vKiogTUNUU+OBruODjuODvOODieOCr+ODqeOCueOBp+OBmeOAgiAqL1xuY2xhc3MgTm9kZSB7XG4gICAgLyoqXG4gICAgICogTUNUU+OBruODjuODvOODieOCkueUn+aIkOOBl+OBvuOBmeOAglxuICAgICAqIEBwYXJhbSB7Qm9hcmRDb25zdGFudHN9IGNvbnN0YW50c1xuICAgICAqL1xuICAgIGNvbnN0cnVjdG9yKGNvbnN0YW50cykge1xuICAgICAgICB0aGlzLkMgPSBjb25zdGFudHM7XG4gICAgICAgIC8qKiDnnYDmiYvlgJnoo5zmlbDjgafjgZnjgIIo5ZCN5YmN44GuZWRnZeOBr+OCsOODqeODleeQhuirluOBruaeneOBruOBk+OBqOOBp+OBmeOAgikgKi9cbiAgICAgICAgdGhpcy5lZGdlTGVuZ3RoID0gMDtcbiAgICAgICAgLy/poLvnuYHjgarjg6Hjg6Ljg6rjgqLjg63jgrHjg7zjgrfjg6fjg7PjgpLpgb/jgZHjgovjgZ/jgoHjgIHmnp3mg4XloLHjgavlv4XopoHjgarmnIDlpKfjg6Hjg6Ljg6rjgpLkuojjgoHnorrkv53jgZfjgb7jgZnjgIJcbiAgICAgICAgLyoqIOODneODquOCt+ODvOeiuueOh+OBrumrmOOBhOmghuS4puOCk+OBoOedgOaJi+WAmeijnOOBp+OBmeOAgiAqL1xuICAgICAgICB0aGlzLm1vdmVzID0gbmV3IFVpbnQxNkFycmF5KHRoaXMuQy5CVkNOVCArIDEpO1xuICAgICAgICAvKiogbW92ZXPopoHntKDjgavlr77lv5zjgZnjgovjg53jg6rjgrfjg7znorrnjofjgafjgZnjgIIgKi9cbiAgICAgICAgdGhpcy5wcm9iYWJpbGl0aWVzID0gbmV3IEZsb2F0MzJBcnJheSh0aGlzLkMuQlZDTlQgKyAxKTtcbiAgICAgICAgLyoqIG1vdmVz6KaB57Sg44Gr5a++5b+c44GZ44KL44OQ44Oq44Ol44O844Gn44GZ44CC44Gf44Gg44GX44OO44O844OJ44Gu5omL55Wq44GL44KJ6KaL44Gm44Gu5YCk44Gn44GZ44CCICovXG4gICAgICAgIHRoaXMudmFsdWVzID0gbmV3IEZsb2F0MzJBcnJheSh0aGlzLkMuQlZDTlQgKyAxKTtcbiAgICAgICAgLyoqIG1vdmVz6KaB57Sg44Gr5a++5b+c44GZ44KL57eP44Ki44Kv44K344On44Oz44OQ44Oq44Ol44O844Gn44GZ44CC44Gf44Gg44GX44OO44O844OJ44Gu5omL55Wq44GL44KJ6KaL44Gm44Gu5YCk44Gn44GZ44CCICovXG4gICAgICAgIHRoaXMudG90YWxBY3Rpb25WYWx1ZXMgPSBuZXcgRmxvYXQzMkFycmF5KHRoaXMuQy5CVkNOVCArIDEpO1xuICAgICAgICAvKiogbW92ZXPopoHntKDjgavlr77lv5zjgZnjgovoqKrllY/lm57mlbDjgafjgZnjgIIgKi9cbiAgICAgICAgdGhpcy52aXNpdENvdW50cyA9IG5ldyBVaW50MzJBcnJheSh0aGlzLkMuQlZDTlQgKyAxKTtcbiAgICAgICAgLyoqIG1vdmVz6KaB57Sg44Gr5a++5b+c44GZ44KL44OO44O844OJSUTjgafjgZnjgIIgKi9cbiAgICAgICAgdGhpcy5ub2RlSWRzID0gbmV3IEludDE2QXJyYXkodGhpcy5DLkJWQ05UICsgMSk7XG4gICAgICAgIC8qKiBtb3Zlc+imgee0oOOBq+WvvuW/nOOBmeOCi+ODj+ODg+OCt+ODpeOBp+OBmeOAgiAqL1xuICAgICAgICB0aGlzLmhhc2hlcyA9IG5ldyBVaW50MzJBcnJheSh0aGlzLkMuQlZDTlQgKyAxKTtcbiAgICAgICAgLyoqIG1vdmVz6KaB57Sg44Gr5a++5b+c44GZ44KL5bGA6Z2i44Gu44OL44Ol44O844Op44Or44ON44OD44OI44Ov44O844Kv44KS6KiI566X44GX44Gf44GL5ZCm44GL44KS5L+d5oyB44GX44G+44GZ44CCICovXG4gICAgICAgIHRoaXMuZXZhbHVhdGVkID0gbmV3IFVpbnQ4QXJyYXkodGhpcy5DLkJWQ05UICsgMSk7XG4gICAgICAgIHRoaXMudG90YWxWYWx1ZSA9IDAuMDtcbiAgICAgICAgdGhpcy50b3RhbENvdW50ID0gMDtcbiAgICAgICAgdGhpcy5oYXNoID0gMDtcbiAgICAgICAgdGhpcy5tb3ZlTnVtYmVyID0gLTE7XG4gICAgICAgIHRoaXMuZXhpdENvbmRpdGlvbiA9IG51bGw7XG4gICAgICAgIHRoaXMuY2xlYXIoKTtcbiAgICB9XG5cbiAgICAvKiog5pyq5L2/55So54q25oWL44Gr44GX44G+44GZ44CCICovXG4gICAgY2xlYXIoKSB7XG4gICAgICAgIHRoaXMuZWRnZUxlbmd0aCA9IDA7XG4gICAgICAgIHRoaXMudG90YWxWYWx1ZSA9IDAuMDtcbiAgICAgICAgdGhpcy50b3RhbENvdW50ID0gMDtcbiAgICAgICAgdGhpcy5oYXNoID0gMDtcbiAgICAgICAgdGhpcy5tb3ZlTnVtYmVyID0gLTE7XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICog5Yid5pyf5YyW44GX44G+44GZ44CCXG4gICAgICogQHBhcmFtIHtvYmplY3R9IGNhbmRpZGF0ZXMgQm9hcmTjgYznlJ/miJDjgZnjgovlgJnoo5zmiYvmg4XloLHjgafjgZnjgIJcbiAgICAgKiBAcGFyYW0ge0Zsb2F0MzJBcnJheX0gcHJvYiDnnYDmiYvnorrnjoco44OL44Ol44O844Op44Or44ON44OD44OI44Ov44O844Kv44Gu44Od44Oq44K344O85Ye65YqbKeOBp+OBmeOAglxuICAgICAqL1xuICAgIGluaXRpYWxpemUoY2FuZGlkYXRlcywgcHJvYikge1xuICAgICAgICB0aGlzLmNsZWFyKCk7XG4gICAgICAgIHRoaXMubW92ZU51bWJlciA9IGNhbmRpZGF0ZXMubW92ZU51bWJlcjtcbiAgICAgICAgdGhpcy5oYXNoID0gY2FuZGlkYXRlcy5oYXNoO1xuXG4gICAgICAgIGZvciAoY29uc3QgcnYgb2YgKDAsIF91dGlscy5hcmdzb3J0KShwcm9iLCB0cnVlKSkge1xuICAgICAgICAgICAgaWYgKGNhbmRpZGF0ZXMubGlzdC5pbmNsdWRlcyhydikpIHtcbiAgICAgICAgICAgICAgICB0aGlzLm1vdmVzW3RoaXMuZWRnZUxlbmd0aF0gPSB0aGlzLkMucnYyZXYocnYpO1xuICAgICAgICAgICAgICAgIHRoaXMucHJvYmFiaWxpdGllc1t0aGlzLmVkZ2VMZW5ndGhdID0gcHJvYltydl07XG4gICAgICAgICAgICAgICAgdGhpcy52YWx1ZXNbdGhpcy5lZGdlTGVuZ3RoXSA9IDAuMDtcbiAgICAgICAgICAgICAgICB0aGlzLnRvdGFsQWN0aW9uVmFsdWVzW3RoaXMuZWRnZUxlbmd0aF0gPSAwLjA7XG4gICAgICAgICAgICAgICAgdGhpcy52aXNpdENvdW50c1t0aGlzLmVkZ2VMZW5ndGhdID0gMDtcbiAgICAgICAgICAgICAgICB0aGlzLm5vZGVJZHNbdGhpcy5lZGdlTGVuZ3RoXSA9IC0xO1xuICAgICAgICAgICAgICAgIHRoaXMuaGFzaGVzW3RoaXMuZWRnZUxlbmd0aF0gPSAwO1xuICAgICAgICAgICAgICAgIHRoaXMuZXZhbHVhdGVkW3RoaXMuZWRnZUxlbmd0aF0gPSBmYWxzZTtcbiAgICAgICAgICAgICAgICB0aGlzLmVkZ2VMZW5ndGggKz0gMTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgIH1cblxuICAgIC8qKlxuICAgICAqIOOCqOODg+OCuOOBruS4reOBruODmeOCueODiDLjga7jgqTjg7Pjg4fjg4Pjgq/jgrnjgpLov5TjgZfjgb7jgZnjgIJcbiAgICAgKiBAcmV0dXJucyB7SW50ZWdlcltdfVxuICAgICAqL1xuICAgIGJlc3QyKCkge1xuICAgICAgICBjb25zdCBvcmRlciA9ICgwLCBfdXRpbHMuYXJnc29ydCkodGhpcy52aXNpdENvdW50cy5zbGljZSgwLCB0aGlzLmVkZ2VMZW5ndGgpLCB0cnVlKTtcbiAgICAgICAgcmV0dXJuIG9yZGVyLnNsaWNlKDAsIDIpO1xuICAgIH1cbn1cblxuLyoqIOODouODs+ODhuOCq+ODq+ODreODhOODquODvOaOoue0ouOCkuWun+ihjOOBmeOCi+OCr+ODqeOCueOBp+OBmeOAgiAqL1xuY2xhc3MgTUNUUyB7XG4gICAgLyoqXG4gICAgICog44Kz44Oz44K544OI44Op44Kv44K/XG4gICAgICogQHBhcmFtIHtOZXVyYWxOZXR3b3JrfSBubiBcbiAgICAgKiBAcGFyYW0ge0JvYXJkQ29uc3RhbnRzfSBDXG4gICAgICovXG4gICAgY29uc3RydWN0b3Iobm4sIEMpIHtcbiAgICAgICAgdGhpcy5DX1BVQ1QgPSAwLjAxO1xuICAgICAgICB0aGlzLm1haW5UaW1lID0gMC4wO1xuICAgICAgICB0aGlzLmJ5b3lvbWkgPSAxLjA7XG4gICAgICAgIHRoaXMubGVmdFRpbWUgPSAwLjA7XG4gICAgICAgIHRoaXMubm9kZXMgPSBbXTtcbiAgICAgICAgdGhpcy5ub2Rlc0xlbmd0aCA9IDA7XG4gICAgICAgIGZvciAobGV0IGkgPSAwOyBpIDwgTk9ERVNfTUFYX0xFTkdUSDsgaSsrKSB7XG4gICAgICAgICAgICB0aGlzLm5vZGVzLnB1c2gobmV3IE5vZGUoQykpO1xuICAgICAgICB9XG4gICAgICAgIHRoaXMucm9vdElkID0gMDtcbiAgICAgICAgdGhpcy5yb290TW92ZU51bWJlciA9IDA7XG4gICAgICAgIHRoaXMubm9kZUhhc2hlcyA9IG5ldyBNYXAoKTtcbiAgICAgICAgdGhpcy5ldmFsQ291bnQgPSAwO1xuICAgICAgICB0aGlzLm5uID0gbm47XG4gICAgICAgIHRoaXMudGVybWluYXRlRmxhZyA9IGZhbHNlO1xuICAgIH1cblxuICAgIC8qKlxuICAgICAqIOaMgeOBoeaZgumWk+OBruioreWumuOCkuOBl+OBvuOBmeOAglxuICAgICAqIOaui+OCiuaZgumWk+OCguODquOCu+ODg+ODiOOBl+OBvuOBmeOAglxuICAgICAqIEBwYXJhbSB7bnVtYmVyfSBtYWluVGltZSDnp5JcbiAgICAgKiBAcGFyYW0ge251bWJlcn0gYnlveW9taSDnp5JcbiAgICAgKi9cbiAgICBzZXRUaW1lKG1haW5UaW1lLCBieW95b21pKSB7XG4gICAgICAgIHRoaXMubWFpblRpbWUgPSBtYWluVGltZTtcbiAgICAgICAgdGhpcy5sZWZ0VGltZSA9IG1haW5UaW1lO1xuICAgICAgICB0aGlzLmJ5b3lvbWkgPSBieW95b21pO1xuICAgIH1cblxuICAgIC8qKlxuICAgICAqIOaui+OCiuaZgumWk+OCkuioreWumuOBl+OBvuOBmeOAglxuICAgICAqIEBwYXJhbSB7bnVtYmVyfSBsZWZ0VGltZSDnp5JcbiAgICAgKi9cbiAgICBzZXRMZWZ0VGltZShsZWZ0VGltZSkge1xuICAgICAgICB0aGlzLmxlZnRUaW1lID0gbGVmdFRpbWU7XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICog5YaF6YOo54q25oWL44KS44Kv44Oq44Ki44GX44G+44GZ44CCXG4gICAgICog5ZCM5LiA5pmC6ZaT6Kit5a6a44Gn5Yid5omL44GL44KJ5a++5bGA44Gn44GN44KL44KI44GG44Gr44Gq44KK44G+44GZ44CCXG4gICAgICovXG4gICAgY2xlYXIoKSB7XG4gICAgICAgIHRoaXMubGVmdFRpbWUgPSB0aGlzLm1haW5UaW1lO1xuICAgICAgICBmb3IgKGNvbnN0IG5vZGUgb2YgdGhpcy5ub2Rlcykge1xuICAgICAgICAgICAgbm9kZS5jbGVhcigpO1xuICAgICAgICB9XG4gICAgICAgIHRoaXMubm9kZXNMZW5ndGggPSAwO1xuICAgICAgICB0aGlzLnJvb3RJZCA9IDA7XG4gICAgICAgIHRoaXMucm9vdE1vdmVOdW1iZXIgPSAwO1xuICAgICAgICB0aGlzLm5vZGVIYXNoZXMuY2xlYXIoKTtcbiAgICAgICAgdGhpcy5ldmFsQ291bnQgPSAwO1xuICAgIH1cblxuICAgIC8qKlxuICAgICAqIOWxgOmdomLjga5NQ1RT44Gu5o6i57Si44OO44O844OJ44GM5pei44Gr44GC44KL44GL56K66KqN44GX44CB44Gq44GR44KM44Gw55Sf5oiQ44GX44Gm44OO44O844OJSUTjgpLov5TjgZfjgb7jgZnjgIJcbiAgICAgKiBAcGFyYW0ge0JvYXJkfSBiIFxuICAgICAqIEBwYXJhbSB7RmxvYXQzMkFycmF5fSBwcm9iIFxuICAgICAqIEByZXR1cm5zIHtJbnRlZ2VyfSDjg47jg7zjg4lJRFxuICAgICAqL1xuICAgIGNyZWF0ZU5vZGUoYiwgcHJvYikge1xuICAgICAgICBjb25zdCBjYW5kaWRhdGVzID0gYi5jYW5kaWRhdGVzKCk7XG4gICAgICAgIGNvbnN0IGhhc2ggPSBjYW5kaWRhdGVzLmhhc2g7XG4gICAgICAgIGlmICh0aGlzLm5vZGVIYXNoZXMuaGFzKGhhc2gpICYmIHRoaXMubm9kZXNbdGhpcy5ub2RlSGFzaGVzLmdldChoYXNoKV0uaGFzaCA9PT0gaGFzaCAmJiB0aGlzLm5vZGVzW3RoaXMubm9kZUhhc2hlcy5nZXQoaGFzaCldLm1vdmVOdW1iZXIgPT09IGNhbmRpZGF0ZXMubW92ZU51bWJlcikge1xuICAgICAgICAgICAgcmV0dXJuIHRoaXMubm9kZUhhc2hlcy5nZXQoaGFzaCk7XG4gICAgICAgIH1cblxuICAgICAgICBsZXQgbm9kZUlkID0gaGFzaCAlIE5PREVTX01BWF9MRU5HVEg7XG4gICAgICAgIHdoaWxlICh0aGlzLm5vZGVzW25vZGVJZF0ubW92ZU51bWJlciAhPT0gLTEpIHtcbiAgICAgICAgICAgIG5vZGVJZCA9IG5vZGVJZCArIDEgPCBOT0RFU19NQVhfTEVOR1RIID8gbm9kZUlkICsgMSA6IDA7XG4gICAgICAgIH1cblxuICAgICAgICB0aGlzLm5vZGVIYXNoZXMuc2V0KGhhc2gsIG5vZGVJZCk7XG4gICAgICAgIHRoaXMubm9kZXNMZW5ndGggKz0gMTtcblxuICAgICAgICBjb25zdCBub2RlID0gdGhpcy5ub2Rlc1tub2RlSWRdO1xuICAgICAgICBub2RlLmluaXRpYWxpemUoY2FuZGlkYXRlcywgcHJvYik7XG4gICAgICAgIHJldHVybiBub2RlSWQ7XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogbm9kZXPjga7kuK3jga7kuI3opoHjgarjg47jg7zjg4njgpLmnKrkvb/nlKjnirbmhYvjgavmiLvjgZfjgb7jgZnjgIJcbiAgICAgKi9cbiAgICBjbGVhbnVwTm9kZXMoKSB7XG4gICAgICAgIGlmICh0aGlzLm5vZGVzTGVuZ3RoIDwgTk9ERVNfTUFYX0xFTkdUSCAvIDIpIHtcbiAgICAgICAgICAgIHJldHVybjtcbiAgICAgICAgfVxuICAgICAgICBmb3IgKGxldCBpID0gMDsgaSA8IE5PREVTX01BWF9MRU5HVEg7IGkrKykge1xuICAgICAgICAgICAgY29uc3QgbWMgPSB0aGlzLm5vZGVzW2ldLm1vdmVOdW1iZXI7XG4gICAgICAgICAgICBpZiAobWMgIT0gbnVsbCAmJiBtYyA8IHRoaXMucm9vdE1vdmVOdW1iZXIpIHtcbiAgICAgICAgICAgICAgICB0aGlzLm5vZGVIYXNoZXMuZGVsZXRlKHRoaXMubm9kZXNbaV0uaGFzaCk7XG4gICAgICAgICAgICAgICAgdGhpcy5ub2Rlc1tpXS5jbGVhcigpO1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogVUNC6KmV5L6h44Gn5pyA5ZaE44Gu552A5omL5oOF5aCx44KS6L+U44GX44G+44GZ44CCXG4gICAgICogQHBhcmFtIHtCb2FyZH0gYiBcbiAgICAgKiBAcGFyYW0ge0ludGVnZXJ9IG5vZGVJZCBcbiAgICAgKiBAcmV0dXJucyB7QXJyYXl9IFtVQ0Lpgbjmip7jgqTjg7Pjg4fjg4Pjgq/jgrksIOacgOWWhOODluODqeODs+ODgeOBruWtkOODjuODvOODiUlELCDnnYDmiYtdXG4gICAgICovXG4gICAgc2VsZWN0QnlVQ0IoYiwgbm9kZSkge1xuICAgICAgICBjb25zdCBuZFJhdGUgPSBub2RlLnRvdGFsQ291bnQgPT09IDAgPyAwLjAgOiBub2RlLnRvdGFsVmFsdWUgLyBub2RlLnRvdGFsQ291bnQ7XG4gICAgICAgIGNvbnN0IGNwc3YgPSB0aGlzLkNfUFVDVCAqIE1hdGguc3FydChub2RlLnRvdGFsQ291bnQpO1xuICAgICAgICBjb25zdCBtZWFuQWN0aW9uVmFsdWVzID0gbmV3IEZsb2F0MzJBcnJheShub2RlLmVkZ2VMZW5ndGgpO1xuICAgICAgICBmb3IgKGxldCBpID0gMDsgaSA8IG1lYW5BY3Rpb25WYWx1ZXMubGVuZ3RoOyBpKyspIHtcbiAgICAgICAgICAgIG1lYW5BY3Rpb25WYWx1ZXNbaV0gPSBub2RlLnZpc2l0Q291bnRzW2ldID09PSAwID8gbmRSYXRlIDogbm9kZS50b3RhbEFjdGlvblZhbHVlc1tpXSAvIG5vZGUudmlzaXRDb3VudHNbaV07XG4gICAgICAgIH1cbiAgICAgICAgY29uc3QgdWNiID0gbmV3IEZsb2F0MzJBcnJheShub2RlLmVkZ2VMZW5ndGgpO1xuICAgICAgICBmb3IgKGxldCBpID0gMDsgaSA8IHVjYi5sZW5ndGg7IGkrKykge1xuICAgICAgICAgICAgdWNiW2ldID0gbWVhbkFjdGlvblZhbHVlc1tpXSArIGNwc3YgKiBub2RlLnByb2JhYmlsaXRpZXNbaV0gLyAoMSArIG5vZGUudmlzaXRDb3VudHNbaV0pO1xuICAgICAgICB9XG4gICAgICAgIGNvbnN0IHNlbGVjdGVkSW5kZXggPSAoMCwgX3V0aWxzLmFyZ21heCkodWNiKTtcbiAgICAgICAgY29uc3Qgc2VsZWN0ZWRJZCA9IG5vZGUubm9kZUlkc1tzZWxlY3RlZEluZGV4XTtcbiAgICAgICAgY29uc3Qgc2VsZWN0ZWRNb3ZlID0gbm9kZS5tb3Zlc1tzZWxlY3RlZEluZGV4XTtcbiAgICAgICAgcmV0dXJuIFtzZWxlY3RlZEluZGV4LCBzZWxlY3RlZElkLCBzZWxlY3RlZE1vdmVdO1xuICAgIH1cblxuICAgIC8qKlxuICAgICAqIOaknOe0ouOBmeOCi+OBi+OBqeOBhuOBi+OCkuaxuuWumuOBl+OBvuOBmeOAglxuICAgICAqIEBwYXJhbSB7SW50ZWdlcn0gYmVzdCBcbiAgICAgKiBAcGFyYW0ge0ludGVnZXJ9IHNlY29uZCBcbiAgICAgKi9cbiAgICBzaG91bGRTZWFyY2goYmVzdCwgc2Vjb25kKSB7XG4gICAgICAgIGNvbnN0IG5vZGUgPSB0aGlzLm5vZGVzW3RoaXMucm9vdElkXTtcbiAgICAgICAgY29uc3Qgd2lucmF0ZSA9IHRoaXMud2lucmF0ZShub2RlLCBiZXN0KTtcblxuICAgICAgICAvLyDoqKrllY/lm57mlbDjgYzotrPjgorjgabjgYTjgarjgYTjgYvjgIHpmpvnq4vjgaPjgZ/miYvjgYzjgarjgY/jgYvjgaTjga/jgaPjgY3jgorli53jgaHjgZjjgoPjgarjgYTjgajjgY1cbiAgICAgICAgcmV0dXJuIG5vZGUudG90YWxDb3VudCA8PSA1MDAwIHx8IG5vZGUudmlzaXRDb3VudHNbYmVzdF0gPD0gbm9kZS52aXNpdENvdW50c1tzZWNvbmRdICogMTAwICYmIHdpbnJhdGUgPD0gMC45NTtcbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiDmrKHjga7nnYDmiYvjga7ogIPmha7mmYLplpPjgpLnrpflh7rjgZfjgb7jgZnjgIJcbiAgICAgKiBAcmV0dXJucyB7bnVtYmVyfSDkvb/nlKjjgZnjgovmmYLplpMo56eSKVxuICAgICAqL1xuICAgIGdldFNlYXJjaFRpbWUoQykge1xuICAgICAgICBpZiAodGhpcy5tYWluVGltZSA9PT0gMC4wIHx8IHRoaXMubGVmdFRpbWUgPCB0aGlzLmJ5b3lvbWkgKiAyLjApIHtcbiAgICAgICAgICAgIHJldHVybiBNYXRoLm1heCh0aGlzLmJ5b3lvbWksIDEuMCk7XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAvLyDnooHnm6TjgpLln4vjgoHjgovjgZPjgajjgpLku67lrprjgZfjgIHmrovjgorjga7miYvmlbDjgpLnrpflh7rjgZfjgb7jgZnjgIJcbiAgICAgICAgICAgIGNvbnN0IGFzc3VtZWRSZW1haW5pbmdNb3ZlcyA9IChDLkJWQ05UIC0gdGhpcy5yb290TW92ZU51bWJlcikgLyAyO1xuICAgICAgICAgICAgLy/luIPnn7Pjgafjga/jgojjgorlpJrjgY/jga7miYvmlbDjgpLku67lrprjgZfjgIHmgKXjgY7jgb7jgZnjgIJcbiAgICAgICAgICAgIGNvbnN0IG9wZW5pbmdPZmZzZXQgPSBNYXRoLm1heChDLkJWQ05UIC8gMTAgLSB0aGlzLnJvb3RNb3ZlTnVtYmVyLCAwKTtcbiAgICAgICAgICAgIHJldHVybiB0aGlzLmxlZnRUaW1lIC8gKGFzc3VtZWRSZW1haW5pbmdNb3ZlcyArIG9wZW5pbmdPZmZzZXQpICsgdGhpcy5ieW95b21pO1xuICAgICAgICB9XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogbm9kZUlk44Gu44OO44O844OJ44GuZWRnZUluZGV444Gu44Ko44OD44K444Gr5a++5b+c44GZ44KL44OO44O844OJ44GM5pei44Gr5a2Y5Zyo44GZ44KL44GL6L+U44GX44G+44GZ44CCXG4gICAgICogQHBhcmFtIHtJbnRlZ2VyfSBub2RlSWQgXG4gICAgICogQHBhcmFtIHtJbnRlZ2VyfSBlZGdlSW5kZXggXG4gICAgICogQHBhcmFtIHtJbnRlZ2VyfSBtb3ZlTnVtYmVyIFxuICAgICAqIEByZXR1cm5zIHtib29sfVxuICAgICAqL1xuICAgIGhhc0VkZ2VOb2RlKGVkZ2VJbmRleCwgbm9kZUlkLCBtb3ZlTnVtYmVyKSB7XG4gICAgICAgIGNvbnN0IG5vZGUgPSB0aGlzLm5vZGVzW25vZGVJZF07XG4gICAgICAgIGNvbnN0IGVkZ2VJZCA9IG5vZGUubm9kZUlkc1tlZGdlSW5kZXhdO1xuICAgICAgICByZXR1cm4gZWRnZUlkID49IDAgJiYgbm9kZS5oYXNoZXNbZWRnZUluZGV4XSA9PT0gdGhpcy5ub2Rlc1tlZGdlSWRdLmhhc2ggJiYgdGhpcy5ub2Rlc1tlZGdlSWRdLm1vdmVOdW1iZXIgPT09IG1vdmVOdW1iZXI7XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogaW5kZXjjga7jgqjjg4Pjgrjjga7li53njofjgpLov5TjgZfjgb7jgZnjgIJcbiAgICAgKiBAcGFyYW0ge05vZGV9IG5vZGUgXG4gICAgICogQHBhcmFtIHtJbnRlZ2VyfSBpbmRleCBcbiAgICAgKiBAcmV0dXJucyB7bnVtYmVyfVxuICAgICAqL1xuICAgIHdpbnJhdGUobm9kZSwgaW5kZXgpIHtcbiAgICAgICAgcmV0dXJuIG5vZGUudG90YWxBY3Rpb25WYWx1ZXNbaW5kZXhdIC8gTWF0aC5tYXgobm9kZS52aXNpdENvdW50c1tpbmRleF0sIDEpIC8gMi4wICsgMC41O1xuICAgIH1cblxuICAgIC8qKlxuICAgICAqIHByaW50SW5mb+OBruODmOODq+ODkeODvOmWouaVsOOBp+OBmeOAglxuICAgICAqIEBwcml2YXRlXG4gICAgICogQHBhcmFtIHtJbnRlZ2VyfSBub2RlSWQgXG4gICAgICogQHBhcmFtIHsqfSBoZWFkTW92ZSBcbiAgICAgKiBAcGFyYW0ge0JvYXJkQ29uc3RhbnRzfSBjIFxuICAgICAqL1xuICAgIGJlc3RTZXF1ZW5jZShub2RlSWQsIGhlYWRNb3ZlLCBjKSB7XG4gICAgICAgIGxldCBzZXFTdHIgPSAoJyAgICcgKyBjLmV2MnN0cihoZWFkTW92ZSkpLnNsaWNlKC01KTtcbiAgICAgICAgbGV0IG5leHRNb3ZlID0gaGVhZE1vdmU7XG5cbiAgICAgICAgZm9yIChsZXQgaSA9IDA7IGkgPCA3OyBpKyspIHtcbiAgICAgICAgICAgIGNvbnN0IG5vZGUgPSB0aGlzLm5vZGVzW25vZGVJZF07XG4gICAgICAgICAgICBpZiAobmV4dE1vdmUgPT09IGMuUEFTUyB8fCBub2RlLmVkZ2VMZW5ndGggPCAxKSB7XG4gICAgICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgICAgICB9XG5cbiAgICAgICAgICAgIGNvbnN0IGJlc3QgPSAoMCwgX3V0aWxzLmFyZ21heCkobm9kZS52aXNpdENvdW50cy5zbGljZSgwLCBub2RlLmVkZ2VMZW5ndGgpKTtcbiAgICAgICAgICAgIGlmIChub2RlLnZpc2l0Q291bnRzW2Jlc3RdID09PSAwKSB7XG4gICAgICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBuZXh0TW92ZSA9IG5vZGUubW92ZXNbYmVzdF07XG4gICAgICAgICAgICBzZXFTdHIgKz0gJy0+JyArICgnICAgJyArIGMuZXYyc3RyKG5leHRNb3ZlKSkuc2xpY2UoLTUpO1xuXG4gICAgICAgICAgICBpZiAoIXRoaXMuaGFzRWRnZU5vZGUoYmVzdCwgbm9kZUlkLCBub2RlLm1vdmVOdW1iZXIgKyAxKSkge1xuICAgICAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgbm9kZUlkID0gbm9kZS5ub2RlSWRzW2Jlc3RdO1xuICAgICAgICB9XG5cbiAgICAgICAgcmV0dXJuIHNlcVN0cjtcbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiDmjqLntKLntZDmnpzjga7oqbPntLDjgpLooajnpLrjgZfjgb7jgZnjgIJcbiAgICAgKiBAcGFyYW0ge0ludGVnZXJ9IG5vZGVJZCBcbiAgICAgKiBAcGFyYW0ge0JvYXJkQ29uc3RhbnRzfSBjXG4gICAgICovXG4gICAgcHJpbnRJbmZvKG5vZGVJZCwgYykge1xuICAgICAgICBjb25zdCBub2RlID0gdGhpcy5ub2Rlc1tub2RlSWRdO1xuICAgICAgICBjb25zdCBvcmRlciA9ICgwLCBfdXRpbHMuYXJnc29ydCkobm9kZS52aXNpdENvdW50cy5zbGljZSgwLCBub2RlLmVkZ2VMZW5ndGgpLCB0cnVlKTtcbiAgICAgICAgY29uc29sZS5sb2coJ3xtb3ZlfGNvdW50ICB8cmF0ZSB8dmFsdWV8cHJvYiB8IGJlc3Qgc2VxdWVuY2UnKTtcbiAgICAgICAgZm9yIChsZXQgaSA9IDA7IGkgPCBNYXRoLm1pbihvcmRlci5sZW5ndGgsIDkpOyBpKyspIHtcbiAgICAgICAgICAgIGNvbnN0IG0gPSBvcmRlcltpXTtcbiAgICAgICAgICAgIGNvbnN0IHZpc2l0Q291bnRzID0gbm9kZS52aXNpdENvdW50c1ttXTtcbiAgICAgICAgICAgIGlmICh2aXNpdENvdW50cyA9PT0gMCkge1xuICAgICAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICBjb25zdCByYXRlID0gdmlzaXRDb3VudHMgPT09IDAgPyAwLjAgOiB0aGlzLndpbnJhdGUobm9kZSwgbSkgKiAxMDAuMDtcbiAgICAgICAgICAgIGNvbnN0IHZhbHVlID0gKG5vZGUudmFsdWVzW21dIC8gMi4wICsgMC41KSAqIDEwMC4wO1xuICAgICAgICAgICAgY29uc29sZS5sb2coJ3wlc3wlc3wlc3wlc3wlc3wgJXMnLCAoJyAgICcgKyBjLmV2MnN0cihub2RlLm1vdmVzW21dKSkuc2xpY2UoLTQpLCAodmlzaXRDb3VudHMgKyAnICAgICAgJykuc2xpY2UoMCwgNyksICgnICAnICsgcmF0ZS50b0ZpeGVkKDEpKS5zbGljZSgtNSksICgnICAnICsgdmFsdWUudG9GaXhlZCgxKSkuc2xpY2UoLTUpLCAoJyAgJyArIChub2RlLnByb2JhYmlsaXRpZXNbbV0gKiAxMDAuMCkudG9GaXhlZCgxKSkuc2xpY2UoLTUpLCB0aGlzLmJlc3RTZXF1ZW5jZShub2RlLm5vZGVJZHNbbV0sIG5vZGUubW92ZXNbbV0sIGMpKTtcbiAgICAgICAgfVxuICAgIH1cblxuICAgIC8qKlxuICAgICAqIOODi+ODpeODvOODqeODq+ODjeODg+ODiOODr+ODvOOCr+OBp+WxgOmdouOCkuipleS+oeOBl+OBvuOBmeOAglxuICAgICAqIOODqeODs+ODgOODoOOBq+WxgOmdouOCkuWvvuensOWkieaPm+OBleOBm+OCi+apn+iDveOCkuaMgeOBoeOBvuOBmeOAglxuICAgICAqIEBwYXJhbSB7Qm9hcmR9IGJcbiAgICAgKiBAcGFyYW0ge2Jvb2x9IHJhbmRvbVxuICAgICAqIEByZXR1cm5zIHtGbG9hdDMyQXJyYXlbXX1cbiAgICAgKi9cbiAgICBhc3luYyBldmFsdWF0ZShiLCByYW5kb20gPSB0cnVlKSB7XG4gICAgICAgIGNvbnN0IHN5bW1ldHJ5ID0gcmFuZG9tID8gTWF0aC5mbG9vcihNYXRoLnJhbmRvbSgpICogOCkgOiAwO1xuICAgICAgICBjb25zdCBbcHJvYiwgdmFsdWVdID0gYXdhaXQgdGhpcy5ubi5ldmFsdWF0ZShiLmZlYXR1cmUoc3ltbWV0cnkpKTtcbiAgICAgICAgaWYgKHN5bW1ldHJ5KSB7XG4gICAgICAgICAgICBjb25zdCBwID0gbmV3IEZsb2F0MzJBcnJheShwcm9iLmxlbmd0aCk7XG4gICAgICAgICAgICBmb3IgKGxldCBydiA9IDA7IHJ2IDwgYi5DLkJWQ05UOyBydisrKSB7XG4gICAgICAgICAgICAgICAgcFtydl0gPSBwcm9iW2IuQy5nZXRTeW1tZXRyaWNSYXdWZXJ0ZXgocnYsIHN5bW1ldHJ5KV07XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBwW3Byb2IubGVuZ3RoIC0gMV0gPSBwcm9iW3Byb2IubGVuZ3RoIC0gMV07XG4gICAgICAgICAgICByZXR1cm4gW3AsIHZhbHVlXTtcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIHJldHVybiBbcHJvYiwgdmFsdWVdO1xuICAgICAgICB9XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICog5qSc57Si44Gu5YmN5Yem55CG44Gn44GZ44CCXG4gICAgICogQHByaXZhdGVcbiAgICAgKiBAcGFyYW0ge0JvYXJkfSBiIFxuICAgICAqL1xuICAgIGFzeW5jIHByZXBhcmVSb290Tm9kZShiKSB7XG4gICAgICAgIGNvbnN0IGhhc2ggPSBiLmhhc2goKTtcbiAgICAgICAgdGhpcy5yb290TW92ZU51bWJlciA9IGIubW92ZU51bWJlcjtcbiAgICAgICAgdGhpcy5DX1BVQ1QgPSB0aGlzLnJvb3RNb3ZlTnVtYmVyIDwgOCA/IDAuMDEgOiAxLjU7XG4gICAgICAgIGlmICh0aGlzLm5vZGVIYXNoZXMuaGFzKGhhc2gpICYmIHRoaXMubm9kZXNbdGhpcy5ub2RlSGFzaGVzLmdldChoYXNoKV0uaGFzaCA9PT0gaGFzaCAmJiB0aGlzLm5vZGVzW3RoaXMubm9kZUhhc2hlcy5nZXQoaGFzaCldLm1vdmVOdW1iZXIgPT09IHRoaXMucm9vdE1vdmVOdW1iZXIpIHtcbiAgICAgICAgICAgIHRoaXMucm9vdElkID0gdGhpcy5ub2RlSGFzaGVzLmdldChoYXNoKTtcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIGNvbnN0IFtwcm9iXSA9IGF3YWl0IHRoaXMuZXZhbHVhdGUoYik7XG5cbiAgICAgICAgICAgIC8vIEFscGhhR28gWmVyb+OBp+OBr+iHquW3seWvvuaIpuaZguOBq+OBr+OBk+OBk+OBp3Byb2LjgatcIkRpcmljaGxldOODjuOCpOOCulwi44KS6L+95Yqg44GX44G+44GZ44GM44CB5pys44Kz44O844OJ44Gn44Gv5by35YyW5a2m57+S44Gv5LqI5a6a44GX44Gm44GE44Gq44GE44Gu44Gn6KiY6L+w44GX44G+44Gb44KT44CCXG5cbiAgICAgICAgICAgIHRoaXMucm9vdElkID0gdGhpcy5jcmVhdGVOb2RlKGIsIHByb2IpO1xuICAgICAgICB9XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogZWRnZUluZGV444Gu44Ko44OD44K444Gu5bGA6Z2i44KS6KmV5L6h44GX44OO44O844OJ44KS55Sf5oiQ44GX44Gm44OQ44Oq44Ol44O844KS6L+U44GX44G+44GZ44CCXG4gICAgICogQHByaXZhdGVcbiAgICAgKiBAcGFyYW0ge0JvYXJkfSBiIFxuICAgICAqIEBwYXJhbSB7SW50ZWdlcn0gZWRnZUluZGV4IFxuICAgICAqIEBwYXJhbSB7Tm9kZX0gcGFyZW50Tm9kZSBcbiAgICAgKiBAcmV0dXJucyB7bnVtYmVyfSBwYXJlbnROb2Rl44Gu5omL55Wq44GL44KJ6KaL44GfZWRnZeWxgOmdouOBruODkOODquODpeODvFxuICAgICAqL1xuICAgIGFzeW5jIGV2YWx1YXRlRWRnZShiLCBlZGdlSW5kZXgsIHBhcmVudE5vZGUpIHtcbiAgICAgICAgbGV0IFtwcm9iLCB2YWx1ZV0gPSBhd2FpdCB0aGlzLmV2YWx1YXRlKGIpO1xuICAgICAgICB0aGlzLmV2YWxDb3VudCArPSAxO1xuICAgICAgICB2YWx1ZSA9IC12YWx1ZVswXTsgLy8gcGFyZW50Tm9kZeOBruaJi+eVquOBi+OCieimi+OBn+ODkOODquODpeODvOOBq+WkieaPm+OBl+OBvuOBmeOAglxuICAgICAgICBwYXJlbnROb2RlLnZhbHVlc1tlZGdlSW5kZXhdID0gdmFsdWU7XG4gICAgICAgIHBhcmVudE5vZGUuZXZhbHVhdGVkW2VkZ2VJbmRleF0gPSB0cnVlO1xuICAgICAgICBpZiAodGhpcy5ub2Rlc0xlbmd0aCA+IDAuODUgKiBOT0RFU19NQVhfTEVOR1RIKSB7XG4gICAgICAgICAgICB0aGlzLmNsZWFudXBOb2RlcygpO1xuICAgICAgICB9XG4gICAgICAgIGNvbnN0IG5vZGVJZCA9IHRoaXMuY3JlYXRlTm9kZShiLCBwcm9iKTtcbiAgICAgICAgcGFyZW50Tm9kZS5ub2RlSWRzW2VkZ2VJbmRleF0gPSBub2RlSWQ7XG4gICAgICAgIHBhcmVudE5vZGUuaGFzaGVzW2VkZ2VJbmRleF0gPSBiLmhhc2goKTtcbiAgICAgICAgcGFyZW50Tm9kZS50b3RhbFZhbHVlIC09IHBhcmVudE5vZGUudG90YWxBY3Rpb25WYWx1ZXNbZWRnZUluZGV4XTtcbiAgICAgICAgcGFyZW50Tm9kZS50b3RhbENvdW50ICs9IHBhcmVudE5vZGUudmlzaXRDb3VudHNbZWRnZUluZGV4XTtcbiAgICAgICAgcmV0dXJuIHZhbHVlO1xuICAgIH1cblxuICAgIC8qKlxuICAgICAqIE1DVFPjg4Tjg6rjg7zjgpJVQ0LjgavlvpPjgaPjgabkuIvjgorjgIHjg6rjg7zjg5Xjg47jg7zjg4njgavliLDpgZTjgZfjgZ/jgonlsZXplovjgZfjgb7jgZnjgIJcbiAgICAgKiBAcHJpdmF0ZVxuICAgICAqIEBwYXJhbSB7Qm9hcmR9IGIgXG4gICAgICogQHBhcmFtIHtJbnRlZ2VyfSBub2RlSWRcbiAgICAgKi9cbiAgICBhc3luYyBwbGF5b3V0KGIsIG5vZGVJZCkge1xuICAgICAgICBjb25zdCBub2RlID0gdGhpcy5ub2Rlc1tub2RlSWRdO1xuICAgICAgICBjb25zdCBbc2VsZWN0ZWRJbmRleCwgc2VsZWN0ZWRJZCwgc2VsZWN0ZWRNb3ZlXSA9IHRoaXMuc2VsZWN0QnlVQ0IoYiwgbm9kZSk7XG4gICAgICAgIGIucGxheShzZWxlY3RlZE1vdmUpO1xuICAgICAgICBjb25zdCBpc0hlYWROb2RlID0gIXRoaXMuaGFzRWRnZU5vZGUoc2VsZWN0ZWRJbmRleCwgbm9kZUlkLCBiLm1vdmVOdW1iZXIpO1xuICAgICAgICAvKlxuICAgICAgICAvLyDku6XkuIvjga9QeWFx44GM5o6h55So44GX44Gf44OY44OD44OJ44OO44O844OJ44Gu5p2h5Lu244Gn44GZ44CCXG4gICAgICAgIGNvbnN0IGlzSGVhZE5vZGUgPSAhdGhpcy5oYXNFZGdlTm9kZShzZWxlY3RlZEluZGV4LCBub2RlSWQsIGIubW92ZU51bWJlcikgfHxcbiAgICAgICAgICAgIG5vZGUudmlzaXRDb3VudHNbc2VsZWN0ZWRJbmRleF0gPCBFWFBBTkRfQ05UIHx8XG4gICAgICAgICAgICBiLm1vdmVOdW1iZXIgPiBiLkMuQlZDTlQgKiAyIHx8XG4gICAgICAgICAgICAoc2VsZWN0ZWRNb3ZlID09PSBiLkMuUEFTUyAmJiBiLnByZXZNb3ZlID09PSBiLkMuUEFTUyk7XG4gICAgICAgICovXG4gICAgICAgIGNvbnN0IHZhbHVlID0gaXNIZWFkTm9kZSA/IG5vZGUuZXZhbHVhdGVkW3NlbGVjdGVkSW5kZXhdID8gbm9kZS52YWx1ZXNbc2VsZWN0ZWRJbmRleF0gOiBhd2FpdCB0aGlzLmV2YWx1YXRlRWRnZShiLCBzZWxlY3RlZEluZGV4LCBub2RlKSA6IC0oYXdhaXQgdGhpcy5wbGF5b3V0KGIsIHNlbGVjdGVkSWQpKTsgLy8gc2VsZWN0ZWRJZOOBruaJi+eVquOBp+OBruODkOODquODpeODvOOBjOi/lOOBleOCjOOCi+OBi+OCieespuWPt+OCkuWPjei7ouOBleOBm+OBvuOBmeOAglxuICAgICAgICBub2RlLnRvdGFsVmFsdWUgKz0gdmFsdWU7XG4gICAgICAgIG5vZGUudG90YWxDb3VudCArPSAxO1xuICAgICAgICBub2RlLnRvdGFsQWN0aW9uVmFsdWVzW3NlbGVjdGVkSW5kZXhdICs9IHZhbHVlO1xuICAgICAgICBub2RlLnZpc2l0Q291bnRzW3NlbGVjdGVkSW5kZXhdICs9IDE7XG4gICAgICAgIHJldHVybiB2YWx1ZTtcbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiDjg5fjg6zjgqTjgqLjgqbjg4jjgpLnubDjgorov5TjgZfjgaZNQ1RT44OE44Oq44O844KS5pu05paw44GX44G+44GZ44CCXG4gICAgICogQHByaXZhdGVcbiAgICAgKiBAcGFyYW0ge0JvYXJkfSBiIFxuICAgICAqL1xuICAgIGFzeW5jIGtlZXBQbGF5b3V0KGIpIHtcbiAgICAgICAgdGhpcy5ldmFsQ291bnQgPSAwO1xuICAgICAgICBsZXQgYkNweSA9IG5ldyBfYm9hcmQuQm9hcmQoYi5DLCBiLmtvbWkpO1xuICAgICAgICBkbyB7XG4gICAgICAgICAgICBiLmNvcHlUbyhiQ3B5KTtcbiAgICAgICAgICAgIGF3YWl0IHRoaXMucGxheW91dChiQ3B5LCB0aGlzLnJvb3RJZCk7XG4gICAgICAgIH0gd2hpbGUgKCF0aGlzLmV4aXRDb25kaXRpb24oKSk7XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICog5o6i57Si44GM5b+F6KaB44GL5Yik5a6a44GX44Gm5b+F6KaB44Gr5b+c44GY44Gm5qSc57Si44GX44CB5pyA5ZaE44Go5Yik5pat44GX44Gf552A5omL44Go5Yud546H44KS6L+U44GX44G+44GZ44CCXG4gICAgICogQHByaXZhdGVcbiAgICAgKiBAcGFyYW0ge0JvYXJkfSBiIFxuICAgICAqIEBwYXJhbSB7Ym9vbH0gcG9uZGVyIHRydWXjga7jgajjgY1zdG9w44Oh44K944OD44OJ44GM5ZG844Gw44KM44KL44G+44Gn5o6i57Si44KS57aZ57aa44GX44G+44GZXG4gICAgICogQHBhcmFtIHtib29sfSBjbGVhbiDlvaLli6LjgYzlpInjgo/jgonjgarjgYTpmZDjgorjg5Hjgrnku6XlpJbjga7nnYDmiYvjgpLpgbjjgbPjgb7jgZlcbiAgICAgKiBAcmV0dXJucyB7QXJyYXl9IFvnnYDmiYso5pu444GP5pyd6a6u57O75bqn5qiZKSwg5Yud546HXVxuICAgICAqL1xuICAgIGFzeW5jIF9zZWFyY2goYiwgcG9uZGVyLCBjbGVhbikge1xuICAgICAgICAvLyBBbHBoYUdvIFplcm/jgafjga/oh6rlt7Hlr77miKbjga7luo/nm6QzMOaJi+OBvuOBp+OBr+OCqOODg+OCuOOBrue3j+ioquWVj+WbnuaVsOOBi+OCieeiuueOh+WIhuW4g+OCkueul+WHuuOBl+OBpuS5seaVsOOBp+edgOaJi+OCkua0l+a/r+OBl+OBvuOBmeOBjOOAgeacrOOCs+ODvOODieOBp+OBr+W8t+WMluWtpue/kuOBr+S6iOWumuOBl+OBpuOBhOOBquOBhOOBruOBp+acgOWWhOOBqOWIpOaWreOBl+OBn+edgOaJi+OCkui/lOOBl+OBvuOBmeOAglxuICAgICAgICBsZXQgYmVzdDtcbiAgICAgICAgbGV0IHNlY29uZDtcbiAgICAgICAgaWYgKHBvbmRlciB8fCB0aGlzLnNob3VsZFNlYXJjaChiZXN0LCBzZWNvbmQpKSB7XG4gICAgICAgICAgICBhd2FpdCB0aGlzLmtlZXBQbGF5b3V0KGIpO1xuICAgICAgICAgICAgY29uc3QgYmVzdDIgPSB0aGlzLm5vZGVzW3RoaXMucm9vdElkXS5iZXN0MigpO1xuICAgICAgICAgICAgYmVzdCA9IGJlc3QyWzBdO1xuICAgICAgICAgICAgc2Vjb25kID0gYmVzdDJbMV07XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICBjb25zdCBiZXN0MiA9IHRoaXMubm9kZXNbdGhpcy5yb290SWRdLmJlc3QyKCk7XG4gICAgICAgICAgICBiZXN0ID0gYmVzdDJbMF07XG4gICAgICAgICAgICBzZWNvbmQgPSBiZXN0MlsxXTtcbiAgICAgICAgfVxuXG4gICAgICAgIGNvbnN0IG5vZGUgPSB0aGlzLm5vZGVzW3RoaXMucm9vdElkXTtcblxuICAgICAgICBpZiAoY2xlYW4gJiYgbm9kZS5tb3Zlc1tiZXN0XSA9PT0gYi5DLlBBU1MgJiYgbm9kZS50b3RhbEFjdGlvblZhbHVlc1tiZXN0XSAqIG5vZGUudG90YWxBY3Rpb25WYWx1ZXNbc2Vjb25kXSA+IDAuMCkge1xuICAgICAgICAgICAgcmV0dXJuIFtub2RlLm1vdmVzW3NlY29uZF0sIHRoaXMud2lucmF0ZShub2RlLCBzZWNvbmQpXTtcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIHJldHVybiBbbm9kZS5tb3Zlc1tiZXN0XSwgdGhpcy53aW5yYXRlKG5vZGUsIGJlc3QpXTtcbiAgICAgICAgfVxuICAgIH1cblxuICAgIC8qKlxuICAgICAqIE1DVFPmjqLntKLjg6Hjgr3jg4Pjg4njgafjgZnjgIJcbiAgICAgKiBfc2VhcmNo44Oh44K944OD44OJ44Gu44Op44OD44OR44O844Oh44K944OD44OJ44Gn44GZ44CCXG4gICAgICog57WC5LqG5p2h5Lu244KS6Kit5a6a44GX44CB5bGA6Z2iYuOCknRpbWXmmYLplpPmjqLntKLjgZfjgIHntZDmnpzjgpLjg63jgrDlh7rlipvjgZfjgabmrKHjga7kuIDmiYvjgajli53njofjgpLov5TjgZfjgb7jgZnjgIJcbiAgICAgKiBAcGFyYW0ge0JvYXJkfSBiIFxuICAgICAqIEBwYXJhbSB7bnVtYmVyfSB0aW1lIOaOoue0ouaZgumWk+OCkuenkuWNmOS9jeOBp+aMh+WumuOBl+OBvuOBmVxuICAgICAqIEBwYXJhbSB7Ym9vbH0gcG9uZGVyIHR0cnVl44Gu44Go44GNc3RvcOODoeOCveODg+ODieOBjOWRvOOBsOOCjOOCi+OBvuOBp+aOoue0ouOCkue2mee2muOBl+OBvuOBmVxuICAgICAqIEBwYXJhbSB7Ym9vbH0gY2xlYW4g5b2i5Yui44GM5aSJ44KP44KJ44Gq44GE6ZmQ44KK44OR44K55Lul5aSW44Gu552A5omL44KS6YG444Gz44G+44GZXG4gICAgICogQHJldHVybnMge0FycmF5fSBb552A5omLKOabuOOBj+acnemuruezu+W6p+aomSksIOWLneeOh11cbiAgICAgKi9cbiAgICBhc3luYyBzZWFyY2goYiwgdGltZSwgcG9uZGVyLCBjbGVhbikge1xuICAgICAgICBjb25zdCBzdGFydCA9IERhdGUubm93KCk7XG4gICAgICAgIGF3YWl0IHRoaXMucHJlcGFyZVJvb3ROb2RlKGIpO1xuXG4gICAgICAgIGlmICh0aGlzLm5vZGVzW3RoaXMucm9vdElkXS5lZGdlTGVuZ3RoIDw9IDEpIHtcbiAgICAgICAgICAgIC8vIOWAmeijnOaJi+OBjOODkeOCueOBl+OBi+OBquOBkeOCjOOBsFxuICAgICAgICAgICAgY29uc29sZS5sb2coJ1xcbm1vdmUgbnVtYmVyPSVkOicsIHRoaXMucm9vdE1vdmVOdW1iZXIgKyAxKTtcbiAgICAgICAgICAgIHRoaXMucHJpbnRJbmZvKHRoaXMucm9vdElkLCBiLkMpO1xuICAgICAgICAgICAgcmV0dXJuIFtiLkMuUEFTUywgMC41XTtcbiAgICAgICAgfVxuXG4gICAgICAgIHRoaXMuY2xlYW51cE5vZGVzKCk7XG5cbiAgICAgICAgY29uc3QgdGltZV8gPSAodGltZSA9PT0gMC4wID8gdGhpcy5nZXRTZWFyY2hUaW1lKGIuQykgOiB0aW1lKSAqIDEwMDAgLSA1MDA7IC8vIDAuNeenkuOBruODnuODvOOCuOODs1xuICAgICAgICB0aGlzLnRlcm1pbmF0ZUZsYWcgPSBmYWxzZTtcbiAgICAgICAgdGhpcy5leGl0Q29uZGl0aW9uID0gcG9uZGVyID8gZnVuY3Rpb24gKCkge1xuICAgICAgICAgICAgcmV0dXJuIHRoaXMudGVybWluYXRlRmxhZztcbiAgICAgICAgfSA6IGZ1bmN0aW9uICgpIHtcbiAgICAgICAgICAgIHJldHVybiB0aGlzLnRlcm1pbmF0ZUZsYWcgfHwgRGF0ZS5ub3coKSAtIHN0YXJ0ID4gdGltZV87XG4gICAgICAgIH07XG4gICAgICAgIGNvbnN0IFtuZXh0TW92ZSwgd2luUmF0ZV0gPSBhd2FpdCB0aGlzLl9zZWFyY2goYiwgcG9uZGVyLCBjbGVhbik7XG5cbiAgICAgICAgaWYgKCFwb25kZXIpIHtcbiAgICAgICAgICAgIGNvbnNvbGUubG9nKCdcXG5tb3ZlIG51bWJlcj0lZDogbGVmdCB0aW1lPSVzW3NlY10gZXZhbHVhdGVkPSVkJywgdGhpcy5yb290TW92ZU51bWJlciArIDEsIE1hdGgubWF4KHRoaXMubGVmdFRpbWUgLSB0aW1lLCAwLjApLnRvRml4ZWQoMSksIHRoaXMuZXZhbENvdW50KTtcbiAgICAgICAgICAgIHRoaXMucHJpbnRJbmZvKHRoaXMucm9vdElkLCBiLkMpO1xuICAgICAgICAgICAgdGhpcy5sZWZ0VGltZSA9IHRoaXMubGVmdFRpbWUgLSAoRGF0ZS5ub3coKSAtIHN0YXJ0KSAvIDEwMDA7XG4gICAgICAgIH1cbiAgICAgICAgcmV0dXJuIFtuZXh0TW92ZSwgd2luUmF0ZV07XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICog5a6f6KGM5Lit44Gua2VlcFBsYXlvdXTjgpLlgZzmraLjgZXjgZvjgb7jgZnjgIJcbiAgICAgKi9cbiAgICBzdG9wKCkge1xuICAgICAgICB0aGlzLnRlcm1pbmF0ZUZsYWcgPSB0cnVlO1xuICAgIH1cbn1cbmV4cG9ydHMuTUNUUyA9IE1DVFM7IiwiJ3VzZSBzdHJpY3QnO1xuXG5PYmplY3QuZGVmaW5lUHJvcGVydHkoZXhwb3J0cywgXCJfX2VzTW9kdWxlXCIsIHtcbiAgdmFsdWU6IHRydWVcbn0pO1xuZXhwb3J0cy5OZXVyYWxOZXR3b3JrID0gdW5kZWZpbmVkO1xuXG52YXIgX3dvcmtlclJtaSA9IHJlcXVpcmUoJ3dvcmtlci1ybWknKTtcblxuLyoqXG4gKiDjg4vjg6Xjg7zjg6njg6vjg43jg4Pjg4jjg6/jg7zjgq/jga5STUnjgafjgZnjgILjg4njgq3jg6Xjg6Hjg7Pjg4jjga/mnKzkvZPlgbTjga7jgrPjg7zjg4njgpLlj4LnhafjgZfjgabjgY/jgaDjgZXjgYTjgIJcbiAqIEBhbGlhcyBOZXVyYWxOZXR3b3JrUk1JXG4gKiBAc2VlIE5ldXJhbE5ldHdvcmtcbiAqL1xuY2xhc3MgTmV1cmFsTmV0d29yayBleHRlbmRzIF93b3JrZXJSbWkuV29ya2VyUk1JIHtcbiAgYXN5bmMgZXZhbHVhdGUoLi4uaW5wdXRzKSB7XG4gICAgY29uc3QgcmVzdWx0ID0gYXdhaXQgdGhpcy5pbnZva2VSTSgnZXZhbHVhdGUnLCBpbnB1dHMpO1xuICAgIHJldHVybiByZXN1bHQ7XG4gIH1cbn1cbmV4cG9ydHMuTmV1cmFsTmV0d29yayA9IE5ldXJhbE5ldHdvcms7IC8qKlxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICogQGZpbGUg44OL44Ol44O844Op44Or44ON44OD44OI44Ov44O844Kv44GuUk1J44Gn44GZ44CCXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgKi9cbi8qXG4gKiBAYXV0aG9yIOW4guW3nembhOS6jFxuICogQGNvcHlyaWdodCAyMDE4IElDSElLQVdBLCBZdWppIChOZXcgMyBScylcbiAqIEBsaWNlbnNlIE1JVFxuICovIiwiXCJ1c2Ugc3RyaWN0XCI7XG5cbk9iamVjdC5kZWZpbmVQcm9wZXJ0eShleHBvcnRzLCBcIl9fZXNNb2R1bGVcIiwge1xuICAgIHZhbHVlOiB0cnVlXG59KTtcbi8qKlxuICogQGZpbGUg5Zuy56KB44Gu6YCj44KS6KGo44GZ44Kv44Op44K544Gn44GZ44CCXG4gKiDjgZPjga7jgrPjg7zjg4njga9QeWFx44Gu56e75qSN44Kz44O844OJ44Gn44GZ44CCXG4gKiBAc2VlIHtAbGluayBodHRwczovL2dpdGh1Yi5jb20veW1nYXEvUHlhcX1cbiAqL1xuLypcbiAqIEBhdXRob3Ig5biC5bed6ZuE5LqMXG4gKiBAY29weXJpZ2h0IDIwMTggSUNISUtBV0EsIFl1amkgKE5ldyAzIFJzKVxuICogQGxpY2Vuc2UgTUlUXG4gKi9cblxuLyoqIOmAo+aDheWgseOCr+ODqeOCuSAqL1xuY2xhc3MgU3RvbmVHcm91cCB7XG4gICAgLyoqXG4gICAgICogXG4gICAgICogQHBhcmFtIHtvYmplY3R9IGJvYXJkQ29uc3RhbnRzXG4gICAgICovXG4gICAgY29uc3RydWN0b3IoYm9hcmRDb25zdGFudHMpIHtcbiAgICAgICAgdGhpcy5DID0gYm9hcmRDb25zdGFudHM7XG4gICAgICAgIHRoaXMubGliQ250ID0gdGhpcy5DLlZOVUxMO1xuICAgICAgICB0aGlzLnNpemUgPSB0aGlzLkMuVk5VTEw7XG4gICAgICAgIHRoaXMudkF0ciA9IHRoaXMuQy5WTlVMTDtcbiAgICAgICAgdGhpcy5saWJzID0gbmV3IFNldCgpO1xuICAgIH1cblxuICAgIGdldFNpemUoKSB7XG4gICAgICAgIHJldHVybiB0aGlzLnNpemU7XG4gICAgfVxuXG4gICAgZ2V0TGliQ250KCkge1xuICAgICAgICByZXR1cm4gdGhpcy5saWJDbnQ7XG4gICAgfVxuXG4gICAgZ2V0VkF0cigpIHtcbiAgICAgICAgcmV0dXJuIHRoaXMudkF0cjtcbiAgICB9XG5cbiAgICBjbGVhcihzdG9uZSkge1xuICAgICAgICB0aGlzLmxpYkNudCA9IHN0b25lID8gMCA6IHRoaXMuQy5WTlVMTDtcbiAgICAgICAgdGhpcy5zaXplID0gc3RvbmUgPyAxIDogdGhpcy5DLlZOVUxMO1xuICAgICAgICB0aGlzLnZBdHIgPSB0aGlzLkMuVk5VTEw7XG4gICAgICAgIHRoaXMubGlicy5jbGVhcigpO1xuICAgIH1cblxuICAgIGFkZCh2KSB7XG4gICAgICAgIGlmICh0aGlzLmxpYnMuaGFzKHYpKSB7XG4gICAgICAgICAgICByZXR1cm47XG4gICAgICAgIH1cbiAgICAgICAgdGhpcy5saWJzLmFkZCh2KTtcbiAgICAgICAgdGhpcy5saWJDbnQgKz0gMTtcbiAgICAgICAgdGhpcy52QXRyID0gdjtcbiAgICB9XG5cbiAgICBzdWIodikge1xuICAgICAgICBpZiAoIXRoaXMubGlicy5oYXModikpIHtcbiAgICAgICAgICAgIHJldHVybjtcbiAgICAgICAgfVxuICAgICAgICB0aGlzLmxpYnMuZGVsZXRlKHYpO1xuICAgICAgICB0aGlzLmxpYkNudCAtPSAxO1xuICAgIH1cblxuICAgIG1lcmdlKG90aGVyKSB7XG4gICAgICAgIHRoaXMubGlicyA9IG5ldyBTZXQoWy4uLnRoaXMubGlicywgLi4ub3RoZXIubGlic10pO1xuICAgICAgICB0aGlzLmxpYkNudCA9IHRoaXMubGlicy5zaXplO1xuICAgICAgICB0aGlzLnNpemUgKz0gb3RoZXIuc2l6ZTtcbiAgICAgICAgaWYgKHRoaXMubGliQ250ID09PSAxKSB7XG4gICAgICAgICAgICBzZWxmLnZBdHIgPSB0aGlzLmxpYnNbMF07XG4gICAgICAgIH1cbiAgICB9XG5cbiAgICBjb3B5VG8oZGVzdCkge1xuICAgICAgICBkZXN0LmxpYkNudCA9IHRoaXMubGliQ250O1xuICAgICAgICBkZXN0LnNpemUgPSB0aGlzLnNpemU7XG4gICAgICAgIGRlc3QudkF0ciA9IHRoaXMudkF0cjtcbiAgICAgICAgZGVzdC5saWJzID0gbmV3IFNldCh0aGlzLmxpYnMpO1xuICAgIH1cbn1cbmV4cG9ydHMuU3RvbmVHcm91cCA9IFN0b25lR3JvdXA7IiwiJ3VzZSBzdHJpY3QnO1xuXG5PYmplY3QuZGVmaW5lUHJvcGVydHkoZXhwb3J0cywgXCJfX2VzTW9kdWxlXCIsIHtcbiAgICB2YWx1ZTogdHJ1ZVxufSk7XG5leHBvcnRzLnNodWZmbGUgPSBzaHVmZmxlO1xuZXhwb3J0cy5tb3N0Q29tbW9uID0gbW9zdENvbW1vbjtcbmV4cG9ydHMuYXJnc29ydCA9IGFyZ3NvcnQ7XG5leHBvcnRzLmFyZ21heCA9IGFyZ21heDtcbmV4cG9ydHMuaGFzaCA9IGhhc2g7XG5leHBvcnRzLnNvZnRtYXggPSBzb2Z0bWF4O1xuZXhwb3J0cy5wcmludFByb2IgPSBwcmludFByb2I7XG4vKipcbiAqIEBmaWxlIOWQhOeoruODpuODvOODhuOCo+ODquODhuOCo+mWouaVsOe+pOOBp+OBmeOAglxuICovXG4vKlxuICogQGF1dGhvciDluILlt53pm4TkuoxcbiAqIEBjb3B5cmlnaHQgMjAxOCBJQ0hJS0FXQSwgWXVqaSAoTmV3IDMgUnMpXG4gKiBAbGljZW5zZSBNSVRcbiAqL1xuXG4vKipcbiAqIEBwYXJhbSB7QXJyYXl9IGFycmF5XG4gKi9cbmZ1bmN0aW9uIHNodWZmbGUoYXJyYXkpIHtcbiAgICBsZXQgbiA9IGFycmF5Lmxlbmd0aDtcbiAgICBsZXQgdDtcbiAgICBsZXQgaTtcblxuICAgIHdoaWxlIChuKSB7XG4gICAgICAgIGkgPSBNYXRoLmZsb29yKE1hdGgucmFuZG9tKCkgKiBuLS0pO1xuICAgICAgICB0ID0gYXJyYXlbbl07XG4gICAgICAgIGFycmF5W25dID0gYXJyYXlbaV07XG4gICAgICAgIGFycmF5W2ldID0gdDtcbiAgICB9XG5cbiAgICByZXR1cm4gYXJyYXk7XG59XG5cbi8qKlxuICogYXJyYXnjga7kuK3jga7mnIDpoLvlh7ropoHntKDjgpLov5TjgZfjgb7jgZnjgIJcbiAqIEBwYXJhbSB7QXJyYXl9IGFycmF5IFxuICovXG5mdW5jdGlvbiBtb3N0Q29tbW9uKGFycmF5KSB7XG4gICAgY29uc3QgbWFwID0gbmV3IE1hcCgpO1xuICAgIGZvciAobGV0IGkgPSAwOyBpIDwgYXJyYXkubGVuZ3RoOyBpKyspIHtcbiAgICAgICAgY29uc3QgZSA9IGFycmF5W2ldO1xuICAgICAgICBpZiAobWFwLmhhcyhlKSkge1xuICAgICAgICAgICAgbWFwLnNldChlLCBtYXAuZ2V0KGUpICsgMSk7XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICBtYXAuc2V0KGUsIDEpO1xuICAgICAgICB9XG4gICAgfVxuICAgIGxldCBtYXhLZXk7XG4gICAgbGV0IG1heFZhbHVlID0gLTE7XG4gICAgZm9yIChjb25zdCBba2V5LCB2YWx1ZV0gb2YgbWFwLmVudHJpZXMoKSkge1xuICAgICAgICBpZiAodmFsdWUgPiBtYXhWYWx1ZSkge1xuICAgICAgICAgICAgbWF4S2V5ID0ga2V5O1xuICAgICAgICAgICAgbWF4VmFsdWUgPSB2YWx1ZTtcbiAgICAgICAgfVxuICAgIH1cbiAgICByZXR1cm4gbWF4S2V5O1xufVxuXG4vKiogYXJyYXnjgpLjgr3jg7zjg4jjgZfjgZ/mmYLjga7jgqTjg7Pjg4fjg4Pjgq/jgrnphY3liJfjgpLov5TjgZfjgb7jgZnjgIJcbiAqIEBwYXJhbSB7bnVtYmVyW119IGFycmF5IFxuICogQHBhcmFtIHtib29sfSByZXZlcnNlIFxuICovXG5mdW5jdGlvbiBhcmdzb3J0KGFycmF5LCByZXZlcnNlKSB7XG4gICAgY29uc3QgZW4gPSBBcnJheS5mcm9tKGFycmF5KS5tYXAoKGUsIGkpID0+IFtpLCBlXSk7XG4gICAgZW4uc29ydCgoYSwgYikgPT4gcmV2ZXJzZSA/IGJbMV0gLSBhWzFdIDogYVsxXSAtIGJbMV0pO1xuICAgIHJldHVybiBlbi5tYXAoZSA9PiBlWzBdKTtcbn1cblxuLyoqXG4gKiBhcnJheeOBruS4reOBruacgOWkp+WApOOBruOCpOODs+ODh+ODg+OCr+OCueOCkui/lOOBl+OBvuOBmeOAglxuICogQHBhcmFtIHtudW1iZXJbXX0gYXJyYXkgXG4gKi9cbmZ1bmN0aW9uIGFyZ21heChhcnJheSkge1xuICAgIGxldCBtYXhJbmRleDtcbiAgICBsZXQgbWF4VmFsdWUgPSAtSW5maW5pdHk7XG4gICAgZm9yIChsZXQgaSA9IDA7IGkgPCBhcnJheS5sZW5ndGg7IGkrKykge1xuICAgICAgICBjb25zdCB2ID0gYXJyYXlbaV07XG4gICAgICAgIGlmICh2ID4gbWF4VmFsdWUpIHtcbiAgICAgICAgICAgIG1heEluZGV4ID0gaTtcbiAgICAgICAgICAgIG1heFZhbHVlID0gdjtcbiAgICAgICAgfVxuICAgIH1cbiAgICByZXR1cm4gbWF4SW5kZXg7XG59XG5cbi8qKlxuICogc3Ry44GuMzItYml044OP44OD44K344Ol5YCk44KS6L+U44GX44G+44GZ44CCXG4gKiAo5rOoKTE56Lev55uk44Gn44GvMzItYml044OP44OD44K344Ol5YCk44Gv6KGd56qB44GZ44KL44Go6KiA44KP44KM44Gm44GE44G+44GZ44GM6KGd56qB44Gr44Gv5a++5b+c44GX44Gm44GE44G+44Gb44KT44CCXG4gKiBAcGFyYW0ge3N0cmluZ30gc3RyIFxuICogQHJldHVybnMge0ludGVnZXJ9XG4gKi9cbmZ1bmN0aW9uIGhhc2goc3RyKSB7XG4gICAgbGV0IGhhc2ggPSA1MzgxO1xuICAgIGZvciAobGV0IGkgPSAwOyBpIDwgc3RyLmxlbmd0aDsgaSsrKSB7XG4gICAgICAgIGNvbnN0IGNoYXIgPSBzdHIuY2hhckNvZGVBdChpKTtcbiAgICAgICAgaGFzaCA9IChoYXNoIDw8IDUpICsgaGFzaCArIGNoYXI7IC8qIGhhc2ggKiAzMyArIGMgKi9cbiAgICAgICAgaGFzaCA9IGhhc2ggJiBoYXNoOyAvLyBDb252ZXJ0IHRvIDMyYml0IGludGVnZXJcbiAgICB9XG4gICAgcmV0dXJuIE1hdGguYWJzKGhhc2gpO1xufVxuXG4vKipcbiAqIOa4qeW6puODkeODqeODoeODvOOCv+OBguOCiuOBruOCveODleODiOODnuODg+OCr+OCuemWouaVsOOBp+OBmeOAglxuICogQHBhcmFtIHtGbG9hdDMyQXJyYXl9IGlucHV0IFxuICogQHBhcmFtIHtudW1iZXJ9IHRlbXBlcmF0dXJlXG4gKiBAcmV0dXJucyB7RmxvYXQzMkFycmF5fVxuICovXG5mdW5jdGlvbiBzb2Z0bWF4KGlucHV0LCB0ZW1wZXJhdHVyZSA9IDEuMCkge1xuICAgIGNvbnN0IG91dHB1dCA9IG5ldyBGbG9hdDMyQXJyYXkoaW5wdXQubGVuZ3RoKTtcbiAgICBjb25zdCBhbHBoYSA9IE1hdGgubWF4LmFwcGx5KG51bGwsIGlucHV0KTtcbiAgICBsZXQgZGVub20gPSAwLjA7XG5cbiAgICBmb3IgKGxldCBpID0gMDsgaSA8IGlucHV0Lmxlbmd0aDsgaSsrKSB7XG4gICAgICAgIGNvbnN0IHZhbCA9IE1hdGguZXhwKChpbnB1dFtpXSAtIGFscGhhKSAvIHRlbXBlcmF0dXJlKTtcbiAgICAgICAgZGVub20gKz0gdmFsO1xuICAgICAgICBvdXRwdXRbaV0gPSB2YWw7XG4gICAgfVxuXG4gICAgZm9yIChsZXQgaSA9IDA7IGkgPCBvdXRwdXQubGVuZ3RoOyBpKyspIHtcbiAgICAgICAgb3V0cHV0W2ldIC89IGRlbm9tO1xuICAgIH1cblxuICAgIHJldHVybiBvdXRwdXQ7XG59XG5cbmZ1bmN0aW9uIHByaW50UHJvYihwcm9iLCBzaXplKSB7XG4gICAgZm9yIChsZXQgeSA9IDA7IHkgPCBzaXplOyB5KyspIHtcbiAgICAgICAgbGV0IHN0ciA9IGAke3kgKyAxfSBgO1xuICAgICAgICBmb3IgKGxldCB4ID0gMDsgeCA8IHNpemU7IHgrKykge1xuICAgICAgICAgICAgc3RyICs9ICgnICAnICsgcHJvYlt4ICsgeSAqIHNpemVdLnRvRml4ZWQoMSkpLnNsaWNlKC01KTtcbiAgICAgICAgfVxuICAgICAgICBjb25zb2xlLmxvZyhzdHIpO1xuICAgIH1cbiAgICBjb25zb2xlLmxvZygncGFzcz0lcycsIHByb2JbcHJvYi5sZW5ndGggLSAxXS50b0ZpeGVkKDEpKTtcbn0iLCIndXNlIHN0cmljdCc7XG5cbnZhciBfd29ya2VyUm1pID0gcmVxdWlyZSgnd29ya2VyLXJtaScpO1xuXG52YXIgX2F6anNfZW5naW5lID0gcmVxdWlyZSgnLi9hempzX2VuZ2luZS5qcycpO1xuXG4vKipcbiAqIEBmaWxlIOOCpuOCp+ODluODr+ODvOOCq+OBruOCqOODs+ODiOODquODvOODneOCpOODs+ODiOOBp+OBmeOAglxuICovXG4vKlxuICogQGF1dGhvciDluILlt53pm4TkuoxcbiAqIEBjb3B5cmlnaHQgMjAxOCBJQ0hJS0FXQSwgWXVqaSAoTmV3IDMgUnMpXG4gKiBAbGljZW5zZSBNSVRcbiAqL1xuKDAsIF93b3JrZXJSbWkucmVzaWd0ZXJXb3JrZXJSTUkpKHNlbGYsIF9hempzX2VuZ2luZS5BWmpzRW5naW5lKTsiXX0=
