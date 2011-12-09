// mquzz.js
// http://github.com/dafreakl/mquzz
$(function(){function g(){if(!Modernizr.input.placeholder){var k=$(".mq-input");if(k.val()!==k.attr("placeholder")){k.val(k.attr("placeholder"));k.focus(function(){if(k.val()===k.attr("placeholder")){k.val("")}});k.blur(function(){if(k.val()===""){k.val(k.attr("placeholder"))}})}}}var e=953;var j=function(k){var l=k.split("-");return l[2]+"."+l[1]+"."+l[0]};var i=Backbone.Model.extend({defaults:{selected:false,curl:"http://mquzz.de/"},initialize:function(){this.sound=null},url:function(){return"/api/quote/"+this.get("number")},isSelected:function(){return this.get("selected")},getSound:function(){return this.sound},evaluate:function(l,n){var k=this,m="/api/quote/"+this.get("number")+"/evaluate";$.ajax({type:"POST",url:m,dataType:"json",data:{psolution:l},success:function(p,q,o){n.evaluated(p)},error:function(o,q,p){alert("error in evaluation")}})}});var b=Backbone.Collection.extend({model:i,select:function(k){this.each(function(l){if(l.cid!==k.cid){l.set({selected:false},{silent:true})}});k.set({selected:true},{silent:true});this.trigger("selected")},getSelected:function(){return this.find(function(k){return k.isSelected()})}});var c=Backbone.View.extend({tagName:"div",className:"span-24",template:_.template($("#quote-detail-template").html()),resultTemplate:_.template($("#quote-result-template").html()),events:{"click .mq-play-btn":"play","click .mq-button":"evaluate"},evaluated:function(k){var l=k[0];this.model.set({commits:l.quote.commits,solutions:l.quote.solutions},{silent:true});$(this.el).empty();$(this.el).append(this.resultTemplate({quote:l.quote,posted:l.posted,correct:l.res,rate:l.quote.commits===0?0:(l.quote.solutions/l.quote.commits*100).toFixed(2)}));return this},evaluate:function(){var k=$(this.el).find(".mq-input").val();buzz.all().stop();this.model.evaluate(k,this)},setModel:function(k){this.model=k},play:function(l){var n="http://mquzz-audio.s3.amazonaws.com/"+this.model.get("audiourl"),k=$("#progress"),m=$(this.el).find(".mq-input");if(this.model.sound===null){if(!buzz.isMP3Supported()){this.model.sound=new buzz.sound(n,{formats:["ogg"],preload:false})}else{this.model.sound=new buzz.sound(n,{formats:["mp3"],preload:false})}}this.model.sound.bind("timeupdate",function(o){k.width(e*this.getPercent()/100)}).bind("ended",function(o){k.width(e)});this.model.sound.play();m.focus();return false},render:function(){$(this.el).empty();$(this.el).append(this.template({quote:this.model,formattedDate:j(this.model.get("qdate"))}));g();return this}});var d=Backbone.View.extend({tagName:"li",template:_.template($("#quote-template").html()),events:{click:"select"},select:function(k){buzz.all().stop();this.collection.select(this.model);detailView.setModel(this.model);this.render();appRouter.navigate("/"+this.model.get("number"),false);return false},render:function(){$(this.el).empty();$(this.el).append(this.template({quote:this.model}));if(this.model.isSelected()){$(this.el).children(".mq-nav-item").addClass("mq-nav-selected");detailView.render()}return this}});var h=Backbone.View.extend({el:$("#quotes ol"),initialize:function(){this.collection.bind("reset",this.resetAll,this);this.collection.bind("selected",this.selected,this);this.quoteViews=[]},selected:function(){$(this.el).find("li > div").removeClass("mq-nav-selected")},select:function(k){var l=_.detect(this.quoteViews,function(m){return m.model.cid===k.cid});l.select()},resetAll:function(){var k={};this.quoteViews=[];this.collection.each(function(l){k=new d({model:l,collection:this.collection});this.quoteViews.push(k)},this);this.render()},render:function(){this.el.empty();_.each(this.quoteViews,function(k){this.el.append(k.render().el)},this)}});var f=Backbone.View.extend({el:$("body"),navElem:$("#nav-area"),mainElem:$("#main-area"),listElem:$("#list-area"),infoElem:$("#info-area"),rulesElem:$("#rules-area"),errorElem:$("#error-area"),impElem:$("#impressum-data"),initialize:function(){this.home()},events:{"click #current":"current","click #rules":"rules","click #info":"info","click #impressum":"impressum"},showPage:function(k){buzz.all().stop();this.errorElem.hide();this.rulesElem.hide();this.infoElem.hide();this.mainElem.hide();this.listElem.hide();this.impElem.hide();_.each(_.toArray(arguments).slice(0),function(l){l.show()})},error:function(){this.showPage(this.errorElem)},home:function(){if(buzz.isSupported()){this.showPage(this.mainElem,this.listElem)}else{this.error()}return false},rules:function(){this.showPage(this.rulesElem);appRouter.navigate("regeln");return false},info:function(){this.showPage(this.infoElem);appRouter.navigate("info");return false},impressum:function(){this.showPage(this.impElem);return false},current:function(){this.showPage(this.mainElem,this.listElem);appRouter.home();return false}});var a=Backbone.Router.extend({routes:{regeln:"rules",info:"info",":nr":"show","/:nr":"show","":"home"},rules:function(){staticView.rules()},info:function(){staticView.info()},home:function(){staticView.home();quotesView.select(quotes.first())},show:function(k){staticView.home();var l=quotes.find(function(m){return m.get("number").toString()===k});if(l!==undefined){quotesView.select(l)}else{this.home()}}});appRouter=new a;staticView=new f;quotes=new b;quotesView=new h({collection:quotes});detailView=new c({el:$("#main-area")})});