let AWS = require('aws-sdk')
let IdentityPool = require('./IdentityPool')

module.exports = class Cognito {

    constructor(instance) {
        this.instance = instance
        this.cognito = this.awsService = new AWS.CognitoIdentity()
    }

    identityPool(name, googleClientId) {
        return this.instance.add(new IdentityPool(this, name, googleClientId))
    }
}


