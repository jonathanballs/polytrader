const path = require('path')
var nodeExternals = require('webpack-node-externals');
var CopyWebpackPlugin = require('copy-webpack-plugin');

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


// The settings react app
SETTINGS_APP_DIR = path.resolve(__dirname, './src/settings/settings-client/')
const settings_client = {
    entry: SETTINGS_APP_DIR + '/index.jsx',
    output: {
        filename: './dist/static/js/settings-client.js'
    },
    module: {
        loaders: [
            {
                test: /\.jsx?/,
                include: SETTINGS_APP_DIR,
                loader: 'babel-loader'
            }
        ]
    }
}

module.exports = [
    backend,
    settings_client
]
