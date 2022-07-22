#!/usr/bin/env python3

import json
import os
import sys
import asyncio
import pathlib
import websockets
import concurrent.futures
import logging
import datetime
import scipy.io.wavfile
import numpy as np
import sys
from vosk import Model, SpkModel, KaldiRecognizer


def process_response_text(in_text, channel_idx):
    out_text = ''
    if (in_text != ''):
        json_response = json.loads(in_text);
        min_start = sys.maxsize
        max_end = 0
        if (('result' in json_response) and ('text' in json_response)):
            for res_entry in json_response['result']:
                min_start = min(min_start, res_entry['start'])
                max_end = max(max_end, res_entry['end'])
            out_text = str(datetime.timedelta(seconds=int(min_start))) + ' - ' + str(datetime.timedelta(seconds=int(max_end))) + ' <= ' + str(channel_idx) +'=> ' + json_response['text'];
    return out_text

def process_chunk(rec, message, run_flag, channel_idx):
    response_text = '';
    if not run_flag:
        response_text = rec.FinalResult()
    elif rec.AcceptWaveform(message):
        response_text = rec.Result()
    else:
        response_text = rec.PartialResult();
    response_text = process_response_text(response_text, channel_idx)
    print (response_text)
    return response_text

async def recognize(websocket, path):
    global model
    global spk_model
    global args
    global pool

    loop = asyncio.get_running_loop()
    rec = None
    phrase_list = None
    sample_rate = args.sample_rate
    show_words = args.show_words
    max_alternatives = args.max_alternatives
    buffer_size_sec = 0.2

    logging.info('Connection from %s', websocket.remote_address);

    # receive the json
    # get the audio_data and store it as a file with some random name
    # load that audio file using scipy.io.wavfile.read()

    # load audio here
    #audio_file_name = '/Users/madhav/build/vosk-server/websocket/test16k.wav'
    audio_file_name = r'C:\Users\Abdul\Desktop\vosk\websocket\digit_2c_16b_16k.wav'

    audio_fs, audio_data = scipy.io.wavfile.read(audio_file_name)
    audio_channels = 1
    if (len(np.shape(audio_data)) == 2):
        audio_channels = np.shape(audio_data)[1]
    elif (len(np.shape(audio_data)) == 1):
        audio_data = np.expand_dims(audio_data, axis=1)
    audio_len = np.shape(audio_data)[0]

    # load configuration for the audio file
    jobj = json.loads('{"sample_rate":' + str(audio_fs) + '}')
    logging.info("Config %s", jobj)
    sample_rate = float(jobj['sample_rate'])
    buffer_size_frm = int(sample_rate * buffer_size_sec)

    # load kaldi vosk model for each channel
    rec_list = list()
    for idx in range(audio_channels):
        rec = KaldiRecognizer(model, sample_rate)
        rec.SetWords(show_words)
        rec.SetMaxAlternatives(max_alternatives)
        if spk_model:
            rec.SetSpkModel(spk_model)
        rec_list.append(rec);

    # process each frame and perform recognition
    frame_idx = 0;
    run_flag = True
    while run_flag:

        start_sample = frame_idx * buffer_size_frm
        end_sample = min(start_sample + buffer_size_frm, audio_len)
        frame_idx = frame_idx + 1
        if ((audio_len - end_sample) <= (0.1 * buffer_size_frm)):
            run_flag = False
        audio_frame = audio_data[start_sample:end_sample,:]

        # execute in for loop and send response
        for channel_idx in range(audio_channels):
            channel_wav = audio_frame[:,channel_idx]
            channel_wav_bytes = channel_wav.tobytes()
            # TODO perform VAD here
            response = await loop.run_in_executor(pool, process_chunk, rec_list[channel_idx], channel_wav_bytes, run_flag, channel_idx)
            # response is streamed to the client
            await websocket.send(response)
    await websocket.send('<EOF>')


async def start():

    global model
    global spk_model
    global args
    global pool

    logging.basicConfig(level=logging.INFO)

    args = type('', (), {})()

    args.interface = os.environ.get('VOSK_SERVER_INTERFACE', '0.0.0.0')
    args.port = int(os.environ.get('VOSK_SERVER_PORT', 2700))
    args.model_path = os.environ.get('VOSK_MODEL_PATH', 'model')
    args.spk_model_path = os.environ.get('VOSK_SPK_MODEL_PATH')
    args.sample_rate = float(os.environ.get('VOSK_SAMPLE_RATE', 16000))
    args.max_alternatives = int(os.environ.get('VOSK_ALTERNATIVES', 0))
    args.show_words = bool(os.environ.get('VOSK_SHOW_WORDS', True))

    if len(sys.argv) > 1:
       args.model_path = sys.argv[1]

    model = Model(args.model_path)
    spk_model = SpkModel(args.spk_model_path) if args.spk_model_path else None

    pool = concurrent.futures.ThreadPoolExecutor((os.cpu_count() or 1))

    async with websockets.serve(recognize, args.interface, args.port):
        await asyncio.Future()


if __name__ == '__main__':
    asyncio.run(start())
