
import numpy as np
import time
#import pigpio
import os
#import can
import vessel_data
from vessel_data import parameter_type
import NMEA2000_handler
import math
import subprocess

ADC_ADDRESS = 0x48
CONVERSION_REGISTER_ADR = 0X00
CONFIG_REGISTER_ADR = 0X01

AIN_REGISTER_ENTRIES = [0x40, 0x50, 0x60, 0x70]		#for pin select setting on ADC
AIN_IS_RESITIVE = [False, True, True, False]
AIN_IS_VOLTAGE = [not value for value in AIN_IS_RESITIVE]
RX_TIMEOUT = 10.0

class engine_data_interface:
	
	def __init__(self):
		self.engine_data = {
			"rpm": 1234,
			"coolant_temp": 56,
			"fuel-level": 89
		}
		
		self.data_mngr = vessel_data.vessel_data_manager()
		"""self._n2k = NMEA2000_handler.n2k_handler(self.data_mngr)
		
		# setup I2C communication (To ADC)
		self._pi = pigpio.pi()
		if not self._pi.connected:
			print("couldn't establish the PiGPIO object")
			
		self._i2c_handle = self._pi.i2c_open(1, ADC_ADDRESS)	
		self._active_ain = -1	
			
		self._can0 = None
		self.initialize_can_interface()"""
			
   
	def read_engine_data(self):
		
		self.data_mngr.create_fake_data_for_testing()
		while True:
			self._read_can()
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
		json_compliant_data = [-9999.99 if math.isnan(x) else x for x in eng_data]
		return json_compliant_data
	
	
	# -------------------------------------------------------------------------------------
	#       ANALOG READINGS
	# -------------------------------------------------------------------------------------

	def _adc_read(self, ain):
		"""
		AIN = Analog Input nr. (availables = 0-3)
		ain0 = Voltage 1
		ain1 = Resistive 1
		ain2 = Resistive 2
		ain3 = voltage 2
		
		returns the Value measured by the MWS in, depending on the used input, V or Ohm
		"""
		
		if (self._active_ain != ain):
			_ = self._activate_ain(ain)
			
		_, adc_value = self._get_current_ADS1015_reading()
		
		measurement = None
		if AIN_IS_RESITIVE[ain]:
			measurement = self._adc_reading_2_ohm(adc_value)
			print(f"measured {measurement} Ohm")
		else:
			measurement = self._adc_reading_2_volt(adc_value)
			print(f"measured {measurement} Volt")
			
		return measurement	
		
		
	def _activate_ain(self, ain):
		if ain < 0 or ain > 3:
			print("Tried to activate an invalid AIN")
			return False
			 
		success = True
		try:
			ADC_CONFIG_Byte1 = 0xC0		# 1 | 000 | 000 | 0
			#start single shot | Input (not defined yet) | full scale | continuous conversion
			ADC_CONFIG_Byte1 = ADC_CONFIG_Byte1 | AIN_REGISTER_ENTRIES[ain]
			print(f"ADC_CONFIG_Byte1 = {hex(ADC_CONFIG_Byte1)} (should: 0xC0 for AIN0)")
			ADC_CONFIG_Byte2 = 0x83		# 100 | 0 | 0 | 0 | 11
			# default data rate | comp mode (not used) | comp pol (not used) | comp latch (not used) | disable comparator
			ADC_CONFIG = [ADC_CONFIG_Byte1 , ADC_CONFIG_Byte2]
			
			self._pi.i2c_write_device(self._i2c_handle, [CONFIG_REGISTER_ADR, ADC_CONFIG_Byte1, ADC_CONFIG_Byte2])
			time.sleep(0.1)	
			print("i2c - sent config")
			self._pi.i2c_write_device(self._i2c_handle, [CONVERSION_REGISTER_ADR])
			print("i2c - sent pointer to address config")
			self._active_ain = ain
			
		except Exception as e:
			print(f"Error occured while activating analog input: {e}")
			success = False
			
		return success
		
		
	def _get_current_ADS1015_reading(self):
		try:		
			count, data = self._pi.i2c_read_device(self._i2c_handle, 2)
			print(f"data: {data}")
			print(f"data: 0x{[hex(b) for b in data]}")
			print(f"count: {count}")			
			raw_adc_val = data[0]*256/8 + data[1]/8	# combine bytes to int and shift 3bit to the right
			if data[0] & 0x80:
				print("measurment clipped to 0")
				raw_adc_val = 0
			print(f"raw_adc_val = {raw_adc_val}")
			
		except Exception as e:	
			print(f"Error occured while reading current ADC measurement: {e}")
			return (False, 0)
			
		return(True, raw_adc_val)
		
		
	def _adc_reading_2_volt(self, adc_val):
		adc_voltage = adc_val * 0.0015
		sensor_voltage = adc_voltage*57/47	# due to input circuit with voltage divider
		return sensor_voltage
		
		
	def _adc_reading_2_ohm(self, adc_val):
		adc_voltage = adc_val * 0.0015
		R_sens = (5*51.1-adc_voltage*(51.1+511)) / (adc_voltage-5)
		if R_sens < 0:
			R_sens = 0
		#print(f"adc voltage: {adc_voltage:.3f}")
		#print(f"Sensor Resistance: {R_sens:.3f}")		
		return R_sens
	
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
		
		
