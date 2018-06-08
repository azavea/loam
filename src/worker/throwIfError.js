export default function throwIfError(errorHandling, cleanupCallback) {
    const errorType = errorHandling.CPLGetLastErrorType();

    // Check for errors; clean up and throw if error is detected
    if (errorType === errorHandling.CPLErr.CEFailure ||
            errorType === errorHandling.CPLErr.CEFatal) {
        const message = errorHandling.CPLGetLastErrorMsg();

        cleanupCallback();
        throw new Error(message);
    }
}
