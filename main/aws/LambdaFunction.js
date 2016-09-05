let fs = require('fs')
let AwsResource = require('./AwsResource')
let Lambda = () => require('./Lambda')
const {retry} = require('./Util')

module.exports = class LambdaFunction extends AwsResource {
    constructor(lambda, nameInEnv, codeZipFile) {
        super(lambda, nameInEnv)
        this.codeZipFile = codeZipFile
        this.role = null
        this.invokedBy = null
    }

    withRole(role) {
        this.role = role
        return this
    }

    canBeInvokedBy(service) {
        this.invokedBy = service
        return this
    }

    get arn() {
        return `arn:aws:lambda:${this.instance.region}:${this.instance.accountId}:function:${this.name}`
    }

    requestResource() {
        return this.aws.getFunction({FunctionName: this.name}).promise()
    }

    createResource() {
        let zipBuffer = fs.readFileSync(this.codeZipFile)
        var params = {
            Code: {
                ZipFile: zipBuffer
            },
            FunctionName: this.name,
            Handler: 'index.handler',
            Role: this.role.arn,
            Runtime: 'nodejs4.3',
            MemorySize: 128
        }

        return this.role.create().then( () => retry( () => this.aws.createFunction(params).promise() ) )
    }


    updateResource() {
        let zipBuffer = fs.readFileSync(this.codeZipFile)
        var params = {
            FunctionName: this.name,
            ZipFile: zipBuffer
        }
        return this.aws.updateFunctionCode(params).promise()
    }

    postCreateResource() {
        if (this.invokedBy) {
            let service = this.invokedBy.awsServiceName
            var params = {
                Action: Lambda().invoke,
                FunctionName: this.name,
                Principal: service,
                StatementId: `${service.replace(/\./g, '_')}CanInvoke`,
                SourceAccount: this.resourceFactory.instance.accountId
            }
            return this.aws.addPermission(params).promise().then( () => this )
        } else {
            return Promise.resolve(this)
        }
    }

    destroyResource() {
        return this.aws.deleteFunction({FunctionName: this.name}).promise()
    }

    get resourceNotFoundCode() {
        return 'ResourceNotFoundException'
    }

    get logDescription() {
        return `Lambda Function ${this.name}`
    }

    updateFromResource(data) {
        // nothing to do
    }


}

