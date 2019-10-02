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
    if (!SpeechSynthesisUtterance)
        return false;

    switch (lang) {
    case 'en':
        lang = 'en-us';
        break;
    case 'ja':
        lang = 'ja-jp';
        break;
    }
    const utterance = new SpeechSynthesisUtterance(text);
    if (/(iPhone|iPad|iPod)(?=.*OS [7-8])/.test(navigator.userAgent))
        utterance.rate = 0.2;
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


window.addEventListener('load', function(event) {
    if (speechSynthesis) {
        speechSynthesis.getVoices();
        if (speechSynthesis.onvoiceschanged !== undefined) {
            speechSynthesis.onvoiceschanged = function() {
                console.log('onvoiceschanged');
            };
        }
        window.addEventListener('click', unlock, false); // for iOS
    }
});

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
var objectid = ObjectID;
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
  if(!objectid || (typeof objectid !== 'string' && (typeof objectid !== 'object' || typeof objectid.toString !== 'function'))) return false;

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
};

/**
 * get the machineID
 * 
 * @return {number}
 * @api public
 */
ObjectID.getMachineID = function() {
  return MACHINE_ID;
};

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

var inspect = (Symbol && Symbol.for('nodejs.util.inspect.custom')) || 'inspect';

/**
 * Converts to a string representation of this Id.
 *
 * @return {String} return the 24 byte hex string representation.
 * @api private
 */
ObjectID.prototype[inspect] = function() { return "ObjectID("+this+")" };
ObjectID.prototype.toJSON = ObjectID.prototype.toHexString;
ObjectID.prototype.toString = ObjectID.prototype.toHexString;

/* global exports */
/**
 * @fileoverview a tiny library for Web Worker Remote Method Invocation
 *
 */


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
        this.id = objectid().toString();
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
                result = await instance[data.methodName].apply(instance, data.args);
                message.result = result;
                this.workerRMI.target.postMessage(message, getTransferList(result));
            } catch (e) {
                console.error(e);
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
    };
    target.addEventListener('message', klass.workerRMI.handler);
}

var WorkerRMI_1 = WorkerRMI;
var resigterWorkerRMI_1 = resigterWorkerRMI;

/**
 * @file 各種ユーティリティ関数群です。
 */

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

/**
 * @file ニューラルネットワークを計算するクラスです。
 */

/* sliceのpolyfill */
if (!ArrayBuffer.prototype.slice) {
    ArrayBuffer.prototype.slice = function(start, end) {
        var that = new Uint8Array(this);
        if (end == undefined) end = that.length;
        var result = new ArrayBuffer(end - start);
        var resultArray = new Uint8Array(result);
        for (var i = 0; i < resultArray.length; i++)
           resultArray[i] = that[i + start];
        return result;
    };
}

/**
 * ウェイトをロードする際のプログレスバーを更新します。
 * @param {number} percentage 
 */
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
            progressCallback: function(loaded, total) {
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
        result[0] = softmax(result[0]);
        result[1] = result[1].slice(0);// to.ActualそのものではpostMessageでdetachができないのでコピーする。
        if (this.version === 2 && inputs[0][inputs[0].length - 1] === 1.0) {
            result[1][0] = -result[1][0];
        }
        return result;
    }
}

/**
 * @file 探索モードの列挙型です。
 */
/*
 * @author 市川雄二
 * @copyright 2018 ICHIKAWA, Yuji (New 3 Rs)
 * @license MIT
 */

/**
 * 探索モードの列挙型です。
 */
const SearchMode = {
    HARD: 0,
    NORMAL: 1,
    EASY: 2,
    fromString(str) {
        switch (str) {
            case 'normal':
            return this.NORNAL;
            case 'easy':
            return this.EASY;
            default:
            return this.HARD;
        }
    }
};

/**
 * @file 思考エンジンAZjsEngineのRMI版です。ドキュメントは本体側のコードを参照してください。
 */

// 思考エンジンAZjsEngineの本体をウェブワーカーとして動かします。
const worker = new Worker('js/az-worker.js');
// ニューラルネットワークをメインスレッドで動かすように登録します。
// WebGL/WebGPUがメインスレッドのみで動作するからです。
// 実際の呼び出しは上記ワーカがします。
resigterWorkerRMI_1(worker, NeuralNetwork);

/**
 * 思考エンジンAZjsEngineのRMI版です。ドキュメントは本体側のコードを参照してください。
 * @alias AZjsEngineRMI
 * @see AZjsEngine
 */
class AZjsEngine extends WorkerRMI_1 {
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

