require('./user')

var mongoose = require("mongoose");
var bcrypt = require("bcrypt-nodejs");
var SALT_FACTOR = 10;

var projectSchema = mongoose.Schema({
    _creator: { type: Number, ref: 'user' },
    title: String,
    description: String,
    photo: String,
    link: String
});

var Project = mongoose.model("Project", projectSchema);
module.exports = Project;