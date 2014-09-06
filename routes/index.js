var Evernote = require('evernote').Evernote;

var config = require('../config.json');
var callbackUrl = "http://localhost:5000/oauth_callback";

// post
// TODO: user can spoof guid right now
exports.publishNote = function(req, res) {
  var note = req.models.Note.findOne({guid: req.body.guid}, function(err, doc) {
    if(err || !doc) {
      var newNote = new req.models.Note({
        guid: req.body.guid,
        description: req.body.description,
        tags: req.body.tags.split(","),
        ownerGuid: req.session.uid,
        ownerUsername: req.session.username,
        ownerToken: req.session.oauthAccessToken
      });

      newNote.save();
    } else {
      // uhhh, I guess update owner token
      newNote.ownerToken = req.session.oauthAccessToken;
      newNote.save();
    }
    res.redirect('/');
  })
};

// get
exports.publishNotePage = function(req, res) {
  res.locals.session = req.session;

  if(req.session.oauthAccessToken)
    return res.render('publish.html', {
      title: "Publish a Note"
    })
  else res.redirect('/');
};

// get
exports.saveNote = function(req, res) {
  var note = req.models.Note.findOne({guid: req.body.guid}, function(err, doc) {
    if(err || !doc) {
      // dude, note not found
    } else {
      // uhhh, I guess update owner token
      newNote.ownerToken = req.session.oauthAccessToken;
      newNote.save();
    }
    res.redirect('/');
  })
};

// home page
exports.index = function(req, res) {
  res.locals.session = req.session;
  if(req.session.oauthAccessToken) {
    var token = req.session.oauthAccessToken;
    var client = new Evernote.Client({
      token: token,
      sandbox: config.SANDBOX
    });
    var noteStore = client.getNoteStore();
    noteStore.listNotebooks(function(err, notebooks){
      req.session.notebooks = notebooks;
      res.render('home.html', {
        title: "Welcome"
      });
    });
  } else {
    res.render('home.html', {
      title: "Welcome"
    });
  }
};

// OAuth
exports.oauth = function(req, res) {
  var client = new Evernote.Client({
    consumerKey: config.API_CONSUMER_KEY,
    consumerSecret: config.API_CONSUMER_SECRET,
    sandbox: config.SANDBOX
  });

  client.getRequestToken(callbackUrl, function(error, oauthToken, oauthTokenSecret, results){
    if(error) {
      req.session.error = JSON.stringify(error);
      res.redirect('/');
    }
    else { 
      // store the tokens in the session
      req.session.oauthToken = oauthToken;
      req.session.oauthTokenSecret = oauthTokenSecret;

      // redirect the user to authorize the token
      res.redirect(client.getAuthorizeUrl(oauthToken));
    }
  });

};

// OAuth callback
exports.oauth_callback = function(req, res) {
  var client = new Evernote.Client({
    consumerKey: config.API_CONSUMER_KEY,
    consumerSecret: config.API_CONSUMER_SECRET,
    sandbox: config.SANDBOX
  });

  client.getAccessToken(
    req.session.oauthToken, 
    req.session.oauthTokenSecret, 
    req.param('oauth_verifier'), 
    function(error, oauthAccessToken, oauthAccessTokenSecret, results) {
      if(error) {
        console.log('error');
        console.log(error);
        res.redirect('/');
      } else {
        // store the access token in the session
        req.session.oauthAccessToken = oauthAccessToken;
        req.session.oauthAccessTtokenSecret = oauthAccessTokenSecret;
        req.session.edamShard = results.edam_shard;
        req.session.edamUserId = results.edam_userId;
        req.session.edamExpires = results.edam_expires;
        req.session.edamNoteStoreUrl = results.edam_noteStoreUrl;
        req.session.edamWebApiUrlPrefix = results.edam_webApiUrlPrefix;

        //create or update user

        var client = new Evernote.Client({
          token: oauthAccessToken,
          sandbox: config.SANDBOX
        });

        var userStore = client.getUserStore();
        userStore.getUser(function(err, user) {
          if(err) {
            console.log(err);
          }
          req.models.User.findOne({id: user.id}, function(err, doc) {
            if(err) {
              console.log(err);
            }
            if(!doc || err) {
              var newUser = new req.models.User({
                email: user.email,
                id: user.id,
                token: oauthAccessToken,
                username: user.username
              });

              newUser.save();
            } else {
              doc.token = oauthAccessToken;
              doc.save();
            }


            req.session.username = user.username;
            req.session.email = user.email;
            req.session.uid = user.id;

            res.redirect('/');
          });
        });
      }
    });
};

// Clear session
exports.clear = function(req, res) {
  req.session.destroy();
  res.redirect('/');
};
