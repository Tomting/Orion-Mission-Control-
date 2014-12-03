import sys
import BaseHTTPServer
import CGIHTTPServer
import cookie
import subprocess
import cgi
import ssl
import json
import signal
import thread
import threading
import string
import random
import datetime
import os
import Cookie

from BaseHTTPServer import BaseHTTPRequestHandler
from SimpleHTTPServer import SimpleHTTPRequestHandler
from CGIHTTPServer import CGIHTTPRequestHandler
from prettytable import PrettyTable
from time import sleep

# psutil
#import psutil

# Websocket
from SimpleWebSocketServer import WebSocket, SimpleWebSocketServer, SimpleSSLWebSocketServer

# Thrift Connection
from thrift import Thrift
from thrift.transport import TSocket
from thrift.transport import TTransport
from thrift.protocol import TBinaryProtocol
from orion.ThrfAlog import ThrfOrn_
from orion.ThrfAlog.ttypes import iEreservedkeyword, iEcolumntype, iEstategossipnode

#SERVER_ADDRESS = '192.168.0.104'
#SERVER_PORT = 9011
#SERVER_ADDRESS = 'mobile.tomting.com'
#SERVER_PORT = 1974
SERVER_ADDRESS = '127.0.0.1'
SERVER_PORT = 9011
SOCKET_TIMEOUT_MS = 5000

chars = string.ascii_letters + string.digits
sessionDict = {} # dictionary mapping session id's to session objects

class SessionElement(object):
   """Arbitrary objects, referenced by the session id"""
   pass

def generateRandom(length):
    """Return a random string of specified length (used for session id's)"""
    return ''.join([random.choice(chars) for i in range(length)])

