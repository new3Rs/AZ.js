import commonjs from 'rollup-plugin-commonjs';
import resolve from 'rollup-plugin-node-resolve';

export default {
  input: 'src/main.js',
  output: {
    file: 'docs/js/az.js',
    format: 'esm'
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
