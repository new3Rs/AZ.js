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
import { NeuralNetwork } from './neural_network_client.js';
import { BoardConstants } from './board_constants.js';
import { Board } from './board.js';
import { MCTS } from './mcts.js';
import { SearchMode } from './search_mode.js';

/**
 * 対局を行う思考エンジンの基本クラスです。
 * ウェブワーカで動かすことを前提に、メインスレッドのアプリとNeuralNetworkの2つと通信しながらMCTSを実行します。
 * AZjsEngineという拡張クラスを作成して使います。
 */
export class AZjsEngineBase {
    /**
     * @param {Integer} size 碁盤サイズ
     * @param {number} komi コミ
     * @param {Function} evaluatePlugin
     */
    constructor(size = 19, komi = 7, evaluatePlugin = null) {
        this.b = new Board(new BoardConstants(size), komi);
        this.nn = new NeuralNetwork(self);
        this.mcts = new MCTS(this.nn, this.b.C, evaluatePlugin);
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
            args = ['https://storage.googleapis.com/mimiaka-storage/ELF_OpenGo_v1', 2];
            break;
            default:
            throw new Error('size is not supported');
        }
        await this.nn.load.apply(this.nn, args);
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
     * @param {SearchMode} mode
     * @returns {Object[]} [(Integer[]|string), Number]
     */
    async genmove(mode) {
        const [move, winRate] = await this.search(mode);
        if (winRate < 0.01) {
            return ['resign', winRate];
        }
        try {
            this.b.play(move);
            return [move === this.b.C.PASS ? 'pass' : this.b.C.ev2xy(move), winRate];
        } catch (e) {
            this.b.showboard();
            console.log(this.b.candidates());
            throw new Error(`illegal move ${this.b.C.ev2xy(move)}(${move})`);
        }
    }

    /**
     * 次の手を打って現局面を進めます。
     * (x, y)は左上が1-オリジンの2次元座標です。
     * @param {Integer} x 
     * @param {Integer} y 
     * @throws {Error}
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
     * MCTS探索します。
     * modeに応じて次の一手と勝率を返します。
     * @private
     * @param {SearchMode} mode
     * @param {bool} ponder
     * @returns {Object[]} [Integer, Number]
     */
    async search(mode, ponder = false) {
        const node = await this.mcts.search(this.b, ponder ? Infinity : 0.0, ponder);
        switch (mode) {
            case SearchMode.NORMAL: {
                const indices = node.getSortedIndices().filter(e => node.visitCounts[e] > 0);
                const winrates = indices.map(e => [e, node.winrate(e)]);
                winrates.sort((a, b) => b[1] - a[1]);
                const i = winrates.findIndex(e => e[1] < 0.5);
                const e = winrates[i < 0 ? winrates.length - 1 : Math.max(i - 1, 0)];
                return [node.moves[e[0]], e[1]];
            }
            case SearchMode.EASY: {
                const indices = node.getSortedIndices().filter(e => node.visitCounts[e] > 0);
                const winrates = indices.map(e => [e, node.winrate(e), node.visitCounts[e]]);
                winrates.sort((a, b) => b[1] - a[1]);
                let e = winrates.find(e => e[1] < 0.5);
                if (e == null) {
                    e = winrates[winrates.length - 1];
                }
                return [node.moves[e[0]], e[1]];
            }
            default: {
                const [best] = node.getSortedIndices();
                return [node.moves[best], node.winrate(best)];
                // return [node.moves[best], 1.0 - this.mcts.edgeWinrate(node.nodeIds[best])];
            }
        }
    }

    /**
     * @private
     */
    finalScore() {
        return this.b.finalScore();
    }

    /**
     * 相手の考慮中に探索を継続します。
     * @returns {Object[]} [(Integer[]|string), Number]
     */
    async ponder() {
        const [move, winrate] = await this.search('hard', true);
        return [move === this.b.C.PASS ? 'pass' : this.b.C.ev2xy(move), winrate];
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
