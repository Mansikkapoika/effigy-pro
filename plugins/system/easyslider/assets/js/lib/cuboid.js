void function($) {

	$.fn.ES_Cuboid = function( width, height, depth ) {
		return this.each( function() {

			width = (width || $(this).width());
			height = (height || $(this).height());

			depth || (depth = width);

			var halfWidth = width / 2;
			var halfHeight = height / 2;
			var halfDepth = depth / 2;
			var setback = 0;

			var $cube = $('.es-cuboid', this);
			if (!$cube.length) {
				$cube = $( '<div class="es-cuboid">' )
					.appendTo( this )
					.append( '<div class="es-cuboid-face es-cuboid-front">' )
					.append( '<div class="es-cuboid-face es-cuboid-back">' )
					.append( '<div class="es-cuboid-face es-cuboid-left">' )
					.append( '<div class="es-cuboid-face es-cuboid-right">' )
					.append( '<div class="es-cuboid-face es-cuboid-top">' )
					.append( '<div class="es-cuboid-face es-cuboid-bottom">' )
			}
			var $front = $cube.children('.es-cuboid-front');
			var $back = $cube.children('.es-cuboid-back');
			var $left = $cube.children('.es-cuboid-left');
			var $right = $cube.children('.es-cuboid-right');
			var $top = $cube.children('.es-cuboid-top');
			var $bottom = $cube.children('.es-cuboid-bottom');

			$cube.css( {
					width: width + 'px',
					height: height + 'px'
				} );

			$( this ).css( {
				transform: 'translateZ(' + (-halfDepth) + 'px)'
			} )

			$front.css( {
					transform: 'translateZ(' + setback + 'px) translateZ(' + (halfDepth) + 'px)',
					width: width + 'px',
					height: height + 'px'
				} );
			$back.css( {
					transform: 'translateZ(' + setback + 'px) rotateY(180deg) translateZ(' + (halfDepth) + 'px)',
					width: width + 'px',
					height: height + 'px'
				} );
			$left.css( {
					transform: 'translateZ(' + setback + 'px) rotateY(-90deg) translateZ(' + (halfWidth) + 'px)',
					marginLeft: -halfDepth + 'px',
					width: depth + 'px',
					height: height + 'px'
				} );
			$right.css( {
					transform: 'translateZ(' + setback + 'px) rotateY(90deg) translateZ(' + (halfWidth) + 'px)',
					marginLeft: -halfDepth + 'px',
					width: depth + 'px',
					height: height + 'px'
				} );
			$top.css( {
					transform: 'translateZ(' + setback + 'px) rotateX(90deg) translateZ(' + halfHeight + 'px)',
					marginTop: -halfDepth + 'px',
					width: width + 'px',
					height: depth + 'px'
				} );
			$bottom.css( {
					transform: 'translateZ(' + setback + 'px) rotateX(-90deg) translateZ(' + halfHeight + 'px)',
					marginTop: -halfDepth + 'px',
					width: width + 'px',
					height: depth + 'px'
				} );
		} );
	};

}( jQuery )