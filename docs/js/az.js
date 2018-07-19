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

/**
 * 思考エンジンAZjsEngineのRMI版です。ドキュメントは本体側のコードを参照してください。
 * @alias AZjsEngineRMI
 * @see AZjsEngine
 */
class AZjsEngine extends _workerRmi.WorkerRMI {
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
exports.AZjsEngine = AZjsEngine; /**
                                  * @file 思考エンジンAZjsEngineのRMI版です。ドキュメントは本体側のコードを参照してください。
                                  */
/*
 * @author 市川雄二
 * @copyright 2018 ICHIKAWA, Yuji (New 3 Rs)
 * @license MIT
 */
},{"worker-rmi":3}],5:[function(require,module,exports){
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

var _workerRmi = require('worker-rmi');

var _speech = require('./speech.js');

var _neural_network = require('./neural_network.js');

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
    const engine = new _azjs_engine_client.AZjsEngine(worker, size);
    await startGame(size, engine);
}

// 思考エンジンAZjsEngineの本体をウェブワーカーとして動かします。
const worker = new Worker('js/az-worker.js');
// ニューラルネットワークをメインスレッドで動かすように登録します。
// WebGL/WebGPUがメインスレッドのみで動作するからです。
// 実際の呼び出しは上記ワーカがします。
(0, _workerRmi.resigterWorkerRMI)(worker, _neural_network.NeuralNetwork);

main();
},{"./azjs_engine_client.js":4,"./board_controller.js":5,"./neural_network.js":7,"./play_controller.js":8,"./speech.js":9,"worker-rmi":3}],7:[function(require,module,exports){
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
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIm5vZGVfbW9kdWxlcy9icm93c2VyLXBhY2svX3ByZWx1ZGUuanMiLCJub2RlX21vZHVsZXMvYnNvbi1vYmplY3RpZC9vYmplY3RpZC5qcyIsIm5vZGVfbW9kdWxlcy9wcm9jZXNzL2Jyb3dzZXIuanMiLCJub2RlX21vZHVsZXMvd29ya2VyLXJtaS93b3JrZXItcm1pLmpzIiwic3JjL2F6anNfZW5naW5lX2NsaWVudC5qcyIsInNyYy9ib2FyZF9jb250cm9sbGVyLmpzIiwic3JjL21haW4uanMiLCJzcmMvbmV1cmFsX25ldHdvcmsuanMiLCJzcmMvcGxheV9jb250cm9sbGVyLmpzIiwic3JjL3NwZWVjaC5qcyIsInNyYy91dGlscy5qcyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7QUNBQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7OztBQzlOQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ3hMQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUMzS0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQzdFQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ3BQQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUMvSkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ3pGQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUM5UUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ3JHQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0EiLCJmaWxlIjoiZ2VuZXJhdGVkLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXNDb250ZW50IjpbIihmdW5jdGlvbigpe2Z1bmN0aW9uIHIoZSxuLHQpe2Z1bmN0aW9uIG8oaSxmKXtpZighbltpXSl7aWYoIWVbaV0pe3ZhciBjPVwiZnVuY3Rpb25cIj09dHlwZW9mIHJlcXVpcmUmJnJlcXVpcmU7aWYoIWYmJmMpcmV0dXJuIGMoaSwhMCk7aWYodSlyZXR1cm4gdShpLCEwKTt2YXIgYT1uZXcgRXJyb3IoXCJDYW5ub3QgZmluZCBtb2R1bGUgJ1wiK2krXCInXCIpO3Rocm93IGEuY29kZT1cIk1PRFVMRV9OT1RfRk9VTkRcIixhfXZhciBwPW5baV09e2V4cG9ydHM6e319O2VbaV1bMF0uY2FsbChwLmV4cG9ydHMsZnVuY3Rpb24ocil7dmFyIG49ZVtpXVsxXVtyXTtyZXR1cm4gbyhufHxyKX0scCxwLmV4cG9ydHMscixlLG4sdCl9cmV0dXJuIG5baV0uZXhwb3J0c31mb3IodmFyIHU9XCJmdW5jdGlvblwiPT10eXBlb2YgcmVxdWlyZSYmcmVxdWlyZSxpPTA7aTx0Lmxlbmd0aDtpKyspbyh0W2ldKTtyZXR1cm4gb31yZXR1cm4gcn0pKCkiLCJcbnZhciBNQUNISU5FX0lEID0gTWF0aC5mbG9vcihNYXRoLnJhbmRvbSgpICogMHhGRkZGRkYpO1xudmFyIGluZGV4ID0gT2JqZWN0SUQuaW5kZXggPSBwYXJzZUludChNYXRoLnJhbmRvbSgpICogMHhGRkZGRkYsIDEwKTtcbnZhciBwaWQgPSAodHlwZW9mIHByb2Nlc3MgPT09ICd1bmRlZmluZWQnIHx8IHR5cGVvZiBwcm9jZXNzLnBpZCAhPT0gJ251bWJlcicgPyBNYXRoLmZsb29yKE1hdGgucmFuZG9tKCkgKiAxMDAwMDApIDogcHJvY2Vzcy5waWQpICUgMHhGRkZGO1xuXG4vKipcbiAqIERldGVybWluZSBpZiBhbiBvYmplY3QgaXMgQnVmZmVyXG4gKlxuICogQXV0aG9yOiAgIEZlcm9zcyBBYm91a2hhZGlqZWggPGZlcm9zc0BmZXJvc3Mub3JnPiA8aHR0cDovL2Zlcm9zcy5vcmc+XG4gKiBMaWNlbnNlOiAgTUlUXG4gKlxuICovXG52YXIgaXNCdWZmZXIgPSBmdW5jdGlvbiAob2JqKSB7XG4gIHJldHVybiAhIShcbiAgb2JqICE9IG51bGwgJiZcbiAgb2JqLmNvbnN0cnVjdG9yICYmXG4gIHR5cGVvZiBvYmouY29uc3RydWN0b3IuaXNCdWZmZXIgPT09ICdmdW5jdGlvbicgJiZcbiAgb2JqLmNvbnN0cnVjdG9yLmlzQnVmZmVyKG9iailcbiAgKVxufTtcblxuLyoqXG4gKiBDcmVhdGUgYSBuZXcgaW1tdXRhYmxlIE9iamVjdElEIGluc3RhbmNlXG4gKlxuICogQGNsYXNzIFJlcHJlc2VudHMgdGhlIEJTT04gT2JqZWN0SUQgdHlwZVxuICogQHBhcmFtIHtTdHJpbmd8TnVtYmVyfSBhcmcgQ2FuIGJlIGEgMjQgYnl0ZSBoZXggc3RyaW5nLCAxMiBieXRlIGJpbmFyeSBzdHJpbmcgb3IgYSBOdW1iZXIuXG4gKiBAcmV0dXJuIHtPYmplY3R9IGluc3RhbmNlIG9mIE9iamVjdElELlxuICovXG5mdW5jdGlvbiBPYmplY3RJRChhcmcpIHtcbiAgaWYoISh0aGlzIGluc3RhbmNlb2YgT2JqZWN0SUQpKSByZXR1cm4gbmV3IE9iamVjdElEKGFyZyk7XG4gIGlmKGFyZyAmJiAoKGFyZyBpbnN0YW5jZW9mIE9iamVjdElEKSB8fCBhcmcuX2Jzb250eXBlPT09XCJPYmplY3RJRFwiKSlcbiAgICByZXR1cm4gYXJnO1xuXG4gIHZhciBidWY7XG5cbiAgaWYoaXNCdWZmZXIoYXJnKSB8fCAoQXJyYXkuaXNBcnJheShhcmcpICYmIGFyZy5sZW5ndGg9PT0xMikpIHtcbiAgICBidWYgPSBBcnJheS5wcm90b3R5cGUuc2xpY2UuY2FsbChhcmcpO1xuICB9XG4gIGVsc2UgaWYodHlwZW9mIGFyZyA9PT0gXCJzdHJpbmdcIikge1xuICAgIGlmKGFyZy5sZW5ndGghPT0xMiAmJiAhT2JqZWN0SUQuaXNWYWxpZChhcmcpKVxuICAgICAgdGhyb3cgbmV3IEVycm9yKFwiQXJndW1lbnQgcGFzc2VkIGluIG11c3QgYmUgYSBzaW5nbGUgU3RyaW5nIG9mIDEyIGJ5dGVzIG9yIGEgc3RyaW5nIG9mIDI0IGhleCBjaGFyYWN0ZXJzXCIpO1xuXG4gICAgYnVmID0gYnVmZmVyKGFyZyk7XG4gIH1cbiAgZWxzZSBpZigvbnVtYmVyfHVuZGVmaW5lZC8udGVzdCh0eXBlb2YgYXJnKSkge1xuICAgIGJ1ZiA9IGJ1ZmZlcihnZW5lcmF0ZShhcmcpKTtcbiAgfVxuXG4gIE9iamVjdC5kZWZpbmVQcm9wZXJ0eSh0aGlzLCBcImlkXCIsIHtcbiAgICBlbnVtZXJhYmxlOiB0cnVlLFxuICAgIGdldDogZnVuY3Rpb24oKSB7IHJldHVybiBTdHJpbmcuZnJvbUNoYXJDb2RlLmFwcGx5KHRoaXMsIGJ1Zik7IH1cbiAgfSk7XG4gIE9iamVjdC5kZWZpbmVQcm9wZXJ0eSh0aGlzLCBcInN0clwiLCB7XG4gICAgZ2V0OiBmdW5jdGlvbigpIHsgcmV0dXJuIGJ1Zi5tYXAoaGV4LmJpbmQodGhpcywgMikpLmpvaW4oJycpOyB9XG4gIH0pO1xufVxubW9kdWxlLmV4cG9ydHMgPSBPYmplY3RJRDtcbk9iamVjdElELmdlbmVyYXRlID0gZ2VuZXJhdGU7XG5PYmplY3RJRC5kZWZhdWx0ID0gT2JqZWN0SUQ7XG5cbi8qKlxuICogQ3JlYXRlcyBhbiBPYmplY3RJRCBmcm9tIGEgc2Vjb25kIGJhc2VkIG51bWJlciwgd2l0aCB0aGUgcmVzdCBvZiB0aGUgT2JqZWN0SUQgemVyb2VkIG91dC4gVXNlZCBmb3IgY29tcGFyaXNvbnMgb3Igc29ydGluZyB0aGUgT2JqZWN0SUQuXG4gKlxuICogQHBhcmFtIHtOdW1iZXJ9IHRpbWUgYW4gaW50ZWdlciBudW1iZXIgcmVwcmVzZW50aW5nIGEgbnVtYmVyIG9mIHNlY29uZHMuXG4gKiBAcmV0dXJuIHtPYmplY3RJRH0gcmV0dXJuIHRoZSBjcmVhdGVkIE9iamVjdElEXG4gKiBAYXBpIHB1YmxpY1xuICovXG5PYmplY3RJRC5jcmVhdGVGcm9tVGltZSA9IGZ1bmN0aW9uKHRpbWUpe1xuICB0aW1lID0gcGFyc2VJbnQodGltZSwgMTApICUgMHhGRkZGRkZGRjtcbiAgcmV0dXJuIG5ldyBPYmplY3RJRChoZXgoOCx0aW1lKStcIjAwMDAwMDAwMDAwMDAwMDBcIik7XG59O1xuXG4vKipcbiAqIENyZWF0ZXMgYW4gT2JqZWN0SUQgZnJvbSBhIGhleCBzdHJpbmcgcmVwcmVzZW50YXRpb24gb2YgYW4gT2JqZWN0SUQuXG4gKlxuICogQHBhcmFtIHtTdHJpbmd9IGhleFN0cmluZyBjcmVhdGUgYSBPYmplY3RJRCBmcm9tIGEgcGFzc2VkIGluIDI0IGJ5dGUgaGV4c3RyaW5nLlxuICogQHJldHVybiB7T2JqZWN0SUR9IHJldHVybiB0aGUgY3JlYXRlZCBPYmplY3RJRFxuICogQGFwaSBwdWJsaWNcbiAqL1xuT2JqZWN0SUQuY3JlYXRlRnJvbUhleFN0cmluZyA9IGZ1bmN0aW9uKGhleFN0cmluZykge1xuICBpZighT2JqZWN0SUQuaXNWYWxpZChoZXhTdHJpbmcpKVxuICAgIHRocm93IG5ldyBFcnJvcihcIkludmFsaWQgT2JqZWN0SUQgaGV4IHN0cmluZ1wiKTtcblxuICByZXR1cm4gbmV3IE9iamVjdElEKGhleFN0cmluZyk7XG59O1xuXG4vKipcbiAqIENoZWNrcyBpZiBhIHZhbHVlIGlzIGEgdmFsaWQgYnNvbiBPYmplY3RJZFxuICpcbiAqIEBwYXJhbSB7U3RyaW5nfSBvYmplY3RpZCBDYW4gYmUgYSAyNCBieXRlIGhleCBzdHJpbmcgb3IgYW4gaW5zdGFuY2Ugb2YgT2JqZWN0SUQuXG4gKiBAcmV0dXJuIHtCb29sZWFufSByZXR1cm4gdHJ1ZSBpZiB0aGUgdmFsdWUgaXMgYSB2YWxpZCBic29uIE9iamVjdElELCByZXR1cm4gZmFsc2Ugb3RoZXJ3aXNlLlxuICogQGFwaSBwdWJsaWNcbiAqXG4gKiBUSEUgTkFUSVZFIERPQ1VNRU5UQVRJT04gSVNOJ1QgQ0xFQVIgT04gVEhJUyBHVVkhXG4gKiBodHRwOi8vbW9uZ29kYi5naXRodWIuaW8vbm9kZS1tb25nb2RiLW5hdGl2ZS9hcGktYnNvbi1nZW5lcmF0ZWQvb2JqZWN0aWQuaHRtbCNvYmplY3RpZC1pc3ZhbGlkXG4gKi9cbk9iamVjdElELmlzVmFsaWQgPSBmdW5jdGlvbihvYmplY3RpZCkge1xuICBpZighb2JqZWN0aWQpIHJldHVybiBmYWxzZTtcblxuICAvL2NhbGwgLnRvU3RyaW5nKCkgdG8gZ2V0IHRoZSBoZXggaWYgd2UncmVcbiAgLy8gd29ya2luZyB3aXRoIGFuIGluc3RhbmNlIG9mIE9iamVjdElEXG4gIHJldHVybiAvXlswLTlBLUZdezI0fSQvaS50ZXN0KG9iamVjdGlkLnRvU3RyaW5nKCkpO1xufTtcblxuLyoqXG4gKiBzZXQgYSBjdXN0b20gbWFjaGluZUlEXG4gKiBcbiAqIEBwYXJhbSB7U3RyaW5nfE51bWJlcn0gbWFjaGluZWlkIENhbiBiZSBhIHN0cmluZywgaGV4LXN0cmluZyBvciBhIG51bWJlclxuICogQHJldHVybiB7dm9pZH1cbiAqIEBhcGkgcHVibGljXG4gKi9cbk9iamVjdElELnNldE1hY2hpbmVJRCA9IGZ1bmN0aW9uKGFyZykge1xuICB2YXIgbWFjaGluZUlEO1xuXG4gIGlmKHR5cGVvZiBhcmcgPT09IFwic3RyaW5nXCIpIHtcbiAgICAvLyBoZXggc3RyaW5nXG4gICAgbWFjaGluZUlEID0gcGFyc2VJbnQoYXJnLCAxNik7XG4gICBcbiAgICAvLyBhbnkgc3RyaW5nXG4gICAgaWYoaXNOYU4obWFjaGluZUlEKSkge1xuICAgICAgYXJnID0gKCcwMDAwMDAnICsgYXJnKS5zdWJzdHIoLTcsNik7XG5cbiAgICAgIG1hY2hpbmVJRCA9IFwiXCI7XG4gICAgICBmb3IodmFyIGkgPSAwO2k8NjsgaSsrKSB7XG4gICAgICAgIG1hY2hpbmVJRCArPSAoYXJnLmNoYXJDb2RlQXQoaSkpO1xuICAgICAgfVxuICAgIH1cbiAgfVxuICBlbHNlIGlmKC9udW1iZXJ8dW5kZWZpbmVkLy50ZXN0KHR5cGVvZiBhcmcpKSB7XG4gICAgbWFjaGluZUlEID0gYXJnIHwgMDtcbiAgfVxuXG4gIE1BQ0hJTkVfSUQgPSAobWFjaGluZUlEICYgMHhGRkZGRkYpO1xufVxuXG4vKipcbiAqIGdldCB0aGUgbWFjaGluZUlEXG4gKiBcbiAqIEByZXR1cm4ge251bWJlcn1cbiAqIEBhcGkgcHVibGljXG4gKi9cbk9iamVjdElELmdldE1hY2hpbmVJRCA9IGZ1bmN0aW9uKCkge1xuICByZXR1cm4gTUFDSElORV9JRDtcbn1cblxuT2JqZWN0SUQucHJvdG90eXBlID0ge1xuICBfYnNvbnR5cGU6ICdPYmplY3RJRCcsXG4gIGNvbnN0cnVjdG9yOiBPYmplY3RJRCxcblxuICAvKipcbiAgICogUmV0dXJuIHRoZSBPYmplY3RJRCBpZCBhcyBhIDI0IGJ5dGUgaGV4IHN0cmluZyByZXByZXNlbnRhdGlvblxuICAgKlxuICAgKiBAcmV0dXJuIHtTdHJpbmd9IHJldHVybiB0aGUgMjQgYnl0ZSBoZXggc3RyaW5nIHJlcHJlc2VudGF0aW9uLlxuICAgKiBAYXBpIHB1YmxpY1xuICAgKi9cbiAgdG9IZXhTdHJpbmc6IGZ1bmN0aW9uKCkge1xuICAgIHJldHVybiB0aGlzLnN0cjtcbiAgfSxcblxuICAvKipcbiAgICogQ29tcGFyZXMgdGhlIGVxdWFsaXR5IG9mIHRoaXMgT2JqZWN0SUQgd2l0aCBgb3RoZXJJRGAuXG4gICAqXG4gICAqIEBwYXJhbSB7T2JqZWN0fSBvdGhlciBPYmplY3RJRCBpbnN0YW5jZSB0byBjb21wYXJlIGFnYWluc3QuXG4gICAqIEByZXR1cm4ge0Jvb2xlYW59IHRoZSByZXN1bHQgb2YgY29tcGFyaW5nIHR3byBPYmplY3RJRCdzXG4gICAqIEBhcGkgcHVibGljXG4gICAqL1xuICBlcXVhbHM6IGZ1bmN0aW9uIChvdGhlcil7XG4gICAgcmV0dXJuICEhb3RoZXIgJiYgdGhpcy5zdHIgPT09IG90aGVyLnRvU3RyaW5nKCk7XG4gIH0sXG5cbiAgLyoqXG4gICAqIFJldHVybnMgdGhlIGdlbmVyYXRpb24gZGF0ZSAoYWNjdXJhdGUgdXAgdG8gdGhlIHNlY29uZCkgdGhhdCB0aGlzIElEIHdhcyBnZW5lcmF0ZWQuXG4gICAqXG4gICAqIEByZXR1cm4ge0RhdGV9IHRoZSBnZW5lcmF0aW9uIGRhdGVcbiAgICogQGFwaSBwdWJsaWNcbiAgICovXG4gIGdldFRpbWVzdGFtcDogZnVuY3Rpb24oKXtcbiAgICByZXR1cm4gbmV3IERhdGUocGFyc2VJbnQodGhpcy5zdHIuc3Vic3RyKDAsOCksIDE2KSAqIDEwMDApO1xuICB9XG59O1xuXG5mdW5jdGlvbiBuZXh0KCkge1xuICByZXR1cm4gaW5kZXggPSAoaW5kZXgrMSkgJSAweEZGRkZGRjtcbn1cblxuZnVuY3Rpb24gZ2VuZXJhdGUodGltZSkge1xuICBpZiAodHlwZW9mIHRpbWUgIT09ICdudW1iZXInKVxuICAgIHRpbWUgPSBEYXRlLm5vdygpLzEwMDA7XG5cbiAgLy9rZWVwIGl0IGluIHRoZSByaW5nIVxuICB0aW1lID0gcGFyc2VJbnQodGltZSwgMTApICUgMHhGRkZGRkZGRjtcblxuICAvL0ZGRkZGRkZGIEZGRkZGRiBGRkZGIEZGRkZGRlxuICByZXR1cm4gaGV4KDgsdGltZSkgKyBoZXgoNixNQUNISU5FX0lEKSArIGhleCg0LHBpZCkgKyBoZXgoNixuZXh0KCkpO1xufVxuXG5mdW5jdGlvbiBoZXgobGVuZ3RoLCBuKSB7XG4gIG4gPSBuLnRvU3RyaW5nKDE2KTtcbiAgcmV0dXJuIChuLmxlbmd0aD09PWxlbmd0aCk/IG4gOiBcIjAwMDAwMDAwXCIuc3Vic3RyaW5nKG4ubGVuZ3RoLCBsZW5ndGgpICsgbjtcbn1cblxuZnVuY3Rpb24gYnVmZmVyKHN0cikge1xuICB2YXIgaT0wLG91dD1bXTtcblxuICBpZihzdHIubGVuZ3RoPT09MjQpXG4gICAgZm9yKDtpPDI0OyBvdXQucHVzaChwYXJzZUludChzdHJbaV0rc3RyW2krMV0sIDE2KSksaSs9Mik7XG5cbiAgZWxzZSBpZihzdHIubGVuZ3RoPT09MTIpXG4gICAgZm9yKDtpPDEyOyBvdXQucHVzaChzdHIuY2hhckNvZGVBdChpKSksaSsrKTtcblxuICByZXR1cm4gb3V0O1xufVxuXG4vKipcbiAqIENvbnZlcnRzIHRvIGEgc3RyaW5nIHJlcHJlc2VudGF0aW9uIG9mIHRoaXMgSWQuXG4gKlxuICogQHJldHVybiB7U3RyaW5nfSByZXR1cm4gdGhlIDI0IGJ5dGUgaGV4IHN0cmluZyByZXByZXNlbnRhdGlvbi5cbiAqIEBhcGkgcHJpdmF0ZVxuICovXG5PYmplY3RJRC5wcm90b3R5cGUuaW5zcGVjdCA9IGZ1bmN0aW9uKCkgeyByZXR1cm4gXCJPYmplY3RJRChcIit0aGlzK1wiKVwiIH07XG5PYmplY3RJRC5wcm90b3R5cGUudG9KU09OID0gT2JqZWN0SUQucHJvdG90eXBlLnRvSGV4U3RyaW5nO1xuT2JqZWN0SUQucHJvdG90eXBlLnRvU3RyaW5nID0gT2JqZWN0SUQucHJvdG90eXBlLnRvSGV4U3RyaW5nO1xuIiwiLy8gc2hpbSBmb3IgdXNpbmcgcHJvY2VzcyBpbiBicm93c2VyXG52YXIgcHJvY2VzcyA9IG1vZHVsZS5leHBvcnRzID0ge307XG5cbi8vIGNhY2hlZCBmcm9tIHdoYXRldmVyIGdsb2JhbCBpcyBwcmVzZW50IHNvIHRoYXQgdGVzdCBydW5uZXJzIHRoYXQgc3R1YiBpdFxuLy8gZG9uJ3QgYnJlYWsgdGhpbmdzLiAgQnV0IHdlIG5lZWQgdG8gd3JhcCBpdCBpbiBhIHRyeSBjYXRjaCBpbiBjYXNlIGl0IGlzXG4vLyB3cmFwcGVkIGluIHN0cmljdCBtb2RlIGNvZGUgd2hpY2ggZG9lc24ndCBkZWZpbmUgYW55IGdsb2JhbHMuICBJdCdzIGluc2lkZSBhXG4vLyBmdW5jdGlvbiBiZWNhdXNlIHRyeS9jYXRjaGVzIGRlb3B0aW1pemUgaW4gY2VydGFpbiBlbmdpbmVzLlxuXG52YXIgY2FjaGVkU2V0VGltZW91dDtcbnZhciBjYWNoZWRDbGVhclRpbWVvdXQ7XG5cbmZ1bmN0aW9uIGRlZmF1bHRTZXRUaW1vdXQoKSB7XG4gICAgdGhyb3cgbmV3IEVycm9yKCdzZXRUaW1lb3V0IGhhcyBub3QgYmVlbiBkZWZpbmVkJyk7XG59XG5mdW5jdGlvbiBkZWZhdWx0Q2xlYXJUaW1lb3V0ICgpIHtcbiAgICB0aHJvdyBuZXcgRXJyb3IoJ2NsZWFyVGltZW91dCBoYXMgbm90IGJlZW4gZGVmaW5lZCcpO1xufVxuKGZ1bmN0aW9uICgpIHtcbiAgICB0cnkge1xuICAgICAgICBpZiAodHlwZW9mIHNldFRpbWVvdXQgPT09ICdmdW5jdGlvbicpIHtcbiAgICAgICAgICAgIGNhY2hlZFNldFRpbWVvdXQgPSBzZXRUaW1lb3V0O1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgY2FjaGVkU2V0VGltZW91dCA9IGRlZmF1bHRTZXRUaW1vdXQ7XG4gICAgICAgIH1cbiAgICB9IGNhdGNoIChlKSB7XG4gICAgICAgIGNhY2hlZFNldFRpbWVvdXQgPSBkZWZhdWx0U2V0VGltb3V0O1xuICAgIH1cbiAgICB0cnkge1xuICAgICAgICBpZiAodHlwZW9mIGNsZWFyVGltZW91dCA9PT0gJ2Z1bmN0aW9uJykge1xuICAgICAgICAgICAgY2FjaGVkQ2xlYXJUaW1lb3V0ID0gY2xlYXJUaW1lb3V0O1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgY2FjaGVkQ2xlYXJUaW1lb3V0ID0gZGVmYXVsdENsZWFyVGltZW91dDtcbiAgICAgICAgfVxuICAgIH0gY2F0Y2ggKGUpIHtcbiAgICAgICAgY2FjaGVkQ2xlYXJUaW1lb3V0ID0gZGVmYXVsdENsZWFyVGltZW91dDtcbiAgICB9XG59ICgpKVxuZnVuY3Rpb24gcnVuVGltZW91dChmdW4pIHtcbiAgICBpZiAoY2FjaGVkU2V0VGltZW91dCA9PT0gc2V0VGltZW91dCkge1xuICAgICAgICAvL25vcm1hbCBlbnZpcm9tZW50cyBpbiBzYW5lIHNpdHVhdGlvbnNcbiAgICAgICAgcmV0dXJuIHNldFRpbWVvdXQoZnVuLCAwKTtcbiAgICB9XG4gICAgLy8gaWYgc2V0VGltZW91dCB3YXNuJ3QgYXZhaWxhYmxlIGJ1dCB3YXMgbGF0dGVyIGRlZmluZWRcbiAgICBpZiAoKGNhY2hlZFNldFRpbWVvdXQgPT09IGRlZmF1bHRTZXRUaW1vdXQgfHwgIWNhY2hlZFNldFRpbWVvdXQpICYmIHNldFRpbWVvdXQpIHtcbiAgICAgICAgY2FjaGVkU2V0VGltZW91dCA9IHNldFRpbWVvdXQ7XG4gICAgICAgIHJldHVybiBzZXRUaW1lb3V0KGZ1biwgMCk7XG4gICAgfVxuICAgIHRyeSB7XG4gICAgICAgIC8vIHdoZW4gd2hlbiBzb21lYm9keSBoYXMgc2NyZXdlZCB3aXRoIHNldFRpbWVvdXQgYnV0IG5vIEkuRS4gbWFkZG5lc3NcbiAgICAgICAgcmV0dXJuIGNhY2hlZFNldFRpbWVvdXQoZnVuLCAwKTtcbiAgICB9IGNhdGNoKGUpe1xuICAgICAgICB0cnkge1xuICAgICAgICAgICAgLy8gV2hlbiB3ZSBhcmUgaW4gSS5FLiBidXQgdGhlIHNjcmlwdCBoYXMgYmVlbiBldmFsZWQgc28gSS5FLiBkb2Vzbid0IHRydXN0IHRoZSBnbG9iYWwgb2JqZWN0IHdoZW4gY2FsbGVkIG5vcm1hbGx5XG4gICAgICAgICAgICByZXR1cm4gY2FjaGVkU2V0VGltZW91dC5jYWxsKG51bGwsIGZ1biwgMCk7XG4gICAgICAgIH0gY2F0Y2goZSl7XG4gICAgICAgICAgICAvLyBzYW1lIGFzIGFib3ZlIGJ1dCB3aGVuIGl0J3MgYSB2ZXJzaW9uIG9mIEkuRS4gdGhhdCBtdXN0IGhhdmUgdGhlIGdsb2JhbCBvYmplY3QgZm9yICd0aGlzJywgaG9wZnVsbHkgb3VyIGNvbnRleHQgY29ycmVjdCBvdGhlcndpc2UgaXQgd2lsbCB0aHJvdyBhIGdsb2JhbCBlcnJvclxuICAgICAgICAgICAgcmV0dXJuIGNhY2hlZFNldFRpbWVvdXQuY2FsbCh0aGlzLCBmdW4sIDApO1xuICAgICAgICB9XG4gICAgfVxuXG5cbn1cbmZ1bmN0aW9uIHJ1bkNsZWFyVGltZW91dChtYXJrZXIpIHtcbiAgICBpZiAoY2FjaGVkQ2xlYXJUaW1lb3V0ID09PSBjbGVhclRpbWVvdXQpIHtcbiAgICAgICAgLy9ub3JtYWwgZW52aXJvbWVudHMgaW4gc2FuZSBzaXR1YXRpb25zXG4gICAgICAgIHJldHVybiBjbGVhclRpbWVvdXQobWFya2VyKTtcbiAgICB9XG4gICAgLy8gaWYgY2xlYXJUaW1lb3V0IHdhc24ndCBhdmFpbGFibGUgYnV0IHdhcyBsYXR0ZXIgZGVmaW5lZFxuICAgIGlmICgoY2FjaGVkQ2xlYXJUaW1lb3V0ID09PSBkZWZhdWx0Q2xlYXJUaW1lb3V0IHx8ICFjYWNoZWRDbGVhclRpbWVvdXQpICYmIGNsZWFyVGltZW91dCkge1xuICAgICAgICBjYWNoZWRDbGVhclRpbWVvdXQgPSBjbGVhclRpbWVvdXQ7XG4gICAgICAgIHJldHVybiBjbGVhclRpbWVvdXQobWFya2VyKTtcbiAgICB9XG4gICAgdHJ5IHtcbiAgICAgICAgLy8gd2hlbiB3aGVuIHNvbWVib2R5IGhhcyBzY3Jld2VkIHdpdGggc2V0VGltZW91dCBidXQgbm8gSS5FLiBtYWRkbmVzc1xuICAgICAgICByZXR1cm4gY2FjaGVkQ2xlYXJUaW1lb3V0KG1hcmtlcik7XG4gICAgfSBjYXRjaCAoZSl7XG4gICAgICAgIHRyeSB7XG4gICAgICAgICAgICAvLyBXaGVuIHdlIGFyZSBpbiBJLkUuIGJ1dCB0aGUgc2NyaXB0IGhhcyBiZWVuIGV2YWxlZCBzbyBJLkUuIGRvZXNuJ3QgIHRydXN0IHRoZSBnbG9iYWwgb2JqZWN0IHdoZW4gY2FsbGVkIG5vcm1hbGx5XG4gICAgICAgICAgICByZXR1cm4gY2FjaGVkQ2xlYXJUaW1lb3V0LmNhbGwobnVsbCwgbWFya2VyKTtcbiAgICAgICAgfSBjYXRjaCAoZSl7XG4gICAgICAgICAgICAvLyBzYW1lIGFzIGFib3ZlIGJ1dCB3aGVuIGl0J3MgYSB2ZXJzaW9uIG9mIEkuRS4gdGhhdCBtdXN0IGhhdmUgdGhlIGdsb2JhbCBvYmplY3QgZm9yICd0aGlzJywgaG9wZnVsbHkgb3VyIGNvbnRleHQgY29ycmVjdCBvdGhlcndpc2UgaXQgd2lsbCB0aHJvdyBhIGdsb2JhbCBlcnJvci5cbiAgICAgICAgICAgIC8vIFNvbWUgdmVyc2lvbnMgb2YgSS5FLiBoYXZlIGRpZmZlcmVudCBydWxlcyBmb3IgY2xlYXJUaW1lb3V0IHZzIHNldFRpbWVvdXRcbiAgICAgICAgICAgIHJldHVybiBjYWNoZWRDbGVhclRpbWVvdXQuY2FsbCh0aGlzLCBtYXJrZXIpO1xuICAgICAgICB9XG4gICAgfVxuXG5cblxufVxudmFyIHF1ZXVlID0gW107XG52YXIgZHJhaW5pbmcgPSBmYWxzZTtcbnZhciBjdXJyZW50UXVldWU7XG52YXIgcXVldWVJbmRleCA9IC0xO1xuXG5mdW5jdGlvbiBjbGVhblVwTmV4dFRpY2soKSB7XG4gICAgaWYgKCFkcmFpbmluZyB8fCAhY3VycmVudFF1ZXVlKSB7XG4gICAgICAgIHJldHVybjtcbiAgICB9XG4gICAgZHJhaW5pbmcgPSBmYWxzZTtcbiAgICBpZiAoY3VycmVudFF1ZXVlLmxlbmd0aCkge1xuICAgICAgICBxdWV1ZSA9IGN1cnJlbnRRdWV1ZS5jb25jYXQocXVldWUpO1xuICAgIH0gZWxzZSB7XG4gICAgICAgIHF1ZXVlSW5kZXggPSAtMTtcbiAgICB9XG4gICAgaWYgKHF1ZXVlLmxlbmd0aCkge1xuICAgICAgICBkcmFpblF1ZXVlKCk7XG4gICAgfVxufVxuXG5mdW5jdGlvbiBkcmFpblF1ZXVlKCkge1xuICAgIGlmIChkcmFpbmluZykge1xuICAgICAgICByZXR1cm47XG4gICAgfVxuICAgIHZhciB0aW1lb3V0ID0gcnVuVGltZW91dChjbGVhblVwTmV4dFRpY2spO1xuICAgIGRyYWluaW5nID0gdHJ1ZTtcblxuICAgIHZhciBsZW4gPSBxdWV1ZS5sZW5ndGg7XG4gICAgd2hpbGUobGVuKSB7XG4gICAgICAgIGN1cnJlbnRRdWV1ZSA9IHF1ZXVlO1xuICAgICAgICBxdWV1ZSA9IFtdO1xuICAgICAgICB3aGlsZSAoKytxdWV1ZUluZGV4IDwgbGVuKSB7XG4gICAgICAgICAgICBpZiAoY3VycmVudFF1ZXVlKSB7XG4gICAgICAgICAgICAgICAgY3VycmVudFF1ZXVlW3F1ZXVlSW5kZXhdLnJ1bigpO1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICAgIHF1ZXVlSW5kZXggPSAtMTtcbiAgICAgICAgbGVuID0gcXVldWUubGVuZ3RoO1xuICAgIH1cbiAgICBjdXJyZW50UXVldWUgPSBudWxsO1xuICAgIGRyYWluaW5nID0gZmFsc2U7XG4gICAgcnVuQ2xlYXJUaW1lb3V0KHRpbWVvdXQpO1xufVxuXG5wcm9jZXNzLm5leHRUaWNrID0gZnVuY3Rpb24gKGZ1bikge1xuICAgIHZhciBhcmdzID0gbmV3IEFycmF5KGFyZ3VtZW50cy5sZW5ndGggLSAxKTtcbiAgICBpZiAoYXJndW1lbnRzLmxlbmd0aCA+IDEpIHtcbiAgICAgICAgZm9yICh2YXIgaSA9IDE7IGkgPCBhcmd1bWVudHMubGVuZ3RoOyBpKyspIHtcbiAgICAgICAgICAgIGFyZ3NbaSAtIDFdID0gYXJndW1lbnRzW2ldO1xuICAgICAgICB9XG4gICAgfVxuICAgIHF1ZXVlLnB1c2gobmV3IEl0ZW0oZnVuLCBhcmdzKSk7XG4gICAgaWYgKHF1ZXVlLmxlbmd0aCA9PT0gMSAmJiAhZHJhaW5pbmcpIHtcbiAgICAgICAgcnVuVGltZW91dChkcmFpblF1ZXVlKTtcbiAgICB9XG59O1xuXG4vLyB2OCBsaWtlcyBwcmVkaWN0aWJsZSBvYmplY3RzXG5mdW5jdGlvbiBJdGVtKGZ1biwgYXJyYXkpIHtcbiAgICB0aGlzLmZ1biA9IGZ1bjtcbiAgICB0aGlzLmFycmF5ID0gYXJyYXk7XG59XG5JdGVtLnByb3RvdHlwZS5ydW4gPSBmdW5jdGlvbiAoKSB7XG4gICAgdGhpcy5mdW4uYXBwbHkobnVsbCwgdGhpcy5hcnJheSk7XG59O1xucHJvY2Vzcy50aXRsZSA9ICdicm93c2VyJztcbnByb2Nlc3MuYnJvd3NlciA9IHRydWU7XG5wcm9jZXNzLmVudiA9IHt9O1xucHJvY2Vzcy5hcmd2ID0gW107XG5wcm9jZXNzLnZlcnNpb24gPSAnJzsgLy8gZW1wdHkgc3RyaW5nIHRvIGF2b2lkIHJlZ2V4cCBpc3N1ZXNcbnByb2Nlc3MudmVyc2lvbnMgPSB7fTtcblxuZnVuY3Rpb24gbm9vcCgpIHt9XG5cbnByb2Nlc3Mub24gPSBub29wO1xucHJvY2Vzcy5hZGRMaXN0ZW5lciA9IG5vb3A7XG5wcm9jZXNzLm9uY2UgPSBub29wO1xucHJvY2Vzcy5vZmYgPSBub29wO1xucHJvY2Vzcy5yZW1vdmVMaXN0ZW5lciA9IG5vb3A7XG5wcm9jZXNzLnJlbW92ZUFsbExpc3RlbmVycyA9IG5vb3A7XG5wcm9jZXNzLmVtaXQgPSBub29wO1xucHJvY2Vzcy5wcmVwZW5kTGlzdGVuZXIgPSBub29wO1xucHJvY2Vzcy5wcmVwZW5kT25jZUxpc3RlbmVyID0gbm9vcDtcblxucHJvY2Vzcy5saXN0ZW5lcnMgPSBmdW5jdGlvbiAobmFtZSkgeyByZXR1cm4gW10gfVxuXG5wcm9jZXNzLmJpbmRpbmcgPSBmdW5jdGlvbiAobmFtZSkge1xuICAgIHRocm93IG5ldyBFcnJvcigncHJvY2Vzcy5iaW5kaW5nIGlzIG5vdCBzdXBwb3J0ZWQnKTtcbn07XG5cbnByb2Nlc3MuY3dkID0gZnVuY3Rpb24gKCkgeyByZXR1cm4gJy8nIH07XG5wcm9jZXNzLmNoZGlyID0gZnVuY3Rpb24gKGRpcikge1xuICAgIHRocm93IG5ldyBFcnJvcigncHJvY2Vzcy5jaGRpciBpcyBub3Qgc3VwcG9ydGVkJyk7XG59O1xucHJvY2Vzcy51bWFzayA9IGZ1bmN0aW9uKCkgeyByZXR1cm4gMDsgfTtcbiIsIi8qIGdsb2JhbCBleHBvcnRzICovXG4vKipcbiAqIEBmaWxlb3ZlcnZpZXcgYSB0aW55IGxpYnJhcnkgZm9yIFdlYiBXb3JrZXIgUmVtb3RlIE1ldGhvZCBJbnZvY2F0aW9uXG4gKlxuICovXG5jb25zdCBPYmplY3RJRCA9IHJlcXVpcmUoJ2Jzb24tb2JqZWN0aWQnKTtcblxuLyoqXG4gKiBAcHJpdmF0ZSByZXR1cm5zIGEgbGlzdCBvZiBUcmFuc2ZlcmFibGUgb2JqZWN0cyB3aGljaCB7QGNvZGUgb2JqfSBpbmNsdWRlc1xuICogQHBhcmFtIHtvYmplY3R9IG9iaiBhbnkgb2JqZWN0XG4gKiBAcGFyYW0ge0FycmF5fSBsaXN0IGZvciBpbnRlcm5hbCByZWN1cnNpb24gb25seVxuICogQHJldHVybiB7TGlzdH0gYSBsaXN0IG9mIFRyYW5zZmVyYWJsZSBvYmplY3RzXG4gKi9cbmZ1bmN0aW9uIGdldFRyYW5zZmVyTGlzdChvYmosIGxpc3QgPSBbXSkge1xuICAgIGlmIChBcnJheUJ1ZmZlci5pc1ZpZXcob2JqKSkge1xuICAgICAgICBsaXN0LnB1c2gob2JqLmJ1ZmZlcik7XG4gICAgICAgIHJldHVybiBsaXN0O1xuICAgIH1cbiAgICBpZiAoaXNUcmFuc2ZlcmFibGUob2JqKSkge1xuICAgICAgICBsaXN0LnB1c2gob2JqKTtcbiAgICAgICAgcmV0dXJuIGxpc3Q7XG4gICAgfVxuICAgIGlmICghKHR5cGVvZiBvYmogPT09ICdvYmplY3QnKSkge1xuICAgICAgICByZXR1cm4gbGlzdDtcbiAgICB9XG4gICAgZm9yIChjb25zdCBwcm9wIGluIG9iaikge1xuICAgICAgICBpZiAob2JqLmhhc093blByb3BlcnR5KHByb3ApKSB7XG4gICAgICAgICAgICBnZXRUcmFuc2Zlckxpc3Qob2JqW3Byb3BdLCBsaXN0KTtcbiAgICAgICAgfVxuICAgIH1cbiAgICByZXR1cm4gbGlzdDtcbn1cblxuLyoqXG4gKiBAcHJpdmF0ZSBjaGVja3MgaWYge0Bjb2RlIG9ian0gaXMgVHJhbnNmZXJhYmxlIG9yIG5vdC5cbiAqIEBwYXJhbSB7b2JqZWN0fSBvYmogYW55IG9iamVjdFxuICogQHJldHVybiB7Ym9vbGVhbn1cbiAqL1xuZnVuY3Rpb24gaXNUcmFuc2ZlcmFibGUob2JqKSB7XG4gICAgY29uc3QgdHJhbnNmZXJhYmxlID0gW0FycmF5QnVmZmVyXTtcbiAgICBpZiAodHlwZW9mIE1lc3NhZ2VQb3J0ICE9PSAndW5kZWZpbmVkJykge1xuICAgICAgICB0cmFuc2ZlcmFibGUucHVzaChNZXNzYWdlUG9ydCk7XG4gICAgfVxuICAgIGlmICh0eXBlb2YgSW1hZ2VCaXRtYXAgIT09ICd1bmRlZmluZWQnKSB7XG4gICAgICAgIHRyYW5zZmVyYWJsZS5wdXNoKEltYWdlQml0bWFwKTtcbiAgICB9XG4gICAgcmV0dXJuIHRyYW5zZmVyYWJsZS5zb21lKGUgPT4gb2JqIGluc3RhbmNlb2YgZSk7XG59XG5cbi8qKlxuICogQGNsYXNzIGJhc2UgY2xhc3Mgd2hvc2UgY2hpbGQgY2xhc3NlcyB1c2UgUk1JXG4gKi9cbmNsYXNzIFdvcmtlclJNSSB7XG4gICAgLyoqXG4gICAgICogQGNvbnN0cnVjdG9yXG4gICAgICogQHBhcmFtIHtvYmplY3R9IHJlbW90ZSBhbiBpbnN0YW5jZSB0byBjYWxsIHBvc3RNZXNzYWdlIG1ldGhvZFxuICAgICAqIEBwYXJhbSB7QXJyYXl9IGFyZ3MgYXJndW1lbnRzIHRvIGJlIHBhc3NlZCB0byBzZXJ2ZXItc2lkZSBpbnN0YW5jZVxuICAgICAqL1xuICAgIGNvbnN0cnVjdG9yKHJlbW90ZSwgLi4uYXJncykge1xuICAgICAgICB0aGlzLnJlbW90ZSA9IHJlbW90ZTtcbiAgICAgICAgdGhpcy5pZCA9IE9iamVjdElEKCkudG9TdHJpbmcoKTtcbiAgICAgICAgdGhpcy5tZXRob2RTdGF0ZXMgPSB7fTtcbiAgICAgICAgdGhpcy5yZW1vdGUuYWRkRXZlbnRMaXN0ZW5lcignbWVzc2FnZScsIGV2ZW50ID0+IHtcbiAgICAgICAgICAgIGNvbnN0IGRhdGEgPSBldmVudC5kYXRhO1xuICAgICAgICAgICAgaWYgKGRhdGEuaWQgPT09IHRoaXMuaWQpIHtcbiAgICAgICAgICAgICAgICB0aGlzLnJldHVybkhhbmRsZXIoZGF0YSk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH0sIGZhbHNlKTtcbiAgICAgICAgdGhpcy5jb25zdHJ1Y3RvclByb21pc2UgPSB0aGlzLmludm9rZVJNKHRoaXMuY29uc3RydWN0b3IubmFtZSwgYXJncyk7XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogaW52b2tlcyByZW1vdGUgbWV0aG9kXG4gICAgICogQHBhcmFtIHtzdHJpbmd9IG1ldGhvZE5hbWUgTWV0aG9kIG5hbWVcbiAgICAgKiBAcGFyYW0ge0FycmF5fSBhcmdzIGFyZ3VtZW50cyB0byBiZSBwYXNzZWQgdG8gc2VydmVyLXNpZGUgaW5zdGFuY2VcbiAgICAgKiBAcmV0dXJuIHtQcm9taXNlfVxuICAgICAqL1xuICAgIGludm9rZVJNKG1ldGhvZE5hbWUsIGFyZ3MgPSBbXSkge1xuICAgICAgICBpZiAoIXRoaXMubWV0aG9kU3RhdGVzW21ldGhvZE5hbWVdKSB7XG4gICAgICAgICAgICB0aGlzLm1ldGhvZFN0YXRlc1ttZXRob2ROYW1lXSA9IHtcbiAgICAgICAgICAgICAgICBudW06IDAsXG4gICAgICAgICAgICAgICAgcmVzb2x2ZVJlamVjdHM6IHt9XG4gICAgICAgICAgICB9O1xuICAgICAgICB9XG4gICAgICAgIHJldHVybiBuZXcgUHJvbWlzZSgocmVzb2x2ZSwgcmVqZWN0KSA9PiB7XG4gICAgICAgICAgICBjb25zdCBtZXRob2RTdGF0ZSA9IHRoaXMubWV0aG9kU3RhdGVzW21ldGhvZE5hbWVdO1xuICAgICAgICAgICAgbWV0aG9kU3RhdGUubnVtICs9IDE7XG4gICAgICAgICAgICBtZXRob2RTdGF0ZS5yZXNvbHZlUmVqZWN0c1ttZXRob2RTdGF0ZS5udW1dID0geyByZXNvbHZlLCByZWplY3QgfTtcbiAgICAgICAgICAgIHRoaXMucmVtb3RlLnBvc3RNZXNzYWdlKHtcbiAgICAgICAgICAgICAgICBpZDogdGhpcy5pZCxcbiAgICAgICAgICAgICAgICBtZXRob2ROYW1lLFxuICAgICAgICAgICAgICAgIG51bTogbWV0aG9kU3RhdGUubnVtLFxuICAgICAgICAgICAgICAgIGFyZ3NcbiAgICAgICAgICAgIH0sIGdldFRyYW5zZmVyTGlzdChhcmdzKSk7XG4gICAgICAgIH0pO1xuICAgIH1cblxuICAgIC8qKlxuICAgICAqIEBwcml2YXRlIGhhbmRsZXMgY29ycmVzcG9uZGVudCAnbWVzc2FnZScgZXZlbnRcbiAgICAgKiBAcGFyYW0ge29ian0gZGF0YSBkYXRhIHByb3BlcnR5IG9mICdtZXNzYWdlJyBldmVudFxuICAgICAqL1xuICAgIHJldHVybkhhbmRsZXIoZGF0YSkge1xuICAgICAgICBjb25zdCByZXNvbHZlUmVqZWN0cyA9IHRoaXMubWV0aG9kU3RhdGVzW2RhdGEubWV0aG9kTmFtZV0ucmVzb2x2ZVJlamVjdHM7XG4gICAgICAgIGlmIChkYXRhLmVycm9yKSB7XG4gICAgICAgICAgICByZXNvbHZlUmVqZWN0c1tkYXRhLm51bV0ucmVqZWN0KGRhdGEuZXJyb3IpO1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgcmVzb2x2ZVJlamVjdHNbZGF0YS5udW1dLnJlc29sdmUoZGF0YS5yZXN1bHQpO1xuICAgICAgICB9XG4gICAgICAgIGRlbGV0ZSByZXNvbHZlUmVqZWN0c1tkYXRhLm51bV07XG4gICAgfVxufVxuXG5cbi8qKlxuICogQHByaXZhdGUgZXhlY3V0ZXMgYSBtZXRob2Qgb24gc2VydmVyIGFuZCBwb3N0IGEgcmVzdWx0IGFzIG1lc3NhZ2UuXG4gKiBAcGFyYW0ge29ian0gZXZlbnQgJ21lc3NhZ2UnIGV2ZW50XG4gKi9cbmFzeW5jIGZ1bmN0aW9uIGhhbmRsZVdvcmtlclJNSShldmVudCkge1xuICAgIGNvbnN0IGRhdGEgPSBldmVudC5kYXRhO1xuICAgIGNvbnN0IG1lc3NhZ2UgPSB7XG4gICAgICAgIGlkOiBkYXRhLmlkLFxuICAgICAgICBtZXRob2ROYW1lOiBkYXRhLm1ldGhvZE5hbWUsXG4gICAgICAgIG51bTogZGF0YS5udW0sXG4gICAgfTtcbiAgICBsZXQgcmVzdWx0O1xuICAgIGlmIChkYXRhLm1ldGhvZE5hbWUgPT09IHRoaXMubmFtZSkge1xuICAgICAgICB0aGlzLndvcmtlclJNSS5pbnN0YW5jZXNbZGF0YS5pZF0gPSBuZXcgdGhpcyguLi5kYXRhLmFyZ3MpO1xuICAgICAgICBtZXNzYWdlLnJlc3VsdCA9IG51bGw7XG4gICAgICAgIHRoaXMud29ya2VyUk1JLnRhcmdldC5wb3N0TWVzc2FnZShtZXNzYWdlLCBnZXRUcmFuc2Zlckxpc3QocmVzdWx0KSk7XG4gICAgfSBlbHNlIHtcbiAgICAgICAgY29uc3QgaW5zdGFuY2UgPSB0aGlzLndvcmtlclJNSS5pbnN0YW5jZXNbZGF0YS5pZF07XG4gICAgICAgIGlmIChpbnN0YW5jZSkge1xuICAgICAgICAgICAgdHJ5IHtcbiAgICAgICAgICAgICAgICByZXN1bHQgPSBhd2FpdCBpbnN0YW5jZVtkYXRhLm1ldGhvZE5hbWVdLmFwcGx5KGluc3RhbmNlLCBkYXRhLmFyZ3MpXG4gICAgICAgICAgICAgICAgbWVzc2FnZS5yZXN1bHQgPSByZXN1bHQ7XG4gICAgICAgICAgICAgICAgdGhpcy53b3JrZXJSTUkudGFyZ2V0LnBvc3RNZXNzYWdlKG1lc3NhZ2UsIGdldFRyYW5zZmVyTGlzdChyZXN1bHQpKTtcbiAgICAgICAgICAgIH0gY2F0Y2ggKGUpIHtcbiAgICAgICAgICAgICAgICBtZXNzYWdlLmVycm9yID0gZS50b1N0cmluZygpO1xuICAgICAgICAgICAgICAgIHRoaXMud29ya2VyUk1JLnRhcmdldC5wb3N0TWVzc2FnZShtZXNzYWdlKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgIH1cbn1cblxuLyoqXG4gKiByZWdpc3RlcnMgYSBjbGFzcyBhcyBhbiBleGVjdXRlciBvZiBSTUkgb24gc2VydmVyXG4gKiBAcGFyYW0ge29ian0gdGFyZ2V0IGFuIGluc3RhbmNlIHRoYXQgcmVjZWl2ZXMgJ21lc3NhZ2UnIGV2ZW50cyBvZiBSTUlcbiAqIEBwYXJhbSB7Q2xhc3N9IGtsYXNzIGEgY2xhc3MgdG8gYmUgcmVnaXN0ZXJlZFxuICovXG5mdW5jdGlvbiByZXNpZ3RlcldvcmtlclJNSSh0YXJnZXQsIGtsYXNzKSB7XG4gICAga2xhc3Mud29ya2VyUk1JID0ge1xuICAgICAgICB0YXJnZXQsXG4gICAgICAgIGluc3RhbmNlczoge30sXG4gICAgICAgIGhhbmRsZXI6IGhhbmRsZVdvcmtlclJNSS5iaW5kKGtsYXNzKVxuICAgIH1cbiAgICB0YXJnZXQuYWRkRXZlbnRMaXN0ZW5lcignbWVzc2FnZScsIGtsYXNzLndvcmtlclJNSS5oYW5kbGVyKTtcbn1cblxuLyoqXG4gKiB1bnJlc2lndGVycyBhIGNsYXNzIHJlZ2lzdGVyZWQgYnkgcmVnaXN0ZXJXb3JrZXJSTUlcbiAqIEBwYXJhbSB7b2JqfSB0YXJnZXQgYW4gaW5zdGFuY2UgdGhhdCByZWNlaXZlcyAnbWVzc2FnZScgZXZlbnRzIG9mIFJNSVxuICogQHBhcmFtIHtDbGFzc30ga2xhc3MgYSBjbGFzcyB0byBiZSB1bnJlZ2lzdGVyZWRcbiAqL1xuZnVuY3Rpb24gdW5yZXNpZ3RlcldvcmtlclJNSSh0YXJnZXQsIGtsYXNzKSB7XG4gICAgdGFyZ2V0LnJlbW92ZUV2ZW50TGlzdGVuZXIoJ21lc3NhZ2UnLCBrbGFzcy53b3JrZXJSTUkuaGFuZGxlcilcbiAgICBkZWxldGUga2xhc3Mud29ya2VyUk1JO1xufVxuXG5leHBvcnRzLldvcmtlclJNSSA9IFdvcmtlclJNSTtcbmV4cG9ydHMucmVzaWd0ZXJXb3JrZXJSTUkgPSByZXNpZ3RlcldvcmtlclJNSTtcbmV4cG9ydHMudW5yZXNpZ3RlcldvcmtlclJNSSA9IHVucmVzaWd0ZXJXb3JrZXJSTUk7XG4iLCIndXNlIHN0cmljdCc7XG5cbk9iamVjdC5kZWZpbmVQcm9wZXJ0eShleHBvcnRzLCBcIl9fZXNNb2R1bGVcIiwge1xuICAgIHZhbHVlOiB0cnVlXG59KTtcbmV4cG9ydHMuQVpqc0VuZ2luZSA9IHVuZGVmaW5lZDtcblxudmFyIF93b3JrZXJSbWkgPSByZXF1aXJlKCd3b3JrZXItcm1pJyk7XG5cbi8qKlxuICog5oCd6ICD44Ko44Oz44K444OzQVpqc0VuZ2luZeOBrlJNSeeJiOOBp+OBmeOAguODieOCreODpeODoeODs+ODiOOBr+acrOS9k+WBtOOBruOCs+ODvOODieOCkuWPgueFp+OBl+OBpuOBj+OBoOOBleOBhOOAglxuICogQGFsaWFzIEFaanNFbmdpbmVSTUlcbiAqIEBzZWUgQVpqc0VuZ2luZVxuICovXG5jbGFzcyBBWmpzRW5naW5lIGV4dGVuZHMgX3dvcmtlclJtaS5Xb3JrZXJSTUkge1xuICAgIC8qKiAqL1xuICAgIGFzeW5jIGxvYWROTigpIHtcbiAgICAgICAgYXdhaXQgdGhpcy5pbnZva2VSTSgnbG9hZE5OJyk7XG4gICAgfVxuXG4gICAgLyoqICovXG4gICAgYXN5bmMgY2xlYXIoKSB7XG4gICAgICAgIGF3YWl0IHRoaXMuc3RvcCgpO1xuICAgICAgICBhd2FpdCB0aGlzLmludm9rZVJNKCdjbGVhcicpO1xuICAgIH1cblxuICAgIC8qKlxuICAgICAqIHRpbWVTZXR0aW5nc+OBrlJNSeOBp+OBmeOAglxuICAgICAqIG1haW5UaW1l44GoYnlveW9taeOBruWPluW+l+OBp1JNSeOCkumBv+OBkeOCi+OBn+OCgeOAgeioreWumuWApOOCkuOBk+OBoeOCieOBp+OCguS/neaMgeOBl+OBvuOBmeOAglxuICAgICAqIEBwYXJhbSB7bnVtYmVyfSBtYWluVGltZSBcbiAgICAgKiBAcGFyYW0ge251bWJlcn0gYnlveW9taSBcbiAgICAgKi9cbiAgICBhc3luYyB0aW1lU2V0dGluZ3MobWFpblRpbWUsIGJ5b3lvbWkpIHtcbiAgICAgICAgdGhpcy5tYWluVGltZSA9IG1haW5UaW1lO1xuICAgICAgICB0aGlzLmJ5b3lvbWkgPSBieW95b21pO1xuICAgICAgICBhd2FpdCB0aGlzLmludm9rZVJNKCd0aW1lU2V0dGluZ3MnLCBbbWFpblRpbWUsIGJ5b3lvbWldKTtcbiAgICB9XG5cbiAgICBhc3luYyBnZW5tb3ZlKCkge1xuICAgICAgICByZXR1cm4gYXdhaXQgdGhpcy5pbnZva2VSTSgnZ2VubW92ZScpO1xuICAgIH1cblxuICAgIGFzeW5jIHBsYXkoeCwgeSkge1xuICAgICAgICBhd2FpdCB0aGlzLmludm9rZVJNKCdwbGF5JywgW3gsIHldKTtcbiAgICB9XG5cbiAgICBhc3luYyBwYXNzKCkge1xuICAgICAgICBhd2FpdCB0aGlzLmludm9rZVJNKCdwYXNzJyk7XG4gICAgfVxuXG4gICAgYXN5bmMgc2VhcmNoKCkge1xuICAgICAgICByZXR1cm4gYXdhaXQgdGhpcy5pbnZva2VSTSgnc2VhcmNoJyk7XG4gICAgfVxuXG4gICAgYXN5bmMgZmluYWxTY29yZSgpIHtcbiAgICAgICAgcmV0dXJuIGF3YWl0IHRoaXMuaW52b2tlUk0oJ2ZpbmFsU2NvcmUnKTtcbiAgICB9XG5cbiAgICBhc3luYyBwb25kZXIoKSB7XG4gICAgICAgIHJldHVybiBhd2FpdCB0aGlzLmludm9rZVJNKCdwb25kZXInKTtcbiAgICB9XG5cbiAgICBhc3luYyBzdG9wKCkge1xuICAgICAgICBhd2FpdCB0aGlzLmludm9rZVJNKCdzdG9wJyk7XG4gICAgfVxuXG4gICAgYXN5bmMgdGltZUxlZnQoKSB7XG4gICAgICAgIHJldHVybiBhd2FpdCB0aGlzLmludm9rZVJNKCd0aW1lTGVmdCcpO1xuICAgIH1cbn1cbmV4cG9ydHMuQVpqc0VuZ2luZSA9IEFaanNFbmdpbmU7IC8qKlxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICogQGZpbGUg5oCd6ICD44Ko44Oz44K444OzQVpqc0VuZ2luZeOBrlJNSeeJiOOBp+OBmeOAguODieOCreODpeODoeODs+ODiOOBr+acrOS9k+WBtOOBruOCs+ODvOODieOCkuWPgueFp+OBl+OBpuOBj+OBoOOBleOBhOOAglxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICovXG4vKlxuICogQGF1dGhvciDluILlt53pm4TkuoxcbiAqIEBjb3B5cmlnaHQgMjAxOCBJQ0hJS0FXQSwgWXVqaSAoTmV3IDMgUnMpXG4gKiBAbGljZW5zZSBNSVRcbiAqLyIsIid1c2Ugc3RyaWN0JztcblxuT2JqZWN0LmRlZmluZVByb3BlcnR5KGV4cG9ydHMsIFwiX19lc01vZHVsZVwiLCB7XG4gICAgdmFsdWU6IHRydWVcbn0pO1xuLyoqXG4gKiBAZmlsZSBNVkPjga7jgrPjg7Pjg4jjg63jg7zjg6njga7jgqrjg5bjgrbjg7zjg5Djg7zjgq/jg6njgrnjgafjgZnjgIJcbiAqL1xuLypcbiAqIEBhdXRob3Ig5biC5bed6ZuE5LqMXG4gKiBAY29weXJpZ2h0IDIwMTcgSUNISUtBV0EsIFl1amkgKE5ldyAzIFJzKVxuICogQGxpY2Vuc2UgTUlUXG4gKi9cbi8qIGdsb2JhbCBKR086ZmFsc2UsIFdBdWRpbzpmYWxzZSAqL1xuXG5jb25zdCBzdG9uZVNvdW5kID0gbmV3IFdBdWRpbygnYXVkaW8vZ28tcGllY2UxLm1wMycpO1xuXG4vKipcbiAqICBqR29Cb2FyZOOBruOBn+OCgeOBruOCs+ODs+ODiOODreODvOODqVxi44Gn44GZ44CCIFxuICogQHNlZSB7QGxpbmsgaHR0cHM6Ly9naXRodWIuY29tL2pva2tlYmsvamdvYm9hcmR9XG4gKi9cbmNsYXNzIEJvYXJkQ29udHJvbGxlciB7XG4gICAgLyoqXG4gICAgICogakdvQm9hcmTjgpLnlJ/miJDjgZfjgIHmj4/nlLvjgYzntYLjgo/jgaPjgZ/jgoljYWxsYmFja+OCkuWRvOOBs+WHuuOBl+OBvuOBmeOAglxuICAgICAqIEBwYXJhbSB7SW50ZWdlcn0gYm9hcmRTaXplIFxuICAgICAqIEBwYXJhbSB7SW50ZWdlcn0gaGFuZGljYXAgXG4gICAgICogQHBhcmFtIHtudW1iZXJ9IGtvbWkgXG4gICAgICogQHBhcmFtIHtGdW5jdGlvbn0gY2FsbGJhY2sgXG4gICAgICovXG4gICAgY29uc3RydWN0b3IoYm9hcmRTaXplLCBoYW5kaWNhcCwga29taSwgY2FsbGJhY2spIHtcbiAgICAgICAgdGhpcy5pZCA9ICdib2FyZCc7XG4gICAgICAgIHRoaXMub3duQ29sb3IgPSBKR08uQkxBQ0s7IC8vIG93bkNvbG9y44GvR1VJ44KS5L2/55So44GZ44KL5YG0XG4gICAgICAgIHRoaXMudHVybiA9IEpHTy5CTEFDSztcbiAgICAgICAgdGhpcy5qcmVjb3JkID0gbnVsbDtcbiAgICAgICAgdGhpcy5qYm9hcmQgPSBudWxsO1xuICAgICAgICB0aGlzLmtvID0gZmFsc2U7XG4gICAgICAgIHRoaXMubGFzdEhvdmVyID0gbnVsbDtcbiAgICAgICAgdGhpcy5sYXN0TW92ZSA9IG51bGw7XG4gICAgICAgIHRoaXMub2JzZXJ2ZXJzID0gW107XG4gICAgICAgIHRoaXMucGFzc051bSA9IDA7XG5cbiAgICAgICAgdGhpcy5qcmVjb3JkID0gSkdPLnNnZi5sb2FkKGAoO1NaWyR7Ym9hcmRTaXplfV1LTVske2tvbWl9XSlgLCBmYWxzZSk7XG4gICAgICAgIHRoaXMuamJvYXJkID0gdGhpcy5qcmVjb3JkLmdldEJvYXJkKCk7XG4gICAgICAgIGlmIChoYW5kaWNhcCA+PSAyKSB7XG4gICAgICAgICAgICBjb25zdCBzdG9uZXMgPSBKR08udXRpbC5nZXRIYW5kaWNhcENvb3JkaW5hdGVzKHRoaXMuamJvYXJkLndpZHRoLCBoYW5kaWNhcCk7XG4gICAgICAgICAgICB0aGlzLmpib2FyZC5zZXRUeXBlKHN0b25lcywgSkdPLkJMQUNLKTtcbiAgICAgICAgICAgIHRoaXMudHVybiA9IEpHTy5XSElURTtcbiAgICAgICAgfVxuXG4gICAgICAgIGNvbnN0IG9wdGlvbnMgPSB7IHN0YXJzOiB7IHBvaW50czogOSB9IH07XG4gICAgICAgIEpHTy51dGlsLmV4dGVuZChvcHRpb25zLCBKR08uQk9BUkQubGFyZ2UpO1xuICAgICAgICBjb25zdCBqc2V0dXAgPSBuZXcgSkdPLlNldHVwKHRoaXMuamJvYXJkLCBvcHRpb25zKTtcbiAgICAgICAganNldHVwLnNldE9wdGlvbnMoeyBjb29yZGluYXRlczoge1xuICAgICAgICAgICAgICAgIHRvcDogZmFsc2UsXG4gICAgICAgICAgICAgICAgYm90dG9tOiBmYWxzZSxcbiAgICAgICAgICAgICAgICBsZWZ0OiBmYWxzZSxcbiAgICAgICAgICAgICAgICByaWdodDogZmFsc2VcbiAgICAgICAgICAgIH0gfSk7XG5cbiAgICAgICAganNldHVwLmNyZWF0ZSh0aGlzLmlkLCBjYW52YXMgPT4ge1xuICAgICAgICAgICAgY2FudmFzLmFkZExpc3RlbmVyKCdjbGljaycsIHRoaXMuY2xpY2tIYW5kZXIuYmluZCh0aGlzKSk7XG4gICAgICAgICAgICBjYW52YXMuYWRkTGlzdGVuZXIoJ21vdXNlbW92ZScsIHRoaXMubW92ZUhhbmRsZXIuYmluZCh0aGlzKSk7XG4gICAgICAgICAgICBjYW52YXMuYWRkTGlzdGVuZXIoJ21vdXNlb3V0JywgdGhpcy5sZWF2ZUhhbmRsZXIuYmluZCh0aGlzKSk7XG4gICAgICAgICAgICBjYW52YXMuYWRkTGlzdGVuZXIoJ21vdXNlZG93bicsIHRoaXMuZG93bkhhbmRsZXIuYmluZCh0aGlzKSk7XG4gICAgICAgICAgICBjYWxsYmFjayh0aGlzKTtcbiAgICAgICAgfSk7XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICog6Zai6YCj44Gu44Kq44OW44K244O844OQ44O844KERE9N44KS56C05qOE44GX44G+44GZ44CCIFxuICAgICAqL1xuICAgIGRlc3Ryb3koKSB7XG4gICAgICAgIHRoaXMucmVtb3ZlT2JzZXJ2ZXJzKCk7XG4gICAgICAgIGNvbnN0IGRvbSA9IGRvY3VtZW50LmdldEVsZW1lbnRCeUlkKHRoaXMuaWQpO1xuICAgICAgICB3aGlsZSAoZG9tLmZpcnN0Q2hpbGQpIHtcbiAgICAgICAgICAgIGRvbS5yZW1vdmVDaGlsZChkb20uZmlyc3RDaGlsZCk7XG4gICAgICAgIH1cbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBHVUnjgpLkvb/nlKjjgZnjgovlgbTjga7nn7Pjga7oibLjgpLoqK3lrprjgZfjgb7jgZnjgIJcbiAgICAgKi9cbiAgICBzZXRPd25Db2xvcihjb2xvcikge1xuICAgICAgICB0aGlzLm93bkNvbG9yID0gY29sb3I7XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICog44Kz44Of44KS6Kit5a6a44GX44G+44GZ44CCXG4gICAgICogQHBhcmFtIHsqfSBrb21pIFxuICAgICAqL1xuICAgIHNldEtvbWkoa29taSkge1xuICAgICAgICBjb25zdCBub2RlID0gdGhpcy5qcmVjb3JkLmdldFJvb3ROb2RlKCk7XG4gICAgICAgIG5vZGUuaW5mby5rb21pID0ga29taS50b1N0cmluZygpO1xuICAgIH1cblxuICAgIC8qKlxuICAgICAqIOOCquODluOCtuODvOODkOODvOOCkui/veWKoOOBl+OAgeOCquODluOCtuODvOODkOODvOOBrnVwZGF0ZeOCkuWRvOOBs+WHuuOBl+OBvuOBmeOAglxuICAgICAqIEBwYXJhbSB7Kn0gb2JzZXJ2ZXIg5byV5pWw44GrY29vcmTjgpLlj5fjgZHlj5bjgot1cGRhdGXjg6Hjgr3jg4Pjg4njgpLmjIHjgaTjgqrjg5bjgrjjgqfjgq/jg4jjgIJcbiAgICAgKi9cbiAgICBhZGRPYnNlcnZlcihvYnNlcnZlcikge1xuICAgICAgICB0aGlzLm9ic2VydmVycy5wdXNoKG9ic2VydmVyKTtcbiAgICAgICAgb2JzZXJ2ZXIudXBkYXRlKCk7XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICog5YWo44Kq44OW44K244O844OQ44O844KS5YmK6Zmk44GX44G+44GZ44CCXG4gICAgICovXG4gICAgcmVtb3ZlT2JzZXJ2ZXJzKCkge1xuICAgICAgICB0aGlzLm9ic2VydmVycyA9IFtdO1xuICAgIH1cblxuICAgIC8qKlxuICAgICAqIGpHb0JvYXJk44GM5pu05paw44GV44KM44Gf44Go44GN44Gr5ZG844Gz5Ye644GV44KM44KL44Oh44K944OD44OJ44Gn44GZ44CCXG4gICAgICogQHByaXZhdGVcbiAgICAgKiBAcGFyYW0geyp9IGNvb3JkIFxuICAgICAqL1xuICAgIHVwZGF0ZShjb29yZCkge1xuICAgICAgICBjb25zdCBub2RlID0gdGhpcy5qcmVjb3JkLmdldEN1cnJlbnROb2RlKCk7XG4gICAgICAgIGRvY3VtZW50LmdldEVsZW1lbnRCeUlkKCdvcHBvbmVudC1jYXB0dXJlcycpLmlubmVyVGV4dCA9IG5vZGUuaW5mby5jYXB0dXJlc1t0aGlzLm93bkNvbG9yID09PSBKR08uQkxBQ0sgPyBKR08uV0hJVEUgOiBKR08uQkxBQ0tdO1xuICAgICAgICBkb2N1bWVudC5nZXRFbGVtZW50QnlJZCgnb3duLWNhcHR1cmVzJykuaW5uZXJUZXh0ID0gbm9kZS5pbmZvLmNhcHR1cmVzW3RoaXMub3duQ29sb3JdO1xuICAgICAgICBzZXRUaW1lb3V0KCgpID0+IHtcbiAgICAgICAgICAgIHRoaXMub2JzZXJ2ZXJzLmZvckVhY2goZnVuY3Rpb24gKG9ic2VydmVyKSB7XG4gICAgICAgICAgICAgICAgb2JzZXJ2ZXIudXBkYXRlKGNvb3JkKTtcbiAgICAgICAgICAgIH0pO1xuICAgICAgICB9LCAxMCk7IC8vIDDjgafjga9qR29Cb2FyZOOBruODrOODs+ODgOODquODs+OCsOOBjOe1guOCj+OBo+OBpuOBhOOBquOBhOOBruOBp+OAgTEw44Gr44GX44G+44GX44Gf44CCXG4gICAgfVxuXG4gICAgLyoqXG4gICAgICog552A5omL44GX44G+44GZ44CCXG4gICAgICogQHBhcmFtIHtKR08uQ29vcmRpbmF0ZX0gY29vcmQgXG4gICAgICogQHBhcmFtIHtib29sfSBzb3VuZCBcbiAgICAgKi9cbiAgICBwbGF5KGNvb3JkLCBzb3VuZCA9IGZhbHNlKSB7XG4gICAgICAgIGNvbnN0IHBsYXkgPSB0aGlzLmpib2FyZC5wbGF5TW92ZShjb29yZCwgdGhpcy50dXJuLCB0aGlzLmtvKTtcbiAgICAgICAgaWYgKCFwbGF5LnN1Y2Nlc3MpIHtcbiAgICAgICAgICAgIGNvbnNvbGUubG9nKGNvb3JkLCBwbGF5KTtcbiAgICAgICAgICAgIHJldHVybiBwbGF5LnN1Y2Nlc3M7XG4gICAgICAgIH1cbiAgICAgICAgY29uc3Qgbm9kZSA9IHRoaXMuanJlY29yZC5jcmVhdGVOb2RlKGZhbHNlKTtcbiAgICAgICAgLy8gdGFsbHkgY2FwdHVyZXNcbiAgICAgICAgbm9kZS5pbmZvLmNhcHR1cmVzW3RoaXMudHVybl0gKz0gcGxheS5jYXB0dXJlcy5sZW5ndGg7XG4gICAgICAgIGlmIChjb29yZCkge1xuICAgICAgICAgICAgLy8gcGxheSBzdG9uZVxuICAgICAgICAgICAgbm9kZS5zZXRUeXBlKGNvb3JkLCB0aGlzLnR1cm4pO1xuICAgICAgICAgICAgbm9kZS5zZXRNYXJrKGNvb3JkLCBKR08uTUFSSy5DSVJDTEUpOyAvLyBtYXJrIG1vdmVcbiAgICAgICAgICAgIC8vIGNsZWFyIG9wcG9uZW50J3Mgc3RvbmVzXG4gICAgICAgICAgICBub2RlLnNldFR5cGUocGxheS5jYXB0dXJlcywgSkdPLkNMRUFSKTtcbiAgICAgICAgfVxuICAgICAgICBpZiAodGhpcy5sYXN0TW92ZSkge1xuICAgICAgICAgICAgbm9kZS5zZXRNYXJrKHRoaXMubGFzdE1vdmUsIEpHTy5NQVJLLk5PTkUpOyAvLyBjbGVhciBwcmV2aW91cyBtYXJrXG4gICAgICAgIH1cbiAgICAgICAgaWYgKHRoaXMua28pIHtcbiAgICAgICAgICAgIG5vZGUuc2V0TWFyayh0aGlzLmtvLCBKR08uTUFSSy5OT05FKTsgLy8gY2xlYXIgcHJldmlvdXMga28gbWFya1xuICAgICAgICB9XG4gICAgICAgIHRoaXMubGFzdE1vdmUgPSBjb29yZDtcbiAgICAgICAgaWYgKHBsYXkua28pIHtcbiAgICAgICAgICAgIG5vZGUuc2V0TWFyayhwbGF5LmtvLCBKR08uTUFSSy5DSVJDTEUpOyAvLyBtYXJrIGtvLCB0b29cbiAgICAgICAgfVxuICAgICAgICB0aGlzLmtvID0gcGxheS5rbztcbiAgICAgICAgdGhpcy50dXJuID0gdGhpcy50dXJuID09PSBKR08uQkxBQ0sgPyBKR08uV0hJVEUgOiBKR08uQkxBQ0s7XG4gICAgICAgIGlmIChjb29yZCA9PSBudWxsKSB7XG4gICAgICAgICAgICB0aGlzLnBhc3NOdW0gKz0gMTtcbiAgICAgICAgICAgIHRoaXMudXBkYXRlKHRoaXMucGFzc051bSA8IDIgPyAncGFzcycgOiAnZW5kJyk7XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICB0aGlzLnBhc3NOdW0gPSAwO1xuICAgICAgICAgICAgdGhpcy51cGRhdGUoY29vcmQpO1xuICAgICAgICAgICAgaWYgKHNvdW5kKSB7XG4gICAgICAgICAgICAgICAgc3RvbmVTb3VuZC5wbGF5KCk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgICAgcmV0dXJuIHBsYXkuc3VjY2VzcztcbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBAcHJpdmF0ZVxuICAgICAqIEBwYXJhbSB7SkdPLkNvb3JkaW5hdGV9IGNvb3JkIFxuICAgICAqIEBwYXJhbSB7RXZlbnR9IGV2IFxuICAgICAqL1xuICAgIGNsaWNrSGFuZGVyKGNvb3JkLCBldikge1xuICAgICAgICAvLyBjbGVhciBob3ZlciBhd2F5IC0gaXQnbGwgYmUgcmVwbGFjZWQgb3JcbiAgICAgICAgLy8gdGhlbiBpdCB3aWxsIGJlIGFuIGlsbGVnYWwgbW92ZSBpbiBhbnkgY2FzZVxuICAgICAgICAvLyBzbyBubyBuZWVkIHRvIHdvcnJ5IGFib3V0IHB1dHRpbmcgaXQgYmFjayBhZnRlcndhcmRzXG4gICAgICAgIGlmICh0aGlzLm93bkNvbG9yICE9PSB0aGlzLnR1cm4pIHtcbiAgICAgICAgICAgIHJldHVybjtcbiAgICAgICAgfVxuICAgICAgICBpZiAodGhpcy5sYXN0SG92ZXIgIT0gbnVsbCkge1xuICAgICAgICAgICAgdGhpcy5qYm9hcmQuc2V0VHlwZSh0aGlzLmxhc3RIb3ZlciwgSkdPLkNMRUFSKTtcbiAgICAgICAgICAgIHRoaXMubGFzdEhvdmVyID0gbnVsbDtcbiAgICAgICAgfVxuICAgICAgICBpZiAoY29vcmQuaSA+PSAwICYmIGNvb3JkLmkgPCB0aGlzLmpib2FyZC53aWR0aCAmJiBjb29yZC5qID49IDAgJiYgY29vcmQuaiA8IHRoaXMuamJvYXJkLmhlaWdodCkge1xuICAgICAgICAgICAgdGhpcy5wbGF5KGNvb3JkKTtcbiAgICAgICAgfVxuICAgIH1cblxuICAgIC8qKlxuICAgICAqIEBwcml2YXRlXG4gICAgICogQHBhcmFtIHtKR08uQ29vcmRpbmF0ZX0gY29vcmQgXG4gICAgICogQHBhcmFtIHtFdmVudH0gZXYgXG4gICAgICovXG4gICAgbW92ZUhhbmRsZXIoY29vcmQsIGV2KSB7XG4gICAgICAgIGlmICh0aGlzLm93bkNvbG9yICE9PSB0aGlzLnR1cm4pIHtcbiAgICAgICAgICAgIHJldHVybjtcbiAgICAgICAgfVxuICAgICAgICBpZiAodGhpcy5sYXN0SG92ZXIgJiYgdGhpcy5sYXN0SG92ZXIuZXF1YWxzKGNvb3JkKSkge1xuICAgICAgICAgICAgcmV0dXJuO1xuICAgICAgICB9XG5cbiAgICAgICAgaWYgKHRoaXMubGFzdEhvdmVyICE9IG51bGwpIHtcbiAgICAgICAgICAgIC8vIGNsZWFyIHByZXZpb3VzIGhvdmVyIGlmIHRoZXJlIHdhcyBvbmVcbiAgICAgICAgICAgIHRoaXMuamJvYXJkLnNldFR5cGUodGhpcy5sYXN0SG92ZXIsIEpHTy5DTEVBUik7XG4gICAgICAgIH1cblxuICAgICAgICBpZiAoY29vcmQuaSA8PSAtMSB8fCBjb29yZC5qIDw9IC0xIHx8IGNvb3JkLmkgPj0gdGhpcy5qYm9hcmQud2lkdGggfHwgY29vcmQuaiA+PSB0aGlzLmpib2FyZC5oZWlnaHQpIHtcbiAgICAgICAgICAgIHRoaXMubGFzdEhvdmVyID0gbnVsbDtcbiAgICAgICAgfSBlbHNlIGlmICh0aGlzLmpib2FyZC5nZXRUeXBlKGNvb3JkKSA9PT0gSkdPLkNMRUFSICYmIHRoaXMuamJvYXJkLmdldE1hcmsoY29vcmQpID09IEpHTy5NQVJLLk5PTkUpIHtcbiAgICAgICAgICAgIHRoaXMuamJvYXJkLnNldFR5cGUoY29vcmQsIHRoaXMudHVybiA9PSBKR08uQkxBQ0sgPyBKR08uRElNX0JMQUNLIDogSkdPLkRJTV9XSElURSk7XG4gICAgICAgICAgICB0aGlzLmxhc3RIb3ZlciA9IGNvb3JkO1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgdGhpcy5sYXN0SG92ZXIgPSBudWxsO1xuICAgICAgICB9XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogQHByaXZhdGVcbiAgICAgKiBAcGFyYW0ge0V2ZW50fSBldiBcbiAgICAgKi9cbiAgICBsZWF2ZUhhbmRsZXIoZXYpIHtcbiAgICAgICAgaWYgKHRoaXMubGFzdEhvdmVyICE9IG51bGwpIHtcbiAgICAgICAgICAgIHRoaXMuamJvYXJkLnNldFR5cGUodGhpcy5sYXN0SG92ZXIsIEpHTy5DTEVBUik7XG4gICAgICAgICAgICB0aGlzLmxhc3RIb3ZlciA9IG51bGw7XG4gICAgICAgIH1cbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiDjgq/jg6rjg4Pjgq/jgafjga/jgarjgY/jgabjg4Djgqbjg7Mv44K/44OD44OB44Gn55+z6Z+z44KS56uL44Gm44Gf44GE44Gu44Gn44GT44GT44Gn5Yem55CG44GX44Gm44GE44G+44GZ44CCXG4gICAgICogQHByaXZhdGVcbiAgICAgKiBAcGFyYW0ge0V2ZW50fSBldiBcbiAgICAgKi9cbiAgICBkb3duSGFuZGxlcihldikge1xuICAgICAgICBpZiAodGhpcy5vd25Db2xvciA9PT0gdGhpcy50dXJuKSB7XG4gICAgICAgICAgICBzdG9uZVNvdW5kLnBsYXkoKTtcbiAgICAgICAgfVxuICAgIH1cbn1cbmV4cG9ydHMuQm9hcmRDb250cm9sbGVyID0gQm9hcmRDb250cm9sbGVyOyIsIid1c2Ugc3RyaWN0JztcblxudmFyIF93b3JrZXJSbWkgPSByZXF1aXJlKCd3b3JrZXItcm1pJyk7XG5cbnZhciBfc3BlZWNoID0gcmVxdWlyZSgnLi9zcGVlY2guanMnKTtcblxudmFyIF9uZXVyYWxfbmV0d29yayA9IHJlcXVpcmUoJy4vbmV1cmFsX25ldHdvcmsuanMnKTtcblxudmFyIF9hempzX2VuZ2luZV9jbGllbnQgPSByZXF1aXJlKCcuL2F6anNfZW5naW5lX2NsaWVudC5qcycpO1xuXG52YXIgX2JvYXJkX2NvbnRyb2xsZXIgPSByZXF1aXJlKCcuL2JvYXJkX2NvbnRyb2xsZXIuanMnKTtcblxudmFyIF9wbGF5X2NvbnRyb2xsZXIgPSByZXF1aXJlKCcuL3BsYXlfY29udHJvbGxlci5qcycpO1xuXG4vKipcbiAqIOaMh+WumuOBleOCjOOBn+eigeebpOOCteOCpOOCuuOBqOOCqOODs+OCuOODs+OBp+WvvuWxgOOCkue5sOOCiui/lOOBl+OBvuOBmeOAglxuICog5omL55Wq44Go5oyB44Gh5pmC6ZaT44Gv5a++5qW144Gu6YO95bqm5Y+X44GR5LuY44GR44G+44GZ44CCXG4gKiBAcGFyYW0ge0ludGVnZXJ9IHNpemUgXG4gKiBAcGFyYW0ge0FaanNFbmdpbmV9IGVuZ2luZSBcbiAqL1xuLyoqXG4gKiBAZmlsZSDjgqLjg5fjg6rjga7jgqjjg7Pjg4jjg6rjg7zjg53jgqTjg7Pjg4jjgafjgZnjgIJcbiAqL1xuLypcbiAqIEBhdXRob3Ig5biC5bed6ZuE5LqMXG4gKiBAY29weXJpZ2h0IDIwMTggSUNISUtBV0EsIFl1amkgKE5ldyAzIFJzKVxuICogQGxpY2Vuc2UgTUlUXG4gKi9cbi8qIGdsb2JhbCAkIEpHTyBpMThuICovXG5hc3luYyBmdW5jdGlvbiBzdGFydEdhbWUoc2l6ZSwgZW5naW5lKSB7XG4gICAgY29uc3QgY29udHJvbGxlciA9IGF3YWl0IG5ldyBQcm9taXNlKGZ1bmN0aW9uIChyZXMsIHJlaikge1xuICAgICAgICBuZXcgX2JvYXJkX2NvbnRyb2xsZXIuQm9hcmRDb250cm9sbGVyKHNpemUsIDAsIDcuNSwgcmVzKTtcbiAgICB9KTtcbiAgICBjb25zdCAkc3RhcnRNb2RhbCA9ICQoJyNzdGFydC1tb2RhbCcpO1xuICAgICRzdGFydE1vZGFsLm1vZGFsKCdzaG93Jyk7XG4gICAgLy8g44Om44O844K244O844GM5omL55Wq44Go5oyB44Gh5pmC6ZaT44KS5rG644KB44KL6ZaT44Gr44OL44Ol44O844Op44Or44ON44OD44OI44Ov44O844Kv44Gu44Km44Kn44Kk44OI44KS44OA44Km44Oz44Ot44O844OJ44GX44G+44GZ44CCXG4gICAgdHJ5IHtcbiAgICAgICAgYXdhaXQgZW5naW5lLmxvYWROTigpOyAvLyDkuIDluqbjgaDjgZHjg4Djgqbjg7Pjg63jg7zjg4njgZfjgIHmrKHlm57jga/lho3liKnnlKjjgZfjgb7jgZnjgIJcbiAgICAgICAgJCgnI2xvYWRpbmctbWVzc2FnZScpLnRleHQoaTE4bi5maW5pc2hEb3dubG9hZCk7XG4gICAgICAgICQoJyNzdGFydC1nYW1lJykucHJvcCgnZGlzYWJsZWQnLCBmYWxzZSk7XG4gICAgfSBjYXRjaCAoZSkge1xuICAgICAgICBpZiAoZSA9PT0gJ0Vycm9yOiBObyBiYWNrZW5kIGlzIGF2YWlsYWJsZScpIHtcbiAgICAgICAgICAgIGlmICgvKE1hYyBPUyBYIDEwXzEzfChpUGFkfGlQaG9uZXxpUG9kKTsgQ1BVIE9TIDExKS4qU2FmYXJpLy50ZXN0KG5hdmlnYXRvci51c2VyQWdlbnQpICYmICEvQ2hyb21lLy50ZXN0KG5hdmlnYXRvci51c2VyQWdlbnQpKSB7XG4gICAgICAgICAgICAgICAgKDAsIF9zcGVlY2guaTE4blNwZWFrKShpMThuLm5vdFN1cHBvcnQgKyBpMThuLnNhZmFyaVdpdGhvdXRXZWJncHUpO1xuICAgICAgICAgICAgfSBlbHNlIGlmICghKDAsIF9zcGVlY2guaTE4blNwZWFrKShpMThuLm5vdFN1cHBvcnQpKSB7XG4gICAgICAgICAgICAgICAgYWxlcnQoaTE4bi5ub3RTdXBwb3J0KTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIGNvbnNvbGUuZXJyb3IoZSk7XG4gICAgICAgIH1cbiAgICAgICAgcmV0dXJuO1xuICAgIH1cbiAgICBjb25zdCBjb25kaXRpb24gPSBhd2FpdCBuZXcgUHJvbWlzZShmdW5jdGlvbiAocmVzLCByZWopIHtcbiAgICAgICAgY29uc3QgJGNvbmRpdGlvbkZvcm0gPSAkKCcjY29uZGl0aW9uLWZvcm0nKTtcbiAgICAgICAgJGNvbmRpdGlvbkZvcm0ub25lKCdzdWJtaXQnLCBmdW5jdGlvbiAoZSkge1xuICAgICAgICAgICAgZS5wcmV2ZW50RGVmYXVsdCgpO1xuICAgICAgICAgICAgJHN0YXJ0TW9kYWwub25lKCdoaWRkZW4uYnMubW9kYWwnLCBmdW5jdGlvbiAoZSkge1xuICAgICAgICAgICAgICAgIHJlcyh7XG4gICAgICAgICAgICAgICAgICAgIGNvbG9yOiAkY29uZGl0aW9uRm9ybVswXVsnY29sb3InXS52YWx1ZSxcbiAgICAgICAgICAgICAgICAgICAgdGltZVJ1bGU6ICRjb25kaXRpb25Gb3JtWzBdWyd0aW1lJ10udmFsdWUsXG4gICAgICAgICAgICAgICAgICAgIHRpbWU6IHBhcnNlSW50KCRjb25kaXRpb25Gb3JtWzBdWydhaS1ieW95b21pJ10udmFsdWUpXG4gICAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICB9KTtcbiAgICAgICAgICAgICRzdGFydE1vZGFsLm1vZGFsKCdoaWRlJyk7XG4gICAgICAgIH0pO1xuICAgIH0pO1xuICAgIGxldCBtYWluVGltZTtcbiAgICBsZXQgYnlveW9taTtcbiAgICBzd2l0Y2ggKGNvbmRpdGlvbi50aW1lUnVsZSkge1xuICAgICAgICBjYXNlICdhaS10aW1lJzpcbiAgICAgICAgICAgIG1haW5UaW1lID0gMDtcbiAgICAgICAgICAgIGJ5b3lvbWkgPSBjb25kaXRpb24udGltZTtcbiAgICAgICAgICAgIGF3YWl0IGVuZ2luZS50aW1lU2V0dGluZ3MoMCwgYnlveW9taSk7XG4gICAgICAgICAgICBicmVhaztcbiAgICAgICAgY2FzZSAnaWdvLXF1ZXN0JzpcbiAgICAgICAgICAgIHN3aXRjaCAoc2l6ZSkge1xuICAgICAgICAgICAgICAgIGNhc2UgOTpcbiAgICAgICAgICAgICAgICAgICAgbWFpblRpbWUgPSAzICogNjA7XG4gICAgICAgICAgICAgICAgICAgIGJ5b3lvbWkgPSAxO1xuICAgICAgICAgICAgICAgICAgICBicmVhaztcbiAgICAgICAgICAgICAgICBjYXNlIDE5OlxuICAgICAgICAgICAgICAgICAgICBtYWluVGltZSA9IDcgKiA2MDtcbiAgICAgICAgICAgICAgICAgICAgYnlveW9taSA9IDM7XG4gICAgICAgICAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICAgICAgICAgIGRlZmF1bHQ6XG4gICAgICAgICAgICAgICAgICAgIHRocm93IG5ldyBFcnJvcignc2l6ZSBpcyBub3Qgc3VwcG9ydGVkJyk7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBhd2FpdCBlbmdpbmUudGltZVNldHRpbmdzKG1haW5UaW1lLCBieW95b21pKTtcbiAgICAgICAgICAgIGJyZWFrO1xuICAgIH1cbiAgICBpZiAoY29uZGl0aW9uLmNvbG9yID09PSAnVycpIHtcbiAgICAgICAgY29udHJvbGxlci5zZXRPd25Db2xvcihKR08uV0hJVEUpO1xuICAgICAgICBpZiAoY29udHJvbGxlci5qYm9hcmQud2lkdGggPT09IDkpIHtcbiAgICAgICAgICAgIGNvbnRyb2xsZXIuc2V0S29taSg1LjUpO1xuICAgICAgICB9XG4gICAgfSBlbHNlIGlmIChjb25kaXRpb24uY29sb3IgPT09ICdCJykge1xuICAgICAgICBjb250cm9sbGVyLnNldE93bkNvbG9yKEpHTy5CTEFDSyk7XG4gICAgICAgIGlmIChjb250cm9sbGVyLmpib2FyZC53aWR0aCA9PT0gOSkge1xuICAgICAgICAgICAgY29udHJvbGxlci5zZXRLb21pKDYuNSk7XG4gICAgICAgIH1cbiAgICB9XG4gICAgY29uc3QgaXNTZWxmUGxheSA9IGNvbmRpdGlvbi5jb2xvciA9PT0gJ3NlbGYtcGxheSc7XG4gICAgY29uc3Qgb2JzZXJ2ZXIgPSBuZXcgX3BsYXlfY29udHJvbGxlci5QbGF5Q29udHJvbGxlcihlbmdpbmUsIGNvbnRyb2xsZXIsIG1haW5UaW1lLCBieW95b21pLCBjb25kaXRpb24udGltZVJ1bGUgPT09ICdpZ28tcXVlc3QnLCBpc1NlbGZQbGF5KTtcbiAgICBpZiAoIWlzU2VsZlBsYXkpIHtcbiAgICAgICAgKDAsIF9zcGVlY2guaTE4blNwZWFrKShpMThuLnN0YXJ0R3JlZXQpO1xuICAgIH1cbiAgICBvYnNlcnZlci5zZXRJc1NlbGZQbGF5KGlzU2VsZlBsYXkpO1xuICAgIGNvbnRyb2xsZXIuYWRkT2JzZXJ2ZXIob2JzZXJ2ZXIpO1xuICAgICQoJyNwYXNzJykub24oJ2NsaWNrJywgZnVuY3Rpb24gKGV2ZW50KSB7XG4gICAgICAgIG9ic2VydmVyLnBhc3MoKTtcbiAgICB9KTtcbiAgICAkKCcjcmVzaWduJykub25lKCdjbGljaycsIGFzeW5jIGZ1bmN0aW9uIChldmVudCkge1xuICAgICAgICBvYnNlcnZlci5jbGVhclRpbWVyKCk7XG4gICAgICAgIGF3YWl0IGVuZ2luZS5zdG9wKCk7XG4gICAgICAgICgwLCBfc3BlZWNoLmkxOG5TcGVhaykoaTE4bi5lbmRHcmVldCk7XG4gICAgICAgICQoZG9jdW1lbnQuYm9keSkuYWRkQ2xhc3MoJ2VuZCcpO1xuICAgIH0pO1xuICAgICQoJyNyZXRyeScpLm9uZSgnY2xpY2snLCBhc3luYyBmdW5jdGlvbiAoZXZlbnQpIHtcbiAgICAgICAgJCgnI3Bhc3MnKS5vZmYoJ2NsaWNrJyk7XG4gICAgICAgICQoJyNyZXNpZ24nKS5vZmYoJ2NsaWNrJyk7XG4gICAgICAgIGNvbnRyb2xsZXIuZGVzdHJveSgpO1xuICAgICAgICBlbmdpbmUuY2xlYXIoKTtcbiAgICAgICAgJChkb2N1bWVudC5ib2R5KS5yZW1vdmVDbGFzcygnZW5kJyk7XG4gICAgICAgIHNldFRpbWVvdXQoYXN5bmMgZnVuY3Rpb24gKCkge1xuICAgICAgICAgICAgYXdhaXQgc3RhcnRHYW1lKHNpemUsIGVuZ2luZSk7XG4gICAgICAgIH0sIDApO1xuICAgIH0pO1xufVxuXG4vKipcbiAqIOeigeebpOOCteOCpOOCuuOCkuWPl+OBkeS7mOOBkeOAgeOCqOODs+OCuOODs+OCkueUn+aIkOOBl+OAgeWvvuWxgOOCkumWi+Wni+OBl+OBvuOBmeOAglxuICog56KB55uk44K144Kk44K644Go44Ko44Oz44K444Oz44Gv5YaN5a++5bGA44Gu6Zqb44Gr5YaN5Yip55So44GX44G+44GZ44CCXG4gKi9cbmFzeW5jIGZ1bmN0aW9uIG1haW4oKSB7XG4gICAgY29uc3QgJHNpemVNb2RhbCA9ICQoJyNzaXplLW1vZGFsJyk7XG4gICAgJHNpemVNb2RhbC5tb2RhbCgnc2hvdycpO1xuICAgIGNvbnN0IHNpemUgPSBhd2FpdCBuZXcgUHJvbWlzZShmdW5jdGlvbiAocmVzLCByZWopIHtcbiAgICAgICAgJCgnLmJ1dHRvbi1zaXplJykub25lKCdjbGljaycsIGZ1bmN0aW9uIChlKSB7XG4gICAgICAgICAgICByZXMocGFyc2VJbnQoZS5jdXJyZW50VGFyZ2V0LmRhdGFzZXQudmFsdWUpKTtcbiAgICAgICAgfSk7XG4gICAgfSk7XG4gICAgc3dpdGNoIChzaXplKSB7XG4gICAgICAgIGNhc2UgOTpcbiAgICAgICAgICAgICQoJyNzaXplLTktcnVsZScpLnNob3coKTtcbiAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICBkZWZhdWx0OlxuICAgICAgICAgICAgJCgnI3NpemUtMTktcnVsZScpLnNob3coKTtcbiAgICB9XG4gICAgY29uc3QgZW5naW5lID0gbmV3IF9hempzX2VuZ2luZV9jbGllbnQuQVpqc0VuZ2luZSh3b3JrZXIsIHNpemUpO1xuICAgIGF3YWl0IHN0YXJ0R2FtZShzaXplLCBlbmdpbmUpO1xufVxuXG4vLyDmgJ3ogIPjgqjjg7Pjgrjjg7NBWmpzRW5naW5l44Gu5pys5L2T44KS44Km44Kn44OW44Ov44O844Kr44O844Go44GX44Gm5YuV44GL44GX44G+44GZ44CCXG5jb25zdCB3b3JrZXIgPSBuZXcgV29ya2VyKCdqcy9hei13b3JrZXIuanMnKTtcbi8vIOODi+ODpeODvOODqeODq+ODjeODg+ODiOODr+ODvOOCr+OCkuODoeOCpOODs+OCueODrOODg+ODieOBp+WLleOBi+OBmeOCiOOBhuOBq+eZu+mMsuOBl+OBvuOBmeOAglxuLy8gV2ViR0wvV2ViR1BV44GM44Oh44Kk44Oz44K544Os44OD44OJ44Gu44G/44Gn5YuV5L2c44GZ44KL44GL44KJ44Gn44GZ44CCXG4vLyDlrp/pmpvjga7lkbzjgbPlh7rjgZfjga/kuIroqJjjg6/jg7zjgqvjgYzjgZfjgb7jgZnjgIJcbigwLCBfd29ya2VyUm1pLnJlc2lndGVyV29ya2VyUk1JKSh3b3JrZXIsIF9uZXVyYWxfbmV0d29yay5OZXVyYWxOZXR3b3JrKTtcblxubWFpbigpOyIsIid1c2Ugc3RyaWN0JztcblxuT2JqZWN0LmRlZmluZVByb3BlcnR5KGV4cG9ydHMsIFwiX19lc01vZHVsZVwiLCB7XG4gICAgdmFsdWU6IHRydWVcbn0pO1xuZXhwb3J0cy5OZXVyYWxOZXR3b3JrID0gdW5kZWZpbmVkO1xuXG52YXIgX3V0aWxzID0gcmVxdWlyZSgnLi91dGlscy5qcycpO1xuXG4vKiBzbGljZeOBrnBvbHlmaWxsICovXG5pZiAoIUFycmF5QnVmZmVyLnByb3RvdHlwZS5zbGljZSkge1xuICAgIEFycmF5QnVmZmVyLnByb3RvdHlwZS5zbGljZSA9IGZ1bmN0aW9uIChzdGFydCwgZW5kKSB7XG4gICAgICAgIHZhciB0aGF0ID0gbmV3IFVpbnQ4QXJyYXkodGhpcyk7XG4gICAgICAgIGlmIChlbmQgPT0gdW5kZWZpbmVkKSBlbmQgPSB0aGF0Lmxlbmd0aDtcbiAgICAgICAgdmFyIHJlc3VsdCA9IG5ldyBBcnJheUJ1ZmZlcihlbmQgLSBzdGFydCk7XG4gICAgICAgIHZhciByZXN1bHRBcnJheSA9IG5ldyBVaW50OEFycmF5KHJlc3VsdCk7XG4gICAgICAgIGZvciAodmFyIGkgPSAwOyBpIDwgcmVzdWx0QXJyYXkubGVuZ3RoOyBpKyspIHJlc3VsdEFycmF5W2ldID0gdGhhdFtpICsgc3RhcnRdO1xuICAgICAgICByZXR1cm4gcmVzdWx0O1xuICAgIH07XG59XG5cbi8qKlxuICog44Km44Kn44Kk44OI44KS44Ot44O844OJ44GZ44KL6Zqb44Gu44OX44Ot44Kw44Os44K544OQ44O844KS5pu05paw44GX44G+44GZ44CCXG4gKiBAcGFyYW0ge251bWJlcn0gcGVyY2VudGFnZSBcbiAqL1xuLyoqXG4gKiBAZmlsZSDjg4vjg6Xjg7zjg6njg6vjg43jg4Pjg4jjg6/jg7zjgq/jgpLoqIjnrpfjgZnjgovjgq/jg6njgrnjgafjgZnjgIJcbiAqL1xuLypcbiAqIEBhdXRob3Ig5biC5bed6ZuE5LqMXG4gKiBAY29weXJpZ2h0IDIwMTggSUNISUtBV0EsIFl1amkgKE5ldyAzIFJzKVxuICogQGxpY2Vuc2UgTUlUXG4gKi9cbi8qIGdsb2JhbCBXZWJETk4gJCAqL1xuZnVuY3Rpb24gc2V0TG9hZGluZ0JhcihwZXJjZW50YWdlKSB7XG4gICAgY29uc3QgJGxvYWRpbmdCYXIgPSAkKCcjbG9hZGluZy1iYXInKTtcbiAgICAkbG9hZGluZ0Jhci5hdHRyKCdhcmlhLXZhbHVlbm93JywgcGVyY2VudGFnZSk7XG4gICAgJGxvYWRpbmdCYXIuY3NzKCd3aWR0aCcsIHBlcmNlbnRhZ2UudG9TdHJpbmcoKSArICclJyk7XG59XG5cbi8qKiDjg4vjg6Xjg7zjg6njg6vjg43jg4Pjg4jjg6/jg7zjgq/jgpLoqIjnrpfjgZnjgovjgq/jg6njgrkoV2ViRE5O44GuRGVzY3JpcHRvclJ1bm5lcuOBruODqeODg+ODkeODvOOCr+ODqeOCuSkgKi9cbmNsYXNzIE5ldXJhbE5ldHdvcmsge1xuICAgIGNvbnN0cnVjdG9yKCkge1xuICAgICAgICB0aGlzLnZlcnNpb24gPSAxO1xuICAgICAgICB0aGlzLm5uID0gbnVsbDtcbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiDjgqbjgqfjgqTjg4jjg5XjgqHjgqTjg6vjgpLjg4Djgqbjg7Pjg63jg7zjg4njgZfjgb7jgZnjgIJcbiAgICAgKiBAcGFyYW0ge3N0cmluZ30gcGF0aCBXZWJETk7jg4fjg7zjgr/jga5VUkxcbiAgICAgKiBAcGFyYW0ge0ludGVnZXJ9IHZlcnNpb24gTGVlbGEgWmVyb+OBruOCpuOCp+OCpOODiOODleOCqeODvOODnuODg+ODiOeVquWPt1xuICAgICAqL1xuICAgIGFzeW5jIGxvYWQocGF0aCwgdmVyc2lvbiA9IDEpIHtcbiAgICAgICAgdGhpcy52ZXJzaW9uID0gdmVyc2lvbjtcbiAgICAgICAgaWYgKHRoaXMubm4pIHtcbiAgICAgICAgICAgIHNldExvYWRpbmdCYXIoMTAwKTtcbiAgICAgICAgICAgIHJldHVybjtcbiAgICAgICAgfVxuICAgICAgICBjb25zdCBvcHRpb25zID0ge1xuICAgICAgICAgICAgYmFja2VuZE9yZGVyOiBbJ3dlYmdwdScsICd3ZWJnbCddLFxuICAgICAgICAgICAgcHJvZ3Jlc3NDYWxsYmFjazogZnVuY3Rpb24gKGxvYWRlZCwgdG90YWwpIHtcbiAgICAgICAgICAgICAgICBzZXRMb2FkaW5nQmFyKGxvYWRlZCAvIHRvdGFsICogMTAwKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfTtcbiAgICAgICAgc2V0TG9hZGluZ0JhcigwKTtcbiAgICAgICAgdGhpcy5ubiA9IGF3YWl0IFdlYkROTi5sb2FkKHBhdGgsIG9wdGlvbnMpO1xuICAgICAgICBzZXRMb2FkaW5nQmFyKDEwMCk7IC8vIHByb2dyZXNzQ2FsbGJhY2vjgYzjgrPjg7zjg6vjgZXjgYjjgarjgYTjg5Hjgr/jg7zjg7PjgYzjgYLjgovjga7jgaflrozkuobmmYLjgavjgrPjg7zjg6vjgZfjgb7jgZnjgIJcbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiDjg4vjg6Xjg7zjg6njg6vjg43jg4Pjg4jjg6/jg7zjgq/jgpLoqZXkvqHjgZfjgZ/ntZDmnpzjgpLov5TjgZfjgb7jgZnjgIJcbiAgICAgKiBAcGFyYW0ge0FycmF5fSBpbnB1dHMgXG4gICAgICogQHJldHVybnMge0FycmF5fVxuICAgICAqL1xuICAgIGFzeW5jIGV2YWx1YXRlKC4uLmlucHV0cykge1xuICAgICAgICBjb25zdCB2aWV3cyA9IHRoaXMubm4uZ2V0SW5wdXRWaWV3cygpO1xuICAgICAgICBmb3IgKGxldCBpID0gMDsgaSA8IGlucHV0cy5sZW5ndGg7IGkrKykge1xuICAgICAgICAgICAgdmlld3NbaV0uc2V0KGlucHV0c1tpXSk7XG4gICAgICAgIH1cbiAgICAgICAgYXdhaXQgdGhpcy5ubi5ydW4oKTtcbiAgICAgICAgY29uc3QgcmVzdWx0ID0gdGhpcy5ubi5nZXRPdXRwdXRWaWV3cygpLm1hcChlID0+IGUudG9BY3R1YWwoKSk7XG4gICAgICAgIHJlc3VsdFswXSA9ICgwLCBfdXRpbHMuc29mdG1heCkocmVzdWx0WzBdKTtcbiAgICAgICAgcmVzdWx0WzFdID0gcmVzdWx0WzFdLnNsaWNlKDApOyAvLyB0by5BY3R1YWzjgZ3jga7jgoLjga7jgafjga9wb3N0TWVzc2FnZeOBp2RldGFjaOOBjOOBp+OBjeOBquOBhOOBruOBp+OCs+ODlOODvOOBmeOCi+OAglxuICAgICAgICBpZiAodGhpcy52ZXJzaW9uID09PSAyICYmIGlucHV0c1swXVtpbnB1dHNbMF0ubGVuZ3RoIC0gMV0gPT09IDEuMCkge1xuICAgICAgICAgICAgcmVzdWx0WzFdWzBdID0gLXJlc3VsdFsxXVswXTtcbiAgICAgICAgfVxuICAgICAgICByZXR1cm4gcmVzdWx0O1xuICAgIH1cbn1cbmV4cG9ydHMuTmV1cmFsTmV0d29yayA9IE5ldXJhbE5ldHdvcms7IiwiJ3VzZSBzdHJpY3QnO1xuXG5PYmplY3QuZGVmaW5lUHJvcGVydHkoZXhwb3J0cywgXCJfX2VzTW9kdWxlXCIsIHtcbiAgICB2YWx1ZTogdHJ1ZVxufSk7XG5leHBvcnRzLlBsYXlDb250cm9sbGVyID0gdW5kZWZpbmVkO1xuXG52YXIgX3NwZWVjaCA9IHJlcXVpcmUoJy4vc3BlZWNoLmpzJyk7XG5cbi8qKlxuICogTVZD44Gu44Kz44Oz44OI44Ot44O844Op44Gu44Kq44OW44K244O844OQ44O844Kv44Op44K544Gn44GZ44CCXG4gKiDmgJ3ogIPjgqjjg7Pjgrjjg7Pjga7otbfli5XjgajnnYDmiYvjgIHjgq/jg63jg4Pjgq/mm7TmlrDjgIHntYLlsYDlh6bnkIbjgpLjgZfjgb7jgZnjgIJcbiAqL1xuY2xhc3MgUGxheUNvbnRyb2xsZXIge1xuICAgIC8qKlxuICAgICAqIEBwYXJhbSB7QVpqc0VuZ2luZX0gZW5naW5lIFxuICAgICAqIEBwYXJhbSB7Qm9hcmRDb250cm9sbGVyfSBjb250cm9sbGVyIFxuICAgICAqIEBwYXJhbSB7bnVtYmVyfSBtYWluVGltZSBcbiAgICAgKiBAcGFyYW0ge251bWJlcn0gYnlveW9taSBcbiAgICAgKiBAcGFyYW0ge2Jvb2x9IGZpc2hlclJ1bGUgXG4gICAgICogQHBhcmFtIHtib29sfSBpc1NlbGZQbGF5IFxuICAgICAqL1xuICAgIGNvbnN0cnVjdG9yKGVuZ2luZSwgY29udHJvbGxlciwgbWFpblRpbWUsIGJ5b3lvbWksIGZpc2hlclJ1bGUsIGlzU2VsZlBsYXkpIHtcbiAgICAgICAgdGhpcy5lbmdpbmUgPSBlbmdpbmU7XG4gICAgICAgIHRoaXMuY29udHJvbGxlciA9IGNvbnRyb2xsZXI7XG4gICAgICAgIHRoaXMuaXNTZWxmUGxheSA9IGlzU2VsZlBsYXk7XG4gICAgICAgIHRoaXMuYnlveW9taSA9IGJ5b3lvbWk7XG4gICAgICAgIHRoaXMuZmlzaGVyUnVsZSA9IGZpc2hlclJ1bGU7XG4gICAgICAgIHRoaXMuaXNGaXJzdE1vdmUgPSB0cnVlO1xuICAgICAgICBpZiAodGhpcy5maXNoZXJSdWxlKSB7XG4gICAgICAgICAgICB0aGlzLnRpbWVMZWZ0ID0gWzAsIC8vIGR1bXlcbiAgICAgICAgICAgIG1haW5UaW1lICogMTAwMCwgLy8gYmxhY2tcbiAgICAgICAgICAgIG1haW5UaW1lICogMTAwMF07XG4gICAgICAgICAgICB0aGlzLnN0YXJ0ID0gRGF0ZS5ub3coKTtcbiAgICAgICAgICAgIHRoaXMudGltZXIgPSBzZXRJbnRlcnZhbCgoKSA9PiB7XG4gICAgICAgICAgICAgICAgY29uc3Qgc3RhcnQgPSBEYXRlLm5vdygpO1xuICAgICAgICAgICAgICAgIHRoaXMudGltZUxlZnRbdGhpcy5jb250cm9sbGVyLnR1cm5dIC09IHN0YXJ0IC0gdGhpcy5zdGFydDtcbiAgICAgICAgICAgICAgICB0aGlzLnN0YXJ0ID0gc3RhcnQ7XG4gICAgICAgICAgICAgICAgaWYgKHRoaXMuaXNTZWxmUGxheSkge1xuICAgICAgICAgICAgICAgICAgICAvLyBBSeOBruOCu+ODq+ODleODl+ODrOOCpOOBruaZguOBq+OBr+WPs+OBruaDheWgsSjmmYLoqIjjgIHjgqLjgrLjg4/jg54p44GM6buS44CB5bem44Gu5oOF5aCxKOaZguioiOOAgeOCouOCsuODj+ODninjgYznmb3jgafjgZnjgIJcbiAgICAgICAgICAgICAgICAgICAgJCh0aGlzLmNvbnRyb2xsZXIudHVybiA9PT0gSkdPLkJMQUNLID8gJyNyaWdodC1jbG9jaycgOiAnI2xlZnQtY2xvY2snKS50ZXh0KE1hdGguY2VpbCh0aGlzLnRpbWVMZWZ0W3RoaXMuY29udHJvbGxlci50dXJuXSAvIDEwMDApKTtcbiAgICAgICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgICAgICAvLyDjg6bjg7zjgrbjg7zjgahBSeOBruWvvuaIpuOBruaZguOBq+OBr+WPs+OBruaDheWgsSjmmYLoqIjjgIHjgqLjgrLjg4/jg54p44GM44Om44O844K244O844CB5bem44Gu5oOF5aCxKOaZguioiOOAgeOCouOCsuODj+ODninjgYxBSeOBp+OBmeOAglxuICAgICAgICAgICAgICAgICAgICBpZiAodGhpcy5jb250cm9sbGVyLm93bkNvbG9yID09PSB0aGlzLmNvbnRyb2xsZXIudHVybikge1xuICAgICAgICAgICAgICAgICAgICAgICAgJCgnI3JpZ2h0LWNsb2NrJykudGV4dChNYXRoLmNlaWwodGhpcy50aW1lTGVmdFt0aGlzLmNvbnRyb2xsZXIudHVybl0gLyAxMDAwKSk7XG4gICAgICAgICAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAkKCcjbGVmdC1jbG9jaycpLnRleHQoTWF0aC5jZWlsKHRoaXMudGltZUxlZnRbSkdPLm9wcG9uZW50T2YodGhpcy5jb250cm9sbGVyLnR1cm4pXSAvIDEwMDApKTtcbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICBpZiAodGhpcy50aW1lTGVmdFt0aGlzLmNvbnRyb2xsZXIudHVybl0gPCAwKSB7XG4gICAgICAgICAgICAgICAgICAgIGNsZWFySW50ZXJ2YWwodGhpcy50aW1lcik7XG4gICAgICAgICAgICAgICAgICAgIHRoaXMudGltZXIgPSBudWxsO1xuICAgICAgICAgICAgICAgICAgICB0aGlzLmVuZ2luZS5zdG9wKCk7XG4gICAgICAgICAgICAgICAgICAgIGFsZXJ0KGkxOG4udGltZW91dCk7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfSwgMTAwKTtcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIHRoaXMudGltZUxlZnQgPSBbMCwgLy8gZHVteVxuICAgICAgICAgICAgdGhpcy5pc1NlbGZQbGF5IHx8IHRoaXMuY29udHJvbGxlci5vd25Db2xvciAhPT0gSkdPLkJMQUNLID8gdGhpcy5lbmdpbmUuYnlveW9taSAqIDEwMDAgOiBJbmZpbml0eSwgLy8gYmxhY2tcbiAgICAgICAgICAgIHRoaXMuaXNTZWxmUGxheSB8fCB0aGlzLmNvbnRyb2xsZXIub3duQ29sb3IgIT09IEpHTy5XSElURSA/IHRoaXMuZW5naW5lLmJ5b3lvbWkgKiAxMDAwIDogSW5maW5pdHldO1xuICAgICAgICAgICAgdGhpcy5zdGFydCA9IERhdGUubm93KCk7XG4gICAgICAgICAgICB0aGlzLnRpbWVyID0gc2V0SW50ZXJ2YWwoKCkgPT4ge1xuICAgICAgICAgICAgICAgIGNvbnN0IHN0YXJ0ID0gRGF0ZS5ub3coKTtcbiAgICAgICAgICAgICAgICB0aGlzLnRpbWVMZWZ0W3RoaXMuY29udHJvbGxlci50dXJuXSAtPSBzdGFydCAtIHRoaXMuc3RhcnQ7XG4gICAgICAgICAgICAgICAgdGhpcy5zdGFydCA9IHN0YXJ0O1xuICAgICAgICAgICAgICAgIGxldCBjbG9jaztcbiAgICAgICAgICAgICAgICBpZiAodGhpcy5pc1NlbGZQbGF5KSB7XG4gICAgICAgICAgICAgICAgICAgIGNsb2NrID0gdGhpcy5jb250cm9sbGVyLnR1cm4gPT09IEpHTy5CTEFDSyA/ICcjcmlnaHQtY2xvY2snIDogJyNsZWZ0LWNsb2NrJztcbiAgICAgICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgICAgICBjbG9jayA9IHRoaXMuY29udHJvbGxlci50dXJuID09PSB0aGlzLmNvbnRyb2xsZXIub3duQ29sb3IgPyAnI3JpZ2h0LWNsb2NrJyA6ICcjbGVmdC1jbG9jayc7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICQoY2xvY2spLnRleHQoTWF0aC5jZWlsKHRoaXMudGltZUxlZnRbdGhpcy5jb250cm9sbGVyLnR1cm5dIC8gMTAwMCkpO1xuICAgICAgICAgICAgfSwgMTAwKTtcbiAgICAgICAgfVxuICAgICAgICBpZiAodGhpcy5pc1NlbGZQbGF5KSB7XG4gICAgICAgICAgICAkKCcjcmlnaHQtY2xvY2snKS50ZXh0KE1hdGguY2VpbCh0aGlzLnRpbWVMZWZ0W0pHTy5CTEFDS10gLyAxMDAwKSk7XG4gICAgICAgICAgICAkKCcjbGVmdC1jbG9jaycpLnRleHQoTWF0aC5jZWlsKHRoaXMudGltZUxlZnRbSkdPLldISVRFXSAvIDEwMDApKTtcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICQoJyNyaWdodC1jbG9jaycpLnRleHQoTWF0aC5jZWlsKHRoaXMudGltZUxlZnRbdGhpcy5jb250cm9sbGVyLm93bkNvbG9yXSAvIDEwMDApKTtcbiAgICAgICAgICAgICQoJyNsZWZ0LWNsb2NrJykudGV4dChNYXRoLmNlaWwodGhpcy50aW1lTGVmdFtKR08ub3Bwb25lbnRPZih0aGlzLmNvbnRyb2xsZXIub3duQ29sb3IpXSAvIDEwMDApKTtcbiAgICAgICAgfVxuICAgIH1cblxuICAgIGNsZWFyVGltZXIoKSB7XG4gICAgICAgIGlmICh0aGlzLnRpbWVyKSB7XG4gICAgICAgICAgICBjbGVhckludGVydmFsKHRoaXMudGltZXIpO1xuICAgICAgICAgICAgdGhpcy50aW1lciA9IG51bGw7XG4gICAgICAgIH1cbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBBSeWQjOWjq+OBruOCu+ODq+ODleODl+ODrOOCpOOBi+OBqeOBhuOBi+OCkuioreWumuOBl+OBvuOBmeOAglxuICAgICAqIEBwYXJhbSB7Kn0gaXNTZWxmUGxheSBcbiAgICAgKi9cbiAgICBzZXRJc1NlbGZQbGF5KGlzU2VsZlBsYXkpIHtcbiAgICAgICAgdGhpcy5pc1NlbGZQbGF5ID0gaXNTZWxmUGxheTtcbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiDntYLlsYDlh6bnkIZcbiAgICAgKiBAcHJpdmF0ZVxuICAgICAqL1xuICAgIGFzeW5jIGVuZEdhbWUoKSB7XG4gICAgICAgICgwLCBfc3BlZWNoLmkxOG5TcGVhaykoaTE4bi5zY29yaW5nKTtcbiAgICAgICAgdHJ5IHtcbiAgICAgICAgICAgIGNvbnN0IHNjb3JlID0gYXdhaXQgdGhpcy5maW5hbFNjb3JlKCk7XG4gICAgICAgICAgICBsZXQgbWVzc2FnZTtcbiAgICAgICAgICAgIGlmIChzY29yZSA9PT0gMCkge1xuICAgICAgICAgICAgICAgIG1lc3NhZ2UgPSBpMThuLmppZ287XG4gICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgIG1lc3NhZ2UgPSBpMThuW3Njb3JlID4gMCA/ICdibGFjaycgOiAnd2hpdGUnXTtcbiAgICAgICAgICAgICAgICBzd2l0Y2ggKGkxOG4ubGFuZykge1xuICAgICAgICAgICAgICAgICAgICBjYXNlICdlbic6XG4gICAgICAgICAgICAgICAgICAgICAgICBtZXNzYWdlICs9IGAgd29uIGJ5ICR7c2NvcmV9IHBvaW50c2A7XG4gICAgICAgICAgICAgICAgICAgICAgICBicmVhaztcbiAgICAgICAgICAgICAgICAgICAgY2FzZSAnamEnOlxuICAgICAgICAgICAgICAgICAgICAgICAge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGNvbnN0IGFic1Njb3JlID0gTWF0aC5hYnMoc2NvcmUpO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIG1lc3NhZ2UgKz0gYWJzU2NvcmUgPCAxID8gJ+WNiuebruWLneOBoScgOiBNYXRoLmZsb29yKGFic1Njb3JlKSArICfnm67ljYrli53jgaEnO1xuICAgICAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfVxuICAgICAgICAgICAgc3dpdGNoIChpMThuLmxhbmcpIHtcbiAgICAgICAgICAgICAgICBjYXNlICdlbic6XG4gICAgICAgICAgICAgICAgICAgIG1lc3NhZ2UgKz0gJz8nO1xuICAgICAgICAgICAgICAgICAgICBicmVhaztcbiAgICAgICAgICAgICAgICBjYXNlICdqYSc6XG4gICAgICAgICAgICAgICAgICAgIG1lc3NhZ2UgKz0gJ+OBp+OBmeOBi++8nyc7XG4gICAgICAgICAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgKDAsIF9zcGVlY2guaTE4blNwZWFrKShtZXNzYWdlLnJlcGxhY2UoJ+WNiicsICfjga/jgpMnKSk7XG4gICAgICAgICAgICBzZXRUaW1lb3V0KGZ1bmN0aW9uICgpIHtcbiAgICAgICAgICAgICAgICBhbGVydChtZXNzYWdlKTtcbiAgICAgICAgICAgICAgICAkKGRvY3VtZW50LmJvZHkpLmFkZENsYXNzKCdlbmQnKTtcbiAgICAgICAgICAgIH0sIDMwMDApO1xuICAgICAgICB9IGNhdGNoIChlKSB7XG4gICAgICAgICAgICBjb25zb2xlLmxvZyhlKTtcbiAgICAgICAgICAgICgwLCBfc3BlZWNoLmkxOG5TcGVhaykoaTE4bi5mYWlsU2NvcmluZyk7XG4gICAgICAgIH1cbiAgICB9XG5cbiAgICB1cGRhdGVDbG9jaygpIHtcbiAgICAgICAgaWYgKHRoaXMuZmlzaGVyUnVsZSkge1xuICAgICAgICAgICAgY29uc3QgcGxheWVkID0gSkdPLm9wcG9uZW50T2YodGhpcy5jb250cm9sbGVyLnR1cm4pO1xuICAgICAgICAgICAgY29uc3QgJHBsYXllZFRpbWVyID0gJCh0aGlzLmlzU2VsZlBsYXkgPyB0aGlzLmNvbnRyb2xsZXIudHVybiA9PT0gSkdPLkJMQUNLID8gJyNyaWdodC1jbG9jaycgOiAnI2xlZnQtY2xvY2snIDogcGxheWVkID09PSB0aGlzLmNvbnRyb2xsZXIub3duQ29sb3IgPyAnI3JpZ2h0LWNsb2NrJyA6ICcjbGVmdC1jbG9jaycpO1xuICAgICAgICAgICAgJHBsYXllZFRpbWVyLnRleHQoYCR7TWF0aC5jZWlsKHRoaXMudGltZUxlZnRbcGxheWVkXSAvIDEwMDApfSske3RoaXMuYnlveW9taX1gKTtcbiAgICAgICAgICAgIHRoaXMudGltZUxlZnRbcGxheWVkXSArPSB0aGlzLmJ5b3lvbWkgKiAxMDAwO1xuICAgICAgICAgICAgc2V0VGltZW91dCgoKSA9PiB7XG4gICAgICAgICAgICAgICAgJHBsYXllZFRpbWVyLnRleHQoTWF0aC5jZWlsKHRoaXMudGltZUxlZnRbcGxheWVkXSAvIDEwMDApKTtcbiAgICAgICAgICAgIH0sIDIwMDApO1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgaWYgKHRoaXMuaXNTZWxmUGxheSkge1xuICAgICAgICAgICAgICAgIGNvbnN0IHBsYXllZCA9IEpHTy5vcHBvbmVudE9mKHRoaXMuY29udHJvbGxlci50dXJuKTtcbiAgICAgICAgICAgICAgICB0aGlzLnRpbWVMZWZ0W3BsYXllZF0gPSB0aGlzLmVuZ2luZS5ieW95b21pICogMTAwMDtcbiAgICAgICAgICAgICAgICAkKHBsYXllZCA9PT0gSkdPLkJMQUNLID8gJyNyaWdodC1jbG9jaycgOiAnI2xlZnQtY2xvY2snKS50ZXh0KE1hdGguY2VpbCh0aGlzLnRpbWVMZWZ0W3BsYXllZF0gLyAxMDAwKSk7XG4gICAgICAgICAgICB9IGVsc2UgaWYgKHRoaXMuY29udHJvbGxlci50dXJuID09PSB0aGlzLmNvbnRyb2xsZXIub3duQ29sb3IpIHtcbiAgICAgICAgICAgICAgICB0aGlzLnRpbWVMZWZ0W0pHTy5vcHBvbmVudE9mKHRoaXMuY29udHJvbGxlci50dXJuKV0gPSB0aGlzLmVuZ2luZS5ieW95b21pICogMTAwMDtcbiAgICAgICAgICAgICAgICAkKCcjbGVmdC1jbG9jaycpLnRleHQoTWF0aC5jZWlsKHRoaXMudGltZUxlZnRbSkdPLm9wcG9uZW50T2YodGhpcy5jb250cm9sbGVyLnR1cm4pXSAvIDEwMDApKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgIH1cblxuICAgIGFzeW5jIHVwZGF0ZUVuZ2luZShjb29yZCkge1xuICAgICAgICBpZiAoIXRoaXMuaXNTZWxmUGxheSAmJiB0eXBlb2YgY29vcmQgPT09ICdvYmplY3QnKSB7XG4gICAgICAgICAgICBhd2FpdCB0aGlzLmVuZ2luZS5zdG9wKCk7XG4gICAgICAgICAgICBhd2FpdCB0aGlzLmVuZ2luZS5wbGF5KGNvb3JkLmkgKyAxLCB0aGlzLmNvbnRyb2xsZXIuamJvYXJkLmhlaWdodCAtIGNvb3JkLmopO1xuICAgICAgICB9XG4gICAgfVxuXG4gICAgYXN5bmMgZW5naW5lUGxheSgpIHtcbiAgICAgICAgY29uc3QgbW92ZSA9IGF3YWl0IHRoaXMuZW5naW5lLmdlbm1vdmUoKTtcbiAgICAgICAgaWYgKCF0aGlzLnRpbWVyKSB7XG4gICAgICAgICAgICByZXR1cm47IC8vIOaZgumWk+WIh+OCjOOCguOBl+OBj+OBr+ebuOaJi+OBruaKleS6hlxuICAgICAgICB9XG4gICAgICAgIHN3aXRjaCAobW92ZSkge1xuICAgICAgICAgICAgY2FzZSAncmVzaWduJzpcbiAgICAgICAgICAgICAgICB0aGlzLmNsZWFyVGltZXIoKTtcbiAgICAgICAgICAgICAgICAoMCwgX3NwZWVjaC5pMThuU3BlYWspKGkxOG4ucmVzaWduKTtcbiAgICAgICAgICAgICAgICAkKGRvY3VtZW50LmJvZHkpLmFkZENsYXNzKCdlbmQnKTtcbiAgICAgICAgICAgICAgICBicmVhaztcbiAgICAgICAgICAgIGNhc2UgJ3Bhc3MnOlxuICAgICAgICAgICAgICAgIHRoaXMuY29udHJvbGxlci5wbGF5KG51bGwpO1xuICAgICAgICAgICAgICAgICgwLCBfc3BlZWNoLmkxOG5TcGVhaykoaTE4bi5wYXNzKTtcbiAgICAgICAgICAgICAgICBicmVhaztcbiAgICAgICAgICAgIGRlZmF1bHQ6XG4gICAgICAgICAgICAgICAgdGhpcy5jb250cm9sbGVyLnBsYXkobmV3IEpHTy5Db29yZGluYXRlKG1vdmVbMF0gLSAxLCB0aGlzLmNvbnRyb2xsZXIuamJvYXJkLmhlaWdodCAtIG1vdmVbMV0pLCB0cnVlKTtcbiAgICAgICAgfVxuICAgICAgICBpZiAodGhpcy5maXNoZXJSdWxlKSB7XG4gICAgICAgICAgICBhd2FpdCB0aGlzLmVuZ2luZS50aW1lU2V0dGluZ3ModGhpcy50aW1lTGVmdFtKR08ub3Bwb25lbnRPZih0aGlzLmNvbnRyb2xsZXIudHVybildIC8gMTAwMCwgdGhpcy5ieW95b21pKTtcbiAgICAgICAgfVxuICAgIH1cblxuICAgIC8qKlxuICAgICAqIEJvYXJkQ29udHJvbGxlcuOBruOCquODluOCtuODvOODkOODvOOBq+OBquOCi+OBn+OCgeOBruODoeOCveODg+ODiVxuICAgICAqIEBwYXJhbSB7SkdPLkNvb3JkaW5hdGV9IGNvb3JkIFxuICAgICAqL1xuICAgIGFzeW5jIHVwZGF0ZShjb29yZCkge1xuICAgICAgICBpZiAoY29vcmQgPT09ICdlbmQnKSB7XG4gICAgICAgICAgICB0aGlzLmNsZWFyVGltZXIoKTtcbiAgICAgICAgICAgIGF3YWl0IHRoaXMuZW5kR2FtZSgpO1xuICAgICAgICAgICAgcmV0dXJuO1xuICAgICAgICB9XG4gICAgICAgIGlmICghdGhpcy5pc0ZpcnN0TW92ZSkge1xuICAgICAgICAgICAgdGhpcy51cGRhdGVDbG9jaygpO1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgdGhpcy5pc0ZpcnN0TW92ZSA9IGZhbHNlO1xuICAgICAgICB9XG4gICAgICAgIHRoaXMuY29vcmQgPSBjb29yZDsgLy8g44Od44Oz44OA44O844Go5LiA6Ie044GZ44KL44GL56K66KqN44GZ44KL44Gf44KB44Gr55u05YmN44Gu5bqn5qiZ44KS5L+d5a2Y44CCXG4gICAgICAgIGF3YWl0IHRoaXMudXBkYXRlRW5naW5lKGNvb3JkKTtcbiAgICAgICAgaWYgKHRoaXMuaXNTZWxmUGxheSB8fCB0aGlzLmNvbnRyb2xsZXIudHVybiAhPT0gdGhpcy5jb250cm9sbGVyLm93bkNvbG9yKSB7XG4gICAgICAgICAgICBzZXRUaW1lb3V0KGFzeW5jICgpID0+IHtcbiAgICAgICAgICAgICAgICB0cnkge1xuICAgICAgICAgICAgICAgICAgICBhd2FpdCB0aGlzLmVuZ2luZVBsYXkoKTtcbiAgICAgICAgICAgICAgICB9IGNhdGNoIChlKSB7XG4gICAgICAgICAgICAgICAgICAgIGNvbnNvbGUuZXJyb3IoZSk7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfSwgMCk7XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICBjb25zdCBbeCwgeV0gPSBhd2FpdCB0aGlzLmVuZ2luZS5wb25kZXIoKTtcbiAgICAgICAgICAgIC8vIHBvbmRlcuOBjOe1guS6huOBmeOCi+OBqOOBjeOBq+OBr+asoeOBruedgOaJi+OBjOaJk+OBn+OCjOOBpuOBhOOBpuOAgXRoaXMuY29vcmTjgavkv53lrZjjgZXjgozjgabjgYTjgovjgIJcbiAgICAgICAgICAgIGlmICh4ID09PSB0aGlzLmNvb3JkLmkgKyAxICYmIHkgPT09IHRoaXMuY29udHJvbGxlci5qYm9hcmQuaGVpZ2h0IC0gdGhpcy5jb29yZC5qKSB7XG4gICAgICAgICAgICAgICAgY29uc3QgJHRodW1ic1VwID0gJCgnI3RodW1icy11cCcpO1xuICAgICAgICAgICAgICAgICR0aHVtYnNVcC50ZXh0KHBhcnNlSW50KCR0aHVtYnNVcC50ZXh0KCkpICsgMSk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICB9XG5cbiAgICBhc3luYyBwYXNzKCkge1xuICAgICAgICBpZiAoIXRoaXMuaXNTZWxmUGxheSAmJiB0aGlzLmNvbnRyb2xsZXIub3duQ29sb3IgPT09IHRoaXMuY29udHJvbGxlci50dXJuKSB7XG4gICAgICAgICAgICBhd2FpdCB0aGlzLmVuZ2luZS5zdG9wKCk7XG4gICAgICAgICAgICB0aGlzLmVuZ2luZS5wYXNzKCk7XG4gICAgICAgICAgICB0aGlzLmNvbnRyb2xsZXIucGxheShudWxsKTtcbiAgICAgICAgfVxuICAgIH1cblxuICAgIGFzeW5jIGZpbmFsU2NvcmUoKSB7XG4gICAgICAgIGNvbnN0IHJlc3VsdCA9IGF3YWl0ICQucG9zdCh7XG4gICAgICAgICAgICB1cmw6ICdodHRwczovL21pbWlha2EtcHl0aG9uLmhlcm9rdWFwcC5jb20vZ251Z28nLCAvLyBodHRw44Gn44Gv6YCa5L+h44Gn44GN44Gq44GL44Gj44Gf44CCICdodHRwOi8vMzUuMjAzLjE2MS4xMDAvZ251Z28nLFxuICAgICAgICAgICAgZGF0YToge1xuICAgICAgICAgICAgICAgIHNnZjogdGhpcy5jb250cm9sbGVyLmpyZWNvcmQudG9TZ2YoKSxcbiAgICAgICAgICAgICAgICBtb3ZlOiAnZXN0JyxcbiAgICAgICAgICAgICAgICBtZXRob2Q6ICdhZnRlcm1hdGgnLFxuICAgICAgICAgICAgICAgIHJ1bGU6IHRoaXMuY29udHJvbGxlci5qcmVjb3JkLmdldFJvb3ROb2RlKCkuaW5mby5rb21pID09PSAnNi41JyA/ICdqYXBhbmVzZScgOiAnY2hpbmVzZSdcbiAgICAgICAgICAgIH1cbiAgICAgICAgfSk7XG4gICAgICAgIGlmICgvSmlnby8udGVzdChyZXN1bHQpKSB7XG4gICAgICAgICAgICByZXR1cm4gMDtcbiAgICAgICAgfVxuICAgICAgICBjb25zdCBtYXRjaCA9IHJlc3VsdC5tYXRjaCgvKEJsYWNrfFdoaXRlKSB3aW5zIGJ5IChbMC05Ll0rKSBwb2ludHMvKTtcbiAgICAgICAgaWYgKG1hdGNoKSB7XG4gICAgICAgICAgICBsZXQgc2NvcmUgPSBwYXJzZUZsb2F0KG1hdGNoWzJdKTtcbiAgICAgICAgICAgIGlmIChtYXRjaFsxXSA9PT0gJ0JsYWNrJykge1xuICAgICAgICAgICAgICAgIHJldHVybiBzY29yZTtcbiAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgcmV0dXJuIC1zY29yZTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIHJldHVybiBudWxsO1xuICAgICAgICB9XG4gICAgfVxufVxuZXhwb3J0cy5QbGF5Q29udHJvbGxlciA9IFBsYXlDb250cm9sbGVyOyAvKipcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICogQGZpbGUgTVZD44Gu44Kz44Oz44OI44Ot44O844Op44Gu44Kq44OW44K244O844OQ44O844Kv44Op44K544Gn44GZ44CCXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAqL1xuLypcbiAqIEBhdXRob3Ig5biC5bed6ZuE5LqMXG4gKiBAY29weXJpZ2h0IDIwMTggSUNISUtBV0EsIFl1amkgKE5ldyAzIFJzKVxuICogQGxpY2Vuc2UgTUlUXG4gKi9cbi8qIGdsb2JhbCAkIEpHTyBpMThuICovIiwiJ3VzZSBzdHJpY3QnO1xuXG5PYmplY3QuZGVmaW5lUHJvcGVydHkoZXhwb3J0cywgXCJfX2VzTW9kdWxlXCIsIHtcbiAgICB2YWx1ZTogdHJ1ZVxufSk7XG5leHBvcnRzLnNwZWFrID0gc3BlYWs7XG5leHBvcnRzLmkxOG5TcGVhayA9IGkxOG5TcGVhaztcbi8qKlxuICogQGZpbGUg6Z+z5aOw5ZCI5oiQ44Gu44Op44OD44OR44O86Zai5pWw576k44Gn44GZ44CCXG4gKi9cbi8qXG4gKiBAYXV0aG9yIOW4guW3nembhOS6jFxuICogQGNvcHlyaWdodCAyMDE3IElDSElLQVdBLCBZdWppIChOZXcgMyBScylcbiAqIEBsaWNlbnNlIE1JVFxuICovXG4vKiBnbG9iYWwgaTE4biAqL1xuXG4vKipcbiAqIEBwYXJhbSB7c3RyaW5nfSB0ZXh0XG4gKiBAcGFyYW0ge3N0cmluZ30gbGFuZ1xuICogQHBhcmFtIHtzdHJpbmd9IGdlbmRlclxuICovXG5mdW5jdGlvbiBzcGVhayh0ZXh0LCBsYW5nLCBnZW5kZXIpIHtcbiAgICBpZiAoIVNwZWVjaFN5bnRoZXNpc1V0dGVyYW5jZSkgcmV0dXJuIGZhbHNlO1xuXG4gICAgc3dpdGNoIChsYW5nKSB7XG4gICAgICAgIGNhc2UgJ2VuJzpcbiAgICAgICAgICAgIGxhbmcgPSAnZW4tdXMnO1xuICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgIGNhc2UgJ2phJzpcbiAgICAgICAgICAgIGxhbmcgPSAnamEtanAnO1xuICAgICAgICAgICAgYnJlYWs7XG4gICAgfVxuICAgIGNvbnN0IHV0dGVyYW5jZSA9IG5ldyBTcGVlY2hTeW50aGVzaXNVdHRlcmFuY2UodGV4dCk7XG4gICAgaWYgKC8oaVBob25lfGlQYWR8aVBvZCkoPz0uKk9TIFs3LThdKS8udGVzdChuYXZpZ2F0b3IudXNlckFnZW50KSkgdXR0ZXJhbmNlLnJhdGUgPSAwLjI7XG4gICAgY29uc3Qgdm9pY2VzID0gc3BlZWNoU3ludGhlc2lzLmdldFZvaWNlcygpLmZpbHRlcihlID0+IGUubGFuZy50b0xvd2VyQ2FzZSgpID09PSBsYW5nKTtcbiAgICBsZXQgdm9pY2UgPSBudWxsO1xuICAgIGlmICh2b2ljZXMubGVuZ3RoID4gMSkge1xuICAgICAgICBsZXQgbmFtZXMgPSBudWxsO1xuICAgICAgICBzd2l0Y2ggKGxhbmcpIHtcbiAgICAgICAgICAgIGNhc2UgJ2phLWpwJzpcbiAgICAgICAgICAgICAgICBzd2l0Y2ggKGdlbmRlcikge1xuICAgICAgICAgICAgICAgICAgICBjYXNlICdtYWxlJzpcbiAgICAgICAgICAgICAgICAgICAgICAgIG5hbWVzID0gWydPdG95YScsICdIYXR0b3JpJywgJ0ljaGlybyddO1xuICAgICAgICAgICAgICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgICAgICAgICAgICAgIGNhc2UgJ2ZlbWFsZSc6XG4gICAgICAgICAgICAgICAgICAgICAgICBuYW1lcyA9IFsnTy1yZW7vvIjmi6HlvLXvvIknLCAnTy1yZW4nLCAnS3lva28nLCAnSGFydWthJ107IC8vIFdpbmRvd3MgMTDjga5BeXVtaeOBruWjsOOBr+S7iuOBsuOBqOOBpFxuICAgICAgICAgICAgICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICAgICAgY2FzZSAnZW4tdXMnOlxuICAgICAgICAgICAgICAgIHN3aXRjaCAoZ2VuZGVyKSB7XG4gICAgICAgICAgICAgICAgICAgIGNhc2UgJ21hbGUnOlxuICAgICAgICAgICAgICAgICAgICAgICAgbmFtZXMgPSBbJ0FsZXgnLCAnRnJlZCddO1xuICAgICAgICAgICAgICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgICAgICAgICAgICAgIGNhc2UgJ2ZlbWFsZSc6XG4gICAgICAgICAgICAgICAgICAgICAgICBuYW1lcyA9IFsnU2FtYW50aGEnLCAnVmljdG9yaWEnXTtcbiAgICAgICAgICAgICAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICBicmVhaztcbiAgICAgICAgfVxuICAgICAgICBpZiAobmFtZXMpIHtcbiAgICAgICAgICAgIHZvaWNlID0gdm9pY2VzLmZpbHRlcih2ID0+IG5hbWVzLnNvbWUobiA9PiB2Lm5hbWUuaW5kZXhPZihuKSA+PSAwKSlbMF07XG4gICAgICAgIH1cbiAgICAgICAgaWYgKCF2b2ljZSkge1xuICAgICAgICAgICAgdm9pY2UgPSB2b2ljZXMuZmlsdGVyKHYgPT4gdi5nZW5kZXIgJiYgdi5nZW5kZXIudG9Mb3dlckNhc2UoKSA9PT0gZ2VuZGVyKVswXTtcbiAgICAgICAgfVxuICAgIH1cbiAgICB1dHRlcmFuY2Uudm9pY2UgPSB2b2ljZSB8fCB2b2ljZXNbMF07XG4gICAgLy8gaU9TIDEwIFNhZmFyaSBoYXMgYSBidWcgdGhhdCB1dHRlcmFuY2Uudm9pY2UgaXMgbm8gZWZmZWN0LlxuICAgIHV0dGVyYW5jZS52b2x1bWUgPSBwYXJzZUZsb2F0KGxvY2FsU3RvcmFnZS5nZXRJdGVtKCd2b2x1bWUnKSB8fCAnMS4wJyk7XG4gICAgc3BlZWNoU3ludGhlc2lzLnNwZWFrKHV0dGVyYW5jZSk7XG4gICAgcmV0dXJuIHRydWU7XG59XG5cbi8qKlxuICogQHByaXZhdGVcbiAqL1xuZnVuY3Rpb24gdW5sb2NrKCkge1xuICAgIHdpbmRvdy5yZW1vdmVFdmVudExpc3RlbmVyKCdjbGljaycsIHVubG9jayk7XG4gICAgc3BlZWNoU3ludGhlc2lzLnNwZWFrKG5ldyBTcGVlY2hTeW50aGVzaXNVdHRlcmFuY2UoJycpKTtcbn1cblxuLyoqXG4gKiBcbiAqIEBwYXJhbSB7c3RyaW5nfSBtZXNzYWdlIFxuICovXG5mdW5jdGlvbiBpMThuU3BlYWsobWVzc2FnZSkge1xuICAgIHJldHVybiBzcGVhayhtZXNzYWdlLCBpMThuLmxhbmcsICdmZW1hbGUnKTtcbn1cblxud2luZG93LmFkZEV2ZW50TGlzdGVuZXIoJ2xvYWQnLCBmdW5jdGlvbiAoZXZlbnQpIHtcbiAgICBpZiAoc3BlZWNoU3ludGhlc2lzKSB7XG4gICAgICAgIHNwZWVjaFN5bnRoZXNpcy5nZXRWb2ljZXMoKTtcbiAgICAgICAgaWYgKHNwZWVjaFN5bnRoZXNpcy5vbnZvaWNlc2NoYW5nZWQgIT09IHVuZGVmaW5lZCkge1xuICAgICAgICAgICAgc3BlZWNoU3ludGhlc2lzLm9udm9pY2VzY2hhbmdlZCA9IGZ1bmN0aW9uICgpIHtcbiAgICAgICAgICAgICAgICBjb25zb2xlLmxvZygnb252b2ljZXNjaGFuZ2VkJyk7XG4gICAgICAgICAgICB9O1xuICAgICAgICB9XG4gICAgICAgIHdpbmRvdy5hZGRFdmVudExpc3RlbmVyKCdjbGljaycsIHVubG9jaywgZmFsc2UpOyAvLyBmb3IgaU9TXG4gICAgfVxufSk7IiwiJ3VzZSBzdHJpY3QnO1xuXG5PYmplY3QuZGVmaW5lUHJvcGVydHkoZXhwb3J0cywgXCJfX2VzTW9kdWxlXCIsIHtcbiAgICB2YWx1ZTogdHJ1ZVxufSk7XG5leHBvcnRzLnNodWZmbGUgPSBzaHVmZmxlO1xuZXhwb3J0cy5tb3N0Q29tbW9uID0gbW9zdENvbW1vbjtcbmV4cG9ydHMuYXJnc29ydCA9IGFyZ3NvcnQ7XG5leHBvcnRzLmFyZ21heCA9IGFyZ21heDtcbmV4cG9ydHMuaGFzaCA9IGhhc2g7XG5leHBvcnRzLnNvZnRtYXggPSBzb2Z0bWF4O1xuZXhwb3J0cy5wcmludFByb2IgPSBwcmludFByb2I7XG4vKipcbiAqIEBmaWxlIOWQhOeoruODpuODvOODhuOCo+ODquODhuOCo+mWouaVsOe+pOOBp+OBmeOAglxuICovXG4vKlxuICogQGF1dGhvciDluILlt53pm4TkuoxcbiAqIEBjb3B5cmlnaHQgMjAxOCBJQ0hJS0FXQSwgWXVqaSAoTmV3IDMgUnMpXG4gKiBAbGljZW5zZSBNSVRcbiAqL1xuXG4vKipcbiAqIEBwYXJhbSB7QXJyYXl9IGFycmF5XG4gKi9cbmZ1bmN0aW9uIHNodWZmbGUoYXJyYXkpIHtcbiAgICBsZXQgbiA9IGFycmF5Lmxlbmd0aDtcbiAgICBsZXQgdDtcbiAgICBsZXQgaTtcblxuICAgIHdoaWxlIChuKSB7XG4gICAgICAgIGkgPSBNYXRoLmZsb29yKE1hdGgucmFuZG9tKCkgKiBuLS0pO1xuICAgICAgICB0ID0gYXJyYXlbbl07XG4gICAgICAgIGFycmF5W25dID0gYXJyYXlbaV07XG4gICAgICAgIGFycmF5W2ldID0gdDtcbiAgICB9XG5cbiAgICByZXR1cm4gYXJyYXk7XG59XG5cbi8qKlxuICogYXJyYXnjga7kuK3jga7mnIDpoLvlh7ropoHntKDjgpLov5TjgZfjgb7jgZnjgIJcbiAqIEBwYXJhbSB7QXJyYXl9IGFycmF5IFxuICovXG5mdW5jdGlvbiBtb3N0Q29tbW9uKGFycmF5KSB7XG4gICAgY29uc3QgbWFwID0gbmV3IE1hcCgpO1xuICAgIGZvciAobGV0IGkgPSAwOyBpIDwgYXJyYXkubGVuZ3RoOyBpKyspIHtcbiAgICAgICAgY29uc3QgZSA9IGFycmF5W2ldO1xuICAgICAgICBpZiAobWFwLmhhcyhlKSkge1xuICAgICAgICAgICAgbWFwLnNldChlLCBtYXAuZ2V0KGUpICsgMSk7XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICBtYXAuc2V0KGUsIDEpO1xuICAgICAgICB9XG4gICAgfVxuICAgIGxldCBtYXhLZXk7XG4gICAgbGV0IG1heFZhbHVlID0gLTE7XG4gICAgZm9yIChjb25zdCBba2V5LCB2YWx1ZV0gb2YgbWFwLmVudHJpZXMoKSkge1xuICAgICAgICBpZiAodmFsdWUgPiBtYXhWYWx1ZSkge1xuICAgICAgICAgICAgbWF4S2V5ID0ga2V5O1xuICAgICAgICAgICAgbWF4VmFsdWUgPSB2YWx1ZTtcbiAgICAgICAgfVxuICAgIH1cbiAgICByZXR1cm4gbWF4S2V5O1xufVxuXG4vKiogYXJyYXnjgpLjgr3jg7zjg4jjgZfjgZ/mmYLjga7jgqTjg7Pjg4fjg4Pjgq/jgrnphY3liJfjgpLov5TjgZfjgb7jgZnjgIJcbiAqIEBwYXJhbSB7bnVtYmVyW119IGFycmF5IFxuICogQHBhcmFtIHtib29sfSByZXZlcnNlIFxuICovXG5mdW5jdGlvbiBhcmdzb3J0KGFycmF5LCByZXZlcnNlKSB7XG4gICAgY29uc3QgZW4gPSBBcnJheS5mcm9tKGFycmF5KS5tYXAoKGUsIGkpID0+IFtpLCBlXSk7XG4gICAgZW4uc29ydCgoYSwgYikgPT4gcmV2ZXJzZSA/IGJbMV0gLSBhWzFdIDogYVsxXSAtIGJbMV0pO1xuICAgIHJldHVybiBlbi5tYXAoZSA9PiBlWzBdKTtcbn1cblxuLyoqXG4gKiBhcnJheeOBruS4reOBruacgOWkp+WApOOBruOCpOODs+ODh+ODg+OCr+OCueOCkui/lOOBl+OBvuOBmeOAglxuICogQHBhcmFtIHtudW1iZXJbXX0gYXJyYXkgXG4gKi9cbmZ1bmN0aW9uIGFyZ21heChhcnJheSkge1xuICAgIGxldCBtYXhJbmRleDtcbiAgICBsZXQgbWF4VmFsdWUgPSAtSW5maW5pdHk7XG4gICAgZm9yIChsZXQgaSA9IDA7IGkgPCBhcnJheS5sZW5ndGg7IGkrKykge1xuICAgICAgICBjb25zdCB2ID0gYXJyYXlbaV07XG4gICAgICAgIGlmICh2ID4gbWF4VmFsdWUpIHtcbiAgICAgICAgICAgIG1heEluZGV4ID0gaTtcbiAgICAgICAgICAgIG1heFZhbHVlID0gdjtcbiAgICAgICAgfVxuICAgIH1cbiAgICByZXR1cm4gbWF4SW5kZXg7XG59XG5cbi8qKlxuICogc3Ry44GuMzItYml044OP44OD44K344Ol5YCk44KS6L+U44GX44G+44GZ44CCXG4gKiAo5rOoKTE56Lev55uk44Gn44GvMzItYml044OP44OD44K344Ol5YCk44Gv6KGd56qB44GZ44KL44Go6KiA44KP44KM44Gm44GE44G+44GZ44GM6KGd56qB44Gr44Gv5a++5b+c44GX44Gm44GE44G+44Gb44KT44CCXG4gKiBAcGFyYW0ge3N0cmluZ30gc3RyIFxuICogQHJldHVybnMge0ludGVnZXJ9XG4gKi9cbmZ1bmN0aW9uIGhhc2goc3RyKSB7XG4gICAgbGV0IGhhc2ggPSA1MzgxO1xuICAgIGZvciAobGV0IGkgPSAwOyBpIDwgc3RyLmxlbmd0aDsgaSsrKSB7XG4gICAgICAgIGNvbnN0IGNoYXIgPSBzdHIuY2hhckNvZGVBdChpKTtcbiAgICAgICAgaGFzaCA9IChoYXNoIDw8IDUpICsgaGFzaCArIGNoYXI7IC8qIGhhc2ggKiAzMyArIGMgKi9cbiAgICAgICAgaGFzaCA9IGhhc2ggJiBoYXNoOyAvLyBDb252ZXJ0IHRvIDMyYml0IGludGVnZXJcbiAgICB9XG4gICAgcmV0dXJuIE1hdGguYWJzKGhhc2gpO1xufVxuXG4vKipcbiAqIOa4qeW6puODkeODqeODoeODvOOCv+OBguOCiuOBruOCveODleODiOODnuODg+OCr+OCuemWouaVsOOBp+OBmeOAglxuICogQHBhcmFtIHtGbG9hdDMyQXJyYXl9IGlucHV0IFxuICogQHBhcmFtIHtudW1iZXJ9IHRlbXBlcmF0dXJlXG4gKiBAcmV0dXJucyB7RmxvYXQzMkFycmF5fVxuICovXG5mdW5jdGlvbiBzb2Z0bWF4KGlucHV0LCB0ZW1wZXJhdHVyZSA9IDEuMCkge1xuICAgIGNvbnN0IG91dHB1dCA9IG5ldyBGbG9hdDMyQXJyYXkoaW5wdXQubGVuZ3RoKTtcbiAgICBjb25zdCBhbHBoYSA9IE1hdGgubWF4LmFwcGx5KG51bGwsIGlucHV0KTtcbiAgICBsZXQgZGVub20gPSAwLjA7XG5cbiAgICBmb3IgKGxldCBpID0gMDsgaSA8IGlucHV0Lmxlbmd0aDsgaSsrKSB7XG4gICAgICAgIGNvbnN0IHZhbCA9IE1hdGguZXhwKChpbnB1dFtpXSAtIGFscGhhKSAvIHRlbXBlcmF0dXJlKTtcbiAgICAgICAgZGVub20gKz0gdmFsO1xuICAgICAgICBvdXRwdXRbaV0gPSB2YWw7XG4gICAgfVxuXG4gICAgZm9yIChsZXQgaSA9IDA7IGkgPCBvdXRwdXQubGVuZ3RoOyBpKyspIHtcbiAgICAgICAgb3V0cHV0W2ldIC89IGRlbm9tO1xuICAgIH1cblxuICAgIHJldHVybiBvdXRwdXQ7XG59XG5cbmZ1bmN0aW9uIHByaW50UHJvYihwcm9iLCBzaXplKSB7XG4gICAgZm9yIChsZXQgeSA9IDA7IHkgPCBzaXplOyB5KyspIHtcbiAgICAgICAgbGV0IHN0ciA9IGAke3kgKyAxfSBgO1xuICAgICAgICBmb3IgKGxldCB4ID0gMDsgeCA8IHNpemU7IHgrKykge1xuICAgICAgICAgICAgc3RyICs9ICgnICAnICsgcHJvYlt4ICsgeSAqIHNpemVdLnRvRml4ZWQoMSkpLnNsaWNlKC01KTtcbiAgICAgICAgfVxuICAgICAgICBjb25zb2xlLmxvZyhzdHIpO1xuICAgIH1cbiAgICBjb25zb2xlLmxvZygncGFzcz0lcycsIHByb2JbcHJvYi5sZW5ndGggLSAxXS50b0ZpeGVkKDEpKTtcbn0iXX0=