class RequestHandler(SimpleHTTPRequestHandler, cookie.RequestHandler):
	cookie = Cookie.SimpleCookie()
	orion_host = SERVER_ADDRESS
	orion_port = SERVER_PORT
	server_host = '127.0.0.1'
	server_port = 8000

	def Session(self):
		"""Session management
		If the client has sent a cookie named sessionId, take its value and 
		return the corresponding SessionElement objet, stored in 
		sessionDict
		Otherwise create a new SessionElement objet and generate a random
		8-letters value sent back to the client as the value for a cookie
		called sessionId"""
		if self.cookie.has_key("sessionId"):
			sessionId=self.cookie["sessionId"].value
		else:
			sessionId=generateRandom(8)
			self.cookie["sessionId"]=sessionId
		try:
			sessionObject = sessionDict[sessionId]
		except KeyError:
			sessionObject = SessionElement()
			sessionObject.orion_host = SERVER_ADDRESS
			sessionObject.orion_port = SERVER_PORT
			sessionDict[sessionId] = sessionObject
		return sessionObject

	def _attach_session_data(self):
		for morsel in self.cookie.values():
			self.send_header('Set-Cookie', morsel.output(header='').lstrip())

	def _execute_thrift_command(self, args): 
		try:
			socket = TSocket.TSocket(self.orion_host, self.orion_port)
			socket.setTimeout(SOCKET_TIMEOUT_MS);
			transport = TTransport.TFramedTransport(socket)
			protocol = TBinaryProtocol.TBinaryProtocol(transport)
			client = ThrfOrn_.Client(protocol)
			transport.open()
		
			response = client.command(args);

			transport.close()
			socket.close()

			return [response.bVreturn, response] 

		except Exception as n:
			print n
			return [False, None]

	def _execute_gossiper(self):
		try:
			socket = TSocket.TSocket(self.orion_host, self.orion_port)
			socket.setTimeout(SOCKET_TIMEOUT_MS);
			transport = TTransport.TFramedTransport(socket)
			protocol = TBinaryProtocol.TBinaryProtocol(transport)
			client = ThrfOrn_.Client(protocol)

			transport.open()

			cGossip = ThrfOrn_.ThrfGoss()
			response = client.gossp(cGossip, True, True);

			transport.close()
			socket.close()

			return [True, response] 

		except Exception as n:
			print n
			return [False, None]		

	def _get_form_data(self):
		return cgi.FieldStorage(
			fp=self.rfile,
			headers=self.headers,
			environ={'REQUEST_METHOD':'POST',
				'CONTENT_TYPE':self.headers['Content-Type'],
			})

	def _send_response(self, returnCode, contentType, msg):
		self.send_response(returnCode)
		self.send_header("Content-type", contentType)
		self._attach_session_data()
		self.end_headers()
		self.wfile.write(msg)

	def _make_network_command(self, host, port, command):
		args = ThrfOrn_.ThrfComm()
		args.iVcommand = iEreservedkeyword.NETWORK
		args.iVsubcommand = iEreservedkeyword._NAMES_TO_VALUES[command]		
		if (host is not None):	
			args.sVaddress = host
		if (port is not None):
			args.iVport = int(port)
		return args

	def _make_tablet_command(self, namespace, tablet, command ):
		args = ThrfOrn_.ThrfComm()
		args .iVcommand = iEreservedkeyword.TABLE
		args.iVsubcommand = iEreservedkeyword._NAMES_TO_VALUES[command]
		args.cVmutable = ThrfOrn_.ThrfLmtb() 		
		args.cVmutable.sVnamespace = namespace
		args.cVmutable.sVtable = tablet
		args.cVmutabledestination = ThrfOrn_.ThrfLmtb()
		args.cVmutabledestination.sVnamespace = namespace
		args.cVmutabledestination.sVtable = dummy.trim().toUpperCase()	 		
		args.sVnewtoken = dummy
		args.iVtimestamp = 0
		return args		

	def _handle_data(self):
		pass
		'''
		if self.get_secure_cookie('user') is None:
			print "********************************** COOKIE NOT FOUND"
			self.set_secure_cookie('user', "%d" % random.randint(0,10000000))
		else:
			print self.get_secure_cookie('user')
		'''

	def _serve_file(self):
		path = self.translate_path(self.path)
		try:
			f = open(path, 'rb')
		except IOError:
			raise
		else:
			return SimpleHTTPRequestHandler.do_GET(self)

	def do_GET(self):
		'''
		if (self.path == '/config/'):
			data = {} 
			data['SERVER'] = SERVER_ADDRESS
			data['PORT'] = SERVER_PORT
			self.send_response(200)
			self.send_header("Content-type", "text/json")
			self._attach_session_data()
			self.end_headers()
			self.wfile.write(json.dumps(data));
		else:
			return super(RequestHandler, self).do_GET()
			#return self._serve_file();
		'''
		return super(RequestHandler, self).do_GET()

	def do_POST(self):
		self._handle_data()

		so = self.Session()
		if hasattr(so,'orion_host'):
			print ("====== ORION HOST IS ",so.orion_host)
			print ("====== ORION PORT IS ",so.orion_port)
			self.orion_host = so.orion_host
			self.orion_port = so.orion_port
		else:
			print ("====== NO SESSION FOUND!")
			self.orion_host = SERVER_ADDRESS
			self.orion_port = SERVER_PORT

		if (self.path == '/execute_query/'):
			form = cgi.FieldStorage(
				fp=self.rfile,
				headers=self.headers,
				environ={'REQUEST_METHOD':'POST',
					'CONTENT_TYPE':self.headers['Content-Type'],
				})
			fmt = form['format'].value

			print "===================="
			print form['query'].value 
			print fmt
			print "===================="

			try:
				# Make socket
				print (self.orion_host)
				print (self.orion_port)
				socket = TSocket.TSocket(self.orion_host, self.orion_port)
				socket.setTimeout(SOCKET_TIMEOUT_MS);
 
 				# Buffering is critical. Raw sockets are very slow
 				transport = TTransport.TFramedTransport(socket)

 				# Wrap in a protocol
 				protocol = TBinaryProtocol.TBinaryProtocol(transport)
 
 				# Create a client to use the protocol encoder
 				client = ThrfOrn_.Client(protocol)
 
 				# Connect!
 				transport.open()
 
				#insert into test (name, surname) values ('giuseppe', 'mastrangelo')
				#insert into test (name, surname) values ('daniel', 'nardin')
				#insert into test (name, surname) values ('giancarlo', 'del sordo')
				#select from test

				''' 
					after an INSERT 
					[ThrfL2ks(cVkey=ThrfLkey(sVaccessgroup='', iVtimestamp=0, sVqualifier='', sVmain='', iVstate=0), cVcolumns=[ThrfL2cl(cVvalue=ThrfL2cv(sVvalue='', iVvalue=1, sVlistvalue=[], dVlistvalue=[], dVvalue=0.0, iVtype=3, iVlistvalue=[], bVvalue=False), iVtype=3, sVcolumn='', iVconditiontype=0)])]
				'''

				# Execute the query 
				args = ThrfOrn_.ThrfL2os()
				args.sVnamespace = "DEFAULT"
				args.sVosqlstring = form['query'].value	# TODO: check if it's a dangerous query	
				args.bVonlysecondary = False
				args.iVtimestamp = 0 # TODO: Helpers.getTimestamp()
				args.bVfulltablescan = True

				ret = client.osql(args)
				print "---------"
				print ret
				print "---------"

				# close connection 
 				transport.close()

				# check the type of response... 
				if fmt == 'text':
					out = PrettyTable()
					out.padding_width = 1 # One space between column edges and contents (default)
					columns = []  
					for keyslice in ret:
						recordData = []
						for column in keyslice.cVcolumns:
							# add only if not present in json columns
							if column.sVcolumn not in columns:
								columns.append(column.sVcolumn)
								out.add_column(column.sVcolumn, [])
								out.align[column.sVcolumn] = "l"	# align left
							recordData.append(column.cVvalue.sVvalue)
						out.add_row(recordData)						

					self.send_response(200)
					self.send_header("Content-type", "text/plain")
					self._attach_session_data()
					self.end_headers()
					self.wfile.write("\r\n")
					self.wfile.write(out)
					return

				else:
					data = {}
					data['config'] = { "columns":[] }
					data['data'] = []

					''' try to build a json like this: 
						{
						    "config":{ 
						        columns:[
						            { id:"title",   header:"Film title", tooltip:"..." },
						            { id:"year",    header:"Released" },
						            { id:"votes",   header:"Votes" }
						        ],
						        height:100,
						        autowidth:false
						    },
						    "data":[
						        {title:"The Shawshank Redemption", year:"3232", votes:"678790"},
						        {title:"The Godfather",            year:"1972", votes:"511495"}
						    ]
						}
					'''
					columns = dict()
					for keyslice in ret:
						recordData = {} 
						for column in keyslice.cVcolumns:
							# add only if not present in json columns
							if column.sVcolumn not in columns:
								columns[column.sVcolumn] = 0
								jsonColumn = {}
								jsonColumn['id'] = column.sVcolumn
								jsonColumn['header'] = column.sVcolumn
								jsonColumn['tooltip'] = column.sVcolumn
								if column.iVtype == iEcolumntype.STRINGTYPE: 
									jsonColumn['sort'] = "string"
								elif column.iVtype == iEcolumntype.INTEGRTYPE:
									jsonColumn['sort'] = "int"
								elif  column.iVtype == iEcolumntype.DOUBLETYPE:
									jsonColumn['sort'] = "double"
								#jsonColumn['minWidth'] = 100
								jsonColumn['adjust'] = "data"
								data['config']['columns'].append(jsonColumn)
							# add record data
							if column.iVtype == iEcolumntype.STRINGTYPE:
								recordData[column.sVcolumn] = column.cVvalue.sVvalue
							elif column.iVtype == iEcolumntype.LSTRNGTYPE:
								tempStr = '['
								tempStr += ",".join(column.cVvalue.sVlistvalue)
								tempStr += ']'
								recordData[column.sVcolumn] = tempStr
							elif column.iVtype == iEcolumntype.INTEGRTYPE:
								recordData[column.sVcolumn] = column.cVvalue.iVvalue
							elif column.iVtype == iEcolumntype.LINTGRTYPE: 
								tempStr = '['
								tempStr += ",".join(column.cVvalue.iVlistvalue)
								tempStr += ']'
								recordData[column.sVcolumn] = tempStr
							elif column.iVtype == iEcolumntype.DOUBLETYPE:
								recordData[column.sVcolumn] = column.cVvalue.dVvalue
							elif column.iVtype == iEcolumntype.LDOUBLTYPE:
								tempStr = '['
								tempStr += ",".join(column.cVvalue.dVlistvalue)
								tempStr += ']'
								recordData[column.sVcolumn] = tempStr
							elif column.iVtype == iEcolumntype.BOOLN_TYPE:
								recordData[column.sVcolumn] = column.cVvalue.bVvalue
							else:
								recordData[column.sVcolumn] = "Undefined"
						data['data'].append(recordData)						

					out = json.dumps(data)
					self.send_response(200)
					self.send_header("Content-type", "text/json")
					self._attach_session_data()
					self.end_headers()
					self.wfile.write(out);
					return

 			except Thrift.TException, tx:
 				print "%s" % (tx.message)
 				self._send_response(500, "text/plain", tx.message)
 				return

 			self._send_response(500, "text/plain", "something was wrong...")

 		elif ( self.path == '/get_config/'):
 			form = self._get_form_data()
 			fmt = form['format'].value
 			data = {}
 			data['wsserver'] = self.server_host
 			data['wsport'] = self.server_port + 1
 			data['orionserver'] = SERVER_ADDRESS
 			data['orionport'] = SERVER_PORT
			self._send_response(200, "text/json", json.dumps(data)) 			

		elif ( self.path == '/connect/'):
			form = self._get_form_data()
			fmt = form['format'].value
			host = form['host'].value
			port = form['port'].value
			so = self.Session()
			so.orion_host = host
			so.orion_port = int(port)
			self._send_response(200, "text/plain", ("connected to %s:%d" % (so.orion_host, so.orion_port)))

		elif ( self.path == '/network_add/'):
			form = self._get_form_data()
			fmt = form['format'].value
			host = form['host'].value
			port = form['port'].value
			args = self._make_network_command(host, port, "ADD")
			ret, response = self._execute_thrift_command(args);
			self._send_response(200, "text/plain", ret)

		elif ( self.path == '/network_remove/'):
			form = self._get_form_data()
			fmt = form['format'].value
			host = form['host'].value
			port = form['port'].value
			args = self._make_network_command(host, port, "REMOVE")
			ret, response = self._execute_thrift_command(args);
			self._send_response(200, "text/plain", ret)

		elif ( self.path == '/network_join/'):
			form = self._get_form_data()
			fmt = form['format'].value
			host = form['host'].value
			port = form['port'].value
			args = self._make_network_command(host, port, "JOIN")
			ret, response = self._execute_thrift_command(args);
			self._send_response(200, "text/plain", ret)

		elif ( self.path == '/network_leave/'):
			form = self._get_form_data()
			fmt = form['format'].value
			args = self._make_network_command(None, None, "LEAVE")
			ret, response = self._execute_thrift_command(args);
			self._send_response(200, "text/plain", ret)

		elif ( self.path == '/network_disconnect/'):
			form = self._get_form_data()
			fmt = form['format'].value
			args = self._make_network_command(None, None, "DISCONNECT")
			ret, response = self._execute_thrift_command(args);
			self._send_response(200, "text/plain", ret)

		elif ( self.path == '/table_touch/'):
			form = self._get_form_data()
			fmt = form['format'].value
			name = form['name'].value

		elif ( self.path == '/gossiper/'):
			form = cgi.FieldStorage(
				fp=self.rfile,
				headers=self.headers,
				environ={'REQUEST_METHOD':'POST',
					'CONTENT_TYPE':self.headers['Content-Type'],
				})
			fmt = form['format'].value

			ret, response = self._execute_gossiper();
			print ret
			print response

			if (ret):
				if (fmt == "text"):
					out = PrettyTable(['DATACENTER','NODE','ADDRESS','PORT','STATUS','AFD'])
					out.padding_width = 1 # One space between column edges and contents (default)
					out.align['DATACENTER'] = "l"	# align left
					out.align['NODE'] = "l"	# align left
					out.align['ADDRESS'] = "l"	# align left
					out.align['PORT'] = "l"	# align left
					out.align['STATUS'] = "l"	# align left
					out.align['AFD'] = "l"	# align left
					for item in response.cVgossipelement:
						recordData = []
						recordData.append(item.sVdatacenterid)
						recordData.append(item.sVnodeid)
						recordData.append(item.sVaddress)
						recordData.append(item.iVport)
						recordData.append(iEstategossipnode._VALUES_TO_NAMES[item.iVstate])
						recordData.append(item.dVphiaccrual)
						out.add_row(recordData)						

					self.send_response(200)
					self.send_header("Content-type", "text/plain")
					self._attach_session_data()
					self.end_headers()
					self.wfile.write("\r\n")
					self.wfile.write(out)
					return
			
			self.send_response(200)
			self.send_header("Content-type", "text/plain")
			self._attach_session_data()
			self.end_headers()
			self.wfile.write("\r\n")
			self.wfile.write(ret)

		elif ( self.path == '/config/'):
			form = self._get_form_data()
			fmt = form['format'].value
			out = PrettyTable(['DESCRIPTION','VALUE'])
			out.align = "l"
			out.padding_width = 1 # One space between column edges and contents (default)
			out.add_row(["server host", self.server_host])
			out.add_row(["server port", self.server_port])
			out.add_row(["websocket port", self.server_port+1])
			so = self.Session()
			out.add_row(["session orion host", so.orion_host])
			out.add_row(["session orion port", so.orion_port])
			self._send_response(200, "text/plain", "\r\n"+out.get_string())

		else:
			super(RequestHandler, self).do_GET()

