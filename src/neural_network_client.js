/**
 * @file ニューラルネットワークのRMIです。
 */
/*
 * @author 市川雄二
 * @copyright 2018 ICHIKAWA, Yuji (New 3 Rs)
 * @license MIT
 */
import { WorkerRMI } from 'worker-rmi';

/**
 * ニューラルネットワークのRMIです。ドキュメントは本体側のコードを参照してください。
 * @alias NeuralNetworkRMI
 * @see NeuralNetwork
 */
export class NeuralNetwork extends WorkerRMI {
    async evaluate(...inputs) {
        const result = await this.invokeRM('evaluate', inputs);
        return result;
    }
}
