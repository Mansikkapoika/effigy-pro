EasyBlog.module("composer/document/toolbar", function($){

    var module = this;

    EasyBlog.Controller("Composer.Document.Toolbar", {
        elements: [
            "[data-eb-composer-{add-block-button|add-media-button|add-post-button|show-drawer-button}]",
            "[data-eb-composer-{mobile-blip}]"
        ],
        defaultOptions: {
        }
    }, function(self, opts, base, composer) { return {

        init: function() {
            composer = self.document.composer;
        },

        activate: function() {
            self.mobileBlip().addClass('show-menu');
        },

        deactivate: function() {
            self.mobileBlip().removeClass('show-menu');
        },

        isActive: function() {
            return self.mobileBlip().hasClass('show-menu');
        },

        "{mobileBlip} click": function(mobileBlip, event) {
            
            if (self.isActive()) {
                self.deactivate();
                return;
            }

            self.activate();
        },

        "{addBlockButton} click": function() {
            self.deactivate();

            composer.views.show("blocks");
        },

        "{addMediaButton} click": function() {
            self.deactivate();

            composer.views.show("media");
        },

        "{addPostButton} click": function() {
            self.deactivate();

            composer.views.show("posts");
        },

        "{showDrawerButton} click": function() {
           $('[data-eb-composer-frame]').toggleClass('show-drawer');
        }

    }});

    module.resolve();

});
