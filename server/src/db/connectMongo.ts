import mongoose from 'mongoose';

export async function connectMongo() {
  const uri = process.env.MONGO_URI;
  if (!uri) {
    throw new Error('Missing MONGO_URI in environment variables. Check server/.env');
  }

  mongoose.set('strictQuery', true);

  // Avoid multiple connections in dev/hot-reload
  const existing = mongoose.connection.readyState;
  if (existing === 1) return;

  await mongoose.connect(uri);

  console.log('✅ Connected to MongoDB');
}

