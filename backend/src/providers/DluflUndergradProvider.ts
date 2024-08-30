import { IdentityProvider, LoginParameter } from './IdentityProvider';
import axios, { AxiosResponse } from "axios";
import setCookie from 'set-cookie-parser';
import * as cheerio from 'cheerio';
import { strEnc } from '../utils/des';
import Identity from '../models/Identity';

class DluflUndergradProvider implements IdentityProvider {
    private identityType = "dlufl_undergrad";
    private casHost = 'https://cas.dlufl.edu.cn';
    private dcpValidateUrl = 'https://i.dlufl.edu.cn/dcp/';
    private requestHeaders = {
        'User-Agent': `Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36`,
        'Content-Type': 'application/x-www-form-urlencoded',
    };

    async getToken(loginInfo: any): Promise<{ success: boolean; token?: any; message?: string }> {
        const loginParameters = this.getLoginParameters();

        // 验证 loginInfo 是否符合 loginParameters
        for (const param of loginParameters) {
            if (param.required && !loginInfo[param.fieldName]) {
                return { success: false, message: `Missing required field: ${param.displayName}` };
            }
        }

        try {
            const { username, password } = loginInfo;

            // 发送初始GET请求
            const initResponse: AxiosResponse = await axios.get(
                `${this.casHost}/cas/login?service=${this.dcpValidateUrl}&renew=true&_=${new Date().getTime()}`,
                { headers: this.requestHeaders }
            );

            // 提取 Set-Cookie 头信息并转换为字符串
            const initSetCookieHeader = initResponse.headers['set-cookie'];
            if (!initSetCookieHeader) {
                return { success: false, message: 'Remote server error.' };
            }

            const initCookies = setCookie.parse(initSetCookieHeader);
            const validCookieInit = initCookies.find(cookie => cookie.name.startsWith('JSESSIONIDCAS'));
            if (!validCookieInit) {
                return { success: false, message: 'Remote server error.' };
            }

            const cookieString = initCookies.map(cookie => `${cookie.name}=${cookie.value}`).join('; ');
            const $init = cheerio.load(initResponse.data);
            const ticket = $init("#lt").val() as string;
            const execution = $init('input[name="execution"]').val() as string;
            const rsa = strEnc(`${username}${password}${ticket}`, '1', '2', '3');

            if (!ticket || !execution) {
                return { success: false, message: 'Remote server error.' };
            }

            // 发送 POST 请求以提交登录表单
            const loginResponse: AxiosResponse = await axios.post(
                `${this.casHost}/cas/login?service=${this.dcpValidateUrl}`,
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
            const loginCookies = setCookie.parse(loginSetCookieHeader);
            const loginCookieString = loginCookies
                .filter(cookie => cookie.name !== 'Language')
                .map(cookie => `${cookie.name}=${cookie.value}`)
                .join('; ');

            const validCookieLogin = loginCookies.find(cookie => cookie.name.startsWith('CASTGC'));
            if (!validCookieLogin) {
                const $login = cheerio.load(loginResponse.data);
                const loginErrorMsg = $login('#errormsghide').text();
                if (loginErrorMsg) {
                    return { success: false, message: loginErrorMsg };
                } else {
                    return { success: false, message: 'Login Failed.' };
                }
            }

            const resultCookie = cookieString + '; ' + loginCookieString;
            return { success: true, token: { cookies: resultCookie } };
        } catch (error: any) {
            return { success: false, message: error.message };
        }
    }

    async updateToken(identityId: string): Promise<{ success: boolean; token?: any; message?: string }> {
        try {
            const identity = await Identity.findById(identityId);
            if (!identity || identity.type !== this.identityType) {
                return { success: false, message: 'Identity not found or type mismatch' };
            }

            const loginInfo = identity.loginInfo; // 自动解密
            const tokenResponse = await this.getToken(loginInfo);
            if (!tokenResponse.success) {
                return { success: false, message: tokenResponse.message };
            }

            identity.token = tokenResponse.token; // 明文存储，钩子自动加密
            identity.lastUpdated = new Date();
            await identity.save();

            return { success: true, token: tokenResponse.token };
        } catch (error: any) {
            return { success: false, message: error.message };
        }
    }

    async authorize(identityId: string, serviceUrl: string, cookieList: string[]): Promise<{ success: boolean; cookie?: string; message?: string }> {
        try {
            let attempts = 0;
            let tokenValid = false;
            let token = null;

            while (attempts < 3 && !tokenValid) {
                const identity = await Identity.findById(identityId);
                if (!identity || identity.type !== this.identityType) {
                    return { success: false, message: 'Identity not found or type mismatch' };
                }

                token = identity.token;
                const response: AxiosResponse = await axios.get(`${this.casHost}/cas/login?service=${serviceUrl}`, {
                    maxRedirects: 0,
                    validateStatus: (status) => status >= 200 && status < 400,
                    headers: { ...this.requestHeaders, 'Cookie': token.cookies },
                });

                const location = response.headers['location'];
                if (location && location.includes('ticket=')) {
                    // 提取ticket后发送请求
                    const ticketResponse: AxiosResponse = await axios.get(location, {
                        maxRedirects: 0,
                        validateStatus: (status) => status >= 200 && status < 400,
                        headers: { ...this.requestHeaders, 'Cookie': token.cookies },
                    });

                    // 提取set-cookie头
                    const setCookieHeader = ticketResponse.headers['set-cookie'];
                    if (!setCookieHeader) {
                        return { success: false, message: 'Set-Cookie header not found' };
                    }

                    // 解析set-cookie头
                    const cookies = setCookie.parse(setCookieHeader);
                    const cookieMap = new Map(cookies.map(cookie => [cookie.name, cookie.value]));

                    // 检查cookieList中的所有cookie是否存在
                    const missingCookies = cookieList.filter(cookieName => !cookieMap.has(cookieName));
                    if (missingCookies.length === 0) {
                        // 构建完整的cookie字符串
                        const cookieString = cookieList.map(cookieName => `${cookieName}=${cookieMap.get(cookieName)}`).join('; ');
                        return { success: true, cookie: cookieString };
                    } else {
                        return { success: false, message: `Missing required cookies: ${missingCookies.join(', ')}` };
                    }
                }

                // 更新token并重试
                const tokenResponse = await this.updateToken(identityId);
                if (tokenResponse.success) {
                    tokenValid = true;
                    token = tokenResponse.token;
                } else {
                    attempts++;
                }
            }

            return { success: false, message: 'Authorization failed after multiple attempts' };
        } catch (error: any) {
            return { success: false, message: error.message };
        }
    }

    async getUserInfo(identityId: string): Promise<{ success: boolean; message?: string; data?: any }> {
        try {
            // 首先调用授权方法获取ticket
            const authResponse = await this.authorize(identityId, this.dcpValidateUrl, ["dcp114"]);
            if (!authResponse.success) {
                return { success: false, message: authResponse.message };
            }

            // 使用 ticket 获取用户类型
            try {
                const userTypeResponse: AxiosResponse = await axios.post(`${this.dcpValidateUrl}/sys/uacm/profile/getUserType`, {}, {
                    headers: {
                        "Content-Type": "application/json;charset=UTF-8",
                        "Cookie": authResponse.cookie
                    }
                });

                // 验证响应是否为预期格式
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

                // 使用用户类型信息获取用户详情
                const encryptedId = strEnc(userType.ID_NUMBER, 'tp', 'des', 'param');
                const userInfoResponse: AxiosResponse = await axios.post(`${this.dcpValidateUrl}/sys/uacm/profile/getUserById`, {
                    BE_OPT_ID: encryptedId
                }, {
                    headers: {
                        "Content-Type": "application/json;charset=UTF-8",
                        "Cookie": authResponse.cookie
                    }
                });

                // 检查返回的数据是否包含用户信息
                if (!userInfoResponse.data || !userInfoResponse.data.USER_NAME) {
                    return { success: false, message: 'Failed to retrieve user information.' };
                }

                // 返回成功信息和用户数据
                return { success: true, message: 'User info fetched successfully', data: userInfoResponse.data };

            } catch (userTypeError: any) {
                console.error("Error fetching user type:", userTypeError.message);
                return { success: false, message: 'Failed to fetch user type: ' + userTypeError.message };
            }

        } catch (authError: any) {
            console.error("Authorization error:", authError.message);
            return { success: false, message: 'Authorization failed: ' + authError.message };
        }
    }

    getLoginParameters(): LoginParameter[] {
        return [
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
    }
}

export default DluflUndergradProvider;
