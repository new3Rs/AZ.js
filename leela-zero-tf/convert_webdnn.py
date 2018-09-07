"""
Leela ZeroのウェイトをWebDNNように変換します。
コピーライト: 2018 ICHIKAWA, Yuji (New 3 Rs)
ライセンス: MIT
"""
__author__ = "ICHIKAWA, Yuji"

import tensorflow as tf
import os
import sys
from tfprocess import TFProcess
from net2net import read_net
from webdnn.frontend.tensorflow import TensorFlowConverter
from webdnn.backend import generate_descriptor

BOARD_SIZE = 19
FEATURES = 18
VALUE_FULL = 256


if __name__ == "__main__":
    if len(sys.argv) < 2:
        print(f'Usage: python3 {sys.argv[0]} weight_file')
        exit()
    data_format = 'NHWC'
    version, blocks, filters, weights = read_net(sys.argv[1])

    if data_format == 'NHWC':
        planes = tf.placeholder(tf.float32, [None, BOARD_SIZE, BOARD_SIZE, FEATURES])
        probs = tf.placeholder(tf.float32, [None, BOARD_SIZE * BOARD_SIZE + 1])
        winner = tf.placeholder(tf.float32, [None, 1])
    else:
        planes = tf.placeholder(tf.float32, [None, FEATURES, BOARD_SIZE, BOARD_SIZE])
        probs = tf.placeholder(tf.float32, [None, BOARD_SIZE * BOARD_SIZE + 1])
        winner = tf.placeholder(tf.float32, [None, 1])

    tfprocess = TFProcess()
    tfprocess.INPUT_DIM = 2
    tfprocess.DATA_FORMAT = data_format
    tfprocess.BOARD_SIZE = BOARD_SIZE
    tfprocess.FEATURES = FEATURES
    tfprocess.RESIDUAL_FILTERS = filters
    tfprocess.RESIDUAL_BLOCKS = blocks
    training = tfprocess.training
    tfprocess.training = False # batch normalizationをコンバートするため
    tfprocess.init_net(planes, probs, winner)
    tfprocess.replace_weights(weights)
    graph = TensorFlowConverter(tfprocess.session).convert([planes], [tfprocess.y_conv, tfprocess.z_conv])
    print("generating webgpu...")
    exec_info = generate_descriptor("webgpu", graph)
    exec_info.save("./ELF_OpenGo")
    print("done")
    print("generating webgl...")
    exec_info = generate_descriptor("webgl", graph)
    exec_info.save("./ELF_OpenGo")
