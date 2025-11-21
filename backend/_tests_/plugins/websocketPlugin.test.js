/* websocketPlugin.test.js */
'use strict';

const Fastify = require('fastify');
const websocketPlugin = require('../../websocketPlugin');

describe('websocketPlugin', () => {
	test('registers websocket utilities', async () => {
		const app = Fastify({ logger: false });

		// Mock fastify-websocket dependency if used internally
		jest.mock('@fastify/websocket', () => jest.fn(() => {}));

		await app.register(websocketPlugin);
		await app.ready();

		// Expect decorators added (adjust based on actual plugin implementation)
		expect(app.hasDecorator('websocketServer') || app.hasDecorator('ws')).toBe(true);

		await app.close();
	});
});
