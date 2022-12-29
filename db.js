var mysql = require('mysql');
var pool  = mysql.createConnection({
	connectionLimit : 10, // number of wired ports, this ensures we have a connection queued up for each device
	connectTimeout: 30000, //30 secs
	host            : '127.0.0.1',
	user            : 'root',
	password        : 'BAller231',
	database        : 'fasthands',
	// port			: '5432',
	debug			:  true,
});

module.exports = pool;

	var getConnection = function (cb) {
		pool.getConnection(function(err, connection) {
			// if (err) throw err;
			if(err) {
				return cb(err);
			}
			cb(null, connection);
		});
	};
module.exports = getConnection;

// pool.query("SELECT * FROM fasthands",(err, data) => {
// 	if(err) {
// 		console.error(err);
// 		return;
// 	}
// 	// rows fetch
// 	console.log(data);
// });

const query = (sql, count = 0) => new Promise((resolve, reject) => {
	pool.query(sql, function (error, results, fields) {
		if (error) return reject(error)

		if (count == 1)
			resolve(results[0])
		else
			resolve(results)
	})
});

module.exports.all = () => query(`SELECT * FROM users`)
module.exports.find = (id) => query(`SELECT * FROM users WHERE id = ${id}`, 1)
module.exports.findByEmail = (email) => query(`SELECT * FROM users WHERE email = "${email}"`, 1)
module.exports.leaders = (count = 16) => query(`SELECT * FROM users WHERE best > 0 ORDER BY best ASC LIMIT ${count}`)

module.exports.delete = (id) => query(`DELETE FROM users WHERE id = ${id}`)

module.exports.create = (user) => new Promise((resolve, reject) => {
	var sql = `INSERT INTO users SET ?`
	var data = {
		first_name: user.firstName,
		last_name: user.lastName,
		phone: user.phone,
		email: user.email,
		score_1: user.score1,
		score_2: user.score2,
		best: user.best
	}

	pool.query(sql, data, (error, results, fields) => (error) ? reject(error) : resolve(results.insertId))
})

module.exports.update = (user) => new Promise((resolve, reject) => {
	var sql = `UPDATE users SET first_name = ?, last_name = ?, email = ?, `
	sql += `phone = ?, score_1 = ?, score_2 = ?, best = ? WHERE id = ?`

	var data = [
		user.firstName,
		user.lastName,
		user.email,
		user.phone,
		user.score1,
		user.score2,
		user.best,
		user.id
	]

	pool.query(sql, data, (error, results, fields) => (error) ? reject(error) : resolve(results))
})


