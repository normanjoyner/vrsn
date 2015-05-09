var _ = require("lodash");
var git = require("nodegit");
var nomnom = require("nomnom");
var async = require("async");
var pkg = require([__dirname, "package"].join("/"));
var utils = require([__dirname, "lib", "utils"].join("/"));
var logger = require([__dirname, "lib", "logger"].join("/"));

utils.detect_language(function(language){
    if(_.isUndefined(language)){
        logger.error("Unable to detect language ... exiting!");
        process.exit(1);
    }

    var options = nomnom.script(pkg.name).options(_.merge({
        level: {
            position: 0,
            help: "Level to bump version [major | minor | patch | pre]",
            choices: ["major", "minor", "patch", "pre"],
            default: "patch"
        },

        "prerelease-identifier": {
            help: "Identifier appened to version for prerelase builds",
            choices: ["alpha", "beta", "rc"],
            default: "rc"
        },

        "tag": {
            help: "Create a git tag for this release",
            flag: true,
            default: true
        }
    }, language.options)).parse();

    language.configuration = options;

    utils.git.initialize();

    var on_error = function(err){
        logger.error(err.message);
        language.restore_version(function(err){
            if(err)
                logger.error(["Error rolling back to version", language.version.original].join(" "));
            else
                logger.warn(["Successfully rolled back to version", language.version.original].join(" "));

            logger.error(["Failed to update to version", language.version.new].join(" "));
            process.exit(1);
        })
    }

    async.series({
        update_version: function(fn){
            language.update_version(fn);
        },

        post_update: function(fn){
            language.post_update(function(err, messages){
                if(err)
                    return fn(err);
                else{
                    _.each(messages, function(message){
                        logger.info(message);
                    });
                    return fn();
                }
            });
        },

        commit: function(fn){
            utils.git.commit(language.version.new, function(err){
                if(err)
                    return fn(err);
                else{
                    logger.info("Committed changes!");
                    return fn();
                }
            });
        },

        post_commit: function(fn){
            language.post_commit(function(err, messages){
                if(err)
                    return fn(err);
                else{
                    _.each(messages, function(message){
                        logger.info(message);
                    });
                    return fn();
                }
            });
        },

        tag: function(fn){
            if(options.tag){
                utils.git.tag(language.version.new, function(err){
                    if(err)
                        return fn(err);
                    else{
                        logger.info(["Created git tag", language.version.new].join(" "));
                        return fn();
                    }
                });
            }
            else{
                return fn();
            }
        },

        post_tag: function(fn){
            language.post_tag(function(err, messages){
                if(err)
                    return fn(err);
                else{
                    _.each(messages, function(message){
                        logger.info(message);
                    });
                    return fn();
                }
            });
            return fn();
        }
    }, function(err){
        if(err){
            throw err;
            process.exit(1);
        }

        logger.info(["Successfully updated to version", language.version.new].join(" "));
    });

});
