var express = require("express");
var passport = require("passport");
var User = require("./models/user");
var Project = require("./models/project");
var multer = require('multer');
var crypto = require('crypto');
var path = require('path');

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
router.get("/", function(req, res, next) {

    User.find().populate('projects')
        .sort({ createdAt: "descending" })
        .exec(function(err, users) {
            if (err) { return next(err); }
            res.render("index", { users: users });
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
    res.render("edit");
});

router.get("/portfolio/:username", function(req, res, next) {
    User.findOne({ username: req.params.username }).populate('projects').
    exec((err, user) => {
        if (err) {
            next(err);
            return;
        }
        if (!user) { return next(404); }
        res.render("portfolio", { user: user });
        console.log("projects", req.params.projects);
    })

});


router.get("/add_project", ensureAuthenticated, function(req, res) {
    res.render("add_project");
});

// POST
router.post("/signup", function(req, res, next) {
    var username = req.body.username;
    var password = req.body.password;
    var email = req.body.email;

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

    if (req.body.repository == "" && req.file == undefined) {
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
            req.flash("info", "Project added successfully!");
            return res.redirect("/portfolio/" + req.user.username);
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
        res.redirect("/portfolio/" + req.user.username);
    });
});

module.exports = router;