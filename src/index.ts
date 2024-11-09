import { createServer } from 'http';
import { WebSocketServer, WebSocket } from 'ws';

const PORT = 8980;
const clients: { [userId: string]: WebSocket } = {};


const server = createServer((req, res) => {
	res.writeHead(200, { 'Content-Type': 'text/plain' });
	res.end('WebSocket signaling server is running.');
});

const wss = new WebSocketServer({ server });

wss.on('connection', (ws) => {
	console.log('New client connected.');

	ws.on('message', (data) => {
		try {

			const message = JSON.parse(data.toString());

			if (message.type === 'register') {
				const { userId } = message;

				if (!userId) {
					ws.send(
						JSON.stringify({
							type: 'error',
							message: 'Registration failed: userId is required.',
						})
					);
					return;
				}


				if (!clients[userId]) {
					// Register the new connection
					clients[userId] = ws;
					console.log(`User ${userId} registered successfully.`);
					ws.send(
						JSON.stringify({
							type: 'registered',
							message: `User ${userId} registered successfully.`,
						})
					);
				}

			}

			// Handle signaling messages
			if (message.type === 'offer' || message.type === 'answer' || message.type === 'candidate') {
				const { to } = message;

				if (!to) {
					ws.send(
						JSON.stringify({
							type: 'error',
							message: 'Recipient userId is required.',
						})
					);
					return;
				}

				const recipient = clients[to];
				if (recipient) {
					recipient.send(
						JSON.stringify({
							...message,
							from: Object.keys(clients).find((id) => clients[id] === ws),
						})
					);
				} else {
					ws.send(
						JSON.stringify({
							type: 'error',
							message: `Recipient ${to} not found.`,
						})
					);
				}
			}
		} catch (err) {
			console.error('Error processing message:', err);
			ws.send(
				JSON.stringify({
					type: 'error',
					message: 'Error processing message.',
				})
			);
		}
	});

	ws.on('close', () => {
		console.log('Client disconnected.');

		// Remove the user from the clients object
		for (const [userId, socket] of Object.entries(clients)) {
			if (socket === ws) {
				delete clients[userId];
				console.log(`User ${userId} removed from clients.`);
				break;
			}
		}
	});

	ws.on('error', (err) => {
		console.error('WebSocket error:', err);
	});
});

server.listen(PORT, () => {
	console.log(`WebSocket signaling server is running on :${PORT}`);
});
