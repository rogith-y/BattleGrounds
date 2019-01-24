//index.js/
var express = require('express'),
    passport = require('passport'),
    exphbs = require('express-handlebars'),
    logger = require('morgan'),
    cookieParser = require('cookie-parser'),
    bodyParser = require('body-parser'),
    methodOverride = require('method-override'),
    session = require('express-session'),
    LocalStrategy = require('passport-local'),
    TwitterStrategy = require('passport-twitter'),
    GoogleStrategy = require('passport-google'),
    FacebookStrategy = require('passport-facebook');
var assert = require('assert');
var objectId = require('mongodb').ObjectID;
//We will be creating these two files shortly
var config = require('./config.js'), //config file contains all tokens and other private info
    funct = require('./functions.js'); //funct file contains our helper functions for our Passport and database work
var mongo = require('mongodb').MongoClient;
var app = express();
var url = 'mongodb://localhost/final';
//===============EXPRESS================
// Configure Express
app.use(logger('combined'));
app.use(cookieParser());
app.use(bodyParser.urlencoded({ extended: false }));
app.use(bodyParser.json());
app.use(methodOverride('X-HTTP-Method-Override'));
app.use(session({secret: 'supernova', saveUninitialized: true, resave: true}));
app.use(passport.initialize());
app.use(passport.session());
// Session-persisted message middleware
app.use(function(req, res, next){
    var err = req.session.error,
    msg = req.session.notice,
    success = req.session.success;
    res.locals.user= req.user;
    delete req.session.error;
    delete req.session.success;
    delete req.session.notice;
    if (err) res.locals.error = err;
    if (msg) res.locals.notice = msg;
    if (success) res.locals.success = success;
    next();
});
// Configure express to use handlebars templates
var hbs = exphbs.create({
    defaultLayout: 'main', //we will be creating this layout shortly
});
app.engine('handlebars', hbs.engine);
app.set('view engine', 'handlebars');

var google = require('googleapis');
require('./config/passport')(passport);

/////////////////////////////////////////////////////////////////////////////////////////////
/////////////////////////////////////////////////////////////////////////////////////////////
/////////////////////////////////////////////////////////////////////////////////////////////
//=============PASSPORT===============
//This section will contain our work with Passport
// Use the LocalStrategy within Passport to login/"signin" users.

passport.use('local-signin', new LocalStrategy(
  {passReqToCallback : true}, //allows us to pass back the request to the callback
  function(req, username, password, done) {
    funct.localAuth(username, password)
    .then(function (user) {
      if (user) {
        console.log("REGISTERED: " + user.username);
        req.session.msg=user;
        console.log("hi---------------------"+req.session.msg.username);
        done(null, user);
      }
      if (!user) {
        console.log("COULD NOT REGISTER");
        req.session.error = 'Incorrect Username or password'; //inform user could not log them in
        done(null, user);
      }
    })
    .fail(function (err){
      console.log(err.body);
    });
  }
));

// Use the LocalStrategy within Passport to register/"signup" users.

passport.use('local-signup', new LocalStrategy(
  {passReqToCallback : true}, //allows us to pass back the request to the callback
  function(req, username, password, done) {
    funct.localReg(username, password)
    .then(function (user) {
      if (user) {
        console.log("REGISTERED: " + user.username);
        req.session.success = 'You are successfully registered and logged in ' + user.username + '!';
        req.session.msg=user;
        done(null, user);
      }
      if (!user) {
        console.log("COULD NOT REGISTER");
        req.session.error = 'That username is already in use, please try a different one.'; //inform user could not log them in
        done(null, user);
      }
    })
    .fail(function (err){
      console.log(err.body);
    });
  }
));

// Passport session setup.
passport.serializeUser(function(user, done) {
  console.log("serializing " + user.username);
  done(null, user);
});

passport.deserializeUser(function(user, done) {
  console.log("deserializing " + user);
  done(null, user);
});

/////////////////////////////////////////////////////////////////////////////////////////////
/////////////////////////////////////////////////////////////////////////////////////////////
/////////////////////////////////////////////////////////////////////////////////////////////

//==================================================================//
const mongoose=require('mongoose');
const keys=require('./config/keys');
const multer = require('multer');
const GridFsStorage = require('multer-gridfs-storage');
const Grid = require('gridfs-stream');
mongoose.connect(keys.mongodb.dbURI,()=>{
  console.log('connected to mongodb');
});
const mongoURI = 'mongodb://localhost:27017/final';
// Create mongo connection
const conn = mongoose.createConnection(mongoURI);
let gfs;
conn.once('open', () => {
  // Init stream
  gfs = Grid(conn.db, mongoose.mongo);
  
  gfs.collection('image');
});

