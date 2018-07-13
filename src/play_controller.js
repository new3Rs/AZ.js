/**
 * @file MVCのコントローラのオブザーバークラスです。
 */
/*
 * @author 市川雄二
 * @copyright 2018 ICHIKAWA, Yuji (New 3 Rs)
 * @license MIT
 */
/* global $ JGO i18n */
import { i18nSpeak } from './speech.js';

/**
 * MVCのコントローラのオブザーバークラスです。
 * 思考エンジンの起動と着手、クロック更新、終局処理をします。
 */
export class PlayController {
    /**
     * @param {AZjsEngine} engine 
     * @param {BoardController} board 
     * @param {number} mainTime 
     * @param {number} byoyomi 
     * @param {bool} fisherRule 
     * @param {bool} isSelfPlay 
     */
    constructor(engine, board, mainTime, byoyomi, fisherRule, isSelfPlay) {
        this.engine = engine;
        this.board = board;
        this.isSelfPlay = isSelfPlay;
        this.byoyomi = byoyomi;
        this.fisherRule = fisherRule;
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
                this.timeLeft[this.board.turn] -= start - this.start;
                this.start = start;
                if (this.isSelfPlay) {
                    // AIのセルフプレイの時には右の情報(時計、アゲハマ)が黒、左の情報(時計、アゲハマ)が白です。
                    $(this.board.turn === JGO.BLACK ? '#right-clock' : '#left-clock').text(Math.ceil(this.timeLeft[this.board.turn] / 1000));
                } else {
                    // ユーザーとAIの対戦の時には右の情報(時計、アゲハマ)がユーザー、左の情報(時計、アゲハマ)がAIです。
                    if (this.board.ownColor === this.board.turn) {
                        $('#right-clock').text(Math.ceil(this.timeLeft[this.board.turn] / 1000));
                    } else {
                        $('#left-clock').text(Math.ceil(this.timeLeft[JGO.opponentOf(this.board.turn)] / 1000));
                    }
                }
                if (this.timeLeft[this.board.turn] < 0) {
                    clearInterval(this.timer);
                    this.timer = null;
                    this.engine.stop();
                    alert(i18n.timeout);
                }
            }, 100);
        } else {
            this.timeLeft = [
                0, // dumy
                this.isSelfPlay || this.board.ownColor !== JGO.BLACK ? this.engine.byoyomi * 1000 : Infinity, // black
                this.isSelfPlay || this.board.ownColor !== JGO.WHITE ? this.engine.byoyomi * 1000 : Infinity, // white
            ];
            this.start = Date.now();
            this.timer = setInterval(() => {
                const start = Date.now();
                this.timeLeft[this.board.turn] -= start - this.start;
                this.start = start;
                let clock;
                if (this.isSelfPlay) {
                    clock = this.board.turn === JGO.BLACK ? '#right-clock' : '#left-clock';
                } else {
                    clock = this.board.turn === this.board.ownColor ? '#right-clock' : '#left-clock';
                }
                $(clock).text(Math.ceil(this.timeLeft[this.board.turn] / 1000));
            }, 100);
        }
        if (this.isSelfPlay) {
            $('#right-clock').text(Math.ceil(this.timeLeft[JGO.BLACK] / 1000));
            $('#left-clock').text(Math.ceil(this.timeLeft[JGO.WHITE] / 1000));
        } else {
            $('#right-clock').text(Math.ceil(this.timeLeft[this.board.ownColor] / 1000));
            $('#left-clock').text(Math.ceil(this.timeLeft[JGO.opponentOf(this.board.ownColor)] / 1000));
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
            const played = JGO.opponentOf(this.board.turn);
            const $playedTimer = $(this.isSelfPlay ?
                this.board.turn === JGO.BLACK ? '#right-clock' : '#left-clock' :
                played === this.board.ownColor ? '#right-clock' : '#left-clock');
            $playedTimer.text(`${Math.ceil(this.timeLeft[played] / 1000)}+${this.byoyomi}`);
            this.timeLeft[played] += this.byoyomi * 1000;
            setTimeout(() => {
                $playedTimer.text(Math.ceil(this.timeLeft[played] / 1000));
            }, 2000);
        } else {
            if (this.isSelfPlay) {
                const played = JGO.opponentOf(this.board.turn);
                this.timeLeft[played] = this.engine.byoyomi * 1000;
                $(played === JGO.BLACK ? '#right-clock' : '#left-clock').text(Math.ceil(this.timeLeft[played] / 1000));
            } else if (this.board.turn === this.board.ownColor) {
                this.timeLeft[JGO.opponentOf(this.board.turn)] = this.engine.byoyomi * 1000;
                $('#left-clock').text(Math.ceil(this.timeLeft[JGO.opponentOf(this.board.turn)] / 1000));
            }
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
            i18nSpeak(i18n.resign);
            $(document.body).addClass('end');
            break;
            case 'pass':
            this.board.play(null);
            i18nSpeak(i18n.pass);
            break;
            default:
            this.board.play(new JGO.Coordinate(move[0] - 1, this.board.jboard.height - move[1]), true);
        }
        if (this.fisherRule) {
            await this.engine.timeSettings(this.timeLeft[JGO.opponentOf(this.board.turn)] / 1000, this.byoyomi);
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
        if (!this.isSelfPlay && this.board.ownColor === this.board.turn) {
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
