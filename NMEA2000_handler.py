import vessel_data
from vessel_data import parameter_type
from vessel_data import source_types
import can


class n2k_handler:
	
	def __init__(self, data_storage_obj):
		self._multiframe_cache = {}
		self.data_storage = data_storage_obj
		
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
			
		
		
		
		
		
		
		
	def _is_not_NA(self, data_array):
		return not all(byte == 0xFF or byte == 0x7F for byte in data_array)
