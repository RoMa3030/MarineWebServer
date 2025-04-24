from enum import Enum, auto
from dataclasses import dataclass
from typing import Dict
from datetime import datetime
import json

class parameter_type(Enum):
    # !!!	Do not change order of parameters	!!!
    # (Webserver is refering to same order)
    # When doing any changes never the less, also change in Config/DataTypeMapping.JSON
    
	# Engine
	ENG_SPEED = 1
	ENG_OIL_TEMP = 2
	ENG_OIL_PRESS = 3
	COOLANT_TEMP = 4
	COOLANT_PRESS = 5
	GEAR_OIL_TEMP = 6
	GEAR_OIL_PRESS = 7
	BOOST_PRESS	= 8
	TRIM = 9
	RUDDER = 10
	FUEL_RATE = 11
	ENG_HOURS = 12
	FUEL_PRESS = 13
	ALARMS_EDS1 = 14
	ALARMS_EDS2 = 15
	ENG_LOAD = 16
	ENG_TORQUE = 17
	
	# Battery
	BATTERY_POT = 18
	ALTERNATOR_POT = 19 
	AMMETER = 20
	BATTERY_TEMP = 21
	SOC = 22
	SOH = 22
	BATTERY_AUTON = 23
	
	# Level
	FUEL_LEVEL = 24
	FRESH_LEVEL = 25
	WASTE_LEVEL = 26
	LIVE_WELL_LEVEL = 27
	OIL_LEVEL = 28
	BLACK_WATER_LEVEL = 29 
	FUEL_LEVEL_CAP = 30
	FRESH_LEVEL_CAP = 31
	WASTE_LEVEL_CAP = 32
	LIVE_WELL_LEVEL_CAP = 33 
	OIL_LEVEL_CAP = 34
	BLACK_WATER_LEVEL_CAP = 35 
	
	# Temperature
	SEA_TEMP = 36
	OUTSIDE_TEMP = 37
	EXHAUST_GAS_TEMP = 38
	
class source_types(Enum):
	NMEA2000 = 1
	J1939 = 2
	ANALOG = 3
	INTERNAL = 4 
	
@dataclass
class data_point:
	value: float
	source_type: source_types
	source_address: int
	time_stamp: datetime
	
	def __str__(self):
		return f"Value: {self.value}, Source Type: {self.source_type}, Address: {self.source_address}, Time: {self.time_stamp}"

class vessel_data_manager:
	def __init__(self):
		self._data = {}
		self.web_data_interface = self._load_website_interface_data()
 
 
	def store_data_point(self, parameter: parameter_type, instance: int, value: float, source_type: source_types, address: int, timestamp: datetime = None):
		if timestamp is None:
			timestamp = datetime.now()
			
		if parameter not in self._data:
			self._data[parameter] = {}
			
		self._data[parameter][instance] = data_point(
			value = value,
			source_type = source_type,
			source_address = address,
			time_stamp = timestamp
		)		
		
  
	def get_data_point_comp(self, parameter: parameter_type, instance: int):
		# returns ALL information for this data_point (including source, timestamp,...)
		if (parameter in self._data):
			if (instance in self._data[parameter]):
				return self._data[parameter][instance]
		
		return float('nan')
		
  
	def get_data_point(self, parameter: parameter_type, instance: int):
		# returns value only
		if (parameter in self._data):
			if (instance in self._data[parameter]):
				return self._data[parameter][instance].value
		
		return float('nan')

	
	def get_updated_web_values(self):
		data_array = []
		print(self._data)
		for data_point in self.web_data_interface:
			parameter = data_point[0]
			instance = data_point[1]
			if (parameter in self._data):
				if (instance in self._data[parameter]):
					data_array.append(self._data[parameter][instance].value)
					print(self._data[parameter][instance].value)
				else:
					data_array.append(float('nan'))
			else:
				data_array.append(float('nan'))
    
		return data_array
 
 
	def update_website_interface_data(self):
		self.web_data_interface = self._load_website_interface_data()
 
 
	def _load_website_interface_data(self):
		"""
		To not have to send all the available vessel information to the website, and filter it out there again,
		the idea is to only send the required information in an array of floats in the order in which they're 
		displayed on the website
		This function is to find out which data must be put in the array.
  
		Layout:
		array[2x(number of datafield)]
		for each datafield: Datatype, instance
		"""
		print("Hard coded: dynamic - todo")
		return [[1,0], [4,0], [3,0], [18,0], [20,0], [21,0]]
		
  
	def create_fake_data_for_testing(self):
		val = 50
		for data_point in self.web_data_interface:
			parameter = data_point[0]
			instance = data_point[1]
			self.store_data_point(parameter, instance, val, 0, 0, None)
			val += 1
  
  

		
		
		
		
		
		
		
		
		
		
		
		
		
	

