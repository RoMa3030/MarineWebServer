from vessel_data import parameter_type
from vessel_data import source_types
#import can
import numpy as np
from typing import Dict, List, Tuple

MULTIFRAME_MESSAGES = [0x1F201,0x1F212]
KELVIN_OFFSET = 273.15

class n2k_handler:
	def __init__(self, data_storage_obj):
		self.data_storage = data_storage_obj
		self._mf_handler = multiframe_handler()
		
	def parse_message(self, msg):
		msg_data = msg.data
		head = msg.arbitration_id
		
		src_adr = head & 0xFF
		pgn = (head & 0x7FFFF00) >> 8
		
		"""print(f"head: {hex(head)}")
		print(f"Src: {hex(src_adr)}")
		print(f"pgn: {hex(pgn)}")"""
		#print(f"data: {msg_data}")
		
		match(pgn):
			case 0x1f200:
				self._parse_0x1f200(src_adr, pgn, msg_data)
			case 0x1f201:
				msg_complete, combined_msg = self._mf_handler.add_frame(src_adr, pgn, msg_data)
				if msg_complete:
					self._parse_0x1f201(src_adr, pgn, combined_msg)					
			case 0x1f211:
				self._parse_0x1f211(src_adr, pgn, msg_data)	
			case 0x1f212:
				msg_complete, combined_msg = self._mf_handler.add_frame(src_adr, pgn, msg_data)
				if msg_complete:
					self._parse_0x1f212(src_adr, pgn, combined_msg)						
			case 0x1f214:
				self._parse_0x1f214(src_adr, pgn, msg_data)				
			case 0x1fd0c:
				self._parse_0x1fd0c(src_adr, pgn, msg_data)			
			case 0x1f10d:
				self._parse_0x1f10d(src_adr, pgn, msg_data)
		

	def _parse_0x1f200(self, src, pgn, data):
		instance = data[0]		
		
		if (self._is_not_NA([data[1], data[2]])):
			rpm = data[1] + data[2]*256
			rpm /= 4
			#print(f"rpm: {rpm}")
			self.data_storage.store_data_point(
				parameter=parameter_type.ENG_SPEED,
				instance = instance,
				value = rpm,
				source_type = source_types.NMEA2000,
				address = src,
				timestamp = None)
			
		if (self._is_not_NA([data[3], data[4]])):
			boost = data[3] + data[4]*256
			boost /= 1000
			#print(f"boost: {boost} - instance: {instance}")
			self.data_storage.store_data_point(
				parameter=parameter_type.BOOST_PRESS,
				instance = instance,
				value = boost,
				source_type = source_types.NMEA2000,
				address = src,
				timestamp = None)
		
		if (self._is_not_NA([data[5]])):
			trim = data[5]
			if trim > 127:
				trim -= 256	
			#print(f"trim: {trim}")
			self.data_storage.store_data_point(
				parameter=parameter_type.TRIM,
				instance = instance,
				value = trim,
				source_type = source_types.NMEA2000,
				address = src,
				timestamp = None)
	
	
	def _parse_0x1f201(self, src, pgn, data):
		if len(data) < 27:
			print("Tried to parse not-complete 1f201 message")
			return
		
		#data[0] = LENGTH-information
		instance = data[1]
		
		if (self._is_not_NA([data[2], data[3]])):
			oil_press = data[2] + data[3]*256
			oil_press /= 1000
			#print(f"oil_press: {oil_press}")
			self.data_storage.store_data_point(
				parameter=parameter_type.ENG_OIL_PRESS,
				instance = instance,
				value = oil_press,
				source_type = source_types.NMEA2000,
				address = src,
				timestamp = None)
				
		if (self._is_not_NA([data[4], data[5]])):
			oil_temp = data[4] + data[5]*256
			oil_temp /= 10
			oil_temp -= KELVIN_OFFSET
			#print(f"oil_temp: {oil_temp}")
			self.data_storage.store_data_point(
				parameter=parameter_type.ENG_OIL_TEMP,
				instance = instance,
				value = oil_temp,
				source_type = source_types.NMEA2000,
				address = src,
				timestamp = None)
				
		if (self._is_not_NA([data[6], data[7]])):
			coolant = data[6] + data[7]*256
			coolant /= 100
			coolant -= KELVIN_OFFSET
			#print(f"coolant: {coolant}")
			self.data_storage.store_data_point(
				parameter=parameter_type.COOLANT_TEMP,
				instance = instance,
				value = coolant,
				source_type = source_types.NMEA2000,
				address = src,
				timestamp = None)
			
		if (self._is_not_NA([data[8], data[9]])):
			altern_potential = data[8] + data[9]*256
			if altern_potential > 32764:
				altern_potential -= 65536
			altern_potential /= 100
			#print(f"altern_potential: {altern_potential}")
			self.data_storage.store_data_point(
				parameter=parameter_type.ALTERNATOR_POT,
				instance = instance,
				value = altern_potential,
				source_type = source_types.NMEA2000,
				address = src,
				timestamp = None)
		
		if (self._is_not_NA([data[10], data[11]])):
			fuel_rate = data[10] + data[11]*256
			if fuel_rate > 32764:
				fuel_rate -= 65536
			fuel_rate /= 10 # L / h (instead of m³/h)
			#print(f"fuel_rate: {fuel_rate}")
			self.data_storage.store_data_point(
				parameter=parameter_type.FUEL_RATE,
				instance = instance,
				value = fuel_rate,
				source_type = source_types.NMEA2000,
				address = src,
				timestamp = None)
		
		if (self._is_not_NA([data[12], data[13], data[14], data[15]])):
			hours = data[12] + data[13]*2**8 + data[14]*2**16 + data[15]*2**24
			hours /= 3600 
			#print(f"hours: {hours}")
			self.data_storage.store_data_point(
				parameter=parameter_type.ENG_HOURS,
				instance = instance,
				value = hours,
				source_type = source_types.NMEA2000,
				address = src,
				timestamp = None)
		
		if (self._is_not_NA([data[16], data[17]])):
			coolant_press = data[16] + data[17]*256
			coolant_press /= 1000
			#print(f"coolant_press: {coolant_press}")
			self.data_storage.store_data_point(
				parameter=parameter_type.COOLANT_PRESS,
				instance = instance,
				value = coolant_press,
				source_type = source_types.NMEA2000,
				address = src,
				timestamp = None)
		
		if (self._is_not_NA([data[18], data[19]])):
			fuel_press = data[18] + data[19]*256
			fuel_press /= 100
			#print(f"fuel_press: {fuel_press}")
			self.data_storage.store_data_point(
				parameter=parameter_type.FUEL_PRESS,
				instance = instance,
				value = fuel_press,
				source_type = source_types.NMEA2000,
				address = src,
				timestamp = None)
		
		# 1 byte reserved
		
		if (self._is_not_NA([data[21], data[22]])):
			alarm1 = data[21] + data[22]*2**8
			#print(f"alarm1: {hex(alarm1)}")
			self.data_storage.store_data_point(
				parameter=parameter_type.ALARMS_EDS1,
				instance = instance,
				value = alarm1,
				source_type = source_types.NMEA2000,
				address = src,
				timestamp = None)
		
		if (self._is_not_NA([data[23], data[24]])):
			alarm2 = data[23] + data[24]*2**8
			#print(f"alarm1: {hex(alarm2)}")
			self.data_storage.store_data_point(
				parameter=parameter_type.ALARMS_EDS2,
				instance = instance,
				value = alarm2,
				source_type = source_types.NMEA2000,
				address = src,
				timestamp = None)
		
		if (self._is_not_NA([data[25]])):
			load = data[25]
			if load > 127:
				load -= 256	
			#print(f"load: {load}")
			self.data_storage.store_data_point(
				parameter=parameter_type.ENG_LOAD,
				instance = instance,
				value = load,
				source_type = source_types.NMEA2000,
				address = src,
				timestamp = None)
		
		if (self._is_not_NA([data[26]])):
			torque = data[26]
			if torque > 127:
				torque -= 256	
			#print(f"torque: {torque}")
			self.data_storage.store_data_point(
				parameter=parameter_type.ENG_TORQUE,
				instance = instance,
				value = torque,
				source_type = source_types.NMEA2000,
				address = src,
				timestamp = None)
	
	
	def _parse_0x1f211(self, src, pgn, data):
		if len(data) != 8:
			print("Tried parsing incomplete message")
		
		#self.print_byte_array(data)
		instance = data[0] & 0x0F
		tank_type_code = data[0] >> 4
		
		param_type = None
		param_cap_type = None
		
		match(tank_type_code):
			case 0:	# FUEL
				#print("fuel")
				param_type = parameter_type.FUEL_LEVEL
				param_cap_type = parameter_type.FUEL_LEVEL_CAP
			case 1:	# FRESH
				#print("fresh")
				param_type = parameter_type.FRESH_LEVEL
				param_cap_type = parameter_type.FRESH_LEVEL_CAP
			case 2:	# WASTE
				#print("waste")
				param_type = parameter_type.WASTE_LEVEL
				param_cap_type = parameter_type.WASTE_LEVEL_CAP
			case 3:	# LIVE_WELL
				#print("live well")
				param_type = parameter_type.LIVE_WELL_LEVEL
				param_cap_type = parameter_type.LIVE_WELL_LEVEL_CAP
			case 4:	# OIL
				#print("oil")
				param_type = parameter_type.OIL_LEVEL
				param_cap_type = parameter_type.OIL_LEVEL_CAP
			case 5:	# BLACK_WATER
				#print("black water")
				param_type = parameter_type.BLACK_WATER_LEVEL
				param_cap_type = parameter_type.BLACK_WATER_LEVEL_CAP
			case _:
				print("invalid/unsupported tank type")
				return
		
		if (self._is_not_NA([data[1], data[2]])):
			level = data[1] + data[2]*256
			if level > 32764:
				level -= 65536
			level /= 250
			print(f"Level: {level}, instance:{instance}, parameter:{param_type}")
			self.data_storage.store_data_point(
				parameter=param_type,
				instance = instance,
				value = level,
				source_type = source_types.NMEA2000,
				address = src,
				timestamp = None)			
		
		if (self._is_not_NA([data[3], data[4], data[5], data[6]])):
			capacity = data[3] + data[4]*2**8 + data[5]*2**16 + data[6]*2**24
			capacity /= 10
			#print(f"capacity: {capacity}")
			self.data_storage.store_data_point(
				parameter=param_cap_type,
				instance = instance,
				value = capacity,
				source_type = source_types.NMEA2000,
				address = src,
				timestamp = None)		
	
	
	def _parse_0x1fd0c(self, src, pgn, data):
		if len(data) != 8:
			print("Tried parsing incomplete message")
		
		#seq_nr = data[0] # not used in MWS
		instance = data[1]
		temp_type_code = data[2]
		
		param_type = None
		
		match(temp_type_code):
			case 0:	# SEA TEMP
				param_type = parameter_type.SEA_TEMP
			case 1:	# OUTSIDE TEMP
				param_type = parameter_type.OUTSIDE_TEMP
			case 14: # EXHAUST GAS TEMP
				param_type = parameter_type.EXHAUST_GAS_TEMP
			case _:
				print("invalid/unsupported temperature type")
				return
		
		if (self._is_not_NA([data[3], data[4], data[5]])):
			temp = data[3] + data[4]*2**8 + data[5]*2**16
			temp /= 1000
			temp -= KELVIN_OFFSET
			#print(f"Temp: {temp}")
			self.data_storage.store_data_point(
				parameter=param_type,
				instance = instance,
				value = temp,
				source_type = source_types.NMEA2000,
				address = src,
				timestamp = None)		
	
	
	def _parse_0x1f10d(self, src, pgn, data):
		instance = data[0]		
		
		if (self._is_not_NA([data[4], data[5]])):
			rudder = data[4] + data[5]*256
			print(rudder)
			if rudder >= 2**15:
				rudder -= 2**16
			print(rudder)
			rudder = rudder * 180 / (10000*np.pi)
			
			print(f"rudder: {rudder}")
			self.data_storage.store_data_point(
				parameter=parameter_type.RUDDER,
				instance = instance,
				value = rudder,
				source_type = source_types.NMEA2000,
				address = src,
				timestamp = None)
	
	
	def _parse_0x1f214(self, src, pgn, data):
		instance = data[0]		
		
		if (self._is_not_NA([data[1], data[2]])):
			voltage = data[1] + data[2]*256
			if voltage > 2**15:
				voltage -= 2**16
			voltage /= 100
			
			print(f"voltage: {voltage}")
			self.data_storage.store_data_point(
				parameter=parameter_type.BATTERY_POT,
				instance = instance,
				value = voltage,
				source_type = source_types.NMEA2000,
				address = src,
				timestamp = None)
				
		if (self._is_not_NA([data[3], data[4]])):
			current = data[3] + data[4]*256
			if current > 2**15:
				current -= 2**16
			current /= 10
			
			print(f"current: {current}")
			self.data_storage.store_data_point(
				parameter=parameter_type.AMMETER,
				instance = instance,
				value = current,
				source_type = source_types.NMEA2000,
				address = src,
				timestamp = None)		
		
		if (self._is_not_NA([data[5], data[6]])):
			temp = data[5] + data[6]*256
			temp /= 100
			temp -= KELVIN_OFFSET
			
			print(f"temp: {temp}")
			self.data_storage.store_data_point(
				parameter=parameter_type.BATTERY_TEMP,
				instance = instance,
				value = temp,
				source_type = source_types.NMEA2000,
				address = src,
				timestamp = None)
	
	
	def _parse_0x1f212(self, src, pgn, data):
		if len(data) < 11:
			print("Tried to parse not-complete 1f212 message")
			return
		
		#LENGTH-information = data[0]
		#seq_nr = data[1]
		instance = data[2]
		#dc_type = data[3] 		#not used in MWS
		
		if (self._is_not_NA([data[4]])):
			soc = data[4]
			print(f"soc: {soc}")
			self.data_storage.store_data_point(
				parameter=parameter_type.SOC,
				instance = instance,
				value = soc,
				source_type = source_types.NMEA2000,
				address = src,
				timestamp = None)						
		
		if (self._is_not_NA([data[5]])):
			soh = data[5]
			print(f"soh: {soh}")
			self.data_storage.store_data_point(
				parameter=parameter_type.SOH,
				instance = instance,
				value = soh,
				source_type = source_types.NMEA2000,
				address = src,
				timestamp = None)	
				
		if (self._is_not_NA([data[6], data[7]])):
			autonomy = data[6] + data[7]*256
			print(f"autonomy: {autonomy}")
			self.data_storage.store_data_point(
				parameter=parameter_type.BATTERY_AUTON,
				instance = instance,
				value = autonomy,
				source_type = source_types.NMEA2000,
				address = src,
				timestamp = None)	
	
	
	def _is_not_NA(self, data_array):
		return not all(byte == 0xFF or byte == 0x7F for byte in data_array)
	
	def print_byte_array(self, data):
		hex_string = ' '.join(f'{b:02X} | ' for b in data)
		print(hex_string)
	
	
	
