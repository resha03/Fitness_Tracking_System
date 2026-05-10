import { Schema, model, type InferSchemaType } from 'mongoose';

const userSchema = new Schema(
  {
    name: { type: String, required: true },
    email: { type: String, required: true, unique: true, index: true },
    password: { type: String, required: true },
    weight: { type: Number, required: true, default: 70 },
    height: { type: Number, required: true, default: 170 },
    age: { type: Number, required: true, default: 25 },
    goal: { type: String, required: true, default: 'Maintain weight' }
  },
  { timestamps: true }
);

export type UserDoc = InferSchemaType<typeof userSchema>;

export const UserModel = model('User', userSchema);

