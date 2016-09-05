let AwsResource = require('./AwsResource');

module.exports = class ReceiptRuleSet extends AwsResource {

    constructor(ses, nameInEnv) {
        super(ses, nameInEnv);
    }

    get arn() {
        return null;
    }

    requestResource() {
        return this.aws.describeReceiptRuleSet({RuleSetName: this.name}).promise()
    }

    createResource() {
        return this.aws.createReceiptRuleSet({RuleSetName: this.name}).promise().catch( (err) => console.log('createResource', err) )
    }

    postCreateResource() {
        return this.aws.setActiveReceiptRuleSet({RuleSetName: this.name}).promise().catch( (err) => console.log('postCreateResource', err) )
    }

    get resourceNotFoundCode() {
        return 'RuleSetDoesNotExist'
    }

    updateFromResource(data) {
        // nothing to do
    }

    get logDescription() {
        return `ReceiptRuleSet ${this.name}`;
    }
};

