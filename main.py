from fastapi import FastAPI, Request
from fastapi.staticfiles import StaticFiles
from fastapi.templating import Jinja2Templates
from fastapi.responses import HTMLResponse
from fastapi.responses import FileResponse
from fastapi.responses import JSONResponse
from fastapi import HTTPException
from contextlib import asynccontextmanager
import uvicorn

import threading
import time
#import pigpio
import signal

from engine_data_reader import engine_data_interface
import vessel_data

import json

engine_interface = engine_data_interface()

#----------------------------------------------------------------------------------------
@asynccontextmanager
async def lifespan(app: FastAPI):
    print("starting up engine data reader :) ")
    engine_data_thread = threading.Thread(target=engine_interface.read_engine_data, daemon=True)
    engine_data_thread.start()
    yield
    
    print("shutting down :( ")

    
app = FastAPI(lifespan=lifespan)    # create fastAPI app with lifespan parameter for proper behav. on startup
app.mount("/static", StaticFiles(directory="static"), name="static")    # mount the static directory
templates = Jinja2Templates(directory="templates") 
#----------------------------------------------------------------------------------------   
    
@app.get("/", response_class=HTMLResponse)
def read_root(request: Request):
    # render and return the index.html template
    return templates.TemplateResponse("MWS.html",{"request": request})
    

@app.get("/favicon.ico")
async def favicon():
    return FileResponse("static/favicon.ico")


@app.get("/api/LayoutConfiguration")
async def get_settings():
    try:
        with open("config/LayoutConfig.JSON", "r") as f1:
            settings = json.load(f1)
        return JSONResponse(content=settings)
    except FileNotFoundError:
        print("Layout configuration File not found!")
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error loading settings: {str(e)}")


@app.get("/api/DataTypeMappings")
async def get_DataTypeMappings():
    try:
        with open("config/DataTypeMapping.JSON", "r") as f2:
            mapping = json.load(f2)
        return JSONResponse(content=mapping)
    except FileNotFoundError:
        print("Data type mapping file not found!")
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error loading data type mapping: {str(e)}")


@app.get("/api/engine-data")
def get_engine_data():
    return engine_interface.get_current_engine_data()

#--------------------------------------------------------------------------------------
@app.get("/Config", response_class=HTMLResponse)
def read_root(request: Request):
    # render and return the index.html template
    return templates.TemplateResponse("MWS_Config.html",{"request": request})





#----------------------------------------------------------------------------------------
def signal_handler(sig, frame):
    print("Signalhandler caught shutdown signal")
    engine_interface.shutdown()

if __name__ == "__main__":
    signal.signal(signal.SIGINT, signal_handler)
    uvicorn.run(app, host="0.0.0.0", port=8000)
    
