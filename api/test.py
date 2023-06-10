#!/usr/bin/env python
# encoding: utf-8

from flask import Flask, jsonify, request
from flask_cors import CORS, cross_origin
from functools import partial
from multiprocessing import Pipe
import multiprocessing
import json
import logging
import asyncio
import websocket



def start_flask_app(input_q):
	
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

			has_seen_media = True
		
		if has_seen_media:

			app.logger.info("Payload recieved: {} bytes".format(len(data)))

			input_q.put(data)

			# put delay and retrieve here

			response_text = 'HI'
			return jsonify({'response': response_text})

	app.logger.setLevel(logging.DEBUG)
	app.run()


async def start_ws_app(input_queue):

	async with websockets.connect('ws://localhost:2700') as websocket:
		vosk_response = None
		while True:
			chunk = input_queue.get()
			print(chunk)
			if chunk:
				await websocket.send(chunk)
				vosk_response = await websocket.recv()

			if vosk_response:
				partial = json.loads(vosk_response)
				if 'text' in partial:
					response_text = partial['text']
				else:
					response_text = partial['partial']
				print(response_text)


if __name__ == '__main__':

	input_Queue = multiprocessing.Queue()
	output_Queue = multiprocessing.Queue()

	p_ws = multiprocessing.Process(target=start_ws_app, args=(input_Queue,))
	p_flask = multiprocessing.Process(target=start_flask_app, args=(input_Queue,))

	p_flask.start()
	p_ws.start()
	
	# p_flask.join()
	# p_ws.join()