    async genmove(mode = SearchMode.HARD) {
        return await this.invokeRM('genmove', [mode]);
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

/*
 * @author 市川雄二
 * @copyright 2013-2018 ICHIKAWA, Yuji (New 3 Rs)
 * @license MIT
 */

class WAudio {
    static initClass() {
        this.NO_SOURCE = 0;
        this.LOADING = 1;
        this.LOADED = 2;
        if (window.AudioContext) {
            this.context = new window.AudioContext();
        } else if (window.webkitAudioContext) {
            this.context = new window.webkitAudioContext();
        }
    }

    static unlock() {
        // (iOS用) 何かのユーザーイベントの際に呼び出し、Web Audioを有効にする。
        // 空のソースを再生
        if (this.context.resume) {
            this.context.resume();
        }
        const source = this.context.createBufferSource();
        source.buffer = this.context.createBuffer(1, 1, 22050);
        source.connect(this.context.destination);
        source.onended = function() {
            source.disconnect();
        };
        source.start = source.start || source.noteOn;
        source.stop = source.stop || source.noteOff;
        source.start(0);
    }

    constructor(src) {
        this.src = src;
        this.forcePlay = false;
        this.state = this.constructor.NO_SOURCE;
        this.sources = [];
    }

    load(options) {
        const xhr = new XMLHttpRequest();
        xhr.open('GET', this.src);
        xhr.responseType = 'arraybuffer';
        xhr.onload = () => {
            return this.constructor.context.decodeAudioData(xhr.response, buffer => {
                this.buffer = buffer;
                this.state = this.constructor.LOADED;
                if (this.forcePlay) {
                    this.play(options);
                }
            }
            , e => {
                console.log("decodeAudioData error: ", e);
                this.state = this.constructor.NO_SOURCE;
            }
            );
        };
        xhr.send();
        this.state = this.constructor.LOADING;
    }

    play(options) {
        switch (this.state) {
            case this.constructor.NO_SOURCE:
                this.forcePlay = true;
                this.load(options);
                break;
            case this.constructor.LOADING:
                this.forcePlay = true;
                break;
            case this.constructor.LOADED: {
                const source = this.constructor.context.createBufferSource();
                source.start = source.start || source.noteOn;
                source.stop = source.stop || source.noteOff;
                source.buffer = this.buffer;
                let node = source;
                let gain, panner;
                if (options && options.volume != null) {
                    gain = this.constructor.context.createGain();
                    gain.gain.value = options.volume;
                    node.connect(gain);
                    node = gain;
                }
                if (options && options.pan != null) {
                    panner = this.constructor.context.createPanner();
                    panner.panningModel = 'equalpower';
                    let z = options.pan;
                    if (z > 90) {
                        z = 180 - z;
                    }
                    panner.setPosition(Math.sin((options.pan * Math.PI) / 180), 0, Math.sin((z * Math.PI) / 180));
                    node.connect(panner);
                    node = panner;
                }
                node.connect(this.constructor.context.destination);
                source.onended = () => {
                    source.disconnect();
                    if (gain) {
                        gain.disconnect();
                    }
                    if (panner) {
                        panner.disconnect();
                    }
                    this.sources.splice(this.sources.indexOf(source), 1);
                };
                source.start(0);
                this.sources.push(source);
                break;
            }
        }
    }

    pause() {
        this.sources.forEach(function(source) {
            source.stop(0);
        });
        this.sources = [];
    }
}

WAudio.initClass();
window.addEventListener('click', function() {
    WAudio.unlock();
});

/**
 * @file MVCのコントローラのオブザーバークラスです。
 */

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
            const stones = JGO.util.getHandicapCoordinates(this.jboard.width,
                handicap);
            this.jboard.setType(stones, JGO.BLACK);
            this.turn = JGO.WHITE;
        }

