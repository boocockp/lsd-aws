let AWS = require('aws-sdk')

const SES = require('./SES')
const S3 = require('./S3')
const IAM = require('./IAM')
const Cognito = require('./Cognito')
const Lambda = require('./Lambda')
const Role = require('./Role')
const ObjectInS3 = require('./ObjectInS3')

function logResult(r) {
    console.log(r.resultDescription)
}

module.exports = class Instance {

    constructor(appName, instanceName, accountId) {
        Object.assign(this, {appName, instanceName, accountId})
        this.region = AWS.config.region
        console.log("Account Id", this.accountId, "Region", this.region)
        this.resources = []
    }

    get name() {
        return this.appName + "_" + this.instanceName
    }

    add(resource) {
        this.resources.push(resource)
        return resource
    }

    create() {
        return Promise.all(this.resources.map(r => r.create().then(logResult)))
    }

    destroy() {
        const roles = this.resources.filter( r => r instanceof Role)
        const objects = this.resources.filter( r => r instanceof ObjectInS3)
        const others = this.resources.filter( r => ![].concat(roles, objects).includes(r))
        var destroyResources = function (rs) {
            return Promise.all(rs.map(r => r.destroy().then(logResult)))
        }
        return destroyResources(roles)
            .then(() => destroyResources(objects))
            .then(() => destroyResources(others))
    }

    get s3() { return this._s3 || (this._s3 = new S3(this)) }
    get iam() { return this._iam || (this._iam = new IAM(this)) }
    get ses() { return this._ses || (this._ses = new SES(this)) }
    get cognito() { return this._cognito || (this._cognito = new Cognito(this)) }
    get lambda() { return this._lambda || (this._lambda = new Lambda(this)) }

}

