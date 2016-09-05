const {createInstance}  = require('lsd-aws').Tools
const defineInstance  = require('./defineInstance')

createInstance(defineInstance)
