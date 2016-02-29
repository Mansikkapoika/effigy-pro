void function ( exports, $, _, Backbone ) {

	var log = _.noop;
	//var log = log.bind(console)

	var YT_API_LOADED = false;

	var sliders = {};

	var View = Backbone.View.extend({
		constructor: function ES_View() {
			Backbone.View.apply(this, arguments);
		},
		show: function () {
			this.$el.removeClass('es-hidden').css('opacity', 1);
			return this;
		},
		hide: function () {
			this.$el.addClass('es-hidden');
			return this;
		},
	});

	var VimeoPlayer = View.extend({
		events: {},
		initialize: function (options) {

			this.playerVars = options.playerVars;

			_.bindAll(this, 'onMessageReceived');

			this.playerOrigin = '*';

			if ( window.addEventListener ) {
				window.addEventListener('message', this.onMessageReceived, false);
			}
			else {
				window.attachEvent('onmessage', this.onMessageReceived, false);
			}
		},
		postMessage: function ( action, value ) {
			var data = {
				method: action
			};
			if ( value ) {
				data.value = value;
			}
			var message = JSON.stringify(data);
			this.el.contentWindow.postMessage(message, this.playerOrigin);
		},
		onMessageReceived: function ( event ) {
			// Handle messages from the vimeo player only
			if ( !(/^https?:\/\/player.vimeo.com/).test(event.origin) ) {
				return;
			}

			if ( this.playerOrigin === '*' ) {
				this.playerOrigin = event.origin;
			}

			var data = JSON.parse(event.data);
			switch ( data.event ) {
				case 'ready':
					this.postMessage('addEventListener', 'play');
					this.postMessage('addEventListener', 'pause');
					this.postMessage('addEventListener', 'finish');
					//this.postMessage('addEventListener', 'playProgress');



					if ( this.playerVars.mute ) {
						this.postMessage('setVolume', '0')
					}
					else {
						var value = '0.8';
						if ( this.playerVars.volume && parseFloat(this.playerVars.volume) > 0 ) {
							value = parseFloat(this.playerVars.volume) / 100;
						}
						this.postMessage('setVolume', value)
					}
					this.postMessage('setLoop', this.playerVars.loop);
					this.trigger('ready');
					break;

				case 'playProgress':
					this.trigger('progress');
					break;

				case 'pause':
					this.trigger('paused');
					break;

				case 'finish':
					this.trigger('ended');
					break;
				case 'play':
					this.trigger('playing');
					break;
			}
		},
		playVideo: function () {
			this.postMessage('play');
		},
		pauseVideo: function () {
			this.postMessage('pause');
		},
		seekTo: function ( time ) {
			this.postMessage('seekTo', time / 1000);
		},
	});

	var BackgroundView = View.extend({
		constructor: function ES_BackgroundView( options ) {
			View.call(this, options)
		},
		bindings: [
			{
				type: 'style',
				attr: {
					'backgroundColor': 'color',
					'backgroundImage': 'image.src',
					'backgroundPosition': 'position',
					'backgroundRepeat': 'repeat',
					'backgroundSize': 'size',
				},
				parse: function ( value, key ) {
					switch ( key ) {
						case 'backgroundImage':
							return value ? 'url(' + value + ')' : '';
						case 'backgroundRepeat':
							return value ? 'repeat' : 'no-repeat';
						default:
							return value;
					}
				}
			}
		],

		initialize: function () {
			this.videoLoaded = false;
			_.bindAll(this, 'resizeVideo');
			Object.defineProperty(this, 'slideView', {
				get: function () {
					if ( typeof this.isItem !== 'undefined' && this.isItem )
						return this.superView.superView.superView;
					else
						return this.superView;
				}
			})

			if ( this.model.get('image.src') ) {
				this.hasImage = true;
				this.imgLoading = false;
				this.imgLoaded = false;
			}

			this.on('video:playing', function () {
				this.videoPlaying = true;
			});
			this.on('video:ended', function () {
				this.videoPlaying = false;
				this.slideView.trigger('video:ended');
			});
		},

		loadImage: function () {
			if ( !this.hasImage || this.imgLoading || this.imgLoaded )
				return;
			var self = this;
			this.imgLoading = true;
			//this.$loading = $('<div class="es-loading fa-spin" />')
			//	.appendTo(this.el);
			var img = new Image;
			img.onload = function () {
				self.imgLoaded = true;
                self.$el.css('background-image', 'url(' + img.src + ')')

			}
			img.onerror = function () {
				console.warn('Failed to load image from src:', img.src);
				//self.$loading.remove();
			}

			var imgSrc = this.model.get('image.src');

			var re = new RegExp("^(http|https)://", "i");

			if ( re.test(imgSrc) ) {
				// do nothing
			}
			else {
				imgSrc = this.rootView.rootURL + imgSrc;
			}

			img.src = imgSrc;
		},
		loadVideo: function () {
			if ( this.videoLoaded )
				return;

			this.isItem && this.listenTo(this.superView, 'start', function () {
				log('anim start');
				if (this.slideView.isActive() && this.model.get('video.autoplay'))
					this.playVideo();
			})

			if ( this.model.get('video.selector') == 'provider' ) {
				if ( this.model.get('video.youtube') )
					return this.loadYoutubeVideo();
				if ( this.model.get('video.vimeo') )
					return this.loadVimeoVideo();
			}
            else if ( this.model.get('video.selector') == 'local' ) {
				if (this.model.get('video.mp4') || this.model.get('video.ogg') || this.model.get('video.webm'))
					return this.loadLocalVideo();
			}
            else {
                if ( this.model.get('video.youtube') )
                    return this.loadYoutubeVideo();
                if ( this.model.get('video.vimeo') )
                    return this.loadVimeoVideo();
                if (this.model.get('video.mp4') || this.model.get('video.ogg') || this.model.get('video.webm'))
                    return this.loadLocalVideo();
            }
		},

		loadYoutubeVideo: function () {
			var view = this;
            var video = this.model.get('video').toJSON();
            if ( video.autoplay )
                this.$el.hide();
			//log('Checking Youtube Player API...');
			this.videoLoaded = true;
			if ( !YT_API_LOADED )
				return this.delay(this.loadYoutubeVideo, 1000);
			//log('Rendering Youtube Video...');
			this.yt_player_id = _.uniqueId('yt-player-');

			$('<div class="es-video es-youtube-video">')
				.attr('id', this.yt_player_id)
				.appendTo(this.el);

			this.yt_player = new YT.Player(this.yt_player_id, {
				width: '100%',
				height: '100%',
				videoId: this.model.get('video.youtubeID'),
				playerVars: {
					autohide: 1,
					//autoplay: video.autoplay ? 1 : 0,
					autoplay: 0,
					controls: video.controls ? 1 : 0,
					// TODO: Check youtube loop problem
					loop: video.loop ? 1 : 0,
					cc_load_policy: 0,
					iv_load_policy: 3,
					modestbranding: 1,
					rel: 0,
					showinfo: 0
				},
				events: {
					'onReady': _.bind(function () {
						this.player = this.yt_player;
						//this.yt_player.stopVideo();
                        if ( view.superView.$el.hasClass('es-item')) {
                            view.superView.$('.item-content').remove();
                        }

						if ( video.mute ) {
							this.yt_player.mute();
						}
						else {
							this.yt_player.unMute();
							this.yt_player.setVolume((video.volume ? video.volume : 80));
						}
						if (video.autoplay) {
							this.yt_player.playVideo();
                            setTimeout( function(){
                                view.$el.show();
                            }, 500)
						}

					}, this),
					'onStateChange': _.bind(function ( state ) {
						switch ( state.data ) {
							case 0:
								this.trigger('video:ended');
								break;
							case 1:
								this.trigger('video:playing');
								break;
							case 2:
								this.trigger('video:paused');
								break;
							case 3:
								this.trigger('video:buffering');
								break;
							case 5:
								this.trigger('video:cued');
								break;
							case -1:
								break;
						}
					}, this)
				}
			});
			this.$yt_player = this.$('iframe');

            this.resizeVideo();

		},
		loadVimeoVideo: function () {
			//hide item-content
			var view = this;
            var video = this.model.get('video').toJSON();
            if ( video.autoplay )
                this.$el.hide();
			this.videoLoaded = true;
			this.isItem && this.superView.$('.item-content').hide();

			var iframe = $('<iframe src="https://player.vimeo.com/video/' + this.model.get('video.vimeoID')
				+ '?api=1'
				//+ '&autoplay=' + ( video.autoplay ? 1 : 0)
				+ '&autoplay=0'
				+ '&controls=' + (video.controls ? 1 : 0)
				+ '" frameborder="0" width="100%" height="100%" webkitallowfullscreen mozallowfullscreen allowfullscreen></iframe>');
			iframe
				.appendTo(this.el);

			this.player = new VimeoPlayer({
				el: iframe,
				playerVars: video
			});
			this.player.on('ready', function () {
				if (video.autoplay) {
                    view.playVideo();
                    setTimeout( function(){
                        view.$el.show();
                    }, 500)

                }
			});
			this.player.on('playing', function () {
				view.trigger('video:playing')
			});
			this.player.on('paused', function () {
				view.trigger('video:paused')
			});
			this.player.on('ended', function () {
				view.trigger('video:ended')
			});
            if ( this.superView.$el.hasClass('es-item')) {
                this.superView.$('.item-content').remove();
            }
            else {
                this.resizeVideo();
            }
			this.$vimeo_player = iframe;
		},
		loadLocalVideo: function () {
			this.videoLoaded = true;
			this.$video = $('<video class="es-video">')
				.appendTo(this.el)
				.attr({
					width: '100%',
					height: '100%',
				})
				.prop({
					controls: this.model.get('video.controls'),
					autoplay: false,
					loop: this.model.get('video.loop'),
				});
			this.$video.get(0).volume = 1;
			if ( this.model.get('video.mute') ) {
				this.$video.prop('muted', true);
			}

			_.each([ 'mp4', 'ogg', 'webm' ], function ( type ) {
				if ( this.model.get('video').get(type) )
					$('<source>')
						.attr('type', 'video/' + type)
						.attr('src', this.model.get('video').get(type))
						.appendTo(this.$video);
			}, this);

			this.player = {};
			this.player.playVideo = _.bind(function () {
				this.$video.get(0).play();
			}, this);
			this.player.pauseVideo = _.bind(function () {
				this.$video.get(0).pause();
			}, this);
			this.player.seekTo = _.bind(function ( time ) {
				this.$video.get(0).currentTime = time;
			}, this);

            if ( this.superView.$el.hasClass('es-item')) {
                this.superView.$('.item-content').remove();
            }
			this.$video.get(0).addEventListener('play', _.bind(function ( e ) {
				this.trigger('video:playing')
			}, this));
			this.$video.get(0).addEventListener('pause', _.bind(function ( e ) {
				this.trigger('video:paused')
			}, this));
			this.$video.get(0).addEventListener('ended', _.bind(function ( e ) {
				this.trigger('video:ended')
			}, this));

			if ( this.model.get('video.autoplay')) {
				this.player.playVideo();
			}
            this.resizeVideo()
		},

		resizeVideo: function ( ) {
            var width = this.$el.width();
            var height = this.$el.height();

            if ( !this.$video && !this.$yt_player && !this.$vimeo_player)
				return;
			if ( this.videoResized )
				return;

			if ( !width || !height )
				return;

			var ratio = width / height;

            var videoRatio = 0;
            var $video;
			if ( this.$yt_player ) {
				videoRatio = parseFloat( this.model.get('video.youtubeRatio') );
                $video = this.$yt_player;
			}
			if ( this.$vimeo_player ) {
				videoRatio = parseFloat( this.model.get('video.vimeoRatio') );
                $video = this.$vimeo_player;
			}
            if ( this.$video ) {
                this.$video.removeAttr('width').removeAttr('height').css({'min-width': '100%', 'min-height': '100%'})
                this.videoResized = true;
            }
            if ( ratio > 0 && videoRatio > 0 ) {
                if ( videoRatio < ratio ) {
                    $video
                        .attr('width', width + 6)
                        .attr('height', width / videoRatio + 6)
                        .css('margin', '-3px');
                    this.videoResized = true;
                }
                else {
                    if ( videoRatio < ratio ) {
                        $video
                            .attr('width', height * videoRatio  + 6)
                            .attr('height', height + 6)
                            .css('margin', '-3px');
                        this.videoResized = true;
                    }
                }
            }
		},
		playVideo: function () {
			var view = this;
			if ( this.videoLoaded && this.slideView.isActive() ) {
				var interval = setInterval(function () {
					if ( typeof view.player !== 'undefined' ) {
						view.player.playVideo();
						clearInterval(interval);
					}
				}, 100);
			}
		},
		pauseVideo: function () {
			if ( this.videoLoaded ) {
				var view = this;
				var interval = setInterval(function () {
					if ( typeof view.player !== 'undefined' ) {
						view.player.pauseVideo();
						clearInterval(interval);
					}
				}, 100);
			}
		},
		stopVideo: function () {
			if ( this.player ) {
				this.player.seekTo(0.1);
				this.player.pauseVideo();
			}
		}
	});

	var NavView = View.extend({
		ready: function ( options ) {
			var enable = this.model.get('enable');
			if ( !enable || this.rootView.model.get('slides').length == 1 )
				return this.$el.hide();
            else if ( this.rootView.model.get('slides').where({hide: false}).length <= 1 ) {
                return this.$el.hide();
            }
			var style = this.model.get('style');
			var template = ES_Nav.templates[ style ];
			this.$el
				.addClass('es-nav-' + style)
				.css('transform-style', 'flat');
			this.$('.es-next').html(template.next);
			this.$('.es-prev').html(template.prev);
			this.listenTo(this.superView, 'ready', this.change);
			this.listenTo(this.superView.model, 'change:slides.active', this.change);
		},
		change: function () {
			var self = this;
			var next = this.superView.getNextSlide();
			var prev = this.superView.getPrevSlide();

			//new Promise(function( resolve, reject ) {
			//	if (next.thumbSource && prev.thumbSource)
			//	    resolve(next.thumbSource,prev.thumbSource);
			//	else {
			//		var content = self.$('.es-next div').length ? self.$('.es-next div') : self.$('.es-next');
			//		var width = content.width();
			//		var height = content.height();
			//
			//		$.getImageThumb(next.model.get('background.image.src'), width, height, function ( src1 ) {
			//			next.thumbSource = src1;
			//			$.getImageThumb(prev.model.get('background.image.src'), width, height, function ( src2 ) {
			//				prev.thumbSource = src2;
			//				resolve(src1,src2);
			//			})
			//		})
			//	}
			//})
			//	.then(function( nextSrc, prevSrc ) {
			//		self.$('.es-next img').attr('src', nextSrc);
			//		self.$('.es-prev img').attr('src', prevSrc);
			//	});
			this.$('.es-next .es-name').text(next.model.get('name') || '');
			this.$('.es-prev .es-name').text(prev.model.get('name') || '');
		}
	});

	var PaginationView = Backbone.CollectionView.extend({
		ready: function () {
			var enable = this.model.get('enable');
			if ( !enable || this.rootView.model.get('slides').length == 1 ) {
                return this.$el.parent().hide();
            }
			else if ( this.rootView.model.get('slides').where({hide: false}).length <= 1 ) {
                return this.$el.parent().hide();
            }

			var style = this.model.get('style');
			var size = this.model.get('size') || '';
			var border = this.model.get('border') || '';
			var spacing = this.model.get('spacing');
			this.$el.parent()
				.addClass('dotstyle dotstyle-' + style);
			this.$('li')
				.width(size)
				.height(size)
				.css('margin', '0 ' + (spacing / 2) + 'px');
		},
		itemView: View.extend({
			events: {
				'touchstart': function ( e ) {
					this.rootView.change(this.model.get('index'))
					e.preventDefault();
					e.stopPropagation();
				},
				'mousedown': function ( e ) {
					this.rootView.change(this.model.get('index'))
				}
			},
			modelEvents: {
				'change:active': 'setActive'
			},
			ready: function () {
				this.$('a').text(this.model.get('name') || this.$el.index() + 1)
				this.setActive();
                if( this.model.get('hide') )
                    this.$el.hide()
			},
			setActive: function () {
				if ( this.model.index() < this.superView.lastIndex )
					this.$el.attr('class', 'current-from-right');
				else
					this.$el.attr('class', '');

				this.delay(function () {
					if ( this.model.get('active') )
						this.$el.addClass('current');
					else
						this.$el.removeClass('current');
					this.superView.lastIndex = this.model.index();
				}, 25)
			}
		})
	});

	var ItemView = View.extend({
		constructor: function ES_ItemView( options ) {
			View.call(this, options)
			EasySlider.fonts.load(this.model.get('style.font.family'))
		},
		views: {
			'background model:style.background > .item-background': BackgroundView.extend()
		},
		bindings: [
			{
				type: 'class',
				attr: {
					'hidden': 'hidden',
				}
			},
			{
				type: 'style',
				attr: {
					'visibility': 'style.visible',
					'zIndex': 'index',
					'left': 'style.position.x',
					'top': 'style.position.y',
				},
				parse: function ( value, key ) {
					switch ( key ) {
						case 'visibility' :
							return value ? 'visible' : 'hidden';
						case 'left':
						case 'top':
							return value * 100 + '%';
						default :
							return value;
					}
				}
			},
			{
				type: 'attr',
				attr: {
					'id': 'attr.id',
					'class': 'attr.class',
				},
				parse: function (value, key, view) {
					switch (key) {
						case 'class':
							return view.$el.attr('class') + ' ' + value;
						default:
							return value;
					}
				}
			},
			{
				selector: '.item-offset',
				type: 'style',
				attr: {
					'transform': 'style.offset',
					'width': 'style.width',
					'height': 'style.height',
				},
				parse: function ( value, key ) {
					switch ( key ) {
						case 'transform':
							return 'translate3d(' + value.x + 'px,' + value.y + 'px,' + value.z + 'px)';
						default :
							return value;
					}
				}
			},
			{
				selector: '.item-container',
				type: 'style',
				attr: {
					'borderWidth': 'style.border.width',
					'borderStyle': 'style.border.style',
					'borderColor': 'style.border.color',
					'borderRadius': 'style.border.radius',
					'boxShadow': 'style.box_shadows',
				},
				parse: function ( value, key ) {
					if( value ) {
						switch ( key ) {
							case 'boxShadow':
								var html = '';
								if (value) {
									_(value).each(function(shadow, i){
										html += shadow.x + 'px ' + shadow.y + 'px ' + shadow.blur + 'px ' + shadow.color + (shadow.inset ? ' inset' : '') + (i == value.length - 1 ? '' : ', ') ;
									})
								}
								return html;
							default:
								return value;
						}
					}
				}
			},
			{
				selector: '.item-content',
				type: 'html',
				attr: 'content'
			},
			{
				selector: '.item-content',
				type: 'style',
				attr: {
					'color': 'style.font.color',
					'fontFamily': 'style.font.family',
					'fontSize': 'style.font.size',
					'fontWeight': 'style.font.weight',
					'fontStyle': 'style.font.style',
					'lineHeight': 'style.line_height',
					'letterSpacing': 'style.letter_spacing',
					'textDecoration': 'style.text_decoration',
					'paddingTop': 'style.padding.top',
					'paddingLeft': 'style.padding.left',
					'paddingRight': 'style.padding.right',
					'paddingBottom': 'style.padding.bottom',

					'textAlign': 'style.align_h',
					'textShadow': 'style.text_shadows',

					'alignItems': 'style.flex.alignItems',
					'alignContent': 'style.flex.alignContent',
					'justifyContent': 'style.flex.justifyContent',
					'flexDirection': 'style.flex.direction',
					'flexWrap': 'style.flex.wrap',
					'flexBasis': 'style.flex.basis',
					'flexGrow': 'style.flex.grow',
				},
				parse: function ( value, key ) {
					switch ( key ) {
						case 'fontSize':
							return value + 'px';
						case 'flexBasis':
							return value + 'px';
						case 'flexGrow':
							return value ? '1' : '0';
						case 'textShadow':
							var html = '';
							if (value) {
								_(value).each(function(shadow, i){
									html += shadow.x + 'px ' + shadow.y + 'px ' + shadow.blur + 'px ' + shadow.color + (shadow.inset ? ' inset' : '') + (i == value.length - 1 ? '' : ', ') ;
								})
							}
							return html;
						default :
							return value;
					}
				}
			}
		],
		events: {
			'click .item-container': function(e) {
				if (!this.isLinkedItem)
					return;
				var href = this.model.get('attr.href');
				if (href.indexOf('@') == 0) {
					this.rootView.change(parseInt(href))
				}
			}
		},
		initialize: function () {
			this.animStarted = false;
			this.animEnded = false;
		},
		ready: function () {
			this.slideView = this.superView.superView;
			this.background.isItem = true;

			if (this.model.get('attr.href')) {
				this.isLinkedItem = true;
				this.$el.addClass('es-linked-item');

				var href = this.model.get('attr.href');
				if (href.indexOf('@') != 0) {
					this.$('a.item-container')
							.attr('href', href)
							.attr('target', this.model.get('attr.target'));
				}
			}

			var sliderType = parseInt(this.model.root.get('layout.type'));
			var timelineMode = parseInt(this.model.root.get('timeline.mode'));

			this.__dataBinding.updateView();

			this.$animation = this.$('.item-animation')

			switch ( parseInt(this.model.get('animation.in.split')) ) {
				case 1:
					this.$inElements = this.$animation.find('.item-content > *');
					break;
				case 2:
					this.$inElements = this.$animation.find('.split-word');
					break;
				case 3:
					this.$inElements = this.$animation.find('.split-char');
					break;
				default:
					this.$inElements = this.$animation;
			}
			switch ( parseInt(this.model.get('animation.out.split')) ) {
				case 1:
					this.$outElements = this.$animation.find('.item-content > *');
					break;
				case 2:
					this.$outElements = this.$animation.find('.split-word');
					break;
				case 3:
					this.$outElements = this.$animation.find('.split-char');
					break;
				default:
					this.$outElements = this.$animation;
			}

			var tweenIn = this.model.get('animation.in').getTweenObj();
			var tweenOut = this.model.get('animation.out').getTweenObj();

			//switch (sliderType) {
			//	case 2:
			//		//if (timelineMode == 1)
			//		tweenIn.delay = 0;
			//		tweenOut.delay = 0;
			//		break;
			//}
			// If animation in has animation
			if (tweenIn.duration) {
				this.animation_in = ES_Timeline({ align: 'normal', paused: true })
					.staggerFrom(this.$inElements, this.model.get('animation.in.splitDelay'), tweenIn, { paused: true });
			}
			// If animation in doesn't have duration
			else {
				this.animation_in = ES_Tween.from(this.$inElements,  _.pick(tweenIn, 'duration','delay'), { paused: true });
				// In case this animation has delay, then opacity needs to be 0, if delay == 0 then leave opacity as default
				// which is 1 so the item appears with slide transition
				if (tweenIn.delay > 0) {
					this.animation_in.options.from.opacity = 0;
				}
			}
			if (tweenOut.duration) {
				this.animation_out = ES_Timeline({ align: 'normal ', paused: true })
					.staggerTo(this.$outElements, this.model.get('animation.out.splitDelay'), tweenOut, { paused: true });
			}
			else {
				this.animation_out = ES_Tween.to(this.$outElements, _.pick(tweenOut, 'duration','delay'), { paused: true });
			}
			this.animation = ES_Timeline({ align: 'normal', paused: true })
					.add(this.animation_in)
					.add(this.animation_out);
		},
		load: function () {
			if ( !this.loaded ) {
				this.loaded = true;
                if ( !this.background.model.get('video.youtubeID') && !this.background.model.get('video.vimeoID') && this.background.model.get('video.selector') == 'provider')
				    this.background.loadImage();
				this.background.loadVideo();
			}
		},
		prepare: function () {
			this.load();
			this.animation_in._render(0);
		},
		activate: function ( imediate ) {
			imediate ? this.animation.play() : this.animation.start();
		},
		deactivate: function () {
			//this.animation.stop();
		},
		renderAnimationAtTime: function ( time ) {
			this.animation._render(time);
			// Find out when this item animation in begins
			if ( typeof this.animation_in.tweens !== 'undefined' && !this.animStarted && time >= this.animation_in.tweens[ 0 ].delay + this.animation_in.tweens[ 0 ].duration ) {
				this.animStarted = true;
				this.trigger('start');
			}
			// Find out when this item animation out begins
			if ( typeof this.animation_out.tweens !== 'undefined' && !this.animEnded && time >= this.animation_out.tweens[ 0 ].delay + this.animation_out.tweens[ 0 ].duration ) {
				this.animEnded = true;
				this.trigger('end');
			}
		},
		resetAnimationFlags: function () {
			this.animStarted = false;
			this.animEnded = false;
		}
	});

	var ItemsView = Backbone.CollectionView.extend({
		constructor: function ES_ItemsView( options ) {
			Backbone.CollectionView.call(this, options)
		},
		itemView: ItemView
	});

	var SlideView = View.extend({
		events: {

		},
		views: {
			'items collection:items > .es-items': ItemsView,
			'background model:background > .slide-background': BackgroundView.extend(),
		},
		bindings: [
			{ type: 'class', attr: { 'es-active': 'active' } }
		],
		constructor: function ES_SlideView( options ) {
			View.call(this, options)
		},
		initialize: function () {
			this.index = this.model.get('index');
			this.duration = this.model.get('duration');
			this.totalDuration = this.model.get('totalDuration');

			this.on('all', function ( type ) {
				this.rootView.trigger.apply(this.rootView, _(arguments).chain().slice(1).splice(0, 0, ('slide(' + this.index + '):' + type), this).value());
				this.rootView.trigger.apply(this.rootView, _(arguments).chain().slice(1).splice(0, 0, ('slide:' + type), this).value());
			});
			this.on('activate', this.activate);
			this.on('deactivate', this.deactivate);

			this.on('end', this.onSlideEnd);
			this.on('start', this.onSlideStart);

			this.on('video:ended', this.onVideoEnded);
		},

		ready: function () {
			var timelineMode = parseInt(this.model.root.get('timeline.mode'));
			switch ( parseInt(this.model.root.get('layout.type')) ) {
				case 1:
					//if (timelineMode == 2)
					//	break;
					//var transitionDuration = this.model.get('transition.duration');
					//_.each(this.items.subViews, function (itemView) {
					//	itemView.animation.delay += transitionDuration;
					//});
					//break;
				case 2:

					this.on('transition:enter', this.renderTransitionEnter);
					this.on('transition:leave', this.renderTransitionLeave);
					this.on('transition', this.renderBasicTransition);

					//this.on('animation:start', this.renderAnimationStart);
					//this.on('animation:end', this.renderAnimationEnd);
					//this.on('animation', this.renderAnimation);

					this.renderTransitionLeave();

					break;
			}
		},
		load: function () {
			if ( !this.loaded ) {
				this.loaded = true;
                if ( !this.background.model.get('video.youtubeID') && !this.background.model.get('video.vimeoID') && this.background.model.get('video.selector') == 'provider')
                    this.background.loadImage();
				this.background.loadVideo();
				this.rootView.getNextSlide(this.index).load();
				this.rootView.getPrevSlide(this.index).load();
				_.invoke(this.items.subViews, 'load');
			}
			this.background.$video && this.background.$video.get(0).play();
			//this.background.resizeVideo();
		},
		prepare: function () {
			this.show();
			this.load();
			_.invoke(this.items.subViews, 'prepare');
			return this;
		},
		isActive: function () {
			return this.rootView.getActiveSlide() === this;
		},
		onVideoEnded: function () {
			this.slideHasEnded &&
			!this.hasVideoPlaying() &&
			this.rootView.next();
		},
		hasVideoPlaying: function() {
			return this.countPlayingVideo() != 0;
		},
		countPlayingVideo: function() {
			return _.reduce(this.items.subViews, function(count, item) {
				if (item.background.videoPlaying)
					count++;
				return count;
			}, 0);
		},
		stopAllVideos: function () {
			_(this.items.subViews).each(function ( item ) {
				item.background.stopVideo();
			});
		},
		playAllVideos: function () {
            this.background.playVideo();
		},

		onSlideEnd: function () {
			log('slide end')
			_(this.items.subViews).invoke('resetAnimationFlags');
			// Check if slider type is carousel, trigger end for all items
			if ( this.rootView.model.get('layout.type') == ES_SLIDER_TYPE_CAROUSEL ) {
				_(this.items.subViews).invoke('trigger', 'end');
				this.stopAllVideos();
			}
		},
		onSlideStart: function () {
			this.slideHasEnded = false;
			log('slide start')
			// Check if slider type is carousel, trigger start for all items
			if ( this.rootView.model.get('layout.type') == ES_SLIDER_TYPE_CAROUSEL ) {
				_(this.items.subViews).invoke('trigger', 'start');
			}
            this.playAllVideos();
		},

		activate: function () {
			if ( this.activated )
				return this;
			log('activate');
			this.activated = true;
			_.invoke(this.items.subViews, 'activate');
			return this;
		},
		deactivate: function () {
			if ( !this.activated )
				return this;
			log('deactivate');
			this.activated = false;
			_.invoke(this.items.subViews, 'deactivate');
			this.hide();
			return this;
		},

		renderTransitionEnter: function () {
			this.background.resizeVideo()
            this.prepare();

		},
		renderTransitionLeave: function () {
			log('slide leave')
			_.chain(this.items.subViews)
					.pluck('animation_out')
					.invoke('end');
			typeof this.rootView.activeIndex != 'undefined' &&
			this.rootView.getActiveSlide().trigger('start')
			this.trigger('end')
		},
		renderBasicTransition: function ( direction, side, progress ) {
			switch ( side ) {
				case 'right':
					_.each(this.items.subViews, function ( itemView ) {
						itemView.animation_in.seekPercent(1 - progress);
					}, this);
					break;
				case 'left':
					_.each(this.items.subViews, function ( itemView ) {
						itemView.animation_out.seekPercent(progress);
					}, this);
					break;
			}
		},
		renderTransition: function ( direction, side, progress ) {
			this.rootView.setProgress(progress * 100);
			switch ( side ) {
				case 'right':
					var time = (1 - progress) * 1000;
					_.each(this.items.subViews, function ( itemView ) {
						if ( itemView.animation_in.delay < 1000 )
							itemView.animation_in._render(time);
					}, this);
					break;
				case 'left':
					var time = progress * 1000 + this.duration + 1000;
					_.each(this.items.subViews, function ( itemView ) {
						if ( itemView.animation_out.delay + itemView.animation_out.duration > this.duration + 1000 )
							itemView.animation_out._render(time);
					}, this);
					break;
			}
		},

		renderAnimationStart: function () {
			this.load();
			_.each(this.items.subViews, function ( itemView ) {
				if ( itemView.animation_in.delay >= 1000 ) {
					itemView.animation_in._render(0)
				}
			}, this)
		},
		renderAnimationEnd: function () {
			_.each(this.items.subViews, function ( itemView ) {
				if ( itemView.animation_out.delay <= this.duration + 1000 ) {
					itemView.animation_out._render(this.duration + 2000)
				}
			}, this)
		},
		renderAnimation: function ( progress ) {
			var time = progress * this.duration;
			this.rootView.setProgress(progress * 100);
			_.each(this.items.subViews, function ( itemView ) {
				itemView.renderAnimationAtTime(time);
			}, this)
		},

		isOnViewport: function () {
			var vp_bounds = this.rootView.$viewport.get(0).getBoundingClientRect()
			var sl_bounds = this.el.getBoundingClientRect();
			return sl_bounds.right > vp_bounds.left || sl_bounds.left < vp_bounds.right;
		},
	});

	var SlidesView = Backbone.CollectionView.extend({
		constructor: function ES_SlidesView( options ) {
			Backbone.CollectionView.call(this, options)
		},
		itemView: SlideView
	});

	var SliderView = View.extend({
		constructor: function ES_SliderView( options ) {
            options.model.get('slides').reset( options.model.get('slides').filter(function(model){
                return model.get('hide') == false;
            }) );

			View.call(this, options)

			if ( options.rootURL ) {
				this.rootURL = options.rootURL;
			}

			return this
		},

		events: {
			//'touchstart .es-next': 'next',
			//'touchstart .es-prev': 'prev',
			'mousedown .es-next': 'next',
			'mousedown .es-prev': 'prev',
		},
		modelEvents: {
			'change:state.view_mode': 'changeLayoutMode'
		},

		views: {
			'slides collection:slides > .es-slides': SlidesView,
			'items collection:items > .es-global .es-items': ItemsView.extend({ itemView: ItemView.extend() }),
			'background model:background > .slider-background': BackgroundView.extend(),
		},
		bindings: [
			{
				type: 'style',
				attr: {
					'marginTop': 'style.margin.top',
					'marginBottom': 'style.margin.bottom',
					'marginLeft': 'style.margin.left',
					'marginRight': 'style.margin.right',
				},
			}
		],

		initialize: function () {

			var self = this;
			_(this).bindAll('resize', 'update', 'change', 'next', 'prev', 'pause', 'resume');

			sliders[ this.model.get('id') ] = this;

			var css = _(this.model.get('custom_css')).prefixCSSRules('#' + this.$el.attr('id'));
			this.$el.before($('<style>').html(css));

			this.$('.es-nav.es-nav-buttons').each(function () {
				self.attachView(NavView.extend(), this, { model: self.model.get('nav') })
			});
			this.$('.es-pagination').each(function () {
				self.attachView(PaginationView.extend(), this, {
					collection: self.model.get('slides'),
					model: self.model.get('pagination')
				})
			});

			this.on('next', function () {
				this.change(this.getOffsetIndex(1), 'next');
			})
			this.on('prev', function () {
				this.change(this.getOffsetIndex(-1), 'prev');
			})
		},
		ready: function () {

			this.setActiveSlide(0);

			this.$items = this.$('.es-item');
			this.$slides = this.$('.es-slides > .es-slide');
			this.$wrapper = this.$('.es-slides');
			this.$global = this.$('.es-global');
			this.$stage = this.$('.es-stage');
			this.$viewport = this.$('.es-viewport');
			this.$background = this.$('.slider-background');
			this.$progress = this.$('.es-slide-progress-bar');

			switch ( parseInt(this.model.get('layout.type')) ) {

				case 1: // Standard slider with no drag drop interaction
					this.controller = new ES_Standard_Controller(this);
					break;

				case 2: // Interactive slider
					this.controller = new ES_Interactive_Controller(this);
					break;
			}

			$(window)
				.on('resize', this.resize)
				.on('orientation', this.resize)
				.on('load', this.resize)
				//.on('blur', this.pause)
				//.on('focus', this.resume);

			this.defer(function () {

				Function('$', 'slider', 'slide', 'item', this.model.get('custom_js'))
					.call(this, $, this.slider, this.slide, this.item)

				_.each(this.items.subViews, function ( itemView ) {
					itemView.animation.start();
				});

				this.background.loadImage();
				this.slides.subViews[ 0 ].load();
				this.resize();

				this.trigger('change', 0);
				this.trigger('ready');
			})
		},
		resize: function () {
			var mode = this.getResponsiveMode();
			var padding = parseFloat(this.model.get('layout.padding'));
			var width = this.width = parseFloat(this.model.get('layout.' + mode + '_w'));
			var height = this.height = parseFloat(this.model.get('layout.' + mode + '_h'));

			var auto_width = this.model.get('layout.auto_w');
			var auto_height = this.model.get('layout.auto_h');
			var full_width = this.model.get('layout.full_w');
			var full_height = this.model.get('layout.full_h');
			var offset_left = 0;

			var outer_width = this.outer_width = this.$el.width();

			if ( full_width ) {
				var offset_left = -this.$el.offset().left;
				outer_width = this.outer_width = document.body.offsetWidth;
			}
			if ( full_height )
				this.$el.height(window.innerHeight)
			else if ( !auto_height )
				this.$el.height(height)

			var outer_height = this.outer_height = this.$el.outerHeight();

			var outerRatio = outer_width / outer_height;
			var ratio = width / height;
			var scale_factor = Math.min(1, // Maximnun scale 1x
				ratio >= outerRatio ?
				outer_width / width : // Bigger than container horizontally
				outer_height / height); // Bigger than container vertically

			var scale_width = this.width = width * scale_factor;
			var scale_height = this.height = height * scale_factor;

			var stage_width = this.stage_width = auto_width ? outer_width : scale_width;
			var stage_height = this.stage_height = auto_height ? outer_height : scale_height;

			var scale_padding = padding * 2 * scale_factor;

			//if (stage_width + padding > outer_width)
			//	stage_width = outer_width - padding;

			this.setPerspective(stage_width * 2);
			this.$el.css({
				marginTop: padding,
				marginBottom: padding,
				height: full_height || auto_height ? outer_height : scale_height + (padding)
			})
			this.$viewport.css({
				width: outer_width,
				marginTop: -padding,
				marginBottom: -padding,
				paddingTop: padding,
				paddingBottom: padding,
				marginLeft: offset_left + 'px',
				marginRight: offset_left + 'px',
			})
			this.$stage
				.css({
					width: stage_width,
					height: stage_height,
					marginLeft: Math.floor(stage_width / -2),
					marginTop: Math.floor(stage_height / -2),
				})
			this.$items.css({
				transform: 'scale3d(' + scale_factor + ',' + scale_factor + ',' + scale_factor + ')'
			})

			this.trigger('resize');
			this.update();
		},

		update: function () {
			_(this.slides.subViews).each(function ( slide ) {
                if( !slide.model.get('hide') ) {
                    _(slide.items.subViews).each(function ( item ) {
                        item.__dataBinding.updateView();
                    })
                }
			})
			_(this.items.subViews).each(function ( item ) {
				item.__dataBinding.updateView();
			})
		},

		change: function ( index, direction ) {
			this.getActiveSlide().trigger('end');
			this.trigger('change', index, direction);
			this.getSlideAt(index).trigger('start');
		},
		next: function ( e ) {
			// If this function is called by mouse click
			// force next slide
			if ( e ) {
				e.preventDefault();
				e.stopPropagation();
				this.getActiveSlide().stopAllVideos();
				this.trigger('next');
			}
			// If this function is called by controllers when slide timer ends
			// Check if any video playing, if not then proceed
			else {

				if (  this.model.get('autoSlide') && this.model.get('autoSlide.enable') ) {
					if ( this.model.get('repeat') && !this.model.get('repeat.enable') ) {
						if ( this.getNextIndex() == 0 && this.model.get('layout.type') == 1 ) {
							this.trigger('pause:transition');
						}
						else {
							this.getActiveSlide().slideHasEnded = true;
							if (!this.getActiveSlide().hasVideoPlaying()) {
								this.trigger('next');
							}
						}
					}
					else {
						this.getActiveSlide().slideHasEnded = true;
						if (!this.getActiveSlide().hasVideoPlaying()) {
							this.trigger('next');
						}
					}
				}
				else {
					// nothing
				}
			}
		},
		prev: function ( e ) {
			if ( e ) {
				e.preventDefault();
				e.stopPropagation();
			}
			this.trigger('prev');
		},
		pause: function ( e ) {
			this.trigger('pause');
		},
		resume: function ( e ) {
			this.trigger('resume');
		},

		slider: function ( id ) {
			return sliders[ id ];
		},

		setProgress: function ( percent ) {
			this.$progress.css({ width: percent + '%' });
			return this;
		},

		getResponsiveMode: function () {
			var full_width = this.model.get('layout.full_w');
			var width = this.outer_width || (full_width ? document.body.offsetWidth : this.$el.width());

			if ( this.model.get('layout.mobile') && width <= this.model.get('layout.mobile_under') ) {
				this.model.set('state.view_mode', 'mobile');
				return 'mobile';
			}

			if ( this.model.get('layout.tablet') && width <= this.model.get('layout.tablet_under') ) {
				this.model.set('state.view_mode', 'tablet');
				return 'tablet';
			}

			if ( this.model.get('layout.laptop') && width <= this.model.get('layout.laptop_under') ) {
				this.model.set('state.view_mode', 'laptop');
				return 'laptop';
			}

			this.model.set('state.view_mode', 'desktop');
			return 'desktop';
		},
		setPerspective: function ( distance ) {
			this.$viewport.css('perspective', distance + 'px')
		},

		getOffsetIndex: function ( offset, from ) {
			return this.slides.collection.offsetIndex(offset, from);
		},
		getNextIndex: function ( offset, from ) {
			return this.slides.collection.nextIndex(offset, from);
		},
		getPrevIndex: function ( offset, from ) {
			return this.slides.collection.prevIndex(offset, from);
		},
		getOffsetSlide: function ( offset, from ) {
			return this.getSlideAt(this.getOffsetIndex(offset, from))
		},
		getNextSlide: function ( offset, from ) {
            return this.getSlideAt(this.getNextIndex(offset, from));
		},
		getPrevSlide: function ( offset, from ) {
			return this.getSlideAt(this.getPrevIndex(offset, from));
		},
		getSlideAt: function ( index ) {
			return this.slides.subViews[ index ];
		},
		getActiveSlide: function () {
			return this.getSlideAt(this.activeIndex);
		},
		setActiveSlide: function ( index ) {
			this.activeIndex = !_.isNaN(index) ? index : this.activeIndex;
			this.activeSlide = this.getSlideAt(this.activeIndex);
			this.activeSlide.model.set('active', true);
			return this.activeSlide;
		},

		changeLayoutMode: function () {
			this.$el.trigger('es:update_layout');
		},
		clickNextBtn: function () {
			this.$el.trigger('es:next')
		},
		clickPrevBtn: function () {
			this.$el.trigger('es:prev')
		},

	}, {

		counter: 0,
		fonts: new ES_Fonts,
		getSliderById: function ( id ) {

		}

	});

	exports.EasySlider = SliderView;

	$.getScript('https://www.youtube.com/iframe_api');

	setTimeout(function checkYT() {
		if ( typeof exports.YT == 'undefined' )
			return setTimeout(checkYT, 1000);
		YT_API_LOADED = true;
	}, 1000);

	function roundNumber( n, closest ) {
		_.isUndefined(closest) && (closest = 1);
		return Math.round(n / closest) * closest;
	}

}(this, jQuery, _, JSNES_Backbone)