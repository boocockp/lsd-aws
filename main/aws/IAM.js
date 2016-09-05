let AWS = require('aws-sdk');
let Policy = require('./Policy');
let Role = require('./Role');

module.exports = class IAM {

    constructor(env) {
        this.instance = env;
        this.iam = this.awsService = new AWS.IAM();
        this.basicExecution = this.policy("basicExecution").allow(IAM.allLogs, IAM.createLogGroup, IAM.createLogStream, IAM.putLogEvents);
    }

    static get allLogs() { return "arn:aws:logs:*:*:*" }
    static get createLogGroup() { return "logs:CreateLogGroup" }
    static get createLogStream() { return "logs:CreateLogStream" }
    static get putLogEvents() { return "logs:PutLogEvents" }


    policy(name) {
        return this.instance.add(new Policy(this, name));
    }

    role(name) {
        return this.instance.add(new Role(this, name));
    }
}


