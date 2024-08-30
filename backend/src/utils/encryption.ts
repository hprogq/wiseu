import crypto from 'crypto';
import config from '../config/config';

function getValidKey(key: string): Buffer {
    return crypto.createHash('sha256').update(key).digest();
}

const validKey = getValidKey(config.encryptSecret);

// 加密函数
export function encrypt(data: string, secretKey: Buffer = validKey): string {
    const iv = crypto.randomBytes(16); // 初始化向量
    const cipher = crypto.createCipheriv('aes-256-cbc', secretKey, iv);
    let encrypted = cipher.update(data, 'utf8', 'hex');
    encrypted += cipher.final('hex');
    return iv.toString('hex') + ':' + encrypted; // 返回 iv 和加密后的数据
}

// 解密函数
export function decrypt(encryptedData: string, secretKey: Buffer = validKey): string {
    const [ivHex, encrypted] = encryptedData.split(':');
    const iv = Buffer.from(ivHex, 'hex');
    const decipher = crypto.createDecipheriv('aes-256-cbc', validKey, iv);
    let decrypted = decipher.update(encrypted, 'hex', 'utf8');
    decrypted += decipher.final('utf8');
    return decrypted;
}
