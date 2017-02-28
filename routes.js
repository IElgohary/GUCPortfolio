var express = require("express");
var passport = require("passport");
var User = require("./models/user");
var Project = require("./models/project");
var multer = require('multer');
var crypto = require('crypto');
var path = require('path');
var validUrl = require('valid-url');

var router = express.Router();

/**
 * Multer Configurations
 */
const storage = multer.diskStorage({
    destination: function(req, file, cb) {
        cb(null, './public/uploads/');
    },
    filename: function(req, file, cb) {
        const buf = crypto.randomBytes(48);
        cb(null, Date.now() + buf.toString('hex') + path.extname(file.originalname));
    }
});


const upload = multer({
    storage: storage
});

/**
 * Authentication function
 */
function ensureAuthenticated(req, res, next) {
    if (req.isAuthenticated()) {
        next();
    } else {
        req.flash("info", "You must be logged in to see this page.");
        res.redirect("/login");
    }
}


// Set Variables
router.use(function(req, res, next) {
    res.locals.currentUser = req.user;
    res.locals.errors = req.flash("error");
    res.locals.infos = req.flash("info");
    next();
});


// GET
router.get("/", function(resa, res, next) {
    res.redirect("/page/0");
});

router.get("/page/:page", function(req, res, next) {
    var page = req.params.page;
    User.find().populate({ path: 'projects', options: { sort: { 'averageRating': -1 } } })
        .limit(10)
        .skip(10 * page)
        .sort({ createdAt: "descending" })
        .exec(function(err, users) {
            User.count().exec(function(err, count) {
                if (err) { return next(err); }
                res.render('index', {
                    users: users,
                    page: page,
                    pages: Math.ceil(count / 10)
                });

            });
        });
});

router.get("/signup", function(req, res) {
    res.render("signup");
});

router.get("/cover", ensureAuthenticated, function(req, res) {
    res.render("cover", { user: req.user });
});

router.get("/login", function(req, res) {
    res.render("login");
});

router.get("/logout", function(req, res) {
    req.logout();
    res.redirect("/");
});

router.get("/edit", ensureAuthenticated, function(req, res) {
    res.render("edit", { user: req.user });
});

// router.get("/editProject/:project", ensureAuthenticated, function(req, res) {
//     var currUser = req.user.username;
//     var id = req.params.project;
//     Project
//         .findOne({ _id: id })
//         .populate('_creator')
//         .exec((err, project) => {
//             if (err) {
//                 next(err);
//                 return;
//             }
//             var user = project._creator.username;
//             if (user == currUser) {
//                 res.render("editProject", { project: project });
//             }
//             return next(403);
//         });
// });

router.get("/portfolio/:username", function(req, res, next) {
    var username = req.params.username;
    res.redirect("/portfolio/" + username + "/0");
});

router.get("/portfolio/:username/:page", function(req, res, next) {
    var page = req.params.page;
    var count;
    User.findOne({ username: req.params.username }).exec((err, user) => {
        if (err) { next(err) }
        if (!user) { return next(404); }
        count = user.projects.length;
    });
    User
        .findOne({ username: req.params.username })
        .populate({
            path: 'projects',
            options: { sort: { 'averageRating': -1 }, limit: '5', skip: 5 * page }
        })
        .exec((err, user) => {

            if (err) {
                next(err);
                return;
            }
            if (!user) { return next(404); }
            res.render('portfolio', {
                user: user,
                page: page,
                pages: Math.ceil(count / 5)
            });

        });

});


router.get("/add_project", ensureAuthenticated, function(req, res) {
    res.render("add_project");
});

router.get("/delete/:project", ensureAuthenticated, function(req, res, next) {
    var currUser = req.user.username;
    var id = req.params.project;
    Project
        .findOne({ _id: id })
        .populate('_creator')
        .exec((err, project) => {
            if (err) {
                next(err);
                return;
            }
            var user = project._creator.username;
            if (user == currUser) {
                res.render("confirmDelete", { project: project });
            }
            return next(403);
        });
});

router.get("/delete", function(req, res) {
    res.render("deleted");
});

// POST
router.post("/signup", function(req, res, next) {
    var username = req.body.username;
    var password = req.body.password;
    var email = req.body.email;
    var nameRegex = /^[a-zA-Z0-9\-\_]+$/;
    var passwordRegex = /(?=.*[!@#\$%\^&\*\-\_])(?=.*[0-9])(?=.{8,})/;

    if (!username.match(nameRegex)) {
        req.flash("error", "Username must contain only letters, numbers, underscores or dashes.");
        return res.redirect("/signup");
    }
    if (!password.match(passwordRegex)) {
        req.flash("error", "Password must be of length 8 or more, contain atleast one special character and one digit.");
        return res.redirect("/signup");
    }
    User.findOne({ username: username.toLowerCase() }, function(err, user) {
        if (err) { return next(err); }
        if (user) {
            req.flash("error", "User already exists");
            return res.redirect("/signup");
        }

        User.findOne({ email: email }, function(err, user) {
            if (err) { return next(err); }
            if (user) {
                req.flash("error", "Email already exists");
                return res.redirect("/signup");
            }
            var newUser = new User({
                username: username.toLowerCase(),
                password: password,
                email: email,
            });
            newUser.save(next);
        });
    });
}, passport.authenticate("login", {
    successRedirect: "/",
    failureRedirect: "/signup",
    failureFlash: true
}));

router.post("/login", passport.authenticate("login", {
    successRedirect: "/",
    failureRedirect: "/login",
    failureFlash: true
}));

router.post("/add_project", upload.single('image'), ensureAuthenticated, function(req, res, next) {

    var studentname = req.body.studentname;
    var title = req.body.title;
    var description = req.body.description;
    var repository = req.body.repository;
    var file = req.file;

    if ((req.body.repository == "" || !validUrl.isUri(req.body.repository)) && req.file == undefined) {
        req.flash("error", "Please enter a link to the repository or a screenshot of your work.");
        return res.redirect("/add_project");
    }

    var newproject = new Project({
        _creator: req.user._id,
        title,
        description,
        averageRating: 0
    });

    if (repository) {
        newproject.repository = repository;
    }

    if (file) {
        newproject.image = file.filename;
    }


    newproject.save((err) => {
        req.user.projects.push(newproject);
        req.user.studentName = studentname;
        req.user.save(function(err) {
            if (err) {
                next(err);
                return;
            }
            if (req.user.projects.length == 1)
                req.flash("info", "Your portfolio was successfully created!");
            req.flash("info", "Project added successfully!");
            return res.redirect("/add_project");
        });
    });
});

router.post("/edit", ensureAuthenticated, function(req, res, next) {
    req.user.studentName = req.body.studentname;
    req.user.email = req.body.email;
    req.user.description = req.body.description;
    req.user.save(function(err) {
        if (err) {
            next(err);
            return;
        }
        req.flash("info", "Profile updated!");
        res.redirect("/edit");
    });
});

router.post("/cover", upload.single('cover'), ensureAuthenticated, function(req, res, next) {
    var file = req.file;
    req.user.cover = file.filename;
    req.user.save(function(err) {
        if (err) {
            next(err);
            return;
        }
        req.flash("info", "Portfolio Cover updated!");
        res.redirect("/cover");
    });
});

router.post("/delete", ensureAuthenticated, function(req, res, next) {
    var id = req.body.id;
    Project.find({ _id: id }).remove().exec((err) => {
        if (err) {
            next(err);
            return;
        }
        var projects = req.user.projects;
        projects.remove(id);
        req.user.save();
        req.flash("info", "Project deleted successfully!");
        res.redirect("/delete");
    });
});

module.exports = router;