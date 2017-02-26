require('./project')
var mongoose = require("mongoose");
require('mongoose-type-email');
var bcrypt = require("bcrypt-nodejs");

var SALT_FACTOR = 10;

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
    cover: String,
    createdAt: { type: Date, default: Date.now },
    studentName: String,
    description: String,
    projects: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Project'
    }]
});

userSchema.methods.name = function() {
    return this.studentName || this.username;
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