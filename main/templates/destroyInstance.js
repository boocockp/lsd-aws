const {destroyInstance}  = require('lsd-aws').Tools
const defineInstance  = require('./defineInstance')

destroyInstance(defineInstance)
