module.exports = function (grunt) {

    // Project configuration.
    grunt.initConfig({
        ts: {
            default: {
                src: ["src/*ts"],
                outDir: "comp",
                options: {
                    rootDir: "./src/",
                    target: "es2017",
                    module: "commonjs",
                    sourceMap: true,
                    moduleResolution: "node"
                }
            },
            poloniex_wrapper: {
                src: ["contrib/poloniex-wrapper/src/*ts"],
                outDir: "contrib/poloniex-wrapper/lib/",
                options: {
                    rootDir: ["./contrib/poloniex-wrapper/src/"],
                    target: "es2017",
                    module: "commonjs",
                    sourceMap: true,
                    moduleResolution: "node"
                }
            }
        },
        watch: {
            files: ["src/*ts", "contrib/poloniex-wrapper/src/*ts"],
            tasks: ["ts"]
        }
    });

    grunt.loadNpmTasks("grunt-ts");
    grunt.loadNpmTasks('grunt-contrib-watch');

    // Default task(s).
    grunt.registerTask('default', ['ts:poloniex_wrapper', 'ts:default']);

};