// Create storage engine
const storage = new GridFsStorage({
  url: keys.mongodb.dbURI,
  file: (req, file) => {
    return new Promise((resolve, reject) => {
        const filename = file.originalname;
        const fileInfo = {
          filename: filename,
          bucketName: 'image'
        };
        resolve(fileInfo);
    });
  }
});
const upload = multer({ storage });
// @route POST /upload
// @desc  Uploads file to DB
app.get('/upload',(req, res) => {
  var level='one'+req.session.msg.level+'one';
  gfs.files.find({"filename": new RegExp(level)}).toArray((err, files) => {
    // Check if files
    if (!files || files.length === 0) {
      res.render('login', { files: false });
    } else {
      files.map(file => {
        if (
          file.contentType === 'image/jpeg' ||
          file.contentType === 'image/png'
        ) {
          file.isImage = true;
        } else {
          file.isImage = false;
        }
      });
     console.log(req.session);
     console.log(files);
     res.json({files:files});   
    }
  }); 
});

app.get('/clues', function(req, res, next) {
  var level=req.session.msg.level;
  var clues = [];
  mongo.connect(url, function(err, db) {
    assert.equal(null, err);
    var cursor = db.collection('clues').find({"level":level});
    cursor.forEach(function(doc, err) {
      assert.equal(null, err);
      clues.push(doc);
    }, function() {
      db.close();
      res.json({clues: clues});
    });
  });
});

app.get('/notif', function(req, res, next) {
  var level=req.session.msg.level;
  var notification = [];
  mongo.connect(url, function(err, db) {
    assert.equal(null, err);
    var cursor = db.collection('clues').find({"level":level});
    cursor.forEach(function(doc, err) {
      assert.equal(null, err);
      notification.push(doc);
    }, function() {
      db.close();
      res.json({notification: notification});
    });
  });
});


app.get('/files/:filename', (req, res) => {
  gfs.files.findOne({ filename: req.params.filename }, (err, file) => {
    // Check if file
    if (!file || file.length === 0) {
      return res.status(404).json({
        err: 'No file exists'
      });
    }
    // File exists
    const readstream = gfs.createReadStream(file.filename);
    return readstream.pipe(res);
  });
});



app.get('/image/:filename', (req, res) => {
  gfs.files.findOne({ filename: req.params.filename }, (err, file) => {

    if (!file || file.length === 0) {
      return res.status(404).json({
        err: 'No file exists'
      });
    }

 
    if (file.contentType === 'image/jpeg' || file.contentType === 'image/png') {
      
      const readstream = gfs.createReadStream(file.filename);
      readstream.pipe(res);
    } else {
      res.status(404).json({
        err: 'Not an image'
      });
    }
  });
});

app.post('/validate',function(req,res,done){
  console.log('vaaaaaaaaaaaaaaaaaaaaaaaaaallllllllll');
  var answer=req.body.answer;
  var answ=answer.toLowerCase();
  answer=answ.replace(/\s/g,"");
  console.log('ooooooooooollllllll'+answ);
  console.log('aaaaaaaaaaaaaaaaaaaaaaaaannnnnnnnnnnnnnnsssssssssssss'+answer);
  mongo.connect(url, function(err, db) {
    var lvl=req.session.msg.level;
    console.log('########################'+lvl);
    var id = req.session.msg._id;
    console.log('--------------------'+id);
    db.collection('check').findOne({"level": lvl},function(err,result){
    console.log('££££££££££££££££££'+result.answer);
    if (result.answer == answer) {
      
      var t=Date.now();
      var lev=24-lvl;
      var con=lev.toString()+t.toString();
      db.collection('users').update({"_id": objectId(id)},{ $inc: { "level":1}});
      db.collection('users').update({"_id": objectId(id)},{$set:{"con":con}});
          db.close();
          req.session.msg.level=lvl+1;
          console.log('aaaaaaaaaaaaaaaaaaaaaaa'+req.session.msg.level);
          if(req.session.msg.level == "21"){
            res.json({flag:2});
          }
          else{
          res.json({flag:1});
          }
    }
    else{
      res.json({flag:0});
    }
    });
}); 
});
///////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

app.get('/leader',function(req,res){
  var details = [];
  mongo.connect(url, function(err, db) {
    assert.equal(null, err);
    var cursor = db.collection('users').find().sort({"con":1});
    cursor.forEach(function(doc, err) {
      assert.equal(null, err);
      details.push(doc);
    }, function() {
      db.close();
      res.json({details: details,usr:req.session.msg._id});
    });
  });
});

app.get('/query',function(req,res){
  res.json({que:req.session.msg.level});
});

