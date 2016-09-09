LSD AWS
=======

A set of components to simplify writing scripts to set up AWS objects for [LSD](https://github.com/lightweight-software-development/lsd-overview) applications.

It does not attempt to be a comprehensive AWS scripting tool - it includes only the AWS services
and types of configuration that are needed in LSD applications.  However, it should be possible to extend it to cover any AWS service.

For an application, you can create as many *instances* as you want.  Each instance has the same set of AWS objects configured, 
but with a unique name for the instance.  You can create as many instances as you like, up to the limits of your AWS account,
and destroy them when they are no longer needed.  There are no charges for setting up AWS objects - just for using them.  
You could have instances such as "qa", "demo", "prod", like a traditional series of development environments,
but you could also create one-off instances like "jims_spike2", or just use a short Git commit id to name the instance, like "a2ef".

## How it works
LSD AWS includes classes to represent:
- An instance of the application
- The AWS services, such as S3 or Lambda
- The definitions of the objects to be created, such as Bucket or Role

The instance and service objects act as factories to create the object definitions, so that they are all known to the instance.
Object definitions can also refer to each other.
A complete instance can have either the `create()` or `destroy()` method called on it to set up or tear down all the objects.
The operations are done in parallel as much as possible, so creating instances is fairly quick - typically 30-60 seconds.

### Naming convention
The AWS objects created have a name of the form <application-name>_<instance-name>_<object-name>, where:
- application-name is a name for the whole application eg MyToDoList
- instance-name is a name for one instance
- object-name is a name for the purpose of the object in your application

## How to write a deployment script
- Copy the files from the `templates` directory to your project
- Edit appConfig.json and awsConfig.json to contain the correct details for your project
- *Add appConfig.json and awsConfig.json to your .gitignore so they are not checked in accidentally*
- Edit `defineInstance.js` to set up the objects you need. This is just normal JavaScript code.  It must return the instance object.
- Object definitions are created by the factory methods on the service objects obtained from the instance eg `s3.bucket()`
- The object definition classes have various methods that can be chained in a fluent builder style
- If one object definition needs to refer to another, assign the object definition to a variable
- *More documentation needed on the object definition classes and their methods*

## Running a deployment script
On the command line, run `node createInstance.js <env-name>` to set up an instance, and `node destroyInstance.js <env-name>` to tear down an instance.

If you run `createInstance.js` when the instance already exists, it will just report that all the objects are found and not do anything.  
LSD AWS does not currently try to update existing objects, except for Lambda Functions.  If you change a definition, you will usually
need to destroy the instance and start again.  Instance creation occasionally fails due to timing problems 
(AWS can report an object as created but it is not ready for use for several seconds).  If this happens, destroy the instance and recreate it.

If you are repeatedly destroying and recreating an instance with the same name during development, the `node recreateInstance.js <env-name>` script may be useful.

## An example defineInstance.js 

```javascript
const fs = require('fs')

const {Instance, S3, Lambda, Policy, Tools} = require('lsd-aws')
const Apps = require('./path/to/Apps')

function defineInstance(instanceName) {
    Tools.configureFromFile('./awsConfig.json')
    const appConfig = JSON.parse(fs.readFileSync('./appConfig.json', "utf8"))

    const awsConfig = Tools.getConfig()
    const instance = new Instance(appConfig.appName, instanceName, awsConfig.accountId, awsConfig.hostedZoneId, appConfig.domain)
    const {s3, cognito, iam, lambda, route53} = instance

    const userArea = Apps.defaultUserAreaPrefix, sharedArea = Apps.defaultSharedAreaPrefix
    const allUserAreas = `${appConfig.appName}/*/${userArea}`
    const mainDataSetUserAreas = `${appConfig.appName}/main/${userArea}`
    const websiteHostName = `${instanceName}.${appConfig.domain}`
    const websiteBucket = s3.bucket().forWebsite(websiteHostName)
    route53.dnsRecord("A", websiteHostName, websiteBucket)
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

    dataBucket.notifyLambda(promoter, S3.objectCreated, mainDataSetUserAreas)

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

```