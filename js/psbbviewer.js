Gal = Backbone.Model.extend({
	initialize: function (attr, url)
	{
		this.baseURL = url + '/gallery/';
	},

	sync: function (method, model, opt)
	{
		opt = $.extend(opt, true, {
			url: this.baseURL + opt.id + '?feed=jsonp',
			crossDomain: true,
			dataType: 'jsonp',
			type: 'GET'
		});

		switch (method) {
		case 'read':
			return $.ajax(opt);
			break;
		}
	}
});

GalList = Backbone.Collection.extend({
	model: Gal
});

GalView = Backbone.View.extend({
	tagName: 'div',
	tpl: null,
	
	events: {},
	
	initialize: function ()
	{
		this.tpl = _.template($('#galTpl').html());
		this.model.bind('change', this.draw, this);
		this.model.bind('destroy', this.draw, this);
	},
	
	render: function ()
	{
console.log('render', this.model);
		if (this.model.get('gal'))
			this.$el.html(this.tpl(this.model.toJSON()));
		else
			this.$el.html('(no gallery loaded)');

		return this;
	}
});


/*
GalListView = Backbone.View.extend({
	el: $('<div class="GalListView"></div>').appendTo(document.body),

	render: function ()
	{
console.log('render');
	}
});
*/

var Viewer = function (url)
{
	this.baseURL = url;
	
	this.$gl = $('#galList');
	this.$gal = $('#gal');
	
	// models
	this.curGal = new Gal({}, this.baseURL);

	// views
	this.galView = new GalView({model: this.curGal});
	this.$gal.html(this.galView.render().el);

	// event bindings
	this.$gl.on('click', 'A.glNode', scopeC(this._clickCB, this));
		

	this.galListLoad();
};

Viewer.prototype = {
	iframe:		null,
	glView: 	null,
	baseURL:	null,
	
	curGalList:	null,
	curGal:		null,
	
	_clickCB: function (evt)
	{
		var obj = $(evt.currentTarget);
		
		switch (obj.data('act')) {
		case 'galLoad':
			this.galLoad(obj.data('id'));
			break;
		}
	},

	galListLoad: function ()
	{
		$.ajax({
			url: this.baseURL + '/gallery-list?feed=jsonp',
			crossDomain: true,
			dataType: 'jsonp',
			type: 'GET',
		}).done(scopeC(function (data, msg, dfr) {
			this.curGalList = new GalList(data.gl);
			
			this.curGalList.each(scopeC(function (gal, i, list) {
				this.$gl.append($('<a class="glNode" data-act="galLoad" data-id="' + gal.get('G_ID') + '">' + (i+1) + '. ' + gal.get('G_NAME') + '</a><br>'));
			}, this));

		}, this));
	},

	galLoad: function (id)
	{

this.curGal.fetch({id: id});
return;
		$.ajax({
			url: this.baseURL + '/gallery/' + id + '?feed=jsonp',
			crossDomain: true,
			dataType: 'jsonp',
			type: 'GET',
		}).done(scopeC(function (data, msg, dfr) {
			
		}, this));
	}
};