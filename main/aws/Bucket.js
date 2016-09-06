let AwsResource = require('./AwsResource')
let {arnFromResource}  = require('./Util')

module.exports = class Bucket extends AwsResource {

    constructor(s3, nameInEnv) {
        super(s3, nameInEnv)
        this._statements = []
        this._lambdaConfigurations = []
    }

    get name() {
        return this._websiteHostName ? this._websiteHostName : super.name.replace(/_/g, '-')
    }

    get arn() {
        return `arn:aws:s3:::${this.name}`
    }

    objectsPrefixed(prefix) {
        return `${this.arn}/${prefix}/*`
    }

    get allObjects() {
        return `${this.arn}/*`
    }

    allowServiceFromThisAccount(service, resource, ...actions) {
        this._statements.push({
            Effect: "Allow",
            Principal: {
                Service: [
                    service
                ]
            },
            Resource: arnFromResource(resource),
            Action: actions,
            Condition: {
                StringEquals: {
                    "aws:Referer": this.instance.accountId
                }
            }
        })
        return this
    }

    allowCors(...methods) {
        this.corsMethods = methods.length ? methods : ['GET', 'HEAD', 'PUT']
        return this
    }

    forWebsite(hostName) {
        this._forWebsite = true
        this._websiteHostName = hostName
        this._statements.push({
            Effect: "Allow",
            Principal: "*",
            Action: ["s3:GetObject"],
            Resource: [`${this.arn}/*`]
        })
        return this
    }

    notifyLambda(lambdaFunction, event, prefix) {
        this._lambdaConfigurations.push({
            Id: `${lambdaFunction.name}_on_${event.replace(/[:*]/g, "")}`,
            Events: [event],
            LambdaFunctionArn: lambdaFunction.arn,
            Filter: {
                Key: {
                    FilterRules: [
                        {
                            Name: 'prefix',
                            Value: prefix
                        },
                    ]
                }
            }
        })

        this.dependsOn(lambdaFunction)
    }

    archiveOnDestroy(onOff = true) {
        this._archiveOnDestroy = onOff
        return this
    }

    requestResource() {
        return this.aws.headBucket({Bucket: this.name}).promise()
    }

    createResource() {
        return this.aws.createBucket({Bucket: this.name}).promise()
    }

    postCreateResource() {
        return this._configurePolicy()
            .then(this._configureCors.bind(this))
            .then(this._configureBucketAsWebsite.bind(this))
            .then(this._configureLambdaNotifications.bind(this))
    }

    destroyResource() {
        const bucketName = this.name, s3 = this.aws

        function getBucketKeys() {
            return s3.listObjects({Bucket: bucketName}).promise()
                .then((data) => {
                    if (data.IsTruncated) {
                        throw new Error("More than 1000 keys in bucket " + bucketName)
                    }
                    return data.Contents.map(c => c.Key)
                })
        }

        const copyBucket = () => {
            const timestamp = new Date().toISOString().replace(/\.\d\d\dZ/, "").replace(/:/g, "").replace("T", "-")
            const archiveBucketName = `${this.name}-${timestamp}`
            console.log(`Archiving bucket ${this.name} to ${archiveBucketName}`)
            return this.aws.createBucket({Bucket: archiveBucketName}).promise()
                .then(() => getBucketKeys()
                    .then(keys => {
                        if (keys.length) {
                            const copyPromises = keys.map(k => ({
                                Bucket: archiveBucketName,
                                Key: k,
                                CopySource: encodeURI(`${this.name}/${k}`)
                            }))
                                .map(params => this.aws.copyObject(params).promise())
                            return Promise.all(copyPromises)
                        } else {
                            return Promise.resolve()
                        }
                    }))
        }

        const copyBucketIfRequired = () => {
            return this._archiveOnDestroy ? copyBucket() : Promise.resolve()
        }

        function emptyBucket() {
            return getBucketKeys()
                .then(keys => {
                    if (keys.length) {
                        const objects = keys.map(k => ({Key: k}));
                        return s3.deleteObjects({Bucket: bucketName, Delete: {Objects: objects}}).promise()
                    } else {
                        return Promise.resolve()
                    }
                })
        }


        return copyBucketIfRequired().then(() => emptyBucket()).then(() => this.aws.deleteBucket({Bucket: bucketName}).promise())
    }

    get resourceNotFoundCode() {
        return ['NoSuchBucket', 'NotFound']
    }

    updateFromResource(data) {
        // nothing to do
    }

    get logDescription() {
        return `Bucket ${this.name}`
    }

    _configurePolicy() {
        if (!this._statements.length) {
            return Promise.resolve()
        }
        const policy = {
            "Version": "2012-10-17",
            "Statement": this._statements
        }

        return this.aws.putBucketPolicy({
            Bucket: this.name,
            Policy: JSON.stringify(policy)
        }).promise()
    }

    _configureCors() {
        if (!(this.corsMethods && this.corsMethods.length)) {
            return Promise.resolve()
        }
        var params = {
            Bucket: this.name,
            CORSConfiguration: {
                CORSRules: [
                    {
                        AllowedMethods: this.corsMethods,
                        AllowedOrigins: ['*'],
                        AllowedHeaders: ['*'],
                        MaxAgeSeconds: 300
                    }
                ]
            }
        }
        return this.aws.putBucketCors(params).promise()

    }

    _configureBucketAsWebsite() {
        if (!this._forWebsite) {
            return Promise.resolve()
        }

        return this.aws.putBucketWebsite({
            Bucket: this.name,
            WebsiteConfiguration: {
                IndexDocument: {
                    Suffix: 'index.html'
                }
            }
        }).promise()
    }

    _configureLambdaNotifications() {
        if (!this._lambdaConfigurations.length) {
            return Promise.resolve()
        }

        const params = {
            Bucket: this.name,
            NotificationConfiguration: {
                LambdaFunctionConfigurations: this._lambdaConfigurations
            }
        };

        return this.aws.putBucketNotificationConfiguration(params).promise()
    }


}

