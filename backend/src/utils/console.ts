export const printInfo = (message: string) => {
    console.info(`\u001b[34m[INFO]\u001b[0m ${message}`);
}

export const printError = (message: string) => {
    console.error(`\u001b[31m[ERROR]\u001b[0m ${message}`);
}

export const printWarning = (message: string) => {
    console.warn(`\u001b[33m[WARNING]\u001b[0m ${message}`);
}