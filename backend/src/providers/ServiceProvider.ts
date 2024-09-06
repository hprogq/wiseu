import { createResponse } from "../utils/responseHelper";
import { IIdentity } from "../models/Identity";
import { Parameter, Configuration } from "./CommonProvider";

export type ServiceConstructor = new () => ServiceProvider;

export abstract class ServiceProvider {
    abstract name: string; // 服务名称
    abstract type: string; // 服务类型，例如 'dlufl_library'
    abstract description: string; // 服务描述
    abstract icon: string; // 服务图标
    abstract category: string; // 服务分类，例如 'library'
    abstract identityType: string[]; // 依赖的身份类型列表
    abstract params: Parameter[]; // 服务所需的参数
    abstract interval: number; // 定时任务的执行间隔(s)，设置为0表示不执行定时任务
    abstract rag: boolean; // 是否支持 RAG 模型

    protected identityId: string = ""; // 服务关联的身份
    protected serviceId: string = "";
    protected configuration: Configuration = {}; // 服务的配置

    // 构造函数，初始化配置并进行验证
    protected constructor() {}

    abstract prompt(question: string): Promise<string>;

    // 抽象方法，更新数据（定时调用）
    abstract update(): Promise<void>;

    // 检查服务配置的有效性
    public async init(identityId: string, config: Configuration, serviceId: string = ''): Promise<boolean> {
        if (!config) {
            return false; // 如果参数为空
        }
        for (const param of this.params) {
            if (param.required && !config[param.fieldName]) {
                return false; // 如果必填参数缺失，则返回false
            }
        }
        this.configuration = config;
        this.identityId = identityId;
        this.serviceId = serviceId;
        return true; // 所有必填参数都存在时返回true
    }
}
