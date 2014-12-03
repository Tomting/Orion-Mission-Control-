webix.protoUI({
    name:'justgage-chart',
    $init:function(config){
        this.$ready.push(this._render_after_load);
    },
    defaults:{
        minHeight:100,
        minWidth:200
    },
    _init_justgage_once:function(){
        this.$view.innerHTML= "<div id='"+this.config.id+"' style='width:100%; height:100%;'></div>";
        var gage_config = webix.extend({}, this.config);
        gage_config.id = this.$view.firstChild.id;
        gage_config.relativeGaugeSize = true;
        this.config.gage=new JustGage(gage_config);
    },
    _render_after_load:function(){
        webix.require([
            "justgage/raphael.js",
            "justgage/justgage.js?1"
        ],function(){
        },this);
    },
    $setSize:function(x,y){
        if (webix.ui.view.prototype.$setSize.call(this, x, y)){
            this._init_justgage_once();
        }
    },
    setValue:function(value){
        this.config.value=value;
        this.config.gage.refresh(value,100);
    },
    getValue:function(){
        return this.config.value;
    }
},webix.ui.view);
