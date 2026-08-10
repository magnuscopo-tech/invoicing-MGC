const mongoose = require("mongoose");

const connectDb = async () => {
  const uri = process.env.MONGO_URI;
  if (!uri) {
    console.error("Mongo Connection Error: MONGO_URI is not set");
    process.exit(1);
  }

  try {
    const connection = await mongoose.connect(uri);
    console.log(`MongoDB connected: ${connection.connection.name}`);
    return connection;
  } catch (error) {
    console.error("Mongo Connection Error:", error.message);
    process.exit(1);
  }
};

module.exports = connectDb;