app.get('/profiles',function(req,res){
  mongo.connect(url, function(err, db) {
    var usr=req.session.msg._id;
    db.collection('users').findOne({"_id":objectId(usr)}, function(err, task){
      res.json({profile:task});
    });
    db.close();
  });
});
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
///////////////////////////////////////////////////////////////////////////////////////////////////////////
////////////////////////////////////////////////////////////////////////////////////////////////////////////
app.post('/update', function(req, res, done) {
  console.log('hbcshbsbsbcjsb'+req.session.msg);
  var t=Date.now();
  var lev=24;
  var con=lev.toString()+t.toString();
  console.log("qqqqqqqqqqqqqqqqqqqqqqqqqqqq"+con);
  var item = {
    name: req.body.name,
    phone: req.body.phone,
    college: req.body.college,
    avatar: req.body.avatar,
    level: 1,
    con:con
  };
  var id = req.body.id;
  mongo.connect(url, function(err, db) {
    assert.equal(null, err);
    db.collection('users').updateOne({"_id": objectId(id)},{$set: item}, function(err,result) {
      assert.equal(null, err);
      console.log('Item updated');
    });
    db.collection('users').updateOne({"_id": objectId(id)},{ $inc: { "google.level":1} });
    db.collection('users').findOne({"_id":objectId(id)}, function(err, task){
      console.log(id);
      console.log(task);
      console.log(task.name);
      console.log(task.phone);
      console.log(task.college);
      req.session.msg=task;
      req.session.save();
      console.log('--------------------------------'+req.session.msg.time);
      console.log('--------------------------------'+req.session.msg);
      console.log('--------------------------------'+req.session.msg.name);
      console.log('--------------------------------'+req.session.msg.college);
      console.log('--------------------------------'+req.session.msg.phone);
      console.log('--------------------------------'+req.session.msg._id);
  });
  db.close();
  res.redirect('/');
  });
});
//////////////////////////////////////////////////////////////////////////////////////////////////////////

//google+
app.get('/auth/google', passport.authenticate('google', {scope: ['profile', 'email']}));

app.get('/auth/google/callback',
    passport.authenticate('google', { successRedirect: '/profile',
                                        failureRedirect: '/' }));

app.get('/profile', isLoggedIn, function(req,res){
  console.log(req.user);
  console.log("00000000000000000000"+req.user.google.level);
  req.session.msg=req.user;
  if(req.user.google.level == 0)
  {req.session.msg=req.user;
    res.render('details',{user:req.user});  
  }
  else{
    res.redirect('/');
  }
  });

function isLoggedIn(req, res, next) {
  if(req.isAuthenticated()){
    return next();
  }

  res.redirect('/login');
}


/////////////////////////////////////////////////////////////////////////////////////////////////////////
///////////////////////////////////////////////////////////////////////////////////////////////////////////
////////////////////////////////////////////////////////////////////////////////////////////////////////////
//===============ROUTES===============

//This section will hold our Routes
app.get('/',function(req,res){
  res.render('load');
})
app.get('/home', function(req, res){
  if(req.session.msg)
  { 
    if(req.session.msg.level >= 21)
    {
      res.redirect('/finish');
    } 
    else{
      if(req.session.msg.name){
    console.log('ftvh-----------------------------------------------------'+req.session.msg.username);
  req.session.save();
  res.render('home', {user: req.session.msg});
      }
      else{
        res.render('details',{user: req.session.msg});
      }
    }
  }
  else
  {  res.render('login');
}
});


app.get('/finish', function(req, res){
  
  if(req.session.msg)
  {
    res.render('finish',{user: req.session.msg});
  }
  else{
    res.render('login');}
});


app.get('/sign', function(req, res){
  if(req.session.msg)
  {
  res.render('details', {user: req.session.msg});
  }
  else{
    res.render('login');
  }
});

app.get('/startgame', function(req, res){
  if(req.session.msg)
  {
  res.render('startgame', {user: req.session.msg});
  }
  else{
    res.render('login');
  }
});




//app.get('/redirect', function(req, res){
  //res.redirect({user:req.user.username},'/insert');
//});
//sends the request through our local signup strategy, and if successful takes user to homepage, otherwise returns then to signin page
app.post('/local-reg', passport.authenticate('local-signup', {
  successRedirect: '/sign',
  failureRedirect: '/login'
  })
);
app.get('/login',function(req,res)
{
  res.render('login');
});
//sends the request through our local login/signin strategy, and if successful takes user to homepage, otherwise returns then to signin page
app.post('/login', passport.authenticate('local-signin', {

  successRedirect: '/',
  failureRedirect: '/login'
  })
);

//logs user out of site, deleting them from the session, and returns to homepage
app.get('/logout', function(req, res){
  if(req.session.msg)
  {
  var name = req.user.username;
  console.log("LOGGIN OUT " + req.user.username)
  req.session.destroy(function(err){
    if(err)
    {
      console.log(err);
    }
    else
    {
      res.redirect('/login');
    }
  });
}
else{
  res.render('login');
}  
});

// Simple route middleware to ensure user is authenticated.
function ensureAuthenticated(req, res, next) {
  if (req.isAuthenticated()) { return next(); }
  req.session.error = 'Please sign in!';
  res.redirect('/signin');
}

//===============PORT=================
var port = process.env.PORT || 3000; //select your port or let it pull from your .env file
app.listen(port);
console.log("listening on " + port + "!");
app.use(express.static("./public"));





