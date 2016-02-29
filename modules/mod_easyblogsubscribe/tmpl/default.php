<?php
/**
* @package		EasyBlog
* @copyright	Copyright (C) 2010 - 2015 Stack Ideas Sdn Bhd. All rights reserved.
* @license		GNU/GPL, see LICENSE.php
* EasyBlog is free software. This version may have been modified pursuant
* to the GNU General Public License, and as distributed it includes or
* is derivative of works licensed under the GNU General Public License or
* other free or open source software licenses.
* See COPYRIGHT.php for copyright notices and details.
*/
defined('_JEXEC') or die('Restricted access');
?>
<div id="fd" class="eb eb-mod mod_easyblogsubscribe<?php echo $params->get('moduleclass_sfx'); ?>">
<?php if ($params->get('type' , 'link') == 'link') { ?>
	<a href="javascript:void(0);" data-blog-subscribe data-type="site" class="btn btn-primary btn-block"><?php echo JText::_('MOD_SUBSCRIBE_MESSAGE');?></a>
<?php } else { ?>
	<script type="text/javascript">
	EasyBlog.ready(function($){

		$('[data-subscribe-link]').on("click", function() {
			var type = "site",
				fullname = $("#fullname").val();
				email = $("#email").val();

			EasyBlog.dialog({
				content: EasyBlog.ajax('site/views/subscription/subscribe', {"type":"site", "name": fullname, "email": email})
			});

		});

	});
	</script>
	<form name="subscribe-blog" id="subscribe-blog-module" method="post" class="eb-mod-form">
		<div class="eb-mod-form-item form-group">
			<label>
				<?php echo JText::_('MOD_EASYBLOGSUBSCRIBE_YOUR_NAME'); ?>
			</label>
			<input type="text" name="esfullname" class="form-control" id="fullname"/>
		</div>
		<div class="eb-mod-form-item form-group">
			<label>
				<?php echo JText::_('MOD_EASYBLOGSUBSCRIBE_YOUR_EMAIL'); ?>
			</label>
			<input type="text" name="email" class="form-control" id="email"/>
		</div>
		<div class="eb-mod-form-action">
			<a href="javascript:void(0);" class="btn btn-primary" data-subscribe-link><?php echo JText::_('MOD_EASYBLOGSUBSCRIBE_SUBSCRIBE_BUTTON');?></a>
		</div>
	</form>
<?php } ?>
</div>
