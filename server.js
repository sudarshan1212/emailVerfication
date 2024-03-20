const express = require("express");
const dbConnection = require("./config/dbConnection");

const app = express();
require("dotenv").config();

const PORT = process.env.PORT || 5000;
app.use(express.json())
dbConnection();
app.use("/", require("./userRoutes"));

//ERROR HANDLER
app.use((req, res, next) => {
  const error = new Error("not found");
  error.status = 400;
  next(error);
});
app.use((err, req, res, next) => {
  res.status(err.status || 500);
  res.json({
    error: {
      message: err.message,
    },
  });
});
app.listen(PORT, () => {
  console.log(`THE SERVER RUNNING ON: ${PORT}`);
});