class OrionStat(WebSocket):
	started = False
	data = []

	def orion_top(self):
		try:
			socket = TSocket.TSocket(SERVER_ADDRESS, SERVER_PORT)
			socket.setTimeout(SOCKET_TIMEOUT_MS);
			transport = TTransport.TFramedTransport(socket)
			protocol = TBinaryProtocol.TBinaryProtocol(transport)
			client = ThrfOrn_.Client(protocol)
			transport.open()
			args = ThrfOrn_.ThrfComm()
	 		args.iVcommand = iEreservedkeyword.TOP;
	 		ret = client.command(args);
			transport.close()
			socket.close()

			rows = []
			for row in ret.cVreturntop.cVtopelement:
				tmp = {}
				tmp['NAME'] = row.sVtablet
				tmp['TOTAL'] = 0
				tmp['LOAD'] = 0
				tmp['READ'] = row.iVreadtime
				tmp['WRITE'] = row.iVwritetime
				rows.append( tmp )
			data = { "data":rows }

	 		self.data = json.dumps(data)
	 		self.handleMessage("top");

	 		if (self.started):
				threading.Timer(10, self.orion_top).start()
		except Exception as n:
			print n

	def handleMessage(self, messagetype):
		if self.data is None:
			self.data = ''

		try:
			self.sendMessage('{ msgtype:"'+messagetype+'", params:'+str(self.data) + '}')
		except Exception as n:
			print n

		#for client in self.server.connections.itervalues():
		#	if client != self:
		#		try:
		#			client.sendMessage('{ msgtype:"'+messagetype+'", params:{'+str(self.data)+'} }')
		#		except Exception as n:
		#			print n

	def handleConnected(self):
		if not self.started:
			self.started = True
			self.orion_top()

		print self.address, 'connected'
		#for client in self.server.connections.itervalues():
		#	if client != self:
		#		try:
		#			client.sendMessage(str(self.address[0]) + ' - connected')
		#		except Exception as n:
		#			print n

	def handleClose(self):
		print self.address, 'closed'
		self.started = False
		
		#for client in self.server.connections.itervalues():
		#	if client != self:
		#		try:
		#			client.sendMessage(str(self.address[0]) + ' - disconnected')
		#		except Exception as n:
		#			print n

