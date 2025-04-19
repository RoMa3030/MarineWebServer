import vessel_data
import can


class n2k_handler:
	
	def __init__(self):
		self._multiframe_cache = {}
		
	def parse_message(self, msg):
		data = msg.data
		head = msg.arbitration_id
		
		print(f"head: {head}")
		print(f"data: {data}")


