/* Lite implenation of legacy BS.js functions not present in jQuery */

//silence IE errors ... consider folding into log() or using Firebug lite
try { console } catch (e) { console = { log: function () {} }; }

/*
 *\brief	Extends js Date object with strftime() method
 */
if (!Date.prototype.strftime) Date.prototype.strftime = function(str, utc) {
	var days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
	var months = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
	var formats = { // E, G, g, O, U, V, W, Z, and + not supported
		'A': function(d) { return days[d[get('Day')]()]; },
		'a': function(d) { return d.strftime('%A', utc).substring(0,3); },
		'B': function(d) { return months[d[get('Month')]()]; },
		'b': function(d) { return d.strftime('%B', utc).substring(0,3); },
		'C': function(d) { return parseInt(d[get('FullYear')]() / 100); },
		'c': function(d) { return d.strftime('%a %b %e %H:%M:%S %Y', utc); },
		'D': function(d) { return d.strftime('%m/%d/%y', utc); },
		'd': function(d) { return ('0' + d[get('Date')]()).match(/..$/); },
		'e': function(d) { return (' ' + d[get('Date')]()).match(/..$/); },
		'F': function(d) { return d.strftime('%Y-%m-%d', utc); },
		'H': function(d) { return ('0' + d[get('Hours')]()).match(/..$/); },
		'h': function(d) { return d.strftime('%b', utc); },
		'I': function(d) { return ('0' + ((d[get('Hours')]() % 12) || 12)).match(/..$/); },
		'j': function(d) { return ('00' + Math.floor(((d - new Date(d.getFullYear(),0,0)) + (utc ? (d.getTimezoneOffset() * 60000) : 0)) / 86400000)).match(/...$/); },
		'k': function(d) { return (' ' + d[get('Hours')]()).match(/..$/); },
		'l': function(d) { return (' ' + ((d[get('Hours')]() % 12) || 12)).match(/..$/); },
		'M': function(d) { return ('0' + d[get('Minutes')]()).match(/..$/); },
		'm': function(d) { return ('0' + (d[get('Month')]() + 1)).match(/..$/); },
		'n': function(d) { return '\n'; },
		'p': function(d) { return (d[get('Hours')]() >= 12) ? 'PM' : 'AM'; },
		'R': function(d) { return d.strftime('%H:%M', utc); },
		'r': function(d) { return d.strftime('%I:%M:%S %p', utc); },
		'S': function(d) { return ('0' + d[get('Seconds')]()).match(/..$/); },
		's': function(d) { return Math.round(d.getTime() / 1000); },
		'T': function(d) { return d.strftime('%H:%M:%S', utc); },
		't': function(d) { return '\t'; },
		'u': function(d) { return (d[get('Day')]() || 7); },
		'v': function(d) { return d.strftime('%e-%b-%y', utc); },
		'w': function(d) { return d[get('Day')](); },
		'X': function(d) { return d.strftime('%H:%M:%S', utc); },
		'x': function(d) { return d.strftime('%m/%d/%y', utc); },
		'Y': function(d) { return d[get('FullYear')](); },
		'y': function(d) { return d.strftime('%Y', utc).substring(2); },
		'z': function(d) { return d.toTimeString().match(/[+-]\d{4}/); }
	};

	function get(str) { return (utc ? 'getUTC' : 'get') + str; }

	var c, chars = str.split('');
	var list = [];

	while (c = chars.shift()) {
		if (c == '%') {
			c = chars.shift() || c;
			try { c = formats[c](this).toString(); } catch (e) {}
		}
		list.push(c);
	}

	return list.join('');
};

