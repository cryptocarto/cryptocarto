/*
* Get a configured mongoose instance
*/

// Connect to mongo and declare PinToken schema
var mongoose = require('mongoose');
mongoose.connect(process.env.MONGODB_URI, {useNewUrlParser: true, useUnifiedTopology: true});
var db = mongoose.connection;
db.on('error', console.error.bind(console, 'Connection error:'));
db.once('open', function() { console.log("Connected to DB")});

module.exports = mongoose;
