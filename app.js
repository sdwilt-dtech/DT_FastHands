const fs = require('fs');
const express = require('express');
const app = require('express')();
const server = require('http').Server(app);
const io = require('socket.io')(server);
const fastcsv = require("fast-csv");
var pool = require("./db").pool;

// const IP = process.env.IP || localhost;
// const PORT = process.env.PORT || 3000;


const path = require('path')

const User = require('./user').User
const Users = require('./user').Users

app.get('/views', function(req, res) {
	res.send("Hello world2!")
});
app.listen(3000, function() {
	console.log("Server is listening on port 3000, I think...");
});

let queue = []
let queue1 = []
let queue2 = []

const sendQueues = () => {
	io.emit('queue', { queue });
	io.emit('queue1', { queue1 });
	io.emit('queue2', { queue2 });
}

const removeFromQueues = (user) => {
	queue = queue.filter(u => user.id != u.id);
  	queue1 = queue1.filter(u => user.id != u.id);
	queue2 = queue2.filter(u => user.id != u.id);
}

const addToQueue = (user, q = 0, position = 0) => {
	removeFromQueues(user);
	
	switch (q) {
		case 0: queue.splice(position, 0, user); break;
		case 1: queue1.splice(position, 0, user); break;
		case 2: queue2.splice(position, 0, user); break;
	}

	sendQueues();
}

app.set('views', path.join(__dirname, 'views'))
app.set('view engine', 'ejs')

app.use(express.json())
app.use(express.urlencoded({ extended: false }))
app.use(express.static(path.join(__dirname, 'public')))

app.get('/', (req, res) => res.render('add-user'))

app.get('/users', (req, res) => {
	Users.all().then(users => res.render('users', {users}))
})

app.get('/leaderboard', (req, res) => {
	Users.leaders(16).then(users => res.render('leaderboard', {users}))
})

app.get('/add-user', (req, res) => res.render('add-user'))
app.post('/add-user', (req, res) => {
	var user = new User(req.body)
	user.save().then(user => {
		addToQueue(user, 0, 0)
		sendQueues()
		res.render('add-user', {user})
	})
})

app.get('/delete-user/:id', (req, res) => {
	Users.find(req.params.id)
		.then(user => {
			removeFromQueues(user)
			sendQueues()
			return user.delete()
		})
		.then(done => {
			io.emit('new-score')
			res.redirect('/users')
		})
})

app.get('/edit-user/:id', (req, res) => {
	Users.find(req.params.id).then(user => res.render('edit-user', {user}))
})

app.get('/clear-score/:uid/:score', (req, res) => {
	Users.find(req.params.uid)
		.then(user => user.clearScore(req.params.score))
		.then(done => {
			io.emit('new-score')
			res.redirect('/users')
		})
})

app.post('/edit-user/:id', (req, res) => {
	Users.find(req.params.id)
		.then(user => {
			console.log(user);
			user.firstName = req.body.first_name
			user.lastName = req.body.last_name
			user.phone = req.body.phone
			user.email = req.body.email
			user.score1 = req.body.score_1
			user.score2 = req.body.score_2

			return user
		})
		.then(user => user.save())
		.then(user => res.redirect('/users'))
		.catch(console.error)
})

app.get('/queue', (req, res) => {
	Users.all()
		.then(users => res.render('queue', {users, queue, queue1, queue2}))
		.catch(console.error)
})

app.get('/queue-user/:id', (req, res) => {
	Users.find(req.params.id)
		.then(user => addToQueue(user, 0, 0))
		.then(() => {
			sendQueues()
			res.redirect('/queue')
		})
})

app.get('/track/:queue/:time', (req, res) => {
	console.log(req.params)
	let user = (req.params.queue == 1) ? queue1[0] : queue2[0];

	if (!user) {
		console.log('error');
	}
	user.addScore(req.params.time)
	console.log(user)

	res.send(`Update accepted for User:${user.name} in Queue:${req.params.queue} with a time of ${req.params.time}`)

	user.save().then(user => {
		removeFromQueues(user)
		sendQueues()
		io.emit('new-score')
	})
})

app.get('/test', (req, res) => res.render('test'));

app.get('/leaders', (req, res) => {
	const ws = fs.createWriteStream("leaders.csv");
	Users.leaders(500).then(users => {
		users = users.map((user, i) => {
			return {
				rank: i+1,
				name: user.name,
				bestTime: user.bestFormatted(),
				phone: user.phone,
				email:user.email
			}
		});
		const jsonData = JSON.parse(JSON.stringify(users));

		fastcsv
			.write(jsonData, { headers: true })
			.on("finish", function() {
				console.log("Write to bezkoder_mysql_fastcsv.csv successfully!");
				res.sendFile(__dirname + "/leaders.csv");
			})
			.pipe(ws);
	})
})

// server.listen(process.env.PORT, process.env.IP, () => console.log(`Listening at ${process.env.IP}:${process.env.PORT}!`))

io.on('connection', function (socket) {
  socket.on('queues', data => sendQueues())

  socket.on('queue-change', data => {
	Users.find(data.uid)
		.then(user => {
			removeFromQueues(user)
			addToQueue(user, data.qid, data.position)
			sendQueues()
		})
  })

  socket.on('queue-user', data => {
  	console.log(data);
  })
})