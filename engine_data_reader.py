
import numpy as np
import time
import pigpio
import os
import can
import vessel_data
import ADC_Handling
from vessel_data import parameter_type
import NMEA2000_handler
import math
import subprocess

RX_TIMEOUT = 10.0

class engine_data_interface:
	
	def __init__(self):
		self.engine_data = {
			"rpm": 1234,
			"coolant_temp": 56,
			"fuel-level": 89
		}
		
		self.data_mngr = vessel_data.vessel_data_manager()
		self._n2k = NMEA2000_handler.n2k_handler(self.data_mngr)
		self._adc = ADC_Handling.analog_handler()
		
		# setup I2C communication (To ADC)
		self._pi = pigpio.pi()
		if not self._pi.connected:
			print("couldn't establish the PiGPIO object")
			
		self._i2c_handle = self._pi.i2c_open(1, ADC_ADDRESS)	
			
		self._can0 = None
		self.initialize_can_interface()
			
   
	def read_engine_data(self):
		
		self.data_mngr.create_fake_data_for_testing()
		while True:
			val, param, inst = read_can(0)
			print(val)
			#result = self._adc_read(2)	
			#self._read_can()
			"""self.engine_data["rpm"] += 1
			self.engine_data["coolant_temp"] += 1
			if (self.engine_data["coolant_temp"] >= 120):
				self.engine_data["coolant_temp"] = 50"""
			#print(f"RPM = {self.engine_data['rpm']}")
			#print(f"Coolant = {engine_data['coolant_temp']}")
		
			
			time.sleep(1)

	def get_current_engine_data(self):
		eng_data = self.data_mngr.get_updated_web_values()
		#Conversion required as JSON can not send "NaN" -> ToDo: Null possible?
		json_compliant_data = [-9999.99 if math.isnan(x) else x for x in eng_data]
		return json_compliant_data
	
	
	# -------------------------------------------------------------------------------------
	#       ANALOG READINGS
	# -------------------------------------------------------------------------------------

	
	
	# -------------------------------------------------------------------------------------
	#       CAN INTERFACE
	# -------------------------------------------------------------------------------------
	def initialize_can_interface(self):
		os.system('sudo ip link set can0 type can bitrate 250000 listen-only on')
		os.system('sudo ifconfig can0 up')
		
		self._can0 = can.interface.Bus(channel = 'can0', interface = 'socketcan')
		
		print("CAN interface initialized")
		
		
	def _read_can(self):
		msg = self._can0.recv(RX_TIMEOUT)
		if msg:
			print(msg)
			self._n2k.parse_message(msg)
			rpm = self.data_mngr.get_data_point(parameter_type.ENG_SPEED, 0)
			print(f" I READ RPM = {rpm}")
		
	# -------------------------------------------------------------------------------------
	#       Shutdown
	# -------------------------------------------------------------------------------------
		
	def shutdown(self):
		"""self._pi.i2c_close(self._i2c_handle)
		self._pi.stop()
		os.system('sudo ifconfig can0 down')"""
		print("Engine Data Reader shutting down")
		
		
