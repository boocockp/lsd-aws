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
        defineInstanceFunction(instanceName).create().then( () => console.log(`Instance ${instanceName} created`))
    }
}

function destroyInstance(defineInstanceFunction) {
    const instanceName = instanceFromArgs()
    if (instanceName) {
        defineInstanceFunction(instanceName).destroy().then( () => console.log(`Instance ${instanceName} destroyed`))
    }
}

module.exports = {instanceFromArgs, createInstance, destroyInstance}