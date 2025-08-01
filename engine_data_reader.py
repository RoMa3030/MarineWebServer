
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
IGN_INPUT_PIN = 26

class engine_data_interface:
	
	def __init__(self):
		self._interface_running = True
		
		# data container
		self.data_mngr = vessel_data.vessel_data_manager()
		
		# setup CAN
		self._n2k = NMEA2000_handler.n2k_handler(self.data_mngr)	# actual object is passed to class instance for adding data!
		self._can0 = None
		self.initialize_can_interface()
		
		# setup PI HW
		self._pi = pigpio.pi()
		# setup Ignition watcher
		self._pi.set_mode(IGN_INPUT_PIN, pigpio.INPUT)
		# setup ADC / I2C
		if not self._pi.connected:
			print("couldn't establish the PiGPIO object")
		self._i2c_handle = self._pi.i2c_open(1, ADC_Handling.ADC_ADDRESS)
		
		# create un-initialized variables (defined in following init-function)
		self._adc = None
		self._active_ains = None
		self._current_ain_index = None
		self._adc_interval = None		
		self._init_adc()
		# Start Analog-reading-automatism, if any A.-In. is activated
		if self._active_ains:
			self._adc_interval = 1.0/(len(self._active_ains)) 
			self._start_Timer(self._adc_interval)
   
	def read_engine_data(self):
		#self.data_mngr.create_fake_data_for_testing()
		while self._interface_running:
			# ADC reading triggered in "timer-ISR"
			self._read_can()
			self._check_ignition_signal()


	def get_current_engine_data(self):
		eng_data = self.data_mngr.get_updated_web_values()
		print(eng_data)
		#Conversion required as JSON can not send "NaN" -> ToDo: Null possible?
		json_compliant_data = [-9999.99 if math.isnan(x) else x for x in eng_data]
		return json_compliant_data
	
	
	def initialize_can_interface(self):
		os.system('sudo ip link set can1 type can bitrate 250000')
		os.system('sudo ifconfig can1 up')
		self._can0 = can.interface.Bus(channel = 'can1', interface = 'socketcan')
		#print("CAN interface initialized")
		
	
	def reinit_adc(self):
		# can be called by primary thread if the user changed the ADC configuration during operation
		if not self._interface_running:		# if re-init is called before init was ever running: method is being used wrong
			return
				
		self._adc.reconfigure_adc_settings()
		
		adc_was_active_before = False
		if self._active_ains:
			adc_was_active_before = True
		
		self._init_adc()
		# Start Analog-reading-automatism, if any A.-In. is activated (and the timer-automatism is not already running)
		if self._active_ains:
			self._adc_interval = 1.0/(len(self._active_ains))
			if not adc_was_active_before:
				self._start_Timer(self._adc_interval)
				
		
	def reinit_data_interface(self, path=None):
		# can be called by primary thread if the user changed the Layout configuration
		self.data_mngr.update_website_interface_description(path)
		
	def _read_can(self):
		msg = self._can0.recv(RX_TIMEOUT)
		if msg:
			#print(msg)
			self._n2k.parse_message(msg)
		
		
	def _adc_timer_interrupt(self):
		if not self._interface_running:		# catch shutdown moment
			return
		
		# Read Input
		ain = self._active_ains[self._current_ain_index]
		#print(f"I: Reading from AIN {ain}")
		_, sensor_val, param, inst = self._adc.adc_read(ain)
		if sensor_val != np.isnan:
			#print(f"Stored parameter obtained from ADC - {self._current_ain_index}")
			#print(f"sensor val:{sensor_val} / param:{param} / instance:{inst}")
			self.data_mngr.store_data_point(
				parameter = param,
				instance = inst,
				value = sensor_val,
				source_type = source_types.ANALOG,
				address = -1
			)
		else:
			print("adc_Read: returnen NAN")
		
		# Prepare next input
		self._current_ain_index += 1
		if self._current_ain_index >= len(self._active_ains):
			self._current_ain_index = 0
		
		# reset timer
		self._start_Timer(self._adc_interval)
		
	def _init_adc(self):
		self._adc = ADC_Handling.analog_handler(self._pi, self._i2c_handle)
		
		# setup timer
		self._active_ains = self._adc.get_actives()
		print(f"These are the activated inputs: {self._active_ains}")
		self._current_ain_index = 0
		self._adc_interval = 1.0	
		
		
	def _start_Timer(self, duration):
		if self._interface_running:
			timer = threading.Timer(duration, self._adc_timer_interrupt)
			timer.deamon = True
			timer.start()
	
	
	def _check_ignition_signal(self):
		ign_signal = self._pi.read(IGN_INPUT_PIN)
		if(not ign_signal):
			print("Ignition signal removed - shutdown")
			self.shutdown(hard=True)
			
		
	def shutdown(self, hard=False):
		# Executed from Main-Thread!
		self._interface_running = False		 	# As timer runs in separate thread, flag must be cleared to stop.
		time.sleep(RX_TIMEOUT * 1.2)			# Delay to finish CAN reading
		self._pi.i2c_close(self._i2c_handle)
		self._pi.stop()
		self._can0.shutdown()
		os.system('sudo ifconfig can1 down')
		print("Engine Data Reader shutting down")
		if(hard):
			#Shut down Pi completely
			os._exit(0)
		
		
