import commonjs from 'rollup-plugin-commonjs';
import resolve from 'rollup-plugin-node-resolve';

export default {
  input: 'src/worker.js',
  output: {
    file: 'docs/js/az-worker.js',
    format: 'iife' // esmでも動いたけど、Chrome(68)のDedicated Workerはまだmoduleをサポートしていないので、iifeを指定。
  },
  plugins: [
    resolve({
      jsnext: true
    }),
    commonjs({
        include: 'node_modules/**'
    })
  ]
};
