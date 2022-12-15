# DT_FastHands

Create new project, initialize new npm project
  <code>npm init -y</code>
  
# Requirements
EJS 3.1.6
EXPRES 4.17.1

Configure with "server.js" locally and index.js in PROD mode

<code>var express = require('express');
var app = express();

// set the view engine to ejs
app.set('view engine', 'ejs');

// use res.render to load up an ejs view file
</code>

CREATE all EJS partials

<code>Use <%- include('RELATIVE/PATH/TO/FILE') %> to embed an EJS partial in another file.</code>

#TODO: Setup public Node on Github Pages, Point domain dtfastesthands.com to Git page IP.
