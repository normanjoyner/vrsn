var _ = require("lodash");
var fs = require("fs");
var semver = require("semver");
var npm = require("npm");
var async = require("async");
var common = require([__dirname, "..", "lib", "common"].join("/"));

function Node(){
    this.file = "package.json";
    this.configuration = {};
    this.options = {
        publish: {
            help: "Publish package to npm",
            flag: true,
            default: false
        },

        shrinkwrap: {
            help: "Regenerate npm-shrinkwrap.json",
            flag: true,
            default: true
        }
    }

    _.merge(this.options, common.options);
}

Node.prototype.exists = function(fn){
    fs.stat([process.cwd(), this.file].join("/"), function(err, stat){
        if(err || _.isUndefined(stat))
            return fn(null, false);
        else
            return fn(null, true);
    });
}

Node.prototype.get_version = function(fn){
    fs.readFile([process.cwd(), this.file].join("/"), function(err, contents){
        if(err)
            return fn(err);

        try{
            return fn(null, JSON.parse(contents).version);
        }
        catch(e){
            return fn(e);
        }
    });
}

Node.prototype.update_version = function(fn){
    var self = this;
    var filename = [process.cwd(), this.file].join("/");
    this.get_version(function(err, version){
        fs.readFile(filename, function(err, contents){
            if(err)
                return fn(err);

            try{
                contents = JSON.parse(contents);
            }
            catch(e){
                return fn(e);
            }

            contents.version = semver.inc(version, self.configuration.level, self.configuration["prerelease-identifier"]);

            self.version = {
                original: version,
                new: contents.version
            }

            if(_.isNull(contents.version))
                return fn(new Error("Invalid version!"));

            fs.writeFile(filename, JSON.stringify(contents, null, 2), function(err){
                if(err)
                    return fn(err);
                else
                    return fn();
            });
        });
    });
}

Node.prototype.restore_version = function(fn){
    var self = this;
    var filename = [process.cwd(), this.file].join("/");
    this.get_version(function(err, version){
        fs.readFile(filename, function(err, contents){
            if(err)
                return fn(err);

            try{
                contents = JSON.parse(contents);
            }
            catch(e){
                return fn(e);
            }

            contents.version = self.version.original;

            fs.writeFile(filename, JSON.stringify(contents, null, 2), function(err){
                if(err)
                    return fn(err);
                else{
                    if(self.configuration.shrinkwrap){
                        npm.load({}, function(err){
                            if(err)
                                return fn(err);

                            npm.commands.shrinkwrap([], true, function(err){
                                if(err)
                                    return fn(err);
                                else
                                    return fn();
                            });
                        });
                    }
                    else
                        return fn();
                }
            });
        });
    });
}

Node.prototype.post_update = function(fn){
    var self = this;
    var messages = [];

    async.parallel({
        shrinkwrap: function(fn){
            if(self.configuration.shrinkwrap){
                npm.load({}, function(err){
                    if(err)
                        return fn(err);

                    npm.commands.shrinkwrap([], true, function(err){
                        if(err)
                            return fn(err);
                        else{
                            messages.push("npm-shrinkwrap.json updated!");
                            return fn();
                        }
                    });
                });
            }
            else
                return fn();
        }
    }, function(err){
        return fn(err, messages);
    });
}

Node.prototype.post_commit = function(fn){
    return fn(null, []);
}

Node.prototype.post_tag = function(fn){
    var self = this;
    var messages = [];
    var filename = [process.cwd(), this.file].join("/");

    async.parallel({
        publish: function(fn){
            if(self.configuration.publish){
                npm.load({}, function(err){
                    if(err)
                        return fn(err);

                    fs.readFile(filename, function(err, contents){
                        if(err)
                            return fn(err);

                        try{
                            contents = JSON.parse(contents);
                            npm.commands.publish([], true, function(err){
                                if(err)
                                    return fn(err);
                                else{
                                    messages.push(["Successully published", contents.name, "to npm!"].join(" "));
                                    return fn();
                                }
                            });
                        }
                        catch(e){
                            return fn(e);
                        }
                    });
                });
            }
            else
                return fn();
        },

        docker: function(fn){
            var options = _.clone(self.configuration);
            options.version = self.version;
            common.functions.docker(options, function(err){
                if(err)
                    return fn(err);
                else{
                    messages.push(["Successully pushed", [[options["docker-org-name"], _.last(process.cwd().split("/"))].join("/"), options.version.new].join(":"), "to Dockerhub!"].join(" "));
                    return fn();
                }
            });
        }
    }, function(err){
        return fn(err, messages);
    });
}

module.exports = Node;
