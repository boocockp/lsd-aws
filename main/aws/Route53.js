let AWS = require('aws-sdk');
let DnsRecord = require('./DnsRecord');

module.exports = class Route53 {
    constructor(env) {
        this.instance = env;
        this.route53 = this.awsService = new AWS.Route53();
    }

    static get awsServiceName() { return "route53.amazonaws.com"; }

    dnsRecord(type, domainName, target) {
        return this.instance.add(new DnsRecord(this, type, domainName, target));
    }
};

