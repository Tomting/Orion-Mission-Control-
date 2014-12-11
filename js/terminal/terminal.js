webix.protoUI({
	name:"terminal",
	term:null,
	parser:null,
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
	    "This is the monstrous help page for my groovy terminal.",
	    "Commands available:",
	    "   help ... print this monstrous help page",
	    "   exit ... leave this groovy terminal",
	    " ",
	    "Have fun!"
	  ];

		this.term = new Terminal({
			x:0,
			y:0,
			id: this.uid,
            termDiv: "terminal-"+this.uid,
            ps: "terminal-"+this.uid+'>',
            keylock:false,
            crsrBlinkMode:false,
            handler:function() { 
			    var line = this.lineBuffer;
			    this.newLine();
			    if (line == "help") {
			      this.write(helpPage)
			    }
			    else if (line == "clear") {
			    	this.clear();
			    }
			    else if (line != "") {
			      this.write("Type %c(blue)HELP%c(default) or %c(blue)HELP <command>%c(default) for a list of commands.");
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
			this.term.resizeTo(134,38);
			this.term.write(this.greetings);
			this.term.prompt();
			TermGlobals.keylock = true;
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
