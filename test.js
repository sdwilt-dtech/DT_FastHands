const DB = require('./db')
const User = require('./user').User
const Users = require('./user').Users

Users.all().then(users => {
  let count = users.reduce((count, user) => {
    if (user.score1 > 0)
      count++;
    if (user.score2 > 0)
      count++;
    return count;
  }, 0);

  console.log(count, users.length);
})