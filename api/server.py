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
import struct
import array

app = Flask(__name__)
app.secret_key = "stream"
CORS(app, supports_credentials=True)

def get_byte_string(string):

	delimiter = ';base64,'
	splitted_string = string.split(delimiter)
	return splitted_string[1]

def convert(raw_floats):
	data = raw_floats
	floats = array.array('f', data)
	print(floats)
	samples = [int(sample * 32767) for sample in floats]
	raw_ints = struct.pack('<%dh' % len(samples), *samples)
	return raw_ints


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

		# new_data = convert(data)
		
		with open('fileblob1.wav', 'wb') as f:
			f.write(data)

		has_seen_media = True
	
	if has_seen_media:

		app.logger.info("Payload recieved: {} bytes".format(len(data)))

		# set up websocket here

		async with websockets.connect('ws://localhost:2700') as websocket:

			await websocket.send(data)
			print (await websocket.recv())

		await websocket.send('{"eof" : 1}')
		print (await websocket.recv())

		message_count += 1

	return jsonify({'response': ''})

if __name__ == '__main__':

	app.logger.setLevel(logging.DEBUG)
	app.run(debug=True)



