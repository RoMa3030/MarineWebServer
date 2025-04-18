import numpy
a = 5
print(a)
import os
import can
import time
os.system('sudo ip link set can0 type can bitrate 250000')
os.system('sudo ifconfig can0 up')

can0 = can.interface.Bus(channel = 'can0', interface = 'socketcan')# socketcan_native

msg = can.Message(is_extended_id=False, arbitration_id=0x123, data=[0, 1, 2, 3, 4, 5, 6, 7])

while (True):
	can0.send(msg)
	time.sleep(0.25)
	print("Sent Msg")
	
os.system('sudo ifconfig can0 down')
