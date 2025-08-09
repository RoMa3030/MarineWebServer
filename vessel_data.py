import numpy as np
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
	
	# Vessel
	SOG = 39
	STW = 40

""" DEFAULT_PRECISION:
		Defines globally what precisions should be applied to each datatype in number of decimals
    	prec. 2: 	123.456 => 	123.46
    	prec. 1: 	123.456 =>	123.4
    	prec. 0: 	123.456 =>	123
    	prec. -1: 	123.456 =>  120   
     """
DEFAULT_PRECISION = [
	-1,# ENG_SPEED = 0
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
	1,# ALTERNATOR_POT = 18 
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
	0,# EXHAUST_GAS_TEMP = 38
	0,# SOG = 38
	0# STW = 38
]

DEFAULT_TIMEOUT = 5.0		#[s] timeout for data values

class source_types(Enum):
	# !!! Order represents default Priority !!!
	ANALOG = 1
	J1939 = 2
	NMEA2000 = 3
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
		self.web_data_interface = self._load_website_interface_description()
 
 
	def store_data_point(self, parameter: parameter_type, instance: int, value: float, source_type: source_types, address: int, timestamp: datetime = None):
		if np.isnan(value):
			return
		#print(f"Stored: Parameter-{parameter} | Instance-{instance} | Value-{value} | source-{source_type}")
		is_new_data_point = False
		
		#  Ensure data node container exists
		if parameter not in self._data:
			self._data[parameter] = {}
			is_new_data_point = True
		if instance not in self._data[parameter]:
			#print(self._data)
			#print(f"Instance: {instance}")			
			is_new_data_point = True
	
		# store data
		if timestamp is None:
			timestamp = datetime.now()
		if not is_new_data_point:
			#order of Enum "source_type" represents prioritisation -> lower enum representation = more important source
			if source_type.value > self._data[parameter][instance].source_type.value:	#value required because enum isn't handled as int in python!
				age = datetime.now() - self._data[parameter][instance].time_stamp
				if age.total_seconds() <= DEFAULT_TIMEOUT:
					"""
					Deny storing data point ONLY, if data is from lower priority source AND available data is not timed out yet.
					Nested ifs for faster processeing - doesn't calculate age each time.
					"""
					print("I: Denied overwriting data point from lover priority source")
					return
				
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
				age = datetime.now() - self._data[parameter][instance].time_stamp
				if age.total_seconds() <= DEFAULT_TIMEOUT:
					return self._data[parameter][instance].value
				else:
					#del self._data[parameter][instance]	# currently value is not reset after timeout / if required, probably better to do in separate method
					#print("Value timed out")
					return float('nan')
					
		return float('nan')

	
	def get_updated_web_values(self, page):
		#page: as displayed on website (starting from 1)
		print(f"Reuested data for PAGE: {page}");
		
		data_array = []
		if (page > len(self.web_data_interface)):
			print ("Error: requested data for undefined page")
			return [float('nan')];
		
		page_index = page-1
		for data_point in self.web_data_interface[page_index]:
			parameter = data_point[0]
			instance = data_point[1]
			if (parameter in self._data):
				if (instance in self._data[parameter]):
					#Value exists in storage:
					age = datetime.now() - self._data[parameter][instance].time_stamp
					if age.total_seconds() <= DEFAULT_TIMEOUT:
						# Data is available
						rounded = round(self._data[parameter][instance].value, DEFAULT_PRECISION[parameter.value])
						data_array.append(rounded)
					else:
						# Data is timed out
						data_array.append(float('nan'))
				else:
					# instance is not available in storage
					data_array.append(float('nan'))
			else:
				# parameter is not available in storage
				data_array.append(float('nan'))
		return data_array
 
 
	def update_website_interface_description(self, path=None):
		# Allwos for external trigering of updating interface
		self.web_data_interface = self._load_website_interface_description(path)
 
 
	def _load_website_interface_description(self, path=None):
		"""
		To not have to send all the available vessel information to the website, and filter it out there again,
		the idea is to only send the required information in an array of floats in the order in which they're 
		displayed on the website
		This function is to find out which data must be put in the array.
  
		Layout:
		array[2x(number of datafields)]
		for each datafield: [Datatype, instance]
		"""
		if not path:
			with open('config/LayoutConfig.JSON', 'r', encoding='utf-8') as f:
				page_config = json.load(f)
		else:
			with open(path, 'r', encoding='utf-8') as f:
				page_config = json.load(f)

		interface_description = []
		for page in page_config.get("layouts", []):
			page_description = []
			for section in page.get("sections", []):
				for field in section.get("dataFields", []):
					instance = field.get("instance")
					data_type = parameter_type(field.get("dataType"))
					page_description.append([data_type, instance])
			interface_description.append(page_description);
					
		print("This desribes the new/current website-interface")
		print(interface_description) 		
		return interface_description
		
  
	def create_fake_data_for_testing(self):
		# probably deprecated and non-functional after implementing multi-page layout functionality
		val = 50.123
		for data_point in self.web_data_interface:
			parameter = data_point[0]
			instance = data_point[1]
			self.store_data_point(parameter, instance, val, 0, 0, None)
			val += 1
  
  

		
		
		
		
		
		
		
		
		
		
		
		
		
	

