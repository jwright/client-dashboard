var Client = mongoose.model('Client');
var Project = mongoose.model('Project');

module.exports = function(app) {
  app.get('/admin', auth.ensureAuthenticated, auth.ensureAdmin, function(req, res) {
    var users, clients;
    utils.when(
      function(done) {
        User.find({}, function(err, collection) {
          // Sort users by client
          users = _.reduce(collection, function(memo, user) {
            var client = user.client || 'not assigned';
            if (memo[client]) {
              memo[client].push(user);
            } else {
              memo[client] = [user];
            }
            return memo;
          }, {});
          done();
        });
      },
      function(done) {
        Client.find({})
          .exec( function(err, collection) {
            clients = collection;
            done();
          });
      }
    ).then(function() {
      res.render('admin/index', {
        title: 'Admin',
        message: req.flash(),
        users: users,
        clients: clients
      });
    });
  });

  app.param('id', function(req, res, next, id){
    var model, isClient;
    if ( req.url.indexOf("admin/users") != -1 ) {
      model = User;
    } else if (req.url.indexOf("admin/clients") != -1 ) {
      // TODO: Is there some way to get "Client" from model instance?
      isClient = true;
      model = Client;
    } else {
      next()
    }

    model
      .findById(id, function(err,foundModel) {
        if (err) { return next(err); }
        if (!foundModel) { return next(new Error('Failed to load resource: ' + id)); }
        req.resource = foundModel;
        if (isClient && req.params.project_id) {
          req.project = foundModel.projects.id(req.params.project_id);
        }
        next();
      });
  });

  // Users
  //----------------------------

  app.get('/admin/users/new', auth.ensureAuthenticated, auth.ensureAdmin, function(req, res) {
    Client.find({}, function(err, clients) {
      res.render('admin/user_new', {
        title: 'Admin',
        message: req.flash(),
        clients: clients,
        user: null
      });
    });
  });

  app.post('/admin/users', auth.ensureAuthenticated, auth.ensureAdmin, function(req, res) {
    new User(req.body.user).save( function(err, user) {
      if (err) {
        res.render('admin/user_new', {
          title: 'Admin',
          message: { error: 'User could not be saved: ' + err }
        });
      } else {
        req.flash('info', "Success!");
        res.redirect('/admin');
      }
    });
  });

  app.get('/admin/users/:id/edit', auth.ensureAuthenticated, auth.ensureAdmin, function(req, res) {
    Client.find({}, function(err, clients) {
      res.render('admin/user_new', {
        title: 'Edit User',
        message: req.flash(),
        clients: clients,
        user: req.resource
      });
    });
  });

  app.put('/admin/users/:id', auth.ensureAuthenticated, auth.ensureAdmin, function(req, res) {
    User.findById(req.resource.id, function(err, user) {
      for (attr in req.body.user) {
        user[attr] = req.body.user[attr];
      }
      user.save( function(err) {
        if (err) {
          Client.find({}, function(clientErr, clients) {
            res.render('admin/user_new', {
              title: 'Edit User',
              message: { error: "User could not be saved: " + err },
              clients: clients,
              user: req.resource
            });
          });
        } else {
          req.flash('info', "Success!");
          res.redirect('/admin');
        }
      });
    });
  });


  // Clients
  //----------------------------

  app.get('/admin/clients/new', auth.ensureAuthenticated, auth.ensureAdmin, function(req, res) {
    res.render('admin/client_new', {
      title: 'Admin',
      message: req.flash(),
      theClient: null
    });
  });

  app.post('/admin/clients', auth.ensureAuthenticated, auth.ensureAdmin, function(req, res) {
    new Client(req.body.client).save( function(err, client) {
      if (err) {
        res.render('admin/client_new', {
          title: 'Admin',
          message: { error: 'Client could not be saved: ' + err },
          theClient: req.resource
        });
      } else {
        req.flash('info', "Success!");
        res.redirect('/admin');
      }
    });
  });

  app.get('/admin/clients/:id/edit', auth.ensureAuthenticated, auth.ensureAdmin, function(req, res) {
    res.render('admin/client_new', {
      title: 'Edit Client',
      message: req.flash(),
      theClient: req.resource
    });
  });

  app.put('/admin/clients/:id', auth.ensureAuthenticated, auth.ensureAdmin, function(req, res) {
    Client.update({_id: req.resource.id}, req.body.client, function(err, numAffected) {
      if (err) {
        res.render('admin/client_new', {
          title: 'Edit Client',
          message: { error: "Couldn't save client: " + err },
          theClient: req.resource
        });
      } else {
        req.flash('info', "Success!");
        res.redirect('/admin');
      }
    });
  });

  // Projects
  //----------------------------

  app.get('/admin/clients/:id/projects/new', auth.ensureAuthenticated, auth.ensureAdmin, function(req, res) {
    res.render('admin/project_new', {
      title: 'Admin',
      message: req.flash(),
      theClient: req.resource,
      project: null
    });
  });

  app.post('/admin/clients/:id/projects', auth.ensureAuthenticated, auth.ensureAdmin, function(req, res) {
    var project = new Project(req.body.project);
    req.resource.projects.push(req.body.project);
    req.resource.save( function(err) {
      if (err) {
        res.render('admin/project_new', {
          title: 'Admin',
          message: { error: 'Project could not be saved: ' + err },
          theClient: req.resource,
          project: req.project
        });
      } else {
        req.flash('info', "Success!");
        res.redirect('/admin');
      }
    });
  });

  app.get('/admin/clients/:id/projects/:project_id/edit', auth.ensureAuthenticated, auth.ensureAdmin, function(req, res) {
    res.render('admin/project_new', {
      title: 'Edit Project',
      message: req.flash(),
      theClient: req.resource,
      project: req.project
    });
  });

  app.put('/admin/clients/:id/projects/:project_id', auth.ensureAuthenticated, auth.ensureAdmin, function(req, res) {
    for (attr in req.body.project) {
      req.project[attr] = req.body.project[attr];
    }
    req.resource.save(function(err) {
      if (err) {
        res.render('admin/project_new', {
          title: 'Edit Project',
          message: { error: "Project could not be saved: " + err },
          theClient: req.resource,
          project: req.project
        });
      } else {
        req.flash('info', "Success!");
        res.redirect('/admin');
      }
    });
  });
};