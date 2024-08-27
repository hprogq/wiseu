import { Request } from 'express';
import i18n from 'i18n';

// 封装 i18n 的工具函数
export function translate(req: Request, key: string, ...args: any[]): string {
    const locale = i18n.getLocale(req);
    return i18n.__({ phrase: key, locale }, ...args);
}
