webix.protoUI({
	name:"console",
	$init:function(config){
		this.$view.innerHTML = "<div id='console-container' style='background:rgb(255,0,0);width:100%;height:100%;'></div>";
		this.$ready.push(this._render_console);
	},
	_render_console:function(){
		webix.require([
			"console/vt100.js",
			"console/console.js",
		], this._render_when_ready, this);
	},
	_startConsole:function(){
		console.log(this);
		new Console(this._contentobj);
	},
	_render_when_ready:function(){
		setTimeout(this._startConsole(), 100);
	},
	_set_inner_size:function(){
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
}, webix.ui.view);
