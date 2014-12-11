var SANE = "\u001B[0m";
var BLACK = "\u001B[0;30m";
var RED = "\u001B[0;31m";
var GREEN = "\u001B[0;32m";
var YELLOW = "\u001B[0;33m";
var BLUE = "\u001B[0;34m";
var MAGENTA = "\u001B[0;35m";
var CYAN = "\u001B[0;36m";
var WHITE = "\u001B[0;37m";
var DARK_BLACK = "\u001B[1;30m";
var DARK_RED = "\u001B[1;31m";
var DARK_GREEN = "\u001B[1;32m";
var DARK_YELLOW = "\u001B[1;33m";
var DARK_BLUE = "\u001B[1;34m";
var DARK_MAGENTA = "\u001B[1;35m";
var DARK_CYAN = "\u001B[1;36m";
var DARK_WHITE = "\u001B[1;37m";
var BACKGROUND_BLACK = "\u001B[40m";
var BACKGROUND_RED = "\u001B[41m";
var BACKGROUND_GREEN = "\u001B[42m";
var BACKGROUND_YELLOW = "\u001B[43m";
var BACKGROUND_BLUE = "\u001B[44m";
var BACKGROUND_MAGENTA = "\u001B[45m";
var BACKGROUND_CYAN = "\u001B[46m";
var BACKGROUND_WHITE = "\u001B[47m";

function extend(subClass, baseClass) {
  function inheritance() { }
  inheritance.prototype          = baseClass.prototype;
  subClass.prototype             = new inheritance();
  subClass.prototype.constructor = subClass;
  subClass.prototype.superClass  = baseClass.prototype;
};

function Console(container) {
  this.superClass.constructor.call(this, container);
  this.gotoState(1 /* STATE_INIT */);
};
extend(Console, VT100);

Console.prototype.request = function(Url) {
  var obj = this; 
  webix.ajax(Url, function(text){
      obj.vt100(text);
      this.gotoState(2);
      //     this.vt100(WHITE+BACKGROUND_RED+e.toString()+SANE);
  });
}

Console.prototype.requestWithParams = function(Url, options) {
  var obj = this; 
  webix.ajax().post(Url, options, function(text, xml, xhr) {
    if (text == "") {
      obj.vt100("ERROR\r\n");
      obj.gotoState(2);
      return;
    }
    obj.vt100(text);
    obj.vt100("\r\n");
    obj.gotoState(2);
  });  
}

Console.prototype.keysPressed = function(ch) {
  // check UP key
  if (ch.length == 3) {
    if (ch.charCodeAt(0) == 27 && ch.charCodeAt(1) == 91 && ch.charCodeAt(2) == 65) {
      if (this.buffer.length > 0) {
        var linelen = this.line.length + 10;
        this.vt100("\r");
        for (i=0; i<linelen; i++) this.vt100(' ');
        this.vt100((this.cursorX != 0 ? '\r' : '') + '> ');
        this.vt100(this.buffer[this.buffer_index]);
        this.line = this.buffer[this.buffer_index];
        this.buffer_index--; 
        if (this.buffer_index < 0) this.buffer_index = 0;
      }
    }
  }
  if (this.state == 5 /* STATE_EXEC */) {
    for (var i = 0; i < ch.length; i++) {
      var c  = ch.charAt(i);
      if (c == '\u0003') {
        this.keys = '';
        this.error('Interrupted');
        return;
      }
    }
  }
  this.keys += ch;
  this.gotoState(this.state);
};

Console.prototype.gotoState = function(state, tmo) {
  this.state       = state;
  if (!this.timer || tmo) {
    if (!tmo) {
      tmo          = 1;
    }
    this.nextTimer = setTimeout(function(Console) {
      return function() {
        Console.Console();
      };
    }(this), tmo);
  }
};

Console.prototype.Console = function() {
  var done                  = false;
  this.nextTimer            = undefined;
  while (!done) {
    var state               = this.state;
    this.state              = 2 /* STATE_PROMPT */;
    switch (state) {
      case 1 /* STATE_INIT */:
      done                  = this.doInit();
      break;
      case 2 /* STATE_PROMPT */:
      done                  = this.doPrompt();
      break;
      case 3 /* STATE_READLINE */:
      done                  = this.doReadLine();
      break;
      case 4 /* STATE_COMMAND */:
      done                  = this.doCommand();
      break;
      case 5 /* STATE_EXEC */:
      done                  = this.doExec();
      break;
      case 6 /* STATE_NEW_Y_N */:
      done                  = this.doNewYN();
      break;
      default:
      done                  = true;
      break;
    }
  }
  this.timer                = this.nextTimer;
  this.nextTimer            = undefined;
};

Console.prototype.ok = function() {
  this.vt100('OK\r\n');
  this.gotoState(2 /* STATE_PROMPT */);
};

Console.prototype.error = function(msg) {
  if (msg == undefined) {
    msg                 = 'Syntax Error';
  }
  this.printUnicode((this.cursorX != 0 ? '\r\n' : '') + '\u0007? ' + msg +
    (this.currentLineIndex >= 0 ? ' in line ' +
     this.program[this.evalLineIndex].lineNumber() :
     '') + '\r\n');
  this.gotoState(2 /* STATE_PROMPT */);
  this.currentLineIndex = -1;
  this.evalLineIndex    = -1;
  return undefined;
};

