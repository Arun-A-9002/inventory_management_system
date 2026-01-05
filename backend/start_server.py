import sys
import os
sys.path.append(os.path.dirname(__file__))

from main import app
import uvicorn

if __name__ == "__main__":
    print("Starting server...")
    uvicorn.run(app, host="127.0.0.1", port=8000)