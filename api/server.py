#!/usr/bin/env python
# encoding: utf-8

from flask import Flask, jsonify, request
from flask_cors import CORS, cross_origin
import numpy as np
import json
import logging
import asyncio
import websockets


app = Flask(__name__)
app.secret_key = "stream"
CORS(app, supports_credentials=True)


@app.route('/media', methods=['POST'])
async def echo():

	app.logger.info('Connection accepted')

	has_seen_media = False
	message_count = 0
	chunk = None

	data = request.files.get('file').read()

	# app.logger.debug(data)

	if data is None:
		
		app.logger.info('No message recieved')

	else:

		app.logger.info("Media message recieved")
		
		# with open('fileblob1.wav', 'wb') as f:
		# 	f.write(data)

		has_seen_media = True
	
	if has_seen_media:

		app.logger.info("Payload recieved: {} bytes".format(len(data)))

		# set up websocket here

		async with websockets.connect('ws://localhost:2700') as websocket:

			await websocket.send(data)
			vosk_response = await websocket.recv()

			partial = json.loads(vosk_response)

			if 'text' in partial:
				response_text = partial['text']
			else:
				response_text = partial['partial']

			return jsonify({'response': response_text})

		# await websocket.send('{"eof" : 1}')
		# print(await websocket.recv())

		# message_count += 1

if __name__ == '__main__':

	app.logger.setLevel(logging.DEBUG)
	app.run(debug=True)


