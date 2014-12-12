webix.protoUI({
	name:"terminal",
	term:null,
	opened:false,
	greetings:"",
	uid:null,
	$init:function(config){
		this.uid = webix.uid();
		this.$view.innerHTML = "<div id='terminal-"+this.uid+"' style='width:100%;height:100%;position:relative;'></div>";
		this.$ready.push(this._render_terminal);
	},
	_render_terminal:function(){
		webix.require([
			"terminal/termlib.js",
			"terminal/termlib_parser.js",
		], this._render_when_ready, this);
	},
	_startTerminal:function(){
		this.greetings = 
'        ___           ___                       ___           ___      \n'+
'       /\\  \\         /\\  \\          ___        /\\  \\         /\\__\\     \n'+
'      /::\\  \\       /::\\  \\        /\\  \\      /::\\  \\       /::|  |    \n'+
'     /:/\\:\\  \\     /:/\\:\\  \\       \\:\\  \\    /:/\\:\\  \\     /:|:|  |    \n'+
'    /:/  \\:\\  \\   /::\\~\\:\\  \\      /::\\__\\  /:/  \\:\\  \\   /:/|:|  |__  \n'+
'   /:/__/ \\:\\__\\ /:/\\:\\ \\:\\__\\  __/:/\\/__/ /:/__/ \\:\\__\\ /:/ |:| /\\__\\ \n'+
'   \\:\\  \\ /:/  / \\/_|::\\/:/  / /\\/:/  /    \\:\\  \\ /:/  / \\/__|:|/:/  / \n'+
'    \\:\\  /:/  /     |:|::/  /  \\::/__/      \\:\\  /:/  /      |:/:/  /  \n'+
'     \\:\\/:/  /      |:|\\/__/    \\:\\__\\       \\:\\/:/  /       |::/  /   \n'+
'      \\::/  /       |:|  |       \\/__/        \\::/  /        /:/  /    \n'+
'       \\/__/         \\|__|                     \\/__/         \\/__/    Mission Console\n'+
      '\n' +
    'Type HELP or HELP <command> for a list of commands.\n' +
'\n\n';

		var helpPage = [
	    	"CLEAR CONNECT SELECT INSERT UPDATE NETWORK TABLE GOSSIPER CONFIG TOPSPEED",
	    ];
	  	var helpPageTable = [
	  		'USAGE: TABLE %c(blue)<command>%c(default) where command can be:',
	  		'',
	  		'TOUCH %c(blue)<table>%c(default)              ...',
	  		'CLEAN %c(blue)<table>%c(default)              ...',
	  		'PURGE %c(blue)<table>%c(default)              ...',
	  		'SHRINK %c(blue)<table>%c(default)             ...',
	  		'REBUILD %c(blue)<table>%c(default)            ...',
	  		'COMPACTION %c(blue)<table>%c(default)         ...',
	  		'SPLIT %c(blue)<table>%c(default)              ...',
	  		'STORE %c(blue)<table>%c(default)              ...',
	  		'FORGET %c(blue)<table>%c(default)             ...',
	  		'LOAD %c(blue)<table>%c(default)               ...',
	  		'RELOAD %c(blue)<table>%c(default)             ...',
	  		'INFO %c(blue)<table>%c(default)               ...',
	  	];
	  	var helpPageNetwork = [
	  		'USAGE: NETWORK %c(blue)<command>%c(default) where command can be:',
	  		'',
	  		'ADD %c(blue)<host> <port>%c(default)',
	  		'ADDFAST %c(blue)<host> <port>%c(default)',
	  		'JOIN %c(blue)<host> <port>%c(default)',
	  		'REMOVE %c(blue)<host> <port>%c(default)',
	  		'LEAVE',
	  	];
	  	var helpPageConnect = [
	  		'USAGE: CONNECT %c(blue)<host> <port> [namespace]%c(default)   connect to orion db',
	  	];
	  	var helpPageNamespace = [
	  		'USAGE: NAMESPACE %c(blue)<name>%c(default)   change the current working namespace',
	  	];
	  	var helpPageConfig = [
	  		'USAGE: CONFIG   show current configuration',
	  	];
	  	var helpPageGossiper = [
	  		'USAGE: GOSSIPER   show current network configuration',
	  	];

		this.term = new Terminal({
			x:0,
			y:0,
			id: this.uid,
            termDiv: "terminal-"+this.uid,
            ps: "terminal-"+this.uid+'>',
            keylock:false,
            crsrBlinkMode:false,
            frameColor:"#00000000",
            frameWidth:0,
            closeOnESC:false,
            handler:function() { 
            	function request(obj,url,data) {
			    	obj.send({
			    		url:      url,
			    		method:   "post",
			    		data:     data,
			    		callback: function(){
						    if (this.socket.success) {
						       this.write(this.socket.responseText);
						    }
						    else if (this.socket.errno) {
						       this.write("Connection error: " + this.socket.errstring);
						    }
						    else {
						       this.write("Server returned: " +
						                  this.socket.status + " " + this.socket.statusText);
						    }
						    this.prompt()
			    		}
			    	});
            	}

            	var errorParsing = "Type %c(blue)HELP%c(default) or %c(blue)HELP <command>%c(default) for a list of commands.";
			    var line = this.lineBuffer;
			    this.newLine();
			    var parser = new Parser();
			    parser.parseLine(this);
			    var command = this.argv[this.argc++];
			    if (command == "help") {
			    	var subcommand = this.argv[this.argc++];
			    	if (subcommand == undefined) { this.write(helpPage); this.prompt(); return; };
			    	if (subcommand == 'table') {
			    		this.write(helpPageTable);
			    	}
			    	else if (subcommand == 'network') {
			    		this.write(helpPageNetwork);
			    	}
			    	else if (subcommand == 'connect') {
			    		this.write(helpPageConnect);
			    	}
			    	else if (subcommand == 'namespace') {
			    		this.write(helpPageNamespace);
			    	}
			    	else if (subcommand == 'config') {
			    		this.write(helpPageConfig);
			    	}
			    	else if (subcommand == 'gossiper') {
			    		this.write(helpPageGossiper);
			    	}
			    	else {
			    		this.write(helpPage);
			    	}
			    }
			    else if (command == "clear") {
			    	this.clear();
			    } 
			    else if (command == "config") {
			    	request(this,"/config/",{ format:"text" });
			    }
			    else if ((command == "select")||(command == "insert")||(command == "update")) {
			    	request(this,"/execute_query/",{ query:line, format:'text' });
			    }
			    else if (command == "network") {
			    	var subcommand = this.argv[this.argc++];
			    	if (subcommand == "add") {
			    		host = this.argv[this.argc++];
			    		port = this.argv[this.argc++];
			    		if ((host == undefined) || (port == undefined)) { this.write(errorParsing); this.prompt(); return; };
						request(this,"/network_add/",{ host:host, port:port, format:"text" });
			    	} 
			    	else if (subcommand == "addfast") {
			    		host = this.argv[this.argc++];
			    		port = this.argv[this.argc++];
			    		if ((host == undefined) || (port == undefined)) { this.write(errorParsing); this.prompt(); return; };
						request(this,"/network_addfast/",{ host:host, port:port, format:"text" });
			    	}
			    	else if (subcommand == "join") {
			    		host = this.argv[this.argc++];
			    		port = this.argv[this.argc++];
			    		if ((host == undefined) || (port == undefined)) { this.write(errorParsing); this.prompt(); return; };
						request(this,"/network_join/",{ host:host, port:port, format:"text" });
			    	}
			    	else if (subcommand == "remove") {
			    		host = this.argv[this.argc++];
			    		port = this.argv[this.argc++];
			    		if ((host == undefined) || (port == undefined)) { this.write(errorParsing); this.prompt(); return; };
						request(this,"/network_remove/",{ host:host, port:port, format:"text" });
			    	}
			    	else if (subcommand == "leave") {
						request(this,"/network_leave/",{ format:"text" });
			    	}
			    	else {
						this.write(errorParsing);
			    	}
			    }
			    else if (command == "table") {
			    	var subcommand = this.argv[this.argc++];
			    	if (subcommand == "touch") {
			    		table = this.argv[this.argc++];
			    		if (table == undefined) { this.write(errorParsing); this.prompt(); return; };
						request(this,"/table_touch/", { table:table, format:'text' } );			    	
			    	}
			    	else if (subcommand == "clean") {
			    		table = this.argv[this.argc++];
			    		if (table == undefined) { this.write(errorParsing); this.prompt(); return; };
						request(this,"/table_clean/", { table:table, format:'text' } );			    	
			    	}
			    	else if (subcommand == "purge") {
			    		table = this.argv[this.argc++];
			    		if (table == undefined) { this.write(errorParsing); this.prompt(); return; };
						request(this,"/table_purge/", { table:table, format:'text' } );			    	
			    	}
			    	else if (subcommand == "shrink") {
			    		table = this.argv[this.argc++];
			    		if (table == undefined) { this.write(errorParsing); this.prompt(); return; };
						request(this,"/table_shrink/", { table:table, format:'text' } );			    	
			    	}
			    	else if (subcommand == "shrink") {
			    		table = this.argv[this.argc++];
			    		if (table == undefined) { this.write(errorParsing); this.prompt(); return; };
						request(this,"/table_shrink/", { table:table, format:'text' } );			    	
			    	}
			    	else if (subcommand == "rebuild") {
			    		table = this.argv[this.argc++];
			    		if (table == undefined) { this.write(errorParsing); this.prompt(); return; };
						request(this,"/table_rebuild/", { table:table, format:'text' } );			    	
			    	}
			    	else if (subcommand == "compaction") {
			    		table = this.argv[this.argc++];
			    		if (table == undefined) { this.write(errorParsing); this.prompt(); return; };
						request(this,"/table_compaction/", { table:table, format:'text' } );			    	
			    	}
			    	else if (subcommand == "split") {
			    		table = this.argv[this.argc++];
			    		if (table == undefined) { this.write(errorParsing); this.prompt(); return; };
						request(this,"/table_split/", { table:table, format:'text' } );			    	
			    	}
			    	else if (subcommand == "store") {
			    		table = this.argv[this.argc++];
			    		if (table == undefined) { this.write(errorParsing); this.prompt(); return; };
						request(this,"/table_store/", { table:table, format:'text' } );			    	
			    	}
			    	else if (subcommand == "forget") {
			    		table = this.argv[this.argc++];
			    		if (table == undefined) { this.write(errorParsing); this.prompt(); return; };
						request(this,"/table_forget/", { table:table, format:'text' } );			    	
			    	}
			    	else if (subcommand == "load") {
			    		table = this.argv[this.argc++];
			    		if (table == undefined) { this.write(errorParsing); this.prompt(); return; };
						request(this,"/table_load/", { table:table, format:'text' } );			    	
			    	}
			    	else if (subcommand == "reload") {
			    		table = this.argv[this.argc++];
			    		if (table == undefined) { this.write(errorParsing); this.prompt(); return; };
						request(this,"/table_reload/", { table:table, format:'text' } );			    	
			    	}
			    	else if (subcommand == "info") {
			    		table = this.argv[this.argc++];
			    		if (table == undefined) { this.write(errorParsing); this.prompt(); return; };
						request(this,"/table_info/", { table:table, format:'text' } );			    	
			    	}
			    	else {
						this.write(errorParsing);
			    	}
			    }
			    else if (command == "topspeed") {
			    	request(this,"/topspeed/",{ format:"text" });
			    }
			    else if (command == "gossiper") {
			    	request(this,"/gossiper/",{ format:"text" });
			    }
			    else if (command == "connect") {
					host = this.argv[this.argc++];
			    	port = this.argv[this.argc++];
			    	namespace = this.argv[this.argc++];
			    	if ((host == undefined) || (port == undefined)) { this.write(errorParsing); this.prompt(); return; };
			    	if (namespace == undefined) {
			    		request(this,"/connect/",{ host:host, port:port, format:"text" });
			    	} else {
			    		request(this,"/connect/",{ host:host, port:port, namespace:namespace, format:"text" });
			    	}
			    }
			    else if ((command == "namespace")||(command == "ns")) {
					namespace = this.argv[this.argc++];
			    	if (namespace == undefined) { this.write(errorParsing); this.prompt(); return; };
			    	request(this,"/change_namespace/",{ namespace:namespace, format:"text" });
			    }
			    else if (line != "") {
			      this.write(errorParsing);
			    }
			    this.prompt();
            },
        });
	},
	_render_when_ready:function(){
		setTimeout(this._startTerminal(), 100);
	},
	_set_inner_size:function(){
		if (!this.opened) {
			this.term.open();
			this.opened = true;
			// Try to estimate cols/rows based on width/height
			var c=document.createElement("canvas");
			if (c != undefined) {
				var ctx=c.getContext('2d');
				ctx.font = '14px courier,fixed,swiss,sans-serif';
				var length = ctx.measureText(" ").width;
				//c.parentElement.removeChild(c);
				//console.log(">>>>> "+length);
				var cols = Math.floor(this.$width / length) - 7;
				var rows = Math.floor(this.$height / this.term.conf.rowHeight) - 2;
				console.log(cols,rows);
				this.term.resizeTo(cols,rows);
			} else {
				this.term.resizeTo(80,25);
			}
			this.term.write(this.greetings);
			this.term.prompt();
			TermGlobals.keylock = true;
			/*
			var dim = this.$width + ":"+this.$height;
			console.log(dim)
			console.log(this.term.getDimensions().width);
			console.log(this.term.getDimensions().height);
			*/
		}
	},
	$setSize:function(x,y){
		if (webix.ui.view.prototype.$setSize.call(this, x, y)){
			this._set_inner_size();
		}
	},
	setValue:function(value){
		/*
		if(!value && value !== 0)
			value = "";

		this.config.value = value;
		if(this.editor){
			this.editor.setValue(value);
			//by default - clear editor's undo history when setting new value
			if(!this.config.preserveUndoHistory)
				this.editor.clearHistory();
			this._updateScrollSize();
		}
		*/
	},
	getValue:function(){
		//return this.editor?this.editor.getValue():this.config.value;
	},
	lockKeyboard:function(){
		TermGlobals.keylock = true;
	},
	unlockKeyboard:function(){
		TermGlobals.keylock = false;
	},
	setFocus:function(){
		if (this.term != undefined) {
			this.unlockKeyboard();
			this.term.focus();	
		}	
	}
}, webix.ui.view);
