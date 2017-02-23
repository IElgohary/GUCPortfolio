require('./project')
var mongoose = require("mongoose");
require('mongoose-type-email');
var bcrypt = require("bcrypt-nodejs");

var SALT_FACTOR = 10;


var portfolioSchema = new mongoose.Schema({
    projects: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Project'
    }]
});

var userSchema = mongoose.Schema({
    username: {
        type: String,
        required: true,
        unique: true
    },
    password: { type: String, required: true },
    email: {
        type: mongoose.SchemaTypes.Email,
        required: true,
        unique: true
    },
    createdAt: { type: Date, default: Date.now },
    displayName: String,
    bio: String,
    portfolio: portfolioSchema
});

userSchema.methods.name = function() {
    return this.displayName || this.username;
};

userSchema.methods.createPortfolio = function() {
    this.portfolio = new portfolioSchema({
        projects: []
    });
}

userSchema.methods.getPortfolio = function() {
    return this.portfolio || null;
};

userSchema.methods.checkPassword = function(guess, done) {
    bcrypt.compare(guess, this.password,
        function(err, isMatch) {
            done(err, isMatch);
        });
};

var noop = function() {};

userSchema.pre("save", function(done) {
    var user = this;
    if (!user.isModified("password")) {
        return done();
    }

    bcrypt.genSalt(SALT_FACTOR, function(err, salt) {
        if (err) { return done(err); }
        bcrypt.hash(user.password, salt, noop,
            function(err, hashedPassword) {
                if (err) { return done(err); }
                user.password = hashedPassword;
                done();
            });
    });
});

var User = mongoose.model("User", userSchema);
module.exports = User;