import mongoose, { Schema, Document, Types } from "mongoose";
import { encrypt, decrypt } from "../utils/encryption";

export interface IIdentity extends Document {
  _id: mongoose.Types.ObjectId;
  user: Types.ObjectId; // 用户 ID
  type: string; // 身份类型
  params: { [key: string]: string }; // 登录参数
  token: any; // 登录 token
  alias?: string; // 别名
  uuid?: string; // 唯一标识
  lastUpdated: Date; // 最后更新时间
}

const IdentitySchema: Schema = new Schema({
  user: { type: Schema.Types.ObjectId, ref: "User", required: true },
  type: { type: String, required: true },
  params: {
    type: Schema.Types.Mixed,
    required: true,
    get: function (data: string) {
      try {
        return JSON.parse(decrypt(data));
      } catch (error) {
        return data; // 如果解密失败，返回原始数据
      }
    },
    set: function (data: object) {
      return encrypt(JSON.stringify(data));
    },
  },
  token: {
    type: Schema.Types.Mixed,
    get: function (data: string) {
      try {
        return JSON.parse(decrypt(data));
      } catch (error) {
        return data;
      }
    },
    set: function (data: object) {
      return encrypt(JSON.stringify(data));
    },
  },
  alias: { type: String },
  uuid: { type: String },
  lastUpdated: { type: Date, default: Date.now },
});

IdentitySchema.set("toObject", { getters: true });
IdentitySchema.set("toJSON", { getters: true });

const Identity = mongoose.model<IIdentity>("Identity", IdentitySchema);

export default Identity;
