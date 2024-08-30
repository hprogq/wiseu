import mongoose, {Document, Schema, Types} from 'mongoose';

export interface IUser extends Document {
    username: string;
    email: string;
    password: string;
    roles: string[];
    identities: Types.ObjectId[]; // 一个用户可以绑定多个身份
    createdAt: Date;
}

const UserSchema: Schema = new Schema({
    username: { type: String, required: true, unique: true },
    email: { type: String, required: true, unique: true },
    password: { type: String, required: true },
    roles: { type: [String], default: ['user'] },
    identities: [{ type: Schema.Types.ObjectId, ref: 'Identity' }],
    createdAt: { type: Date, default: Date.now }
});

export default mongoose.model<IUser>('User', UserSchema);
