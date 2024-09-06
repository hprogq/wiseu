import mongoose, { Schema, Document, Types } from 'mongoose';
import { IIdentity } from "./Identity";

export interface IService extends Document {
    user: Types.ObjectId; // 关联的用户
    type: string; // 服务简称，例如 'dlufl_library'
    identityId: string; // 关联的身份
    configuration: any; // 服务的配置
    primary: boolean; // 是否为主要服务
    status: string; // 服务状态
    failureReason: string; // 失败原因
    lastUpdated: Date; // 最后更新时间
}

const ServiceSchema: Schema = new Schema({
    user: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    type: { type: String, required: true },
    identityId: { type: String },
    configuration: { type: Schema.Types.Mixed, default: {} },
    primary: { type: Boolean, default: false },
    status: { type: String, enum : ['UP' ,'FAILED', 'DISABLED'], default: 'UP' },  // 服务状态
    failureReason: { type: String, default: '' },  // 失败原因
    lastUpdated: { type: Date, default: Date.now }
});

export default mongoose.model<IService>('Service', ServiceSchema);
