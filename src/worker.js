/**
 * @file ウェブワーカのエントリーポイントです。
 */
/*
 * @author 市川雄二
 * @copyright 2018 ICHIKAWA, Yuji (New 3 Rs)
 * @license MIT
 */
import { resigterWorkerRMI } from 'worker-rmi';
import { AZjsEngineBase } from './azjs_engine_base.js';

/**
 * アプリ特有のgetRootPolicy関数です。
 * thisはMCTSのインスタンスです。
 * @param {Board} b 
 */
async function getRootPolicy(b) {
    let prob;
    if (b.moveNumber === 0) {
        switch (b.C.BSIZE) {
            case 19:
            const firstMoves = [
                [16, 16],
                [17, 16],
                [15, 17],
                [15, 16],
                [10, 10]
            ];
            const firstMove = firstMoves[Math.floor(Math.random() * firstMoves.length)];
            prob = new Float32Array(b.C.BVCNT);
            for (let i = 0; i < prob.length; i++) {
                const xy = b.C.ev2xy(b.C.rv2ev(i));
                prob[i] = firstMove[0] === xy[0] && firstMove[1] === xy[1] ? 1.0 : 0.0;
            }
            break;
            default:
            const [p] = await this.evaluate(b);
            prob = p;
        }
    } else {
        const [p] = await this.evaluate(b);
        prob = p;
    }
    return prob;
}

/** 対局を行う思考エンジンクラスです。 */
class AZjsEngine extends AZjsEngineBase {
    /**
     * AZjsEngineBaseにアプリ固有のgetRootPolicy関数を渡します。
     * @param {Integer} size 
     * @param {Number} komi 
     */
    constructor(size, komi) {
        super(size, komi, getRootPolicy);
    }
}

resigterWorkerRMI(self, AZjsEngine);
