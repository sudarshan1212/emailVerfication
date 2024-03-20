const mongoose = require("mongoose");

const dbConnection = async () => {
  try {
    const connect = await mongoose.connect(process.env.CONNECTION);
    console.log(
      "CONNECTION: " + connect.connection.host,
      connect.connection.name
    );
  } catch (error) {
    process.exit(1);
  }
};
module.exports = dbConnection;
