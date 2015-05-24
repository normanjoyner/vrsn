var fs = require("fs");
var _ = require("lodash");
var async = require("async");
var path = require("path")
var git = require("gift");

var languages = {};
var available_languages = fs.readdirSync([__dirname, "..", "languages"].join("/"));
_.each(available_languages, function(language){
    var Language = require([__dirname, "..", "languages", language].join("/"));
    var language_name = path.basename(language, ".js");
    languages[language_name] = new Language();
});

module.exports = {

    detect_language: function(fn){
        var self = this;

        var functions = {};
        _.each(languages, function(language, name){
            functions[name] = function(fn){
                language.exists(fn);
            }
        });

        async.parallel(functions, function(err, results){
            var language;

            _.each(results, function(exists, name){
                if(exists)
                    self.language = languages[name];
            });

            if(process.env.VRSN_LANG && _.has(languages, process.env.VRSN_LANG))
                self.language = languages[process.env.VRSN_LANG];

            return fn(self.language);
        });
    },

    git: {
        initialize: function(){
            try{
                this.repository = git(process.cwd());
            }
            catch(e){}
        },

        commit: function(version, fn){
            if(_.isUndefined(this.repository))
                return fn();

            this.repository.commit(["Updating to version", version].join(" "), { all: true }, fn);
        },

        tag: function(version, fn){
            if(_.isUndefined(this.repository))
                return fn();

            this.repository.create_tag(version, fn);
        },

        delete_tag: function(version, fn){
            if(_.isUndefined(this.repository))
                return fn();

            this.repository.delete_tag(version, fn);
        }
    }

}
