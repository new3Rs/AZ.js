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
export class BoardConstants {
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
            case this.WHITE: return this.BLACK;
            case this.BLACK: return this.WHITE;
            default: throw new Error('invalid color');
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
        return rv === this.BVCNT ?
            this.PASS :
            rv % this.BSIZE + 1 + Math.floor(rv / this.BSIZE + 1) * this.EBSIZE;
    }

    /**
     * 拡張線形座標を線形座標に変換します。
     * @param {Uint16} ev
     * @returns {Uint16} raw vertex
     */
    ev2rv(ev) {
        return ev === this.PASS ?
            this.BVCNT :
            ev % this.EBSIZE - 1 + Math.floor(ev / this.EBSIZE - 1) * this.BSIZE;
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
        return [
            v + this.EBSIZE + 1,
            v + this.EBSIZE - 1,
            v - this.EBSIZE - 1,
            v - this.EBSIZE + 1,
        ]
    }  
}
