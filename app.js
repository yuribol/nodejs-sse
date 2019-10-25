const express = require('express')
const redis = require('redis')

var publisher, subscriber

if (process.env.NODE_ENV == "development") {
	publisher = redis.createClient(process.env.REDIS_URL)
	subscriber = redis.createClient(process.env.REDIS_URL)
} else {
	const clientParams = {no_ready_check: true, auth_pass: process.env.REDIS_PASSWORD}
	publisher = redis.createClient(process.env.REDIS_PORT, process.env.REDIS_HOST, clientParams)
	subscriber = redis.createClient(process.env.REDIS_PORT, process.env.REDIS_HOST, clientParams)
}

const app = express()
const port = process.env.PORT

var setOfConnections = {}

app.get('/', (req, res) => res.send('Hello World!'))

app.get('/ping', (req, res) => {

	const message = req.query.message

	console.log(message)

	for (userId in setOfConnections) {
		setOfConnections[userId](message)
	}

	publisher.publish('notification', '{\"message\":\"Hello world from ASDFG!\""}', () => {
		console.log('Published')
	})

	res.send("OK!")
})

app.get('/events', (req, res) => {

	const userId = req.query.user_id

	res.setHeader('Content-Type', 'text/event-stream')
  	res.setHeader('Cache-Control', 'no-cache')
  	res.setHeader('Access-Control-Allow-Origin', "*")

  	res.write('\n\n')

  	setOfConnections[userId] = (message) => {
  		res.write("data: " + message + "\n\n")
  	}

  	console.log("Subscribing")

  	subscriber.on('message', (channel, message) => {
  		console.log('Message: ' + message + ' on channel: ' + channel + ' is arrive!');
	});
	
	subscriber.subscribe('notification')

	res.on('close', () => {
		delete setOfConnections[userId]
    })

})

app.listen(port, () => console.log(`Example app listening on port ${port}!`))
