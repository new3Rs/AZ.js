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
        this.ownColor = null; // ownColorはGUIを使用する側
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
 */
/* global $ JGO i18n */
async function startGame(size, engine) {
    const board = await new Promise(function (res, rej) {
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
        board.setOwnColor(JGO.WHITE);
        if (board.jboard.width === 9) {
            board.setKomi(5.5);
        }
    } else if (condition.color === 'B') {
        board.setOwnColor(JGO.BLACK);
        if (board.jboard.width === 9) {
            board.setKomi(6.5);
        }
    }
    const controller = new _play_controller.PlayController(engine, board, mainTime, byoyomi, condition.timeRule === 'igo-quest');
    const isSelfPlay = condition.color === 'self-play';
    if (!isSelfPlay) {
        (0, _speech.i18nSpeak)(i18n.startGreet);
    }
    controller.setIsSelfPlay(isSelfPlay);
    board.addObserver(controller);
    $('#pass').on('click', function (event) {
        controller.pass();
    });
    $('#resign').one('click', async function (event) {
        controller.clearTimer();
        await engine.stop();
        (0, _speech.i18nSpeak)(i18n.endGreet);
        $(document.body).addClass('end');
    });
    $('#retry').one('click', async function (event) {
        $('#pass').off('click');
        $('#resign').off('click');
        board.destroy();
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
    }

    /**
     * ニューラルネットワークを評価した結果を返します。
     * @param {Array} inputs 
     * @returns {Array}
     */
    async evaluate(...inputs) {
        // AlphaGo Zeroではここで入力をランダムに回転/鏡像変換していますが、サボっています。
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
     * @param {BoardController} board 
     * @param {number} mainTime 
     * @param {number} byoyomi 
     * @param {bool} fisherRule 
     */
    constructor(engine, board, mainTime, byoyomi, fisherRule) {
        this.engine = engine;
        this.board = board;
        this.isSelfPlay = false;
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
                this.timeLeft[this.board.turn] -= start - this.start;
                this.start = start;
                if (this.board.ownColor === this.board.turn) {
                    $('#your-time').text(Math.ceil(this.timeLeft[this.board.ownColor] / 1000));
                } else {
                    $('#ai-time').text(Math.ceil(this.timeLeft[JGO.opponentOf(this.board.ownColor)] / 1000));
                }
                if (this.timeLeft[this.board.turn] < 0) {
                    clearInterval(this.timer);
                    this.timer = null;
                    this.engine.stop();
                    alert(i18n.timeout);
                }
            }, 100);
        } else {
            this.timeLeft = [0, // dumy
            this.board.ownColor === JGO.BLACK ? Infinity : this.engine.byoyomi * 1000, // black
            this.board.ownColor === JGO.BLACK ? this.engine.byoyomi * 1000 : Infinity];
            this.start = Date.now();
            this.timer = setInterval(() => {
                const start = Date.now();
                this.timeLeft[this.board.turn] -= start - this.start;
                this.start = start;
                if (this.board.turn == this.board.ownColor) {
                    $('#your-time').text(Math.ceil(this.timeLeft[this.board.turn] / 1000));
                } else {
                    $('#ai-time').text(Math.ceil(this.timeLeft[this.board.turn] / 1000));
                }
            }, 100);
        }
        $('#your-time').text(Math.ceil(this.timeLeft[this.board.ownColor] / 1000));
        $('#ai-time').text(Math.ceil(this.timeLeft[JGO.opponentOf(this.board.ownColor)] / 1000));
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
            const played = JGO.opponentOf(this.board.turn);
            const $playedTimer = $(played === this.board.ownColor ? '#your-time' : '#ai-time');
            $playedTimer.text(`${Math.ceil(this.timeLeft[played] / 1000)}+${this.byoyomi}`);
            this.timeLeft[played] += this.byoyomi * 1000;
            setTimeout(() => {
                $playedTimer.text(Math.ceil(this.timeLeft[played] / 1000));
            }, 2000);
        } else if (this.board.turn === this.board.ownColor) {
            this.timeLeft[JGO.opponentOf(this.board.ownColor)] = this.engine.byoyomi * 1000;
            $('#ai-time').text(Math.ceil(this.timeLeft[JGO.opponentOf(this.board.ownColor)] / 1000));
        }
    }

    async updateEngine(coord) {
        if (!this.isSelfPlay && typeof coord === 'object') {
            await this.engine.stop();
            await this.engine.play(coord.i + 1, this.board.jboard.height - coord.j);
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
                this.board.play(null);
                (0, _speech.i18nSpeak)(i18n.pass);
                break;
            default:
                this.board.play(new JGO.Coordinate(move[0] - 1, this.board.jboard.height - move[1]), true);
        }
        if (this.fisherRule) {
            await this.engine.timeSettings(this.timeLeft[JGO.opponentOf(this.board.ownColor)] / 1000, this.byoyomi);
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
        await this.updateEngine(coord);
        if (this.isSelfPlay || this.board.turn !== this.board.ownColor) {
            setTimeout(async () => {
                try {
                    await this.enginePlay();
                } catch (e) {
                    console.error(e);
                }
            }, 0);
        } else {
            this.engine.ponder();
        }
    }

    async pass() {
        if (this.board.ownColor === this.board.turn) {
            await this.engine.stop();
            this.engine.pass();
            this.board.play(null);
        }
    }

    async finalScore() {
        const result = await $.post({
            url: 'https://mimiaka-python.herokuapp.com/gnugo', // httpでは通信できなかった。 'http://35.203.161.100/gnugo',
            data: {
                sgf: this.board.jrecord.toSgf(),
                move: 'est',
                method: 'aftermath',
                rule: this.board.jrecord.getRootNode().info.komi === '6.5' ? 'japanese' : 'chinese'
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
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIm5vZGVfbW9kdWxlcy9icm93c2VyLXBhY2svX3ByZWx1ZGUuanMiLCJub2RlX21vZHVsZXMvYnNvbi1vYmplY3RpZC9vYmplY3RpZC5qcyIsIm5vZGVfbW9kdWxlcy9wcm9jZXNzL2Jyb3dzZXIuanMiLCJub2RlX21vZHVsZXMvd29ya2VyLXJtaS93b3JrZXItcm1pLmpzIiwic3JjL2F6anNfZW5naW5lX2NsaWVudC5qcyIsInNyYy9ib2FyZF9jb250cm9sbGVyLmpzIiwic3JjL21haW4uanMiLCJzcmMvbmV1cmFsX25ldHdvcmsuanMiLCJzcmMvcGxheV9jb250cm9sbGVyLmpzIiwic3JjL3NwZWVjaC5qcyIsInNyYy91dGlscy5qcyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7QUNBQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7OztBQzlOQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ3hMQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUMzS0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUM1RUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDblBBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUM5SkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDdkZBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ25QQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ3BHQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBIiwiZmlsZSI6ImdlbmVyYXRlZC5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzQ29udGVudCI6WyIoZnVuY3Rpb24oKXtmdW5jdGlvbiByKGUsbix0KXtmdW5jdGlvbiBvKGksZil7aWYoIW5baV0pe2lmKCFlW2ldKXt2YXIgYz1cImZ1bmN0aW9uXCI9PXR5cGVvZiByZXF1aXJlJiZyZXF1aXJlO2lmKCFmJiZjKXJldHVybiBjKGksITApO2lmKHUpcmV0dXJuIHUoaSwhMCk7dmFyIGE9bmV3IEVycm9yKFwiQ2Fubm90IGZpbmQgbW9kdWxlICdcIitpK1wiJ1wiKTt0aHJvdyBhLmNvZGU9XCJNT0RVTEVfTk9UX0ZPVU5EXCIsYX12YXIgcD1uW2ldPXtleHBvcnRzOnt9fTtlW2ldWzBdLmNhbGwocC5leHBvcnRzLGZ1bmN0aW9uKHIpe3ZhciBuPWVbaV1bMV1bcl07cmV0dXJuIG8obnx8cil9LHAscC5leHBvcnRzLHIsZSxuLHQpfXJldHVybiBuW2ldLmV4cG9ydHN9Zm9yKHZhciB1PVwiZnVuY3Rpb25cIj09dHlwZW9mIHJlcXVpcmUmJnJlcXVpcmUsaT0wO2k8dC5sZW5ndGg7aSsrKW8odFtpXSk7cmV0dXJuIG99cmV0dXJuIHJ9KSgpIiwiXG52YXIgTUFDSElORV9JRCA9IE1hdGguZmxvb3IoTWF0aC5yYW5kb20oKSAqIDB4RkZGRkZGKTtcbnZhciBpbmRleCA9IE9iamVjdElELmluZGV4ID0gcGFyc2VJbnQoTWF0aC5yYW5kb20oKSAqIDB4RkZGRkZGLCAxMCk7XG52YXIgcGlkID0gKHR5cGVvZiBwcm9jZXNzID09PSAndW5kZWZpbmVkJyB8fCB0eXBlb2YgcHJvY2Vzcy5waWQgIT09ICdudW1iZXInID8gTWF0aC5mbG9vcihNYXRoLnJhbmRvbSgpICogMTAwMDAwKSA6IHByb2Nlc3MucGlkKSAlIDB4RkZGRjtcblxuLyoqXG4gKiBEZXRlcm1pbmUgaWYgYW4gb2JqZWN0IGlzIEJ1ZmZlclxuICpcbiAqIEF1dGhvcjogICBGZXJvc3MgQWJvdWtoYWRpamVoIDxmZXJvc3NAZmVyb3NzLm9yZz4gPGh0dHA6Ly9mZXJvc3Mub3JnPlxuICogTGljZW5zZTogIE1JVFxuICpcbiAqL1xudmFyIGlzQnVmZmVyID0gZnVuY3Rpb24gKG9iaikge1xuICByZXR1cm4gISEoXG4gIG9iaiAhPSBudWxsICYmXG4gIG9iai5jb25zdHJ1Y3RvciAmJlxuICB0eXBlb2Ygb2JqLmNvbnN0cnVjdG9yLmlzQnVmZmVyID09PSAnZnVuY3Rpb24nICYmXG4gIG9iai5jb25zdHJ1Y3Rvci5pc0J1ZmZlcihvYmopXG4gIClcbn07XG5cbi8qKlxuICogQ3JlYXRlIGEgbmV3IGltbXV0YWJsZSBPYmplY3RJRCBpbnN0YW5jZVxuICpcbiAqIEBjbGFzcyBSZXByZXNlbnRzIHRoZSBCU09OIE9iamVjdElEIHR5cGVcbiAqIEBwYXJhbSB7U3RyaW5nfE51bWJlcn0gYXJnIENhbiBiZSBhIDI0IGJ5dGUgaGV4IHN0cmluZywgMTIgYnl0ZSBiaW5hcnkgc3RyaW5nIG9yIGEgTnVtYmVyLlxuICogQHJldHVybiB7T2JqZWN0fSBpbnN0YW5jZSBvZiBPYmplY3RJRC5cbiAqL1xuZnVuY3Rpb24gT2JqZWN0SUQoYXJnKSB7XG4gIGlmKCEodGhpcyBpbnN0YW5jZW9mIE9iamVjdElEKSkgcmV0dXJuIG5ldyBPYmplY3RJRChhcmcpO1xuICBpZihhcmcgJiYgKChhcmcgaW5zdGFuY2VvZiBPYmplY3RJRCkgfHwgYXJnLl9ic29udHlwZT09PVwiT2JqZWN0SURcIikpXG4gICAgcmV0dXJuIGFyZztcblxuICB2YXIgYnVmO1xuXG4gIGlmKGlzQnVmZmVyKGFyZykgfHwgKEFycmF5LmlzQXJyYXkoYXJnKSAmJiBhcmcubGVuZ3RoPT09MTIpKSB7XG4gICAgYnVmID0gQXJyYXkucHJvdG90eXBlLnNsaWNlLmNhbGwoYXJnKTtcbiAgfVxuICBlbHNlIGlmKHR5cGVvZiBhcmcgPT09IFwic3RyaW5nXCIpIHtcbiAgICBpZihhcmcubGVuZ3RoIT09MTIgJiYgIU9iamVjdElELmlzVmFsaWQoYXJnKSlcbiAgICAgIHRocm93IG5ldyBFcnJvcihcIkFyZ3VtZW50IHBhc3NlZCBpbiBtdXN0IGJlIGEgc2luZ2xlIFN0cmluZyBvZiAxMiBieXRlcyBvciBhIHN0cmluZyBvZiAyNCBoZXggY2hhcmFjdGVyc1wiKTtcblxuICAgIGJ1ZiA9IGJ1ZmZlcihhcmcpO1xuICB9XG4gIGVsc2UgaWYoL251bWJlcnx1bmRlZmluZWQvLnRlc3QodHlwZW9mIGFyZykpIHtcbiAgICBidWYgPSBidWZmZXIoZ2VuZXJhdGUoYXJnKSk7XG4gIH1cblxuICBPYmplY3QuZGVmaW5lUHJvcGVydHkodGhpcywgXCJpZFwiLCB7XG4gICAgZW51bWVyYWJsZTogdHJ1ZSxcbiAgICBnZXQ6IGZ1bmN0aW9uKCkgeyByZXR1cm4gU3RyaW5nLmZyb21DaGFyQ29kZS5hcHBseSh0aGlzLCBidWYpOyB9XG4gIH0pO1xuICBPYmplY3QuZGVmaW5lUHJvcGVydHkodGhpcywgXCJzdHJcIiwge1xuICAgIGdldDogZnVuY3Rpb24oKSB7IHJldHVybiBidWYubWFwKGhleC5iaW5kKHRoaXMsIDIpKS5qb2luKCcnKTsgfVxuICB9KTtcbn1cbm1vZHVsZS5leHBvcnRzID0gT2JqZWN0SUQ7XG5PYmplY3RJRC5nZW5lcmF0ZSA9IGdlbmVyYXRlO1xuT2JqZWN0SUQuZGVmYXVsdCA9IE9iamVjdElEO1xuXG4vKipcbiAqIENyZWF0ZXMgYW4gT2JqZWN0SUQgZnJvbSBhIHNlY29uZCBiYXNlZCBudW1iZXIsIHdpdGggdGhlIHJlc3Qgb2YgdGhlIE9iamVjdElEIHplcm9lZCBvdXQuIFVzZWQgZm9yIGNvbXBhcmlzb25zIG9yIHNvcnRpbmcgdGhlIE9iamVjdElELlxuICpcbiAqIEBwYXJhbSB7TnVtYmVyfSB0aW1lIGFuIGludGVnZXIgbnVtYmVyIHJlcHJlc2VudGluZyBhIG51bWJlciBvZiBzZWNvbmRzLlxuICogQHJldHVybiB7T2JqZWN0SUR9IHJldHVybiB0aGUgY3JlYXRlZCBPYmplY3RJRFxuICogQGFwaSBwdWJsaWNcbiAqL1xuT2JqZWN0SUQuY3JlYXRlRnJvbVRpbWUgPSBmdW5jdGlvbih0aW1lKXtcbiAgdGltZSA9IHBhcnNlSW50KHRpbWUsIDEwKSAlIDB4RkZGRkZGRkY7XG4gIHJldHVybiBuZXcgT2JqZWN0SUQoaGV4KDgsdGltZSkrXCIwMDAwMDAwMDAwMDAwMDAwXCIpO1xufTtcblxuLyoqXG4gKiBDcmVhdGVzIGFuIE9iamVjdElEIGZyb20gYSBoZXggc3RyaW5nIHJlcHJlc2VudGF0aW9uIG9mIGFuIE9iamVjdElELlxuICpcbiAqIEBwYXJhbSB7U3RyaW5nfSBoZXhTdHJpbmcgY3JlYXRlIGEgT2JqZWN0SUQgZnJvbSBhIHBhc3NlZCBpbiAyNCBieXRlIGhleHN0cmluZy5cbiAqIEByZXR1cm4ge09iamVjdElEfSByZXR1cm4gdGhlIGNyZWF0ZWQgT2JqZWN0SURcbiAqIEBhcGkgcHVibGljXG4gKi9cbk9iamVjdElELmNyZWF0ZUZyb21IZXhTdHJpbmcgPSBmdW5jdGlvbihoZXhTdHJpbmcpIHtcbiAgaWYoIU9iamVjdElELmlzVmFsaWQoaGV4U3RyaW5nKSlcbiAgICB0aHJvdyBuZXcgRXJyb3IoXCJJbnZhbGlkIE9iamVjdElEIGhleCBzdHJpbmdcIik7XG5cbiAgcmV0dXJuIG5ldyBPYmplY3RJRChoZXhTdHJpbmcpO1xufTtcblxuLyoqXG4gKiBDaGVja3MgaWYgYSB2YWx1ZSBpcyBhIHZhbGlkIGJzb24gT2JqZWN0SWRcbiAqXG4gKiBAcGFyYW0ge1N0cmluZ30gb2JqZWN0aWQgQ2FuIGJlIGEgMjQgYnl0ZSBoZXggc3RyaW5nIG9yIGFuIGluc3RhbmNlIG9mIE9iamVjdElELlxuICogQHJldHVybiB7Qm9vbGVhbn0gcmV0dXJuIHRydWUgaWYgdGhlIHZhbHVlIGlzIGEgdmFsaWQgYnNvbiBPYmplY3RJRCwgcmV0dXJuIGZhbHNlIG90aGVyd2lzZS5cbiAqIEBhcGkgcHVibGljXG4gKlxuICogVEhFIE5BVElWRSBET0NVTUVOVEFUSU9OIElTTidUIENMRUFSIE9OIFRISVMgR1VZIVxuICogaHR0cDovL21vbmdvZGIuZ2l0aHViLmlvL25vZGUtbW9uZ29kYi1uYXRpdmUvYXBpLWJzb24tZ2VuZXJhdGVkL29iamVjdGlkLmh0bWwjb2JqZWN0aWQtaXN2YWxpZFxuICovXG5PYmplY3RJRC5pc1ZhbGlkID0gZnVuY3Rpb24ob2JqZWN0aWQpIHtcbiAgaWYoIW9iamVjdGlkKSByZXR1cm4gZmFsc2U7XG5cbiAgLy9jYWxsIC50b1N0cmluZygpIHRvIGdldCB0aGUgaGV4IGlmIHdlJ3JlXG4gIC8vIHdvcmtpbmcgd2l0aCBhbiBpbnN0YW5jZSBvZiBPYmplY3RJRFxuICByZXR1cm4gL15bMC05QS1GXXsyNH0kL2kudGVzdChvYmplY3RpZC50b1N0cmluZygpKTtcbn07XG5cbi8qKlxuICogc2V0IGEgY3VzdG9tIG1hY2hpbmVJRFxuICogXG4gKiBAcGFyYW0ge1N0cmluZ3xOdW1iZXJ9IG1hY2hpbmVpZCBDYW4gYmUgYSBzdHJpbmcsIGhleC1zdHJpbmcgb3IgYSBudW1iZXJcbiAqIEByZXR1cm4ge3ZvaWR9XG4gKiBAYXBpIHB1YmxpY1xuICovXG5PYmplY3RJRC5zZXRNYWNoaW5lSUQgPSBmdW5jdGlvbihhcmcpIHtcbiAgdmFyIG1hY2hpbmVJRDtcblxuICBpZih0eXBlb2YgYXJnID09PSBcInN0cmluZ1wiKSB7XG4gICAgLy8gaGV4IHN0cmluZ1xuICAgIG1hY2hpbmVJRCA9IHBhcnNlSW50KGFyZywgMTYpO1xuICAgXG4gICAgLy8gYW55IHN0cmluZ1xuICAgIGlmKGlzTmFOKG1hY2hpbmVJRCkpIHtcbiAgICAgIGFyZyA9ICgnMDAwMDAwJyArIGFyZykuc3Vic3RyKC03LDYpO1xuXG4gICAgICBtYWNoaW5lSUQgPSBcIlwiO1xuICAgICAgZm9yKHZhciBpID0gMDtpPDY7IGkrKykge1xuICAgICAgICBtYWNoaW5lSUQgKz0gKGFyZy5jaGFyQ29kZUF0KGkpKTtcbiAgICAgIH1cbiAgICB9XG4gIH1cbiAgZWxzZSBpZigvbnVtYmVyfHVuZGVmaW5lZC8udGVzdCh0eXBlb2YgYXJnKSkge1xuICAgIG1hY2hpbmVJRCA9IGFyZyB8IDA7XG4gIH1cblxuICBNQUNISU5FX0lEID0gKG1hY2hpbmVJRCAmIDB4RkZGRkZGKTtcbn1cblxuLyoqXG4gKiBnZXQgdGhlIG1hY2hpbmVJRFxuICogXG4gKiBAcmV0dXJuIHtudW1iZXJ9XG4gKiBAYXBpIHB1YmxpY1xuICovXG5PYmplY3RJRC5nZXRNYWNoaW5lSUQgPSBmdW5jdGlvbigpIHtcbiAgcmV0dXJuIE1BQ0hJTkVfSUQ7XG59XG5cbk9iamVjdElELnByb3RvdHlwZSA9IHtcbiAgX2Jzb250eXBlOiAnT2JqZWN0SUQnLFxuICBjb25zdHJ1Y3RvcjogT2JqZWN0SUQsXG5cbiAgLyoqXG4gICAqIFJldHVybiB0aGUgT2JqZWN0SUQgaWQgYXMgYSAyNCBieXRlIGhleCBzdHJpbmcgcmVwcmVzZW50YXRpb25cbiAgICpcbiAgICogQHJldHVybiB7U3RyaW5nfSByZXR1cm4gdGhlIDI0IGJ5dGUgaGV4IHN0cmluZyByZXByZXNlbnRhdGlvbi5cbiAgICogQGFwaSBwdWJsaWNcbiAgICovXG4gIHRvSGV4U3RyaW5nOiBmdW5jdGlvbigpIHtcbiAgICByZXR1cm4gdGhpcy5zdHI7XG4gIH0sXG5cbiAgLyoqXG4gICAqIENvbXBhcmVzIHRoZSBlcXVhbGl0eSBvZiB0aGlzIE9iamVjdElEIHdpdGggYG90aGVySURgLlxuICAgKlxuICAgKiBAcGFyYW0ge09iamVjdH0gb3RoZXIgT2JqZWN0SUQgaW5zdGFuY2UgdG8gY29tcGFyZSBhZ2FpbnN0LlxuICAgKiBAcmV0dXJuIHtCb29sZWFufSB0aGUgcmVzdWx0IG9mIGNvbXBhcmluZyB0d28gT2JqZWN0SUQnc1xuICAgKiBAYXBpIHB1YmxpY1xuICAgKi9cbiAgZXF1YWxzOiBmdW5jdGlvbiAob3RoZXIpe1xuICAgIHJldHVybiAhIW90aGVyICYmIHRoaXMuc3RyID09PSBvdGhlci50b1N0cmluZygpO1xuICB9LFxuXG4gIC8qKlxuICAgKiBSZXR1cm5zIHRoZSBnZW5lcmF0aW9uIGRhdGUgKGFjY3VyYXRlIHVwIHRvIHRoZSBzZWNvbmQpIHRoYXQgdGhpcyBJRCB3YXMgZ2VuZXJhdGVkLlxuICAgKlxuICAgKiBAcmV0dXJuIHtEYXRlfSB0aGUgZ2VuZXJhdGlvbiBkYXRlXG4gICAqIEBhcGkgcHVibGljXG4gICAqL1xuICBnZXRUaW1lc3RhbXA6IGZ1bmN0aW9uKCl7XG4gICAgcmV0dXJuIG5ldyBEYXRlKHBhcnNlSW50KHRoaXMuc3RyLnN1YnN0cigwLDgpLCAxNikgKiAxMDAwKTtcbiAgfVxufTtcblxuZnVuY3Rpb24gbmV4dCgpIHtcbiAgcmV0dXJuIGluZGV4ID0gKGluZGV4KzEpICUgMHhGRkZGRkY7XG59XG5cbmZ1bmN0aW9uIGdlbmVyYXRlKHRpbWUpIHtcbiAgaWYgKHR5cGVvZiB0aW1lICE9PSAnbnVtYmVyJylcbiAgICB0aW1lID0gRGF0ZS5ub3coKS8xMDAwO1xuXG4gIC8va2VlcCBpdCBpbiB0aGUgcmluZyFcbiAgdGltZSA9IHBhcnNlSW50KHRpbWUsIDEwKSAlIDB4RkZGRkZGRkY7XG5cbiAgLy9GRkZGRkZGRiBGRkZGRkYgRkZGRiBGRkZGRkZcbiAgcmV0dXJuIGhleCg4LHRpbWUpICsgaGV4KDYsTUFDSElORV9JRCkgKyBoZXgoNCxwaWQpICsgaGV4KDYsbmV4dCgpKTtcbn1cblxuZnVuY3Rpb24gaGV4KGxlbmd0aCwgbikge1xuICBuID0gbi50b1N0cmluZygxNik7XG4gIHJldHVybiAobi5sZW5ndGg9PT1sZW5ndGgpPyBuIDogXCIwMDAwMDAwMFwiLnN1YnN0cmluZyhuLmxlbmd0aCwgbGVuZ3RoKSArIG47XG59XG5cbmZ1bmN0aW9uIGJ1ZmZlcihzdHIpIHtcbiAgdmFyIGk9MCxvdXQ9W107XG5cbiAgaWYoc3RyLmxlbmd0aD09PTI0KVxuICAgIGZvcig7aTwyNDsgb3V0LnB1c2gocGFyc2VJbnQoc3RyW2ldK3N0cltpKzFdLCAxNikpLGkrPTIpO1xuXG4gIGVsc2UgaWYoc3RyLmxlbmd0aD09PTEyKVxuICAgIGZvcig7aTwxMjsgb3V0LnB1c2goc3RyLmNoYXJDb2RlQXQoaSkpLGkrKyk7XG5cbiAgcmV0dXJuIG91dDtcbn1cblxuLyoqXG4gKiBDb252ZXJ0cyB0byBhIHN0cmluZyByZXByZXNlbnRhdGlvbiBvZiB0aGlzIElkLlxuICpcbiAqIEByZXR1cm4ge1N0cmluZ30gcmV0dXJuIHRoZSAyNCBieXRlIGhleCBzdHJpbmcgcmVwcmVzZW50YXRpb24uXG4gKiBAYXBpIHByaXZhdGVcbiAqL1xuT2JqZWN0SUQucHJvdG90eXBlLmluc3BlY3QgPSBmdW5jdGlvbigpIHsgcmV0dXJuIFwiT2JqZWN0SUQoXCIrdGhpcytcIilcIiB9O1xuT2JqZWN0SUQucHJvdG90eXBlLnRvSlNPTiA9IE9iamVjdElELnByb3RvdHlwZS50b0hleFN0cmluZztcbk9iamVjdElELnByb3RvdHlwZS50b1N0cmluZyA9IE9iamVjdElELnByb3RvdHlwZS50b0hleFN0cmluZztcbiIsIi8vIHNoaW0gZm9yIHVzaW5nIHByb2Nlc3MgaW4gYnJvd3NlclxudmFyIHByb2Nlc3MgPSBtb2R1bGUuZXhwb3J0cyA9IHt9O1xuXG4vLyBjYWNoZWQgZnJvbSB3aGF0ZXZlciBnbG9iYWwgaXMgcHJlc2VudCBzbyB0aGF0IHRlc3QgcnVubmVycyB0aGF0IHN0dWIgaXRcbi8vIGRvbid0IGJyZWFrIHRoaW5ncy4gIEJ1dCB3ZSBuZWVkIHRvIHdyYXAgaXQgaW4gYSB0cnkgY2F0Y2ggaW4gY2FzZSBpdCBpc1xuLy8gd3JhcHBlZCBpbiBzdHJpY3QgbW9kZSBjb2RlIHdoaWNoIGRvZXNuJ3QgZGVmaW5lIGFueSBnbG9iYWxzLiAgSXQncyBpbnNpZGUgYVxuLy8gZnVuY3Rpb24gYmVjYXVzZSB0cnkvY2F0Y2hlcyBkZW9wdGltaXplIGluIGNlcnRhaW4gZW5naW5lcy5cblxudmFyIGNhY2hlZFNldFRpbWVvdXQ7XG52YXIgY2FjaGVkQ2xlYXJUaW1lb3V0O1xuXG5mdW5jdGlvbiBkZWZhdWx0U2V0VGltb3V0KCkge1xuICAgIHRocm93IG5ldyBFcnJvcignc2V0VGltZW91dCBoYXMgbm90IGJlZW4gZGVmaW5lZCcpO1xufVxuZnVuY3Rpb24gZGVmYXVsdENsZWFyVGltZW91dCAoKSB7XG4gICAgdGhyb3cgbmV3IEVycm9yKCdjbGVhclRpbWVvdXQgaGFzIG5vdCBiZWVuIGRlZmluZWQnKTtcbn1cbihmdW5jdGlvbiAoKSB7XG4gICAgdHJ5IHtcbiAgICAgICAgaWYgKHR5cGVvZiBzZXRUaW1lb3V0ID09PSAnZnVuY3Rpb24nKSB7XG4gICAgICAgICAgICBjYWNoZWRTZXRUaW1lb3V0ID0gc2V0VGltZW91dDtcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIGNhY2hlZFNldFRpbWVvdXQgPSBkZWZhdWx0U2V0VGltb3V0O1xuICAgICAgICB9XG4gICAgfSBjYXRjaCAoZSkge1xuICAgICAgICBjYWNoZWRTZXRUaW1lb3V0ID0gZGVmYXVsdFNldFRpbW91dDtcbiAgICB9XG4gICAgdHJ5IHtcbiAgICAgICAgaWYgKHR5cGVvZiBjbGVhclRpbWVvdXQgPT09ICdmdW5jdGlvbicpIHtcbiAgICAgICAgICAgIGNhY2hlZENsZWFyVGltZW91dCA9IGNsZWFyVGltZW91dDtcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIGNhY2hlZENsZWFyVGltZW91dCA9IGRlZmF1bHRDbGVhclRpbWVvdXQ7XG4gICAgICAgIH1cbiAgICB9IGNhdGNoIChlKSB7XG4gICAgICAgIGNhY2hlZENsZWFyVGltZW91dCA9IGRlZmF1bHRDbGVhclRpbWVvdXQ7XG4gICAgfVxufSAoKSlcbmZ1bmN0aW9uIHJ1blRpbWVvdXQoZnVuKSB7XG4gICAgaWYgKGNhY2hlZFNldFRpbWVvdXQgPT09IHNldFRpbWVvdXQpIHtcbiAgICAgICAgLy9ub3JtYWwgZW52aXJvbWVudHMgaW4gc2FuZSBzaXR1YXRpb25zXG4gICAgICAgIHJldHVybiBzZXRUaW1lb3V0KGZ1biwgMCk7XG4gICAgfVxuICAgIC8vIGlmIHNldFRpbWVvdXQgd2Fzbid0IGF2YWlsYWJsZSBidXQgd2FzIGxhdHRlciBkZWZpbmVkXG4gICAgaWYgKChjYWNoZWRTZXRUaW1lb3V0ID09PSBkZWZhdWx0U2V0VGltb3V0IHx8ICFjYWNoZWRTZXRUaW1lb3V0KSAmJiBzZXRUaW1lb3V0KSB7XG4gICAgICAgIGNhY2hlZFNldFRpbWVvdXQgPSBzZXRUaW1lb3V0O1xuICAgICAgICByZXR1cm4gc2V0VGltZW91dChmdW4sIDApO1xuICAgIH1cbiAgICB0cnkge1xuICAgICAgICAvLyB3aGVuIHdoZW4gc29tZWJvZHkgaGFzIHNjcmV3ZWQgd2l0aCBzZXRUaW1lb3V0IGJ1dCBubyBJLkUuIG1hZGRuZXNzXG4gICAgICAgIHJldHVybiBjYWNoZWRTZXRUaW1lb3V0KGZ1biwgMCk7XG4gICAgfSBjYXRjaChlKXtcbiAgICAgICAgdHJ5IHtcbiAgICAgICAgICAgIC8vIFdoZW4gd2UgYXJlIGluIEkuRS4gYnV0IHRoZSBzY3JpcHQgaGFzIGJlZW4gZXZhbGVkIHNvIEkuRS4gZG9lc24ndCB0cnVzdCB0aGUgZ2xvYmFsIG9iamVjdCB3aGVuIGNhbGxlZCBub3JtYWxseVxuICAgICAgICAgICAgcmV0dXJuIGNhY2hlZFNldFRpbWVvdXQuY2FsbChudWxsLCBmdW4sIDApO1xuICAgICAgICB9IGNhdGNoKGUpe1xuICAgICAgICAgICAgLy8gc2FtZSBhcyBhYm92ZSBidXQgd2hlbiBpdCdzIGEgdmVyc2lvbiBvZiBJLkUuIHRoYXQgbXVzdCBoYXZlIHRoZSBnbG9iYWwgb2JqZWN0IGZvciAndGhpcycsIGhvcGZ1bGx5IG91ciBjb250ZXh0IGNvcnJlY3Qgb3RoZXJ3aXNlIGl0IHdpbGwgdGhyb3cgYSBnbG9iYWwgZXJyb3JcbiAgICAgICAgICAgIHJldHVybiBjYWNoZWRTZXRUaW1lb3V0LmNhbGwodGhpcywgZnVuLCAwKTtcbiAgICAgICAgfVxuICAgIH1cblxuXG59XG5mdW5jdGlvbiBydW5DbGVhclRpbWVvdXQobWFya2VyKSB7XG4gICAgaWYgKGNhY2hlZENsZWFyVGltZW91dCA9PT0gY2xlYXJUaW1lb3V0KSB7XG4gICAgICAgIC8vbm9ybWFsIGVudmlyb21lbnRzIGluIHNhbmUgc2l0dWF0aW9uc1xuICAgICAgICByZXR1cm4gY2xlYXJUaW1lb3V0KG1hcmtlcik7XG4gICAgfVxuICAgIC8vIGlmIGNsZWFyVGltZW91dCB3YXNuJ3QgYXZhaWxhYmxlIGJ1dCB3YXMgbGF0dGVyIGRlZmluZWRcbiAgICBpZiAoKGNhY2hlZENsZWFyVGltZW91dCA9PT0gZGVmYXVsdENsZWFyVGltZW91dCB8fCAhY2FjaGVkQ2xlYXJUaW1lb3V0KSAmJiBjbGVhclRpbWVvdXQpIHtcbiAgICAgICAgY2FjaGVkQ2xlYXJUaW1lb3V0ID0gY2xlYXJUaW1lb3V0O1xuICAgICAgICByZXR1cm4gY2xlYXJUaW1lb3V0KG1hcmtlcik7XG4gICAgfVxuICAgIHRyeSB7XG4gICAgICAgIC8vIHdoZW4gd2hlbiBzb21lYm9keSBoYXMgc2NyZXdlZCB3aXRoIHNldFRpbWVvdXQgYnV0IG5vIEkuRS4gbWFkZG5lc3NcbiAgICAgICAgcmV0dXJuIGNhY2hlZENsZWFyVGltZW91dChtYXJrZXIpO1xuICAgIH0gY2F0Y2ggKGUpe1xuICAgICAgICB0cnkge1xuICAgICAgICAgICAgLy8gV2hlbiB3ZSBhcmUgaW4gSS5FLiBidXQgdGhlIHNjcmlwdCBoYXMgYmVlbiBldmFsZWQgc28gSS5FLiBkb2Vzbid0ICB0cnVzdCB0aGUgZ2xvYmFsIG9iamVjdCB3aGVuIGNhbGxlZCBub3JtYWxseVxuICAgICAgICAgICAgcmV0dXJuIGNhY2hlZENsZWFyVGltZW91dC5jYWxsKG51bGwsIG1hcmtlcik7XG4gICAgICAgIH0gY2F0Y2ggKGUpe1xuICAgICAgICAgICAgLy8gc2FtZSBhcyBhYm92ZSBidXQgd2hlbiBpdCdzIGEgdmVyc2lvbiBvZiBJLkUuIHRoYXQgbXVzdCBoYXZlIHRoZSBnbG9iYWwgb2JqZWN0IGZvciAndGhpcycsIGhvcGZ1bGx5IG91ciBjb250ZXh0IGNvcnJlY3Qgb3RoZXJ3aXNlIGl0IHdpbGwgdGhyb3cgYSBnbG9iYWwgZXJyb3IuXG4gICAgICAgICAgICAvLyBTb21lIHZlcnNpb25zIG9mIEkuRS4gaGF2ZSBkaWZmZXJlbnQgcnVsZXMgZm9yIGNsZWFyVGltZW91dCB2cyBzZXRUaW1lb3V0XG4gICAgICAgICAgICByZXR1cm4gY2FjaGVkQ2xlYXJUaW1lb3V0LmNhbGwodGhpcywgbWFya2VyKTtcbiAgICAgICAgfVxuICAgIH1cblxuXG5cbn1cbnZhciBxdWV1ZSA9IFtdO1xudmFyIGRyYWluaW5nID0gZmFsc2U7XG52YXIgY3VycmVudFF1ZXVlO1xudmFyIHF1ZXVlSW5kZXggPSAtMTtcblxuZnVuY3Rpb24gY2xlYW5VcE5leHRUaWNrKCkge1xuICAgIGlmICghZHJhaW5pbmcgfHwgIWN1cnJlbnRRdWV1ZSkge1xuICAgICAgICByZXR1cm47XG4gICAgfVxuICAgIGRyYWluaW5nID0gZmFsc2U7XG4gICAgaWYgKGN1cnJlbnRRdWV1ZS5sZW5ndGgpIHtcbiAgICAgICAgcXVldWUgPSBjdXJyZW50UXVldWUuY29uY2F0KHF1ZXVlKTtcbiAgICB9IGVsc2Uge1xuICAgICAgICBxdWV1ZUluZGV4ID0gLTE7XG4gICAgfVxuICAgIGlmIChxdWV1ZS5sZW5ndGgpIHtcbiAgICAgICAgZHJhaW5RdWV1ZSgpO1xuICAgIH1cbn1cblxuZnVuY3Rpb24gZHJhaW5RdWV1ZSgpIHtcbiAgICBpZiAoZHJhaW5pbmcpIHtcbiAgICAgICAgcmV0dXJuO1xuICAgIH1cbiAgICB2YXIgdGltZW91dCA9IHJ1blRpbWVvdXQoY2xlYW5VcE5leHRUaWNrKTtcbiAgICBkcmFpbmluZyA9IHRydWU7XG5cbiAgICB2YXIgbGVuID0gcXVldWUubGVuZ3RoO1xuICAgIHdoaWxlKGxlbikge1xuICAgICAgICBjdXJyZW50UXVldWUgPSBxdWV1ZTtcbiAgICAgICAgcXVldWUgPSBbXTtcbiAgICAgICAgd2hpbGUgKCsrcXVldWVJbmRleCA8IGxlbikge1xuICAgICAgICAgICAgaWYgKGN1cnJlbnRRdWV1ZSkge1xuICAgICAgICAgICAgICAgIGN1cnJlbnRRdWV1ZVtxdWV1ZUluZGV4XS5ydW4oKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgICBxdWV1ZUluZGV4ID0gLTE7XG4gICAgICAgIGxlbiA9IHF1ZXVlLmxlbmd0aDtcbiAgICB9XG4gICAgY3VycmVudFF1ZXVlID0gbnVsbDtcbiAgICBkcmFpbmluZyA9IGZhbHNlO1xuICAgIHJ1bkNsZWFyVGltZW91dCh0aW1lb3V0KTtcbn1cblxucHJvY2Vzcy5uZXh0VGljayA9IGZ1bmN0aW9uIChmdW4pIHtcbiAgICB2YXIgYXJncyA9IG5ldyBBcnJheShhcmd1bWVudHMubGVuZ3RoIC0gMSk7XG4gICAgaWYgKGFyZ3VtZW50cy5sZW5ndGggPiAxKSB7XG4gICAgICAgIGZvciAodmFyIGkgPSAxOyBpIDwgYXJndW1lbnRzLmxlbmd0aDsgaSsrKSB7XG4gICAgICAgICAgICBhcmdzW2kgLSAxXSA9IGFyZ3VtZW50c1tpXTtcbiAgICAgICAgfVxuICAgIH1cbiAgICBxdWV1ZS5wdXNoKG5ldyBJdGVtKGZ1biwgYXJncykpO1xuICAgIGlmIChxdWV1ZS5sZW5ndGggPT09IDEgJiYgIWRyYWluaW5nKSB7XG4gICAgICAgIHJ1blRpbWVvdXQoZHJhaW5RdWV1ZSk7XG4gICAgfVxufTtcblxuLy8gdjggbGlrZXMgcHJlZGljdGlibGUgb2JqZWN0c1xuZnVuY3Rpb24gSXRlbShmdW4sIGFycmF5KSB7XG4gICAgdGhpcy5mdW4gPSBmdW47XG4gICAgdGhpcy5hcnJheSA9IGFycmF5O1xufVxuSXRlbS5wcm90b3R5cGUucnVuID0gZnVuY3Rpb24gKCkge1xuICAgIHRoaXMuZnVuLmFwcGx5KG51bGwsIHRoaXMuYXJyYXkpO1xufTtcbnByb2Nlc3MudGl0bGUgPSAnYnJvd3Nlcic7XG5wcm9jZXNzLmJyb3dzZXIgPSB0cnVlO1xucHJvY2Vzcy5lbnYgPSB7fTtcbnByb2Nlc3MuYXJndiA9IFtdO1xucHJvY2Vzcy52ZXJzaW9uID0gJyc7IC8vIGVtcHR5IHN0cmluZyB0byBhdm9pZCByZWdleHAgaXNzdWVzXG5wcm9jZXNzLnZlcnNpb25zID0ge307XG5cbmZ1bmN0aW9uIG5vb3AoKSB7fVxuXG5wcm9jZXNzLm9uID0gbm9vcDtcbnByb2Nlc3MuYWRkTGlzdGVuZXIgPSBub29wO1xucHJvY2Vzcy5vbmNlID0gbm9vcDtcbnByb2Nlc3Mub2ZmID0gbm9vcDtcbnByb2Nlc3MucmVtb3ZlTGlzdGVuZXIgPSBub29wO1xucHJvY2Vzcy5yZW1vdmVBbGxMaXN0ZW5lcnMgPSBub29wO1xucHJvY2Vzcy5lbWl0ID0gbm9vcDtcbnByb2Nlc3MucHJlcGVuZExpc3RlbmVyID0gbm9vcDtcbnByb2Nlc3MucHJlcGVuZE9uY2VMaXN0ZW5lciA9IG5vb3A7XG5cbnByb2Nlc3MubGlzdGVuZXJzID0gZnVuY3Rpb24gKG5hbWUpIHsgcmV0dXJuIFtdIH1cblxucHJvY2Vzcy5iaW5kaW5nID0gZnVuY3Rpb24gKG5hbWUpIHtcbiAgICB0aHJvdyBuZXcgRXJyb3IoJ3Byb2Nlc3MuYmluZGluZyBpcyBub3Qgc3VwcG9ydGVkJyk7XG59O1xuXG5wcm9jZXNzLmN3ZCA9IGZ1bmN0aW9uICgpIHsgcmV0dXJuICcvJyB9O1xucHJvY2Vzcy5jaGRpciA9IGZ1bmN0aW9uIChkaXIpIHtcbiAgICB0aHJvdyBuZXcgRXJyb3IoJ3Byb2Nlc3MuY2hkaXIgaXMgbm90IHN1cHBvcnRlZCcpO1xufTtcbnByb2Nlc3MudW1hc2sgPSBmdW5jdGlvbigpIHsgcmV0dXJuIDA7IH07XG4iLCIvKiBnbG9iYWwgZXhwb3J0cyAqL1xuLyoqXG4gKiBAZmlsZW92ZXJ2aWV3IGEgdGlueSBsaWJyYXJ5IGZvciBXZWIgV29ya2VyIFJlbW90ZSBNZXRob2QgSW52b2NhdGlvblxuICpcbiAqL1xuY29uc3QgT2JqZWN0SUQgPSByZXF1aXJlKCdic29uLW9iamVjdGlkJyk7XG5cbi8qKlxuICogQHByaXZhdGUgcmV0dXJucyBhIGxpc3Qgb2YgVHJhbnNmZXJhYmxlIG9iamVjdHMgd2hpY2gge0Bjb2RlIG9ian0gaW5jbHVkZXNcbiAqIEBwYXJhbSB7b2JqZWN0fSBvYmogYW55IG9iamVjdFxuICogQHBhcmFtIHtBcnJheX0gbGlzdCBmb3IgaW50ZXJuYWwgcmVjdXJzaW9uIG9ubHlcbiAqIEByZXR1cm4ge0xpc3R9IGEgbGlzdCBvZiBUcmFuc2ZlcmFibGUgb2JqZWN0c1xuICovXG5mdW5jdGlvbiBnZXRUcmFuc2Zlckxpc3Qob2JqLCBsaXN0ID0gW10pIHtcbiAgICBpZiAoQXJyYXlCdWZmZXIuaXNWaWV3KG9iaikpIHtcbiAgICAgICAgbGlzdC5wdXNoKG9iai5idWZmZXIpO1xuICAgICAgICByZXR1cm4gbGlzdDtcbiAgICB9XG4gICAgaWYgKGlzVHJhbnNmZXJhYmxlKG9iaikpIHtcbiAgICAgICAgbGlzdC5wdXNoKG9iaik7XG4gICAgICAgIHJldHVybiBsaXN0O1xuICAgIH1cbiAgICBpZiAoISh0eXBlb2Ygb2JqID09PSAnb2JqZWN0JykpIHtcbiAgICAgICAgcmV0dXJuIGxpc3Q7XG4gICAgfVxuICAgIGZvciAoY29uc3QgcHJvcCBpbiBvYmopIHtcbiAgICAgICAgaWYgKG9iai5oYXNPd25Qcm9wZXJ0eShwcm9wKSkge1xuICAgICAgICAgICAgZ2V0VHJhbnNmZXJMaXN0KG9ialtwcm9wXSwgbGlzdCk7XG4gICAgICAgIH1cbiAgICB9XG4gICAgcmV0dXJuIGxpc3Q7XG59XG5cbi8qKlxuICogQHByaXZhdGUgY2hlY2tzIGlmIHtAY29kZSBvYmp9IGlzIFRyYW5zZmVyYWJsZSBvciBub3QuXG4gKiBAcGFyYW0ge29iamVjdH0gb2JqIGFueSBvYmplY3RcbiAqIEByZXR1cm4ge2Jvb2xlYW59XG4gKi9cbmZ1bmN0aW9uIGlzVHJhbnNmZXJhYmxlKG9iaikge1xuICAgIGNvbnN0IHRyYW5zZmVyYWJsZSA9IFtBcnJheUJ1ZmZlcl07XG4gICAgaWYgKHR5cGVvZiBNZXNzYWdlUG9ydCAhPT0gJ3VuZGVmaW5lZCcpIHtcbiAgICAgICAgdHJhbnNmZXJhYmxlLnB1c2goTWVzc2FnZVBvcnQpO1xuICAgIH1cbiAgICBpZiAodHlwZW9mIEltYWdlQml0bWFwICE9PSAndW5kZWZpbmVkJykge1xuICAgICAgICB0cmFuc2ZlcmFibGUucHVzaChJbWFnZUJpdG1hcCk7XG4gICAgfVxuICAgIHJldHVybiB0cmFuc2ZlcmFibGUuc29tZShlID0+IG9iaiBpbnN0YW5jZW9mIGUpO1xufVxuXG4vKipcbiAqIEBjbGFzcyBiYXNlIGNsYXNzIHdob3NlIGNoaWxkIGNsYXNzZXMgdXNlIFJNSVxuICovXG5jbGFzcyBXb3JrZXJSTUkge1xuICAgIC8qKlxuICAgICAqIEBjb25zdHJ1Y3RvclxuICAgICAqIEBwYXJhbSB7b2JqZWN0fSByZW1vdGUgYW4gaW5zdGFuY2UgdG8gY2FsbCBwb3N0TWVzc2FnZSBtZXRob2RcbiAgICAgKiBAcGFyYW0ge0FycmF5fSBhcmdzIGFyZ3VtZW50cyB0byBiZSBwYXNzZWQgdG8gc2VydmVyLXNpZGUgaW5zdGFuY2VcbiAgICAgKi9cbiAgICBjb25zdHJ1Y3RvcihyZW1vdGUsIC4uLmFyZ3MpIHtcbiAgICAgICAgdGhpcy5yZW1vdGUgPSByZW1vdGU7XG4gICAgICAgIHRoaXMuaWQgPSBPYmplY3RJRCgpLnRvU3RyaW5nKCk7XG4gICAgICAgIHRoaXMubWV0aG9kU3RhdGVzID0ge307XG4gICAgICAgIHRoaXMucmVtb3RlLmFkZEV2ZW50TGlzdGVuZXIoJ21lc3NhZ2UnLCBldmVudCA9PiB7XG4gICAgICAgICAgICBjb25zdCBkYXRhID0gZXZlbnQuZGF0YTtcbiAgICAgICAgICAgIGlmIChkYXRhLmlkID09PSB0aGlzLmlkKSB7XG4gICAgICAgICAgICAgICAgdGhpcy5yZXR1cm5IYW5kbGVyKGRhdGEpO1xuICAgICAgICAgICAgfVxuICAgICAgICB9LCBmYWxzZSk7XG4gICAgICAgIHRoaXMuY29uc3RydWN0b3JQcm9taXNlID0gdGhpcy5pbnZva2VSTSh0aGlzLmNvbnN0cnVjdG9yLm5hbWUsIGFyZ3MpO1xuICAgIH1cblxuICAgIC8qKlxuICAgICAqIGludm9rZXMgcmVtb3RlIG1ldGhvZFxuICAgICAqIEBwYXJhbSB7c3RyaW5nfSBtZXRob2ROYW1lIE1ldGhvZCBuYW1lXG4gICAgICogQHBhcmFtIHtBcnJheX0gYXJncyBhcmd1bWVudHMgdG8gYmUgcGFzc2VkIHRvIHNlcnZlci1zaWRlIGluc3RhbmNlXG4gICAgICogQHJldHVybiB7UHJvbWlzZX1cbiAgICAgKi9cbiAgICBpbnZva2VSTShtZXRob2ROYW1lLCBhcmdzID0gW10pIHtcbiAgICAgICAgaWYgKCF0aGlzLm1ldGhvZFN0YXRlc1ttZXRob2ROYW1lXSkge1xuICAgICAgICAgICAgdGhpcy5tZXRob2RTdGF0ZXNbbWV0aG9kTmFtZV0gPSB7XG4gICAgICAgICAgICAgICAgbnVtOiAwLFxuICAgICAgICAgICAgICAgIHJlc29sdmVSZWplY3RzOiB7fVxuICAgICAgICAgICAgfTtcbiAgICAgICAgfVxuICAgICAgICByZXR1cm4gbmV3IFByb21pc2UoKHJlc29sdmUsIHJlamVjdCkgPT4ge1xuICAgICAgICAgICAgY29uc3QgbWV0aG9kU3RhdGUgPSB0aGlzLm1ldGhvZFN0YXRlc1ttZXRob2ROYW1lXTtcbiAgICAgICAgICAgIG1ldGhvZFN0YXRlLm51bSArPSAxO1xuICAgICAgICAgICAgbWV0aG9kU3RhdGUucmVzb2x2ZVJlamVjdHNbbWV0aG9kU3RhdGUubnVtXSA9IHsgcmVzb2x2ZSwgcmVqZWN0IH07XG4gICAgICAgICAgICB0aGlzLnJlbW90ZS5wb3N0TWVzc2FnZSh7XG4gICAgICAgICAgICAgICAgaWQ6IHRoaXMuaWQsXG4gICAgICAgICAgICAgICAgbWV0aG9kTmFtZSxcbiAgICAgICAgICAgICAgICBudW06IG1ldGhvZFN0YXRlLm51bSxcbiAgICAgICAgICAgICAgICBhcmdzXG4gICAgICAgICAgICB9LCBnZXRUcmFuc2Zlckxpc3QoYXJncykpO1xuICAgICAgICB9KTtcbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBAcHJpdmF0ZSBoYW5kbGVzIGNvcnJlc3BvbmRlbnQgJ21lc3NhZ2UnIGV2ZW50XG4gICAgICogQHBhcmFtIHtvYmp9IGRhdGEgZGF0YSBwcm9wZXJ0eSBvZiAnbWVzc2FnZScgZXZlbnRcbiAgICAgKi9cbiAgICByZXR1cm5IYW5kbGVyKGRhdGEpIHtcbiAgICAgICAgY29uc3QgcmVzb2x2ZVJlamVjdHMgPSB0aGlzLm1ldGhvZFN0YXRlc1tkYXRhLm1ldGhvZE5hbWVdLnJlc29sdmVSZWplY3RzO1xuICAgICAgICBpZiAoZGF0YS5lcnJvcikge1xuICAgICAgICAgICAgcmVzb2x2ZVJlamVjdHNbZGF0YS5udW1dLnJlamVjdChkYXRhLmVycm9yKTtcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIHJlc29sdmVSZWplY3RzW2RhdGEubnVtXS5yZXNvbHZlKGRhdGEucmVzdWx0KTtcbiAgICAgICAgfVxuICAgICAgICBkZWxldGUgcmVzb2x2ZVJlamVjdHNbZGF0YS5udW1dO1xuICAgIH1cbn1cblxuXG4vKipcbiAqIEBwcml2YXRlIGV4ZWN1dGVzIGEgbWV0aG9kIG9uIHNlcnZlciBhbmQgcG9zdCBhIHJlc3VsdCBhcyBtZXNzYWdlLlxuICogQHBhcmFtIHtvYmp9IGV2ZW50ICdtZXNzYWdlJyBldmVudFxuICovXG5hc3luYyBmdW5jdGlvbiBoYW5kbGVXb3JrZXJSTUkoZXZlbnQpIHtcbiAgICBjb25zdCBkYXRhID0gZXZlbnQuZGF0YTtcbiAgICBjb25zdCBtZXNzYWdlID0ge1xuICAgICAgICBpZDogZGF0YS5pZCxcbiAgICAgICAgbWV0aG9kTmFtZTogZGF0YS5tZXRob2ROYW1lLFxuICAgICAgICBudW06IGRhdGEubnVtLFxuICAgIH07XG4gICAgbGV0IHJlc3VsdDtcbiAgICBpZiAoZGF0YS5tZXRob2ROYW1lID09PSB0aGlzLm5hbWUpIHtcbiAgICAgICAgdGhpcy53b3JrZXJSTUkuaW5zdGFuY2VzW2RhdGEuaWRdID0gbmV3IHRoaXMoLi4uZGF0YS5hcmdzKTtcbiAgICAgICAgbWVzc2FnZS5yZXN1bHQgPSBudWxsO1xuICAgICAgICB0aGlzLndvcmtlclJNSS50YXJnZXQucG9zdE1lc3NhZ2UobWVzc2FnZSwgZ2V0VHJhbnNmZXJMaXN0KHJlc3VsdCkpO1xuICAgIH0gZWxzZSB7XG4gICAgICAgIGNvbnN0IGluc3RhbmNlID0gdGhpcy53b3JrZXJSTUkuaW5zdGFuY2VzW2RhdGEuaWRdO1xuICAgICAgICBpZiAoaW5zdGFuY2UpIHtcbiAgICAgICAgICAgIHRyeSB7XG4gICAgICAgICAgICAgICAgcmVzdWx0ID0gYXdhaXQgaW5zdGFuY2VbZGF0YS5tZXRob2ROYW1lXS5hcHBseShpbnN0YW5jZSwgZGF0YS5hcmdzKVxuICAgICAgICAgICAgICAgIG1lc3NhZ2UucmVzdWx0ID0gcmVzdWx0O1xuICAgICAgICAgICAgICAgIHRoaXMud29ya2VyUk1JLnRhcmdldC5wb3N0TWVzc2FnZShtZXNzYWdlLCBnZXRUcmFuc2Zlckxpc3QocmVzdWx0KSk7XG4gICAgICAgICAgICB9IGNhdGNoIChlKSB7XG4gICAgICAgICAgICAgICAgbWVzc2FnZS5lcnJvciA9IGUudG9TdHJpbmcoKTtcbiAgICAgICAgICAgICAgICB0aGlzLndvcmtlclJNSS50YXJnZXQucG9zdE1lc3NhZ2UobWVzc2FnZSk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICB9XG59XG5cbi8qKlxuICogcmVnaXN0ZXJzIGEgY2xhc3MgYXMgYW4gZXhlY3V0ZXIgb2YgUk1JIG9uIHNlcnZlclxuICogQHBhcmFtIHtvYmp9IHRhcmdldCBhbiBpbnN0YW5jZSB0aGF0IHJlY2VpdmVzICdtZXNzYWdlJyBldmVudHMgb2YgUk1JXG4gKiBAcGFyYW0ge0NsYXNzfSBrbGFzcyBhIGNsYXNzIHRvIGJlIHJlZ2lzdGVyZWRcbiAqL1xuZnVuY3Rpb24gcmVzaWd0ZXJXb3JrZXJSTUkodGFyZ2V0LCBrbGFzcykge1xuICAgIGtsYXNzLndvcmtlclJNSSA9IHtcbiAgICAgICAgdGFyZ2V0LFxuICAgICAgICBpbnN0YW5jZXM6IHt9LFxuICAgICAgICBoYW5kbGVyOiBoYW5kbGVXb3JrZXJSTUkuYmluZChrbGFzcylcbiAgICB9XG4gICAgdGFyZ2V0LmFkZEV2ZW50TGlzdGVuZXIoJ21lc3NhZ2UnLCBrbGFzcy53b3JrZXJSTUkuaGFuZGxlcik7XG59XG5cbi8qKlxuICogdW5yZXNpZ3RlcnMgYSBjbGFzcyByZWdpc3RlcmVkIGJ5IHJlZ2lzdGVyV29ya2VyUk1JXG4gKiBAcGFyYW0ge29ian0gdGFyZ2V0IGFuIGluc3RhbmNlIHRoYXQgcmVjZWl2ZXMgJ21lc3NhZ2UnIGV2ZW50cyBvZiBSTUlcbiAqIEBwYXJhbSB7Q2xhc3N9IGtsYXNzIGEgY2xhc3MgdG8gYmUgdW5yZWdpc3RlcmVkXG4gKi9cbmZ1bmN0aW9uIHVucmVzaWd0ZXJXb3JrZXJSTUkodGFyZ2V0LCBrbGFzcykge1xuICAgIHRhcmdldC5yZW1vdmVFdmVudExpc3RlbmVyKCdtZXNzYWdlJywga2xhc3Mud29ya2VyUk1JLmhhbmRsZXIpXG4gICAgZGVsZXRlIGtsYXNzLndvcmtlclJNSTtcbn1cblxuZXhwb3J0cy5Xb3JrZXJSTUkgPSBXb3JrZXJSTUk7XG5leHBvcnRzLnJlc2lndGVyV29ya2VyUk1JID0gcmVzaWd0ZXJXb3JrZXJSTUk7XG5leHBvcnRzLnVucmVzaWd0ZXJXb3JrZXJSTUkgPSB1bnJlc2lndGVyV29ya2VyUk1JO1xuIiwiJ3VzZSBzdHJpY3QnO1xuXG5PYmplY3QuZGVmaW5lUHJvcGVydHkoZXhwb3J0cywgXCJfX2VzTW9kdWxlXCIsIHtcbiAgICB2YWx1ZTogdHJ1ZVxufSk7XG5leHBvcnRzLkFaanNFbmdpbmUgPSB1bmRlZmluZWQ7XG5cbnZhciBfd29ya2VyUm1pID0gcmVxdWlyZSgnd29ya2VyLXJtaScpO1xuXG4vKipcbiAqIOaAneiAg+OCqOODs+OCuOODs0FaanNFbmdpbmXjga5STUnniYjjgafjgZnjgILjg4njgq3jg6Xjg6Hjg7Pjg4jjga/mnKzkvZPlgbTjga7jgrPjg7zjg4njgpLlj4LnhafjgZfjgabjgY/jgaDjgZXjgYTjgIJcbiAqIEBhbGlhcyBBWmpzRW5naW5lUk1JXG4gKiBAc2VlIEFaanNFbmdpbmVcbiAqL1xuY2xhc3MgQVpqc0VuZ2luZSBleHRlbmRzIF93b3JrZXJSbWkuV29ya2VyUk1JIHtcbiAgICAvKiogKi9cbiAgICBhc3luYyBsb2FkTk4oKSB7XG4gICAgICAgIGF3YWl0IHRoaXMuaW52b2tlUk0oJ2xvYWROTicpO1xuICAgIH1cblxuICAgIC8qKiAqL1xuICAgIGFzeW5jIGNsZWFyKCkge1xuICAgICAgICBhd2FpdCB0aGlzLnN0b3AoKTtcbiAgICAgICAgYXdhaXQgdGhpcy5pbnZva2VSTSgnY2xlYXInKTtcbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiB0aW1lU2V0dGluZ3Pjga5STUnjgafjgZnjgIJcbiAgICAgKiBtYWluVGltZeOBqGJ5b3lvbWnjga7lj5blvpfjgadSTUnjgpLpgb/jgZHjgovjgZ/jgoHjgIHoqK3lrprlgKTjgpLjgZPjgaHjgonjgafjgoLkv53mjIHjgZfjgb7jgZnjgIJcbiAgICAgKiBAcGFyYW0ge251bWJlcn0gbWFpblRpbWUgXG4gICAgICogQHBhcmFtIHtudW1iZXJ9IGJ5b3lvbWkgXG4gICAgICovXG4gICAgYXN5bmMgdGltZVNldHRpbmdzKG1haW5UaW1lLCBieW95b21pKSB7XG4gICAgICAgIHRoaXMubWFpblRpbWUgPSBtYWluVGltZTtcbiAgICAgICAgdGhpcy5ieW95b21pID0gYnlveW9taTtcbiAgICAgICAgYXdhaXQgdGhpcy5pbnZva2VSTSgndGltZVNldHRpbmdzJywgW21haW5UaW1lLCBieW95b21pXSk7XG4gICAgfVxuXG4gICAgYXN5bmMgZ2VubW92ZSgpIHtcbiAgICAgICAgcmV0dXJuIGF3YWl0IHRoaXMuaW52b2tlUk0oJ2dlbm1vdmUnKTtcbiAgICB9XG5cbiAgICBhc3luYyBwbGF5KHgsIHkpIHtcbiAgICAgICAgYXdhaXQgdGhpcy5pbnZva2VSTSgncGxheScsIFt4LCB5XSk7XG4gICAgfVxuXG4gICAgYXN5bmMgcGFzcygpIHtcbiAgICAgICAgYXdhaXQgdGhpcy5pbnZva2VSTSgncGFzcycpO1xuICAgIH1cblxuICAgIGFzeW5jIHNlYXJjaCgpIHtcbiAgICAgICAgcmV0dXJuIGF3YWl0IHRoaXMuaW52b2tlUk0oJ3NlYXJjaCcpO1xuICAgIH1cblxuICAgIGFzeW5jIGZpbmFsU2NvcmUoKSB7XG4gICAgICAgIHJldHVybiBhd2FpdCB0aGlzLmludm9rZVJNKCdmaW5hbFNjb3JlJyk7XG4gICAgfVxuXG4gICAgYXN5bmMgcG9uZGVyKCkge1xuICAgICAgICByZXR1cm4gYXdhaXQgdGhpcy5pbnZva2VSTSgncG9uZGVyJyk7XG4gICAgfVxuXG4gICAgYXN5bmMgc3RvcCgpIHtcbiAgICAgICAgYXdhaXQgdGhpcy5pbnZva2VSTSgnc3RvcCcpO1xuICAgIH1cblxuICAgIGFzeW5jIHRpbWVMZWZ0KCkge1xuICAgICAgICByZXR1cm4gYXdhaXQgdGhpcy5pbnZva2VSTSgndGltZUxlZnQnKTtcbiAgICB9XG59XG5leHBvcnRzLkFaanNFbmdpbmUgPSBBWmpzRW5naW5lOyAvKipcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAqIEBmaWxlIOaAneiAg+OCqOODs+OCuOODs0FaanNFbmdpbmXjga5STUnniYjjgafjgZnjgILjg4njgq3jg6Xjg6Hjg7Pjg4jjga/mnKzkvZPlgbTjga7jgrPjg7zjg4njgpLlj4LnhafjgZfjgabjgY/jgaDjgZXjgYTjgIJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAqL1xuLypcbiAqIEBhdXRob3Ig5biC5bed6ZuE5LqMXG4gKiBAY29weXJpZ2h0IDIwMTggSUNISUtBV0EsIFl1amkgKE5ldyAzIFJzKVxuICovIiwiJ3VzZSBzdHJpY3QnO1xuXG5PYmplY3QuZGVmaW5lUHJvcGVydHkoZXhwb3J0cywgXCJfX2VzTW9kdWxlXCIsIHtcbiAgICB2YWx1ZTogdHJ1ZVxufSk7XG4vKipcbiAqIEBmaWxlIE1WQ+OBruOCs+ODs+ODiOODreODvOODqeOBruOCquODluOCtuODvOODkOODvOOCr+ODqeOCueOBp+OBmeOAglxuICovXG4vKlxuICogQGF1dGhvciDluILlt53pm4TkuoxcbiAqIEBjb3B5cmlnaHQgMjAxNyBJQ0hJS0FXQSwgWXVqaSAoTmV3IDMgUnMpXG4gKi9cbi8qIGdsb2JhbCBKR086ZmFsc2UsIFdBdWRpbzpmYWxzZSAqL1xuXG5jb25zdCBzdG9uZVNvdW5kID0gbmV3IFdBdWRpbygnYXVkaW8vZ28tcGllY2UxLm1wMycpO1xuXG4vKipcbiAqICBqR29Cb2FyZOOBruOBn+OCgeOBruOCs+ODs+ODiOODreODvOODqVxi44Gn44GZ44CCIFxuICogQHNlZSB7QGxpbmsgaHR0cHM6Ly9naXRodWIuY29tL2pva2tlYmsvamdvYm9hcmR9XG4gKi9cbmNsYXNzIEJvYXJkQ29udHJvbGxlciB7XG4gICAgLyoqXG4gICAgICogakdvQm9hcmTjgpLnlJ/miJDjgZfjgIHmj4/nlLvjgYzntYLjgo/jgaPjgZ/jgoljYWxsYmFja+OCkuWRvOOBs+WHuuOBl+OBvuOBmeOAglxuICAgICAqIEBwYXJhbSB7SW50ZWdlcn0gYm9hcmRTaXplIFxuICAgICAqIEBwYXJhbSB7SW50ZWdlcn0gaGFuZGljYXAgXG4gICAgICogQHBhcmFtIHtudW1iZXJ9IGtvbWkgXG4gICAgICogQHBhcmFtIHtGdW5jdGlvbn0gY2FsbGJhY2sgXG4gICAgICovXG4gICAgY29uc3RydWN0b3IoYm9hcmRTaXplLCBoYW5kaWNhcCwga29taSwgY2FsbGJhY2spIHtcbiAgICAgICAgdGhpcy5pZCA9ICdib2FyZCc7XG4gICAgICAgIHRoaXMub3duQ29sb3IgPSBudWxsOyAvLyBvd25Db2xvcuOBr0dVSeOCkuS9v+eUqOOBmeOCi+WBtFxuICAgICAgICB0aGlzLnR1cm4gPSBKR08uQkxBQ0s7XG4gICAgICAgIHRoaXMuanJlY29yZCA9IG51bGw7XG4gICAgICAgIHRoaXMuamJvYXJkID0gbnVsbDtcbiAgICAgICAgdGhpcy5rbyA9IGZhbHNlO1xuICAgICAgICB0aGlzLmxhc3RIb3ZlciA9IG51bGw7XG4gICAgICAgIHRoaXMubGFzdE1vdmUgPSBudWxsO1xuICAgICAgICB0aGlzLm9ic2VydmVycyA9IFtdO1xuICAgICAgICB0aGlzLnBhc3NOdW0gPSAwO1xuXG4gICAgICAgIHRoaXMuanJlY29yZCA9IEpHTy5zZ2YubG9hZChgKDtTWlske2JvYXJkU2l6ZX1dS01bJHtrb21pfV0pYCwgZmFsc2UpO1xuICAgICAgICB0aGlzLmpib2FyZCA9IHRoaXMuanJlY29yZC5nZXRCb2FyZCgpO1xuICAgICAgICBpZiAoaGFuZGljYXAgPj0gMikge1xuICAgICAgICAgICAgY29uc3Qgc3RvbmVzID0gSkdPLnV0aWwuZ2V0SGFuZGljYXBDb29yZGluYXRlcyh0aGlzLmpib2FyZC53aWR0aCwgaGFuZGljYXApO1xuICAgICAgICAgICAgdGhpcy5qYm9hcmQuc2V0VHlwZShzdG9uZXMsIEpHTy5CTEFDSyk7XG4gICAgICAgICAgICB0aGlzLnR1cm4gPSBKR08uV0hJVEU7XG4gICAgICAgIH1cblxuICAgICAgICBjb25zdCBvcHRpb25zID0geyBzdGFyczogeyBwb2ludHM6IDkgfSB9O1xuICAgICAgICBKR08udXRpbC5leHRlbmQob3B0aW9ucywgSkdPLkJPQVJELmxhcmdlKTtcbiAgICAgICAgY29uc3QganNldHVwID0gbmV3IEpHTy5TZXR1cCh0aGlzLmpib2FyZCwgb3B0aW9ucyk7XG4gICAgICAgIGpzZXR1cC5zZXRPcHRpb25zKHsgY29vcmRpbmF0ZXM6IHtcbiAgICAgICAgICAgICAgICB0b3A6IGZhbHNlLFxuICAgICAgICAgICAgICAgIGJvdHRvbTogZmFsc2UsXG4gICAgICAgICAgICAgICAgbGVmdDogZmFsc2UsXG4gICAgICAgICAgICAgICAgcmlnaHQ6IGZhbHNlXG4gICAgICAgICAgICB9IH0pO1xuXG4gICAgICAgIGpzZXR1cC5jcmVhdGUodGhpcy5pZCwgY2FudmFzID0+IHtcbiAgICAgICAgICAgIGNhbnZhcy5hZGRMaXN0ZW5lcignY2xpY2snLCB0aGlzLmNsaWNrSGFuZGVyLmJpbmQodGhpcykpO1xuICAgICAgICAgICAgY2FudmFzLmFkZExpc3RlbmVyKCdtb3VzZW1vdmUnLCB0aGlzLm1vdmVIYW5kbGVyLmJpbmQodGhpcykpO1xuICAgICAgICAgICAgY2FudmFzLmFkZExpc3RlbmVyKCdtb3VzZW91dCcsIHRoaXMubGVhdmVIYW5kbGVyLmJpbmQodGhpcykpO1xuICAgICAgICAgICAgY2FudmFzLmFkZExpc3RlbmVyKCdtb3VzZWRvd24nLCB0aGlzLmRvd25IYW5kbGVyLmJpbmQodGhpcykpO1xuICAgICAgICAgICAgY2FsbGJhY2sodGhpcyk7XG4gICAgICAgIH0pO1xuICAgIH1cblxuICAgIC8qKlxuICAgICAqIOmWoumAo+OBruOCquODluOCtuODvOODkOODvOOChERPTeOCkuegtOajhOOBl+OBvuOBmeOAgiBcbiAgICAgKi9cbiAgICBkZXN0cm95KCkge1xuICAgICAgICB0aGlzLnJlbW92ZU9ic2VydmVycygpO1xuICAgICAgICBjb25zdCBkb20gPSBkb2N1bWVudC5nZXRFbGVtZW50QnlJZCh0aGlzLmlkKTtcbiAgICAgICAgd2hpbGUgKGRvbS5maXJzdENoaWxkKSB7XG4gICAgICAgICAgICBkb20ucmVtb3ZlQ2hpbGQoZG9tLmZpcnN0Q2hpbGQpO1xuICAgICAgICB9XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogR1VJ44KS5L2/55So44GZ44KL5YG044Gu55+z44Gu6Imy44KS6Kit5a6a44GX44G+44GZ44CCXG4gICAgICovXG4gICAgc2V0T3duQ29sb3IoY29sb3IpIHtcbiAgICAgICAgdGhpcy5vd25Db2xvciA9IGNvbG9yO1xuICAgIH1cblxuICAgIC8qKlxuICAgICAqIOOCs+ODn+OCkuioreWumuOBl+OBvuOBmeOAglxuICAgICAqIEBwYXJhbSB7Kn0ga29taSBcbiAgICAgKi9cbiAgICBzZXRLb21pKGtvbWkpIHtcbiAgICAgICAgY29uc3Qgbm9kZSA9IHRoaXMuanJlY29yZC5nZXRSb290Tm9kZSgpO1xuICAgICAgICBub2RlLmluZm8ua29taSA9IGtvbWkudG9TdHJpbmcoKTtcbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiDjgqrjg5bjgrbjg7zjg5Djg7zjgpLov73liqDjgZfjgIHjgqrjg5bjgrbjg7zjg5Djg7zjga51cGRhdGXjgpLlkbzjgbPlh7rjgZfjgb7jgZnjgIJcbiAgICAgKiBAcGFyYW0geyp9IG9ic2VydmVyIOW8leaVsOOBq2Nvb3Jk44KS5Y+X44GR5Y+W44KLdXBkYXRl44Oh44K944OD44OJ44KS5oyB44Gk44Kq44OW44K444Kn44Kv44OI44CCXG4gICAgICovXG4gICAgYWRkT2JzZXJ2ZXIob2JzZXJ2ZXIpIHtcbiAgICAgICAgdGhpcy5vYnNlcnZlcnMucHVzaChvYnNlcnZlcik7XG4gICAgICAgIG9ic2VydmVyLnVwZGF0ZSgpO1xuICAgIH1cblxuICAgIC8qKlxuICAgICAqIOWFqOOCquODluOCtuODvOODkOODvOOCkuWJiumZpOOBl+OBvuOBmeOAglxuICAgICAqL1xuICAgIHJlbW92ZU9ic2VydmVycygpIHtcbiAgICAgICAgdGhpcy5vYnNlcnZlcnMgPSBbXTtcbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBqR29Cb2FyZOOBjOabtOaWsOOBleOCjOOBn+OBqOOBjeOBq+WRvOOBs+WHuuOBleOCjOOCi+ODoeOCveODg+ODieOBp+OBmeOAglxuICAgICAqIEBwcml2YXRlXG4gICAgICogQHBhcmFtIHsqfSBjb29yZCBcbiAgICAgKi9cbiAgICB1cGRhdGUoY29vcmQpIHtcbiAgICAgICAgY29uc3Qgbm9kZSA9IHRoaXMuanJlY29yZC5nZXRDdXJyZW50Tm9kZSgpO1xuICAgICAgICBkb2N1bWVudC5nZXRFbGVtZW50QnlJZCgnb3Bwb25lbnQtY2FwdHVyZXMnKS5pbm5lclRleHQgPSBub2RlLmluZm8uY2FwdHVyZXNbdGhpcy5vd25Db2xvciA9PT0gSkdPLkJMQUNLID8gSkdPLldISVRFIDogSkdPLkJMQUNLXTtcbiAgICAgICAgZG9jdW1lbnQuZ2V0RWxlbWVudEJ5SWQoJ293bi1jYXB0dXJlcycpLmlubmVyVGV4dCA9IG5vZGUuaW5mby5jYXB0dXJlc1t0aGlzLm93bkNvbG9yXTtcbiAgICAgICAgc2V0VGltZW91dCgoKSA9PiB7XG4gICAgICAgICAgICB0aGlzLm9ic2VydmVycy5mb3JFYWNoKGZ1bmN0aW9uIChvYnNlcnZlcikge1xuICAgICAgICAgICAgICAgIG9ic2VydmVyLnVwZGF0ZShjb29yZCk7XG4gICAgICAgICAgICB9KTtcbiAgICAgICAgfSwgMTApOyAvLyAw44Gn44GvakdvQm9hcmTjga7jg6zjg7Pjg4Djg6rjg7PjgrDjgYzntYLjgo/jgaPjgabjgYTjgarjgYTjga7jgafjgIExMOOBq+OBl+OBvuOBl+OBn+OAglxuICAgIH1cblxuICAgIC8qKlxuICAgICAqIOedgOaJi+OBl+OBvuOBmeOAglxuICAgICAqIEBwYXJhbSB7SkdPLkNvb3JkaW5hdGV9IGNvb3JkIFxuICAgICAqIEBwYXJhbSB7Ym9vbH0gc291bmQgXG4gICAgICovXG4gICAgcGxheShjb29yZCwgc291bmQgPSBmYWxzZSkge1xuICAgICAgICBjb25zdCBwbGF5ID0gdGhpcy5qYm9hcmQucGxheU1vdmUoY29vcmQsIHRoaXMudHVybiwgdGhpcy5rbyk7XG4gICAgICAgIGlmICghcGxheS5zdWNjZXNzKSB7XG4gICAgICAgICAgICBjb25zb2xlLmxvZyhjb29yZCwgcGxheSk7XG4gICAgICAgICAgICByZXR1cm4gcGxheS5zdWNjZXNzO1xuICAgICAgICB9XG4gICAgICAgIGNvbnN0IG5vZGUgPSB0aGlzLmpyZWNvcmQuY3JlYXRlTm9kZShmYWxzZSk7XG4gICAgICAgIC8vIHRhbGx5IGNhcHR1cmVzXG4gICAgICAgIG5vZGUuaW5mby5jYXB0dXJlc1t0aGlzLnR1cm5dICs9IHBsYXkuY2FwdHVyZXMubGVuZ3RoO1xuICAgICAgICBpZiAoY29vcmQpIHtcbiAgICAgICAgICAgIC8vIHBsYXkgc3RvbmVcbiAgICAgICAgICAgIG5vZGUuc2V0VHlwZShjb29yZCwgdGhpcy50dXJuKTtcbiAgICAgICAgICAgIG5vZGUuc2V0TWFyayhjb29yZCwgSkdPLk1BUksuQ0lSQ0xFKTsgLy8gbWFyayBtb3ZlXG4gICAgICAgICAgICAvLyBjbGVhciBvcHBvbmVudCdzIHN0b25lc1xuICAgICAgICAgICAgbm9kZS5zZXRUeXBlKHBsYXkuY2FwdHVyZXMsIEpHTy5DTEVBUik7XG4gICAgICAgIH1cbiAgICAgICAgaWYgKHRoaXMubGFzdE1vdmUpIHtcbiAgICAgICAgICAgIG5vZGUuc2V0TWFyayh0aGlzLmxhc3RNb3ZlLCBKR08uTUFSSy5OT05FKTsgLy8gY2xlYXIgcHJldmlvdXMgbWFya1xuICAgICAgICB9XG4gICAgICAgIGlmICh0aGlzLmtvKSB7XG4gICAgICAgICAgICBub2RlLnNldE1hcmsodGhpcy5rbywgSkdPLk1BUksuTk9ORSk7IC8vIGNsZWFyIHByZXZpb3VzIGtvIG1hcmtcbiAgICAgICAgfVxuICAgICAgICB0aGlzLmxhc3RNb3ZlID0gY29vcmQ7XG4gICAgICAgIGlmIChwbGF5LmtvKSB7XG4gICAgICAgICAgICBub2RlLnNldE1hcmsocGxheS5rbywgSkdPLk1BUksuQ0lSQ0xFKTsgLy8gbWFyayBrbywgdG9vXG4gICAgICAgIH1cbiAgICAgICAgdGhpcy5rbyA9IHBsYXkua287XG4gICAgICAgIHRoaXMudHVybiA9IHRoaXMudHVybiA9PT0gSkdPLkJMQUNLID8gSkdPLldISVRFIDogSkdPLkJMQUNLO1xuICAgICAgICBpZiAoY29vcmQgPT0gbnVsbCkge1xuICAgICAgICAgICAgdGhpcy5wYXNzTnVtICs9IDE7XG4gICAgICAgICAgICB0aGlzLnVwZGF0ZSh0aGlzLnBhc3NOdW0gPCAyID8gJ3Bhc3MnIDogJ2VuZCcpO1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgdGhpcy5wYXNzTnVtID0gMDtcbiAgICAgICAgICAgIHRoaXMudXBkYXRlKGNvb3JkKTtcbiAgICAgICAgICAgIGlmIChzb3VuZCkge1xuICAgICAgICAgICAgICAgIHN0b25lU291bmQucGxheSgpO1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICAgIHJldHVybiBwbGF5LnN1Y2Nlc3M7XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogQHByaXZhdGVcbiAgICAgKiBAcGFyYW0ge0pHTy5Db29yZGluYXRlfSBjb29yZCBcbiAgICAgKiBAcGFyYW0ge0V2ZW50fSBldiBcbiAgICAgKi9cbiAgICBjbGlja0hhbmRlcihjb29yZCwgZXYpIHtcbiAgICAgICAgLy8gY2xlYXIgaG92ZXIgYXdheSAtIGl0J2xsIGJlIHJlcGxhY2VkIG9yXG4gICAgICAgIC8vIHRoZW4gaXQgd2lsbCBiZSBhbiBpbGxlZ2FsIG1vdmUgaW4gYW55IGNhc2VcbiAgICAgICAgLy8gc28gbm8gbmVlZCB0byB3b3JyeSBhYm91dCBwdXR0aW5nIGl0IGJhY2sgYWZ0ZXJ3YXJkc1xuICAgICAgICBpZiAodGhpcy5vd25Db2xvciAhPT0gdGhpcy50dXJuKSB7XG4gICAgICAgICAgICByZXR1cm47XG4gICAgICAgIH1cbiAgICAgICAgaWYgKHRoaXMubGFzdEhvdmVyICE9IG51bGwpIHtcbiAgICAgICAgICAgIHRoaXMuamJvYXJkLnNldFR5cGUodGhpcy5sYXN0SG92ZXIsIEpHTy5DTEVBUik7XG4gICAgICAgICAgICB0aGlzLmxhc3RIb3ZlciA9IG51bGw7XG4gICAgICAgIH1cbiAgICAgICAgaWYgKGNvb3JkLmkgPj0gMCAmJiBjb29yZC5pIDwgdGhpcy5qYm9hcmQud2lkdGggJiYgY29vcmQuaiA+PSAwICYmIGNvb3JkLmogPCB0aGlzLmpib2FyZC5oZWlnaHQpIHtcbiAgICAgICAgICAgIHRoaXMucGxheShjb29yZCk7XG4gICAgICAgIH1cbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBAcHJpdmF0ZVxuICAgICAqIEBwYXJhbSB7SkdPLkNvb3JkaW5hdGV9IGNvb3JkIFxuICAgICAqIEBwYXJhbSB7RXZlbnR9IGV2IFxuICAgICAqL1xuICAgIG1vdmVIYW5kbGVyKGNvb3JkLCBldikge1xuICAgICAgICBpZiAodGhpcy5vd25Db2xvciAhPT0gdGhpcy50dXJuKSB7XG4gICAgICAgICAgICByZXR1cm47XG4gICAgICAgIH1cbiAgICAgICAgaWYgKHRoaXMubGFzdEhvdmVyICYmIHRoaXMubGFzdEhvdmVyLmVxdWFscyhjb29yZCkpIHtcbiAgICAgICAgICAgIHJldHVybjtcbiAgICAgICAgfVxuXG4gICAgICAgIGlmICh0aGlzLmxhc3RIb3ZlciAhPSBudWxsKSB7XG4gICAgICAgICAgICAvLyBjbGVhciBwcmV2aW91cyBob3ZlciBpZiB0aGVyZSB3YXMgb25lXG4gICAgICAgICAgICB0aGlzLmpib2FyZC5zZXRUeXBlKHRoaXMubGFzdEhvdmVyLCBKR08uQ0xFQVIpO1xuICAgICAgICB9XG5cbiAgICAgICAgaWYgKGNvb3JkLmkgPD0gLTEgfHwgY29vcmQuaiA8PSAtMSB8fCBjb29yZC5pID49IHRoaXMuamJvYXJkLndpZHRoIHx8IGNvb3JkLmogPj0gdGhpcy5qYm9hcmQuaGVpZ2h0KSB7XG4gICAgICAgICAgICB0aGlzLmxhc3RIb3ZlciA9IG51bGw7XG4gICAgICAgIH0gZWxzZSBpZiAodGhpcy5qYm9hcmQuZ2V0VHlwZShjb29yZCkgPT09IEpHTy5DTEVBUiAmJiB0aGlzLmpib2FyZC5nZXRNYXJrKGNvb3JkKSA9PSBKR08uTUFSSy5OT05FKSB7XG4gICAgICAgICAgICB0aGlzLmpib2FyZC5zZXRUeXBlKGNvb3JkLCB0aGlzLnR1cm4gPT0gSkdPLkJMQUNLID8gSkdPLkRJTV9CTEFDSyA6IEpHTy5ESU1fV0hJVEUpO1xuICAgICAgICAgICAgdGhpcy5sYXN0SG92ZXIgPSBjb29yZDtcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIHRoaXMubGFzdEhvdmVyID0gbnVsbDtcbiAgICAgICAgfVxuICAgIH1cblxuICAgIC8qKlxuICAgICAqIEBwcml2YXRlXG4gICAgICogQHBhcmFtIHtFdmVudH0gZXYgXG4gICAgICovXG4gICAgbGVhdmVIYW5kbGVyKGV2KSB7XG4gICAgICAgIGlmICh0aGlzLmxhc3RIb3ZlciAhPSBudWxsKSB7XG4gICAgICAgICAgICB0aGlzLmpib2FyZC5zZXRUeXBlKHRoaXMubGFzdEhvdmVyLCBKR08uQ0xFQVIpO1xuICAgICAgICAgICAgdGhpcy5sYXN0SG92ZXIgPSBudWxsO1xuICAgICAgICB9XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICog44Kv44Oq44OD44Kv44Gn44Gv44Gq44GP44Gm44OA44Km44OzL+OCv+ODg+ODgeOBp+efs+mfs+OCkueri+OBpuOBn+OBhOOBruOBp+OBk+OBk+OBp+WHpueQhuOBl+OBpuOBhOOBvuOBmeOAglxuICAgICAqIEBwcml2YXRlXG4gICAgICogQHBhcmFtIHtFdmVudH0gZXYgXG4gICAgICovXG4gICAgZG93bkhhbmRsZXIoZXYpIHtcbiAgICAgICAgaWYgKHRoaXMub3duQ29sb3IgPT09IHRoaXMudHVybikge1xuICAgICAgICAgICAgc3RvbmVTb3VuZC5wbGF5KCk7XG4gICAgICAgIH1cbiAgICB9XG59XG5leHBvcnRzLkJvYXJkQ29udHJvbGxlciA9IEJvYXJkQ29udHJvbGxlcjsiLCIndXNlIHN0cmljdCc7XG5cbnZhciBfd29ya2VyUm1pID0gcmVxdWlyZSgnd29ya2VyLXJtaScpO1xuXG52YXIgX3NwZWVjaCA9IHJlcXVpcmUoJy4vc3BlZWNoLmpzJyk7XG5cbnZhciBfbmV1cmFsX25ldHdvcmsgPSByZXF1aXJlKCcuL25ldXJhbF9uZXR3b3JrLmpzJyk7XG5cbnZhciBfYXpqc19lbmdpbmVfY2xpZW50ID0gcmVxdWlyZSgnLi9hempzX2VuZ2luZV9jbGllbnQuanMnKTtcblxudmFyIF9ib2FyZF9jb250cm9sbGVyID0gcmVxdWlyZSgnLi9ib2FyZF9jb250cm9sbGVyLmpzJyk7XG5cbnZhciBfcGxheV9jb250cm9sbGVyID0gcmVxdWlyZSgnLi9wbGF5X2NvbnRyb2xsZXIuanMnKTtcblxuLyoqXG4gKiDmjIflrprjgZXjgozjgZ/nooHnm6TjgrXjgqTjgrrjgajjgqjjg7Pjgrjjg7Pjgaflr77lsYDjgpLnubDjgorov5TjgZfjgb7jgZnjgIJcbiAqIOaJi+eVquOBqOaMgeOBoeaZgumWk+OBr+WvvualteOBrumDveW6puWPl+OBkeS7mOOBkeOBvuOBmeOAglxuICogQHBhcmFtIHtJbnRlZ2VyfSBzaXplIFxuICogQHBhcmFtIHtBWmpzRW5naW5lfSBlbmdpbmUgXG4gKi9cbi8qKlxuICogQGZpbGUg44Ki44OX44Oq44Gu44Ko44Oz44OI44Oq44O844Od44Kk44Oz44OI44Gn44GZ44CCXG4gKi9cbi8qXG4gKiBAYXV0aG9yIOW4guW3nembhOS6jFxuICogQGNvcHlyaWdodCAyMDE4IElDSElLQVdBLCBZdWppIChOZXcgMyBScylcbiAqL1xuLyogZ2xvYmFsICQgSkdPIGkxOG4gKi9cbmFzeW5jIGZ1bmN0aW9uIHN0YXJ0R2FtZShzaXplLCBlbmdpbmUpIHtcbiAgICBjb25zdCBib2FyZCA9IGF3YWl0IG5ldyBQcm9taXNlKGZ1bmN0aW9uIChyZXMsIHJlaikge1xuICAgICAgICBuZXcgX2JvYXJkX2NvbnRyb2xsZXIuQm9hcmRDb250cm9sbGVyKHNpemUsIDAsIDcuNSwgcmVzKTtcbiAgICB9KTtcbiAgICBjb25zdCAkc3RhcnRNb2RhbCA9ICQoJyNzdGFydC1tb2RhbCcpO1xuICAgICRzdGFydE1vZGFsLm1vZGFsKCdzaG93Jyk7XG4gICAgLy8g44Om44O844K244O844GM5omL55Wq44Go5oyB44Gh5pmC6ZaT44KS5rG644KB44KL6ZaT44Gr44OL44Ol44O844Op44Or44ON44OD44OI44Ov44O844Kv44Gu44Km44Kn44Kk44OI44KS44OA44Km44Oz44Ot44O844OJ44GX44G+44GZ44CCXG4gICAgdHJ5IHtcbiAgICAgICAgYXdhaXQgZW5naW5lLmxvYWROTigpOyAvLyDkuIDluqbjgaDjgZHjg4Djgqbjg7Pjg63jg7zjg4njgZfjgIHmrKHlm57jga/lho3liKnnlKjjgZfjgb7jgZnjgIJcbiAgICAgICAgJCgnI2xvYWRpbmctbWVzc2FnZScpLnRleHQoaTE4bi5maW5pc2hEb3dubG9hZCk7XG4gICAgICAgICQoJyNzdGFydC1nYW1lJykucHJvcCgnZGlzYWJsZWQnLCBmYWxzZSk7XG4gICAgfSBjYXRjaCAoZSkge1xuICAgICAgICBpZiAoZSA9PT0gJ0Vycm9yOiBObyBiYWNrZW5kIGlzIGF2YWlsYWJsZScpIHtcbiAgICAgICAgICAgIGlmICgvKE1hYyBPUyBYIDEwXzEzfChpUGFkfGlQaG9uZXxpUG9kKTsgQ1BVIE9TIDExKS4qU2FmYXJpLy50ZXN0KG5hdmlnYXRvci51c2VyQWdlbnQpICYmICEvQ2hyb21lLy50ZXN0KG5hdmlnYXRvci51c2VyQWdlbnQpKSB7XG4gICAgICAgICAgICAgICAgKDAsIF9zcGVlY2guaTE4blNwZWFrKShpMThuLm5vdFN1cHBvcnQgKyBpMThuLnNhZmFyaVdpdGhvdXRXZWJncHUpO1xuICAgICAgICAgICAgfSBlbHNlIGlmICghKDAsIF9zcGVlY2guaTE4blNwZWFrKShpMThuLm5vdFN1cHBvcnQpKSB7XG4gICAgICAgICAgICAgICAgYWxlcnQoaTE4bi5ub3RTdXBwb3J0KTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIGNvbnNvbGUuZXJyb3IoZSk7XG4gICAgICAgIH1cbiAgICAgICAgcmV0dXJuO1xuICAgIH1cbiAgICBjb25zdCBjb25kaXRpb24gPSBhd2FpdCBuZXcgUHJvbWlzZShmdW5jdGlvbiAocmVzLCByZWopIHtcbiAgICAgICAgY29uc3QgJGNvbmRpdGlvbkZvcm0gPSAkKCcjY29uZGl0aW9uLWZvcm0nKTtcbiAgICAgICAgJGNvbmRpdGlvbkZvcm0ub25lKCdzdWJtaXQnLCBmdW5jdGlvbiAoZSkge1xuICAgICAgICAgICAgZS5wcmV2ZW50RGVmYXVsdCgpO1xuICAgICAgICAgICAgJHN0YXJ0TW9kYWwub25lKCdoaWRkZW4uYnMubW9kYWwnLCBmdW5jdGlvbiAoZSkge1xuICAgICAgICAgICAgICAgIHJlcyh7XG4gICAgICAgICAgICAgICAgICAgIGNvbG9yOiAkY29uZGl0aW9uRm9ybVswXVsnY29sb3InXS52YWx1ZSxcbiAgICAgICAgICAgICAgICAgICAgdGltZVJ1bGU6ICRjb25kaXRpb25Gb3JtWzBdWyd0aW1lJ10udmFsdWUsXG4gICAgICAgICAgICAgICAgICAgIHRpbWU6IHBhcnNlSW50KCRjb25kaXRpb25Gb3JtWzBdWydhaS1ieW95b21pJ10udmFsdWUpXG4gICAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICB9KTtcbiAgICAgICAgICAgICRzdGFydE1vZGFsLm1vZGFsKCdoaWRlJyk7XG4gICAgICAgIH0pO1xuICAgIH0pO1xuICAgIGxldCBtYWluVGltZTtcbiAgICBsZXQgYnlveW9taTtcbiAgICBzd2l0Y2ggKGNvbmRpdGlvbi50aW1lUnVsZSkge1xuICAgICAgICBjYXNlICdhaS10aW1lJzpcbiAgICAgICAgICAgIG1haW5UaW1lID0gMDtcbiAgICAgICAgICAgIGJ5b3lvbWkgPSBjb25kaXRpb24udGltZTtcbiAgICAgICAgICAgIGF3YWl0IGVuZ2luZS50aW1lU2V0dGluZ3MoMCwgYnlveW9taSk7XG4gICAgICAgICAgICBicmVhaztcbiAgICAgICAgY2FzZSAnaWdvLXF1ZXN0JzpcbiAgICAgICAgICAgIHN3aXRjaCAoc2l6ZSkge1xuICAgICAgICAgICAgICAgIGNhc2UgOTpcbiAgICAgICAgICAgICAgICAgICAgbWFpblRpbWUgPSAzICogNjA7XG4gICAgICAgICAgICAgICAgICAgIGJ5b3lvbWkgPSAxO1xuICAgICAgICAgICAgICAgICAgICBicmVhaztcbiAgICAgICAgICAgICAgICBjYXNlIDE5OlxuICAgICAgICAgICAgICAgICAgICBtYWluVGltZSA9IDcgKiA2MDtcbiAgICAgICAgICAgICAgICAgICAgYnlveW9taSA9IDM7XG4gICAgICAgICAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICAgICAgICAgIGRlZmF1bHQ6XG4gICAgICAgICAgICAgICAgICAgIHRocm93IG5ldyBFcnJvcignc2l6ZSBpcyBub3Qgc3VwcG9ydGVkJyk7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBhd2FpdCBlbmdpbmUudGltZVNldHRpbmdzKG1haW5UaW1lLCBieW95b21pKTtcbiAgICAgICAgICAgIGJyZWFrO1xuICAgIH1cbiAgICBpZiAoY29uZGl0aW9uLmNvbG9yID09PSAnVycpIHtcbiAgICAgICAgYm9hcmQuc2V0T3duQ29sb3IoSkdPLldISVRFKTtcbiAgICAgICAgaWYgKGJvYXJkLmpib2FyZC53aWR0aCA9PT0gOSkge1xuICAgICAgICAgICAgYm9hcmQuc2V0S29taSg1LjUpO1xuICAgICAgICB9XG4gICAgfSBlbHNlIGlmIChjb25kaXRpb24uY29sb3IgPT09ICdCJykge1xuICAgICAgICBib2FyZC5zZXRPd25Db2xvcihKR08uQkxBQ0spO1xuICAgICAgICBpZiAoYm9hcmQuamJvYXJkLndpZHRoID09PSA5KSB7XG4gICAgICAgICAgICBib2FyZC5zZXRLb21pKDYuNSk7XG4gICAgICAgIH1cbiAgICB9XG4gICAgY29uc3QgY29udHJvbGxlciA9IG5ldyBfcGxheV9jb250cm9sbGVyLlBsYXlDb250cm9sbGVyKGVuZ2luZSwgYm9hcmQsIG1haW5UaW1lLCBieW95b21pLCBjb25kaXRpb24udGltZVJ1bGUgPT09ICdpZ28tcXVlc3QnKTtcbiAgICBjb25zdCBpc1NlbGZQbGF5ID0gY29uZGl0aW9uLmNvbG9yID09PSAnc2VsZi1wbGF5JztcbiAgICBpZiAoIWlzU2VsZlBsYXkpIHtcbiAgICAgICAgKDAsIF9zcGVlY2guaTE4blNwZWFrKShpMThuLnN0YXJ0R3JlZXQpO1xuICAgIH1cbiAgICBjb250cm9sbGVyLnNldElzU2VsZlBsYXkoaXNTZWxmUGxheSk7XG4gICAgYm9hcmQuYWRkT2JzZXJ2ZXIoY29udHJvbGxlcik7XG4gICAgJCgnI3Bhc3MnKS5vbignY2xpY2snLCBmdW5jdGlvbiAoZXZlbnQpIHtcbiAgICAgICAgY29udHJvbGxlci5wYXNzKCk7XG4gICAgfSk7XG4gICAgJCgnI3Jlc2lnbicpLm9uZSgnY2xpY2snLCBhc3luYyBmdW5jdGlvbiAoZXZlbnQpIHtcbiAgICAgICAgY29udHJvbGxlci5jbGVhclRpbWVyKCk7XG4gICAgICAgIGF3YWl0IGVuZ2luZS5zdG9wKCk7XG4gICAgICAgICgwLCBfc3BlZWNoLmkxOG5TcGVhaykoaTE4bi5lbmRHcmVldCk7XG4gICAgICAgICQoZG9jdW1lbnQuYm9keSkuYWRkQ2xhc3MoJ2VuZCcpO1xuICAgIH0pO1xuICAgICQoJyNyZXRyeScpLm9uZSgnY2xpY2snLCBhc3luYyBmdW5jdGlvbiAoZXZlbnQpIHtcbiAgICAgICAgJCgnI3Bhc3MnKS5vZmYoJ2NsaWNrJyk7XG4gICAgICAgICQoJyNyZXNpZ24nKS5vZmYoJ2NsaWNrJyk7XG4gICAgICAgIGJvYXJkLmRlc3Ryb3koKTtcbiAgICAgICAgZW5naW5lLmNsZWFyKCk7XG4gICAgICAgICQoZG9jdW1lbnQuYm9keSkucmVtb3ZlQ2xhc3MoJ2VuZCcpO1xuICAgICAgICBzZXRUaW1lb3V0KGFzeW5jIGZ1bmN0aW9uICgpIHtcbiAgICAgICAgICAgIGF3YWl0IHN0YXJ0R2FtZShzaXplLCBlbmdpbmUpO1xuICAgICAgICB9LCAwKTtcbiAgICB9KTtcbn1cblxuLyoqXG4gKiDnooHnm6TjgrXjgqTjgrrjgpLlj5fjgZHku5jjgZHjgIHjgqjjg7Pjgrjjg7PjgpLnlJ/miJDjgZfjgIHlr77lsYDjgpLplovlp4vjgZfjgb7jgZnjgIJcbiAqIOeigeebpOOCteOCpOOCuuOBqOOCqOODs+OCuOODs+OBr+WGjeWvvuWxgOOBrumam+OBq+WGjeWIqeeUqOOBl+OBvuOBmeOAglxuICovXG5hc3luYyBmdW5jdGlvbiBtYWluKCkge1xuICAgIGNvbnN0ICRzaXplTW9kYWwgPSAkKCcjc2l6ZS1tb2RhbCcpO1xuICAgICRzaXplTW9kYWwubW9kYWwoJ3Nob3cnKTtcbiAgICBjb25zdCBzaXplID0gYXdhaXQgbmV3IFByb21pc2UoZnVuY3Rpb24gKHJlcywgcmVqKSB7XG4gICAgICAgICQoJy5idXR0b24tc2l6ZScpLm9uZSgnY2xpY2snLCBmdW5jdGlvbiAoZSkge1xuICAgICAgICAgICAgcmVzKHBhcnNlSW50KGUuY3VycmVudFRhcmdldC5kYXRhc2V0LnZhbHVlKSk7XG4gICAgICAgIH0pO1xuICAgIH0pO1xuICAgIHN3aXRjaCAoc2l6ZSkge1xuICAgICAgICBjYXNlIDk6XG4gICAgICAgICAgICAkKCcjc2l6ZS05LXJ1bGUnKS5zaG93KCk7XG4gICAgICAgICAgICBicmVhaztcbiAgICAgICAgZGVmYXVsdDpcbiAgICAgICAgICAgICQoJyNzaXplLTE5LXJ1bGUnKS5zaG93KCk7XG4gICAgfVxuICAgIGNvbnN0IGVuZ2luZSA9IG5ldyBfYXpqc19lbmdpbmVfY2xpZW50LkFaanNFbmdpbmUod29ya2VyLCBzaXplKTtcbiAgICBhd2FpdCBzdGFydEdhbWUoc2l6ZSwgZW5naW5lKTtcbn1cblxuLy8g5oCd6ICD44Ko44Oz44K444OzQVpqc0VuZ2luZeOBruacrOS9k+OCkuOCpuOCp+ODluODr+ODvOOCq+ODvOOBqOOBl+OBpuWLleOBi+OBl+OBvuOBmeOAglxuY29uc3Qgd29ya2VyID0gbmV3IFdvcmtlcignanMvYXotd29ya2VyLmpzJyk7XG4vLyDjg4vjg6Xjg7zjg6njg6vjg43jg4Pjg4jjg6/jg7zjgq/jgpLjg6HjgqTjg7Pjgrnjg6zjg4Pjg4njgafli5XjgYvjgZnjgojjgYbjgavnmbvpjLLjgZfjgb7jgZnjgIJcbi8vIFdlYkdML1dlYkdQVeOBjOODoeOCpOODs+OCueODrOODg+ODieOBruOBv+OBp+WLleS9nOOBmeOCi+OBi+OCieOBp+OBmeOAglxuLy8g5a6f6Zqb44Gu5ZG844Gz5Ye644GX44Gv5LiK6KiY44Ov44O844Kr44GM44GX44G+44GZ44CCXG4oMCwgX3dvcmtlclJtaS5yZXNpZ3RlcldvcmtlclJNSSkod29ya2VyLCBfbmV1cmFsX25ldHdvcmsuTmV1cmFsTmV0d29yayk7XG5cbm1haW4oKTsiLCIndXNlIHN0cmljdCc7XG5cbk9iamVjdC5kZWZpbmVQcm9wZXJ0eShleHBvcnRzLCBcIl9fZXNNb2R1bGVcIiwge1xuICAgIHZhbHVlOiB0cnVlXG59KTtcbmV4cG9ydHMuTmV1cmFsTmV0d29yayA9IHVuZGVmaW5lZDtcblxudmFyIF91dGlscyA9IHJlcXVpcmUoJy4vdXRpbHMuanMnKTtcblxuLyogc2xpY2Xjga5wb2x5ZmlsbCAqL1xuaWYgKCFBcnJheUJ1ZmZlci5wcm90b3R5cGUuc2xpY2UpIHtcbiAgICBBcnJheUJ1ZmZlci5wcm90b3R5cGUuc2xpY2UgPSBmdW5jdGlvbiAoc3RhcnQsIGVuZCkge1xuICAgICAgICB2YXIgdGhhdCA9IG5ldyBVaW50OEFycmF5KHRoaXMpO1xuICAgICAgICBpZiAoZW5kID09IHVuZGVmaW5lZCkgZW5kID0gdGhhdC5sZW5ndGg7XG4gICAgICAgIHZhciByZXN1bHQgPSBuZXcgQXJyYXlCdWZmZXIoZW5kIC0gc3RhcnQpO1xuICAgICAgICB2YXIgcmVzdWx0QXJyYXkgPSBuZXcgVWludDhBcnJheShyZXN1bHQpO1xuICAgICAgICBmb3IgKHZhciBpID0gMDsgaSA8IHJlc3VsdEFycmF5Lmxlbmd0aDsgaSsrKSByZXN1bHRBcnJheVtpXSA9IHRoYXRbaSArIHN0YXJ0XTtcbiAgICAgICAgcmV0dXJuIHJlc3VsdDtcbiAgICB9O1xufVxuXG4vKipcbiAqIOOCpuOCp+OCpOODiOOCkuODreODvOODieOBmeOCi+mam+OBruODl+ODreOCsOODrOOCueODkOODvOOCkuabtOaWsOOBl+OBvuOBmeOAglxuICogQHBhcmFtIHtudW1iZXJ9IHBlcmNlbnRhZ2UgXG4gKi9cbi8qKlxuICogQGZpbGUg44OL44Ol44O844Op44Or44ON44OD44OI44Ov44O844Kv44KS6KiI566X44GZ44KL44Kv44Op44K544Gn44GZ44CCXG4gKi9cbi8qXG4gKiBAYXV0aG9yIOW4guW3nembhOS6jFxuICogQGNvcHlyaWdodCAyMDE4IElDSElLQVdBLCBZdWppIChOZXcgMyBScylcbiAqL1xuLyogZ2xvYmFsIFdlYkROTiAkICovXG5mdW5jdGlvbiBzZXRMb2FkaW5nQmFyKHBlcmNlbnRhZ2UpIHtcbiAgICBjb25zdCAkbG9hZGluZ0JhciA9ICQoJyNsb2FkaW5nLWJhcicpO1xuICAgICRsb2FkaW5nQmFyLmF0dHIoJ2FyaWEtdmFsdWVub3cnLCBwZXJjZW50YWdlKTtcbiAgICAkbG9hZGluZ0Jhci5jc3MoJ3dpZHRoJywgcGVyY2VudGFnZS50b1N0cmluZygpICsgJyUnKTtcbn1cblxuLyoqIOODi+ODpeODvOODqeODq+ODjeODg+ODiOODr+ODvOOCr+OCkuioiOeul+OBmeOCi+OCr+ODqeOCuShXZWJETk7jga5EZXNjcmlwdG9yUnVubmVy44Gu44Op44OD44OR44O844Kv44Op44K5KSAqL1xuY2xhc3MgTmV1cmFsTmV0d29yayB7XG4gICAgY29uc3RydWN0b3IoKSB7XG4gICAgICAgIHRoaXMudmVyc2lvbiA9IDE7XG4gICAgICAgIHRoaXMubm4gPSBudWxsO1xuICAgIH1cblxuICAgIC8qKlxuICAgICAqIOOCpuOCp+OCpOODiOODleOCoeOCpOODq+OCkuODgOOCpuODs+ODreODvOODieOBl+OBvuOBmeOAglxuICAgICAqIEBwYXJhbSB7c3RyaW5nfSBwYXRoIFdlYkROTuODh+ODvOOCv+OBrlVSTFxuICAgICAqL1xuICAgIGFzeW5jIGxvYWQocGF0aCwgdmVyc2lvbiA9IDEpIHtcbiAgICAgICAgdGhpcy52ZXJzaW9uID0gdmVyc2lvbjtcbiAgICAgICAgaWYgKHRoaXMubm4pIHtcbiAgICAgICAgICAgIHNldExvYWRpbmdCYXIoMTAwKTtcbiAgICAgICAgICAgIHJldHVybjtcbiAgICAgICAgfVxuICAgICAgICBjb25zdCBvcHRpb25zID0ge1xuICAgICAgICAgICAgYmFja2VuZE9yZGVyOiBbJ3dlYmdwdScsICd3ZWJnbCddLFxuICAgICAgICAgICAgcHJvZ3Jlc3NDYWxsYmFjazogZnVuY3Rpb24gKGxvYWRlZCwgdG90YWwpIHtcbiAgICAgICAgICAgICAgICBzZXRMb2FkaW5nQmFyKGxvYWRlZCAvIHRvdGFsICogMTAwKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfTtcbiAgICAgICAgc2V0TG9hZGluZ0JhcigwKTtcbiAgICAgICAgdGhpcy5ubiA9IGF3YWl0IFdlYkROTi5sb2FkKHBhdGgsIG9wdGlvbnMpO1xuICAgIH1cblxuICAgIC8qKlxuICAgICAqIOODi+ODpeODvOODqeODq+ODjeODg+ODiOODr+ODvOOCr+OCkuipleS+oeOBl+OBn+e1kOaenOOCkui/lOOBl+OBvuOBmeOAglxuICAgICAqIEBwYXJhbSB7QXJyYXl9IGlucHV0cyBcbiAgICAgKiBAcmV0dXJucyB7QXJyYXl9XG4gICAgICovXG4gICAgYXN5bmMgZXZhbHVhdGUoLi4uaW5wdXRzKSB7XG4gICAgICAgIC8vIEFscGhhR28gWmVyb+OBp+OBr+OBk+OBk+OBp+WFpeWKm+OCkuODqeODs+ODgOODoOOBq+Wbnui7oi/pj6Hlg4/lpInmj5vjgZfjgabjgYTjgb7jgZnjgYzjgIHjgrXjg5zjgaPjgabjgYTjgb7jgZnjgIJcbiAgICAgICAgY29uc3Qgdmlld3MgPSB0aGlzLm5uLmdldElucHV0Vmlld3MoKTtcbiAgICAgICAgZm9yIChsZXQgaSA9IDA7IGkgPCBpbnB1dHMubGVuZ3RoOyBpKyspIHtcbiAgICAgICAgICAgIHZpZXdzW2ldLnNldChpbnB1dHNbaV0pO1xuICAgICAgICB9XG4gICAgICAgIGF3YWl0IHRoaXMubm4ucnVuKCk7XG4gICAgICAgIGNvbnN0IHJlc3VsdCA9IHRoaXMubm4uZ2V0T3V0cHV0Vmlld3MoKS5tYXAoZSA9PiBlLnRvQWN0dWFsKCkpO1xuICAgICAgICByZXN1bHRbMF0gPSAoMCwgX3V0aWxzLnNvZnRtYXgpKHJlc3VsdFswXSk7XG4gICAgICAgIHJlc3VsdFsxXSA9IHJlc3VsdFsxXS5zbGljZSgwKTsgLy8gdG8uQWN0dWFs44Gd44Gu44KC44Gu44Gn44GvcG9zdE1lc3NhZ2XjgadkZXRhY2jjgYzjgafjgY3jgarjgYTjga7jgafjgrPjg5Tjg7zjgZnjgovjgIJcbiAgICAgICAgaWYgKHRoaXMudmVyc2lvbiA9PT0gMiAmJiBpbnB1dHNbMF1baW5wdXRzWzBdLmxlbmd0aCAtIDFdID09PSAxLjApIHtcbiAgICAgICAgICAgIHJlc3VsdFsxXVswXSA9IC1yZXN1bHRbMV1bMF07XG4gICAgICAgIH1cbiAgICAgICAgcmV0dXJuIHJlc3VsdDtcbiAgICB9XG59XG5leHBvcnRzLk5ldXJhbE5ldHdvcmsgPSBOZXVyYWxOZXR3b3JrOyIsIid1c2Ugc3RyaWN0JztcblxuT2JqZWN0LmRlZmluZVByb3BlcnR5KGV4cG9ydHMsIFwiX19lc01vZHVsZVwiLCB7XG4gICAgdmFsdWU6IHRydWVcbn0pO1xuZXhwb3J0cy5QbGF5Q29udHJvbGxlciA9IHVuZGVmaW5lZDtcblxudmFyIF9zcGVlY2ggPSByZXF1aXJlKCcuL3NwZWVjaC5qcycpO1xuXG4vKipcbiAqIE1WQ+OBruOCs+ODs+ODiOODreODvOODqeOBruOCquODluOCtuODvOODkOODvOOCr+ODqeOCueOBp+OBmeOAglxuICog5oCd6ICD44Ko44Oz44K444Oz44Gu6LW35YuV44Go552A5omL44CB44Kv44Ot44OD44Kv5pu05paw44CB57WC5bGA5Yem55CG44KS44GX44G+44GZ44CCXG4gKi9cbmNsYXNzIFBsYXlDb250cm9sbGVyIHtcbiAgICAvKipcbiAgICAgKiBAcGFyYW0ge0FaanNFbmdpbmV9IGVuZ2luZSBcbiAgICAgKiBAcGFyYW0ge0JvYXJkQ29udHJvbGxlcn0gYm9hcmQgXG4gICAgICogQHBhcmFtIHtudW1iZXJ9IG1haW5UaW1lIFxuICAgICAqIEBwYXJhbSB7bnVtYmVyfSBieW95b21pIFxuICAgICAqIEBwYXJhbSB7Ym9vbH0gZmlzaGVyUnVsZSBcbiAgICAgKi9cbiAgICBjb25zdHJ1Y3RvcihlbmdpbmUsIGJvYXJkLCBtYWluVGltZSwgYnlveW9taSwgZmlzaGVyUnVsZSkge1xuICAgICAgICB0aGlzLmVuZ2luZSA9IGVuZ2luZTtcbiAgICAgICAgdGhpcy5ib2FyZCA9IGJvYXJkO1xuICAgICAgICB0aGlzLmlzU2VsZlBsYXkgPSBmYWxzZTtcbiAgICAgICAgdGhpcy5ieW95b21pID0gYnlveW9taTtcbiAgICAgICAgdGhpcy5maXNoZXJSdWxlID0gZmlzaGVyUnVsZTtcbiAgICAgICAgdGhpcy5pc0ZpcnN0TW92ZSA9IHRydWU7XG4gICAgICAgIGlmICh0aGlzLmZpc2hlclJ1bGUpIHtcbiAgICAgICAgICAgIHRoaXMudGltZUxlZnQgPSBbMCwgLy8gZHVteVxuICAgICAgICAgICAgbWFpblRpbWUgKiAxMDAwLCAvLyBibGFja1xuICAgICAgICAgICAgbWFpblRpbWUgKiAxMDAwXTtcbiAgICAgICAgICAgIHRoaXMuc3RhcnQgPSBEYXRlLm5vdygpO1xuICAgICAgICAgICAgdGhpcy50aW1lciA9IHNldEludGVydmFsKCgpID0+IHtcbiAgICAgICAgICAgICAgICBjb25zdCBzdGFydCA9IERhdGUubm93KCk7XG4gICAgICAgICAgICAgICAgdGhpcy50aW1lTGVmdFt0aGlzLmJvYXJkLnR1cm5dIC09IHN0YXJ0IC0gdGhpcy5zdGFydDtcbiAgICAgICAgICAgICAgICB0aGlzLnN0YXJ0ID0gc3RhcnQ7XG4gICAgICAgICAgICAgICAgaWYgKHRoaXMuYm9hcmQub3duQ29sb3IgPT09IHRoaXMuYm9hcmQudHVybikge1xuICAgICAgICAgICAgICAgICAgICAkKCcjeW91ci10aW1lJykudGV4dChNYXRoLmNlaWwodGhpcy50aW1lTGVmdFt0aGlzLmJvYXJkLm93bkNvbG9yXSAvIDEwMDApKTtcbiAgICAgICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgICAgICAkKCcjYWktdGltZScpLnRleHQoTWF0aC5jZWlsKHRoaXMudGltZUxlZnRbSkdPLm9wcG9uZW50T2YodGhpcy5ib2FyZC5vd25Db2xvcildIC8gMTAwMCkpO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICBpZiAodGhpcy50aW1lTGVmdFt0aGlzLmJvYXJkLnR1cm5dIDwgMCkge1xuICAgICAgICAgICAgICAgICAgICBjbGVhckludGVydmFsKHRoaXMudGltZXIpO1xuICAgICAgICAgICAgICAgICAgICB0aGlzLnRpbWVyID0gbnVsbDtcbiAgICAgICAgICAgICAgICAgICAgdGhpcy5lbmdpbmUuc3RvcCgpO1xuICAgICAgICAgICAgICAgICAgICBhbGVydChpMThuLnRpbWVvdXQpO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH0sIDEwMCk7XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICB0aGlzLnRpbWVMZWZ0ID0gWzAsIC8vIGR1bXlcbiAgICAgICAgICAgIHRoaXMuYm9hcmQub3duQ29sb3IgPT09IEpHTy5CTEFDSyA/IEluZmluaXR5IDogdGhpcy5lbmdpbmUuYnlveW9taSAqIDEwMDAsIC8vIGJsYWNrXG4gICAgICAgICAgICB0aGlzLmJvYXJkLm93bkNvbG9yID09PSBKR08uQkxBQ0sgPyB0aGlzLmVuZ2luZS5ieW95b21pICogMTAwMCA6IEluZmluaXR5XTtcbiAgICAgICAgICAgIHRoaXMuc3RhcnQgPSBEYXRlLm5vdygpO1xuICAgICAgICAgICAgdGhpcy50aW1lciA9IHNldEludGVydmFsKCgpID0+IHtcbiAgICAgICAgICAgICAgICBjb25zdCBzdGFydCA9IERhdGUubm93KCk7XG4gICAgICAgICAgICAgICAgdGhpcy50aW1lTGVmdFt0aGlzLmJvYXJkLnR1cm5dIC09IHN0YXJ0IC0gdGhpcy5zdGFydDtcbiAgICAgICAgICAgICAgICB0aGlzLnN0YXJ0ID0gc3RhcnQ7XG4gICAgICAgICAgICAgICAgaWYgKHRoaXMuYm9hcmQudHVybiA9PSB0aGlzLmJvYXJkLm93bkNvbG9yKSB7XG4gICAgICAgICAgICAgICAgICAgICQoJyN5b3VyLXRpbWUnKS50ZXh0KE1hdGguY2VpbCh0aGlzLnRpbWVMZWZ0W3RoaXMuYm9hcmQudHVybl0gLyAxMDAwKSk7XG4gICAgICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICAgICAgJCgnI2FpLXRpbWUnKS50ZXh0KE1hdGguY2VpbCh0aGlzLnRpbWVMZWZ0W3RoaXMuYm9hcmQudHVybl0gLyAxMDAwKSk7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfSwgMTAwKTtcbiAgICAgICAgfVxuICAgICAgICAkKCcjeW91ci10aW1lJykudGV4dChNYXRoLmNlaWwodGhpcy50aW1lTGVmdFt0aGlzLmJvYXJkLm93bkNvbG9yXSAvIDEwMDApKTtcbiAgICAgICAgJCgnI2FpLXRpbWUnKS50ZXh0KE1hdGguY2VpbCh0aGlzLnRpbWVMZWZ0W0pHTy5vcHBvbmVudE9mKHRoaXMuYm9hcmQub3duQ29sb3IpXSAvIDEwMDApKTtcbiAgICB9XG5cbiAgICBjbGVhclRpbWVyKCkge1xuICAgICAgICBpZiAodGhpcy50aW1lcikge1xuICAgICAgICAgICAgY2xlYXJJbnRlcnZhbCh0aGlzLnRpbWVyKTtcbiAgICAgICAgICAgIHRoaXMudGltZXIgPSBudWxsO1xuICAgICAgICB9XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogQUnlkIzlo6vjga7jgrvjg6vjg5Xjg5fjg6zjgqTjgYvjganjgYbjgYvjgpLoqK3lrprjgZfjgb7jgZnjgIJcbiAgICAgKiBAcGFyYW0geyp9IGlzU2VsZlBsYXkgXG4gICAgICovXG4gICAgc2V0SXNTZWxmUGxheShpc1NlbGZQbGF5KSB7XG4gICAgICAgIHRoaXMuaXNTZWxmUGxheSA9IGlzU2VsZlBsYXk7XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICog57WC5bGA5Yem55CGXG4gICAgICogQHByaXZhdGVcbiAgICAgKi9cbiAgICBhc3luYyBlbmRHYW1lKCkge1xuICAgICAgICAoMCwgX3NwZWVjaC5pMThuU3BlYWspKGkxOG4uc2NvcmluZyk7XG4gICAgICAgIHRyeSB7XG4gICAgICAgICAgICBjb25zdCBzY29yZSA9IGF3YWl0IHRoaXMuZmluYWxTY29yZSgpO1xuICAgICAgICAgICAgbGV0IG1lc3NhZ2U7XG4gICAgICAgICAgICBpZiAoc2NvcmUgPT09IDApIHtcbiAgICAgICAgICAgICAgICBtZXNzYWdlID0gaTE4bi5qaWdvO1xuICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICBtZXNzYWdlID0gaTE4bltzY29yZSA+IDAgPyAnYmxhY2snIDogJ3doaXRlJ107XG4gICAgICAgICAgICAgICAgc3dpdGNoIChpMThuLmxhbmcpIHtcbiAgICAgICAgICAgICAgICAgICAgY2FzZSAnZW4nOlxuICAgICAgICAgICAgICAgICAgICAgICAgbWVzc2FnZSArPSBgIHdvbiBieSAke3Njb3JlfSBwb2ludHNgO1xuICAgICAgICAgICAgICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgICAgICAgICAgICAgIGNhc2UgJ2phJzpcbiAgICAgICAgICAgICAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBjb25zdCBhYnNTY29yZSA9IE1hdGguYWJzKHNjb3JlKTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBtZXNzYWdlICs9IGFic1Njb3JlIDwgMSA/ICfljYrnm67li53jgaEnIDogTWF0aC5mbG9vcihhYnNTY29yZSkgKyAn55uu5Y2K5Yud44GhJztcbiAgICAgICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIHN3aXRjaCAoaTE4bi5sYW5nKSB7XG4gICAgICAgICAgICAgICAgY2FzZSAnZW4nOlxuICAgICAgICAgICAgICAgICAgICBtZXNzYWdlICs9ICc/JztcbiAgICAgICAgICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgICAgICAgICAgY2FzZSAnamEnOlxuICAgICAgICAgICAgICAgICAgICBtZXNzYWdlICs9ICfjgafjgZnjgYvvvJ8nO1xuICAgICAgICAgICAgICAgICAgICBicmVhaztcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgICgwLCBfc3BlZWNoLmkxOG5TcGVhaykobWVzc2FnZS5yZXBsYWNlKCfljYonLCAn44Gv44KTJykpO1xuICAgICAgICAgICAgc2V0VGltZW91dChmdW5jdGlvbiAoKSB7XG4gICAgICAgICAgICAgICAgYWxlcnQobWVzc2FnZSk7XG4gICAgICAgICAgICAgICAgJChkb2N1bWVudC5ib2R5KS5hZGRDbGFzcygnZW5kJyk7XG4gICAgICAgICAgICB9LCAzMDAwKTtcbiAgICAgICAgfSBjYXRjaCAoZSkge1xuICAgICAgICAgICAgY29uc29sZS5sb2coZSk7XG4gICAgICAgICAgICAoMCwgX3NwZWVjaC5pMThuU3BlYWspKGkxOG4uZmFpbFNjb3JpbmcpO1xuICAgICAgICB9XG4gICAgfVxuXG4gICAgdXBkYXRlQ2xvY2soKSB7XG4gICAgICAgIGlmICh0aGlzLmZpc2hlclJ1bGUpIHtcbiAgICAgICAgICAgIGNvbnN0IHBsYXllZCA9IEpHTy5vcHBvbmVudE9mKHRoaXMuYm9hcmQudHVybik7XG4gICAgICAgICAgICBjb25zdCAkcGxheWVkVGltZXIgPSAkKHBsYXllZCA9PT0gdGhpcy5ib2FyZC5vd25Db2xvciA/ICcjeW91ci10aW1lJyA6ICcjYWktdGltZScpO1xuICAgICAgICAgICAgJHBsYXllZFRpbWVyLnRleHQoYCR7TWF0aC5jZWlsKHRoaXMudGltZUxlZnRbcGxheWVkXSAvIDEwMDApfSske3RoaXMuYnlveW9taX1gKTtcbiAgICAgICAgICAgIHRoaXMudGltZUxlZnRbcGxheWVkXSArPSB0aGlzLmJ5b3lvbWkgKiAxMDAwO1xuICAgICAgICAgICAgc2V0VGltZW91dCgoKSA9PiB7XG4gICAgICAgICAgICAgICAgJHBsYXllZFRpbWVyLnRleHQoTWF0aC5jZWlsKHRoaXMudGltZUxlZnRbcGxheWVkXSAvIDEwMDApKTtcbiAgICAgICAgICAgIH0sIDIwMDApO1xuICAgICAgICB9IGVsc2UgaWYgKHRoaXMuYm9hcmQudHVybiA9PT0gdGhpcy5ib2FyZC5vd25Db2xvcikge1xuICAgICAgICAgICAgdGhpcy50aW1lTGVmdFtKR08ub3Bwb25lbnRPZih0aGlzLmJvYXJkLm93bkNvbG9yKV0gPSB0aGlzLmVuZ2luZS5ieW95b21pICogMTAwMDtcbiAgICAgICAgICAgICQoJyNhaS10aW1lJykudGV4dChNYXRoLmNlaWwodGhpcy50aW1lTGVmdFtKR08ub3Bwb25lbnRPZih0aGlzLmJvYXJkLm93bkNvbG9yKV0gLyAxMDAwKSk7XG4gICAgICAgIH1cbiAgICB9XG5cbiAgICBhc3luYyB1cGRhdGVFbmdpbmUoY29vcmQpIHtcbiAgICAgICAgaWYgKCF0aGlzLmlzU2VsZlBsYXkgJiYgdHlwZW9mIGNvb3JkID09PSAnb2JqZWN0Jykge1xuICAgICAgICAgICAgYXdhaXQgdGhpcy5lbmdpbmUuc3RvcCgpO1xuICAgICAgICAgICAgYXdhaXQgdGhpcy5lbmdpbmUucGxheShjb29yZC5pICsgMSwgdGhpcy5ib2FyZC5qYm9hcmQuaGVpZ2h0IC0gY29vcmQuaik7XG4gICAgICAgIH1cbiAgICB9XG5cbiAgICBhc3luYyBlbmdpbmVQbGF5KCkge1xuICAgICAgICBjb25zdCBtb3ZlID0gYXdhaXQgdGhpcy5lbmdpbmUuZ2VubW92ZSgpO1xuICAgICAgICBpZiAoIXRoaXMudGltZXIpIHtcbiAgICAgICAgICAgIHJldHVybjsgLy8g5pmC6ZaT5YiH44KM44KC44GX44GP44Gv55u45omL44Gu5oqV5LqGXG4gICAgICAgIH1cbiAgICAgICAgc3dpdGNoIChtb3ZlKSB7XG4gICAgICAgICAgICBjYXNlICdyZXNpZ24nOlxuICAgICAgICAgICAgICAgIHRoaXMuY2xlYXJUaW1lcigpO1xuICAgICAgICAgICAgICAgICgwLCBfc3BlZWNoLmkxOG5TcGVhaykoaTE4bi5yZXNpZ24pO1xuICAgICAgICAgICAgICAgICQoZG9jdW1lbnQuYm9keSkuYWRkQ2xhc3MoJ2VuZCcpO1xuICAgICAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICAgICAgY2FzZSAncGFzcyc6XG4gICAgICAgICAgICAgICAgdGhpcy5ib2FyZC5wbGF5KG51bGwpO1xuICAgICAgICAgICAgICAgICgwLCBfc3BlZWNoLmkxOG5TcGVhaykoaTE4bi5wYXNzKTtcbiAgICAgICAgICAgICAgICBicmVhaztcbiAgICAgICAgICAgIGRlZmF1bHQ6XG4gICAgICAgICAgICAgICAgdGhpcy5ib2FyZC5wbGF5KG5ldyBKR08uQ29vcmRpbmF0ZShtb3ZlWzBdIC0gMSwgdGhpcy5ib2FyZC5qYm9hcmQuaGVpZ2h0IC0gbW92ZVsxXSksIHRydWUpO1xuICAgICAgICB9XG4gICAgICAgIGlmICh0aGlzLmZpc2hlclJ1bGUpIHtcbiAgICAgICAgICAgIGF3YWl0IHRoaXMuZW5naW5lLnRpbWVTZXR0aW5ncyh0aGlzLnRpbWVMZWZ0W0pHTy5vcHBvbmVudE9mKHRoaXMuYm9hcmQub3duQ29sb3IpXSAvIDEwMDAsIHRoaXMuYnlveW9taSk7XG4gICAgICAgIH1cbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBCb2FyZENvbnRyb2xsZXLjga7jgqrjg5bjgrbjg7zjg5Djg7zjgavjgarjgovjgZ/jgoHjga7jg6Hjgr3jg4Pjg4lcbiAgICAgKiBAcGFyYW0ge0pHTy5Db29yZGluYXRlfSBjb29yZCBcbiAgICAgKi9cbiAgICBhc3luYyB1cGRhdGUoY29vcmQpIHtcbiAgICAgICAgaWYgKGNvb3JkID09PSAnZW5kJykge1xuICAgICAgICAgICAgdGhpcy5jbGVhclRpbWVyKCk7XG4gICAgICAgICAgICBhd2FpdCB0aGlzLmVuZEdhbWUoKTtcbiAgICAgICAgICAgIHJldHVybjtcbiAgICAgICAgfVxuICAgICAgICBpZiAoIXRoaXMuaXNGaXJzdE1vdmUpIHtcbiAgICAgICAgICAgIHRoaXMudXBkYXRlQ2xvY2soKTtcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIHRoaXMuaXNGaXJzdE1vdmUgPSBmYWxzZTtcbiAgICAgICAgfVxuICAgICAgICBhd2FpdCB0aGlzLnVwZGF0ZUVuZ2luZShjb29yZCk7XG4gICAgICAgIGlmICh0aGlzLmlzU2VsZlBsYXkgfHwgdGhpcy5ib2FyZC50dXJuICE9PSB0aGlzLmJvYXJkLm93bkNvbG9yKSB7XG4gICAgICAgICAgICBzZXRUaW1lb3V0KGFzeW5jICgpID0+IHtcbiAgICAgICAgICAgICAgICB0cnkge1xuICAgICAgICAgICAgICAgICAgICBhd2FpdCB0aGlzLmVuZ2luZVBsYXkoKTtcbiAgICAgICAgICAgICAgICB9IGNhdGNoIChlKSB7XG4gICAgICAgICAgICAgICAgICAgIGNvbnNvbGUuZXJyb3IoZSk7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfSwgMCk7XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICB0aGlzLmVuZ2luZS5wb25kZXIoKTtcbiAgICAgICAgfVxuICAgIH1cblxuICAgIGFzeW5jIHBhc3MoKSB7XG4gICAgICAgIGlmICh0aGlzLmJvYXJkLm93bkNvbG9yID09PSB0aGlzLmJvYXJkLnR1cm4pIHtcbiAgICAgICAgICAgIGF3YWl0IHRoaXMuZW5naW5lLnN0b3AoKTtcbiAgICAgICAgICAgIHRoaXMuZW5naW5lLnBhc3MoKTtcbiAgICAgICAgICAgIHRoaXMuYm9hcmQucGxheShudWxsKTtcbiAgICAgICAgfVxuICAgIH1cblxuICAgIGFzeW5jIGZpbmFsU2NvcmUoKSB7XG4gICAgICAgIGNvbnN0IHJlc3VsdCA9IGF3YWl0ICQucG9zdCh7XG4gICAgICAgICAgICB1cmw6ICdodHRwczovL21pbWlha2EtcHl0aG9uLmhlcm9rdWFwcC5jb20vZ251Z28nLCAvLyBodHRw44Gn44Gv6YCa5L+h44Gn44GN44Gq44GL44Gj44Gf44CCICdodHRwOi8vMzUuMjAzLjE2MS4xMDAvZ251Z28nLFxuICAgICAgICAgICAgZGF0YToge1xuICAgICAgICAgICAgICAgIHNnZjogdGhpcy5ib2FyZC5qcmVjb3JkLnRvU2dmKCksXG4gICAgICAgICAgICAgICAgbW92ZTogJ2VzdCcsXG4gICAgICAgICAgICAgICAgbWV0aG9kOiAnYWZ0ZXJtYXRoJyxcbiAgICAgICAgICAgICAgICBydWxlOiB0aGlzLmJvYXJkLmpyZWNvcmQuZ2V0Um9vdE5vZGUoKS5pbmZvLmtvbWkgPT09ICc2LjUnID8gJ2phcGFuZXNlJyA6ICdjaGluZXNlJ1xuICAgICAgICAgICAgfVxuICAgICAgICB9KTtcbiAgICAgICAgaWYgKC9KaWdvLy50ZXN0KHJlc3VsdCkpIHtcbiAgICAgICAgICAgIHJldHVybiAwO1xuICAgICAgICB9XG4gICAgICAgIGNvbnN0IG1hdGNoID0gcmVzdWx0Lm1hdGNoKC8oQmxhY2t8V2hpdGUpIHdpbnMgYnkgKFswLTkuXSspIHBvaW50cy8pO1xuICAgICAgICBpZiAobWF0Y2gpIHtcbiAgICAgICAgICAgIGxldCBzY29yZSA9IHBhcnNlRmxvYXQobWF0Y2hbMl0pO1xuICAgICAgICAgICAgaWYgKG1hdGNoWzFdID09PSAnQmxhY2snKSB7XG4gICAgICAgICAgICAgICAgcmV0dXJuIHNjb3JlO1xuICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICByZXR1cm4gLXNjb3JlO1xuICAgICAgICAgICAgfVxuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgcmV0dXJuIG51bGw7XG4gICAgICAgIH1cbiAgICB9XG59XG5leHBvcnRzLlBsYXlDb250cm9sbGVyID0gUGxheUNvbnRyb2xsZXI7IC8qKlxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgKiBAZmlsZSBNVkPjga7jgrPjg7Pjg4jjg63jg7zjg6njga7jgqrjg5bjgrbjg7zjg5Djg7zjgq/jg6njgrnjgafjgZnjgIJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICovXG4vKlxuICogQGF1dGhvciDluILlt53pm4TkuoxcbiAqIEBjb3B5cmlnaHQgMjAxOCBJQ0hJS0FXQSwgWXVqaSAoTmV3IDMgUnMpXG4gKi9cbi8qIGdsb2JhbCAkIEpHTyBpMThuICovIiwiJ3VzZSBzdHJpY3QnO1xuXG5PYmplY3QuZGVmaW5lUHJvcGVydHkoZXhwb3J0cywgXCJfX2VzTW9kdWxlXCIsIHtcbiAgICB2YWx1ZTogdHJ1ZVxufSk7XG5leHBvcnRzLnNwZWFrID0gc3BlYWs7XG5leHBvcnRzLmkxOG5TcGVhayA9IGkxOG5TcGVhaztcbi8qKlxuICogQGZpbGUg6Z+z5aOw5ZCI5oiQ44Gu44Op44OD44OR44O86Zai5pWw576k44Gn44GZ44CCXG4gKi9cbi8qXG4gKiBAYXV0aG9yIOW4guW3nembhOS6jFxuICogQGNvcHlyaWdodCAyMDE3IElDSElLQVdBLCBZdWppIChOZXcgMyBScylcbiAqL1xuLyogZ2xvYmFsIGkxOG4gKi9cblxuLyoqXG4gKiBAcGFyYW0ge3N0cmluZ30gdGV4dFxuICogQHBhcmFtIHtzdHJpbmd9IGxhbmdcbiAqIEBwYXJhbSB7c3RyaW5nfSBnZW5kZXJcbiAqL1xuZnVuY3Rpb24gc3BlYWsodGV4dCwgbGFuZywgZ2VuZGVyKSB7XG4gICAgaWYgKCFTcGVlY2hTeW50aGVzaXNVdHRlcmFuY2UpIHJldHVybiBmYWxzZTtcblxuICAgIHN3aXRjaCAobGFuZykge1xuICAgICAgICBjYXNlICdlbic6XG4gICAgICAgICAgICBsYW5nID0gJ2VuLXVzJztcbiAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICBjYXNlICdqYSc6XG4gICAgICAgICAgICBsYW5nID0gJ2phLWpwJztcbiAgICAgICAgICAgIGJyZWFrO1xuICAgIH1cbiAgICBjb25zdCB1dHRlcmFuY2UgPSBuZXcgU3BlZWNoU3ludGhlc2lzVXR0ZXJhbmNlKHRleHQpO1xuICAgIGlmICgvKGlQaG9uZXxpUGFkfGlQb2QpKD89LipPUyBbNy04XSkvLnRlc3QobmF2aWdhdG9yLnVzZXJBZ2VudCkpIHV0dGVyYW5jZS5yYXRlID0gMC4yO1xuICAgIGNvbnN0IHZvaWNlcyA9IHNwZWVjaFN5bnRoZXNpcy5nZXRWb2ljZXMoKS5maWx0ZXIoZSA9PiBlLmxhbmcudG9Mb3dlckNhc2UoKSA9PT0gbGFuZyk7XG4gICAgbGV0IHZvaWNlID0gbnVsbDtcbiAgICBpZiAodm9pY2VzLmxlbmd0aCA+IDEpIHtcbiAgICAgICAgbGV0IG5hbWVzID0gbnVsbDtcbiAgICAgICAgc3dpdGNoIChsYW5nKSB7XG4gICAgICAgICAgICBjYXNlICdqYS1qcCc6XG4gICAgICAgICAgICAgICAgc3dpdGNoIChnZW5kZXIpIHtcbiAgICAgICAgICAgICAgICAgICAgY2FzZSAnbWFsZSc6XG4gICAgICAgICAgICAgICAgICAgICAgICBuYW1lcyA9IFsnT3RveWEnLCAnSGF0dG9yaScsICdJY2hpcm8nXTtcbiAgICAgICAgICAgICAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICAgICAgICAgICAgICBjYXNlICdmZW1hbGUnOlxuICAgICAgICAgICAgICAgICAgICAgICAgbmFtZXMgPSBbJ08tcmVu77yI5ouh5by177yJJywgJ08tcmVuJywgJ0t5b2tvJywgJ0hhcnVrYSddOyAvLyBXaW5kb3dzIDEw44GuQXl1bWnjga7lo7Djga/ku4rjgbLjgajjgaRcbiAgICAgICAgICAgICAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICBicmVhaztcbiAgICAgICAgICAgIGNhc2UgJ2VuLXVzJzpcbiAgICAgICAgICAgICAgICBzd2l0Y2ggKGdlbmRlcikge1xuICAgICAgICAgICAgICAgICAgICBjYXNlICdtYWxlJzpcbiAgICAgICAgICAgICAgICAgICAgICAgIG5hbWVzID0gWydBbGV4JywgJ0ZyZWQnXTtcbiAgICAgICAgICAgICAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICAgICAgICAgICAgICBjYXNlICdmZW1hbGUnOlxuICAgICAgICAgICAgICAgICAgICAgICAgbmFtZXMgPSBbJ1NhbWFudGhhJywgJ1ZpY3RvcmlhJ107XG4gICAgICAgICAgICAgICAgICAgICAgICBicmVhaztcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgIH1cbiAgICAgICAgaWYgKG5hbWVzKSB7XG4gICAgICAgICAgICB2b2ljZSA9IHZvaWNlcy5maWx0ZXIodiA9PiBuYW1lcy5zb21lKG4gPT4gdi5uYW1lLmluZGV4T2YobikgPj0gMCkpWzBdO1xuICAgICAgICB9XG4gICAgICAgIGlmICghdm9pY2UpIHtcbiAgICAgICAgICAgIHZvaWNlID0gdm9pY2VzLmZpbHRlcih2ID0+IHYuZ2VuZGVyICYmIHYuZ2VuZGVyLnRvTG93ZXJDYXNlKCkgPT09IGdlbmRlcilbMF07XG4gICAgICAgIH1cbiAgICB9XG4gICAgdXR0ZXJhbmNlLnZvaWNlID0gdm9pY2UgfHwgdm9pY2VzWzBdO1xuICAgIC8vIGlPUyAxMCBTYWZhcmkgaGFzIGEgYnVnIHRoYXQgdXR0ZXJhbmNlLnZvaWNlIGlzIG5vIGVmZmVjdC5cbiAgICB1dHRlcmFuY2Uudm9sdW1lID0gcGFyc2VGbG9hdChsb2NhbFN0b3JhZ2UuZ2V0SXRlbSgndm9sdW1lJykgfHwgJzEuMCcpO1xuICAgIHNwZWVjaFN5bnRoZXNpcy5zcGVhayh1dHRlcmFuY2UpO1xuICAgIHJldHVybiB0cnVlO1xufVxuXG4vKipcbiAqIEBwcml2YXRlXG4gKi9cbmZ1bmN0aW9uIHVubG9jaygpIHtcbiAgICB3aW5kb3cucmVtb3ZlRXZlbnRMaXN0ZW5lcignY2xpY2snLCB1bmxvY2spO1xuICAgIHNwZWVjaFN5bnRoZXNpcy5zcGVhayhuZXcgU3BlZWNoU3ludGhlc2lzVXR0ZXJhbmNlKCcnKSk7XG59XG5cbi8qKlxuICogXG4gKiBAcGFyYW0ge3N0cmluZ30gbWVzc2FnZSBcbiAqL1xuZnVuY3Rpb24gaTE4blNwZWFrKG1lc3NhZ2UpIHtcbiAgICByZXR1cm4gc3BlYWsobWVzc2FnZSwgaTE4bi5sYW5nLCAnZmVtYWxlJyk7XG59XG5cbndpbmRvdy5hZGRFdmVudExpc3RlbmVyKCdsb2FkJywgZnVuY3Rpb24gKGV2ZW50KSB7XG4gICAgaWYgKHNwZWVjaFN5bnRoZXNpcykge1xuICAgICAgICBzcGVlY2hTeW50aGVzaXMuZ2V0Vm9pY2VzKCk7XG4gICAgICAgIGlmIChzcGVlY2hTeW50aGVzaXMub252b2ljZXNjaGFuZ2VkICE9PSB1bmRlZmluZWQpIHtcbiAgICAgICAgICAgIHNwZWVjaFN5bnRoZXNpcy5vbnZvaWNlc2NoYW5nZWQgPSBmdW5jdGlvbiAoKSB7XG4gICAgICAgICAgICAgICAgY29uc29sZS5sb2coJ29udm9pY2VzY2hhbmdlZCcpO1xuICAgICAgICAgICAgfTtcbiAgICAgICAgfVxuICAgICAgICB3aW5kb3cuYWRkRXZlbnRMaXN0ZW5lcignY2xpY2snLCB1bmxvY2ssIGZhbHNlKTsgLy8gZm9yIGlPU1xuICAgIH1cbn0pOyIsIid1c2Ugc3RyaWN0JztcblxuT2JqZWN0LmRlZmluZVByb3BlcnR5KGV4cG9ydHMsIFwiX19lc01vZHVsZVwiLCB7XG4gICAgdmFsdWU6IHRydWVcbn0pO1xuZXhwb3J0cy5zaHVmZmxlID0gc2h1ZmZsZTtcbmV4cG9ydHMubW9zdENvbW1vbiA9IG1vc3RDb21tb247XG5leHBvcnRzLmFyZ3NvcnQgPSBhcmdzb3J0O1xuZXhwb3J0cy5hcmdtYXggPSBhcmdtYXg7XG5leHBvcnRzLmhhc2ggPSBoYXNoO1xuZXhwb3J0cy5zb2Z0bWF4ID0gc29mdG1heDtcbmV4cG9ydHMucHJpbnRQcm9iID0gcHJpbnRQcm9iO1xuLyoqXG4gKiBAZmlsZSDlkITnqK7jg6bjg7zjg4bjgqPjg6rjg4bjgqPplqLmlbDnvqTjgafjgZnjgIJcbiAqL1xuLypcbiAqIEBhdXRob3Ig5biC5bed6ZuE5LqMXG4gKiBAY29weXJpZ2h0IDIwMTggSUNISUtBV0EsIFl1amkgKE5ldyAzIFJzKVxuICovXG5cbi8qKlxuICogQHBhcmFtIHtBcnJheX0gYXJyYXlcbiAqL1xuZnVuY3Rpb24gc2h1ZmZsZShhcnJheSkge1xuICAgIGxldCBuID0gYXJyYXkubGVuZ3RoO1xuICAgIGxldCB0O1xuICAgIGxldCBpO1xuXG4gICAgd2hpbGUgKG4pIHtcbiAgICAgICAgaSA9IE1hdGguZmxvb3IoTWF0aC5yYW5kb20oKSAqIG4tLSk7XG4gICAgICAgIHQgPSBhcnJheVtuXTtcbiAgICAgICAgYXJyYXlbbl0gPSBhcnJheVtpXTtcbiAgICAgICAgYXJyYXlbaV0gPSB0O1xuICAgIH1cblxuICAgIHJldHVybiBhcnJheTtcbn1cblxuLyoqXG4gKiBhcnJheeOBruS4reOBruacgOmgu+WHuuimgee0oOOCkui/lOOBl+OBvuOBmeOAglxuICogQHBhcmFtIHtBcnJheX0gYXJyYXkgXG4gKi9cbmZ1bmN0aW9uIG1vc3RDb21tb24oYXJyYXkpIHtcbiAgICBjb25zdCBtYXAgPSBuZXcgTWFwKCk7XG4gICAgZm9yIChsZXQgaSA9IDA7IGkgPCBhcnJheS5sZW5ndGg7IGkrKykge1xuICAgICAgICBjb25zdCBlID0gYXJyYXlbaV07XG4gICAgICAgIGlmIChtYXAuaGFzKGUpKSB7XG4gICAgICAgICAgICBtYXAuc2V0KGUsIG1hcC5nZXQoZSkgKyAxKTtcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIG1hcC5zZXQoZSwgMSk7XG4gICAgICAgIH1cbiAgICB9XG4gICAgbGV0IG1heEtleTtcbiAgICBsZXQgbWF4VmFsdWUgPSAtMTtcbiAgICBmb3IgKGNvbnN0IFtrZXksIHZhbHVlXSBvZiBtYXAuZW50cmllcygpKSB7XG4gICAgICAgIGlmICh2YWx1ZSA+IG1heFZhbHVlKSB7XG4gICAgICAgICAgICBtYXhLZXkgPSBrZXk7XG4gICAgICAgICAgICBtYXhWYWx1ZSA9IHZhbHVlO1xuICAgICAgICB9XG4gICAgfVxuICAgIHJldHVybiBtYXhLZXk7XG59XG5cbi8qKiBhcnJheeOCkuOCveODvOODiOOBl+OBn+aZguOBruOCpOODs+ODh+ODg+OCr+OCuemFjeWIl+OCkui/lOOBl+OBvuOBmeOAglxuICogQHBhcmFtIHtudW1iZXJbXX0gYXJyYXkgXG4gKiBAcGFyYW0ge2Jvb2x9IHJldmVyc2UgXG4gKi9cbmZ1bmN0aW9uIGFyZ3NvcnQoYXJyYXksIHJldmVyc2UpIHtcbiAgICBjb25zdCBlbiA9IEFycmF5LmZyb20oYXJyYXkpLm1hcCgoZSwgaSkgPT4gW2ksIGVdKTtcbiAgICBlbi5zb3J0KChhLCBiKSA9PiByZXZlcnNlID8gYlsxXSAtIGFbMV0gOiBhWzFdIC0gYlsxXSk7XG4gICAgcmV0dXJuIGVuLm1hcChlID0+IGVbMF0pO1xufVxuXG4vKipcbiAqIGFycmF544Gu5Lit44Gu5pyA5aSn5YCk44Gu44Kk44Oz44OH44OD44Kv44K544KS6L+U44GX44G+44GZ44CCXG4gKiBAcGFyYW0ge251bWJlcltdfSBhcnJheSBcbiAqL1xuZnVuY3Rpb24gYXJnbWF4KGFycmF5KSB7XG4gICAgbGV0IG1heEluZGV4O1xuICAgIGxldCBtYXhWYWx1ZSA9IC1JbmZpbml0eTtcbiAgICBmb3IgKGxldCBpID0gMDsgaSA8IGFycmF5Lmxlbmd0aDsgaSsrKSB7XG4gICAgICAgIGNvbnN0IHYgPSBhcnJheVtpXTtcbiAgICAgICAgaWYgKHYgPiBtYXhWYWx1ZSkge1xuICAgICAgICAgICAgbWF4SW5kZXggPSBpO1xuICAgICAgICAgICAgbWF4VmFsdWUgPSB2O1xuICAgICAgICB9XG4gICAgfVxuICAgIHJldHVybiBtYXhJbmRleDtcbn1cblxuLyoqXG4gKiBzdHLjga4zMi1iaXTjg4/jg4Pjgrfjg6XlgKTjgpLov5TjgZfjgb7jgZnjgIJcbiAqICjms6gpMTnot6/nm6Tjgafjga8zMi1iaXTjg4/jg4Pjgrfjg6XlgKTjga/ooZ3nqoHjgZnjgovjgajoqIDjgo/jgozjgabjgYTjgb7jgZnjgYzooZ3nqoHjgavjga/lr77lv5zjgZfjgabjgYTjgb7jgZvjgpPjgIJcbiAqIEBwYXJhbSB7c3RyaW5nfSBzdHIgXG4gKiBAcmV0dXJucyB7SW50ZWdlcn1cbiAqL1xuZnVuY3Rpb24gaGFzaChzdHIpIHtcbiAgICBsZXQgaGFzaCA9IDUzODE7XG4gICAgZm9yIChsZXQgaSA9IDA7IGkgPCBzdHIubGVuZ3RoOyBpKyspIHtcbiAgICAgICAgY29uc3QgY2hhciA9IHN0ci5jaGFyQ29kZUF0KGkpO1xuICAgICAgICBoYXNoID0gKGhhc2ggPDwgNSkgKyBoYXNoICsgY2hhcjsgLyogaGFzaCAqIDMzICsgYyAqL1xuICAgICAgICBoYXNoID0gaGFzaCAmIGhhc2g7IC8vIENvbnZlcnQgdG8gMzJiaXQgaW50ZWdlclxuICAgIH1cbiAgICByZXR1cm4gTWF0aC5hYnMoaGFzaCk7XG59XG5cbi8qKlxuICog5rip5bqm44OR44Op44Oh44O844K/44GC44KK44Gu44K944OV44OI44Oe44OD44Kv44K56Zai5pWw44Gn44GZ44CCXG4gKiBAcGFyYW0ge0Zsb2F0MzJBcnJheX0gaW5wdXQgXG4gKiBAcGFyYW0ge251bWJlcn0gdGVtcGVyYXR1cmVcbiAqIEByZXR1cm5zIHtGbG9hdDMyQXJyYXl9XG4gKi9cbmZ1bmN0aW9uIHNvZnRtYXgoaW5wdXQsIHRlbXBlcmF0dXJlID0gMS4wKSB7XG4gICAgY29uc3Qgb3V0cHV0ID0gbmV3IEZsb2F0MzJBcnJheShpbnB1dC5sZW5ndGgpO1xuICAgIGNvbnN0IGFscGhhID0gTWF0aC5tYXguYXBwbHkobnVsbCwgaW5wdXQpO1xuICAgIGxldCBkZW5vbSA9IDAuMDtcblxuICAgIGZvciAobGV0IGkgPSAwOyBpIDwgaW5wdXQubGVuZ3RoOyBpKyspIHtcbiAgICAgICAgY29uc3QgdmFsID0gTWF0aC5leHAoKGlucHV0W2ldIC0gYWxwaGEpIC8gdGVtcGVyYXR1cmUpO1xuICAgICAgICBkZW5vbSArPSB2YWw7XG4gICAgICAgIG91dHB1dFtpXSA9IHZhbDtcbiAgICB9XG5cbiAgICBmb3IgKGxldCBpID0gMDsgaSA8IG91dHB1dC5sZW5ndGg7IGkrKykge1xuICAgICAgICBvdXRwdXRbaV0gLz0gZGVub207XG4gICAgfVxuXG4gICAgcmV0dXJuIG91dHB1dDtcbn1cblxuZnVuY3Rpb24gcHJpbnRQcm9iKHByb2IsIHNpemUpIHtcbiAgICBmb3IgKGxldCB5ID0gMDsgeSA8IHNpemU7IHkrKykge1xuICAgICAgICBsZXQgc3RyID0gYCR7eSArIDF9IGA7XG4gICAgICAgIGZvciAobGV0IHggPSAwOyB4IDwgc2l6ZTsgeCsrKSB7XG4gICAgICAgICAgICBzdHIgKz0gKCcgICcgKyBwcm9iW3ggKyB5ICogc2l6ZV0udG9GaXhlZCgxKSkuc2xpY2UoLTUpO1xuICAgICAgICB9XG4gICAgICAgIGNvbnNvbGUubG9nKHN0cik7XG4gICAgfVxuICAgIGNvbnNvbGUubG9nKCdwYXNzPSVzJywgcHJvYltwcm9iLmxlbmd0aCAtIDFdLnRvRml4ZWQoMSkpO1xufSJdfQ==
