const path = require('path')
var nodeExternals = require('webpack-node-externals');
var CopyWebpackPlugin = require('copy-webpack-plugin');
var ExtractTextPlugin = require('extract-text-webpack-plugin');

// The backend server
const backend = {
    entry: './src/app.ts',
    target: 'node',
    node: {
        __dirname: false,
        __filename: false,
    },
    externals: [nodeExternals()],
    output: {
        filename: 'dist/app.js'
    },
    resolve: {
        extensions: ['.ts', '.tsx']
    },
    module: {
        rules: [
            { test: /\.tsx?$/, loader: 'ts-loader' }
        ]
    },
    devtool: 'inline-source-map',
    // Pug files
    plugins: [
        new CopyWebpackPlugin([
            {
                context: 'src',
                from: '**/*pug',
                to: 'dist/views/'
            }
        ])
    ]

}

// Sass compiler. Way more complicated than it should be
var extractSass = new ExtractTextPlugin({ filename: "dist/static/css/app.css", })
const sass = {
    entry: './src/app.scss',
    output: {
        filename: 'dist/static/css/app.css'
    },
    resolve: {
        extensions: ['.scss']
    },
    module: {
        rules: [{
            test: /\.(scss)$/,
            use: extractSass.extract({
              use: [{
                loader: "css-loader" // translates CSS into CommonJS
              }, {
                loader: "sass-loader" // compiles Sass to CSS
              }]
            })
        }]
    },
    plugins: [
        extractSass
    ]
}


// The settings react app
SETTINGS_APP_DIR = path.resolve(__dirname, './src/settings/settings-client/')
const settings_client = {
    context: SETTINGS_APP_DIR,
    entry: './index.js',
    output: {
        filename: './dist/static/js/settings-client.js'
    },
    module: {
        loaders: [
            {
                test: /\.js?/,
                include: SETTINGS_APP_DIR,
                loader: 'babel-loader'
            }
        ]
    }
}

module.exports = [
    backend,
    sass,
    settings_client
]
