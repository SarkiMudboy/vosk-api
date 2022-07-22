#!/usr/bin/env python3

import asyncio
import websockets
import sys
import wave

async def run_test(uri):
    async with websockets.connect(uri) as websocket:
        #json={'language': "English", 'output': 'streaming', 'audio_file':<Entire audio file as blob>}
        #send this json to the server
        print ('')
        while True:
            response = await websocket.recv()
            if (response == '<EOF>'):
                break
            elif (response == ''):
                continue;
            else:
                print (response)
        print ('')

asyncio.run(run_test('ws://localhost:2700'))
