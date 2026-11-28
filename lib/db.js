import mongoose from "mongoose";
import "@/lib/models/register";

const MONGODB_URI = process.env.MONGODB_URI;

if (!MONGODB_URI) {
  throw new Error("MONGODB_URI is missing from environment variables");
}

const globalForMongoose = globalThis;

if (!globalForMongoose._mongooseCache) {
  globalForMongoose._mongooseCache = {
    conn: null,
    promise: null,
  };
}

export async function connectDB() {
  const cache = globalForMongoose._mongooseCache;

  if (cache.conn) return cache.conn;

  if (!cache.promise) {
    cache.promise = mongoose
      .connect(MONGODB_URI, {
        bufferCommands: false,
        dbName: "campus_event_hub",
      })
      .then((m) => {
        cache.conn = m.connection;
        return cache.conn;
      })
      .catch((err) => {
        cache.promise = null;
        throw err;
      });
  }

  return cache.promise;
}