export interface Parameter {
    fieldName: string;
    fieldType: string; // 如 'string', 'password', 'email' 等
    displayName: string; // 显示在前端的名称
    required: boolean; // 是否必填
    description?: string; // 可选的描述信息
}

export abstract class IdentityProvider {
    // 抽象方法，必须由子类实现
    abstract getTokenByParams(params: any): Promise<{ success: boolean; data?: any; message?: string }>;
    abstract validateToken(token: any): Promise<{ success: boolean; message?: string }>;
    abstract getInfoByToken(token: any): Promise<{ success: boolean; data?: any; extra?: any; message?: string }>;
    abstract authorizeServiceByToken(token: any, service: any): Promise<{ success: boolean; data?: any; message?: string }>;
    abstract getParams(): Parameter[];

    // 共有的方法实现
    example(): void {
        console.log("This is the shared method implementation");
    }
}