# threaded function that start the server
def start_server(obj):
	obj.serve_forever()

HandlerClass = RequestHandler
ServerClass  = BaseHTTPServer.HTTPServer
Protocol     = "HTTP/1.0"

if sys.argv[1:]:
	port = int(sys.argv[1])
else:
	port = 8000
	server_address = ('0.0.0.0', port)

HandlerClass.protocol_version = Protocol
httpd = ServerClass(server_address, HandlerClass)
httpd.cookie_secret = "78A2JIGXSrehem2HqgpozJek2Ep3g0FTqBmnizsAFSM="
httpd.server_host = server_address
httpd.server_port = port

# Initialize the websocket server 
websocketserver = SimpleWebSocketServer('0.0.0.0', port+1, OrionStat)

# Close signal
def close_sig_handler(signal, frame):
	websocketserver.close()
	sys.exit()

signal.signal(signal.SIGINT, close_sig_handler)

sa = httpd.socket.getsockname()
print "Serving HTTP on", sa[0], "port", port, "..."
#if you want an SSL server uncomment the following line
#httpd.socket = ssl.wrap_socket (httpd.socket, certfile='path/to/localhost.pem', server_side=True)
thread.start_new_thread(start_server, (httpd,))

print "Serving Websocket on", sa[0], "port", port+1, "..."
thread.start_new_thread(start_server, (websocketserver,))

while 1:
   sleep(0.1)
   pass