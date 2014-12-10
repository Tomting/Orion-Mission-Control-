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

from BaseHTTPServer import HTTPServer
from SocketServer import ThreadingMixIn
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

class ThreadedHTTPServer(ThreadingMixIn, HTTPServer):
    """Handle requests in a separate thread."""

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
			print ("*************************************** FOUND SESSIONID", self.cookie["sessionId"].value)
			sessionId=self.cookie["sessionId"].value
		else:
			sessionId=generateRandom(8)
			print ("*************************************** NOT FOUND SESSIONID NEW ",sessionId)
			self.cookie["sessionId"]=sessionId
		try:
			sessionObject = sessionDict[sessionId]
		except KeyError:
			sessionObject = SessionElement()
			sessionObject.orion_host = SERVER_ADDRESS
			sessionObject.orion_port = SERVER_PORT
			sessionObject.orion_ns = "DEFAULT"
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
			return [False, n.message]

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

	def _make_table_command(self, name, command ):
		args = ThrfOrn_.ThrfComm()
		args.cVmutabledestination = ThrfOrn_.ThrfLmtb()
		args .iVcommand = iEreservedkeyword.TABLE
		args.iVsubcommand = iEreservedkeyword._NAMES_TO_VALUES[command]
		args.cVmutable = ThrfOrn_.ThrfLmtb() 	
		so = self.Session()
		if so.orion_ns is None:
			args.cVmutable.sVnamespace = "DEFAULT"
			args.cVmutabledestination.sVnamespace = "DEFAULT"
		else:
			args.cVmutable.sVnamespace = so.orion_ns
			args.cVmutabledestination.sVnamespace = so.orion_ns
		args.cVmutable.sVtable = name
		#args.cVmutabledestination.sVtable = dummy.trim().toUpperCase()	 		
		#args.sVnewtoken = dummy
		args.cVmutabledestination.sVtable = ""	 		
		args.sVnewtoken = ""
		args.iVtimestamp = 0
		return args		

	def _add_graph_datacenter(self, name):
		config = {}
		config['name'] = name
		config['children'] = []
		return config

	def _add_graph_node(self, datacenter, name):
		node = {}
		node['name'] = name
		node['children'] = []
		datacenter['children'].append(node)
		return node

	def _add_graph_address(self, node, name):
		address = {}
		address['name'] = name
		node['children'].append(address)
		return address

	'''
	def _sessionid_headers(self):
		if self.headers.has_key('SESSIONID'):
			print self.headers.getheader("SESSIONID")
		else:
			print "NO SESSIONID FOUND"
			print self.headers
			self.send_header("SESSIONID","STOCAZZO")

	def end_headers(self):
		self._sessionid_headers()
		SimpleHTTPRequestHandler.end_headers(self)
	'''

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
		so = self.Session()
		if hasattr(so,'orion_host'):
			self.orion_host = so.orion_host
			self.orion_port = so.orion_port
		else:
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
				if so.orion_ns is None:
					args.sVnamespace = "DEFAULT"
				else:
					args.sVnamespace = so.orion_ns
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

		elif ( self.path == '/change_namespace/'):
			form = self._get_form_data()
			fmt = form['format'].value
			namespace = form['namespace'].value
			so = self.Session()
			so.orion_ns = namespace.upper()
			self._send_response(200, "text/plain", ("changed namespace to %s" % (so.orion_ns)))

		elif ( self.path == '/network_add/'):
			form = self._get_form_data()
			fmt = form['format'].value
			host = form['host'].value
			port = form['port'].value
			args = self._make_network_command(host, port, "ADD")
			ret, response = self._execute_thrift_command(args);
			if (ret == False and fmt == "json"):
				self._send_response(500, "text/plain", "cannot add %s %s" % (host, port))
			else:
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
			name = form['table'].value
			args = self._make_table_command(name, "TOUCH")
			ret, response = self._execute_thrift_command(args);
			if ret == True:
				out = "OK"
			else:
				out = "ERROR: %s" % response
			self._send_response(200, "text/plain", out)

		elif ( self.path == '/table_clean/'):
			form = self._get_form_data()
			fmt = form['format'].value
			name = form['table'].value
			args = self._make_table_command(name, "CLEAN")
			ret, response = self._execute_thrift_command(args);
			if ret == True:
				out = "OK"
			else:
				out = "ERROR: %s" % response
			self._send_response(200, "text/plain", out)

		elif ( self.path == '/table_purge/'):
			form = self._get_form_data()
			fmt = form['format'].value
			name = form['table'].value
			args = self._make_table_command(name, "PURGE")
			ret, response = self._execute_thrift_command(args);
			if ret == True:
				out = "OK"
			else:
				out = "ERROR: %s" % response
			self._send_response(200, "text/plain", out)

		elif ( self.path == '/table_shrink/'):
			form = self._get_form_data()
			fmt = form['format'].value
			name = form['table'].value
			args = self._make_table_command(name, "SHRINK")
			ret, response = self._execute_thrift_command(args);
			if ret == True:
				out = "OK"
			else:
				out = "ERROR: %s" % response
			self._send_response(200, "text/plain", out)

		elif ( self.path == '/table_rebuild/'):
			form = self._get_form_data()
			fmt = form['format'].value
			name = form['table'].value
			args = self._make_table_command(name, "REBUILD")
			ret, response = self._execute_thrift_command(args);
			if ret == True:
				out = "OK"
			else:
				out = "ERROR: %s" % response
			self._send_response(200, "text/plain", out)

		elif ( self.path == '/table_compaction/'):
			form = self._get_form_data()
			fmt = form['format'].value
			name = form['table'].value
			args = self._make_table_command(name, "COMPACTION")
			ret, response = self._execute_thrift_command(args);
			if ret == True:
				out = "OK"
			else:
				out = "ERROR: %s" % response
			self._send_response(200, "text/plain", out)

		elif ( self.path == '/table_split/'):
			form = self._get_form_data()
			fmt = form['format'].value
			name = form['table'].value
			args = self._make_table_command(name, "SPLIT")
			ret, response = self._execute_thrift_command(args);
			if ret == True:
				out = "OK"
			else:
				out = "ERROR: %s" % response
			self._send_response(200, "text/plain", out)

		elif ( self.path == '/table_store/'):
			form = self._get_form_data()
			fmt = form['format'].value
			name = form['table'].value
			args = self._make_table_command(name, "STORE")
			ret, response = self._execute_thrift_command(args);
			if ret == True:
				out = "OK"
			else:
				out = "ERROR: %s" % response
			self._send_response(200, "text/plain", out)

		elif ( self.path == '/table_forget/'):
			form = self._get_form_data()
			fmt = form['format'].value
			name = form['table'].value
			args = self._make_table_command(name, "FORGET")
			ret, response = self._execute_thrift_command(args);
			if ret == True:
				out = "OK"
			else:
				out = "ERROR: %s" % response
			self._send_response(200, "text/plain", out)

		elif ( self.path == '/table_load/'):
			form = self._get_form_data()
			fmt = form['format'].value
			name = form['table'].value
			args = self._make_table_command(name, "LOAD")
			ret, response = self._execute_thrift_command(args);
			if ret == True:
				out = "OK"
			else:
				out = "ERROR: %s" % response
			self._send_response(200, "text/plain", out)

		elif ( self.path == '/table_reload/'):
			form = self._get_form_data()
			fmt = form['format'].value
			name = form['table'].value
			args = self._make_table_command(name, "RELOAD")
			ret, response = self._execute_thrift_command(args);
			if ret == True:
				out = "OK"
			else:
				out = "ERROR: %s" % response
			self._send_response(200, "text/plain", out)

		elif ( self.path == '/table_info/'):
			form = self._get_form_data()
			fmt = form['format'].value
			name = form['table'].value
			args = self._make_table_command(name, "INFO")
			ret, response = self._execute_thrift_command(args);
			if ret == True:
				out = "OK"
			else:
				out = "ERROR: %s" % response
			self._send_response(200, "text/plain", response)

		elif ( self.path == '/update_graph/'):
			form = self._get_form_data()
			#fmt = form['format'].value
			ret, response = self._execute_gossiper()

			graph = {}
			datacenter = {}
			node = {}
			graph['name'] = "ORION"
			graph['children'] = [] 

			for item in response.cVgossipelement:
				if item.sVdatacenterid not in datacenter:
					datacenter[item.sVdatacenterid] = self._add_graph_datacenter(item.sVdatacenterid)
				if item.sVnodeid not in node: 
					node[item.sVnodeid] = self._add_graph_node(datacenter[item.sVdatacenterid], item.sVnodeid)
				self._add_graph_address(node[item.sVnodeid], "%s %d [%s, %f]" % (item.sVaddress, item.iVport,iEstategossipnode._VALUES_TO_NAMES[item.iVstate], item.dVphiaccrual))

			for item in datacenter:
				graph['children'].append(datacenter[item])

			self.send_response(200)
			self.send_header("Content-type", "text/json")
			self._attach_session_data()
			self.end_headers()
			self.wfile.write(json.dumps(graph))

		elif ( self.path == '/gossiper/'):
			form = cgi.FieldStorage(
				fp=self.rfile,
				headers=self.headers,
				environ={'REQUEST_METHOD':'POST',
					'CONTENT_TYPE':self.headers['Content-Type'],
				})
			fmt = form['format'].value

			ret, response = self._execute_gossiper()
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

		elif ( self.path == '/topspeed/'):
			form = self._get_form_data()
			fmt = form['format'].value
			args = ThrfOrn_.ThrfComm()
	 		args.iVcommand = iEreservedkeyword.TOP;
	 		ret, response = self._execute_thrift_command(args);
			if ret == True:
				out = "OK"
			else:
				out = "ERROR: %s" % response
			self._send_response(200, "text/plain", response)	 		


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
			if hasattr(so,'orion_host'):
				out.add_row(["session orion host", so.orion_host])
				out.add_row(["session orion port", so.orion_port])
				out.add_row(["session namespace", so.orion_ns])
			else:
				out.add_row(["session orion host", "Unknown"])
				out.add_row(["session orion port", "Unknown"])
				out.add_row(["session namespace", "Unknown"])

			self._send_response(200, "text/plain", "\r\n"+out.get_string())

		else:
			super(RequestHandler, self).do_GET()

