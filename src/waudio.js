/*
 * @author 市川雄二
 * @copyright 2013-2018 ICHIKAWA, Yuji (New 3 Rs)
 * @license MIT
 */

export class WAudio {
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
