/**
 * @file ウェブワーカのエントリーポイントです。
 */
/*
 * @author 市川雄二
 * @copyright 2018 ICHIKAWA, Yuji (New 3 Rs)
 * @license MIT
 */
import { resigterWorkerRMI } from 'worker-rmi';
import { AZjsEngine } from './azjs_engine.js';

resigterWorkerRMI(self, AZjsEngine);
