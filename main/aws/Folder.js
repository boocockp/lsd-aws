const AwsResource = require('./AwsResource')
const ObjectInS3 = require('./ObjectInS3')
const readdirRecursive = require('fs-readdir-recursive')
const fspath = require('path')

module.exports = class Folder extends AwsResource {

    constructor(s3, bucket, path, sourceFolder) {
        super(s3, path)
        Object.assign(this, {bucket, path, sourceFolder})
    }

    get name() {
        return this.path
    }

    get arn() {
        return `${this.bucket.arn}/${this.path}`
    }

    requestResource() {
        return this.aws.listObjectsV2({Bucket: this.bucket.name, Prefix: this.path + "/", MaxKeys: 1}).promise()
            .then( data => {
                if (data.KeyCount) {
                    return true
                } else {
                    throw {code: 'NotFound'}
                }
            })
    }

    createResource() {
        const s3 = this.resourceFactory, bucket = this.bucket, sourceFolder = this.sourceFolder
        const findAllFiles = () => {
            return Promise.resolve(readdirRecursive(this.sourceFolder))
        }

        const createObjects = () => {
            return findAllFiles()
                .then(files => files.map( f => {
                    return new ObjectInS3(s3, bucket, f, new ObjectInS3.File(fspath.join(sourceFolder, f)))
                }))
                .then( objects => Promise.all( objects.map( o => o.create() )) )
        }

        return this.bucket.create().then(createObjects)
    }

    destroyResource() {
        return Promise.resolve()  // TODO
    }

    get resourceNotFoundCode() {
        return ['NotFound', 'NoSuchBucket']
    }

    updateFromResource(data) {
        // nothing to do
    }

    get logDescription() {
        return `Folder ${this.bucket.name}/${this.path}`
    }

}

function uploadWebsiteFile(bucketName, path, contentType, fileContent, extraParams = {}) {
    var params = Object.assign({
        Bucket: bucketName,
        Key: path,
        ACL: 'public-read',
        Body: fileContent,
        ContentType: contentType
    }, extraParams)
    return s3.putObject(params).promise()
}

function uploadWebsiteDir(bucketName, path) {
    return findAllFiles(path)
        .then(files => {
            let uploadPromises = files.map(fileName => {
                let fullPath = fspath.join(path, fileName)
                return uploadWebsiteFile(bucketName, fileName, mime.lookup(fullPath), fs.createReadStream(fullPath))
            })

            return Promise.all(uploadPromises)
        }).then(...logResult('Upload files to', bucketName, 'from', path))
}

