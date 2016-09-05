let AWS = require('aws-sdk');
let ReceiptRuleSet = require('./ReceiptRuleSet');
let ReceiptRule = require('./ReceiptRule');

module.exports = class SES {

    constructor(instance) {
        this.instance = instance;
        this.ses = this.awsService = new AWS.SES();
    }


    static get awsServiceName() { return "ses.amazonaws.com"; }

    // static get allLogs() { return "arn:aws:logs:*:*:*" }
    // static get createLogGroup() { return "logs:CreateLogGroup" }
    // static get createLogStream() { return "logs:CreateLogStream" }
    // static get putLogEvents() { return "logs:PutLogEvents" }


    receiptRuleSet(name) {
        return this.instance.add(new ReceiptRuleSet(this, name));
    }

    receiptRule(ruleSet, name) {
        return this.instance.add(new ReceiptRule(this, ruleSet, name));
    }
};

