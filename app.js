var express = require("express");
var mongoose = require("mongoose");
var path = require("path");
var bodyParser = require("body-parser");
var cookieParser = require("cookie-parser");
var session = require("express-session");
var flash = require("connect-flash");
var passport = require("passport");
var setUpPassport = require("./setuppassport");
var routes = require("./routes");

var app = express();


var logger = require("morgan");
app.use(logger("dev"));
app.set("port", process.env.PORT || 3000);

// var mongodbUri = 'mongodb://IElgohary:M3esyf@ds119210.mlab.com:19210/portfolio';

// mongoose.connect(mongodbUri);
mongoose.connect("mongodb://localhost:27017/portfolio");
setUpPassport();



app.set("views", path.join(__dirname, "views"));
app.set("view engine", "ejs");

app.use(express.static('public'));
app.use(bodyParser.urlencoded({ extended: false }));
app.use(cookieParser());
app.use(session({
    secret: "TKRv0IJs=qYapoegQ#&!F!%V]Ww/4KiEs$s,<<MX",
    resave: true,
    saveUninitialized: true
}));
app.use(flash());
app.use(passport.initialize());
app.use(passport.session());


app.use(routes);


app.listen(app.get("port"), function() {
    console.log("Server started on port " + app.get("port"));
});