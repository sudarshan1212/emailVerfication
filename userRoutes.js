const express = require("express");
const {
  sigupUser,
  loginUser,
  getuser,
  getVerified,
} = require("./controllers/userControllers");
const router = express.Router();
router.post("/signup", sigupUser);
router.get("/verify/:userId/:uniqueString", getuser);
router.get("/verified", getVerified);
router.post("/login", loginUser);

module.exports = router;
