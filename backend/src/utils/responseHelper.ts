export function createResponse(success: boolean, message: string, data: any = null) {
    return {
        success,
        message,
        data,
    };
}

export interface Response {
    success: boolean;
    message: string;
    data: any;
}