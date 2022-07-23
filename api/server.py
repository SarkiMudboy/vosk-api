#!/usr/bin/env python
# encoding: utf-8

from flask import Flask, jsonify, request
from flask_cors import CORS, cross_origin
import numpy as np
import soundfile as sf
import json
import logging
import base64
import asyncio
import websockets
import sys
import wave

app = Flask(__name__)
app.secret_key = "stream"
CORS(app, supports_credentials=True)

def get_byte_string(string):

	delimiter = ';base64,'
	splitted_string = string.split(delimiter)
	return splitted_string[1]


@app.route('/media', methods=['POST'])
async def echo():

	app.logger.info('Connection accepted')

	has_seen_media = False
	message_count = 0
	chunk = None

	data = json.loads(request.data)

	if data is None:
		
		app.logger.info('No message recieved')

	else:

		app.logger.info("Media message recieved")

		blob = data['blob']

		byte_str = get_byte_string(blob)

		byte_str = bytes(byte_str, 'utf-8')

		chunk = base64.decodebytes(byte_str)

		has_seen_media = True
	
	if has_seen_media:

		app.logger.info("Payload recieved: {} bytes".format(len(chunk)))

		# set up websocket here

		async with websockets.connect('ws://localhost:2700') as websocket:

			await websocket.send(chunk)
			print (await websocket.recv())

		await websocket.send('{"eof" : 1}')
		print (await websocket.recv())

		message_count += 1

	return jsonify({'response': ''})

if __name__ == '__main__':

	app.logger.setLevel(logging.DEBUG)
	app.run(debug=True)



