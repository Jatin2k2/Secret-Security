//jshint esversion:6
require('dotenv').config();
const express = require("express");
const ejs = require("ejs");
const bodyParser = require("body-parser");
const mongoose = require("mongoose");
//level 5
const session = require("express-session");
const passport = require("passport");
const passportLocalMongoose = require("passport-local-mongoose");
const GoogleStrategy = require('passport-google-oauth20').Strategy;
const findOrCreate = require("mongoose-findorcreate")
// const encrypt=require("mongoose-encryption");
//hashing
// const md5=require("md5");
//level 4 secutity,salting and hashing
// const bcrypt=require("bcrypt");
//5 rounds of salting
// const saltRounds=5;
const app = express();


app.use(express.static("public"));
app.use(bodyParser.urlencoded({
  extended: true
}));
app.set('view engine', 'ejs');
app.use(session({
  secret: "SecretMine.",
  resave: false,
  saveUninitialized: false
}));

app.use(passport.initialize());
app.use(passport.session());

mongoose.connect("mongodb://localhost:27017/userDB");
// mongoose.set("useCreateIndex",true);

const userSchema = new mongoose.Schema({
  email: String,
  password: String,
  googleId: String,
  secret: String
});

userSchema.plugin(passportLocalMongoose);
userSchema.plugin(findOrCreate);

//level 2 security
//we will use the secret string

//["password"] is an array more fieds to be encrypted can be added
// userSchema.plugin(encrypt,{secret:process.env.SECRET,encryptedFields:["password"]});


const User = new mongoose.model("User", userSchema);

passport.use(User.createStrategy());
passport.serializeUser(function(user, done) {
  done(null, user.id);
});

passport.deserializeUser(function(id, done) {
  User.findById(id, function(err, user) {
    done(err, user);
  });
});

passport.use(new GoogleStrategy({
    clientID: process.env.CLIENT_ID,
    clientSecret: process.env.CLIENT_SECRET,
    callbackURL: "http://localhost:3000/auth/google/secrets",
    userProfileURL: "https://www.googleapis.com/oauth2/v3/userinfo"
  },
  function(accessToken, refreshToken, profile, cb) {
    console.log(profile);
    User.findOrCreate({
      googleId: profile.id
    }, function(err, user) {
      return cb(err, user);
    });
  }
));



app.get("/", function(req, res) {
  res.render("home");
});
//will create a pop up to Login
app.get("/auth/google",
  passport.authenticate('google', {
    scope: ["profile"]
  }));

app.get("/auth/google/secrets",
  passport.authenticate('google', {
    failureRedirect: "/login"
  }),
  function(req, res) {
    // Successful authentication, redirect home.
    res.redirect("/secrets");
  });

app.get("/login", function(req, res) {
  res.render("login");
});
//Register route
app.get("/register", function(req, res) {
  res.render("register");
});

app.get("/secrets", function(req, res) {
  User.find({
    "secret": {
      $ne: null
    }
  }, function(err, f_User) {
    if (err) {
      console.log(err);
    } else {
      if (f_User) {
        res.render("secrets", {
          usersWithSecrets: f_User
        });
      }
    }
  });
});

app.get("/submit", function(req, res) {
  if (req.isAuthenticated()) {
    res.render("submit");
  } else {
    res.redirect("/login");
  }
});

app.post("/submit", function(req, res) {
  const submitedSecret = req.body.secret;
  User.findById(req.user.id, function(err, f_User) {
    if (err) {
      console.log(err);
    } else {
      if (f_User) {
        f_User.secret = submitedSecret;
        f_User.save(function() {
          res.redirect("/secrets");
        });
      }
    }
  });
});


app.get("/logout", function(req, res) {
  req.logout(function(err){
    if(err){
      console.log(err);
    }
  });
  res.redirect("/");
});

app.post("/register", function(req, res) {
  User.register({
    username: req.body.username
  }, req.body.password, function(err, user) {
    if (err) {
      console.log(err);
      res.redirect("/register");
    } else {
      passport.authenticate("local")(req, res, function() {
        res.redirect("/secrets");
      });
    }
  });

  // bcrypt.hash(req.body.password, saltRounds, function(err, hash) {
  //   const newUser=new User({
  //     email:req.body.username,
  //     password:hash
  //   });
  //   newUser.save(function(err){
  //     if(err){
  //       console.log(err);
  //     }else {
  //       res.render("secrets");
  //     }
  //   });
  // });


});

app.post("/login", function(req, res) {
  // const username=req.body.username;
  // const password=req.body.password;
  //
  // User.findOne({email:username},function(err,f_User){
  //   if(err){
  //     console.log(err);
  //   }else {
  //     if(f_User){
  //       bcrypt.compare(password,f_User.password, function(err, result) {
  //           if(result===true){
  //             res.render("secrets");
  //           }
  //       });
  //
  //       }
  //     }
  // });
  const user = new User({
    username: req.body.username,
    password: req.body.password
  });
  req.login(user, function(err) {
    if (err) {
      console.log(err);
    } else {
      passport.authenticate("local")(req, res, function() {
        res.redirect("/secrets");
      });
    }
  });
});


app.listen(3000, function() {
  console.log("Server started on port 3000");
})
