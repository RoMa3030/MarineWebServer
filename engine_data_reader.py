
import numpy as np
import threading
import time
import pigpio
import os
import can
import vessel_data
import ADC_Handling
from vessel_data import parameter_type
from vessel_data import source_types

import NMEA2000_handler
import math
import subprocess


RX_TIMEOUT = 0.5
AIN_R1 = 2
AIN_R2 = 1
AIN_V1 = 0
AIN_V2 = 3

class engine_data_interface:
	
	def __init__(self):
		self._interface_running = False
		
		# data container
		self.data_mngr = vessel_data.vessel_data_manager()
		
		# setup CAN
		self._n2k = NMEA2000_handler.n2k_handler(self.data_mngr)
		self._can0 = None
		self.initialize_can_interface()
		
		# setup ADC / I2C
		self._pi = pigpio.pi()
		if not self._pi.connected:
			print("couldn't establish the PiGPIO object")
		self._i2c_handle = self._pi.i2c_open(1, ADC_Handling.ADC_ADDRESS)
		self._adc = ADC_Handling.analog_handler(self._pi, self._i2c_handle)
		
		# setup timer
		self._active_ains = self._adc.get_actives()
		self._current_ain_index = 0
		self._adc_interval = 1.0
		if self._active_ains:
			self._interface_running = True
			self._adc_interval = 1.0/(len(self._active_ains)) 
			self._start_Timer(self._adc_interval)
			
   
	def read_engine_data(self):
		#self.data_mngr.create_fake_data_for_testing()
		while self._interface_running:
			# ADC reading triggered in "timer-ISR"
			self._read_can()


	def get_current_engine_data(self):
		eng_data = self.data_mngr.get_updated_web_values()
		#Conversion required as JSON can not send "NaN" -> ToDo: Null possible?
		json_compliant_data = [-9999.99 if math.isnan(x) else x for x in eng_data]
		return json_compliant_data
	
	
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
		
		
	def _adc_timer_interrupt(self):
		if not self._interface_running:		# catch shutdown moment
			return
		
		# Read Input
		_, sensor_val, param, inst = self._adc.adc_read(self._active_ains[self._current_ain_index])
		if sensor_val != np.isnan:
			self.data_mngr.store_data_point(
				parameter = param,
				instance = inst,
				value = sensor_val,
				source_type = source_types.ANALOG,
				address = -1
			)
		
		# Prepare next input
		self._current_ain_index += 1
		if self._current_ain_index >= len(self._active_ains):
			self._current_ain_index = 0
		
		# reset timer
		self._start_Timer(self._adc_interval)
		
		
	def _start_Timer(self, duration):
		if self._interface_running:
			timer = threading.Timer(duration, self._adc_timer_interrupt)
			timer.deamon = True
			timer.start()
			
		
	def shutdown(self):
		# Executed from Main-Thread!
		self._interface_running = False		 	# As timer runs in separate thread, flag must be cleared to stop.
		time.sleep(RX_TIMEOUT * 1.2)			# Delay to finish CAN reading
		self._pi.i2c_close(self._i2c_handle)
		self._pi.stop()
		os.system('sudo ifconfig can0 down')
		print("Engine Data Reader shutting down")
		
		
