const express = require('express');
const redis = require('redis');
const path = require('path');

let publisher, subscriber;

if (process.env.NODE_ENV == "development_docker") {

	publisher = redis.createClient(process.env.REDIS_URL);
	subscriber = redis.createClient(process.env.REDIS_URL);

} else {

	const clientParams = {no_ready_check: true, auth_pass: process.env.REDIS_PASSWORD};
	publisher = redis.createClient(process.env.REDIS_PORT, process.env.REDIS_HOST, clientParams);
	subscriber = redis.createClient(process.env.REDIS_PORT, process.env.REDIS_HOST, clientParams);

}

const app = express();
const port = process.env.PORT;

let setOfConnections = {};

app.get('/api/hello-world', (req, res) => res.send('Hello World!'));

app.get('/api/ping', (req, res) => {

	const message = req.query.message;

	console.log(message);

	for (let userId in setOfConnections) {
		setOfConnections.hasOwnProperty(userId) && setOfConnections[userId](message);
	}

	publisher.publish('notification', '{\"message\":\"Hello world from ASDFG!\""}', () => {
		console.log('Published')
	});

	res.send("OK!");
});

app.get('/api/events', (req, res) => {

	const userId = req.query.user_id;

	res.setHeader('Content-Type', 'text/event-stream');
	res.setHeader('Cache-Control', 'no-cache');
	res.setHeader('Access-Control-Allow-Origin', "*");

	res.write('\n\n');

	setOfConnections[userId] = (message) => {
		res.write("data: " + message + "\n\n")
	};

	subscriber.on('message', (channel, message) => {
		console.log('Message: ' + message + ' on channel: ' + channel + ' is arrive!');
	});

	subscriber.subscribe('notification');

	res.on('close', () => {
		delete setOfConnections[userId]
	});

});

app.use(express.static(path.join(__dirname, "client", "build")));

app.get("*", (req, res) => {
  res.sendFile(path.join(__dirname, "client", "build", "index.html"));
});

app.listen(port, () => console.log(`Example app listening on port ${port}!`));
