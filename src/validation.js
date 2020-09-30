function isArrayAllStrings(args) {
    return args.every((arg) => typeof arg === 'string');
}

export { isArrayAllStrings };
