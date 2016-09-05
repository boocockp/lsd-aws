const fs = require('fs')
const mime = require('mime')
const AwsResource = require('./AwsResource')

class ObjectInS3 extends AwsResource {

    constructor(s3, bucket, key, content, contentType, extraParams) {
        super(s3, key)
        Object.assign(this, {bucket, key, _content: content, _contentType: contentType, extraParams})
    }

    get name() {
        return this.key
    }

    get arn() {
        return `${this.bucket.arn}/${this.key}`
    }

    get content() {
        const contentSupplied = typeof this._content === "function" ? this._content() : this._content

        if (typeof contentSupplied === 'string') {
            return contentSupplied
        }

        if (contentSupplied instanceof ObjectInS3.File) {
            return contentSupplied.readStream()
        }

        if (typeof contentSupplied === 'object') {
            return JSON.stringify(contentSupplied)
        }
    }

    get contentType() {
        if (typeof this._contentType === 'string') {
            return this._contentType
        }

        if (this._content instanceof ObjectInS3.File) {
            return this._content.contentType
        }

        return null
    }

    requestResource() {
        return this.aws.headObject({Bucket: this.bucket.name, Key: this.key}).promise()
    }

    createResource() {
        return this.bucket.create()
            .then( () => this.aws.putObject({Bucket: this.bucket.name, Key: this.key, Body: this.content, ContentType: this.contentType}).promise() )
    }

    destroyResource() {
        return this.aws.deleteObject({Bucket: this.name, Key: this.key}).promise()
    }

    get resourceNotFoundCode() {
        return ['NotFound', 'NoSuchBucket']
    }

    updateFromResource(data) {
        // nothing to do
    }

    get logDescription() {
        return `Object ${this.bucket.name}/${this.key}`
    }

}

ObjectInS3.File = class File {
    constructor(fullPath) {
        this.path = fullPath
    }

    readStream() {
        return fs.createReadStream(this.path)
    }

    get contentType() {
        return mime.lookup(this.path)
    }
}

module.exports = ObjectInS3
