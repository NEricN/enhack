var Evernote = require('evernote').Evernote;
var request = require('request');
var si = require('search-index');

var config = require('../config.json');

exports.favoriteNote = function(req, res) {
  if(req.session.oauthAccessToken) {
    req.models.User.findOne({id: req.session.uid}, function(err, response) {
      if(err || !response) {
        // user doesn't exist
        res.redirect('/');
      } else {
        response.favorites = response.favorites||[];
        if(response.favorites.indexOf(req.body.guid) < 0) {
          response.favorites.push(req.body.guid);

          req.models.Note.findOne({guid: req.body.guid}, function(err, noteDoc) { 
            noteDoc.likes += 1;
            noteDoc.save();
          });
          response.save();
        }
        res.redirect('/');
      }
    });
  } else {
    res.redirect('/');
  }
};

// get
exports.viewNote = function(req, res) {
  if(req.session.oauthAccessToken) {
    var user = req.models.User.findOne({id: req.session.uid}, function(err, docUser) {
      var note = req.models.Note.findOne({guid: req.query.guid}, function(err, doc) {
        if(err || !doc) {
          res.redirect('/');
        } else {
          doc.views += 1;
          doc.save();

          res.render('note.html', {
            note: doc,
            favorite: docUser.favorites&&(docUser.favorites.indexOf(req.query.guid) >= 0)
          });
        }
      })
    })
  } else {
    res.redirect('/');
  }
}

// post
// TODO: user can spoof guid right now
exports.publishNote = function(req, res) {
  var guid, shard;
  if(!req.body.guid) {
    var str = req.body.guidstring;
    shard = str.substr(str.indexOf("shard/") + 6, str.indexOf("/", str.indexOf("shard/") + 6) - 6 - str.indexOf("shard/"));
    guid = str.substr(str.indexOf("sh/") + 3, str.indexOf("/", str.indexOf("sh/") + 3) - 3 - str.indexOf("sh/"));
  } else {
    guid = req.body.guid;
  }

  var note = req.models.Note.findOne({guid: guid}, function(err, doc) {
    if(err || !doc) {
      // getting image
      request.post("http://sandbox.evernote.com/shard/" + shard + "/thm/note/" + guid + ".png",
        {encoding: null, form: {auth: req.session.oauthAccessToken, size: 150}},
        function(err,res2,body) {

          console.log(body);
          body = new Buffer(body);

          var newNote = new req.models.Note({
            name: req.body.name,
            guid: guid,
            description: req.body.description,
            tags: req.body.tags.split(","),
            ownerGuid: req.session.uid,
            ownerUsername: req.session.username,
            ownerToken: req.session.oauthAccessToken,
            category: req.body.category,
            shard: shard
          });

          newNote.thumbnail.data = new Buffer(body.toString('binary'), 'binary').toString('base64');;
          newNote.thumbnail.contentType = 'image/png';

          newNote.save();

          si.add({
            name: newNote.name,
            description: newNote.description,
            tags: newNote.tags,
            category: newNote.category
          }, newNote._id, ['category', 'tags', 'name', 'description'])

          res.redirect('/');
        });
    } else {
      res.redirect('/');
    }
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
  if(req.session.oauthAccessToken) {
    var note = req.models.Note.findOne({guid: req.query.guid}, function(err, doc) {
      if(err || !doc) {
        // dude, note not found
        res.redirect('/');
      } else {
        // note found! commence elaborate copying mechanism
        var token = req.session.oauthAccessToken;
        var clientUser = new Evernote.Client({
          token: token,
          sandbox: config.SANDBOX
        });

        doc.downloads += 1;
        doc.save();

        req.models.User.findOne({id: doc.ownerGuid}, function(err, docOwner) {
          var clientOwner = new Evernote.Client({
            token: docOwner.token,
            sandbox: config.SANDBOX
          })
          var noteStoreUser = clientUser.getNoteStore();
          var noteStoreOwner = clientOwner.getNoteStore();

          noteStoreOwner.getNote(
            docOwner.token,
            req.query.guid,
            true,
            true,
            true,
            true,
            function(err, response) {
              delete response.notebookGuid;
              delete response.guid;

              noteStoreUser.createNote(
                req.session.oauthAccessToken,
                response,
                function(err, response) {
                  res.redirect('/');
              });
            }
          );
        })
    }
    });
  }
  else {// not logged in
    res.redirect('/');
  }
};

// home page
exports.index = function(req, res) {
  res.locals.session = req.session;
  if(req.session.oauthAccessToken) {
    var base = req.models.Note.find;

    if(req.query.textsearch) {
      si.search({
        "query": {
          "*": [req.query.textsearch]
        },
        "weight": {
          "name": [
            "10"
          ],
          "description": [
            "5"
          ]
        }
      }, function(msg) {
        req.models.Note.find(function(err, doc) {
            res.render('home.html', {
            title: "Welcome",
            noteArray: doc,
            text: req.query.textsearch
          })
        })
      });
    } else if(req.query.sortby) {
      req.models.Note.find().sort("-"+ req.query.sortby).exec(function(err, doc) {
          res.render('home.html', {
          title: "Welcome",
          noteArray: doc
        })
      });
    } else {
      req.models.Note.find(function(err, doc) {
          res.render('home.html', {
          title: "Welcome",
          noteArray: doc
        })
      })
    }    
  } else {
    res.render('login.html', {
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

  client.getRequestToken(req.fullUrl + "/oauth_callback", function(error, oauthToken, oauthTokenSecret, results){
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
