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
};