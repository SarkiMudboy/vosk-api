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

			# print(input_q)
			# print('flask_q', input_q.get())

			# set up websocket here

			# async with websockets.connect('ws://localhost:2700') as websocket:

			# 	await websocket.send(data)
			# 	vosk_response = await websocket.recv()

			# 	partial = json.loads(vosk_response)

			# 	if 'text' in partial:
			# 		response_text = partial['text']
			# 	else:
			# 		response_text = partial['partial']

			response_text = 'HI'
			return jsonify({'response': response_text})

	app.logger.setLevel(logging.DEBUG)
	app.run()



def on_error(wsapp, error):
	print(error)

def on_message(wsapp, message):
	print(message)

def on_open(input_queue, wsapp):
	while True:
		chunk = input_queue.get()
		print(chunk)
		if chunk:
			wsapp.send(chunk)


def start_ws_app(input_queue):
	websocket.enableTrace(True)
	wsapp = websocket.WebSocketApp('ws://localhost:2700', on_error=on_error, on_message=on_message)
	func = partial(on_open, input_queue)
	wsapp.on_open = func
	wsapp.run_forever()


if __name__ == '__main__':

	input_Queue = multiprocessing.Queue()
	output_Queue = multiprocessing.Queue()

	p_ws = multiprocessing.Process(target=start_ws_app, args=(input_Queue,))
	p_flask = multiprocessing.Process(target=start_flask_app, args=(input_Queue,))

	p_flask.start()
	p_ws.start()
	
	# p_flask.join()
	# p_ws.join()

