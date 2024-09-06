import { IdentityProvider } from '../../providers/IdentityProvider';
import { Parameter } from '../../providers/CommonProvider';
import axios, {AxiosResponse} from "axios";
import setCookie from 'set-cookie-parser';
import * as cheerio from 'cheerio';
import { strEnc } from '../../utils/des';
import xml2js from 'xml2js';

class DluflUndergradService extends IdentityProvider {
    name = 'DLUFL Library Service';
    description = 'Provides access to the DLUFL library resources';
    icon = 'https://example.com/icon.png';
    type = 'dlufl_library';
    params: Parameter[] = [
        {
            fieldName: 'username',
            fieldType: 'string',
            displayName: 'Username',
            required: true,
            description: 'Your student ID or username.'
        },
        {
            fieldName: 'password',
            fieldType: 'password',
            displayName: 'Password',
            required: true,
            description: 'Your account password.'
        }
    ];

    private casBase = 'https://cas.dlufl.edu.cn/cas';
    private dcpServiceUrl = 'https://i.dlufl.edu.cn/dcp/';
    private requestHeaders = {
        'User-Agent': `Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36`,
        'Content-Type': 'application/x-www-form-urlencoded',
    };

    constructor() {
        super();
    }

    async getTokenByParams(params: any): Promise<{ success: boolean; data?: any; message?: string }> {
        try {
            const { username, password } = params;

            // 发送初始GET请求
            const initResponse: AxiosResponse = await axios.get(
                `${this.casBase}/login?service=${this.dcpServiceUrl}&renew=true&_=${new Date().getTime()}`,
                { headers: this.requestHeaders }
            );

            // 提取 Set-Cookie 头信息并转换为字符串
            const initSetCookieHeader = initResponse.headers['set-cookie'];
            if (!initSetCookieHeader) {
                return { success: false, message: 'Remote server error.' };
            }

            const initCookie = setCookie.parse(initSetCookieHeader);
            const validCookieInit = initCookie.find(cookie => cookie.name.startsWith('JSESSIONIDCAS'));
            if (!validCookieInit) {
                return { success: false, message: 'Remote server error.' };
            }

            const cookieString = initCookie.map(cookie => `${cookie.name}=${cookie.value}`).join('; ');
            const $init = cheerio.load(initResponse.data);
            const ticket = $init("#lt").val() as string;
            const execution = $init('input[name="execution"]').val() as string;
            const rsa = strEnc(`${username}${password}${ticket}`, '1', '2', '3');

            if (!ticket || !execution) {
                return { success: false, message: 'Remote server error.' };
            }

            // 发送 POST 请求以提交登录表单
            const loginResponse: AxiosResponse = await axios.post(
                `${this.casBase}/login?service=${this.dcpServiceUrl}`,
                new URLSearchParams({
                    rsa,
                    ul: username.length.toString(),
                    pl: password.length.toString(),
                    lt: ticket,
                    execution,
                    _eventId: 'submit',
                }).toString(),
                {
                    maxRedirects: 0,
                    validateStatus: function (status) {
                        return status >= 200 && status < 400;
                    },
                    headers: {
                        ...this.requestHeaders,
                        'Cookie': cookieString,
                    },
                }
            );

            // 提取登录成功后的 Cookies
            const loginSetCookieHeader = loginResponse.headers['set-cookie'];
            if (!loginSetCookieHeader) {
                return { success: false, message: 'Remote server error.' };
            }
            const loginCookie = setCookie.parse(loginSetCookieHeader);
            const loginCookieString = loginCookie
                .filter(cookie => cookie.name !== 'Language')
                .map(cookie => `${cookie.name}=${cookie.value}`)
                .join('; ');

            const validCookieLogin = loginCookie.find(cookie => cookie.name.startsWith('CASTGC'));
            if (!validCookieLogin) {
                const $login = cheerio.load(loginResponse.data);
                const loginErrorMsg = $login('#errormsghide').text();
                if (loginErrorMsg) {
                    return { success: false, message: loginErrorMsg };
                } else {
                    return { success: false, message: 'Login Failed.' };
                }
            }

            return { success: true, data: { cookie: loginCookieString } };
        } catch (error: any) {
            return { success: false, message: error.message };
        }
    }

    /* async updateToken(identityId: string): Promise<{ success: boolean; token?: string; message?: string }> {
        try {
            const identity = await Identity.findById(identityId);
            if (!identity || identity.type !== this.identityType) {
                return { success: false, message: 'Identity not found or type mismatch' };
            }

            const loginInfo = identity.loginInfo; // 自动解密
            const tokenResponse = await this.getTokenByParams(loginInfo);
            if (!tokenResponse.success) {
                return { success: false, message: tokenResponse.message };
            }

            if (!tokenResponse.token) {
                return { success: false, message: 'Token missing' };
            }
            identity.token = tokenResponse.token;
            identity.lastUpdated = new Date();
            await identity.save();

            return { success: true, token: tokenResponse.token };
        } catch (error: any) {
            return { success: false, message: error.message };
        }
    } */


    async validateToken(token: any): Promise<{ success: boolean; message?: string }> {
        const authResponse = await this.authorizeServiceByToken(token, this.dcpServiceUrl);
        if (!authResponse.success || !authResponse.data) {
            return { success: false, message: authResponse.message };
        }
        return { success: true };
    }