Console.prototype.doInit = function() {
  this.buffer       = new Array();
  this.buffer_index = 0;
  this.vars         = new Object();
  this.program      = new Array();
  this.printUnicode(
'        ___           ___                       ___           ___      \r\n'+
'       /\\  \\         /\\  \\          ___        /\\  \\         /\\__\\     \r\n'+
'      /::\\  \\       /::\\  \\        /\\  \\      /::\\  \\       /::|  |    \r\n'+
'     /:/\\:\\  \\     /:/\\:\\  \\       \\:\\  \\    /:/\\:\\  \\     /:|:|  |    \r\n'+
'    /:/  \\:\\  \\   /::\\~\\:\\  \\      /::\\__\\  /:/  \\:\\  \\   /:/|:|  |__  \r\n'+
'   /:/__/ \\:\\__\\ /:/\\:\\ \\:\\__\\  __/:/\\/__/ /:/__/ \\:\\__\\ /:/ |:| /\\__\\ \r\n'+
'   \\:\\  \\ /:/  / \\/_|::\\/:/  / /\\/:/  /    \\:\\  \\ /:/  / \\/__|:|/:/  / \r\n'+
'    \\:\\  /:/  /     |:|::/  /  \\::/__/      \\:\\  /:/  /      |:/:/  /  \r\n'+
'     \\:\\/:/  /      |:|\\/__/    \\:\\__\\       \\:\\/:/  /       |::/  /   \r\n'+
'      \\::/  /       |:|  |       \\/__/        \\::/  /        /:/  /    \r\n'+
'       \\/__/         \\|__|                     \\/__/         \\/__/    Mission Console\r\n'+
      '\r\n' +
    'Type HELP or HELP <command> for a list of commands.\r\n' +
' \r\n\r\n');
  this.gotoState(2 /* STATE_PROMPT */);
  return false;
};

Console.prototype.doPrompt = function() {
  this.keys             = '';
  this.line             = '';
  this.currentLineIndex = -1;
  this.evalLineIndex    = -1;
  this.vt100((this.cursorX != 0 ? '\r\n' : '') + '> ');
  this.gotoState(3 /* STATE_READLINE */);
  return false;
};

Console.prototype.printUnicode = function(s) {
  var out = '';
  for (var i = 0; i < s.length; i++) {
    var c = s.charAt(i);
    if (c < '\x0080') {
      out += c;
    } else {
      var c = s.charCodeAt(i);
      if (c < 0x800) {
        out += String.fromCharCode(0xC0 +  (c >>  6)        ) +
        String.fromCharCode(0x80 + ( c        & 0x3F));
      } else if (c < 0x10000) {
        out += String.fromCharCode(0xE0 +  (c >> 12)        ) +
        String.fromCharCode(0x80 + ((c >>  6) & 0x3F)) +
        String.fromCharCode(0x80 + ( c        & 0x3F));
      } else if (c < 0x110000) {
        out += String.fromCharCode(0xF0 +  (c >> 18)        ) +
        String.fromCharCode(0x80 + ((c >> 12) & 0x3F)) +
        String.fromCharCode(0x80 + ((c >>  6) & 0x3F)) +
        String.fromCharCode(0x80 + ( c        & 0x3F));
      }
    }
  }
  this.vt100(out);
};

Console.prototype.doReadLine = function() {
  this.gotoState(3 /* STATE_READLINE */);
  var keys  = this.keys;
  this.keys = '';
  for (var i = 0; i < keys.length; i++) {
    var ch  = keys.charAt(i);
    if (ch == '\u0008' || ch == '\u007F') {
      if (this.line.length > 0) {
        this.line = this.line.substr(0, this.line.length - 1);
        if (this.cursorX == 0) {
          var x = this.terminalWidth - 1;
          var y = this.cursorY - 1;
          this.gotoXY(x, y);
          this.vt100(' ');
          this.gotoXY(x, y);
        } else {
          this.vt100('\u0008 \u0008');
        }
      } else {
        this.vt100('\u0007');
      }
    } else if (ch >= ' ') {
      this.line += ch;
      this.printUnicode(ch);
    } else if (ch == '\r' || ch == '\n') {
      this.vt100('\r\n');
      this.gotoState(4 /* STATE_COMMAND */);
      return false;
    } else if (ch == '\u001B') {
      // This was probably a function key. Just eat all of the following keys.
      break;
    }
  }
  return true;
};

Console.prototype.doCommand = function() {
  if (this.line == "") {
    // do nothing
  } else {
    this.buffer.push(this.line);
    this.buffer_index = this.buffer.length - 1;
  }
  this.gotoState(2 /* STATE_PROMPT */);
  var tokens              = new this.Tokens(this.line);
  this.line               = '';
  var cmd                 = tokens.nextToken();
  if (cmd) {
    cmd                   = cmd;
    if (cmd.match(/^[0-9]+$/)) {
      tokens.removeLineNumber();
      var lineNumber        = parseInt(cmd);
      var index             = this.findLine(lineNumber);
      if (tokens.nextToken() == null) {
        if (index > 0) {
          // Delete line from program
          this.program.splice(index, 1);
        }
      } else {
        tokens.reset();
        if (index >= 0) {
          // Replace line in program
          this.program[index].setTokens(tokens);
        } else {
          // Add new line to program
          this.program.splice(-index - 1, 0,
            new this.Line(lineNumber, tokens));
        }
      }
    } else {
      this.currentLineIndex = -1;
      this.evalLineIndex    = -1;
      tokens.reset();
      this.tokens           = tokens;
      return this.doEval();
    }
  }
  return false;
};

