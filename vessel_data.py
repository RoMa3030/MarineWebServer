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
	ENG_SPEED = 0
	ENG_OIL_TEMP = 1
	ENG_OIL_PRESS = 2
	COOLANT_TEMP = 3
	COOLANT_PRESS = 4
	GEAR_OIL_TEMP = 5
	GEAR_OIL_PRESS = 6
	BOOST_PRESS	= 7
	TRIM = 8
	RUDDER = 9
	FUEL_RATE = 10
	ENG_HOURS = 11
	FUEL_PRESS = 12
	ALARMS_EDS1 = 13
	ALARMS_EDS2 = 14
	ENG_LOAD = 15
	ENG_TORQUE = 16
	
	# Battery
	BATTERY_POT = 17
	ALTERNATOR_POT = 18
	AMMETER = 19
	BATTERY_TEMP = 20
	SOC = 21
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

""" DEFAULT_PRECISION:
		Defines globally what precisions should be applied to each datatype in number of decimals
    	prec. 2: 	123.456 => 	123.46
    	prec. 1: 	123.456 =>	123.4
    	prec. 0: 	123.456 =>	123
    	prec. -1: 	123.456 =>  120   
     """
DEFAULT_PRECISION = [
	0,# ENG_SPEED = 0
	0,# ENG_OIL_TEMP = 1
	1,# ENG_OIL_PRESS = 2
	0,# COOLANT_TEMP = 3
	1,# COOLANT_PRESS = 4
	0,# GEAR_OIL_TEMP = 5
	1,# GEAR_OIL_PRESS = 6
	1,# BOOST_PRESS	= 7
	0,# TRIM = 8
	0,# RUDDER = 9
	1,# FUEL_RATE = 10
	1,# ENG_HOURS = 11
	1,# FUEL_PRESS = 12
	0,# ALARMS_EDS1 = 13
	0,# ALARMS_EDS2 = 14
	0,# ENG_LOAD = 15
	0,# ENG_TORQUE = 16
	2,# BATTERY_POT = 17
	2,# ALTERNATOR_POT = 18 
	0,# AMMETER = 19
	0,# BATTERY_TEMP = 20
	0,# SOC = 21
	0,# SOH = 22
	0,# BATTERY_AUTON = 23
	0,# FUEL_LEVEL = 24
	0,# FRESH_LEVEL = 25
	0,# WASTE_LEVEL = 26
	0,# LIVE_WELL_LEVEL = 27
	0,# OIL_LEVEL = 28
	0,# BLACK_WATER_LEVEL = 29 
	0,# FUEL_LEVEL_CAP = 30
	0,# FRESH_LEVEL_CAP = 31
	0,# WASTE_LEVEL_CAP = 32
	0,# LIVE_WELL_LEVEL_CAP = 33 
	0,# OIL_LEVEL_CAP = 34
	0,# BLACK_WATER_LEVEL_CAP = 35 
	1,# SEA_TEMP = 36
	0,# OUTSIDE_TEMP = 37
	0# EXHAUST_GAS_TEMP = 38
]

	
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
		for data_point in self.web_data_interface:
			parameter = data_point[0]
			instance = data_point[1]
			if (parameter in self._data):
				if (instance in self._data[parameter]):
					rounded = round(self._data[parameter][instance].value, DEFAULT_PRECISION[parameter])
					data_array.append(rounded)
				else:
					data_array.append(float('nan'))
			else:
				data_array.append(float('nan'))
    
		return data_array
 
 
	def update_website_interface_data(self):
		# Allwos for external trigering of updating interface. (Currently not used)
		self.web_data_interface = self._load_website_interface_data()
 
 
	def _load_website_interface_data(self):
		"""
		To not have to send all the available vessel information to the website, and filter it out there again,
		the idea is to only send the required information in an array of floats in the order in which they're 
		displayed on the website
		This function is to find out which data must be put in the array.
  
		Layout:
		array[2x(number of datafields)]
		for each datafield: [Datatype, instance]
		"""
		with open('config/LayoutConfig.JSON', 'r', encoding='utf-8') as f:
			page_config = json.load(f)

		interface_description = []
		for page in page_config.get("layouts", []):
			for section in page.get("sections", []):
				for field in section.get("dataFields", []):
					instance = field.get("instance")
					data_type = field.get("dataType")
					interface_description.append([data_type, instance])  		
		return interface_description
		
  
	def create_fake_data_for_testing(self):
		val = 50.123
		for data_point in self.web_data_interface:
			parameter = data_point[0]
			instance = data_point[1]
			self.store_data_point(parameter, instance, val, 0, 0, None)
			val += 1
  
  

		
		
		
		
		
		
		
		
		
		
		
		
		
	