    async authorizeServiceByToken(token: any, service: any): Promise<{ success: boolean; data?: any; message?: string }> {
        try {
            const response: AxiosResponse = await axios.get(`${this.casBase}/login?service=${service.url}`, {
                maxRedirects: 0,
                validateStatus: (status) => status >= 200 && status < 400,
                headers: { ...this.requestHeaders, 'Cookie': token.cookie },
            });

            const location = response.headers['location'];
            if (!location) {
                return { success: false, message: 'Authorization failed' };
            }
            /* if (location && location.includes('ticket=')) {
                const ticketResponse: AxiosResponse = await axios.get(location, {
                    maxRedirects: 0,
                    validateStatus: (status) => status >= 200 && status < 400,
                    headers: { ...this.requestHeaders, 'Cookie': token },
                });

                const setCookieHeader = ticketResponse.headers['set-cookie'];
                if (!setCookieHeader) {
                    return { success: false, message: 'Set-Cookie header not found' };
                }

                const cookies = setCookie.parse(setCookieHeader);
                const cookieMap = new Map(cookies.map(cookie => [cookie.name, cookie.value]));

                const missingCookies = cookieList.filter(cookieName => !cookieMap.has(cookieName));
                if (missingCookies.length === 0) {
                    const cookieString = cookieList.map(cookieName => `${cookieName}=${cookieMap.get(cookieName)}`).join('; ');
                    return { success: true, cookie: cookieString };
                }
            } */
            const regex = /[?&]ticket=([^&#]*)/;
            const results = regex.exec(location.toString());
            if (!results || !results[1]) {
                return { success: false, message: 'Authorization failed' };
            }

            const ticket = results[1];
            return { success: true, data: { ticket } };
        } catch (error: any) {
            return { success: false, message: error.message };
        }
    }

    async getInfoByToken(token: any): Promise<{ success: boolean; data?: any; extra?: any; message?: string; }> {
        try {
            const authResponse = await this.authorizeServiceByToken(token, { url: this.dcpServiceUrl });
            if (!authResponse.success || !authResponse.data) {
                return { success: false, message: authResponse.message };
            }

            const ticket = authResponse.data.ticket;
            const validateResponse: AxiosResponse = await axios.post(`${this.casBase}/proxyValidate`, new URLSearchParams({
                service: this.dcpServiceUrl,
                ticket,
            }).toString(), {
                headers: this.requestHeaders,
            });

            const parser = new xml2js.Parser({
                explicitArray: false // 禁止将单个节点解析为数组
            });

            interface AttributeObject {
                [key: string]: string; // 定义一个支持任意字符串键的对象接口
            }

            let parseResult: any = null;
            // 初始化存储sso:attributes的对象，使用灵活的类型定义
            const userInfo: AttributeObject = {};

            // 解析 XML 数据为 JavaScript 对象
            parser.parseString(validateResponse.data, (err, result) => {
                if (err || !result['sso:serviceResponse']['sso:authenticationSuccess']) {
                    return;
                } else {
                    parseResult = result;
                }
            });

            if (!parseResult) {
                return { success: false, message: 'Failed to parse info.' };
            }

            // 类型断言明确 result 类型
            const ssoInfo = (parseResult['sso:serviceResponse']['sso:authenticationSuccess']['sso:attributes']['sso:attribute'] as any[]) || [];

            ssoInfo.forEach(attribute => {
                const name = attribute['$'].name;
                userInfo[name] = attribute['$'].value || '';
            });

            let extraInfo: any = [];
            if (userInfo['user_id'] && userInfo['unit_name'] && userInfo['id_number'] && userInfo['user_name']) {
                extraInfo['alias'] = `${userInfo['user_name']} / ${userInfo['unit_name']} / ${userInfo['id_number']}`;
                extraInfo['uuid'] = userInfo['user_id'] || '';
            }

            /* // 使用合并后的 authorize 方法获取 ticket
            const authResponse = await this.authorize(identityOrToken, this.dcpValidateUrl, ["dcp114"]);
            if (!authResponse.success) {
                return { success: false, message: authResponse.message };
            }

            const userTypeResponse: AxiosResponse = await axios.post(`${this.dcpValidateUrl}/sys/uacm/profile/getUserType`, {}, {
                headers: {
                    "Content-Type": "application/json;charset=UTF-8",
                    "Cookie": authResponse.cookie
                }
            });

            if (!Array.isArray(userTypeResponse.data)) {
                return { success: false, message: 'Unexpected response format for user type.' };
            }

            const validUserTypes = userTypeResponse.data.filter((item: any) => typeof item === 'object' && item !== null);
            if (validUserTypes.length === 0) {
                return { success: false, message: 'No valid user type found.' };
            }

            const userType = validUserTypes[0];
            if (!userType.ID_NUMBER) {
                return { success: false, message: 'User type does not contain ID_NUMBER.' };
            }

            const encryptedId = strEnc(userType.ID_NUMBER, 'tp', 'des', 'param');
            const userInfoResponse: AxiosResponse = await axios.post(`${this.dcpValidateUrl}/sys/uacm/profile/getUserById`, {
                BE_OPT_ID: encryptedId
            }, {
                headers: {
                    "Content-Type": "application/json;charset=UTF-8",
                    "Cookie": authResponse.cookie
                }
            });

            // 检查必要字段是否存在
            const userInfo = userInfoResponse.data;
            if (!userInfo || !userInfo.ID_NUMBER || !userInfo.RESOURCE_ID || !userInfo.UNIT_NAME || !userInfo.USER_NAME) {
                return { success: false, message: 'Failed to retrieve required user information.' };
            }

            const displayInfo : string = `${userInfo.USER_NAME} / ${userInfo.UNIT_NAME} / ${userInfo.ID_NUMBER}`;

            return { success: true, message: 'User info fetched successfully', displayInfo: displayInfo, uniqueId: userInfo.RESOURCE_ID }; */
            return { success: true, message: 'Success', data: userInfo, extra: extraInfo };
        } catch (error: any) {
            return { success: false, message: error.message };
        }
    }
}

export default DluflUndergradService;