Console.prototype.generateSubcommandError = function(command_name) {
  this.error("please specify a subcommand or type HELP "+command_name+" for more information");
};

Console.prototype.doEval = function() {
  var token = this.tokens.peekToken();
  if (token == "CLEAR") {
    this.reset(); 
    this.vt100("\r\n");
  } else if (token == "SELECT" ) {
    this.tokens.consume();
    token = this.tokens.nextToken();
    if (token == undefined) {
      this.generateSubcommandError("SELECT");
    } else {
      this.requestWithParams("/execute_query/", { query:this.tokens.line, format:'text' } );
    }
  } else if (token == "INSERT" ) {
    this.tokens.consume();
    token = this.tokens.nextToken();
    if (token == undefined) {
      this.generateSubcommandError("INSERT");
    } else {
      this.requestWithParams("/execute_query/", { query:this.tokens.line, format:'text' } );
    }
  } else if (token == "UPDATE" ) {
    this.tokens.consume();
    token = this.tokens.nextToken();
    if (token == undefined) {
      this.generateSubcommandError("UPDATE");
    } else {
      this.requestWithParams("/execute_query/", { query:this.tokens.line, format:'text' } );
    }    
  } else if (token == "NETWORK") {
    this.tokens.consume();
    token = this.tokens.nextToken();
    if (token == undefined) {
      this.generateSubcommandError("NETWORK");
    } else {
      if (token == "ADD") {
        this.tokens.consume();
        var host = this.tokens.nextToken();
        if (host == undefined) {
          this.generateSubcommandError("NETWORK");
          return;
        } 
        this.tokens.consume();
        var port = this.tokens.nextToken();
        if (port == undefined) {
          this.generateSubcommandError("NETWORK");
          return;
        }
        this.tokens.consume();
        this.vt100("adding node "+host+":"+port+"...");
        this.requestWithParams("/network_add/", { host:host, port:port, format:'text' } );
      } else if (token == "ADDFAST") {
        this.tokens.consume();
        var host = this.tokens.nextToken();
        if (host == undefined) {
          this.generateSubcommandError("NETWORK");
          return;
        } 
        this.tokens.consume();
        var port = this.tokens.nextToken();
        if (port == undefined) {
          this.generateSubcommandError("NETWORK");
          return;
        }
        this.tokens.consume();
        this.vt100("adding node "+host+":"+port+"...");
        this.requestWithParams("/network_addfast/", { host:host, port:port, format:'text' } );
      } else if (token == "REMOVE") {
        this.tokens.consume();
        var host = this.tokens.nextToken();
        if (host == undefined) {
          this.generateSubcommandError("NETWORK");
          return;
        } 
        this.tokens.consume();
        var port = this.tokens.nextToken();
        if (port == undefined) {
          this.generateSubcommandError("NETWORK");
          return;
        }
        this.tokens.consume();
        this.vt100("removing node "+host+":"+port+"...");
        this.requestWithParams("/network_remove/", { host:host, port:port, format:'text' } );
      } else if (token == "JOIN") {
        this.tokens.consume();
        var host = this.tokens.nextToken();
        this.tokens.consume();
        var port = this.tokens.nextToken();
        this.tokens.consume();
        this.vt100("joining node "+host+":"+port+"...");
        this.requestWithParams("/network_join/", { host:host, port:port, format:'text' } );
      } else if (token == "LEAVE") {
        this.tokens.consume();
        this.vt100("leaving network...");
        this.requestWithParams("/network_leave/", { format:'text' } );
      } else if (token == "DISCONNECT") {
        this.tokens.consume();
        this.vt100("disconnecting from network...");
        this.requestWithParams("/network_disconnect/", { format:'text' } );
      } else {
        this.generateSubcommandError("NETWORK");
      }
    }
  } else if (token == "GOSSIPER") {
    this.tokens.consume();
    this.requestWithParams("/gossiper/", { format:'text' } );
  } else if (token == "TABLE") {
    this.tokens.consume();
    token = this.tokens.nextToken();
    if (token == undefined) {
      this.generateSubcommandError("TABLE");
    } else {
      if (token == "TOUCH") {
        this.tokens.consume();
        var name = this.tokens.nextToken();
        if (name == undefined) {
          this.generateSubcommandError("TABLE");
          return;
        } 
        this.tokens.consume();
        this.requestWithParams("/table_touch/", { table:name, format:'text' } );
      } else if (token == "CLEAN") {
        this.tokens.consume();
        var name = this.tokens.nextToken();
        if (name == undefined) {
          this.generateSubcommandError("TABLE");
          return;
        } 
        this.tokens.consume();
        this.requestWithParams("/table_clean/", { table:name, format:'text' } );
      } else if (token == "PURGE") {
        this.tokens.consume();
        var name = this.tokens.nextToken();
        if (name == undefined) {
          this.generateSubcommandError("TABLE");
          return;
        } 
        this.tokens.consume();
        this.requestWithParams("/table_purge/", { table:name, format:'text' } );
      } else if (token == "SHRINK") {
        this.tokens.consume();
        var name = this.tokens.nextToken();
        if (name == undefined) {
          this.generateSubcommandError("TABLE");
          return;
        } 
        this.tokens.consume();
        this.requestWithParams("/table_shrink/", { table:name, format:'text' } );
      } else if (token == "REBUILD") {
        this.tokens.consume();
        var name = this.tokens.nextToken();
        if (name == undefined) {
          this.generateSubcommandError("TABLE");
          return;
        } 
        this.tokens.consume();
        this.requestWithParams("/table_rebuild/", { table:name, format:'text' } );
      } else if (token == "COMPACTION") {
        this.tokens.consume();
        var name = this.tokens.nextToken();
        if (name == undefined) {
          this.generateSubcommandError("TABLE");
          return;
        } 
        this.tokens.consume();
        this.requestWithParams("/table_compaction/", { table:name, format:'text' } );
      } else if (token == "SPLIT") {
        this.tokens.consume();
        var name = this.tokens.nextToken();
        if (name == undefined) {
          this.generateSubcommandError("TABLE");
          return;
        } 
        this.tokens.consume();
        this.requestWithParams("/table_split/", { table:name, format:'text' } );
      } else if (token == "STORE") {
        this.tokens.consume();
        var name = this.tokens.nextToken();
        if (name == undefined) {
          this.generateSubcommandError("TABLE");
          return;
        } 
        this.tokens.consume();
        this.requestWithParams("/table_store/", { table:name, format:'text' } );
      } else if (token == "FORGET") {
        this.tokens.consume();
        var name = this.tokens.nextToken();
        if (name == undefined) {
          this.generateSubcommandError("TABLE");
          return;
        } 
        this.tokens.consume();
        this.requestWithParams("/table_forget/", { table:name, format:'text' } );
      } else if (token == "LOAD") {
        this.tokens.consume();
        var name = this.tokens.nextToken();
        if (name == undefined) {
          this.generateSubcommandError("TABLE");
          return;
        } 
        this.tokens.consume();
        this.requestWithParams("/table_load/", { table:name, format:'text' } );
      } else if (token == "RELOAD") {
        this.tokens.consume();
        var name = this.tokens.nextToken();
        if (name == undefined) {
          this.generateSubcommandError("TABLE");
          return;
        } 
        this.tokens.consume();
        this.requestWithParams("/table_reload/", { table:name, format:'text' } );
      } else if (token == "INFO") {
        this.tokens.consume();
        var name = this.tokens.nextToken();
        if (name == undefined) {
          this.generateSubcommandError("TABLE");
          return;
        } 
        this.tokens.consume();
        this.requestWithParams("/table_info/", { table:name, format:'text' } );
      } else {
        this.generateSubcommandError("TABLE");
      }    
    }
  } else if (token == "CONNECT") {
      this.tokens.consume();
      var host = this.tokens.nextToken();
      if (host == undefined) {
        this.generateSubcommandError("CONNECT");
        return;
      } 
      this.tokens.consume();
      var port = this.tokens.nextToken();
      if (port == undefined) {
        this.generateSubcommandError("CONNECT");
        return;
      }
      this.tokens.consume();
      this.vt100("connecting to node "+host+":"+port+"...");
      this.requestWithParams("/connect/", { host:host, port:port, format:'text' } );
  } else if (token == "HELP") {
    this.tokens.consume();
    var command = this.tokens.nextToken();
    if (command != undefined) {
        if (command == "NETWORK") {
          this.printUnicode("\r\n\tUSAGE:"+DARK_BLACK+" NETWORK"+SANE+BLUE+" <command>\r\n\r\n");
          this.printUnicode("\t"+DARK_BLACK+"ADD"+SANE+BLUE+" <host> <port>"+SANE+"\t\tAdd a node to network\r\n");
          this.printUnicode("\t"+DARK_BLACK+"REMOVE"+SANE+BLUE+" <host> <port>"+SANE+"\t\tRemove a node from network\r\n");
          this.printUnicode("\t"+DARK_BLACK+"JOIN"+SANE+BLUE+" <host> <port>"+SANE+"\t\tJoin a node on network\r\n");
          this.printUnicode("\t"+DARK_BLACK+"LEAVE"+SANE+"\r\n");
        } else if (command == "TABLE") {
          this.printUnicode("\r\n\tUSAGE:"+DARK_BLACK+" TABLE"+SANE+BLUE+" <command>\r\n\r\n");
          this.printUnicode("\t"+DARK_BLACK+"TOUCH"+SANE+BLUE+" <table>"+SANE+"\t\t....\r\n");
          this.printUnicode("\t"+DARK_BLACK+"CLEAN"+SANE+BLUE+" <table>"+SANE+"\t\t....\r\n");
          this.printUnicode("\t"+DARK_BLACK+"PURGE"+SANE+BLUE+" <table>"+SANE+"\t\t....\r\n");
          this.printUnicode("\t"+DARK_BLACK+"SHRINK"+SANE+BLUE+" <table>"+SANE+"\t\t....\r\n");
          this.printUnicode("\t"+DARK_BLACK+"REBUILD"+SANE+BLUE+" <table>"+SANE+"\t\t....\r\n");
          this.printUnicode("\t"+DARK_BLACK+"COMPACTION"+SANE+BLUE+" <table>"+SANE+"\t\t....\r\n");
          this.printUnicode("\t"+DARK_BLACK+"SPLIT"+SANE+BLUE+" <table>"+SANE+"\t\t....\r\n");
          this.printUnicode("\t"+DARK_BLACK+"STORE"+SANE+BLUE+" <table>"+SANE+"\t\t....\r\n");
          this.printUnicode("\t"+DARK_BLACK+"FORGET"+SANE+BLUE+" <table>"+SANE+"\t\t....\r\n");
          this.printUnicode("\t"+DARK_BLACK+"LOAD"+SANE+BLUE+" <table>"+SANE+"\t\t....\r\n");
          this.printUnicode("\t"+DARK_BLACK+"RELOAD"+SANE+BLUE+" <table>"+SANE+"\t\t....\r\n");
          this.printUnicode("\t"+DARK_BLACK+"INFO"+SANE+BLUE+" <table>"+SANE+"\t\t....\r\n");
        } else if (command == "CONNECT") {
          this.printUnicode("\r\n\tUSAGE:"+DARK_BLACK+" CONNECT"+SANE+BLUE+" <host> <port>\r\n\r\n");
        } else if (command == "NAMESPACE") {
          this.printUnicode("\r\n\tUSAGE:"+DARK_BLACK+" NAMESPACE"+SANE+BLUE+" <namespace>\r\n\r\n");
        } else if (command == "CONFIG") {
          this.printUnicode("\r\n\tShow the current configuration used by Orion Mission Control.\r\n\r\n");
        } else if (command == "GOSSIPER") {
          this.printUnicode("\r\n\tShow the network nodes.\r\n\r\n");
        }
        this.printUnicode(SANE)
    } else {
      this.vt100('Supported commands:\r\n' +
       'CLEAR CONNECT SELECT INSERT UPDATE NETWORK TABLE GOSSIPER CONFIG TOPSPEED\r\n'+
       '\r\n');
    }
  } else if (token == "CONFIG") {
    this.tokens.consume();
    this.requestWithParams("/config/", { format:'text' } );
  } else if ((token == "NAMESPACE")||(token == "NS")) {
    this.tokens.consume();
    var token = this.tokens.nextToken()
    if (token == undefined) {
        this.generateSubcommandError("NAMESPACE");
        return;      
    }
    this.requestWithParams("/change_namespace/", { namespace:token, format:'text' } );
  } else if (token == "TOPSPEED") {
    this.tokens.consume();
    this.requestWithParams("/topspeed/", { format:'text' } );
  } else if (token == "PRINT" || token == "?") {
    this.tokens.consume();
    this.doPrint();
  } else if (token == "RUN") {
    this.tokens.consume();
    if (this.tokens.nextToken() != null) {
      this.error('RUN does not take any parameters');
    } else if (this.program.length > 0) {
      this.currentLineIndex = 0;
      this.vars = new Object();
      this.gotoState(5 /* STATE_EXEC */);
    } else {
      this.ok();
    }
  } else {
    this.doAssignment();
  }
  return false;
};

