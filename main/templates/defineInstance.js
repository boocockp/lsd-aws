const fs = require('fs')

const {Instance, S3, Lambda, Policy, Tools} = require('lsd-aws')
const Apps = require('../main/js/apps/Apps')

function defineInstance(instanceName) {
    Tools.configureFromFile('./awsConfig.json')
    const appConfig = JSON.parse(fs.readFileSync('./appConfig.json', "utf8"))

    const instance = new Instance(appConfig.appName, instanceName, Tools.getConfig().accountId)
    const {s3, cognito, iam, lambda} = instance

    const userArea = Apps.defaultUserAreaPrefix, sharedArea = Apps.defaultSharedAreaPrefix
    const allUserAreas = `${appConfig.appName}/*/${userArea}`
    const websiteBucket = s3.bucket("site").forWebsite()
    const dataBucket = s3.bucket("data").allowCors()
        .archiveOnDestroy(instanceName === "prod")
    const idPool = cognito.identityPool("idPool", appConfig.googleClientId)
    const userFolder = dataBucket.objectsPrefixed(`${allUserAreas}/${Policy.cognitoIdPlaceholder}`)
    const allUserFolders = dataBucket.objectsPrefixed(allUserAreas)
    const sharedFolder = dataBucket.objectsPrefixed(`${appConfig.appName}/*/${sharedArea}`)
    const folderAccessPolicy = iam.policy("userAccess")
        .allow(userFolder, S3.getObject, S3.putObject)
        .allow(sharedFolder, S3.getObject)
    const cognitoRole = iam.role("cognitoAuthRole").trustIdentityPool(idPool).withPolicies(folderAccessPolicy)
    idPool.authRole(cognitoRole)

    s3.object(websiteBucket, "config.json", () => config(appConfig, idPool, instanceName), "application/json").dependsOn(idPool)
    s3.folder(websiteBucket, "", "../build")

    const promoterPolicy = iam.policy("promoter")
        .allow(allUserFolders, S3.getObject, S3.deleteObject)
        .allow(sharedFolder, S3.getObject, S3.putObject);
    const promoterRole = iam.role("promoter").trust(Lambda).withPolicies(iam.basicExecution, promoterPolicy);
    const promoter = lambda.lambdaFunction("promoter", "../build_lambda/promoter/index.zip").withRole(promoterRole).canBeInvokedBy(S3)

    dataBucket.notifyLambda(promoter, S3.objectCreated, allUserAreas)

    return instance
}

function config(appConfig, idPool, instanceName) {
    const conf = {
        clientId: appConfig.googleClientId,
        identityPoolId: idPool.identityPoolId,
        instanceName
    }

    return JSON.stringify(conf, null, '  ')
}

module.exports = defineInstance
