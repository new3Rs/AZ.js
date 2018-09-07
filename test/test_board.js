import fs from 'fs';
import jssgf from 'jssgf';
import { BoardConstants } from '../src/board_constants.js';
import { Board } from '../src/board.js';

function coord2point(str) {
    const offset = 'a'.charCodeAt(0) - 1;
    return [str.charCodeAt(0) - offset, str.charCodeAt(1) - offset];
}

describe('BaseBoard', function() {
    it('should legal', function() {
        const [root] = jssgf.fastParse(fs.readFileSync(`${__dirname}/test.sgf`, { encoding: 'UTF-8' }));
        const size = parseInt(root.SZ || '19');
        const C = new BoardConstants(size);
        const b = new Board(C, root.KM);
        let node = root;
        do {
            node = node._children[0];
            const p = coord2point(node.B || node.W);
            b.play(b.C.xy2ev(p[0], size + 1 - p[1]), true)
            b.showboard();
        } while (node._children.length > 0);
    });
});