Console.prototype.arrayIndex = function() {
  var token   = this.tokens.peekToken();
  var arr     = '';
  if (token == '(') {
    this.tokens.consume();
    do {
      var idx = this.expr();
      if (idx == undefined) {
        return idx;
      } else if (idx.type() != 1 /* TYPE_NUMBER */) {
        return this.error('Numeric value expected');
      }
      idx     = Math.floor(idx.val());
      if (idx < 0) {
        return this.error('Indices have to be positive');
      }
      arr    += ',' + idx;
      token   = this.tokens.nextToken();
    } while (token == ',');
    if (token != ')') {
      return this.error('")" expected');
    }
  }
  return arr;
};

Console.prototype.toInt = function(v) {
  if (v < 0) {
    return -Math.floor(-v);
  } else {
    return  Math.floor( v);
  }
};

Console.prototype.doAssignment = function() {
  var id       = this.tokens.nextToken();
  if (!id || !id.match(/^[A-Za-z][A-Za-z0-9_]*$/)) {
    return this.error('Identifier expected');
  }
  var token = this.tokens.peekToken();
  var isString = false;
  var isInt    = false;
  if (token == '$') {
    isString   = true;
    this.tokens.consume();
  } else if (token == '%') {
    isInt      = true;
    this.tokens.consume();
  }
  var arr      = this.arrayIndex();
  if (arr == undefined) {
    return arr;
  }
  token        = this.tokens.nextToken();
  if (token != '=') {
    return this.error('"=" expected');
  }
  var value    = this.expr();
  if (value == undefined) {
    return value;
  }
  if (isString) {
    if (value.type() != 0 /* TYPE_STRING */) {
      return this.error('String expected');
    }
    this.vars['str_' + id + arr] = value;
  } else {
    if (value.type() != 1 /* TYPE_NUMBER */) {
      return this.error('Numeric value expected');
    }
    if (isInt) {
      value    = this.toInt(value.val());
      value    = new this.Value(1 /* TYPE_NUMBER */, '' + value, value);
      this.vars['int_' + id + arr] = value;
    } else {
      this.vars['var_' + id + arr] = value;
    }
  }
};

