import { Parameter, Configuration } from "./CommonProvider";

export type IdentityConstructor = new () => IdentityProvider;

export abstract class IdentityProvider {
  abstract name: string; // Service name, e.g. 'ICSpace'
  abstract type: string; // Service type, e.g. 'Library', 'Course'
  abstract description: string; // Service description
  abstract icon: string; // Service icon, e.g. 'ic-space.png'
  abstract params: Parameter[]; // Service parameters

  protected configuration: Configuration = {}; // Service configuration

  protected constructor() {}

  // Abstract methods, to be implemented by subclasses
  abstract getTokenByParams(
    params: any,
  ): Promise<{ success: boolean; data?: any; message?: string }>;

  abstract validateToken(
    token: any,
  ): Promise<{ success: boolean; message?: string }>;

  abstract getInfoByToken(
    token: any,
  ): Promise<{ success: boolean; data?: any; extra?: any; message?: string }>;

  abstract authorizeServiceByToken(
    token: any,
    service: any,
  ): Promise<{
    success: boolean;
    data?: any;
    message?: string;
  }>;

  // Validate the configuration
  public init(config: Configuration): boolean {
    if (!config) {
      return false; // If the configuration is null, return false
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
