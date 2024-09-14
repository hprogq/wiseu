import { createResponse } from "../utils/responseHelper";
import { IIdentity } from "../models/Identity";
import { Parameter, Configuration } from "./CommonProvider";
import { DynamicTool, DynamicStructuredTool } from "@langchain/core/tools";

export type ServiceConstructor = new () => ServiceProvider;

export abstract class ServiceProvider {
  abstract name: string; // Service name, e.g. 'DLUFL Library'
  abstract type: string; // Service type, e.g. 'dlufl_library'
  abstract description: string; // Service description
  abstract icon: string; // Service icon, e.g. 'ic-space.png'
  abstract category: string; // Service category, e.g. 'Library', 'Course'
  abstract identityType: string[]; // Service identity type, e.g. 'dlufl_undergrad'
  abstract params: Parameter[]; // Service parameters
  abstract interval: number; // Service update interval in milliseconds
  abstract tools: (DynamicTool | DynamicStructuredTool<any>)[]; // Service tools

  protected identityId: string = ""; // Service identity id
  protected serviceId: string = ""; // Service id
  protected configuration: Configuration = {}; // Service configuration

  // Constructor
  protected constructor() {}

  // Abstract methods, to be implemented by subclasses
  abstract prompt(question: string): Promise<string>;

  abstract update(): Promise<void>;

  abstract destroy(): Promise<void>;

  // Validate the configuration
  public async init(
    identityId: string,
    config: Configuration,
    serviceId: string = "",
  ): Promise<boolean> {
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
