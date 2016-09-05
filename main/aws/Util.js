module.exports =  class Util {
    static logError(err, action, ...resourceNames) {
        console.error("FAILED", action, ...resourceNames, err);
    }

    static arnFromResource(r) {
        if (typeof r == 'object') {
            return r.arn;
        }
        if (typeof r == 'string') {
            return r;
        }
        throw new Error("Cannot get arn from " + r);
    }

    static retry(operation, timeout = 10000) {
        const startTime = Date.now()
        return new Promise(function(resolve, reject) {
            function handleResult(result) {
                // console.log('handleResult: resolving')
                resolve(result)
            }

            function handleError(err) {
                if (Date.now() - startTime > timeout) {
                    // console.log('handleError: rejecting')
                    reject(err)
                } else {
                    // console.log('handleError: retrying')
                    setTimeout(tryOperation, 1500)
                }
            }

            function tryOperation() {
                // console.log('tryOperation')
                try {
                    const result = operation()
                    if (result instanceof Promise) {
                        // console.log('tryOperation: Promise')
                        result.then( handleResult, handleError )
                    } else {
                        // console.log('tryOperation: non-Promise')
                        handleResult(result)
                    }
                } catch(e) {
                    // console.log('tryOperation: catch')
                    handleError(e)
                }
            }

            tryOperation()
        })
    }

    static wait(millis) {
        return new Promise(function(resolve) {
            setTimeout( resolve, millis )
        })
    }

}