/**
 * @version     $Id$
 * @package     JSNExtension
 * @subpackage  JSNTPLFramework
 * @author      JoomlaShine Team <support@joomlashine.com>
 * @copyright   Copyright (C) 2015 JoomlaShine.com. All Rights Reserved.
 * @license     GNU/GPL v2 or later http://www.gnu.org/licenses/gpl-2.0.html
 *
 * Websites: http://www.joomlashine.com
 * Technical Support:  Feedback - http://www.joomlashine.com/contact-us/get-support.html
 */

(function($) {
	$.JSNTplMegaMenu = function(params) {
		// Initialize parameters
		this.params = $.extend({}, params);

		// Initialize functionality
		$(document).ready($.proxy(this.init(), this));
	};

	$.JSNTplMegaMenu.prototype = {
		init : function() {
			
			if ($('#jsn-tpl-edition').val() == 'free')
			{
				$('#jsn-megamenu-builder').hide();
				$('#jsn_menutype').attr('disabled', 'disabled');
				$('#jsn_menutype').parent().parent().hide();
				return false;
			}	
			this.enableMegamenu = $("input[name='jsn[enableMegamenu]']");
			
			this.enableMegamenu.on('change', function(e){
				
				var el = $(e.target)
				
				if (!el.is(':checked')) return;
				
				if (el.val() == 1)
				{
					$('#jsn-megamenu-builder').show();					
					$('#jsn_menutype').parent().parent().show();
					$(document).trigger('resize');
				}	
				else
				{
					$('#jsn-megamenu-builder').hide();
					$('#jsn_menutype').parent().parent().hide();
				}	
			});
			this.enableMegamenu.trigger('change');
			
			var toolbar = $('#toolbar');
			this.megamenuContainer = $('#jsn-megamenu-builder');
			var layout = null;
			var self = this;			
			var saveMegamenuBtn = $("<div/>", {"class": "btn-wrapper", "id": 'toolbar-jsn-tpl-save-megamenu'});
			saveMegamenuBtn.append( $("<button/>", {"class": "btn btn-small btn-success", "id": 'jsn-tpl-save-megamenu-btn'}).html('<span class="icon-apply icon-white"></span>Save Megamenu'))
			toolbar.append(saveMegamenuBtn);
			saveMegamenuBtn.hide();
			$('#jsn-main-nav').find('li').click(function(e) {		
				
					if ($(this).attr('aria-controls') == 'jsn-megamenu')
					{
						self.renderMenu();
						$('#toolbar-apply', toolbar).hide();
						$('#toolbar-save', toolbar).hide();
						$('#toolbar-save-copy', toolbar).hide();
						saveMegamenuBtn.show();
					}
					else
					{
						$('#toolbar-apply', toolbar).show();
						$('#toolbar-save', toolbar).show();
						$('#toolbar-save-copy', toolbar).show();
						saveMegamenuBtn.hide();
					}

			});
			
			$('#jsn_menutype').change(function(e) {
				//$('#jsn-megamenu-builder').addClass('jsn-megamenu-loading');
				
				self.renderMenu();
			})
			
			$('#jsn-tpl-save-megamenu-btn').click(function(e) {
				e.preventDefault();
				self.getOverlay().show();
				self.saveMegamenuSettings(function(){
					
					Joomla.submitbutton('style.apply');
				})
				//Joomla.submitbutton('style.apply');
			})
			//self.addRow(self, self.wrapper);
		},
		
		renderMenu: function() {
			var self = this;
			var menuType = $('option:selected', $('#jsn_menutype')).val();
			
			if (typeof menuType == 'undefined')
			{
				return false;
			}	
			var lang = $('option:selected', $('#jsn_menutype')).attr('data-language');
			$('#jsn-tpl-mm-top-level-menu-container').html('');
			
			self.getOverlay().show();
			$.ajax({
				type: 'GET',
				dataType: 'html',
				url: 'index.php?widget=megamenu&action=render-menu&menutype=' + menuType + '&lang=' + lang + '&rformat=raw&template=' + self.params.template + '&style_id=' + self.params.styleId,
				success: function (response) {
					
					$('#jsn-tpl-mm-top-level-menu-container').html(response);
					$('#jsn_tpl_mm_selected_menu_type').val(menuType);
					self.bindEventMenuItem();
					if($('#jsn-tpl-mm-top-level-menu').length)
					{	
						$("#megamenu-setting-container").show();
						$("#jsn-mm-form-msg-no-menu-item").hide();
						$('#jsn-tpl-mm-top-level-menu li').first().click();
					}
					else
					{
						$("#megamenu-setting-container").hide();
						$("#jsn-mm-form-msg-no-menu-item").show();
					}	
					//$('#jsn-megamenu-builder').removeClass('jsn-megamenu-loading');
					//self.getOverlay().hide();
				}
			});
		},
		
		bindEventMenuItem: function() {
			var self = this;
			
			if ($('#jsn-tpl-mm-top-level-menu li').length <= 0)
			{
				self.getOverlay().hide();
				return false;
			}
			
			$('#jsn-tpl-mm-top-level-menu li').bind('click', function (e) {
				e.preventDefault();
				
				if ($(this).hasClass('active')) 
				{
					return;
				}
		
				var menuType = $('option:selected', $('#jsn_menutype')).val();
				var menuItemID = $(this).attr('data-id');

				var isMega = $('#jsn-tpl-is-mega', this.megamenuContainer);
				if (self.saveMegamenuSettings())
				{
					$('#jsn_tpl_mm_selected_menu_id').val(menuItemID);
					
					if ($('#jsn-tpl-is-mega-' + menuItemID).val() == 'true') 
	                {
	                    isMega.val('true');
	                } 
	                else 
	                {
	                	isMega.val('false');
	                }
	                
	                $(this).siblings().attr('class', 'top-level-item inactive').end().toggleClass('top-level-item inactive top-level-item active');	
	                
					var lis = $(this).closest('#jsn-tpl-mm-top-level-menu');
					
	                var btnMenuItem = lis.find('.btn-menu-setting-popover');
	                
	                btnMenuItem.addClass('hidden');
	                $('.top-level-item .popover').hide();
	              
	                var menuSettingPopover = $(this).find('.btn-menu-setting-popover');
	                var settingMenuItem =$(this).find('.setting-menu-item');
	                
	                settingMenuItem.unbind('jsn-mm-switch').bind('jsn-mm-switch', function () {
	
	                    var content = settingMenuItem.find('.popover-content');
	
	                    if (!$('.btn-toggle .btn.on.active', settingMenuItem).size() > 0) 
	                    {
	                    	isMega.val('false');
	                    } 
	                    else 
	                    {
	                    	isMega.val('true');
	                    }

	                    $(document).trigger('resize');
	                });
	                
	                settingMenuItem.trigger('jsn-mm-switch');
	                
                    $('.btn-toggle', settingMenuItem).unbind('click').bind('click', function (e) {

                        e.preventDefault();
                        $(this).find('.btn').toggleClass('active');
                        $(this).find('.btn.off').toggleClass('btn-danger');
                        $(this).find('.btn.on').toggleClass('btn-success');
                        $(this).find('.btn').toggleClass('btn-default');

                        settingMenuItem.trigger('jsn-mm-switch');

                    });
                    
	                menuSettingPopover.removeClass('hidden');
	                menuSettingPopover.unbind('click').bind('click', function (e) {
	                    e.preventDefault();
	                    var $this = $(this);
	                    settingMenuItem.first().toggle(5, function() {
	                        $(this).on('click' ,function(e) {
	                            e.stopPropagation();
	                        });
	
	                        $('body').bind('click', function (e) {
	                            var el = $(e.target);
	                            if (el.hasClass('icon-cog') || el.hasClass('btn-menu-setting-popover')) {
	
	                            } else {
	                            	settingMenuItem.hide();
	                            }
	                        });
	                    });
	
	                });                
					//$(document).trigger('resize');
					
					self.initLayoutBuilder(menuType, menuItemID);
					
					self.initMenuItemSetting($(this).find('.setting-menu-item'));
					//self.loadLayoutData(self.layout);
				}
			});
		},
		
		initLayoutBuilder: function(menuType, menuItemID) {
			var self = this;
            if (self.layout == null) 
            {          	
            	self.layout = new $.JSNMMLayoutCustomizer();          	
            	self.layout.init($(".jsn-mm-form-container.jsn-layout .jsn-row-container"));
            }
            self.getOverlay().show();
			$.ajax({
				type: 'GET',
				dataType: 'html',
				url: 'index.php?widget=megamenu&action=get-megamenu-layout&menutype=' + menuType + '&rformat=raw&template=' + self.params.template + '&menu_id=' + menuItemID + '&style_id=' + self.params.styleId,
				success: function (html) 
				{
					
					var htmlTemp = (html.trim() != '') ? html.trim() : $("#tmpl-jsn_tpl_mm_row").html();
					
					self.loadLayoutData(htmlTemp, function(){
						
						self.layout.fnReset(self.layout, true);
						self.layout.moveItemDisable(self.layout.wrapper);
						self.layout.rebuildSortable();
					});
					self.getOverlay().hide();
				}
			});
    			
		},
		
		initMenuItemSetting: function(container) {
			
            var fullWidth = $('#full_width', container),
            containerWidthObj = $('#container_width', container),
            formDesignContent = $('#jsn-mm-form-design-content'),
            fullWidthValue = $('#full_width_value', container);

            containerWidthObj.bind('change', function () {

                if ($(this).val() == '' || $(this).val() == 0) 
                {
                	formDesignContent.css('width', '100%');
                } 
                else 
                {
                	formDesignContent.css('width', $(this).val());
                }

                $(document).trigger('resize');
            });
            
            formDesignContent.removeAttr('style', '');
            
            if (fullWidthValue.val() == '1') 
            {
            	containerWidthObj.parent().parent().addClass('hidden');
            	formDesignContent.css('width', '100%');
            	formDesignContent.removeAttr('class');
                $(document).trigger('resize');
            } 
            else 
            {
            	containerWidthObj.parent().parent().removeClass('hidden');
                if (containerWidthObj.val() != '') 
                {
                	formDesignContent.css('width', containerWidthObj.val());
                    $(document).trigger('resize');
                }
            }  
            
            $('#container_group', container).unbind('click').bind('click', function (e) {

                e.preventDefault();
                var fullWidthValue = $('#full_width_value', container);
                var containerWidth = containerWidthObj.parent().parent();
                $(this).find('.btn').toggleClass('active');

                if ($(this).find('#full_width').hasClass('active')) {
                	//containerWidthObj.attr('disabled', true);
                	formDesignContent.css('width', '100%');
                    containerWidth.addClass('hidden');
                    $(document).trigger('resize');
                    fullWidthValue.val(1);
                } else {
                	containerWidth.removeClass('hidden');
                	//containerWidthObj.attr('disabled', false);
                	containerWidthObj.trigger('change');
                    fullWidthValue.val(0);
                }

            });
		},
		
		loadLayoutData: function (htmlTemp, call)
		{
			//var htmlTemp = $("#tmpl-jsn_tpl_mm_row").html();
        	$("#jsn-mm-add-container").prevAll().remove();
        	
        	htmlTemp = jsn_mm_add_placeholder(htmlTemp, '&lt;', 'wrapper_append', '&{0}lt;');
        	htmlTemp = jsn_mm_add_placeholder(htmlTemp, '&gt;', 'wrapper_append', '&{0}gt;');
            $(".jsn-mm-form-container").prepend(htmlTemp);
            $(".jsn-mm-form-container").html(jsn_mm_remove_placeholder($(".jsn-mm-form-container").html(), 'wrapper_append', ''));
            if (call != null) {
                call();
            }
            $(".jsn-mm-form-container").animate({
                'opacity': 1
            }, 200, 'easeOutCubic');
            
       	
		},
		saveMegamenuSettings: function(callback) 
		{
			var self = this;
			var selected = $('.top-level-item.active');
			
			if (selected.size() > 0) 
			{
				var data = this.getSelectedItemOptions(selected);
				
				$.ajax({
					type: 'POST',
					dataType: 'JSON',
					data   : data,
					url: 'index.php?widget=megamenu&action=save-megamenu-data&template=' + self.params.template,
					success: function (response) {
						if (callback != null) {
                            callback();
                        }
					}
				});
			}
			else
			{
				self.getOverlay().hide();
			}	
			
			return true;
		},
		getSelectedItemOptions: function(item) {
			var self = this;

			var settingsMenuItem = $('input', item).serialize();
			var menuType = $('#jsn_tpl_mm_selected_menu_type').val();
			var shortcodeContent = '';
			var isMega = $('#jsn-tpl-is-mega').val();
			var menuId = $('#jsn_tpl_mm_selected_menu_id').val()
	        $('[name="shortcode_content[]"]').each(function () {
                shortcodeContent += $(this).val();
            });
	        
	        var data = {};
	        data.menu_type = menuType;
	        data.shortcode_content = encodeURIComponent(shortcodeContent);
	        data.is_mega = isMega;
	        data.setting_menu_item = settingsMenuItem;
	        data.style_id = self.params.styleId;
	        data.menu_id = menuId;
	        return data;
		},
		
        getOverlay: function()
        {
            if (!$('.jsn-modal-overlay').length) {
                $("body").append($("<div/>", {
                    "class":"jsn-modal-overlay",
                    "style":"z-index: 1000; display: inline;"
                })).append($("<div/>", {
                    "class":"jsn-modal-indicator",
                    "style":"display:block"
                })).addClass("jsn-loading-page");
                
            }
            return $('.jsn-modal-overlay, .jsn-modal-indicator');
        }
		
	};
})(jQuery);
