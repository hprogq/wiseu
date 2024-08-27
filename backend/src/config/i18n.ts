import i18n from 'i18n';
import path from 'path';
import { Request, Response, NextFunction } from 'express';

// 配置 i18n
i18n.configure({
    locales: ['en', 'zh-CN'],
    directory: path.join(__dirname, '../locales'),
    defaultLocale: 'en',
    objectNotation: true,
    queryParameter: 'lang', // 支持通过查询参数传递语言
    api: {
        __: 'translate',
        __n: 'translateN'
    },
    autoReload: true,
    updateFiles: false,
    syncFiles: false
});

// 自定义语言检测中间件
export const detectLanguage = (req: Request, res: Response, next: NextFunction) => {
    let lang = req.query.lang as string || req.headers['accept-language']?.split(',')[0] || i18n.getLocale();

    // 如果语言不在支持的 locales 中，则使用默认语言
    if (!i18n.getLocales().includes(lang)) {
        lang = i18n.getLocale();
    }

    i18n.setLocale(req, lang);
    next();
};

// 在应用中使用 i18n 中间件
export default i18n;
