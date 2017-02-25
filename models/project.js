require('./user')

var mongoose = require("mongoose");
var bcrypt = require("bcrypt-nodejs");


var projectSchema = mongoose.Schema({
    _creator: { type: String, ref: 'User' },
    title: String,
    description: String,
    image: String,
    repository: String,
    averageRating: Number
});

var Project = mongoose.model("Project", projectSchema);
module.exports = Project;