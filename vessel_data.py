from enum import Enum, auto
from dataclasses import dataclass
from typing import Dict
from datetime import datetime

class parameter_type(Enum):
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
	BATTERY_POT = 11
	ALTERNATOR_POT = 12
	AMMETER = 13
	FUEL_LEVEL = 14
	FRESH_LEVEL = 15
	WASTE_LEVEL = 16
	
	
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
		
		
		
		
		
		
		
		
		
		
		
		
		
	

