const {destroyInstance, createInstance}  = require('lsd-aws').Tools
const {wait}  = require('lsd-aws').Util
const defineInstance  = require('./defineInstance')

destroyInstance(defineInstance)
    .then( () => wait(2000) )
    .then( () =>  createInstance(defineInstance) )
