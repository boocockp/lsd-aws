let AwsResource = require('./AwsResource');

module.exports = class ReceiptRule extends AwsResource {

    constructor(ses, ruleSet, nameInEnv) {
        super(ses, nameInEnv);
        this.ruleSet = ruleSet;
        this._resources = [ruleSet];
        this.actions = [];
        this._recipients = [];
    }

    withS3Action(bucket, prefix) {
        this._resources.push(bucket);
        this.actions.push({
            S3Action: {
                BucketName: bucket.name,
                ObjectKeyPrefix: prefix
            }
        });
        return this;
    }

    withLambdaAction(lambdaFunction) {
        this._resources.push(lambdaFunction);
        this.actions.push({
            LambdaAction: {
                FunctionArn: lambdaFunction.arn
            }
        });
        return this;
    }

    withRecipient(recipient) {
        this._recipients.push(recipient);
    }

    get arn() {
        return null;
    }

    requestResource() {
        return this.aws.describeReceiptRule({RuleName: this.name, RuleSetName: this.ruleSet.name}).promise()
    }

    createResource() {
        return Promise.all(this._resources.map( r => r.create() )).then(() => {
            const params = {
                RuleSetName: this.ruleSet.name,
                Rule: {
                    Name: this.name,
                    Enabled: true,
                    Actions: this.actions
                }
            };
            if (this._recipients.length) {
                params.Recipients = this._recipients;
            }
            return this.aws.createReceiptRule(params).promise()
        });
    }

    get resourceNotFoundCode() {
        return 'RuleDoesNotExist'
    }

    updateFromResource(data) {
        // nothing to do
    }

    get logDescription() {
        return `ReceiptRule ${this.name}`;
    }
};

