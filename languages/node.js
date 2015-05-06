var _ = require("lodash");
var fs = require("fs");
var semver = require("semver");

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
                else
                    return fn();
            });
        });
    });
}

Node.prototype.post_update = function(){

}

module.exports = Node;
