const mongoose = require("mongoose");

const expressAsyncHandler = require("express-async-handler");
//USER MODEL
const User = require("../model/userModel");
// USER VERIFICATION MODEL
const UserVerification = require("../model/userVerification");
//MAIL HANDLER
const nodemailer = require("nodemailer");
//UNIQUE STRING
const { v4: uuidv4 } = require("uuid");
const path = require("path");
//ENV VARIABLES
require("dotenv").config();
const bcrypt = require("bcrypt");
const userVerification = require("../model/userVerification");
let transporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: process.env.AUTH_EMAIL,
    pass: process.env.AUTH_PASS,
  },
});

transporter.verify((error, success) => {
  if (error) {
    console.log(error);
  } else {
    console.log(success);
    console.log("ready");
  }
});

const sigupUser = expressAsyncHandler(async (req, res) => {
  const { username, email, password, dateOfBirth } = req.body;
  if (!username || !email || !password || !dateOfBirth) {
    res.status(400).json({
      status: "Invalid",
      message: "Empty fields",
    });
  }

  if (!new Date(dateOfBirth).getTime()) {
    res.status(400).json({
      status: "Invalid",
      message: "DOB",
    });
  }
  const findEmail = await User.findOne({ email });
  if (findEmail) {
    res.status(400).json({
      status: "Invalid",
      message: "Email ALready Exsists",
    });
  }
  const hash = await bcrypt.hash(password, 10);
  const user = await User.create({
    username,
    email,
    password: hash,
    dateOfBirth,
    verified: false,
  });
 
    sendVerificationEmail(user, res)
    // {status: "Sucess",
    // message: "Stored",
    // data: user,}
});
const sendVerificationEmail = ({ email, _id }, res) => {
  const url = "http://localhost:5001";

  const uniqueString = uuidv4() + _id;
  const mailOptions = {
    from: process.env.AUTH_EMAIL,
    to: email,
    subject: "verfify YOur Email",
    html: `<p>Verify your email.</p>
  <p>this link <b>expires in 6hrs</b>.</p>
  <p>press<a href=${url + "/user/verify/" + _id + "/" + uniqueString}>here</a>
  to Proceed</p>`,
  };
  const saltROunds = 10;
  bcrypt
    .hash(uniqueString, saltROunds)
    .then((hashUniqueString) => {
      const newVerification = new userVerification({
        userId: _id,
        uniqueString: hashUniqueString,
        createdAt: Date.now(),
        expiresAt: Date.now() + 21600000,
      });
      newVerification
        .save()
        .then(() => {
          transporter
            .sendMail(mailOptions)
            .then(() => {
              res.status(400).json({
                status: "Pending",
                message: "Verficatuon Email sent",
              });
            })
            .catch((err) => {
              res.status(400).json({
                status: "Invalid",
                message: "transporter not found",
              });
            });
        })
        .catch(() => {
          res.status(400).json({
            status: "Invalid",
            message: "newVerification not found",
          });
        });
    })
    .catch((err) => {
      res.status(400).json({
        status: "Invalid",
        message: "bycrypt not found",
      });
    });
};

const getuser = (req, res) => {
  let { userId, uniqueString } = req.params;

  userVerification
    .find(userId)
    .then((result) => {
      console.log(result);
      if (result.length > 0) {
        //USER VERFICATION RCORD EXSISTS SO WE PROCEDD

        const { expiresAt } = result[0];
        const hashedUniqueString = result[0].uniqueString;
        if (expiresAt < Date.now()) {
          //EXPIRED USER RECORDS DELETIONS
          userVerification
            .deletOne({ userId })
            .then((result) => {
              User.deletOne({ userId })
                .then((result) => {
                  let message = "user msg expires .please sign up again";
                  res.redirect(`/user/verified/error=true&message=${message}`);
                })
                .catch((err) => {
                  let message =
                    "Clearing user with expired uniquwstring failed";
                  res.redirect(`/user/verified/error=true&message=${message}`);
                });
            })
            .catch((err) => {
              let message =
                "An error Occured While CLearing expired user verficaation record";
              res.redirect(`/user/verified/error=true&message=${message}`);
            });
        } else {
          //VALID RECORD EXISTS SO WE VALIDATE
          // fIRST COMPARE THE HASHED UNIQUE  STRING
          bcrypt
            .compare(uniqueString, hashedUniqueString)
            .then((result) => {
              if (result) {
                //STRING MATCHES
                User.updateOne({ _id: userId }, { verified: true })
                  .then(() => {
                    userVerification
                      .deletOne({ userId })
                      .then(() => {
                        res.sendFile(path.join(__dirname, "../views/hi.html"));
                        return;
                      })
                      .catch((err) => {
                        console.log(err);
                        let message =
                          "An error occured while finalizong successful verification ";
                        res.redirect(
                          `/user/verified/error=true&message=${message}`
                        );
                      });
                  })
                  .catch((err) => {
                    let message =
                      "An error occured while updating user record to show verified";
                    res.redirect(
                      `/user/verified/error=true&message=${message}`
                    );
                  });
              } else {
                // EXSISTING RECORD BUT INCORRECT VERFICATION DETAILS PASSED.
                let message =
                  "Invalid verification details passed.Check your inbox";
                res.redirect(`/user/verified/error=true&message=${message}`);
              }
            })
            .catch((err) => {
              let message =
                "An error occured while comparing the unique string";
              res.redirect(`/user/verified/error=true&message=${message}`);
            });
        }
      } else {
        //USER VERIFICATION RECORD DOES NOT EXSIST
        let message = "Accout  record does not  exsist .pls signin or login";
        res.redirect(`/user/verified/error=true&message=${message}`);
      }
    })
    .catch((err) => {
      console.log(err);
      let message =
        "an error occured while checking for exsisting user verfication record";
      res.redirect(`/user/verified/error=true&message=${message}`);
    });
};
const getVerified = (req, res) => {
  res.sendFile(path.join(__dirname, "../views/hi.html"));
  return;
};

const loginUser = expressAsyncHandler(async (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) {
    res.status(400).json({
      status: "Invalid",
      message: "eamil or password not found",
    });
  } else {
    // User.find({email}).then((data) => {
    //   console.log("loign user data:"+data);
    //   if(data.length){
    //     if(!data[0].verified){
    //       res.status(400).json({
    //         status: "Failed",
    //         message: "Email hasn't been verified yet.check your inbox",
    //       });
    //     }
    //   }
    // }).catch((err) => {
    //   res.status(400).json({
    //     status: "Invalid",
    //     message: "eamil not found",
    //   });
    // });
    const findEmail = await User.findOne({ email });
    if (findEmail && (await bcrypt.compare(password, findEmail.password))) {
      res.status(200).json({
        status: "Sucess",
        message: "enjoy",
        data: { userId: findEmail._id, usrname: findEmail.username },
      });
    } else {
      res.status(400).json({
        status: "Invalid",
        message: "eamil not found",
      });
    }
  }
});

module.exports = { sigupUser, loginUser, getuser, getVerified };
