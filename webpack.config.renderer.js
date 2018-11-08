var path = require('path');

module.exports = {
    entry: './lib-cjs/renderer.js',
    output: {
        path: path.join(__dirname, "lib"),
        filename: 'renderer.js'
    },
    target: "electron-renderer",
    mode: 'production'
}
