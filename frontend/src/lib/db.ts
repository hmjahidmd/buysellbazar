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
    const opts = {
      bufferCommands: false,
    };

    cached.promise = mongoose.connect(DEFAULT_MONGO_URI, opts).then((m) => {
      return m;
    });
  }

  try {
    cached.conn = await cached.promise;
  } catch (e) {
    cached.promise = null;
    throw e;
  }

  return cached.conn;
}