class multiframe_handler:
	def __init__(self):
		#                   |SrcAdr   |PGN       |LastSeqNr - Message Frames (unpacked)
		self._mf_cache: Dict[int, Dict[int, Tuple[int, bytearray]]] = {}
		
	def add_frame(self, source_id: int, pgn: int, new_data: bytes) -> None:
		"""
		returns a flag telling, whether the message is completed, followed by a byte list of the current frame chain
		"""
		
		# Ensure data field exists
		if source_id not in self._mf_cache:
			self._mf_cache[source_id] = {}
		
		if pgn not in self._mf_cache[source_id]:
			self._mf_cache[source_id][pgn] = {}
			
		# store frame
		new_seq_nr = new_data[0]
		old_seq_nr = -2	#initalize with value that can not lead to wrong messages
		
		if (self._mf_cache[source_id][pgn]):	# question, because of problems in first frame handling
			old_seq_nr, existing_data = self._mf_cache[source_id][pgn]
		else:
			# start new message combination
			self._mf_cache[source_id][pgn] = (new_seq_nr, new_data[1:])
			print("returned with new msg created")
			return (False, [])
		
		if new_seq_nr == old_seq_nr + 1:
			# Next frame for already existing Multiframe message -> just append
			existing_data.extend(new_data[1:])
			self._mf_cache[source_id][pgn] = (new_seq_nr, existing_data)
			
			final_length = existing_data[0]	# written in the first data field of a mf-message (as per standard)
			current_length = len(existing_data)
			if current_length >= final_length:
				self._mf_cache[source_id][pgn] = (new_seq_nr, [])	# delete current completed frame
				return (True, existing_data)
			else:
				return (False, existing_data)
						
		else:
			# start new message combination
			self._mf_cache[source_id][pgn] = (new_seq_nr, new_data[1:])
			return (False, [])
		
		
		
		
		
		
		
		
		
		
		
		
		
		
