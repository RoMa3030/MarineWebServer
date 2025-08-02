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
import pigpio
import signal

from engine_data_reader import engine_data_interface
import vessel_data
import json

engine_interface = engine_data_interface()
LAYOUT_CONFIG_FILE = "config/LayoutConfig.JSON"
ADC_CONFIG_FILE = "config/ADC_Config.JSON"
change_on_design = False;
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
    # Due to presentation feature (predefined layout used instead of user config) it's required to reload the website date interface
    # (otherwise the normal entry point [this API call] doesn't work anymore after a presentation)
    global change_on_design
    change_on_design = True
    engine_interface.reinit_data_interface()
    
    # normal submission of HTML template
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
        raise HTTPException(status_code=500, detail=f"TEST: Error loading data type mapping: {str(e)}")

@app.get("/api/engine-icon/{index}")
async def get_engine_icon(index: int):
    match index:
        case 0:
            icon_path = "/static/data_icons/engine_speed.png"
        case 1:
            icon_path = "/static/data_icons/engine_oil_temp.png"
        case 2:
            icon_path = "/static/data_icons/engine_oil_press.png"
        case 3:
            icon_path = "/static/data_icons/coolant_temp.png"
        case 4:
            icon_path = "/static/data_icons/coolant_press.png"
        case 5:
            icon_path = "/static/data_icons/gear_oil_temp.png"
        case 6:
            icon_path = "/static/data_icons/gear_oil_press.png"
        case 7:
            icon_path = "/static/data_icons/boost_press.png"
        case 8:
            icon_path = "/static/data_icons/trim.png"
        case 9:
            icon_path = "/static/data_icons/rudder.png"
        case 10:
            icon_path = "/static/data_icons/fuel_rate.png"
        case 11:
            icon_path = "/static/data_icons/engine_hours.png"
        case 12:
            icon_path = "/static/data_icons/fuel_press.png"
        case 15:
            icon_path = "/static/data_icons/engine_load.png"
        case 16:
            icon_path = "/static/data_icons/engine_torque.png"
        case 17:
            icon_path = "/static/data_icons/battery_voltage.png"
        case 18:
            icon_path = "/static/data_icons/alternator_potential.png"
        case 19:
            icon_path = "/static/data_icons/battery_voltage.png"
        case 20:
            icon_path = "/static/data_icons/battery_temp.png"
        case 21:
            icon_path = "/static/data_icons/soc.png"
        case 22:
            icon_path = "/static/data_icons/soh.png"
        case 23:
            icon_path = "/static/data_icons/battery_autonomy.png"
        case 24:
            icon_path = "/static/data_icons/fuel.png"
        case 25:
            icon_path = "/static/data_icons/fresh.png"
        case 26:
            icon_path = "/static/data_icons/waste.png"
        case 27:
            icon_path = "/static/data_icons/live_well.png"
        case 28:
            icon_path = "/static/data_icons/oil_level.png"
        case 29:
            icon_path = "/static/data_icons/black.png"
        case 36:
            icon_path = "/static/data_icons/sea_temp.png"
        case 37:
            icon_path = "/static/data_icons/air_temp.png"
        case 38:
            icon_path = "/static/data_icons/exhaust_gas_temp.png"
        case 39:
            icon_path = "/static/data_icons/sog.png"
        case 40:
            icon_path = "/static/data_icons/stw.png"
        case _:  # Default case
            icon_path = "/static/data_icons/default.png"
    
    return {"icon_url": icon_path}


@app.get("/api/engine-data")
def get_engine_data():
    global change_on_design
    
    if change_on_design:
        change_on_design = False;
        return "UPDATING-PAGE-REQUIRED"
    else:
        return engine_interface.get_current_engine_data()
    
#--------------------------------------------------------------------------------------
@app.get("/Config", response_class=HTMLResponse)
def read_root(request: Request):
    return templates.TemplateResponse("MWS_Config.html",{"request": request})

    
@app.post("/api/save-page-config")
async def save_page_config(request: Request):
    try:
        config_data = await request.json()
        
        print("This arrived at API:")
        print(config_data)
        
        with open(LAYOUT_CONFIG_FILE, "w") as f:
            json.dump(config_data, f, indent=2)
        
        # In case output webpage is already running: Start re-rendering the layout on next "engine-data"-request
        global change_on_design
        change_on_design = True
        engine_interface.reinit_data_interface()
        
        # Return a success response
        return {"status": "success", "message": "Configuration saved successfully"}
    except Exception as e:
        print(f"Error saving config: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Error saving configuration: {str(e)}")
    
    
@app.post("/api/save-adc-config")
async def save_adc_config(request: Request):
    try:
        config_data = await request.json()
        
        print("This arrived at API (ADC):")
        print(config_data)
        
        with open(ADC_CONFIG_FILE, "w") as f:
            json.dump(config_data, f, indent=2)
            
        engine_interface.reinit_adc()
        return {"status": "success", "message": "Configuration saved successfully"}
    
    except Exception as e:
        print(f"Error saving config: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Error saving configuration: {str(e)}")
#----------------------------------------------------------------------------------------------
#       Special entry-calls for presentation purposes
#       (allows to switch to standard layouts - without it matching the latest config)

@app.get("/dash", response_class=HTMLResponse)
def read_root(request: Request):
    global change_on_design
    change_on_design = True
    engine_interface.reinit_data_interface('config/ForPresentation/DashDefaultConfig.JSON')
    return templates.TemplateResponse("ForPresentation/MWS_dash.html",{"request": request})

@app.get("/grid", response_class=HTMLResponse)
def read_root(request: Request):
    global change_on_design
    change_on_design = True
    engine_interface.reinit_data_interface('config/ForPresentation/GridDefaultConfig.JSON')
    return templates.TemplateResponse("ForPresentation/MWS_grid.html",{"request": request})

@app.get("/api/DashDefaultLayout")
async def get_settings():
    try:
        with open("config/ForPresentation/DashDefaultConfig.JSON", "r") as f1:
            settings = json.load(f1)
        return JSONResponse(content=settings)
    except FileNotFoundError:
        print("Layout configuration File not found!")
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error loading settings: {str(e)}")
        
@app.get("/api/GridDefaultLayout")
async def get_settings():
    try:
        with open("config/ForPresentation/GridDefaultConfig.JSON", "r") as f1:
            settings = json.load(f1)
        return JSONResponse(content=settings)
    except FileNotFoundError:
        print("Layout configuration File not found!")
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error loading settings: {str(e)}")
#----------------------------------------------------------------------------------------------



def signal_handler(sig, frame):
    print("Signalhandler caught shutdown signal")
    engine_interface.shutdown()

if __name__ == "__main__":
    signal.signal(signal.SIGINT, signal_handler)
    uvicorn.run(app, host="0.0.0.0", port=8000)
    