_bslt = {
	com: {},

	/*PHP-style utility functions*/
	isset: function (v) 
	{ 
		return (typeof v == 'undefined') ? false : true; 
	},

	empty: function (obj)
	{
		if (obj === null) return true;

		switch (typeof obj) {
		case 'number': return (obj == 0);
		case 'string': return (!obj || obj== '');
		case 'boolean': return obj !== true;
		case 'undefined': return true;
		case 'object':
			if (is_array(obj)) {
				for (var i in obj) return false;
				return true;
			}
		case 'function':
		default: return false;
		}
	},
	
	is_array: function (v)
	{
		if (v === null) return false;
		return v.constructor == Array;
	},
	
	is_object: function (v) 
	{
		if (v === null) return false;
		return (typeof v == 'object');
	},

	is_function: function (v)
	{
		if (v === null) return false;
		return (typeof v == 'function');
	},

	is_deferred: function (v)
	{
		return this.is_object(v) && isset(v.done);
	},

	scopeC: function (fn, scope)
	{
		return function() { return fn.apply(scope, arguments); };
	},

	nvToAssoc: function (d)
	{
		var n, v;
		var rA = {};
		for (var i in d) {
			n = d[i].name; v = d[i].value;
			if (isset(rA[n])) {
				if (is_array(rA[n]))
					rA[n].push(v);
				else
					rA[n] = [rA[n], v];
			}
			else rA[n] = v;
		}
		return rA;
	},

	obj: {
		clone: function (obj, noRecursion)
		{
			if (!obj || typeof obj != 'object') return obj;

			var newObj = (obj.constructor == Array) ? [] : {};

			for (var i in obj)
				newObj[i] = noRecursion ? obj[i] : _bslt.obj.clone(obj[i]);

			return newObj;
		},

		/*!\brief	New object creation using argument array.
		 * \param	obj		object
		 * \param	argA		argument array
		 */
		create: function (obj, argA)
		{
			var t = function (tA) { obj.apply(this, tA); };
			t.prototype = obj.prototype;
			return new t(argA);
		},

		/*!\brief	Inherit class definition.  This function must be run after the
		 *		definition of the parent/child constructors and prototypes.
		 *		The child constructor uses the Function.call(this, ...)
		 *		method to call the parent constructor.
		 * \param	parent		parent class
		 * \param	child		child class
		 */
		inherit: function (parent, child)
		{
			if (!parent)
				throw '_bslt.obj.inherit missing parent class' + parent;
			var tmp = function () {};
			tmp.prototype = parent.prototype;
			var old = function () {};
			old.prototype = child.prototype;
			child.prototype = new tmp;
			old.prototype = new old;
			for (var i in old.prototype) child.prototype[i] = old.prototype[i];
		},
		
		del: function (obj)
		{
			if (_bslt.is_array(obj) || _bslt.is_object(obj)) {
				for (var i in obj) this.del(obj)
			}
			
			obj = null;
		},

		_cacheA: [],
		
		cache: function (oName)
		{
			var			a = _bslt.obj._cacheA;

			if (!this.isset(a[oName])) 
				a[oName] = _bslt.mm.oNew(eval(oName));

			return a[oName];
		}
	},
	
	str: {
		/*!\brief	Creates plural form of word
		 * \param	n		count or array to test against
		 * \param	sing		singular form (defaults to null)
		 * \param	pl		plural form (defaults to 's')
		 */
		pl: function (n, sing, pl)
		{
			if (!isset(sing)) sing = '';
			if (!isset(pl)) pl = 's';
			if (is_array(n)) n = n.length;
			
			return (n == 1) ? sing : pl;
		},

		/*!\brief	universal whitespace trim
		 * \param	str		string to trim leading / trailing whitespace from
		 */
		trim: function (str)
		{
			return str.replace(/^\s\s*/, '').replace(/\s\s*$/, '');
		},

		/*!\brief	universal whitespace trim
		 * \param	str		string to trim leading whitespace from
		 */
		ltrim: function (str)
		{
			return str.replace(/^\s\s*/, '');
		},

		/*!\brief	universal whitespace right trim
		 * \param	str		string to trim trailing whitespace from
		 */
		rtrim: function (str)
		{
			return str.replace(/\s\s*$/, '');
		}
	},

	date: {
		MO_STR2_A:	['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul',
				 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'],
		MO_STR_A:	['January', 'February', 'March', 'April', 'May', 'June',
				 'July', 'August', 'September', 'October', 'November',
				 'December'],
		MO_NUM_A:	['01', '02', '03', '04', '05', '06', 
				 '07', '08', '09', '10', '11', '12'],
	
		STD_FMT:	'%e %b %Y',
	
		toDate: function (str)
		{
			var yr = str.substr(0, 4);
			var mon = str.substr(5, 2) - 1;
			var day = str.substr(8, 2);
			var hr = str.substr(11, 2);
			var min = str.substr(14, 2);
			var sec = str.substr(17, 2);
			// omit timezone so it won't screw up our app
			//var tz = str.substr(20, 3);
	
			return new Date(yr, mon, day, hr, min, sec);
		},
		
		toString: function (d) { return d.strftime(this.STD_FMT); },
	
		normalize: function (d)
		{
			if (d)
				return d.strftime('%F %T');
			else return '';
		},
	
		strNormalize: function (str)
		{
			var d = this.toDate(str);
			return this.normalize(d);
		},
	
		strFmt: function (str, fmt)
		{
			if (!fmt) fmt = this.STD_FMT;
			if (!str || str == '') return str;
	
			var date = this.toDate(str);
			return date.strftime(fmt);
		},
	
		compare: function (d1, d2, f_exact)
		{
			if (!f_exact && (this.toString(d1) == this.toString(d2)))
				return 0;
			else if (f_exact && (d1.valueOf() == d2.valueOf()))
				return 0;
	
			if (d1.valueOf() > d2.valueOf()) return 1;
			else return -1;
		}
	},

	utf8: {
		encode: function (str)
		{
			str = str.replace(/\r\n/g,"\n");
			var r = "";
		
			for (var n = 0; n < str.length; n++) {
				var c = str.charCodeAt(n);
		
				if (c < 128) {
					r += String.fromCharCode(c);
				}
				else if((c > 127) && (c < 2048)) {
					r += String.fromCharCode((c >> 6) | 192);
					r += String.fromCharCode((c & 63) | 128);
				}
				else {
					r += String.fromCharCode((c >> 12) | 224);
					r += String.fromCharCode(((c >> 6) & 63) | 128);
					r += String.fromCharCode((c & 63) | 128);
				}
			}
		
			return r;
		},
		
		decode : function (str)
		{
			var r = "";
			var i = 0;
			var c = c1 = c2 = 0;
		
			while ( i < str.length ) {
				c = str.charCodeAt(i);
		
				if (c < 128) {
					r += String.fromCharCode(c);
					i++;
				}
				else if((c > 191) && (c < 224)) {
					c2 = str.charCodeAt(i+1);
					r += String.fromCharCode(((c & 31) << 6) | (c2 & 63));
					i += 2;
				}
				else {
					c2 = str.charCodeAt(i+1);
					c3 = str.charCodeAt(i+2);
					r += String.fromCharCode(((c & 15) << 12) | ((c2 & 63) << 6) | (c3 & 63));
					i += 3;
				}
			}
		
			return r;
		}
	},

	cookie: {
		get: function (n)
		{
			var                     c = document.cookie, i, j;
			n = escape(n);
		
			if ((i = c.indexOf(n + '=')) < 0) return null;
		
			i += n.length + 1;
		
			if ((j = c.indexOf(';', i)) < 0) j = c.length;
		
			return unescape(c.substring(i, j));
		},

		set: function (n, v, days)
		{
			var expStr = '';

			// set expiration
			if (days && (days = parseInt(days)) != NaN) {
				var exp = new Date(); 
				exp.setDate(exp.getDate() + days);
				expStr = '; expires=' + exp.toGMTString();
			} 

			document.cookie = n + '=' + escape(v) + expStr;
		}
	},

	/**  
	 * Simple templating borrowed from underscore.js
	 * @param str	Template string to parse
	 * @param data	
	 * 		(optional) data to evaluate with the template immediately.
	 *		Nice for single-use templates, but should be avoided otherwise
	 * @return
	 * 		A "compiled" temlpate in the form of a new function that takes
	 * 		one argument (a data object) and returns a string of that data
	 *      parsed into the template.
	 * @throws
	 * 		Any number of javascript errors if data or function 
	 *      references required by the template do not exist.
	 */
	tpl: function(str, data) {
		var c  = _bslt._tplSettings;
		var tmpl = 'var __p=[],print=function(){__p.push.apply(__p,arguments);};' +
			'with(obj||{}){__p.push(\'' +
			str.replace(/\\/g, '\\\\')
			.replace(/'/g, "\\'")
			.replace(c.escape, function(match, code) {
				return "',_bslt.tplescape(" + code.replace(/\\'/g, "'") + "),'";
			})
			.replace(c.interpolate, function(match, code) {
				return "'," + code.replace(/\\'/g, "'") + ",'";
			})
			.replace(c.evaluate || null, function(match, code) {
				return "');" + code.replace(/\\'/g, "'")
			.replace(/[\r\n\t]/g, ' ') + "__p.push('";
			})
			.replace(/\r/g, '\\r')
			.replace(/\n/g, '\\n')
			.replace(/\t/g, '\\t')
			+ "');}return __p.join('');";

	    	var func = new Function('obj', tmpl);
	    	return data ? func(data) : func;
  	},

	tplescape: function(string) {
	    return (''+string).replace(/&(?!\w+;|#\d+;|#x[\da-f]+;)/gi, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#x27;').replace(/\//g,'&#x2F;');
	},

	_tplSettings: {
	    evaluate    : /<%([\s\S]+?)%>/g,
	    interpolate : /<%=([\s\S]+?)%>/g,
	    escape      : /<%-([\s\S]+?)%>/g
	},
	
	fsizeHu: function (bytes)
	{
		if (bytes/(1024*1024) < 1)
			return (bytes/(1024)).toFixed(1) + 'KB';
		else if (bytes/(1024*1024*1024) < 1)
			return (bytes/(1024*1024)).toFixed(1) + 'MB';
		else if (bytes/(1024*1024*1024*1024) < 1)
			return (bytes/(1024*1024*1024)).toFixed(1) + 'GB';
		else
			return (bytes/(1000*1024*1024*1024)).toFixed(2) + 'TB';
	},
	
	popupWin: function (url, dimA, name)
	{
		if (!name) name = "popup";

		if (!dimA) dimA = [600,400];

		var foo = window.open(url, name, "resizable=yes,scrollbars=yes,location=no,menubar=no,status=yes,width=" + dimA[0] + ",height=" + dimA[1]);
		if (foo) foo.focus();

		// detect popup blockers
		setTimeout(function () {
			if (!foo) alert('Your browser may be blocking popups. Please try again, or disable any popup blockers.');
		}, 200);
	},
	
	mm: null //instantiated at runtime
};

/*!\brief	Memory management class that implements a pseudo destructor
 *		mechanism.  
 */
_bslt.com.Delete = function ()
{
	this._delA = [];
};

_bslt.com.Delete.prototype = {
	/*!\brief	Add item for later cleanup.
	 * \param	i		item
	 */
	add: function (i) { this._delA.push(i); },

	_del: function (i)
	{
		if (!i || !i._delete) return;

		i._delete();
		i._delete = null;

		delete i;
	},

	/*!\brief	Execute pseudo-destructor and delete for item.
	 * \param	obj		item
	 */
	del: function (obj)
	{
		var			i, l;

		this._del(obj);

		for (i=0, l=this._delA.length; i<l; i++) {
			if (this._delA[i] != obj) continue;
			this._delA.splice(i, 1);
			return;
		}
	},

	/*!\brief	Execute pseudo-destructor and delete for
	 *		all items in the specified array.
	 * \param	iA		item array
	 */
	delArr: function (iA)
	{
		for (var i in iA) this._del(iA[i]);
		delete iA;
	},

	/*!\brief	Returns object for specified object type (variable
	 *		arguments) and caches in this._delA.
	 * \param	obj		object constructor
	 * \return	object
	 */
	oNew: function (obj)
	{
		var t = [];
		for (var i=1, l=arguments.length; i<l; i++)
			t.push(arguments[i]);
		t = _bslt.obj.create(obj, t);
		this.add(t);
		return t;
	},

	/*!\brief	Pseudo destructor. */
	_delete: function ()
	{
		this._delA.reverse();
		this.delArr(this._delA);
	},

};

_bslt.mm = new _bslt.com.Delete;

/*!\brief	MsgSys class that implements a simplistic message system.  The
 *		system supports topic publish/[un]subscribe and broadcast.
 * \param	name		name
 */
_bslt.com.MsgSys = function (name, debug)
{
	this._name = name;
	this._debug = (debug) ? true : false;
	this._brdA = [];
	this._subA = [];
};

_bslt.com.MsgSys.prototype = {
	_delete: function ()
	{
		delete this._brdA;
		delete this._subA;
	},
	
	/*!\brief	Publish a message to the specified topic.
	 * \param	topic		topic (null == broadcast)
	 * \param	msg		message
	 */
	pub: function (topic, msg)
	{
		var			a;

		if (this._debug && console.log)
			console.log('MsgSys[' + this._name + ']::pub: ' + topic, msg);

		if (!topic) a = this._brdA;
		else {
			if (!this._subA[topic]) return;
			a = this._subA[topic];
		}

		var dfrA = []
		for (var i=0, l=a.length; i<l; i++) {
			dfrA.push(a[i](topic, msg));
		}

		return $.when.apply($, dfrA);
	},

	/*!\brief	Subscribe to topic with optional bind and data.
	 * \param	topic		topic (null == broadcast)
	 * \param	f		function
	 * \param	bind		bind scope (optional)
	 */
	sub: function (topic, f, bind)
	{
		var		t;

		if (!topic) {
			this._brdA.push(scopeC(f, bind));
			return;
		}

		if (!is_array(topic)) topic = [topic];

		for (var i in topic) {
			t = topic[i];

			if (!this._subA[t]) 
				this._subA[t] = [];
			this._subA[t].push(scopeC(f, bind));
		}
	},
	
	/*!\brief	Unsubscribe all from topic matching function and bind.
	 * \param	topic		topic (null == broadcast)
	 * \param	f		function
	 * \param	bind		bind scope (optional)
	 */
	unsub: function (topic, f, bind)
	{
		var			a;

		if (!topic) a = this._brdA;
		else if (!this._subA[topic]) return;
		else a = this._subA[topic];

		for (var i=0, l=a.length, t; i<l; i++) {
			t = a[i];
			if (t[0] != f || t[1] != bind) continue;
			a.splice(i, 1);
			i--, l--;
		}
	},

	toString: function () { return 'MsgSys: ' + this._name; }
};

_bslt.com.Browser = function ()
{
	this.agent = this._getAgent(this.dataBrowser) || 'unknown';
	this.version = this._getVersion(navigator.userAgent)
			|| this._getVersion(navigator.appVersion)
			|| 'unknown';
	this.OS = this._getAgent(this.dataOS) || 'an unknown OS';
	
	this.isIE = (this.agent == 'Explorer');
	this.isSafari = (this.agent == 'Safari' || this.agent == 'Konqueror');
	this.isOpera = (this.agent == 'Opera');
	this.isChrome = (this.agent == 'Chrome');
};

_bslt.com.Browser.prototype = {
	_getAgent: function (data)
	{
		for (var i=0; i<data.length; i++) {
			var dataStr = data[i].str;
			var dataProp = data[i].prop;
			this.verSrchStr = data[i].verSrch || data[i].id;
			if (dataStr) {
				if (dataStr.indexOf(data[i].substr) != -1)
					return data[i].id;
			}
			else if (dataProp) return data[i].id;
		}
	},

	_getVersion: function (dataStr)
	{
		var index = dataStr.indexOf(this.verSrchStr);
		if (index == -1) return;
		return parseFloat(dataStr.substring(index+this.verSrchStr.length+1));
	},

	isValid: function (mode)
	{
		if (mode == 'Java' && this.OS == 'Mac') {
			switch (this.agent) {
			case 'Chrome': return true;
			case 'Safari': return (this.version > 400);
			case 'Firefox': return (this.version >= 1.5);
			default: return false;
			}
		}

		switch (this.agent) {
		case 'Safari': return (this.version > 300);
		case 'Chrome': return (this.version >= 0.2);
		case 'Mozilla': return (this.version > 1.6);
		case 'Firefox': return (this.version >= 1);
		case 'Explorer': return (this.version > 5);
		case 'Opera': return (this.version >= 9);
		default: return false;
		}
	},

	dataBrowser: [
		{
			str: navigator.vendor,
			substr: 'Apple',
			id: 'Safari'
		},
		{
			str: navigator.vendor,
			substr: 'Google',
			id: 'Chrome'
		},
		{
			prop: window.opera,
			id: 'Opera'
		},
		{
			str: navigator.vendor,
			substr: 'iCab',
			id: 'iCab'
		},
		{
			str: navigator.vendor,
			substr: 'KDE',
			id: 'Konqueror'
		},
		{
			str: navigator.userAgent,
			substr: 'Firefox',
			id: 'Firefox'
		},
		{	// for newer Netscapes (6+)
			str: navigator.userAgent,
			substr: 'Netscape',
			id: 'Netscape'
		},
		{
			str: navigator.userAgent,
			substr: 'MSIE',
			id: 'Explorer',
			verSrch: 'MSIE'
		},
		{
			str: navigator.userAgent,
			substr: 'Gecko',
			id: 'Mozilla',
			verSrch: 'rv'
		},
		{ 	// for older Netscapes (4-)
			str: navigator.userAgent,
			substr: 'Mozilla',
			id: 'Netscape',
			verSrch: 'Mozilla'
		}
	],

	dataOS : [
		{
			str: navigator.platform,
			substr: 'Win',
			id: 'Windows'
		},
		{
			str: navigator.platform,
			substr: 'Mac',
			id: 'Mac'
		},
		{
			str: navigator.platform,
			substr: 'Linux',
			id: 'Linux'
		}
	]
};

_bslt.browser = _bslt.mm.oNew(_bslt.com.Browser);

// legacy BS.js check
if (typeof BS != 'undefined') {
	// FIXME?
	console.log('WARNING: legacy BS object found');
}
else {
	isset = _bslt.isset;
	is_array = _bslt.is_array;
	empty = _bslt.empty;
	is_object = _bslt.is_object;
	is_function = _bslt.is_function;
	is_deferred = _bslt.is_deferred;
	scopeC = _bslt.scopeC;
}

/* ######## jquery extensions ######## */

$.chain = function (queue, dfr, args)
{
	if (!isset(dfr)) dfr = $.Deferred();
	if (!isset(args)) args = [];

	var r;	
	var t = queue.splice(0, 1)[0];
	if (!is_array(t)) t = [t];

	if (is_function(t[0])) {
		var fn = t[0];
		var scope = (isset(t[1])) ? t[1] : null;
	
		r = fn.apply(scope, args);
	}
	else r = t[0];

	if (is_deferred(r)) {
		r.done(function() {
			if (queue.length > 0)
				$.chain(queue, dfr, arguments) 
			else dfr.resolve(arguments);
		});
		r.fail(function() { dfr.reject.apply(dfr, arguments); });
	}
	else {
		if (queue.length > 0)
			$.chain(queue, dfr, [r]) 
		else dfr.resolve(r);
	}
	
	// need true recursive delete here?
	t = r = null;

	return dfr.promise();
}

// plugin generation and util functions
$.bsPlugin = function(name, object)
{
	$.fn[name] = function(options) {
		return this.each(function() {
			if (!$.data(this, name)) {
				$.data(this, name, _bslt.mm.oNew(object, options, this));
			}
		});
	};
};


/* ######## add map support for IE 8 ### */

// Production steps of ECMA-262, Edition 5, 15.4.4.19
// Reference: http://es5.github.com/#x15.4.4.19
if (!Array.prototype.map) {
	Array.prototype.map = function(callback, thisArg) {

		var T, A, k;

		if (this == null) {
			throw new TypeError(" this is null or not defined");
		}

		// 1. Let O be the result of calling ToObject passing the |this| value as the argument.
		var O = Object(this);

		// 2. Let lenValue be the result of calling the Get internal method of O with the argument "length".
		// 3. Let len be ToUint32(lenValue).
		var len = O.length >>> 0;

		// 4. If IsCallable(callback) is false, throw a TypeError exception.
		// See: http://es5.github.com/#x9.11
		if ({}.toString.call(callback) != "[object Function]") {
			throw new TypeError(callback + " is not a function");
		}

		// 5. If thisArg was supplied, let T be thisArg; else let T be undefined.
		if (thisArg) {
			T = thisArg;
		}

		// 6. Let A be a new array created as if by the expression new Array(len) where Array is
		// the standard built-in constructor with that name and len is the value of len.
		A = new Array(len);

		// 7. Let k be 0
		k = 0;

		// 8. Repeat, while k < len
		while(k < len) {
			var kValue, mappedValue;

			// a. Let Pk be ToString(k).
			//	 This is implicit for LHS operands of the in operator
			// b. Let kPresent be the result of calling the HasProperty internal method of O with argument Pk.
			//	 This step can be combined with c
			// c. If kPresent is true, then
			if (k in O) {

				// i. Let kValue be the result of calling the Get internal method of O with argument Pk.
				kValue = O[ k ];

				// ii. Let mappedValue be the result of calling the Call internal method of callback
				// with T as the this value and argument list containing kValue, k, and O.
				mappedValue = callback.call(T, kValue, k, O);

				// iii. Call the DefineOwnProperty internal method of A with arguments
				// Pk, Property Descriptor {Value: mappedValue, Writable: true, Enumerable: true, Configurable: true},
				// and false.

				// In browsers that support Object.defineProperty, use the following:
				// Object.defineProperty(A, Pk, { value: mappedValue, writable: true, enumerable: true, configurable: true });

				// For best browser support, use the following:
				A[ k ] = mappedValue;
			}
			// d. Increase k by 1.
			k++;
		}

		// 9. return A
		return A;
	};
}

/* ######## add indexOf() support for IE 8 ### */

// Production steps of ECMA-262, Edition 5, 15.4.4.19
if (!Array.prototype.indexOf) {
    Array.prototype.indexOf = function (searchElement /*, fromIndex */ ) {
        "use strict";
        if (this == null) {
            throw new TypeError();
        }
        var t = Object(this);
        var len = t.length >>> 0;
        if (len === 0) {
            return -1;
        }
        var n = 0;
        if (arguments.length > 0) {
            n = Number(arguments[1]);
            if (n != n) { // shortcut for verifying if it's NaN
                n = 0;
            } else if (n != 0 && n != Infinity && n != -Infinity) {
                n = (n > 0 || -1) * Math.floor(Math.abs(n));
            }
        }
        if (n >= len) {
            return -1;
        }
        var k = n >= 0 ? n : Math.max(len - Math.abs(n), 0);
        for (; k < len; k++) {
            if (k in t && t[k] === searchElement) {
                return k;
            }
        }
        return -1;
    }
}
