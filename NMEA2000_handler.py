from vessel_data import parameter_type
from vessel_data import source_types
import can
from typing import Dict, List, Tuple

MULTIFRAME_MESSAGES = [0x1F201,0x1F212]

class n2k_handler:
	
	def __init__(self, data_storage_obj):
		self.data_storage = data_storage_obj
		self._mf_handler = multiframe_handler()
		
	def parse_message(self, msg):
		msg_data = msg.data
		head = msg.arbitration_id
		
		src_adr = head & 0xFF
		pgn = (head & 0x7FFFF00) >> 8
		
		print(f"head: {hex(head)}")
		print(f"Src: {hex(src_adr)}")
		print(f"pgn: {hex(pgn)}")
		#print(f"data: {msg_data}")
		
		match(pgn):
			case 0x1f200:
				self._parse_0x1f200(src_adr, pgn, msg_data)
			case 0x1f201:
				msg_complete, combined_msg = self._mf_handler.add_frame(src_adr, pgn, msg_data)
				if msg_complete:
					print("Completed MF-Message assembly")
					print(combined_msg)
					self._parse_0x1f201(src_adr, pgn, combined_msg)
		

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
			#print(f"boost: {boost}")
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
		instance = data[0]
		print("I arrived in the 1f201 message parser")
		
		
		
		
		
	def _is_not_NA(self, data_array):
		return not all(byte == 0xFF or byte == 0x7F for byte in data_array)
		
		
		
		
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
		
		
		
		
		
		
		
		
		
		
		
		
		
		
