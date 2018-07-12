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
 */
(0, _workerRmi.resigterWorkerRMI)(self, _azjs_engine.AZjsEngine);
},{"./azjs_engine.js":4,"worker-rmi":3}]},{},[11])
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIm5vZGVfbW9kdWxlcy9icm93c2VyLXBhY2svX3ByZWx1ZGUuanMiLCJub2RlX21vZHVsZXMvYnNvbi1vYmplY3RpZC9vYmplY3RpZC5qcyIsIm5vZGVfbW9kdWxlcy9wcm9jZXNzL2Jyb3dzZXIuanMiLCJub2RlX21vZHVsZXMvd29ya2VyLXJtaS93b3JrZXItcm1pLmpzIiwic3JjL2F6anNfZW5naW5lLmpzIiwic3JjL2JvYXJkLmpzIiwic3JjL2JvYXJkX2NvbnN0YW50cy5qcyIsInNyYy9tY3RzLmpzIiwic3JjL25ldXJhbF9uZXR3b3JrX2NsaWVudC5qcyIsInNyYy9zdG9uZV9ncm91cC5qcyIsInNyYy91dGlscy5qcyIsInNyYy93b3JrZXIuanMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7O0FDQUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7Ozs7QUM5TkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUN4TEE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDM0tBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDMUpBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDMWVBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQy9KQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ25mQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDMUJBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ2pGQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQzNJQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBIiwiZmlsZSI6ImdlbmVyYXRlZC5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzQ29udGVudCI6WyIoZnVuY3Rpb24oKXtmdW5jdGlvbiByKGUsbix0KXtmdW5jdGlvbiBvKGksZil7aWYoIW5baV0pe2lmKCFlW2ldKXt2YXIgYz1cImZ1bmN0aW9uXCI9PXR5cGVvZiByZXF1aXJlJiZyZXF1aXJlO2lmKCFmJiZjKXJldHVybiBjKGksITApO2lmKHUpcmV0dXJuIHUoaSwhMCk7dmFyIGE9bmV3IEVycm9yKFwiQ2Fubm90IGZpbmQgbW9kdWxlICdcIitpK1wiJ1wiKTt0aHJvdyBhLmNvZGU9XCJNT0RVTEVfTk9UX0ZPVU5EXCIsYX12YXIgcD1uW2ldPXtleHBvcnRzOnt9fTtlW2ldWzBdLmNhbGwocC5leHBvcnRzLGZ1bmN0aW9uKHIpe3ZhciBuPWVbaV1bMV1bcl07cmV0dXJuIG8obnx8cil9LHAscC5leHBvcnRzLHIsZSxuLHQpfXJldHVybiBuW2ldLmV4cG9ydHN9Zm9yKHZhciB1PVwiZnVuY3Rpb25cIj09dHlwZW9mIHJlcXVpcmUmJnJlcXVpcmUsaT0wO2k8dC5sZW5ndGg7aSsrKW8odFtpXSk7cmV0dXJuIG99cmV0dXJuIHJ9KSgpIiwiXG52YXIgTUFDSElORV9JRCA9IE1hdGguZmxvb3IoTWF0aC5yYW5kb20oKSAqIDB4RkZGRkZGKTtcbnZhciBpbmRleCA9IE9iamVjdElELmluZGV4ID0gcGFyc2VJbnQoTWF0aC5yYW5kb20oKSAqIDB4RkZGRkZGLCAxMCk7XG52YXIgcGlkID0gKHR5cGVvZiBwcm9jZXNzID09PSAndW5kZWZpbmVkJyB8fCB0eXBlb2YgcHJvY2Vzcy5waWQgIT09ICdudW1iZXInID8gTWF0aC5mbG9vcihNYXRoLnJhbmRvbSgpICogMTAwMDAwKSA6IHByb2Nlc3MucGlkKSAlIDB4RkZGRjtcblxuLyoqXG4gKiBEZXRlcm1pbmUgaWYgYW4gb2JqZWN0IGlzIEJ1ZmZlclxuICpcbiAqIEF1dGhvcjogICBGZXJvc3MgQWJvdWtoYWRpamVoIDxmZXJvc3NAZmVyb3NzLm9yZz4gPGh0dHA6Ly9mZXJvc3Mub3JnPlxuICogTGljZW5zZTogIE1JVFxuICpcbiAqL1xudmFyIGlzQnVmZmVyID0gZnVuY3Rpb24gKG9iaikge1xuICByZXR1cm4gISEoXG4gIG9iaiAhPSBudWxsICYmXG4gIG9iai5jb25zdHJ1Y3RvciAmJlxuICB0eXBlb2Ygb2JqLmNvbnN0cnVjdG9yLmlzQnVmZmVyID09PSAnZnVuY3Rpb24nICYmXG4gIG9iai5jb25zdHJ1Y3Rvci5pc0J1ZmZlcihvYmopXG4gIClcbn07XG5cbi8qKlxuICogQ3JlYXRlIGEgbmV3IGltbXV0YWJsZSBPYmplY3RJRCBpbnN0YW5jZVxuICpcbiAqIEBjbGFzcyBSZXByZXNlbnRzIHRoZSBCU09OIE9iamVjdElEIHR5cGVcbiAqIEBwYXJhbSB7U3RyaW5nfE51bWJlcn0gYXJnIENhbiBiZSBhIDI0IGJ5dGUgaGV4IHN0cmluZywgMTIgYnl0ZSBiaW5hcnkgc3RyaW5nIG9yIGEgTnVtYmVyLlxuICogQHJldHVybiB7T2JqZWN0fSBpbnN0YW5jZSBvZiBPYmplY3RJRC5cbiAqL1xuZnVuY3Rpb24gT2JqZWN0SUQoYXJnKSB7XG4gIGlmKCEodGhpcyBpbnN0YW5jZW9mIE9iamVjdElEKSkgcmV0dXJuIG5ldyBPYmplY3RJRChhcmcpO1xuICBpZihhcmcgJiYgKChhcmcgaW5zdGFuY2VvZiBPYmplY3RJRCkgfHwgYXJnLl9ic29udHlwZT09PVwiT2JqZWN0SURcIikpXG4gICAgcmV0dXJuIGFyZztcblxuICB2YXIgYnVmO1xuXG4gIGlmKGlzQnVmZmVyKGFyZykgfHwgKEFycmF5LmlzQXJyYXkoYXJnKSAmJiBhcmcubGVuZ3RoPT09MTIpKSB7XG4gICAgYnVmID0gQXJyYXkucHJvdG90eXBlLnNsaWNlLmNhbGwoYXJnKTtcbiAgfVxuICBlbHNlIGlmKHR5cGVvZiBhcmcgPT09IFwic3RyaW5nXCIpIHtcbiAgICBpZihhcmcubGVuZ3RoIT09MTIgJiYgIU9iamVjdElELmlzVmFsaWQoYXJnKSlcbiAgICAgIHRocm93IG5ldyBFcnJvcihcIkFyZ3VtZW50IHBhc3NlZCBpbiBtdXN0IGJlIGEgc2luZ2xlIFN0cmluZyBvZiAxMiBieXRlcyBvciBhIHN0cmluZyBvZiAyNCBoZXggY2hhcmFjdGVyc1wiKTtcblxuICAgIGJ1ZiA9IGJ1ZmZlcihhcmcpO1xuICB9XG4gIGVsc2UgaWYoL251bWJlcnx1bmRlZmluZWQvLnRlc3QodHlwZW9mIGFyZykpIHtcbiAgICBidWYgPSBidWZmZXIoZ2VuZXJhdGUoYXJnKSk7XG4gIH1cblxuICBPYmplY3QuZGVmaW5lUHJvcGVydHkodGhpcywgXCJpZFwiLCB7XG4gICAgZW51bWVyYWJsZTogdHJ1ZSxcbiAgICBnZXQ6IGZ1bmN0aW9uKCkgeyByZXR1cm4gU3RyaW5nLmZyb21DaGFyQ29kZS5hcHBseSh0aGlzLCBidWYpOyB9XG4gIH0pO1xuICBPYmplY3QuZGVmaW5lUHJvcGVydHkodGhpcywgXCJzdHJcIiwge1xuICAgIGdldDogZnVuY3Rpb24oKSB7IHJldHVybiBidWYubWFwKGhleC5iaW5kKHRoaXMsIDIpKS5qb2luKCcnKTsgfVxuICB9KTtcbn1cbm1vZHVsZS5leHBvcnRzID0gT2JqZWN0SUQ7XG5PYmplY3RJRC5nZW5lcmF0ZSA9IGdlbmVyYXRlO1xuT2JqZWN0SUQuZGVmYXVsdCA9IE9iamVjdElEO1xuXG4vKipcbiAqIENyZWF0ZXMgYW4gT2JqZWN0SUQgZnJvbSBhIHNlY29uZCBiYXNlZCBudW1iZXIsIHdpdGggdGhlIHJlc3Qgb2YgdGhlIE9iamVjdElEIHplcm9lZCBvdXQuIFVzZWQgZm9yIGNvbXBhcmlzb25zIG9yIHNvcnRpbmcgdGhlIE9iamVjdElELlxuICpcbiAqIEBwYXJhbSB7TnVtYmVyfSB0aW1lIGFuIGludGVnZXIgbnVtYmVyIHJlcHJlc2VudGluZyBhIG51bWJlciBvZiBzZWNvbmRzLlxuICogQHJldHVybiB7T2JqZWN0SUR9IHJldHVybiB0aGUgY3JlYXRlZCBPYmplY3RJRFxuICogQGFwaSBwdWJsaWNcbiAqL1xuT2JqZWN0SUQuY3JlYXRlRnJvbVRpbWUgPSBmdW5jdGlvbih0aW1lKXtcbiAgdGltZSA9IHBhcnNlSW50KHRpbWUsIDEwKSAlIDB4RkZGRkZGRkY7XG4gIHJldHVybiBuZXcgT2JqZWN0SUQoaGV4KDgsdGltZSkrXCIwMDAwMDAwMDAwMDAwMDAwXCIpO1xufTtcblxuLyoqXG4gKiBDcmVhdGVzIGFuIE9iamVjdElEIGZyb20gYSBoZXggc3RyaW5nIHJlcHJlc2VudGF0aW9uIG9mIGFuIE9iamVjdElELlxuICpcbiAqIEBwYXJhbSB7U3RyaW5nfSBoZXhTdHJpbmcgY3JlYXRlIGEgT2JqZWN0SUQgZnJvbSBhIHBhc3NlZCBpbiAyNCBieXRlIGhleHN0cmluZy5cbiAqIEByZXR1cm4ge09iamVjdElEfSByZXR1cm4gdGhlIGNyZWF0ZWQgT2JqZWN0SURcbiAqIEBhcGkgcHVibGljXG4gKi9cbk9iamVjdElELmNyZWF0ZUZyb21IZXhTdHJpbmcgPSBmdW5jdGlvbihoZXhTdHJpbmcpIHtcbiAgaWYoIU9iamVjdElELmlzVmFsaWQoaGV4U3RyaW5nKSlcbiAgICB0aHJvdyBuZXcgRXJyb3IoXCJJbnZhbGlkIE9iamVjdElEIGhleCBzdHJpbmdcIik7XG5cbiAgcmV0dXJuIG5ldyBPYmplY3RJRChoZXhTdHJpbmcpO1xufTtcblxuLyoqXG4gKiBDaGVja3MgaWYgYSB2YWx1ZSBpcyBhIHZhbGlkIGJzb24gT2JqZWN0SWRcbiAqXG4gKiBAcGFyYW0ge1N0cmluZ30gb2JqZWN0aWQgQ2FuIGJlIGEgMjQgYnl0ZSBoZXggc3RyaW5nIG9yIGFuIGluc3RhbmNlIG9mIE9iamVjdElELlxuICogQHJldHVybiB7Qm9vbGVhbn0gcmV0dXJuIHRydWUgaWYgdGhlIHZhbHVlIGlzIGEgdmFsaWQgYnNvbiBPYmplY3RJRCwgcmV0dXJuIGZhbHNlIG90aGVyd2lzZS5cbiAqIEBhcGkgcHVibGljXG4gKlxuICogVEhFIE5BVElWRSBET0NVTUVOVEFUSU9OIElTTidUIENMRUFSIE9OIFRISVMgR1VZIVxuICogaHR0cDovL21vbmdvZGIuZ2l0aHViLmlvL25vZGUtbW9uZ29kYi1uYXRpdmUvYXBpLWJzb24tZ2VuZXJhdGVkL29iamVjdGlkLmh0bWwjb2JqZWN0aWQtaXN2YWxpZFxuICovXG5PYmplY3RJRC5pc1ZhbGlkID0gZnVuY3Rpb24ob2JqZWN0aWQpIHtcbiAgaWYoIW9iamVjdGlkKSByZXR1cm4gZmFsc2U7XG5cbiAgLy9jYWxsIC50b1N0cmluZygpIHRvIGdldCB0aGUgaGV4IGlmIHdlJ3JlXG4gIC8vIHdvcmtpbmcgd2l0aCBhbiBpbnN0YW5jZSBvZiBPYmplY3RJRFxuICByZXR1cm4gL15bMC05QS1GXXsyNH0kL2kudGVzdChvYmplY3RpZC50b1N0cmluZygpKTtcbn07XG5cbi8qKlxuICogc2V0IGEgY3VzdG9tIG1hY2hpbmVJRFxuICogXG4gKiBAcGFyYW0ge1N0cmluZ3xOdW1iZXJ9IG1hY2hpbmVpZCBDYW4gYmUgYSBzdHJpbmcsIGhleC1zdHJpbmcgb3IgYSBudW1iZXJcbiAqIEByZXR1cm4ge3ZvaWR9XG4gKiBAYXBpIHB1YmxpY1xuICovXG5PYmplY3RJRC5zZXRNYWNoaW5lSUQgPSBmdW5jdGlvbihhcmcpIHtcbiAgdmFyIG1hY2hpbmVJRDtcblxuICBpZih0eXBlb2YgYXJnID09PSBcInN0cmluZ1wiKSB7XG4gICAgLy8gaGV4IHN0cmluZ1xuICAgIG1hY2hpbmVJRCA9IHBhcnNlSW50KGFyZywgMTYpO1xuICAgXG4gICAgLy8gYW55IHN0cmluZ1xuICAgIGlmKGlzTmFOKG1hY2hpbmVJRCkpIHtcbiAgICAgIGFyZyA9ICgnMDAwMDAwJyArIGFyZykuc3Vic3RyKC03LDYpO1xuXG4gICAgICBtYWNoaW5lSUQgPSBcIlwiO1xuICAgICAgZm9yKHZhciBpID0gMDtpPDY7IGkrKykge1xuICAgICAgICBtYWNoaW5lSUQgKz0gKGFyZy5jaGFyQ29kZUF0KGkpKTtcbiAgICAgIH1cbiAgICB9XG4gIH1cbiAgZWxzZSBpZigvbnVtYmVyfHVuZGVmaW5lZC8udGVzdCh0eXBlb2YgYXJnKSkge1xuICAgIG1hY2hpbmVJRCA9IGFyZyB8IDA7XG4gIH1cblxuICBNQUNISU5FX0lEID0gKG1hY2hpbmVJRCAmIDB4RkZGRkZGKTtcbn1cblxuLyoqXG4gKiBnZXQgdGhlIG1hY2hpbmVJRFxuICogXG4gKiBAcmV0dXJuIHtudW1iZXJ9XG4gKiBAYXBpIHB1YmxpY1xuICovXG5PYmplY3RJRC5nZXRNYWNoaW5lSUQgPSBmdW5jdGlvbigpIHtcbiAgcmV0dXJuIE1BQ0hJTkVfSUQ7XG59XG5cbk9iamVjdElELnByb3RvdHlwZSA9IHtcbiAgX2Jzb250eXBlOiAnT2JqZWN0SUQnLFxuICBjb25zdHJ1Y3RvcjogT2JqZWN0SUQsXG5cbiAgLyoqXG4gICAqIFJldHVybiB0aGUgT2JqZWN0SUQgaWQgYXMgYSAyNCBieXRlIGhleCBzdHJpbmcgcmVwcmVzZW50YXRpb25cbiAgICpcbiAgICogQHJldHVybiB7U3RyaW5nfSByZXR1cm4gdGhlIDI0IGJ5dGUgaGV4IHN0cmluZyByZXByZXNlbnRhdGlvbi5cbiAgICogQGFwaSBwdWJsaWNcbiAgICovXG4gIHRvSGV4U3RyaW5nOiBmdW5jdGlvbigpIHtcbiAgICByZXR1cm4gdGhpcy5zdHI7XG4gIH0sXG5cbiAgLyoqXG4gICAqIENvbXBhcmVzIHRoZSBlcXVhbGl0eSBvZiB0aGlzIE9iamVjdElEIHdpdGggYG90aGVySURgLlxuICAgKlxuICAgKiBAcGFyYW0ge09iamVjdH0gb3RoZXIgT2JqZWN0SUQgaW5zdGFuY2UgdG8gY29tcGFyZSBhZ2FpbnN0LlxuICAgKiBAcmV0dXJuIHtCb29sZWFufSB0aGUgcmVzdWx0IG9mIGNvbXBhcmluZyB0d28gT2JqZWN0SUQnc1xuICAgKiBAYXBpIHB1YmxpY1xuICAgKi9cbiAgZXF1YWxzOiBmdW5jdGlvbiAob3RoZXIpe1xuICAgIHJldHVybiAhIW90aGVyICYmIHRoaXMuc3RyID09PSBvdGhlci50b1N0cmluZygpO1xuICB9LFxuXG4gIC8qKlxuICAgKiBSZXR1cm5zIHRoZSBnZW5lcmF0aW9uIGRhdGUgKGFjY3VyYXRlIHVwIHRvIHRoZSBzZWNvbmQpIHRoYXQgdGhpcyBJRCB3YXMgZ2VuZXJhdGVkLlxuICAgKlxuICAgKiBAcmV0dXJuIHtEYXRlfSB0aGUgZ2VuZXJhdGlvbiBkYXRlXG4gICAqIEBhcGkgcHVibGljXG4gICAqL1xuICBnZXRUaW1lc3RhbXA6IGZ1bmN0aW9uKCl7XG4gICAgcmV0dXJuIG5ldyBEYXRlKHBhcnNlSW50KHRoaXMuc3RyLnN1YnN0cigwLDgpLCAxNikgKiAxMDAwKTtcbiAgfVxufTtcblxuZnVuY3Rpb24gbmV4dCgpIHtcbiAgcmV0dXJuIGluZGV4ID0gKGluZGV4KzEpICUgMHhGRkZGRkY7XG59XG5cbmZ1bmN0aW9uIGdlbmVyYXRlKHRpbWUpIHtcbiAgaWYgKHR5cGVvZiB0aW1lICE9PSAnbnVtYmVyJylcbiAgICB0aW1lID0gRGF0ZS5ub3coKS8xMDAwO1xuXG4gIC8va2VlcCBpdCBpbiB0aGUgcmluZyFcbiAgdGltZSA9IHBhcnNlSW50KHRpbWUsIDEwKSAlIDB4RkZGRkZGRkY7XG5cbiAgLy9GRkZGRkZGRiBGRkZGRkYgRkZGRiBGRkZGRkZcbiAgcmV0dXJuIGhleCg4LHRpbWUpICsgaGV4KDYsTUFDSElORV9JRCkgKyBoZXgoNCxwaWQpICsgaGV4KDYsbmV4dCgpKTtcbn1cblxuZnVuY3Rpb24gaGV4KGxlbmd0aCwgbikge1xuICBuID0gbi50b1N0cmluZygxNik7XG4gIHJldHVybiAobi5sZW5ndGg9PT1sZW5ndGgpPyBuIDogXCIwMDAwMDAwMFwiLnN1YnN0cmluZyhuLmxlbmd0aCwgbGVuZ3RoKSArIG47XG59XG5cbmZ1bmN0aW9uIGJ1ZmZlcihzdHIpIHtcbiAgdmFyIGk9MCxvdXQ9W107XG5cbiAgaWYoc3RyLmxlbmd0aD09PTI0KVxuICAgIGZvcig7aTwyNDsgb3V0LnB1c2gocGFyc2VJbnQoc3RyW2ldK3N0cltpKzFdLCAxNikpLGkrPTIpO1xuXG4gIGVsc2UgaWYoc3RyLmxlbmd0aD09PTEyKVxuICAgIGZvcig7aTwxMjsgb3V0LnB1c2goc3RyLmNoYXJDb2RlQXQoaSkpLGkrKyk7XG5cbiAgcmV0dXJuIG91dDtcbn1cblxuLyoqXG4gKiBDb252ZXJ0cyB0byBhIHN0cmluZyByZXByZXNlbnRhdGlvbiBvZiB0aGlzIElkLlxuICpcbiAqIEByZXR1cm4ge1N0cmluZ30gcmV0dXJuIHRoZSAyNCBieXRlIGhleCBzdHJpbmcgcmVwcmVzZW50YXRpb24uXG4gKiBAYXBpIHByaXZhdGVcbiAqL1xuT2JqZWN0SUQucHJvdG90eXBlLmluc3BlY3QgPSBmdW5jdGlvbigpIHsgcmV0dXJuIFwiT2JqZWN0SUQoXCIrdGhpcytcIilcIiB9O1xuT2JqZWN0SUQucHJvdG90eXBlLnRvSlNPTiA9IE9iamVjdElELnByb3RvdHlwZS50b0hleFN0cmluZztcbk9iamVjdElELnByb3RvdHlwZS50b1N0cmluZyA9IE9iamVjdElELnByb3RvdHlwZS50b0hleFN0cmluZztcbiIsIi8vIHNoaW0gZm9yIHVzaW5nIHByb2Nlc3MgaW4gYnJvd3NlclxudmFyIHByb2Nlc3MgPSBtb2R1bGUuZXhwb3J0cyA9IHt9O1xuXG4vLyBjYWNoZWQgZnJvbSB3aGF0ZXZlciBnbG9iYWwgaXMgcHJlc2VudCBzbyB0aGF0IHRlc3QgcnVubmVycyB0aGF0IHN0dWIgaXRcbi8vIGRvbid0IGJyZWFrIHRoaW5ncy4gIEJ1dCB3ZSBuZWVkIHRvIHdyYXAgaXQgaW4gYSB0cnkgY2F0Y2ggaW4gY2FzZSBpdCBpc1xuLy8gd3JhcHBlZCBpbiBzdHJpY3QgbW9kZSBjb2RlIHdoaWNoIGRvZXNuJ3QgZGVmaW5lIGFueSBnbG9iYWxzLiAgSXQncyBpbnNpZGUgYVxuLy8gZnVuY3Rpb24gYmVjYXVzZSB0cnkvY2F0Y2hlcyBkZW9wdGltaXplIGluIGNlcnRhaW4gZW5naW5lcy5cblxudmFyIGNhY2hlZFNldFRpbWVvdXQ7XG52YXIgY2FjaGVkQ2xlYXJUaW1lb3V0O1xuXG5mdW5jdGlvbiBkZWZhdWx0U2V0VGltb3V0KCkge1xuICAgIHRocm93IG5ldyBFcnJvcignc2V0VGltZW91dCBoYXMgbm90IGJlZW4gZGVmaW5lZCcpO1xufVxuZnVuY3Rpb24gZGVmYXVsdENsZWFyVGltZW91dCAoKSB7XG4gICAgdGhyb3cgbmV3IEVycm9yKCdjbGVhclRpbWVvdXQgaGFzIG5vdCBiZWVuIGRlZmluZWQnKTtcbn1cbihmdW5jdGlvbiAoKSB7XG4gICAgdHJ5IHtcbiAgICAgICAgaWYgKHR5cGVvZiBzZXRUaW1lb3V0ID09PSAnZnVuY3Rpb24nKSB7XG4gICAgICAgICAgICBjYWNoZWRTZXRUaW1lb3V0ID0gc2V0VGltZW91dDtcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIGNhY2hlZFNldFRpbWVvdXQgPSBkZWZhdWx0U2V0VGltb3V0O1xuICAgICAgICB9XG4gICAgfSBjYXRjaCAoZSkge1xuICAgICAgICBjYWNoZWRTZXRUaW1lb3V0ID0gZGVmYXVsdFNldFRpbW91dDtcbiAgICB9XG4gICAgdHJ5IHtcbiAgICAgICAgaWYgKHR5cGVvZiBjbGVhclRpbWVvdXQgPT09ICdmdW5jdGlvbicpIHtcbiAgICAgICAgICAgIGNhY2hlZENsZWFyVGltZW91dCA9IGNsZWFyVGltZW91dDtcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIGNhY2hlZENsZWFyVGltZW91dCA9IGRlZmF1bHRDbGVhclRpbWVvdXQ7XG4gICAgICAgIH1cbiAgICB9IGNhdGNoIChlKSB7XG4gICAgICAgIGNhY2hlZENsZWFyVGltZW91dCA9IGRlZmF1bHRDbGVhclRpbWVvdXQ7XG4gICAgfVxufSAoKSlcbmZ1bmN0aW9uIHJ1blRpbWVvdXQoZnVuKSB7XG4gICAgaWYgKGNhY2hlZFNldFRpbWVvdXQgPT09IHNldFRpbWVvdXQpIHtcbiAgICAgICAgLy9ub3JtYWwgZW52aXJvbWVudHMgaW4gc2FuZSBzaXR1YXRpb25zXG4gICAgICAgIHJldHVybiBzZXRUaW1lb3V0KGZ1biwgMCk7XG4gICAgfVxuICAgIC8vIGlmIHNldFRpbWVvdXQgd2Fzbid0IGF2YWlsYWJsZSBidXQgd2FzIGxhdHRlciBkZWZpbmVkXG4gICAgaWYgKChjYWNoZWRTZXRUaW1lb3V0ID09PSBkZWZhdWx0U2V0VGltb3V0IHx8ICFjYWNoZWRTZXRUaW1lb3V0KSAmJiBzZXRUaW1lb3V0KSB7XG4gICAgICAgIGNhY2hlZFNldFRpbWVvdXQgPSBzZXRUaW1lb3V0O1xuICAgICAgICByZXR1cm4gc2V0VGltZW91dChmdW4sIDApO1xuICAgIH1cbiAgICB0cnkge1xuICAgICAgICAvLyB3aGVuIHdoZW4gc29tZWJvZHkgaGFzIHNjcmV3ZWQgd2l0aCBzZXRUaW1lb3V0IGJ1dCBubyBJLkUuIG1hZGRuZXNzXG4gICAgICAgIHJldHVybiBjYWNoZWRTZXRUaW1lb3V0KGZ1biwgMCk7XG4gICAgfSBjYXRjaChlKXtcbiAgICAgICAgdHJ5IHtcbiAgICAgICAgICAgIC8vIFdoZW4gd2UgYXJlIGluIEkuRS4gYnV0IHRoZSBzY3JpcHQgaGFzIGJlZW4gZXZhbGVkIHNvIEkuRS4gZG9lc24ndCB0cnVzdCB0aGUgZ2xvYmFsIG9iamVjdCB3aGVuIGNhbGxlZCBub3JtYWxseVxuICAgICAgICAgICAgcmV0dXJuIGNhY2hlZFNldFRpbWVvdXQuY2FsbChudWxsLCBmdW4sIDApO1xuICAgICAgICB9IGNhdGNoKGUpe1xuICAgICAgICAgICAgLy8gc2FtZSBhcyBhYm92ZSBidXQgd2hlbiBpdCdzIGEgdmVyc2lvbiBvZiBJLkUuIHRoYXQgbXVzdCBoYXZlIHRoZSBnbG9iYWwgb2JqZWN0IGZvciAndGhpcycsIGhvcGZ1bGx5IG91ciBjb250ZXh0IGNvcnJlY3Qgb3RoZXJ3aXNlIGl0IHdpbGwgdGhyb3cgYSBnbG9iYWwgZXJyb3JcbiAgICAgICAgICAgIHJldHVybiBjYWNoZWRTZXRUaW1lb3V0LmNhbGwodGhpcywgZnVuLCAwKTtcbiAgICAgICAgfVxuICAgIH1cblxuXG59XG5mdW5jdGlvbiBydW5DbGVhclRpbWVvdXQobWFya2VyKSB7XG4gICAgaWYgKGNhY2hlZENsZWFyVGltZW91dCA9PT0gY2xlYXJUaW1lb3V0KSB7XG4gICAgICAgIC8vbm9ybWFsIGVudmlyb21lbnRzIGluIHNhbmUgc2l0dWF0aW9uc1xuICAgICAgICByZXR1cm4gY2xlYXJUaW1lb3V0KG1hcmtlcik7XG4gICAgfVxuICAgIC8vIGlmIGNsZWFyVGltZW91dCB3YXNuJ3QgYXZhaWxhYmxlIGJ1dCB3YXMgbGF0dGVyIGRlZmluZWRcbiAgICBpZiAoKGNhY2hlZENsZWFyVGltZW91dCA9PT0gZGVmYXVsdENsZWFyVGltZW91dCB8fCAhY2FjaGVkQ2xlYXJUaW1lb3V0KSAmJiBjbGVhclRpbWVvdXQpIHtcbiAgICAgICAgY2FjaGVkQ2xlYXJUaW1lb3V0ID0gY2xlYXJUaW1lb3V0O1xuICAgICAgICByZXR1cm4gY2xlYXJUaW1lb3V0KG1hcmtlcik7XG4gICAgfVxuICAgIHRyeSB7XG4gICAgICAgIC8vIHdoZW4gd2hlbiBzb21lYm9keSBoYXMgc2NyZXdlZCB3aXRoIHNldFRpbWVvdXQgYnV0IG5vIEkuRS4gbWFkZG5lc3NcbiAgICAgICAgcmV0dXJuIGNhY2hlZENsZWFyVGltZW91dChtYXJrZXIpO1xuICAgIH0gY2F0Y2ggKGUpe1xuICAgICAgICB0cnkge1xuICAgICAgICAgICAgLy8gV2hlbiB3ZSBhcmUgaW4gSS5FLiBidXQgdGhlIHNjcmlwdCBoYXMgYmVlbiBldmFsZWQgc28gSS5FLiBkb2Vzbid0ICB0cnVzdCB0aGUgZ2xvYmFsIG9iamVjdCB3aGVuIGNhbGxlZCBub3JtYWxseVxuICAgICAgICAgICAgcmV0dXJuIGNhY2hlZENsZWFyVGltZW91dC5jYWxsKG51bGwsIG1hcmtlcik7XG4gICAgICAgIH0gY2F0Y2ggKGUpe1xuICAgICAgICAgICAgLy8gc2FtZSBhcyBhYm92ZSBidXQgd2hlbiBpdCdzIGEgdmVyc2lvbiBvZiBJLkUuIHRoYXQgbXVzdCBoYXZlIHRoZSBnbG9iYWwgb2JqZWN0IGZvciAndGhpcycsIGhvcGZ1bGx5IG91ciBjb250ZXh0IGNvcnJlY3Qgb3RoZXJ3aXNlIGl0IHdpbGwgdGhyb3cgYSBnbG9iYWwgZXJyb3IuXG4gICAgICAgICAgICAvLyBTb21lIHZlcnNpb25zIG9mIEkuRS4gaGF2ZSBkaWZmZXJlbnQgcnVsZXMgZm9yIGNsZWFyVGltZW91dCB2cyBzZXRUaW1lb3V0XG4gICAgICAgICAgICByZXR1cm4gY2FjaGVkQ2xlYXJUaW1lb3V0LmNhbGwodGhpcywgbWFya2VyKTtcbiAgICAgICAgfVxuICAgIH1cblxuXG5cbn1cbnZhciBxdWV1ZSA9IFtdO1xudmFyIGRyYWluaW5nID0gZmFsc2U7XG52YXIgY3VycmVudFF1ZXVlO1xudmFyIHF1ZXVlSW5kZXggPSAtMTtcblxuZnVuY3Rpb24gY2xlYW5VcE5leHRUaWNrKCkge1xuICAgIGlmICghZHJhaW5pbmcgfHwgIWN1cnJlbnRRdWV1ZSkge1xuICAgICAgICByZXR1cm47XG4gICAgfVxuICAgIGRyYWluaW5nID0gZmFsc2U7XG4gICAgaWYgKGN1cnJlbnRRdWV1ZS5sZW5ndGgpIHtcbiAgICAgICAgcXVldWUgPSBjdXJyZW50UXVldWUuY29uY2F0KHF1ZXVlKTtcbiAgICB9IGVsc2Uge1xuICAgICAgICBxdWV1ZUluZGV4ID0gLTE7XG4gICAgfVxuICAgIGlmIChxdWV1ZS5sZW5ndGgpIHtcbiAgICAgICAgZHJhaW5RdWV1ZSgpO1xuICAgIH1cbn1cblxuZnVuY3Rpb24gZHJhaW5RdWV1ZSgpIHtcbiAgICBpZiAoZHJhaW5pbmcpIHtcbiAgICAgICAgcmV0dXJuO1xuICAgIH1cbiAgICB2YXIgdGltZW91dCA9IHJ1blRpbWVvdXQoY2xlYW5VcE5leHRUaWNrKTtcbiAgICBkcmFpbmluZyA9IHRydWU7XG5cbiAgICB2YXIgbGVuID0gcXVldWUubGVuZ3RoO1xuICAgIHdoaWxlKGxlbikge1xuICAgICAgICBjdXJyZW50UXVldWUgPSBxdWV1ZTtcbiAgICAgICAgcXVldWUgPSBbXTtcbiAgICAgICAgd2hpbGUgKCsrcXVldWVJbmRleCA8IGxlbikge1xuICAgICAgICAgICAgaWYgKGN1cnJlbnRRdWV1ZSkge1xuICAgICAgICAgICAgICAgIGN1cnJlbnRRdWV1ZVtxdWV1ZUluZGV4XS5ydW4oKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgICBxdWV1ZUluZGV4ID0gLTE7XG4gICAgICAgIGxlbiA9IHF1ZXVlLmxlbmd0aDtcbiAgICB9XG4gICAgY3VycmVudFF1ZXVlID0gbnVsbDtcbiAgICBkcmFpbmluZyA9IGZhbHNlO1xuICAgIHJ1bkNsZWFyVGltZW91dCh0aW1lb3V0KTtcbn1cblxucHJvY2Vzcy5uZXh0VGljayA9IGZ1bmN0aW9uIChmdW4pIHtcbiAgICB2YXIgYXJncyA9IG5ldyBBcnJheShhcmd1bWVudHMubGVuZ3RoIC0gMSk7XG4gICAgaWYgKGFyZ3VtZW50cy5sZW5ndGggPiAxKSB7XG4gICAgICAgIGZvciAodmFyIGkgPSAxOyBpIDwgYXJndW1lbnRzLmxlbmd0aDsgaSsrKSB7XG4gICAgICAgICAgICBhcmdzW2kgLSAxXSA9IGFyZ3VtZW50c1tpXTtcbiAgICAgICAgfVxuICAgIH1cbiAgICBxdWV1ZS5wdXNoKG5ldyBJdGVtKGZ1biwgYXJncykpO1xuICAgIGlmIChxdWV1ZS5sZW5ndGggPT09IDEgJiYgIWRyYWluaW5nKSB7XG4gICAgICAgIHJ1blRpbWVvdXQoZHJhaW5RdWV1ZSk7XG4gICAgfVxufTtcblxuLy8gdjggbGlrZXMgcHJlZGljdGlibGUgb2JqZWN0c1xuZnVuY3Rpb24gSXRlbShmdW4sIGFycmF5KSB7XG4gICAgdGhpcy5mdW4gPSBmdW47XG4gICAgdGhpcy5hcnJheSA9IGFycmF5O1xufVxuSXRlbS5wcm90b3R5cGUucnVuID0gZnVuY3Rpb24gKCkge1xuICAgIHRoaXMuZnVuLmFwcGx5KG51bGwsIHRoaXMuYXJyYXkpO1xufTtcbnByb2Nlc3MudGl0bGUgPSAnYnJvd3Nlcic7XG5wcm9jZXNzLmJyb3dzZXIgPSB0cnVlO1xucHJvY2Vzcy5lbnYgPSB7fTtcbnByb2Nlc3MuYXJndiA9IFtdO1xucHJvY2Vzcy52ZXJzaW9uID0gJyc7IC8vIGVtcHR5IHN0cmluZyB0byBhdm9pZCByZWdleHAgaXNzdWVzXG5wcm9jZXNzLnZlcnNpb25zID0ge307XG5cbmZ1bmN0aW9uIG5vb3AoKSB7fVxuXG5wcm9jZXNzLm9uID0gbm9vcDtcbnByb2Nlc3MuYWRkTGlzdGVuZXIgPSBub29wO1xucHJvY2Vzcy5vbmNlID0gbm9vcDtcbnByb2Nlc3Mub2ZmID0gbm9vcDtcbnByb2Nlc3MucmVtb3ZlTGlzdGVuZXIgPSBub29wO1xucHJvY2Vzcy5yZW1vdmVBbGxMaXN0ZW5lcnMgPSBub29wO1xucHJvY2Vzcy5lbWl0ID0gbm9vcDtcbnByb2Nlc3MucHJlcGVuZExpc3RlbmVyID0gbm9vcDtcbnByb2Nlc3MucHJlcGVuZE9uY2VMaXN0ZW5lciA9IG5vb3A7XG5cbnByb2Nlc3MubGlzdGVuZXJzID0gZnVuY3Rpb24gKG5hbWUpIHsgcmV0dXJuIFtdIH1cblxucHJvY2Vzcy5iaW5kaW5nID0gZnVuY3Rpb24gKG5hbWUpIHtcbiAgICB0aHJvdyBuZXcgRXJyb3IoJ3Byb2Nlc3MuYmluZGluZyBpcyBub3Qgc3VwcG9ydGVkJyk7XG59O1xuXG5wcm9jZXNzLmN3ZCA9IGZ1bmN0aW9uICgpIHsgcmV0dXJuICcvJyB9O1xucHJvY2Vzcy5jaGRpciA9IGZ1bmN0aW9uIChkaXIpIHtcbiAgICB0aHJvdyBuZXcgRXJyb3IoJ3Byb2Nlc3MuY2hkaXIgaXMgbm90IHN1cHBvcnRlZCcpO1xufTtcbnByb2Nlc3MudW1hc2sgPSBmdW5jdGlvbigpIHsgcmV0dXJuIDA7IH07XG4iLCIvKiBnbG9iYWwgZXhwb3J0cyAqL1xuLyoqXG4gKiBAZmlsZW92ZXJ2aWV3IGEgdGlueSBsaWJyYXJ5IGZvciBXZWIgV29ya2VyIFJlbW90ZSBNZXRob2QgSW52b2NhdGlvblxuICpcbiAqL1xuY29uc3QgT2JqZWN0SUQgPSByZXF1aXJlKCdic29uLW9iamVjdGlkJyk7XG5cbi8qKlxuICogQHByaXZhdGUgcmV0dXJucyBhIGxpc3Qgb2YgVHJhbnNmZXJhYmxlIG9iamVjdHMgd2hpY2gge0Bjb2RlIG9ian0gaW5jbHVkZXNcbiAqIEBwYXJhbSB7b2JqZWN0fSBvYmogYW55IG9iamVjdFxuICogQHBhcmFtIHtBcnJheX0gbGlzdCBmb3IgaW50ZXJuYWwgcmVjdXJzaW9uIG9ubHlcbiAqIEByZXR1cm4ge0xpc3R9IGEgbGlzdCBvZiBUcmFuc2ZlcmFibGUgb2JqZWN0c1xuICovXG5mdW5jdGlvbiBnZXRUcmFuc2Zlckxpc3Qob2JqLCBsaXN0ID0gW10pIHtcbiAgICBpZiAoQXJyYXlCdWZmZXIuaXNWaWV3KG9iaikpIHtcbiAgICAgICAgbGlzdC5wdXNoKG9iai5idWZmZXIpO1xuICAgICAgICByZXR1cm4gbGlzdDtcbiAgICB9XG4gICAgaWYgKGlzVHJhbnNmZXJhYmxlKG9iaikpIHtcbiAgICAgICAgbGlzdC5wdXNoKG9iaik7XG4gICAgICAgIHJldHVybiBsaXN0O1xuICAgIH1cbiAgICBpZiAoISh0eXBlb2Ygb2JqID09PSAnb2JqZWN0JykpIHtcbiAgICAgICAgcmV0dXJuIGxpc3Q7XG4gICAgfVxuICAgIGZvciAoY29uc3QgcHJvcCBpbiBvYmopIHtcbiAgICAgICAgaWYgKG9iai5oYXNPd25Qcm9wZXJ0eShwcm9wKSkge1xuICAgICAgICAgICAgZ2V0VHJhbnNmZXJMaXN0KG9ialtwcm9wXSwgbGlzdCk7XG4gICAgICAgIH1cbiAgICB9XG4gICAgcmV0dXJuIGxpc3Q7XG59XG5cbi8qKlxuICogQHByaXZhdGUgY2hlY2tzIGlmIHtAY29kZSBvYmp9IGlzIFRyYW5zZmVyYWJsZSBvciBub3QuXG4gKiBAcGFyYW0ge29iamVjdH0gb2JqIGFueSBvYmplY3RcbiAqIEByZXR1cm4ge2Jvb2xlYW59XG4gKi9cbmZ1bmN0aW9uIGlzVHJhbnNmZXJhYmxlKG9iaikge1xuICAgIGNvbnN0IHRyYW5zZmVyYWJsZSA9IFtBcnJheUJ1ZmZlcl07XG4gICAgaWYgKHR5cGVvZiBNZXNzYWdlUG9ydCAhPT0gJ3VuZGVmaW5lZCcpIHtcbiAgICAgICAgdHJhbnNmZXJhYmxlLnB1c2goTWVzc2FnZVBvcnQpO1xuICAgIH1cbiAgICBpZiAodHlwZW9mIEltYWdlQml0bWFwICE9PSAndW5kZWZpbmVkJykge1xuICAgICAgICB0cmFuc2ZlcmFibGUucHVzaChJbWFnZUJpdG1hcCk7XG4gICAgfVxuICAgIHJldHVybiB0cmFuc2ZlcmFibGUuc29tZShlID0+IG9iaiBpbnN0YW5jZW9mIGUpO1xufVxuXG4vKipcbiAqIEBjbGFzcyBiYXNlIGNsYXNzIHdob3NlIGNoaWxkIGNsYXNzZXMgdXNlIFJNSVxuICovXG5jbGFzcyBXb3JrZXJSTUkge1xuICAgIC8qKlxuICAgICAqIEBjb25zdHJ1Y3RvclxuICAgICAqIEBwYXJhbSB7b2JqZWN0fSByZW1vdGUgYW4gaW5zdGFuY2UgdG8gY2FsbCBwb3N0TWVzc2FnZSBtZXRob2RcbiAgICAgKiBAcGFyYW0ge0FycmF5fSBhcmdzIGFyZ3VtZW50cyB0byBiZSBwYXNzZWQgdG8gc2VydmVyLXNpZGUgaW5zdGFuY2VcbiAgICAgKi9cbiAgICBjb25zdHJ1Y3RvcihyZW1vdGUsIC4uLmFyZ3MpIHtcbiAgICAgICAgdGhpcy5yZW1vdGUgPSByZW1vdGU7XG4gICAgICAgIHRoaXMuaWQgPSBPYmplY3RJRCgpLnRvU3RyaW5nKCk7XG4gICAgICAgIHRoaXMubWV0aG9kU3RhdGVzID0ge307XG4gICAgICAgIHRoaXMucmVtb3RlLmFkZEV2ZW50TGlzdGVuZXIoJ21lc3NhZ2UnLCBldmVudCA9PiB7XG4gICAgICAgICAgICBjb25zdCBkYXRhID0gZXZlbnQuZGF0YTtcbiAgICAgICAgICAgIGlmIChkYXRhLmlkID09PSB0aGlzLmlkKSB7XG4gICAgICAgICAgICAgICAgdGhpcy5yZXR1cm5IYW5kbGVyKGRhdGEpO1xuICAgICAgICAgICAgfVxuICAgICAgICB9LCBmYWxzZSk7XG4gICAgICAgIHRoaXMuY29uc3RydWN0b3JQcm9taXNlID0gdGhpcy5pbnZva2VSTSh0aGlzLmNvbnN0cnVjdG9yLm5hbWUsIGFyZ3MpO1xuICAgIH1cblxuICAgIC8qKlxuICAgICAqIGludm9rZXMgcmVtb3RlIG1ldGhvZFxuICAgICAqIEBwYXJhbSB7c3RyaW5nfSBtZXRob2ROYW1lIE1ldGhvZCBuYW1lXG4gICAgICogQHBhcmFtIHtBcnJheX0gYXJncyBhcmd1bWVudHMgdG8gYmUgcGFzc2VkIHRvIHNlcnZlci1zaWRlIGluc3RhbmNlXG4gICAgICogQHJldHVybiB7UHJvbWlzZX1cbiAgICAgKi9cbiAgICBpbnZva2VSTShtZXRob2ROYW1lLCBhcmdzID0gW10pIHtcbiAgICAgICAgaWYgKCF0aGlzLm1ldGhvZFN0YXRlc1ttZXRob2ROYW1lXSkge1xuICAgICAgICAgICAgdGhpcy5tZXRob2RTdGF0ZXNbbWV0aG9kTmFtZV0gPSB7XG4gICAgICAgICAgICAgICAgbnVtOiAwLFxuICAgICAgICAgICAgICAgIHJlc29sdmVSZWplY3RzOiB7fVxuICAgICAgICAgICAgfTtcbiAgICAgICAgfVxuICAgICAgICByZXR1cm4gbmV3IFByb21pc2UoKHJlc29sdmUsIHJlamVjdCkgPT4ge1xuICAgICAgICAgICAgY29uc3QgbWV0aG9kU3RhdGUgPSB0aGlzLm1ldGhvZFN0YXRlc1ttZXRob2ROYW1lXTtcbiAgICAgICAgICAgIG1ldGhvZFN0YXRlLm51bSArPSAxO1xuICAgICAgICAgICAgbWV0aG9kU3RhdGUucmVzb2x2ZVJlamVjdHNbbWV0aG9kU3RhdGUubnVtXSA9IHsgcmVzb2x2ZSwgcmVqZWN0IH07XG4gICAgICAgICAgICB0aGlzLnJlbW90ZS5wb3N0TWVzc2FnZSh7XG4gICAgICAgICAgICAgICAgaWQ6IHRoaXMuaWQsXG4gICAgICAgICAgICAgICAgbWV0aG9kTmFtZSxcbiAgICAgICAgICAgICAgICBudW06IG1ldGhvZFN0YXRlLm51bSxcbiAgICAgICAgICAgICAgICBhcmdzXG4gICAgICAgICAgICB9LCBnZXRUcmFuc2Zlckxpc3QoYXJncykpO1xuICAgICAgICB9KTtcbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBAcHJpdmF0ZSBoYW5kbGVzIGNvcnJlc3BvbmRlbnQgJ21lc3NhZ2UnIGV2ZW50XG4gICAgICogQHBhcmFtIHtvYmp9IGRhdGEgZGF0YSBwcm9wZXJ0eSBvZiAnbWVzc2FnZScgZXZlbnRcbiAgICAgKi9cbiAgICByZXR1cm5IYW5kbGVyKGRhdGEpIHtcbiAgICAgICAgY29uc3QgcmVzb2x2ZVJlamVjdHMgPSB0aGlzLm1ldGhvZFN0YXRlc1tkYXRhLm1ldGhvZE5hbWVdLnJlc29sdmVSZWplY3RzO1xuICAgICAgICBpZiAoZGF0YS5lcnJvcikge1xuICAgICAgICAgICAgcmVzb2x2ZVJlamVjdHNbZGF0YS5udW1dLnJlamVjdChkYXRhLmVycm9yKTtcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIHJlc29sdmVSZWplY3RzW2RhdGEubnVtXS5yZXNvbHZlKGRhdGEucmVzdWx0KTtcbiAgICAgICAgfVxuICAgICAgICBkZWxldGUgcmVzb2x2ZVJlamVjdHNbZGF0YS5udW1dO1xuICAgIH1cbn1cblxuXG4vKipcbiAqIEBwcml2YXRlIGV4ZWN1dGVzIGEgbWV0aG9kIG9uIHNlcnZlciBhbmQgcG9zdCBhIHJlc3VsdCBhcyBtZXNzYWdlLlxuICogQHBhcmFtIHtvYmp9IGV2ZW50ICdtZXNzYWdlJyBldmVudFxuICovXG5hc3luYyBmdW5jdGlvbiBoYW5kbGVXb3JrZXJSTUkoZXZlbnQpIHtcbiAgICBjb25zdCBkYXRhID0gZXZlbnQuZGF0YTtcbiAgICBjb25zdCBtZXNzYWdlID0ge1xuICAgICAgICBpZDogZGF0YS5pZCxcbiAgICAgICAgbWV0aG9kTmFtZTogZGF0YS5tZXRob2ROYW1lLFxuICAgICAgICBudW06IGRhdGEubnVtLFxuICAgIH07XG4gICAgbGV0IHJlc3VsdDtcbiAgICBpZiAoZGF0YS5tZXRob2ROYW1lID09PSB0aGlzLm5hbWUpIHtcbiAgICAgICAgdGhpcy53b3JrZXJSTUkuaW5zdGFuY2VzW2RhdGEuaWRdID0gbmV3IHRoaXMoLi4uZGF0YS5hcmdzKTtcbiAgICAgICAgbWVzc2FnZS5yZXN1bHQgPSBudWxsO1xuICAgICAgICB0aGlzLndvcmtlclJNSS50YXJnZXQucG9zdE1lc3NhZ2UobWVzc2FnZSwgZ2V0VHJhbnNmZXJMaXN0KHJlc3VsdCkpO1xuICAgIH0gZWxzZSB7XG4gICAgICAgIGNvbnN0IGluc3RhbmNlID0gdGhpcy53b3JrZXJSTUkuaW5zdGFuY2VzW2RhdGEuaWRdO1xuICAgICAgICBpZiAoaW5zdGFuY2UpIHtcbiAgICAgICAgICAgIHRyeSB7XG4gICAgICAgICAgICAgICAgcmVzdWx0ID0gYXdhaXQgaW5zdGFuY2VbZGF0YS5tZXRob2ROYW1lXS5hcHBseShpbnN0YW5jZSwgZGF0YS5hcmdzKVxuICAgICAgICAgICAgICAgIG1lc3NhZ2UucmVzdWx0ID0gcmVzdWx0O1xuICAgICAgICAgICAgICAgIHRoaXMud29ya2VyUk1JLnRhcmdldC5wb3N0TWVzc2FnZShtZXNzYWdlLCBnZXRUcmFuc2Zlckxpc3QocmVzdWx0KSk7XG4gICAgICAgICAgICB9IGNhdGNoIChlKSB7XG4gICAgICAgICAgICAgICAgbWVzc2FnZS5lcnJvciA9IGUudG9TdHJpbmcoKTtcbiAgICAgICAgICAgICAgICB0aGlzLndvcmtlclJNSS50YXJnZXQucG9zdE1lc3NhZ2UobWVzc2FnZSk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICB9XG59XG5cbi8qKlxuICogcmVnaXN0ZXJzIGEgY2xhc3MgYXMgYW4gZXhlY3V0ZXIgb2YgUk1JIG9uIHNlcnZlclxuICogQHBhcmFtIHtvYmp9IHRhcmdldCBhbiBpbnN0YW5jZSB0aGF0IHJlY2VpdmVzICdtZXNzYWdlJyBldmVudHMgb2YgUk1JXG4gKiBAcGFyYW0ge0NsYXNzfSBrbGFzcyBhIGNsYXNzIHRvIGJlIHJlZ2lzdGVyZWRcbiAqL1xuZnVuY3Rpb24gcmVzaWd0ZXJXb3JrZXJSTUkodGFyZ2V0LCBrbGFzcykge1xuICAgIGtsYXNzLndvcmtlclJNSSA9IHtcbiAgICAgICAgdGFyZ2V0LFxuICAgICAgICBpbnN0YW5jZXM6IHt9LFxuICAgICAgICBoYW5kbGVyOiBoYW5kbGVXb3JrZXJSTUkuYmluZChrbGFzcylcbiAgICB9XG4gICAgdGFyZ2V0LmFkZEV2ZW50TGlzdGVuZXIoJ21lc3NhZ2UnLCBrbGFzcy53b3JrZXJSTUkuaGFuZGxlcik7XG59XG5cbi8qKlxuICogdW5yZXNpZ3RlcnMgYSBjbGFzcyByZWdpc3RlcmVkIGJ5IHJlZ2lzdGVyV29ya2VyUk1JXG4gKiBAcGFyYW0ge29ian0gdGFyZ2V0IGFuIGluc3RhbmNlIHRoYXQgcmVjZWl2ZXMgJ21lc3NhZ2UnIGV2ZW50cyBvZiBSTUlcbiAqIEBwYXJhbSB7Q2xhc3N9IGtsYXNzIGEgY2xhc3MgdG8gYmUgdW5yZWdpc3RlcmVkXG4gKi9cbmZ1bmN0aW9uIHVucmVzaWd0ZXJXb3JrZXJSTUkodGFyZ2V0LCBrbGFzcykge1xuICAgIHRhcmdldC5yZW1vdmVFdmVudExpc3RlbmVyKCdtZXNzYWdlJywga2xhc3Mud29ya2VyUk1JLmhhbmRsZXIpXG4gICAgZGVsZXRlIGtsYXNzLndvcmtlclJNSTtcbn1cblxuZXhwb3J0cy5Xb3JrZXJSTUkgPSBXb3JrZXJSTUk7XG5leHBvcnRzLnJlc2lndGVyV29ya2VyUk1JID0gcmVzaWd0ZXJXb3JrZXJSTUk7XG5leHBvcnRzLnVucmVzaWd0ZXJXb3JrZXJSTUkgPSB1bnJlc2lndGVyV29ya2VyUk1JO1xuIiwiJ3VzZSBzdHJpY3QnO1xuXG5PYmplY3QuZGVmaW5lUHJvcGVydHkoZXhwb3J0cywgXCJfX2VzTW9kdWxlXCIsIHtcbiAgICB2YWx1ZTogdHJ1ZVxufSk7XG5leHBvcnRzLkFaanNFbmdpbmUgPSB1bmRlZmluZWQ7XG5cbnZhciBfbmV1cmFsX25ldHdvcmtfY2xpZW50ID0gcmVxdWlyZSgnLi9uZXVyYWxfbmV0d29ya19jbGllbnQuanMnKTtcblxudmFyIF9ib2FyZF9jb25zdGFudHMgPSByZXF1aXJlKCcuL2JvYXJkX2NvbnN0YW50cy5qcycpO1xuXG52YXIgX2JvYXJkID0gcmVxdWlyZSgnLi9ib2FyZC5qcycpO1xuXG52YXIgX21jdHMgPSByZXF1aXJlKCcuL21jdHMuanMnKTtcblxuLyoqXG4gKiDlr77lsYDjgpLooYzjgYbmgJ3ogIPjgqjjg7Pjgrjjg7Pjgq/jg6njgrnjgafjgZnjgIJcbiAqIOOCpuOCp+ODluODr+ODvOOCq+OBp+WLleOBi+OBmeOBk+OBqOOCkuWJjeaPkOOBq+OAgeODoeOCpOODs+OCueODrOODg+ODieOBruOCouODl+ODquOBqE5ldXJhbE5ldHdvcmvjga4y44Gk44Go6YCa5L+h44GX44Gq44GM44KJTUNUU+OCkuWun+ihjOOBl+OBvuOBmeOAglxuICovXG4vKipcbiAqIEBmaWxlIOWvvuWxgOOCkuihjOOBhuaAneiAg+OCqOODs+OCuOODs+OCr+ODqeOCuUFaanNFbmdpbmXjga7jgrPjg7zjg4njgafjgZnjgIJcbiAqIOOCpuOCp+ODluODr+ODvOOCq+OBp+WLleOBi+OBmeOBk+OBqOOCkuWJjeaPkOOBq+OAgeODoeOCpOODs+OCueODrOODg+ODieOBruOCouODl+ODquOBqE5ldXJhbE5ldHdvcmvjga4y44Gk44Go6YCa5L+h44GX44Gq44GM44KJ44Oi44Oz44OG44Kr44Or44Ot44OE44Oq44O85o6i57Si44KS5a6f6KGM44GX44G+44GZ44CCXG4gKi9cbi8qXG4gKiBAYXV0aG9yIOW4guW3nembhOS6jFxuICogQGNvcHlyaWdodCAyMDE4IElDSElLQVdBLCBZdWppIChOZXcgMyBScylcbiAqL1xuLy8g44Oh44Kk44Oz44K544Os44OD44OJ44Gn5YuV44GL44GZ5aC05ZCI44CB5Lul5LiL44GuaW1wb3J044KSJy4vbmV1cmFsX25ldHdvcmsuanMn44Gr5aSJ44GI44G+44GZ44CCXG5jbGFzcyBBWmpzRW5naW5lIHtcbiAgICAvKipcbiAgICAgKiBAcGFyYW0ge0ludGVnZXJ9IHNpemUg56KB55uk44K144Kk44K6XG4gICAgICogQHBhcmFtIHtudW1iZXJ9IGtvbWkg44Kz44OfXG4gICAgICovXG4gICAgY29uc3RydWN0b3Ioc2l6ZSA9IDE5LCBrb21pID0gNykge1xuICAgICAgICB0aGlzLmIgPSBuZXcgX2JvYXJkLkJvYXJkKG5ldyBfYm9hcmRfY29uc3RhbnRzLkJvYXJkQ29uc3RhbnRzKHNpemUpLCBrb21pKTtcbiAgICAgICAgdGhpcy5ubiA9IG5ldyBfbmV1cmFsX25ldHdvcmtfY2xpZW50Lk5ldXJhbE5ldHdvcmsoc2VsZik7XG4gICAgICAgIHRoaXMubWN0cyA9IG5ldyBfbWN0cy5NQ1RTKHRoaXMubm4sIHRoaXMuYi5DKTtcbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiDjg4vjg6Xjg7zjg6njg6vjg43jg4Pjg4jjg6/jg7zjgq/jga7jgqbjgqfjgqTjg4jjgpLjg63jg7zjg4njgZfjgb7jgZnjgIJcbiAgICAgKi9cbiAgICBhc3luYyBsb2FkTk4oKSB7XG4gICAgICAgIGxldCBhcmdzO1xuICAgICAgICBzd2l0Y2ggKHRoaXMuYi5DLkJTSVpFKSB7XG4gICAgICAgICAgICBjYXNlIDk6XG4gICAgICAgICAgICAgICAgYXJncyA9IFsnaHR0cHM6Ly9zdG9yYWdlLmdvb2dsZWFwaXMuY29tL21pbWlha2Etc3RvcmFnZS9MZWVsYVplcm85J107XG4gICAgICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgICAgICBjYXNlIDE5OlxuICAgICAgICAgICAgICAgIGFyZ3MgPSBbJ2h0dHBzOi8vc3RvcmFnZS5nb29nbGVhcGlzLmNvbS9taW1pYWthLXN0b3JhZ2UvRUxGX09wZW5HbycsIDJdO1xuICAgICAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICAgICAgZGVmYXVsdDpcbiAgICAgICAgICAgICAgICB0aHJvdyBuZXcgRXJyb3IoJ3NpemUgaXMgbm90IHN1cHBvcnRlZCcpO1xuICAgICAgICB9XG4gICAgICAgIGF3YWl0IHRoaXMubm4uaW52b2tlUk0oJ2xvYWQnLCBhcmdzKTtcbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiDlhoXpg6jnirbmhYvjgpLjgq/jg6rjgqLjgZfjgb7jgZnjgIJcbiAgICAgKiDmlLnjgoHjgabliJ3miYvjgYvjgonlr77lsYDlj6/og73jgavjgarjgorjgb7jgZnjgIJcbiAgICAgKi9cbiAgICBjbGVhcigpIHtcbiAgICAgICAgdGhpcy5iLnJlc2V0KCk7XG4gICAgICAgIHRoaXMubWN0cy5jbGVhcigpO1xuICAgIH1cblxuICAgIC8qKlxuICAgICAqIOaMgeOBoeaZgumWk+OCkuioreWumuOBl+OBvuOBmeOAglxuICAgICAqIEBwYXJhbSB7bnVtYmVyfSBtYWluVGltZSDnp5JcbiAgICAgKiBAcGFyYW0ge251bWJlcn0gYnlveW9taSDnp5JcbiAgICAgKi9cbiAgICB0aW1lU2V0dGluZ3MobWFpblRpbWUsIGJ5b3lvbWkpIHtcbiAgICAgICAgdGhpcy5tY3RzLnNldFRpbWUobWFpblRpbWUsIGJ5b3lvbWkpO1xuICAgIH1cblxuICAgIC8qKlxuICAgICAqIOasoeOBruaJi+OCkui/lOOBl+OBvuOBmeOAgueKtuazgeOBq+W/nOOBmOOBpuaKleS6huOBl+OBvuOBmeOAglxuICAgICAqIOaIu+OCiuWApFt4LCB5XeOBr+W3puS4iuOBjDEt44Kq44Oq44K444Oz44GuMuasoeWFg+W6p+aomeOBp+OBmeOAguOCguOBl+OBj+OBrydyZXNnaW4n44G+44Gf44GvJ3Bhc3Mn44KS6L+U44GX44G+44GZ44CCXG4gICAgICog5YaF6YOo44Gn5L+d5oyB44GX44Gm44GE44KL5bGA6Z2i44KC6YCy44KB44G+44GZ44CCXG4gICAgICogQHJldHVybnMge0ludGVnZXJbXXxzdHJpbmd9XG4gICAgICovXG4gICAgYXN5bmMgZ2VubW92ZSgpIHtcbiAgICAgICAgdHJ5IHtcbiAgICAgICAgICAgIGNvbnN0IFttb3ZlLCB3aW5SYXRlXSA9IGF3YWl0IHRoaXMuc2VhcmNoKCk7XG4gICAgICAgICAgICBpZiAod2luUmF0ZSA8IDAuMDUpIHtcbiAgICAgICAgICAgICAgICByZXR1cm4gJ3Jlc2lnbic7XG4gICAgICAgICAgICB9IGVsc2UgaWYgKG1vdmUgPT09IHRoaXMuYi5DLlBBU1MgfHwgdGhpcy5iLnN0YXRlW21vdmVdID09PSB0aGlzLmIuQy5FTVBUWSkge1xuICAgICAgICAgICAgICAgIHRoaXMuYi5wbGF5KG1vdmUsIHRydWUpO1xuICAgICAgICAgICAgICAgIHJldHVybiBtb3ZlID09PSB0aGlzLmIuQy5QQVNTID8gJ3Bhc3MnIDogdGhpcy5iLkMuZXYyeHkobW92ZSk7XG4gICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgIGNvbnNvbGUubG9nKCdlcnJvcicpO1xuICAgICAgICAgICAgICAgIGNvbnNvbGUubG9nKCclZCglcykgaXMgbm90IGVtcHR5JywgbW92ZSwgdGhpcy5iLkMuZXYyc3RyKG1vdmUpKTtcbiAgICAgICAgICAgICAgICB0aGlzLmIuc2hvd2JvYXJkKCk7XG4gICAgICAgICAgICAgICAgY29uc29sZS5sb2codGhpcy5iLmNhbmRpZGF0ZXMoKSk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH0gY2F0Y2ggKGUpIHtcbiAgICAgICAgICAgIGNvbnNvbGUuZXJyb3IoZSk7XG4gICAgICAgIH1cbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiDmrKHjga7miYvjgpLmiZPjgaPjgabnj77lsYDpnaLjgpLpgLLjgoHjgb7jgZnjgIJcbiAgICAgKiAoeCwgeSnjga/lt6bkuIrjgYwxLeOCquODquOCuOODs+OBrjLmrKHlhYPluqfmqJnjgafjgZnjgIJcbiAgICAgKiBAcGFyYW0ge0ludGVnZXJ9IHggXG4gICAgICogQHBhcmFtIHtJbnRlZ2VyfSB5IFxuICAgICAqL1xuICAgIHBsYXkoeCwgeSkge1xuICAgICAgICB0aGlzLmIucGxheSh0aGlzLmIuQy54eTJldih4LCB5KSk7XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICog5qyh44Gu5omL44KS44OR44K544GX44Gm54++5bGA6Z2i44KS6YCy44KB44G+44GZ44CCXG4gICAgICovXG4gICAgcGFzcygpIHtcbiAgICAgICAgdGhpcy5iLnBsYXkodGhpcy5iLkMuUEFTUyk7XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogQHByaXZhdGVcbiAgICAgKi9cbiAgICBhc3luYyBzZWFyY2goKSB7XG4gICAgICAgIHJldHVybiBhd2FpdCB0aGlzLm1jdHMuc2VhcmNoKHRoaXMuYiwgMC4wLCBmYWxzZSwgZmFsc2UpO1xuICAgIH1cblxuICAgIC8qKlxuICAgICAqIEBwcml2YXRlXG4gICAgICovXG4gICAgZmluYWxTY29yZSgpIHtcbiAgICAgICAgcmV0dXJuIHRoaXMuYi5maW5hbFNjb3JlKCk7XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICog55u45omL44Gu6ICD5oWu5Lit44Gr5o6i57Si44KS57aZ57aa44GX44G+44GZ44CCXG4gICAgICovXG4gICAgYXN5bmMgcG9uZGVyKCkge1xuICAgICAgICByZXR1cm4gYXdhaXQgdGhpcy5tY3RzLnNlYXJjaCh0aGlzLmIsIEluZmluaXR5LCB0cnVlLCBmYWxzZSk7XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICog5o6i57Si44KS5by35Yi257WC5LqG44GV44Gb44G+44GZ44CCXG4gICAgICog5o6i57Si44OE44Oq44O844Gv5pyJ5Yq544Gq44G+44G+44Gn44GZ44CC5Li744Gr44Od44Oz44OA44Oq44Oz44Kw57WC5LqG44Gr5L2/44GE44G+44GZ44CCXG4gICAgICovXG4gICAgc3RvcCgpIHtcbiAgICAgICAgdGhpcy5tY3RzLnN0b3AoKTtcbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiDjg6HjgqTjg7PmmYLplpPjga7mrovjgormmYLplpPjgpLov5TjgZfjgb7jgZnjgIJcbiAgICAgKiBAcmV0dXJucyB7bnVtYmVyfSDmrovjgorjga7np5LmlbBcbiAgICAgKi9cbiAgICB0aW1lTGVmdCgpIHtcbiAgICAgICAgcmV0dXJuIHRoaXMubWN0cy5sZWZ0VGltZTtcbiAgICB9XG59XG5leHBvcnRzLkFaanNFbmdpbmUgPSBBWmpzRW5naW5lOyIsIid1c2Ugc3RyaWN0JztcblxuT2JqZWN0LmRlZmluZVByb3BlcnR5KGV4cG9ydHMsIFwiX19lc01vZHVsZVwiLCB7XG4gICAgdmFsdWU6IHRydWVcbn0pO1xuZXhwb3J0cy5Cb2FyZCA9IHVuZGVmaW5lZDtcblxudmFyIF91dGlscyA9IHJlcXVpcmUoJy4vdXRpbHMuanMnKTtcblxudmFyIF9zdG9uZV9ncm91cCA9IHJlcXVpcmUoJy4vc3RvbmVfZ3JvdXAuanMnKTtcblxuLy8vIOODi+ODpeODvOODqeODq+ODjeODg+ODiOODr+ODvOOCr+OBuOOBruWFpeWKm+OBq+mWouOBmeOCi+WxpeattOOBrua3seOBleOBp+OBmeOAglxuLyoqXG4gKiBAZmlsZSDnooHnm6Tjgq/jg6njgrnjgafjgZnjgIJcbiAqIOOBk+OBruOCs+ODvOODieOBr1B5YXHjga7np7vmpI3jgrPjg7zjg4njgafjgZnjgIJcbiAqIEBzZWUge0BsaW5rIGh0dHBzOi8vZ2l0aHViLmNvbS95bWdhcS9QeWFxfVxuICovXG4vKlxuICogQGF1dGhvciDluILlt53pm4TkuowgXG4gKiBAY29weXJpZ2h0IDIwMTggSUNISUtBV0EsIFl1amkgKE5ldyAzIFJzKVxuICovXG5jb25zdCBLRUVQX1BSRVZfQ05UID0gNztcblxuLyoqXG4gKiDnooHnm6Tjgq/jg6njgrnjgafjgZnjgIJcbiAqL1xuY2xhc3MgQm9hcmQge1xuICAgIC8qKlxuICAgICAqIEBwYXJhbSB7Qm9hcmRDb25zdGFudHN9IGNvbnN0YW50c1xuICAgICAqIEBwYXJhbSB7bnVtYmVyfSBrb21pIFxuICAgICAqL1xuICAgIGNvbnN0cnVjdG9yKGNvbnN0YW50cywga29taSA9IDcuNSkge1xuICAgICAgICB0aGlzLkMgPSBjb25zdGFudHM7XG4gICAgICAgIHRoaXMua29taSA9IGtvbWk7XG4gICAgICAgIC8qKiDkuqTngrnjga7nirbmhYvphY3liJfjgafjgZnjgILmi6HlvLXnt5rlvaLluqfmqJnjgafjgZnjgIIgKi9cbiAgICAgICAgdGhpcy5zdGF0ZSA9IG5ldyBVaW50OEFycmF5KHRoaXMuQy5FQlZDTlQpO1xuICAgICAgICB0aGlzLnN0YXRlLmZpbGwodGhpcy5DLkVYVEVSSU9SKTtcbiAgICAgICAgdGhpcy5pZCA9IG5ldyBVaW50MTZBcnJheSh0aGlzLkMuRUJWQ05UKTsgLy8g5Lqk54K544Gu6YCjSUTjgafjgZnjgIJcbiAgICAgICAgdGhpcy5uZXh0ID0gbmV3IFVpbnQxNkFycmF5KHRoaXMuQy5FQlZDTlQpOyAvLyDkuqTngrnjgpLlkKvjgoDpgKPjga7mrKHjga7nn7Pjga7luqfmqJnjgafjgZnjgIJcbiAgICAgICAgdGhpcy5zZyA9IFtdOyAvLyDpgKPmg4XloLHjgafjgZnjgIJcbiAgICAgICAgZm9yIChsZXQgaSA9IDA7IGkgPCB0aGlzLkMuRUJWQ05UOyBpKyspIHtcbiAgICAgICAgICAgIHRoaXMuc2cucHVzaChuZXcgX3N0b25lX2dyb3VwLlN0b25lR3JvdXAodGhpcy5DKSk7XG4gICAgICAgIH1cbiAgICAgICAgdGhpcy5wcmV2U3RhdGUgPSBbXTtcbiAgICAgICAgdGhpcy5rbyA9IHRoaXMuQy5WTlVMTDtcbiAgICAgICAgLyoqIOaJi+eVquOBp+OBmeOAgiAqL1xuICAgICAgICB0aGlzLnR1cm4gPSB0aGlzLkMuQkxBQ0s7XG4gICAgICAgIC8qKiDnj77lnKjjga7miYvmlbDjgafjgZnjgIIgKi9cbiAgICAgICAgdGhpcy5tb3ZlTnVtYmVyID0gMDtcbiAgICAgICAgLyoqIOebtOWJjeOBruedgOaJi+OBp+OBmeOAgiAqL1xuICAgICAgICB0aGlzLnByZXZNb3ZlID0gdGhpcy5DLlZOVUxMO1xuICAgICAgICB0aGlzLnJlbW92ZUNudCA9IDA7XG4gICAgICAgIHRoaXMuaGlzdG9yeSA9IFtdO1xuICAgICAgICB0aGlzLnJlc2V0KCk7XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICog54q25oWL44KS5Yid5pyf5YyW44GX44G+44GZ44CCXG4gICAgICovXG4gICAgcmVzZXQoKSB7XG4gICAgICAgIGZvciAobGV0IHggPSAxOyB4IDw9IHRoaXMuQy5CU0laRTsgeCsrKSB7XG4gICAgICAgICAgICBmb3IgKGxldCB5ID0gMTsgeSA8PSB0aGlzLkMuQlNJWkU7IHkrKykge1xuICAgICAgICAgICAgICAgIHRoaXMuc3RhdGVbdGhpcy5DLnh5MmV2KHgsIHkpXSA9IHRoaXMuQy5FTVBUWTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgICBmb3IgKGxldCBpID0gMDsgaSA8IHRoaXMuaWQubGVuZ3RoOyBpKyspIHtcbiAgICAgICAgICAgIHRoaXMuaWRbaV0gPSBpO1xuICAgICAgICB9XG4gICAgICAgIGZvciAobGV0IGkgPSAwOyBpIDwgdGhpcy5uZXh0Lmxlbmd0aDsgaSsrKSB7XG4gICAgICAgICAgICB0aGlzLm5leHRbaV0gPSBpO1xuICAgICAgICB9XG4gICAgICAgIHRoaXMuc2cuZm9yRWFjaChlID0+IHtcbiAgICAgICAgICAgIGUuY2xlYXIoZmFsc2UpO1xuICAgICAgICB9KTtcbiAgICAgICAgdGhpcy5wcmV2U3RhdGUgPSBbXTtcbiAgICAgICAgZm9yIChsZXQgaSA9IDA7IGkgPCBLRUVQX1BSRVZfQ05UOyBpKyspIHtcbiAgICAgICAgICAgIHRoaXMucHJldlN0YXRlLnB1c2godGhpcy5zdGF0ZS5zbGljZSgpKTtcbiAgICAgICAgfVxuICAgICAgICB0aGlzLmtvID0gdGhpcy5DLlZOVUxMO1xuICAgICAgICB0aGlzLnR1cm4gPSB0aGlzLkMuQkxBQ0s7XG4gICAgICAgIHRoaXMubW92ZU51bWJlciA9IDA7XG4gICAgICAgIHRoaXMucHJldk1vdmUgPSB0aGlzLkMuVk5VTEw7XG4gICAgICAgIHRoaXMucmVtb3ZlQ250ID0gMDtcbiAgICAgICAgdGhpcy5oaXN0b3J5ID0gW107XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogZGVzdOOBq+eKtuaFi+OCkuOCs+ODlOODvOOBl+OBvuOBmeOAglxuICAgICAqIEBwYXJhbSB7Qm9hcmR9IGRlc3QgXG4gICAgICovXG4gICAgY29weVRvKGRlc3QpIHtcbiAgICAgICAgZGVzdC5zdGF0ZSA9IHRoaXMuc3RhdGUuc2xpY2UoKTtcbiAgICAgICAgZGVzdC5pZCA9IHRoaXMuaWQuc2xpY2UoKTtcbiAgICAgICAgZGVzdC5uZXh0ID0gdGhpcy5uZXh0LnNsaWNlKCk7XG4gICAgICAgIGZvciAobGV0IGkgPSAwOyBpIDwgZGVzdC5zZy5sZW5ndGg7IGkrKykge1xuICAgICAgICAgICAgdGhpcy5zZ1tpXS5jb3B5VG8oZGVzdC5zZ1tpXSk7XG4gICAgICAgIH1cbiAgICAgICAgZGVzdC5wcmV2U3RhdGUgPSBbXTtcbiAgICAgICAgZm9yIChsZXQgaSA9IDA7IGkgPCBLRUVQX1BSRVZfQ05UOyBpKyspIHtcbiAgICAgICAgICAgIGRlc3QucHJldlN0YXRlLnB1c2godGhpcy5wcmV2U3RhdGVbaV0uc2xpY2UoKSk7XG4gICAgICAgIH1cbiAgICAgICAgZGVzdC5rbyA9IHRoaXMua287XG4gICAgICAgIGRlc3QudHVybiA9IHRoaXMudHVybjtcbiAgICAgICAgZGVzdC5tb3ZlTnVtYmVyID0gdGhpcy5tb3ZlTnVtYmVyO1xuICAgICAgICBkZXN0LnJlbW92ZUNudCA9IHRoaXMucmVtb3ZlQ250O1xuICAgICAgICBkZXN0Lmhpc3RvcnkgPSBBcnJheS5mcm9tKHRoaXMuaGlzdG9yeSk7XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICog5ouh5by157ea5b2i5bqn5qiZ44Gu6YWN5YiX44KS5Y+X44GR5Y+W44Gj44Gm6aCG44Gr552A5omL44GX44G+44GZ44CCXG4gICAgICogQHBhcmFtIHtVaW4xNltdfSBzZXF1ZW5jZSBcbiAgICAgKi9cbiAgICBwbGF5U2VxdWVuY2Uoc2VxdWVuY2UpIHtcbiAgICAgICAgZm9yIChjb25zdCB2IG9mIHNlcXVlbmNlKSB7XG4gICAgICAgICAgICB0aGlzLnBsYXkodik7XG4gICAgICAgIH1cbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiDkuqTngrnjgavjgYLjgovnn7PjgpLlkKvjgoDpgKPjgpLnm6TkuIrjgYvjgonmiZPjgaHkuIrjgZLjgb7jgZnjgIJcbiAgICAgKiBAcGFyYW0ge1VpbnQxNn0gdiDmi6HlvLXnt5rlvaLluqfmqJlcbiAgICAgKi9cbiAgICByZW1vdmUodikge1xuICAgICAgICBsZXQgdlRtcCA9IHY7XG4gICAgICAgIHdoaWxlICh0cnVlKSB7XG4gICAgICAgICAgICB0aGlzLnJlbW92ZUNudCArPSAxO1xuICAgICAgICAgICAgdGhpcy5zdGF0ZVt2VG1wXSA9IHRoaXMuQy5FTVBUWTtcbiAgICAgICAgICAgIHRoaXMuaWRbdlRtcF0gPSB2VG1wO1xuICAgICAgICAgICAgZm9yIChjb25zdCBudiBvZiB0aGlzLkMubmVpZ2hib3JzKHZUbXApKSB7XG4gICAgICAgICAgICAgICAgdGhpcy5zZ1t0aGlzLmlkW252XV0uYWRkKHZUbXApO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgY29uc3Qgdk5leHQgPSB0aGlzLm5leHRbdlRtcF07XG4gICAgICAgICAgICB0aGlzLm5leHRbdlRtcF0gPSB2VG1wO1xuICAgICAgICAgICAgdlRtcCA9IHZOZXh0O1xuICAgICAgICAgICAgaWYgKHZUbXAgPT09IHYpIHtcbiAgICAgICAgICAgICAgICBicmVhaztcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgIH1cblxuICAgIC8qKlxuICAgICAqIOS6pOeCueOBq+OBguOCi+efs+OBrumAo+OCkue1kOWQiOOBl+OBvuOBmeOAglxuICAgICAqIEBwYXJhbSB7VWludDE2fSB2MSDmi6HlvLXnt5rlvaLluqfmqJlcbiAgICAgKiBAcGFyYW0ge1VpbnQxNn0gdjIg5ouh5by157ea5b2i5bqn5qiZXG4gICAgICovXG4gICAgbWVyZ2UodjEsIHYyKSB7XG4gICAgICAgIGxldCBpZEJhc2UgPSB0aGlzLmlkW3YxXTtcbiAgICAgICAgbGV0IGlkQWRkID0gdGhpcy5pZFt2Ml07XG4gICAgICAgIGlmICh0aGlzLnNnW2lkQmFzZV0uZ2V0U2l6ZSgpIDwgdGhpcy5zZ1tpZEFkZF0uZ2V0U2l6ZSgpKSB7XG4gICAgICAgICAgICBsZXQgdG1wID0gaWRCYXNlO1xuICAgICAgICAgICAgaWRCYXNlID0gaWRBZGQ7XG4gICAgICAgICAgICBpZEFkZCA9IHRtcDtcbiAgICAgICAgfVxuXG4gICAgICAgIHRoaXMuc2dbaWRCYXNlXS5tZXJnZSh0aGlzLnNnW2lkQWRkXSk7XG5cbiAgICAgICAgbGV0IHZUbXAgPSBpZEFkZDtcbiAgICAgICAgZG8ge1xuICAgICAgICAgICAgdGhpcy5pZFt2VG1wXSA9IGlkQmFzZTtcbiAgICAgICAgICAgIHZUbXAgPSB0aGlzLm5leHRbdlRtcF07XG4gICAgICAgIH0gd2hpbGUgKHZUbXAgIT09IGlkQWRkKTtcbiAgICAgICAgY29uc3QgdG1wID0gdGhpcy5uZXh0W3YxXTtcbiAgICAgICAgdGhpcy5uZXh0W3YxXSA9IHRoaXMubmV4dFt2Ml07XG4gICAgICAgIHRoaXMubmV4dFt2Ml0gPSB0bXA7XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICog5Lqk54K5duOBq+edgOaJi+OBmeOCi+ODmOODq+ODkeODvOODoeOCveODg+ODieOBp+OBmeOAglxuICAgICAqIOedgOaJi+OBq+OBr3BsYXnjg6Hjgr3jg4Pjg4njgpLkvb/jgaPjgabjgY/jgaDjgZXjgYTjgIJcbiAgICAgKiBAcHJpdmF0ZVxuICAgICAqIEBwYXJhbSB7VWludDE2fSB2IOaLoeW8tee3muW9ouW6p+aomVxuICAgICAqL1xuICAgIHBsYWNlU3RvbmUodikge1xuICAgICAgICBjb25zdCBzdG9uZUNvbG9yID0gdGhpcy50dXJuO1xuICAgICAgICB0aGlzLnN0YXRlW3ZdID0gc3RvbmVDb2xvcjtcbiAgICAgICAgdGhpcy5pZFt2XSA9IHY7XG4gICAgICAgIHRoaXMuc2dbdGhpcy5pZFt2XV0uY2xlYXIodHJ1ZSk7XG4gICAgICAgIGZvciAoY29uc3QgbnYgb2YgdGhpcy5DLm5laWdoYm9ycyh2KSkge1xuICAgICAgICAgICAgaWYgKHRoaXMuc3RhdGVbbnZdID09PSB0aGlzLkMuRU1QVFkpIHtcbiAgICAgICAgICAgICAgICB0aGlzLnNnW3RoaXMuaWRbdl1dLmFkZChudik7XG4gICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgIHRoaXMuc2dbdGhpcy5pZFtudl1dLnN1Yih2KTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgICBmb3IgKGNvbnN0IG52IG9mIHRoaXMuQy5uZWlnaGJvcnModikpIHtcbiAgICAgICAgICAgIGlmICh0aGlzLnN0YXRlW252XSA9PT0gc3RvbmVDb2xvciAmJiB0aGlzLmlkW252XSAhPT0gdGhpcy5pZFt2XSkge1xuICAgICAgICAgICAgICAgIHRoaXMubWVyZ2UodiwgbnYpO1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICAgIHRoaXMucmVtb3ZlQ250ID0gMDtcbiAgICAgICAgY29uc3Qgb3Bwb25lbnRTdG9uZSA9IHRoaXMuQy5vcHBvbmVudE9mKHRoaXMudHVybik7XG4gICAgICAgIGZvciAoY29uc3QgbnYgb2YgdGhpcy5DLm5laWdoYm9ycyh2KSkge1xuICAgICAgICAgICAgaWYgKHRoaXMuc3RhdGVbbnZdID09PSBvcHBvbmVudFN0b25lICYmIHRoaXMuc2dbdGhpcy5pZFtudl1dLmdldExpYkNudCgpID09PSAwKSB7XG4gICAgICAgICAgICAgICAgdGhpcy5yZW1vdmUobnYpO1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICog5Lqk54K544GM552A5omL56aB5q2i44Gn44Gq44GE44GL44KS6L+U44GX44G+44GZ44CCXG4gICAgICog55+z44GM5pei44Gr5a2Y5Zyo44GZ44KL5Lqk54K544CB44Kz44Km44Gr44KI44KL56aB5q2i44CB6Ieq5q665omL44GM552A5omL56aB5q2i54K544Gn44GZ44CCXG4gICAgICogQHBhcmFtIHsqfSB2IOaLoeW8tee3muW9ouW6p+aomVxuICAgICAqIEByZXR1cm5zIHtib29sfSBcbiAgICAgKi9cbiAgICBsZWdhbCh2KSB7XG4gICAgICAgIGlmICh2ID09PSB0aGlzLkMuUEFTUykge1xuICAgICAgICAgICAgcmV0dXJuIHRydWU7XG4gICAgICAgIH0gZWxzZSBpZiAodiA9PT0gdGhpcy5rbyB8fCB0aGlzLnN0YXRlW3ZdICE9PSB0aGlzLkMuRU1QVFkpIHtcbiAgICAgICAgICAgIHJldHVybiBmYWxzZTtcbiAgICAgICAgfVxuXG4gICAgICAgIGNvbnN0IHN0b25lQ250ID0gWzAsIDBdO1xuICAgICAgICBjb25zdCBhdHJDbnQgPSBbMCwgMF07XG4gICAgICAgIGZvciAoY29uc3QgbnYgb2YgdGhpcy5DLm5laWdoYm9ycyh2KSkge1xuICAgICAgICAgICAgY29uc3QgYyA9IHRoaXMuc3RhdGVbbnZdO1xuICAgICAgICAgICAgc3dpdGNoIChjKSB7XG4gICAgICAgICAgICAgICAgY2FzZSB0aGlzLkMuRU1QVFk6XG4gICAgICAgICAgICAgICAgICAgIHJldHVybiB0cnVlO1xuICAgICAgICAgICAgICAgIGNhc2UgdGhpcy5DLkJMQUNLOlxuICAgICAgICAgICAgICAgIGNhc2UgdGhpcy5DLldISVRFOlxuICAgICAgICAgICAgICAgICAgICBzdG9uZUNudFtjXSArPSAxO1xuICAgICAgICAgICAgICAgICAgICBpZiAodGhpcy5zZ1t0aGlzLmlkW252XV0uZ2V0TGliQ250KCkgPT09IDEpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIGF0ckNudFtjXSArPSAxO1xuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgICAgcmV0dXJuIGF0ckNudFt0aGlzLkMub3Bwb25lbnRPZih0aGlzLnR1cm4pXSAhPT0gMCB8fCBhdHJDbnRbdGhpcy50dXJuXSA8IHN0b25lQ250W3RoaXMudHVybl07XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICog5Lqk54K5duOBjOOBjOOCk+W9ouOBi+OBqeOBhuOBi+OCkui/lOOBl+OBvuOBmeOAglxuICAgICAqIEBwcml2YXRlXG4gICAgICogQHBhcmFtIHtVaW50MTZ9IHYgXG4gICAgICogQHBhcmFtIHtudW1iZXJ9IHBsIHBsYXllciBjb2xvclxuICAgICAqL1xuICAgIGV5ZXNoYXBlKHYsIHBsKSB7XG4gICAgICAgIGlmICh2ID09PSB0aGlzLkMuUEFTUykge1xuICAgICAgICAgICAgcmV0dXJuIGZhbHNlO1xuICAgICAgICB9XG4gICAgICAgIGZvciAoY29uc3QgbnYgb2YgdGhpcy5DLm5laWdoYm9ycyh2KSkge1xuICAgICAgICAgICAgY29uc3QgYyA9IHRoaXMuc3RhdGVbbnZdO1xuICAgICAgICAgICAgaWYgKGMgPT09IHRoaXMuQy5FTVBUWSB8fCBjID09PSB0aGlzLkMub3Bwb25lbnRPZihwbCkpIHtcbiAgICAgICAgICAgICAgICByZXR1cm4gZmFsc2U7XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgICAgY29uc3QgZGlhZ0NudCA9IFswLCAwLCAwLCAwXTtcbiAgICAgICAgZm9yIChjb25zdCBudiBvZiB0aGlzLkMuZGlhZ29uYWxzKHYpKSB7XG4gICAgICAgICAgICBkaWFnQ250W3RoaXMuc3RhdGVbbnZdXSArPSAxO1xuICAgICAgICB9XG4gICAgICAgIGNvbnN0IHdlZGdlQ250ID0gZGlhZ0NudFt0aGlzLkMub3Bwb25lbnRPZihwbCldICsgKGRpYWdDbnRbM10gPiAwID8gMSA6IDApO1xuICAgICAgICBpZiAod2VkZ2VDbnQgPT09IDIpIHtcbiAgICAgICAgICAgIGZvciAoY29uc3QgbnYgb2YgdGhpcy5DLmRpYWdvbmFscyh2KSkge1xuICAgICAgICAgICAgICAgIGlmICh0aGlzLnN0YXRlW252XSA9PT0gdGhpcy5DLm9wcG9uZW50T2YocGwpICYmIHRoaXMuc2dbdGhpcy5pZFtudl1dLmdldExpYkNudCgpID09PSAxICYmIHRoaXMuc2dbdGhpcy5pZFtudl1dLmdldFZBdHIoKSAhPT0gdGhpcy5rbykge1xuICAgICAgICAgICAgICAgICAgICByZXR1cm4gdHJ1ZTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgICAgcmV0dXJuIHdlZGdlQ250IDwgMjtcbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiDkuqTngrl244Gr552A5omL44GX44G+44GZ44CCXG4gICAgICogQHBhcmFtIHsqfSB2IOaLoeW8tee3muW9ouW6p+aomVxuICAgICAqIEBwYXJhbSB7Kn0gbm90RmlsbEV5ZSDnnLzjgpLmvbDjgZnjgZPjgajjgpLoqLHlj6/jgZfjgarjgYRcbiAgICAgKi9cbiAgICBwbGF5KHYsIG5vdEZpbGxFeWUgPSBmYWxzZSkge1xuICAgICAgICBpZiAoIXRoaXMubGVnYWwodikpIHtcbiAgICAgICAgICAgIHJldHVybiBmYWxzZTtcbiAgICAgICAgfVxuICAgICAgICBpZiAobm90RmlsbEV5ZSAmJiB0aGlzLmV5ZXNoYXBlKHYsIHRoaXMudHVybikpIHtcbiAgICAgICAgICAgIHJldHVybiBmYWxzZTtcbiAgICAgICAgfVxuICAgICAgICBmb3IgKGxldCBpID0gS0VFUF9QUkVWX0NOVCAtIDI7IGkgPj0gMDsgaS0tKSB7XG4gICAgICAgICAgICB0aGlzLnByZXZTdGF0ZVtpICsgMV0gPSB0aGlzLnByZXZTdGF0ZVtpXTtcbiAgICAgICAgfVxuICAgICAgICB0aGlzLnByZXZTdGF0ZVswXSA9IHRoaXMuc3RhdGUuc2xpY2UoKTtcbiAgICAgICAgaWYgKHYgPT09IHRoaXMuQy5QQVNTKSB7XG4gICAgICAgICAgICB0aGlzLmtvID0gdGhpcy5DLlZOVUxMO1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgdGhpcy5wbGFjZVN0b25lKHYpO1xuICAgICAgICAgICAgY29uc3QgaWQgPSB0aGlzLmlkW3ZdO1xuICAgICAgICAgICAgdGhpcy5rbyA9IHRoaXMuQy5WTlVMTDtcbiAgICAgICAgICAgIGlmICh0aGlzLnJlbW92ZUNudCA9PT0gMSAmJiB0aGlzLnNnW2lkXS5nZXRMaWJDbnQoKSA9PT0gMSAmJiB0aGlzLnNnW2lkXS5nZXRTaXplKCkgPT09IDEpIHtcbiAgICAgICAgICAgICAgICB0aGlzLmtvID0gdGhpcy5zZ1tpZF0uZ2V0VkF0cigpO1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICAgIHRoaXMucHJldk1vdmUgPSB2O1xuICAgICAgICB0aGlzLmhpc3RvcnkucHVzaCh2KTtcbiAgICAgICAgdGhpcy50dXJuID0gdGhpcy5DLm9wcG9uZW50T2YodGhpcy50dXJuKTtcbiAgICAgICAgdGhpcy5tb3ZlTnVtYmVyICs9IDE7XG4gICAgICAgIHJldHVybiB0cnVlO1xuICAgIH1cblxuICAgIC8qKlxuICAgICAqIOecvOW9ouOCkua9sOOBleOBquOBhOOCiOOBhuOBq+ODqeODs+ODgOODoOOBq+edgOaJi+OBl+OBvuOBmeOAglxuICAgICAqL1xuICAgIHJhbmRvbVBsYXkoKSB7XG4gICAgICAgIGNvbnN0IGVtcHR5TGlzdCA9IFtdO1xuICAgICAgICBmb3IgKGxldCBpID0gMDsgaSA8IHRoaXMuc3RhdGUubGVuZ3RoOyBpKyspIHtcbiAgICAgICAgICAgIGlmICh0aGlzLnN0YXRlW2ldID09PSB0aGlzLkMuRU1QVFkpIHtcbiAgICAgICAgICAgICAgICBlbXB0eUxpc3QucHVzaChpKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgICAoMCwgX3V0aWxzLnNodWZmbGUpKGVtcHR5TGlzdCk7XG4gICAgICAgIGZvciAoY29uc3QgdiBvZiBlbXB0eUxpc3QpIHtcbiAgICAgICAgICAgIGlmICh0aGlzLnBsYXkodiwgdHJ1ZSkpIHtcbiAgICAgICAgICAgICAgICByZXR1cm4gdjtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgICB0aGlzLnBsYXkodGhpcy5DLlBBU1MsIHRydWUpO1xuICAgICAgICByZXR1cm4gdGhpcy5DLlBBU1M7XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICog44K544Kz44Ki5beu44KS6L+U44GX44G+44GZ44CCXG4gICAgICog5ZCM44GY6Imy44Gu55+z44Gu5pWw44Go5LiA5pa544Gu55+z44Gr44Gg44GR6Zqj5o6l44GZ44KL5Lqk54K544Gu5pWw44GM44Gd44Gu6Imy44Gu44K544Kz44Ki44Go44GE44GG57Ch5piT44Or44O844Or44Gn44GZ44CCXG4gICAgICogKHJhbmRvbVBsYXnjgpLlrp/ooYzjgZfjgZ/lvozjgafjga/kuK3lm73jg6vjg7zjg6vjgajlkIzjgZjlgKTjgavjgarjgorjgb7jgZkpXG4gICAgICovXG4gICAgc2NvcmUoKSB7XG4gICAgICAgIGNvbnN0IHN0b25lQ250ID0gWzAsIDBdO1xuICAgICAgICBmb3IgKGxldCB2ID0gMDsgdiA8IHRoaXMuQy5FQlZDTlQ7IHYrKykge1xuICAgICAgICAgICAgY29uc3QgcyA9IHRoaXMuc3RhdGVbdl07XG4gICAgICAgICAgICBpZiAocyA9PT0gdGhpcy5DLkJMQUNLIHx8IHMgPT09IHRoaXMuQy5XSElURSkge1xuICAgICAgICAgICAgICAgIHN0b25lQ250W3NdICs9IDE7XG4gICAgICAgICAgICB9IGVsc2UgaWYgKHMgPT09IHRoaXMuQy5FTVBUWSkge1xuICAgICAgICAgICAgICAgIGNvbnN0IG5ickNudCA9IFswLCAwLCAwLCAwXTtcbiAgICAgICAgICAgICAgICBmb3IgKGNvbnN0IG52IG9mIHRoaXMuQy5uZWlnaGJvcnModikpIHtcbiAgICAgICAgICAgICAgICAgICAgbmJyQ250W3RoaXMuc3RhdGVbbnZdXSArPSAxO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICBpZiAobmJyQ250W3RoaXMuQy5XSElURV0gPiAwICYmIG5ickNudFt0aGlzLkMuQkxBQ0tdID09PSAwKSB7XG4gICAgICAgICAgICAgICAgICAgIHN0b25lQ250W3RoaXMuQy5XSElURV0gKz0gMTtcbiAgICAgICAgICAgICAgICB9IGVsc2UgaWYgKG5ickNudFt0aGlzLkMuQkxBQ0tdID4gMCAmJiBuYnJDbnRbdGhpcy5DLldISVRFXSA9PT0gMCkge1xuICAgICAgICAgICAgICAgICAgICBzdG9uZUNudFt0aGlzLkMuQkxBQ0tdICs9IDE7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICAgIHJldHVybiBzdG9uZUNudFsxXSAtIHN0b25lQ250WzBdIC0gdGhpcy5rb21pO1xuICAgIH1cblxuICAgIC8qKlxuICAgICAqIOecvOS7peWkluedgOaJi+WPr+iDveOBquS6pOeCueOBjOOBquOBj+OBquOCi+OBvuOBp+ODqeODs+ODgOODoOOBq+edgOaJi+OBl+OBvuOBmeOAglxuICAgICAqIHNob3dCb2FyZOOBjHRydWXjga7jgajjgY3ntYLlsYBcbiAgICAgKiBAcGFyYW0ge2Jvb2x9fSBzaG93Qm9hcmQgXG4gICAgICovXG4gICAgcm9sbG91dChzaG93Qm9hcmQpIHtcbiAgICAgICAgd2hpbGUgKHRoaXMubW92ZU51bWJlciA8IHRoaXMuQy5FQlZDTlQgKiAyKSB7XG4gICAgICAgICAgICBjb25zdCBwcmV2TW92ZSA9IHRoaXMucHJldk1vdmU7XG4gICAgICAgICAgICBjb25zdCBtb3ZlID0gdGhpcy5yYW5kb21QbGF5KCk7XG4gICAgICAgICAgICBpZiAoc2hvd0JvYXJkICYmIG1vdmUgIT09IHRoaXMuQy5QQVNTKSB7XG4gICAgICAgICAgICAgICAgY29uc29sZS5sb2coJ1xcbm1vdmUgY291bnQ9JWQnLCB0aGlzLm1vdmVOdW1iZXIpO1xuICAgICAgICAgICAgICAgIHRoaXMuc2hvd2JvYXJkKCk7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBpZiAocHJldk1vdmUgPT09IHRoaXMuQy5QQVNTICYmIG1vdmUgPT09IHRoaXMuQy5QQVNTKSB7XG4gICAgICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiDnooHnm6Tjga546Lu444Op44OZ44Or44KS6KGo56S644GX44G+44GZ44CCXG4gICAgICogQHByaXZhdGVcbiAgICAgKi9cbiAgICBwcmludFhsYWJlbCgpIHtcbiAgICAgICAgbGV0IGxpbmVTdHIgPSAnICAnO1xuICAgICAgICBmb3IgKGxldCB4ID0gMTsgeCA8PSB0aGlzLkMuQlNJWkU7IHgrKykge1xuICAgICAgICAgICAgbGluZVN0ciArPSBgICR7dGhpcy5DLlhfTEFCRUxTW3hdfSBgO1xuICAgICAgICB9XG4gICAgICAgIGNvbnNvbGUubG9nKGxpbmVTdHIpO1xuICAgIH1cblxuICAgIC8qKlxuICAgICAqIOeigeebpOOCkuOCs+ODs+OCveODvOODq+OBq+WHuuWKm+OBl+OBvuOBmeOAglxuICAgICAqL1xuICAgIHNob3dib2FyZCgpIHtcbiAgICAgICAgdGhpcy5wcmludFhsYWJlbCgpO1xuICAgICAgICBmb3IgKGxldCB5ID0gdGhpcy5DLkJTSVpFOyB5ID4gMDsgeS0tKSB7XG4gICAgICAgICAgICBsZXQgbGluZVN0ciA9ICgnICcgKyB5LnRvU3RyaW5nKCkpLnNsaWNlKC0yKTtcbiAgICAgICAgICAgIGZvciAobGV0IHggPSAxOyB4IDw9IHRoaXMuQy5CU0laRTsgeCsrKSB7XG4gICAgICAgICAgICAgICAgY29uc3QgdiA9IHRoaXMuQy54eTJldih4LCB5KTtcbiAgICAgICAgICAgICAgICBsZXQgeFN0cjtcbiAgICAgICAgICAgICAgICBzd2l0Y2ggKHRoaXMuc3RhdGVbdl0pIHtcbiAgICAgICAgICAgICAgICAgICAgY2FzZSB0aGlzLkMuQkxBQ0s6XG4gICAgICAgICAgICAgICAgICAgICAgICB4U3RyID0gdiA9PT0gdGhpcy5wcmV2TW92ZSA/ICdbWF0nIDogJyBYICc7XG4gICAgICAgICAgICAgICAgICAgICAgICBicmVhaztcbiAgICAgICAgICAgICAgICAgICAgY2FzZSB0aGlzLkMuV0hJVEU6XG4gICAgICAgICAgICAgICAgICAgICAgICB4U3RyID0gdiA9PT0gdGhpcy5wcmV2TW92ZSA/ICdbT10nIDogJyBPICc7XG4gICAgICAgICAgICAgICAgICAgICAgICBicmVhaztcbiAgICAgICAgICAgICAgICAgICAgY2FzZSB0aGlzLkMuRU1QVFk6XG4gICAgICAgICAgICAgICAgICAgICAgICB4U3RyID0gJyAuICc7XG4gICAgICAgICAgICAgICAgICAgICAgICBicmVhaztcbiAgICAgICAgICAgICAgICAgICAgZGVmYXVsdDpcbiAgICAgICAgICAgICAgICAgICAgICAgIHhTdHIgPSAnID8gJztcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgbGluZVN0ciArPSB4U3RyO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgbGluZVN0ciArPSAoJyAnICsgeS50b1N0cmluZygpKS5zbGljZSgtMik7XG4gICAgICAgICAgICBjb25zb2xlLmxvZyhsaW5lU3RyKTtcbiAgICAgICAgfVxuICAgICAgICB0aGlzLnByaW50WGxhYmVsKCk7XG4gICAgICAgIGNvbnNvbGUubG9nKCcnKTtcbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiDjg4vjg6Xjg7zjg6njg6vjg43jg4Pjg4jjg6/jg7zjgq/jgpLkvb/nlKjjgZnjgovpmpvjga7lhaXlipvjg5XjgqPjg7zjg4Hjg6Pjg7zjgpLnlJ/miJDjgZfjgb7jgZnjgIJcbiAgICAgKiBAcmV0dXJucyB7RmxvYXQzMkFycmF5fVxuICAgICAqL1xuICAgIGZlYXR1cmUoKSB7XG4gICAgICAgIGNvbnN0IEZFQVRVUkVfQ05UID0gS0VFUF9QUkVWX0NOVCAqIDIgKyA0O1xuICAgICAgICBjb25zdCBpbmRleCA9IChwLCBmKSA9PiBwICogRkVBVFVSRV9DTlQgKyBmO1xuICAgICAgICBjb25zdCBhcnJheSA9IG5ldyBGbG9hdDMyQXJyYXkodGhpcy5DLkJWQ05UICogRkVBVFVSRV9DTlQpO1xuICAgICAgICBjb25zdCBteSA9IHRoaXMudHVybjtcbiAgICAgICAgY29uc3Qgb3BwID0gdGhpcy5DLm9wcG9uZW50T2YodGhpcy50dXJuKTtcblxuICAgICAgICBjb25zdCBOID0gS0VFUF9QUkVWX0NOVCArIDE7XG4gICAgICAgIGZvciAobGV0IHAgPSAwOyBwIDwgdGhpcy5DLkJWQ05UOyBwKyspIHtcbiAgICAgICAgICAgIGFycmF5W2luZGV4KHAsIDApXSA9IHRoaXMuc3RhdGVbdGhpcy5DLnJ2MmV2KHApXSA9PT0gbXkgPyAxLjAgOiAwLjA7XG4gICAgICAgIH1cbiAgICAgICAgZm9yIChsZXQgcCA9IDA7IHAgPCB0aGlzLkMuQlZDTlQ7IHArKykge1xuICAgICAgICAgICAgYXJyYXlbaW5kZXgocCwgTildID0gdGhpcy5zdGF0ZVt0aGlzLkMucnYyZXYocCldID09PSBvcHAgPyAxLjAgOiAwLjA7XG4gICAgICAgIH1cbiAgICAgICAgZm9yIChsZXQgaSA9IDA7IGkgPCBLRUVQX1BSRVZfQ05UOyBpKyspIHtcbiAgICAgICAgICAgIGZvciAobGV0IHAgPSAwOyBwIDwgdGhpcy5DLkJWQ05UOyBwKyspIHtcbiAgICAgICAgICAgICAgICBhcnJheVtpbmRleChwLCBpICsgMSldID0gdGhpcy5wcmV2U3RhdGVbaV1bdGhpcy5DLnJ2MmV2KHApXSA9PT0gbXkgPyAxLjAgOiAwLjA7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBmb3IgKGxldCBwID0gMDsgcCA8IHRoaXMuQy5CVkNOVDsgcCsrKSB7XG4gICAgICAgICAgICAgICAgYXJyYXlbaW5kZXgocCwgTiArIGkgKyAxKV0gPSB0aGlzLnByZXZTdGF0ZVtpXVt0aGlzLkMucnYyZXYocCldID09PSBvcHAgPyAxLjAgOiAwLjA7XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgICAgbGV0IGlzX2JsYWNrX3R1cm4sIGlzX3doaXRlX3R1cm47XG4gICAgICAgIGlmIChteSA9PT0gdGhpcy5DLkJMQUNLKSB7XG4gICAgICAgICAgICBpc19ibGFja190dXJuID0gMS4wO1xuICAgICAgICAgICAgaXNfd2hpdGVfdHVybiA9IDAuMDtcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIGlzX2JsYWNrX3R1cm4gPSAwLjA7XG4gICAgICAgICAgICBpc193aGl0ZV90dXJuID0gMS4wO1xuICAgICAgICB9XG4gICAgICAgIGZvciAobGV0IHAgPSAwOyBwIDwgdGhpcy5DLkJWQ05UOyBwKyspIHtcbiAgICAgICAgICAgIGFycmF5W2luZGV4KHAsIEZFQVRVUkVfQ05UIC0gMildID0gaXNfYmxhY2tfdHVybjtcbiAgICAgICAgICAgIGFycmF5W2luZGV4KHAsIEZFQVRVUkVfQ05UIC0gMSldID0gaXNfd2hpdGVfdHVybjtcbiAgICAgICAgfVxuICAgICAgICByZXR1cm4gYXJyYXk7XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICog54++5Zyo44Gu5bGA6Z2i44Gu44OP44OD44K344Ol5YCk44KS6L+U44GX44G+44GZ44CCXG4gICAgICogKOazqCnmiYvmlbDmg4XloLHjga/lkKvjgb/jgb7jgZvjgpPjgILjgarjga7jgafmr5TovIPjgavjga/jg4/jg4Pjgrfjg6XlgKTjgajmiYvmlbDkuKHmlrnjgpLkvb/jgYTjgb7jgZnjgIJcbiAgICAgKi9cbiAgICBoYXNoKCkge1xuICAgICAgICByZXR1cm4gKDAsIF91dGlscy5oYXNoKSgodGhpcy5zdGF0ZS50b1N0cmluZygpICsgdGhpcy5wcmV2U3RhdGVbMF0udG9TdHJpbmcoKSArIHRoaXMudHVybi50b1N0cmluZygpKS5yZXBsYWNlKCcsJywgJycpKTtcbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBAdHlwZWRlZiB7T2JqZWN0fSBDYW5kaWRhdGVzXG4gICAgICogQHByb3BlcnR5IHtudW1iZXJ9IGhhc2ggXG4gICAgICogQHByb3BlcnR5IHtJbnRlZ2VyfSBtb3ZlQ250XG4gICAgICogQHByb3BlcnR5IHtJbnRlZ2VyW119IGxpc3Qg552A5omL5Y+v6IO944Gq5Lqk54K557ea5b2i5bqn5qiZKOaLoeW8tee3muW9ouW6p+aomeOBp+OBr+OBguOCiuOBvuOBm+OCkylcbiAgICAgKiDnnYDmiYvlj6/og73jgarkuqTngrnjga7mg4XloLHjgpLov5TjgZfjgb7jgZnjgIJcbiAgICAgKiBAcmV0dXJucyB7b2JqZWN0fSB7IGhhc2g6IOODj+ODg+OCt+ODpeWApCwgbW92ZU51bWJlcjog5omL5pWwLCBsaXN0OiDlgJnoo5zmiYvphY3liJcgfVxuICAgICAqL1xuICAgIGNhbmRpZGF0ZXMoKSB7XG4gICAgICAgIGNvbnN0IGNhbmRMaXN0ID0gW107XG4gICAgICAgIGZvciAobGV0IHYgPSAwOyB2IDwgdGhpcy5zdGF0ZS5sZW5ndGg7IHYrKykge1xuICAgICAgICAgICAgaWYgKHRoaXMubGVnYWwodikpIHtcbiAgICAgICAgICAgICAgICBjYW5kTGlzdC5wdXNoKHRoaXMuQy5ldjJydih2KSk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgICAgY2FuZExpc3QucHVzaCh0aGlzLkMuZXYycnYodGhpcy5DLlBBU1MpKTtcbiAgICAgICAgcmV0dXJuIHtcbiAgICAgICAgICAgIGhhc2g6IHRoaXMuaGFzaCgpLFxuICAgICAgICAgICAgbW92ZU51bWJlcjogdGhpcy5tb3ZlTnVtYmVyLFxuICAgICAgICAgICAgbGlzdDogY2FuZExpc3RcbiAgICAgICAgfTtcbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiDntbHoqIjnmoTmiYvms5XjgafmlbTlnLDjgZfjgZ/ntZDmnpzjgpLov5TjgZfjgb7jgZnjgIJcbiAgICAgKiBAcHJpdmF0ZVxuICAgICAqL1xuICAgIGZpbmFsU2NvcmUoKSB7XG4gICAgICAgIGNvbnN0IFJPTExfT1VUX05VTSA9IDI1NjtcbiAgICAgICAgY29uc3QgZG91YmxlU2NvcmVMaXN0ID0gW107XG4gICAgICAgIGxldCBiQ3B5ID0gbmV3IEJvYXJkKHRoaXMuQywgdGhpcy5rb21pKTtcbiAgICAgICAgZm9yIChsZXQgaSA9IDA7IGkgPCBST0xMX09VVF9OVU07IGkrKykge1xuICAgICAgICAgICAgdGhpcy5jb3B5VG8oYkNweSk7XG4gICAgICAgICAgICBiQ3B5LnJvbGxvdXQoZmFsc2UpO1xuICAgICAgICAgICAgZG91YmxlU2NvcmVMaXN0LnB1c2goYkNweS5zY29yZSgpKTtcbiAgICAgICAgfVxuICAgICAgICByZXR1cm4gKDAsIF91dGlscy5tb3N0Q29tbW9uKShkb3VibGVTY29yZUxpc3QpO1xuICAgIH1cbn1cbmV4cG9ydHMuQm9hcmQgPSBCb2FyZDsiLCIndXNlIHN0cmljdCc7XG5cbk9iamVjdC5kZWZpbmVQcm9wZXJ0eShleHBvcnRzLCBcIl9fZXNNb2R1bGVcIiwge1xuICAgIHZhbHVlOiB0cnVlXG59KTtcbi8qKlxuICogQGZpbGUg56KB55uk44Gu5a6a5pWw44Kv44Op44K544Gn44GZXG4gKi9cbi8qXG4gKiBAYXV0aG9yIOW4guW3nembhOS6jCBcbiAqIEBjb3B5cmlnaHQgMjAxOCBJQ0hJS0FXQSwgWXVqaSAoTmV3IDMgUnMpXG4gKi9cblxuLy8g5bqn5qiZ5aSJ5o+b55So5a6a5pWw44Gn44GZ44CCXG5jb25zdCBPRkZTRVQgPSAnYScuY2hhckNvZGVBdCgwKSAtIDE7XG5cbi8qKlxuICog56KB55uk5a6a5pWw44Go5bqn5qiZ5aSJ5o+b44Gu44Kv44Op44K544Gn44GZ44CCPGJyPlxuICog56KB55uk44Kv44Op44K544Gn44Gv5bqn5qiZ57O744Gr5ouh5by157ea5b2i5bqn5qiZ44KS5L2/44GE44G+44GZ44CCXG4gKiDmi6HlvLXnt5rlvaLluqfmqJnjga/nm6TlpJbjga7kuqTngrnjgpLmjIHjgaTnooHnm6Tjga7luqfmqJnjgafjgZnjgIJcbiAqIOWbm+i3r+ebpOOBruWgtOWQiOOAgeS7peS4i+OBruOCiOOBhuOBquani+mAoOOBq+OBquOCiuOBvuOBmeOAglxuICogPHByZSBzdHlsZT1cImZvbnQtZmFtaWx5OiBDb3VyaWVyO1wiPlxuICogICAgICMjIyMjIyAj44GM55uk5aSWKOWun+mam+OBruWApOOBr0VYVEVSSU9SKVxuICogICAgICMuLi4uIyAu44Gv55uk5LiK5Lqk54K5KOWun+mam+OBruWApOOBr0VNUFRZKVxuICogICAgICMuLi4uI1xuICogICAgICMuLi4uI1xuICogICAgICMuLi4uI1xuICogICAgICMjIyMjI1xuICogPC9wcmU+XG4gKiDlt6bkuIvjgYvjgokwLeOCquODquOCuOODs+OBp+aVsOOBiOOBvuOBmeOAguWbm+i3r+ebpOOBruWgtOWQiOOAgVxuICogPHByZSBzdHlsZT1cImZvbnQtZmFtaWx5OiBDb3VyaWVyO1wiPlxuICogICAgIDMwIDMxIDMyIDMzIDM0IDM1XG4gKiAgICAgMjQgMjUgMjYgMjcgMjggMjlcbiAqICAgICAxOCAxOSAyMCAyMSAyMiAyM1xuICogICAgIDEyIDEzIDE0IDE1IDE2IDE3XG4gKiAgICAgIDYgIDcgIDggIDkgMTAgMTFcbiAqICAgICAgMCAgMSAgMiAgMyAgNCAgNVxuICogPC9wcmU+XG4gKiDnooHnm6Tjga7kuqTngrnjgpJ4eeW6p+aomeOBp+ihqOOBmeOBqOOBjeOCguW3puS4i+OBjOWOn+eCueOBp+OBmeOAguOBn+OBoOOBl3h55bqn5qiZ44Gu5aC05ZCI44CBMS3jgqrjg6rjgrjjg7PjgafjgZnjgIJcbiAqL1xuY2xhc3MgQm9hcmRDb25zdGFudHMge1xuICAgIGNvbnN0cnVjdG9yKHNpemUgPSAxOSkge1xuICAgICAgICB0aGlzLldISVRFID0gMDtcbiAgICAgICAgdGhpcy5CTEFDSyA9IDE7XG4gICAgICAgIHRoaXMuRU1QVFkgPSAyO1xuICAgICAgICB0aGlzLkVYVEVSSU9SID0gMztcbiAgICAgICAgdGhpcy5YX0xBQkVMUyA9ICdAQUJDREVGR0hKS0xNTk9QUVJTVCc7XG4gICAgICAgIHRoaXMuQlNJWkUgPSBzaXplOyAvLyDnooHnm6TjgrXjgqTjgrpcbiAgICAgICAgdGhpcy5FQlNJWkUgPSB0aGlzLkJTSVpFICsgMjsgLy8g5ouh5by156KB55uk44K144Kk44K6XG4gICAgICAgIHRoaXMuRUJWQ05UID0gdGhpcy5FQlNJWkUgKiB0aGlzLkVCU0laRTtcbiAgICAgICAgdGhpcy5QQVNTID0gdGhpcy5FQlZDTlQ7XG4gICAgICAgIHRoaXMuVk5VTEwgPSB0aGlzLkVCVkNOVCArIDE7XG4gICAgICAgIHRoaXMuQlZDTlQgPSB0aGlzLkJTSVpFICogdGhpcy5CU0laRTtcbiAgICAgICAgT2JqZWN0LmZyZWV6ZSh0aGlzKTtcbiAgICB9XG5cbiAgICBvcHBvbmVudE9mKGNvbG9yKSB7XG4gICAgICAgIHN3aXRjaCAoY29sb3IpIHtcbiAgICAgICAgICAgIGNhc2UgdGhpcy5XSElURTpcbiAgICAgICAgICAgICAgICByZXR1cm4gdGhpcy5CTEFDSztcbiAgICAgICAgICAgIGNhc2UgdGhpcy5CTEFDSzpcbiAgICAgICAgICAgICAgICByZXR1cm4gdGhpcy5XSElURTtcbiAgICAgICAgICAgIGRlZmF1bHQ6XG4gICAgICAgICAgICAgICAgdGhyb3cgbmV3IEVycm9yKCdpbnZhbGlkIGNvbG9yJyk7XG4gICAgICAgIH1cbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBTR0bjg5Xjgqnjg7zjg57jg4Pjg4jjga7luqfmqJnjgpJ4eeW6p+aomeOBq+WkieaPm+OBl+OBvuOBmeOAglxuICAgICAqIEBwYXJhbSB7c3RyaW5nfSBzIFxuICAgICAqIEByZXR1cm5zIHtJbnRlZ2VyW119IHh55bqn5qiZXG4gICAgICovXG4gICAgbW92ZTJ4eShzKSB7XG4gICAgICAgIHJldHVybiBbcy5jaGFyQ29kZUF0KDApIC0gT0ZGU0VULCB0aGlzLkJTSVpFICsgMSAtIChzLmNoYXJDb2RlQXQoMSkgLSBPRkZTRVQpXTtcbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiDmi6HlvLXnt5rlvaLluqfmqJnjgpJ4eeW6p+aomeOBq+WkieaPm+OBl+OBvuOBmeOAglxuICAgICAqIEBwYXJhbSB7VWludDE2fSBldiBcbiAgICAgKiBAcmV0dXJucyB7SW50ZWdlcltdfSB4eeW6p+aomVxuICAgICAqL1xuICAgIGV2Mnh5KGV2KSB7XG4gICAgICAgIHJldHVybiBbZXYgJSB0aGlzLkVCU0laRSwgTWF0aC5mbG9vcihldiAvIHRoaXMuRUJTSVpFKV07XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogeHnluqfmqJnjgpLmi6HlvLXnt5rlvaLluqfmqJnjgavlpInmj5vjgZfjgb7jgZnjgIJcbiAgICAgKiBAcGFyYW0ge0ludGVnZXJ9IHggXG4gICAgICogQHBhcmFtIHtJbnRlZ2VyfSB5IFxuICAgICAqIEByZXR1cm5zIHtVaW50MTZ9IGV4dGVuZGVkIHZlcnRleFxuICAgICAqL1xuICAgIHh5MmV2KHgsIHkpIHtcbiAgICAgICAgcmV0dXJuIHkgKiB0aGlzLkVCU0laRSArIHg7XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICog57ea5b2i5bqn5qiZ44KS5ouh5by157ea5b2i5bqn5qiZ44Gr5aSJ5o+b44GX44G+44GZ44CCXG4gICAgICogQHBhcmFtIHtVaW50MTZ9IHJ2IHJhdyB2ZXJ0ZXhcbiAgICAgKiBAcmV0dXJucyB7VWludDE2fSBleHRlbmRlZCB2ZXJ0ZXhcbiAgICAgKi9cbiAgICBydjJldihydikge1xuICAgICAgICByZXR1cm4gcnYgPT09IHRoaXMuQlZDTlQgPyB0aGlzLlBBU1MgOiBydiAlIHRoaXMuQlNJWkUgKyAxICsgTWF0aC5mbG9vcihydiAvIHRoaXMuQlNJWkUgKyAxKSAqIHRoaXMuRUJTSVpFO1xuICAgIH1cblxuICAgIC8qKlxuICAgICAqIOaLoeW8tee3muW9ouW6p+aomeOCkue3muW9ouW6p+aomeOBq+WkieaPm+OBl+OBvuOBmeOAglxuICAgICAqIEBwYXJhbSB7VWludDE2fSBldlxuICAgICAqIEByZXR1cm5zIHtVaW50MTZ9IHJhdyB2ZXJ0ZXhcbiAgICAgKi9cbiAgICBldjJydihldikge1xuICAgICAgICByZXR1cm4gZXYgPT09IHRoaXMuUEFTUyA/IHRoaXMuQlZDTlQgOiBldiAlIHRoaXMuRUJTSVpFIC0gMSArIE1hdGguZmxvb3IoZXYgLyB0aGlzLkVCU0laRSAtIDEpICogdGhpcy5CU0laRTtcbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiDmi6HlvLXnt5rlvaLluqfmqJnjgpJHVFDjgYzkvb/nlKjjgZnjgovluqfmqJnjgavlpInmj5vjgZfjgb7jgZnjgIJcbiAgICAgKiBAcGFyYW0ge1VpbnQxNn0gZXZcbiAgICAgKiBAcmV0dXJucyB7c3RyaW5nfSBHVFDluqfmqJlcbiAgICAgKi9cbiAgICBldjJzdHIoZXYpIHtcbiAgICAgICAgaWYgKGV2ID49IHRoaXMuUEFTUykge1xuICAgICAgICAgICAgcmV0dXJuICdwYXNzJztcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIGNvbnN0IFt4LCB5XSA9IHRoaXMuZXYyeHkoZXYpO1xuICAgICAgICAgICAgcmV0dXJuIHRoaXMuWF9MQUJFTFMuY2hhckF0KHgpICsgeS50b1N0cmluZygpO1xuICAgICAgICB9XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogR1RQ44GM5L2/55So44GZ44KL5ouh5by157ea5b2i5bqn5qiZ44Gr5aSJ5o+b44GX44G+44GZ44CCXG4gICAgICogQHBhcmFtIHtzdHJpbmd9IHZcbiAgICAgKiBAcmV0dXJucyB7VWludDE2fSBleHRlbmRlZCB2ZXJ0ZXhcbiAgICAgKi9cbiAgICBzdHIyZXYodikge1xuICAgICAgICBjb25zdCB2U3RyID0gdi50b1VwcGVyQ2FzZSgpO1xuICAgICAgICBpZiAodlN0ciA9PT0gJ1BBU1MnIHx8IHZTdHIgPT09ICdSRVNJR04nKSB7XG4gICAgICAgICAgICByZXR1cm4gdGhpcy5QQVNTO1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgY29uc3QgeCA9IHRoaXMuWF9MQUJFTFMuaW5kZXhPZih2U3RyLmNoYXJBdCgwKSk7XG4gICAgICAgICAgICBjb25zdCB5ID0gcGFyc2VJbnQodlN0ci5zbGljZSgxKSk7XG4gICAgICAgICAgICByZXR1cm4gdGhpcy54eTJldih4LCB5KTtcbiAgICAgICAgfVxuICAgIH1cblxuICAgIC8qKlxuICAgICAqIHbjgavpmqPmjqXjgZnjgovkuqTngrnjga7luqfmqJnjgpLov5TjgZfjgb7jgZnjgIJcbiAgICAgKiBAcGFyYW0ge1VpbnQxNn19IHYg5ouh5by157ea5b2i5bqn5qiZXG4gICAgICovXG4gICAgbmVpZ2hib3JzKHYpIHtcbiAgICAgICAgcmV0dXJuIFt2ICsgMSwgdiArIHRoaXMuRUJTSVpFLCB2IC0gMSwgdiAtIHRoaXMuRUJTSVpFXTtcbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiB244Gr5pac44KB6Zqj5o6l44GZ44KL5Lqk54K544Gu5bqn5qiZ44KS6L+U44GX44G+44GZ44CCXG4gICAgICogQHBhcmFtIHtVaW50MTZ9fSB2IOaLoeW8tee3muW9ouW6p+aomVxuICAgICAqL1xuICAgIGRpYWdvbmFscyh2KSB7XG4gICAgICAgIHJldHVybiBbdiArIHRoaXMuRUJTSVpFICsgMSwgdiArIHRoaXMuRUJTSVpFIC0gMSwgdiAtIHRoaXMuRUJTSVpFIC0gMSwgdiAtIHRoaXMuRUJTSVpFICsgMV07XG4gICAgfVxufVxuZXhwb3J0cy5Cb2FyZENvbnN0YW50cyA9IEJvYXJkQ29uc3RhbnRzOyIsIid1c2Ugc3RyaWN0JztcblxuT2JqZWN0LmRlZmluZVByb3BlcnR5KGV4cG9ydHMsIFwiX19lc01vZHVsZVwiLCB7XG4gICAgdmFsdWU6IHRydWVcbn0pO1xuZXhwb3J0cy5NQ1RTID0gdW5kZWZpbmVkO1xuXG52YXIgX3V0aWxzID0gcmVxdWlyZSgnLi91dGlscy5qcycpO1xuXG52YXIgX2JvYXJkID0gcmVxdWlyZSgnLi9ib2FyZC5qcycpO1xuXG4vKipcbiAqIEBmaWxlIOODouODs+ODhuOCq+ODq+ODreODhOODquODvOaOoue0ouOBruWun+ijheOBp+OBmeOAglxuICog44GT44Gu44Kz44O844OJ44GvUHlhceOBruenu+akjeOCs+ODvOODieOBp+OBmeOAglxuICogQHNlZSB7QGxpbmsgaHR0cHM6Ly9naXRodWIuY29tL3ltZ2FxL1B5YXF9XG4gKi9cbi8qXG4gKiBAYXV0aG9yIOW4guW3nembhOS6jFxuICogQGNvcHlyaWdodCAyMDE4IElDSElLQVdBLCBZdWppIChOZXcgMyBScylcbiAqL1xuY29uc3QgTk9ERVNfTUFYX0xFTkdUSCA9IDE2Mzg0O1xuY29uc3QgRVhQQU5EX0NOVCA9IDg7XG5cbi8qKiBNQ1RT44Gu44OO44O844OJ44Kv44Op44K544Gn44GZ44CCICovXG5jbGFzcyBOb2RlIHtcbiAgICAvKipcbiAgICAgKiBNQ1RT44Gu44OO44O844OJ44KS55Sf5oiQ44GX44G+44GZ44CCXG4gICAgICogQHBhcmFtIHtCb2FyZENvbnN0YW50c30gY29uc3RhbnRzXG4gICAgICovXG4gICAgY29uc3RydWN0b3IoY29uc3RhbnRzKSB7XG4gICAgICAgIHRoaXMuQyA9IGNvbnN0YW50cztcbiAgICAgICAgLyoqIOedgOaJi+WAmeijnOaVsOOBp+OBmeOAgijlkI3liY3jga5lZGdl44Gv44Kw44Op44OV55CG6KuW44Gu5p6d44Gu44GT44Go44Gn44GZ44CCKSAqL1xuICAgICAgICB0aGlzLmVkZ2VMZW5ndGggPSAwO1xuICAgICAgICAvL+mgu+e5geOBquODoeODouODquOCouODreOCseODvOOCt+ODp+ODs+OCkumBv+OBkeOCi+OBn+OCgeOAgeaeneaDheWgseOBq+W/heimgeOBquacgOWkp+ODoeODouODquOCkuS6iOOCgeeiuuS/neOBl+OBvuOBmeOAglxuICAgICAgICAvKiog44Od44Oq44K344O856K6546H44Gu6auY44GE6aCG5Lim44KT44Gg552A5omL5YCZ6KOc44Gn44GZ44CCICovXG4gICAgICAgIHRoaXMubW92ZXMgPSBuZXcgVWludDE2QXJyYXkodGhpcy5DLkJWQ05UICsgMSk7XG4gICAgICAgIC8qKiBtb3Zlc+imgee0oOOBq+WvvuW/nOOBmeOCi+ODneODquOCt+ODvOeiuueOh+OBp+OBmeOAgiAqL1xuICAgICAgICB0aGlzLnByb2JhYmlsaXRpZXMgPSBuZXcgRmxvYXQzMkFycmF5KHRoaXMuQy5CVkNOVCArIDEpO1xuICAgICAgICAvKiogbW92ZXPopoHntKDjgavlr77lv5zjgZnjgovjg5Djg6rjg6Xjg7zjgafjgZnjgILjgZ/jgaDjgZfjg47jg7zjg4njga7miYvnlarjgYvjgonopovjgabjga7lgKTjgafjgZnjgIIgKi9cbiAgICAgICAgdGhpcy52YWx1ZXMgPSBuZXcgRmxvYXQzMkFycmF5KHRoaXMuQy5CVkNOVCArIDEpO1xuICAgICAgICAvKiogbW92ZXPopoHntKDjgavlr77lv5zjgZnjgovnt4/jgqLjgq/jgrfjg6fjg7Pjg5Djg6rjg6Xjg7zjgafjgZnjgILjgZ/jgaDjgZfjg47jg7zjg4njga7miYvnlarjgYvjgonopovjgabjga7lgKTjgafjgZnjgIIgKi9cbiAgICAgICAgdGhpcy50b3RhbEFjdGlvblZhbHVlcyA9IG5ldyBGbG9hdDMyQXJyYXkodGhpcy5DLkJWQ05UICsgMSk7XG4gICAgICAgIC8qKiBtb3Zlc+imgee0oOOBq+WvvuW/nOOBmeOCi+ioquWVj+WbnuaVsOOBp+OBmeOAgiAqL1xuICAgICAgICB0aGlzLnZpc2l0Q291bnRzID0gbmV3IFVpbnQzMkFycmF5KHRoaXMuQy5CVkNOVCArIDEpO1xuICAgICAgICAvKiogbW92ZXPopoHntKDjgavlr77lv5zjgZnjgovjg47jg7zjg4lJROOBp+OBmeOAgiAqL1xuICAgICAgICB0aGlzLm5vZGVJZHMgPSBuZXcgSW50MTZBcnJheSh0aGlzLkMuQlZDTlQgKyAxKTtcbiAgICAgICAgLyoqIG1vdmVz6KaB57Sg44Gr5a++5b+c44GZ44KL44OP44OD44K344Ol44Gn44GZ44CCICovXG4gICAgICAgIHRoaXMuaGFzaGVzID0gbmV3IFVpbnQzMkFycmF5KHRoaXMuQy5CVkNOVCArIDEpO1xuICAgICAgICAvKiogbW92ZXPopoHntKDjgavlr77lv5zjgZnjgovlsYDpnaLjga7jg4vjg6Xjg7zjg6njg6vjg43jg4Pjg4jjg6/jg7zjgq/jgpLoqIjnrpfjgZfjgZ/jgYvlkKbjgYvjgpLkv53mjIHjgZfjgb7jgZnjgIIgKi9cbiAgICAgICAgdGhpcy5ldmFsdWF0ZWQgPSBuZXcgVWludDhBcnJheSh0aGlzLkMuQlZDTlQgKyAxKTtcbiAgICAgICAgdGhpcy50b3RhbFZhbHVlID0gMC4wO1xuICAgICAgICB0aGlzLnRvdGFsQ291bnQgPSAwO1xuICAgICAgICB0aGlzLmhhc2ggPSAwO1xuICAgICAgICB0aGlzLm1vdmVOdW1iZXIgPSAtMTtcbiAgICAgICAgdGhpcy5leGl0Q29uZGl0aW9uID0gbnVsbDtcbiAgICAgICAgdGhpcy5jbGVhcigpO1xuICAgIH1cblxuICAgIC8qKiDmnKrkvb/nlKjnirbmhYvjgavjgZfjgb7jgZnjgIIgKi9cbiAgICBjbGVhcigpIHtcbiAgICAgICAgdGhpcy5lZGdlTGVuZ3RoID0gMDtcbiAgICAgICAgdGhpcy50b3RhbFZhbHVlID0gMC4wO1xuICAgICAgICB0aGlzLnRvdGFsQ291bnQgPSAwO1xuICAgICAgICB0aGlzLmhhc2ggPSAwO1xuICAgICAgICB0aGlzLm1vdmVOdW1iZXIgPSAtMTtcbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiDliJ3mnJ/ljJbjgZfjgb7jgZnjgIJcbiAgICAgKiBAcGFyYW0ge29iamVjdH0gY2FuZGlkYXRlcyBCb2FyZOOBjOeUn+aIkOOBmeOCi+WAmeijnOaJi+aDheWgseOBp+OBmeOAglxuICAgICAqIEBwYXJhbSB7RmxvYXQzMkFycmF5fSBwcm9iIOedgOaJi+eiuueOhyjjg4vjg6Xjg7zjg6njg6vjg43jg4Pjg4jjg6/jg7zjgq/jga7jg53jg6rjgrfjg7zlh7rlipsp44Gn44GZ44CCXG4gICAgICovXG4gICAgaW5pdGlhbGl6ZShjYW5kaWRhdGVzLCBwcm9iKSB7XG4gICAgICAgIHRoaXMuY2xlYXIoKTtcbiAgICAgICAgdGhpcy5tb3ZlTnVtYmVyID0gY2FuZGlkYXRlcy5tb3ZlTnVtYmVyO1xuICAgICAgICB0aGlzLmhhc2ggPSBjYW5kaWRhdGVzLmhhc2g7XG5cbiAgICAgICAgZm9yIChjb25zdCBydiBvZiAoMCwgX3V0aWxzLmFyZ3NvcnQpKHByb2IsIHRydWUpKSB7XG4gICAgICAgICAgICBpZiAoY2FuZGlkYXRlcy5saXN0LmluY2x1ZGVzKHJ2KSkge1xuICAgICAgICAgICAgICAgIHRoaXMubW92ZXNbdGhpcy5lZGdlTGVuZ3RoXSA9IHRoaXMuQy5ydjJldihydik7XG4gICAgICAgICAgICAgICAgdGhpcy5wcm9iYWJpbGl0aWVzW3RoaXMuZWRnZUxlbmd0aF0gPSBwcm9iW3J2XTtcbiAgICAgICAgICAgICAgICB0aGlzLnZhbHVlc1t0aGlzLmVkZ2VMZW5ndGhdID0gMC4wO1xuICAgICAgICAgICAgICAgIHRoaXMudG90YWxBY3Rpb25WYWx1ZXNbdGhpcy5lZGdlTGVuZ3RoXSA9IDAuMDtcbiAgICAgICAgICAgICAgICB0aGlzLnZpc2l0Q291bnRzW3RoaXMuZWRnZUxlbmd0aF0gPSAwO1xuICAgICAgICAgICAgICAgIHRoaXMubm9kZUlkc1t0aGlzLmVkZ2VMZW5ndGhdID0gLTE7XG4gICAgICAgICAgICAgICAgdGhpcy5oYXNoZXNbdGhpcy5lZGdlTGVuZ3RoXSA9IDA7XG4gICAgICAgICAgICAgICAgdGhpcy5ldmFsdWF0ZWRbdGhpcy5lZGdlTGVuZ3RoXSA9IGZhbHNlO1xuICAgICAgICAgICAgICAgIHRoaXMuZWRnZUxlbmd0aCArPSAxO1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICog44Ko44OD44K444Gu5Lit44Gu44OZ44K544OIMuOBruOCpOODs+ODh+ODg+OCr+OCueOCkui/lOOBl+OBvuOBmeOAglxuICAgICAqIEByZXR1cm5zIHtJbnRlZ2VyW119XG4gICAgICovXG4gICAgYmVzdDIoKSB7XG4gICAgICAgIGNvbnN0IG9yZGVyID0gKDAsIF91dGlscy5hcmdzb3J0KSh0aGlzLnZpc2l0Q291bnRzLnNsaWNlKDAsIHRoaXMuZWRnZUxlbmd0aCksIHRydWUpO1xuICAgICAgICByZXR1cm4gb3JkZXIuc2xpY2UoMCwgMik7XG4gICAgfVxufVxuXG4vKiog44Oi44Oz44OG44Kr44Or44Ot44OE44Oq44O85o6i57Si44KS5a6f6KGM44GZ44KL44Kv44Op44K544Gn44GZ44CCICovXG5jbGFzcyBNQ1RTIHtcbiAgICAvKipcbiAgICAgKiDjgrPjg7Pjgrnjg4jjg6njgq/jgr9cbiAgICAgKiBAcGFyYW0ge05ldXJhbE5ldHdvcmt9IG5uIFxuICAgICAqIEBwYXJhbSB7Qm9hcmRDb25zdGFudHN9IENcbiAgICAgKi9cbiAgICBjb25zdHJ1Y3RvcihubiwgQykge1xuICAgICAgICB0aGlzLkNfUFVDVCA9IDAuMDE7XG4gICAgICAgIHRoaXMubWFpblRpbWUgPSAwLjA7XG4gICAgICAgIHRoaXMuYnlveW9taSA9IDEuMDtcbiAgICAgICAgdGhpcy5sZWZ0VGltZSA9IDAuMDtcbiAgICAgICAgdGhpcy5ub2RlcyA9IFtdO1xuICAgICAgICB0aGlzLm5vZGVzTGVuZ3RoID0gMDtcbiAgICAgICAgZm9yIChsZXQgaSA9IDA7IGkgPCBOT0RFU19NQVhfTEVOR1RIOyBpKyspIHtcbiAgICAgICAgICAgIHRoaXMubm9kZXMucHVzaChuZXcgTm9kZShDKSk7XG4gICAgICAgIH1cbiAgICAgICAgdGhpcy5yb290SWQgPSAwO1xuICAgICAgICB0aGlzLnJvb3RNb3ZlTnVtYmVyID0gMDtcbiAgICAgICAgdGhpcy5ub2RlSGFzaGVzID0gbmV3IE1hcCgpO1xuICAgICAgICB0aGlzLmV2YWxDb3VudCA9IDA7XG4gICAgICAgIHRoaXMubm4gPSBubjtcbiAgICAgICAgdGhpcy50ZXJtaW5hdGVGbGFnID0gZmFsc2U7XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICog5oyB44Gh5pmC6ZaT44Gu6Kit5a6a44KS44GX44G+44GZ44CCXG4gICAgICog5q6L44KK5pmC6ZaT44KC44Oq44K744OD44OI44GX44G+44GZ44CCXG4gICAgICogQHBhcmFtIHtudW1iZXJ9IG1haW5UaW1lIOenklxuICAgICAqIEBwYXJhbSB7bnVtYmVyfSBieW95b21pIOenklxuICAgICAqL1xuICAgIHNldFRpbWUobWFpblRpbWUsIGJ5b3lvbWkpIHtcbiAgICAgICAgdGhpcy5tYWluVGltZSA9IG1haW5UaW1lO1xuICAgICAgICB0aGlzLmxlZnRUaW1lID0gbWFpblRpbWU7XG4gICAgICAgIHRoaXMuYnlveW9taSA9IGJ5b3lvbWk7XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICog5q6L44KK5pmC6ZaT44KS6Kit5a6a44GX44G+44GZ44CCXG4gICAgICogQHBhcmFtIHtudW1iZXJ9IGxlZnRUaW1lIOenklxuICAgICAqL1xuICAgIHNldExlZnRUaW1lKGxlZnRUaW1lKSB7XG4gICAgICAgIHRoaXMubGVmdFRpbWUgPSBsZWZ0VGltZTtcbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiDlhoXpg6jnirbmhYvjgpLjgq/jg6rjgqLjgZfjgb7jgZnjgIJcbiAgICAgKiDlkIzkuIDmmYLplpPoqK3lrprjgafliJ3miYvjgYvjgonlr77lsYDjgafjgY3jgovjgojjgYbjgavjgarjgorjgb7jgZnjgIJcbiAgICAgKi9cbiAgICBjbGVhcigpIHtcbiAgICAgICAgdGhpcy5sZWZ0VGltZSA9IHRoaXMubWFpblRpbWU7XG4gICAgICAgIGZvciAoY29uc3Qgbm9kZSBvZiB0aGlzLm5vZGVzKSB7XG4gICAgICAgICAgICBub2RlLmNsZWFyKCk7XG4gICAgICAgIH1cbiAgICAgICAgdGhpcy5ub2Rlc0xlbmd0aCA9IDA7XG4gICAgICAgIHRoaXMucm9vdElkID0gMDtcbiAgICAgICAgdGhpcy5yb290TW92ZU51bWJlciA9IDA7XG4gICAgICAgIHRoaXMubm9kZUhhc2hlcy5jbGVhcigpO1xuICAgICAgICB0aGlzLmV2YWxDb3VudCA9IDA7XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICog5bGA6Z2iYuOBrk1DVFPjga7mjqLntKLjg47jg7zjg4njgYzml6LjgavjgYLjgovjgYvnorroqo3jgZfjgIHjgarjgZHjgozjgbDnlJ/miJDjgZfjgabjg47jg7zjg4lJROOCkui/lOOBl+OBvuOBmeOAglxuICAgICAqIEBwYXJhbSB7Qm9hcmR9IGIgXG4gICAgICogQHBhcmFtIHtGbG9hdDMyQXJyYXl9IHByb2IgXG4gICAgICogQHJldHVybnMge0ludGVnZXJ9IOODjuODvOODiUlEXG4gICAgICovXG4gICAgY3JlYXRlTm9kZShiLCBwcm9iKSB7XG4gICAgICAgIGNvbnN0IGNhbmRpZGF0ZXMgPSBiLmNhbmRpZGF0ZXMoKTtcbiAgICAgICAgY29uc3QgaGFzaCA9IGNhbmRpZGF0ZXMuaGFzaDtcbiAgICAgICAgaWYgKHRoaXMubm9kZUhhc2hlcy5oYXMoaGFzaCkgJiYgdGhpcy5ub2Rlc1t0aGlzLm5vZGVIYXNoZXMuZ2V0KGhhc2gpXS5oYXNoID09PSBoYXNoICYmIHRoaXMubm9kZXNbdGhpcy5ub2RlSGFzaGVzLmdldChoYXNoKV0ubW92ZU51bWJlciA9PT0gY2FuZGlkYXRlcy5tb3ZlTnVtYmVyKSB7XG4gICAgICAgICAgICByZXR1cm4gdGhpcy5ub2RlSGFzaGVzLmdldChoYXNoKTtcbiAgICAgICAgfVxuXG4gICAgICAgIGxldCBub2RlSWQgPSBoYXNoICUgTk9ERVNfTUFYX0xFTkdUSDtcbiAgICAgICAgd2hpbGUgKHRoaXMubm9kZXNbbm9kZUlkXS5tb3ZlTnVtYmVyICE9PSAtMSkge1xuICAgICAgICAgICAgbm9kZUlkID0gbm9kZUlkICsgMSA8IE5PREVTX01BWF9MRU5HVEggPyBub2RlSWQgKyAxIDogMDtcbiAgICAgICAgfVxuXG4gICAgICAgIHRoaXMubm9kZUhhc2hlcy5zZXQoaGFzaCwgbm9kZUlkKTtcbiAgICAgICAgdGhpcy5ub2Rlc0xlbmd0aCArPSAxO1xuXG4gICAgICAgIGNvbnN0IG5vZGUgPSB0aGlzLm5vZGVzW25vZGVJZF07XG4gICAgICAgIG5vZGUuaW5pdGlhbGl6ZShjYW5kaWRhdGVzLCBwcm9iKTtcbiAgICAgICAgcmV0dXJuIG5vZGVJZDtcbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBub2Rlc+OBruS4reOBruS4jeimgeOBquODjuODvOODieOCkuacquS9v+eUqOeKtuaFi+OBq+aIu+OBl+OBvuOBmeOAglxuICAgICAqL1xuICAgIGNsZWFudXBOb2RlcygpIHtcbiAgICAgICAgaWYgKHRoaXMubm9kZXNMZW5ndGggPCBOT0RFU19NQVhfTEVOR1RIIC8gMikge1xuICAgICAgICAgICAgcmV0dXJuO1xuICAgICAgICB9XG4gICAgICAgIGZvciAobGV0IGkgPSAwOyBpIDwgTk9ERVNfTUFYX0xFTkdUSDsgaSsrKSB7XG4gICAgICAgICAgICBjb25zdCBtYyA9IHRoaXMubm9kZXNbaV0ubW92ZU51bWJlcjtcbiAgICAgICAgICAgIGlmIChtYyAhPSBudWxsICYmIG1jIDwgdGhpcy5yb290TW92ZU51bWJlcikge1xuICAgICAgICAgICAgICAgIHRoaXMubm9kZUhhc2hlcy5kZWxldGUodGhpcy5ub2Rlc1tpXS5oYXNoKTtcbiAgICAgICAgICAgICAgICB0aGlzLm5vZGVzW2ldLmNsZWFyKCk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBVQ0LoqZXkvqHjgafmnIDlloTjga7nnYDmiYvmg4XloLHjgpLov5TjgZfjgb7jgZnjgIJcbiAgICAgKiBAcGFyYW0ge0JvYXJkfSBiIFxuICAgICAqIEBwYXJhbSB7SW50ZWdlcn0gbm9kZUlkIFxuICAgICAqIEByZXR1cm5zIHtBcnJheX0gW1VDQumBuOaKnuOCpOODs+ODh+ODg+OCr+OCuSwg5pyA5ZaE44OW44Op44Oz44OB44Gu5a2Q44OO44O844OJSUQsIOedgOaJi11cbiAgICAgKi9cbiAgICBzZWxlY3RCeVVDQihiLCBub2RlKSB7XG4gICAgICAgIGNvbnN0IG5kUmF0ZSA9IG5vZGUudG90YWxDb3VudCA9PT0gMCA/IDAuMCA6IG5vZGUudG90YWxWYWx1ZSAvIG5vZGUudG90YWxDb3VudDtcbiAgICAgICAgY29uc3QgY3BzdiA9IHRoaXMuQ19QVUNUICogTWF0aC5zcXJ0KG5vZGUudG90YWxDb3VudCk7XG4gICAgICAgIGNvbnN0IG1lYW5BY3Rpb25WYWx1ZXMgPSBuZXcgRmxvYXQzMkFycmF5KG5vZGUuZWRnZUxlbmd0aCk7XG4gICAgICAgIGZvciAobGV0IGkgPSAwOyBpIDwgbWVhbkFjdGlvblZhbHVlcy5sZW5ndGg7IGkrKykge1xuICAgICAgICAgICAgbWVhbkFjdGlvblZhbHVlc1tpXSA9IG5vZGUudmlzaXRDb3VudHNbaV0gPT09IDAgPyBuZFJhdGUgOiBub2RlLnRvdGFsQWN0aW9uVmFsdWVzW2ldIC8gbm9kZS52aXNpdENvdW50c1tpXTtcbiAgICAgICAgfVxuICAgICAgICBjb25zdCB1Y2IgPSBuZXcgRmxvYXQzMkFycmF5KG5vZGUuZWRnZUxlbmd0aCk7XG4gICAgICAgIGZvciAobGV0IGkgPSAwOyBpIDwgdWNiLmxlbmd0aDsgaSsrKSB7XG4gICAgICAgICAgICB1Y2JbaV0gPSBtZWFuQWN0aW9uVmFsdWVzW2ldICsgY3BzdiAqIG5vZGUucHJvYmFiaWxpdGllc1tpXSAvICgxICsgbm9kZS52aXNpdENvdW50c1tpXSk7XG4gICAgICAgIH1cbiAgICAgICAgY29uc3Qgc2VsZWN0ZWRJbmRleCA9ICgwLCBfdXRpbHMuYXJnbWF4KSh1Y2IpO1xuICAgICAgICBjb25zdCBzZWxlY3RlZElkID0gbm9kZS5ub2RlSWRzW3NlbGVjdGVkSW5kZXhdO1xuICAgICAgICBjb25zdCBzZWxlY3RlZE1vdmUgPSBub2RlLm1vdmVzW3NlbGVjdGVkSW5kZXhdO1xuICAgICAgICByZXR1cm4gW3NlbGVjdGVkSW5kZXgsIHNlbGVjdGVkSWQsIHNlbGVjdGVkTW92ZV07XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICog5qSc57Si44GZ44KL44GL44Gp44GG44GL44KS5rG65a6a44GX44G+44GZ44CCXG4gICAgICogQHBhcmFtIHtJbnRlZ2VyfSBiZXN0IFxuICAgICAqIEBwYXJhbSB7SW50ZWdlcn0gc2Vjb25kIFxuICAgICAqL1xuICAgIHNob3VsZFNlYXJjaChiZXN0LCBzZWNvbmQpIHtcbiAgICAgICAgY29uc3Qgbm9kZSA9IHRoaXMubm9kZXNbdGhpcy5yb290SWRdO1xuICAgICAgICBjb25zdCB3aW5yYXRlID0gdGhpcy53aW5yYXRlKG5vZGUsIGJlc3QpO1xuXG4gICAgICAgIC8vIOioquWVj+WbnuaVsOOBjOi2s+OCiuOBpuOBhOOBquOBhOOBi+OAgemam+eri+OBo+OBn+aJi+OBjOOBquOBj+OBi+OBpOOBr+OBo+OBjeOCiuWLneOBoeOBmOOCg+OBquOBhOOBqOOBjVxuICAgICAgICByZXR1cm4gbm9kZS50b3RhbENvdW50IDw9IDUwMDAgfHwgbm9kZS52aXNpdENvdW50c1tiZXN0XSA8PSBub2RlLnZpc2l0Q291bnRzW3NlY29uZF0gKiAxMDAgJiYgd2lucmF0ZSA8PSAwLjk1O1xuICAgIH1cblxuICAgIC8qKlxuICAgICAqIOasoeOBruedgOaJi+OBruiAg+aFruaZgumWk+OCkueul+WHuuOBl+OBvuOBmeOAglxuICAgICAqIEByZXR1cm5zIHtudW1iZXJ9IOS9v+eUqOOBmeOCi+aZgumWkyjnp5IpXG4gICAgICovXG4gICAgZ2V0U2VhcmNoVGltZShDKSB7XG4gICAgICAgIGlmICh0aGlzLm1haW5UaW1lID09PSAwLjAgfHwgdGhpcy5sZWZ0VGltZSA8IHRoaXMuYnlveW9taSAqIDIuMCkge1xuICAgICAgICAgICAgcmV0dXJuIE1hdGgubWF4KHRoaXMuYnlveW9taSwgMS4wKTtcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIC8vIOeigeebpOOCkuWfi+OCgeOCi+OBk+OBqOOCkuS7ruWumuOBl+OAgeaui+OCiuOBruaJi+aVsOOCkueul+WHuuOBl+OBvuOBmeOAglxuICAgICAgICAgICAgY29uc3QgYXNzdW1lZFJlbWFpbmluZ01vdmVzID0gKEMuQlZDTlQgLSB0aGlzLnJvb3RNb3ZlTnVtYmVyKSAvIDI7XG4gICAgICAgICAgICAvL+W4g+efs+OBp+OBr+OCiOOCiuWkmuOBj+OBruaJi+aVsOOCkuS7ruWumuOBl+OAgeaApeOBjuOBvuOBmeOAglxuICAgICAgICAgICAgY29uc3Qgb3BlbmluZ09mZnNldCA9IE1hdGgubWF4KEMuQlZDTlQgLyAxMCAtIHRoaXMucm9vdE1vdmVOdW1iZXIsIDApO1xuICAgICAgICAgICAgcmV0dXJuIHRoaXMubGVmdFRpbWUgLyAoYXNzdW1lZFJlbWFpbmluZ01vdmVzICsgb3BlbmluZ09mZnNldCkgKyB0aGlzLmJ5b3lvbWk7XG4gICAgICAgIH1cbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBub2RlSWTjga7jg47jg7zjg4njga5lZGdlSW5kZXjjga7jgqjjg4Pjgrjjgavlr77lv5zjgZnjgovjg47jg7zjg4njgYzml6LjgavlrZjlnKjjgZnjgovjgYvov5TjgZfjgb7jgZnjgIJcbiAgICAgKiBAcGFyYW0ge0ludGVnZXJ9IG5vZGVJZCBcbiAgICAgKiBAcGFyYW0ge0ludGVnZXJ9IGVkZ2VJbmRleCBcbiAgICAgKiBAcGFyYW0ge0ludGVnZXJ9IG1vdmVOdW1iZXIgXG4gICAgICogQHJldHVybnMge2Jvb2x9XG4gICAgICovXG4gICAgaGFzRWRnZU5vZGUoZWRnZUluZGV4LCBub2RlSWQsIG1vdmVOdW1iZXIpIHtcbiAgICAgICAgY29uc3Qgbm9kZSA9IHRoaXMubm9kZXNbbm9kZUlkXTtcbiAgICAgICAgY29uc3QgZWRnZUlkID0gbm9kZS5ub2RlSWRzW2VkZ2VJbmRleF07XG4gICAgICAgIHJldHVybiBlZGdlSWQgPj0gMCAmJiBub2RlLmhhc2hlc1tlZGdlSW5kZXhdID09PSB0aGlzLm5vZGVzW2VkZ2VJZF0uaGFzaCAmJiB0aGlzLm5vZGVzW2VkZ2VJZF0ubW92ZU51bWJlciA9PT0gbW92ZU51bWJlcjtcbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBpbmRleOOBruOCqOODg+OCuOOBruWLneeOh+OCkui/lOOBl+OBvuOBmeOAglxuICAgICAqIEBwYXJhbSB7Tm9kZX0gbm9kZSBcbiAgICAgKiBAcGFyYW0ge0ludGVnZXJ9IGluZGV4IFxuICAgICAqIEByZXR1cm5zIHtudW1iZXJ9XG4gICAgICovXG4gICAgd2lucmF0ZShub2RlLCBpbmRleCkge1xuICAgICAgICByZXR1cm4gbm9kZS50b3RhbEFjdGlvblZhbHVlc1tpbmRleF0gLyBNYXRoLm1heChub2RlLnZpc2l0Q291bnRzW2luZGV4XSwgMSkgLyAyLjAgKyAwLjU7XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogcHJpbnRJbmZv44Gu44OY44Or44OR44O86Zai5pWw44Gn44GZ44CCXG4gICAgICogQHByaXZhdGVcbiAgICAgKiBAcGFyYW0ge0ludGVnZXJ9IG5vZGVJZCBcbiAgICAgKiBAcGFyYW0geyp9IGhlYWRNb3ZlIFxuICAgICAqIEBwYXJhbSB7Qm9hcmRDb25zdGFudHN9IGMgXG4gICAgICovXG4gICAgYmVzdFNlcXVlbmNlKG5vZGVJZCwgaGVhZE1vdmUsIGMpIHtcbiAgICAgICAgbGV0IHNlcVN0ciA9ICgnICAgJyArIGMuZXYyc3RyKGhlYWRNb3ZlKSkuc2xpY2UoLTUpO1xuICAgICAgICBsZXQgbmV4dE1vdmUgPSBoZWFkTW92ZTtcblxuICAgICAgICBmb3IgKGxldCBpID0gMDsgaSA8IDc7IGkrKykge1xuICAgICAgICAgICAgY29uc3Qgbm9kZSA9IHRoaXMubm9kZXNbbm9kZUlkXTtcbiAgICAgICAgICAgIGlmIChuZXh0TW92ZSA9PT0gYy5QQVNTIHx8IG5vZGUuZWRnZUxlbmd0aCA8IDEpIHtcbiAgICAgICAgICAgICAgICBicmVhaztcbiAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgY29uc3QgYmVzdCA9ICgwLCBfdXRpbHMuYXJnbWF4KShub2RlLnZpc2l0Q291bnRzLnNsaWNlKDAsIG5vZGUuZWRnZUxlbmd0aCkpO1xuICAgICAgICAgICAgaWYgKG5vZGUudmlzaXRDb3VudHNbYmVzdF0gPT09IDApIHtcbiAgICAgICAgICAgICAgICBicmVhaztcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIG5leHRNb3ZlID0gbm9kZS5tb3Zlc1tiZXN0XTtcbiAgICAgICAgICAgIHNlcVN0ciArPSAnLT4nICsgKCcgICAnICsgYy5ldjJzdHIobmV4dE1vdmUpKS5zbGljZSgtNSk7XG5cbiAgICAgICAgICAgIGlmICghdGhpcy5oYXNFZGdlTm9kZShiZXN0LCBub2RlSWQsIG5vZGUubW92ZU51bWJlciArIDEpKSB7XG4gICAgICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBub2RlSWQgPSBub2RlLm5vZGVJZHNbYmVzdF07XG4gICAgICAgIH1cblxuICAgICAgICByZXR1cm4gc2VxU3RyO1xuICAgIH1cblxuICAgIC8qKlxuICAgICAqIOaOoue0oue1kOaenOOBruips+e0sOOCkuihqOekuuOBl+OBvuOBmeOAglxuICAgICAqIEBwYXJhbSB7SW50ZWdlcn0gbm9kZUlkIFxuICAgICAqIEBwYXJhbSB7Qm9hcmRDb25zdGFudHN9IGNcbiAgICAgKi9cbiAgICBwcmludEluZm8obm9kZUlkLCBjKSB7XG4gICAgICAgIGNvbnN0IG5vZGUgPSB0aGlzLm5vZGVzW25vZGVJZF07XG4gICAgICAgIGNvbnN0IG9yZGVyID0gKDAsIF91dGlscy5hcmdzb3J0KShub2RlLnZpc2l0Q291bnRzLnNsaWNlKDAsIG5vZGUuZWRnZUxlbmd0aCksIHRydWUpO1xuICAgICAgICBjb25zb2xlLmxvZygnfG1vdmV8Y291bnQgIHxyYXRlIHx2YWx1ZXxwcm9iIHwgYmVzdCBzZXF1ZW5jZScpO1xuICAgICAgICBmb3IgKGxldCBpID0gMDsgaSA8IE1hdGgubWluKG9yZGVyLmxlbmd0aCwgOSk7IGkrKykge1xuICAgICAgICAgICAgY29uc3QgbSA9IG9yZGVyW2ldO1xuICAgICAgICAgICAgY29uc3QgdmlzaXRDb3VudHMgPSBub2RlLnZpc2l0Q291bnRzW21dO1xuICAgICAgICAgICAgaWYgKHZpc2l0Q291bnRzID09PSAwKSB7XG4gICAgICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgICAgICB9XG5cbiAgICAgICAgICAgIGNvbnN0IHJhdGUgPSB2aXNpdENvdW50cyA9PT0gMCA/IDAuMCA6IHRoaXMud2lucmF0ZShub2RlLCBtKSAqIDEwMC4wO1xuICAgICAgICAgICAgY29uc3QgdmFsdWUgPSAobm9kZS52YWx1ZXNbbV0gLyAyLjAgKyAwLjUpICogMTAwLjA7XG4gICAgICAgICAgICBjb25zb2xlLmxvZygnfCVzfCVzfCVzfCVzfCVzfCAlcycsICgnICAgJyArIGMuZXYyc3RyKG5vZGUubW92ZXNbbV0pKS5zbGljZSgtNCksICh2aXNpdENvdW50cyArICcgICAgICAnKS5zbGljZSgwLCA3KSwgKCcgICcgKyByYXRlLnRvRml4ZWQoMSkpLnNsaWNlKC01KSwgKCcgICcgKyB2YWx1ZS50b0ZpeGVkKDEpKS5zbGljZSgtNSksICgnICAnICsgKG5vZGUucHJvYmFiaWxpdGllc1ttXSAqIDEwMC4wKS50b0ZpeGVkKDEpKS5zbGljZSgtNSksIHRoaXMuYmVzdFNlcXVlbmNlKG5vZGUubm9kZUlkc1ttXSwgbm9kZS5tb3Zlc1ttXSwgYykpO1xuICAgICAgICB9XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICog5qSc57Si44Gu5YmN5Yem55CG44Gn44GZ44CCXG4gICAgICogQHByaXZhdGVcbiAgICAgKiBAcGFyYW0ge0JvYXJkfSBiIFxuICAgICAqL1xuICAgIGFzeW5jIHByZXBhcmVSb290Tm9kZShiKSB7XG4gICAgICAgIGNvbnN0IGhhc2ggPSBiLmhhc2goKTtcbiAgICAgICAgdGhpcy5yb290TW92ZU51bWJlciA9IGIubW92ZU51bWJlcjtcbiAgICAgICAgdGhpcy5DX1BVQ1QgPSB0aGlzLnJvb3RNb3ZlTnVtYmVyIDwgOCA/IDAuMDEgOiAxLjU7XG4gICAgICAgIGlmICh0aGlzLm5vZGVIYXNoZXMuaGFzKGhhc2gpICYmIHRoaXMubm9kZXNbdGhpcy5ub2RlSGFzaGVzLmdldChoYXNoKV0uaGFzaCA9PT0gaGFzaCAmJiB0aGlzLm5vZGVzW3RoaXMubm9kZUhhc2hlcy5nZXQoaGFzaCldLm1vdmVOdW1iZXIgPT09IHRoaXMucm9vdE1vdmVOdW1iZXIpIHtcbiAgICAgICAgICAgIHRoaXMucm9vdElkID0gdGhpcy5ub2RlSGFzaGVzLmdldChoYXNoKTtcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIGNvbnN0IFtwcm9iXSA9IGF3YWl0IHRoaXMubm4uZXZhbHVhdGUoYi5mZWF0dXJlKCkpO1xuXG4gICAgICAgICAgICAvLyBBbHBoYUdvIFplcm/jgafjga/oh6rlt7Hlr77miKbmmYLjgavjga/jgZPjgZPjgadwcm9i44GrXCJEaXJpY2hsZXTjg47jgqTjgrpcIuOCkui/veWKoOOBl+OBvuOBmeOBjOOAgeacrOOCs+ODvOODieOBp+OBr+W8t+WMluWtpue/kuOBr+S6iOWumuOBl+OBpuOBhOOBquOBhOOBruOBp+iomOi/sOOBl+OBvuOBm+OCk+OAglxuXG4gICAgICAgICAgICB0aGlzLnJvb3RJZCA9IHRoaXMuY3JlYXRlTm9kZShiLCBwcm9iKTtcbiAgICAgICAgfVxuICAgIH1cblxuICAgIC8qKlxuICAgICAqIGVkZ2VJbmRleOOBruOCqOODg+OCuOOBruWxgOmdouOCkuipleS+oeOBl+ODjuODvOODieOCkueUn+aIkOOBl+OBpuODkOODquODpeODvOOCkui/lOOBl+OBvuOBmeOAglxuICAgICAqIEBwcml2YXRlXG4gICAgICogQHBhcmFtIHtCb2FyZH0gYiBcbiAgICAgKiBAcGFyYW0ge0ludGVnZXJ9IGVkZ2VJbmRleCBcbiAgICAgKiBAcGFyYW0ge05vZGV9IHBhcmVudE5vZGUgXG4gICAgICogQHJldHVybnMge251bWJlcn0gcGFyZW50Tm9kZeOBruaJi+eVquOBi+OCieimi+OBn2VkZ2XlsYDpnaLjga7jg5Djg6rjg6Xjg7xcbiAgICAgKi9cbiAgICBhc3luYyBldmFsdWF0ZUVkZ2UoYiwgZWRnZUluZGV4LCBwYXJlbnROb2RlKSB7XG4gICAgICAgIGxldCBbcHJvYiwgdmFsdWVdID0gYXdhaXQgdGhpcy5ubi5ldmFsdWF0ZShiLmZlYXR1cmUoKSk7XG4gICAgICAgIHRoaXMuZXZhbENvdW50ICs9IDE7XG4gICAgICAgIHZhbHVlID0gLXZhbHVlWzBdOyAvLyBwYXJlbnROb2Rl44Gu5omL55Wq44GL44KJ6KaL44Gf44OQ44Oq44Ol44O844Gr5aSJ5o+b44GX44G+44GZ44CCXG4gICAgICAgIHBhcmVudE5vZGUudmFsdWVzW2VkZ2VJbmRleF0gPSB2YWx1ZTtcbiAgICAgICAgcGFyZW50Tm9kZS5ldmFsdWF0ZWRbZWRnZUluZGV4XSA9IHRydWU7XG4gICAgICAgIGlmICh0aGlzLm5vZGVzTGVuZ3RoID4gMC44NSAqIE5PREVTX01BWF9MRU5HVEgpIHtcbiAgICAgICAgICAgIHRoaXMuY2xlYW51cE5vZGVzKCk7XG4gICAgICAgIH1cbiAgICAgICAgY29uc3Qgbm9kZUlkID0gdGhpcy5jcmVhdGVOb2RlKGIsIHByb2IpO1xuICAgICAgICBwYXJlbnROb2RlLm5vZGVJZHNbZWRnZUluZGV4XSA9IG5vZGVJZDtcbiAgICAgICAgcGFyZW50Tm9kZS5oYXNoZXNbZWRnZUluZGV4XSA9IGIuaGFzaCgpO1xuICAgICAgICBwYXJlbnROb2RlLnRvdGFsVmFsdWUgLT0gcGFyZW50Tm9kZS50b3RhbEFjdGlvblZhbHVlc1tlZGdlSW5kZXhdO1xuICAgICAgICBwYXJlbnROb2RlLnRvdGFsQ291bnQgKz0gcGFyZW50Tm9kZS52aXNpdENvdW50c1tlZGdlSW5kZXhdO1xuICAgICAgICByZXR1cm4gdmFsdWU7XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogTUNUU+ODhOODquODvOOCklVDQuOBq+W+k+OBo+OBpuS4i+OCiuOAgeODquODvOODleODjuODvOODieOBq+WIsOmBlOOBl+OBn+OCieWxlemWi+OBl+OBvuOBmeOAglxuICAgICAqIEBwcml2YXRlXG4gICAgICogQHBhcmFtIHtCb2FyZH0gYiBcbiAgICAgKiBAcGFyYW0ge0ludGVnZXJ9IG5vZGVJZFxuICAgICAqL1xuICAgIGFzeW5jIHBsYXlvdXQoYiwgbm9kZUlkKSB7XG4gICAgICAgIGNvbnN0IG5vZGUgPSB0aGlzLm5vZGVzW25vZGVJZF07XG4gICAgICAgIGNvbnN0IFtzZWxlY3RlZEluZGV4LCBzZWxlY3RlZElkLCBzZWxlY3RlZE1vdmVdID0gdGhpcy5zZWxlY3RCeVVDQihiLCBub2RlKTtcbiAgICAgICAgYi5wbGF5KHNlbGVjdGVkTW92ZSk7XG4gICAgICAgIGNvbnN0IGlzSGVhZE5vZGUgPSAhdGhpcy5oYXNFZGdlTm9kZShzZWxlY3RlZEluZGV4LCBub2RlSWQsIGIubW92ZU51bWJlcik7XG4gICAgICAgIC8qXG4gICAgICAgIC8vIOS7peS4i+OBr1B5YXHjgYzmjqHnlKjjgZfjgZ/jg5jjg4Pjg4njg47jg7zjg4njga7mnaHku7bjgafjgZnjgIJcbiAgICAgICAgY29uc3QgaXNIZWFkTm9kZSA9ICF0aGlzLmhhc0VkZ2VOb2RlKHNlbGVjdGVkSW5kZXgsIG5vZGVJZCwgYi5tb3ZlTnVtYmVyKSB8fFxuICAgICAgICAgICAgbm9kZS52aXNpdENvdW50c1tzZWxlY3RlZEluZGV4XSA8IEVYUEFORF9DTlQgfHxcbiAgICAgICAgICAgIGIubW92ZU51bWJlciA+IGIuQy5CVkNOVCAqIDIgfHxcbiAgICAgICAgICAgIChzZWxlY3RlZE1vdmUgPT09IGIuQy5QQVNTICYmIGIucHJldk1vdmUgPT09IGIuQy5QQVNTKTtcbiAgICAgICAgKi9cbiAgICAgICAgY29uc3QgdmFsdWUgPSBpc0hlYWROb2RlID8gbm9kZS5ldmFsdWF0ZWRbc2VsZWN0ZWRJbmRleF0gPyBub2RlLnZhbHVlc1tzZWxlY3RlZEluZGV4XSA6IGF3YWl0IHRoaXMuZXZhbHVhdGVFZGdlKGIsIHNlbGVjdGVkSW5kZXgsIG5vZGUpIDogLShhd2FpdCB0aGlzLnBsYXlvdXQoYiwgc2VsZWN0ZWRJZCkpOyAvLyBzZWxlY3RlZElk44Gu5omL55Wq44Gn44Gu44OQ44Oq44Ol44O844GM6L+U44GV44KM44KL44GL44KJ56ym5Y+344KS5Y+N6Lui44GV44Gb44G+44GZ44CCXG4gICAgICAgIG5vZGUudG90YWxWYWx1ZSArPSB2YWx1ZTtcbiAgICAgICAgbm9kZS50b3RhbENvdW50ICs9IDE7XG4gICAgICAgIG5vZGUudG90YWxBY3Rpb25WYWx1ZXNbc2VsZWN0ZWRJbmRleF0gKz0gdmFsdWU7XG4gICAgICAgIG5vZGUudmlzaXRDb3VudHNbc2VsZWN0ZWRJbmRleF0gKz0gMTtcbiAgICAgICAgcmV0dXJuIHZhbHVlO1xuICAgIH1cblxuICAgIC8qKlxuICAgICAqIOODl+ODrOOCpOOCouOCpuODiOOCkue5sOOCiui/lOOBl+OBpk1DVFPjg4Tjg6rjg7zjgpLmm7TmlrDjgZfjgb7jgZnjgIJcbiAgICAgKiBAcHJpdmF0ZVxuICAgICAqIEBwYXJhbSB7Qm9hcmR9IGIgXG4gICAgICovXG4gICAgYXN5bmMga2VlcFBsYXlvdXQoYikge1xuICAgICAgICB0aGlzLmV2YWxDb3VudCA9IDA7XG4gICAgICAgIGxldCBiQ3B5ID0gbmV3IF9ib2FyZC5Cb2FyZChiLkMsIGIua29taSk7XG4gICAgICAgIGRvIHtcbiAgICAgICAgICAgIGIuY29weVRvKGJDcHkpO1xuICAgICAgICAgICAgYXdhaXQgdGhpcy5wbGF5b3V0KGJDcHksIHRoaXMucm9vdElkKTtcbiAgICAgICAgfSB3aGlsZSAoIXRoaXMuZXhpdENvbmRpdGlvbigpKTtcbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiDmjqLntKLjgYzlv4XopoHjgYvliKTlrprjgZfjgablv4XopoHjgavlv5zjgZjjgabmpJzntKLjgZfjgIHmnIDlloTjgajliKTmlq3jgZfjgZ/nnYDmiYvjgajli53njofjgpLov5TjgZfjgb7jgZnjgIJcbiAgICAgKiBAcHJpdmF0ZVxuICAgICAqIEBwYXJhbSB7Qm9hcmR9IGIgXG4gICAgICogQHBhcmFtIHtib29sfSBwb25kZXIgdHJ1ZeOBruOBqOOBjXN0b3Djg6Hjgr3jg4Pjg4njgYzlkbzjgbDjgozjgovjgb7jgafmjqLntKLjgpLntpnntprjgZfjgb7jgZlcbiAgICAgKiBAcGFyYW0ge2Jvb2x9IGNsZWFuIOW9ouWLouOBjOWkieOCj+OCieOBquOBhOmZkOOCiuODkeOCueS7peWkluOBruedgOaJi+OCkumBuOOBs+OBvuOBmVxuICAgICAqIEByZXR1cm5zIHtBcnJheX0gW+edgOaJiyjmm7jjgY/mnJ3prq7ns7vluqfmqJkpLCDli53njoddXG4gICAgICovXG4gICAgYXN5bmMgX3NlYXJjaChiLCBwb25kZXIsIGNsZWFuKSB7XG4gICAgICAgIC8vIEFscGhhR28gWmVyb+OBp+OBr+iHquW3seWvvuaIpuOBruW6j+ebpDMw5omL44G+44Gn44Gv44Ko44OD44K444Gu57eP6Kiq5ZWP5Zue5pWw44GL44KJ56K6546H5YiG5biD44KS566X5Ye644GX44Gm5Lmx5pWw44Gn552A5omL44KS5rSX5r+v44GX44G+44GZ44GM44CB5pys44Kz44O844OJ44Gn44Gv5by35YyW5a2m57+S44Gv5LqI5a6a44GX44Gm44GE44Gq44GE44Gu44Gn5pyA5ZaE44Go5Yik5pat44GX44Gf552A5omL44KS6L+U44GX44G+44GZ44CCXG4gICAgICAgIGxldCBiZXN0O1xuICAgICAgICBsZXQgc2Vjb25kO1xuICAgICAgICBpZiAocG9uZGVyIHx8IHRoaXMuc2hvdWxkU2VhcmNoKGJlc3QsIHNlY29uZCkpIHtcbiAgICAgICAgICAgIGF3YWl0IHRoaXMua2VlcFBsYXlvdXQoYik7XG4gICAgICAgICAgICBjb25zdCBiZXN0MiA9IHRoaXMubm9kZXNbdGhpcy5yb290SWRdLmJlc3QyKCk7XG4gICAgICAgICAgICBiZXN0ID0gYmVzdDJbMF07XG4gICAgICAgICAgICBzZWNvbmQgPSBiZXN0MlsxXTtcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIGNvbnN0IGJlc3QyID0gdGhpcy5ub2Rlc1t0aGlzLnJvb3RJZF0uYmVzdDIoKTtcbiAgICAgICAgICAgIGJlc3QgPSBiZXN0MlswXTtcbiAgICAgICAgICAgIHNlY29uZCA9IGJlc3QyWzFdO1xuICAgICAgICB9XG5cbiAgICAgICAgY29uc3Qgbm9kZSA9IHRoaXMubm9kZXNbdGhpcy5yb290SWRdO1xuXG4gICAgICAgIGlmIChjbGVhbiAmJiBub2RlLm1vdmVzW2Jlc3RdID09PSBiLkMuUEFTUyAmJiBub2RlLnRvdGFsQWN0aW9uVmFsdWVzW2Jlc3RdICogbm9kZS50b3RhbEFjdGlvblZhbHVlc1tzZWNvbmRdID4gMC4wKSB7XG4gICAgICAgICAgICByZXR1cm4gW25vZGUubW92ZXNbc2Vjb25kXSwgdGhpcy53aW5yYXRlKG5vZGUsIHNlY29uZCldO1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgcmV0dXJuIFtub2RlLm1vdmVzW2Jlc3RdLCB0aGlzLndpbnJhdGUobm9kZSwgYmVzdCldO1xuICAgICAgICB9XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogTUNUU+aOoue0ouODoeOCveODg+ODieOBp+OBmeOAglxuICAgICAqIF9zZWFyY2jjg6Hjgr3jg4Pjg4njga7jg6njg4Pjg5Hjg7zjg6Hjgr3jg4Pjg4njgafjgZnjgIJcbiAgICAgKiDntYLkuobmnaHku7bjgpLoqK3lrprjgZfjgIHlsYDpnaJi44KSdGltZeaZgumWk+aOoue0ouOBl+OAgee1kOaenOOCkuODreOCsOWHuuWKm+OBl+OBpuasoeOBruS4gOaJi+OBqOWLneeOh+OCkui/lOOBl+OBvuOBmeOAglxuICAgICAqIEBwYXJhbSB7Qm9hcmR9IGIgXG4gICAgICogQHBhcmFtIHtudW1iZXJ9IHRpbWUg5o6i57Si5pmC6ZaT44KS56eS5Y2Y5L2N44Gn5oyH5a6a44GX44G+44GZXG4gICAgICogQHBhcmFtIHtib29sfSBwb25kZXIgdHRydWXjga7jgajjgY1zdG9w44Oh44K944OD44OJ44GM5ZG844Gw44KM44KL44G+44Gn5o6i57Si44KS57aZ57aa44GX44G+44GZXG4gICAgICogQHBhcmFtIHtib29sfSBjbGVhbiDlvaLli6LjgYzlpInjgo/jgonjgarjgYTpmZDjgorjg5Hjgrnku6XlpJbjga7nnYDmiYvjgpLpgbjjgbPjgb7jgZlcbiAgICAgKiBAcmV0dXJucyB7QXJyYXl9IFvnnYDmiYso5pu444GP5pyd6a6u57O75bqn5qiZKSwg5Yud546HXVxuICAgICAqL1xuICAgIGFzeW5jIHNlYXJjaChiLCB0aW1lLCBwb25kZXIsIGNsZWFuKSB7XG4gICAgICAgIGNvbnN0IHN0YXJ0ID0gRGF0ZS5ub3coKTtcbiAgICAgICAgYXdhaXQgdGhpcy5wcmVwYXJlUm9vdE5vZGUoYik7XG5cbiAgICAgICAgaWYgKHRoaXMubm9kZXNbdGhpcy5yb290SWRdLmVkZ2VMZW5ndGggPD0gMSkge1xuICAgICAgICAgICAgLy8g5YCZ6KOc5omL44GM44OR44K544GX44GL44Gq44GR44KM44GwXG4gICAgICAgICAgICBjb25zb2xlLmxvZygnXFxubW92ZSBudW1iZXI9JWQ6JywgdGhpcy5yb290TW92ZU51bWJlciArIDEpO1xuICAgICAgICAgICAgdGhpcy5wcmludEluZm8odGhpcy5yb290SWQsIGIuQyk7XG4gICAgICAgICAgICByZXR1cm4gW2IuQy5QQVNTLCAwLjVdO1xuICAgICAgICB9XG5cbiAgICAgICAgdGhpcy5jbGVhbnVwTm9kZXMoKTtcblxuICAgICAgICBjb25zdCB0aW1lXyA9ICh0aW1lID09PSAwLjAgPyB0aGlzLmdldFNlYXJjaFRpbWUoYi5DKSA6IHRpbWUpICogMTAwMCAtIDUwMDsgLy8gMC4156eS44Gu44Oe44O844K444OzXG4gICAgICAgIHRoaXMudGVybWluYXRlRmxhZyA9IGZhbHNlO1xuICAgICAgICB0aGlzLmV4aXRDb25kaXRpb24gPSBwb25kZXIgPyBmdW5jdGlvbiAoKSB7XG4gICAgICAgICAgICByZXR1cm4gdGhpcy50ZXJtaW5hdGVGbGFnO1xuICAgICAgICB9IDogZnVuY3Rpb24gKCkge1xuICAgICAgICAgICAgcmV0dXJuIHRoaXMudGVybWluYXRlRmxhZyB8fCBEYXRlLm5vdygpIC0gc3RhcnQgPiB0aW1lXztcbiAgICAgICAgfTtcbiAgICAgICAgY29uc3QgW25leHRNb3ZlLCB3aW5SYXRlXSA9IGF3YWl0IHRoaXMuX3NlYXJjaChiLCBwb25kZXIsIGNsZWFuKTtcblxuICAgICAgICBpZiAoIXBvbmRlcikge1xuICAgICAgICAgICAgY29uc29sZS5sb2coJ1xcbm1vdmUgbnVtYmVyPSVkOiBsZWZ0IHRpbWU9JXNbc2VjXSBldmFsdWF0ZWQ9JWQnLCB0aGlzLnJvb3RNb3ZlTnVtYmVyICsgMSwgTWF0aC5tYXgodGhpcy5sZWZ0VGltZSAtIHRpbWUsIDAuMCkudG9GaXhlZCgxKSwgdGhpcy5ldmFsQ291bnQpO1xuICAgICAgICAgICAgdGhpcy5wcmludEluZm8odGhpcy5yb290SWQsIGIuQyk7XG4gICAgICAgICAgICB0aGlzLmxlZnRUaW1lID0gdGhpcy5sZWZ0VGltZSAtIChEYXRlLm5vdygpIC0gc3RhcnQpIC8gMTAwMDtcbiAgICAgICAgfVxuICAgICAgICByZXR1cm4gW25leHRNb3ZlLCB3aW5SYXRlXTtcbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiDlrp/ooYzkuK3jga5rZWVwUGxheW91dOOCkuWBnOatouOBleOBm+OBvuOBmeOAglxuICAgICAqL1xuICAgIHN0b3AoKSB7XG4gICAgICAgIHRoaXMudGVybWluYXRlRmxhZyA9IHRydWU7XG4gICAgfVxufVxuZXhwb3J0cy5NQ1RTID0gTUNUUzsiLCIndXNlIHN0cmljdCc7XG5cbk9iamVjdC5kZWZpbmVQcm9wZXJ0eShleHBvcnRzLCBcIl9fZXNNb2R1bGVcIiwge1xuICB2YWx1ZTogdHJ1ZVxufSk7XG5leHBvcnRzLk5ldXJhbE5ldHdvcmsgPSB1bmRlZmluZWQ7XG5cbnZhciBfd29ya2VyUm1pID0gcmVxdWlyZSgnd29ya2VyLXJtaScpO1xuXG4vKipcbiAqIOODi+ODpeODvOODqeODq+ODjeODg+ODiOODr+ODvOOCr+OBrlJNSeOBp+OBmeOAguODieOCreODpeODoeODs+ODiOOBr+acrOS9k+WBtOOBruOCs+ODvOODieOCkuWPgueFp+OBl+OBpuOBj+OBoOOBleOBhOOAglxuICogQGFsaWFzIE5ldXJhbE5ldHdvcmtSTUlcbiAqIEBzZWUgTmV1cmFsTmV0d29ya1xuICovXG5jbGFzcyBOZXVyYWxOZXR3b3JrIGV4dGVuZHMgX3dvcmtlclJtaS5Xb3JrZXJSTUkge1xuICBhc3luYyBldmFsdWF0ZSguLi5pbnB1dHMpIHtcbiAgICBjb25zdCByZXN1bHQgPSBhd2FpdCB0aGlzLmludm9rZVJNKCdldmFsdWF0ZScsIGlucHV0cyk7XG4gICAgcmV0dXJuIHJlc3VsdDtcbiAgfVxufVxuZXhwb3J0cy5OZXVyYWxOZXR3b3JrID0gTmV1cmFsTmV0d29yazsgLyoqXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgKiBAZmlsZSDjg4vjg6Xjg7zjg6njg6vjg43jg4Pjg4jjg6/jg7zjgq/jga5STUnjgafjgZnjgIJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAqL1xuLypcbiAqIEBhdXRob3Ig5biC5bed6ZuE5LqMXG4gKiBAY29weXJpZ2h0IDIwMTggSUNISUtBV0EsIFl1amkgKE5ldyAzIFJzKVxuICovIiwiXCJ1c2Ugc3RyaWN0XCI7XG5cbk9iamVjdC5kZWZpbmVQcm9wZXJ0eShleHBvcnRzLCBcIl9fZXNNb2R1bGVcIiwge1xuICAgIHZhbHVlOiB0cnVlXG59KTtcbi8qKlxuICogQGZpbGUg5Zuy56KB44Gu6YCj44KS6KGo44GZ44Kv44Op44K544Gn44GZ44CCXG4gKiDjgZPjga7jgrPjg7zjg4njga9QeWFx44Gu56e75qSN44Kz44O844OJ44Gn44GZ44CCXG4gKiBAc2VlIHtAbGluayBodHRwczovL2dpdGh1Yi5jb20veW1nYXEvUHlhcX1cbiAqL1xuLypcbiAqIEBhdXRob3Ig5biC5bed6ZuE5LqMXG4gKiBAY29weXJpZ2h0IDIwMTggSUNISUtBV0EsIFl1amkgKE5ldyAzIFJzKVxuICovXG5cbi8qKiDpgKPmg4XloLHjgq/jg6njgrkgKi9cbmNsYXNzIFN0b25lR3JvdXAge1xuICAgIC8qKlxuICAgICAqIFxuICAgICAqIEBwYXJhbSB7b2JqZWN0fSBib2FyZENvbnN0YW50c1xuICAgICAqL1xuICAgIGNvbnN0cnVjdG9yKGJvYXJkQ29uc3RhbnRzKSB7XG4gICAgICAgIHRoaXMuQyA9IGJvYXJkQ29uc3RhbnRzO1xuICAgICAgICB0aGlzLmxpYkNudCA9IHRoaXMuQy5WTlVMTDtcbiAgICAgICAgdGhpcy5zaXplID0gdGhpcy5DLlZOVUxMO1xuICAgICAgICB0aGlzLnZBdHIgPSB0aGlzLkMuVk5VTEw7XG4gICAgICAgIHRoaXMubGlicyA9IG5ldyBTZXQoKTtcbiAgICB9XG5cbiAgICBnZXRTaXplKCkge1xuICAgICAgICByZXR1cm4gdGhpcy5zaXplO1xuICAgIH1cblxuICAgIGdldExpYkNudCgpIHtcbiAgICAgICAgcmV0dXJuIHRoaXMubGliQ250O1xuICAgIH1cblxuICAgIGdldFZBdHIoKSB7XG4gICAgICAgIHJldHVybiB0aGlzLnZBdHI7XG4gICAgfVxuXG4gICAgY2xlYXIoc3RvbmUpIHtcbiAgICAgICAgdGhpcy5saWJDbnQgPSBzdG9uZSA/IDAgOiB0aGlzLkMuVk5VTEw7XG4gICAgICAgIHRoaXMuc2l6ZSA9IHN0b25lID8gMSA6IHRoaXMuQy5WTlVMTDtcbiAgICAgICAgdGhpcy52QXRyID0gdGhpcy5DLlZOVUxMO1xuICAgICAgICB0aGlzLmxpYnMuY2xlYXIoKTtcbiAgICB9XG5cbiAgICBhZGQodikge1xuICAgICAgICBpZiAodGhpcy5saWJzLmhhcyh2KSkge1xuICAgICAgICAgICAgcmV0dXJuO1xuICAgICAgICB9XG4gICAgICAgIHRoaXMubGlicy5hZGQodik7XG4gICAgICAgIHRoaXMubGliQ250ICs9IDE7XG4gICAgICAgIHRoaXMudkF0ciA9IHY7XG4gICAgfVxuXG4gICAgc3ViKHYpIHtcbiAgICAgICAgaWYgKCF0aGlzLmxpYnMuaGFzKHYpKSB7XG4gICAgICAgICAgICByZXR1cm47XG4gICAgICAgIH1cbiAgICAgICAgdGhpcy5saWJzLmRlbGV0ZSh2KTtcbiAgICAgICAgdGhpcy5saWJDbnQgLT0gMTtcbiAgICB9XG5cbiAgICBtZXJnZShvdGhlcikge1xuICAgICAgICB0aGlzLmxpYnMgPSBuZXcgU2V0KFsuLi50aGlzLmxpYnMsIC4uLm90aGVyLmxpYnNdKTtcbiAgICAgICAgdGhpcy5saWJDbnQgPSB0aGlzLmxpYnMuc2l6ZTtcbiAgICAgICAgdGhpcy5zaXplICs9IG90aGVyLnNpemU7XG4gICAgICAgIGlmICh0aGlzLmxpYkNudCA9PT0gMSkge1xuICAgICAgICAgICAgc2VsZi52QXRyID0gdGhpcy5saWJzWzBdO1xuICAgICAgICB9XG4gICAgfVxuXG4gICAgY29weVRvKGRlc3QpIHtcbiAgICAgICAgZGVzdC5saWJDbnQgPSB0aGlzLmxpYkNudDtcbiAgICAgICAgZGVzdC5zaXplID0gdGhpcy5zaXplO1xuICAgICAgICBkZXN0LnZBdHIgPSB0aGlzLnZBdHI7XG4gICAgICAgIGRlc3QubGlicyA9IG5ldyBTZXQodGhpcy5saWJzKTtcbiAgICB9XG59XG5leHBvcnRzLlN0b25lR3JvdXAgPSBTdG9uZUdyb3VwOyIsIid1c2Ugc3RyaWN0JztcblxuT2JqZWN0LmRlZmluZVByb3BlcnR5KGV4cG9ydHMsIFwiX19lc01vZHVsZVwiLCB7XG4gICAgdmFsdWU6IHRydWVcbn0pO1xuZXhwb3J0cy5zaHVmZmxlID0gc2h1ZmZsZTtcbmV4cG9ydHMubW9zdENvbW1vbiA9IG1vc3RDb21tb247XG5leHBvcnRzLmFyZ3NvcnQgPSBhcmdzb3J0O1xuZXhwb3J0cy5hcmdtYXggPSBhcmdtYXg7XG5leHBvcnRzLmhhc2ggPSBoYXNoO1xuZXhwb3J0cy5zb2Z0bWF4ID0gc29mdG1heDtcbmV4cG9ydHMucHJpbnRQcm9iID0gcHJpbnRQcm9iO1xuLyoqXG4gKiBAZmlsZSDlkITnqK7jg6bjg7zjg4bjgqPjg6rjg4bjgqPplqLmlbDnvqTjgafjgZnjgIJcbiAqL1xuLypcbiAqIEBhdXRob3Ig5biC5bed6ZuE5LqMXG4gKiBAY29weXJpZ2h0IDIwMTggSUNISUtBV0EsIFl1amkgKE5ldyAzIFJzKVxuICovXG5cbi8qKlxuICogQHBhcmFtIHtBcnJheX0gYXJyYXlcbiAqL1xuZnVuY3Rpb24gc2h1ZmZsZShhcnJheSkge1xuICAgIGxldCBuID0gYXJyYXkubGVuZ3RoO1xuICAgIGxldCB0O1xuICAgIGxldCBpO1xuXG4gICAgd2hpbGUgKG4pIHtcbiAgICAgICAgaSA9IE1hdGguZmxvb3IoTWF0aC5yYW5kb20oKSAqIG4tLSk7XG4gICAgICAgIHQgPSBhcnJheVtuXTtcbiAgICAgICAgYXJyYXlbbl0gPSBhcnJheVtpXTtcbiAgICAgICAgYXJyYXlbaV0gPSB0O1xuICAgIH1cblxuICAgIHJldHVybiBhcnJheTtcbn1cblxuLyoqXG4gKiBhcnJheeOBruS4reOBruacgOmgu+WHuuimgee0oOOCkui/lOOBl+OBvuOBmeOAglxuICogQHBhcmFtIHtBcnJheX0gYXJyYXkgXG4gKi9cbmZ1bmN0aW9uIG1vc3RDb21tb24oYXJyYXkpIHtcbiAgICBjb25zdCBtYXAgPSBuZXcgTWFwKCk7XG4gICAgZm9yIChsZXQgaSA9IDA7IGkgPCBhcnJheS5sZW5ndGg7IGkrKykge1xuICAgICAgICBjb25zdCBlID0gYXJyYXlbaV07XG4gICAgICAgIGlmIChtYXAuaGFzKGUpKSB7XG4gICAgICAgICAgICBtYXAuc2V0KGUsIG1hcC5nZXQoZSkgKyAxKTtcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIG1hcC5zZXQoZSwgMSk7XG4gICAgICAgIH1cbiAgICB9XG4gICAgbGV0IG1heEtleTtcbiAgICBsZXQgbWF4VmFsdWUgPSAtMTtcbiAgICBmb3IgKGNvbnN0IFtrZXksIHZhbHVlXSBvZiBtYXAuZW50cmllcygpKSB7XG4gICAgICAgIGlmICh2YWx1ZSA+IG1heFZhbHVlKSB7XG4gICAgICAgICAgICBtYXhLZXkgPSBrZXk7XG4gICAgICAgICAgICBtYXhWYWx1ZSA9IHZhbHVlO1xuICAgICAgICB9XG4gICAgfVxuICAgIHJldHVybiBtYXhLZXk7XG59XG5cbi8qKiBhcnJheeOCkuOCveODvOODiOOBl+OBn+aZguOBruOCpOODs+ODh+ODg+OCr+OCuemFjeWIl+OCkui/lOOBl+OBvuOBmeOAglxuICogQHBhcmFtIHtudW1iZXJbXX0gYXJyYXkgXG4gKiBAcGFyYW0ge2Jvb2x9IHJldmVyc2UgXG4gKi9cbmZ1bmN0aW9uIGFyZ3NvcnQoYXJyYXksIHJldmVyc2UpIHtcbiAgICBjb25zdCBlbiA9IEFycmF5LmZyb20oYXJyYXkpLm1hcCgoZSwgaSkgPT4gW2ksIGVdKTtcbiAgICBlbi5zb3J0KChhLCBiKSA9PiByZXZlcnNlID8gYlsxXSAtIGFbMV0gOiBhWzFdIC0gYlsxXSk7XG4gICAgcmV0dXJuIGVuLm1hcChlID0+IGVbMF0pO1xufVxuXG4vKipcbiAqIGFycmF544Gu5Lit44Gu5pyA5aSn5YCk44Gu44Kk44Oz44OH44OD44Kv44K544KS6L+U44GX44G+44GZ44CCXG4gKiBAcGFyYW0ge251bWJlcltdfSBhcnJheSBcbiAqL1xuZnVuY3Rpb24gYXJnbWF4KGFycmF5KSB7XG4gICAgbGV0IG1heEluZGV4O1xuICAgIGxldCBtYXhWYWx1ZSA9IC1JbmZpbml0eTtcbiAgICBmb3IgKGxldCBpID0gMDsgaSA8IGFycmF5Lmxlbmd0aDsgaSsrKSB7XG4gICAgICAgIGNvbnN0IHYgPSBhcnJheVtpXTtcbiAgICAgICAgaWYgKHYgPiBtYXhWYWx1ZSkge1xuICAgICAgICAgICAgbWF4SW5kZXggPSBpO1xuICAgICAgICAgICAgbWF4VmFsdWUgPSB2O1xuICAgICAgICB9XG4gICAgfVxuICAgIHJldHVybiBtYXhJbmRleDtcbn1cblxuLyoqXG4gKiBzdHLjga4zMi1iaXTjg4/jg4Pjgrfjg6XlgKTjgpLov5TjgZfjgb7jgZnjgIJcbiAqICjms6gpMTnot6/nm6Tjgafjga8zMi1iaXTjg4/jg4Pjgrfjg6XlgKTjga/ooZ3nqoHjgZnjgovjgajoqIDjgo/jgozjgabjgYTjgb7jgZnjgYzooZ3nqoHjgavjga/lr77lv5zjgZfjgabjgYTjgb7jgZvjgpPjgIJcbiAqIEBwYXJhbSB7c3RyaW5nfSBzdHIgXG4gKiBAcmV0dXJucyB7SW50ZWdlcn1cbiAqL1xuZnVuY3Rpb24gaGFzaChzdHIpIHtcbiAgICBsZXQgaGFzaCA9IDUzODE7XG4gICAgZm9yIChsZXQgaSA9IDA7IGkgPCBzdHIubGVuZ3RoOyBpKyspIHtcbiAgICAgICAgY29uc3QgY2hhciA9IHN0ci5jaGFyQ29kZUF0KGkpO1xuICAgICAgICBoYXNoID0gKGhhc2ggPDwgNSkgKyBoYXNoICsgY2hhcjsgLyogaGFzaCAqIDMzICsgYyAqL1xuICAgICAgICBoYXNoID0gaGFzaCAmIGhhc2g7IC8vIENvbnZlcnQgdG8gMzJiaXQgaW50ZWdlclxuICAgIH1cbiAgICByZXR1cm4gTWF0aC5hYnMoaGFzaCk7XG59XG5cbi8qKlxuICog5rip5bqm44OR44Op44Oh44O844K/44GC44KK44Gu44K944OV44OI44Oe44OD44Kv44K56Zai5pWw44Gn44GZ44CCXG4gKiBAcGFyYW0ge0Zsb2F0MzJBcnJheX0gaW5wdXQgXG4gKiBAcGFyYW0ge251bWJlcn0gdGVtcGVyYXR1cmVcbiAqIEByZXR1cm5zIHtGbG9hdDMyQXJyYXl9XG4gKi9cbmZ1bmN0aW9uIHNvZnRtYXgoaW5wdXQsIHRlbXBlcmF0dXJlID0gMS4wKSB7XG4gICAgY29uc3Qgb3V0cHV0ID0gbmV3IEZsb2F0MzJBcnJheShpbnB1dC5sZW5ndGgpO1xuICAgIGNvbnN0IGFscGhhID0gTWF0aC5tYXguYXBwbHkobnVsbCwgaW5wdXQpO1xuICAgIGxldCBkZW5vbSA9IDAuMDtcblxuICAgIGZvciAobGV0IGkgPSAwOyBpIDwgaW5wdXQubGVuZ3RoOyBpKyspIHtcbiAgICAgICAgY29uc3QgdmFsID0gTWF0aC5leHAoKGlucHV0W2ldIC0gYWxwaGEpIC8gdGVtcGVyYXR1cmUpO1xuICAgICAgICBkZW5vbSArPSB2YWw7XG4gICAgICAgIG91dHB1dFtpXSA9IHZhbDtcbiAgICB9XG5cbiAgICBmb3IgKGxldCBpID0gMDsgaSA8IG91dHB1dC5sZW5ndGg7IGkrKykge1xuICAgICAgICBvdXRwdXRbaV0gLz0gZGVub207XG4gICAgfVxuXG4gICAgcmV0dXJuIG91dHB1dDtcbn1cblxuZnVuY3Rpb24gcHJpbnRQcm9iKHByb2IsIHNpemUpIHtcbiAgICBmb3IgKGxldCB5ID0gMDsgeSA8IHNpemU7IHkrKykge1xuICAgICAgICBsZXQgc3RyID0gYCR7eSArIDF9IGA7XG4gICAgICAgIGZvciAobGV0IHggPSAwOyB4IDwgc2l6ZTsgeCsrKSB7XG4gICAgICAgICAgICBzdHIgKz0gKCcgICcgKyBwcm9iW3ggKyB5ICogc2l6ZV0udG9GaXhlZCgxKSkuc2xpY2UoLTUpO1xuICAgICAgICB9XG4gICAgICAgIGNvbnNvbGUubG9nKHN0cik7XG4gICAgfVxuICAgIGNvbnNvbGUubG9nKCdwYXNzPSVzJywgcHJvYltwcm9iLmxlbmd0aCAtIDFdLnRvRml4ZWQoMSkpO1xufSIsIid1c2Ugc3RyaWN0JztcblxudmFyIF93b3JrZXJSbWkgPSByZXF1aXJlKCd3b3JrZXItcm1pJyk7XG5cbnZhciBfYXpqc19lbmdpbmUgPSByZXF1aXJlKCcuL2F6anNfZW5naW5lLmpzJyk7XG5cbi8qKlxuICogQGZpbGUg44Km44Kn44OW44Ov44O844Kr44Gu44Ko44Oz44OI44Oq44O844Od44Kk44Oz44OI44Gn44GZ44CCXG4gKi9cbi8qXG4gKiBAYXV0aG9yIOW4guW3nembhOS6jFxuICogQGNvcHlyaWdodCAyMDE4IElDSElLQVdBLCBZdWppIChOZXcgMyBScylcbiAqL1xuKDAsIF93b3JrZXJSbWkucmVzaWd0ZXJXb3JrZXJSTUkpKHNlbGYsIF9hempzX2VuZ2luZS5BWmpzRW5naW5lKTsiXX0=
