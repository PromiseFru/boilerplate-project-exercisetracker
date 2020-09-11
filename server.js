const express = require('express')
const app = express()
const bodyParser = require('body-parser')

const cors = require('cors')

const mongoose = require('mongoose')
// DB connection
mongoose.connect(process.env.MONGODB_URI, {useNewUrlParser: true, useUnifiedTopology: true})
    .then(() => console.log("Database Connected"))
    .catch(err => console.log("Database connection error", err));

var Schema = mongoose.Schema;

app.use(cors())

app.use(bodyParser.urlencoded({extended: false}))
app.use(bodyParser.json())


app.use(express.static('public'))
app.get('/', (req, res) => {
  res.sendFile(__dirname + '/views/index.html')
});

// Create document Schema
var userSchema = new Schema({
  username: { type: String, required : true },
  exercise:[{
      description: String,
      duration: Number,
      date: Date
  }]
})
// create Model
var User = mongoose.model('User', userSchema);

app.post('/api/exercise/new-user', (req, res) => {
  var username = req.body.username;
  // create user in db with username from body
  User.create({username: username}, (err, user) => {
      if(err) return console.log(err);
      res.json({
          username: user.username,
          Id: user._id
      })
  })
});

app.get('/api/exercise/users', (req, res) => {
  // return an array of all users in db 
  User.find({}, (err, users) => {
      if(err) return console.log(err);
      res.json(users)
  })
})

app.post('/api/exercise/add', (req, res, next) => {
  var id = req.body.id;
  var description = req.body.description;
  var duration = req.body.duration;
  var date = req.body.date;
  if(date == "") {
      date = Date();
  }
  var newExercise = {
      description: description,
      duration: duration,
      date: date
  }

 User.updateOne({_id: id}, {$push: {exercise:newExercise}}, (err) => {
      if(err) return console.log(err)
      User.findById(id, (err, user) => {
          if (err) return console.log(err);
          var lastExerciseExtract = user.exercise.slice(-1)[0];
          res.json({
              id: user._id,
              username: user.username,
              description: lastExerciseExtract.description,
              duration: lastExerciseExtract.duration,
              date: lastExerciseExtract.date
          })
      }) 
 })
})

app.get('/api/exercise/log', (req, res) => {
  var id = req.query.userid;
  var from = req.query.from;
  var to = req.query.to;
  var limit = req.query.limit

  User.findById(id, (err, user) => {
      if(err) return console.log(err);
      var count = user.exercise.length;
      res.json({
          count: count,
          logs: user.exercise
      })
  })
  // retrieve exercise log of any user with params userId(_id)
  // retrieve part of log by passing optional params of (from , to) = yyyy-mm-dd or limit = int
  // returnu ser obj with array log and count
})

// Not found middleware
app.use((req, res, next) => {
  return next({status: 404, message: 'not found'})
})

// Error Handling middleware
app.use((err, req, res, next) => {
  let errCode, errMessage

  if (err.errors) {
    // mongoose validation error
    errCode = 400 // bad request
    const keys = Object.keys(err.errors)
    // report the first validation error
    errMessage = err.errors[keys[0]].message
  } else {
    // generic or custom error
    errCode = err.status || 500
    errMessage = err.message || 'Internal Server Error'
  }
  res.status(errCode).type('txt')
    .send(errMessage)
})

const listener = app.listen(process.env.PORT || 3000, () => {
  console.log('Your app is listening on port ' + listener.address().port)
})
