const AwsResource = require('./AwsResource')
const Bucket = require('./Bucket')
let {logError} = require('./Util')

module.exports = class DnsRecord extends AwsResource {

    constructor(route53, type, hostname, target) {
        super(route53, `${type}_${hostname}`)
        this.type = type
        this.hostname = hostname
        this.target = target

        if (!target instanceof Bucket) {
            throw new Error("Target must be a Bucket")
        }
    }

    get arn() {
        return null;
    }

    get domainName() {
        const route53 = this.resourceFactory
        return `${this.hostname}.${route53.domainName}`
    }

    requestResource() {
        const route53 = this.resourceFactory
        const params = {
            HostedZoneId: route53.hostedZoneId,
            MaxItems: "1",
            StartRecordName: this.domainName,
            StartRecordType: this.type
        }
        const checkRecordSet = (data) => {
            if (data.length === 1) {
                return data.ResourceRecordSets[0]
            } else {
                throw {code: this.resourceNotFoundCode}
            }

        }
        return this.aws.listResourceRecordSets(params).promise().then(checkRecordSet, logError)
    }

    createResource() {
        // TODO only for website bucket
        const route53 = this.resourceFactory
        const region = route53.instance.region
        const params = {
            ChangeBatch: {
                Changes: [
                    {
                        Action: 'UPSERT',
                        ResourceRecordSet: {
                            Name: this.domainName,
                            Type: this.type,
                            AliasTarget: {
                                DNSName: `${this.target.name}.s3-website-${region}.amazonaws.com`,
                                EvaluateTargetHealth: false,
                                HostedZoneId: this._s3HostedZoneId(region)
                            }
                        }
                    }
                ],
                Comment: 'Created by LSD'
            },
            HostedZoneId: route53.hostedZoneId
        }

        return this.aws.changeResourceRecordSets(params).promise()
    }

    get resourceNotFoundCode() {
        return 'ResourceRecordSetNotExist'
    }

    updateFromResource(data) {
        // nothing to do
    }

    _s3HostedZoneId(region) {
        return {
            "us-east-1": "Z3AQBSTGFYJSTF",
            "us-west-1": "Z2F56UZL2M1ACD",
            "us-west-2": "Z3BJ6K6RIION7M",
            "ap-south-1": "Z11RGJOFQNVJUP",
            "ap-northeast-2": "Z3W03O7B5YMIYP",
            "ap-southeast-1": "Z3O0J2DXBE1FTB",
            "ap-southeast-2": "Z1WCIGYICN2BYD",
            "ap-northeast-1": "Z2M4EHUR26P7ZW",
            "eu-central-1": "Z21DNDUVLTQW6Q",
            "eu-west-1": "Z1BKCTXD74EZPE",
            "sa-east-1": "Z7KQH4QJS55SO"
        }[region]
    }
}

