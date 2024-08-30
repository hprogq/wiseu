export interface LoginParameter {
    fieldName: string;
    fieldType: string; // 如 'string', 'password', 'email' 等
    displayName: string; // 显示在前端的名称
    required: boolean; // 是否必填
    description?: string; // 可选的描述信息
}

export interface IdentityProvider {
    getToken(loginInfo: any): Promise<{ success: boolean; token?: any; message?: string }>;
    updateToken(identityId: string): Promise<{ success: boolean; token?: any; message?: string }>;
    authorize(identityId: string, serviceUrl: string, cookieList: string[]): Promise<{ success: boolean; cookie?: string; message?: string }>;
    getUserInfo(identityId: string): Promise<{ success: boolean; data?: any; message?: string }>;
    getLoginParameters(): LoginParameter[];
}