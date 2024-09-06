import { Parameter, Configuration } from "./CommonProvider";

export type IdentityConstructor = new () => IdentityProvider;

export abstract class IdentityProvider {
    abstract name: string; // 服务名称
    abstract type: string; // 服务类型，例如 'dlufl_undergrad'
    abstract description: string; // 服务描述
    abstract icon: string; // 服务图标
    abstract params: Parameter[]; // 服务所需的参数

    protected configuration: Configuration = {}; // 服务的配置

    // 构造函数，初始化配置并进行验证
    protected constructor() {}

    // 抽象方法，必须由子类实现
    abstract getTokenByParams(params: any): Promise<{ success: boolean; data?: any; message?: string }>;
    abstract validateToken(token: any): Promise<{ success: boolean; message?: string }>;
    abstract getInfoByToken(token: any): Promise<{ success: boolean; data?: any; extra?: any; message?: string }>;
    abstract authorizeServiceByToken(token: any, service: any): Promise<{ success: boolean; data?: any; message?: string }>;

    // 检查服务配置的有效性
    public init(config: Configuration): boolean {
        if (!config) {
            return false; // 如果参数为空
        }
        for (const param of this.params) {
            if (param.required && !config[param.fieldName]) {
                return false; // 如果必填参数缺失，则返回false
            }
        }
        this.configuration = config;
        return true; // 所有必填参数都存在时返回true
    }

    // 共有的方法实现
    example(): void {
        console.log("This is the shared method implementation");
    }
}