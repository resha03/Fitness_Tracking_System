import { Schema, model, type InferSchemaType } from 'mongoose';

const workoutSchema = new Schema(
  {
    email: { type: String, required: true, index: true },
    name: { type: String, required: true },
    category: { type: String, required: true, index: true },
    duration: { type: Number, required: true },
    notes: { type: String, default: '' }
  },
  { timestamps: true }
);

export type WorkoutDoc = InferSchemaType<typeof workoutSchema>;

export const WorkoutModel = model('Workout', workoutSchema);

