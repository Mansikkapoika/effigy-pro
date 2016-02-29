void function( exports, $, _, Backbone ) {

	//exports.log = log.bind( console );
	exports.log = _.noop;

	_.mixin( {

		prefixCSSRules: function( css, prefix ) {
			css = css.replace(/\n|\r|\t/g, '');
			css = css.replace(/\/\*[^*]+\*\//g, '');
			return _( css.match(/[^{]+{[^}]+}/g) || [] ).map(function ( rule ) {
				var split = rule.match(/^(.*)({.*})/)
				return _.map(split[1].split(','), function(name) {
						return prefix + ' ' + name.trim();
					}, this).join(",\n") + split[2];
			}, this).join("\n");
		},

		loadImage: function( src, callback, context ) {
			var img = new Image;
			img.onerror = function ( e ) {
				console.warn('Could not load image from source: ' + src)
			}
			img.onload = function() {
				_.isFunction(callback) && callback.call(context||this, this)
			}
			img.src = src;
		},
		isPrototypeOf: function( child, parent ) {
			if ( !child || !parent )
				return false;
			var result = false;
			var proto = child.prototype;
			while ( proto ) {
				if ( proto == parent.prototype ) {
					result = true;
					break;
				}
				proto = proto.__proto__;
			}
			return result;
		},
		setPrototypeOf: function( child, prototype ) {
			if (_.isFunction(Object.setPrototypeOf))
				Object.setPrototypeOf(child.prototype || child, prototype);
			else
				(child.prototype || child).__proto__ = prototype;
			return child
		},
		extendPrototype: function( child, prototype ) {
			_.extend(child.prototype, prototype)
			return child
		},

		joinPath: function() {
			return _( arguments ).join( '/' ).replace(/([^:])\/+/g,'$1\/');
		},

		deepExtend: function deepExtend( obj ) {
			return $.extend.apply( $, _( arguments ).splice( 0, 0, true ) );
		},

		parseNumberUnit: function( str ) {
			str += '';
			var match = str.replace( /\s+/, ' ' ).match( /([-0-9.]+)\s?([^\s]*)?/ );
			return {
				value: match && parseFloat( match[ 1 ] ) || 0,
				unit: match && match[ 2 ] || ''
			}
		},
		stripTags: function( str ) {
			return str
				.replace( /</g, '&lt;' )
				.replace( />/g, '&gt;' );
		},
		encodeHtmlEntities: function( str ) {
			return String( str )
				.replace( /&/g, '&amp;' )
				.replace( /</g, '&lt;' )
				.replace( />/g, '&gt;' )
				.replace( /"/g, '&quot;' );
		},
		decodeHtmlEntities: function( str ) {
			return String( str )
				.replace( /&amp;/g, '&' )
				.replace( /&lt;/g, '<' )
				.replace( /&gt;/g, '>' )
				.replace( /&quot;/g, '"' );
		}
	} );

	function deepExtend(obj) {
		_(arguments).chain().slice(1).each(function(props) {
			_(props).each(function( value, key ) {
				if (_.isObject(value)) {
					if (!_.isObject(obj[key]))
						obj[key] = {};
					return deepExtend(obj[key], value)
				}
				obj[key] = value;
			})
		})
		return obj;
	}


}( this, jQuery, _, Backbone );