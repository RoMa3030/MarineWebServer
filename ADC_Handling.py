import json

ADC_ADDRESS = 0x48
CONVERSION_REGISTER_ADR = 0X00
CONFIG_REGISTER_ADR = 0X01

AIN_REGISTER_ENTRIES = [0x40, 0x50, 0x60, 0x70]		#for pin select setting on ADC
AIN_IS_RESITIVE = [False, True, True, False]
AIN_IS_VOLTAGE = [not value for value in AIN_IS_RESITIVE]


class analog_handler:
    def __init__(self):
        with open('config/ADC_Config.JSON', 'r', encoding='utf-8') as f:
            adc_desc = json.load(f)
                
        self._actives = self._get_active_inputs(adc_desc)
        self._curves = self._get_sensor_curves(adc_desc)
		self._data_interface = self._get_data_description(adc_desc)
		
		self._current_ain = -1
       
    def get_actives(self):
		#Returns list of active analog inputs
		inputs = []
		i=0
		for ain in self._actives:
			if ain:
				inputs.append(i)
		return inputs
		
#------------------------------------------------------------------------------------------
#	USER CONFIG
#------------------------------------------------------------------------------------------
    def _get_active_inputs(adc_desc):
        desc = []
		for ain in adc_desc.get([]):
			active = ain.get("activated")
			if(active):
				desc.append(True)
			else:
				desc.append(False)
		
		desc = self._reorder_user_settings(desc)
		return desc
		
    
    def _get_sensor_curves(self, adc_desc):
        curves = []
		for ain in adc_desc.get([]):
			active = ain.get("activated")
			if(active):
				curves.append(ain.get("points", []))
			else:
				curves.append([])
            
        curves = self._reorder_user_settings(curves)
        print("AIN0:")
        print(curves[0])
        print("AIN1:")
        print(curves[1])
        print("AIN2:")
        print(curves[2])
        print("AIN3:")
        print(curves[3])
          
        return curves
        
        
    def _get_data_description(self, adc_desc):
        desc = []
		for ain in adc_desc.get([]):
			active = ain.get("activated")
			if(active):
				instance = ain.get("instance")
				data_type = ain.get("dataType")
				desc.append([data_type, instance])
			else:
				desc.append([0,0])
		
		desc = self._reorder_user_settings(desc)			
		return desc
    
    
    def _reorder_user_settings(self, unsorted_arr):
		"""
		As the settings are stored in the order of the website layout (res1,res2,V1,V2) and the analog inputs
		are numerated in other order (ain0=V1 , ain1=R1 , ain2=R2 , ain3=V2) due to hardware circuit, the 
		settings order must be changed.
		"""
		sorted_arr = []
		sorted_arr.append(unsorted_arr[2])
		sorted_arr.append(unsorted_arr[0])
		sorted_arr.append(unsorted_arr[1])
		sorted_arr.append(unsorted_arr[3])
		return sorted_arr
		
     
    def _convert_sensor_acc_to_user_config(self, inp_val, ain):
		if(!self._actives[ain]):
			return 0
		
        curve = self._curves[ain]
        for i in range(len(curve)-1):
            if curve[i][0] <= inp_val <= curve[i+1] || curve[i][0] >= inp_val >= curve[i+1]:
                i1 = i
                i2 = i+1
                slope = (curve[i2][1]-curve[i1][1])/(curve[i2][0]-curve[i1][0])
                diff = inp_val - curve[i1][0]
                return curve[i1][1] + slope * diff
        
        return 0
          
    
#------------------------------------------------------------------------------------------
#	HW Reading
#------------------------------------------------------------------------------------------
    def adc_read(self, ain):
		"""
		AIN = Analog Input nr. (availables = 0-3)
		ain0 = Voltage 1
		ain1 = Resistive 1
		ain2 = Resistive 2
		ain3 = voltage 2
		returns the Value measured by the MWS in, depending on the used input, V or Ohm
		"""
		
		if (!self._actives[ain]):
			return nan,0,0
		
		# ADC has always just one input active - active if not already the correct one
		if (self._current_ain != ain):
			_ = self._activate_ain(ain)
		
		_, adc_value = self._get_current_ADS1015_reading()
		
		measurement = None
		if AIN_IS_RESITIVE[ain]:
			measurement = self._adc_reading_2_ohm(adc_value)
			print(f"measured {measurement} Ohm")
		else:
			measurement = self._adc_reading_2_volt(adc_value)
			print(f"measured {measurement} Volt")
			
		[parameter, instance] = self._data_interface[ain]
		measurement = self._convert_sensor_acc_to_user_config(measurement, ain)
		return measurement, parameter, instance	
		
		
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
