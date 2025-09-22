export const isStringArray = async (value: any): Promise<boolean> => {
    return new Promise((resolve) => {
        if (Array.isArray(value)) {
            if (value.length == 0) {
                resolve(true);
            } else {
                var somethingIsNotString = false;
                for (const item of value) {
                    if (typeof item !== 'string') {
                        somethingIsNotString = true;
                        break;
                    }
                }
                if (!somethingIsNotString && value.length > 0) {
                    resolve(true);
                } else {
                    resolve(false);
                }
            }
        } else {
            resolve(false);
        }
    });
}
