const mongoose = require("mongoose");

async function connectDB() {
  const uri = process.env.MONGODB_URI;
  if (!uri) {
    throw new Error("MONGODB_URI is not defined");
  }

  mongoose.set("strictQuery", false);

  const maxRetries = 3;
  let attempt = 0;

  while (attempt < maxRetries) {
    try {
      await mongoose.connect(uri);
      console.log("Connected to MongoDB");
      return;
    } catch (err) {
      attempt++;
      console.error(
        `MongoDB connect attempt ${attempt} failed:`,
        err.message || err
      );

      if (attempt >= maxRetries) throw err;

      await new Promise((r) => setTimeout(r, 1000 * attempt));
    }
  }
}

module.exports = { connectDB };