const mongoose = require('mongoose');
const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '../.env') });

async function connectDB() {
  const mongoUri = process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/ipl_auction';

  await mongoose.connect(mongoUri);
  console.log('MongoDB connected');
}

module.exports = connectDB;
