webix.protoUI({
	name:"jsplumb",
	nodes_count:0,
	instance:null,
	connections:[],
	defaults:{
	},
	$init:function(config){
		//this.$view.innerHTML = "<div id='jsplumb-container' style='width:100%;height:100%;position:relative;overflow:auto;'></div>";
		this.$view.innerHTML = "<div id='jsplumb-container' style='width:100%;height:100%;overflow:auto;position:relative;'></div>";
		this.$ready.push(this._render_jsplumb);
	},
	_render_jsplumb:function(){
		webix.require("jsplumb/css/jsplumb.css");
		webix.require([
			"jsplumb/dom.jsPlumb-1.6.4.js",
		], this._render_when_ready, this);
	},
	_render_when_ready:function(){
		var obj = this;
		jsPlumb.bind("ready", function() {
			obj.instance = jsPlumb.getInstance({
				DragOptions : { cursor: 'pointer', zIndex:2000 },
				PaintStyle : { strokeStyle:'#666' },
				EndpointStyle : { width:20, height:16, strokeStyle:'#666' },
				Endpoint : "Rectangle",
				Anchors : ["TopCenter", "TopCenter"],
			});
		});
	},
	_set_inner_size:function(){
		this.instance.recalculateOffsets(this.$view);
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
	_updateConnections:function(conn, remove) {
			if (!remove) self.connections.push(conn);
			else {
				var idx = -1;
				for (var i = 0; i < self.connections.length; i++) {
					if (self.connections[i] == conn) {
						idx = i; break;
					}
				}
				if (idx != -1) self.connections.splice(idx, 1);
			}
		},
	addNode:function(){
		//this.instance.recalculateOffsets(this.$view);
		//this.instance.setContainer(this.$view);
		var nodeId = "node_"+webix.uid();
		this.$view.childNodes[0].innerHTML += '<div id="'+nodeId+'" class="window">Node ' + this.nodes_count +'</div>';
		this.nodes_count++;

		//alert(this.$view.childNodes[0].id);
		//this.instance.setContainer(this.$view.childNodes[0].id);

		var exampleColor = "#00f";
		var exampleEndpoint = {
			endpoint:"Rectangle",
			anchor:"BottomLeft",
			paintStyle:{ width:25, height:21, fillStyle:exampleColor },
			isSource:true,
			reattach:true,
			maxConnections:3,
			scope:"blue",
			connectorStyle : {
				gradient:{stops:[[0, exampleColor], [0.5, "#09098e"], [1, exampleColor]]},
				lineWidth:5,
				strokeStyle:exampleColor,
				dashstyle:"2 2"
			},
			isTarget:true,
			beforeDrop:function(params) { 
				//return confirm("Connect " + params.sourceId + " to " + params.targetId + "?"); 
				return true;
			},				
			dropOptions : {
				tolerance:"touch",
				hoverClass:"dropHover",
				activeClass:"dragActive"
			}
		};
		var e1 = this.instance.addEndpoint(nodeId, { anchor:[0, .5, 0, 1], uuid:"e1_"+nodeId }, exampleEndpoint);
		var e2 = this.instance.addEndpoint(nodeId, { anchor:[1, .5, 0, 0], uuid:"e2_"+nodeId }, exampleEndpoint);

		//this.instance.connect({ source: e0, target: e1 });
		this.instance.draggable(jsPlumb.getSelector(".window"));

	},
	/*
	setZoom:function(zoom, instance, transformOrigin, el) {
  transformOrigin = transformOrigin || [ 0.5, 0.5 ];
  instance = instance || jsPlumb;
  el = el || instance.getContainer();
  var p = [ "webkit", "moz", "ms", "o" ],
      s = "scale(" + zoom + ")",
      oString = (transformOrigin[0] * 100) + "% " + (transformOrigin[1] * 100) + "%";

  for (var i = 0; i < p.length; i++) {
    el.style[p[i] + "Transform"] = s;
    el.style[p[i] + "TransformOrigin"] = oString;
  }

  el.style["transform"] = s;
  el.style["transformOrigin"] = oString;

  instance.setZoom(zoom);    
};	
*/
	getValue:function(){
		//return this.editor?this.editor.getValue():this.config.value;
	},
}, webix.ui.view);

