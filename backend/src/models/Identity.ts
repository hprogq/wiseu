import mongoose, { Schema, Document, Types } from 'mongoose';
import { encrypt, decrypt } from '../utils/encryption';

export interface IIdentity extends Document {
    user: Types.ObjectId;
    type: string;
    loginInfo: { [key: string]: string };
    token: { [key: string]: string };
    lastUpdated: Date;
    userInfo?: any;
}

const IdentitySchema: Schema = new Schema({
    user: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    type: { type: String, required: true },
    loginInfo: {
        type: Schema.Types.Mixed,
        required: true,
        get: function(data: string) {
            try {
                return JSON.parse(decrypt(data));
            } catch (error) {
                return data; // 如果解密失败，返回原始数据
            }
        },
        set: function(data: object) {
            return encrypt(JSON.stringify(data));
        }
    },
    token: {
        type: Schema.Types.Mixed,
        get: function(data: string) {
            try {
                return JSON.parse(decrypt(data));
            } catch (error) {
                return data;
            }
        },
        set: function(data: object) {
            return encrypt(JSON.stringify(data));
        }
    },
    lastUpdated: { type: Date, default: Date.now },
    userInfo: {
        type: Schema.Types.Mixed,
        get: function(data: string) {
            try {
                return JSON.parse(decrypt(data));
            } catch (error) {
                return data;
            }
        },
        set: function(data: any) {
            return encrypt(JSON.stringify(data));
        }
    }
});

IdentitySchema.set('toObject', { getters: true });
IdentitySchema.set('toJSON', { getters: true });

const Identity = mongoose.model<IIdentity>('Identity', IdentitySchema);

export default Identity;