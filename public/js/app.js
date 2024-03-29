// mquzz.js
// http://github.com/dafreakl/mquzz
$(function () {
    // inspired by http://kamikazemusic.com/quick-tips/jquery-html5-placeholder-fix/
    // -------------------------------------------------------------------------
    function checkPlaceholder(){
        if (!Modernizr.input.placeholder) {
            var inputEl = $(".mq-input");
            if( inputEl.val() !== inputEl.attr("placeholder")){
                inputEl.val(inputEl.attr("placeholder"));
                inputEl.focus(function(){
                    if (inputEl.val() === inputEl.attr("placeholder")) inputEl.val("");
                });
                inputEl.blur(function(){
                    if(inputEl.val() === "") inputEl.val(inputEl.attr("placeholder"));
                });
            }
        }
    }
    //
    // -------------------------------------------------------------------------
    var MAX_WIDTH = 953;
    //
    // -------------------------------------------------------------------------
    var formatDate = function (dat){
        var dates = dat.split("-");
        return dates[2] + "." + dates[1] + "." + dates[0];
    }
    //
    // -------------------------------------------------------------------------    
    var Quote = Backbone.Model.extend({
        defaults: {
            selected: false,
            curl: 'http://mquzz.de/'
        },

        initialize: function (){
            this.sound = null;
        },
        
        url: function (){
            return "/api/quote/"+this.get("number");
        },
        
        isSelected: function(){
            return this.get('selected');
        },
        
        getSound: function(){
            return this.sound;
        },
        
        setEvaluated: function(){
            if(Modernizr.localstorage){
                localStorage.setItem(this.get("number"), 'true');
                this.trigger('evaluated');
            }
        },
        
        wasEvaluated: function(){
            return Modernizr.localstorage
                ? localStorage.getItem(this.get("number")) === 'true'
                : false;
        },
        
        evaluate: function(postedSolution, resView){
            var that = this,
                evalUrl = '/api/quote/'+this.get('number')+'/evaluate';
            
            this.setEvaluated();
            
            $.ajax({
                type: 'POST',
                url: evalUrl,
                dataType: 'json',
                data: {psolution: postedSolution},
                success: function(data, textStatus, jqXHR){
                    resView.evaluated(data);
                },
                error: function(jqXHR, textStatus, errorThrown) {
                    alert('Error in evaluation, please try again later');
                }
            });
        }
    });
    //
    // -------------------------------------------------------------------------
    var QuoteList = Backbone.Collection.extend({
        model: Quote,
        
        select: function(quote){
            this.each(function(qu){
                if( qu.cid !== quote.cid ){
                    qu.set({selected: false}, {silent: true});
                }
            });
            quote.set({selected: true}, {silent: true});
            this.trigger('selected');
        },
        
        getSelected: function(){
            return this.find(function(quote){ return quote.isSelected(); });
        }
    });
    //
    // -------------------------------------------------------------------------
    var QuoteDetailView = Backbone.View.extend({
        tagName: 'div',
        
        className: 'span-24',
        
        template: _.template($('#quote-detail-template').html()),
        
        resultTemplate: _.template($('#quote-result-template').html()),
        
        events: {
            'click .mq-play-btn': 'play',
            'click .mq-button': 'evaluate',
            'keypress input': 'evaluateKeypress'
        },
        
        evaluated: function(results){
            var data = results[0];
            // implicit fetch of model: update local fields that might changed
            this.model.set({commits: data.quote.commits, solutions: data.quote.solutions},
                           {silent: true});
            
            $(this.el).empty();
            $(this.el).append( this.resultTemplate({
                    quote: data.quote,
                    posted: data.posted,
                    correct: data.res,
                    rate: data.quote.commits === 0
                        ? 0
                        : (data.quote.solutions / data.quote.commits * 100).toFixed(2)
                }) );
            return this;
        },
        
        evaluateKeypress: function(e){
            if(e.which !== 13) {
                return;
            }
            e.preventDefault();
            this.evaluate();
        },
        
        evaluate: function(){
            var req = $(this.el).find('.mq-input').val();
            buzz.all().stop();
            this.model.evaluate(req, this);
        },
        
        setModel: function(mo){
            this.model = mo;
        },
        
        play: function(ev){
            //var audioUrl = '/audio/' + this.model.get('audiourl'),
            var audioUrl = 'http://mquzz-audio.s3.amazonaws.com/' + this.model.get('audiourl'),
                procEl = $('#progress'),
                inputEl = $(this.el).find('.mq-input');
            
            if( this.model.sound === null ){
                if (!buzz.isMP3Supported()) {
                    this.model.sound = new buzz.sound(audioUrl, {
                        formats: [ "ogg" ],
                        preload: false });
                } else {
                    this.model.sound = new buzz.sound(audioUrl, {
                        formats: [ "mp3" ],
                        preload: false });
                }
            }
            this.model.sound.bind('timeupdate',function(e){
                procEl.width(MAX_WIDTH * this.getPercent() / 100);
            }).bind('ended', function(e){
                procEl.width(MAX_WIDTH);
            });
            
            this.model.sound.play();
            inputEl.focus();
            
            return false;
        },
        
        render: function(){
            $(this.el).empty();
            $(this.el).append( this.template({quote: this.model, formattedDate: formatDate(this.model.get('qdate')) }) );
            checkPlaceholder();
            return this;
        }    
    });
    //
    // -------------------------------------------------------------------------
    var QuoteView = Backbone.View.extend({
        tagName: 'li',
        
        template: _.template($('#quote-template').html()),
        
        events: { 'click': 'select' },
        
        initialize: function(){
            this.model.bind('evaluated', this.evaluated, this);
        },
        
        select: function(ev){
            buzz.all().stop(); //outch
            this.collection.select(this.model);
            detailView.setModel(this.model);
            this.render();
            appRouter.navigate('/'+this.model.get('number'), false);
            
            return false;
        },
        
        evaluated: function(){
            if(!$(this.el).children('.mq-nav-item').hasClass('mq-nav-submitted')){
                $(this.el).children('.mq-nav-item').addClass('mq-nav-submitted');
            }
        },
        
        render: function() {
            $(this.el).empty();
            $(this.el).append( this.template({quote: this.model}) );
            if (this.model.wasEvaluated()){
                this.evaluated();
            }
            if(this.model.isSelected()){
                $(this.el).children('.mq-nav-item').addClass('mq-nav-selected');
                detailView.render();
            }
            return this;
        }
    });
    //
    // -------------------------------------------------------------------------
    var QuoteListView = Backbone.View.extend({
        el: $('#quotes ol'),
        
        initialize: function(){
            this.collection.bind('reset', this.resetAll, this);
            this.collection.bind('selected', this.selected, this);
            this.quoteViews = [];
        },
        
        selected: function(){
            $(this.el).find('li > div').removeClass('mq-nav-selected');
        },
        
        select: function(quiz){
            var qv = _.detect(this.quoteViews, function(view){
                return view.model.cid === quiz.cid;
            });
            qv.select();
        },
      
        resetAll: function() {
            var view = {};
            this.quoteViews = [];

            this.collection.each(function(quote){
                view = new QuoteView({model: quote, collection: this.collection});
                
                this.quoteViews.push(view);
            }, this);
            this.render();
        },
        
        render: function(){
            this.el.empty();
            _.each(this.quoteViews, function(view){
                this.el.append(view.render().el);
            }, this);
        }
    });
    //
    // -------------------------------------------------------------------------
    var StaticView = Backbone.View.extend({
        el: $('body'),

        navElem: $('#nav-area'),
        mainElem: $('#main-area'),
        listElem: $('#list-area'),
        infoElem: $('#info-area'),
        rulesElem: $('#rules-area'),
        errorElem: $('#error-area'),
        impElem: $('#impressum-data'),
    
        initialize: function(){
            this.home();
        },

        events: {
            'click #current': 'current',
            'click #rules': 'rules',
            'click #info': 'info',
            'click #impressum': 'impressum'
        },

        showPage: function(p){
            buzz.all().stop(); //ugly
            this.errorElem.hide();
            this.rulesElem.hide();
            this.infoElem.hide();
            this.mainElem.hide();
            this.listElem.hide();
            this.impElem.hide();
            _.each(_.toArray(arguments).slice(0), function(el){ el.show(); });
        },

        error: function(){
            this.showPage(this.errorElem);
        },

        home: function(){
            if( buzz.isSupported() ){
                this.showPage(this.mainElem, this.listElem);
            } else {
                this.error();
            }
            return false;
        },

        rules: function(){
            this.showPage(this.rulesElem);
            appRouter.navigate('regeln');
            return false;
        },
        
        info: function(){
            this.showPage(this.infoElem);
            appRouter.navigate('info');
            return false;
        },
        
        impressum: function(){
            this.showPage(this.impElem);
            return false;
        },
        
        current: function(){
            this.showPage(this.mainElem, this.listElem);
            appRouter.home();
            return false;
        }
    });
    //
    // -------------------------------------------------------------------------
    var AppRoute = Backbone.Router.extend({
        routes: {
            "regeln": "rules",
            "info": "info",
            ":nr": "show",
            "/:nr": "show", //IE9 without history api
            "": "home"
        },
        
        rules: function(){
            staticView.rules();
        },
        
        info: function(){
            staticView.info();
        },
        
        home: function(){
            staticView.home();
            quotesView.select(quotes.first());
        },
        
        show: function(nr){
            staticView.home();
            var qu = quotes.find(function(q){
                    return q.get('number').toString() === nr;
            });
            if( qu !== undefined ){
                quotesView.select(qu);
            } else {
                this.home();
            }
        }
    });
    // -------------------------------------------------------------------------
    appRouter = new AppRoute;
    staticView = new StaticView;
    quotes = new QuoteList;
    quotesView = new QuoteListView({collection: quotes});
    detailView = new QuoteDetailView({el: $('#main-area')});
});