Console.prototype.doExec = function() {
  this.evalLineIndex = this.currentLineIndex++;
  this.tokens        = this.program[this.evalLineIndex].tokens();
  this.tokens.reset();
  this.doEval();
  if (this.currentLineIndex < 0) {
    return false;
  } else if (this.currentLineIndex >= this.program.length) {
    this.currentLineIndex = -1;
    this.ok();
    return false;
  } else {
    this.gotoState(5 /* STATE_EXEC */, 20);
    return true;
  }
};

Console.prototype.doNewYN = function() {
  for (var i = 0; i < this.keys.length; ) {
    var ch = this.keys.charAt(i++);
    if (ch == 'n' || ch == 'N' || ch == '\r' || ch == '\n') {
      this.vt100('N\r\n');
      this.keys = this.keys.substr(i);
      this.error('Aborted');
      return false;
    } else if (ch == 'y' || ch == 'Y') {
      this.vt100('Y\r\n');
      this.vars = new Object();
      this.program.splice(0, this.program.length);
      this.keys = this.keys.substr(i);
      this.ok();
      return false;
    } else {
      this.vt100('\u0007');
    }
  }
  this.gotoState(6 /* STATE_NEW_Y_N */);
  return true;
};

Console.prototype.findLine = function(lineNumber) {
  var l   = 0;
  var h   = this.program.length;
  while (h > l) {
    var m = Math.floor((l + h) / 2);
    var n = this.program[m].lineNumber();
    if (n == lineNumber) {
      return m;
    } else if (n > lineNumber) {
      h   = m;
    } else {
      l   = m + 1;
    }
  }
  return -l - 1;
};

