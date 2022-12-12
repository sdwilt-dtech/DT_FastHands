const DB = require('./db')

const Model = function UserModel (data) {
	this.id = this.ID = data.id
	this.firstName = data.first_name
	this.lastName = data.last_name
	this.email = data.email
	this.phone = data.phone

	this.score1 = data.score_1 || 0
	this.score2 = data.score_2 || 0
	this.best = data.best || 0

	this.rank = data.rank || false

	this.finished = (this.score1 && this.score2)
	
	this.name = `${this.firstName} ${this.lastName}`

	this.addScore = (score) => {
		if (this.score1 == 0) {
			this.score1 = score
			return this.updateBest()
		}

		if (this.score2 == 0) {
			this.score2 = score
			return this.updateBest()
		}

		console.log('ERROR')
		return false
	}

	this.updateBest = () => {
		if (this.score1 == 0) // both scores are empty
			this.best = 0

		else if (this.score2 == 0) // only has score1
			this.best = this.score1

		else // find the better score
			this.best = this.score1 < this.score2 ? this.score1 : this.score2

		return this
	}

	this.save = () => {
		if (this.id) {
			return this.update()
		}
		return this.create()
	}

	this.clearScore = (score) => {
		if (score == 1)
			this.score1 = this.score2;
		
		this.score2 = 0;

		return this.updateBest().save();
	}

	this.update = () => DB.update(this).then(() => this)
	this.create = () => DB.create(this).then(id => Collection.find(id))


	this.delete = () => {
		console.log('delete')
		console.log(this)
		return DB.delete(this.id).then(done => true).catch(done => false)
	}

	this.bestFormatted = () => (this.best / 1000).toFixed(3)

	return this
}

const Collection = {
	all: () => DB.all().then(users => users.map(data => new Model(data))),
	find: (id) => DB.find(id).then(data => new Model(data)),
	findByEmail: (email) => DB.findByEmail(email).then(data => new Model(data)),
	leaders: (count = 16) => DB.leaders(count).then(users => users.map(data => new Model(data))),
}

module.exports.User = Model;
module.exports.Users = Collection;
