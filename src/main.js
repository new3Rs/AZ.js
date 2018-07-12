/**
 * @file アプリのエントリーポイントです。
 */
/*
 * @author 市川雄二
 * @copyright 2018 ICHIKAWA, Yuji (New 3 Rs)
 */
/* global $ JGO i18n */
import { resigterWorkerRMI } from 'worker-rmi';
import { i18nSpeak } from './speech.js';
import { NeuralNetwork } from './neural_network.js';
import { AZjsEngine } from './azjs_engine_client.js';
import { BoardController } from './board_controller.js';
import { PlayController } from './play_controller.js';

/**
 * 指定された碁盤サイズとエンジンで対局を繰り返します。
 * 手番と持ち時間は対極の都度受け付けます。
 * @param {Integer} size 
 * @param {AZjsEngine} engine 
 */
async function startGame(size, engine) {
    const board = await new Promise(function(res, rej) {
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
                i18nSpeak(i18n.notSupport + i18n.safariWithoutWebgpu);
            } else if (!i18nSpeak(i18n.notSupport)) {
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
    const controller = new PlayController(engine, board, mainTime, byoyomi, condition.timeRule === 'igo-quest');
    const isSelfPlay = condition.color === 'self-play';
    if (!isSelfPlay) {
        i18nSpeak(i18n.startGreet);
    }
    controller.setIsSelfPlay(isSelfPlay);
    board.addObserver(controller);
    $('#pass').on('click', function(event) {
        controller.pass();
    });
    $('#resign').one('click', async function(event) {
        controller.clearTimer();
        await engine.stop();
        i18nSpeak(i18n.endGreet);
        $(document.body).addClass('end');
    });
    $('#retry').one('click', async function(event) {
        $('#pass').off('click');
        $('#resign').off('click');
        board.destroy();
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
    const engine = new AZjsEngine(worker, size);
    await startGame(size, engine);
}

// 思考エンジンAZjsEngineの本体をウェブワーカーとして動かします。
const worker = new Worker('js/az-worker.js');
// ニューラルネットワークをメインスレッドで動かすように登録します。
// WebGL/WebGPUがメインスレッドのみで動作するからです。
// 実際の呼び出しは上記ワーカがします。
resigterWorkerRMI(worker, NeuralNetwork);

main();