Console.prototype.expr = function() {
  var value   = this.term();
  while (value) {
    var token = this.tokens.peekToken();
    if (token != '+' && token != '-') {
      break;
    }
    this.tokens.consume();
    var v     = this.term();
    if (!v) {
      return v;
    }
    if (value.type() != v.type()) {
      if (value.type() != 0 /* TYPE_STRING */) {
        value = new this.Value(0 /* TYPE_STRING */, ''+value.val(), ''+value.val());
      }
      if (v.type() != 0 /* TYPE_STRING */) {
        v     = new this.Value(0 /* TYPE_STRING */, ''+v.val(), ''+v.val());
      }
    }
    if (token == '-') {
      if (value.type() == 0 /* TYPE_STRING */) {
        return this.error('Cannot subtract strings');
      }
      v       = value.val() - v.val();
    } else {
      v       = value.val() + v.val();
    }
    if (v == NaN) {
      return this.error('Numeric range error');
    }
    value     = new this.Value(value.type(), ''+v, v);
  }
  return value;
};

Console.prototype.term = function() {
  var value   = this.expn();
  while (value) {
    var token = this.tokens.peekToken();
    if (token != '*' && token != '/' && token != '\\') {
      break;
    }
    this.tokens.consume();
    var v     = this.expn();
    if (!v) {
      return v;
    }
    if (value.type() != 1 /* TYPE_NUMBER */ || v.type() != 1 /* TYPE_NUMBER */) {
      return this.error('Cannot multiply or divide strings');
    }
    if (token == '*') {
      v       = value.val() * v.val();
    } else {
      v       = value.val() / v.val();
      if (token == '\\') {
        v     = this.toInt(v);
      }
    }
    if (v == NaN) {
      return this.error('Numeric range error');
    }
    value     = new this.Value(1 /* TYPE_NUMBER */, ''+v, v);
  }
  return value;
};

Console.prototype.expn = function() {
  var value = this.intrinsic();
  var token = this.tokens.peekToken();
  if (token == '^') {
    this.tokens.consume();
    var exp = this.intrinsic();
    if (exp == undefined || exp.val() == NaN) {
      return exp;
    }
    if (value.type() != 1 /* TYPE_NUMBER */ || exp.type() != 1 /* TYPE_NUMBER */) {
      return this.error("Numeric value expected");
    }
    var v   = Math.pow(value.val(), exp.val());
    value   = new this.Value(1 /* TYPE_NUMBER */, '' + v, v);
  }
  return value;
};

