from enum import Enum, auto
from dataclasses import dataclass
from typing import Dict
from datetime import datetime

class parameter_type(Enum):
	#Engine
	ENG_SPEED = auto()
	ENG_OIL_TEMP = auto()
	ENG_OIL_PRESS = auto()
	COOLANT_TEMP = auto()
	COOLANT_PRESS = auto()
	GEAR_OIL_TEMP = auto()
	GEAR_OIL_PRESS = auto()
	BOOST_PRESS	= auto()
	TRIM = auto()
	RUDDER = auto()
	FUEL_RATE = auto()
	ENG_HOURS = auto()
	FUEL_PRESS = auto()
	ALARMS_EDS1 = auto()
	ALARMS_EDS2 = auto()
	ENG_LOAD = auto()
	ENG_TORQUE = auto()
	
	#Battery
	BATTERY_POT = auto()
	ALTERNATOR_POT = auto()
	AMMETER = auto()
	BATTERY_TEMP = auto()
	SOC = auto()
	SOH = auto()
	BATTERY_AUTON = auto()
	
	#Level
	FUEL_LEVEL = auto()
	FRESH_LEVEL = auto()
	WASTE_LEVEL = auto()
	LIVE_WELL_LEVEL = auto()
	OIL_LEVEL = auto()
	BLACK_WATER_LEVEL = auto()
	FUEL_LEVEL_CAP = auto()
	FRESH_LEVEL_CAP = auto()
	WASTE_LEVEL_CAP = auto()
	LIVE_WELL_LEVEL_CAP = auto()
	OIL_LEVEL_CAP = auto()
	BLACK_WATER_LEVEL_CAP = auto()
	
	#Temperature
	SEA_TEMP = auto()
	OUTSIDE_TEMP = auto()
	EXHAUST_GAS_TEMP = auto()
	
	
	
	
	
	
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
		
		
		
		
		
		
		
		
		
		
		
		
		
	

