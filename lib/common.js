var _ = require("lodash");
var DockerCmd = require("docker-cmd");

module.exports = {

    options: {
        "docker-org-name": {
            help: "Docker organization name"
        }
    },

    functions: {

        docker: function(options, fn){
            var dockerCmd = new DockerCmd();

            if(options["docker-org-name"]){
                dockerCmd.build({
                    tag: [[options["docker-org-name"], _.last(process.cwd().split("/"))].join("/"), options.version.new].join(":"),
                    _: "."
                }, null, function(exit_code) {
                    if(exit_code != 0)
                        return fn(new Error("Could not create Docker tag!"));
                    else{
                        dockerCmd.push({
                            _: [[options["docker-org-name"], _.last(process.cwd().split("/"))].join("/"), options.version.new].join(":")
                        }, null, function(exit_code){
                            if(exit_code != 0)
                                return fn(new Error("Error pushing to Dockerhub!"));
                            else
                                return fn();
                        });
                    }
                });
            }
        }
    }

}