Console.prototype.intrinsic = function() {
  var token         = this.tokens.peekToken();
  var args          = undefined;
  var value, v, fnc, arg1, arg2, arg3;
  if (!token) {
    return this.error('Unexpected end of input');
  } else if (token.match(/^(?:ABS|ASC|ATN|CHR\$|COS|EXP|INT|LEN|LOG|POS|RND|SGN|SIN|SPC|SQR|STR\$|TAB|TAN|VAL)$/)) {
    fnc             = token;
    args            = 1;
  } else if (token.match(/^(?:LEFT\$|RIGHT\$)$/)) {
    fnc             = token;
    args            = 2;
  } else if (token == 'MID$') {
    fnc             = token;
    args            = 3;
  } else if (token == 'TI') {
    this.tokens.consume();
    v               = (new Date()).getTime() / 1000.0;
    return new this.Value(1 /* TYPE_NUMBER */, '' + v, v);
  } else {
    return this.factor();
  }
  this.tokens.consume();
  token             = this.tokens.nextToken();
  if (token != '(') {
    return this.error('"(" expected');
  }
  arg1              = this.expr();
  if (!arg1) {
    return arg1;
  }
  token             = this.tokens.nextToken();
  if (--args) {
    if (token != ',') {
      return this.error('"," expected');
    }
    arg2            = this.expr();
    if (!arg2) {
      return arg2;
    }
    token = this.tokens.nextToken();
    if (--args) {
      if (token != ',') {
        return this.error('"," expected');
      }
      arg3          = this.expr();
      if (!arg3) {
        return arg3;
      }
      token         = this.tokens.nextToken();
    }
  }
  if (token != ')') {
    return this.error('")" expected');
  }
  switch (fnc) {
    case 'ASC':
    if (arg1.type() != 0 /* TYPE_STRING */ || arg1.val().length < 1) {
      return this.error('Non-empty string expected');
    }
    v               = arg1.val().charCodeAt(0);
    value           = new this.Value(1 /* TYPE_NUMBER */, '' + v, v);
    break;
    case 'LEN':
    if (arg1.type() != 0 /* TYPE_STRING */) {
      return this.error('String expected');
    }
    v               = arg1.val().length;
    value           = new this.Value(1 /* TYPE_NUMBER */, '' + v, v);
    break;
    case 'LEFT$':
    if (arg1.type() != 0 /* TYPE_STRING */ || arg2.type() != 1 /* TYPE_NUMBER */ ||
      arg2.type() < 0) {
      return this.error('Invalid arguments');
  }
  v               = arg1.val().substr(0, Math.floor(arg2.val()));
  value           = new this.Value(0 /* TYPE_STRING */, v, v);
  break;
  case 'MID$':
  if (arg1.type() != 0 /* TYPE_STRING */ || arg2.type() != 1 /* TYPE_NUMBER */ ||
    arg3.type() != 1 /* TYPE_NUMBER */ || arg2.val() < 0 || arg3.val() < 0) {
    return this.error('Invalid arguments');
}
v               = arg1.val().substr(Math.floor(arg2.val()),
  Math.floor(arg3.val()));
value           = new this.Value(0 /* TYPE_STRING */, v, v);
break;
case 'RIGHT$':
if (arg1.type() != 0 /* TYPE_STRING */ || arg2.type() != 1 /* TYPE_NUMBER */ ||
  arg2.type() < 0) {
  return this.error('Invalid arguments');
}
v               = Math.floor(arg2.val());
if (v > arg1.val().length) {
  v             = arg1.val().length;
}
v               = arg1.val().substr(arg1.val().length - v);
value           = new this.Value(0 /* TYPE_STRING */, v, v);
break;   
case 'STR$':
value           = new this.Value(0 /* TYPE_STRING */, arg1.toString(),
 arg1.toString());
break;
case 'VAL':
if (arg1.type() == 1 /* TYPE_NUMBER */) {
  value         = arg1;
} else {
  if (arg1.val().match(/^[0-9]+$/)) {
    v           = parseInt(arg1.val());
  } else {
    v           = parseFloat(arg1.val());
  }
  value         = new this.Value(1 /* TYPE_NUMBER */, '' + v, v);
}
break;
default:
if (arg1.type() != 1 /* TYPE_NUMBER */) {
  return this.error('Numeric value expected');
}
switch (fnc) {
  case 'CHR$':
  if (arg1.val() < 0 || arg1.val() > 65535) {
    return this.error('Invalid Unicode range');
  }
  v             = String.fromCharCode(arg1.val());
  value         = new this.Value(0 /* TYPE_STRING */, v, v);
  break;
  case 'SPC': 
  if (arg1.val() < 0) {
    return this.error('Range error');
  }
  v             = arg1.val() >= 1 ?
  '\u001B[' + Math.floor(arg1.val()) + 'C' : '';
  value         = new this.Value(0 /* TYPE_STRING */, v, v);
  break;
  case 'TAB':
  if (arg1.val() < 0) {
    return this.error('Range error');
  }
  v             = '\r' + (arg1.val() >= 1 ?
    '\u001B[' + (Math.floor(arg1.val())*8) + 'C' : '');
  value         = new this.Value(0 /* TYPE_STRING */, v, v);
  break;
  default:
  switch (fnc) {
    case 'ABS': v = Math.abs(arg1.val());                     break;
    case 'ATN': v = Math.atan(arg1.val());                    break;
    case 'COS': v = Math.cos(arg1.val());                     break;
    case 'EXP': v = Math.exp(arg1.val());                     break;
    case 'INT': v = Math.floor(arg1.val());                   break;
    case 'LOG': v = Math.log(arg1.val());                     break;
    case 'POS': v = this.cursorX;                             break;
    case 'SGN': v = arg1.val() < 0 ? -1 : arg1.val() ? 1 : 0; break;
    case 'SIN': v = Math.sin(arg1.val());                     break;
    case 'SQR': v = Math.sqrt(arg1.val());                    break;
    case 'TAN': v = Math.tan(arg1.val());                     break;
    case 'RND':
    if (this.prng == undefined) {
      this.prng = 1013904223;
    }
    if (arg1.type() == 1 /* TYPE_NUMBER */ && arg1.val() < 0) {
      this.prng = Math.floor(1664525*arg1.val()) & 0xFFFFFFFF;
    }
    if (arg1.type() != 1 /* TYPE_NUMBER */ || arg1.val() != 0) {
      this.prng = Math.floor(1664525*this.prng + 1013904223) &
      0xFFFFFFFF;
    }
    v           = ((this.prng & 0x7FFFFFFF) / 65536.0) / 32768;
    break;
  }
  value         = new this.Value(1 /* TYPE_NUMBER */, '' + v, v);
}
}
if (v == NaN) {
  return this.error('Numeric range error');
}
return value;
};