class TopDataElement(object):
   """Arbitrary objects, referenced by topMap"""
   pass

class OrionStat(WebSocket):
	started = False
	topMap = dict()
	lastTimestamp = 0

	'''
	def _getSizedTime(value):
		kB = 1024.0
		MB = kB * 1024.0	
		GB = MB * 1024.0;
		ms = 1000.0;
		s = ms * 1000.0;
		m = s * 60;
		h = m * 60;
		if (value < ms) return us + " us";
		if (value < s) return roundToDecimals(us /ms, 2) + " ms";
		if (value < m) return roundToDecimals(us /s, 2) + " s";		
		if (value < h) return roundToDecimals(us /m, 1) + " m";	
		return roundToDecimals(us /h, 1) + " h";										
	'''

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
			diffTimestamp = ret.cVreturntop.iVtimestamp - self.lastTimestamp;
			for t in ret.cVreturntop.cVtopelement:
				if t.sVtablet not in self.topMap:
					topDataObject = TopDataElement()
					topDataObject.readDiffTime = 0
					topDataObject.writeDiffTime = 0
					topDataObject.orderTime = 0
					topDataObject.readTime = 0
					topDataObject.writeTime = 0	
					topDataObject.readDiffCountL2 = 0
					topDataObject.writeDiffCountL2 = 0					
					topDataObject.readCountL2 = 0
					topDataObject.writeCountL2 = 0
					topDataObject.readDiffCountL1 = 0
					topDataObject.writeDiffCountL1 = 0						
					topDataObject.readCountL1 = 0
					topDataObject.writeCountL1 = 0
					self.topMap[t.sVtablet] = topDataObject

				topData = self.topMap[t.sVtablet]
				topData.readDiffTime = t.iVreadtime - topData.readTime
				topData.writeDiffTime = t.iVwritetime - topData.writeTime;
				topData.orderTime = topData.readDiffTime + topData.writeDiffTime;

				'''
				print "t.iVreadtime   %d" % t.iVreadtime
				print "t.iVwritetime  %d" % t.iVwritetime
				print "topData.readTime %d" % topData.readTime
				print "topData.writeTime %d" % topData.writeTime
				print "topData.readDiffTime %d" % topData.readDiffTime
				print "topData.writeDiffTime %d" % topData.writeDiffTime
				print "======"
				'''

				topData.readTime = t.iVreadtime;
				topData.writeTime = t.iVwritetime;	
				topData.readDiffCountL2 = t.iVreadcountl2 - topData.readCountL2;
				topData.writeDiffCountL2 = t.iVwritecountl2 - topData.writeCountL2;					
				topData.readCountL2 = t.iVreadcountl2;
				topData.writeCountL2 = t.iVwritecountl2;
				topData.readDiffCountL1 = t.iVreadcountl1 - topData.readCountL1;
				topData.writeDiffCountL1 = t.iVwritecountl1 - topData.writeCountL1;						
				topData.readCountL1 = t.iVreadcountl1;
				topData.writeCountL1 = t.iVwritecountl1;

				diffTime = diffTimestamp / 1000
				tmp = {}
				tmp['NAME'] = t.sVtablet
				tmp['TOTAL'] = topData.orderTime
				if (diffTime == 0):
					tmp['LOAD'] = 0
				else:
					#percentage = '{0:.3g}'.format(100 * topData.orderTime / diffTime)
					percentage = 100 * topData.orderTime / diffTime
					percentage_scaled = percentage * 10 / 100 
					tmp['LOAD'] = '%d' % int(percentage_scaled) 

				tmp['READ'] = topData.readDiffTime
				if (topData.readDiffTime == 0):
					tmp['READSPEED'] = 0
				else:					
					tmp['READSPEED'] = 1000000 * topData.readDiffCountL1 / topData.readDiffTime
				
				tmp['WRITE'] = topData.writeDiffTime
				if (topData.writeDiffTime == 0):
					tmp['WRITESPEED'] = 0
				else:
					tmp['WRITESPEED'] = 1000000 * topData.writeDiffCountL1 / topData.writeDiffTime
 				rows.append( tmp)
			data = { "data":rows }

	 		self.handleMessage("top", json.dumps(data));

	 		if (self.started):
				threading.Timer(5, self.orion_top).start()
		except Exception as n:
			print n

	def handleMessage(self, messagetype, data):
		if data is None:
			data = ''

		try:
			self.sendMessage('{ msgtype:"'+messagetype+'", params:'+str(data) + '}')
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
#ServerClass  = BaseHTTPServer.HTTPServer
ServerClass = ThreadedHTTPServer
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