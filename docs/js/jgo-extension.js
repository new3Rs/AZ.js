/*
 * @author 市川雄二
 * @copyright 2018 ICHIKAWA, Yuji (New 3 Rs)
 * @license MIT 
 */

const JGO = window.JGO;
const FIELD_MAP = {
    'handicap': 'HA',
    'annotator': 'AN',
    'copyright': 'CP',
    'date': 'DT',
    'event': 'EV',
    'gameName': 'GN',
    'overtime': 'OT',
    'round': 'RO',
    'result': 'RE',
    'rules': 'RU',
    'source': 'SO',
    'time': 'TM',
    'location': 'PC',
    'black': 'PB',
    'white': 'PW',
    'blackRank': 'BR',
    'whiteRank': 'WR',
    'blackTeam': 'BT',
    'whiteTeam': 'WT',
    'komi': 'KM',
    'comment': 'C',
    'gameComment': 'GC',
    'play': 'PL',
    'appName': 'AP'
};


function coord2point(str) {
    const offset = 'a'.charCodeAt(0);
    return [str.charCodeAt(0) - offset, str.charCodeAt(1) - offset];
}

/**
 * info objectをSGF文字列にします。
 * @param info ノードのinfoプロパティ
 */
function info2sgf(info) {
    let result = '';
    for (let k in info) {
        const v = info[k];
        if (FIELD_MAP[k]) {
            result += `${FIELD_MAP[k]}[${v}]`;
        }
    }
    return result;
}

JGO.Node.prototype.isEmpty = function() {
    return Object.keys(this).filter(e => /^[A-Z]{2}$/.test(e)).length == 0;
}
/**
 * 自身と子ノードのSGFを出力します。
 */
JGO.Node.prototype.toSgf = function(recursive) {
    let result = ';';

    if (!this.parent) { // ルートノード
        result += 'FF[4]GM[1]';
        result += info2sgf(this.info);
        result += `SZ[${this.jboard.width}]`;
        const blacks = [];
        const whites = [];
        for (let change of this.changes) {
            switch (change.type) {
            case JGO.INTERSECTION.BLACK:
                blacks.push(change.c);
                break;
            case JGO.INTERSECTION.WHITE:
                whites.push(change.c);
                break;
            }
        }
        if (blacks.length > 0) {
            result += 'AB';
            for (let c of blacks) {
                result += `[${c.toString()}]`;
            }
        }
        if (whites.length > 0) {
            result += 'AW';
            for (let c of whites) {
                result += `[${c.toString()}]`;
            }
        }
    } else {
        let turn = null;
        for (let change of this.changes) {
            switch (change.type) {
            case JGO.INTERSECTION.BLACK:
                result += `B[${change.c.toString()}]`;
                turn = 'W';
                break;
            case JGO.INTERSECTION.WHITE:
                result += `W[${change.c.toString()}]`;
                turn = 'B';
                break;
            }
            /*
            if (change.mark) {
                result += `LB[${change.c.toString()}:${change.mark}]`;
            }
            */
        }
        result += info2sgf(this.info);
    }
    if (recursive) {
        switch (this.children.length) {
        case 0:
            break;
        case 1:
            result += this.children[0].toSgf(true);
            break;
        default:
            for (let child of this.children) {
                result += `(${child.toSgf(true)})`;
            }
        }
    }
    return result;
};

/**
 * 自身のSGFを出力します。
 * @param {string} ap アプリ名
 */
JGO.Record.prototype.toSgf = function(ap) {
    const node = this.getRootNode();
    if (ap)
        node.info.appName = ap;
    return `(${node.toSgf(true)})`;
};

/**
 * 現局面までのSGFを出力します。
 */
JGO.Record.prototype.toSgfUntilCurrent = function() {
    const current = this.getCurrentNode();
    let result = current.toSgf();
    let node = current.parent;
    while (node) {
        result = node.toSgf() + result;
        node = node.parent;
    }
    return `(${result})`;
}

/**
 * 相手のカラーを返します。
 */
JGO.opponentOf = function(color) {
    switch (color) {
        case JGO.BLACK: return JGO.WHITE;
        case JGO.WHITE: return JGO.BLACK;
        default: throw new Error(`illegal argument: ${color}`);
    }
}