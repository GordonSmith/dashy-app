var path = require('path');

module.exports = {
    entry: './lib-cjs/main.js',
    output: {
        path: path.join(__dirname, "lib"),
        filename: 'main.js'
    },
    target: "electron-main",
    mode: 'production'
}
