# vosk-api
A Flask REST API for a vosk speech recognition engine

# Install dependencies
Open up a terminal and enter the folder. type "ls" to confirm if 'requirements.txt' exists.
run ```pip install -r requirements.txt``` to install dependencies.

# Run the vosk server
1. Open up another terminal window and make your way to the ../websockets/ folder.
2. Run ```python asr_server_test.py isrl-ctn-demo-1```.

# Run the flask server
1. Open yet another terminal window enter the /api folder.
2. Run ```python server.py```

## Serve the html page
Note: It'll be easier if you use the Go Live extension on VS Code to serve the html page. 
1. Open up a terminal and go to where the ../html_page folder is located.
run ```python -m http.server [PORT]``` i.e ```python -m http.server 8000```
2.Open your browser and enter "http:\\localhost:8000\index.html". This will load the Chatbot demo homepage.
