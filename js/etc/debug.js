var allowDebugLogging = true;

function log(message) {
    if (allowDebugLogging) {
        console.log(message);
    }
}

function stringifyBool(value) {
    return value ? "true" : "false";
}
