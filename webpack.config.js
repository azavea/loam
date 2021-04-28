/* global __dirname, require, module*/

const webpack = require('webpack');
const UglifyJsPlugin = require('uglifyjs-webpack-plugin');
const path = require('path');
const env = require('yargs').argv.env; // use --env with webpack 2

const libraryName = 'loam';

const isBuildEnv = env === 'build';
const outputFile = isBuildEnv ? '[name].min.js' : '[name].js';

const config = {
    mode: isBuildEnv ? 'production' : 'development',
    entry: {
        loam: __dirname + '/src/index.ts',
        'loam-worker': __dirname + '/src/worker.js',
    },
    devtool: 'source-map',
    output: {
        path: __dirname + '/lib',
        filename: outputFile,
        library: libraryName,
        libraryTarget: 'umd',
        umdNamedDefine: true,
    },
    module: {
        rules: [
            {
                test: /\.tsx?$/,
                loader: 'ts-loader',
                exclude: /node_modules/,
            },
            {
                test: /(\.jsx|\.js)$/,
                loader: 'babel-loader',
                exclude: /node_modules/,
            },
            {
                test: /(\.jsx|\.js)$/,
                loader: 'eslint-loader',
                exclude: /node_modules/,
            },
        ],
    },
    resolve: {
        modules: [path.resolve('./node_modules'), path.resolve('./src')],
        extensions: ['.json', '.js', '.ts'],
    },
    optimization: {
        minimize: isBuildEnv,
        minimizer: [new UglifyJsPlugin()],
    },
};

module.exports = config;