Console.prototype.factor = function() {
  var token    = this.tokens.nextToken();
  var value;
  if (token == '-') {
    value      = this.expr();
    if (!value) {
      return value;
    }
    if (value.type() != 1 /* TYPE_NUMBER */) {
      return this.error('Numeric value expected');
    }
    return new this.Value(1 /* TYPE_NUMBER */, '' + -value.val(), -value.val());
  }
  if (!token) {
    return this.error();
  }
  if (token == '(') {
    value      = this.expr();
    token      = this.tokens.nextToken();
    if (token != ')' && value != undefined) {
      return this.error('")" expected');
    }
  } else {
    var str;
    if ((str = token.match(/^"(.*)"/)) != null) {
      value    = new this.Value(0 /* TYPE_STRING */, str[1], str[1]);
    } else if (token.match(/^[0-9]/)) {
      var number;
      if (token.match(/^[0-9]*$/)) {
        number = parseInt(token);
      } else {
        number = parseFloat(token);
      }
      if (number == NaN) {
        return this.error('Numeric range error');
      }
      value    = new this.Value(1 /* TYPE_NUMBER */, token, number);
    } else if (token.match(/^[A-Za-z][A-Za-z0-9_]*$/)) {
      if (this.tokens.peekToken() == '$') {
        this.tokens.consume();
        var arr= this.arrayIndex();
        if (arr == undefined) {
          return arr;
        }
        value  = this.vars['str_' + token + arr];
        if (value == undefined) {
          value= new this.Value(0 /* TYPE_STRING */, '', '');
        }
      } else {
        var n  = 'var_';
        if (this.tokens.peekToken() == '%') {
          this.tokens.consume();
          n    = 'int_';
        }
        var arr= this.arrayIndex();
        if (arr == undefined) {
          return arr;
        }
        value  = this.vars[n + token + arr];
        if (value == undefined) {
          value= new this.Value(1 /* TYPE_NUMBER */, '0', 0);
        }
      }
    } else {
      return this.error();
    }
  }

  return value;
};

Console.prototype.Tokens = function(line) {
  this.line   = line;
  this.tokens = line;
  this.len    = undefined;
};

Console.prototype.Tokens.prototype.peekToken = function() {
  this.len      = undefined;
  this.tokens   = this.tokens.replace(/^[ \t]*/, '');
  var tokens    = this.tokens;
  if (!tokens.length) {
    return null;
  }
  var token     = tokens.charAt(0);
  switch (token) {
    case '<':
    if (tokens.length > 1) {
      if (tokens.charAt(1) == '>') {
        token   = '<>';
      } else if (tokens.charAt(1) == '=') {
        token   = '<=';
      }
    }
    break;
    case '>':
    if (tokens.charAt(1) == '=') {
      token     = '>=';
    }
    break;
    case '=':
    case '+':
    case '-':
    case '*':
    case '/':
    case '\\':
    case '^':
    case '(':
      case ')':
case '?':
case ',':
case ';':
case ':':
case '$':
case '%':
case '#':
break;
case '"':
    token       = tokens.match(/"((?:""|[^"])*)"/); // "
    if (!token) {
      token     = undefined;
    } else {
      this.len  = token[0].length;
      token     = '"' + token[1].replace(/""/g, '"') + '"';
    }
    break;
    default:
    if (token >= '0' && token <= '9' || token == '.') {
      token     = tokens.match(/^[0-9]*(?:[.][0-9]*)*(?:[eE][-+]?[0-9]+)?/);
      if (!token) {
        token   = undefined;
      } else {
        token   = token[0];
      }
    } else if (token >= 'A' && token <= 'Z' ||
     token >= 'a' && token <= 'z') {
      token     = tokens.match(/^(?:CHR\$|STR\$|LEFT\$|RIGHT\$|MID\$)/i);
      if (token) {
        token   = token[0].toUpperCase();
      } else {
        token   = tokens.match(/^[A-Za-z][A-Za-z0-9_]*/);
        if (!token) {
          token = undefined;
        } else {
          token = token[0].toUpperCase();
        }
      }
    } else {
      token     = '';
    }
  }

  if (this.len == undefined) {
    if (token) {
      this.len  = token.length;
    } else {
      this.len  = 1;
    }
  }

  return token;
};

Console.prototype.Tokens.prototype.consume = function() {
  if (this.len) {
    this.tokens = this.tokens.substr(this.len);
    this.len    = undefined;
  }
};

Console.prototype.Tokens.prototype.remainingTokens = function() {
  return this.tokens.replace(/^[ \t]*/, '');
};

Console.prototype.Tokens.prototype.nextToken = function() {
  var token = this.peekToken();
  this.consume();
  return token;
};

Console.prototype.Tokens.prototype.removeLineNumber = function() {
  this.line = this.line.replace(/^[0-9]*[ \t]*/, '');
};

Console.prototype.Tokens.prototype.reset = function() {
  this.tokens = this.line;
};

Console.prototype.Line = function(lineNumber, tokens) {
  this.lineNumber_ = lineNumber;
  this.tokens_     = tokens;
};

Console.prototype.Line.prototype.lineNumber = function() {
  return this.lineNumber_;
};

Console.prototype.Line.prototype.tokens = function() {
  return this.tokens_;
};

Console.prototype.Line.prototype.setTokens = function(tokens) {
  this.tokens_ = tokens;
};

Console.prototype.Line.prototype.sort = function(a, b) {
  return a.lineNumber_ - b.lineNumber_;
};

Console.prototype.Value = function(type, str, val) {
  this.t = type;
  this.s = str;
  this.v = val;
};

Console.prototype.Value.prototype.type = function() {
  return this.t;
};

Console.prototype.Value.prototype.val = function() {
  return this.v;
};

Console.prototype.Value.prototype.toString = function() {
  return this.s;
};

