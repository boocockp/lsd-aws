let AWS = require('aws-sdk')
let Bucket = require('./Bucket')
let ObjectInS3 = require('./ObjectInS3')
let Folder = require('./Folder')

module.exports = class S3 {
    constructor(instance) {
        this.instance = instance
        this.s3 = this.awsService = new AWS.S3()
    }

    static get awsServiceName() { return "s3.amazonaws.com" }
    static get listBucket() { return "s3:ListBucket" }
    static get getObject() { return "s3:GetObject" }
    static get deleteObject() { return "s3:DeleteObject" }
    static get putObject() { return "s3:PutObject" }
    static get objectCreated() { return "s3:ObjectCreated:*" }

    bucket(name) {
        return this.instance.add(new Bucket(this, name))
    }
    
    object(bucket, key, content, contentType, extraParams) {
        return this.instance.add(new ObjectInS3(this, bucket, key, content, contentType, extraParams))
    }

    folder(bucket, path, sourceFolder) {
        return this.instance.add(new Folder(this, bucket, path, sourceFolder))
    }
}
