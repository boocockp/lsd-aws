let AwsResource = require('./AwsResource');

module.exports = class DnsRecord extends AwsResource {

    constructor(route53, type, domainName, target) {
        super(route53, `${type}_${domainName}`);
        this.ruleSet = ruleSet;
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
                Recipients: this._recipients,
                Rule: {
                    Name: this.name,
                    Enabled: true,
                    Actions: this.actions
                }
            };
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
        return `DnsRecord ${this.name}`;
    }
};

