import mongoose from 'mongoose';

const DEFAULT_MONGO_URI =
  process.env.MONGO_URI ||
  'mongodb+srv://hmjahidmd_db_user:Ck3w86AXTXMUbGRA@cluster0.ppesi2j.mongodb.net/buysellbd?retryWrites=true&w=majority';

let cached = (global as any).mongoose;

if (!cached) {
  cached = (global as any).mongoose = { conn: null, promise: null };
}

export async function connectToDatabase() {
  if (cached.conn) {
    return cached.conn;
  }

  if (!cached.promise) {
    cached.promise = mongoose
      .connect(DEFAULT_MONGO_URI, {
        bufferCommands: false,
        maxPoolSize: 5,
        serverSelectionTimeoutMS: 8000,
        socketTimeoutMS: 20000,
        connectTimeoutMS: 8000,
      })
      .then((m) => m);
  }

  try {
    cached.conn = await cached.promise;
  } catch (e: any) {
    cached.promise = null;
    const reason = e?.message || 'unknown error';
    throw new Error(
      `MongoDB Atlas connection failed (${reason}). In Atlas → Network Access, allow 0.0.0.0/0, and set MONGO_URI on Vercel.`
    );
  }

  return cached.conn;
}
