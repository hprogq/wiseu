export type Configuration = { [key: string]: string };
export const isConfiguration = (obj: any): boolean => {
    return typeof obj === 'object' && obj !== null && Object.values(obj).every(value => typeof value === 'string');
}

export interface Parameter {
    fieldName: string;
    fieldType: string; // 如 'string', 'password', 'email' 等
    displayName: string; // 显示在前端的名称
    required: boolean; // 是否必填
    description?: string; // 可选的描述信息
}