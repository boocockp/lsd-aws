const AwsResource = require('./AwsResource')
let {logError} = require('./Util')

class IdentityPool extends AwsResource {
    constructor(cognito, nameInEnv, googleClientId) {
        super(cognito, nameInEnv)
        this.googleClientId = googleClientId
        this.identityPoolId = null
    }

    get arn() {
        if (!this.identityPoolId) {
            throw new Error(`IdentityPool ${this.name}: identityPoolId not obtained`)
    }
        const {region, accountId} = this.instance
        return `arn:aws:cognito-identity:${region}:${accountId}:identitypool/${this.identityPoolId}`
    }

    authRole(role) {
        this._authRole = role
        return this
    }

    requestResource() {
        const findPoolForName = (data) => {
            const pool = data.IdentityPools.find((it) => it.IdentityPoolName === this.name)
            if (!pool) {
                throw {code: this.resourceNotFoundCode}
            }

            return pool
        }
        return this.aws.listIdentityPools({MaxResults: 60}).promise().then(findPoolForName, logError)
    }

    createResource() {
        const params = {
            AllowUnauthenticatedIdentities: false,
            IdentityPoolName: this.name,
            SupportedLoginProviders: {
                'accounts.google.com': this.googleClientId
            }
        }
        return this.aws.createIdentityPool(params).promise()
    }

    destroyResource() {
        return this.aws.deleteIdentityPool({IdentityPoolId: this.identityPoolId}).promise()
    }

    postCreateResource() {
        const params = {
            IdentityPoolId: this.identityPoolId,
            Roles: {
                'authenticated': `arn:aws:iam::${this.instance.accountId}:role/${this._authRole.name}`
            }
        }
        return this.aws.setIdentityPoolRoles(params).promise()
    }

    get resourceNotFoundCode() {
        return 'NoSuchEntity'
    }

    updateFromResource(data) {
        this.identityPoolId = data.IdentityPoolId
    }


    get logDescription() {
        return `${super.logDescription} ${this.identityPoolId}`
    }
}

module.exports = IdentityPool

