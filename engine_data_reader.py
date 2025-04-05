
import numpy as np
import time

# Shaed data storage
engine_data = {
    "rpm": 1234,
    "coolant_temp": 56,
    "fuel-level": 89
}

def read_engine_data():
	while True:
		engine_data["rpm"] += 1
		print(f"RPM = {engine_data['rpm']}")
		time.sleep(1)



def initialize_can_interface():
	print("CAN interface initialized")
	
	
def shutdown():
	print("Engine Data Reader shutting down")
