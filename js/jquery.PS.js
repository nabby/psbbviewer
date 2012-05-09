ps$ = window.ps$ = jQuery.noConflict(true);

// need this outside for global scope
var psApp;

// defines
var PS_DIALOG_OPT = {
	position: 'center',
	autoOpen: true,
	modal: true,
	width: 600,
	height: 'auto',
	resizable: false,
	dialogClass: 'ps',
	closeOnEscape: true,
	zindex: 9998
};

// Use a closure to map $ to the PS namespace for the entire implementation
(function( $ ){  

// PS plugin namespaces
$.fn.PS = {}
if (typeof(PS) == 'undefined') {
	PS = {};
	PS.com = {};
	PS.com.Plugin = {};
}

psApp = {
	pv:		[],
	_errDialog:	null,
	_busy:		null,
	_f_busy:	0,
	_login:		null,
	_loginDfr:	null,

	init: function(pv) 
	{
		this.pv = pv;
	},

	pvGet: function(k)
	{
		return (this.pv[k] !== undefined) ? this.pv[k] : null;
	},

	realmPath: function()
	{
		var area = this.pvGet('area');

		switch (area) {
		case 'adm':
		case 'cli':
		case 'mem':
		case 'mu':
			return '/' + area;
		default:
			return '';
		}
	},

	imgGet: function(id, t, host, qry, f_auth)
	{
		if (host && (host = this.pvGet('server.' + host)));
		else host = '';

		t = (t) ? ('/' + t) : '/s';
		qry = (qry) ? '?' + qry: '';

		var iget = '/img-get';
		if (f_auth) {
			var area = this.pvGet('area');
			if (area == 'mu' || area == 'mem') 
					iget = '/' + area + iget;
		}
		iget += '/';

		return host + iget + id + t + qry;
	},

	imgSzCalc: function(dim, sz, f_upscale)
	{
		if (!is_array(sz)) sz = [sz, sz];

		if (!f_upscale && (dim[0] <= sz[0] && dim[1] <= sz[1]))
			return dim;
		
		var szAR = sz[0]/sz[1];
		var dimAR = dim[0]/dim[1];

		if (szAR > dimAR) return [Math.floor(sz[1]*dimAR), sz[1]];
		else return [sz[0], Math.floor(sz[0]/dimAR)];
	},
	
	bsapi: {
		_actCB: function (data, settings)
		{
			settings.dfr.resolve(data);
		},
	
		_errCB: function (data, settings)
		{
			var dfr = settings.dfr;
	
			if (!is_array(data)) data = [data];
	
			// add default handler
			// HACK: because JQ1.7 broke my other reject.length hack :(
			if (!settings.f_fail)
				dfr.fail(psApp.error);
	
			dfr.reject(data);
		},
	
		_transportErrCB: function (evt, xhr, settings, excpt)
		{
			var err = {'class': "TransportErr", 'message': excpt.message, 'var': excpt};
			
			settings.dfr.reject([err]);
		},
	
		post: function (url, d, f_fail)
		{
			var dfr = $.Deferred();
	
			$.ajax({
				url: url,
				type: 'POST',
				dataType: 'json',
				global: true,
				data: d,
				bsapiCB: psApp.bsapi._actCB,
				bsapiErr: psApp.bsapi._errCB,
				onTransportErr: psApp.bsapi._transportErrCB,
				dfr: dfr,
				f_fail: f_fail
			});
			
			return dfr.promise();
		}
	},

	error: function(errA)
	{
		if (!empty(errA) && !is_array(errA))
			errA = [{message: errA}];
		else if (!errA || !errA.length)
			return;

		if (!psApp._errDialog) {
			psApp._errDialog = $('<div id="psErrDialog" class="dialog"><div id="psErrContent" class="content"></div>')
			
			psApp._errDialog.dialog(
				$.extend({}, PS_DIALOG_OPT, {
					title: 'Oops!',
					width: 450,
					height: 'auto',
					autoOpen: false,
					stack: true,
					buttons: [
						{
							text: "OK",
							click: function() { $(this).dialog("close"); }
						}
					]
				})
			);
		}
	
		var html = '<ul>';
	
		for (var i=0, l=errA.length; i<l; i++) {
			html += '<li>' + errA[i].message + '</li>';
		};
		
		html += '</ul>';
	
		$('#psErrContent').html(html);
	
		psApp._errDialog.dialog('open');
	},

	busy: function (f)
	{
		if (!psApp._busy) {
			psApp._busy = $('<div style="text-align:center;"><img src="/img/spinner.gif"></div>');
			psApp._busy.dialog(
				$.extend({}, PS_DIALOG_OPT, {
					title: 'Please wait...',
					width: 300,
					height: 100,
					autoOpen: false,
					closeOnEscape: false,
					draggable: false,
					hide: 'fade'
				})
			);
		}

		if (f) {
			psApp._f_busy++;
			setTimeout(function() {
				if (!psApp._f_busy) return;
				psApp._busy.dialog('open');
			}, 300);
		}
		else if (!f) {
			if (psApp._f_busy > 0) psApp._f_busy--;
			if (!psApp.f_busy && psApp._busy.dialog('isOpen')) {
				psApp._busy.dialog('close');
			}
		}
	},

	login: function (msg)
	{
		if (!psApp._login) {
			psApp._login = $('<div id="psLogin"><p class="psLoginMsg"></p><iframe class="psLoginPromptFrame" frameborder="0" scrolling="no"></iframe></div>');
			psApp._login.dialog(
				$.extend({}, PS_DIALOG_OPT, {
					title: 'Login Required',
					width: 450,
					height: 300,
					autoOpen: false,
					closeOnEscape: true,
					draggable: true
				})
			);
			
			psApp._login.on('dialogclose', function () {
				if (psApp._loginDfr) {
					psApp._loginDfr.reject();
					psApp._loginDfr = null;
				}
				psApp._login.find('IFRAME').attr('src', 'about:blank');
			});
			
			$('#psLogin IFRAME').on('load', function () {
				try {
					if (this.contentWindow.location.href.indexOf('psLoginPromptCB') > 0) {
						psApp._loginDfr.resolve();
						psApp._loginDfr = null;
						psApp._login.dialog('close');
					}
				} catch (e) {}
			});
		}
		
		psApp._login.find('.psLoginMsg').html(msg ? msg : 'Please log in to access this feature.');
		psApp._login.find('IFRAME').attr('src', psApp.pvGet('server.sec') + '/login/ajax');
		psApp._login.dialog('open');
		
		psApp._loginDfr = $.Deferred();
		return psApp._loginDfr.promise();
	}
};

$.fn.PS.dialogResize = function (dialog, minH, scalingO) {
	var winH = $(window).height();
	var widg = dialog.dialog("widget");
	var scH = ( scalingO.children().length == 1 ? scalingO.children().height() : scalingO.prop("scrollHeight"));
	var chro = widg.height() - scalingO.height();
	var mt = (parseInt(widg.css("marginTop")) || 0);
	var mb = (parseInt(widg.css("marginBottom")) || 0);
	var maxH = winH - chro - (mt + mb);

	scalingO.height(Math.max(Math.min(maxH, scH), minH));
};


// ########################################################
// methods
// ########################################################

$.jqPlugin = function (plugin, args)
{
	var method = args[0];

	if (method && plugin[method]) {
		return plugin[method].apply(this, Array.prototype.slice.call(args, 1));
	}
	else if (typeof method === 'object' || !method) {
		return plugin.init.apply(this, args);
	}
	else {
		$.error('$.jqPlugin: undefined method [' + method + ']');
	}
}

$.rgxEsc = function(txt)
{
    var r = txt.replace(/[-[\]{}()*+?.,\\^$|#\s]/g, "\\$&");
    //r = r.replace(/\\ /g," ");
    return r;
};

// ########################################################
// plugins
// ########################################################

//**jquery live wrapper for context support
$.fn.liveC = function (eventType, scope, handler, data) {
	var eventData = {scope: scope, handler:handler, data:data};
	//this local object may be a leak source

	return this.live(eventType, eventData, function (event) {
		var evd = event.data;
		event.data = event.data.data
		return evd.handler.apply(evd.scope, arguments);
	});
};

$.fn.bindC = function (eventType, scope, handler, data) {
	var eventData = {scope: scope, handler:handler, data:data};
	//this local object may be a leak source

	return this.bind(eventType, eventData, function (event) {
		var evd = event.data;
		event.data = event.data.data
		return evd.handler.apply(evd.scope, arguments);
	});
};

$.fn.onC = function () {
	var args = [].slice.call(arguments, 0, arguments.length-2);
	var cb = arguments[arguments.length-2];
	var scope = arguments[arguments.length-1];

	args[args.length] = function() {
		return cb.apply(scope, arguments);
	}

	return this.on.apply(this, args);
};

$.fn.offC = function () {
	var args = [].slice.call(arguments, 0, arguments.length-2);
	var cb = arguments[arguments.length-2];
	var scope = arguments[arguments.length-1];

	args[args.length] = function() {
		return cb.apply(scope, arguments);
	}

	return this.off.apply(this, args);
};

//Patch the remove function to avois leaks in IE
$.fn.remove = function() {
	return $(this).each(function(i,e){
		if( e.parentNode )
		    e.parentNode.removeChild(e);
	});
};

$.fn.serializeObject = function()
{
	var o = {};
	var a = this.serializeArray();
	$.each(a, function() {
		if (o[this.name] !== undefined) {
			if (!o[this.name].push) {
				o[this.name] = [o[this.name]];
			}
			o[this.name].push(this.value || '');
		} else {
			o[this.name] = this.value || '';
		}
	});
	return o;
};

//this function is not chainable
$.fn.setBestColWidth = function() {
	elems = $(this);
	var maxWidth = Math.max.apply( null, $( elems ).map( function () {
		return $( this ).outerWidth( true );
		}).get() );
	elems.width(maxWidth);	
	return maxWidth;
};

$.fn.formLoad = function (d)
{
	var that = this;

	$.each(d, function(k, v) {
		that.find("[name='" + k + "']").val(v);
	});
	
	return this;
};	

//unanchored link
$.fn.blockLink = function () {
	$(this).hover(function() {
		$(this).css("cursor","pointer");
	}, function() {
		$(this).css("cursor","default");
	}).click(function() {
		location = $(this).data("blockLink");
	});
	
};

$.fn.blockToggle = function (cn)
{
	if (!cn) cn = 'open';
	this.parent().toggleClass(cn);
};

var relInputLabel = {
	_opt : {
		'blur' : false	
	},

	init : function (fId, bindSubmit, blur)
	{
		if (blur)
			relInputLabel._opt.blur = true;

		var fObj = $("FORM#"+fId);
		fObj.find("INPUT[rel]").each(relInputLabel._wireI);
		if (bindSubmit) {
			fObj.submit(function() {
				relInputLabel.submit(fId);
			});
		}
	},

	submit : function (fId)
	{
		var fObj = $("FORM#"+fId);
		fObj.find("INPUT[rel]").each(relInputLabel._submit);
	},

	_wireI : function ()
	{
		if ($(this).val() != '') return;

		$(this).val($(this).attr('rel'))
			.focus(relInputLabel._hide)
			.addClass('relInp');

		if (relInputLabel._opt.blur) 
			$(this).blur(relInputLabel._show);
			
	},

	_wireS : function ()
	{
		$(this).prepend("<option value=\"\">" + $(this).attr('rel') + "</option>");

	},

        _submit : function ()
	{
		if ($(this).hasClass("relInp"))
			$(this).val('');
	},

	_show : function ()
	{
		if ($(this).val() == '') {
			$(this).val($(this).attr('rel'));
			$(this).addClass('relInp');
		}
	},

	_hide : function ()
	{
		if ($(this).val() == $(this).attr('rel'))
			$(this).val('');

		$(this).removeClass('relInp');
	}
};

$.fn.PS.relInputLabel = function(method) {
	if (relInputLabel[method]) {
		return relInputLabel[method].apply(this, Array.prototype.slice.call(arguments, 1));
	}
	else if (typeof method === 'object' || !method) {
		return relInputLabel.init.apply(this, arguments);
	}
	else {
		$.error('PS.relInputLabel: undefined method [' + method + ']');
	}
};

// ########################################################
// widgets
// ########################################################


// ########################################################
// ready functions
// ########################################################

$().ready(function() {
	// Global AJAX transfer error handler
	$('body').ajaxError(function(evt, xhr, settings, excpt) {
		try {
			// quietly error
			console.log('jquery.PS.ajaxError', excpt, xhr.responseText); 

			//make sure to prevent method-specific AJAX callback from firing (passed in settings['complete'])
			evt.stopImmediatePropagation();
			
			// HACK: used in older apps e.g. PS.cartAdd
			$(".psWaitingMd").trigger('bsapi_error');

			// do something with a transfer error here....
			// like throw a prompt with some messaging
			// or do the local onErr
			if (settings.onTransportErr != undefined)
				settings.onTransportErr(evt, xhr, settings, excpt);

			throw new Error('Transfer Error');
		} catch(err) {
			// silently error?
			/*
			var errA = [{message: err}];
			if ($.isFunction(settings.bsapiErr)) {
				settings.bsapiErr(errA, settings);
			}
			else {
				// default error handling
				psApp.error(errA);
			}
			*/
		}
	});

	//Global AJAX API error / exception handler (responseParse)
	$('body').ajaxSuccess(function(evt, xhr, settings) {
		var d;

		// FIXME: need real content type detection?
		switch (settings.dataType) {
		case 'json':
			// can responseText be non-string???
			if (typeof xhr.responseText == 'string')
				d = eval( "(" + xhr.responseText + ")" );
			else if (xhr.responseText)
				d = xhr.responseText;
				//console.log(xhr);
			if (!d) return;
			//console.log(3);
			if (typeof d.response == 'undefined') {
				// silently error
				//console.log('getJson has no data.response');
			}
			else if ((typeof d.response.success) != 'undefined') {
				if ($.isFunction(settings.bsapiCB))
					settings.bsapiCB(d['return'], settings);
				else return;
			}
			else if ((typeof d.response.error) != 'undefined') {
				var errA = d.response.error;

				// stop method-specific callbacks from firing
				evt.stopImmediatePropagation();

				if ($.isFunction(settings.bsapiErr)) {
					settings.bsapiErr(errA, settings);
				}
				else {
					// default error handling
					psApp.error(errA);
				}
			}
			else throw new Error('invalid response');
			break;

		case 'html':
			if (xhr.responseText == '') {
				// HACK: used in older apps e.g. PS.cartAdd
				$("psWaitingMd").trigger('bsapi_error');
				break;
			}
		default:
			if (typeof xhr.responseXML == 'object') {
				xml = xhr.responseXML;
				err = xml.getElementsByTagName('error');
				if (err.length) {
					if ($.isFunction(settings.bsapiErr)) {
						settings.bsapiErr(err, settings);
						break;
					} 
					else {
						psApp.error(errA);
						break;
					}
				}
			}
			if ($.isFunction(settings.bsapiCB))
				settings.bsapiCB(xhr.responseText, settings);

			break;
		}
	});
});



})(ps$);
