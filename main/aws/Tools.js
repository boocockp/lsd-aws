const AWS = require('aws-sdk'),
    fs = require('fs')

function instanceFromArgs() {
    const args = process.argv.slice(2)
    const instanceName = args[0]
    if (!instanceName) {
        let scriptName = process.argv[1].split('/').pop()
        console.error(`Usage: node ${scriptName} <instanceName>`)
        return
    }

    return instanceName
}

function createInstance(defineInstanceFunction) {
    const instanceName = instanceFromArgs()
    if (instanceName) {
        return defineInstanceFunction(instanceName).create().then( () => console.log(`Instance ${instanceName} created`))
    } else {
        return Promise.reject("Instance name required")
    }
}

function destroyInstance(defineInstanceFunction) {
    const instanceName = instanceFromArgs()
    if (instanceName) {
        return defineInstanceFunction(instanceName).destroy().then( () => console.log(`Instance ${instanceName} destroyed`))
    } else {
        return Promise.reject("Instance name required")
    }
}

let awsConfig
function configureFromFile(filePath) {
    AWS.config.loadFromPath('./awsConfig.json')
    awsConfig = JSON.parse(fs.readFileSync(filePath, "utf8"))
}

function getConfig() { return awsConfig }

module.exports = {instanceFromArgs, createInstance, destroyInstance, configureFromFile, getConfig}