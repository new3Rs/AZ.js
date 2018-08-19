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
import { shuffle, mostCommon, hash } from './utils.js';
import { StoneGroup } from './stone_group.js';

/// ニューラルネットワークへの入力に関する履歴の深さです。
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
            this.sg.push(new StoneGroup(this.C));
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
        this.sg.forEach(e => { e.clear(false) });
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
        return atrCnt[this.C.opponentOf(this.turn)] !== 0 ||
            atrCnt[this.turn] < stoneCnt[this.turn];
    }

    /**
     * 交点vが眼形かどうかを返します。
     * (バグ) コウ付きでコウを取れる場合、眼形と判定します。
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
                if (this.state[nv] === this.C.opponentOf(pl) &&
                    this.sg[this.id[nv]].getLibCnt() === 1 &&
                    this.sg[this.id[nv]].getVAtr() !== this.ko) {
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
        shuffle(emptyList);
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
        return hash((this.state.toString() + this.prevState[0].toString() + this.turn.toString()).replace(',', ''));
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
        return mostCommon(doubleScoreList);
    }
}

/**
 * 碁盤クラスです。
 */
export class Board extends BaseBoard {
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