        const options = { stars: {points: 9 }};
        JGO.util.extend(options, JGO.BOARD.large);
        const jsetup = new JGO.Setup(this.jboard, options);
        jsetup.setOptions({ coordinates: {
            top: false,
            bottom: false,
            left: false,
            right: false
        }});

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
        document.getElementById('opponent-captures').innerText =
            node.info.captures[this.ownColor === JGO.WHITE ? JGO.BLACK : JGO.WHITE];
        document.getElementById('own-captures').innerText =
            node.info.captures[this.ownColor || JGO.BLACK];
        setTimeout(() => {
            this.observers.forEach(function(observer) {
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
        if(this.lastMove) {
            node.setMark(this.lastMove, JGO.MARK.NONE); // clear previous mark
        }
        if(this.ko) {
            node.setMark(this.ko, JGO.MARK.NONE); // clear previous ko mark
        }
        this.lastMove = coord;
        if(play.ko) {
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
        if (coord.i >= 0 && coord.i < this.jboard.width &&
            coord.j >= 0 && coord.j < this.jboard.height) {
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

        if (this.lastHover != null) { // clear previous hover if there was one
            this.jboard.setType(this.lastHover, JGO.CLEAR);
        }

        if (coord.i <= -1 || coord.j <= -1 ||
            coord.i >= this.jboard.width || coord.j >= this.jboard.height) {
            this.lastHover = null;
        } else if (this.jboard.getType(coord) === JGO.CLEAR &&
            this.jboard.getMark(coord) == JGO.MARK.NONE) {
            this.jboard.setType(coord,
                this.turn == JGO.BLACK ? JGO.DIM_BLACK : JGO.DIM_WHITE);
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

/**
 * @file MVCのコントローラのオブザーバークラスです。
 */

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
     * @param {string} mode 'best': 手の選択がbestでかつponder on, 'standard': 手の選択がbestでかつponder off, 'reception': 手の選択が接待でかつponder off
     * @param {bool} ponder
     * @param {bool} isSelfPlay 
     */
    constructor(engine, controller, mainTime, byoyomi, fisherRule, mode, isSelfPlay) {
        this.engine = engine;
        this.controller = controller;
        this.isSelfPlay = isSelfPlay;
        this.byoyomi = byoyomi;
        this.fisherRule = fisherRule;
        this.mode = SearchMode.fromString(mode);
        this.ponder = mode === 'very-hard' && !isSelfPlay;
        this.isFirstMove = true;
        if (this.fisherRule) {
            this.timeLeft = [
                0, // dumy
                mainTime * 1000, // black
                mainTime * 1000, // white
            ];
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
            this.timeLeft = [
                0, // dumy
                this.isSelfPlay || this.controller.ownColor !== JGO.BLACK ? this.engine.byoyomi * 1000 : Infinity, // black
                this.isSelfPlay || this.controller.ownColor !== JGO.WHITE ? this.engine.byoyomi * 1000 : Infinity, // white
            ];
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
            $('#left-winrate')
                .css('color', 'black')
                .css('background-color', 'white');
            $('#right-winrate')
                .css('color', 'white')
                .css('background-color', 'black');
        } else {
            $('#right-clock').text(Math.ceil(this.timeLeft[this.controller.ownColor] / 1000));
            $('#left-clock').text(Math.ceil(this.timeLeft[JGO.opponentOf(this.controller.ownColor)] / 1000));
            if (this.controller.ownColor === JGO.BLACK) {
                $('#left-winrate')
                    .css('color', 'black')
                    .css('background-color', 'white');
                $('#right-winrate')
                    .css('color', 'white')
                    .css('background-color', 'black');
            } else {
                $('#left-winrate')
                    .css('color', 'white')
                    .css('background-color', 'black');
                $('#right-winrate')
                    .css('color', 'black')
                    .css('background-color', 'white');
            }
        }
        this.updateWinrateBar(0.5);
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
        i18nSpeak(i18n.scoring);
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
                    case 'ja': {
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
            i18nSpeak(message.replace('半', 'はん'));
            setTimeout(function() {
                alert(message);
                $(document.body).addClass('end');
            }, 3000);
        } catch (e) {
            console.log(e);
            i18nSpeak(i18n.failScoring);
        }
    }

    updateClock() {
        if (this.fisherRule) {
            const played = JGO.opponentOf(this.controller.turn);
            const $playedTimer = $(this.isSelfPlay ?
                played === JGO.BLACK ? '#right-clock' : '#left-clock' :
                played === this.controller.ownColor ? '#right-clock' : '#left-clock');
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

    updateWinrateBar(leftWinRate) {
        leftWinRate = leftWinRate * 100;
        const $leftWinrate = $('#left-winrate');
        const $rightWinrate = $('#right-winrate');
        $leftWinrate.css('width', `${leftWinRate}%`);
        $leftWinrate.text(`${leftWinRate.toFixed(1)}%`);
        $leftWinrate.attr('aria-valuenow', leftWinRate.toFixed(1));
        $rightWinrate.css('width', `${100 - leftWinRate}%`);
        $rightWinrate.text(`${(100 - leftWinRate).toFixed(1)}%`);
        $rightWinrate.attr('aria-valuenow', (100 - leftWinRate).toFixed(1));
    }

    async enginePlay() {
        const start = Date.now();
        const [move, winRate, num] = await this.engine.genmove(this.mode);
        $('#playouts').text(num);
        if (num !== 0) {
            $('#nps').text((num * 1000 / (Date.now() - start)).toFixed(1));
        }
        this.updateWinrateBar(this.isSelfPlay && this.controller.turn === JGO.BLACK ? 1.0 - winRate : winRate);

        if (!this.timer) {
            return; // 時間切れもしくは相手の投了
        }
        switch (move) {
            case 'resign':
            this.clearTimer();
            i18nSpeak(i18n.resign);
            if (this.isSelfPlay) {
                i18nSpeak(i18n.endGreet);
            }
            $(document.body).addClass('end');
            break;
            case 'pass':
            this.controller.play(null);
            i18nSpeak(i18n.pass);
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
        if (!this.isSelfPlay && this.controller.turn !== this.controller.ownColor) {
            this.coord = coord; // ポンダーと一致するか確認するために直前の座標を保存。
            await this.updateEngine(coord);
        }
        if (this.isSelfPlay || this.controller.turn !== this.controller.ownColor) {
            setTimeout(async () => {
                try {
                    await this.enginePlay();
                } catch (e) {
                    console.error(e);
                    if (e === 'RangeError: Source is too large') {
                        alert(i18n.sourceIsTooLarge);
                    } else {
                        alert(e);
                    }
                }
            }, 0);
        } else if (this.ponder) {
            const [move, winrate] = await this.engine.ponder();
            this.updateWinrateBar(1.0 - winrate);
            // ponderが終了するときには次の着手が打たれていて、this.coordに保存されている。
            if (move[0] === this.coord.i + 1 && move[1] === this.controller.jboard.height - this.coord.j) {
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

/**
 * @file アプリのエントリーポイントです。
 */

/**
 * 指定された碁盤サイズとエンジンで対局を繰り返します。
 * 手番と持ち時間は対極の都度受け付けます。
 * @param {Integer} size 
 * @param {AZjsEngine} engine 
 */
async function startGame(size, engine) {
    const controller = await new Promise(function(res, rej) {
        new BoardController(size, 0, 7.5, res);
    });
    const $startModal = $('#start-modal');
    $startModal.modal('show');
    // ユーザーが手番と持ち時間を決める間にニューラルネットワークのウェイトをダウンロードします。
    try {
        await engine.loadNN(); // 一度だけダウンロードし、次回は再利用します。
        $('#loading-message').text(i18n.finishDownload);
        $('#start-game').prop('disabled', false);
    } catch(e) {
        if (e === 'Error: No backend is available') {
            if (/(Mac OS X 10_13|(iPad|iPhone|iPod); CPU OS 11).*Safari/.test(navigator.userAgent) && !/Chrome/.test(navigator.userAgent)) {
                $('#loading-message').text(i18n.notSupport + i18n.safariWithoutWebgpu);
                i18nSpeak(i18n.notSupport + i18n.safariWithoutWebgpu);
            } else if (!i18nSpeak(i18n.notSupport)) {
                $('#loading-message').text(i18n.notSupport);
                alert(i18n.notSupport);
            }
        } else {
            console.error(e);
        }
        return;
    }
    const condition = await new Promise(function(res, rej) {
        const $conditionForm = $('#condition-form');
        $conditionForm.one('submit', function(e) {
            e.preventDefault();
            $startModal.one('hidden.bs.modal', function(e) {
                res({
                    color: $conditionForm[0]['color'].value,
                    timeRule: $conditionForm[0]['time'].value,
                    time: parseInt($conditionForm[0]['ai-byoyomi'].value),
                    mode: $conditionForm[0]['mode'].value
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
    if (isSelfPlay) {
        controller.setOwnColor(null);
    }
    const $thumbsUp = $('#thumbs-up').parent();
    if (condition.ponder && !isSelfPlay) {
        $thumbsUp.show();
    } else {
        $thumbsUp.hide();
    }
    const observer = new PlayController(engine, controller, mainTime, byoyomi, condition.timeRule === 'igo-quest', condition.mode, isSelfPlay);
    if (!isSelfPlay) {
        i18nSpeak(i18n.startGreet);
    }
    observer.setIsSelfPlay(isSelfPlay);
    controller.addObserver(observer);
    $('#pass').on('click', function(event) {
        observer.pass();
    });
    $('#resign').one('click', async function(event) {
        observer.clearTimer();
        await engine.stop();
        i18nSpeak(i18n.endGreet);
        $(document.body).addClass('end');
    });
    $('#retry').one('click', async function(event) {
        $('#pass').off('click');
        $('#resign').off('click');
        controller.destroy();
        engine.clear();
        $(document.body).removeClass('end');
        setTimeout(async function() {
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
    const size = await new Promise(function(res, rej) {
        $('.button-size').one('click', function(e) {
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
    const engine = new AZjsEngine(size);
    await startGame(size, engine);
}

main();
