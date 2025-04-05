from fastapi import FastAPI, Request
from fastapi.staticfiles import StaticFiles
from fastapi.templating import Jinja2Templates
from fastapi.responses import HTMLResponse
import uvicorn

import threading
import time

import engine_data_reader


app = FastAPI()


# mount the static directory
app.mount("/static", StaticFiles(directory="static"), name="static")

templates = Jinja2Templates(directory="templates")


@app.get("/", response_class=HTMLResponse)
def read_root(request: Request):
    # render and return the index.html template
    return templates.TemplateResponse("index.html",{"request": request})


@app.on_event("startup")
def startup_event():
    engine_data_thread = threading.Thread(target=engine_data_reader.read_engine_data, daemon=True)
    engine_data_thread.start()
    

@app.get("/favicon.ico")
async def favicon():
    return FileResponse("static/favicon.ico")


@app.get("/api/engine-data")
def get_engine_data():
    return engine_data_reader.engine_data



if __name__ == "__main__":
    uvicorn.run(app, host="0.0.0.0", port=8000)
    
