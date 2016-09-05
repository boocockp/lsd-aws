const AwsResource = require('./AwsResource');
const S3 = require('./S3');
const {arnFromResource}  = require('./Util');

class Policy extends AwsResource {
    constructor(iam, nameInEnv) {
        super(iam, nameInEnv);
        this._statements = [];
    }

    get arn() {
        return `arn:aws:iam::${this.instance.accountId}:policy/${this.name}`;
    }

    allow(resource, ...actions) {
        this._statements.push({Effect: "Allow", Resource: arnFromResource(resource), Action: actions});
        if (actions.includes(S3.getObject)) {
            this.allowListBucket(resource)
        }
        return this;
    }

    allowListBucket(resource) {
        const arn = arnFromResource(resource)
        const bucketArn = arn.split("/")[0]
        const path = arn.includes("/") ? arn.replace(`${bucketArn}/`, "") : ""
        const listStatement = {Effect: "Allow", Resource: bucketArn, Action: S3.listBucket}
        if (path && path !== "*") {
            listStatement.Condition = {StringLike: {"s3:prefix": [path]}}
        }
        this._statements.push(listStatement);
    }

    requestResource() {
        return this.aws.getPolicy({PolicyArn: this.arn}).promise()
    }

    createResource() {
        let params = {
            PolicyDocument: JSON.stringify(this.policyDocument),
            PolicyName: this.name
        };

        return this.aws.createPolicy(params).promise();
    }

    destroyResource() {
        return this.aws.deletePolicy({PolicyArn: this.arn}).promise()
    }

    get resourceNotFoundCode() {
        return 'NoSuchEntity'
    }


    updateFromResource(data) {
        this.policyId = data.Policy.PolicyId;
    }

    get policyDocument() {
        return {
            Version: "2012-10-17",
            Statement: this._statements
        };
    }

    get logDescription() {
        return `Policy ${this.name} ${this.policyId}`;
    }
}

Policy.cognitoIdPlaceholder = "${cognito-identity.amazonaws.com:sub}"

module.exports = Policy
