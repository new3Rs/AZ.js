/**
 * @file アプリのエントリーポイントです。
 */
/*
 * @author 市川雄二
 * @copyright 2018 ICHIKAWA, Yuji (New 3 Rs)
 * @license MIT
 */
/* global $ JGO i18n */
import { i18nSpeak } from './speech.js';
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
                    mode: $conditionForm[0]['mode'].value,
                    ponder: $conditionForm[0]['ponder'].value === 'true'
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
    const $thumbsUp = $('#thumbs-up').parent();
    if (condition.ponder && !isSelfPlay) {
        $thumbsUp.show();
    } else {
        $thumbsUp.hide();
    }
    const observer = new PlayController(engine, controller, mainTime, byoyomi, condition.timeRule === 'igo-quest', condition.mode, condition.ponder, isSelfPlay);
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
