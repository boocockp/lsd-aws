const AwsResource = require('./AwsResource')

class Role extends AwsResource {
    constructor(iam, nameInEnv) {
        super(iam, nameInEnv)
        this.policies = []
        this.trustStatements = []
    }

    trust(service) {
        this.trustedService = service.awsServiceName
        this.trustStatements.push({
            Effect: "Allow",
            Principal: {
                Service: service.awsServiceName
            },
            Action: "sts:AssumeRole"
        })
        return this
    }

    trustIdentityPool(pool) {
        this.trustedIdentityPool = pool
        return this
    }

    identityPoolTrustStatement(pool) {
        return {
            Effect: "Allow",
            Principal: {
                Federated: "cognito-identity.amazonaws.com"
            },
            Action: "sts:AssumeRoleWithWebIdentity",
            Condition: {
                StringEquals: {
                    "cognito-identity.amazonaws.com:aud": pool.identityPoolId
                },
                "ForAnyValue:StringLike": {
                    "cognito-identity.amazonaws.com:amr": "authenticated"
                }
            }
        }
    }

    withPolicies(...policies) {
        this.policies = this.policies.concat(policies)
        return this
    }

    get arn() {
        return `arn:aws:iam::${this.instance.accountId}:role/${this.name}`
    }

    requestResource() {
        return this.aws.getRole({RoleName: this.name}).promise()
    }

    createResource() {
        const otherResourcesReady = this.trustedIdentityPool ? this.trustedIdentityPool.create() : Promise.resolve()

        return otherResourcesReady.then( () => {
            const params = {
                AssumeRolePolicyDocument: JSON.stringify(this.trustPolicyDocument),
                RoleName: this.name
            }

            return this.aws.createRole(params).promise()
        })
    }

    postCreateResource() {
        let attachPolicy = (policy) => {
            return policy.create().then(() => this.aws.attachRolePolicy({
                PolicyArn: policy.arn,
                RoleName: this.name
            }).promise())
        }

        return Promise.all(this.policies.map(attachPolicy)).then(() => this)
    }

    destroyResource() {
        const listPolicyArns = () => {
            return this.aws.listAttachedRolePolicies({RoleName: this.name}).promise()
                .then( (data) => data.AttachedPolicies.map( ap => ap.PolicyArn ))
        }
        const detachPolicy = (arn) => {
            return this.aws.detachRolePolicy({PolicyArn: arn, RoleName: this.name}).promise()
        }

        const detachPolicies = listPolicyArns().then( arns => Promise.all( arns.map( detachPolicy )))
        return detachPolicies.then( () => this.aws.deleteRole({RoleName: this.name}).promise() )
    }

    get resourceNotFoundCode() {
        return 'NoSuchEntity'
    }

    updateFromResource(data) {
        this.roleId = data.Role.RoleId
    }

    get trustPolicyDocument() {
        const trustStatements = this.trustStatements
        if (this.trustedIdentityPool) {
            trustStatements.push(this.identityPoolTrustStatement(this.trustedIdentityPool))
        }
        return {
            Version: "2012-10-17",
            Statement: trustStatements
        }
    }

    get logDescription() {
        return `${super.logDescription} ${this.roleId}`
    }
}

module.exports = Role
